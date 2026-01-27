# Task

Given the text/abstract of a scientific paper, produce **one** JSON object (in English) that describes it, complying **exactly** with the schema, types, and constraints below. 
Do **not** invent information: if something isn’t stated, use an empty string `""`, empty array `[]`, or a boolean consistent with absence (usually `false`). 
Output **only valid JSON** (no prose, no markdown, no code fences, no trailing commas).

# SCHEMA (only these fields; any order; keys must match exactly)

* **id**: string, required. Lowercase slug `YYYY_surname_first-word-of-title` (e.g., `"2009_hignette_fuzzy"`).
* **added**: empty string.
* **year**: integer, required. Publication year.
* **firstAuthor**: string, required. Surname of the first author (e.g., `"Hignette"`).
* **authors**: array of strings, required. Full names (given name + surname) in byline order. Must start with `firstAuthor`.
* **title**: string. Paper title.
* **venue**: object, required.
  * **type**: enum `"conference"` | `"journal"` | `"workshop"`| `"challenge"`.
  * **acronym**: string. Venue acronym (no year).
* **nameOfApproach**: string. Proper name of the method/system, if present.
* **techniqueTags**: array of strings. Allowed values only: `"rule-based"`, `"SVM"`, `"CRF"`, `"clustering"`, `"embeddings"`, `"ontology-driven"`, `"transformer"`. Choose multiple if appropriate.
* **coreTasks**: object, required. Only:
  * **cta**, **cpa**, **cea**, **cnea**: booleans. `true` only if the paper explicitly covers that TASK; else `false`. (CTA/CPA/CEA/CNEA per survey).
* **supportTasks**: object, required (strings may be empty). Only:
  * **dataPreparation**: object with **description**, **spellChecker**, **unitsOfMeasurements** (all strings).
  * **columnClassification**, **subjectDetection**, **datatypeAnnotation**, **typeAnnotation**, **predicateAnnotation**, **nilAnnotation**: strings.
  * **entityLinking**: object with **description**, **candidateGeneration**, **entityDisambiguation** (all strings).
* **mainMethod**: object, required.
  * **type**: enum `"hybrid"` | `"supervised"` | `"unsupervised"`.
  * **technique**: string, required (e.g., `"SVM"`, `"rule-based"`, `"clustering"`).
  * **supervision**: object, include only if `mainMethod.type = "supervised"`.
    * **type**: enum `"supervised"` | `"weakly-supervised"` | `"distant"` | `"semi-supervised"`.
* **revision**: object, required (an object describing whether and how the system’s outputs are reviewed or edited by technique (fully automated) or user (semi automated) after the core method runs).
  * **type**: enum `"fully automated"` | `"semi automated"` | `"none"`.
  * **description**: string.
* **domain**: object, required.
  * **domain**: enum `"dependent"` | `"independent"`.
  * **type**: string. If `"dependent"`, specify domain (e.g., `"biomedical"`); if `"independent"`, may be generic/empty.
* **validation**: object, required.
  * **goldStandard**: string (name of GS if any, or number of table).
  * **metrics**: array of strings. Allowed values include:
    `"Precision"`, `"Recall"`, `"F1"`, `"F0.5"`, `"F2"`, `"Accuracy"`, `"Top-1 Accuracy"`, `"Top-k Accuracy"`,
    `"Micro-Precision"`, `"Macro-Precision"`, `"Micro-Recall"`, `"Macro-Recall"`, `"Micro-F1"`, `"Macro-F1"`, `"Weighted-F1"`,
    `"MAP"`, `"MRR"`, `"NDCG"`, `"P@k"`, `"R@k"`, `"F1@k"`, `"Hits@k"` (e.g., `"Hits@1"`, `"Hits@5"`, `"Hits@10"`), `"MRR@k"`, `"MAP@k"`, `"NDCG@k"`,
    `"ROC-AUC"` (or `"AUC-ROC"`), `"PR-AUC"` (or `"AUPRC"`), `"AP"`, `"EM"`, `"ARI"`, `"NMI"`, `"Purity"`, `"Silhouette"`.
* **code**: string. URL to code (repo/zip/project page) or `""` if unavailable.
* **license**: string, required. Licence name or `"Not Specified"`.
* **inputs**: object, required.
  * **typeOfTable**: string, required (e.g., `"HTML tables"`, `"Web tables"`, `"CSV"`, `"PDF"`).
  * **tableSources**: array of strings; enum values only: `"web"` | `"pdf"` | `"spreadsheet"` | `"relational"` | `"scientific"` | `"wiki"` | `"gov-open-data"`.
* **kg**: object.
  * **tripleStore**: string, required (e.g., `"DBpedia"`, `"Wikidata"`).
  * **index**: string (information about indexing).
* **output**: string, required (e.g., `"RDF"`, `"JSON-LD"`, `"CSV"`, `"XML"`).
* **applicationPurpose**: string. (few words about application or purpose of the approach)
* **userInterfaceTool**: string (e.g., `"CLI"`, `"Web UI"`, tool name).
* **usesLLM**: object, optional.
  * **modelName**: string (e.g., `"GPT-4o"`, `"Llama-3-70B"`).
  * **prompting**: enum `"zero-shot"` | `"few-shot"` | `"cot"`.
* **checkedByAuthor**: empty string.
* **checkedByAi**: boolean. Always `true`.
* **doi**: string, required. Canonical URL `https://doi.org/...`.
* **citations**: array of objects, required. Each:
  * **ref**: string slug `YYYY_surname_first-word-of-title` (or `""` if not deducible).
  * **title**: string, citation title.
* **uncertainFields**: array, required (may be empty). Each element:
  * **field**: string. Dot path to the doubtful field (e.g., "venue.acronym", "kg.tripleStore", "citations[3].ref").
  * **reason**: string. Brief motivation (≤2 sentences) explaining the uncertainty or ambiguity.

---

# CONSTRAINTS & CONSISTENCY

* **No extra fields** (treat as `additionalProperties: false`).
* **Enums are strict**:
  `mainMethod.type ∈ {hybrid, supervised, unsupervised}`;
  `revision.type ∈ {fully automated, semi automated, none}`;
  `domain.domain ∈ {dependent, independent}`.
* If `domain.domain = "dependent"`, `domain.type` **must** be a specific domain; if `"independent"`, it may be generic/empty.
* **techniqueTags**: use only allowed values; pick multiple when justified.
* **mainMethod.supervision**: include **only** when `mainMethod.type = "supervised"`.
* **inputs.tableSources**: only enum values; use `[]` if unspecified.
* **usesLLM.prompting**: only `"zero-shot"`, `"few-shot"`, `"cot"`.
* **validation.metrics**: only allowed names above; `@k` suffixes permitted (e.g., `"MRR@10"`, `"NDCG@20"`); keep casing/prefixes exactly (e.g., `"Macro-F1"`).
* **Cross-field coherence (taxonomy-aware)**:
  * Populate `supportTasks` consistently with `coreTasks`:
    • `typeAnnotation` only if `cta = true`.
    • `predicateAnnotation` only if `cpa = true`.
    • `entityLinking` must be present (filled) only if `cea = true`; otherwise keep its subfields as empty strings.
    • `nilAnnotation` only if `cnea = true`.
* **authors**: `authors[0]` must match `firstAuthor` (surname) and reflect byline order.
* **citaiton**: must be present (filled).

---

# EXTRACTION RULES

* Be conservative: fill a field **only** if supported by the text; otherwise `""`/`[]`/`false`.
* `mainMethod.type` must be one of: `"supervised"`, `"unsupervised"`, `"hybrid"`.
* `technique` must be consistent with `mainMethod.type` (e.g., supervised → `"SVM"`, `"CRF"`; unsupervised → `"clustering"`, `"embedding-based"`; rule-based → specify rules/ontologies).
* Summarise each of `supportTasks.*`, `revision.description`, and `validation.*` in **≤2 sentences**.
* If text mentions "BERT", "GPT", "Transformer", map to techniqueTags += ["transformer"].
* If "word2vec", "GloVe", "embeddings", map to ["embeddings"].
* If "CRF", map to ["CRF"]; if "SVM", map to ["SVM"]; if hand-crafted rules/ontologies, map to ["rule-based","ontology-driven"] as appropriate.

---

# NORMALISATION

* **id**: lowercase; no spaces; strip accents/diacritics.
* Trim double spaces; remove venue year suffixes from acronyms.
* No `null` or `"N/A"`: use `""`, `[]`, or `false`.
* Free-text should use **British English** where spelling varies (JSON keys remain as specified).

---

# INPUT

I upload the paper.

---

# QUALITY CHECKS (must perform before output)
* Validate enums, dependencies, DOI normalisation, KG/task coherence, and that every uncertainFields[*].field points to a valid key in this schema.
* The citations must be complete and accurate. Check the number of citations inside the paper.

---

# PROCEDURE

2. **Final JSON:** Output the single JSON object (no extra text) inside a code preview.