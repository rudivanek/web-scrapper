const BUILD_HEADER = `> Generated from an automated extraction. Values marked ASSUMED were not
> found in the site's CSS and were inferred from the screenshot. Review the
> "Assumptions to verify" section before building.`;

const CORE_FRAMING = `You are writing BUILD.md — a complete specification an AI website builder will execute to reproduce this page. Unlike design.md, this document must contain NO unresolved values. Every token needs a concrete, usable value.

For each value marked NOT FOUND in design.md, supply a sensible default that is visually consistent with the screenshot and with the values that WERE extracted — and mark it, using exactly this format:

  border-radius: 9999px; /* ASSUMED — pill shape visible in screenshot, exact value not in CSS */

Values traced to real CSS carry no comment. A reader must be able to tell them apart instantly.

Derive assumptions in this order:
  1. Visual evidence from the screenshot
  2. Consistency with extracted values (if spacing is a 4px grid, stay on it)
  3. Common conventions for the detected platform
Never derive from brand name, industry, or aesthetic taste.

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
2. Screenshot segments of the rendered page

## OUTPUT FORMAT

Produce these sections in order, starting immediately with "### 1. Overview" (no header, no preamble):

### 1. Overview
- What page this is, its purpose
- Section count
- Detected stack (CMS, builder, framework, CSS approach — from the Platform section of design.md)

### 2. Tech Notes — Fonts
- For each font family, state exactly how to load it:
  - Google Fonts: provide the exact <link> tag or @import URL
  - @font-face: provide the URL when known
  - Custom/licensed: state clearly that the font is custom or licensed and cannot be loaded from a CDN, and provide the best Google Fonts fallback
- Never leave a font loading method ambiguous

### 3. tailwind.config.js Theme Extension
Provide a fully populated, valid JS object for the Tailwind theme extension:
\`\`\`js
module.exports = {
  theme: {
    extend: {
      colors: { /* all color tokens with hex values */ },
      fontFamily: { /* heading and body font stacks */ },
      fontSize: { /* all type scale entries */ },
      spacing: { /* all spacing tokens */ },
      borderRadius: { /* all radius tokens */ },
      screens: { /* actual breakpoints from design.md, NOT remapped to Tailwind defaults */ },
    }
  }
}
\`\`\`
- Use the actual breakpoint values found in design.md as the \`screens\` config. Do not remap them onto Tailwind defaults.
- If the site is desktop-first (max-width media queries), say so explicitly and provide the screens config that matches.
- Every value must be concrete. Replace NOT FOUND with ASSUMED defaults marked with comments.

### 4. Global CSS
A valid :root block with every token resolved to a concrete value. No NOT FOUND. No commented-out tokens. ASSUMED values are marked with inline comments.

## RULES
- Do not emit the fixed header.
- Do not emit sections 5, 6, or 7.
- Reproduce all visible text VERBATIM from blueprint.json text_blocks where referenced. Do not summarise, translate, shorten, or improve.
- Do not redesign or improve anything. This is a faithful reproduction spec.`;

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
- Do not redesign or improve anything. This is a faithful reproduction spec.`;

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
- All interactive states (:hover, :focus, :focus-visible, :active, :disabled) — if design.md said CONFIRMED ABSENT, carry that through as a real finding, not an assumption
- ASSUMED values marked with inline comments

### 7. Assumptions to Verify
A consolidated list of every ASSUMED value that appears anywhere in sections 1–7 of this document, with its reason and the section it appears in:
| Section | Property | Assumed value | Reason |
|---------|----------|---------------|--------|
| [section] | [property] | [value] | [why this value was chosen] |

This section is MANDATORY. If you cannot find any ASSUMED values in the provided sections 1–5, state that explicitly.

## RULES
- Do not emit the fixed header.
- Do not emit sections 1–5.
- Scan the provided sections 1–5 for every ASSUMED comment and include each one in the Assumptions table.
- Do not redesign or improve anything. This is a faithful reproduction spec.
- If design.md contains a Contraste de color section with failures, reproduce those findings in the Component Specs so the builder is aware of accessibility issues.`;

export function buildFoundationUserPrompt(designMd: string): string {
  return `Here is the design.md generated from this page:

\`\`\`markdown
${designMd}
\`\`\`

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
