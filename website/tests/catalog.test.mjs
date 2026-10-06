import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { checkData } from '../scripts/validate-data.mjs'
import { filterReports, readFilters, writeFilters, compareIds, reportSummary, reportsCsv, reportsBib, safeUrl } from '../src/lib/catalog.js'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'public/data', name), 'utf8'))
const catalog = read('catalog-index.json'); const reports = catalog.reports

test('synthesis evidence remains inside the included corpus with current contexts and report-specific source locators', () => {
  const ledger = read('synthesis-evidence-ledger.json')
  const full = new Map(read('catalog.json').reports.map(report => [report.report_id, report]))
  const source = fs.readFileSync(path.join(root, 'public/data/survey.tex'), 'utf8')
  assert.equal(ledger.source_bindings.manuscript.sha256, crypto.createHash('sha256').update(source).digest('hex'))
  assert.equal(new Set(ledger.illustrations.map(row => row.report_id)).size, 49)
  for (const row of ledger.illustrations) {
    const report = full.get(row.report_id)
    assert(report, `${row.report_id} must belong to the included corpus`)
    const pair = row.nominated_pair
    assert(source.includes(pair.manuscript_context.context_text), row.report_id)
    const evidence = new Map(report.evidence.map(item => [item.evidence_id, item]))
    for (const id of pair.existing_source_evidence_ids) {
      const item = evidence.get(id)
      assert(item, `${row.report_id}: ${id}`)
      assert.equal(item.source_sha256, pair.primary_source_sha256, id)
    }
    const locatedPages = pair.existing_source_evidence_ids.flatMap(id => evidence.get(id).physical_pdf_pages)
    assert(pair.physical_pdf_pages_inspected_for_this_fact.every(page => locatedPages.includes(page)), row.report_id)
    assert.equal(pair.claim_support_judgement, 'not_performed')
  }
})

test('native closure, source references, per-report files, schema constraints, and checksum agree', () => { assert.deepEqual(checkData().reports, catalog.counts.included_reports) })
test('search is case-insensitive for source titles, authors, names, and DOI', () => { const r = reports.find(r => r.publication.doi); assert(filterReports(reports, { q: r.publication.doi.toUpperCase() }).some(x => x.report_id === r.report_id)); assert(filterReports(reports, { q: r.publication.title.toUpperCase() }).some(x => x.report_id === r.report_id)) })
test('filtering preserves input and applies year, graph model, and status together', () => { const before = JSON.stringify(reports); const chosen = filterReports(reports, { from: '2015', to: '2020', sort: 'year-asc' }); assert(chosen.every(r => r.publication.year >= 2015 && r.publication.year <= 2020)); assert(chosen.every((r, i) => !i || r.publication.year >= chosen[i - 1].publication.year)); assert.equal(JSON.stringify(reports), before); const model = filterReports(reports, { model: 'B01_rdf', status: 'implemented_or_demonstrated' }); assert(model.length > 0); assert(model.every(r => r.backend.data_model.codes.some(c => c.code === 'B01_rdf' && c.status === 'implemented_or_demonstrated'))) })
test('a selected capability must have the selected evidence state', () => { const r = reports.find(r => r.report_id === 'V3-00615'); const proposed = r.taxonomy.interaction.codes.find(c => c.status === 'proposed_method'); assert(proposed); assert(filterReports([r], { interaction: proposed.code, status: 'proposed_method' }).length === 1); assert(filterReports([r], { interaction: proposed.code, status: 'implemented_or_demonstrated' }).length === 0) })
test('URL filters round-trip Unicode, punctuation, and pagination without changing text', () => { const filters = { q: 'Čerāns & ViziQuer?', guidance: 'G01_valid_options', status: 'future_work', sort: 'title', page: '3' }; const actual = readFilters(writeFilters(filters)); for (const [k, v] of Object.entries(filters)) assert.equal(actual[k], v) })
test('comparison uses unique known reports and caps the selection at four', () => { const known = new Set(reports.map(r => r.report_id)); const ids = reports.slice(0, 5).map(r => r.report_id); const p = new URLSearchParams({ ids: ['missing', ids[0], ...ids].join(',') }); assert.deepEqual(compareIds(p, known), ids.slice(0, 4)) })
test('report summaries never promote future or missing evidence to proposed or implemented', () => { const r = structuredClone(reports[0]); r.taxonomy.interaction.codes = [{ code: 'I06_free_language', status: 'future_work' }]; assert.equal(reportSummary(r), 'Interaction described as future work'); r.taxonomy.interaction.codes[0].status = 'not_established'; assert.equal(reportSummary(r), 'Interaction coding not established'); r.taxonomy.interaction.codes[0].status = 'proposed_method'; assert.equal(reportSummary(r), 'Proposed interaction method') })
test('CSV protects spreadsheet formulas and preserves quoted text and line breaks', () => { const r = structuredClone(reports[0]); r.publication.title = '=HYPERLINK("bad")\nsecond line'; const csv = reportsCsv([r]); assert(csv.includes('"\'=HYPERLINK(""bad"")\nsecond line"')); assert(csv.startsWith('\uFEFF')) })
test('BibTeX retains source metadata without guessing publication type or author names', () => { const r = reports.find(r => r.publication.doi); const bib = reportsBib([r]); assert(bib.startsWith('@misc{')); assert(bib.includes(`doi = {${r.publication.doi}}`)); assert(!bib.includes('undefined')) })
test('resource URLs reject scripts, data URLs, malformed values, and local paths', () => { for (const v of ['javascript:alert(1)', 'data:text/html,test', '/Users/x/a.pdf', null]) assert.equal(safeUrl(v), null); assert.equal(safeUrl('https://example.org/a'), 'https://example.org/a') })
test('retrieval is a workflow disposition while eligibility remains undetermined', () => { const data = read('selection-register.json'); const missing = data.records.filter(r => r.workflow === 'Not retrieved'); assert.equal(missing.length, catalog.counts.not_retrieved); assert(missing.every(r => r.final_decision === null)); assert.equal(data.records.filter(r => r.final_decision === 'Exclude').length, catalog.counts.excluded_reports) })
test('the deployment prefix and fallback use the current repository name', () => { const config = fs.readFileSync(path.join(root, 'vite.config.js'), 'utf8'); const fallback = fs.readFileSync(path.join(root, 'public/404.html'), 'utf8'); assert(config.includes('/kg-exploration-survey/')); assert(fallback.includes('/kg-exploration-survey/')); assert(!fallback.includes('/kge-survey/')); assert(fs.existsSync(path.join(root, 'public/favicon.svg'))) })
test('manuscript source counts match the frozen search register and reconcile identification and duplicate totals', () => {
  const manuscript = fs.readFileSync(path.join(root, 'public/data/survey.tex'), 'utf8')
  const search = read('search-strategies.json')
  const sourceCounts = manuscript.match(/yielded ([\d,]+) Scopus records, ([\d,]+) ACM hits, ([\d,]+) OpenAlex records, and ([\d,]+) occurrences across the IEEE subqueries/)
  assert(sourceCounts, 'Source-count sentence missing')
  const counts = sourceCounts.slice(1).map(value => Number(value.replaceAll(',', '')))
  assert.deepEqual(counts, search.sources.map(source => source.raw_occurrences))
  const total = Number(manuscript.match(/The raw total is ([\d,]+)\./)[1].replaceAll(',', ''))
  assert.equal(counts.reduce((sum, value) => sum + value, 0), total)
  assert.equal(total, 4159)
  assert.equal(total - 1129, 3030)
  assert.equal(total - 37, 4122)
})

const preservation = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/catalog-preservation.json'), 'utf8'))
const corrections = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/catalog-corrections.json'), 'utf8'))
const semanticHash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
test('all 242 report summaries preserve extraction and only the documented source corrections alter the audit baseline', () => {
  const current = read('catalog.json')
  const full = read('catalog-frozen.json')
  assert.equal(full.reports.length, preservation.report_count)
  for (const report of full.reports) assert.deepEqual(current.reports.find(row => row.report_id === report.report_id), report)
  const audited = structuredClone(full)
  for (const report of full.reports) {
    const expected = preservation.reports[report.report_id]; const summary = report.report_level_evaluation
    assert.equal(summary.scope, 'report'); assert.equal(summary.study_assignment, 'not_assigned')
    assert.deepEqual(summary.extraction, { artifact: 'included-extraction.json', sha256: corrections.extraction_sha256, row_index: expected.row_index, json_pointer: `/rows/${expected.row_index}` })
    const summaryHash = report.report_id === corrections.report_summary.report_id ? corrections.report_summary.extraction_fields_sha256 : expected.extraction_fields_sha256
    assert.equal(semanticHash(Object.fromEntries(preservation.fields.map(field => [field, summary[field]]))), summaryHash, `${report.report_id}: extraction text changed`)
    const original = audited.reports.find(row => row.report_id === report.report_id)
    for (const change of corrections.study_changes.filter(row => row.report_id === report.report_id)) {
      const study = original.studies.find(row => row.study_id === change.study_id)
      assert(study, `${change.study_id}: corrected study missing`)
      assert.deepEqual(study[change.field], change.new, `${change.study_id}: source correction changed`)
      study[change.field] = structuredClone(change.old)
    }
    assert.equal(semanticHash(original.studies), expected.studies_sha256, `${report.report_id}: undocumented study change`)
    assert.deepEqual(summary.evidence_ids, [...new Set([...report.taxonomy.evaluation.codes.flatMap(code => code.evidence_ids), ...report.studies.flatMap(study => study.evidence_ids)])])
    for (const code of original.taxonomy.visualisation.codes) {
      const qualified = corrections.representation_roles.qualified.find(row => row.report_id === report.report_id)?.codes.find(row => row.code === code.code)
      assert.deepEqual(code.representation_role, qualified?.representation_role || corrections.representation_roles.default)
      delete code.representation_role
    }
    if (report.report_id === corrections.publication_change.report_id) {
      assert.deepEqual(original.publication, corrections.publication_change.new)
      assert.deepEqual(original.evidence.at(-1), corrections.publication_change.added_evidence)
      original.publication = structuredClone(corrections.publication_change.old)
      original.evidence.pop()
    }
  }
  for (const change of corrections.selection_changes) {
    const selectionIndex = audited.selection_register.findIndex(row => row.record_id === change.record_id)
    assert.deepEqual(audited.selection_register[selectionIndex], change.new)
    audited.selection_register[selectionIndex] = structuredClone(change.old)
  }
  audited.reports.forEach(report => { delete report.report_level_evaluation })
  assert.equal(semanticHash(audited), preservation.baseline_semantic_sha256, 'Existing catalog content differs from the immutable audit baseline')
  assert(catalog.reports.every(report => !Object.hasOwn(report, 'report_level_evaluation')), 'Detail text leaked into the lightweight index')
})
test('query diagrams and returned data retain distinct source-qualified roles with explicit unknown defaults', () => {
  const full = read('catalog-frozen.json'); const codes = full.reports.flatMap(report => report.taxonomy.visualisation.codes)
  assert.equal(codes.length, 600)
  assert.equal(codes.filter(code => code.representation_role.roles.length).length, 4)
  assert.equal(codes.filter(code => code.representation_role.missingness === 'unspecified').length, 596)
  for (const id of ['V3-02190', 'V3-02191']) {
    const report = full.reports.find(row => row.report_id === id)
    assert.deepEqual(report.taxonomy.visualisation.codes.find(code => code.code === 'V01_node_link').representation_role.roles, ['query_pattern'])
    assert.deepEqual(report.taxonomy.visualisation.codes.find(code => code.code === 'V03_table_list').representation_role.roles, ['data_result'])
  }
})
test('study classifications retain unknowns and separate the verified offline and human evaluations', () => {
  const full = read('catalog-frozen.json'); const studies = full.reports.flatMap(report => report.studies)
  assert.equal(studies.length, 237)
  assert.equal(studies.filter(study => study.design_codes.length === 0).length, 125)
  const report = full.reports.find(row => row.report_id === 'V3-00696')
  assert.deepEqual(report.studies.map(study => study.design_codes), [['E06_offline_accuracy'], ['E06_offline_accuracy'], ['E05_comparative_user']])
  const human = report.studies.find(study => study.study_id === 'V3-00696-human-comparison')
  assert.equal(human.participants_n, 40); assert.equal(human.allocation, 'within_subject')
  assert(human.response_note.includes('randomly assigned to interface-order Groups A and B'))
  assert(human.response_note.includes('scenario order is fixed'))
  assert(report.report_level_evaluation.results.includes('76.00 (18.94)/77.25 (15.28)'))
  assert(report.report_level_evaluation.limitations.includes('No outcome-specific analytic N'))
})
test('FeedLens report outcomes preserve human and offline context without filling any study result', () => {
  const report = read('reports/V3-01126.json'); const summary = report.report_level_evaluation
  assert(summary.results.includes('FeedLens SUS84(SD8.6) vs77.3(SD12.5)'))
  assert(summary.results.includes('Offline K=sqrt(n) summary embeddings:12x speedup,RMSE4.33'))
  assert(summary.limitations.includes('Extra time spent exploring is not evidence of faster task completion.'))
  assert.deepEqual(report.studies.map(study => study.participants_n), [17, 13, 15, null])
  assert(report.studies.every(study => study.results === null && study.measures.length === 0))
  assert.deepEqual(report.studies.at(-1).design_codes, ['E06_offline_accuracy', 'E07_performance'])
})
test('RDF Surveyor preserves usability, analytics, and author scenario evidence without pooling study denominators', () => {
  const report = read('reports/V3-01765.json'); const summary = report.report_level_evaluation
  for (const value of ['Mean SUS65(SD16)', 'Standalone151 users/287 sessions/47 repositories', 'DataGraft375/531/61', '13/17 tools ran']) assert(summary.results.includes(value))
  assert(summary.limitations.includes('Usage figures are analytics identifiers, not study participants.'))
  assert.deepEqual(report.studies.map(study => study.participants_n), [14, null, null, null])
  assert(report.studies.every(study => study.results === null && study.measures.length === 0))
  assert.deepEqual(report.studies.map(study => study.study_id), ['V3-01765-usability', 'V3-01765-live-operations', 'V3-01765-analytics', 'V3-01765-author-scenario-comparison'])
})
test('all companion artifact hashes bind the current published files', () => {
  const manifest = read('data-manifest.json')
  const names = ['catalog.json', 'catalog-index.json', 'catalog.schema.json', 'codebook.json', 'selection-register.json', 'search-strategies.json', 'prisma-checklist.json', 'survey.tex', 'kg-exploration-requirements.tex', 'survey.pdf', 'kg-exploration-requirements.pdf', 'synthesis-grouping-rule.json', 'synthesis-evidence-ledger.json', 'synthesis-evidence-ledger.csv', 'synthesis-candidate-register.csv', 'review-method.json', 'requirements.json', 'recovery-ledger.json', 'recovery-assessment.json', 'recovery-assessment.txt', 'selection-register-frozen.json', 'catalog-frozen.json', 'survey-frozen.tex', 'recovery-integration.json', 'recovery-extractions.json', 'recovery-synthesis.json']
  assert.deepEqual(Object.keys(manifest.artifact_sha256).sort(), names.sort())
  for (const name of names) assert.equal(manifest.artifact_sha256[name], crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'public/data', name))).digest('hex'), name)
})
test('recovery candidates reconcile with receipts without changing adjudicated eligibility', () => {
  const recovery = read('recovery-ledger.json'); const frozen = new Map(read('selection-register-frozen.json').records.map(r => [r.record_id, r]))
  assert.equal(new Set(recovery.records.map(r => r.record_id)).size, recovery.summary.attempted)
  assert.equal(recovery.records.filter(r => r.pdf_sha256).length, recovery.summary.pdfs_acquired)
  assert.equal(recovery.records.filter(r => r.title_matched).length, recovery.summary.pdfs_title_matched)
  assert.equal(recovery.records.filter(r => r.pdf_sha256 && !r.title_matched).length, recovery.summary.pending_identity)
  assert.equal(recovery.summary.pdfs_acquired + recovery.summary.not_recovered, recovery.summary.attempted)
  for (const r of recovery.records) {
    assert.equal(frozen.get(r.record_id).workflow, 'Not retrieved'); assert.equal(frozen.get(r.record_id).final_decision, null)
    assert.equal(r.assessment_status, 'not_assessed')
    if (r.pdf_sha256) { assert.match(r.pdf_sha256, /^[a-f0-9]{64}$/); assert(safeUrl(r.source_url)); assert(r.pdf_pages > 0) }
  }
  assert(!JSON.stringify(recovery).includes('/Users/'))
})
test('requirements retain the mandatory dual-model baseline and all acceptance references resolve', () => {
  const spec = read('requirements.json'); const ids = new Set(spec.acceptance_cases.map(r => r.id))
  assert.equal(spec.functional_requirements.length, 20); assert.equal(spec.quality_requirements.length, 11); assert.equal(ids.size, 11)
  for (const r of spec.functional_requirements) for (const id of r.acceptance_cases) assert(ids.has(id), `${r.id}: ${id}`)
  assert.equal(spec.source_sha256, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'public/data/kg-exploration-requirements.tex'))).digest('hex'))
  assert.equal(read('review-method.json').full_text_reviewers, 1); assert.equal(read('review-method.json').data_extractors, 3)
})

test('AI recommendations cover recovered records with source-bound locators and preserve final human decisions', () => {
  const triage = read('recovery-assessment.json'); const recovery = read('recovery-ledger.json')
  const candidates = new Map(recovery.records.filter(r => r.pdf_sha256).map(r => [r.record_id, r]))
  const frozen = new Map(read('selection-register-frozen.json').records.map(r => [r.record_id, r]))
  assert.equal(triage.records.length, candidates.size)
  assert.equal(new Set(triage.records.map(r => r.record_id)).size, candidates.size)
  assert.equal(triage.method.reviewer_count, 1); assert.equal(triage.method.independent_duplicate_review, false)
  assert.equal(triage.method.human_verification, 'pending'); assert.equal(triage.summary.added_to_frozen_corpus, 0)
  for (const label of Object.keys(triage.labels)) assert.equal(triage.summary[label], triage.records.filter(r => r.recommendation === label).length)
  for (const r of triage.records) {
    const candidate = candidates.get(r.record_id); assert(candidate, r.record_id)
    assert(Object.hasOwn(triage.labels, r.recommendation)); assert(r.rationale); assert(r.criterion)
    assert.equal(r.adjudication_status, 'pending_human_verification'); assert.equal(r.integration_status, 'not_integrated')
    assert.equal(frozen.get(r.record_id).final_decision, null)
    assert(safeUrl(r.source.source_url)); assert.match(r.source.sha256, /^[a-f0-9]{64}$/)
    assert(r.decisive_pdf_pages.length > 0); assert(r.decisive_pdf_pages.every(page => Number.isInteger(page) && page > 0 && page <= r.source.pdf_pages))
    if (r.source_correction) {
      assert.equal(r.source_correction.original_sha256, candidate.pdf_sha256); assert(r.source_correction.original_retained)
      assert.notEqual(r.source.sha256, candidate.pdf_sha256)
    } else assert.equal(r.source.sha256, candidate.pdf_sha256)
    if (r.criterion.startsWith('source_')) assert.equal(r.recommendation, 'pending')
    if (r.publication_check) assert(safeUrl(r.publication_check.url))
  }
  for (const [name, digest] of [[triage.criteria_source.artifact, triage.criteria_source.sha256], ['recovery-ledger.json', triage.source_bindings.recovery_ledger_sha256], [triage.source_bindings.selection_register_artifact, triage.source_bindings.selection_register_sha256]]) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'public/data', name))).digest('hex'), digest)
  assert(!JSON.stringify(triage).includes('/Users/'))
})


test('follow-up inclusions preserve historical reports, require review-track proof and retain physical source bounds', () => {
  const integration = read('recovery-integration.json'); const full = read('catalog.json')
  const extracts = new Map(read('recovery-extractions.json').records.map(row => [row.record_id,row]))
  const historical = new Set(read('catalog-frozen.json').reports.map(row => row.report_id))
  const added = integration.records.filter(row => row.decision === 'Include')
  assert.equal(added.length, integration.summary.added_reports)
  assert.equal(full.reports.filter(row => !historical.has(row.report_id)).length, added.length)
  assert.equal(integration.method.additional_human_review, false)
  assert.equal(integration.method.independent_duplicate_review, false)
  assert.equal(integration.method.historical_human_fulltext_reviewers,1)
  assert.equal(integration.method.historical_human_data_extractors,3)
  for (const row of added) {
    const extraction = extracts.get(row.record_id); const report = full.reports.find(r => r.report_id === row.record_id)
    assert.equal(extraction.publication.peer_review_status,'confirmed')
    assert.equal(extraction.publication.identity_confirmed,true)
    assert(extraction.publication.publication_evidence.length > 0)
    if (extraction.publication.publication_date) assert(extraction.publication.publication_date <= full.literature_cutoff)
    assert.equal(report.source_reading.source_sha256,extraction.source.sha256)
    for (const e of report.evidence.filter(e => e.source_kind === 'primary_report')) {
      assert(e.physical_pdf_pages.length > 0)
      assert(e.physical_pdf_pages.every(page => extraction.source.read_pages.includes(page) && page <= extraction.source.pdf_pages))
    }
  }
  assert.equal(integration.records.find(r => r.record_id === 'V3-01823').decision,'Exclude')
  assert.equal(integration.records.find(r => r.record_id === 'V3-01054').decision,'Exclude')
  const sview = full.reports.find(r => r.report_id === 'V3-01744')
  assert.equal(sview.studies[0].cohort_relations[0].relation,'explicitly_same')
  const rdf = full.reports.find(r => r.report_id === 'V3-02210')
  assert.deepEqual(rdf.taxonomy.visualisation.codes.map(c => c.representation_role.roles),[['query_pattern'],['data_result']])
})


test('new manuscript claims bind the published recovery extractions and current decisions', () => {
  const additions = read('recovery-synthesis.json'); const source = fs.readFileSync(path.join(root,'public/data/survey.tex'),'utf8')
  const full = read('catalog.json'); const ledger = read('recovery-integration.json')
  const extracts = new Map(read('recovery-extractions.json').records.map(row => [row.record_id,row]))
  assert.equal(additions.manuscript_sha256,crypto.createHash('sha256').update(source).digest('hex'))
  assert.equal(additions.recovery_decisions.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'public/data/recovery-integration.json'))).digest('hex'))
  assert.deepEqual(additions.counts,ledger.summary)
  assert.deepEqual([...additions.new_primary_report_ids].sort(),ledger.records.filter(r => r.decision === 'Include').map(r => r.record_id).sort())
  for (const id of additions.new_primary_report_ids) assert.match(source, new RegExp(`\\\\bibitem\\[[^\\n]*\\]\\{${id}\\}`))
  for (const claim of additions.additions) {
    assert(source.includes(claim.context_text),claim.addition_id)
    for (const receipt of claim.sources) {
      const extraction = extracts.get(receipt.report_id)
      assert(full.reports.some(r => r.report_id === receipt.report_id))
      assert.equal(receipt.source_sha256,extraction.source.sha256)
      for (const locator of receipt.locators) {
        const value = locator.extraction_pointer.split('/').slice(1).reduce((node,key) => node[key],extraction)
        assert.deepEqual(locator.source_value,value)
        assert(locator.physical_pdf_pages.every(page => extraction.source.read_pages.includes(page)))
      }
    }
  }
})
