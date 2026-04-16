import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseService } from '@/lib/supabase-service';

function renderTemplate(template: string, variables: Record<string, string>) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? match);
}

function getBrightness(hex: string) {
    if (!hex) return 255;
    let color = hex.replace('#', '');
    if (color.length === 3) color = color.split('').map(c => c + c).join('');
    const r = parseInt(color.slice(0, 2), 16);
    const g = parseInt(color.slice(2, 4), 16);
    const b = parseInt(color.slice(4, 6), 16);
    // HSP formula for improved perceptual accuracy
    return Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
}

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
    proposal: {
        subject: 'Proposal: {{document_title}}',
        body: `Hi {{client_name}},\n\nPlease find your proposal attached below.\n\n{{document_title}}\n\nYou can view and accept it here:\n{{document_link}}\n\nFeel free to reach out if you have any questions.\n\nBest regards,\n{{sender_name}}`,
    },
    invoice: {
        subject: 'Invoice #{{invoice_number}} — {{document_title}}',
        body: `Hi {{client_name}},\n\nPlease find your invoice details below.\n\nInvoice #{{invoice_number}}\nAmount Due: {{amount_due}}\nDue Date: {{due_date}}\n\nYou can view and pay it here:\n{{document_link}}\n\nThank you for your business.\n\nBest regards,\n{{sender_name}}`,
    },
    receipt: {
        subject: 'Payment Receipt — Invoice #{{invoice_number}}',
        body: `Hi {{client_name}},\n\nThank you! We have received your payment.\n\nInvoice #{{invoice_number}}\nAmount Paid: {{amount_paid}}\n\nYou can view your receipt here:\n{{document_link}}\n\nWe appreciate your business!\n\nBest regards,\n{{sender_name}}`,
    },
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            workspace_id,
            template_key,
            to,
            variables = {},
            subject_override,
            body_override,
        } = body;

        if (!workspace_id || !to) {
            return NextResponse.json({ error: 'Missing required fields (workspace_id, to)' }, { status: 400 });
        }

        // Fetch SMTP config
        const { data: config, error: configError } = await supabaseService
            .from('workspace_email_config')
            .select('*')
            .eq('workspace_id', workspace_id)
            .single();

        if (configError || !config?.smtp_host) {
            return NextResponse.json(
                { error: 'SMTP configuration not found. Please configure your email settings first.' },
                { status: 400 }
            );
        }

        // Fetch custom template from DB (if exists)
        let dbTemplate: { subject: string; body: string } | null = null;
        if (template_key) {
            const { data: tmpl } = await supabaseService
                .from('email_templates')
                .select('subject, body')
                .eq('workspace_id', workspace_id)
                .eq('template_key', template_key)
                .single();
            if (tmpl?.subject && tmpl?.body) {
                dbTemplate = tmpl;
            }
        }

        // Fetch branding for accent color and logos
        const { data: branding } = await supabaseService
            .from('workspace_branding')
            .select('primary_color, logo_light_url, logo_dark_url')
            .eq('workspace_id', workspace_id)
            .single();

        const accentColor = branding?.primary_color || '#10b981';
        const isAccentDark = getBrightness(accentColor) < 128;
        const logoUrl = isAccentDark ? branding?.logo_light_url : (branding?.logo_dark_url || branding?.logo_light_url);
        const headerTextColor = isAccentDark ? '#ffffff' : '#000000';

        const fallback = DEFAULT_TEMPLATES[template_key] || DEFAULT_TEMPLATES.invoice;
        const rawSubject = subject_override ?? dbTemplate?.subject ?? fallback.subject;
        const rawBody    = body_override    ?? dbTemplate?.body    ?? fallback.body;

        const allVars = {
            sender_name: config.from_name || '',
            ...variables,
        };

        const htmlVars = { ...allVars };

        if (htmlVars.amount_due) {
            htmlVars.amount_due = `<strong style="color: ${accentColor}; font-size: 1.15em;">${htmlVars.amount_due}</strong>`;
        }
        if (htmlVars.amount_paid) {
            htmlVars.amount_paid = `<strong style="color: ${accentColor}; font-size: 1.15em;">${htmlVars.amount_paid}</strong>`;
        }
        if (htmlVars.document_link) {
            const link = htmlVars.document_link;
            htmlVars.document_link = `
<div style="margin: 32px 0;">
    <a href="${link}" style="display: inline-block; background-color: ${accentColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
        View Document
    </a>
    <div style="margin-top: 16px; font-size: 12px; color: #888; line-height: 1.5;">
        If the button above doesn't work, copy and paste this link into your browser:<br/>
        <a href="${link}" style="color: ${accentColor}; text-decoration: none; word-break: break-all;">${link}</a>
    </div>
</div>`.trim();
        }

        const finalSubject = renderTemplate(rawSubject, allVars);
        const textBody     = renderTemplate(rawBody, allVars);
        
        let htmlBodyTemplate = rawBody.replace(/\n/g, '<br/>');
        const finalHtmlBody  = renderTemplate(htmlBodyTemplate, htmlVars);

        const logoHtml = logoUrl ? `
            <img src="${logoUrl}" alt="${config.from_name}" style="max-height: 32px; display: block;" />
        ` : `
            <span style="font-size: 16px; font-weight: 600; color: ${headerTextColor};">${config.from_name}</span>
        `;

        const finalHtml    = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 24px 16px;">
                <div style="max-width: 600px; margin: 0 auto; color: #333; border-radius: 8px; overflow: hidden; border: 1px solid #eaeaea;">
                    <div style="background-color: ${accentColor}; padding: 24px 32px; text-align: left;">
                        ${logoHtml}
                    </div>
                    <div style="padding: 40px 32px; font-size: 15px; line-height: 1.6; color: #444;">
                        ${finalHtmlBody}
                    </div>
                    <div style="padding: 24px 32px; border-top: 1px solid #f0f0f0;">
                        <p style="margin: 0; font-size: 12px; color: #999;">Securely sent via <span style="font-weight: 500; color: #777;">${config.from_name}</span></p>
                    </div>
                </div>
            </div>
        `;

        const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: Number(config.smtp_port) || 587,
            secure: Number(config.smtp_port) === 465,
            auth: {
                user: config.smtp_user,
                pass: config.smtp_pass,
            },
            tls: { rejectUnauthorized: false },
        });

        const info = await transporter.sendMail({
            from: `"${config.from_name}" <${config.from_address}>`,
            to,
            subject: finalSubject,
            text: textBody,
            html: finalHtml,
        });

        return NextResponse.json({ success: true, messageId: info.messageId });
    } catch (err: any) {
        console.error('[send-email] Error:', err);
        return NextResponse.json(
            { error: err?.message || 'Failed to send email' },
            { status: 500 }
        );
    }
}
