# Knowledge Graph Exploration Survey

English companion to *Knowledge Graph Exploration: A Systematic Review of Interaction, Guidance, and Evaluation*. The site provides a report catalogue, source evidence, comparison of two to four reports, evaluation coding, named families, methods, application requirements, source recovery, and downloads.

## Run locally

Requires Node.js 20.19+ or 22.12+ and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1
pnpm build
pnpm lint
pnpm test
node scripts/render-check.mjs
```

The build is written to `dist/`. `pnpm preview` serves that build. The production base is `/kg-exploration-survey/`, matching the repository name and GitHub Pages URL. The Vite base, router basename, favicon, fonts, and `public/404.html` fallback use that path. Change these together if the hosting prefix changes. Building does not publish the site.

## Publish to GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the site at <https://cremarco.github.io/kg-exploration-survey/> after each push to `main`, or when run manually from GitHub Actions. It installs the committed pnpm lockfile with Node.js 22 and pnpm 10, runs lint, tests, data validation, and render checks, then builds and deploys `website/dist/`. The repository's Pages source must be set to **GitHub Actions**.

## Data and analytical units

The literature cutoff is 29 August 2026. Source verification is dated 6 October 2026. `public/data/catalog.json` contains 242 included primary reports. The separate selection register contains 991 distinct reports sought: 242 included, 82 excluded, and 667 not retrieved. Thirty-nine duplicate copies remain outside that denominator.

The lightweight `catalog-index.json` drives search, filtering, and summary counts. Full source evidence is loaded from `public/data/reports/<report_id>.json`. The complete catalogue, schema, decision register, search record, PRISMA checklist, manuscript source, and application requirements source are downloadable. `data-manifest.json` records the catalogue checksum.

Implemented or demonstrated, proposed, future, and unestablished evidence remain distinct. Each report may describe more than one approach or evaluation. Report, system, participant, annotation, query, graph-size, and deployment units are not combined. A matching resource landing page does not establish operation, a successful build, a licence, or the historical version.

Original ACM, OpenAlex, and IEEE exports, the raw supplementary Google Scholar 200-result export, and the seven exact submitted IEEE queries were unavailable. The 667 retrieval gaps and absence of documented independent duplicate full-text review limit the synthesis. The methods page retains these boundaries and the partially reported PRISMA items.

## Validate and refresh

`node scripts/validate-data.mjs` checks the catalogue’s declared field constraints, controlled values, references, analytical counts, per-report files, and checksum. It implements the constraints used by this schema; it is not a general JSON Schema metaschema validator. Node tests cover filtering, URL state, comparison limits, export safety, and disposition semantics. The render check uses actual catalogue and source data without browser automation.

The included-report catalogue must match the verified final selection register exactly. Refresh the index and per-report files from the same catalogue revision; refresh the manuscript and requirements downloads from their final root sources; recompute the manifest checksum. Provisional eligibility proposals must not be promoted into final decisions. Primary-source PDFs are linked to their publishers or repositories and are not redistributed by this site.

## Design and assets

React, Vite, Tailwind CSS 4, and daisyUI 5 provide the interface. The local Newsreader font is distributed under the SIL Open Font License; see `public/fonts/Newsreader-LICENSE.txt`. The interface uses a system sans serif for operational controls and an ivory, ink, teal, and ochre palette.

## Completed specification and recovery follow-up

The application specification is version 1.4: 20 functional requirements (18 Must and two Should), 11 quality requirements, and 11 paired acceptance cases. The `/requirements` page reads `requirements.json`, derived from the root LaTeX source, and links the current PDF and source. This companion is separate from the future graph exploration application. The review draft targets ACM Computing Surveys and uses `acmart` manuscript/review formatting; no submission or acceptance is asserted.

The authors confirmed one full-text reviewer and three data extractors on 6 October 2026. Two independent title–abstract reviewers were already documented. Extraction allocation, checking, historical automation use and the appraisal procedure remain unconfirmed; staffing counts do not establish duplicate extraction. The PRISMA view reads its current checklist rather than hard-coding its status totals.

A public-source follow-up attempted all 667 previously unretrieved records through OpenAlex, Crossref and publisher/repository links. It downloaded 137 candidate PDFs; 126 matched the recorded title in the first two pages and 11 require identity reconciliation. Some copies are front matter, programmes, previews or different documents; source-check notes retain these limits. No PDF was downloaded for 530 records. Download is not full-text assessment or inclusion. The frozen 991-report register and 242 included reports remain the adjudicated synthesis. `/recovery` exposes timestamps, request outcomes, source links, checksums and acquisition states without redistributing primary PDFs.

`python3 scripts/sync_companion.py` runs from the repository root and synchronizes document sources, derived requirements, confirmed method facts, recovery receipts, unchanged synthesis paragraph locators, and artifact checksums. Compile and copy the root PDFs into `website/public/data/` before running the synchronizer. `scripts/recover_reports.py` is the resumable local acquisition workflow; it requires the project's frozen metadata cache under `.codex-tmp/metadata/`, `pdfinfo`, and `pdftotext`. Detailed local receipts and the blank human-review queue are kept under `outputs/recovery-completion-2026-10-06/`. They are not eligibility decisions.
