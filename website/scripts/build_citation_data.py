#!/usr/bin/env python3
"""
Generate citation edges for CitationMap from sti-survey.json

Output format (array of edges):
- { type: 'cite'|'evolve', source, source_date: 'YYYY-01-01', target, target_date: 'YYYY-01-01', value: 1 }

Rules:
- cite: for each paper, for each reference that matches another entry in the dataset (by id)
- evolve: chain works of the same firstAuthor chronologically
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / 'public' / 'data' / 'sti-survey.json'
OUTPUT = ROOT / 'public' / 'data' / 'data@3.json'


def to_date(year):
    try:
        y = int(year)
    except Exception:
        return ''
    if y < 1000 or y > 9999:
        return ''
    return f"{y}-01-01"


def main():
    data = json.loads(INPUT.read_text('utf-8'))
    if not isinstance(data, list):
        raise SystemExit('Expected sti-survey.json to be an array')

    by_id = {item.get('id'): item for item in data if isinstance(item, dict) and 'id' in item}

    edges = []

    # cite edges
    for item in data:
        source = item.get('firstAuthor')
        source_year = item.get('year')
        source_date = to_date(source_year)
        if not source or not source_date:
            continue
        citations = (item.get('citations') or {}).get('references')
        if isinstance(citations, list):
            for r in citations:
                if not isinstance(r, dict):
                    continue
                ref_id = r.get('ref')
                target_item = by_id.get(ref_id)
                if not target_item:
                    continue
                target = target_item.get('firstAuthor')
                target_date = to_date(target_item.get('year'))
                if not target or not target_date:
                    continue
                edges.append({
                    'type': 'cite',
                    'source': source,
                    'source_date': source_date,
                    'target': target,
                    'target_date': target_date,
                    'value': 1,
                })

    # evolve edges
    by_author = {}
    for item in data:
        a = item.get('firstAuthor')
        y = item.get('year')
        if not a or not to_date(y):
            continue
        by_author.setdefault(a, []).append(item)

    for author, items in by_author.items():
        items.sort(key=lambda x: (x.get('year'), x.get('id')))
        # unique by year (keep first of same year)
        uniq = []
        seen_years = set()
        for it in items:
            y = it.get('year')
            if y in seen_years:
                continue
            seen_years.add(y)
            uniq.append(it)
        for i in range(1, len(uniq)):
            prev = uniq[i - 1]
            curr = uniq[i]
            edges.append({
                'type': 'evolve',
                'source': prev.get('firstAuthor'),
                'source_date': to_date(prev.get('year')),
                'target': curr.get('firstAuthor'),
                'target_date': to_date(curr.get('year')),
                'value': 1,
            })

    # sort primarily by year for readability and stability
    # order: source_date (asc), then target_date (asc), then type/source/target
    edges.sort(key=lambda e: (e['source_date'], e['target_date'], e['type'], e['source'], e['target']))

    OUTPUT.write_text(json.dumps(edges, indent=2) + '\n', 'utf-8')
    print(f"Wrote {len(edges)} edges to {OUTPUT.relative_to(ROOT)}")


if __name__ == '__main__':
    main()
