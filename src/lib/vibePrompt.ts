export type VibeTarget = 'lovable' | 'bolt' | 'v0' | 'claude-design' | 'replit' | 'generic';

export const VIBE_TARGETS: { id: VibeTarget; label: string }[] = [
  { id: 'lovable', label: 'Lovable' },
  { id: 'bolt', label: 'Bolt' },
  { id: 'v0', label: 'v0' },
  { id: 'claude-design', label: 'Claude Design' },
  { id: 'replit', label: 'Replit' },
  { id: 'generic', label: 'Any' },
];

export type BuildOutputTarget = 'react-tailwind' | 'plain-html';

interface VibePromptInput {
  buildMd: string;
  blueprintJson: string;
  provenance: string | null;
}

// ─── Regex helpers (extract real design tokens from BUILD.md) ─────────────────

function extractRootBlock(buildMd: string): string {
  const m = buildMd.match(/```(?:css)?\s*\n?\s*(:root|html)\s*\{([\s\S]*?)\}\s*\n?```/);
  if (m) return `${m[1]} {${m[2]}}`;
  const loose = buildMd.match(/(:root|html)\s*\{([\s\S]*?)\}/);
  return loose ? `${loose[1]} {${loose[2]}}` : '';
}

function extractColors(buildMd: string): { name: string; value: string }[] {
  const colors: { name: string; value: string }[] = [];
  const seen = new Set<string>();
  const rootBlock = extractRootBlock(buildMd);
  const colorRe = /--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/g;
  let m: RegExpExecArray | null;
  while ((m = colorRe.exec(rootBlock)) !== null) {
    const key = `${m[1]}:${m[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      colors.push({ name: `--${m[1]}`, value: m[2] });
    }
  }
  return colors;
}

const SYSTEM_FONT_NAMES = ['SF NS', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Segoe UI'];

function isStandaloneSystemFont(value: string): boolean {
  const v = value.trim().toLowerCase();
  return SYSTEM_FONT_NAMES.some(n => v === n.toLowerCase());
}

function stripSystemFonts(families: string[]): string[] {
  return families.filter(f => !isStandaloneSystemFont(f));
}

function extractLoadableFamilyNames(families: string[]): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const stack of families) {
    const parts = stack.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    for (const part of parts) {
      if (isStandaloneSystemFont(part)) continue;
      const key = part.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        names.push(part);
      }
    }
  }
  return names;
}

interface FontData {
  families: string[];
  weights: string[];
  headingSizes: string[];
}

function extractFonts(buildMd: string): FontData {
  const rootBlock = extractRootBlock(buildMd);
  const families: string[] = [];
  const weights: string[] = [];
  const headingSizes: string[] = [];
  const seenFamily = new Set<string>();
  const seenWeight = new Set<string>();
  const seenSize = new Set<string>();
  let m: RegExpExecArray | null;

  const familyRe = /--(?:font-family|heading-font|body-font|font-[\w-]*family)\s*:\s*([^;]+);/g;
  while ((m = familyRe.exec(rootBlock)) !== null) {
    const f = m[1].trim();
    if (!seenFamily.has(f)) { seenFamily.add(f); families.push(f); }
  }
  const inlineFamilyRe = /font-family\s*:\s*([^;]+);/g;
  while ((m = inlineFamilyRe.exec(buildMd)) !== null) {
    const f = m[1].trim();
    if (!seenFamily.has(f)) { seenFamily.add(f); families.push(f); }
  }

  const weightRe = /font-weight\s*:\s*(\d+)/g;
  while ((m = weightRe.exec(rootBlock)) !== null) {
    const w = m[1];
    if (!seenWeight.has(w)) { seenWeight.add(w); weights.push(w); }
  }
  while ((m = weightRe.exec(buildMd)) !== null) {
    const w = m[1];
    if (!seenWeight.has(w)) { seenWeight.add(w); weights.push(w); }
  }

  const headingSizeRe = /(?:h[1-6][^{]*\{|\.heading|\.title|--heading-[\w-]*size|--font-size-heading)\s*[^}]*?font-size\s*:\s*([^;}]+)/g;
  while ((m = headingSizeRe.exec(buildMd)) !== null) {
    const s = m[1].trim();
    if (!seenSize.has(s)) { seenSize.add(s); headingSizes.push(s); }
  }
  const headingVarRe = /--(?:heading-[\w-]*|h[1-6]-[\w-]*)\s*:\s*([^;]+);/g;
  while ((m = headingVarRe.exec(rootBlock)) !== null) {
    const s = m[1].trim();
    if (/px|rem|em/.test(s) && !seenSize.has(s)) { seenSize.add(s); headingSizes.push(s); }
  }

  return { families: stripSystemFonts(families), weights, headingSizes };
}

function extractImageUrls(buildMd: string, blueprintJson: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const urlRe = /https?:\/\/[^\s"'`)\]]+\.(?:png|jpg|jpeg|gif|webp|svg|avif|ico)/gi;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(buildMd)) !== null) {
    if (!seen.has(m[0])) {
      seen.add(m[0]);
      urls.push(m[0]);
    }
  }
  while ((m = urlRe.exec(blueprintJson)) !== null) {
    if (!seen.has(m[0])) {
      seen.add(m[0]);
      urls.push(m[0]);
    }
  }
  return urls;
}

function extractSectionNames(blueprintJson: string): string[] {
  try {
    const bp = JSON.parse(blueprintJson);
    if (bp.sections && Array.isArray(bp.sections)) {
      return bp.sections.map((s: { section_name?: string; name?: string; section_index?: number }, i: number) =>
        s.section_name || s.name || `Section ${s.section_index ?? i + 1}`
      );
    }
  } catch { /* not valid JSON */ }
  return [];
}

function extractLayoutContracts(blueprintJson: string): string[] {
  try {
    const bp = JSON.parse(blueprintJson);
    if (bp.sections && Array.isArray(bp.sections)) {
      return bp.sections
        .filter((s: { layout_contract?: unknown }) => s.layout_contract)
        .map((s: { section_name?: string; name?: string; layout_contract?: { must_preserve?: string[]; do_not_do?: string[] } }) => {
          const name = s.section_name || s.name || 'Section';
          const parts: string[] = [];
          if (s.layout_contract?.must_preserve?.length) {
            parts.push(`must_preserve: ${s.layout_contract.must_preserve.join(', ')}`);
          }
          if (s.layout_contract?.do_not_do?.length) {
            parts.push(`do_not_do: ${s.layout_contract.do_not_do.join(', ')}`);
          }
          return parts.length ? `${name} — ${parts.join(' | ')}` : '';
        })
        .filter(Boolean);
    }
  } catch { /* not valid JSON */ }
  return [];
}

function hasAssumptions(buildMd: string): boolean {
  return /ASSUMED/i.test(buildMd);
}

function isCrossSite(provenance: string | null): boolean {
  if (!provenance) return false;
  return /diferentes sitios|different sites|diseño.*estructura|design.*structure/i.test(provenance);
}

// ─── Shared mandatory rules ──────────────────────────────────────────────────

const MANDATORY_RULES = `
## MANDATORY RULES (non-negotiable)

1. EXACT IMAGES: Use ONLY the image URLs listed below. They are real, public, absolute URLs extracted from the original page. NEVER use placehold.co, stock photos, AI-generated images, or any placeholder. If an image URL is broken, leave the <img> tag with the original URL — do not substitute.

2. EXACT COPY: Use the EXACT text from the specification. Do not rewrite, translate, shorten, or improve any text. Do NOT write "lorem ipsum". Do NOT write "placeholder text here". Do NOT write "write copy that fits" or any instruction to generate copy — the copy already exists in the spec, use it verbatim.

3. EXACT SECTIONS: Build the EXACT sections listed below, in the exact order given. Do NOT substitute a generic Hero/Features/Testimonials/CTA template. If the section list below is empty or says "no sections available", say so explicitly — do not invent a section list.

4. LAYOUT CONTRACTS: Respect every layout_contract rule (must_preserve and do_not_do) from the blueprint. These are hard constraints, not suggestions.

5. ASSUMED VALUES: Values marked ASSUMED in the spec are the best available estimates. Use them as given. Do not treat them as license to redesign or "improve" the design. If you disagree with an assumed value, use it anyway — the spec is authoritative.`;

// ─── Per-platform formatters ─────────────────────────────────────────────────

function formatColors(colors: { name: string; value: string }[]): string {
  if (colors.length === 0) return '(No color tokens extracted from :root — refer to BUILD.md for full design system)';
  return colors.map(c => `  ${c.name}: ${c.value};`).join('\n');
}

function formatFonts(fontData: FontData): string {
  const lines: string[] = [];
  const { families, weights, headingSizes } = fontData;
  if (families.length === 0) {
    lines.push('Font families: (No font families extracted — refer to BUILD.md for full font stack)');
  } else {
    lines.push(`Font families: ${families.join(', ')}`);
    const loadable = extractLoadableFamilyNames(families);
    if (loadable.length > 0) {
      lines.push(`Load from Google Fonts: ${loadable.join(', ')}`);
    }
  }
  if (weights.length > 0) {
    lines.push(`Font weights: ${weights.join(', ')}`);
  }
  if (headingSizes.length > 0) {
    lines.push(`Heading sizes: ${headingSizes.join(', ')}`);
  }
  return lines.join('\n');
}

function formatImages(urls: string[]): string {
  if (urls.length === 0) return '(No image URLs found in spec — do not add any images)';
  return urls.map(u => `  - ${u}`).join('\n');
}

function formatSections(sections: string[]): string {
  if (sections.length === 0) return '(No sections available — the blueprint did not provide a section list. Do not invent sections.)';
  return sections.map((s, i) => `  ${i + 1}. ${s}`).join('\n');
}

function formatContracts(contracts: string[]): string {
  if (contracts.length === 0) return '(No layout contracts found in blueprint)';
  return contracts.map(c => `  - ${c}`).join('\n');
}

function buildOutputFormatNote(target: BuildOutputTarget): string {
  if (target === 'plain-html') {
    return `\n## OUTPUT FORMAT (HTML único)\nProduce ONE self-contained \`index.html\` file that works opened directly in a browser (no server, no build step).\n- ALL CSS goes in a single \`<style>\` block inside \`<head>\`. Do NOT use Tailwind, React, or any framework. Do NOT link external stylesheets (no CDN stylesheets).\n- Put design.md's tokens in a \`:root\` block at the top of the \`<style>\` and reference those CSS variables throughout (e.g. \`color: var(--brand)\`). Do NOT use Tailwind utility classes.\n- Load fonts via \`<link>\` tags in \`<head>\` (Google Fonts or the original font CDN). No other external stylesheets.\n- Write semantic HTML: \`<header>\`, \`<main>\`, \`<section>\`, \`<footer>\`, \`<nav>\`, \`<article>\`.\n- Hand-write all CSS — no preprocessor, no utility framework.\n- Any JavaScript goes in a single \`<script>\` at the end of \`<body>\`.`;
  }
  return `\n## OUTPUT FORMAT (React + Tailwind)\nProduce a React + Tailwind CSS project. Provide a \`tailwind.config.js\` with the theme extension from the spec, and component files for each section. Use the CSS custom properties from the :root block as Tailwind theme values.`;
}

function buildLovablePrompt(input: VibePromptInput, target: BuildOutputTarget): string {
  const colors = extractColors(input.buildMd);
  const fonts = extractFonts(input.buildMd);
  const images = extractImageUrls(input.buildMd, input.blueprintJson);
  const sections = extractSectionNames(input.blueprintJson);
  const contracts = extractLayoutContracts(input.blueprintJson);
  const hasAssumed = hasAssumptions(input.buildMd);
  const fontsBlock = formatFonts(fonts);

  return `# Rebuild Prompt — Lovable

## PURPOSE
Rebuild the page described in the specification below, faithfully and exactly. Do not redesign, do not improve, do not add your own aesthetic opinion.

## DESIGN SYSTEM (from real CSS)
\`\`\`css
:root {
${formatColors(colors)}
}
\`\`\`
Fonts:
${fontsBlock}
${hasAssumed ? '\nNote: Some values in the spec are marked ASSUMED — they were inferred visually, not from CSS. Use them as given.' : ''}

## SECTIONS (build in this exact order)
${formatSections(sections)}

## LAYOUT CONTRACTS
${formatContracts(contracts)}

## IMAGE URLS (use these exact URLs in <img> tags)
${formatImages(images)}
${MANDATORY_RULES}
${buildOutputFormatNote(target)}

## LOVABLE-SPECIFIC INSTRUCTIONS
- Build one component per section, in the order listed above.
- Define CSS variables in a global stylesheet matching the :root block provided.
- Use Lovable's component structure: each section is a separate React component file.
- Import the design tokens as CSS variables, not hardcoded values.
${isCrossSite(input.provenance) ? '\n## CROSS-SITE CAUTION\nThe design and structure were extracted from DIFFERENT sites. The visual design (colors, fonts, spacing) comes from one source, and the page structure (sections, text, images) comes from another. Apply the design system to the structure faithfully — do not mix up which site each came from.' : ''}`;
}

function buildBoltPrompt(input: VibePromptInput, target: BuildOutputTarget): string {
  const colors = extractColors(input.buildMd);
  const fonts = extractFonts(input.buildMd);
  const images = extractImageUrls(input.buildMd, input.blueprintJson);
  const sections = extractSectionNames(input.blueprintJson);
  const contracts = extractLayoutContracts(input.blueprintJson);
  const hasAssumed = hasAssumptions(input.buildMd);
  const fontsBlock = formatFonts(fonts);

  return `# Rebuild Prompt — Bolt

## PROJECT FRAMING
Build a complete project that reproduces the page described in the specification below. The project should be a single-page application using Vite + React + Tailwind CSS (or a single index.html if plain HTML was requested). Do not redesign or improve — reproduce faithfully.

## DESIGN SYSTEM (from real CSS)
\`\`\`css
:root {
${formatColors(colors)}
}
\`\`\`
Fonts:
${fontsBlock}
${hasAssumed ? '\nNote: Some values are marked ASSUMED — inferred visually, not from CSS. Use them as given.' : ''}

## SECTIONS (build in this exact order)
${formatSections(sections)}

## LAYOUT CONTRACTS
${formatContracts(contracts)}

## IMAGE URLS (use these exact URLs)
${formatImages(images)}
${MANDATORY_RULES}
${buildOutputFormatNote(target)}

## BOLT-SPECIFIC INSTRUCTIONS
- Frame this as a full project: provide the full file structure (package.json, vite.config, tailwind.config, src/ files).
- If React/Tailwind: use a Vite structure with index.html as the entry point.
- If plain HTML: produce a single index.html with inline <style> containing the :root block.
- Each section should be its own component or clearly delimited block.
${isCrossSite(input.provenance) ? '\n## CROSS-SITE CAUTION\nDesign and structure came from different sites. Apply the design system to the structure faithfully.' : ''}`;
}

function buildV0Prompt(input: VibePromptInput, target: BuildOutputTarget): string {
  const colors = extractColors(input.buildMd);
  const fonts = extractFonts(input.buildMd);
  const images = extractImageUrls(input.buildMd, input.blueprintJson);
  const sections = extractSectionNames(input.blueprintJson);
  const contracts = extractLayoutContracts(input.blueprintJson);
  const hasAssumed = hasAssumptions(input.buildMd);
  const fontsBlock = formatFonts(fonts);

  return `# Rebuild Prompt — v0

## PURPOSE
Rebuild the page described in the specification below as a set of React components using shadcn/ui primitives and Tailwind CSS. Do not redesign — reproduce faithfully.

## DESIGN SYSTEM (from real CSS)
\`\`\`css
:root {
${formatColors(colors)}
}
\`\`\`
Fonts:
${fontsBlock}
${hasAssumed ? '\nNote: Some values are marked ASSUMED. Use them as given.' : ''}

## SECTIONS (build in this exact order)
${formatSections(sections)}

## LAYOUT CONTRACTS
${formatContracts(contracts)}

## IMAGE URLS (use these exact URLs)
${formatImages(images)}
${MANDATORY_RULES}
${buildOutputFormatNote(target)}

## V0-SPECIFIC INSTRUCTIONS
- Use shadcn/ui components as the base (Button, Card, Input, etc.) and style them with the design tokens above.
- Each section is a component. Map the section list 1:1 to components.
- Use Tailwind utility classes derived from the CSS variables in the :root block.
- Do not add shadcn defaults that contradict the spec (e.g., don't use shadcn's default border radius if the spec says 0px).
${isCrossSite(input.provenance) ? '\n## CROSS-SITE CAUTION\nDesign and structure came from different sites. Apply the design system to the structure faithfully.' : ''}`;
}

function buildClaudeDesignPrompt(input: VibePromptInput, target: BuildOutputTarget): string {
  const colors = extractColors(input.buildMd);
  const fonts = extractFonts(input.buildMd);
  const images = extractImageUrls(input.buildMd, input.blueprintJson);
  const sections = extractSectionNames(input.blueprintJson);
  const contracts = extractLayoutContracts(input.blueprintJson);
  const hasAssumed = hasAssumptions(input.buildMd);
  const fontsBlock = formatFonts(fonts);

  return `# Rebuild Prompt — Claude Design

## VISUAL ARTIFACT SPECIFICATION
You are rebuilding a page from a detailed design specification extracted from a real website. Your goal is to match the specification exactly — every color, font, spacing value, and section must come from the spec, not from your own design judgment. This is a faithful reproduction, not a creative redesign.

## DESIGN SYSTEM (from real CSS — match these exactly)
\`\`\`css
:root {
${formatColors(colors)}
}
\`\`\`
Fonts:
${fontsBlock}
${hasAssumed ? '\nNote: Values marked ASSUMED were inferred visually. They are the best available estimate — use them as given, do not substitute your own.' : ''}

## SECTIONS (build in this exact order)
${formatSections(sections)}

## LAYOUT CONTRACTS
${formatContracts(contracts)}

## IMAGE URLS (use these exact URLs — they are real, public images from the original page)
${formatImages(images)}
${MANDATORY_RULES}
${buildOutputFormatNote(target)}

## CLAUDE-DESIGN-SPECIFIC INSTRUCTIONS
- Treat this as a visual artifact: the output should look as close to the original page as possible.
- Match the spec exactly — do not "improve" spacing, colors, or typography.
- If the spec says a value is ASSUMED, use it. Do not second-guess visual inferences.
- Every section in the list must appear in the output, in order, with the exact text from the spec.
${isCrossSite(input.provenance) ? '\n## CROSS-SITE CAUTION\nDesign and structure came from different sites. Apply the design system to the structure faithfully.' : ''}`;
}

function buildReplitPrompt(input: VibePromptInput, target: BuildOutputTarget): string {
  const colors = extractColors(input.buildMd);
  const fonts = extractFonts(input.buildMd);
  const images = extractImageUrls(input.buildMd, input.blueprintJson);
  const sections = extractSectionNames(input.blueprintJson);
  const contracts = extractLayoutContracts(input.blueprintJson);
  const hasAssumed = hasAssumptions(input.buildMd);
  const fontsBlock = formatFonts(fonts);

  return `# Rebuild Prompt — Replit

## PROJECT FRAMING
Build a complete project that reproduces the page described in the specification below. The project should be a full single-page application using Vite + React + Tailwind CSS (or a single index.html if plain HTML was requested). Do not redesign or improve — reproduce faithfully.

## DESIGN SYSTEM (from real CSS)
\`\`\`css
:root {
${formatColors(colors)}
}
\`\`\`
Fonts:
${fontsBlock}
${hasAssumed ? '\nNote: Some values are marked ASSUMED — inferred visually, not from CSS. Use them as given.' : ''}

## SECTIONS (build in this exact order)
${formatSections(sections)}

## LAYOUT CONTRACTS
${formatContracts(contracts)}

## IMAGE URLS (use these exact URLs)
${formatImages(images)}
${MANDATORY_RULES}
${buildOutputFormatNote(target)}

## REPLIT-SPECIFIC INSTRUCTIONS
- Frame this as a full project: provide the full file structure (package.json, vite.config, tailwind.config, src/ files).
- If React/Tailwind: use a Vite structure with index.html as the entry point.
- If plain HTML: produce a single index.html with inline <style> containing the :root block.
- Each section should be its own component or clearly delimited block.
- Build real files, not a single snippet — Replit builds full apps.
${isCrossSite(input.provenance) ? '\n## CROSS-SITE CAUTION\nDesign and structure came from different sites. Apply the design system to the structure faithfully.' : ''}`;
}

function buildGenericPrompt(input: VibePromptInput, target: BuildOutputTarget): string {
  const colors = extractColors(input.buildMd);
  const fonts = extractFonts(input.buildMd);
  const images = extractImageUrls(input.buildMd, input.blueprintJson);
  const sections = extractSectionNames(input.blueprintJson);
  const contracts = extractLayoutContracts(input.blueprintJson);
  const hasAssumed = hasAssumptions(input.buildMd);
  const fontsBlock = formatFonts(fonts);

  return `# Rebuild Prompt

## PURPOSE
Rebuild the page described in the specification below. Reproduce it faithfully — do not redesign, do not improve, do not add aesthetic opinions.

## DESIGN SYSTEM (from real CSS)
\`\`\`css
:root {
${formatColors(colors)}
}
\`\`\`
Fonts:
${fontsBlock}
${hasAssumed ? '\nNote: Some values are marked ASSUMED — inferred visually, not from CSS. Use them as given.' : ''}

## SECTIONS (build in this exact order)
${formatSections(sections)}

## LAYOUT CONTRACTS
${formatContracts(contracts)}

## IMAGE URLS (use these exact URLs)
${formatImages(images)}
${MANDATORY_RULES}
${buildOutputFormatNote(target)}
${isCrossSite(input.provenance) ? '\n## CROSS-SITE CAUTION\nDesign and structure came from different sites. Apply the design system to the structure faithfully.' : ''}`;
}

// ─── Blueprinter prompt (design.md + copy.md + user screenshot) ───────────────

/**
 * Formats the blueprint's sections for the Blueprinter prompt: order, type, layout
 * and the layout_contract rules. Returns '' when there is no usable blueprint, so
 * the prompt stays byte-identical to its pre-blueprint form.
 */
/** The URL the structure and copy came from — the page whose screenshot the builder needs. */
function blueprintSourceUrl(blueprintJson?: string): string {
  if (!blueprintJson || !blueprintJson.trim()) return '';
  try {
    const bp = JSON.parse(blueprintJson) as { url?: unknown };
    return typeof bp?.url === 'string' ? bp.url : '';
  } catch {
    return '';
  }
}

function formatBlueprintForPrompt(blueprintJson?: string): string {
  if (!blueprintJson || !blueprintJson.trim()) return '';
  let bp: { sections?: unknown };
  try {
    bp = JSON.parse(blueprintJson);
  } catch {
    return '';
  }
  if (!bp || !Array.isArray(bp.sections) || bp.sections.length === 0) return '';

  const lines: string[] = [];
  (bp.sections as Record<string, unknown>[]).forEach((s, i) => {
    const name = typeof s.section_name === 'string' ? s.section_name : `Section ${i + 1}`;
    const type = typeof s.section_type === 'string' ? s.section_type : 'content';
    lines.push(`### ${i + 1}. ${name} (${type})`);

    const lc = (s.layout_contract && typeof s.layout_contract === 'object')
      ? s.layout_contract as Record<string, unknown>
      : {};
    const desktop = typeof lc.desktop_layout === 'string' ? lc.desktop_layout : '';
    const mobile = typeof lc.mobile_layout === 'string' ? lc.mobile_layout : '';
    if (desktop || mobile) {
      lines.push(`- Layout: desktop ${desktop || 'unspecified'} / mobile ${mobile || 'unspecified'}`);
    }
    const cols = typeof lc.column_structure === 'string' ? lc.column_structure : '';
    if (cols) lines.push(`- Columns: ${cols}`);

    const asList = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    const must = asList(lc.must_preserve);
    const dont = asList(lc.do_not_do);
    if (must.length) lines.push(`- MUST PRESERVE: ${must.join('; ')}`);
    if (dont.length) lines.push(`- DO NOT: ${dont.join('; ')}`);
    lines.push('');
  });

  return lines.join('\n').trimEnd();
}

export function buildBlueprinterPrompt(target: VibeTarget, designMd: string, copyMd: string, imagesMd?: string, isLorem?: boolean, builderFormat: 'html' | 'react' = 'html', blueprintJson?: string): string {
  const targetLabel = VIBE_TARGETS.find(t => t.id === target)?.label ?? 'your builder';

  const blueprintBlock = formatBlueprintForPrompt(blueprintJson);
  // In dual-URL mode the design comes from one site and the structure/copy from another.
  // Screenshotting the design site yields that site's layout wearing this site's words —
  // the cross-site mix that does not work. Name the right page explicitly.
  const sourceUrl = blueprintSourceUrl(blueprintJson);
  const screenshotTarget = sourceUrl
    ? ` Screenshot THIS page: ${sourceUrl} — it is the page this structure and copy came from. Do not use a screenshot of the design-reference site.`
    : '';
  const hasBlueprint = blueprintBlock !== '';
  const inputCount = hasBlueprint ? 'five' : 'four';
  const blueprintInput = hasBlueprint
    ? `\n5. SECTION ORDER & LAYOUT RULES — from the section list below. Build the sections in exactly this order. For each section, treat MUST PRESERVE as mandatory and DO NOT as forbidden. Where the section list and the screenshot disagree about layout, follow the section list.`
    : '';
  const blueprintSection = hasBlueprint
    ? `\n\n---\n\n## Section list (authoritative structure)\n\n${blueprintBlock}`
    : '';

  const imagesSection = imagesMd
    ? `\n\n---\n\n## images.md\n\n\`\`\`markdown\n${imagesMd}\n\`\`\``
    : '';

  const loremWarning = isLorem
    ? '\n\nIMPORTANT: The copy is Lorem Ipsum placeholder — use it to render the layout, but it is NOT real content. Do not treat it as meaningful text.'
    : '';

  const formatNote = builderFormat === 'html'
    ? `\n\n## OUTPUT FORMAT (HTML único)\nProduce ONE self-contained \`index.html\` file that works opened directly in a browser (no server, no build step).\n- ALL CSS goes in a single \`<style>\` block inside \`<head>\`. Do NOT use Tailwind, React, or any framework. Do NOT link external stylesheets (no CDN stylesheets).\n- Put design.md's tokens in a \`:root\` block at the top of the \`<style>\` and reference those CSS variables throughout. Do NOT use Tailwind utility classes.\n- Load fonts via \`<link>\` tags in \`<head>\`.\n- Write semantic HTML (\`<header>\`, \`<main>\`, \`<section>\`, \`<footer>\`, \`<nav>\`). Hand-write all CSS.\n- Any JavaScript goes in a single \`<script>\` at the end of \`<body>\`.`
    : `\n\n## OUTPUT FORMAT (React + Tailwind)\nProduce a React + Tailwind CSS project. Provide a \`tailwind.config.js\` with the theme extension from design.md, and component files for each section. Use the CSS custom properties from the :root block as Tailwind theme values.`;

  return `# Rebuild Prompt — ${targetLabel} (Blueprinter mode)

Build a web page from ${inputCount} inputs, each with one job:

1. STRUCTURE & LAYOUT — from the screenshot I will attach. Recreate its section layout, order, and composition.
2. DESIGN SYSTEM — from design.md below. Apply these exact colors, fonts, sizes, spacing, and component styles. Use the screenshot only for LAYOUT; take all styling values from design.md.
3. COPY — from copy.md below. Use this text verbatim, placed into the matching sections. Do not rewrite, translate, or invent text. Leave a clear placeholder for any gap rather than inventing copy.
4. IMAGES — from images.md below. Use these real image URLs in their matching sections. Entries marked [UNSPLASH] are generic filler — use them only where no real image exists, and treat them as replaceable placeholders. Never invent or hotlink images not listed here.${blueprintInput}

Build the layout from the screenshot first, then apply design.md's styling, then place copy.md's text, then insert images.md's URLs into their matching sections.

IMPORTANT: You must attach your own inspiration screenshot to the builder. This app does not supply a screenshot in Blueprinter mode — the screenshot provides the layout and visual composition that design.md, copy.md, and images.md cannot convey.${screenshotTarget}${loremWarning}${formatNote}

---

## design.md

\`\`\`markdown
${designMd}
\`\`\`

---

## copy.md

\`\`\`markdown
${copyMd}
\`\`\`${imagesSection}${blueprintSection}`;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function buildVibePrompt(
  target: VibeTarget,
  input: VibePromptInput,
  buildTarget: BuildOutputTarget = 'react-tailwind',
): string {
  const outputTarget: BuildOutputTarget = buildTarget === 'react-tailwind' ? 'react-tailwind' : 'plain-html';

  switch (target) {
    case 'lovable': return buildLovablePrompt(input, outputTarget);
    case 'bolt': return buildBoltPrompt(input, outputTarget);
    case 'v0': return buildV0Prompt(input, outputTarget);
    case 'claude-design': return buildClaudeDesignPrompt(input, outputTarget);
    case 'replit': return buildReplitPrompt(input, outputTarget);
    case 'generic': return buildGenericPrompt(input, outputTarget);
  }
}
