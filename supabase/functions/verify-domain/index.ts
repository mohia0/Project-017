import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { domainId } = await req.json()

    // 1. Fetch domain record 
    const { data: domainRec, error: fetchError } = await supabase
        .from('workspace_domains')
        .select('*')
        .eq('id', domainId)
        .single()
    
    if (fetchError || !domainRec) throw new Error("Domain not found");

    const domain = domainRec.domain;

    // 2. Perform DNS Lookup
    // In Deno, we could use a DNS API or native Deno.resolveDns
    let isVerified = false;
    let errorMessage = '';

    try {
        const records = await Deno.resolveDns(domain, "CNAME");
        if (records.includes("proxy.minimal-crm.app")) {
            isVerified = true;
        } else {
            errorMessage = "CNAME record found but does not point to proxy.minimal-crm.app";
        }
    } catch (e) {
        errorMessage = "No CNAME record found for this domain. Make sure it has propagated.";
    }

    // 3. Update Status
    if (isVerified) {
        await supabase
            .from('workspace_domains')
            .update({ 
                status: 'active', 
                dns_verified_at: new Date().toISOString(),
                error_message: null
            })
            .eq('id', domainId)
    } else {
        await supabase
            .from('workspace_domains')
            .update({ 
                status: 'error', 
                error_message: errorMessage
            })
            .eq('id', domainId)
    }

    return new Response(JSON.stringify({ success: true, isVerified, errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
