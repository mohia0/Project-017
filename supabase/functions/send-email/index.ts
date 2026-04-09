import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import nodemailer from "npm:nodemailer@6.9.9";

function renderTemplate(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    // Auth user making request
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // Parse specific variables sent from client
    const { workspace_id, template_key, to, variables } = await req.json();

    if (!workspace_id || !template_key || !to) {
      throw new Error('Missing required fields (workspace_id, template_key, to)');
    }

    // Fetch config
    const { data: config, error: configError } = await supabaseClient
      .from('workspace_email_config')
      .select('*')
      .eq('workspace_id', workspace_id)
      .single();

    if (configError || !config || !config.smtp_host) {
      throw new Error('SMTP configuration not found for workspace');
    }

    // Fetch custom template
    const { data: template, error: templateError } = await supabaseClient
      .from('email_templates')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('template_key', template_key)
      .single();
      
    // Use fallback templates if nothing in db just in case
    const DEFAULT_TEMPLATES: Record<string, { subject: string, body: string }> = {
        proposal: { subject: "Proposal from " + config.from_name, body: "Hi there,\n\nPlease review your document: {{document_link}}" },
        invoice: { subject: "Invoice from " + config.from_name, body: "Hi there,\n\nPlease review your invoice: {{document_link}}" }
    };

    const finalSubject = template?.subject || DEFAULT_TEMPLATES[template_key]?.subject || "Notification";
    const finalBody = template?.body || DEFAULT_TEMPLATES[template_key]?.body || "You have a new document: {{document_link}}";

    const renderedSubject = renderTemplate(finalSubject, variables || {});
    const renderedBody = renderTemplate(finalBody, variables || {});

    // Convert newlines to HTML br for the html version
    const renderedHtml = renderedBody.replace(/\n/g, '<br/>');

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
      to,
      subject: renderedSubject,
      text: renderedBody,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          ${renderedHtml}
        </div>
      `,
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
