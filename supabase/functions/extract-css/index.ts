import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function fetchHeaders(pageUrl: string): Record<string, string> {
  return {
    "User-Agent": BROWSER_UA,
    "Accept": "text/css,*/*;q=0.1",
    "Referer": pageUrl,
  };
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface CssCustomProperty {
  name: string;
  value: string;
  selector: string;
}

interface CssColorValue {
  value: string;
  property: string;
  selector: string;
  count: number;
}

interface CssFontDeclaration {
  property: string;
  value: string;
  selector: string;
}

interface CssKeyframe {
  name: string;
  raw: string;
}

interface CssMediaQuery {
  query: string;
  raw: string;
}

interface CssSheet {
  url: string;
  size: number;
  isInline: boolean;
}

interface SheetFailure {
  url: string;
  reason: string;
}

interface FrequencyEntry {
  value: string;
  count: number;
  sampleSelectors: string[];
}

interface FrequencyAnalysis {
  fontSizes: FrequencyEntry[];
  fontFamilies: FrequencyEntry[];
  spacings: FrequencyEntry[];
  radii: FrequencyEntry[];
  shadows: FrequencyEntry[];
  fontWeights: FrequencyEntry[];
}

interface TailwindUtilityGroup {
  category: string;
  classes: { className: string; count: number }[];
}

interface TailwindUtilities {
  groups: TailwindUtilityGroup[];
}

interface PlatformDetection {
  cms: string | null;
  builder: string | null;
  framework: string | null;
  cssApproach: string;
  confidence: string;
  signals: string[];
}

interface CssDiagnostics {
  htmlSource: "provided" | "fetched";
  linkedSheetsFound: number;
  sheetsFetchedOk: number;
  sheetsFailed: SheetFailure[];
  totalCssBytes: number;
  customPropertyCount: number;
}

export interface CssExtractResult {
  customProperties: CssCustomProperty[];
  colors: CssColorValue[];
  fonts: CssFontDeclaration[];
  keyframes: CssKeyframe[];
  mediaQueries: CssMediaQuery[];
  sheets: CssSheet[];
  rawCss: Record<string, string>;
  diagnostics: CssDiagnostics;
  platform: PlatformDetection;
  frequency: FrequencyAnalysis;
  tailwind: TailwindUtilities | null;
}

// ─── Platform Detection ──────────────────────────────────────────────────────

function detectPlatform(
  html: string,
  cssText: string,
  sheetUrls: string[],
): PlatformDetection {
  const signals: string[] = [];
  let cms: string | null = null;
  let builder: string | null = null;
  let framework: string | null = null;
  let cssApproach = "unknown";
  let confidence: "high" | "medium" | "low" = "low";

  const allCss = cssText;
  const allUrls = sheetUrls.join(" ");

  // WordPress
  if (/wp-content\//.test(html) || /wp-includes\//.test(html) || /meta\s+name=["']generator["']\s+content=["']WordPress["']/i.test(html)) {
    cms = "wordpress";
    signals.push("wp-content/wp-includes paths or meta generator=WordPress");
  }

  // Elementor
  if (/\.elementor-kit-\d+/.test(html) || /elementor\/css\/post-/.test(html) || /class=["'][^"']*\belementor-/.test(html)) {
    builder = "elementor";
    signals.push("elementor-kit class or elementor/css/post- asset");
  }

  // Divi
  if (/id=["']et-boc["']/.test(html) || /\bet_pb_/.test(html)) {
    builder = "divi";
    signals.push("#et-boc or et_pb_ class prefix");
  }

  // Bricks
  if (/\bbrxe-/.test(html)) {
    builder = "bricks";
    signals.push("brxe- class prefix");
  }

  // Beaver (detect via class prefix)
  if (/class=["'][^"']*\bfl-builder\b/.test(html) || /class=["'][^"']*\bfl-module\b/.test(html)) {
    builder = "beaver";
    signals.push("fl-builder/fl-module class");
  }

  // Gutenberg
  if (/class=["'][^"']*\bwp-block\b/.test(html) || /\bwp-block-/.test(html)) {
    if (cms === "wordpress" && !builder) {
      builder = "gutenberg";
      signals.push("wp-block- class prefix (Gutenberg)");
    }
  }

  // Webflow
  if (/meta\s+name=["']generator["']\s+content=["']Webflow["']/i.test(html) || /website-files\.com/.test(allUrls) || /\.w-container\b/.test(html) || /\.w-form\b/.test(html) || /w-webflow-badge/.test(html)) {
    cms = "webflow";
    signals.push("Webflow meta generator, website-files.com host, or .w-* classes");
  }

  // Wix
  if (/static\.wixstatic\.com/.test(html) || /static\.wixstatic\.com/.test(allUrls)) {
    cms = "wix";
    signals.push("static.wixstatic.com asset host");
  }

  // Squarespace
  if (/squarespace\.com\/universal/.test(html) || /static1\.squarespace\.com/.test(html) || /static1\.squarespace\.com/.test(allUrls)) {
    cms = "squarespace";
    signals.push("squarespace.com/universal or static1.squarespace.com");
  }

  // Shopify
  if (/cdn\.shopify\.com/.test(html) || /cdn\.shopify\.com/.test(allUrls) || /Shopify\.theme/.test(html)) {
    cms = "shopify";
    signals.push("cdn.shopify.com or Shopify.theme");
  }

  // Next.js
  if (/__NEXT_DATA__/.test(html) || /\/_next\/static\//.test(html)) {
    framework = "next";
    signals.push("__NEXT_DATA__ or /_next/static/");
  }

  // Nuxt
  if (/__NUXT__/.test(html)) {
    framework = "nuxt";
    signals.push("__NUXT__");
  }

  // Astro
  if (/astro-island/.test(html) || /data-astro-/.test(html)) {
    framework = "astro";
    signals.push("astro-island or data-astro-");
  }

  // React (generic) — id=root or id=__next with hydration payload, but not Next
  if (!framework && (/\bid=["']root["']/.test(html) || /\bid=["']__next["']/.test(html))) {
    if (/data-reactroot|data-reactid|react/.test(html)) {
      framework = "react";
      signals.push('id="root" or id="__next" with React hydration markers');
    }
  }

  // CSS approach detection
  const cpCount = (allCss.match(/--[\w-]+\s*:/g) ?? []).length;
  const hasTailwindVars = /--tw-/.test(allCss);
  const twClassMatches = (html.match(/class=["'][^"']*\b(bg|text|border|rounded|px|py|mx|my|flex|grid|gap|w|h)-/g) ?? []).length;
  const hasBootstrap = (/\.container\b/.test(allCss) && /\.row\b/.test(allCss) && /\.col-/.test(allCss)) || /btn\s+btn-/.test(html);
  const hasCssModules = /^[A-Za-z]+_[A-Za-z0-9]+__[a-z0-9]{5}$/m.test(html);

  if (hasTailwindVars || twClassMatches >= 20) {
    cssApproach = "tailwind";
    signals.push(hasTailwindVars ? "--tw- variables in CSS" : `${twClassMatches} Tailwind-style utility classes in HTML`);
  } else if (hasBootstrap) {
    cssApproach = "bootstrap";
    signals.push(".container/.row/.col- or btn btn- classes (Bootstrap)");
  } else if (hasCssModules) {
    cssApproach = "css-modules";
    signals.push("CSS Modules class name pattern (name_value__hash)");
  } else if (cpCount >= 15) {
    cssApproach = "custom-properties";
    signals.push(`${cpCount} CSS custom properties`);
  } else {
    cssApproach = "plain";
    signals.push("No significant token layer detected");
  }

  // Confidence
  const signalCount = signals.length;
  if (signalCount >= 3) confidence = "high";
  else if (signalCount >= 1) confidence = "medium";
  else confidence = "low";

  return { cms, builder, framework, cssApproach, confidence, signals };
}

// ─── Frequency Analysis ──────────────────────────────────────────────────────

const VENDOR_SHEET_RE = /bootstrap(\.min)?\.css|normalize\.css|reset\.css|font-?awesome|swiper|slick|animate\.css/i;
const PLATFORM_CHROME_RE = /^\.w-(form|input|button|webflow-badge|file-upload)|^\.wp-block-|^\.elementor-widget-container/;

function isVendorSheet(url: string): boolean {
  return VENDOR_SHEET_RE.test(url);
}

function isPlatformChromeSelector(selector: string): boolean {
  return PLATFORM_CHROME_RE.test(selector);
}

function normalizeColorValue(val: string): string {
  const trimmed = val.trim().toLowerCase().replace(/\s+/g, "");
  // rgba(r,g,b,a) with alpha=1 → hex
  const rgbaMatch = trimmed.match(/^rgba?\((\d+),(\d+),(\d+),?(.*)\)$/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
    if (a === 1 || a === undefined) {
      return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
    }
  }
  // Normalize hex to lowercase
  if (/^#[0-9a-f]{3,8}$/.test(trimmed)) {
    // Expand 3-digit hex to 6-digit
    if (trimmed.length === 4) {
      return "#" + trimmed[1] + trimmed[1] + trimmed[2] + trimmed[2] + trimmed[3] + trimmed[3];
    }
    return trimmed;
  }
  return trimmed;
}

function normalizeSpacingValue(val: string): string {
  const trimmed = val.trim();
  // Treat "0px" and "0" as identical
  if (trimmed === "0px") return "0";
  return trimmed;
}

function addFrequency(
  map: Map<string, FrequencyEntry>,
  value: string,
  selector: string,
  normalize: (v: string) => string = (v) => v.trim(),
) {
  const norm = normalize(value);
  if (!norm) return;
  const existing = map.get(norm);
  if (existing) {
    existing.count++;
    if (existing.sampleSelectors.length < 3 && !existing.sampleSelectors.includes(selector)) {
      existing.sampleSelectors.push(selector.length > 80 ? selector.slice(0, 80) + "…" : selector);
    }
  } else {
    map.set(norm, {
      value: norm,
      count: 1,
      sampleSelectors: [selector.length > 80 ? selector.slice(0, 80) + "…" : selector],
    });
  }
}

function extractFrequency(
  css: string,
  sheetUrl: string,
  acc: {
    fontSizes: Map<string, FrequencyEntry>;
    fontFamilies: Map<string, FrequencyEntry>;
    spacings: Map<string, FrequencyEntry>;
    radii: Map<string, FrequencyEntry>;
    shadows: Map<string, FrequencyEntry>;
    fontWeights: Map<string, FrequencyEntry>;
  },
) {
  if (isVendorSheet(sheetUrl)) return;

  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(css)) !== null) {
    const selector = m[1].trim();
    if (isPlatformChromeSelector(selector)) continue;

    const body = m[2];
    const declRe = /([\w-]+)\s*:\s*([^;]+);/g;
    let d: RegExpExecArray | null;
    while ((d = declRe.exec(body)) !== null) {
      const prop = d[1].trim().toLowerCase();
      const val = d[2].trim();

      if (prop === "font-size") {
        addFrequency(acc.fontSizes, val, selector);
      } else if (prop === "font-family") {
        addFrequency(acc.fontFamilies, val, selector);
      } else if (prop === "font-weight") {
        addFrequency(acc.fontWeights, val, selector);
      } else if (prop === "padding" || prop === "margin" || prop === "gap") {
        // Count full shorthand
        addFrequency(acc.spacings, val, selector, normalizeSpacingValue);
        // Also count component values
        const parts = val.split(/\s+/).filter(p => p);
        for (const part of parts) {
          addFrequency(acc.spacings, part, selector, normalizeSpacingValue);
        }
      } else if (prop === "padding-top" || prop === "padding-right" || prop === "padding-bottom" || prop === "padding-left" ||
                 prop === "margin-top" || prop === "margin-right" || prop === "margin-bottom" || prop === "margin-left") {
        addFrequency(acc.spacings, val, selector, normalizeSpacingValue);
      } else if (prop === "border-radius") {
        addFrequency(acc.radii, val, selector);
        const parts = val.split(/\s+/).filter(p => p);
        for (const part of parts) {
          addFrequency(acc.radii, part, selector);
        }
      } else if (prop === "box-shadow") {
        addFrequency(acc.shadows, val, selector);
      }
    }
  }
}

function sortAndCap(map: Map<string, FrequencyEntry>, cap: number = 30): FrequencyEntry[] {
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, cap);
}

// ─── Tailwind Utility Extraction ──────────────────────────────────────────────

function extractTailwindUtilities(html: string): TailwindUtilities {
  const categoryMap = new Map<string, Map<string, number>>();

  function addToCategory(category: string, className: string) {
    if (!categoryMap.has(category)) categoryMap.set(category, new Map());
    const m = categoryMap.get(category)!;
    m.set(className, (m.get(className) ?? 0) + 1);
  }

  // Collect all class attributes
  const classMatches = html.matchAll(/class=["']([^"']+)["']/gi);
  for (const cm of classMatches) {
    const classes = cm[1].trim().split(/\s+/);
    for (const cls of classes) {
      // Arbitrary bracket values: bg-[#4fb34f], text-[17px], etc.
      const bracketMatch = cls.match(/^(bg|text|border|rounded|p|m|px|py|mx|my|pt|pb|pl|pr|mt|mb|ml|mr|gap|w|h|min-w|max-w|min-h|max-h|top|bottom|left|right|z|opacity|blur|rotate|scale|translate|duration|delay|ease|animate|grid-cols|col-span|row-span|flex|order|leading|tracking|font|text|underline|decoration|stroke|fill)-\[(.+)\]$/);
      if (bracketMatch) {
        addToCategory("arbitrary", cls);
        continue;
      }

      // Colors: bg-*, text-*, border-*
      if (/^(bg|text|border)-/.test(cls) && !/^(text-(left|right|center|justify|start|end)|bg-(left|right|center|top|bottom|cover|contain|fixed|local|no-repeat|repeat|clip|origin)|border-(top|bottom|left|right|collapse|separate|spacing))/.test(cls)) {
        addToCategory("colors", cls);
      }
      // Spacing: p-*, m-*, gap-*, space-*
      else if (/^(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-x|space-y)-/.test(cls)) {
        addToCategory("spacing", cls);
      }
      // Typography: text-*, font-*, leading-*, tracking-*
      else if (/^(text|font|leading|tracking)-/.test(cls)) {
        addToCategory("typography", cls);
      }
      // Radius: rounded-*
      else if (/^rounded-/.test(cls)) {
        addToCategory("radius", cls);
      }
      // Shadow: shadow-*
      else if (/^shadow-/.test(cls)) {
        addToCategory("shadow", cls);
      }
      // Layout: flex, grid, etc.
      else if (/^(flex|grid|grid-cols|col-span|row-span|order|items|justify|self|place)-/.test(cls) || /^(flex|grid|block|inline|hidden|contents)$/.test(cls)) {
        addToCategory("layout", cls);
      }
    }
  }

  const groups: TailwindUtilityGroup[] = [];
  for (const [category, classMap] of categoryMap) {
    const classes = [...classMap.entries()]
      .map(([className, count]) => ({ className, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
    groups.push({ category, classes });
  }

  return { groups };
}

// ─── CSS Extraction (existing helpers) ────────────────────────────────────────

function toAbsolute(href: string, origin: string, base: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${origin}${href}`;
  return `${base}${href}`;
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function isWpPreset(name: string): boolean {
  return name.startsWith("--wp--preset--");
}

function shouldKeepCustomProperty(name: string): boolean {
  if (isWpPreset(name)) return false;
  return true;
}

function customPropertyPriority(selector: string): number {
  if (/\.elementor-kit-\d+/.test(selector)) return 0;
  if (selector === ":root" || selector === "html") return 1;
  if (/^\.(theme|site|wp-site)/.test(selector)) return 2;
  return 3;
}

function sortCustomProperties(props: CssCustomProperty[]): CssCustomProperty[] {
  const groups: CssCustomProperty[][] = [[], [], [], []];
  for (const p of props) {
    groups[customPropertyPriority(p.selector)].push(p);
  }
  return [...groups[0], ...groups[1], ...groups[2], ...groups[3]];
}

function extractCustomProperties(css: string, _sheetUrl: string, results: CssCustomProperty[]) {
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(css)) !== null) {
    const selector = m[1].trim();
    const body = m[2];
    const propRe = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let p: RegExpExecArray | null;
    while ((p = propRe.exec(body)) !== null) {
      const name = p[1].trim();
      if (!shouldKeepCustomProperty(name)) continue;
      results.push({
        name,
        value: p[2].trim(),
        selector: selector.length > 120 ? selector.slice(0, 120) + "…" : selector,
      });
    }
  }
}

const COLOR_RE = /(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+[^)]*\)|hsla?\([^)]+\))/g;
const FONT_PROPS = new Set(["font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "text-transform"]);

function extractColors(css: string, colorMap: Map<string, CssColorValue>) {
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(css)) !== null) {
    const selector = m[1].trim();
    const body = m[2];
    const declRe = /([\w-]+)\s*:\s*([^;]+);/g;
    let d: RegExpExecArray | null;
    while ((d = declRe.exec(body)) !== null) {
      const prop = d[1].trim();
      const val = d[2].trim();
      const colors = val.match(COLOR_RE) ?? [];
      for (const color of colors) {
        const norm = normalizeColorValue(color);
        const existing = colorMap.get(norm);
        if (existing) {
          existing.count++;
        } else {
          colorMap.set(norm, {
            value: color,
            property: prop,
            selector: selector.length > 80 ? selector.slice(0, 80) + "…" : selector,
            count: 1,
          });
        }
      }
    }
  }
}

function extractFonts(css: string, results: CssFontDeclaration[], seen: Set<string>) {
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(css)) !== null) {
    const selector = m[1].trim();
    const body = m[2];
    const declRe = /([\w-]+)\s*:\s*([^;]+);/g;
    let d: RegExpExecArray | null;
    while ((d = declRe.exec(body)) !== null) {
      const prop = d[1].trim().toLowerCase();
      if (FONT_PROPS.has(prop)) {
        const key = `${prop}::${d[2].trim()}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            property: prop,
            value: d[2].trim(),
            selector: selector.length > 80 ? selector.slice(0, 80) + "…" : selector,
          });
        }
      }
    }
  }
}

function extractKeyframes(css: string, results: CssKeyframe[], seen: Set<string>) {
  const re = /@(?:-\w+-)?keyframes\s+([\w-]+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const name = m[1];
    if (seen.has(name)) continue;
    seen.add(name);
    let depth = 0;
    let start = m.index;
    let i = css.indexOf("{", start);
    let end = i;
    while (i < css.length) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
      i++;
    }
    const raw = css.slice(start, end + 1);
    results.push({ name, raw: raw.length > 800 ? raw.slice(0, 800) + "\n…" : raw });
  }
}

function extractMediaQueries(css: string, results: CssMediaQuery[], seen: Set<string>) {
  const re = /@media\s*([^{]+)\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const query = m[1].trim();
    if (seen.has(query)) continue;
    seen.add(query);
    let depth = 0;
    let i = m.index + m[0].length - 1;
    const start = m.index;
    let end = i;
    while (i < css.length) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
      i++;
    }
    const raw = css.slice(start, end + 1);
    results.push({ query, raw: raw.length > 600 ? raw.slice(0, 600) + "\n…" : raw });
  }
}

interface ParseAccumulator {
  customProperties: CssCustomProperty[];
  colorMap: Map<string, CssColorValue>;
  fonts: CssFontDeclaration[];
  fontSeen: Set<string>;
  keyframes: CssKeyframe[];
  kfSeen: Set<string>;
  mediaQueries: CssMediaQuery[];
  mqSeen: Set<string>;
  freqAcc: {
    fontSizes: Map<string, FrequencyEntry>;
    fontFamilies: Map<string, FrequencyEntry>;
    spacings: Map<string, FrequencyEntry>;
    radii: Map<string, FrequencyEntry>;
    shadows: Map<string, FrequencyEntry>;
    fontWeights: Map<string, FrequencyEntry>;
  };
}

function parseAllCss(
  css: string,
  sheetUrl: string,
  acc: ParseAccumulator,
) {
  const clean = stripComments(css);
  extractCustomProperties(clean, sheetUrl, acc.customProperties);
  extractColors(clean, acc.colorMap);
  extractFonts(clean, acc.fonts, acc.fontSeen);
  extractKeyframes(clean, acc.keyframes, acc.kfSeen);
  extractMediaQueries(clean, acc.mediaQueries, acc.mqSeen);
  extractFrequency(clean, sheetUrl, acc.freqAcc);
}

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const pageUrl: string | undefined = body.url;
    const providedHtml: string | undefined = body.html;

    if (!pageUrl || typeof pageUrl !== "string") {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let origin = "";
    let absBase = pageUrl;
    try {
      const u = new URL(pageUrl);
      origin = u.origin;
      absBase = pageUrl.substring(0, pageUrl.lastIndexOf("/") + 1);
    } catch { /* ignore */ }

    const acc: ParseAccumulator = {
      customProperties: [],
      colorMap: new Map<string, CssColorValue>(),
      fonts: [],
      fontSeen: new Set<string>(),
      keyframes: [],
      kfSeen: new Set<string>(),
      mediaQueries: [],
      mqSeen: new Set<string>(),
      freqAcc: {
        fontSizes: new Map<string, FrequencyEntry>(),
        fontFamilies: new Map<string, FrequencyEntry>(),
        spacings: new Map<string, FrequencyEntry>(),
        radii: new Map<string, FrequencyEntry>(),
        shadows: new Map<string, FrequencyEntry>(),
        fontWeights: new Map<string, FrequencyEntry>(),
      },
    };

    const sheets: CssSheet[] = [];
    const rawCss: Record<string, string> = {};
    const sheetsFailed: SheetFailure[] = [];
    let totalCssBytes = 0;
    let htmlSource: "provided" | "fetched" = "provided";

    // Determine HTML source
    let html: string;
    if (providedHtml && providedHtml.trim().length > 0) {
      html = providedHtml;
      htmlSource = "provided";
    } else {
      htmlSource = "fetched";
      const pageRes = await fetch(pageUrl, {
        headers: fetchHeaders(pageUrl),
        signal: AbortSignal.timeout(12_000),
      });
      html = await pageRes.text();
    }

    // Inline <style> blocks
    const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
    styleBlocks.forEach((m, i) => {
      const content = m[1];
      const label = `inline-${i + 1}`;
      sheets.push({ url: label, size: content.length, isInline: true });
      rawCss[label] = content.length > 50_000 ? content.slice(0, 50_000) + "\n/* truncated */" : content;
      totalCssBytes += content.length;
      parseAllCss(content, pageUrl, acc);
    });

    // Collect linked stylesheet URLs
    const linkHrefs1 = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)]
      .map(m => toAbsolute(m[1], origin, absBase));
    const linkHrefs2 = [...html.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/gi)]
      .map(m => toAbsolute(m[1], origin, absBase));
    const cssUrls = [...new Set([...linkHrefs1, ...linkHrefs2])].filter(u => u.startsWith("http"));
    const linkedSheetsFound = cssUrls.length;

    let sheetsFetchedOk = 0;

    await Promise.allSettled(cssUrls.map(async (cssUrl) => {
      try {
        const cssRes = await fetch(cssUrl, {
          headers: fetchHeaders(pageUrl),
          signal: AbortSignal.timeout(10_000),
        });
        if (!cssRes.ok) {
          sheetsFailed.push({ url: cssUrl, reason: `http-${cssRes.status}` });
          return;
        }
        const contentType = (cssRes.headers.get("content-type") ?? "").toLowerCase();
        const css = await cssRes.text();
        const looksLikeHtml = /^\s*(<!doctype|<html|<head|<body)/i.test(css);
        if (contentType.includes("html") || looksLikeHtml) {
          sheetsFailed.push({ url: cssUrl, reason: "html-response (likely WAF block)" });
          return;
        }
        if (!contentType.includes("css") && css.trim().length === 0) {
          sheetsFailed.push({ url: cssUrl, reason: "empty-response" });
          return;
        }
        sheetsFetchedOk++;
        sheets.push({ url: cssUrl, size: css.length, isInline: false });
        rawCss[cssUrl] = css.length > 100_000 ? css.slice(0, 100_000) + "\n/* truncated */" : css;
        totalCssBytes += css.length;
        parseAllCss(css, cssUrl, acc);

        // Follow @import one level deep
        const imports = [...css.matchAll(/@import\s+(?:url\(['"]?|['"])([^'")\s]+)['"]?\)?/gi)]
          .map(m2 => {
            try {
              const u = new URL(cssUrl);
              return toAbsolute(m2[1], u.origin, cssUrl.substring(0, cssUrl.lastIndexOf("/") + 1));
            } catch { return ""; }
          })
          .filter(u => u.startsWith("http"));

        await Promise.allSettled(imports.map(async (importUrl) => {
          try {
            const impRes = await fetch(importUrl, {
              headers: fetchHeaders(pageUrl),
              signal: AbortSignal.timeout(8_000),
            });
            if (!impRes.ok) {
              sheetsFailed.push({ url: importUrl, reason: `http-${impRes.status}` });
              return;
            }
            const impContentType = (impRes.headers.get("content-type") ?? "").toLowerCase();
            const impCss = await impRes.text();
            const impLooksLikeHtml = /^\s*(<!doctype|<html|<head|<body)/i.test(impCss);
            if (impContentType.includes("html") || impLooksLikeHtml) {
              sheetsFailed.push({ url: importUrl, reason: "html-response (likely WAF block)" });
              return;
            }
            if (!impContentType.includes("css") && impCss.trim().length === 0) {
              sheetsFailed.push({ url: importUrl, reason: "non-css content-type" });
              return;
            }
            sheetsFetchedOk++;
            sheets.push({ url: importUrl, size: impCss.length, isInline: false });
            rawCss[importUrl] = impCss.length > 50_000 ? impCss.slice(0, 50_000) + "\n/* truncated */" : impCss;
            totalCssBytes += impCss.length;
            parseAllCss(impCss, importUrl, acc);
          } catch (e) {
            sheetsFailed.push({ url: importUrl, reason: e instanceof Error ? e.message : "fetch-error" });
          }
        }));
      } catch (e) {
        const reason = e instanceof DOMException && e.name === "TimeoutError"
          ? "timeout"
          : e instanceof Error ? e.message : "fetch-error";
        sheetsFailed.push({ url: cssUrl, reason });
      }
    }));

    // Deduplicate custom properties (keep first occurrence per name+selector combo)
    const cpSeen = new Set<string>();
    let customProperties = acc.customProperties.filter(cp => {
      const key = `${cp.selector}::${cp.name}`;
      if (cpSeen.has(key)) return false;
      cpSeen.add(key);
      return true;
    });

    // Sort by design-system priority
    customProperties = sortCustomProperties(customProperties);

    // Sort colors by frequency desc
    const colors = [...acc.colorMap.values()].sort((a, b) => b.count - a.count);

    // Build frequency analysis
    const frequency: FrequencyAnalysis = {
      fontSizes: sortAndCap(acc.freqAcc.fontSizes),
      fontFamilies: sortAndCap(acc.freqAcc.fontFamilies),
      spacings: sortAndCap(acc.freqAcc.spacings),
      radii: sortAndCap(acc.freqAcc.radii),
      shadows: sortAndCap(acc.freqAcc.shadows),
      fontWeights: sortAndCap(acc.freqAcc.fontWeights),
    };

    // Platform detection
    const allCssForDetection = Object.values(rawCss).join("\n");
    const platform = detectPlatform(html, allCssForDetection, cssUrls);

    // Tailwind utilities (only if tailwind detected)
    let tailwind: TailwindUtilities | null = null;
    if (platform.cssApproach === "tailwind") {
      tailwind = extractTailwindUtilities(html);
    }

    const diagnostics: CssDiagnostics = {
      htmlSource,
      linkedSheetsFound,
      sheetsFetchedOk,
      sheetsFailed,
      totalCssBytes,
      customPropertyCount: customProperties.length,
    };

    const result: CssExtractResult = {
      customProperties,
      colors,
      fonts: acc.fonts,
      keyframes: acc.keyframes,
      mediaQueries: acc.mediaQueries,
      sheets,
      rawCss,
      diagnostics,
      platform,
      frequency,
      tailwind,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
