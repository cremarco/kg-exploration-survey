import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => JSON.parse(fs.readFileSync(path.join(root, 'public/data', file), 'utf8'))
const catalog = read('catalog-index.json'); const book = read('codebook.json'); const search = read('search-strategies.json'); const full = read('catalog.json'); const checklist = read('prisma-checklist.json'); const requirements = read('requirements.json'); const recovery = read('recovery-ledger.json')
const assessment = read('recovery-assessment.json'); const integration = read('recovery-integration.json'); const register = read('selection-register.json')
const server = await createServer({ root, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
try {
  const views = await server.ssrLoadModule('/src/App.jsx')
  const render = (View, props, route) => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(View, props)))
  const detail = full.reports.find(r => r.report_id === 'V3-00615'); const ordinary = full.reports.find(r => r.report_id === '2018_Cerans_ViziQuer_A') || full.reports[0]
  const feedLens = full.reports.find(r => r.report_id === 'V3-01126'); const rdfSurveyor = full.reports.find(r => r.report_id === 'V3-01765')
  const queryVowl = ['V3-02190', 'V3-02191'].map(id => full.reports.find(r => r.report_id === id))
  const pages = [
    ['home', views.Home, { catalog, selected: [], toggle: () => {}, integrationRecord: integration }, '/', ['How people explore knowledge graphs', String(catalog.counts.included_reports), String(catalog.counts.not_retrieved), String(integration.baseline.included_reports), 'historical baseline', 'author-authorized Codex']],
    ['catalogue', views.Catalog, { catalog, book, selected: [], toggle: () => {} }, '/catalogue?status=proposed_method', ['Report catalogue', 'Export', 'Capability status']],
    ['detail', views.ReportArticle, { report: detail, catalog, book }, `/reports/${detail.report_id}`, [detail.publication.title, 'Proposed method', 'Participants', 'n = 15', 'Source evidence']],
    ['feedlens-evaluation', views.ReportArticle, { report: feedLens, catalog, book }, `/reports/${feedLens.report_id}`, ['Report-level evaluation summary', 'Combined report-level outcomes remain separate from individual study entries.', 'FeedLens SUS84(SD8.6)', 'Offline K=sqrt(n) summary embeddings:12x speedup', 'Extra time spent exploring is not evidence of faster task completion.']],
    ['rdfsurveyor-evaluation', views.ReportArticle, { report: rdfSurveyor, catalog, book }, `/reports/${rdfSurveyor.report_id}`, ['Report-level evaluation summary', 'Combined report-level outcomes remain separate from individual study entries.', 'Mean SUS65(SD16)', 'Standalone151 users/287 sessions/47 repositories', 'Usage figures are analytics identifiers, not study participants.']],
    ['comparison', views.Comparison, { reports: [detail, ordinary] }, '/compare', ['Compare reports', 'Evaluation sample and limits', 'Proposed method', 'Graph model']],
    ['queryvowl-roles', views.ReportArticle, { report: queryVowl[0], catalog, book }, '/reports/V3-02190', ['View object: Query pattern', 'View object: Returned data', 'background WebVOWL ontology figure']],
    ['queryvowl-role-comparison', views.Comparison, { reports: queryVowl }, '/compare', ['View object: Query pattern', 'View object: Returned data', 'sidebar refinement lists']],
    ['evidence', views.Evidence, { catalog, book }, '/evidence', ['Evidence dimensions', 'Implemented or demonstrated', 'not sum']],
    ['families', views.Families, { catalog }, '/families', ['Named families and relationships', 'Source evidence', 'citation network']],
    ['methods', views.Methods, { catalog, searchRecord: search, checklistRecord: checklist, integrationRecord: integration }, '/methods', ['Selection accounting', String(integration.baseline.not_retrieved), String(integration.baseline.included_reports), String(catalog.counts.included_reports), 'Historical assessment baseline', 'Current working draft', 'Recovered pending assessment', '26 are reported', 'Partially', 'One person reviewed full-text eligibility', 'three people participated in data extraction', search.portable_v3.slice(0, 40).replaceAll('"', '&quot;')]],
    ['requirements', views.Requirements, { requirementsRecord: requirements }, '/requirements', ['Application requirements', 'FR-19', 'NFR-11', 'AC-11', 'not measured application results']],
    ['recovery', views.Recovery, { recoveryRecord: recovery, assessmentRecord: assessment, integrationRecord: integration }, '/recovery', ['Public-source recovery', String(recovery.summary.pdfs_acquired), 'Author-authorized working-draft integration', String(integration.summary.added_reports), 'independent duplicate review', 'Preliminary integration recommendations', 'one AI reviewer', String(assessment.summary.recommend_include), String(assessment.summary.pending), 'recovery-extractions.json']],
    ['recovery-recommendations', views.Recovery, { recoveryRecord: recovery, assessmentRecord: assessment, integrationRecord: integration }, '/recovery?recommendation=recommend_include', [`${assessment.summary.recommend_include} matching reports`, 'Human-Friendly', 'scoped reading', 'corrected report acquired']],
    ['recovery-source-failures', views.Recovery, { recoveryRecord: recovery, assessmentRecord: assessment, integrationRecord: integration }, '/recovery?recommendation=pending', [`${assessment.summary.pending} matching reports`, 'citation guide', 'Unresolved']],
    ['recovery-empty', views.Recovery, { recoveryRecord: recovery, assessmentRecord: assessment, integrationRecord: integration }, '/recovery?q=impossible-search-text', ['No reports match these filters', 'Page 1 of 1']],
    ['register-pending', views.Register, { registerRecord: register }, '/register?decision=Recovered%20pending%20assessment', ['Recovered pending assessment', `${register.records.filter(r => !r.final_decision && r.workflow === 'Recovered pending assessment').length} matching records`]],
    ['recovery-included', views.Recovery, { recoveryRecord: recovery, assessmentRecord: assessment, integrationRecord: integration }, '/recovery?outcome=Include', [`${integration.summary.added_reports} matching reports`, 'Added to working draft', 'Read extracted report and evidence']],
    ['recovery-excluded', views.Recovery, { recoveryRecord: recovery, assessmentRecord: assessment, integrationRecord: integration }, '/recovery?outcome=Exclude', [`${integration.summary.followup_excluded} matching reports`, 'Excluded after assessment']],
    ['about', views.About, { catalog, integrationRecord: integration }, '/about', ['Kārlis Čerāns', 'András Micsik', 'University of Milano-Bicocca', 'Cypher']],
    ['404', views.NotFound, {}, '/unknown', ['This page was not found', 'Open catalogue']],
  ]
  let passed = 0
  for (const [name, View, props, route, needles] of pages) {
    const html = render(View, props, route)
    for (const needle of needles) assert(html.toLowerCase().includes(needle.toLowerCase()), `${name}: content not rendered: ${needle}`)
    assert(!/undefined|null<|href="javascript:|NaN/.test(html), `${name}: invalid rendered content`)
    passed++
  }
  console.log(`Rendered ${passed} views with real catalogue, source, and search data; no browser automation was used.`)
} finally { await server.close() }
