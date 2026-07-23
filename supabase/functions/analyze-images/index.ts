import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ImageData {
  src: string;
  alt?: string;
  filename: string;
  type?: string;
  sizeKB?: number;
  status?: number;
  score: number;
  issues?: string[];
}

interface ImageAnalyzerResult {
  url: string;
  images: ImageData[];
  pageScore: number;
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
    const results: ImageAnalyzerResult[] = [];

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
          results.push({
            url,
            images: [],
            pageScore: 0,
          });
          continue;
        }

        const html = await response.text();

        // Extract all img tags using regex
        const imgRegex = /<img[^>]+>/gi;
        const imgMatches = [...html.matchAll(imgRegex)];

        if (imgMatches.length === 0) {
          results.push({
            url,
            images: [],
            pageScore: 100, // No images = perfect score
          });
          continue;
        }

        const images: ImageData[] = [];

        for (const match of imgMatches) {
          const imgTag = match[0];
          
          // Extract attributes
          const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
          const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
          const widthMatch = imgTag.match(/width=["']?([^"'\s>]+)["']?/i);
          const heightMatch = imgTag.match(/height=["']?([^"'\s>]+)["']?/i);

          if (!srcMatch) continue; // Skip if no src

          let imgSrc = srcMatch[1];
          const alt = altMatch ? altMatch[1] : '';

          // Normalize URL (make absolute)
          try {
            const imgUrl = new URL(imgSrc, url);
            imgSrc = imgUrl.toString();
          } catch {
            // If URL parsing fails, try to construct it
            if (imgSrc.startsWith('//')) {
              imgSrc = 'https:' + imgSrc;
            } else if (imgSrc.startsWith('/')) {
              const baseUrl = new URL(url);
              imgSrc = `${baseUrl.origin}${imgSrc}`;
            }
          }

          // Extract filename and extension
          const filename = imgSrc.split('/').pop()?.split('?')[0] || 'unknown';
          const extension = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() : '';

          // Perform HEAD request to get metadata
          let status: number | undefined;
          let contentType: string | undefined;
          let contentLength: number | undefined;

          try {
            const headResponse = await fetch(imgSrc, {
              method: 'HEAD',
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)',
              },
            });
            status = headResponse.status;
            contentType = headResponse.headers.get('content-type') || undefined;
            contentLength = parseInt(headResponse.headers.get('content-length') || '0');
          } catch {
            status = 0; // Fetch failed
          }

          const sizeKB = contentLength ? Math.round(contentLength / 1024) : undefined;

          // Calculate score and issues
          let score = 0;
          const issues: string[] = [];

          // Alt text scoring (+40)
          if (alt && alt.trim().length > 0) {
            const genericAlts = ['image', 'photo', 'picture', 'img', 'icon'];
            const isGeneric = genericAlts.some(g => alt.toLowerCase() === g);
            
            if (isGeneric) {
              score += 20; // Generic alt is better than nothing
              issues.push('Generic alt text');
            } else if (alt.length < 5) {
              score += 25; // Very short alt
              issues.push('Very short alt text');
            } else {
              score += 40; // Good alt text
            }
          } else {
            issues.push('Missing alt text');
          }

          // Filename scoring (+20)
          if (filename !== 'unknown' && !filename.match(/^[a-f0-9]{32}|^img_\d+|^image\d+/i)) {
            score += 20; // Descriptive filename
          } else {
            issues.push('Non-descriptive filename');
          }

          // Status scoring (+20)
          if (status === 200) {
            score += 20;
          } else if (status && status >= 300 && status < 400) {
            score += 10;
            issues.push('Image redirects');
          } else if (status === 0 || (status && status >= 400)) {
            issues.push('Broken image');
          }

          // Size scoring (+10)
          if (sizeKB !== undefined) {
            if (sizeKB < 500) {
              score += 10;
            } else {
              issues.push(`Large file size (${sizeKB} KB)`);
            }
          }

          // Format scoring (+10)
          const modernFormats = ['webp', 'avif', 'jpg', 'jpeg', 'png'];
          if (extension && modernFormats.includes(extension)) {
            score += 10;
          } else if (extension) {
            issues.push('Non-standard image format');
          }

          images.push({
            src: imgSrc,
            alt: alt || undefined,
            filename,
            type: contentType,
            sizeKB,
            status,
            score,
            issues: issues.length > 0 ? issues : undefined,
          });
        }

        // Calculate page score (average of all image scores)
        const pageScore = images.length > 0
          ? Math.round(images.reduce((sum, img) => sum + img.score, 0) / images.length)
          : 100;

        results.push({
          url,
          images,
          pageScore,
        });
      } catch (err) {
        results.push({
          url,
          images: [],
          pageScore: 0,
        });
      }
    }

    // Save to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: dbError } = await supabase
        .from('seo_intelligence_results')
        .upsert({
          crawl_id,
          module: 'image_analyzer',
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
