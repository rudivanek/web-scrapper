# PimpMyCopy (Sharpen Studio) — Features Documentation

<!-- Version: 8.3 | Last Updated: 2026-07-25T00:15:00Z -->

---

## Table of Contents

1. [SEO Audit](#seo-audit)
2. [CRO Audit](#cro-audit)
3. [Copy Analysis](#copy-analysis)
4. [Export System](#export-system)
5. [Acciones de Copy Module](#copyzap-send-module)
6. [Exportar Informe Completo](#exportar-informe-completo)
7. [Exportar HTML — Scrape Results](#exportar-html--scrape-results)
8. [Informe Completo — Firecrawl Data Block](#informe-completo--firecrawl-data-block)
9. [Scrape Module — Extraction Pipeline Refactor](#scrape-module--extraction-pipeline-refactor)
10. [Brand Identity .md Export](#brand-identity-md-export)
11. [CSS Inspector](#css-inspector)
12. [Design Extractor](#design-extractor)

---

## CSS Inspector

**Added:** 2026-04-28

A new "CSS Inspector" section appears inside the Brand Identity Extractor after a successful branding extraction. It runs server-side alongside the existing branding and font extraction, fetching all stylesheets in parallel.

### How it works

1. A new Supabase Edge Function `extract-css` is called with the page URL.
2. The function fetches the page HTML, collects all `<link rel="stylesheet">` URLs and inline `<style>` blocks, downloads each stylesheet, and follows `@import` rules one level deep.
3. The full CSS text is parsed to extract:
   - **CSS Custom Properties (Design Tokens)** — all `--variable: value` declarations with their selector context
   - **Color Values** — every hex (`#rrggbb`/`#rgb`/`#rrggbbaa`), `rgb()`, `rgba()`, `hsl()`, and `hsla()` value, deduplicated and sorted by frequency of use
   - **Font Declarations** — all `font-family`, `font-size`, `font-weight`, `font-style`, `line-height`, `letter-spacing`, and `text-transform` rules
   - **Keyframe Animations** — each `@keyframes` block with its full raw CSS
   - **Media Queries** — each unique `@media` rule
   - **Raw CSS** — the full source text of every stylesheet (truncated at 100 KB per file)
4. A structured `CssExtractResult` object is returned and stored in component state alongside the branding data.

### UI

The CSS Inspector section is collapsible (closed by default) and shows:

- A header badge with total CSS size in KB
- A sheet summary row listing each stylesheet filename and size
- A tab bar with 6 tabs:
  - **Tokens** — table of all CSS custom properties; columns: name, value, selector; copy button per row
  - **Colors** — color swatches sorted by frequency (most-used first); click any swatch to copy the value; usage count displayed below each swatch
  - **Fonts** — table of font declarations; columns: property, value, selector
  - **Keyframes** — expandable code blocks for each animation; copy button per block
  - **Media** — list of all unique media query rules; copy button per row
  - **Raw CSS** — accordion list of stylesheets; expand any sheet to view full source; copy button per sheet

### Files

- **Edge Function:** `supabase/functions/extract-css/index.ts`
- **Client helper + types:** `src/lib/firecrawl.ts` — `extractCssData()`, `CssExtractResult`, `CssCustomProperty`, `CssColorValue`, `CssFontDeclaration`, `CssKeyframe`, `CssMediaQuery`, `CssSheet`
- **Component:** `src/components/BrandingExtractor.tsx` — `CssInspector` sub-component, `CssColorSwatch` sub-component

---

## SEO Audit

Generates a full SEO audit for a given URL using Claude AI.

### SEO Metadata Extraction (HTML enrichment)

**Updated:** 2026-04-08

When a page is scraped before an audit, the system now extracts SEO metadata directly from the raw HTML response and prepends a structured context block to the markdown before sending it to Claude. This fixes unreliable meta/heading data on WordPress sites.

**How it works:**

1. `scrapeFullPage` requests `['markdown', 'html', 'rawHtml']` from Firecrawl (unchanged). `scrapeUrl` now also requests `html`.
2. After scraping, `extractSeoMetadata(html)` in `src/lib/htmlExtract.ts` extracts:
   - `metaTitle` — `<title>` tag content
   - `metaDescription` — `<meta name="description">` content attribute
   - `ogTitle` — `<meta property="og:title">` content
   - `ogDescription` — `<meta property="og:description">` content
   - `canonicalUrl` — `<link rel="canonical">` href
   - `h1Tags`, `h2Tags`, `h3Tags` — all heading text nodes
   - Uses `DOMParser` (browser) as primary method; falls back to regex if DOMParser throws
3. `buildSeoMetadataBlock(meta)` formats the extracted data into a `=== SEO METADATA ===` block
4. The block is **prepended to the markdown** before it is stored in `scrapedData.markdown`
5. All three audit types (CRO, SEO, Copy) receive the enriched markdown, but only the SEO audit prompt explicitly instructs Claude to treat the prepended block as authoritative

**Files changed:**
- `src/lib/htmlExtract.ts` — added `SeoMetadata` interface, `extractSeoMetadata()`, `buildSeoMetadataBlock()`, and regex helper functions
- `src/lib/firecrawl.ts` — `scrapeUrl` now requests `['markdown', 'html', 'links']`
- `src/components/CROAudit.tsx` — `handleScrapePage` now extracts SEO metadata and prepends the formatted block to the stored markdown

The audit covers:

- Executive summary with overall SEO score
- Scorecard with 8 weighted dimensions (titleMeta 15%, headingStructure 15%, contentQuality 20%, keywordOptimization 15%, links 10%, imageMedia 10%, schemaStructuredData 10%, contentArchitecture 5%). Note: `schemaStructuredData` is labeled "Código Schema Generado" in the UI (ES); a subtitle "Listo para implementar — no está activo en la página aún" is shown beneath its score to clarify that the 10/10 score reflects the quality of the generated schema code, not whether it is live on the page.
- Heading structure map (H1–H6 tree)
- Keyword map (primary/secondary keywords with placement data)
- Detailed analysis per dimension with issues and recommendations
- Meta/heading rewrites (current vs. optimized)
- Schema markup code (ready to implement)
- Content gap analysis (missing subtopics, unanswered questions, recommended sections)
- SEO quick wins and high-impact changes
- Action plan (week 1, weeks 2–4, month 2–3)
- Final summary

**Component:** `src/components/SEOAuditResults.tsx`
**Prompt:** `src/lib/prompts/seoPrompt.ts`
**HTML Export:** `src/lib/htmlExporters/seoHtml.ts`

All section labels in the HTML export use `getLabels(result.language)` from `src/lib/i18n.ts` to match the app UI labels exactly, including language switching support.

---

## CRO Audit

Generates a CRO (Conversion Rate Optimization) audit. Covers:

- Scored assessment with 9 weighted dimensions
- Buyer journey analysis (cold/warm/hot visitor)
- Copy teardown and rewrites
- Competitor comparison
- **Section N — Estructura recomendada de página (Prose Wireframe)** — AI-generated zone-by-zone page layout blueprint based on actual scraped content
- A/B test recommendations (re-lettered to Section O)
- Action plan (Section P)
- Final summary (Section Q)

**Component:** `src/components/CROAuditResults.tsx`
**HTML Export:** `src/lib/htmlExporters/croHtml.ts`

### Page Scraping — Stale Session Data Fix

**Fixed:** 2026-04-11

**Bug:** The URL input and scraped page data are persisted in `sessionStorage` across page reloads within the same browser session. If the user entered a new URL without clicking "Scrape Page", the old scraped content from a previous audit would still be shown on screen, making it appear as if the wrong URL was being audited (or that a cached result from a different URL was returned).

**Fix applied in `CROAudit.tsx`:**

1. **`onChange` handler on URL input** — When the user edits the URL field, if the current value no longer matches `scrapedData.url`, `scrapedData` is immediately cleared and its `sessionStorage` entry is removed. This ensures the stale scraped-data badge disappears as soon as the user starts typing a new URL.

2. **`handleScrapePage` — clear before fetch** — At the start of every scrape attempt, `scrapedData` is set to `null` and its `sessionStorage` key is removed before the Firecrawl API call is made. This guarantees no old content is ever visible during a new scrape.

### Edge Function JWT Configuration Fix

**Fixed:** 2026-04-12

**Bug:** `run-seo-audit` and `run-copy-analysis` were deployed with `verifyJWT: true`, while `run-cro-audit` and `generate-content-suggestions` were deployed with `verifyJWT: false`. Supabase's gateway was rejecting requests to the SEO and Copy edge functions with a 401 Unauthorized before any function code ran. This caused every SEO and Copy audit to silently fail at the invocation step, leaving `seoResult` and `copyResult` permanently null. As a result, the CopyZap brief was always generated from CRO-only data regardless of whether SEO or Copy analysis had been requested.

**Fix:** Both `run-seo-audit` and `run-copy-analysis` were redeployed with `verify_jwt: false`. All three audit edge functions now match. This is correct because all three functions use the Supabase service role key for all database operations and receive `userId` from the request body — they do not rely on gateway-level JWT verification for authorization.

**Required deployment state for audit edge functions:**

| Function | verifyJWT |
|---|---|
| `run-cro-audit` | false |
| `run-seo-audit` | false |
| `run-copy-analysis` | false |
| `generate-content-suggestions` | false |

### Auto-generation of Content Suggestions After CRO Audit

**Updated:** 2026-04-13

**Change:** Content suggestions ("Generar sugerencias de contenido") are now generated automatically as part of the CRO audit flow. The user no longer needs to click a separate button after the CRO audit completes.

**Previous behaviour:** The CRO audit ran and displayed results. A standalone "Generar sugerencias de contenido" button appeared below the results requiring a manual click to trigger a second AI call.

**New behaviour:** Immediately after the CRO audit writes its result to the database and updates the UI, the system automatically calls `runContentSuggestions()` with the freshly generated audit data. The content suggestions section shows a loading indicator while the second AI call runs, then reveals the finished content blocks once complete. No user interaction is required between the two steps.

**Implementation details:**

1. A `runContentSuggestions(auditIdParam, croResultParam)` helper was extracted in `CROAudit.tsx`. It accepts the audit ID and CRO result as explicit parameters so it can be called before React state has re-rendered.
2. `handleRunCROAudit` calls `runContentSuggestions` directly after setting `setCroResult`, passing the local `currentAuditId` and `structuredResult` values.
3. `handleGenerateContentSuggestions` (used for manual retry on failure) was simplified to a thin wrapper that calls `runContentSuggestions` with the current state values.
4. In `CROAuditResults.tsx`, the content suggestions section now shows the loading spinner automatically (no button shown during normal flow). The retry button is only rendered when `contentSuggestionsError` is truthy, giving the user a way to re-trigger the step after a failure.

**Files changed:**
- `src/components/CROAudit.tsx` — refactored handler logic
- `src/components/CROAuditResults.tsx` — updated UI to remove initial-trigger button

---

### Section N — Estructura recomendada de página (Prose Wireframe)

**Added:** 2026-04-09
**Field in AuditResult:** `pageWireframe` (`PageWireframe | null | undefined`)
**Location in UI:** Between section L-M (Quick Wins) and section O (A/B Tests)

#### What it does

After the CRO audit is generated, section N analyzes the actual scraped page structure and produces a zone-by-zone recommended layout blueprint. The AI performs three steps:

1. **Map current structure** — lists every visible section of the page top-to-bottom as `currentStructure` strings (e.g. "Position 1: Hero", "Position 2: Services")
2. **Diagnose structural problems** — identifies sections in the wrong position, missing sections, sections appearing too late, and sections that should be cut
3. **Recommended zones** — a reordered, improved page structure described zone by zone in plain prose

#### Zone card structure

Each recommended zone card displays:

- **Zone number** — circular badge (1, 2, 3...)
- **Zone name** — e.g. "Hero", "Prueba Social", "CTA Principal"
- **Status badge** — color-coded:
  - `✓ Ya existe` — green (section exists and is already in the right place)
  - `↑ Mover arriba` — blue (section exists but needs to move up)
  - `↓ Mover abajo` — blue (section exists but needs to move down)
  - `✗ Falta` — red (section is missing from the page entirely)
  - `✂ Eliminar o reducir` — gray (section should be cut or shortened)
- **Current position note** — shown when a zone is being moved (e.g. "actualmente en posición 5")
- **Description** — 2–3 sentences explaining what content belongs in this zone, what specific page content maps here, and why this position improves conversion

#### Left border color coding

| Status | Border color |
|---|---|
| `exists_correct` | Emerald green |
| `move_up` / `move_down` | Blue |
| `missing` | Red |
| `reduce` | Gray |

#### AI grounding rule

Every zone recommendation must be grounded in the actual scraped page content. The AI is explicitly instructed not to suggest generic zones with no basis in the page. If a zone is flagged as missing (`✗ Falta`), it must be something conspicuously absent from the page that would meaningfully improve conversion.

#### Section lettering update

The addition of section N shifted all subsequent sections:

| Previous | New | Label |
|---|---|---|
| N | O | A/B Tests |
| O | P | Action Plan |
| P | Q | Final Summary |

This update is reflected in `src/lib/i18n.ts` (both ES and EN), `src/lib/clientExplanations.ts`, and the TOC in `CROAuditResults.tsx`.

---

## Copy Analysis

Block-by-block copy analysis with dimension scoring, heatmap visualization, and priority rewrites.

**Component:** `src/components/CopyAnalysisResults.tsx` (referenced via `src/components/CROAudit.tsx`)
**HTML Export:** `src/lib/htmlExporters/copyHtml.ts`

---

## Export System

Three export formats are supported for all three audit types:

- **HTML** — standalone self-contained file with embedded styles
- **Markdown** — plain markdown for documentation systems
- **DOCX** — Microsoft Word format via the `docx` library

All export functions use `getLabels(result.language)` to match the language and labels displayed in the app UI.

Elements marked with the CSS class `no-export` are excluded from:
- Print/PDF exports (via `@media print { .no-export { display: none } }`)
- PDF exports via html2canvas (elements are temporarily hidden before canvas capture in `src/lib/exportPdf.ts`)

The HTML export templates (seoHtml.ts, croHtml.ts, copyHtml.ts) are independent template strings and do not render React components, so React-only UI sections must be explicitly templated into those files to appear in HTML exports.

### Informe Completo — Print / PDF Fix

**Fixed:** 2026-04-13

**Bug:** The Informe Completo HTML export uses a tab interface where only the active panel is visible at any time (`display: none` on inactive `.tab-panel`). When a client opened the file in a browser and used Cmd+P (or Print to PDF), only the currently active tab panel was included in the output.

**Fix:** A `@media print` block was added to the `TAB_CSS` constant inside `src/lib/htmlExporters/informeCompletoHtml.ts`:

```css
@media print {
  .tab-nav { display: none !important; }
  .tab-panel { display: block !important; }
  .tab-panel + .tab-panel { page-break-before: always; }
}
```

This hides the tab navigation bar and forces all four panels to render sequentially with page breaks between them, so the printed/PDF output includes all four sections (Conversión, Posicionamiento, Contenido, Acciones de Copy).

### Export Filename Slug Normalization

**Fixed:** 2026-04-13

**Bug:** Brand names that contained special characters combined with spaces produced filenames with multiple consecutive dashes. Example: `Sharpen.Studio - lp web` was being slugified as `sharpenstudio---lp-web` because:
1. `.replace(/\s+/g, '-')` converted every space to `-`, turning the ` - ` separator into `---`
2. `.replace(/[^a-z0-9-]/g, '')` then removed the `.` but left the triple dash intact

**Fix:** Two additional chained replacements were added to every slug generation line in all five HTML exporter files:

```ts
.replace(/-+/g, '-')      // collapse consecutive dashes into one
.replace(/^-|-$/g, '')    // strip any leading or trailing dash
```

**Files updated:**
- `src/lib/htmlExporters/informeCompletoHtml.ts`
- `src/lib/htmlExporters/croHtml.ts`
- `src/lib/htmlExporters/seoHtml.ts`
- `src/lib/htmlExporters/copyHtml.ts`
- `src/lib/htmlExporters/copyzapHtml.ts`

**Result:** `Sharpen.Studio - lp web` → `sharpenstudio-lp-web`

### CRO Audit HTML Export — Section Map

The CRO HTML export (`src/lib/htmlExporters/croHtml.ts`) renders the following sections in order:

| Letter | Section | Condition |
|--------|---------|-----------|
| A | Resumen ejecutivo | Always |
| B | Recomendaciones prioritarias | Always |
| C | Scored assessment (bar chart + grid + table) | Always |
| D | Análisis detallado | Always |
| E | Copy teardown + Contenido listo para usar | Always |
| F | Análisis competitivo | Only if `competitorComparison` present |
| G | Recorrido del comprador | Only if `buyerJourneyAnalysis` present |
| H | Triggers emocionales | Only if `emotionalTriggers` present |
| I | Psicología de precios | Only if `pricingPsychology` present |
| J | Preparación GEO / IA | Only if `geoAIReadiness` present |
| K | Análisis mobile | Only if `mobileAnalysis` present |
| L–M | Quick wins & Cambios de alto impacto | Always |
| N | Prosa Wireframe — Estructura recomendada | Only if `pageWireframe` present |
| O | Tests A/B recomendados | Always |
| P | Plan de acción | Always |
| Q | Resumen final | Always |
| — | Glosario | Always |

**Note on section N (Prose Wireframe):** This section was added to the HTML export in April 2026. It renders:
1. **Estructura actual** — tagged chips showing the current order of page sections
2. **Problemas estructurales** — list of structural issues detected
3. **Estructura recomendada** — zone-by-zone layout blueprint, each zone rendered with a colored left border and status badge (green = correct, blue = move, red = missing, gray = reduce)

The wireframe section is skipped entirely if `result.pageWireframe` is null or undefined (e.g., older audits run before this field was added to the prompt).

---

## Acciones de Copy Module

**Added:** 2026-04-08
**Component:** `src/components/CopyZapSend.tsx`
**Location in UI:** Fourth tab inside the CRO Audit module (alongside "Auditoría de Conversión", "Auditoría de Posicionamiento en Google", "Análisis de Contenido y Textos")

### Overview

Acciones de Copy is a cross-report workflow tool that reads all available audit results (CRO, SEO, Copy — in any combination) and generates a set of ready-to-paste copy-rewrite prompts for use in CopyZap. It is an internal tool for Sharpen.Studio only and is never included in client deliverables or exports.

### Tab behavior

- The "Acciones de Copy" tab is always visible in the module navigation once `scrapedData` is loaded
- If no reports have been run yet, an empty state message is shown: *"Run at least one analysis first to generate your Acciones de Copy brief."*
- If any report result is available, the full module UI is rendered

### Source badges

Three status indicators appear at the top of the module, one per report type:
- **Green + CheckCircle** — report has been run and result is available
- **Gray + Minus** — report has not been run
- Labels: "CRO Audit", "SEO Audit", "Copy Analysis"

### Generation flow

Clicking "Generar brief" (or "Regenerar brief" after first run) triggers the same identical flow in both cases:

1. `onSave?.(null)` is called immediately — this clears `savedResult` in the parent, which resets `generated` to `false` and hides any previously shown cards. The UI returns to the initial "no results" state for the duration of the delay.
2. `isGenerating` is set to `true` — the button shows a spinner and "Generando..." text.
3. After a 600ms simulated processing delay, `buildCards()` runs synchronously against all available result objects. No API calls are made.
4. The new result is passed to `onSave` and written to the database, restoring the generated state with fresh cards.

This means "Regenerar brief" is indistinguishable from the first "Generar brief" click — the existing brief is fully cleared before the new one appears.

### Finding detection logic

`buildCards()` evaluates each result object against score thresholds and field presence to determine which prompt cards to generate:

| Card | Trigger condition |
|---|---|
| CTA principal | `scoredAssessment.cta < 70` (CRO) OR `conversionRelevance avg < 6` (Copy) |
| H1 / Hero headline | `scoredAssessment.headline < 70` (CRO) OR `headingStructure < 70` OR primary keyword not in H1 (SEO) |
| Entregables y servicios | `benefitFeatureRatio avg < 6` (Copy) |
| Sección de precios / paquetes | `pricingPsychology.findings.length > 0` (CRO) OR `conversionRelevance avg < 6` (Copy) |
| Proceso | `narrativeFlow < 70` (CRO) OR `benefitFeatureRatio avg < 6` OR `persuasion avg < 6` (Copy) |
| Primeras 100 palabras | Primary keyword not in first 100 words (SEO) OR `persuasion avg < 6` OR `emotionalTone avg < 6` (Copy) |
| FAQ | Content gap has unanswered questions or FAQ recommended section (SEO) OR `trustSignals < 70` (CRO) |
| Anchor text y CTAs secundarios | `links < 70` (SEO) |
| Estructura de página | `croResult.pageWireframe.recommendedZones` exists and has at least one zone |

Cards are only generated for findings that exist in available reports — if a report has not been run, its findings are silently skipped.

### Priority logic

- Cards flagged by 2 or more report sources automatically receive **Alta** priority
- CTA principal, H1 / Hero headline, and Estructura de página are always **Alta** regardless of source count
- All other single-source cards receive **Media** priority
- `benefitFeatureRatio < 4` (very low) escalates the Entregables card to **Alta**

### Prompt templates

Each card uses a template with dynamic substitutions. In addition to the keyword placeholder, the `Ejemplo de referencia` line in every applicable card is generated at runtime from real audit data, not hardcoded static text.

**Keyword substitution (all cards)**
- `seoResult.seoContext.primaryKeywords[0]` — falls back to `"tu keyword principal"` if SEO has not been run
- Appears in: H1, Primeras 100 palabras, FAQ

**Dynamic `Ejemplo de referencia` per card**

| Card | Primary source | Fallback |
|---|---|---|
| CTA principal | `croResult.readyToUseContent[category='cta'].content` first line | `"${primaryConversionGoal} → Sin compromiso. Respuesta en 24h."` or generic if goal is absent |
| H1 / Hero headline | `seoResult.metaHeadingRewrites[element~='H1'].optimized` (actual rewritten H1 from SEO audit) | `"${primaryKeyword} — especialistas en ${marketIndustry}"` or keyword-only or generic |
| Entregables y servicios | `copyResult.topPriorityRewrites` filtered to exclude blocks whose `sectionName` matches `/cta|botón|button|hero|header/i`, then the first two results formatted as `"${sectionName} — ${firstSentence(rewrite)}"` | `croResult.copyRewrites[0]` element + first sentence of improved; generic placeholder if both absent |
| Proceso | `croResult.copyRewrites[element~=/proceso|step|cómo|pasos|fase/].improved` first sentence, wrapped in `"Paso 1 · Semana 1 — …"` | Constructed from `primaryConversionGoal`: `"Paso 1 · Semana 1 — Defines ${goal} antes de avanzar al siguiente paso"` |
| Anchor text y CTAs secundarios | `croResult.copyRewrites[element~=/anchor|enlace|link|cta|botón/]` up to 2, formatted as `"${improved} →" en lugar de "${current}"` | Built from `primaryConversionGoal` (main action) + `primaryKeyword` (secondary action) |

**Helper:** A `firstSentence(text, maxLen)` function trims text to the first sentence-ending punctuation mark, capped at `maxLen` characters, to prevent bloated examples from long rewrite paragraphs.

### Prompt cards UI

Each card contains:
1. Source tag pills (top-left): CRO (orange), SEO (blue), Copy (green) — only the sources that triggered the card are shown
2. Problem label (bold, next to source tags)
3. Priority badge (top-right): "Alta" (red) or "Media" (amber)
4. Prompt box: gray background (`bg-gray-50`), blue left border, monospace font, selectable text
5. "Copiar" button (top-right corner of prompt box): copies the raw prompt text, shows "✓ Copiado" for 2 seconds then reverts

### Combined prompt block

Below all individual cards, a consolidated "Prompt completo" block is rendered. It assembles a condensed version of all generated card instructions into a single brief, formatted with a section header per finding.

Each card contributes one section to the combined prompt. Cards with a `combinedText` property (currently only "Estructura de página") use that text directly instead of the static `condensed` lookup, allowing multi-line zone lists to be included in the brief.

The combined prompt ends with a PRIORIDAD line:
- **If the "Estructura de página" card was generated:** `PRIORIDAD: Aplica primero Estructura de página, CTA y H1 — el orden correcto de secciones es la base sobre la que todo el copy funciona.`
- **Otherwise:** dynamically lists the top 3 Alta-priority card names with the generic note about highest-impact changes.

"Copiar todo" copies only the combined prompt text.

### Persistence

Generated CopyZap briefs are saved to the database and restored automatically.

**Database column:** `audits.copyzap_result_json` (jsonb, nullable) — stores `{ cards, combinedPrompt }`.

**Save trigger:** Every "Generar brief" / "Regenerar brief" click writes the current cards array and combined prompt to the active audit row in the `audits` table. The Supabase client uses lazy evaluation and only executes a query when `.then()` is called or the promise is awaited — the update call explicitly chains `.then()` to ensure it fires.

**onSave callback:** `CopyZapSend` accepts an `onSave` prop (type: `(result) => void`). When a brief is generated, this callback is called with the result object immediately, updating `copyzapResult` state in the parent `CROAudit` component. This is what triggers the sessionStorage write. Without this, generating a brief would update only local state inside `CopyZapSend`, and the parent's sessionStorage value would remain null — causing the brief to disappear on page reload.

**Restore from history:** When a saved audit is loaded via "View History → Load", `copyzap_result_json` is read from the row and passed to `CopyZapSend` as `savedResult`. On mount the component restores cards and combined prompt, showing the generated state immediately without requiring the user to click "Generar brief" again.

**Session restore:** The most recent brief is also persisted in `sessionStorage` under `cro_copyzap_result` and survives page refreshes within the same browser tab session. The stored value is wrapped as `{ auditId, result }` — on restore, the stored `auditId` is compared against the current `cro_audit_id` in sessionStorage, and the brief is only restored if they match. This prevents stale briefs from a previous audit session from appearing when a new audit is loaded.

**Reset behavior:** Starting any new analysis (CRO, SEO, or Copy) clears `copyzapResult` so stale cards from a previous run are never shown. `handleRunCROAudit`, `handleRunSEOAudit`, and `handleRunCopyAnalysis` all call `setCopyzapResult(null)` at the start of each run. Additionally, `handleRunCROAudit` also clears `seoResult`, `copyResult`, and `auditId` from both state and sessionStorage when starting a fresh CRO audit — because a new CRO audit always creates a brand new audit record, and any previously loaded SEO/Copy results from an older audit are no longer valid for the new context. Scraping a new URL via `handleScrapePage` also clears all audit results (CRO, SEO, Copy, CopyZap) and the `auditId` from both state and sessionStorage whenever the URL differs from the previously scraped one. `CopyZapSend` has no internal state for `generated`, `cards`, or `combinedPrompt` — it derives them directly from the `savedResult` prop (`generated = !!savedResult`, `cards = savedResult?.cards ?? []`, etc.). This means when `copyzapResult` is null in the parent, `CopyZapSend` immediately shows the "Generar brief" state with no synchronization required.

**Database clearing on re-analysis:** In addition to clearing React state and sessionStorage, every new analysis also explicitly sets `copyzap_result_json: null` in the database row. The `run-seo-audit` and `run-copy-analysis` edge functions include `copyzap_result_json: null` in the initial "processing" status update. The frontend handlers also include it in every final "completed" DB update (SEO final update, Copy pass-1 partial update, and Copy pass-2 final update). For CRO analysis a new audit row is always created, so `copyzap_result_json` is null by default. This prevents a scenario where a user loads an old audit from history (which restores the prior brief), runs new analyses, and then sees the stale brief reappear if the audit is re-loaded from the database — the prior brief is now always purged from the DB as soon as any new analysis begins on that row.

### HTML Export

**Added:** 2026-04-11
**Updated:** 2026-04-13
**File:** `src/lib/htmlExporters/copyzapHtml.ts`

An "Exportar HTML" button appears in the combined prompt block header, to the left of "Copiar todo". It is only visible once a brief has been generated and at least one card exists.

Clicking it calls `exportCopyZapToHtml()` and downloads a self-contained `.html` file named `copyzap-send-${brandName}-YYYY-MM-DD.html`.

**What the exported file contains:**
- Sticky header with Sharpen.Studio branding, "Acciones de Copy" as module title, target URL, and generation date — consistent with all other module exports
- Source report status badges (CRO Audit, SEO Audit, Copy Analysis) showing which reports were available when the brief was generated
- Prompt cards grouped by priority: Alta cards first, then Media cards. Each card renders source tag badges, the card label, the priority badge, the full prompt text in a monospace code block, and a "Copiar" button (top-right of the code block, using inline JavaScript clipboard API)
- Combined prompt block at the bottom, styled with a bold black border and a left-border code box — matching the in-app presentation. Includes a "Copiar todo" button using inline JavaScript

**Implementation:**
- `exportCopyZapToHtml(cards, combinedPrompt, targetUrl, reportSources, brandName)` accepts the current cards array, combined prompt string, the audited page URL, the report status array, and the brand name (for the filename)
- `buildCopyZapHtmlBody(cards, combinedPrompt, targetUrl, reportSources)` is the extracted body-only function, used both by the standalone export and by the combined Informe Completo export
- Per-card copy buttons use `id`-based DOM references (`cz-pre-{n}`, `cz-btn-{n}`) with unique offsets to prevent duplicate IDs when alta and media cards are rendered in the same document
- `brandName` is passed to `CopyZapSend` from `CROAudit` via the `brandName` prop (new in 2026-04-13)
- Uses `buildHtmlPage()` and `triggerHtmlDownload()` from `shared.ts` — same infrastructure as CRO, SEO, and Copy exporters

### Export exclusion

The entire Acciones de Copy tab is wrapped in `<div className="no-export">`. This ensures:
- **PDF exports** (`src/lib/exportPdf.ts`): the element is temporarily hidden (`display: none`) before html2canvas capture
- **HTML exports** (`src/lib/htmlExporters/`): these build output from data objects, not from the DOM — CopyZap content is never part of the data structures
- **DOCX and Markdown exports**: same reason as HTML — exporters operate on typed audit result objects only

---

## Exportar Informe Completo

**Added:** 2026-04-13
**Button location:** `src/components/CROAudit.tsx` — narrow button row between the Brand Name/Page Type fields and the four-tab row
**Export function:** `src/lib/htmlExporters/informeCompletoHtml.ts` → `exportInformeCompletoToHtml()`

### Overview

"Exportar Informe Completo" generates a single self-contained `.html` file that combines the full output of all four modules (CRO Audit, SEO Audit, Copy Analysis, Acciones de Copy) into one tabbed document. It is the deliverable-grade consolidated export.

### Button state

The button is always visible once `scrapedData` is loaded. It is disabled (gray, cursor not-allowed) if any of the four results are null:

| Condition | State |
|---|---|
| All four of `croResult`, `seoResult`, `copyResult`, `copyzapResult` are non-null | Enabled (blue) |
| Any one of them is null | Disabled (gray) |

When disabled, the parent wrapper `<div>` carries a native `title` tooltip: *"Completa los 3 análisis para exportar el informe combinado"*.

### Generated file structure

**Filename:** `informe-completo-${brandName}-YYYY-MM-DD.html`

**Document layout:**

1. Sticky black header — "Sharpen.Studio" brand, target URL, generation date
2. Disclaimer banner — full-width amber-bordered notice placed directly after the header and before the tab nav (see below)
3. Sticky tab nav (positioned below the header at `top: 52px`) — four tabs: "Conversión", "Posicionamiento", "Contenido", "Acciones de Copy"
4. Four hidden panels — only the active one is visible at any time
5. Shared footer at the bottom of the content area

### Disclaimer banner

A full-width disclaimer banner is displayed both in the exported HTML file and in the in-app combined report view, positioned immediately before the tab navigation bar. It is not dismissible and spans 100% width with no gap above or below.

**Text:**
> **Criterio de uso:** Este reporte combina observaciones objetivas del contenido extraído con interpretación estratégica. Por ello, sus hallazgos y recomendaciones deben entenderse como insumos de análisis para apoyar decisiones de negocio, no como juicios absolutos. La validación final siempre debe considerar contexto, mercado, oferta y objetivos comerciales.

**Styling:** `background: #f9f6f0`, left border `4px solid #c8a96e` (warm amber), `color: #555`, `font-size: 13px`.

**In-app placement:** Inserted in `CROAudit.tsx` as an inline-styled `<div>` between the export button bar and the tab row, rendered whenever `scrapedData` is available.

**Exported file placement:** Inserted in the HTML template in `informeCompletoHtml.ts` as a `.disclaimer-banner` element after the firecrawl block (when present) and directly before `<nav class="tab-nav">`. CSS is defined in `DISCLAIMER_CSS` constant and merged into the document `<style>` block.

**Tab panels:**

| Tab | Panel content | Source function |
|---|---|---|
| Conversión | Full CRO Audit body | `buildCROAuditHtmlBody(croResult, brandName, targetUrl)` |
| Posicionamiento | Full SEO Audit body | `buildSEOAuditHtmlBody(seoResult, brandName, targetUrl)` |
| Contenido | Full Copy Analysis body | `buildCopyAnalysisHtmlBody(copyResult, brandName, targetUrl)` |
| Acciones de Copy | Full CopyZap brief body | `buildCopyZapHtmlBody(cards, combinedPrompt, targetUrl, reportSources)` |

Each panel is the exact same HTML body produced by that module's individual "Exportar HTML" function — no logic is duplicated or rewritten.

### Technical architecture

**HTML exporter refactor:** To support this feature, each module's HTML exporter was split into two functions:

- `buildXxxHtmlBody(...)` — builds and returns the body HTML string only (no download triggered)
- `exportXxxToHtml(...)` — calls `buildXxxHtmlBody()`, wraps it in `buildHtmlPage()`, and calls `triggerHtmlDownload()` (unchanged behavior for individual exports)

This ensures zero duplication of rendering logic between individual and combined exports.

**CSS strategy:** The combined file uses a single shared `SHARED_CSS` block from `shared.ts` plus a `TAB_CSS` block defined in `informeCompletoHtml.ts`. No per-module CSS is duplicated.

**Tab switching:** Pure inline JavaScript (`switchTab(n)` function) toggles `.active` class on tab buttons and panels. `window.scrollTo({top:0,behavior:'smooth'})` is called on each tab switch to restore scroll position.

**Copy buttons in CopyZap panel:** Per-card copy buttons use `id`-based DOM references (`cz-pre-{n}`, `cz-btn-{n}`). Since `buildCopyZapHtmlBody` is called with the same data whether in standalone or combined mode, IDs are unique within the panel.

### Export Options Modal

**Added:** 2026-04-14
**Component:** `src/components/ExportInformeModal.tsx`

When the user clicks "Exportar Informe Completo", instead of triggering the download immediately, a modal dialog is shown before generating the file.

#### Modal structure

- **Title:** "Opciones de exportación"
- **Two checkboxes** (both checked by default):
  1. **Incluir "Datos Extraídos"** — La información scrapeada de la página: meta tags, encabezados y contenido completo.
  2. **Incluir "Contenido listo para usar"** — Bloques de copy e implementaciones técnicas generadas para esta página, listos para aplicar.
- **Two action buttons:**
  - `Cancelar` — closes the modal without generating any file
  - `Exportar` (primary, blue) — triggers the HTML download with the selected options applied

#### Logic

| Checkbox | Effect when unchecked |
|---|---|
| Incluir "Datos Extraídos" | The "Datos Extraídos" firecrawl block at the top of the exported HTML is omitted entirely |
| Incluir "Contenido listo para usar" | The "Contenido listo para usar" subsection inside the CRO panel (Section E) is omitted entirely |

All other sections always export regardless of these toggles. Individual module exports (CRO, SEO, Copy) are not affected — the modal appears only for "Exportar Informe Completo".

#### Technical implementation

- `ExportInformeOptions` interface is defined and exported from `ExportInformeModal.tsx`: `{ includeExtraction: boolean; includeReadyToUse: boolean }`
- `exportInformeCompletoToHtml()` accepts a new optional final parameter `options: ExportInformeCompletoOptions` (defined and exported from `informeCompletoHtml.ts`), defaulting to `{ includeExtraction: true, includeReadyToUse: true }`
- The `firecrawlBlock` is only built when `includeExtraction && scrapedData` (both must be truthy)
- `scrapedData` from state is captured as `exportData` inside the `onExport` callback to ensure a stable reference before `setShowExportModal(false)` triggers a re-render
- Meta tag and heading data for `scrapedData` is now derived primarily from `seoMeta` (which uses robust regex-based extraction via `extractSeoMetadata`), supplemented by DOMParser extraction for fields not covered by `seoMeta`.
- `buildFirecrawlBlock()` in `informeCompletoHtml.ts` now includes `parseSeoBlockFromMarkdown()` as a definitive fallback: it reads the `=== SEO METADATA === ... === END SEO METADATA ===` block that is always prepended to `scrapedData.markdown` by `buildSeoMetadataBlock()`. All meta tag fields (Título, Meta description, Canonical, OG Title, OG Description) and heading lists (H1/H2/H3) are read from this text block when the typed `metaTags`/`headings` object fields are absent or empty. This means the export works correctly for: (a) cached sessionStorage sessions scraped with older code, (b) any page where Firecrawl omits `html`/`rawHtml`, and (c) audits loaded from history where `scrapedData` has minimal fields.
- `buildCROAuditHtmlBody()` in `croHtml.ts` accepts a new optional `includeReadyToUse: boolean` parameter (default `true`), which conditionally renders the "Contenido listo para usar" subsection
- State: `showExportModal` (boolean) added to `CROAudit.tsx`; the button's `onClick` sets it to `true` instead of directly exporting
- Options are passed explicitly as `{ includeExtraction: opts.includeExtraction, includeReadyToUse: opts.includeReadyToUse }` to avoid accidental spread of unrelated keys

### Data flow

```
CROAudit.tsx
  ↓ passes to exportInformeCompletoToHtml():
    - croResult         (AuditResult)
    - seoResult         (SEOAuditResult)
    - copyResult        (CopyAnalysisResult)
    - copyzapResult.cards           (PromptCard[])
    - copyzapResult.combinedPrompt  (string)
    - reportSources     ([{label, available}] — all true when enabled)
    - brandName         (string)
    - scrapedData.url   (string)
    - scrapedData       (ScrapedData | null) — optional; passed for Firecrawl block
    - options           (ExportInformeCompletoOptions) — { includeScrapedData, includeReadyToUse }
```

---

## Exportar HTML — Scrape Results

**Added:** 2026-04-13
**Button location:** `src/components/CROAudit.tsx` — inside the scrape success panel (the green-check row showing title and word count), positioned on the right side
**Export function:** `src/lib/htmlExporters/scrapeHtml.ts` → `exportScrapeToHtml(data, brandName)`

### Overview

After a page is scraped successfully, an "Exportar HTML" button appears inline in the scrape result panel. Clicking it generates and downloads a self-contained `.html` file containing all data extracted from the Firecrawl scrape — meta tags, heading structure, and the full page content rendered as readable HTML.

### Button state

The button is always visible whenever `scrapedData` is non-null (same condition as the scrape result panel itself). It does not depend on any audit having been run.

### Generated file

**Filename:** `extraccion-${brandName}-YYYY-MM-DD.html`

**Sections:**

1. **Info bar** — horizontal row showing: URL analyzed, generation date, word count, and extracted format (always "Markdown")
2. **Meta tags** — table of labeled rows. Only rows with non-empty values are rendered. Supported fields:
   - Título (`metaTags.title`)
   - Meta description (`metaTags.metaDescription`)
   - OG Title (`metaTags.ogTitle`)
   - OG Description (`metaTags.ogDescription`)
   - OG Image (`metaTags.ogImage`)
   - Canonical (`metaTags.canonical`)
   - Robots (`metaTags.robots`)
   - Schema markup — if `metaTags.schemaTypes` is non-empty, rendered as comma-separated pill chips in a blue style
3. **Heading structure** — visual nested list of H1, H2, H3 headings extracted from the page, styled with left-border indentation by level. H4 is not included (not captured in the extracted data).
4. **Extracted content** — wrapped in a `<details><summary>Ver contenido extraído</summary>…</details>` block. Collapsed by default; expands on click. On print, the block is forced open and the summary label is hidden via `@media print` CSS. The inner scrollable container (`max-height: 480px`) displays the full page markdown converted to HTML using `markdownToHtml()`. Renders: H1/H2/H3 headings, paragraphs, unordered lists, bold (`**`), italic (`*`), inline code (`\``), and inline hyperlinks (`[text](url)` → `<a>` tags). Raw markdown syntax is never shown.

**Markdown-to-HTML conversion:** Handled by `markdownToHtml(md: string): string` in `scrapeHtml.ts` — a line-by-line parser supporting headings, list items, and inline formatting including links. Also exported for reuse by `informeCompletoHtml.ts`.

**Noise filtering:** Before conversion, `filterMarkdownNoise()` strips lines that are irrelevant boilerplate. The filter removes:
- Lines containing `política de privacidad` (case-insensitive)
- Lines containing `aceptar y cerrar` (case-insensitive)
- Lines containing `elementor-action`
- Lines containing `cookie` (case-insensitive)
- Lines that consist entirely of a bare markdown link `[text](url)` with no surrounding prose
- Lines starting with `===` (three or more equals signs) — these are internal processing labels from Firecrawl that must not appear in client-facing output

This filter runs on both the standalone scrape export and the combined report's "Ver contenido extraído" block, since both call the same `markdownToHtml()` function.

### Images

Image data (`scrapedData.images`) is intentionally excluded from this export. It is too verbose and not useful to the end client.

### CSS

The file uses the shared `SHARED_CSS` block plus a `SCRAPE_CSS` block defined in `scrapeHtml.ts` for meta table, heading list, and markdown content styles.

---

## Informe Completo — Firecrawl Data Block

**Added:** 2026-04-13
**Location in export:** `src/lib/htmlExporters/informeCompletoHtml.ts` — rendered between the sticky header and the tab navigation bar

### Overview

When `exportInformeCompletoToHtml()` receives a non-null `scrapedData` argument, a compact "Datos Extraídos" block is inserted above the tab nav in the combined report. This gives the reader immediate access to the raw extraction data without navigating into any analysis tab.

If `scrapedData` is null or not provided, the block is silently omitted.

### Block structure

The block has three sections inside a single rounded card:

1. **Header row** — label "DATOS EXTRAÍDOS" (uppercase, gray) on the left; URL and generation date on the right
2. **Two-column grid:**
   - Left column: **Meta tags** — compact labeled rows for title, meta description, canonical, OG title, OG description, robots, and schema chips. Empty fields are skipped.
   - Right column: **Heading structure** — H1/H2/H3 headings displayed as an indented visual list using left-border styling by level.
3. **Collapsed `<details>` block** — summary label "Ver contenido extraído". When expanded, shows the full page markdown rendered as HTML in a scrollable container (max-height 480px). Markdown is converted using the shared `markdownToHtml()` function, which includes noise filtering (cookie banners, bare links, legal boilerplate) and full inline HTML conversion (bold, italic, code, links).

A horizontal rule (`<hr>`) separates the block from the tab navigation below it.

### Rendering condition

```typescript
const firecrawlBlock = scrapedData ? buildFirecrawlBlock(scrapedData, date) : '';
```

If the string is non-empty, it is wrapped in a `<div style="padding:20px 24px 0;">` and injected between the `<header>` and `<nav class="tab-nav">` elements.

### Function signature change

The `exportInformeCompletoToHtml()` function now accepts an optional ninth parameter:

```typescript
exportInformeCompletoToHtml(
  croResult,
  seoResult,
  copyResult,
  copyzapCards,
  copyzapCombinedPrompt,
  reportSources,
  brandName,
  targetUrl,
  scrapedData?,   // ScrapedData | null | undefined — new optional param
)
```

The call site in `CROAudit.tsx` passes `scrapedData` directly as the ninth argument.

---

## Scrape Module — Extraction Pipeline Refactor

**Refactored:** 2026-04-21
**Component:** `src/components/FullPageScraper.tsx`
**Database:** `scraped_pages` table — new `structured_data` JSONB column added

### Overview

The Scrape module now uses the same Firecrawl-based extraction pipeline already used by CRO and SEO. Before this refactor, the Scrape module called `scrapeFullPage()` (same function as CRO/SEO) but discarded all HTML response data and stored only raw markdown, raw HTML, and Firecrawl's minimal built-in `metadata` object (title, description, statusCode). No structured field extraction was performed.

After the refactor, the Scrape module runs the exact same post-processing pipeline as `CROAudit.tsx`, producing consistent structured output across all three modules.

### Root cause of old inconsistency

Both pipelines called `scrapeFullPage()` — the Firecrawl API call was identical. The difference was entirely in what happened next:

| Step | CRO/SEO (before refactor) | Scrape (before refactor) |
|---|---|---|
| `scrapeFullPage()` | Called | Called |
| `extractSeoMetadata(html, rawHtml)` | Yes | **No** |
| `buildSeoMetadataBlock()` | Yes (prepended to markdown) | **No** |
| `extractMetaTags(htmlForContent)` | Yes | **No** |
| `extractHeadings(htmlForContent)` | Yes | **No** |
| `extractImages(htmlForContent)` | Yes | **No** |
| Schema type detection | Yes | **No** |
| Canonical URL | Yes | **No** |
| OG tags | Yes | **No** |

### What changed

**`src/components/FullPageScraper.tsx`** — complete refactor of the `handleScrape()` function:

1. Imports `extractSeoMetadata`, `buildSeoMetadataBlock`, `extractMetaTags`, `extractHeadings`, `extractImages`, `ExtractedMetaTags`, `ExtractedHeadings`, `ExtractedImage` from `lib/htmlExtract.ts`
2. `handleScrape()` now runs the exact same extraction pipeline as `CROAudit.handleScrapePage()` after `scrapeFullPage()` returns:
   - `extractSeoMetadata(html, rawHtml)` for robust regex-based meta/heading extraction
   - `buildSeoMetadataBlock(seoMeta)` to prepend a structured text block to the markdown (same as CRO/SEO — makes the enriched markdown useful for AI prompts)
   - `extractMetaTags(htmlForContent)` via DOMParser for canonical, OG image, schema types, robots, viewport, charset
   - Merged `metaTags` object combining both sources (seoMeta + domExtracted) using the same priority logic as CROAudit
   - `extractHeadings(htmlForContent)` as fallback when seoMeta unavailable
   - `extractImages(htmlForContent)` for image inventory with alt text audit
3. Debug logs added: `[Scrape]` prefix — logs pipeline entry point and all extracted field counts
4. `ScrapeResult` interface extended with `metaTags?: ExtractedMetaTags`, `headings?: ExtractedHeadings`, `images?: ExtractedImage[]`
5. `handleSave()` stores structured data in the new `structured_data` JSONB column: `{ metaTags, headings, imageCount }`
6. `SavedPage` interface extended with `structured_data` field; `handleViewSavedPage()` restores `metaTags` and `headings` from saved JSON
7. Title and description in the result header now prefer structured `metaTags.title` / `metaTags.metaDescription` over the raw Firecrawl `metadata` object

**UI change — "Structured" tab:**

A third tab "Structured" is added to the result view (alongside "Markdown" and "HTML"). The new `StructuredView` sub-component renders:

- **Meta Tags table** — title, meta description, OG title, OG description, OG image, canonical, robots, keywords, schema types (only non-empty fields shown)
- **Heading Structure** — H1/H2/H3 in visual indented hierarchy
- **Images** — list capped at 20 showing ALT/NO ALT status badges and src paths

**Database migration:**
`supabase/migrations/*_add_structured_data_to_scraped_pages.sql` — adds `structured_data jsonb DEFAULT NULL` to `scraped_pages`. Non-destructive; existing rows are unaffected.

### Shared source of truth

All three modules now go through the same extraction chain:

```
scrapeFullPage()
  → extractSeoMetadata(html, rawHtml)      // robust regex extraction
  → buildSeoMetadataBlock(seoMeta)         // enriched markdown prefix
  → extractMetaTags(htmlForContent)         // DOMParser for schema, OG image, etc.
  → merged metaTags object
  → extractHeadings(htmlForContent)
  → extractImages(htmlForContent)
```

The extraction functions live in `src/lib/htmlExtract.ts` — one source of truth, used by Scrape, CROAudit, SEO audit, and the Website Crawler.

---

## Website Crawler — Page Discovery Fix (Blog / Sitemap Supplement)

**Fixed:** 2026-04-27
**Component:** `src/components/Crawler.tsx`
**Firecrawl Endpoint:** `/v1/map`

### Problem

When crawling websites such as Sharpen.Studio that have a `/blog/` section, those blog pages were not appearing in crawl results even though they exist and are accessible. Only a subset of the site's pages were being returned.

### Root Cause

The `/v1/map` request had `ignoreSitemap: true` set. This caused Firecrawl to skip the site's sitemap entirely and rely only on link-following from the homepage. Blog posts and other pages that are listed in the sitemap but not prominently linked from the homepage were therefore never discovered.

### Solution

Three changes were applied:

1. **Removed `ignoreSitemap: true`** from the `/v1/map` request body. Firecrawl now reads the site's sitemap as part of URL discovery, which is how it finds blog posts and other section-specific pages.

2. **Added active sitemap supplementation with robots.txt discovery.** After the Firecrawl map returns, the crawler: (a) fetches `/robots.txt` and parses any `Sitemap:` directives to find the real sitemap URLs, then (b) fetches sitemap variants directly (`/sitemap.xml`, `/sitemap_index.xml`, `/sitemap-index.xml`, `/blog-sitemap.xml`, `/post-sitemap.xml`, `/page-sitemap.xml` plus any from robots.txt) via the `/fetch-text` proxy. Sitemap index files are recursed into sequentially. All discovered page URLs are merged (deduplicated) into `baseLinks` before filtering and scraping. Failures at any step are silently ignored. The concurrency bug (parallel `Promise.all` writes to shared `baseLinks`) has been fixed — processing is now sequential to prevent race conditions.

3. **Added `limit` to the map request.** The map request now passes `limit: maxUrls * 2` so Firecrawl discovers more candidate URLs before the `maxUrls` cap is applied.

### Result

Crawling a site with a blog section (e.g. `sharpen.studio/blog/`) now returns all blog pages listed in the sitemap alongside other pages on the site.

---

## Website Crawler — Four-Tier Discovery Architecture

**Added:** 2026-07-23 (refactored from single-tier map+sitemap)
**Component:** `src/components/Crawler.tsx` — `handleCrawl()`
**Firecrawl Endpoints:** `/v1/map`, `/v1/scrape`, `/v1/crawl` (all via `firecrawl-proxy` edge function)

### Problem

The original crawler used a single discovery path: Firecrawl `/v1/map` plus a sitemap.xml supplement. This failed on three common site types:
1. **No sitemap** (e.g. Webflow with auto-sitemap off) — `/v1/map` returned only the homepage.
2. **Incomplete sitemap** — sitemap listed some pages but missed others that were linked from the site's own navigation.
3. **JavaScript-rendered navigation** — neither `/v1/map` nor sitemap contained any links because the nav was client-rendered.

### Solution: Four-Tier Escalation

Discovery now runs in four tiers, cheapest first. Each tier escalates only when the previous one underperforms, so sites with a good sitemap pay nothing extra.

#### Refactor (Part A)

The two existing discovery paths were extracted into reusable async functions inside the component:

- **`discoverViaMap(rootHost, maxUrls)`** → `string[]` — calls `/v1/map`, polls for async job completion if needed, returns the link list. Token tracking is unchanged.
- **`discoverViaCrawl(rootHost, maxUrls)`** → `string[]` — calls `/v1/crawl`, polls via `pollCrawlJob()` until the job completes, returns discovered URLs. Token tracking is unchanged.

The `if (jsSpa) { ... } else { ... }` branch was replaced:
- **jsSpa toggle ON** → calls `discoverViaCrawl` directly, skipping tiers 1–3. Sets `discoveryMethod = 'deep-crawl'`. The manual override always wins.
- **jsSpa toggle OFF** → runs tiers 1–3 in order.

New state variables:
- `discoveryMethod: 'map' | 'html-harvest' | 'deep-crawl' | null` — which tier produced the final URL list.
- `sitemapGap: { claimed: number; found: number; missing: string[] } | null` — pages found on the site but not in the sitemap.

New shared helper at module scope:
- **`normalizeLinks(hrefs, baseUrl, rootHost)`** → `string[]` — resolves each href via `new URL(href, baseUrl)`, discards `mailto:`/`tel:`/`javascript:` and pure-fragment hrefs, keeps only same-host URLs (stripping `www.` from both sides), strips fragments, preserves query strings. Used by Tier 2 and the Reconciliation pass.

#### Tier 1: Map + Sitemap (Part B)

1. Calls `discoverViaMap(rootHost, maxUrls)`.
2. Runs the existing sitemap supplement block unchanged: fetches `sitemap.xml`, `sitemap_index.xml`, `sitemap-index.xml`, `blog-sitemap.xml`, `post-sitemap.xml`, `page-sitemap.xml`, plus any `Sitemap:` directives from `robots.txt`. Follows sitemap index references recursively. Merges results into `baseLinks`.
3. Records `const claimedCount = baseLinks.length` — the baseline for sitemap-gap detection.
4. Sets `discoveryMethod = 'map'`.

#### Tier 2: HTML Link Harvest (Part C)

Runs only when `baseLinks.length <= 2` after Tier 1. Otherwise skipped entirely.

**First-level harvest (homepage):**
1. Loading message: `Extracting links from homepage HTML...`
2. Calls `/v1/scrape` with `formats: ['html', 'rawHtml', 'links']` on `https://${rootHost}`.
3. Collects candidate URLs from both `scrapeData.data.links` (array of strings or objects with `.url`) and by parsing `html || rawHtml` with `DOMParser` for all `a[href]` elements.
4. Passes candidates through `normalizeLinks(candidates, 'https://${rootHost}', rootHost)`.
5. Merges into `baseLinks` via `new Set(...)`. Logs: `HTML link harvest added ${harvested.length} URLs, total: ${baseLinks.length}`.
6. Sets `discoveryMethod = 'html-harvest'` if any URLs were added.

**Second-level harvest (interior pages):**
- If `baseLinks.length` is still `<= 5` after the first pass, up to 5 newly discovered URLs are scraped in parallel via `Promise.all` using the same harvest logic.
- Results merged via `new Set(...)`. Logs: `HTML link harvest (second pass) added ${secondHarvested.length} URLs, total: ${baseLinks.length}`.
- Does not recurse beyond this second level.

**Abort handling:** `abortControllerRef.current?.signal.aborted` is checked before the first-level harvest and before the second-level pass. If aborted, throws `Operation cancelled by user`.

**Error handling:** The entire tier is wrapped in try/catch. Only `Operation cancelled by user` re-throws. All other failures are logged via `console.error('HTML link harvest failed:', err)` and the crawl continues silently.

**Token tracking:** Every `/v1/scrape` call increments `tokensUsed` by `scrapeData.creditsUsed` (or `1` if absent) using the existing `setTokensUsed` + `updateTokensInDatabase` pattern.

#### Tier 3: Auto-Escalate to Deep Crawl (Part D)

Runs only when `baseLinks.length <= 2` after Tier 2 completes — the signature of a JS-rendered site with no crawlable HTML links.

1. Checks `abortControllerRef.current?.signal.aborted`; throws if set.
2. Loading message: `Few pages found — switching to deep crawl (this may take a few minutes)...`
3. Calls `discoverViaCrawl(rootHost, maxUrls)`.
4. Merges: `baseLinks = Array.from(new Set([...baseLinks, ...crawlLinks]))`. Logs: `Auto-escalated to /v1/crawl, total URLs: ${baseLinks.length}`.
5. Sets `discoveryMethod = 'deep-crawl'`.
6. Escalates **at most once** per crawl. Never escalates when the jsSpa toggle is on (that path already uses deep crawl).
7. Wrapped in try/catch — on failure, logs and continues with whatever `baseLinks` holds.

#### Reconciliation Pass (Part E)

Runs during and after the existing `includeMeta` batch scrape loop. **Skipped entirely when `includeMeta` is OFF** — no page HTML is downloaded in that mode, so there is nothing to harvest.

**During the batch scrape:**
1. The `formats` array for each page scrape is extended from `['markdown', 'html', 'rawHtml']` to `['markdown', 'html', 'rawHtml', 'links']`. This costs no additional credits — the page is already being scraped.
2. For each scraped page, same-host URLs are extracted from both `scrapeData.data.links` and by parsing `html || rawHtml` for `a[href]`. These are passed through `normalizeLinks(candidates, pageUrl, rootHost)` using that page's URL as `baseUrl`.
3. All extracted URLs are accumulated into a `Set<string>` called `observedUrls`.

**After the batch loop:**
4. Computes `missing = [...observedUrls].filter(u => !urlList.includes(u))`.
5. Applies the same `NON_PAGE_EXTENSIONS` / `DOCUMENT_EXTENSIONS` / `pathPrefix` / `pagesOnly` filters to `missing` that were applied to `urlList`.
6. If `missing.length > 0` and `detailedResults.length < maxUrls`:
   - Loading message: `Found ${missing.length} pages not listed in the sitemap — scraping...`
   - Scrapes the missing pages using the same batch logic, capped at the remaining `maxUrls` budget.
   - Appends results to `detailedResults`.
   - Re-runs steps 4–6 on the newly scraped pages, **maximum 2 additional rounds total**. Hard stop after that.
7. Populates `sitemapGap`: `{ claimed: claimedCount, found: detailedResults.length, missing: accumulated missing URLs across all rounds }`.
8. `abortControllerRef` is checked between rounds. The entire reconciliation is wrapped in try/catch — on failure, logs and keeps results already gathered.

### User Feedback (Part F)

**Discovery method label** — shown as small muted text above the results table:

| `discoveryMethod` | Label (ES) |
|---|---|
| `map` | Páginas encontradas vía sitemap |
| `html-harvest` | Sitio sin sitemap — páginas encontradas analizando los enlaces del sitio |
| `deep-crawl` | Sitio dinámico detectado — se usó rastreo profundo |

**Sitemap gap warning** — if `sitemapGap && sitemapGap.missing.length > 0`, an amber warning block appears above the results table:

> El mapa del sitio no incluye N página(s) que sí existen en el sitio. Esto puede impedir que Google las encuentre.

The missing URLs are listed beneath the warning in a scrollable container.

**Data exposure:** Both `discoveryMethod` and `sitemapGap` are stored in component state and are available for the SEO audit module to consume as findings. The SEO module is not modified in this change — only the data is made available.

### What Did Not Change (Part G)

- `NON_PAGE_EXTENSIONS` and `DOCUMENT_EXTENSIONS` regex definitions and filtering
- The `pathPrefix` filter
- The `pagesOnly` / `includeDocs` logic
- Existing token-tracking patterns (`setTokensUsed` + `updateTokensInDatabase`)

All of the above run unchanged after discovery completes. Every new scrape call introduced by Tiers 2, 3, and the Reconciliation pass increments `tokensUsed` using the existing pattern.

---

## Website Crawler — Title/Description Extraction Fix

**Fixed:** 2026-04-25
**Component:** `src/components/Crawler.tsx`

### Problem

During the initial crawl with "Include Meta Data" enabled, the crawler was requesting only `formats: ['markdown']` from Firecrawl and reading the title from Firecrawl's built-in `metadata` object. This metadata is assembled by Firecrawl from multiple sources and could pick up incorrect values — for example, on `neuralmexico.com` it returned "Fondo lemus - YouTube" (the title of an embedded YouTube iframe) instead of the real page `<title>` tag.

### Fix

**Initial crawl batch scrape (when "Include Meta Data" is enabled):**
- Formats extended from `['markdown']` to `['markdown', 'html', 'rawHtml']`
- After Firecrawl returns, `extractSeoMetadata(html, rawHtml)` is called — same function used by CRO/SEO/Scrape
- Title is taken from `seoMeta.metaTitle` (regex-parsed from the `<title>` tag in `rawHtml`)
- If `seoMeta.metaTitle` is NOT_FOUND or null, falls back to client-side DOMParser on `html`, then to Firecrawl's `metadata.title`
- Same hierarchy applied to meta description

**Per-URL analysis ("Analyze" button):**
- Formats extended from `['html', 'markdown']` to `['html', 'markdown', 'rawHtml']`
- When extracting metaTitle/metaDescription, now calls `extractSeoMetadata(html, rawHtml)` first
- Falls back to DOMParser only if `extractSeoMetadata` returns NOT_FOUND

Result: Both initial crawl and per-URL analysis now produce consistent, reliable titles matching what the Scrape module shows.

### Debug logs

```
[Scrape] Using Firecrawl-based extraction pipeline (same as CRO/SEO)
[Scrape] Extraction complete: { title, h1Count, h2Count, h3Count, canonical, schemaTypes, imageCount }
```
---

## Brand Identity .md Export

### Overview

The Brand Identity Extractor (Branding tab) now includes an **Export as .md** button that generates a complete design-system Markdown file from any scraped website. The output format matches the structured brand documentation standard: YAML frontmatter with all design tokens, followed by AI-authored narrative sections.

### File Structure

The exported `.md` file contains two parts:

**1. YAML Frontmatter (design tokens)**
Structured, machine-readable design tokens built from the scraped branding data:

```yaml
---
version: alpha
name: SiteName
description: "Brand tagline or voice, if detected"
colors:
  primary: "#0F1112"
  secondary: "#6F7478"
typography:
  display:
    fontFamily: IBM Plex Sans
    fontSize: 3.5rem
    fontWeight: 500
  body:
    fontFamily: IBM Plex Sans
    fontSize: 0.95rem
rounded:
  default: 5px
spacing:
  sm: 8px
  md: 16px
components:
  button-primary:
    backgroundColor: "#00A36C"
    borderRadius: 5px
---
```

**2. Markdown Narrative (AI-authored)**
Claude generates four editorial sections from the extracted data:

- **Overview** — 1–2 sentences describing the visual mood and design philosophy
- **Colors** — palette philosophy + per-color usage intent
- **Typography** — typographic system description + per-role/scale bullets
- **Do's and Don'ts** — 3–4 prescriptive rules inferred from the actual palette and type choices

### Requirements

- A Firecrawl extraction must be completed first (the Extract Branding button)
- An Anthropic API key must be configured in the app (the button is disabled and shows a notice if missing)

### How It Works

1. User extracts branding from a URL using the existing Brand Identity Extractor
2. User clicks **Export as .md**
3. The app builds YAML frontmatter from the extracted JSON (colors, typography, spacing, rounded corners, components)
4. Claude is called with the structured data to write the Overview, Colors, Typography, and Do's & Don'ts sections
5. The resulting file is downloaded as `<hostname>-brand-system.md`

### Token Mapping Logic

- **Colors**: extracted from `branding.colors` (both array and object formats normalized)
- **Typography roles**: mapped from `fontSizes` and `fontFamilies` keys (display, h1, body, label, caption, etc.)
- **Spacing scale**: sm/md/lg resolved from `spacing.scale` keys or `spacing.baseUnit`
- **Rounded corners**: from `spacing.borderRadius`
- **Components**: all component entries from `branding.components` written as nested YAML with all detected style properties

### Completeness vs. Generic Sites

For sites with an explicit design system (Tailwind config exposed in CSS, design tokens in CSS variables, Figma-based systems) the frontmatter coverage is 90%+. For generic marketing sites, colors and typography are well-covered; components and spacing may be partially inferred. The AI narrative is always generated regardless of data completeness.

---

## Font Download Links — Brand Identity Extractor

### Overview

When a user extracts branding from a URL, the app now performs a secondary CSS scan in parallel to locate self-hosted font files. This allows users to identify and download custom fonts that are not hosted on Google Fonts or other public CDNs.

### How It Works

1. **Parallel extraction**: Alongside the Firecrawl branding call, the app fetches the raw page HTML and all linked `<link rel="stylesheet">` stylesheets directly from the browser.
2. **@font-face parsing**: All `@font-face` blocks in inline `<style>` tags and external CSS files are parsed. The `src: url(...)` values are extracted, resolved to absolute URLs, and filtered to real font file extensions (`.woff2`, `.woff`, `.ttf`, `.otf`, `.eot`).
3. **Per-family grouping**: Extracted font file URLs are grouped by `font-family` name and matched against the detected font families from the branding extraction.

### UI Behavior (Typography Section)

Each font family card in the Typography section now shows one of four states:

- **System font** (Arial, Helvetica, Georgia, etc.): Labelled as "System font — no download needed". If a known Google Fonts alternative exists for this font (e.g., Segoe UI → Open Sans, Georgia → Merriweather), a "Similar on Google Fonts" link is shown below the label.
- **Apple system font** (SF Pro, SF NS, -apple-system, BlinkMacSystemFont, New York): Labelled as "Apple system font — built into macOS/iOS, not available for download". A "Similar on Google Fonts" link is shown (e.g., SF Pro/SF NS → Inter, New York → Lora).
- **Self-hosted font**: Detected from `@font-face` blocks. Each font file is listed as a direct download link with filename and format tag (`.woff2`, `.ttf`, etc.). If the font family also has a known Google Fonts alternative, a "Similar on Google Fonts" link is shown below the download links.
- **No self-hosted files found, not a system font**: A "View on Google Fonts" link is shown, pointing to `https://fonts.google.com/specimen/<FontName>`.

#### Google Fonts Alternative Map

The app contains a hardcoded mapping of common proprietary/system fonts to their closest Google Fonts equivalents:

| System / Proprietary Font | Google Fonts Alternative |
|---------------------------|--------------------------|
| SF Pro, SF NS, SF Compact, -apple-system, BlinkMacSystemFont | Inter |
| New York | Lora |
| Segoe UI | Open Sans |
| Helvetica Neue, Helvetica | Roboto / Inter |
| Arial | Roboto |
| Georgia | Merriweather |
| Times New Roman, Times | Merriweather / Lora |
| Tahoma | Noto Sans |
| Verdana | Inter |
| Trebuchet MS | Roboto |
| Impact | Bebas Neue |
| Courier New | Courier Prime |
| Courier | IBM Plex Mono |
| system-ui | Inter |

### .md Export

If self-hosted font files are found, a `## Font Files (Self-Hosted)` section is appended to the end of the exported `.md` file. Each family gets a subsection with Markdown links to the font file URLs:

```markdown
## Font Files (Self-Hosted)

### Geist Sans
- [`GeistSans-Regular.woff2`](https://example.com/fonts/GeistSans-Regular.woff2) — `WOFF2`
- [`GeistSans-Bold.woff2`](https://example.com/fonts/GeistSans-Bold.woff2) — `WOFF2`
```

### Notes

- Font file URLs are direct links to the original server. CORS restrictions may prevent programmatic fetching, but opening the URL in a browser tab triggers a native download.
- The CSS scan runs in parallel with Firecrawl so there is no added wait time on the happy path.
- If the page fetch or stylesheet fetch fails (network error, CORS, timeout), font file extraction gracefully returns an empty list — the rest of the branding extraction is unaffected.

---

## Design Extractor

**Added:** 2026-05-28

A new "Design Extract" tab in the main Scrape panel runs a production-grade two-phase web scraping and design extraction pipeline. The goal is to take any URL and produce two ready-to-use output files: a `design.md` containing a complete design system, and a structured JSON blueprint describing every page section.

### Pipeline Overview

**Updated:** 2026-07-24 (v8.2) — Reordered pipeline: blueprint now generates FIRST, then design.md receives blueprint.json as context. Added boot-only CSS detection (cssLooksInsufficient) to extract-css edge function. Added assumption ratio guard to BUILD.md (threshold: >=40 absolute OR >50%). Fixed duplicate Assumptions section (programmatic stripping + stronger B1 prompt rule). Added off-page selector guard to all prompts (D1) and cross-template contrast prohibition (D2/D3). Added video extraction to asset manifest (<video> src, <source> children, poster attribute). Assumption ratio logging added.

The pipeline is now split into four sequential phases:

**Phase 1 — Structure scrape (Firecrawl rawHtml + screenshot)**
Calls `POST /v1/scrape` with formats `rawHtml` and `screenshot@fullPage`, with `onlyMainContent: false`. Returns the full page HTML and a full-page screenshot. This scrape runs BEFORE any LLM call so the screenshot is available to both Claude calls.

> **Why the `extract` format was removed (2026-07-23):** Firecrawl's LLM-powered `extract` returned fabricated values. For an Elementor site using Manrope, #000000, and #0055ff, it returned the Bootstrap 4 default palette (#007BFF / #343A40 / #212529 / #FFC107) and a Roboto Google Fonts URL. Every value was wrong. All of this data is already available deterministically in the CSS blocks and inline styles extracted by `htmlPreprocess.ts`, so the `extract` call was a fabrication surface with no upside.

**Phase 2 — HTML Pre-processing + External CSS fetch (client-side, before any LLM call)**
Runs a five-step cleaning pipeline (`src/lib/htmlPreprocess.ts`):
1. Detect and preserve font CDN URLs from `fonts.googleapis.com`, `fonts.bunny.net`, and `use.typekit.net`. Inject a comment at the top of the HTML listing all detected font URLs. Replace `<link>` tags pointing to these CDNs with `__FONT_LINK_N__` placeholders.
2. Strip noise: all `<script>` blocks, all `<style>` blocks (CSS content extracted separately before removal), all HTML comments, all `class=` attributes, all `data-*` attributes, all `aria-*` attributes, all `id=` attributes (except anchor-containing ones). Collapse multiple whitespace.
3. Restore font `<link>` tags from their placeholders.
4. Extract CSS separately: up to 5 `<style>` block contents and up to 50 `style=""` inline attribute values.
5. Truncate: if cleaned HTML exceeds 80,000 chars, keep first 60,000 + last 20,000, joined with a truncation comment.

Then calls `extractCssData(normalized)` which hits the `extract-css` edge function to fetch and parse external stylesheets. The result (`CssExtractResult`) contains `customProperties`, `fonts`, `colors`, `mediaQueries`, `keyframes`, `sheets`, and `rawCss`. On null or throw, the call logs and continues — this is a supplement, never fatal.

The external CSS data is merged with the inline CSS from `htmlPreprocess` into a combined CSS context string in this priority order:
1. `customProperties` — formatted as `selector { --name: value; }` (never truncated)
2. `fonts` — formatted as `selector { property: value; }`
3. `colors` — formatted as `selector { property: value; }`
4. `mediaQueries` — raw text
5. Inline `<style>` blocks from `htmlPreprocess`
6. Inline `style=` attributes from `htmlPreprocess`

Identical declarations are deduplicated. Each group is labeled with a comment header (e.g. `/* ─── External stylesheet custom properties ─── */`) so the model can tell sources apart. The combined CSS is capped at 120,000 characters — groups are kept in priority order and the lowest-priority group that overflows is truncated. `customProperties` is never truncated. A comment noting truncation is appended.

If zero external sheets were retrieved, an amber notice appears in the UI: 'No se pudieron descargar hojas de estilo externas — el análisis se basó solo en los estilos incrustados.'

**Phase 3 — LLM Call A: Generate design.md (Claude claude-sonnet-4-6, with screenshot)**
Sends the combined CSS context string (external + inline) AND the full-page screenshot (as base64 image segments) to Claude with the `DESIGN_SYSTEM_PROMPT`. The prompt now notes that CSS arrives from two sources (external stylesheets and inline), both equally authoritative, and instructs resolving `var(--x)` chains across BOTH sources. The screenshot is used to VERIFY and DISAMBIGUATE — never to invent. Specifically:
- When multiple CSS rules could apply, the screenshot decides which renders
- Confirm which sections are dark vs light vs off-white
- Confirm the real visual hierarchy of H1 vs H2 vs H3 (relative size and weight)
- Confirm whether the nav is transparent or has a background
- If the screenshot contradicts the CSS, report BOTH and say which renders, with reasoning
- Hex values must still come from CSS — never read colors off the screenshot

The prompt instructs Claude to:
- Obey **Rule 0** — absolute prohibition on fabrication. If a value cannot be traced to CSS, inline styles, or the screenshot, write `NOT FOUND — verify manually`. No exceptions, no defaults, no Bootstrap/Material fallbacks.
- Ignore all `--wp--preset--*` WordPress boilerplate variables
- Detect fonts by scanning the preserved font CDN URLs, then `@font-face` declarations, then CSS `font-family` rules
- Resolve all CSS `var(--x)` references to actual hex values
- Never output system font stacks if a custom font is present
- For type scale: if a size cannot be traced to CSS or confirmed visually, write `NOT FOUND — verify manually` (the previous H1=48px/H2=36px/H3=28px inference rule was deleted)
- For semantic colors: if no success/warning/error/info colors exist in the CSS, they are NOT FOUND (the previous semantic-colors exception was deleted)
- The final `:root` block must be VALID, PASTEABLE CSS. Unresolved tokens are commented out (`/* --token: NOT FOUND — verify manually */`) rather than emitted as broken declarations. NOT FOUND markers stay in the human-readable tables above; only the `:root` block is sanitized.
- Output a complete design system covering: Color Palette (primary, secondary, neutrals, semantic, background, text), Typography (font families with CDN URLs, type scale), Spacing System, Borders & Radius, Shadows, Transitions, Breakpoints, Component Specs (buttons, card, navigation, footer), and a complete `:root` CSS tokens block.

**Phase 4 — LLM Call A: Generate blueprint JSON FIRST (Claude claude-sonnet-4-6, with screenshot + asset manifest)**

> **Pipeline reorder (2026-07-24):** The blueprint now generates FIRST, before design.md. The blueprint is the most reliable output on JS-heavy sites because it reads from the rendered HTML, not the CSS. design.md then receives the completed `blueprint.json` as context so it can use `page_title` for the document title and `sections` to understand what the page actually is — preventing hallucinated brand names and page purposes.

Sends the pre-processed, truncated HTML, the full-page screenshot, AND the asset manifest to Claude with the `BLUEPRINT_SYSTEM_PROMPT`. No design.md is passed (it has not been generated yet).

Additional blueprint rules added:
- Do NOT create separate sections for responsive variants of the same component. A desktop carousel and a mobile grid showing the same content is ONE section — record mobile behavior in `mobile_layout` and `layout_contract`.
- Never truncate `body_text` mid-word. Include complete text, or cut at a sentence boundary and append ` […]`.
- `cta_buttons` must list every button, link-styled-as-button, and primary action. An empty array means the section genuinely has none — check the screenshot before returning empty.

The output is a structured JSON object containing:
- `globals`: navigation (type, logo, links, CTA, background) and footer (columns, logo, social, newsletter, background)
- `sections[]`: one entry per page section in order, each with: `section_index`, `section_name`, `section_type` (enum), `headline`, `subheadline`, `body_text`, `cta_buttons`, `media`, `background_color`, `background_tone`, `text_color`, `estimated_height_desktop`
- `layout_contract` per section: a 12-field structural intelligence object with `section_role`, `desktop_layout`, `mobile_layout`, `column_structure`, `content_position`, `image_position`, `card_or_grid_structure`, `alignment_rules`, `spacing_density`, `must_preserve`, `allowed_simplifications`, and `do_not_do`

### UI

The extraction UI shows:
- URL input and "Extract Design" button (triggers API key modal if no key is stored)
- A live progress bar with per-phase status indicators (pending / active spinner / done checkmark) — now 4 phases: scrape, fetch-css, design.md, blueprint
- On completion: full-page screenshot preview, and two output panels (`design.md` and Blueprint JSON) each with Copy and Download buttons
- Amber notice if no external sheets were retrieved: 'No se pudieron descargar hojas de estilo externas — el análisis se basó solo en los estilos incrustados.'
- Amber notice if screenshot was unavailable: 'Verificación visual no disponible — el análisis se basó únicamente en el CSS.'
- A "Download Both Files" button that triggers sequential downloads of both output files

> Note: The collapsible Firecrawl extract JSON panel was removed when the `extract` format was dropped (2026-07-23).

### Files

| File | Purpose |
|------|---------|
| `src/components/DesignExtractor.tsx` | Main extraction component |
| `src/lib/imagePrep.ts` | Screenshot preparation — scales to 1400px width, slices tall screenshots into ≤1600px segments with 100px overlap, max 4 segments, hard validation |
| `src/lib/prompts/designExtractionPrompts.ts` | System prompts and user message builders for both LLM calls |
| `src/lib/callClaude.ts` | Claude API wrapper — accepts `images?: string[]` param; retries without images on 400 image errors. Added `callClaudeWithMeta()` returning `{ text, stopReason }` by capturing `message_delta` SSE events, and `callWithContinuation()` which auto-continues on `max_tokens` (up to 2 continuations); `callClaude()` wraps it for backward compatibility |
| `src/lib/firecrawl.ts` | `extractCssData()` — calls the `extract-css` edge function to fetch external stylesheets |

### Design Decisions

- **Single Firecrawl scrape call** (updated 2026-07-23): The previous two-call design (extract + screenshot) was collapsed into one call with `rawHtml` + `screenshot@fullPage`. The `extract` format was removed because Firecrawl's LLM extract fabricated values (Bootstrap defaults, wrong fonts) that were already available deterministically in the CSS.
- **External stylesheet fetching** (added 2026-07-23, updated 2026-07-23): `preprocessHtml()` only reads inline `<style>` tags and `style=` attributes — sites serving CSS from external files (Elementor's default "External File" CSS Print Method, most WordPress themes) yielded almost no extractable tokens. The `extract-css` edge function is invoked via `extractCssData(pageUrl, html?)` between the structure scrape and the design LLM call. DesignExtractor passes the rawHtml already obtained from Firecrawl so the edge function never re-fetches the page — it reuses the HTML to discover `<link rel="stylesheet">` tags and inline `<style>` blocks. Only when `html` is absent does the edge function fall back to fetching the page itself. All HTTP fetches (page fallback, stylesheets, `@import`) use a real Chrome 125 User-Agent with `Accept: text/css,*/*;q=0.1` and `Referer` set to the page URL to avoid WAF/managed-WordPress block pages. A content-type guard skips any response that returns `text/html` (likely a WAF block) and records it in diagnostics. The result is merged into a combined CSS context string in priority order (custom properties first, never truncated), deduplicated, capped at 120k characters. On failure, the call logs and continues — it is a supplement, never fatal.

  **Diagnostics** (never silent): The edge function returns a `diagnostics` object with `htmlSource`, `linkedSheetsFound`, `sheetsFetchedOk`, `sheetsFailed[]`, `totalCssBytes`, and `customPropertyCount`. DesignExtractor console.logs the full diagnostics after the fetch-css phase. When extraction is clearly degraded (`sheetsFetchedOk === 0`, `customPropertyCount === 0`, or any failure with reason `html-response (likely WAF block)`), a red warning appears in the UI: 'Advertencia: no se pudieron leer las hojas de estilo del sitio (posible bloqueo del servidor). El análisis de diseño está incompleto — verifica los valores manualmente.'

  **Custom property sorting**: Custom properties are sorted so the most likely design-system sources come first: (1) `.elementor-kit-*` selectors, (2) `:root`/`html`, (3) `.theme-*`/`.site-*`/`.wp-site-*`, (4) everything else. The combined CSS context string labels groups by origin: `/* ─── Elementor kit custom properties (PRIMARY design system) ─── */`, `/* ─── :root custom properties ─── */`, `/* ─── Other stylesheet custom properties ─── */`. `--wp--preset--*` values are excluded as platform boilerplate, but `--wp--style--global--*` values are kept (content-size / wide-size are real layout tokens).
- **Screenshot sent to Claude vision**: The full-page screenshot is prepared by `src/lib/imagePrep.ts` (`prepareScreenshot()`) which scales to a 1400px working width, then slices tall pages into segments of at most 1600px each with a 100px overlap (capped at 4 segments — above-the-fold, two middle samples, footer). Each segment is validated against Anthropic's 8000px dimension limit and 5MB base64 size limit. `src/lib/callClaude.ts` accepts an optional `images?: string[]` parameter and builds a multimodal content array (images first, text last). If the API returns a 400 mentioning 'image', the call is retried once without images — a CSS-only design.md is a valid result. The original unsliced screenshot is kept for the on-screen preview; only the Claude payload uses segments. If `prepareScreenshot` returns an empty array, both LLM calls proceed without images and an amber notice is shown: 'Verificación visual no disponible — el análisis se basó únicamente en el CSS.'
- **Blueprint generated FIRST (2026-07-24 reorder)**: The pipeline was reordered so the blueprint generates before design.md. The blueprint is the most reliable output on JS-heavy sites (it reads rendered HTML, not CSS). design.md then receives `blueprint.json` as context, using `page_title` for the document title and `sections` to understand the page's purpose — preventing hallucinated brand names and page purposes.
- **design.md receives blueprint context**: The completed blueprint.json is passed to the design.md call so design.md can use the page_title and section names. Previously, design.md was generated first and the blueprint was chained after it.
- **Rule 0 — no fabrication**: Both prompts now have an absolute prohibition on inventing values. In DESIGN_SYSTEM_PROMPT, type scale inference (H1=48px etc.) and semantic color defaults were deleted. In BLUEPRINT_SYSTEM_PROMPT, Rule 0 was added to prevent reading hex values off the screenshot — `background_color` and `text_color` may only come from design.md or CSS, and if design.md reports NOT FOUND the blueprint field must be null. A new `background_tone` field captures dark/light/mid from the screenshot without inventing precision. A consistency requirement ensures the blueprint never contradicts design.md. The `:root` block is sanitized to valid CSS — unresolved tokens are commented out.
- **HTML pre-processing before LLM** is critical: strips ~60–80% of token-wasting noise while preserving the font CDN links that would otherwise be lost with the `<link>` tags.
- **Font CDN placeholder trick** preserves font loading URLs through the stripping step without requiring a separate font-detection pass.
- **Head + tail truncation** (not middle truncation) preserves the `<head>` (font links, meta) and the end of `<body>` (footer) which are typically the most information-dense regions for design extraction.
- **Blueprint `layout_contract`** captures structural intent (not just visual appearance) so the JSON can serve as a rebuild specification for a separate prototyping tool.

### Prompt Accuracy Rules (2026-07-24)

**Updated:** 2026-07-24 — Added six anti-fabrication and measurement rules to `DESIGN_SYSTEM_PROMPT` to fix specific failure modes observed in generated design.md files.

The following rules were added to the `DESIGN_SYSTEM_PROMPT` in `src/lib/prompts/designExtractionPrompts.ts`:

1. **No scale extrapolation from a single value.** If only one transition duration (e.g. `0.3s`) is found in the CSS, report that one and mark every other transition tier NOT FOUND. The same applies to spacing, radius, and type scales — never extrapolate a full scale (fast/base/slow or xs/sm/md/lg/xl) from a single data point. Previously, the prompt would emit `--transition-fast: 150ms` and `--transition-slow: 400ms` as confirmed values when only `0.3s` existed.

2. **One token, one state.** A token is either resolved (give the value) or unresolved (NOT FOUND alone). Never emit both a value and NOT FOUND for the same token. If a value is visually evident but absent from CSS, write NOT FOUND in the value column and put the visual observation in the Usage column or a note. Previously, a `--radius-full` row would emit both `9999px` and `NOT FOUND — verify manually`.

3. **ASSUMED marker for visual-only values.** When a value is visually confirmed but has no CSS source and the model chooses to supply it anyway, it must carry the `/* ASSUMED — reason */` marker. Values without that marker are claims that the value was found in the CSS.

4. **Breakpoints derived from media query list.** The CSS context includes a `mediaQueries` array from `extract-css`. The Breakpoints table must be derived from it: collect every distinct `min-width` and `max-width` value, sort ascending, and report each with the number of rules using it as evidence (e.g. `| md | max-width: 767px | 214 rules |`). Report actual values found — do not map them onto assumed `sm/md/lg/xl` names. If a site's breakpoints do not map cleanly onto four tiers, list all of them. Report whether breakpoints are `min-width` (mobile-first) or `max-width` (desktop-first). Only report NOT FOUND if the media query list is genuinely empty. Previously, the Breakpoints table reported all NOT FOUND even though `extract-css` collected and passed the media query list.

5. **CONFIRMED ABSENT vs NOT FOUND.** NOT FOUND means the value could not be determined. CONFIRMED ABSENT means the full CSS was searched and the property is never declared — in which case report the CSS initial value and mark it, e.g. `--radius-md: 0; /* CONFIRMED ABSENT — no border-radius declared anywhere */`. Use CONFIRMED ABSENT only when the complete stylesheet set is available and the property genuinely never appears. The token table and component specs must agree — never report NOT FOUND in one and a concrete value in the other. Previously, the token table would say NOT FOUND while component specs reported the CSS default (e.g. `border-radius: 0`).

6. **One token, one value (no parenthetical scopes).** Never emit a token holding several values with parenthetical scopes (e.g. `--container-max: 960px (hero), 740px (method-tiers), 760px (philosophy p)`). When a property varies by context, emit separate scoped tokens (`--container-max-hero`, `--container-max-method`, `--container-max-prose`). If a dominant value exists, also emit the generic token set to it and note which sections deviate. Multi-value shorthand (e.g. `padding: 70px 60px 34px`) is acceptable as a token value only when declared that way in the CSS — keep the shorthand and note it is a shorthand rather than a single scalar.

7. **Type Scale is a scale, not a class inventory.** On class-based sites (Webflow, Wix, Squarespace, plain CSS) dozens of classes set font-sizes independently. The Type Scale table must consolidate them: group by rendered role (display, h1, h2, h3, body, small, label, button, nav) inferred from tag, class name, and screenshot; one row per role using the most frequent value; cap at 12 rows; list notable one-off variants beneath the table as prose. Previously, the table would list every class that set a font-size, producing an unmanageable inventory.

8. **Resolve inherited properties.** `font-family`, `color`, and `line-height` cascade. If body or a root wrapper sets `font-family` and a heading does not override it, the heading inherits that family — report it with an `(inherited from ...)` note, do not write NOT FOUND. Only write NOT FOUND when no ancestor in the CSS sets the property. Previously, headings would report NOT FOUND for font-family even though they inherited it from body.

9. **Preserve responsive and fluid values.** Viewport units and multi-breakpoint values are the real design intent. Write `9vw` or `7vw → 8vw (≥1440px)` as declared, never a single flattened px value. Previously, the prompt would collapse responsive values to a single px approximation.

10. **Report whether a coherent type scale exists.** If sizes are arbitrary per-class values with no consistent ratio, state so explicitly: "No systematic type scale — sizes are set per-class with no consistent ratio. This is typical of visual page builders and makes the site harder to maintain." This is a real audit finding, not an extraction failure. Previously, the prompt would either fabricate a scale or report NOT FOUND, neither of which communicated the actual situation.

11. **Spacing table consolidation.** The same consolidation rule applies to the Spacing table: group the most-used values into a scale, cap at 10 rows, and note when no consistent scale exists. Previously, the spacing table would list every distinct padding/margin value found, producing an inventory rather than a scale.

12. **Do not diagnose the cause of a gap.** When a value is missing, report that it is missing — do not speculate about why. Never write that values are "set inline", "not captured in the extracted CSS", "loaded via JavaScript", or "not included in the provided CSS" unless there is specific evidence in the supplied context. The model cannot see what was not sent to it, so it cannot know why something is absent. Write "NOT FOUND — verify manually" and stop. Previously, the prompt would fabricate explanations for missing values, giving users false confidence that the gap was understood.

13. **Large CSS volume means search harder.** The prompt is told how many stylesheets were fetched and their total size. When a large volume of CSS was supplied and a common property still appears absent, that is a signal the model has not looked hard enough — it must search the frequency analysis before concluding the property is missing. Previously, the prompt would report NOT FOUND for properties that were present in the supplied CSS but not found by the model.

14. **No consistent scale vs no values.** A site can declare hundreds of padding values with no systematic rhythm — that is a finding about the design system, not the same as the values being absent. The two must not be conflated. "No consistent scale" means the values exist but have no ratio; "no values" means the property was never declared. Previously, the prompt would report NOT FOUND when hundreds of values existed but had no pattern, confusing a design-system finding with an extraction gap.

### Multi-Stack Platform Detection (2026-07-24)

**Added:** 2026-07-24 — The design extractor now works on any stack (WordPress/Elementor, Webflow, Wix, Squarespace, Shopify, React/Next, Vue/Nuxt, Astro, Tailwind, Bootstrap, plain HTML) by detecting the platform deterministically and selecting a token-derivation strategy.

#### Platform Detection (deterministic, no LLM)

The `extract-css` edge function now returns a `platform` object alongside its existing diagnostics:

```typescript
interface PlatformDetection {
  cms: 'wordpress' | 'webflow' | 'wix' | 'squarespace' | 'shopify' | null;
  builder: 'elementor' | 'divi' | 'bricks' | 'beaver' | 'gutenberg' | null;
  framework: 'react' | 'next' | 'vue' | 'nuxt' | 'astro' | 'svelte' | null;
  cssApproach: 'custom-properties' | 'tailwind' | 'bootstrap' | 'css-modules' | 'plain' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  signals: string[];
}
```

Detection is done by matching signals in the HTML and CSS:
- **WordPress**: `/wp-content/`, `/wp-includes/`, meta generator "WordPress"
- **Elementor**: `.elementor-kit-*`, `/elementor/css/post-`, class `elementor-`
- **Divi**: `#et-boc`, `et_pb_` class prefix
- **Bricks**: `brxe-` class prefix
- **Beaver**: `fl-builder` / `fl-module` classes
- **Gutenberg**: `wp-block-` class prefix (only when WordPress is detected and no other builder)
- **Webflow**: meta generator "Webflow", `website-files.com` asset host, `.w-container` / `.w-form` / `w-webflow-badge` classes
- **Wix**: `static.wixstatic.com`
- **Squarespace**: `squarespace.com/universal`, `static1.squarespace.com`
- **Shopify**: `cdn.shopify.com`, `Shopify.theme`
- **Next.js**: `__NEXT_DATA__`, `/_next/static/`
- **Nuxt**: `__NUXT__`
- **Astro**: `astro-island`, `data-astro-`
- **React (generic)**: `id="root"` or `id="__next"` with React hydration markers
- **Tailwind**: CSS containing `--tw-` variables, OR >=20 class attributes matching `^(bg|text|border|rounded|px|py|mx|my|flex|grid|gap|w|h)-`
- **Bootstrap**: `.container`/`.row`/`.col-` plus `btn btn-` in markup
- **CSS Modules**: class names matching `/^[A-Za-z]+_[A-Za-z0-9]+__[a-z0-9]{5}$/`

The `cssApproach` is decided by custom property count: >=15 custom properties → `custom-properties`; tailwind signals → `tailwind`; bootstrap signals → `bootstrap`; otherwise → `plain`.

The detection result is logged in `DesignExtractor` and displayed in the UI above the results as a "Plataforma detectada" panel showing CMS, builder, framework, CSS approach, confidence level, and matched signals.

#### False Degraded Warning Fix

Previously, the `cssDegraded` flag fired when `customPropertyCount === 0`, which is correct for a WAF block but wrong for a site that legitimately has no token layer (e.g. plain HTML, Webflow). The flag now fires only when `sheetsFetchedOk === 0` OR any `sheetsFailed` entry has reason `html-response (likely WAF block)`. A site with 0 custom properties and healthy sheet fetches is NOT degraded — it is a `plain` cssApproach site.

#### Value Frequency Analysis

For sites without custom properties, the `extract-css` edge function now accumulates frequency data for:

- **fontSizes** — every `font-size` value, with count
- **fontFamilies** — every `font-family` value, with count
- **spacings** — every `padding`/`margin`/`gap` value, with count (both shorthand and component values)
- **radii** — every `border-radius` value, with count
- **shadows** — every `box-shadow` value, with count
- **fontWeights** — every `font-weight` value, with count

Each entry includes `{ value, count, sampleSelectors: string[] (max 3) }`.

Normalization before counting:
- `rgb()`/`rgba()` with alpha=1 converted to hex
- All hex lowercased
- `0px` and `0` treated as identical
- `rem`/`em` NOT converted to px — reported as declared

Excluded from frequency analysis:
- Stylesheets matching known vendor boilerplate: `/bootstrap(\.min)?\.css/`, `/normalize\.css/`, `/reset\.css/`, `/font-?awesome/`, `/swiper/`, `/slick/`, `/animate\.css/`
- Selectors matching platform UI chrome: `^\.w-(form|input|button|webflow-badge|file-upload)`, `^\.wp-block-`, `^\.elementor-widget-container`

Each category is sorted by count descending, capped at 30 entries, and passed to the design LLM under a `/* ─── Value frequency analysis (most-used values first) ─── */` block.

#### Tailwind Utility Extraction

When `cssApproach === 'tailwind'`, the edge function extracts every distinct utility class from the rendered HTML with an occurrence count, grouped by category:
- **colors** — `bg-*`, `text-*`, `border-*`
- **spacing** — `p-*`, `m-*`, `gap-*`, `space-*`
- **typography** — `text-*`, `font-*`, `leading-*`, `tracking-*`
- **radius** — `rounded-*`
- **shadow** — `shadow-*`
- **layout** — `flex`, `grid`, `grid-cols-*`, `order-*`, etc.
- **arbitrary** — bracket syntax classes like `bg-[#4fb34f]` or `text-[17px]`

Arbitrary bracket values are the highest-signal items on a Tailwind site because they are literal brand values. This data is passed to the design LLM under a `/* ─── Tailwind utility classes in use (with counts) ─── */` block.

#### Conditional Stack-Specific Rules

The `DESIGN_SYSTEM_PROMPT` now applies platform-specific rules conditionally rather than universally:

- The `--wp--preset--*` exclusion applies only when `cms === 'wordpress'`
- The `.elementor-kit-*` prioritisation applies only when `builder === 'elementor'`
- **Webflow**: the single large stylesheet on the Webflow asset host is the design system; ignore `.w-*` platform UI classes entirely
- **Next.js**: CSS chunks under `/_next/static/css/` hold the compiled system
- **Plain**: there is no token layer; rely on frequency analysis

#### Frequency-Derived Token Rules

Added to `DESIGN_SYSTEM_PROMPT`:

15. **Derive tokens from frequency when no custom properties exist.** When few or no CSS custom properties exist, derive the design system from the frequency analysis: the most frequently declared color is the dominant brand/text color; recurring font-size and spacing values reveal the real scale. State clearly that tokens were derived from usage frequency, and give the count as evidence, e.g. `--space-md: 24px; /* derived — declared 88 times across 41 selectors */`. Never present a derived token as a declared one.

16. **Never populate token tables with rare one-off values.** A value used once on a marquee at a single breakpoint is not a spacing token. Rank by frequency and report dominant values. If the frequency analysis is empty, write NOT FOUND.

17. **Tailwind utility classes are the design system.** Reconstruct tokens from Tailwind classes: `bg-slate-900` means the Tailwind slate-900 value, `text-lg` means the Tailwind lg font-size. Resolving default Tailwind scale names to their standard values is resolution, not fabrication. Arbitrary bracket values are literal and take priority over scale names. If a custom theme extension is evident from non-standard class names, report the class name and mark the value NOT FOUND — verify manually.

18. **Declared but unreferenced custom properties are not brand evidence.** A CSS custom property that is declared but never referenced by any rule is NOT evidence of the brand palette. Before assigning --color-primary, check whether the candidate is actually applied to visible elements, and cross-check against the screenshot. A color used on headings, logo, and CTAs outranks an unused :root declaration, even though the latter looks more 'official'. When a declared variable appears unused, report it in the Usage column as 'declared but not referenced in any rule — verify'.

#### Platform Detection Hardening (2026-07-24)

**Added:** 2026-07-24 — Fixed false Tailwind detection on Webflow sites and strengthened the detection logic.

**Problem:** tangan.fr (a Webflow site) was detected as `cms: null, cssApproach: 'tailwind'` because Webflow's platform classes (`.w-container`, `.w-nav`, `.w-form`, etc.) all begin with `w-`, which collided with the Tailwind width-utility prefix in the detection regex. The Webflow signal also failed to fire despite `.w-*` classes being present in the CSS.

**Fix 1 — Removed `w-` and `h-` from the Tailwind prefix list.** These prefixes are too collision-prone. The remaining prefixes are sufficient: `^(bg|text|border|rounded|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|flex|grid|gap)-`.

**Fix 2 — Require a Tailwind scale-name match, not just a prefix.** A class only counts toward the Tailwind score if its suffix is a valid Tailwind token:
- A number: `0`, `0.5`, `1`, `1.5`, `2`, `2.5`, `3`, `3.5`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `11`, `12`, `14`, `16`, `20`, `24`, `28`, `32`, `36`, `40`, `44`, `48`, `52`, `56`, `60`, `64`, `72`, `80`, `96`
- A standard color name with an optional numeric step: `slate-900`, `red-500`, `white`, `black`, `transparent`
- A standard size: `xs`, `sm`, `base`, `lg`, `xl`, `2xl`…`9xl`
- Bracket syntax: `[...]`

Classes like `font-30`, `mr-128`, `pt-24`, `mt-6vw` do NOT match the Tailwind scale and do not count.

**Fix 3 — Order matters: detect CMS first.** If `cms === 'webflow' | 'wix' | 'squarespace'`, Tailwind is DISQUALIFIED — those builders emit their own utility-looking class names. The `cssApproach` is then set from custom-property count only.

**Fix 4 — Fixed the Webflow signal.** The detection now matches on ANY of the following, checking BOTH the rendered HTML and the stylesheet text:
- Meta generator containing "Webflow"
- Asset host `website-files.com` OR `uploads-ssl.webflow.com`
- The literal string `w-webflow-badge`
- Two or more of: `.w-container`, `.w-nav`, `.w-form`, `.w-dyn-list`, `.w-slider`

**Fix 5 — Raised the Tailwind bar to 40 matching classes** (from 20). Confidence is forced to `'low'` when the score is below 80.

**Fix 6 — Added `warnings: string[]` to the detection result.** When two approaches both score above threshold, or when Tailwind signals are found but disqualified by the CMS, the conflict is recorded in `warnings` rather than silently picking one.

#### Platform Section in design.md Output

The output format now includes a "Platform" section at the top of design.md:

```markdown
## Platform

| Property | Value |
|----------|-------|
| CMS | [cms or None] |
| Builder | [builder or None] |
| Framework | [framework or None] |
| CSS Approach | [cssApproach] |
| Token Source | [declared custom properties | derived from frequency analysis | Tailwind utility classes] |
| Detection Signals | [list matched signals] |
```

#### `buildDesignUserPrompt` Signature Change

The function now accepts additional parameters:

```typescript
export function buildDesignUserPrompt(
  combinedCss: string,
  platform?: PlatformDetection | null,
  frequency?: FrequencyAnalysis | null,
  tailwind?: TailwindUtilities | null,
  blueprintJson?: string,
  cssLooksInsufficient?: boolean,
): string
```

The platform detection, frequency analysis, and Tailwind utility data are injected into the user prompt as structured comment blocks so the LLM has the detected stack and derived data as context.

#### Six New design.md Sections (2026-07-24)

**Added:** 2026-07-24 — Six new sections added to the design.md output format and the analysis rules in `DESIGN_SYSTEM_PROMPT`. All follow existing conventions (Rule 0, NOT FOUND, CONFIRMED ABSENT, derived-with-count).

**A. Form Elements** (under Component Specs) — Extracts styles for text input, textarea, select, checkbox, radio, label, placeholder, error state, success state, and submit button. For each: background, border, border-radius, padding, font-size, color, and focus appearance. On Webflow, `.w-input` / `.w-select` / `.w-form-fail` / `.w-form-done` are reported as PLATFORM DEFAULTS and the prompt notes when the site has not restyled them. If the page has no form, the output reads "No form elements present on this page."

**B. Interactive States** (new top-level section) — For every interactive component (buttons, links, inputs, cards, nav items), reports `:hover`, `:focus`, `:focus-visible`, `:active`, and `:disabled` separately in a table. If no focus styles exist anywhere in the CSS, the output states explicitly: "CONFIRMED ABSENT — no :focus or :focus-visible styles declared. Keyboard users cannot see which element is selected. Accessibility finding."

**C. Links (body text)** (under Component Specs) — Reports default color, text-decoration, hover state, visited state, and whether links inside body copy are visually distinguishable from surrounding text.

**D. Layout System** (new top-level section after Spacing) — Reports container widths and their breakpoints, grid patterns actually used (column counts and gaps, from the frequency analysis), flex patterns, and a z-index scale listing every declared z-index value with the element it applies to, sorted ascending.

**E. Media Treatment** (new top-level section) — Reports CSS filters applied to images (grayscale, brightness, contrast), object-fit, aspect-ratio, hover transforms, and border-radius on images. Where the screenshot shows a consistent photographic treatment, states whether it comes from CSS or is baked into the source files — and if it cannot be determined, says so rather than guessing.

**F. Contraste de color** (new top-level section, written in Spanish) — For every text-color / background-color pairing already identified in the document, computes the WCAG contrast ratio and reports pass/fail against 4.5:1 for normal text and 3:1 for large text. Rules: compute only for pairings actually documented above (no inventing pairings), skip any pairing where either colour is NOT FOUND, composite semi-transparent colours over the stated background first. Below the table, lists failures in plain Spanish a non-technical client can act on. This is arithmetic on values already extracted — not inference. Rule 0 still applies to the colours themselves.

**What did NOT change:** Rule 0, NOT FOUND / CONFIRMED ABSENT conventions, type-scale consolidation, frequency-derived tokens with counts, the Platform section, or the `:root` block rules.

### BUILD.md — Reconstruction Spec Export (2026-07-24)

**Added:** 2026-07-24 — A third output file, `BUILD.md`, is now generated alongside `design.md` and `blueprint.json`. BUILD.md is a complete specification that an AI website builder (Bolt.new, Lovable, v0, Claude) can execute to reproduce the extracted page. Unlike design.md, which may contain `NOT FOUND` values, BUILD.md must contain NO unresolved values — every token gets a concrete, usable value.

#### Prerequisites: Asset Manifest + Verbatim Text

Two new data sources were added to make BUILD.md possible:

**1. Asset Manifest** (`src/lib/assetExtractor.ts`)

Before HTML cleaning, `extractAssetManifest(rawHtml, pageUrl)` runs in the browser via `DOMParser` and extracts:

- **Logo**: first `<img>` inside `<header>`/`<nav>`, or any `<img>` with 'logo' in src/alt/class
- **Favicon**: from `<link rel="icon">` / `<link rel="shortcut icon">` / `<link rel="apple-touch-icon">`
- **og:image**: from `<meta property="og:image">`
- **All `<img>` elements**: src, alt, width, height — with tracking pixels, spacer GIFs, and images under 32px in both dimensions filtered out
- **CSS background images**: every `url()` from inline `style=` attributes, `<style>` blocks, AND fetched external stylesheets — the manifest is enriched after the CSS fetch phase via `enrichManifestWithCss()`
- **Inline SVGs**: count, plus any fill colors (excluding `none` and `currentColor`)

All relative URLs are resolved to absolute against the page origin. The manifest is formatted by `formatAssetManifestForPrompt()` and injected into the blueprint LLM call as context.

**2. Verbatim Text Blocks** (added to `BLUEPRINT_SYSTEM_PROMPT`)

The blueprint prompt now instructs Claude to reproduce all visible text VERBATIM in its original language — headlines, subheads, body paragraphs, button labels, list items, form labels, nav items, footer text. A new per-section `text_blocks` array captures each text element with its semantic role (`h1`/`h2`/`h3`/`h4`/`paragraph`/`list_item`/`label`/`quote`/`button`) and verbatim content. The existing `headline`/`subheadline`/`body_text` fields are kept — the audit modules depend on them.

A new top-level `global_assets` object (`logo`, `favicon`, `og_image`) is also added to the blueprint JSON.

#### Phase 5 — LLM Call C: Generate BUILD.md (Three-Call Pipeline)

After the blueprint call completes, BUILD.md is generated in **three sequential Claude calls** (`claude-sonnet-4-6`) to avoid truncation on large pages. The outputs are concatenated in order, with the fixed header prepended once at the top.

**Call 1 — Foundation** (`BUILD_SPEC_FOUNDATION_PROMPT`, max_tokens 16000):
- Inputs: `design.md` + screenshot segments
- Produces sections 1–4: Overview, Tech Notes (fonts), tailwind.config.js theme extension, Global CSS

**Call 2 — Sections** (`BUILD_SPEC_SECTIONS_PROMPT`, max_tokens 16000):
- Inputs: `design.md` + `blueprint.json` (with `text_blocks` and `assets`) + screenshot segments + the generated sections 1–4 (for consistent token names)
- Produces section 5: Section-by-Section Build Instructions
- If blueprint.json has more than 8 sections, this call is **batched** in groups of 6 sections each, with sections 1–4 passed as context to every batch. Outputs are concatenated.
- After all batches, every blueprint section index is verified to appear in the output. Missing indices trigger a visible note: `> INCOMPLETO: las secciones N, M no se generaron. Vuelve a ejecutar.`

**Call 3 — Components + Assumptions** (`BUILD_SPEC_COMPONENTS_PROMPT`, max_tokens 16000):
- Inputs: `design.md` + the generated sections 1–5 (so it can collect every ASSUMED marker already emitted)
- Produces sections 6–7: Component Specs (buttons, cards, nav, footer, forms, links, all interactive states) and the consolidated "Assumptions to Verify" table

All three prompts share the same core framing:
- Replace every `NOT FOUND` value in design.md with a sensible default, marked with an `/* ASSUMED — reason */` inline comment
- Derive assumptions in priority order: (1) visual evidence from screenshot, (2) consistency with extracted values, (3) common platform conventions — never from brand name or aesthetic taste
- Carry `CONFIRMED ABSENT` values through as real findings, not assumptions
- The string `NOT FOUND` must never appear in BUILD.md, including inside comments — write `no declarado en el CSS de marca` if an omission needs explaining
- The "Assumptions to Verify" section is MANDATORY — if missing, the document is unusable
- Reproduce all text VERBATIM from blueprint `text_blocks`
- Use exact image URLs from blueprint `assets` — no placeholder substitutions
- Respect every `layout_contract` `must_preserve` and `do_not_do` rule
- Each prompt is told which sections it is responsible for and instructed NOT to emit the others or repeat the header

BUILD.md structure:
1. **Overview** — page purpose, section count, detected stack
2. **Tech Notes — Fonts** — exact loading method per font (Google Fonts `<link>`, `@font-face` URL, or custom/licensed with fallback)
3. **tailwind.config.js Theme Extension** — fully populated JS object with colors, fontFamily, fontSize, spacing, borderRadius, screens (actual breakpoints from design.md, not remapped to Tailwind defaults; desktop-first noted explicitly)
4. **Global CSS** — valid `:root` block, no NOT FOUND, no commented-out tokens
5. **Section-by-Section Build Instructions** — layout contract, verbatim text_blocks, assets with absolute URLs, resolved colors
6. **Component Specs** — every CSS property filled, all interactive states, ASSUMED markers where applicable
7. **Assumptions to Verify** — consolidated table of every ASSUMED value with its reason and the section it appears in

A fixed header is prepended once:

> Generated from an automated extraction. Values marked ASSUMED were not found in the site's CSS and were inferred from the screenshot. Review the "Assumptions to verify" section before building.

#### Truncation Guard and Auto-Continuation

After each Claude call, the API response `stop_reason` is checked. If it is `max_tokens` (indicating the response was truncated mid-generation), the `callWithContinuation()` helper in `src/lib/callClaude.ts` automatically makes a follow-up call with the message "Continue exactly where you left off. Do not repeat any content already written. Do not add a preamble. Resume mid-sentence if necessary." The continuation text is concatenated directly onto the partial response. Up to 2 continuations are allowed per call. Each continuation is logged: `[BUILD.md] {segment} continuation {n} (stop_reason={reason})`.

If `stop_reason` is still `max_tokens` after 2 continuations, the segment is marked incomplete and a visible amber warning appears above the BUILD.md download card: "Advertencia: BUILD.md quedó incompleto. Algunas secciones no se generaron." The file is still delivered — a partial BUILD.md is more useful than none. A truncated BUILD.md is never presented as a successful, complete run.

The `callClaudeWithMeta()` function captures both the streamed text and the `stop_reason` from the `message_delta` SSE event. `callWithContinuation()` wraps it with the auto-continuation logic. The original `callClaude()` wrapper remains for backward compatibility with other callers.

#### Section Completeness Verifier

After the sections call(s) complete, the generated sections text is checked against the blueprint's `sections` array. The verifier reads each section's `section_index` and `section_name` from `blueprint.json` — it does NOT iterate array positions. A section counts as present if either its index (matched as "Section N", "section N", or "Sección N") OR its name appears in the generated text. This dual match prevents false positives from heading format drift.

If sections are missing, the log reports all three sets for debugging:
`[BUILD.md] expected: [...] found: [...] missing: [...]`
The missing section indices are appended to the BUILD.md as an incomplete notice, and `buildMdIncomplete` is set to true.

#### Section Index Normalization

Before the sections call, `blueprint.json` is inspected for any `section_index` value of 0. If found, all section indices are normalized to 1-based (incrementing by 1 with no gaps), and a warning is logged: `[BUILD.md] Normalizing section_index values from 0-based to 1-based`. The normalized blueprint is then passed to the sections prompt.

#### Section Numbering Pinned in Prompts

Two constraints were added to prevent the issue recurring:

1. **BLUEPRINT_SYSTEM_PROMPT** now states: "section_index MUST start at 1 and increment by 1 with no gaps. Never use 0. The navigation and footer are NOT sections — they belong in the `globals` object and must not appear in the sections array."

2. **BUILD_SPEC_SECTIONS_PROMPT** now states: "Use the exact section_index values from blueprint.json in your headings, formatted as '### Section N — Name'. Do not renumber, do not add a 'Section 0', and do not introduce sections that are not in blueprint.json. Navigation and footer are documented under Component Specs in section 6, not as page sections."

### Boot-Only CSS Detection (2026-07-24)

**Added:** 2026-07-24 — The `extract-css` edge function now detects when the captured CSS is insufficient to represent the site's real design system. This addresses JS-driven sites (e.g. zajno.com) where route-split CSS loading means only loader/404/error stylesheets are captured.

#### Detection Criteria

The diagnostics object now includes `cssLooksInsufficient: boolean` and `insufficientReasons: string[]`. The flag is set true when ANY of:

1. `totalCssBytes < 60000` AND the rendered HTML body is over 100KB (a large page cannot be styled by a tiny stylesheet)
2. `customPropertyCount === 0` AND colors found < 8
3. Over 60% of matched selectors are scoped to loader/error/404 patterns: `/^#?_?404/`, `/^#lo/`, `/^\._i/`, `/^#co-bg/`, `/loading/`, `/preload/`, `/splash/`
4. No selector in the CSS matches any class or id present in the rendered HTML body (strong signal the CSS is for a different view)

#### UI Warning

When `cssLooksInsufficient` is true, a prominent orange warning box appears (visually distinct from the red WAF-block warning):

> 'Advertencia: el sitio carga sus estilos dinámicamente (JavaScript). Solo se capturó una parte mínima del CSS. El análisis de diseño NO es confiable — los valores deben verificarse manualmente.'

The warning includes the specific `insufficientReasons` as a bulleted list. The existing `cssDegraded` flag now also fires on `cssLooksInsufficient`.

### Blueprint-Derived Overview in BUILD.md (2026-07-24)

**Added:** 2026-07-24 — The BUILD.md Overview section is now derived from `blueprint.json` instead of the screenshot. This prevents hallucinated page purposes (e.g. describing a camera product page when the site is a design studio).

- `BUILD_SPEC_FOUNDATION_PROMPT` now states: "The Overview section MUST be derived from blueprint.json — its page_title, its section names, and its section roles. Do NOT infer what the page is from the screenshot. A screenshot segment may show a single project thumbnail or a partial view and is not evidence of the page's purpose. Section count comes from blueprint.json's sections array — never from what is visible in a screenshot segment."
- `blueprint.json` is now passed to the foundation call via `buildFoundationUserPrompt(designMd, blueprintJson)`.

### Assumption Ratio Guard (2026-07-24)

**Added:** 2026-07-24 — After BUILD.md is assembled, the document is scanned for `ASSUMED` markers vs. values traced to real CSS. If assumptions exceed 60% of all values:

1. A warning block is prepended to the BUILD.md header: '> ⚠ ADVERTENCIA: N de M valores en este documento son SUPUESTOS, no extraídos del CSS del sitio.'
2. The same warning appears in the UI above the download card as an orange box.

All three BUILD_SPEC prompts now include: "If the supplied design.md contains a warning that its tokens do not represent the site's real design system, repeat that warning verbatim at the top of your output. Do not build a confident specification on unreliable input."

### Duplicate Assumptions Section Fix (2026-07-24)

**Fixed:** 2026-07-24 — The 'Assumptions to Verify' section was appearing twice — once from the foundation call and once from the components call. Now:

- `BUILD_SPEC_FOUNDATION_PROMPT` and `BUILD_SPEC_SECTIONS_PROMPT` both state: "Do NOT write an 'Assumptions to Verify' section. Mark assumptions inline with /* ASSUMED — reason */ only. The consolidated table is written exclusively by the final components call."
- The components call collects assumptions from ALL preceding segments, which it already receives as context.

### Assumptions Strip — Bold Format Support (2026-07-25)

**Fixed:** 2026-07-25 — The duplicate-assumptions stripper only matched markdown headings (`^#{1,4}\s+Assumptions to Verify`). A duplicate block formatted as bold text (e.g. `**Assumptions to verify — consolidated index**`) slipped through and appeared in the final BUILD.md.

The strip logic now:

- Matches BOTH markdown headings AND bold lines containing `/assumptions?\s+to\s+verify/i`.
- Removes everything from the heading/bold line up to the next markdown heading (or end of text), for both formats.
- Keeps only the LAST assumptions block regardless of whether it is a heading or bold.
- Logs which format was stripped and how many blocks were found: `[BUILD.md] N "Assumptions to Verify" blocks found (X heading, Y bold) — stripping all but the last`.

### design.md Pipeline Trace Logging (2026-07-25)

**Added:** 2026-07-25 — Before each downstream LLM call that consumes `design.md` (foundation, sections, components), a console log now traces the design.md string being passed:

```
[pipeline] design.md -> {stage}: {length} chars, starts "{first 60 chars}"
```

This confirms the FULL generated design.md string reaches every downstream call — not a placeholder, truncated summary, or hardcoded stub. A search of the codebase confirmed no hardcoded stub design.md template exists. The blueprint call (which runs first, before design.md is generated) is also traced to make its actual inputs visible.

### design.md Blueprint Context (2026-07-24)

**Added:** 2026-07-24 — `DESIGN_SYSTEM_PROMPT` now includes two new critical rules:

1. **Blueprint Context**: "You are given the blueprint for this page. Use its page_title for the document title and its sections to understand what the page actually is. Never write '[Brand Name — NOT FOUND]' when the blueprint supplies a title."

2. **Boot-Only CSS Warning**: "If the supplied CSS is dominated by loader, 404, or error-state selectors, say so explicitly at the top of the Platform section: 'ADVERTENCIA: el CSS capturado corresponde principalmente a estados de carga y error, no al diseño real de la página. Los tokens a continuación NO representan el sistema de diseño del sitio.' Do not present 404-page tokens as the site's design system."

#### Build Target Selector

A target selector appears above the results with two options:
- **React / Tailwind** (default, active) — generates all three files
- **WordPress + Elementor** (disabled, labeled "Próximamente")

Only the React/Tailwind target produces BUILD.md output. The `buildTarget` state controls whether Phase 5 runs.

#### Failure Handling

If the BUILD.md generation fails entirely (all three calls), `design.md` and `blueprint.json` are still delivered. An amber notice appears: "BUILD.md no pudo generarse — design.md y blueprint.json están disponibles." The third file is additive and never breaks the first two.

If some calls succeed but others fail or truncate, the concatenated partial BUILD.md is delivered with the truncation warning described above.

#### UI Changes

- Progress bar now shows 5 phases (added: "Phase 5 — Generate BUILD.md")
- A third output panel appears for BUILD.md with Copy and Download buttons (filename: `{site}-BUILD.md`)
- A "Copiar todo para el builder" button copies a clipboard payload containing the builder instruction preamble, BUILD.md, and blueprint.json in a fenced code block
- The "Download Both Files" button is now "Download All Files" and triggers sequential downloads of all available files
- The header subtitle now mentions three outputs instead of two

#### Files

| File | Purpose |
|------|---------|
| `src/lib/assetExtractor.ts` | New — extracts asset manifest (logo, favicon, og:image, images, background images, SVGs) from raw HTML before cleaning; resolves all URLs to absolute; `enrichManifestWithCss()` adds background images from fetched external CSS |
| `src/lib/prompts/buildSpecPrompt.ts` | Modified — replaced single `BUILD_SPEC_SYSTEM_PROMPT` with three split prompts: `BUILD_SPEC_FOUNDATION_PROMPT` (sections 1–4), `BUILD_SPEC_SECTIONS_PROMPT` (section 5), `BUILD_SPEC_COMPONENTS_PROMPT` (sections 6–7), plus matching user-prompt builders. Shared core framing, NOT FOUND ban, mandatory Assumptions section |
| `src/lib/prompts/designExtractionPrompts.ts` | Modified — added verbatim text instruction, `text_blocks` and `assets` arrays to blueprint schema, `global_assets` object, `assetManifest` parameter to `buildBlueprintUserPrompt()` |
| `src/components/DesignExtractor.tsx` | Modified — imports, `BuildTarget` type, `buildTarget` state, asset extraction call, Phase 5 three-call pipeline with batching + truncation guard, `buildMdIncomplete` flag, incomplete warning UI, build target selector UI, BUILD.md output panel, copy-all button, 5-phase progress bar |

#### What Did NOT Change

- `design.md` and `blueprint.json` remain canonical and target-agnostic — BUILD.md reads them but never alters extraction
- Rule 0, NOT FOUND, CONFIRMED ABSENT conventions
- Platform detection, frequency analysis, type-scale consolidation
- The blueprint's null + `background_tone` behaviour
- Screenshot segmentation and the screenshot passed to Claude

---

## SEO Intelligence — Schema Cleanup / Orphan Detector

**Added:** 2026-07-15

A new SEO Intelligence module (id: `schemacleanup`) that detects **orphan and duplicate JSON-LD blocks** at the page level. Unlike the existing Schema.org Validator (which validates each JSON-LD object in isolation), this module identifies leftover blocks injected by page builders or old plugins that are technically valid JSON but structurally unwanted — duplicate FAQPage nodes, FAQPage blocks without `@id`, blocks referencing deprecated URL paths, or blocks that are not the site's canonical managed schema.

### Detection Rules

For each URL (up to 100), the module fetches the raw HTML and extracts every `<script type="application/ld+json">` block. Each block captures its `index`, its `id=` attribute (if any), and the list of `@type` values found (handling `@graph` arrays and top-level arrays; `@type` may be a string or string[]).

| Flag | Trigger |
|------|---------|
| `DUPLICATE_BLOCK` | `blockCount > 1` AND at least one block has an `id` different from the configured managed block id. Only raised when a managed block id is configured. |
| `MISSING_MANAGED_BLOCK` | Managed block id is configured but no block on the page carries that id. |
| `FAQ_NO_ID` | Any FAQPage node is missing, null, or has an empty `@id`. |
| `STRAY_FAQPAGE` | A FAQPage node exists on a URL not in the configured legit FAQ URL list. Only raised when the legit FAQ list is non-empty. |
| `DEPRECATED_PATH` | Any configured deprecated path fragment (e.g. `/en/`) appears anywhere in the raw JSON-LD text of the page. |

### Verdict Logic

- **CLEAN** — no flags
- **REVIEW** — only `DUPLICATE_BLOCK` and/or `MISSING_MANAGED_BLOCK`
- **CLEANUP** — any of `FAQ_NO_ID`, `STRAY_FAQPAGE`, `DEPRECATED_PATH`

### Configuration Panel

A collapsible config panel at the top of the module (open by default) exposes three optional inputs:

- **Managed block id** — text input. The `id=` attribute on your canonical JSON-LD script tag. Blocks with a different id are flagged as duplicates.
- **Legit FAQ URLs** — textarea, one URL per line. FAQPage blocks found on other URLs are flagged as `STRAY_FAQPAGE`.
- **Deprecated path fragments** — comma-separated text (default: `/en/`). Any JSON-LD block containing these strings is flagged as `DEPRECATED_PATH`.

All config fields are optional. With no config, the module still runs and reports `blockCount` and `CLEAN` verdict for single-block pages — no false positives.

### UI

- Summary cards: Total Pages, Clean (green), Review (yellow), Needs Cleanup (red)
- "Show only issues" checkbox filters the table to non-CLEAN rows
- Table columns: expand chevron, URL (link), Blocks (count; bold red if >1), Detected Types (blue chips), Verdict badge
- Expanded row shows flag chips with human-readable labels and a list of each block's index/id/types

### CSV Export

Columns: URL, Block Count, Verdict, Orphan Flags (pipe-joined). Filename: `{domain}-schema-orphans-{timestamp}.csv`.

### Files

| File | Purpose |
|------|---------|
| `supabase/functions/detect-schema-orphans/index.ts` | Edge function — fetches HTML via firecrawl-proxy (fallback: direct fetch), parses JSON-LD blocks, applies detection rules, saves to `seo_intelligence_results` with module `schema_cleanup` |
| `src/components/seo-intelligence/SchemaOrphanDetector.tsx` | React component — forwardRef with `runAnalysis`, `getResults`, `isLoading`, `exportToCSV` handle; config panel; summary cards; expandable table |
| `src/components/seo-intelligence/ModuleSelector.tsx` | Module registry — added `schemacleanup` entry |
| `src/components/seo-intelligence/SEOIntelligence.tsx` | Wired: import, ref, state, run sequence, module name map, JSX card |

---

## Thin Content Detector (SEO Intelligence Module)

**Added:** 2026-07-15

A new SEO Intelligence module (`id: 'thincontent'`) that flags pages with little or no real content. Useful for identifying empty CPT/archive pages (e.g. thin testimonial or taxonomy pages) even on sites where direct CMS access is unavailable.

### Detection Logic

All fetching is done client-side using `scrapeFullPage` from `src/lib/firecrawl.ts`, in batches of 3 with a 1500 ms inter-batch delay and retry-on-429 (up to 3 retries with exponential backoff at 2 s / 4 s / 8 s), mirroring the pattern in `htmlDownload.ts`.

1. The raw HTML is parsed with `DOMParser`.
2. **Noise removal:** a clone of the document body is stripped of `nav`, `header`, `footer`, `aside`, `script`, `style`, `noscript` tags, and any element whose `class` or `id` attribute contains: `menu`, `navbar`, `nav`, `header`, `footer`, `sidebar`, `widget`, `cookie`, `breadcrumb`.
3. **Main content isolation:** prefers text found inside `<main>`, `<article>`, or `[role="main"]` if present; otherwise uses the stripped `<body>`.
4. **Word counts:** content words (from isolated main content) and total words (from raw body before stripping).
5. **Verdict** based on configurable thresholds (defaults):
   - `contentWords > 150` → **CONTENT** (green)
   - `50 ≤ contentWords ≤ 150` → **THIN** (yellow)
   - `contentWords < 50` → **EMPTY** (red)

### Configuration Panel (collapsible)

Two number inputs:
- **Thin threshold** (default 150): pages above this value are CONTENT.
- **Empty threshold** (default 50): pages below this value are EMPTY; between the two thresholds is THIN.

### Results UI

- **In-progress indicator** with a progress bar showing pages analyzed.
- **Summary cards:** Total / Content / Thin / Empty.
- **"Show only issues" checkbox** (hides CONTENT verdicts).
- **Table columns:** expand toggle, URL (link), Content Words (bold red if below empty threshold), Total Words, Verdict badge.
- **Expand row:** shows content words, total words, and boilerplate ratio.
- **Export CSV** button: columns URL, contentWords, totalWords, verdict.

### HTML Downloader Integration

In the Crawled URLs section toolbar, a new **"Exclude empty/thin"** checkbox appears next to the Download HTML button. When checked and a Thin Content result exists for the current crawl, any selected URL whose verdict is THIN or EMPTY is removed from the download list before calling `downloadHtmlFiles`. The checkbox is disabled (greyed out, tooltip "Run Thin Content Detector first") when no thin content results are available.

### Files

| File | Purpose |
|------|---------|
| `src/components/seo-intelligence/ThinContentDetector.tsx` | React component — forwardRef with `runAnalysis`, `getResults`, `isLoading`, `exportToCSV` handle; config panel; in-progress bar; summary cards; expandable table |
| `src/components/seo-intelligence/ModuleSelector.tsx` | Module registry — added `thincontent` entry (`requiresFullScrape: true`) |
| `src/components/seo-intelligence/SEOIntelligence.tsx` | Wired: import, ref, state (including reset), run sequence, module name map, JSX card; `excludeThinPages` state + filtering in `startHtmlDownload`; checkbox in toolbar |

---

## Website Crawler — Discovery Telemetry Persistence

**Added:** 2026-07-23
**Migration:** `add_discovery_telemetry_to_crawls`
**Components:** `src/components/Crawler.tsx`, `src/components/SavedCrawls.tsx`

### Problem

The four-tier discovery architecture (map, html-harvest, deep-crawl, reconciliation) introduced `discoveryMethod` and `sitemapGap` as in-memory state. These values were lost when the user navigated away or discarded a crawl. There was no way to review which discovery tier was used across past crawls, or how often the JS/SPA toggle was flipped on — making it impossible to decide the toggle's fate with data.

### Migration (Part A)

Three nullable columns were added to the `crawls` table via `add_discovery_telemetry_to_crawls`, each guarded with an `IF NOT EXISTS` check in a `DO $` block:

| Column | Type | Description |
|---|---|---|
| `discovery_method` | text | Which tier produced the final URL list: `'map'`, `'html-harvest'`, or `'deep-crawl'`. NULL for crawls that predate the feature. |
| `jsspa_manual` | boolean | `true` when the user manually flipped the JS/SPA toggle on. NULL for crawls that predate the feature. |
| `sitemap_gap` | jsonb | `{ claimed: number, found: number, missing: string[] }` or null. Captures pages found on the site but not in the sitemap. |

All three are nullable with no default. Existing rows stay NULL — correct, since they predate the feature. No RLS policies were added or modified; the existing crawls policies already scope by `user_id` and cover these columns.

### Write on Every Crawl (Part B)

In `handleCrawl()`, immediately after discovery and reconciliation complete and before `showSuccess()`, the crawl row is updated with telemetry:

```typescript
if (user && currentCrawlId) {
  await supabase.from('crawls').update({
    discovery_method: discoveryMethod,
    jsspa_manual: jsSpa,
    sitemap_gap: sitemapGap,
    total_urls: results.length,
    updated_at: new Date().toISOString(),
  }).eq('id', currentCrawlId);
}
```

Key decisions:
1. **Write at crawl time, not save time.** `handleSave()` only runs when the user clicks Save; writing at crawl time captures every crawl including discarded ones.
2. **Wrapped in try/catch.** A telemetry write failure is logged to `console.error` and never surfaces an error to the user or interrupts the crawl.
3. **`handleSave()` unchanged.** It continues to set `name` and `total_urls` as before — that still runs when the user names and saves a crawl.

### Surface in Saved Crawls (Part C)

In `SavedCrawls.tsx`, `discovery_method` and `sitemap_gap` are included in the mapping from crawl rows to `SavedItem` objects. Each crawl row shows:

1. **Discovery method badge** — a small neutral badge next to the existing type badge:
   - `'map'` → `Sitemap`
   - `'html-harvest'` → `Enlaces`
   - `'deep-crawl'` → `Profundo`
   - `null` → no badge rendered

2. **Sitemap gap indicator** — if `sitemap_gap` is non-null and `sitemap_gap.missing.length > 0`, a small amber warning icon with the count is shown, with a tooltip: `"N página(s) no listadas en el sitemap"`.

Both are visually minimal — diagnostic signals for the operator, not client-facing elements.

### What Did Not Change (Part D)

- The four-tier discovery logic itself
- Existing token-tracking writes (`updateTokensInDatabase`)
- The initial `crawls` insert at the top of `handleCrawl`
- Any existing RLS policies

### Files Changed

| File | Change |
|---|---|
| `supabase/migrations/<timestamp>_add_discovery_telemetry_to_crawls.sql` | New migration — adds three nullable columns |
| `src/lib/supabase.ts` | Added `SitemapGap` interface; added `discovery_method`, `jsspa_manual`, `sitemap_gap` to `Crawl` and `SavedItem` interfaces |
| `src/components/Crawler.tsx` | Telemetry write in `handleCrawl()` after discovery completes |
| `src/components/SavedCrawls.tsx` | Discovery method badge + sitemap gap warning indicator on each crawl row |
