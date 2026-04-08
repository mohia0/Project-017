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

    const { workspace_id, smtp_host, smtp_port, smtp_user, smtp_pass, from_name, from_address } = await req.json()

    // Create a new vault secret for the SMTP password
    const secretName = `smtp_pass_${workspace_id}`;
    
    // We use the service_role key to access the vault which requires higher privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Example logic to store secret in Vault 
    // In actual Supabase environments, one needs to enable the Vault extension
    // and pg_sodium.
    let vaultId = null;
    
    if (smtp_pass) {
        // Query to insert secret into vault
        const { data: vaultData, error: vaultError } = await supabaseAdmin.rpc('insert_secret', {
            secret: smtp_pass,
            name: secretName,
            description: `SMTP password for workspace ${workspace_id}`
        });

        // Assuming vaultData returns the new secret UUID
        if (!vaultError && vaultData) vaultId = vaultData;
    }

    // Now upsert the config without the plaintext password
    const { data, error } = await supabase
      .from('workspace_email_config')
      .upsert({
        workspace_id,
        smtp_host,
        smtp_port,
        smtp_user,
        ...(vaultId ? { smtp_pass_vault_id: vaultId } : {}),
        from_name,
        from_address
      })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, data }), {
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
