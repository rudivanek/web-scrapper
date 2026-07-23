import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

export interface CssExtractResult {
  customProperties: CssCustomProperty[];
  colors: CssColorValue[];
  fonts: CssFontDeclaration[];
  keyframes: CssKeyframe[];
  mediaQueries: CssMediaQuery[];
  sheets: CssSheet[];
  rawCss: Record<string, string>;
}

function toAbsolute(href: string, origin: string, base: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${origin}${href}`;
  return `${base}${href}`;
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function extractCustomProperties(css: string, sheetUrl: string, results: CssCustomProperty[]) {
  // Match selector blocks containing --variables
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(css)) !== null) {
    const selector = m[1].trim();
    const body = m[2];
    const propRe = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let p: RegExpExecArray | null;
    while ((p = propRe.exec(body)) !== null) {
      results.push({
        name: p[1].trim(),
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
        const norm = color.toLowerCase().replace(/\s+/g, "");
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
  const kfRe = /@(?:-\w+-)?keyframes\s+([\w-]+)\s*\{([\s\S]*?)(?=@(?:-\w+-)?keyframes|\s*$)/g;
  // Simpler: match @keyframes blocks by counting braces
  const re = /@(?:-\w+-)?keyframes\s+([\w-]+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const name = m[1];
    if (seen.has(name)) continue;
    seen.add(name);
    // Grab the block by brace counting
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
  // suppress unused var warning
  void kfRe;
}

function extractMediaQueries(css: string, results: CssMediaQuery[], seen: Set<string>) {
  const re = /@media\s*([^{]+)\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const query = m[1].trim();
    if (seen.has(query)) continue;
    seen.add(query);
    // Grab block
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

function parseAllCss(
  css: string,
  sheetUrl: string,
  acc: {
    customProperties: CssCustomProperty[];
    colorMap: Map<string, CssColorValue>;
    fonts: CssFontDeclaration[];
    fontSeen: Set<string>;
    keyframes: CssKeyframe[];
    kfSeen: Set<string>;
    mediaQueries: CssMediaQuery[];
    mqSeen: Set<string>;
  }
) {
  const clean = stripComments(css);
  extractCustomProperties(clean, sheetUrl, acc.customProperties);
  extractColors(clean, acc.colorMap);
  extractFonts(clean, acc.fonts, acc.fontSeen);
  extractKeyframes(clean, acc.keyframes, acc.kfSeen);
  extractMediaQueries(clean, acc.mediaQueries, acc.mqSeen);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { url: pageUrl } = await req.json();
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

    const acc = {
      customProperties: [] as CssCustomProperty[],
      colorMap: new Map<string, CssColorValue>(),
      fonts: [] as CssFontDeclaration[],
      fontSeen: new Set<string>(),
      keyframes: [] as CssKeyframe[],
      kfSeen: new Set<string>(),
      mediaQueries: [] as CssMediaQuery[],
      mqSeen: new Set<string>(),
    };

    const sheets: CssSheet[] = [];
    const rawCss: Record<string, string> = {};

    // Fetch page HTML
    const pageRes = await fetch(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CSSBot/1.0)" },
      signal: AbortSignal.timeout(12_000),
    });
    const html = await pageRes.text();

    // Inline <style> blocks
    const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
    styleBlocks.forEach((m, i) => {
      const content = m[1];
      const label = `inline-${i + 1}`;
      sheets.push({ url: label, size: content.length, isInline: true });
      rawCss[label] = content.length > 50_000 ? content.slice(0, 50_000) + "\n/* truncated */" : content;
      parseAllCss(content, pageUrl, acc);
    });

    // Collect linked stylesheet URLs
    const linkHrefs1 = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)]
      .map(m => toAbsolute(m[1], origin, absBase));
    const linkHrefs2 = [...html.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/gi)]
      .map(m => toAbsolute(m[1], origin, absBase));
    const cssUrls = [...new Set([...linkHrefs1, ...linkHrefs2])].filter(u => u.startsWith("http"));

    await Promise.allSettled(cssUrls.map(async (cssUrl) => {
      try {
        const cssRes = await fetch(cssUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; CSSBot/1.0)" },
          signal: AbortSignal.timeout(10_000),
        });
        if (!cssRes.ok) return;
        const css = await cssRes.text();
        const label = cssUrl;
        sheets.push({ url: cssUrl, size: css.length, isInline: false });
        rawCss[label] = css.length > 100_000 ? css.slice(0, 100_000) + "\n/* truncated */" : css;
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
              headers: { "User-Agent": "Mozilla/5.0 (compatible; CSSBot/1.0)" },
              signal: AbortSignal.timeout(8_000),
            });
            if (!impRes.ok) return;
            const impCss = await impRes.text();
            sheets.push({ url: importUrl, size: impCss.length, isInline: false });
            rawCss[importUrl] = impCss.length > 50_000 ? impCss.slice(0, 50_000) + "\n/* truncated */" : impCss;
            parseAllCss(impCss, importUrl, acc);
          } catch { /* skip */ }
        }));
      } catch { /* skip */ }
    }));

    // Deduplicate custom properties (keep first occurrence per name+selector combo)
    const cpSeen = new Set<string>();
    const customProperties = acc.customProperties.filter(cp => {
      const key = `${cp.selector}::${cp.name}`;
      if (cpSeen.has(key)) return false;
      cpSeen.add(key);
      return true;
    });

    // Sort colors by frequency desc
    const colors = [...acc.colorMap.values()].sort((a, b) => b.count - a.count);

    const result: CssExtractResult = {
      customProperties,
      colors,
      fonts: acc.fonts,
      keyframes: acc.keyframes,
      mediaQueries: acc.mediaQueries,
      sheets,
      rawCss,
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
