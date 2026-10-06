---
name: Knowledge Graph Exploration Survey
description: An editorial research companion for reading and comparing source evidence.
colors:
  primary: "#235e55"
  primary-deep: "#164d43"
  ochre: "#775a28"
  paper: "#f7f5ed"
  paper-raised: "#fffef9"
  paper-muted: "#efede4"
  ink: "#202c2b"
  secondary-text: "#53615d"
  rule: "#cbd0c5"
  focus: "#805d25"
  selection: "#c7ddd3"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(3rem, 6.2vw, 6rem)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.7rem, 2.5vw, 2.4rem)"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
rounded:
  field: "0.3rem"
  tray: "0.6rem"
spacing:
  compact: "0.5rem"
  control: "1rem"
  report-row: "1.5rem"
  section: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper-raised}"
    rounded: "{rounded.field}"
    padding: "0.65rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0.65rem 1rem"
  field:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "2.8rem"
---

# Design System: Knowledge Graph Exploration Survey

## Overview

**Design approach: a research reading room**

Serif headings, dividing rules, and spaced report entries organise reading and comparison. Dense data uses lists and tables, and controls stay visually secondary.

**Key Characteristics:**

- Serif titles and report entries paired with deliberate system sans controls.
- Ivory paper, dark ink, teal actions, and ochre chronology.
- Flat surfaces separated by rules and spacing.
- Clear source locators, evidence states, and report-specific denominators.

## Colors

Teal identifies links, source actions, and implemented evidence. Ochre provides chronological context and proposed-method emphasis. Paper and raised paper separate the page from form fields and the comparison tray. Ink carries the principal text; secondary text carries source context and reporting boundaries. Focus has its own high-contrast outline, and text selection uses the selection tint.

## Typography

Newsreader is locally served under the SIL Open Font License. It gives headings and report titles a publication voice. The system sans is intentional for body text, labels, counts, and controls.

The display scale belongs to the home introduction. Page titles use a smaller fluid scale, report titles use a compact serif hierarchy, and the body measure remains bounded in reading sections. Tabular numerals keep years and count columns aligned. Monospace is reserved for exact query expressions.

## Layout

The page has a bounded wide canvas with proportional outer margins. Catalogue and detail views use a left reading or filter column beside the report content. Methods use a narrow contents column. Mobile layouts become a single reading column; catalogue filters form a compact two-column grid with full-width search and year controls.

The source uses intermediate and mobile breakpoints recorded in the sidecar. Wide comparison and decision tables scroll within their own labelled regions. Report lists reflow without horizontal scrolling. More space precedes section headings than separates a heading from its related text.

## Elevation & Depth

The system uses flat tonal surfaces and single rules. Buttons have no shadow. The floating comparison tray is separated by its raised paper surface and one border. It does not add a second shadow treatment.

## Shapes

Controls and disclosure containers have modest corners. Report rows, author entries, family groups, and reading sections remain unboxed. Crisp SVG strokes supply the small icon vocabulary and graph-shaped favicon.

## Components

### Buttons

Primary actions use teal with light text. Secondary actions use an outline and ink text. Ghost controls remain quiet. All controls have a visible keyboard focus outline; disabled controls reduce opacity and suppress the action. Labels state an action directly.

### Inputs and filters

Fields use raised paper and a visible stroke. Search has a persistent text label and a simple stroke icon. Native selects retain keyboard behaviour. Required dimension and state selectors omit an empty choice; optional catalogue filters offer an all-values choice.

### Navigation

The masthead pairs the compact serif wordmark with text navigation. The active route uses a restrained underline. Mobile navigation wraps below the wordmark. A skip link is available on keyboard focus.

### Report rows

A year column precedes the source title and authors. Attested primary approach names and the interaction summary follow. The comparison checkbox is labelled by the complete report title and moves beneath the report text at narrower widths.

### Evidence and comparison

Evidence labels remain plain text, rather than numerous badges. Source locators sit immediately beneath each claim. The comparison table keeps states and report-specific study limits inside each column. The floating comparison tray offers clear and compare actions after a reader selects reports, with one short clipped reveal and a reduced-motion alternative.

## Do's and Don'ts

### Do:

- **Do** give source titles and report evidence the main visual hierarchy.
- **Do** keep labels, focus states, error recovery, and no-results states explicit.
- **Do** retain the report-specific analytical unit beside its count.
- **Do** use rules, white space, and tonal surfaces to separate content.

### Don't:

- **Don't** replace source evidence with decorative graphs or inferred citation edges.
- **Don't** introduce gradients, oversized badge collections, or repeated metric cards.
- **Don't** treat proposed or future capabilities as implemented features.
- **Don't** use geometric illustrations in place of the actual research content.
