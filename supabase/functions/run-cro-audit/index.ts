import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const body = await req.json();
    const { userId, brandName, pageType, targetUrl, pageMarkdown } = body;

    if (!userId || !brandName || !pageType || !targetUrl || !pageMarkdown) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: newAudit, error: insertError } = await serviceClient
      .from('audits')
      .insert({
        user_id: userId,
        brand_name: brandName,
        page_type: pageType,
        target_url: targetUrl,
        source_markdown: pageMarkdown,
        status: 'processing',
      })
      .select()
      .single();

    if (insertError || !newAudit) {
      return new Response(JSON.stringify({ success: false, error: insertError?.message || 'Failed to create audit' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, auditId: newAudit.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
