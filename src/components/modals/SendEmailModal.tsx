"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Mail, User, ChevronDown, Check, AlertCircle, Sparkles, Settings2, FileText, Receipt, FileCheck, Calendar } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { appToast } from '@/lib/toast';
import { AppLoader } from '@/components/ui/AppLoader';

interface SendEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    templateKey: 'proposal' | 'invoice' | 'receipt' | 'overdue_remind' | 'booking_confirmed';
    to: string;
    variables: Record<string, string>;
    workspaceId: string;
    documentTitle?: string;
    onSuccess?: () => void;
}

const TEMPLATE_INFO = {
    proposal: { label: 'Proposal', color: '#6366f1', icon: FileText },
    invoice:  { label: 'Invoice',  color: '#f59e0b', icon: Receipt },
    receipt:  { label: 'Receipt',  color: '#10b981', icon: FileCheck },
    overdue_remind: { label: 'Overdue Reminder', color: '#ef4444', icon: AlertCircle },
    booking_confirmed: { label: 'Booking Confirmed', color: '#8b5cf6', icon: Calendar },
};

const DEFAULT_SUBJECTS: Record<string, string> = {
    proposal: 'Proposal: {{document_title}}',
    invoice:  'Invoice #{{invoice_number}} from {{sender_name}}',
    receipt:  'Payment Receipt — Invoice #{{invoice_number}}',
    overdue_remind: 'Action Required: Overdue Invoice #{{invoice_number}}',
    booking_confirmed: 'Booking Confirmed: {{scheduler_title}}',
};

const DEFAULT_BODIES: Record<string, string> = {
    proposal: `Hi {{client_name}},\n\nI've prepared a proposal for {{document_title}} as we discussed.\n\nYou can review the details and accept it via the secure link below:\n{{document_link}}\n\nPlease let me know if you have any questions.\n\nBest regards,\n{{sender_name}}`,
    invoice:  `Hi {{client_name}},\n\nYour invoice #{{invoice_number}} is now available.\n\nAmount Due: {{amount_due}}\nDue Date: {{due_date}}\n\nPlease review and pay your invoice securely here:\n{{document_link}}\n\nThank you for your business!\n\nBest regards,\n{{sender_name}}`,
    receipt:  `Hi {{client_name}},\n\nThank you for your payment! We have received your payment of {{amount_paid}} for Invoice #{{invoice_number}}.\n\nYou can view your receipt here:\n{{document_link}}\n\nYour business is much appreciated!\n\nBest regards,\n{{sender_name}}`,
    overdue_remind: `Hi {{client_name}},\n\nThis is a gentle reminder that your payment for invoice #{{invoice_number}} is currently {{days_overdue}} days overdue.\n\nAmount Due: {{amount_due}}\n\nPlease review and pay your invoice securely here:\n{{document_link}}\n\nIf you have already made the payment, please disregard this message.\n\nBest regards,\n{{sender_name}}`,
    booking_confirmed: `Hi {{client_name}},\n\nYour booking for "{{scheduler_title}}" has been confirmed.\n\nDate: {{booked_date}}\nTime: {{booked_time}}\nTimezone: {{timezone}}\n\nWe look forward to meeting with you!\n\nBest regards,\n{{sender_name}}`,
};

function renderTemplate(template: string, vars: Record<string, string>) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export function SendEmailModal({
    isOpen,
    onClose,
    templateKey,
    to: initialTo,
    variables,
    workspaceId,
    documentTitle,
    onSuccess,
}: SendEmailModalProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { emailTemplates, emailConfig, branding } = useSettingsStore();

    const [to, setTo] = useState(initialTo);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    // Load template whenever open/templateKey changes
    useEffect(() => {
        if (!isOpen) return;
        setSent(false);
        setError(null);
        setTo(initialTo);

        // Merge: DB template overrides defaults
        const dbTemplate = emailTemplates.find(t => t.template_key === templateKey);
        const baseSubject = dbTemplate?.subject || DEFAULT_SUBJECTS[templateKey] || '';
        const baseBody    = dbTemplate?.body    || DEFAULT_BODIES[templateKey]   || '';

        const allVars = {
            sender_name: emailConfig?.from_name || '',
            document_title: documentTitle || '',
            ...variables,
        };

        setSubject(renderTemplate(baseSubject, allVars));
        setBody(renderTemplate(baseBody, allVars));
    }, [isOpen, templateKey, initialTo, variables, emailTemplates, emailConfig, documentTitle]);

    const handleSend = async () => {
        if (!to.trim()) { setError('Please enter a recipient email.'); return; }
        setIsSending(true);
        setError(null);
        try {
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    template_key: templateKey,
                    to: to.trim(),
                    variables: {
                        sender_name: emailConfig?.from_name || '',
                        document_title: documentTitle || '',
                        ...variables,
                    },
                    subject_override: subject,
                    body_override: body,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to send email');
            setSent(true);
            appToast.success('Email Sent', 'Email sent successfully!');
            onSuccess?.();
            setTimeout(() => { onClose(); setSent(false); }, 1800);
        } catch (err: any) {
            setError(err.message);
            appToast.error('Send Failed', err.message || 'Failed to send email');
        } finally {
            setIsSending(false);
        }
    };

    const getBrightness = (hex: string) => {
        if (!hex) return 255;
        let color = hex.replace('#', '');
        if (color.length === 3) color = color.split('').map(c => c + c).join('');
        const r = parseInt(color.slice(0, 2), 16);
        const g = parseInt(color.slice(2, 4), 16);
        const b = parseInt(color.slice(4, 6), 16);
        return Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
    };

    const info = TEMPLATE_INFO[templateKey];
    const hasSmtp = !!emailConfig?.smtp_host;

    const [mounted, setMounted] = React.useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div
                className={cn(
                    "relative w-full max-w-[560px] rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                    isDark ? "bg-[#141414] border-[#2a2a2a]" : "bg-white border-[#e5e5e5]"
                )}
            >
                {/* Header */}
                <div className={cn(
                    "flex items-center justify-between px-6 py-4 border-b",
                    isDark ? "border-[#252525]" : "border-[#f0f0f0]"
                )}>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${info.color}18` }}
                        >
                            <info.icon size={16} style={{ color: info.color }} />
                        </div>
                        <div>
                            <h2 className={cn("text-[15px] font-bold leading-tight", isDark ? "text-white" : "text-[#111]")}>
                                Send {info.label}
                            </h2>
                            <p className={cn("text-[11px] mt-0.5", isDark ? "text-white/40" : "text-black/40")}>
                                via SMTP · {emailConfig?.from_address || 'Not configured'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        isDark ? "text-white/30 hover:text-white hover:bg-white/5" : "text-black/30 hover:text-black hover:bg-black/5"
                    )}>
                        <X size={16} />
                    </button>
                </div>

                {/* SMTP warning */}
                {!hasSmtp && (
                    <div className={cn(
                        "mx-6 mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl border text-[12px]",
                        isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700"
                    )}>
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>SMTP not configured. <a href="/settings/emails" className="underline font-semibold">Set it up →</a></span>
                    </div>
                )}

                {/* Form */}
                <div className="flex flex-col gap-4 px-6 py-5">
                    {/* To field */}
                    <div>
                        <label className={cn("text-[11px] font-bold uppercase tracking-wider mb-1.5 block", isDark ? "text-white/30" : "text-black/30")}>
                            To
                        </label>
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors",
                            isDark ? "bg-white/[0.03] border-white/10 focus-within:border-white/20" : "bg-black/[0.02] border-black/10 focus-within:border-black/20"
                        )}>
                            <Mail size={13} className={isDark ? "text-white/20" : "text-black/20"} />
                            <input
                                type="email"
                                value={to}
                                onChange={e => setTo(e.target.value)}
                                placeholder="client@example.com"
                                className={cn(
                                    "flex-1 bg-transparent outline-none text-[13px] font-medium",
                                    isDark ? "text-white placeholder:text-white/20" : "text-[#111] placeholder:text-black/25"
                                )}
                            />
                        </div>
                    </div>

                    {/* Subject */}
                    <div>
                        <label className={cn("text-[11px] font-bold uppercase tracking-wider mb-1.5 block", isDark ? "text-white/30" : "text-black/30")}>
                            Subject
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className={cn(
                                "w-full px-3 py-2.5 rounded-xl border outline-none text-[13px] font-medium transition-colors",
                                isDark ? "bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-white/20" : "bg-black/[0.02] border-black/10 text-[#111] placeholder:text-black/25 focus:border-black/20"
                            )}
                            placeholder="Email subject..."
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-white/30" : "text-black/30")}>
                                Message
                            </label>
                            <button
                                onClick={() => setShowPreview(p => !p)}
                                className={cn(
                                    "text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors",
                                    isDark ? "text-white/30 hover:text-white/60 hover:bg-white/5" : "text-black/30 hover:text-black/60 hover:bg-black/5"
                                )}
                            >
                                {showPreview ? 'Edit' : 'Preview Live Layout'}
                            </button>
                        </div>
                        {showPreview ? (
                            <div className={cn("w-full h-[320px] overflow-y-auto custom-scrollbar rounded-xl border transition-all", isDark ? "bg-[#0a0a0a] border-white/10" : "bg-[#f5f5f5] border-black/10")}>
                                <div className="flex flex-col items-center p-6 w-full min-h-full">
                                    <div className="w-full max-w-[500px] border border-[#eaeaea] bg-white text-[#333] rounded-lg shadow-sm overflow-hidden shrink-0">
                                    {/* Email Header */}
                                    {(() => {
                                        const accentColor = branding?.primary_color || '#10b981';
                                        const isAccentDark = getBrightness(accentColor) < 128;
                                        const logoUrl = isAccentDark ? branding?.logo_light_url : (branding?.logo_dark_url || branding?.logo_light_url);
                                        const headerTextColor = isAccentDark ? '#ffffff' : '#000000';
                                        
                                        return (
                                            <div className="px-6 py-5 text-left flex items-center" style={{ backgroundColor: accentColor }}>
                                                {logoUrl ? (
                                                    <img src={logoUrl} alt="Logo" className="max-h-[28px] object-contain block" />
                                                ) : (
                                                    <span className="text-[15px] font-semibold" style={{ color: headerTextColor }}>{emailConfig?.from_name || '—'}</span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                        {/* Body */}
                                        <div className="p-6 text-[14px] leading-[1.6] text-[#444] font-sans">
                                            <div dangerouslySetInnerHTML={{ __html: (() => {
                                                const accentColor = branding?.primary_color || '#10b981';
                                                let html = body.replace(/\n/g, '<br/>');
                                                
                                                if (variables.amount_due) {
                                                    html = html.replace(new RegExp(variables.amount_due.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `<strong style="color: ${accentColor}; font-size: 1.15em;">${variables.amount_due}</strong>`);
                                                }
                                                if (variables.amount_paid) {
                                                    html = html.replace(new RegExp(variables.amount_paid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `<strong style="color: ${accentColor}; font-size: 1.15em;">${variables.amount_paid}</strong>`);
                                                }
                                                if (variables.document_link) {
                                                    html = html.replace(
                                                        new RegExp(variables.document_link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                                                        `<div style="margin: 32px 0;">
                                                            <a href="#" onclick="return false;" style="display: inline-block; background-color: ${accentColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                                                View Document
                                                            </a>
                                                            <div style="margin-top: 16px; font-size: 12px; color: #888; line-height: 1.5;">
                                                                If the button above doesn't work, copy and paste this link into your browser:<br/>
                                                                <a href="#" onclick="return false;" style="color: ${accentColor}; text-decoration: none; word-break: break-all;">${variables.document_link}</a>
                                                            </div>
                                                        </div>`
                                                    );
                                                }
                                                return html;
                                            })() }} />
                                        </div>
                                        {/* Footer */}
                                        <div className="bg-white border-t border-[#f0f0f0] px-6 py-4 text-left">
                                            <p className="m-0 text-[11px] text-[#999]">Securely sent via <span className="font-medium text-[#777]">{emailConfig?.from_name || '—'}</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                className={cn(
                                    "w-full h-[320px] px-3 py-2.5 rounded-xl border outline-none text-[13px] leading-relaxed resize-none custom-scrollbar transition-colors",
                                    isDark ? "bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-white/20" : "bg-black/[0.02] border-black/10 text-[#111] placeholder:text-black/25 focus:border-black/20"
                                )}
                                placeholder="Email body..."
                            />
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className={cn(
                            "flex items-start gap-2 px-3 py-2.5 rounded-xl border text-[12px]",
                            isDark ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-red-50 border-red-200 text-red-600"
                        )}>
                            <AlertCircle size={13} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={cn(
                    "flex items-center justify-between px-6 py-4 border-t",
                    isDark ? "border-[#252525] bg-[#111]" : "border-[#f0f0f0] bg-[#fafafa]"
                )}>
                    <Link
                        href="/settings/emails"
                        onClick={onClose}
                        className={cn(
                            "flex items-center gap-1.5 text-[11px] font-semibold transition-colors",
                            isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60"
                        )}
                    >
                        <Settings2 size={12} />
                        Edit default template
                    </Link>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className={cn(
                                "px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors",
                                isDark ? "text-white/40 hover:text-white hover:bg-white/5" : "text-black/40 hover:text-black hover:bg-black/5"
                            )}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={isSending || sent || !hasSmtp}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                                sent
                                    ? "bg-emerald-500 text-white"
                                    : "bg-primary text-[var(--brand-primary-foreground)] hover:bg-primary-hover shadow-[0_4px_12px_-4px_rgba(var(--brand-primary-rgb),0.5)]"
                            )}
                        >
                            {isSending ? (
                                <><AppLoader size="xs" /> Sending…</>
                            ) : sent ? (
                                <><Check size={14} /> Sent!</>
                            ) : (
                                <><Send size={14} /> Send Email</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
