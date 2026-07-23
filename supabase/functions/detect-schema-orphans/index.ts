import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BlockInfo {
  index: number;
  id: string | null;
  types: string[];
}

interface OrphanResult {
  url: string;
  blockCount: number;
  blocks: BlockInfo[];
  orphanFlags: string[];
  verdict: "CLEAN" | "REVIEW" | "CLEANUP" | "ERROR" | "SKIPPED";
}

function normalizeUrl(u: string): string {
  return u.replace(/\/+$/, "").toLowerCase();
}

function extractTypes(obj: any): string[] {
  if (!obj || typeof obj !== "object") return [];
  const t = obj["@type"];
  if (!t) return [];
  return Array.isArray(t) ? t : [t];
}

function collectAllNodes(parsed: any): any[] {
  if (!parsed || typeof parsed !== "object") return [];
  if (Array.isArray(parsed)) return parsed.flatMap(collectAllNodes);
  const nodes: any[] = [parsed];
  const graph = parsed["@graph"];
  if (Array.isArray(graph)) nodes.push(...graph.flatMap(collectAllNodes));
  return nodes;
}

function hasFaqPageWithoutId(nodes: any[]): boolean {
  return nodes.some(node => {
    const types = extractTypes(node);
    if (!types.includes("FAQPage")) return false;
    const jsonId = node["@id"];
    return !jsonId || String(jsonId).trim() === "";
  });
}

function analyzeUrl(
  url: string,
  html: string,
  managedBlockId: string | undefined,
  normLegitFaq: string[],
  depFragments: string[]
): OrphanResult {
  const idAttrRegex = /id=["']([^"']*)["']/i;
  const fullTagRegex =
    /(<script[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)<\/script>/gi;
  const tagMatches = [...html.matchAll(fullTagRegex)];

  const blocks: (BlockInfo & { nodes: any[] })[] = [];

  for (let i = 0; i < tagMatches.length; i++) {
    const openTag = tagMatches[i][1];
    const content = tagMatches[i][2].trim();
    const idMatch = openTag.match(idAttrRegex);
    const blockId = idMatch ? idMatch[1] : null;

    let types: string[] = [];
    let nodes: any[] = [];
    try {
      const parsed = JSON.parse(content);
      nodes = collectAllNodes(parsed);
      types = [...new Set(nodes.flatMap(extractTypes))];
    } catch {
      types = [];
      nodes = [];
    }

    blocks.push({ index: i, id: blockId, types, nodes });
  }

  const blockCount = blocks.length;
  const orphanFlags: string[] = [];

  // Rule: DUPLICATE_BLOCK
  if (managedBlockId && blockCount > 1) {
    if (blocks.some((b) => b.id !== managedBlockId)) {
      orphanFlags.push("DUPLICATE_BLOCK");
    }
  }

  // Rule: MISSING_MANAGED_BLOCK
  if (managedBlockId && !blocks.some((b) => b.id === managedBlockId)) {
    orphanFlags.push("MISSING_MANAGED_BLOCK");
  }

  // Rule: FAQ_NO_ID — check the FAQPage JSON-LD node's own @id, not the script tag's id attr
  if (blocks.some((b) => b.types.includes("FAQPage") && hasFaqPageWithoutId(b.nodes))) {
    orphanFlags.push("FAQ_NO_ID");
  }

  // Rule: STRAY_FAQPAGE
  if (normLegitFaq.length > 0) {
    const normUrl = normalizeUrl(url);
    if (blocks.some((b) => b.types.includes("FAQPage")) && !normLegitFaq.includes(normUrl)) {
      orphanFlags.push("STRAY_FAQPAGE");
    }
  }

  // Rule: DEPRECATED_PATH — deep-scan raw JSON-LD text
  if (depFragments.length > 0) {
    const combinedRaw = tagMatches.map((m) => m[2]).join(" ");
    for (const frag of depFragments) {
      if (combinedRaw.includes(frag)) {
        orphanFlags.push("DEPRECATED_PATH");
        break;
      }
    }
  }

  const cleanupFlags = new Set(["FAQ_NO_ID", "STRAY_FAQPAGE", "DEPRECATED_PATH"]);
  const reviewFlags = new Set(["DUPLICATE_BLOCK", "MISSING_MANAGED_BLOCK"]);

  let verdict: OrphanResult["verdict"] = "CLEAN";
  if (orphanFlags.some((f) => cleanupFlags.has(f))) {
    verdict = "CLEANUP";
  } else if (orphanFlags.some((f) => reviewFlags.has(f))) {
    verdict = "REVIEW";
  }

  return {
    url,
    blockCount,
    blocks: blocks.map(({ index, id, types }) => ({ index, id, types })),
    orphanFlags,
    verdict,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const {
      crawl_id,
      pages,
      managedBlockId,
      legitFaqUrls,
      deprecatedPathFragments,
    } = await req.json();

    if (!crawl_id || !pages || !Array.isArray(pages)) {
      throw new Error("Missing required parameters: crawl_id and pages array");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = supabaseUrl && supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey)
      : null;

    const normLegitFaq = Array.isArray(legitFaqUrls)
      ? legitFaqUrls.map(normalizeUrl)
      : [];
    const depFragments: string[] = Array.isArray(deprecatedPathFragments)
      ? deprecatedPathFragments.filter(Boolean)
      : [];

    const results: OrphanResult[] = [];
    let failedCount = 0;

    // Pages already have HTML fetched client-side — just analyze
    for (const page of pages as { url: string; html: string | null }[]) {
      if (!page.html) {
        results.push({
          url: page.url,
          blockCount: 0,
          blocks: [],
          orphanFlags: ["FETCH_FAILED"],
          verdict: "ERROR",
        });
        failedCount++;
        continue;
      }
      results.push(analyzeUrl(page.url, page.html, managedBlockId, normLegitFaq, depFragments));
    }

    const summary = {
      total: pages.length,
      processed: results.filter((r) => r.verdict !== "SKIPPED" && r.verdict !== "ERROR").length,
      skipped: 0,
      failed: failedCount,
    };

    if (supabase) {
      const { error: dbError } = await supabase
        .from("seo_intelligence_results")
        .upsert(
          {
            crawl_id,
            module: "schema_cleanup",
            data: { results, summary },
            created_at: new Date().toISOString(),
          },
          { onConflict: "crawl_id,module" }
        );
      if (dbError) console.error("Database error:", dbError);
    }

    return new Response(JSON.stringify({ results, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
