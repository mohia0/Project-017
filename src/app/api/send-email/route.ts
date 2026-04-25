import { NextRequest, NextResponse } from 'next/server';
import * as nodemailer from 'nodemailer';
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

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string; is_html?: boolean }> = {
    proposal: {
        subject: 'Proposal: {{document_title}}',
        body: `Hi {{client_name}},\n\nPlease find your proposal attached below.\n\n{{document_title}}\n\nYou can view and accept it here:\n{{document_link}}\n\nFeel free to reach out if you have any questions.\n\nBest regards,\n{{sender_name}}`,
    },
    invoice: {
        subject: 'Invoice #{{invoice_number}} — {{document_title}}',
        body: `Hi {{client_name}},\n\nPlease find your invoice details below.\n\nInvoice #{{invoice_number}}\nAmount Due: {{amount_due}}\nDue Date: {{due_date}}\n\nYou can view and pay it here:\n{{document_link}}\n\nThank you for your business.\n\nBest regards,\n{{sender_name}}`,
    },
    receipt: {
        subject: 'Payment Receipt - Invoice #{{invoice_number}}',
        is_html: true,
        body: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Payment Receipt</title></head>
<body style="margin:0;padding:0;background:#E8ECF2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" bgcolor="#E8ECF2" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:48px 16px;">
<div style="width:100%;max-width:400px;margin:0 auto;">

  <!-- Badge sits above the card via relative/z-index in email-safe way -->
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:0;line-height:0;">
    <div style="display:inline-block;width:60px;height:60px;background:{{accent_color}};border-radius:50%;border:5px solid #E8ECF2;box-sizing:border-box;margin-bottom:-30px;">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:10px auto;"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
  </td></tr></table>

  <!-- Card top (rounded corners) -->
  <div style="background:#1C2333;border-radius:16px 16px 0 0;padding:44px 28px 28px;text-align:center;">

    <h1 style="margin:0 0 8px;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">Payment Success!</h1>
    <p style="margin:0 0 22px;color:#8892A4;font-size:13px;line-height:1.6;">Your payment has been successfully done.</p>
    <div style="border-top:1px solid #2B3549;margin-bottom:22px;"></div>

    <p style="margin:0 0 6px;color:#8892A4;font-size:10px;text-transform:uppercase;letter-spacing:2.5px;font-weight:700;">Total Payment</p>
    <p style="margin:0 0 28px;color:#ffffff;font-size:30px;font-weight:800;letter-spacing:-0.5px;">{{amount_paid}}</p>

    <!-- Info grid -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="padding:0 4px 8px 0;vertical-align:top;">
          <div style="background:#131B2C;border:1px solid #2B3549;border-radius:10px;padding:14px 12px;">
            <p style="margin:0 0 5px;color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;text-align:left;">Ref Number</p>
            <p style="margin:0;color:#E5E7EB;font-size:12px;font-weight:700;font-family:monospace;text-align:left;word-break:break-all;">{{invoice_number}}</p>
          </div>
        </td>
        <td width="50%" style="padding:0 0 8px 4px;vertical-align:top;">
          <div style="background:#131B2C;border:1px solid #2B3549;border-radius:10px;padding:14px 12px;">
            <p style="margin:0 0 5px;color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;text-align:left;">Payment Time</p>
            <p style="margin:0;color:#E5E7EB;font-size:12px;font-weight:700;text-align:left;">{{payment_date}}</p>
          </div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding:0 4px 0 0;vertical-align:top;">
          <div style="background:#131B2C;border:1px solid #2B3549;border-radius:10px;padding:14px 12px;">
            <p style="margin:0 0 5px;color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;text-align:left;">Payment Method</p>
            <p style="margin:0;color:#E5E7EB;font-size:12px;font-weight:700;text-align:left;">Bank Transfer</p>
          </div>
        </td>
        <td width="50%" style="padding:0 0 0 4px;vertical-align:top;">
          <div style="background:#131B2C;border:1px solid #2B3549;border-radius:10px;padding:14px 12px;">
            <p style="margin:0 0 5px;color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;text-align:left;">Sender Name</p>
            <p style="margin:0;color:#E5E7EB;font-size:12px;font-weight:700;text-align:left;">{{client_name}}</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- CTA link -->
    <div style="margin-top:24px;padding-bottom:4px;">
      <a href="{{document_link}}" style="display:inline-block;color:#8892A4;font-size:13px;font-weight:600;text-decoration:none;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:6px;"><path d="M12 2v13"/><path d="M5 10l7 7 7-7"/><path d="M3 21h18"/></svg>
        Get PDF Receipt
      </a>
    </div>
  </div>

  <!-- Scalloped receipt bottom teeth (same color as card, pointing down) -->
  <svg width="100%" viewBox="0 0 400 20" xmlns="http://www.w3.org/2000/svg" style="display:block;margin-top:-1px;">
    <path d="M0,0 L400,0 Q390,20,380,0 Q370,20,360,0 Q350,20,340,0 Q330,20,320,0 Q310,20,300,0 Q290,20,280,0 Q270,20,260,0 Q250,20,240,0 Q230,20,220,0 Q210,20,200,0 Q190,20,180,0 Q170,20,160,0 Q150,20,140,0 Q130,20,120,0 Q110,20,100,0 Q90,20,80,0 Q70,20,60,0 Q50,20,40,0 Q30,20,20,0 Q10,20,0,0 Z" fill="#1C2333"/>
  </svg>

  <!-- Footer -->
  <p style="text-align:center;color:#9AA0AD;font-size:11px;margin:16px 0 0;">Thank you for your business &mdash; <strong>{{sender_name}}</strong></p>

</div>
</td></tr></table>
</body></html>`,
    },
    overdue_remind: {
        subject: 'Action Required: Overdue Invoice #{{invoice_number}}',
        body: `Hi {{client_name}},\n\nThis is a gentle reminder that your payment for invoice #{{invoice_number}} is currently {{days_overdue}} days overdue.\n\nAmount Due: {{amount_due}}\n\nPlease review and pay your invoice securely here:\n{{document_link}}\n\nIf you have already made the payment, please disregard this message.\n\nBest regards,\n{{sender_name}}`,
    },
    booking_confirmed: {
        subject: 'Booking Confirmed: {{scheduler_title}}',
        body: `Hi {{client_name}},\n\nYour booking for "{{scheduler_title}}" has been confirmed.\n\nDate: {{booked_date}}\nTime: {{booked_time}}\nTimezone: {{timezone}}\n\nWe look forward to meeting with you!\n\nBest regards,\n{{sender_name}}`,
    },
    booking_alert: {
        subject: 'New Booking: {{scheduler_title}} — {{client_name}}',
        body: `Hi,\n\nYou have a new booking for "{{scheduler_title}}".\n\nClient: {{client_name}}\nEmail: {{client_email}}\nDate: {{booked_date}}\nTime: {{booked_time}}\nTimezone: {{timezone}}\n\nBest regards,\n{{sender_name}}`,
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
        let is_html = body.is_html;

        const origin = req.nextUrl.origin;

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
                .select('subject, body, is_html')
                .eq('workspace_id', workspace_id)
                .eq('template_key', template_key)
                .single();
            if (tmpl?.subject && tmpl?.body) {
                dbTemplate = tmpl;
                if (is_html === undefined) is_html = tmpl.is_html;
            }
        }
        // Fall back to default template's is_html flag (e.g. receipt template is HTML by default)
        if (is_html === undefined && template_key && DEFAULT_TEMPLATES[template_key]?.is_html) {
            is_html = true;
        }

        // Fetch branding for accent color and logos
        const { data: branding } = await supabaseService
            .from('workspace_branding')
            .select('primary_color, logo_light_url, logo_dark_url')
            .eq('workspace_id', workspace_id)
            .single();

        const accentColor = branding?.primary_color || '#10b981';
        const isAccentDark = getBrightness(accentColor) < 128;
        
        // Priority: If background is dark, try light logo then dark. If light, try dark then light.
        let logoUrl = isAccentDark 
            ? (branding?.logo_light_url || branding?.logo_dark_url) 
            : (branding?.logo_dark_url || branding?.logo_light_url);
        
        // Ensure logo URL is absolute
        if (logoUrl && !logoUrl.startsWith('http')) {
            const cleanLogoPath = logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`;
            logoUrl = `${origin}${cleanLogoPath}`;
        }

        const headerTextColor = isAccentDark ? '#ffffff' : '#000000';

        const fallback = DEFAULT_TEMPLATES[template_key] || DEFAULT_TEMPLATES.invoice;
        const rawSubject = subject_override ?? dbTemplate?.subject ?? fallback.subject;
        const rawBody    = body_override    ?? dbTemplate?.body    ?? fallback.body;

        if (variables.document_link && !variables.document_link.startsWith('http')) {
            const cleanLink = variables.document_link.startsWith('/') ? variables.document_link : `/${variables.document_link}`;
            variables.document_link = `${origin}${cleanLink}`;
        }

        const allVars = {
            sender_name: config.from_name || '',
            accent_color: accentColor,
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
        
        let finalHtml = '';

        if (is_html) {
            // Raw HTML mode: Resolve vars but skip auto-formatting and branding shell
            const renderedHtml = renderTemplate(rawBody, allVars);
            
            // If it looks like a full document, send as is.
            if (renderedHtml.toLowerCase().includes('<html') || renderedHtml.toLowerCase().includes('<!doctype')) {
                finalHtml = renderedHtml;
            } else {
                // Fragment: Send as is but maybe wrap in a basic font container
                finalHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${renderedHtml}</div>`;
            }
        } else {
            // Standard mode: Branding shell + Auto-formatting
            // 1. Initial render of the template tags if any
            let htmlBody = renderTemplate(rawBody, htmlVars).replace(/\n/g, '<br/>');

        // 2. Proactive replacement for special variables by value (What You See Is What You Get)
        // This handles cases where the user might have edited the body and the {{tags}} are gone,
        // but the actual values (like the link or amounts) are still there and should be styled.
        
        // Style amount_due/amount_paid if they appear as plain text
        if (variables.amount_due) {
            const escapedValue = variables.amount_due.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const styledValue = `<strong style="color: ${accentColor}; font-size: 1.15em;">${variables.amount_due}</strong>`;
            // Only replace if it's not already wrapped in the style or button
            if (!htmlBody.includes('style="color: ' + accentColor)) {
                htmlBody = htmlBody.replace(new RegExp(escapedValue, 'g'), styledValue);
            }
        }
        if (variables.amount_paid) {
            const escapedValue = variables.amount_paid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const styledValue = `<strong style="color: ${accentColor}; font-size: 1.15em;">${variables.amount_paid}</strong>`;
            if (!htmlBody.includes('style="color: ' + accentColor)) {
                htmlBody = htmlBody.replace(new RegExp(escapedValue, 'g'), styledValue);
            }
        }

        // Wrap document_link in a button if it appears as a plain URL AND wasn't already wrapped via {{document_link}}
        if (variables.document_link && !rawBody.includes('{{document_link}}')) {
            const link = variables.document_link;
            const escapedLink = link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const buttonHtml = `
<div style="margin: 32px 0;">
    <a href="${link}" style="display: inline-block; background-color: ${accentColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
        View Document
    </a>
    <div style="margin-top: 16px; font-size: 12px; color: #888; line-height: 1.5;">
        If the button above doesn't work, copy and paste this link into your browser:<br/>
        <a href="${link}" style="color: ${accentColor}; text-decoration: none; word-break: break-all;">${link}</a>
    </div>
</div>`.trim();

            htmlBody = htmlBody.replace(new RegExp(escapedLink, 'g'), buttonHtml);
        }

        const logoHtml = logoUrl ? `
            <img src="${logoUrl}" alt="${config.from_name}" style="max-height: 32px; display: block;" />
        ` : `
            <span style="font-size: 16px; font-weight: 600; color: ${headerTextColor};">${config.from_name}</span>
        `;

            finalHtml = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; padding: 24px 16px;">
                    <div style="max-width: 600px; margin: 0 auto; color: #333; border-radius: 8px; overflow: hidden; border: 1px solid #eaeaea;">
                        <div style="background-color: ${accentColor}; padding: 24px 32px; text-align: left;">
                            ${logoHtml}
                        </div>
                        <div style="padding: 40px 32px; font-size: 15px; line-height: 1.6; color: #444;">
                            ${htmlBody}
                        </div>
                        <div style="padding: 24px 32px; border-top: 1px solid #f0f0f0;">
                            <p style="margin: 0; font-size: 12px; color: #999;">Securely sent via <span style="font-weight: 500; color: #777;">${config.from_name}</span></p>
                        </div>
                    </div>
                </div>
            `;
        }

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

        const recipient = to.trim();
        console.log(`[send-email] Sending email to: ${recipient}`);

        const info = await transporter.sendMail({
            from: `"${config.from_name}" <${config.from_address}>`,
            to: recipient,
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
