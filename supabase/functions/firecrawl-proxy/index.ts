import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { endpoint, body, method = "POST", url } = await req.json();

    if (!endpoint) {
      throw new Error("Missing 'endpoint' parameter");
    }

    // Handle direct text file fetching
    if (endpoint === '/fetch-text' && url) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)',
          },
        });

        if (!response.ok) {
          return new Response(
            JSON.stringify({ content: null, error: 'File not found' }),
            {
              status: 200,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }

        const content = await response.text();
        return new Response(
          JSON.stringify({ content }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ content: null, error: err.message }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    if (!FIRECRAWL_API_KEY) {
      throw new Error("Firecrawl API key not found. Please add FIRECRAWL_API_KEY to your Supabase secrets.");
    }

    const firecrawlUrl = `https://api.firecrawl.dev${endpoint}`;

    // Use longer timeout for map/crawl/interact endpoints
    const isLongRunning =
      endpoint === '/v1/map' ||
      endpoint === '/v1/crawl' ||
      endpoint.startsWith('/v1/crawl/') ||
      endpoint.startsWith('/v2/scrape/');
    const timeout = isLongRunning ? 120000 : 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        },
        signal: controller.signal,
      };

      if (method === "POST" && body) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(firecrawlUrl, fetchOptions);

      clearTimeout(timeoutId);

      let data;
      const contentType = response.headers.get("content-type");

      try {
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          data = { error: text || "Non-JSON response from Firecrawl API" };
        }
      } catch (parseError) {
        const text = await response.text();
        data = { error: `Failed to parse response: ${text}` };
      }

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: data.error || "Firecrawl API error", status: response.status }),
          {
            status: response.status,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      return new Response(JSON.stringify(data), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        const timeoutMsg = endpoint === '/v1/map'
          ? "Request timeout: Firecrawl map took too long (>2min)"
          : "Request timeout: Firecrawl API took too long to respond (>30s)";
        return new Response(
          JSON.stringify({ error: timeoutMsg }),
          {
            status: 504,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      throw fetchError;
    }
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
