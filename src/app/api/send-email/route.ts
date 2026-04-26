import { NextRequest, NextResponse } from 'next/server';
import * as nodemailer from 'nodemailer';
import { supabaseService } from '@/lib/supabase-service';
import { buildEmailHtml, DEFAULT_TEMPLATES, renderTemplate } from '@/lib/email-templates';

const TYPE_MAP: Record<string, string> = {
    proposal: 'Proposal',
    invoice: 'Invoice',
    receipt: 'Receipt',
    overdue_remind: 'Overdue Reminder',
    booking_confirmed: 'Booking Confirmed',
    scheduler: 'Scheduler'
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
            config_id,
            config_override
        } = body;
        let is_html = body.is_html;

        const origin = req.nextUrl.origin;

        if (!workspace_id || !to) {
            return NextResponse.json({ error: 'Missing required fields (workspace_id, to)' }, { status: 400 });
        }

        // Fetch SMTP config or use override
        let config = config_override;
        let configError = null;

        if (!config) {
            let query = supabaseService
                .from('workspace_email_config')
                .select('*')
                .eq('workspace_id', workspace_id);
                
            if (config_id) {
                query = query.eq('id', config_id);
            } else {
                query = query.eq('is_default', true);
            }

            const res = await query.single();
            config = res.data;
            configError = res.error;
        }

        if (configError || !config?.smtp_host) {
            return NextResponse.json(
                { error: 'SMTP configuration not found. Please configure your email settings first.' },
                { status: 400 }
            );
        }

        // Fetch custom template from DB (if exists)
        let dbTemplate: { subject: string; body: string; wrapper?: string; is_html?: boolean } | null = null;
        if (template_key) {
            const { data } = await supabaseService
                .from('email_templates')
                .select('*')
                .eq('workspace_id', workspace_id)
                .eq('template_key', template_key)
                .single();
            if (data) dbTemplate = data;
        }

        // Determine final subject and body content
        const fallbackTemplate = template_key ? DEFAULT_TEMPLATES[template_key] : null;
        
        let finalSubject = subject_override || dbTemplate?.subject || fallbackTemplate?.subject || 'Notification';
        let finalBody    = body_override    || dbTemplate?.body    || fallbackTemplate?.body    || '';
        
        if (dbTemplate?.is_html !== undefined) is_html = dbTemplate.is_html;
        if (fallbackTemplate?.is_html !== undefined && is_html === undefined) is_html = fallbackTemplate.is_html;

        // Resolve subject variables
        const subjectVars = { ...variables };
        finalSubject = renderTemplate(finalSubject, subjectVars);

        // Fetch Branding
        const { data: branding } = await supabaseService
            .from('workspace_branding')
            .select('*')
            .eq('workspace_id', workspace_id)
            .single();

        // 1:1 Parity Build using shared logic
        const html = buildEmailHtml(finalBody, {
            senderName:   config.from_name || 'Sender',
            accentColor:  branding?.primary_color || '#10b981',
            logoUrl:      branding?.logo_light_url || branding?.logo_dark_url || undefined,
            isHtml:       is_html !== false,
            wrapperHtml:  dbTemplate?.wrapper || undefined,
            vars:         variables,
            templateType: TYPE_MAP[template_key] || 'Notification'
        });

        // Set up transporter
        const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: parseInt(config.smtp_port),
            // secure: true for port 465, false for other ports (587/25)
            // But we respect the user's toggle if they explicitly set it.
            secure: config.smtp_secure,
            auth: {
                user: config.smtp_user,
                pass: config.smtp_pass,
            },
            tls: {
                // Do not fail on invalid certs (common for some SMTP providers)
                rejectUnauthorized: false
            }
        });

        const info = await transporter.sendMail({
            from: `"${config.from_name}" <${config.from_address}>`,
            to,
            subject: finalSubject,
            text: finalBody.replace(/<[^>]*>?/gm, '').trim(), // Minimal text fallback
            html,
        });

        return NextResponse.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
        console.error('Send Email Error:', error);
        let message = error.message;

        // Human-friendly error for common SSL mismatch
        if (message.includes('wrong version number')) {
            message = 'SSL/TLS Error: Most likely you enabled SSL on a port that doesn\'t support it (e.g. 587). Please try disabling SSL/TLS and try again.';
        } else if (message.includes('ETIMEDOUT')) {
            message = 'Connection timed out. Please check your SMTP host and port.';
        } else if (message.includes('EAUTH')) {
            message = 'Authentication failed. Please check your SMTP username and password.';
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
