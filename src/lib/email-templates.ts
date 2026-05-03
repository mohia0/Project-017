/**
 * Shared logic and defaults for the Email Template System.
 * Ensures 1:1 parity between settings preview, modal preview, and actual delivery.
 */

export interface EmailTemplateDef {
    subject: string;
    body: string;
    is_html?: boolean;
}

export function renderTemplate(
    template: string,
    vars: Record<string, any>,
    protectVars = false,
    suppressUnknown = false
) {
    if (!template) return '';
    
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key, offset) => {
        // Context Awareness: Check if we are inside an HTML tag (e.g. style="background: {{var}}")
        const before = template.substring(0, offset);
        const lastOpen = before.lastIndexOf('<');
        const lastClose = before.lastIndexOf('>');
        const isInsideTag = lastOpen > lastClose;

        const val = vars[key];
        // If suppressUnknown=true (real sends), unknown vars resolve to '' instead of raw {{tag}}
        const resolved = val !== undefined ? String(val) : (suppressUnknown ? '' : match);

        if (isInsideTag) return resolved;

        if (key === 'document_link') {
            // Only emit a button if we have a real URL
            if (val && String(val).trim()) {
                return linkBtn('View Document', vars['accent_color'] || '#10b981', resolved);
            }
            // If no URL (e.g. suppressUnknown resolved to ''), emit nothing
            return '';
        }

        if (protectVars && val !== undefined) {
             return `<span class="vp" data-var="${key}" contenteditable="false">${resolved}</span>`;
        }

        return resolved;
    });
}

export function getBrightness(hex: string) {
    if (!hex) return 255;
    let color = hex.replace('#', '');
    if (color.length === 3) color = color.split('').map(c => c + c).join('');
    const r = parseInt(color.slice(0, 2), 16);
    const g = parseInt(color.slice(2, 4), 16);
    const b = parseInt(color.slice(4, 6), 16);
    return Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
}

// The primary CTA button — dark-native rounded rect style
export const linkBtn = (text: string, accentColor = '#10b981', documentLink = '{{document_link}}') => {
    return `<div data-is-btn="true" style="margin:24px 0 32px 0;"><a href="${documentLink}" style="display:inline-block;background-color:${accentColor};color:#ffffff;padding:13px 24px;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:-0.1px;">${text} &rarr;</a><div style="margin-top:12px;font-size:11px;color:#555;line-height:1.6;">Or open: <a href="${documentLink}" style="color:${accentColor};text-decoration:none;word-break:break-all;">${documentLink}</a></div></div>`;
};

export const DEFAULT_WRAPPER = `<!DOCTYPE html><html lang="en" style="margin:0;padding:0;"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"></head><body style="margin:0;padding:0;background:#1a1a1a;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" border="0" cellpadding="0" cellspacing="0" style="min-height:100vh;width:100%;background:#1a1a1a;border-collapse:collapse;"><tr><td align="center" valign="top" style="padding:40px 16px;"><div style="max-width:580px;width:100%;margin:0 auto;"><div style="background:#0f0f0f;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);box-shadow:0 24px 60px -12px rgba(0,0,0,0.6);"><table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-bottom:1px solid rgba(255,255,255,0.07);"><tr><td style="padding:20px 32px;vertical-align:middle;">{{logo_img}}</td><td style="padding:20px 32px;vertical-align:middle;text-align:right;"><span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 12px;border-radius:50px;background:{{accent_bg}};color:{{accent_color}};border:1px solid {{accent_border}};white-space:nowrap;">{{template_type}}</span></td></tr></table><div id="email-body-content" style="padding:32px 32px 24px;font-size:14px;line-height:1.7;color:#888;"><style>#email-body-content p{margin:0 0 14px 0!important}#email-body-content p:last-child{margin-bottom:0!important}#email-body-content h1,#email-body-content h2{color:#fff!important;margin:0 0 8px 0!important;letter-spacing:-0.5px!important}#email-body-content strong{color:#ccc!important}.vp{display:inline;background:transparent;color:inherit;padding:0;border:none;border-radius:0;font-weight:inherit;font-size:inherit;margin:0;cursor:default;user-select:none;vertical-align:baseline}</style>{{email_body}}</div><div style="padding:14px 32px;border-top:1px solid rgba(255,255,255,0.05);"><table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td align="left" style="font-size:11px;color:#666;vertical-align:middle;padding:0;margin:0;"><span style="display:inline-block;width:6px;height:6px;background:{{accent_color}};border-radius:50%;margin-right:6px;vertical-align:middle;"></span>Securely sent via <strong style="color:#999;font-weight:600;">{{sender_name}}</strong></td><td align="right" style="font-size:11px;color:#555;vertical-align:middle;padding:0;margin:0;">&copy; {{current_year}}</td></tr></table></div></div></div></td></tr></table></body></html>`.trim();

// The master builder used for BOTH previews and real emails
export const buildEmailHtml = (body: string, options: { 
    senderName: string, 
    accentColor: string, 
    logoUrl?: string, 
    isHtml?: boolean, 
    wrapperHtml?: string,
    vars?: Record<string, any>,
    isPreview?: boolean,
    templateType?: string
}) => {
    const { 
        senderName, 
        accentColor, 
        logoUrl, 
        isHtml = true, 
        wrapperHtml = DEFAULT_WRAPPER,
        vars = {},
        isPreview = false,
        templateType = 'NOTIFICATION'
    } = options;

    const brightness = getBrightness(accentColor);
    const accentBg = brightness < 128 ? `${accentColor}18` : `${accentColor}12`;
    const accentBorder = brightness < 128 ? `${accentColor}35` : `${accentColor}25`;

    const allVars: Record<string, any> = { 
        sender_name: senderName, 
        accent_color: accentColor, 
        accent_bg: accentBg,
        accent_border: accentBorder,
        template_type: templateType.toUpperCase(),
        current_year: new Date().getFullYear().toString(),
        ...vars 
    };

    const logoHtml = logoUrl 
        ? `<img src="${logoUrl}" alt="${senderName}" style="max-height:30px;display:block;" />`
        : `<span style="font-size:15px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${senderName}</span>`;

    // 1. Resolve vars in the body first (always — even for plain-text so {{vars}} get filled)
    // suppressUnknown=true for real sends; isPreview keeps raw {{tags}} visible for editing
    const resolvedBody = renderTemplate(body, allVars, isPreview, !isPreview);

    // 2. For plain-text mode, convert line breaks to <br> AFTER variable resolution
    const finalBody = isHtml ? resolvedBody : resolvedBody.replace(/\n/g, '<br/>');

    // 3. Wrap in shell
    let fullHtml = wrapperHtml
        .replace('{{logo_img}}', logoHtml)
        .replace('{{email_body}}', finalBody)
        .replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => allVars[k] ?? m);

    // 3. If in preview, inject the editing bridge
    if (isPreview) {
        const syncScript = `<script>
  window.onload = () => {
    const content = document.getElementById('email-body-content');
    if (!content) return;
    
    content.contentEditable = 'true';
    content.style.outline = 'none';

    content.addEventListener('input', () => {
      const clone = content.cloneNode(true);
      
      // Turn buttons back into variables
      clone.querySelectorAll('[data-is-btn="true"]').forEach(b => {
        b.replaceWith('{{document_link}}');
      });

      // Strip out the variable protection spans
      clone.querySelectorAll('span[data-var]').forEach(s => {
        const varName = s.getAttribute('data-var');
        s.replaceWith('{{' + varName + '}}');
      });
      
      window.parent.postMessage({ 
        type: 'EMAIL_VISUAL_EDIT', 
        payload: clone.innerHTML 
      }, '*');
    });

    document.querySelectorAll('a').forEach(a => {
      a.onclick = (e) => { e.preventDefault(); return false; };
    });
  }
</script>`;
        fullHtml = fullHtml.replace('</body>', `${syncScript}</body>`);
    }

    return fullHtml;
};

export const DEFAULT_TEMPLATES: Record<string, EmailTemplateDef> = {
    invoice: {
        subject: "Invoice #{{invoice_number}} from {{sender_name}}",
        is_html: true,
        body: `<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:{{accent_color}};margin:0 0 10px 0;">New Invoice</p><h1 style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;line-height:1.25;margin:0 0 10px 0;">Hi {{client_name}},<br/>you have a new invoice.</h1><p style="font-size:13px;color:#666;margin:0 0 28px 0;">Invoice <strong>#{{invoice_number}}</strong> has been issued and is ready for your review and payment.</p><div style="background:{{accent_color}}14;border:1px solid {{accent_color}}30;border-radius:16px;padding:24px;margin-bottom:24px;"><p style="font-size:11px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 6px 0;">Amount Due</p><p style="font-size:36px;font-weight:800;color:#fff;letter-spacing:-1.5px;line-height:1;margin:0 0 16px 0;">{{amount_due}}</p><table border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid rgba(255,255,255,0.07);padding-top:16px;width:100%;"><tr><td style="padding-top:14px;padding-right:24px;"><span style="display:block;font-size:10px;font-weight:600;color:#444;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Invoice #</span><span style="display:block;font-size:13px;font-weight:600;color:#bbb;">{{invoice_number}}</span></td><td style="padding-top:14px;"><span style="display:block;font-size:10px;font-weight:600;color:#444;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Due Date</span><span style="display:block;font-size:13px;font-weight:600;color:#bbb;">{{due_date}}</span></td></tr></table></div>{{document_link}}<p style="font-size:13px;color:#555;margin:0 0 24px 0;">If you have any questions about this invoice, just reply to this email.</p>`
    },
    proposal: {
        subject: "Proposal from {{sender_name}}",
        is_html: true,
        body: `<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:{{accent_color}};margin:0 0 10px 0;">New Proposal</p><h1 style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;line-height:1.25;margin:0 0 10px 0;">Hi {{client_name}},<br/>you have a new proposal.</h1><p style="font-size:13px;color:#666;margin:0 0 28px 0;">I've prepared a proposal for you as we discussed. Please review it at your convenience.</p>{{document_link}}<p style="font-size:13px;color:#555;margin:0 0 24px 0;">Let me know if you have any questions or adjustments — I'm happy to help.</p>`
    },
    receipt: {
        subject: "Payment Receipt — Invoice #{{invoice_number}}",
        is_html: true,
        body: `<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:{{accent_color}};margin:0 0 10px 0;">Payment Confirmed</p><h1 style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;line-height:1.25;margin:0 0 10px 0;">Payment received,<br/>thank you! 🎉</h1><p style="font-size:13px;color:#666;margin:0 0 28px 0;">Hi {{client_name}}, we received your payment for Invoice <strong>#{{invoice_number}}</strong> successfully.</p><div style="background:{{accent_color}}14;border:1px solid {{accent_color}}30;border-radius:16px;padding:24px;margin-bottom:24px;"><p style="font-size:11px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 6px 0;">Total Paid</p><p style="font-size:36px;font-weight:800;color:#fff;letter-spacing:-1.5px;line-height:1;margin:0 0 16px 0;">{{amount_paid}}</p><table border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid rgba(255,255,255,0.07);width:100%;"><tr><td style="padding-top:14px;padding-right:24px;"><span style="display:block;font-size:10px;font-weight:600;color:#444;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Invoice #</span><span style="display:block;font-size:13px;font-weight:600;color:#bbb;">{{invoice_number}}</span></td><td style="padding-top:14px;"><span style="display:block;font-size:10px;font-weight:600;color:#444;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Paid On</span><span style="display:block;font-size:13px;font-weight:600;color:#bbb;">{{payment_date}}</span></td></tr></table></div>{{document_link}}<p style="font-size:13px;color:#555;margin:0 0 24px 0;">A copy of your receipt is available at the link above. Reach out anytime if you need anything.</p>`
    },
    overdue_remind: {
        subject: "Action Required: Invoice #{{invoice_number}} is Overdue",
        is_html: true,
        body: `<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#ef4444;margin:0 0 10px 0;">Payment Overdue</p><h1 style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;line-height:1.25;margin:0 0 10px 0;">Hi {{client_name}},<br/>your invoice is overdue.</h1><p style="font-size:13px;color:#666;margin:0 0 28px 0;">Invoice <strong>#{{invoice_number}}</strong> is currently <strong>{{days_overdue}} days overdue</strong>. Please arrange payment at your earliest convenience.</p><div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:16px;padding:24px;margin-bottom:24px;"><p style="font-size:11px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 6px 0;">Amount Due</p><p style="font-size:36px;font-weight:800;color:#fff;letter-spacing:-1.5px;line-height:1;margin:0 0 16px 0;">{{amount_due}}</p><table border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid rgba(255,255,255,0.07);width:100%;"><tr><td style="padding-top:14px;padding-right:24px;"><span style="display:block;font-size:10px;font-weight:600;color:#444;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Invoice #</span><span style="display:block;font-size:13px;font-weight:600;color:#bbb;">{{invoice_number}}</span></td><td style="padding-top:14px;"><span style="display:block;font-size:10px;font-weight:600;color:#444;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Days Overdue</span><span style="display:block;font-size:13px;font-weight:600;color:#ef4444;">{{days_overdue}} days</span></td></tr></table></div>{{document_link}}<p style="font-size:13px;color:#555;margin:0 0 24px 0;">If you have already submitted your payment, please disregard this notice. Thank you!</p>`
    },
    booking_confirmed: {
        subject: "Booking Confirmed",
        is_html: true,
        body: `<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:{{accent_color}};margin:0 0 10px 0;">Booking Confirmed</p><h1 style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;line-height:1.25;margin:0 0 10px 0;">Hi {{client_name}},<br/>your booking is confirmed! 🗓️</h1><p style="font-size:13px;color:#666;margin:0 0 28px 0;">We have received your booking and everything is set. See the details below.</p><div style="background:{{accent_color}}14;border:1px solid {{accent_color}}30;border-radius:16px;padding:24px;margin-bottom:24px;"><table border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;"><tr><td style="padding-bottom:14px;padding-right:24px;"><span style="display:block;font-size:10px;font-weight:600;color:#444;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Date</span><span style="display:block;font-size:14px;font-weight:600;color:#e0e0e0;">{{booked_date}}</span></td><td style="padding-bottom:14px;"><span style="display:block;font-size:10px;font-weight:600;color:#444;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Time</span><span style="display:block;font-size:14px;font-weight:600;color:#e0e0e0;">{{booked_time}}</span></td></tr><tr><td colspan="2" style="padding-top:14px;border-top:1px solid rgba(255,255,255,0.07);"><span style="display:block;font-size:10px;font-weight:600;color:#444;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Timezone</span><span style="display:block;font-size:13px;font-weight:600;color:#bbb;">{{timezone}}</span></td></tr></table></div>{{document_link}}<p style="font-size:13px;color:#555;margin:0 0 24px 0;">We look forward to meeting with you. If you need to reschedule, just reply to this email.</p>`
    },
    workspace_invitation: {
        subject: "You're invited to join {{workspace_name}}",
        is_html: true,
        body: `<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:{{accent_color}};margin:0 0 10px 0;">Workspace Invitation</p><h1 style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;line-height:1.25;margin:0 0 10px 0;">You've been invited<br/>to join {{workspace_name}}.</h1><p style="font-size:13px;color:#666;margin:0 0 28px 0;"><strong>{{sender_name}}</strong> has invited you to join their workspace as a <strong style="color:#bbb;">{{role_name}}</strong>. Click below to create your account and get started.</p><div style="background:{{accent_color}}14;border:1px solid {{accent_color}}30;border-radius:16px;padding:20px 24px;margin-bottom:24px;"><p style="font-size:11px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 4px 0;">Invited As</p><p style="font-size:15px;font-weight:700;color:#e0e0e0;margin:0;">{{invitee_email}}</p></div><div style="margin:24px 0 32px 0;"><a href="{{signup_link}}" style="display:inline-block;background-color:{{accent_color}};color:#ffffff;padding:13px 24px;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:-0.1px;">Accept Invitation &rarr;</a><div style="margin-top:12px;font-size:11px;color:#555;line-height:1.6;">Or open: <a href="{{signup_link}}" style="color:{{accent_color}};text-decoration:none;word-break:break-all;">{{signup_link}}</a></div></div><p style="font-size:13px;color:#555;margin:0 0 24px 0;">If you weren't expecting this invitation, you can safely ignore this email.</p>`
    },
};
