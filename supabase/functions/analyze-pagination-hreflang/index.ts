import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PaginationHreflangRequest {
  crawl_id: string;
  urls: string[];
}

interface HreflangLink {
  lang: string;
  url: string;
  reciprocal: boolean;
}

interface PaginationData {
  next?: string;
  prev?: string;
  nextValid?: boolean;
  prevValid?: boolean;
}

interface PaginationHreflangResult {
  url: string;
  pagination?: PaginationData;
  hreflang?: HreflangLink[];
  score: number;
}

function extractPaginationLinks(html: string, baseUrl: string): { next?: string; prev?: string } {
  const nextMatch = html.match(/<link[^>]*rel=[\"']next[\"'][^>]*href=[\"']([^\"']*)[\"'][^>]*>/i) ||
                    html.match(/<link[^>]*href=[\"']([^\"']*)[\"'][^>]*rel=[\"']next[\"'][^>]*>/i);
  const prevMatch = html.match(/<link[^>]*rel=[\"']prev[\"'][^>]*href=[\"']([^\"']*)[\"'][^>]*>/i) ||
                    html.match(/<link[^>]*href=[\"']([^\"']*)[\"'][^>]*rel=[\"']prev[\"'][^>]*>/i);

  const result: { next?: string; prev?: string } = {};

  if (nextMatch?.[1]) {
    result.next = new URL(nextMatch[1], baseUrl).href;
  }

  if (prevMatch?.[1]) {
    result.prev = new URL(prevMatch[1], baseUrl).href;
  }

  return result;
}

function extractHreflangLinks(html: string, baseUrl: string): Array<{ lang: string; url: string }> {
  const hreflangRegex = /<link[^>]*rel=[\"']alternate[\"'][^>]*hreflang=[\"']([^\"']*)[\"'][^>]*href=[\"']([^\"']*)[\"'][^>]*>/gi;
  const hreflangRegex2 = /<link[^>]*href=[\"']([^\"']*)[\"'][^>]*hreflang=[\"']([^\"']*)[\"'][^>]*rel=[\"']alternate[\"'][^>]*>/gi;

  const links: Array<{ lang: string; url: string }> = [];

  let match;
  while ((match = hreflangRegex.exec(html)) !== null) {
    const lang = match[1].trim();
    const href = match[2].trim();
    if (lang && href) {
      links.push({
        lang,
        url: new URL(href, baseUrl).href,
      });
    }
  }

  while ((match = hreflangRegex2.exec(html)) !== null) {
    const href = match[1].trim();
    const lang = match[2].trim();
    if (lang && href) {
      const fullUrl = new URL(href, baseUrl).href;
      if (!links.find(l => l.lang === lang && l.url === fullUrl)) {
        links.push({ lang, url: fullUrl });
      }
    }
  }

  return links;
}

function isValidHreflangCode(lang: string): boolean {
  return /^[a-z]{2}(-[A-Z]{2})?$|^x-default$/.test(lang);
}

async function validateUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)',
      },
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function fetchPageHTML(url: string): Promise<string> {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return await response.text();
}

function checkReciprocal(
  currentUrl: string,
  targetLang: string,
  allHreflangMaps: Map<string, Array<{ lang: string; url: string }>>
): boolean {
  const targetHreflangMap = allHreflangMaps.get(currentUrl);
  if (!targetHreflangMap) return false;

  for (const [pageUrl, hreflangs] of allHreflangMaps.entries()) {
    if (pageUrl === currentUrl) continue;

    const pointsToTarget = hreflangs.find(h => h.url === currentUrl);
    if (pointsToTarget) {
      const targetPointsBack = targetHreflangMap.find(h => h.url === pageUrl);
      if (targetPointsBack) {
        return true;
      }
    }
  }

  return false;
}

function calculateScore(pagination?: PaginationData, hreflang?: HreflangLink[]): number {
  let score = 0;

  if (pagination) {
    if (pagination.next && pagination.nextValid) score += 20;
    if (pagination.prev && pagination.prevValid) score += 20;
  }

  if (hreflang && hreflang.length > 0) {
    const validHreflang = hreflang.filter(h => isValidHreflangCode(h.lang));
    if (validHreflang.length > 0) {
      score += 40;

      const reciprocalCount = hreflang.filter(h => h.reciprocal).length;
      if (reciprocalCount > 0) {
        score += 20;
      }
    }
  }

  return Math.min(100, score);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { crawl_id, urls }: PaginationHreflangRequest = await req.json();

    if (!crawl_id || !urls || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing crawl_id or urls" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const results: PaginationHreflangResult[] = [];
    const allHreflangMaps = new Map<string, Array<{ lang: string; url: string }>>();

    for (const url of urls) {
      try {
        const html = await fetchPageHTML(url);
        const paginationLinks = extractPaginationLinks(html, url);
        const hreflangLinks = extractHreflangLinks(html, url);

        allHreflangMaps.set(url, hreflangLinks);

        const pagination: PaginationData | undefined = paginationLinks.next || paginationLinks.prev
          ? {
              next: paginationLinks.next,
              prev: paginationLinks.prev,
            }
          : undefined;

        results.push({
          url,
          pagination,
          hreflang: hreflangLinks.map(h => ({ ...h, reciprocal: false })),
          score: 0,
        });
      } catch (error) {
        results.push({
          url,
          score: 0,
        });
      }
    }

    for (const result of results) {
      if (result.pagination) {
        if (result.pagination.next) {
          result.pagination.nextValid = await validateUrl(result.pagination.next);
        }
        if (result.pagination.prev) {
          result.pagination.prevValid = await validateUrl(result.pagination.prev);
        }
      }

      if (result.hreflang) {
        for (const hreflang of result.hreflang) {
          const targetUrl = hreflang.url;
          const targetHreflangLinks = allHreflangMaps.get(targetUrl);

          if (targetHreflangLinks) {
            const pointsBack = targetHreflangLinks.find(h => h.url === result.url);
            hreflang.reciprocal = !!pointsBack;
          }
        }
      }

      result.score = calculateScore(result.pagination, result.hreflang);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from("seo_intelligence_results")
      .upsert({
        crawl_id,
        module: "pagination_hreflang_validator",
        data: { results },
        analyzed_at: new Date().toISOString(),
      }, {
        onConflict: "crawl_id,module",
      });

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
