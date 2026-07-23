import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FontFileInfo {
  family: string;
  url: string;
  format: string;
}

function toAbsolute(href: string, origin: string, base: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${origin}${href}`;
  return `${base}${href}`;
}

function parseFontFaces(css: string, cssUrl: string, results: FontFileInfo[], seen: Set<string>) {
  let cssOrigin = "";
  let cssBase = "";
  try {
    const u = new URL(cssUrl);
    cssOrigin = u.origin;
    cssBase = cssUrl.substring(0, cssUrl.lastIndexOf("/") + 1);
  } catch { /* ignore */ }

  const fontFaceBlocks = css.match(/@font-face\s*\{[^}]+\}/g) ?? [];
  for (const block of fontFaceBlocks) {
    const familyMatch = block.match(/font-family\s*:\s*['"]?([^'";,\}]+)['"]?/i);
    const family = familyMatch ? familyMatch[1].trim().replace(/['"]/g, "") : "Unknown";

    const srcUrls = [...block.matchAll(/url\(['"]?([^'")\s]+)['"]?\)\s*(?:format\(['"]?([^'")\s]+)['"]?\))?/gi)];
    for (const m of srcUrls) {
      let fontUrl = m[1].trim();
      const fmt = m[2]?.trim() ?? "";

      if (fontUrl.startsWith("data:")) continue;
      if (!/\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(fontUrl)) continue;

      fontUrl = toAbsolute(fontUrl, cssOrigin, cssBase);

      const ext = fmt || fontUrl.split(".").pop()?.split("?")[0] || "";
      const key = `${family}::${fontUrl}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ family, url: fontUrl, format: ext });
      }
    }
  }
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
    try { origin = new URL(pageUrl).origin; } catch { /* ignore */ }

    const results: FontFileInfo[] = [];
    const seen = new Set<string>();

    // Fetch the page
    const pageRes = await fetch(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BrandingBot/1.0)" },
      signal: AbortSignal.timeout(10_000),
    });
    const html = await pageRes.text();

    // Inline <style> blocks
    const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) ?? [];
    for (const block of styleBlocks) {
      const content = block.replace(/<style[^>]*>|<\/style>/gi, "");
      parseFontFaces(content, pageUrl, results, seen);
    }

    // Collect all stylesheet hrefs
    const absBase = pageUrl.substring(0, pageUrl.lastIndexOf("/") + 1);
    const linkHrefs1 = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)]
      .map(m => toAbsolute(m[1], origin, absBase));
    const linkHrefs2 = [...html.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/gi)]
      .map(m => toAbsolute(m[1], origin, absBase));

    const cssUrls = [...new Set([...linkHrefs1, ...linkHrefs2])].filter(u => u.startsWith("http"));

    await Promise.allSettled(cssUrls.map(async (cssUrl) => {
      try {
        const cssRes = await fetch(cssUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; BrandingBot/1.0)" },
          signal: AbortSignal.timeout(8_000),
        });
        if (cssRes.ok) {
          const css = await cssRes.text();
          parseFontFaces(css, cssUrl, results, seen);

          // Follow @import rules one level deep
          const imports = [...css.matchAll(/@import\s+(?:url\(['"]?|['"])([^'")\s]+)['"]?\)?/gi)]
            .map(m => toAbsolute(m[1], new URL(cssUrl).origin, cssUrl.substring(0, cssUrl.lastIndexOf("/") + 1)));
          await Promise.allSettled(imports.map(async (importUrl) => {
            try {
              const impRes = await fetch(importUrl, {
                headers: { "User-Agent": "Mozilla/5.0 (compatible; BrandingBot/1.0)" },
                signal: AbortSignal.timeout(6_000),
              });
              if (impRes.ok) parseFontFaces(await impRes.text(), importUrl, results, seen);
            } catch { /* skip */ }
          }));
        }
      } catch { /* skip */ }
    }));

    return new Response(JSON.stringify({ fonts: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
