import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import nodemailer from "npm:nodemailer@6.9.9";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { workspace_id } = await req.json();

    const { data: config, error: configError } = await supabaseClient
      .from('workspace_email_config')
      .select('*')
      .eq('workspace_id', workspace_id)
      .single();

    if (configError || !config || !config.smtp_host) {
      throw new Error('SMTP configuration not found for workspace');
    }

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_port === 465, 
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass, 
      },
    });

    const mailOptions = {
      from: `"${config.from_name}" <${config.from_address}>`,
      to: user.email, 
      subject: "SMTP Connection Test - CRM 17",
      text: "Hello! This is a test email sent from your new custom SMTP configuration inside CRM 17. If you are receiving this, your connection is successful!",
      html: "<p>Hello!</p><p>This is a test email sent from your new custom SMTP configuration inside CRM 17. If you are receiving this, your connection is successful!</p>",
    };

    const info = await transporter.sendMail(mailOptions);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
