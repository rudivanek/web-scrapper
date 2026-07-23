import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PageImageInfo {
  url: string;
  alt?: string;
}

interface ImageUsageRecord {
  src: string;
  uses: number;
  uniqueAlts: number;
  pages: PageImageInfo[];
  domain: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { crawl_id, urls } = await req.json();

    if (!crawl_id || !urls || !Array.isArray(urls)) {
      throw new Error("Missing required parameters: crawl_id and urls array");
    }

    // Limit to 100 URLs max
    const urlsToAnalyze = urls.slice(0, 100);

    // Build image usage index
    const imageIndex = new Map<string, PageImageInfo[]>();

    // Process each URL
    for (const url of urlsToAnalyze) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)',
          },
          redirect: 'follow',
        });

        if (!response.ok) {
          continue;
        }

        const html = await response.text();

        // Extract all img tags using regex
        const imgRegex = /<img[^>]+>/gi;
        const imgMatches = [...html.matchAll(imgRegex)];

        for (const match of imgMatches) {
          const imgTag = match[0];
          
          // Extract src and alt attributes
          const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
          const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);

          if (!srcMatch) continue;

          let imgSrc = srcMatch[1];
          const alt = altMatch ? altMatch[1] : undefined;

          // Normalize URL (make absolute)
          try {
            const imgUrl = new URL(imgSrc, url);
            // Strip query params for grouping
            imgSrc = `${imgUrl.origin}${imgUrl.pathname}`;
          } catch {
            // If URL parsing fails, try to construct it
            if (imgSrc.startsWith('//')) {
              imgSrc = 'https:' + imgSrc;
            } else if (imgSrc.startsWith('/')) {
              const baseUrl = new URL(url);
              imgSrc = `${baseUrl.origin}${imgSrc}`;
            }
            // Strip query params
            imgSrc = imgSrc.split('?')[0];
          }

          // Add to index
          if (!imageIndex.has(imgSrc)) {
            imageIndex.set(imgSrc, []);
          }

          imageIndex.get(imgSrc)!.push({
            url,
            alt,
          });
        }
      } catch (err) {
        // Skip this URL on error
        continue;
      }
    }

    // Convert index to results array
    const results: ImageUsageRecord[] = [];

    for (const [src, pages] of imageIndex.entries()) {
      // Count unique alt texts
      const uniqueAlts = new Set(
        pages.map(p => p.alt || '').filter(a => a.length > 0)
      ).size;

      // Extract domain from image src
      let domain = 'unknown';
      try {
        const srcUrl = new URL(src);
        domain = srcUrl.hostname;
      } catch {
        // Keep as unknown
      }

      results.push({
        src,
        uses: pages.length,
        uniqueAlts,
        pages,
        domain,
      });
    }

    // Sort by usage count (descending)
    results.sort((a, b) => b.uses - a.uses);

    // Save to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: dbError } = await supabase
        .from('seo_intelligence_results')
        .upsert({
          crawl_id,
          module: 'image_usage_mapper',
          data: { results },
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'crawl_id,module',
        });

      if (dbError) {
        console.error('Database error:', dbError);
      }
    }

    return new Response(
      JSON.stringify({ results }),
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
