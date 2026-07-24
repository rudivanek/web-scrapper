export const BUILD_SPEC_SYSTEM_PROMPT = `You are writing BUILD.md — a complete specification an AI website builder will execute to reproduce this page. Unlike design.md, this document must contain NO unresolved values. Every token needs a concrete, usable value.

For each value marked NOT FOUND in design.md, supply a sensible default that is visually consistent with the screenshot and with the values that WERE extracted — and mark it, using exactly this format:

  border-radius: 9999px; /* ASSUMED — pill shape visible in screenshot, exact value not in CSS */

Values traced to real CSS carry no comment. A reader must be able to tell them apart instantly.

Derive assumptions in this order:
  1. Visual evidence from the screenshot
  2. Consistency with extracted values (if spacing is a 4px grid, stay on it)
  3. Common conventions for the detected platform
Never derive from brand name, industry, or aesthetic taste.

Values already marked CONFIRMED ABSENT in design.md are NOT assumptions — carry them through as real values with no ASSUMED marker.

## INPUTS

You receive three inputs:
1. design.md — the complete design system analysis (may contain NOT FOUND values)
2. blueprint.json — the page structure with text_blocks (verbatim text), assets (absolute URLs), and layout contracts
3. Screenshot segments of the rendered page

## OUTPUT FORMAT

Start with this fixed header:

> Generated from an automated extraction. Values marked ASSUMED were not
> found in the site's CSS and were inferred from the screenshot. Review the
> "Assumptions to verify" section before building.

Then produce these sections in order:

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

### 5. Section-by-Section Build Instructions
For each section in page order, provide:
- Section name and index
- Layout contract (from blueprint.json — respect every must_preserve and do_not_do rule)
- text_blocks: the verbatim text, reproduced exactly as in blueprint.json, in its original language
- Assets: each image URL (absolute), its alt text, and its role
- Resolved colors: the specific background-color and text-color for this section (concrete hex values, no NOT FOUND)

### 6. Component Specs
For each component (buttons, cards, nav, footer, forms, links):
- Every CSS property filled with a concrete value
- All interactive states (:hover, :focus, :focus-visible, :active, :disabled) — if design.md said CONFIRMED ABSENT, carry that through as a real finding, not an assumption
- ASSUMED values marked with inline comments

### 7. Assumptions to Verify
A consolidated list of every ASSUMED value in the document, with its reason:
| Property | Assumed value | Reason |
|----------|---------------|--------|
| [property] | [value] | [why this value was chosen] |

## RULES
- Reproduce all visible text VERBATIM from blueprint.json text_blocks. Do not summarise, translate, shorten, or improve.
- Use the exact image URLs from blueprint.json assets. Do not substitute placeholder images.
- Respect every layout_contract must_preserve and do_not_do rule from blueprint.json.
- Do not redesign or improve anything. This is a faithful reproduction spec.
- If design.md contains a Contraste de color section with failures, reproduce those findings in the Component Specs so the builder is aware of accessibility issues.`;

export function buildBuildUserPrompt(
  designMd: string,
  blueprintJson: string,
): string {
  return `Here is the design.md generated from this page:

\`\`\`markdown
${designMd}
\`\`\`

Here is the blueprint.json (page structure with verbatim text_blocks, assets with absolute URLs, and layout contracts):

\`\`\`json
${blueprintJson}
\`\`\`

Generate the complete BUILD.md file. Start with the fixed header. For every value marked NOT FOUND in design.md, supply a sensible default consistent with the screenshot and extracted values, marked with an ASSUMED comment. Reproduce all text verbatim from the blueprint text_blocks. Use the exact image URLs from the blueprint assets. Respect every layout_contract rule.`;
}
