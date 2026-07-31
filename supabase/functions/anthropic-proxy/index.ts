import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

/**
 * Proxies requests to the Anthropic Messages API so the key never reaches the browser.
 * Same pattern as firecrawl-proxy: the key lives in Supabase secrets and is read here
 * with Deno.env.get, server-side only.
 *
 * The request body is forwarded to Anthropic as-is, so this function does not need
 * updating when the model, token limits, or message shape change.
 *
 * Streaming responses are piped straight through — the client parses SSE itself, and
 * buffering here would break the live progress display.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "Anthropic API key not found. Add ANTHROPIC_API_KEY to your Supabase secrets.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const payload = await req.json();

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    // Forward errors verbatim, with the original status. The client inspects the body
    // to decide whether to retry without images, so the text must survive intact.
    if (!upstream.ok) {
      const errorText = await upstream.text();
      return new Response(errorText, {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isStream = payload?.stream === true;

    if (isStream) {
      return new Response(upstream.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const json = await upstream.text();
    return new Response(json, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `anthropic-proxy failed: ${message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
