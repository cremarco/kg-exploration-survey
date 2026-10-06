#!/usr/bin/env python3
"""Recover public source candidates without changing frozen eligibility decisions.

Uses exact DOI/title matches in OpenAlex and publisher/repository PDF links.
Receipts are resumable, timestamped, and separate acquisition from assessment.
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import html
import json
import re
import subprocess
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DAY = "2026-10-06"
OUT = ROOT / "outputs" / f"recovery-completion-{DAY}"
MAX_BYTES = 25 * 1024 * 1024
AGENT = "KGExplorationReview/1.0 (public scholarly source retrieval)"
LOCK = threading.Lock()
HOSTS = {}
RATE_LIMITED = set()


def norm(s):
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower())


def read(path):
    return json.loads(path.read_text())


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    tmp.replace(path)


def request(url, attempts):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return None, url, ""
    with LOCK:
        gate = HOSTS.setdefault(parsed.hostname, threading.Semaphore(2))
    started = time.monotonic()
    receipt = {"url": url, "requested_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    with LOCK:
        if parsed.hostname in RATE_LIMITED:
            receipt.update(outcome="request_skipped_after_provider_rate_limit", elapsed_seconds=0)
            attempts.append(receipt)
            return None, url, ""
    try:
        with gate:
            req = urllib.request.Request(url, headers={"User-Agent": AGENT, "Accept": "application/pdf,text/html,application/json;q=0.9,*/*;q=0.8"})
            with urllib.request.urlopen(req, timeout=7) as response:
                receipt.update(http_status=response.status, resolved_url=response.url, content_type=response.headers.get("Content-Type", ""))
                body = response.read(MAX_BYTES + 1)
                if len(body) > MAX_BYTES:
                    receipt["outcome"] = "size_limit_exceeded"
                    return None, response.url, receipt["content_type"]
                receipt.update(outcome="response_received", bytes=len(body), sha256=hashlib.sha256(body).hexdigest())
                return body, response.url, receipt["content_type"]
    except urllib.error.HTTPError as error:
        receipt.update(http_status=error.code, outcome="http_error")
        if error.code == 429:
            with LOCK:
                RATE_LIMITED.add(parsed.hostname)
    except Exception as error:
        receipt.update(outcome="request_failed", error=str(error)[:250])
    finally:
        receipt["elapsed_seconds"] = round(time.monotonic() - started, 2)
        attempts.append(receipt)
    return None, url, ""


def extract_links(body, url):
    text = body.decode("utf-8", "replace")
    found = []
    for tag in re.findall(r"<meta\b[^>]+>", text, re.I):
        attrs = {k.lower(): html.unescape(v) for k, _, v in re.findall(r'''([\w:-]+)\s*=\s*(["'])(.*?)\2''', tag)}
        if attrs.get("name", "").lower() in ("citation_pdf_url", "eprints.document_url") and attrs.get("content"):
            found.append(urllib.parse.urljoin(url, attrs["content"]))
    for _, target in re.findall(r'''(?:href|src)\s*=\s*(["'])(.*?)\1''', text, re.I):
        target = html.unescape(target)
        if re.search(r"\.pdf(?:[?#]|$)|/bitstream/|/doi/pdf/|/download/|/content/pdf/", target, re.I):
            found.append(urllib.parse.urljoin(url, target))
    return list(dict.fromkeys(found))[:8]


def pdf_receipt(body, url, row, result):
    path = OUT / "pdfs" / (row["record_id"] + ".pdf")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(body)
    try:
        info = subprocess.run(["pdfinfo", str(path)], capture_output=True, text=True, timeout=12)
        pages = re.search(r"^Pages:\s+(\d+)", info.stdout, re.M)
        if info.returncode or not pages:
            path.unlink(missing_ok=True)
            return False
        text = subprocess.run(["pdftotext", "-f", "1", "-l", "2", str(path), "-"], capture_output=True, text=True, timeout=12).stdout
        title_matches = norm(row["title"]) in norm(text[:18000])
        result["pdf"] = {"relative_path": str(path.relative_to(ROOT)), "source_url": url, "sha256": hashlib.sha256(body).hexdigest(), "bytes": len(body), "pages": int(pages[1]), "title_in_first_two_pages": title_matches}
        (OUT / "text").mkdir(parents=True, exist_ok=True)
        subprocess.run(["pdftotext", "-layout", str(path), str(OUT / "text" / (row["record_id"] + ".txt"))], capture_output=True, timeout=20)
        result["status"] = "pdf_acquired_title_matched" if title_matches else "pdf_acquired_identity_pending"
        result["assessment_status"] = "not_assessed"
        result["completeness_status"] = "not_yet_verified"
        return True
    except Exception as error:
        result["pdf_error"] = str(error)[:250]
        path.unlink(missing_ok=True)
        return False


def recover(row, refresh=False, provider="openalex"):
    rid = row["record_id"]
    receipt_path = OUT / "receipts" / (rid + ".json")
    if receipt_path.exists() and not refresh:
        return read(receipt_path)
    previous = read(receipt_path) if receipt_path.exists() else {}
    result = {"record_id": rid, "title": row["title"], "attempted_on": DAY, "status": "not_recovered", "assessment_status": "not_assessed", "frozen_disposition": "Not retrieved", "attempts": previous.get("attempts", []).copy()}
    cached = read(ROOT / ".codex-tmp" / "metadata" / (rid + ".json"))
    frozen = cached.get("frozen_export_match") or {}
    oa = cached.get("openalex") or {}
    doi = frozen.get("DOI") or oa.get("doi") or ""
    doi = re.sub(r"^https?://(?:dx\.)?doi.org/", "", doi.strip())
    result["doi"] = doi or None
    select = "id,doi,title,publication_year,type,primary_location,best_oa_location,locations"
    if doi:
        api = "https://api.openalex.org/works/https://doi.org/" + urllib.parse.quote(doi, safe="/") + "?select=" + select
    elif oa.get("id"):
        api = "https://api.openalex.org/works/" + oa["id"].rsplit("/", 1)[-1] + "?select=" + select
    else:
        api = "https://api.openalex.org/works?" + urllib.parse.urlencode({"search": row["title"], "per-page": 3, "select": select})
    if provider == "crossref":
        api = "https://api.crossref.org/works/" + urllib.parse.quote(doi, safe="") if doi else "https://api.crossref.org/works?" + urllib.parse.urlencode({"query.bibliographic": row["title"], "rows": 3})
    body, _, _ = request(api, result["attempts"])
    crossref_links = []
    if body:
        try:
            value = json.loads(body)
            if provider == "crossref":
                message = value.get("message", {})
                candidates = message.get("items", [message])
                exact = next((x for x in candidates if norm((x.get("title") or [""])[0]) == norm(row["title"]) or (doi and str(x.get("DOI", "")).lower() == doi.lower())), None)
                save(OUT / "crossref" / (rid + ".json"), value)
                if exact:
                    doi = exact.get("DOI") or doi
                    result.update(doi=doi, metadata_match="exact_doi" if result["doi"] else "exact_normalized_title", metadata_source="https://api.crossref.org/works/" + doi)
                    crossref_links = [x["URL"] for x in exact.get("link", []) if x.get("URL")]
            else:
                candidates = value.get("results", [value])
                exact = next((x for x in candidates if norm(x.get("title")) == norm(row["title"]) or (doi and str(x.get("doi", "")).lower().endswith(doi.lower()))), None)
                save(OUT / "metadata" / (rid + ".json"), value)
            if exact and provider == "openalex":
                oa = exact
                result["metadata_match"] = "exact_doi" if doi else "exact_normalized_title"
                result["metadata_source"] = oa.get("id")
        except (ValueError, TypeError):
            pass
    locations = ([oa.get("best_oa_location")] if oa.get("best_oa_location") else []) + oa.get("locations", [])
    pdfs = [l["pdf_url"] for l in locations if l and l.get("pdf_url")]
    landings = [l["landing_page_url"] for l in locations if l and l.get("landing_page_url")]
    if doi.startswith("10.1145/"):
        pdfs.append("https://dl.acm.org/doi/pdf/" + doi)
    elif doi.startswith("10.1007/"):
        pdfs.append("https://link.springer.com/content/pdf/" + doi + ".pdf")
    elif doi.startswith("10.3233/"):
        pdfs.append("https://ebooks.iospress.nl/pdf/doi/" + doi)
    elif doi.startswith("10.48550/arXiv."):
        pdfs.append("https://arxiv.org/pdf/" + doi.split("arXiv.")[-1])
    if doi:
        landings.append("https://doi.org/" + doi)
    candidates = list(dict.fromkeys(crossref_links + pdfs + landings))[:5]
    result["candidate_urls"] = candidates.copy()
    deadline = time.monotonic() + 35
    seen = set()
    while candidates and len(seen) < 6 and time.monotonic() < deadline:
        url = candidates.pop(0)
        if url in seen:
            continue
        seen.add(url)
        body, resolved, content_type = request(url, result["attempts"])
        if not body:
            continue
        if body.lstrip().startswith(b"%PDF-"):
            if pdf_receipt(body, resolved, row, result):
                break
        elif "html" in content_type or b"<html" in body[:2000].lower():
            links = extract_links(body, resolved)
            candidates = [x for x in links if x not in seen] + candidates
            result.setdefault("discovered_pdf_links", []).extend(links)
    if not result.get("pdf") and not result["candidate_urls"]:
        result["status"] = "metadata_lookup_rate_limited" if any(a.get("http_status") == 429 for a in result["attempts"]) else "no_exact_source_candidate"
    result["finished_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    save(receipt_path, result)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--provider", choices=["openalex", "crossref"], default="openalex")
    parser.add_argument("--only-unrecovered", action="store_true")
    args = parser.parse_args()
    register = read(ROOT / "website" / "public" / "data" / "selection-register.json")
    rows = [r for r in register["records"] if r["workflow"] == "Not retrieved"]
    if args.only_unrecovered:
        rows = [r for r in rows if not (OUT / "receipts" / (r["record_id"] + ".json")).exists() or not read(OUT / "receipts" / (r["record_id"] + ".json")).get("pdf")]
    if args.limit:
        rows = rows[:args.limit]
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(recover, row, args.refresh, args.provider): row for row in rows}
        for future in concurrent.futures.as_completed(futures):
            row = futures[future]
            try:
                results.append(future.result())
            except Exception as error:
                failure = {"record_id": row["record_id"], "title": row["title"], "status": "processing_failed", "error": str(error), "attempted_on": DAY, "attempts": [], "assessment_status": "not_assessed"}
                save(OUT / "receipts" / (row["record_id"] + ".json"), failure)
                results.append(failure)
            if len(results) % 25 == 0 or len(results) == len(rows):
                print(json.dumps({"completed": len(results), "total": len(rows), "pdfs_acquired": sum(bool(r.get("pdf")) for r in results)}), flush=True)
    results = [read(p) for p in (OUT / "receipts").glob("*.json")]
    results.sort(key=lambda x: x["record_id"])
    summary = {"attempted": len(results), "pdfs_acquired": sum(bool(r.get("pdf")) for r in results), "pdfs_title_matched": sum(r["status"] == "pdf_acquired_title_matched" for r in results), "pending_identity": sum(r["status"] == "pdf_acquired_identity_pending" for r in results), "not_recovered": sum(not r.get("pdf") for r in results)}
    save(OUT / "recovery-ledger.json", {"schema_version": "1.0", "attempted_on": DAY, "frozen_reports_not_retrieved": sum(r["workflow"] == "Not retrieved" for r in register["records"]), "scope": "Public acquisition follow-up; frozen eligibility and synthesis remain unchanged until full-text assessment.", "summary": summary, "records": results})
    print(json.dumps(summary), flush=True)


if __name__ == "__main__":
    main()
