export const STATUS_LABELS = {
  implemented_or_demonstrated: 'Implemented or demonstrated',
  proposed_method: 'Proposed method',
  future_work: 'Future work',
  not_established: 'Not established',
}
export const DIMENSIONS = ['interaction', 'guidance', 'visualisation', 'evaluation', 'scalability']
export const FILTER_KEYS = ['q', 'interaction', 'guidance', 'model', 'evaluation', 'status', 'from', 'to', 'sort', 'page']
export const MISSING_LABELS = { not_reported: 'Not reported', not_established: 'Not established', not_applicable: 'Not applicable' }
export const primaryApproaches = r => r.approaches.filter(a => ['primary_contribution', 'primary_extension'].includes(a.report_role))
export const namesOf = r => primaryApproaches(r).map(a => a.attested_name).filter(Boolean)
export const reportPath = r => `/reports/${encodeURIComponent(typeof r === 'string' ? r : r.report_id)}`
export const codeLabel = (code, book) => book?.vocabularies && Object.values(book.vocabularies).find(v => Object.hasOwn(v, code))?.[code] || code.replace(/^[A-Z]\d+_/, '').replaceAll('_', ' ')
export const shortCode = code => code.replace(/^[A-Z]\d+_/, '').replaceAll('_', ' ')
export const safeUrl = value => { try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? u.href : null } catch { return null } }
export const readFilters = params => Object.fromEntries(FILTER_KEYS.map(key => [key, params.get(key) || (key === 'sort' ? 'year-desc' : key === 'page' ? '1' : '')]))
export function writeFilters(values) {
  const p = new URLSearchParams()
  for (const key of FILTER_KEYS) if (values[key] && !(key === 'page' && values[key] === '1') && !(key === 'sort' && values[key] === 'year-desc')) p.set(key, values[key])
  return p
}
const dimensionMatches = (dimension, code, status) => !code || dimension.codes.some(c => c.code === code && (!status || c.status === status))
export function filterReports(reports, filters) {
  const q = (filters.q || '').trim().toLocaleLowerCase('en')
  const filtered = reports.filter(r => {
    if (q && ![r.publication.title, ...r.publication.authors, r.publication.doi || '', r.report_id, ...namesOf(r)].join(' ').toLocaleLowerCase('en').includes(q)) return false
    if (filters.from && r.publication.year < Number(filters.from)) return false
    if (filters.to && r.publication.year > Number(filters.to)) return false
    if (!dimensionMatches(r.taxonomy.interaction, filters.interaction, filters.status) || !dimensionMatches(r.taxonomy.guidance, filters.guidance, filters.status) || !dimensionMatches(r.taxonomy.evaluation, filters.evaluation, filters.status) || !dimensionMatches(r.backend.data_model, filters.model, filters.status)) return false
    if (filters.status && ![...Object.values(r.taxonomy), r.backend.data_model, r.backend.access].some(d => d.codes.some(c => c.status === filters.status))) return false
    return true
  })
  return filtered.sort((a, b) => filters.sort === 'title' ? a.publication.title.localeCompare(b.publication.title, 'en') : filters.sort === 'year-asc' ? a.publication.year - b.publication.year || a.publication.title.localeCompare(b.publication.title, 'en') : b.publication.year - a.publication.year || a.publication.title.localeCompare(b.publication.title, 'en'))
}
export function compareIds(params, knownIds) { return [...new Set((params.get('ids') || '').split(',').filter(id => knownIds.has(id)))].slice(0, 4) }
export function citation(r) {
  const p = r.publication
  return `${p.authors.join('; ')} (${p.year ?? 'year not established'}). ${p.title}.${p.venue ? ` ${p.venue}.` : ''}${p.doi ? ` https://doi.org/${p.doi}` : p.persistent_url ? ` ${p.persistent_url}` : ''}`
}
const csvCell = v => {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replaceAll('"', '""')}"`
}
export function reportsCsv(reports) {
  const headers = ['report_id', 'year', 'title', 'authors', 'venue', 'doi', 'primary_approach_names', 'interaction', 'guidance', 'visualisation', 'graph_model', 'query_languages', 'evaluation', 'scalability']
  return '\uFEFF' + [headers, ...reports.map(r => [r.report_id, r.publication.year, r.publication.title, r.publication.authors.join('; '), r.publication.venue, r.publication.doi, namesOf(r).join('; '), ...['interaction', 'guidance', 'visualisation'].map(d => r.taxonomy[d].codes.map(c => `${c.code}:${c.status}`).join('; ')), r.backend.data_model.codes.map(c => `${c.code}:${c.status}`).join('; '), r.backend.query_languages.map(x => `${x.name}:${x.status}`).join('; '), ...['evaluation', 'scalability'].map(d => r.taxonomy[d].codes.map(c => `${c.code}:${c.status}`).join('; '))])].map(row => row.map(csvCell).join(',')).join('\r\n')
}
const bibEscape = text => String(text ?? '').replaceAll('\\', '\\textbackslash{}').replace(/([{}%&_#])/g, '\\$1')
export function reportsBib(reports) {
  return reports.map(r => {
    const p = r.publication
    const fields = { title: p.title, author: p.authors.join(' and '), year: p.year, ...(p.venue ? { note: p.venue } : {}), ...(p.doi ? { doi: p.doi } : {}), ...(safeUrl(p.persistent_url) ? { url: p.persistent_url } : {}) }
    return `@misc{${r.report_id.replace(/[^A-Za-z0-9_:-]/g, '_')},\n${Object.entries(fields).map(([key, value]) => `  ${key} = {${['doi', 'url'].includes(key) ? String(value).replace(/[{}]/g, '\\$&') : bibEscape(value)}}`).join(',\n')}\n}`
  }).join('\n\n') + '\n'
}
export function download(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function fetchJson(path, signal) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${path}`, { signal })
  if (!response.ok) throw new Error(`The data request failed (${response.status}).`)
  return response.json()
}
export function reportSummary(r) {
  const entries = r.taxonomy.interaction.codes.filter(c => c.status === 'implemented_or_demonstrated').map(c => shortCode(c.code))
  if (entries.length) return [...new Set(entries)].slice(0, 3).join(' · ')
  const statuses = new Set(r.taxonomy.interaction.codes.map(c => c.status))
  if (statuses.has('proposed_method')) return 'Proposed interaction method'
  if (statuses.has('future_work')) return 'Interaction described as future work'
  return 'Interaction coding not established'
}
