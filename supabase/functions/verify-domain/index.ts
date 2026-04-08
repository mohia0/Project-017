import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERCEL_TOKEN = Deno.env.get('VERCEL_TOKEN');
const VERCEL_PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { domainId, domain } = await req.json();
    if (!domainId || !domain) {
      return new Response(JSON.stringify({ error: 'domainId and domain required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Ensure domain is registered with Vercel (idempotent)
    if (VERCEL_TOKEN && VERCEL_PROJECT_ID) {
      await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: domain }),
      });
    }

    // Step 2: Check if DNS is verified via Vercel
    let verified = false;
    let errorMsg: string | null = null;

    if (VERCEL_TOKEN && VERCEL_PROJECT_ID) {
      const checkRes = await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`,
        { headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` } }
      );
      const checkData = await checkRes.json();

      if (checkData.verified === true) {
        verified = true;
      } else {
        errorMsg = 'DNS not yet verified. Make sure your CNAME record is set, then wait a few minutes and try again.';
      }
    } else {
      errorMsg = 'Vercel credentials not configured.';
    }

    // Step 3: Update Supabase domain status
    await supabase
      .from('workspace_domains')
      .update({ status: verified ? 'active' : 'pending', error_message: errorMsg })
      .eq('id', domainId);

    return new Response(
      JSON.stringify({ verified, status: verified ? 'active' : 'pending', error: errorMsg }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
