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

function isWpPreset(name: string): boolean {
  return name.startsWith("--wp--preset--");
}

function isWpStyleGlobal(name: string): boolean {
  return name.startsWith("--wp--style--global--");
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
