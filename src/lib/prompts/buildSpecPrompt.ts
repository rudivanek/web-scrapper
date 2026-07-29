const BUILD_HEADER = `> Generated from an automated extraction. Values marked ASSUMED were not
> found in the site's CSS and were inferred from the screenshot. Review the
> "Assumptions to verify" section before building.`;

const CORE_FRAMING = `You are writing BUILD.md — a complete specification an AI website builder will execute to reproduce this page. Unlike design.md, this document must contain NO unresolved values. Every token needs a concrete, usable value.

BUILD.md is the CLEAN BUILD SPEC. design.md is the HONEST AUDIT. The difference:
- design.md keeps NOT FOUND, CONFIRMED ABSENT, and audit-style warnings — that is its job.
- BUILD.md must NEVER contain NOT FOUND, CONFIRMED ABSENT, or audit-style warnings in its token blocks or component specs. It reads as a clean, confident, buildable design system.
- ASSUMED markers must appear ONLY in the consolidated "Assumptions to verify" section at the end of the document — NOT scattered through the token tables, :root block, or component specs. In the token blocks themselves, every value is presented as a clean, final value with no inline comment.

For each value marked NOT FOUND in design.md, supply a sensible default that is visually consistent with the screenshot and with the values that WERE extracted. Do NOT mark these inline in the token blocks — just use the value. The consolidated Assumptions section at the end will list them all.

Derive assumptions in this order:
  1. Visual evidence from the screenshot
  2. Consistency with extracted values (if spacing is a 4px grid, stay on it)
  3. Common conventions for the detected platform
Never derive from brand name, industry, or aesthetic taste.

Selectors scoped to a page or template other than the one being analysed must not be applied to this page's sections. Watch for template prefixes such as .p.sei, .p.in, #_404, #lo, ._i-w — these belong to other views. If a section's colour or size is unknown, supply an ASSUMED value — never borrow a value from a different template scope and present it as confirmed. Only compute contrast pairings for colours that ACTUALLY OCCUR TOGETHER on this page; if two colours come from selectors in different template scopes, omit the pairing entirely rather than reporting a false accessibility failure.

Values already marked CONFIRMED ABSENT in design.md are NOT assumptions — carry them through as real values with no ASSUMED marker.

The string 'NOT FOUND' must never appear in BUILD.md, including inside comments. If a token has no value, either omit it entirely or supply an ASSUMED value. Write 'no declarado en el CSS de marca' if you need to explain an omission.

The 'Assumptions to verify' section is MANDATORY and must list every ASSUMED value that appears anywhere in this document, with its reason and the section it appears in. If this section is missing, the document is unusable.`;

export const BUILD_SPEC_FIXED_HEADER = BUILD_HEADER;

export const BUILD_SPEC_FOUNDATION_PROMPT = `${CORE_FRAMING}

## YOUR RESPONSIBILITY

You are responsible for sections 1 through 4 ONLY. Do NOT emit sections 5, 6, or 7. Do NOT emit the fixed header (it will be prepended separately).

## INPUTS

You receive:
1. design.md — the complete design system analysis (may contain NOT FOUND values)
2. blueprint.json — the page structure with page_title, section names, and section roles
3. Screenshot segments of the rendered page

## OUTPUT FORMAT

Produce these sections in order, starting immediately with "### 1. Overview" (no header, no preamble):

### 1. Overview
- What page this is, its purpose — MUST be derived from blueprint.json's page_title and its section names and roles. Do NOT infer what the page is from the screenshot. A screenshot segment may show a single project thumbnail or a partial view and is not evidence of the page's purpose.
- Section count — comes from blueprint.json's sections array, never from what is visible in a screenshot segment
- Detected stack (CMS, builder, framework, CSS approach — from the Platform section of design.md)

### 2. Tech Notes — Fonts
- For each font family, state exactly how to load it:
  - Google Fonts: provide the exact <link> tag or @import URL
  - @font-face: provide the URL when known
  - Custom/licensed: state clearly that the font is custom or licensed and cannot be loaded from a CDN, and provide the best Google Fonts fallback
- Never leave a font loading method ambiguous

### 3. Design System — Tailwind v4 @theme Block

This project uses **Tailwind CSS v4**. Emit the design system as a Tailwind v4 \`@theme\` block — this is the v4-native way to define design tokens and replaces the v3 \`tailwind.config.js theme.extend\` approach.

Provide a fully populated, valid \`@theme\` block using Tailwind v4 CSS syntax:
\`\`\`css
@theme {
  /* Colors — semantic names by purpose, not scale position */
  --color-electric-blue-cta: #XXXXXX;
  --color-nav-bg: #XXXXXX;
  --color-body-text: #XXXXXX;
  --color-heading-text: #XXXXXX;
  --color-card-bg: #XXXXXX;
  --color-border-subtle: #XXXXXX;

  /* Fonts */
  --font-heading: 'FontName', fallback;
  --font-body: 'FontName', fallback;

  /* Type scale */
  --text-display: 48px;
  --text-h1: 38px;
  --text-h2: 28px;
  --text-body: 16px;

  /* Spacing — semantic names */
  --spacing-nav-v-pad: 16px;
  --spacing-section-v: 80px;
  --spacing-card-pad: 24px;
  --spacing-container-x: 32px;

  /* Radius */
  --radius-button: 8px;
  --radius-card: 12px;
  --radius-pill: 9999px;

  /* Breakpoints — actual values from design.md */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}
\`\`\`

**SEMANTIC TOKEN NAMING — critical:**
Name every token by WHERE IT IS USED (its semantic purpose), not by its scale position. Derive the name from the selector or component where the value appears in the CSS:
- \`--color-electric-blue-cta\` (not \`--color-primary\`) — the blue used on CTA buttons
- \`--color-nav-bg\` (not \`--color-gray-900\`) — the nav background color
- \`--spacing-nav-v-pad\` (not \`--spacing-3\`) — vertical padding inside the nav
- \`--spacing-section-v\` (not \`--spacing-10\`) — vertical padding between sections
- \`--radius-button\` (not \`--radius-md\`) — border radius on buttons

Keep a scale name (e.g. \`--color-gray-50\`) ONLY when there is no clear semantic role — i.e. the value is part of a neutral ramp used in many interchangeable places. When a color or spacing value has a clear, specific use, name it after that use.

- Use the actual breakpoint values found in design.md. Do not remap them onto Tailwind defaults.
- If the site is desktop-first (max-width media queries), say so explicitly.
- Every value must be concrete — no NOT FOUND, no commented-out tokens.
- Note at the top of this section: "This is Tailwind v4 @theme syntax. In v4, the @theme block in your main CSS file replaces tailwind.config.js theme.extend."

### 4. Global CSS (:root block)
A valid \`:root\` block with every token resolved to a concrete value. This is the CSS custom property layer that the @theme block above maps to.

Use the SAME semantic names as in the @theme block. No NOT FOUND. No commented-out tokens. No inline ASSUMED comments — present every value as a clean, final value. The consolidated Assumptions section at the end of the document will list which values were assumed.

## RULES
- Do not emit the fixed header.
- Do not emit sections 5, 6, or 7.
- Reproduce all visible text VERBATIM from blueprint.json text_blocks where referenced. Do not summarise, translate, shorten, or improve.
- Do not redesign or improve anything. This is a faithful reproduction spec.
- You must NOT write a section titled 'Assumptions to Verify', 'Assumptions to verify', or any variant. The consolidated table is written exclusively by the final components call. If you write one, the document is malformed.
- Do NOT scatter ASSUMED inline comments through the token blocks, @theme block, :root block, or component specs. Present every value as a clean, final value. The consolidated Assumptions section at the end will list every assumed value with its reason.
- Do NOT include NOT FOUND, CONFIRMED ABSENT, or audit-style warnings in any token block or component spec. BUILD.md is the clean build spec — it reads as a confident, buildable design system. design.md is the honest audit; BUILD.md is not.
- Use semantic token names (by purpose/usage) throughout — in the @theme block, :root block, and component specs. Keep scale names only when no semantic role exists.
- If the supplied design.md contains a warning that its tokens do not represent the site's real design system, repeat that warning verbatim at the top of your output. Do not build a confident specification on unreliable input.`;

export const BUILD_SPEC_SECTIONS_PROMPT = `${CORE_FRAMING}

## YOUR RESPONSIBILITY

You are responsible for section 5 ONLY (Section-by-Section Build Instructions). Do NOT emit sections 1–4, 6, or 7. Do NOT emit the fixed header. Do NOT repeat any content from sections 1–4.

## INPUTS

You receive:
1. design.md — the complete design system analysis (may contain NOT FOUND values)
2. blueprint.json — the page structure with text_blocks (verbatim text), assets (absolute URLs), and layout contracts
3. Screenshot segments of the rendered page
4. The already-generated sections 1–4 of BUILD.md — use these to ensure token names, color names, and spacing values stay consistent

## OUTPUT FORMAT

Produce only "### 5. Section-by-Section Build Instructions" — start immediately with that heading, no preamble.

For each section in page order, provide:
- Section name and index
- Layout contract (from blueprint.json — respect every must_preserve and do_not_do rule)
- text_blocks: the verbatim text, reproduced exactly as in blueprint.json, in its original language
- Assets: each image URL (absolute), its alt text, and its role
- Resolved colors: the specific background-color and text-color for this section (concrete hex values, no NOT FOUND)

## RULES
- Do not emit the fixed header.
- Do not emit sections 1–4, 6, or 7.
- Reproduce all visible text VERBATIM from blueprint.json text_blocks. Do not summarise, translate, shorten, or improve.
- Use the exact image URLs from blueprint.json assets. Do not substitute placeholder images.
- Respect every layout_contract must_preserve and do_not_do rule from blueprint.json.
- Do not redesign or improve anything. This is a faithful reproduction spec.
- Use the exact section_index values from blueprint.json in your headings, formatted as '### Section N — Name'. Do not renumber, do not add a 'Section 0', and do not introduce sections that are not in blueprint.json. Navigation and footer are documented under Component Specs in section 6, not as page sections.
- You must NOT write a section titled 'Assumptions to Verify', 'Assumptions to verify', or any variant. The consolidated table is written exclusively by the final components call. If you write one, the document is malformed.
- Do NOT scatter ASSUMED inline comments through the section specs. Present every value as a clean, final value. The consolidated Assumptions section at the end will list every assumed value with its reason.
- Do NOT include NOT FOUND, CONFIRMED ABSENT, or audit-style warnings in any section spec. BUILD.md is the clean build spec.
- Use the same semantic token names established in sections 1–4 when referencing colors, spacing, or radius values.
- If the supplied design.md contains a warning that its tokens do not represent the site's real design system, repeat that warning verbatim at the top of your output. Do not build a confident specification on unreliable input.`;

export const BUILD_SPEC_COMPONENTS_PROMPT = `${CORE_FRAMING}

## YOUR RESPONSIBILITY

You are responsible for sections 6 and 7 ONLY. Do NOT emit sections 1–5. Do NOT emit the fixed header. Do NOT repeat any content from earlier sections.

## INPUTS

You receive:
1. design.md — the complete design system analysis (may contain NOT FOUND values)
2. The already-generated sections 1–5 of BUILD.md — scan these for every ASSUMED marker so your Assumptions table is complete

## OUTPUT FORMAT

Produce these sections in order, starting immediately with "### 6. Component Specs":

### 6. Component Specs
For each component (buttons, cards, nav, footer, forms, links):
- Every CSS property filled with a concrete value
- All interactive states (:hover, :focus, :focus-visible, :active, :disabled) — if design.md said CONFIRMED ABSENT, carry that through as a real value with no ASSUMED marker and no warning text. BUILD.md presents it as a clean spec, not an audit finding.
- Present every value as a clean, final value — no inline ASSUMED comments in the component specs. The consolidated Assumptions section (7) will list every assumed value.
- Do NOT include NOT FOUND, CONFIRMED ABSENT, or audit-style warnings in the component specs. BUILD.md is the clean build spec — it reads as a confident, buildable design system.
- Use the same semantic token names established in sections 1–4 when referencing colors, spacing, or radius values.

### 7. Assumptions to Verify
A consolidated list of every ASSUMED value that appears anywhere in sections 1–7 of this document, with its reason and the section it appears in:
| Section | Property | Assumed value | Reason |
|---------|----------|---------------|--------|
| [section] | [property] | [value] | [why this value was chosen] |

This section is MANDATORY. If you cannot find any ASSUMED values in the provided sections 1–5, state that explicitly.

## RULES
- Do not emit the fixed header.
- Do not emit sections 1–5.
- Scan the provided sections 1–5 for every ASSUMED value (values that were not found in CSS but were supplied as defaults) and include each one in the Assumptions table. Since sections 1–5 no longer scatter inline ASSUMED comments, you must identify assumed values by comparing the token values against design.md's NOT FOUND entries — any token that was NOT FOUND in design.md but has a concrete value in BUILD.md is an assumption.
- Do not redesign or improve anything. This is a faithful reproduction spec.
- If design.md contains a Contraste de color section with failures, reproduce those findings in the Component Specs so the builder is aware of accessibility issues.
- Do NOT include NOT FOUND, CONFIRMED ABSENT, or audit-style warnings in the component specs. BUILD.md is the clean build spec.
- Use the same semantic token names established in sections 1–4 when referencing colors, spacing, or radius values.
- If the supplied design.md contains a warning that its tokens do not represent the site's real design system, repeat that warning verbatim at the top of your output. Do not build a confident specification on unreliable input.`;

export function buildFoundationUserPrompt(designMd: string, blueprintJson?: string): string {
  const blueprintBlock = blueprintJson
    ? `\n\nHere is the blueprint.json (page structure with page_title, section names, and section roles). Use its page_title for the Overview and its sections array for the section count:\n\n\`\`\`json\n${blueprintJson}\n\`\`\`\n`
    : '';

  return `Here is the design.md generated from this page:

\`\`\`markdown
${designMd}
\`\`\`${blueprintBlock}

Generate sections 1–4 of BUILD.md. Start directly with "### 1. Overview". Do not emit the fixed header or any other sections.`;
}

export function buildSectionsUserPrompt(
  designMd: string,
  blueprintJson: string,
  sections1to4: string,
  sectionRange?: { start: number; end: number; total: number },
): string {
  const rangeNote = sectionRange
    ? `\n\nIMPORTANT: blueprint.json has ${sectionRange.total} sections. You must ONLY generate sections ${sectionRange.start} through ${sectionRange.end} in this call. Do not generate sections outside this range. Start with "### 5. Section-by-Section Build Instructions" and only include the sections for indices ${sectionRange.start} through ${sectionRange.end}.`
    : '';

  return `Here is the design.md generated from this page:

\`\`\`markdown
${designMd}
\`\`\`

Here is the blueprint.json (page structure with verbatim text_blocks, assets with absolute URLs, and layout contracts):

\`\`\`json
${blueprintJson}
\`\`\`

Here are the already-generated sections 1–4 of BUILD.md (use these for consistent token names):

\`\`\`markdown
${sections1to4}
\`\`\`
${rangeNote}

Generate section 5 of BUILD.md${sectionRange ? ` (sections ${sectionRange.start}–${sectionRange.end} of ${sectionRange.total})` : ''}. Start directly with "### 5. Section-by-Section Build Instructions". Do not emit the fixed header or any other sections.`;
}

export function buildComponentsUserPrompt(
  designMd: string,
  sections1to5: string,
): string {
  return `Here is the design.md generated from this page:

\`\`\`markdown
${designMd}
\`\`\`

Here are the already-generated sections 1–5 of BUILD.md. Scan these for every ASSUMED marker so your Assumptions table is complete:

\`\`\`markdown
${sections1to5}
\`\`\`

Generate sections 6–7 of BUILD.md. Start directly with "### 6. Component Specs". Do not emit the fixed header or any other sections. The Assumptions to Verify section (7) is MANDATORY — list every ASSUMED value found in sections 1–5 plus any new ones you introduce in section 6.`;
}
