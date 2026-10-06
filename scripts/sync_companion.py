#!/usr/bin/env python3
"""Synchronize public documents and derived companion data from root sources."""
import collections
import csv
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "website/public/data"


def write(name, value):
    (DATA / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def plain(text):
    text = text.replace(r"Section~\ref{sec:profile}", "the version 1 visual query profile")
    text = text.replace("using the coverage cases below", "using the operator-level cases in the downloadable specification")
    text = re.sub(r"\\(?:citep|citet|evidence|ref|label)\{[^}]*\}", "", text)
    text = text.replace("\\%", "%").replace("\\&", "&").replace("~", " ").replace("--", "–")
    text = re.sub(r"\\[a-zA-Z]+(?:\[[^]]*\])?", "", text)
    text = re.sub(r"\s+", " ", text.replace("{", "").replace("}", "")).strip()
    return re.sub(r"\s+([.,;:])", r"\1", text)


def requirements():
    source = (ROOT / "kg-exploration-requirements.tex").read_text()
    functional = []
    for match in re.finditer(r"\\req\{(FR-[^}]+)\}\{([^}]+)\}\{(Must|Should)\}\{([^}]+)\}\s*(.*?)\n\\origin", source, re.S):
        rid, title, priority, cases, description = match.groups()
        functional.append({"id": rid, "title": title, "priority": priority, "acceptance_cases": re.findall(r"AC-\d+", cases), "description": plain(description)})
    for rid in ("FR-12a", "FR-17"):
        match = re.search(r"\\textbf\{" + rid + r" \(Should\)\.\}\s*(.*?)\n\\origin", source, re.S)
        assert match, rid
        functional.append({"id": rid, "title": "Additional typed views" if rid == "FR-12a" else "Optional evaluation recording", "priority": "Should", "acceptance_cases": [], "description": plain(match[1])})
    functional.sort(key=lambda r: (int(re.search(r"\d+", r["id"])[0]), r["id"]))
    quality = [{"id": m[1], "description": plain(m[2].split(r"\par\smallskip")[0])} for m in re.finditer(r"^(NFR-\d+) & (.*?)\\\\$", source, re.M)]
    acceptance = [{"id": m[1], "description": plain(m[2].split(r"\par\smallskip")[0])} for m in re.finditer(r"^(AC-\d+) & (.*?)\\\\$", source, re.M)]
    assert len(functional) == 20, len(functional)
    assert len(quality) == len(acceptance) == 11
    profile = re.search(r"The builder supports (.*?)\n\n", source, re.S)
    assert profile
    write("requirements.json", {"version": "1.4", "date": "2026-10-06", "status": "Behavioural specification; implementation and acceptance results are not asserted.", "source_sha256": hashlib.sha256((ROOT / "kg-exploration-requirements.tex").read_bytes()).hexdigest(), "visual_query_profile": "The builder supports " + plain(profile[1]), "functional_requirements": functional, "quality_requirements": quality, "acceptance_cases": acceptance, "targets": {"local_feedback_p95_ms": 200, "controlled_warm_source_p95_ms": 2000, "non_expert_unaided_task_completion_percent": 80, "benchmark_entities": 100000, "benchmark_relationship_facts": 1000000, "repetitions_per_operation": 30}, "target_note": "Proposed engineering targets under the specified conditions, not measured application results."})


def recovery():
    ledger_path = ROOT / "outputs/recovery-completion-2026-10-06/recovery-ledger.json"
    if not ledger_path.exists():
        return
    ledger = json.loads(ledger_path.read_text())
    records = []
    for r in ledger["records"]:
        pdf = r.get("pdf")
        records.append({"record_id": r["record_id"], "title": r["title"], "doi": r.get("doi"), "status": r["status"], "assessment_status": "not_assessed", "source_url": pdf.get("source_url") if pdf else None, "pdf_sha256": pdf.get("sha256") if pdf else None, "pdf_pages": pdf.get("pages") if pdf else None, "title_matched": pdf.get("title_in_first_two_pages") if pdf else False, "completeness_status": r.get("completeness_status", "not_applicable"), "source_check_note": r.get("source_check_note"), "attempts": [{k: v for k, v in a.items() if k in ("url", "requested_at", "http_status", "resolved_url", "content_type", "outcome", "bytes", "sha256", "elapsed_seconds")} for a in r["attempts"]]})
    write("recovery-ledger.json", {"schema_version": "1.0", "attempted_on": ledger["attempted_on"], "frozen_reports_not_retrieved": ledger["frozen_reports_not_retrieved"], "scope": ledger["scope"], "summary": ledger["summary"], "records": records})


def relocate_synthesis():
    source = (ROOT / "survey.tex").read_text()
    digest = hashlib.sha256(source.encode()).hexdigest()
    for name in ("synthesis-evidence-ledger.json", "synthesis-grouping-rule.json"):
        value = json.loads((DATA / name).read_text())
        value["source_bindings"]["manuscript"]["sha256"] = digest
        def visit(node):
            if isinstance(node, dict):
                if "context_text" in node and "manuscript_line" in node:
                    context = node["context_text"]
                    assert source.count(context) == 1, "A synthesis context changed; source review is required."
                    node["manuscript_line"] = source[:source.index(context)].count("\n") + 1
                    node["source_sha256"] = digest
                for child in node.values():
                    visit(child)
            elif isinstance(node, list):
                for child in node:
                    visit(child)
        visit(value)
        write(name, value)
        if name == "synthesis-evidence-ledger.json":
            lines = {r["report_id"]: r["nominated_pair"]["manuscript_context"]["manuscript_line"] for r in value["illustrations"]}
            csv_path = DATA / "synthesis-evidence-ledger.csv"
            with csv_path.open(newline="") as handle:
                reader = csv.DictReader(handle); fields = reader.fieldnames; rows = list(reader)
            for row in rows:
                row["nominated_manuscript_line"] = lines[row["report_id"]]
            with csv_path.open("w", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n"); writer.writeheader(); writer.writerows(rows)


def main():
    for name in ("survey.tex", "kg-exploration-requirements.tex"):
        shutil.copyfile(ROOT / name, DATA / name)
    method = {"confirmed_on": "2026-10-06", "title_abstract_reviewers": 2, "title_abstract_independent": True, "full_text_reviewers": 1, "full_text_duplicate_review": False, "data_extractors": 3, "extraction_allocation": "not_documented", "independent_duplicate_extraction": "not_documented", "historical_automation_use": "not_documented", "risk_of_bias_procedure": "not_confirmed", "target_venue": "ACM Computing Surveys", "target_status": "Intended submission venue; no submission or acceptance is claimed."}
    write("review-method.json", method)
    requirements()
    recovery()
    relocate_synthesis()
    checklist = json.loads((DATA / "prisma-checklist.json").read_text())
    for r in checklist["rows"]:
        if r["item"] == "8":
            r["note"] = "Two independent human title/abstract reviewers and one human full-text reviewer are author-confirmed. Full-text eligibility was not independently duplicated. Historical automation use and detailed workflow responsibilities remain undocumented."
        if r["item"] == "9":
            r["note"] = "Three human data extractors are author-confirmed. Source-located fields and checks are recorded, but per-report allocation, independent duplicate extraction, checking and disagreement resolution are not documented."
    write("prisma-checklist.json", checklist)
    manifest = json.loads((DATA / "data-manifest.json").read_text())
    manifest["artifact_sha256"] = {str(p.relative_to(DATA)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(DATA.iterdir()) if p.is_file() and p.name != "data-manifest.json"}
    write("data-manifest.json", manifest)
    counts = collections.Counter(r["status"] for r in checklist["rows"])
    print(json.dumps({"requirements": "1.4", "prisma": counts, "public_documents_synced": True}))


if __name__ == "__main__":
    main()
