import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SchemaValidationResult {
  url: string;
  schemas: {
    type: string;
    valid: boolean;
    error?: string;
    context?: string;
    rawJson?: any;
  }[];
  rawJson?: any[];
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
    const results: SchemaValidationResult[] = [];

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
            schemas: [{
              type: 'Error',
              valid: false,
              error: `HTTP ${response.status}: ${response.statusText}`,
            }],
          });
          continue;
        }

        const html = await response.text();

        // Extract JSON-LD blocks using regex
        const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        const matches = [...html.matchAll(jsonLdRegex)];

        if (matches.length === 0) {
          results.push({
            url,
            schemas: [],
          });
          continue;
        }

        const schemas: SchemaValidationResult['schemas'] = [];
        const rawJson: any[] = [];

        for (const match of matches) {
          try {
            const jsonContent = match[1].trim();
            const parsedJson = JSON.parse(jsonContent);
            rawJson.push(parsedJson);

            // Handle both single objects and arrays
            const schemaObjects = Array.isArray(parsedJson) ? parsedJson : [parsedJson];

            for (const schemaObj of schemaObjects) {
              const validation = validateSchema(schemaObj);
              // Attach the raw JSON to each schema
              schemas.push({
                ...validation,
                rawJson: schemaObj,
              });
            }
          } catch (parseError) {
            schemas.push({
              type: 'Unknown',
              valid: false,
              error: `JSON parse error: ${parseError.message}`,
            });
          }
        }

        results.push({
          url,
          schemas,
          rawJson,
        });
      } catch (err) {
        results.push({
          url,
          schemas: [{
            type: 'Error',
            valid: false,
            error: `Fetch error: ${err.message}`,
          }],
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
          module: 'schema_validator',
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

function validateSchema(schemaObj: any): { type: string; valid: boolean; error?: string; context?: string } {
  // Check if @context exists
  const context = schemaObj['@context'];
  const type = schemaObj['@type'];

  if (!type) {
    return {
      type: 'Unknown',
      valid: false,
      error: 'Missing @type property',
      context: context || undefined,
    };
  }

  if (!context) {
    return {
      type: type,
      valid: false,
      error: 'Missing @context property',
    };
  }

  // Check if context includes schema.org
  const contextStr = Array.isArray(context) ? context.join(' ') : String(context);
  if (!contextStr.includes('schema.org')) {
    return {
      type: type,
      valid: false,
      error: '@context does not reference schema.org',
      context: contextStr,
    };
  }

  // Known schema types with basic validation
  const knownTypes: Record<string, string[]> = {
    'Organization': ['name'],
    'Product': ['name'],
    'FAQPage': ['mainEntity'],
    'Article': ['headline'],
    'BreadcrumbList': ['itemListElement'],
    'LocalBusiness': ['name'],
    'Event': ['name', 'startDate'],
    'Person': ['name'],
    'WebSite': ['url'],
    'WebPage': ['name'],
    'BlogPosting': ['headline'],
    'NewsArticle': ['headline'],
  };

  const requiredFields = knownTypes[type];

  if (requiredFields) {
    for (const field of requiredFields) {
      if (!schemaObj[field]) {
        return {
          type: type,
          valid: false,
          error: `Missing required field: ${field}`,
          context: contextStr,
        };
      }
    }
  }

  return {
    type: type,
    valid: true,
    context: contextStr,
  };
}
