#!/usr/bin/env python3
"""Publish manually resolved recovery records, preserving the historical assessment.

Inputs are source-located extraction receipts plus explicit, author-delegated decisions;
this publisher does not classify eligibility from titles or keywords.
Without ignored local run inputs it uses the committed frozen catalogue, decision
ledger and extraction receipts, allowing the same catalogue to be reproduced.
"""
import copy, hashlib, json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'website/public/data'
RUN=ROOT/'outputs/recovery-integration-2026-10-06'
DATE='2026-10-06'
def read(p): return json.loads(p.read_text())
def write(p,v):
 compact=p.name in ['catalog.json','catalog-index.json','selection-register.json'] or p.parent.name=='reports'
 p.write_text(json.dumps(v,ensure_ascii=False,**({'separators':(',',':')} if compact else {'indent':2}))+'\n')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def string(x): return '; '.join(map(str,x)) if isinstance(x,list) else json.dumps(x,ensure_ascii=False) if isinstance(x,dict) else x
def strings(x): return x if isinstance(x,list) else [str(x)] if x else []
def build_report(x,triage,frozen):
 rid=x['record_id']; source=x['source']; evidence=[]
 def ev(claim,pages,section,kind='primary_report',url=None):
  pages=sorted(set(pages or [])); assert all(0<p<=source['pdf_pages'] for p in pages),(rid,pages)
  if kind=='primary_report': assert set(pages)<=set(source['read_pages']),(rid,'unread locator',pages)
  eid=f'{rid}-REC-{len(evidence)+1:03d}'
  evidence.append(dict(evidence_id=eid,report_id=rid,claim=claim or 'Source-located observation',source_kind=kind,source_url=url or source.get('source_url') or triage['source']['source_url'],source_sha256=source['sha256'] if kind=='primary_report' else None,section=section,physical_pdf_pages=pages,advisory_pdf_pages=[],structural_preflight='PASS' if pages else 'UNAVAILABLE',verified_on=DATE))
  return eid
 pub=copy.deepcopy(x['publication']); pub_e=[ev(a['finding'],[],'Publication and review track','publisher_metadata',a['url']) for a in pub['publication_evidence']]
 genre=pub['genre'].replace('-','_');genre={'demonstration_paper':'demo_paper','journal_article':'research_article'}.get(genre,genre);genre=genre if genre in ['research_article','conference_paper','demo_paper','book_chapter'] else 'not_established'
 publication={k:pub.get(k) for k in ['title','authors','year','publication_date','publication_date_note','venue','doi','language','version']}
 publication.update(persistent_url='https://doi.org/'+pub['doi'] if pub.get('doi') else source.get('source_url') or triage['source']['source_url'],genre=genre,frozen_record_title=frozen['title'],frozen_record_year=None,identity_status='confirmed',evidence_ids=pub_e)
 approaches=[]
 for i,a in enumerate(x['approaches']):
  name=a.get('name');kind=a.get('kind');role=a.get('report_role')
  approaches.append(dict(approach_id=f'{rid}-AP-{i+1}',attested_name=name,name_status='attested' if name else 'not_established',kind=kind if kind in ['system','method','component','platform','dataset','vocabulary','other'] else 'system',report_role=role if role in ['primary_contribution','primary_extension','primary_component','integration_host','dependency','comparison','prior_context','future_context','scope_excluded_context'] else 'primary_contribution',family_id=None,evidence_ids=[ev('Attested approach: '+str(name),a.get('pages') or x['facts']['interaction']['pages'],'Approach identity')]))
 def dimension(fact,prefix=None):
  codes=[]
  entries=[c for c in fact.get('codes',[]) if not prefix or c['code'].startswith(prefix)]
  if entries:
   eid=ev(fact['text'],fact['pages'],'Extracted capability')
   for c in entries:
    row=dict(code=c['code'],status=c['status'],approach_ids=[a['approach_id'] for a in approaches if a['report_role'].startswith('primary')],evidence_ids=[eid],notes=fact['text'])
    if c['code'].startswith('V'):
     roles=c.get('roles',[]); row['representation_role']=dict(roles=roles,missingness=None if roles else 'unspecified',role_assertions=[dict(role=role,scope=fact['text'],evidence_ids=[eid],source_sha256=source['sha256'],physical_pdf_pages=fact['pages']) for role in roles])
    codes.append(row)
  return dict(codes=codes,missingness=None if codes else 'not_established')
 tax={k:dimension(x['facts'][k]) for k in ['interaction','guidance','visualisation','scalability','evaluation']}
 back=x['facts']['backend']
 def named(vals):
  out=[]
  for v in vals:
   if isinstance(v,str):v=dict(name=v,role='query language',status='implemented_or_demonstrated',pages=back['pages'])
   out.append(dict(name=v['name'],role=v.get('role','implementation component'),status=v.get('status','implemented_or_demonstrated'),evidence_ids=[ev(v['name']+'; '+back['text'],v.get('pages') or back['pages'],'Backend')]))
  return out
 backend=dict(data_model=dimension(back,'B'),access=dimension(back,'A'),query_languages=named(x['query_languages']),implementation_engines=named(x['implementation_engines']),native_format_missingness='not_established',source_model_description=back['text'],notes=None)
 studies=[]
 for i,s in enumerate(x['studies']):
  eid=ev('; '.join(filter(None,[s['label'],string(s.get('results')),string(s.get('tasks'))])),s['pages'],'Evaluation')
  origin=s.get('evidence_origin');origin={'this_report':'reported_here','current_report':'reported_here','prior_report':'summarized_previous_study','previous_report':'summarized_previous_study'}.get(origin,origin)
  if origin not in ['reported_here','summarized_previous_study','contextual','not_established']:origin='not_established'
  allocation=s.get('allocation');valid=['within_subject','between_subject','repeated_single_system','single_system','annotation','not_reported','not_applicable']
  if allocation not in valid:allocation='not_reported'
  n=s.get('participants_n');n=n if isinstance(n,int) else None
  recruited=s.get('recruited_or_completed_n');recruited=recruited if isinstance(recruited,int) else None
  studies.append(dict(study_id=f'{rid}-S{i+1}',design_codes=s['design_codes'],evidence_origin=origin,participants_n=n,recruited_or_completed_n=recruited,population=string(s.get('population')),allocation=allocation,cohort_relations=[],response_sets=[dict(count=z.get('count') if isinstance(z.get('count'),int) else None,unit=z['unit'],condition=string(z.get('condition')),evidence_ids=[eid]) for z in s.get('response_sets',[])],tasks=strings(s.get('tasks')),comparators=strings(s.get('comparators')),measures=strings(s.get('measures')),results=string(s.get('results')) or None,limitations=strings(s.get('limitations')),evidence_ids=[eid],condition_allocation=s.get('condition_allocation'),response_note=string(s.get('recruited_or_completed_n')) if isinstance(s.get('recruited_or_completed_n'),dict) else s.get('response_note'),design=s['label']+'; '+string(s.get('allocation') or 'allocation not reported'),cohort_note='Cross-report cohort overlap not established; reports are not independent study counts.'))
 scales=[]
 for s in x['scale_observations']:
  # Traffic is an evaluation observation, not dataset/display scale.
  if s.get('unit') and any(word in s['unit'].lower() for word in ['hits','users','visits','participants']):continue
  scope=s.get('scope'); scope=scope if scope in ['source_dataset','loaded_dataset','displayed_view','benchmark_workload','preprocessing_input'] else 'source_dataset'
  scales.append(dict(value=s.get('value'),range=dict(min=s['range'][0],max=s['range'][1]) if isinstance(s.get('range'),list) and len(s['range'])==2 else s.get('range'),unit=s['unit'],scope=scope,conditions=string(s.get('conditions') or s.get('scope')),status=s.get('status','implemented_or_demonstrated'),evidence_ids=[ev(string(s),s['pages'],'Scale observation')]))
 resources=[]
 for z in x['reported_resources']:
  role={'source_code':'application_source','code':'application_source','source':'application_source','software':'application_source','materials':'research_materials'}.get(z.get('role'),z.get('role'))
  if role not in ['application_source','component_source','deployment','data','research_materials','documentation','demo','video','endpoint','other']:role='other'
  resources.append(dict(reported_url=z['url'],resource_role=role,checked_on=None,http_status=None,final_url=None,identity_status='not_checked',identity_scope=None,working_demo_verified=None,source_build_verified=None,license_verified=None,historical_version_equivalence_verified=None,notes='URL reported in assessed source; current availability and version equivalence not tested.',evidence_ids=[ev('Reported resource '+z['url'],z['pages'],'Resources')]))
 selection=dict(proposal='Include',proposal_basis='Source-grounded follow-up assessment under unchanged eligibility criteria.',criteria_evidence_ids=pub_e+list(dict.fromkeys(e for d in tax.values() for c in d['codes'] for e in c['evidence_ids'])),final_decision='Include',adjudication=dict(status='complete',basis='Criteria-based inclusion in author-authorized working draft. See recovery-integration.json for separate machine-assistance and human-review provenance.',resolved_on=DATE,decision_basis='author_resolution',authority_reference=f'recovery-integration.json#{rid}'))
 if rid=='V3-01744':
  for i,j in [(0,1),(1,0)]:
   studies[i]['cohort_relations']=[dict(related_study_id=studies[j]['study_id'],relation='explicitly_same',evidence_ids=studies[i]['evidence_ids']+studies[j]['evidence_ids'])]
   studies[i]['cohort_note']='The same 24-person setting is shared by the two human comparison analyses; do not sum samples.'
 return dict(report_id=rid,source_record_ids=[rid],publication=publication,source_reading=dict(status='partial_report_read',scope=source['reading_scope'],structural_preflight='PASS',source_sha256=source['sha256'],primary_report_pages_read=source['read_pages'],source_attempt_notes=['Follow-up extraction on 6 October 2026; recorded reading scope does not attest historical human review.']),selection=selection,approaches=approaches,taxonomy=tax,backend=backend,studies=studies,scale_observations=scales,resources=resources,evidence=evidence,limitations=x['limitations'],descriptions={k:x['facts'][k]['text'] for k in ['interaction','guidance','visualisation','scalability','evaluation','backend']})
def main():
 private_inputs=(RUN/'baseline/catalog.json').exists() and (RUN/'decisions.json').exists()
 baseline_catalog=RUN/'baseline/catalog.json' if private_inputs else DATA/'catalog-frozen.json'
 baseline_register=RUN/'baseline/selection-register.json' if private_inputs else DATA/'selection-register-frozen.json'
 baseline_manuscript=RUN/'baseline/survey.tex' if private_inputs else DATA/'survey-frozen.tex'
 baseline=read(baseline_catalog); oldindex=read(RUN/'baseline/catalog-index.json' if private_inputs else DATA/'catalog-index.json');triage=read(DATA/'recovery-assessment.json');ts={r['record_id']:r for r in triage['records']}
 decisions=read(RUN/'decisions.json') if private_inputs else {r['record_id']:{k:v for k,v in r.items() if k not in ['record_id','source','publication']} for r in read(DATA/'recovery-integration.json')['records']}
 extracts={p.stem:read(p) for p in (RUN/'extractions').glob('*.json')} if private_inputs else {r['record_id']:r for r in read(DATA/'recovery-extractions.json')['records']}
 catalog=copy.deepcopy(baseline);register={r['record_id']:r for r in catalog['selection_register']}; new=[]
 for rid,d in decisions.items():
  r=register[rid]; assert r['workflow']=='Not retrieved'
  if d['decision']=='Include':
   x=extracts[rid];assert x['publication']['identity_confirmed'] and x['publication']['peer_review_status']=='confirmed'
   assert x['publication'].get('publication_date') is None or x['publication']['publication_date']<=catalog['literature_cutoff']
   report=build_report(x,ts[rid],r);new.append(report);r.update(workflow='Assessed',source_available='Yes',final_decision='Include',decision_basis='Author-authorized follow-up source assessment; recovery-integration.json#'+rid,exclusion_reason='')
  elif d['decision']=='Exclude':r.update(workflow='Assessed',source_available='Yes',final_decision='Exclude',decision_basis='Author-authorized source assessment; recovery-integration.json#'+rid,exclusion_reason=d['reason'])
  elif d['decision']=='Pending' and not ts[rid]['criterion'].startswith('source_'):r.update(workflow='Recovered pending assessment',source_available='Candidate PDF',final_decision=None,decision_basis=d['reason'])
 catalog['reports']+=new
 # Families are linked only by explicitly attested system names, not title similarity.
 mapping={'ViziQuer':'SYS-VIZIQUER','Sparklis':'SYS-SPARKLIS','OptiqueVQS':'SYS-OPTIQUEVQS','Discovery Hub':'SYS-DISCOVERY-HUB'}
 for family_key,family_id in mapping.items():
  new_members=[]
  for r in new:
   hints=[a.get('family_hint') for a in extracts[r['report_id']]['approaches']]
   if any(h and family_key.casefold() in h.casefold() for h in hints):
    for a in r['approaches']:
     if a['report_role'].startswith('primary'):a['family_id']=family_id
    new_members.append(r)
  existing=[r for r in baseline['reports'] if any(a.get('attested_name') and family_key.casefold() in a['attested_name'].casefold() and a['report_role'].startswith('primary') for a in r['approaches'])]
  members=existing+new_members
  if len(members)>1 and new_members:
   catalog['family_relations'].append(dict(family_id=family_id+'-RECOVERY',report_ids=[r['report_id'] for r in members],relationship='same_named_system',evidence_ids=[e for r in members for a in r['approaches'] if a.get('attested_name') and (family_key.casefold() in a['attested_name'].casefold() or r in new_members) for e in a['evidence_ids']],notes='Explicitly named report-family contributions; version and cohort equivalence not inferred.'))
 write(DATA/'catalog.json',catalog)
 for r in catalog['reports']:write(DATA/'reports'/f"{r['report_id']}.json",r)
 index=[]
 for r in catalog['reports']:
  p=copy.deepcopy(r);p.pop('report_level_evaluation',None);p['evidence']=[];p['selection']['criteria_evidence_ids']=[]
  for d in list(p['taxonomy'].values())+[p['backend']['data_model'],p['backend']['access']]:
   for c in d['codes']:c['evidence_ids']=[];c['notes']=None;c.pop('representation_role',None)
  p['studies']=[{k:s[k] for k in ['study_id','design_codes','evidence_origin','participants_n','cohort_note']} for s in r['studies']]
  p['resources']=[{k:v for k,v in z.items() if k in ['reported_url','resource_role','http_status','identity_status','identity_scope','checked_on']} for z in p['resources']]
  p['descriptions']={};p['limitations']=[];p['scale_observations']=[];index.append(p)
 counts=dict(included_reports=len(catalog['reports']),reports_sought=len(register),reports_assessed=sum(r['workflow']=='Assessed' for r in register.values()),excluded_reports=sum(r['final_decision']=='Exclude' for r in register.values()),not_retrieved=sum(r['workflow']=='Not retrieved' for r in register.values()),pending_assessment=sum(r['workflow']=='Recovered pending assessment' for r in register.values()),duplicate_copies=len(catalog['duplicate_copies']))
 assert counts['reports_assessed']+counts['not_retrieved']+counts['pending_assessment']==counts['reports_sought']
 assert counts['included_reports']+counts['excluded_reports']==counts['reports_assessed']
 meta={k:v for k,v in catalog.items() if k not in ['reports','selection_register','duplicate_copies']};meta.update(reports=index,counts=counts,review=oldindex['review'],recovery_extension=dict(added_reports=len(new),historical_included_reports=242,method='Author-authorized Codex source extraction and criteria application; no additional human review attested.',ledger='recovery-integration.json'))
 write(DATA/'catalog-index.json',meta);write(DATA/'selection-register.json',dict(literature_cutoff=catalog['literature_cutoff'],verified_on=DATE,records=catalog['selection_register'],duplicate_copies=catalog['duplicate_copies']))
 (DATA/'selection-register-frozen.json').write_bytes(baseline_register.read_bytes())
 (DATA/'catalog-frozen.json').write_bytes(baseline_catalog.read_bytes())
 (DATA/'survey-frozen.tex').write_bytes(baseline_manuscript.read_bytes())
 # This remains the dated triage snapshot; later decisions are stored separately.
 triage['criteria_source']['artifact']='survey-frozen.tex';triage['source_bindings']['selection_register_artifact']='selection-register-frozen.json';write(DATA/'recovery-assessment.json',triage)
 ledger=dict(schema_version='1.0',resolved_on=DATE,literature_cutoff=catalog['literature_cutoff'],authorization=dict(user_message='ok procedi',scope='Integrate sources judged eligible into the working survey and website.',authority='Author delegated criteria application to Codex; this does not attest human per-report verification.'),method=dict(selection='Parent criteria application after source extraction; no automatic title classifier.',extraction='Codex scoped primary-source reading; root plus 3 extraction agents; no independent blinded duplicate screening.',additional_human_review=False,independent_duplicate_review=False,human_per_report_verification='not_attested',historical_human_fulltext_reviewers=1,historical_human_data_extractors=3),baseline=dict(included_reports=242,reports_assessed=324,excluded_reports=82,not_retrieved=667,register_artifact='selection-register-frozen.json',register_sha256=sha(DATA/'selection-register-frozen.json'),manuscript_artifact='survey-frozen.tex',manuscript_sha256=sha(DATA/'survey-frozen.tex')),summary=dict(added_reports=len(new),followup_excluded=sum(d['decision']=='Exclude' for d in decisions.values()),unresolved_candidates=sum(d['decision']=='Pending' for d in decisions.values()),**counts),records=[dict(record_id=rid,**d,source=dict(extracts[rid]['source'],source_url=extracts[rid]['source'].get('source_url') or ts[rid]['source']['source_url']) if rid in extracts else ts[rid]['source'],publication=extracts[rid]['publication'] if rid in extracts else dict(peer_review_status='not_established',publication_evidence=d['publication_evidence']) if d.get('publication_evidence') else None) for rid,d in decisions.items()])
 write(DATA/'recovery-integration.json',ledger);write(DATA/'recovery-extractions.json',dict(schema_version='1.0',extracted_on=DATE,records=list(extracts.values())))
 manifest=read(DATA/'data-manifest.json');manifest.update(catalog_sha256=sha(DATA/'catalog.json'),catalog_report_count=len(catalog['reports']),catalog_decision_count=len(register));write(DATA/'data-manifest.json',manifest)
 print(json.dumps(ledger['summary']))
if __name__=='__main__':main()
