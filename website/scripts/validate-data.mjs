import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'public/data', name), 'utf8'))
const schema = read('catalog.schema.json')
// Validate the exact constraints used by this self-contained catalogue schema.
// This is intentionally not a general JSON Schema implementation or metaschema check.
const kind = v => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' ? Number.isInteger(v) ? 'integer' : 'number' : typeof v === 'object' ? 'object' : typeof v
export function validate(value, s, at = '$') {
  let errors = []
  if (s.$ref) return validate(value, s.$ref.split('/').slice(1).reduce((x, key) => x[key], schema), at)
  if (s.type) { const types = Array.isArray(s.type) ? s.type : [s.type]; if (!types.includes(kind(value)) && !(types.includes('number') && kind(value) === 'integer')) return [`${at}: expected ${types.join('/')}, received ${kind(value)}`] }
  if (Object.hasOwn(s, 'const') && JSON.stringify(value) !== JSON.stringify(s.const)) errors.push(`${at}: const mismatch`)
  if (s.enum && !s.enum.some(v => JSON.stringify(v) === JSON.stringify(value))) errors.push(`${at}: enum mismatch (${String(value).slice(0, 80)})`)
  if (typeof value === 'string') {
    if (s.minLength && value.length < s.minLength) errors.push(`${at}: short string`)
    if (s.pattern && !new RegExp(s.pattern).test(value)) errors.push(`${at}: pattern mismatch`)
    if (s.format === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)))) errors.push(`${at}: invalid date (${value})`)
    if (s.format === 'uri') { try { new URL(value) } catch { errors.push(`${at}: invalid URI (${value})`) } }
  }
  if (typeof value === 'number') { if (s.minimum != null && value < s.minimum) errors.push(`${at}: below minimum`); if (s.maximum != null && value > s.maximum) errors.push(`${at}: above maximum`) }
  if (Array.isArray(value)) {
    if (s.minItems != null && value.length < s.minItems) errors.push(`${at}: too few items`)
    if (s.maxItems != null && value.length > s.maxItems) errors.push(`${at}: too many items`)
    if (s.uniqueItems && new Set(value.map(v => JSON.stringify(v))).size !== value.length) errors.push(`${at}: duplicate items`)
    if (s.items) value.forEach((v, i) => { errors.push(...validate(v, s.items, `${at}[${i}]`)) })
  } else if (value && typeof value === 'object') {
    for (const key of s.required || []) if (!Object.hasOwn(value, key)) errors.push(`${at}.${key}: required property absent`)
    for (const [key, v] of Object.entries(value)) { if (s.properties?.[key]) errors.push(...validate(v, s.properties[key], `${at}.${key}`)); else if (s.additionalProperties === false) errors.push(`${at}.${key}: unexpected property`); else if (s.additionalProperties && typeof s.additionalProperties === 'object') errors.push(...validate(v, s.additionalProperties, `${at}.${key}`)) }
  }
  for (const sub of s.allOf || []) errors.push(...validate(value, sub, at))
  if (s.oneOf && s.oneOf.filter(sub => !validate(value, sub, at).length).length !== 1) errors.push(`${at}: oneOf mismatch`)
  if (s.if && !validate(value, s.if, at).length && s.then) errors.push(...validate(value, s.then, at))
  return errors
}
export function checkData() {
  const catalog = read('catalog.json'); const index = read('catalog-index.json'); const registry = read('selection-register.json'); const manifest = read('data-manifest.json')
  const errors = validate(catalog, schema)
  assert.equal(errors.length, 0, errors.slice(0, 30).join('\n'))
  assert.equal(catalog.catalog_status, 'adjudicated')
  assert.deepEqual(index.counts, { included_reports: 242, reports_sought: 991, reports_assessed: 324, excluded_reports: 82, not_retrieved: 667, duplicate_copies: 39 })
  assert.equal(catalog.reports.length, 242); assert.equal(registry.records.length, 991); assert.equal(registry.duplicate_copies.length, 39)
  assert.equal(registry.records.filter(r => r.workflow === 'Not retrieved' && r.final_decision === null).length, 667)
  assert.equal(new Set(catalog.reports.map(r => r.report_id)).size, 242)
  assert.deepEqual(index.reports.map(r => r.report_id), catalog.reports.map(r => r.report_id))
  const allEvidence = new Set(catalog.reports.flatMap(r => r.evidence.map(e => e.evidence_id)))
  for (const r of catalog.reports) {
    assert.equal(r.selection.final_decision, 'Include'); assert.equal(r.selection.adjudication.status, 'complete')
    assert(r.publication.title && r.publication.authors.length && Number.isInteger(r.publication.year))
    assert.deepEqual(read(`reports/${r.report_id}.json`), r)
    const evidence = new Set(r.evidence.map(e => e.evidence_id)); assert.equal(evidence.size, r.evidence.length)
    const checkRefs = x => { if (!x || typeof x !== 'object') return; for (const [key, v] of Object.entries(x)) { if (key === 'evidence_ids' || key === 'criteria_evidence_ids') assert(v.every(id => evidence.has(id))); else checkRefs(v) } }; checkRefs(r)
    for (const code of r.taxonomy.visualisation.codes) {
      const role = code.representation_role
      assert(role, `${r.report_id}: representation role state missing`)
      assert.deepEqual(role.roles, [...new Set(role.role_assertions.map(assertion => assertion.role))])
      for (const assertion of role.role_assertions) {
        assert.equal(assertion.source_sha256, r.source_reading.source_sha256)
        const locators = r.evidence.filter(entry => assertion.evidence_ids.includes(entry.evidence_id))
        assert(assertion.physical_pdf_pages.every(page => locators.some(entry => entry.physical_pdf_pages.includes(page))))
      }
    }
    for (const e of r.evidence) if (e.physical_pdf_pages.length) assert(e.structural_preflight === 'PASS' && /^[a-f0-9]{64}$/.test(e.source_sha256))
  }
  for (const relation of catalog.family_relations) assert(relation.report_ids.every(id => catalog.reports.some(r => r.report_id === id)) && relation.evidence_ids.every(id => allEvidence.has(id)))
  assert.equal(catalog.citation_relations.length, 0)
  assert.equal(manifest.catalog_sha256, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'public/data/catalog.json'))).digest('hex'))
  const strings = JSON.stringify(catalog); assert(!/\/Users\/|\.codex-tmp|ChatGPT|generated_by_ai|AI.assisted/i.test(strings))
  assert(!fs.existsSync(path.join(root, 'public/data/sti-survey.json')) && !fs.existsSync(path.join(root, 'public/data/old')))
  return { reports: catalog.reports.length, register: registry.records.length, copies: registry.duplicate_copies.length, evidence: allEvidence.size }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(checkData())
