import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const ROOT = "/Users/marco/Sites/kg-exploration-survey";
const BUNDLED_PYTHON =
  "/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const THREAD_ID =
  process.env.CODEX_THREAD_ID || `manual-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUTPUT_DIR = path.join(ROOT, "outputs", THREAD_ID);
const PREVIEW_DIR = path.join(OUTPUT_DIR, "previews");
const XLSX_PATH = path.join(OUTPUT_DIR, "prisma_2020_kg_exploration_workbook.xlsx");
const execFileAsync = promisify(execFile);

const COLORS = {
  primary: "#1F4E78",
  secondary: "#D9EAF7",
  surface: "#F7F9FC",
  positive: "#EAF4EA",
  warning: "#FFF4CC",
  negative: "#FDE7E9",
  text: "#1F2937",
  muted: "#5B6573",
  white: "#FFFFFF",
  border: "#D6DCE5",
  editable: "#FFFDF2",
};

const generalStatuses = [
  "To Do",
  "In Progress",
  "Included",
  "Excluded",
  "Analyzed",
  "Needs Discussion",
  "Done",
  "N/A",
];

const reviewerVotes = ["Include", "Maybe", "Exclude"];
const screeningFinalDecisions = ["Include", "Exclude", "Retrieve full text", "Needs Discussion"];
const eligibilityFinalDecisions = ["Include", "Exclude", "Needs Discussion"];
const yesNo = ["Yes", "No"];
const extractionStatuses = ["Completed", "In Progress", "Not Started"];
const checklistStatuses = ["Not Started", "In Progress", "Done", "N/A"];
const exclusionReasons = [
  "Not on topic",
  "Non-English",
  "Insufficient methodological detail",
  "Duplicate",
  "No full text available",
  "Not a primary study",
  "Out of scope",
];

const keywordRows = [
  ["Core topic", '"knowledge graph exploration"', "Matches the central review focus."],
  ["Core topic", '"linked data exploration"', "Captures the RDF / linked data literature."],
  ["Core topic", '"knowledge graph browsing"', "Targets browsing-oriented systems."],
  ["Core topic", '"linked data browser"', "Useful because several systems are framed explicitly as linked data browsers."],
  ["Core topic", '"RDF exploration"', "Covers RDF-specific exploration work."],
  ["Core topic", '"semantic web exploration"', "Useful for older semantic web papers."],
  ["Core topic", '"exploratory search"', "Covers the broader search paradigm."],
  ["Interaction", '"faceted browsing"', "Captures facet-driven exploration systems."],
  ["Interaction", '"faceted search"', "Finds interfaces centered on filters and facets."],
  ["Interaction", '"graph navigation"', "Captures navigation-centric systems."],
  ["Interaction", '"relationship discovery"', "Targets path and entity relationship tools."],
  ["Interaction", '"query builder"', "Exact phrase widely used in titles and tool descriptions."],
  ["Interaction", '"query building"', "Captures interactive query construction."],
  ["Interaction", '"guided query formulation"', "Matches how the survey frames query support for end users."],
  ["Interaction", '"query-by-example"', "Relevant for Tabulator-style and guided graph query interactions."],
  ["Interaction", '"visual query"', "Broad enough to catch visual query systems beyond explicit builder terminology."],
  ["Interaction", '"visual query builder"', "Targets diagrammatic or GUI query builders."],
  ["Interaction", '"SPARQL query builder"', "Specific to SPARQL end-user tools."],
  ["Guidance", '"user guidance"', "Captures recommendation and assistance features."],
  ["Guidance", '"graph query suggestion"', "Useful for suggestion-oriented KG exploration papers."],
  ["Guidance", '"recommendation"', "Useful for ranked or suggested next steps."],
  ["Guidance", '"visualization recommendation"', "Captures view-selection and recommendation workflows."],
  ["Guidance", '"autocomplete"', "Strong recurring term in endpoint-centric and query-builder tools."],
  ["Guidance", '"auto-suggestion"', "Matches suggestion-driven query interfaces such as VIIQ."],
  ["Guidance", '"sense-making"', "Relevant to exploratory interpretation workflows."],
  ["Guidance", '"serendipity"', "Captures discovery-oriented exploration systems."],
  ["Guidance", '"natural language guidance"', "Finds NL-supported exploration workflows."],
  ["Representation", '"linked data visualization"', "Targets visualization-oriented tools."],
  ["Representation", '"RDF browser"', "Useful for browser-style systems."],
  ["Representation", '"SPARQL endpoint"', "Captures endpoint-facing exploration tools."],
  ["Representation", '"knowledge graph querying"', "Covers broader KG retrieval systems."],
];

const keywordAiScores = {
  '"knowledge graph exploration"': 3,
  '"linked data exploration"': 3,
  '"knowledge graph browsing"': 2,
  '"linked data browser"': 2,
  '"RDF exploration"': 2,
  '"semantic web exploration"': 2,
  '"exploratory search"': 2,
  '"faceted browsing"': 3,
  '"faceted search"': 3,
  '"graph navigation"': 2,
  '"relationship discovery"': 3,
  '"query builder"': 3,
  '"query building"': 2,
  '"guided query formulation"': 3,
  '"query-by-example"': 2,
  '"visual query"': 2,
  '"visual query builder"': 3,
  '"SPARQL query builder"': 3,
  '"user guidance"': 3,
  '"graph query suggestion"': 2,
  '"recommendation"': 2,
  '"visualization recommendation"': 2,
  '"autocomplete"': 2,
  '"auto-suggestion"': 2,
  '"sense-making"': 1,
  '"serendipity"': 1,
  '"natural language guidance"': 2,
  '"linked data visualization"': 2,
  '"RDF browser"': 2,
  '"SPARQL endpoint"': 1,
  '"knowledge graph querying"': 2,
};

const checklistItems = [
  ["TITLE", "Title", "1", "Identify the report as a systematic review."],
  ["ABSTRACT", "Abstract", "2", "See the PRISMA 2020 for Abstracts checklist."],
  ["INTRODUCTION", "Rationale", "3", "Describe the rationale for the review in the context of existing knowledge."],
  ["INTRODUCTION", "Objectives", "4", "Provide an explicit statement of the objective(s) or question(s) the review addresses."],
  ["METHODS", "Eligibility criteria", "5", "Specify the inclusion and exclusion criteria for the review and how studies were grouped for the syntheses."],
  ["METHODS", "Information sources", "6", "Specify all databases, registers, websites, organisations, reference lists and other sources searched or consulted to identify studies. Specify the date when each source was last searched or consulted."],
  ["METHODS", "Search strategy", "7", "Present the full search strategies for all databases, registers and websites, including any filters and limits used."],
  ["METHODS", "Selection process", "8", "Specify the methods used to decide whether a study met the inclusion criteria of the review, including how many reviewers screened each record and each report retrieved, whether they worked independently, and if applicable, details of automation tools used in the process."],
  ["METHODS", "Data collection process", "9", "Specify the methods used to collect data from reports, including how many reviewers collected data from each report, whether they worked independently, any processes for obtaining or confirming data from study investigators, and if applicable, details of automation tools used in the process."],
  ["METHODS", "Data items", "10a", "List and define all outcomes for which data were sought. Specify whether all results that were compatible with each outcome domain in each study were sought and, if not, the methods used to decide which results to collect."],
  ["METHODS", "Data items", "10b", "List and define all other variables for which data were sought and describe any assumptions made about missing or unclear information."],
  ["METHODS", "Study risk of bias assessment", "11", "Specify the methods used to assess risk of bias in the included studies, including tool(s), reviewers, independence, and automation where applicable."],
  ["METHODS", "Effect measures", "12", "Specify for each outcome the effect measure(s) used in the synthesis or presentation of results."],
  ["METHODS", "Synthesis methods", "13a", "Describe the processes used to decide which studies were eligible for each synthesis."],
  ["METHODS", "Synthesis methods", "13b", "Describe any methods required to prepare the data for presentation or synthesis."],
  ["METHODS", "Synthesis methods", "13c", "Describe any methods used to tabulate or visually display results of individual studies and syntheses."],
  ["METHODS", "Synthesis methods", "13d", "Describe any methods used to synthesize results and provide a rationale for the choice(s)."],
  ["METHODS", "Synthesis methods", "13e", "Describe any methods used to explore possible causes of heterogeneity among study results."],
  ["METHODS", "Synthesis methods", "13f", "Describe any sensitivity analyses conducted to assess robustness of the synthesized results."],
  ["METHODS", "Reporting bias assessment", "14", "Describe any methods used to assess risk of bias due to missing results in a synthesis."],
  ["METHODS", "Certainty assessment", "15", "Describe any methods used to assess certainty in the body of evidence for an outcome."],
  ["RESULTS", "Study selection", "16a", "Describe the results of the search and selection process, from the number of records identified to the number of studies included in the review, ideally using a flow diagram."],
  ["RESULTS", "Study selection", "16b", "Cite studies that might appear to meet the inclusion criteria, but which were excluded, and explain why they were excluded."],
  ["RESULTS", "Study characteristics", "17", "Cite each included study and present its characteristics."],
  ["RESULTS", "Risk of bias in studies", "18", "Present assessments of risk of bias for each included study."],
  ["RESULTS", "Results of individual studies", "19", "For all outcomes, present for each study summary statistics and an effect estimate with precision, ideally using structured tables or plots."],
  ["RESULTS", "Results of syntheses", "20a", "For each synthesis, briefly summarise the characteristics and risk of bias among contributing studies."],
  ["RESULTS", "Results of syntheses", "20b", "Present results of all statistical syntheses conducted, including summary estimate, precision, and heterogeneity where applicable."],
  ["RESULTS", "Results of syntheses", "20c", "Present results of all investigations of possible causes of heterogeneity among study results."],
  ["RESULTS", "Results of syntheses", "20d", "Present results of all sensitivity analyses conducted to assess robustness of the synthesized results."],
  ["RESULTS", "Reporting biases", "21", "Present assessments of risk of bias due to missing results for each synthesis assessed."],
  ["RESULTS", "Certainty of evidence", "22", "Present assessments of certainty in the body of evidence for each outcome assessed."],
  ["DISCUSSION", "Discussion", "23a", "Provide a general interpretation of the results in the context of other evidence."],
  ["DISCUSSION", "Discussion", "23b", "Discuss any limitations of the evidence included in the review."],
  ["DISCUSSION", "Discussion", "23c", "Discuss any limitations of the review processes used."],
  ["DISCUSSION", "Discussion", "23d", "Discuss implications of the results for practice, policy, and future research."],
  ["OTHER INFORMATION", "Registration and protocol", "24a", "Provide registration information for the review, including register name and registration number, or state that the review was not registered."],
  ["OTHER INFORMATION", "Registration and protocol", "24b", "Indicate where the review protocol can be accessed, or state that a protocol was not prepared."],
  ["OTHER INFORMATION", "Registration and protocol", "24c", "Describe and explain any amendments to information provided at registration or in the protocol."],
  ["OTHER INFORMATION", "Support", "25", "Describe sources of financial or non-financial support for the review, and the role of the funders or sponsors in the review."],
  ["OTHER INFORMATION", "Competing interests", "26", "Declare any competing interests of review authors."],
  ["OTHER INFORMATION", "Availability of data, code and other materials", "27", "Report which materials are publicly available and where they can be found: template forms, extracted data, analysis data, analytic code, and other review materials."],
];

function colLabel(n) {
  let value = n;
  let label = "";
  while (value > 0) {
    const mod = (value - 1) % 26;
    label = String.fromCharCode(65 + mod) + label;
    value = Math.floor((value - mod) / 26);
  }
  return label;
}

function cleanDerivedTitle(filename) {
  const base = filename.replace(/\.pdf$/i, "");
  const parts = base.split("_").slice(1);
  const joined = parts.join(" ").replace(/\s+/g, " ").trim();
  return joined
    ? joined.replace(/\b\w/g, (m) => m.toUpperCase())
    : base.replace(/_/g, " ");
}

function escapeSheetName(name) {
  return name.replaceAll("'", "''");
}

async function readSourceData() {
  const [listRaw, surveyJsonRaw, texRaw, papers, surveyPdfs, paper2Pdfs] = await Promise.all([
    fs.readFile(path.join(ROOT, "lista_paper_survey.txt"), "utf8"),
    fs.readFile(path.join(ROOT, "website/public/data/sti-survey.json"), "utf8"),
    fs.readFile(path.join(ROOT, "survey.tex"), "utf8"),
    fs.readdir(path.join(ROOT, "papers")),
    fs.readdir(path.join(ROOT, "survey")),
    fs.readdir(path.join(ROOT, "paper 2")),
  ]);

  const titleMap = new Map();
  let currentSection = "";
  for (const rawLine of listRaw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line === "PAPERS" || line === "SURVEY") {
      currentSection = line;
      continue;
    }
    const [filenamePart, titlePart] = line.split("|").map((p) => p.trim());
    if (!filenamePart || !titlePart) continue;
    titleMap.set(filenamePart, {
      title: titlePart,
      category: currentSection === "SURVEY" ? "Related survey" : "Primary study",
    });
  }

  const analyzedStudies = JSON.parse(surveyJsonRaw);
  const analyzedIds = new Set(analyzedStudies.map((item) => item.id));

  const localRecords = [];
  for (const filename of papers.filter((name) => name.toLowerCase().endsWith(".pdf")).sort()) {
    const meta = titleMap.get(filename);
    localRecords.push({
      record_id: filename.replace(/\.pdf$/i, ""),
      filename,
      title: meta?.title || cleanDerivedTitle(filename),
      year: Number.parseInt(filename.slice(0, 4), 10) || "",
      category: meta?.category || "Primary study",
      sourceFolder: "papers",
      localPdf: "Yes",
    });
  }

  for (const filename of surveyPdfs.filter((name) => name.toLowerCase().endsWith(".pdf")).sort()) {
    const meta = titleMap.get(filename);
    localRecords.push({
      record_id: filename.replace(/\.pdf$/i, ""),
      filename,
      title: meta?.title || cleanDerivedTitle(filename),
      year: Number.parseInt(filename.slice(0, 4), 10) || "",
      category: meta?.category || "Related survey",
      sourceFolder: "survey",
      localPdf: "Yes",
    });
  }

  for (const filename of paper2Pdfs.filter((name) => name.toLowerCase().endsWith(".pdf")).sort()) {
    const titleOverride =
      filename === "russell_swui2008.pdf"
        ? "NITELIGHT: A Graphical Tool for Semantic Query Construction"
        : cleanDerivedTitle(filename);
    localRecords.push({
      record_id: filename.replace(/\.pdf$/i, ""),
      filename,
      title: titleOverride,
      year: Number.parseInt((filename.match(/\d{4}/) || [""])[0], 10) || "",
      category: "Additional paper",
      sourceFolder: "paper 2",
      localPdf: "Yes",
    });
  }

  localRecords.sort((a, b) => {
    const yearA = Number(a.year) || 9999;
    const yearB = Number(b.year) || 9999;
    if (yearA !== yearB) return yearA - yearB;
    return a.title.localeCompare(b.title);
  });

  const texCounts = {};
  for (const match of texRaw.matchAll(/\\newcommand\{\\([A-Za-z0-9]+)\}\{([^}]*)\}/g)) {
    texCounts[match[1]] = match[2];
  }

  return { titleMap, analyzedStudies, analyzedIds, localRecords, texCounts };
}

function flattenAnalyzedStudy(study) {
  const interactionParadigms = [];
  if (study.coreTasks?.facets) interactionParadigms.push("Facets");
  if (study.coreTasks?.navigation) interactionParadigms.push("Navigation");
  if (study.coreTasks?.queryBuilding) interactionParadigms.push("Query building");
  if (study.coreTasks?.recommendation) interactionParadigms.push("Guidance / visualization");

  const venueParts = [];
  if (study.venue?.type) venueParts.push(study.venue.type);
  if (study.venue?.acronym) venueParts.push(study.venue.acronym);

  const backendParts = [
    study.domain?.domain,
    study.domain?.type,
    study.supportTasks?.backendAssumptions,
    study.supportTasks?.dataAccess,
  ].filter(Boolean);

  const evidenceParts = [study.validation?.type, study.validation?.details].filter(Boolean);

  const notesParts = [
    study.supportTasks?.guidance,
    study.supportTasks?.visualization,
    study.supportTasks?.notes,
  ].filter(Boolean);

  return {
    record_id: study.id,
    year: study.year ?? "",
    authors: Array.isArray(study.authors) ? study.authors.join("; ") : "",
    title: study.title || study.id,
    venue: venueParts.join(" / "),
    approachClass: study.mainMethod?.type || "",
    interactionParadigm: interactionParadigms.join(", "),
    guidanceStrategy: [study.revision?.type, study.revision?.description].filter(Boolean).join(" - "),
    visualization: study.supportTasks?.visualization || study.output || "",
    backendDataAccess: backendParts.join(" | "),
    evidenceValidation: evidenceParts.join(" | "),
    codeDemoAvailability: study.codeAvailability || "",
    notes: notesParts.join(" | "),
  };
}

function baseTextFormat({ bold = false, color = COLORS.text, size = 11, italic = false } = {}) {
  return { bold, color, size, italic, name: "Aptos" };
}

function applySheetFrame(sheet, lastCol, title, guideText, guideEndCol = lastCol) {
  sheet.showGridLines = false;
  sheet.getRange(`A1:${lastCol}1`).merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange("A1").format = {
    fill: COLORS.primary,
    font: baseTextFormat({ bold: true, color: COLORS.white, size: 15 }),
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  sheet.getRange(`A1:${lastCol}1`).format.rowHeight = 28;

  sheet.getRange(`A3:${guideEndCol}5`).merge();
  sheet.getRange("A3").values = [[guideText]];
  sheet.getRange("A3").format = {
    fill: COLORS.secondary,
    font: baseTextFormat({ color: COLORS.text, size: 10 }),
    wrapText: true,
    verticalAlignment: "top",
    horizontalAlignment: "left",
  };
  sheet.getRange(`A3:${guideEndCol}5`).format.rowHeight = 24;
}

function addPanel(sheet, range, titleCell, bodyText, fillColor = COLORS.surface) {
  sheet.getRange(range).merge();
  sheet.getRange(titleCell).values = [[bodyText]];
  sheet.getRange(titleCell).format = {
    fill: fillColor,
    font: baseTextFormat({ size: 10, color: COLORS.text }),
    wrapText: true,
    verticalAlignment: "top",
    horizontalAlignment: "left",
  };
}

function styleHeaderRow(sheet, range) {
  sheet.getRange(range).format = {
    fill: COLORS.primary,
    font: baseTextFormat({ bold: true, color: COLORS.white, size: 10 }),
    verticalAlignment: "center",
    horizontalAlignment: "center",
    wrapText: true,
  };
}

function styleEditable(sheet, range) {
  sheet.getRange(range).format = {
    fill: COLORS.editable,
    font: baseTextFormat({ size: 10 }),
    wrapText: true,
    verticalAlignment: "top",
  };
}

function setColumnWidths(sheet, widthMap, totalRows = 250) {
  for (const [col, width] of Object.entries(widthMap)) {
    sheet.getRange(`${col}1:${col}${totalRows}`).format.columnWidth = width;
  }
}

function addStatusFormatting(range, anchorCell) {
  range.conditionalFormats.addCustom(`=OR(${anchorCell}="Included",${anchorCell}="Include",${anchorCell}="Analyzed",${anchorCell}="Done",${anchorCell}="Completed",${anchorCell}="Yes")`, {
    fill: COLORS.positive,
  });
  range.conditionalFormats.addCustom(`=OR(${anchorCell}="Maybe",${anchorCell}="In Progress",${anchorCell}="Needs Discussion",${anchorCell}="Retrieve full text",${anchorCell}="To Do")`, {
    fill: COLORS.warning,
  });
  range.conditionalFormats.addCustom(`=OR(${anchorCell}="Excluded",${anchorCell}="Exclude",${anchorCell}="No",${anchorCell}="Blocked")`, {
    fill: COLORS.negative,
  });
}

function addAlternatingBanding(range) {
  range.conditionalFormats.addCustom("=MOD(ROW(),2)=0", {
    fill: COLORS.surface,
  });
}

function extractRowNumber(a1) {
  const match = a1.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

async function buildWorkbook() {
  const { analyzedStudies, analyzedIds, localRecords, texCounts } = await readSourceData();
  const extractionRows = analyzedStudies.map(flattenAnalyzedStudy);

  const workbook = Workbook.create();
  const sheets = {
    keyword: workbook.worksheets.add("01_Keyword_Voting"),
    protocol: workbook.worksheets.add("02_Protocol_and_Criteria"),
    searchLog: workbook.worksheets.add("03_Search_Log"),
    found: workbook.worksheets.add("04_Found_Studies"),
    screening: workbook.worksheets.add("05_Title_Abstract_Screening"),
    eligibility: workbook.worksheets.add("06_Full_Text_Eligibility"),
    extraction: workbook.worksheets.add("07_Data_Extraction"),
    dashboard: workbook.worksheets.add("08_Progress_Dashboard"),
    prismaFlow: workbook.worksheets.add("09_PRISMA_Flow"),
    checklist: workbook.worksheets.add("10_PRISMA_2020_Checklist"),
    lists: workbook.worksheets.add("Lists"),
  };

  buildListsSheet(sheets.lists);
  buildKeywordSheet(sheets.keyword, keywordRows);
  buildProtocolSheet(sheets.protocol);
  buildSearchLogSheet(sheets.searchLog);
  buildFoundStudiesSheet(sheets.found, localRecords, analyzedIds);
  buildScreeningSheet(sheets.screening, localRecords, analyzedIds);
  buildEligibilitySheet(sheets.eligibility, localRecords, analyzedIds);
  buildExtractionSheet(sheets.extraction, extractionRows);
  buildDashboardSheet(sheets.dashboard, localRecords.length, extractionRows.length);
  buildPrismaFlowSheet(sheets.prismaFlow, texCounts);
  buildChecklistSheet(sheets.checklist);

  try {
    sheets.lists.state = "hidden";
  } catch {
    sheets.lists.visible = false;
  }

  await fs.mkdir(PREVIEW_DIR, { recursive: true });

  const inspectSummary = await workbook.inspect({
    kind: "table",
    range: "04_Found_Studies!A7:K18",
    include: "values,formulas",
    tableMaxRows: 12,
    tableMaxCols: 11,
  });
  console.log("FOUND_STUDIES_PREVIEW");
  console.log(inspectSummary.ndjson);

  const inspectChecklist = await workbook.inspect({
    kind: "table",
    range: "10_PRISMA_2020_Checklist!A7:G16",
    include: "values,formulas",
    tableMaxRows: 10,
    tableMaxCols: 7,
  });
  console.log("CHECKLIST_PREVIEW");
  console.log(inspectChecklist.ndjson);

  const formulaErrors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 300 },
    summary: "final formula error scan",
  });
  console.log("FORMULA_SCAN");
  console.log(formulaErrors.ndjson);

  const previewSheets = [
    "01_Keyword_Voting",
    "02_Protocol_and_Criteria",
    "03_Search_Log",
    "04_Found_Studies",
    "05_Title_Abstract_Screening",
    "06_Full_Text_Eligibility",
    "07_Data_Extraction",
    "08_Progress_Dashboard",
    "09_PRISMA_Flow",
    "10_PRISMA_2020_Checklist",
  ];
  for (const name of previewSheets) {
    const blob = await workbook.render({
      sheetName: name,
      autoCrop: "all",
      scale: 1,
      format: "png",
    });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const filename = name.toLowerCase().replace(/[^a-z0-9]+/g, "_") + ".png";
    await fs.writeFile(path.join(PREVIEW_DIR, filename), bytes);
  }

  const xlsx = await SpreadsheetFile.exportXlsx(workbook);
  await xlsx.save(XLSX_PATH);
  await patchWorkbookForHiddenLists(XLSX_PATH);
  console.log(`XLSX_PATH=${XLSX_PATH}`);
}

async function patchWorkbookForHiddenLists(xlsxPath) {
  const patchScript = `
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re
import sys

src = Path(sys.argv[1])
tmp = src.with_name(src.stem + "_tmp.xlsx")

with ZipFile(src, "r") as zin, ZipFile(tmp, "w", compression=ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename == "xl/workbook.xml":
            text = data.decode("utf-8")
            text = re.sub(
                r'(<x:sheet name="Lists")(?![^>]*state=)',
                r'\\1 state="hidden"',
                text,
                count=1,
            )
            data = text.encode("utf-8")
        zout.writestr(item, data)

tmp.replace(src)
`;
  await execFileAsync(BUNDLED_PYTHON, ["-c", patchScript, xlsxPath]);
}

function buildListsSheet(sheet) {
  sheet.showGridLines = false;
  sheet.getRange("A1:I1").values = [[
    "GeneralStatus",
    "ReviewerVote",
    "ScreeningFinal",
    "EligibilityFinal",
    "YesNo",
    "ExtractionStatus",
    "ChecklistStatus",
    "ExclusionReasons",
    "Reviewer",
  ]];
  styleHeaderRow(sheet, "A1:I1");

  const maxRows = Math.max(
    generalStatuses.length,
    reviewerVotes.length,
    screeningFinalDecisions.length,
    eligibilityFinalDecisions.length,
    yesNo.length,
    extractionStatuses.length,
    checklistStatuses.length,
    exclusionReasons.length,
    3,
  );

  const rows = [];
  for (let i = 0; i < maxRows; i += 1) {
    rows.push([
      generalStatuses[i] ?? null,
      reviewerVotes[i] ?? null,
      screeningFinalDecisions[i] ?? null,
      eligibilityFinalDecisions[i] ?? null,
      yesNo[i] ?? null,
      extractionStatuses[i] ?? null,
      checklistStatuses[i] ?? null,
      exclusionReasons[i] ?? null,
      ["R1", "R2", "R3"][i] ?? null,
    ]);
  }
  sheet.getRange(`A2:I${maxRows + 1}`).values = rows;
  styleEditable(sheet, `A2:I${maxRows + 1}`);
  setColumnWidths(
    sheet,
    { A: 20, B: 16, C: 22, D: 20, E: 12, F: 20, G: 18, H: 32, I: 12 },
    maxRows + 5,
  );
}

function buildKeywordSheet(sheet, keywords) {
  applySheetFrame(
    sheet,
    "P",
    "PRISMA Step 1: Keyword Voting",
    "Purpose: agree on the search vocabulary before running database queries.\nWorkflow: R1-R3 are reviewer scores, AI is an automatic first-pass score based on fit with the current corpus and survey taxonomy, and Notes can capture synonyms or caveats.\nRule used here: the Average includes every non-empty vote in R1-R3 and AI; terms with an average score of 2 or more are marked Keep.\nOutput: the Draft Search String on the right collects approved terms into a first-pass OR block that you can adapt to each database syntax.",
    "J",
  );

  addPanel(
    sheet,
    "K3:P5",
    "K3",
    "Scoring guide\n0 = remove: off-topic or redundant\n1 = optional: weak / uncertain\n2 = keep: relevant and useful\n3 = core: essential term\nAI = suggested baseline, editable if needed",
    COLORS.warning,
  );

  const headerRow = 7;
  const startRow = 8;
  const endRow = startRow + keywords.length - 1;
  sheet.getRange(`A${headerRow}:J${headerRow}`).values = [[
    "Cluster",
    "Keyword / Phrase",
    "Rationale",
    "R1",
    "R2",
    "R3",
    "AI",
    "Average",
    "Decision",
    "Notes",
  ]];
  styleHeaderRow(sheet, `A${headerRow}:J${headerRow}`);

  const valueRows = keywords.map(([cluster, keyword, rationale]) => [
    cluster,
    keyword,
    rationale,
    null,
    null,
    null,
    keywordAiScores[keyword] ?? 2,
    null,
    null,
    null,
  ]);
  sheet.getRange(`A${startRow}:J${endRow}`).values = valueRows;
  styleEditable(sheet, `A${startRow}:J${endRow}`);
  addAlternatingBanding(sheet.getRange(`A${startRow}:J${endRow}`));

  sheet.getRange(`D${startRow}:G${endRow}`).dataValidation = {
    rule: { type: "whole", operator: "between", formula1: 0, formula2: 3 },
  };

  const avgFormulas = [];
  const decisionFormulas = [];
  const helperFormulas = [];
  for (let row = startRow; row <= endRow; row += 1) {
    avgFormulas.push([
      `=IF(COUNT(D${row}:G${row})=0,"",ROUND(AVERAGE(D${row}:G${row}),2))`,
    ]);
    decisionFormulas.push([
      `=IF(H${row}="","",IF(H${row}>=2,"Keep","Drop"))`,
    ]);
    helperFormulas.push([
      `=IF(I${row}="Keep",B${row},"")`,
    ]);
  }
  sheet.getRange(`H${startRow}:H${endRow}`).formulas = avgFormulas;
  sheet.getRange(`I${startRow}:I${endRow}`).formulas = decisionFormulas;
  sheet.getRange(`Q${startRow}:Q${endRow}`).formulas = helperFormulas;
  addStatusFormatting(sheet.getRange(`I${startRow}:I${endRow}`), `I${startRow}`);

  sheet.getRange("K7:P7").merge();
  sheet.getRange("K7").values = [["Draft Search String"]];
  sheet.getRange("K7").format = {
    fill: COLORS.primary,
    font: baseTextFormat({ bold: true, color: COLORS.white, size: 10 }),
    horizontalAlignment: "center",
  };
  sheet.getRange("K8:P12").merge();
  sheet.getRange("K8").formulas = [[
    `=IF(COUNTIF($I$${startRow}:$I$${endRow},"Keep")=0,"Approve some keywords to build the draft OR search string here.","(" & TEXTJOIN(" OR ",TRUE,$Q$${startRow}:$Q$${endRow}) & ")")`,
  ]];
  sheet.getRange("K8").format = {
    fill: COLORS.surface,
    font: baseTextFormat({ size: 10 }),
    wrapText: true,
    verticalAlignment: "top",
  };

  sheet.getRange("K14:P14").merge();
  sheet.getRange("K14").values = [["Quick Metrics"]];
  sheet.getRange("K14").format = {
    fill: COLORS.primary,
    font: baseTextFormat({ bold: true, color: COLORS.white, size: 10 }),
    horizontalAlignment: "center",
  };
  sheet.getRange("K15:L17").values = [
    ["Keywords kept", null],
    ["Keywords scored", null],
    ["Average score", null],
  ];
  sheet.getRange("O15:O17").formulas = [[
    `=COUNTIF($I$${startRow}:$I$${endRow},"Keep")`,
  ], [
    `=COUNT($H$${startRow}:$H$${endRow})`,
  ], [
    `=IFERROR(ROUND(AVERAGE($H$${startRow}:$H$${endRow}),2),"")`,
  ]];
  sheet.getRange("K15:O17").format = {
    fill: COLORS.surface,
    font: baseTextFormat({ size: 10 }),
  };

  setColumnWidths(sheet, {
    A: 16,
    B: 26,
    C: 36,
    D: 8,
    E: 8,
    F: 8,
    G: 8,
    H: 10,
    I: 16,
    J: 24,
    K: 18,
    L: 16,
    M: 16,
    N: 16,
    O: 14,
    P: 14,
    Q: 2,
  });

  sheet.freezePanes.freezeRows(7);
  const table = sheet.tables.add(`A${headerRow}:J${endRow}`, true, "KeywordVotingTable");
  table.style = "TableStyleLight9";
  table.showBandedRows = true;
  table.showFilterButton = true;
}

function buildProtocolSheet(sheet) {
  applySheetFrame(
    sheet,
    "J",
    "PRISMA Step 2: Protocol and Eligibility Criteria",
    "Capture the review protocol before screening starts. Keep inclusion/exclusion criteria concrete and auditable. Use the right column for editable content; update the sheet whenever the review scope changes.",
    "G",
  );

  addPanel(
    sheet,
    "H3:J5",
    "H3",
    "Tip\nKeep this sheet stable once screening starts. If you change criteria later, record the amendment in the PRISMA checklist sheet.",
    COLORS.warning,
  );

  const rows = [
    ["Review title", "Knowledge Exploration in Knowledge Graphs: systematic review workflow"],
    ["Review objective", "Map and analyse systems, interfaces, and methods for knowledge graph exploration with emphasis on interaction, guidance, visualization, backend assumptions, scalability, and evaluation."],
    ["Primary research question", "How do knowledge graph exploration systems support browsing, guidance, querying, and sense-making for users?"],
    ["Scope", "Interactive systems and interfaces for KG / RDF / linked data exploration; qualitative evidence synthesis."],
    ["Information sources", "Scopus; Web of Science; OpenAlex; DBLP; Google Scholar; ACM DL; IEEE Xplore; backward snowballing; related surveys."],
    ["Date limits", "No hard limit yet. Narrow only if the search becomes unmanageable."],
    ["Languages", "English"],
    ["Study types", "Research papers, system papers, tool papers, survey papers used for contextualisation."],
    ["Include if", "The paper presents or evaluates an interactive system, interface, guidance method, or exploration workflow for KG / RDF / linked data."],
    ["Exclude if", "Out of scope, duplicate, non-English, no accessible full text, insufficient methodological or system detail."],
    ["Screening process", "Three reviewers (R1-R3). Majority vote drives a suggested decision; disagreements move to discussion."],
    ["Conflict resolution", "If there is no majority or strong disagreement, discuss and record a consensus decision in the screening sheets."],
    ["Data extraction owner(s)", "Assign per study in the Data Extraction sheet."],
    ["Official PRISMA links", "https://www.prisma-statement.org/prisma-2020 | https://www.prisma-statement.org/prisma-2020-checklist | https://www.prisma-statement.org/prisma-2020-flow-diagram"],
  ];

  const startRow = 7;
  const endRow = startRow + rows.length - 1;
  sheet.getRange(`A${startRow}:B${endRow}`).values = rows;
  sheet.getRange(`A${startRow}:A${endRow}`).format = {
    fill: COLORS.primary,
    font: baseTextFormat({ bold: true, color: COLORS.white, size: 10 }),
    wrapText: true,
    verticalAlignment: "center",
  };
  styleEditable(sheet, `B${startRow}:B${endRow}`);
  sheet.getRange(`B${startRow}:B${endRow}`).format.wrapText = true;
  setColumnWidths(sheet, { A: 24, B: 80, H: 24, I: 18, J: 18 });
  sheet.freezePanes.freezeRows(6);
}

function buildSearchLogSheet(sheet) {
  applySheetFrame(
    sheet,
    "M",
    "PRISMA Step 3: Search Log",
    "Record every database or source query here. Keep one row per search execution so the process remains reproducible. Use the summary cards on the right to monitor coverage and search volume.",
  );

  const headerRow = 7;
  const startRow = 8;
  const seedRows = [
    ["Scopus", "Database", null, null, null, null, null, null, null],
    ["Web of Science", "Database", null, null, null, null, null, null, null],
    ["OpenAlex", "Scholarly index / API", null, null, null, null, null, null, null],
    ["DBLP", "Bibliographic index", null, null, null, null, null, null, null],
    ["Google Scholar", "Search engine", null, null, null, null, null, null, null],
    ["ACM Digital Library", "Publisher database", null, null, null, null, null, null, null],
    ["IEEE Xplore", "Publisher database", null, null, null, null, null, null, null],
    ["Backward snowballing", "Reference lists", null, null, null, null, null, null, null],
    ["Related surveys", "Other source", null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
  ];
  const endRow = startRow + seedRows.length - 1;

  sheet.getRange(`A${headerRow}:I${headerRow}`).values = [[
    "Source",
    "Source Type",
    "Search Date",
    "Search String",
    "Filters / Limits",
    "Records Found",
    "Export File",
    "Owner",
    "Notes",
  ]];
  styleHeaderRow(sheet, `A${headerRow}:I${headerRow}`);
  sheet.getRange(`A${startRow}:I${endRow}`).values = seedRows;
  styleEditable(sheet, `A${startRow}:I${endRow}`);
  addAlternatingBanding(sheet.getRange(`A${startRow}:I${endRow}`));
  sheet.getRange(`C${startRow}:C${endRow}`).format.numberFormat = "yyyy-mm-dd";
  sheet.getRange(`F${startRow}:F${endRow}`).format.numberFormat = "0";

  sheet.getRange("K7:M7").merge();
  sheet.getRange("K7").values = [["Search Summary"]];
  sheet.getRange("K7").format = {
    fill: COLORS.primary,
    font: baseTextFormat({ bold: true, color: COLORS.white, size: 10 }),
    horizontalAlignment: "center",
  };
  sheet.getRange("K8:L10").values = [
    ["Logged searches", null],
    ["Source rows used", null],
    ["Total records found", null],
  ];
  sheet.getRange("M8:M10").formulas = [[
    `=COUNTIF($A$${startRow}:$A$${endRow},"<>")`,
  ], [
    `=COUNTIF($A$${startRow}:$A$${endRow},"<>")`,
  ], [
    `=SUM($F$${startRow}:$F$${endRow})`,
  ]];
  sheet.getRange("K8:M10").format = {
    fill: COLORS.surface,
    font: baseTextFormat({ size: 10 }),
  };

  setColumnWidths(sheet, {
    A: 22,
    B: 18,
    C: 14,
    D: 34,
    E: 22,
    F: 14,
    G: 20,
    H: 12,
    I: 24,
    K: 18,
    L: 14,
    M: 14,
  });

  sheet.freezePanes.freezeRows(7);
  const table = sheet.tables.add(`A${headerRow}:I${endRow}`, true, "SearchLogTable");
  table.style = "TableStyleLight9";
  table.showBandedRows = true;
  table.showFilterButton = true;
}

function buildFoundStudiesSheet(sheet, records, analyzedIds) {
  applySheetFrame(
    sheet,
    "P",
    "PRISMA Step 4: Found Studies",
    "This is the master sheet for the local corpus. It is prefilled from the repository. Update Current Status as the review progresses; Included updates automatically from that status. Studies already represented in the survey dataset are marked as analyzed.",
  );

  const headerRow = 7;
  const startRow = 8;
  const endRow = startRow + records.length - 1;

  sheet.getRange(`A${headerRow}:K${headerRow}`).values = [[
    "record_id",
    "Filename",
    "Title",
    "Year",
    "Category",
    "Source Folder",
    "Local PDF",
    "Current Status",
    "Analyzed",
    "Included",
    "Notes",
  ]];
  styleHeaderRow(sheet, `A${headerRow}:K${headerRow}`);

  const values = records.map((record) => [
    record.record_id,
    record.filename,
    record.title,
    record.year,
    record.category,
    record.sourceFolder,
    record.localPdf,
    analyzedIds.has(record.record_id) ? "Analyzed" : "To Do",
    analyzedIds.has(record.record_id) ? "Yes" : "No",
    null,
    null,
  ]);
  sheet.getRange(`A${startRow}:K${endRow}`).values = values;
  styleEditable(sheet, `A${startRow}:K${endRow}`);
  addAlternatingBanding(sheet.getRange(`A${startRow}:K${endRow}`));

  const includedFormulas = [];
  for (let row = startRow; row <= endRow; row += 1) {
    includedFormulas.push([[`=IF(OR(H${row}="Included",H${row}="Analyzed"),"Yes","")`][0]]);
  }
  sheet.getRange(`J${startRow}:J${endRow}`).formulas = includedFormulas;

  sheet.getRange(`H${startRow}:H${endRow}`).dataValidation = {
    rule: { type: "list", formula1: "Lists!$A$2:$A$9" },
  };
  sheet.getRange(`G${startRow}:G${endRow}`).dataValidation = {
    rule: { type: "list", formula1: "Lists!$E$2:$E$3" },
  };
  sheet.getRange(`I${startRow}:I${endRow}`).dataValidation = {
    rule: { type: "list", formula1: "Lists!$E$2:$E$3" },
  };
  addStatusFormatting(sheet.getRange(`H${startRow}:J${endRow}`), `H${startRow}`);

  sheet.getRange("M7:P7").merge();
  sheet.getRange("M7").values = [["Corpus Summary"]];
  sheet.getRange("M7").format = {
    fill: COLORS.primary,
    font: baseTextFormat({ bold: true, color: COLORS.white, size: 10 }),
    horizontalAlignment: "center",
  };
  sheet.getRange("M8:N12").values = [
    ["Total records", null],
    ["Analyzed", null],
    ["Related surveys", null],
    ["Primary studies", null],
    ["Additional paper(s)", null],
  ];
  sheet.getRange("O8:O12").formulas = [[
    `=COUNTA($A$${startRow}:$A$${endRow})`,
  ], [
    `=COUNTIF($I$${startRow}:$I$${endRow},"Yes")`,
  ], [
    `=COUNTIF($E$${startRow}:$E$${endRow},"Related survey")`,
  ], [
    `=COUNTIF($E$${startRow}:$E$${endRow},"Primary study")`,
  ], [
    `=COUNTIF($E$${startRow}:$E$${endRow},"Additional paper")`,
  ]];
  sheet.getRange("M8:O12").format = {
    fill: COLORS.surface,
    font: baseTextFormat({ size: 10 }),
  };

  setColumnWidths(sheet, {
    A: 24,
    B: 22,
    C: 52,
    D: 10,
    E: 16,
    F: 14,
    G: 12,
    H: 16,
    I: 10,
    J: 10,
    K: 18,
    M: 18,
    N: 16,
    O: 14,
    P: 14,
  });

  sheet.freezePanes.freezeRows(7);
  const table = sheet.tables.add(`A${headerRow}:K${endRow}`, true, "FoundStudiesTable");
  table.style = "TableStyleLight9";
  table.showBandedRows = true;
  table.showFilterButton = true;
}

function buildScreeningSheet(sheet, records, analyzedIds) {
  applySheetFrame(
    sheet,
    "N",
    "PRISMA Step 5: Title and Abstract Screening",
    "Each reviewer votes Include / Maybe / Exclude. Suggested Decision is based on majority vote; Needs Discussion becomes Yes when there is no majority. Prefilled included decisions reflect records already analyzed in the current survey dataset.",
    "K",
  );

  addPanel(
    sheet,
    "L3:N5",
    "L3",
    "Majority rule\n2 or 3 Include -> Include\n2 or 3 Exclude -> Exclude\n2 or 3 Maybe -> Maybe\nOtherwise -> Needs Discussion",
    COLORS.warning,
  );

  const headerRow = 7;
  const startRow = 8;
  const endRow = startRow + records.length - 1;
  sheet.getRange(`A${headerRow}:J${headerRow}`).values = [[
    "record_id",
    "Title",
    "Abstract / Screening Notes",
    "R1",
    "R2",
    "R3",
    "Suggested Decision",
    "Needs Discussion",
    "Exclusion Reason",
    "Final Screening Decision",
  ]];
  styleHeaderRow(sheet, `A${headerRow}:J${headerRow}`);

  const values = records.map((record) => [
    record.record_id,
    record.title,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    analyzedIds.has(record.record_id) ? "Include" : null,
  ]);
  sheet.getRange(`A${startRow}:J${endRow}`).values = values;
  styleEditable(sheet, `A${startRow}:J${endRow}`);
  addAlternatingBanding(sheet.getRange(`A${startRow}:J${endRow}`));

  const suggested = [];
  const discussion = [];
  for (let row = startRow; row <= endRow; row += 1) {
    suggested.push([`=IF(COUNTA(D${row}:F${row})=0,"",IF(COUNTIF(D${row}:F${row},"Include")>=2,"Include",IF(COUNTIF(D${row}:F${row},"Exclude")>=2,"Exclude",IF(COUNTIF(D${row}:F${row},"Maybe")>=2,"Maybe","Needs Discussion"))))`]);
    discussion.push([`=IF(G${row}="","",IF(G${row}="Needs Discussion","Yes","No"))`]);
  }
  sheet.getRange(`G${startRow}:G${endRow}`).formulas = suggested;
  sheet.getRange(`H${startRow}:H${endRow}`).formulas = discussion;

  sheet.getRange(`D${startRow}:F${endRow}`).dataValidation = {
    rule: { type: "list", formula1: "Lists!$B$2:$B$4" },
  };
  sheet.getRange(`I${startRow}:I${endRow}`).dataValidation = {
    rule: { type: "list", formula1: "Lists!$H$2:$H$8" },
  };
  sheet.getRange(`J${startRow}:J${endRow}`).dataValidation = {
    rule: { type: "list", formula1: "Lists!$C$2:$C$5" },
  };
  addStatusFormatting(sheet.getRange(`G${startRow}:J${endRow}`), `G${startRow}`);

  setColumnWidths(sheet, {
    A: 28,
    B: 38,
    C: 40,
    D: 12,
    E: 12,
    F: 12,
    G: 18,
    H: 18,
    I: 26,
    J: 20,
    L: 18,
    M: 18,
    N: 18,
  });

  sheet.freezePanes.freezeRows(7);
  const table = sheet.tables.add(`A${headerRow}:J${endRow}`, true, "TitleAbstractScreeningTable");
  table.style = "TableStyleLight9";
  table.showBandedRows = true;
  table.showFilterButton = true;
}

function buildEligibilitySheet(sheet, records, analyzedIds) {
  applySheetFrame(
    sheet,
    "N",
    "PRISMA Step 6: Full-Text Eligibility",
    "Use this sheet once a study passes initial screening. Track whether the full text is available, document exclusion reasons, and resolve disagreements across the three reviewers. Prefilled Include values reflect papers already analyzed in the current survey dataset.",
    "K",
  );

  addPanel(
    sheet,
    "L3:N5",
    "L3",
    "Recommended exclusion reasons\nNot on topic\nNon-English\nInsufficient methodological detail\nNo full text available",
    COLORS.warning,
  );

  const headerRow = 7;
  const startRow = 8;
  const endRow = startRow + records.length - 1;
  sheet.getRange(`A${headerRow}:L${headerRow}`).values = [[
    "record_id",
    "Title",
    "Full Text Available",
    "Retrieval Date",
    "R1",
    "R2",
    "R3",
    "Suggested Decision",
    "Needs Discussion",
    "Final Exclusion Reason",
    "Final Eligibility Decision",
    "Consensus Notes",
  ]];
  styleHeaderRow(sheet, `A${headerRow}:L${headerRow}`);

  const values = records.map((record) => [
    record.record_id,
    record.title,
    analyzedIds.has(record.record_id) ? "Yes" : record.localPdf,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    analyzedIds.has(record.record_id) ? "Include" : null,
    null,
  ]);
  sheet.getRange(`A${startRow}:L${endRow}`).values = values;
  styleEditable(sheet, `A${startRow}:L${endRow}`);
  addAlternatingBanding(sheet.getRange(`A${startRow}:L${endRow}`));

  const suggested = [];
  const discussion = [];
  for (let row = startRow; row <= endRow; row += 1) {
    suggested.push([`=IF(COUNTA(E${row}:G${row})=0,"",IF(COUNTIF(E${row}:G${row},"Include")>=2,"Include",IF(COUNTIF(E${row}:G${row},"Exclude")>=2,"Exclude",IF(COUNTIF(E${row}:G${row},"Maybe")>=2,"Maybe","Needs Discussion"))))`]);
    discussion.push([`=IF(H${row}="","",IF(H${row}="Needs Discussion","Yes","No"))`]);
  }
  sheet.getRange(`H${startRow}:H${endRow}`).formulas = suggested;
  sheet.getRange(`I${startRow}:I${endRow}`).formulas = discussion;

  sheet.getRange(`C${startRow}:C${endRow}`).dataValidation = {
    rule: { type: "list", formula1: "Lists!$E$2:$E$3" },
  };
  sheet.getRange(`D${startRow}:D${endRow}`).format.numberFormat = "yyyy-mm-dd";
  sheet.getRange(`E${startRow}:G${endRow}`).dataValidation = {
    rule: { type: "list", formula1: "Lists!$B$2:$B$4" },
  };
  sheet.getRange(`J${startRow}:J${endRow}`).dataValidation = {
    rule: { type: "list", formula1: "Lists!$H$2:$H$8" },
  };
  sheet.getRange(`K${startRow}:K${endRow}`).dataValidation = {
    rule: { type: "list", formula1: "Lists!$D$2:$D$4" },
  };
  addStatusFormatting(sheet.getRange(`C${startRow}:K${endRow}`), `C${startRow}`);

  setColumnWidths(sheet, {
    A: 28,
    B: 36,
    C: 16,
    D: 14,
    E: 12,
    F: 12,
    G: 12,
    H: 18,
    I: 18,
    J: 26,
    K: 20,
    L: 28,
    M: 18,
    N: 18,
  });

  sheet.freezePanes.freezeRows(7);
  const table = sheet.tables.add(`A${headerRow}:L${endRow}`, true, "FullTextEligibilityTable");
  table.style = "TableStyleLight9";
  table.showBandedRows = true;
  table.showFilterButton = true;
}

function buildExtractionSheet(sheet, rows) {
  applySheetFrame(
    sheet,
    "N",
    "PRISMA Step 7: Data Extraction",
    "This sheet is prefilled from the current coded survey dataset. Use it as the structured extraction form for included studies. Add new rows for newly included studies and keep Extraction Status up to date.",
  );

  const headerRow = 7;
  const startRow = 8;
  const endRow = startRow + rows.length - 1;
  sheet.getRange(`A${headerRow}:N${headerRow}`).values = [[
    "record_id",
    "Year",
    "Authors",
    "Title",
    "Venue",
    "Approach Class",
    "Interaction Paradigm",
    "Guidance Strategy",
    "Visualization",
    "Backend / Data Access",
    "Evidence / Validation",
    "Code / Demo Availability",
    "Notes",
    "Extraction Status",
  ]];
  styleHeaderRow(sheet, `A${headerRow}:N${headerRow}`);

  const values = rows.map((row) => [
    row.record_id,
    row.year,
    row.authors,
    row.title,
    row.venue,
    row.approachClass,
    row.interactionParadigm,
    row.guidanceStrategy,
    row.visualization,
    row.backendDataAccess,
    row.evidenceValidation,
    row.codeDemoAvailability,
    row.notes,
    "Completed",
  ]);
  sheet.getRange(`A${startRow}:N${endRow}`).values = values;
  styleEditable(sheet, `A${startRow}:N${endRow}`);
  addAlternatingBanding(sheet.getRange(`A${startRow}:N${endRow}`));
  sheet.getRange(`N${startRow}:N${endRow}`).dataValidation = {
    rule: { type: "list", formula1: "Lists!$F$2:$F$4" },
  };
  addStatusFormatting(sheet.getRange(`N${startRow}:N${endRow}`), `N${startRow}`);

  sheet.getRange("P7:R7").merge();
  sheet.getRange("P7").values = [["Extraction Summary"]];
  sheet.getRange("P7").format = {
    fill: COLORS.primary,
    font: baseTextFormat({ bold: true, color: COLORS.white, size: 10 }),
    horizontalAlignment: "center",
  };
  sheet.getRange("P8:Q10").values = [
    ["Rows prefilled", null],
    ["Completed", null],
    ["In progress", null],
  ];
  sheet.getRange("R8:R10").formulas = [[
    `=COUNTA($A$${startRow}:$A$${endRow})`,
  ], [
    `=COUNTIF($N$${startRow}:$N$${endRow},"Completed")`,
  ], [
    `=COUNTIF($N$${startRow}:$N$${endRow},"In Progress")`,
  ]];
  sheet.getRange("P8:R10").format = {
    fill: COLORS.surface,
    font: baseTextFormat({ size: 10 }),
  };

  setColumnWidths(sheet, {
    A: 28,
    B: 10,
    C: 30,
    D: 34,
    E: 18,
    F: 18,
    G: 24,
    H: 26,
    I: 20,
    J: 26,
    K: 24,
    L: 20,
    M: 32,
    N: 18,
    P: 18,
    Q: 14,
    R: 14,
  });

  sheet.freezePanes.freezeRows(7);
  const table = sheet.tables.add(`A${headerRow}:N${endRow}`, true, "DataExtractionTable");
  table.style = "TableStyleLight9";
  table.showBandedRows = true;
  table.showFilterButton = true;
}

function buildDashboardSheet(sheet, corpusCount, analyzedCount) {
  applySheetFrame(
    sheet,
    "Q",
    "PRISMA Step 8: Progress Dashboard",
    "This dashboard summarizes the workbook status. KPI cards pull from the operational sheets. Update the status and screening sheets, then refresh the workbook in Excel if needed to recalculate all summaries.",
  );

  const foundSheet = escapeSheetName("04_Found_Studies");
  const screeningSheet = escapeSheetName("05_Title_Abstract_Screening");
  const eligibilitySheet = escapeSheetName("06_Full_Text_Eligibility");
  const extractionSheet = escapeSheetName("07_Data_Extraction");
  const foundStart = 8;
  const foundEnd = foundStart + corpusCount - 1;
  const extractionStart = 8;
  const extractionEnd = extractionStart + analyzedCount - 1;

  const cards = [
    ["Found records", `=COUNTA('${foundSheet}'!$A$8:$A$${foundEnd})`, "B7:C7", "B8:C9"],
    ["Analyzed", `=COUNTIF('${foundSheet}'!$I$8:$I$${foundEnd},"Yes")`, "E7:F7", "E8:F9"],
    ["Included", `=COUNTIF('${eligibilitySheet}'!$K$8:$K$${foundEnd},"Include")`, "H7:I7", "H8:I9"],
    ["Excluded", `=COUNTIF('${eligibilitySheet}'!$K$8:$K$${foundEnd},"Exclude")+COUNTIF('${screeningSheet}'!$J$8:$J$${foundEnd},"Exclude")`, "K7:L7", "K8:L9"],
    ["Pending screening", `=COUNTBLANK('${screeningSheet}'!$J$8:$J$${foundEnd})`, "B11:C11", "B12:C13"],
    ["Still to analyze", `=COUNTA('${foundSheet}'!$A$8:$A$${foundEnd})-COUNTIF('${foundSheet}'!$I$8:$I$${foundEnd},"Yes")`, "E11:F11", "E12:F13"],
  ];
  for (const [label, formula, labelRange, valueRange] of cards) {
    const labelStart = labelRange.split(":")[0];
    const valueStart = valueRange.split(":")[0];
    sheet.getRange(labelRange).merge();
    sheet.getRange(labelStart).values = [[label]];
    sheet.getRange(labelStart).format = {
      fill: COLORS.secondary,
      font: baseTextFormat({ bold: true, size: 10 }),
      verticalAlignment: "center",
      horizontalAlignment: "center",
    };
    sheet.getRange(valueRange).merge();
    sheet.getRange(valueStart).formulas = [[formula]];
    sheet.getRange(valueStart).format = {
      fill: COLORS.surface,
      font: baseTextFormat({ bold: true, size: 16, color: COLORS.primary }),
      horizontalAlignment: "center",
      verticalAlignment: "center",
    };
  }

  sheet.getRange("J7:K12").values = [
    ["Status", "Count"],
    ["To Do", null],
    ["In Progress", null],
    ["Included", null],
    ["Excluded", null],
    ["Analyzed", null],
  ];
  styleHeaderRow(sheet, "J7:K7");
  const statusLabels = ["To Do", "In Progress", "Included", "Excluded", "Analyzed"];
  const statusFormulas = statusLabels.map((status) => [
    `=COUNTIF('${foundSheet}'!$H$8:$H$${foundEnd},"${status}")`,
  ]);
  sheet.getRange("K8:K12").formulas = statusFormulas;
  styleEditable(sheet, "J8:K12");

  sheet.getRange("M7:O10").values = [
    ["Reviewer", "Completed votes", "Remaining"],
    ["R1", null, null],
    ["R2", null, null],
    ["R3", null, null],
  ];
  styleHeaderRow(sheet, "M7:O7");
  sheet.getRange("N8:N10").formulas = [[
    `=COUNTIF('${screeningSheet}'!$D$8:$D$${foundEnd},"<>")`,
  ], [
    `=COUNTIF('${screeningSheet}'!$E$8:$E$${foundEnd},"<>")`,
  ], [
    `=COUNTIF('${screeningSheet}'!$F$8:$F$${foundEnd},"<>")`,
  ]];
  sheet.getRange("O8:O10").formulas = [[
    `=COUNTA('${foundSheet}'!$A$8:$A$${foundEnd})-N8`,
  ], [
    `=COUNTA('${foundSheet}'!$A$8:$A$${foundEnd})-N9`,
  ], [
    `=COUNTA('${foundSheet}'!$A$8:$A$${foundEnd})-N10`,
  ]];
  styleEditable(sheet, "M8:O10");

  const statusChart = sheet.charts.add("bar", sheet.getRange("J7:K12"));
  statusChart.title = "Progress by Status";
  statusChart.legend.position = "right";
  statusChart.barOptions.direction = "column";
  statusChart.barOptions.grouping = "clustered";
  statusChart.setPosition("B16", "H31");

  const reviewerChart = sheet.charts.add("bar", sheet.getRange("M7:O10"));
  reviewerChart.title = "Reviewer Coverage";
  reviewerChart.hasLegend = true;
  reviewerChart.legend.position = "right";
  reviewerChart.barOptions.direction = "column";
  reviewerChart.barOptions.grouping = "stacked";
  reviewerChart.setPosition("J16", "O29");

  sheet.getRange("P7:Q10").values = [
    ["Extra check", "Value"],
    ["Extraction rows", null],
    ["Completed extraction", null],
    ["Current analyzed baseline", analyzedCount],
  ];
  styleHeaderRow(sheet, "P7:Q7");
  sheet.getRange("Q8:Q9").formulas = [[
    `=COUNTA('${extractionSheet}'!$A$${extractionStart}:$A$${extractionEnd})`,
  ], [
    `=COUNTIF('${extractionSheet}'!$N$${extractionStart}:$N$${extractionEnd},"Completed")`,
  ]];
  styleEditable(sheet, "P8:Q10");

  setColumnWidths(sheet, {
    B: 14,
    C: 14,
    E: 14,
    F: 14,
    H: 14,
    I: 14,
    K: 14,
    L: 14,
    J: 16,
    M: 14,
    N: 14,
    P: 16,
    Q: 14,
  });
  sheet.freezePanes.freezeRows(6);
}

function buildPrismaFlowSheet(sheet, texCounts) {
  applySheetFrame(
    sheet,
    "L",
    "PRISMA Step 9: PRISMA Flow Counts",
    "This sheet starts from the counts currently recorded in survey.tex. Keep the input values editable and use the derived checks to confirm internal consistency before producing the final PRISMA flow diagram.",
  );

  const rows = [
    ["identifiedpaperscount", "Records identified", Number(texCounts.identifiedpaperscount || 0), "Initial search yield across sources."],
    ["prismaduplicatesremoved", "Duplicates removed", Number(texCounts.prismaduplicatesremoved || 0), "Deduplication before screening."],
    ["prismaautomationremoved", "Automation / non-paper removals", Number(texCounts.prismaautomationremoved || 0), "Removals before manual screening."],
    ["prismakeywordremoved", "Keyword / obvious out-of-scope removals", Number(texCounts.prismakeywordremoved || 0), "Manual pruning before title-abstract screening."],
    ["screenedrecordscount", "Records screened", Number(texCounts.screenedrecordscount || 0), "Should equal identified - pre-screen removals."],
    ["recordsexcludedcount", "Records excluded at screening", Number(texCounts.recordsexcludedcount || 0), "Title / abstract exclusions."],
    ["screenedpaperscount", "Reports sought for retrieval", Number(texCounts.screenedpaperscount || 0), "Records moving to full text."],
    ["prismareportsnotretrieved", "Reports not retrieved", Number(texCounts.prismareportsnotretrieved || 0), "Could not access full text."],
    ["assessedpaperscount", "Reports assessed for eligibility", Number(texCounts.assessedpaperscount || 0), "Full texts reviewed."],
    ["selectionexcludedpaperscount", "Full-text reports excluded", Number(texCounts.selectionexcludedpaperscount || 0), "Full-text exclusions."],
    ["excludednontopiccount", "Excluded: not on topic", Number(texCounts.excludednontopiccount || 0), "Reason breakdown."],
    ["excludednonenglishcount", "Excluded: non-English", Number(texCounts.excludednonenglishcount || 0), "Reason breakdown."],
    ["excludedlowdetailcount", "Excluded: insufficient methodological detail", Number(texCounts.excludedlowdetailcount || 0), "Reason breakdown."],
    ["includedWorkCount", "Studies included in review", Number(texCounts.includedWorkCount || texCounts.totapproachescount || 0), "Final included studies."],
  ];

  const startRow = 7;
  const endRow = startRow + rows.length - 1;
  sheet.getRange(`A${startRow}:D${endRow}`).values = rows;
  sheet.getRange(`A${startRow}:A${endRow}`).format = {
    fill: COLORS.secondary,
    font: baseTextFormat({ bold: true, size: 10 }),
    wrapText: true,
  };
  styleEditable(sheet, `B${startRow}:D${endRow}`);
  sheet.getRange(`C${startRow}:C${endRow}`).format.numberFormat = "0";

  sheet.getRange("A6:D6").values = [["Macro / Source key", "PRISMA count label", "Value", "Note"]];
  styleHeaderRow(sheet, "A6:D6");

  sheet.getRange("F6:H6").values = [["Derived check", "Formula result", "Interpretation"]];
  styleHeaderRow(sheet, "F6:H6");
  sheet.getRange("F7:H12").values = [
    ["Records screened check", null, "Should match Records screened."],
    ["Reports sought check", null, "Should match Reports sought for retrieval."],
    ["Reports assessed check", null, "Should match Reports assessed for eligibility."],
    ["Included studies check", null, "Should match Studies included in review."],
    ["Reason sum check", null, "Should match Full-text reports excluded."],
    ["Current included studies", null, "Value from the local survey draft baseline."],
  ];
  sheet.getRange("G7:G12").formulas = [[
    `=C7-C8-C9-C10`,
  ], [
    `=C11-C12`,
  ], [
    `=C13-C14`,
  ], [
    `=C15-C16`,
  ], [
    `=C17+C18+C19`,
  ], [
    `=C20`,
  ]];
  styleEditable(sheet, "F7:H12");

  setColumnWidths(sheet, {
    A: 26,
    B: 28,
    C: 12,
    D: 36,
    F: 22,
    G: 16,
    H: 26,
    J: 14,
    K: 14,
    L: 14,
  });
  sheet.freezePanes.freezeRows(6);
}

function buildChecklistSheet(sheet) {
  applySheetFrame(
    sheet,
    "J",
    "PRISMA Step 10: PRISMA 2020 Checklist",
    "Track reporting completeness here. Use Status to mark each PRISMA item as Not Started, In Progress, Done, or N/A. Fill the Where Addressed column with manuscript sections, appendix locations, or evidence notes.",
    "G",
  );

  addPanel(
    sheet,
    "H3:J5",
    "H3",
    "Source\nOfficial checklist based on the PRISMA 2020 checklist published at prisma-statement.org.",
    COLORS.warning,
  );

  const headerRow = 7;
  const startRow = 8;
  const endRow = startRow + checklistItems.length - 1;
  sheet.getRange(`A${headerRow}:G${headerRow}`).values = [[
    "Section",
    "Topic",
    "Item #",
    "Checklist item",
    "Status",
    "Where Addressed",
    "Notes",
  ]];
  styleHeaderRow(sheet, `A${headerRow}:G${headerRow}`);

  const values = checklistItems.map(([section, topic, itemNumber, description]) => [
    section,
    topic,
    itemNumber,
    description,
    null,
    null,
    null,
  ]);
  sheet.getRange(`A${startRow}:G${endRow}`).values = values;
  styleEditable(sheet, `A${startRow}:G${endRow}`);
  addAlternatingBanding(sheet.getRange(`A${startRow}:G${endRow}`));
  sheet.getRange(`E${startRow}:E${endRow}`).dataValidation = {
    rule: { type: "list", formula1: "Lists!$G$2:$G$5" },
  };
  addStatusFormatting(sheet.getRange(`E${startRow}:E${endRow}`), `E${startRow}`);

  setColumnWidths(sheet, {
    A: 18,
    B: 22,
    C: 10,
    D: 60,
    E: 16,
    F: 26,
    G: 24,
    H: 18,
    I: 18,
    J: 18,
  });

  sheet.freezePanes.freezeRows(7);
  const table = sheet.tables.add(`A${headerRow}:G${endRow}`, true, "PrismaChecklistTable");
  table.style = "TableStyleLight9";
  table.showBandedRows = true;
  table.showFilterButton = true;
}

await buildWorkbook();
