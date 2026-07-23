import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SocialMetaRequest {
  crawl_id: string;
  urls: string[];
}

interface ImageValidation {
  status: number;
  type?: string;
  sizeKB?: number;
  width?: number;
  height?: number;
  valid: boolean;
}

interface OGData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  site_name?: string;
  missing: string[];
  score: number;
}

interface TwitterData {
  card?: string;
  title?: string;
  description?: string;
  image?: string;
  missing: string[];
  score: number;
}

interface SocialMetaResult {
  url: string;
  og: OGData;
  twitter: TwitterData;
  overall_score: number;
  imageValidation?: {
    og?: ImageValidation;
    twitter?: ImageValidation;
  };
}

async function validateImage(imageUrl: string): Promise<ImageValidation> {
  try {
    const response = await fetch(imageUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)',
      },
    });

    const status = response.status;
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    const sizeKB = contentLength ? Math.round(parseInt(contentLength) / 1024) : undefined;
    const isValidType = contentType?.startsWith('image/') || false;
    const isValidSize = sizeKB ? sizeKB <= 2048 : true; // Max 2MB
    const valid = status === 200 && isValidType && isValidSize;

    return {
      status,
      type: contentType || undefined,
      sizeKB,
      valid,
    };
  } catch (error) {
    return {
      status: 0,
      valid: false,
    };
  }
}

function extractMetaTags(html: string): { og: OGData; twitter: TwitterData } {
  const ogTags: Partial<OGData> = { missing: [], score: 0 };
  const twitterTags: Partial<TwitterData> = { missing: [], score: 0 };

  // Extract OG tags
  const ogTitle = html.match(/<meta[^>]*property=[\"']og:title[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>/i) ||
                  html.match(/<meta[^>]*content=[\"']([^\"']*)[\"'][^>]*property=[\"']og:title[\"'][^>]*>/i);
  const ogDesc = html.match(/<meta[^>]*property=[\"']og:description[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>/i) ||
                 html.match(/<meta[^>]*content=[\"']([^\"']*)[\"'][^>]*property=[\"']og:description[\"'][^>]*>/i);
  const ogImage = html.match(/<meta[^>]*property=[\"']og:image[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>/i) ||
                  html.match(/<meta[^>]*content=[\"']([^\"']*)[\"'][^>]*property=[\"']og:image[\"'][^>]*>/i);
  const ogUrl = html.match(/<meta[^>]*property=[\"']og:url[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>/i) ||
                html.match(/<meta[^>]*content=[\"']([^\"']*)[\"'][^>]*property=[\"']og:url[\"'][^>]*>/i);
  const ogType = html.match(/<meta[^>]*property=[\"']og:type[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>/i) ||
                 html.match(/<meta[^>]*content=[\"']([^\"']*)[\"'][^>]*property=[\"']og:type[\"'][^>]*>/i);
  const ogSiteName = html.match(/<meta[^>]*property=[\"']og:site_name[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>/i) ||
                     html.match(/<meta[^>]*content=[\"']([^\"']*)[\"'][^>]*property=[\"']og:site_name[\"'][^>]*>/i);

  // Extract Twitter tags
  const twitterCard = html.match(/<meta[^>]*name=[\"']twitter:card[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>/i) ||
                      html.match(/<meta[^>]*content=[\"']([^\"']*)[\"'][^>]*name=[\"']twitter:card[\"'][^>]*>/i);
  const twitterTitle = html.match(/<meta[^>]*name=[\"']twitter:title[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>/i) ||
                       html.match(/<meta[^>]*content=[\"']([^\"']*)[\"'][^>]*name=[\"']twitter:title[\"'][^>]*>/i);
  const twitterDesc = html.match(/<meta[^>]*name=[\"']twitter:description[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>/i) ||
                      html.match(/<meta[^>]*content=[\"']([^\"']*)[\"'][^>]*name=[\"']twitter:description[\"'][^>]*>/i);
  const twitterImage = html.match(/<meta[^>]*name=[\"']twitter:image[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>/i) ||
                       html.match(/<meta[^>]*content=[\"']([^\"']*)[\"'][^>]*name=[\"']twitter:image[\"'][^>]*>/i);

  // Populate OG data
  if (ogTitle?.[1]?.trim()) ogTags.title = ogTitle[1].trim();
  else ogTags.missing!.push('og:title');

  if (ogDesc?.[1]?.trim()) ogTags.description = ogDesc[1].trim();
  else ogTags.missing!.push('og:description');

  if (ogImage?.[1]?.trim()) ogTags.image = ogImage[1].trim();
  else ogTags.missing!.push('og:image');

  if (ogUrl?.[1]?.trim()) ogTags.url = ogUrl[1].trim();
  if (ogType?.[1]?.trim()) ogTags.type = ogType[1].trim();
  if (ogSiteName?.[1]?.trim()) ogTags.site_name = ogSiteName[1].trim();

  // Populate Twitter data
  if (twitterCard?.[1]?.trim()) twitterTags.card = twitterCard[1].trim();
  else twitterTags.missing!.push('twitter:card');

  if (twitterTitle?.[1]?.trim()) twitterTags.title = twitterTitle[1].trim();
  else twitterTags.missing!.push('twitter:title');

  if (twitterDesc?.[1]?.trim()) twitterTags.description = twitterDesc[1].trim();
  else twitterTags.missing!.push('twitter:description');

  if (twitterImage?.[1]?.trim()) twitterTags.image = twitterImage[1].trim();
  else twitterTags.missing!.push('twitter:image');

  // Calculate OG score
  let ogScore = 0;
  if (ogTags.title && ogTags.description && ogTags.image) ogScore += 60;
  else ogScore += (ogTags.title ? 20 : 0) + (ogTags.description ? 20 : 0) + (ogTags.image ? 20 : 0);
  ogTags.score = Math.min(100, ogScore);

  // Calculate Twitter score
  let twitterScore = 0;
  if (twitterTags.title && twitterTags.description && twitterTags.image) twitterScore += 30;
  else twitterScore += (twitterTags.title ? 10 : 0) + (twitterTags.description ? 10 : 0) + (twitterTags.image ? 10 : 0);
  twitterTags.score = Math.min(100, twitterScore);

  return {
    og: ogTags as OGData,
    twitter: twitterTags as TwitterData,
  };
}

function calculateOverallScore(og: OGData, twitter: TwitterData, imageValidation?: { og?: ImageValidation; twitter?: ImageValidation }): number {
  let score = 0;

  // Base scores from OG and Twitter
  score += og.score * 0.6; // OG tags worth 60%
  score += twitter.score; // Twitter tags worth 30%

  // Bonus for matching content
  if (og.title && twitter.title && og.title === twitter.title) score += 5;
  if (og.description && twitter.description && og.description === twitter.description) score += 5;

  // Image validation impact
  if (imageValidation) {
    if (imageValidation.og?.valid) score += 5;
    else if (og.image && !imageValidation.og?.valid) score -= 10;

    if (imageValidation.twitter?.valid) score += 5;
    else if (twitter.image && !imageValidation.twitter?.valid) score -= 10;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { crawl_id, urls }: SocialMetaRequest = await req.json();

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

    const results: SocialMetaResult[] = [];

    // Process each URL
    for (const url of urls) {
      try {
        const html = await fetchPageHTML(url);
        const { og, twitter } = extractMetaTags(html);

        // Validate images
        const imageValidation: { og?: ImageValidation; twitter?: ImageValidation } = {};

        if (og.image) {
          imageValidation.og = await validateImage(og.image);
        }

        if (twitter.image && twitter.image !== og.image) {
          imageValidation.twitter = await validateImage(twitter.image);
        } else if (twitter.image === og.image && imageValidation.og) {
          imageValidation.twitter = imageValidation.og;
        }

        const overall_score = calculateOverallScore(og, twitter, imageValidation);

        results.push({
          url,
          og,
          twitter,
          overall_score,
          imageValidation,
        });
      } catch (error) {
        // If a single URL fails, add error result
        results.push({
          url,
          og: {
            missing: ['all'],
            score: 0,
          },
          twitter: {
            missing: ['all'],
            score: 0,
          },
          overall_score: 0,
        });
      }
    }

    // Store in Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from("seo_intelligence_results")
      .upsert({
        crawl_id,
        module: "social_meta_checker",
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
