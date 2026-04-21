"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useSettingsStore, WorkspaceEmailConfig } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { appToast } from '@/lib/toast';
import {
    Mail, Send, Activity, ShieldCheck, Globe, RotateCcw, CheckCircle2,
    Lightbulb, Receipt, FileText, FileSignature, UserPlus, Eye, EyeOff,
    Sparkles, ChevronDown, Check, AlertCircle, Zap,
    AlertTriangle, CalendarCheck
} from 'lucide-react';
import { AppLoader } from '@/components/ui/AppLoader';

/* ─────────────── Constants ─────────────── */
const TEMPLATE_DEFS = [
    {
        key: 'invoice', label: 'Invoice', icon: FileText, color: '#f59e0b',
        vars: ['{{client_name}}', '{{invoice_number}}', '{{amount_due}}', '{{due_date}}', '{{document_link}}', '{{sender_name}}'],
        sample: { client_name: 'John Smith', invoice_number: 'INV-0042', amount_due: '$3,200', due_date: 'May 15, 2026', document_link: 'https://app.example.com/p/invoice/xxx', sender_name: 'Acme Studio' }
    },
    {
        key: 'proposal', label: 'Proposal', icon: Send, color: '#3b82f6',
        vars: ['{{client_name}}', '{{document_title}}', '{{document_link}}', '{{sender_name}}'],
        sample: { client_name: 'John Smith', document_title: 'Website Redesign Proposal', document_link: 'https://app.example.com/p/proposal/xxx', sender_name: 'Acme Studio' }
    },
    {
        key: 'receipt', label: 'Receipt', icon: Receipt, color: '#10b981',
        vars: ['{{client_name}}', '{{invoice_number}}', '{{amount_paid}}', '{{document_link}}', '{{sender_name}}'],
        sample: { client_name: 'John Smith', invoice_number: 'INV-0042', amount_paid: '$3,200', document_link: 'https://app.example.com/p/invoice/xxx', sender_name: 'Acme Studio' }
    },
    {
        key: 'overdue_remind', label: 'Overdue Reminder', icon: AlertTriangle, color: '#ef4444',
        vars: ['{{client_name}}', '{{invoice_number}}', '{{days_overdue}}', '{{amount_due}}', '{{document_link}}', '{{sender_name}}'],
        sample: { client_name: 'John Smith', invoice_number: 'INV-0042', days_overdue: '3', amount_due: '$3,200', document_link: 'https://app.example.com/p/invoice/xxx', sender_name: 'Acme Studio' }
    },
    {
        key: 'booking_confirmed', label: 'Booking', icon: CalendarCheck, color: '#8b5cf6',
        vars: ['{{client_name}}', '{{scheduler_title}}', '{{booked_date}}', '{{booked_time}}', '{{timezone}}', '{{sender_name}}'],
        sample: { client_name: 'John Smith', scheduler_title: 'Strategy Session', booked_date: 'May 20, 2026', booked_time: '10:00 AM', timezone: '(UTC-05:00) Eastern Time', sender_name: 'Acme Studio' }
    },
];

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
    invoice: {
        subject: "Invoice #{{invoice_number}} from {{sender_name}}",
        body: "Hi {{client_name}},\n\nYour invoice #{{invoice_number}} is now available.\n\nAmount Due: {{amount_due}}\nDue Date: {{due_date}}\n\nPlease review and pay your invoice securely here:\n{{document_link}}\n\nThank you for your business!\n\nBest regards,\n{{sender_name}}"
    },
    proposal: {
        subject: "Proposal: {{document_title}}",
        body: "Hi {{client_name}},\n\nI've prepared a proposal for {{document_title}} as we discussed.\n\nYou can review the details and accept it via the secure link below:\n{{document_link}}\n\nPlease let me know if you have any questions.\n\nBest regards,\n{{sender_name}}"
    },
    receipt: {
        subject: "Payment Receipt — Invoice #{{invoice_number}}",
        body: "Hi {{client_name}},\n\nThank you for your payment! We have received your payment of {{amount_paid}} for Invoice #{{invoice_number}}.\n\nYou can view your receipt here:\n{{document_link}}\n\nYour business is much appreciated!\n\nBest regards,\n{{sender_name}}"
    },
    overdue_remind: {
        subject: "Action Required: Invoice #{{invoice_number}} is Overdue",
        body: "Hi {{client_name}},\n\nThis is a friendly reminder that invoice #{{invoice_number}} is currently {{days_overdue}} days overdue.\n\nAmount Due: {{amount_due}}\n\nPlease review and pay your invoice securely here:\n{{document_link}}\n\nIf you have already submitted your payment, please disregard this notice.\n\nBest regards,\n{{sender_name}}"
    },
    booking_confirmed: {
        subject: "Booking Confirmed: {{scheduler_title}}",
        body: "Hi {{client_name}},\n\nYour booking for \"{{scheduler_title}}\" has been confirmed!\n\nDate: {{booked_date}}\nTime: {{booked_time}}\nTimezone: {{timezone}}\n\nWe look forward to speaking with you. If you need to make changes, please reach out to us.\n\nBest regards,\n{{sender_name}}"
    },
};

function resolveVars(text: string, sample: Record<string, any>) {
    return text.replace(/\{\{(\w+)\}\}/g, (_, k) => sample[k] ?? `{{${k}}}`);
}

/* ─────────────── Sub-components ─────────────── */

function Toggle({ checked, onChange, isDark }: { checked: boolean; onChange: (v: boolean) => void; isDark: boolean }) {
    return (
        <div onClick={() => onChange(!checked)} className="flex items-center gap-2.5 cursor-pointer select-none">
            <div className={cn(
                "w-9 h-[20px] rounded-full relative transition-all duration-300",
                checked ? "bg-primary" : (isDark ? "bg-white/10" : "bg-black/10")
            )}>
                <div className={cn(
                    "absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all duration-300",
                    checked ? "translate-x-[19px]" : "translate-x-[3px]"
                )} />
            </div>
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3">{children}</p>
    );
}

function InputField({ label, value, onChange, placeholder, type = 'text', hint }: {
    label: string; value: string | number; onChange: (v: string) => void;
    placeholder?: string; type?: string; hint?: string;
}) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    return (
        <div className="flex flex-col gap-1.5">
            <label className={cn("text-[11px] font-semibold", isDark ? "text-white/40" : "text-black/40")}>{label}</label>
            <input
                type={type}
                value={value ?? ''}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    "w-full px-3 py-2.5 rounded-xl border outline-none text-[13px] font-medium transition-colors",
                    isDark
                        ? "bg-white/[0.04] border-white/10 text-white placeholder:text-white/20 focus:border-white/25"
                        : "bg-black/[0.02] border-black/10 text-[#111] placeholder:text-black/25 focus:border-black/25"
                )}
            />
            {hint && <p className={cn("text-[10px]", isDark ? "text-white/25" : "text-black/30")}>{hint}</p>}
        </div>
    );
}

/* ─────── Template Editor Panel ─────── */
function TemplatePanel({ isDark, branding }: { isDark: boolean; branding: any }) {
    const { emailTemplates, updateEmailTemplate, emailConfig } = useSettingsStore();
    const { activeWorkspaceId } = useUIStore();

    const [activeKey, setActiveKey] = useState('invoice');
    const [showPreview, setShowPreview] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [templateData, setTemplateData] = useState<Record<string, { subject: string; body: string }>>({});

    useEffect(() => {
        const data: Record<string, { subject: string; body: string }> = {};
        Object.keys(DEFAULT_TEMPLATES).forEach(k => { data[k] = { ...DEFAULT_TEMPLATES[k] }; });
        if (emailTemplates?.length) {
            emailTemplates.forEach(t => {
                if (data[t.template_key]) {
                    if (t.subject) data[t.template_key].subject = t.subject;
                    if (t.body) data[t.template_key].body = t.body;
                }
            });
        }
        setTemplateData(data);
    }, [emailTemplates]);

    const getBrightness = (hex: string) => {
        if (!hex) return 255;
        let color = hex.replace('#', '');
        if (color.length === 3) color = color.split('').map(c => c + c).join('');
        const r = parseInt(color.slice(0, 2), 16);
        const g = parseInt(color.slice(2, 4), 16);
        const b = parseInt(color.slice(4, 6), 16);
        return Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
    };

    const def = TEMPLATE_DEFS.find(d => d.key === activeKey)!;
    const current = templateData[activeKey] || { subject: '', body: '' };
    const sampleVars = { ...def.sample, sender_name: emailConfig?.from_name || 'Acme Studio' };
    const accentColor = branding?.primary_color || '#10b981';
    const isAccentDark = getBrightness(accentColor) < 128;
    const logoUrl = isAccentDark ? branding?.logo_light_url : (branding?.logo_dark_url || branding?.logo_light_url);
    const headerTextColor = isAccentDark ? '#ffffff' : '#000000';

    // Build the preview HTML logic safely
    let previewBody = current.body;
    previewBody = resolveVars(previewBody, sampleVars);
    
    // Convert new lines to br
    previewBody = previewBody.replace(/\n/g, '<br/>');

    // Make amounts bold colored
    previewBody = previewBody.replace(new RegExp(sampleVars.amount_due || 'XYZABC', 'g'), `<strong style="color: ${accentColor}; font-size: 1.15em;">${sampleVars.amount_due}</strong>`);
    previewBody = previewBody.replace(new RegExp(sampleVars.amount_paid || 'XYZABC', 'g'), `<strong style="color: ${accentColor}; font-size: 1.15em;">${sampleVars.amount_paid}</strong>`);
    
    // Replace URL stub with the button matching the backend
    if (sampleVars.document_link) {
        previewBody = previewBody.replace(
            new RegExp(sampleVars.document_link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            `<div style="margin: 32px 0;">
                <a href="#" onclick="return false;" style="display: inline-block; background-color: ${accentColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    View Document
                </a>
                <div style="margin-top: 16px; font-size: 12px; color: #888; line-height: 1.5;">
                    If the button above doesn't work, copy and paste this link into your browser:<br/>
                    <a href="#" onclick="return false;" style="color: ${accentColor}; text-decoration: none; word-break: break-all;">${sampleVars.document_link}</a>
                </div>
            </div>`
        );
    }

    const handleSave = async () => {
        if (!activeWorkspaceId) return;
        setIsSaving(true);
        try {
            await updateEmailTemplate(activeWorkspaceId, activeKey, current);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            appToast.success('Template Saved', 'Your changes have been saved');
        } catch {
            appToast.error('Save Failed', 'Failed to save template');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setTemplateData(prev => ({ ...prev, [activeKey]: { ...DEFAULT_TEMPLATES[activeKey] } }));
    };

    const update = (patch: Partial<{ subject: string; body: string }>) => {
        setTemplateData(prev => ({ ...prev, [activeKey]: { ...prev[activeKey], ...patch } }));
    };

    return (
        <div className={cn(
            "flex flex-col h-full rounded-2xl border overflow-hidden",
            isDark ? "bg-[#111] border-[#252525]" : "bg-white border-[#e5e5e5]"
        )}>
            {/* Template Selector Tabs */}
            <div className={cn(
                "flex gap-1 p-2 border-b shrink-0 overflow-x-auto",
                isDark ? "border-[#252525]" : "border-[#f0f0f0]"
            )}>
                {TEMPLATE_DEFS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => { setActiveKey(t.key); }}
                        style={activeKey === t.key ? { backgroundColor: `${t.color}18`, color: t.color } : {}}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap",
                            activeKey === t.key
                                ? ""
                                : isDark ? "text-white/30 hover:text-white/60 hover:bg-white/5" : "text-black/30 hover:text-black/60 hover:bg-black/5"
                        )}
                    >
                        <t.icon size={11} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Edit / Preview toggle */}
            <div className={cn(
                "flex items-center justify-between px-4 py-2.5 border-b shrink-0",
                isDark ? "border-[#252525]" : "border-[#f0f0f0]"
            )}>
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: `${def.color}20` }}>
                        <def.icon size={11} style={{ color: def.color }} />
                    </div>
                    <span className={cn("text-[12px] font-semibold", isDark ? "text-white/70" : "text-black/70")}>{def.label} Email</span>
                </div>
                <div className={cn(
                    "flex items-center gap-0.5 p-0.5 rounded-lg",
                    isDark ? "bg-white/5" : "bg-black/5"
                )}>
                    <button
                        onClick={() => setShowPreview(false)}
                        className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all",
                            !showPreview
                                ? isDark ? "bg-white/10 text-white" : "bg-white text-black shadow-sm"
                                : isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60"
                        )}
                    >
                        <EyeOff size={10} /> Edit
                    </button>
                    <button
                        onClick={() => setShowPreview(true)}
                        className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all",
                            showPreview
                                ? isDark ? "bg-white/10 text-white" : "bg-white text-black shadow-sm"
                                : isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60"
                        )}
                    >
                        <Eye size={10} /> Preview
                    </button>
                </div>
            </div>

            {/* Editor / Preview Body */}
            <div className="flex-1 overflow-y-auto">
                {showPreview ? (
                    /* Live Preview */
                    <div className="p-4 flex flex-col gap-3">
                        <div className={cn(
                            "rounded-xl border overflow-hidden",
                            isDark ? "border-[#252525]" : "border-[#e5e5e5]"
                        )}>
                            {/* Email header bar */}
                            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ backgroundColor: `${def.color}12`, borderColor: `${def.color}25` }}>
                                <Sparkles size={12} style={{ color: def.color }} />
                                <span className="text-[11px] font-bold" style={{ color: def.color }}>Live Envelope Preview</span>
                            </div>
                            {/* Subject */}
                            <div className={cn("px-4 py-3 border-b", isDark ? "border-[#252525] bg-white/[0.02]" : "border-[#f0f0f0] bg-black/[0.01]")}>
                                <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", isDark ? "text-white/25" : "text-black/25")}>Subject</p>
                                <p className={cn("text-[13px] font-semibold", isDark ? "text-white" : "text-[#111]")}>
                                    {resolveVars(current.subject, sampleVars)}
                                </p>
                            </div>
                            
                            {/* True Email Container Render */}
                            <div className={cn("px-4 py-8 flex flex-col items-center", isDark ? "bg-[#0a0a0a]" : "bg-[#ffffff]")}>
                                <div className="w-full max-w-[500px] bg-white rounded-lg border border-[#eaeaea] overflow-hidden text-[#333]">
                                    {/* Email Header */}
                                    <div className="px-8 py-6 text-left flex items-center" style={{ backgroundColor: accentColor }}>
                                        {logoUrl ? (
                                            <img src={logoUrl} alt="Logo" className="max-h-[32px] object-contain block" />
                                        ) : (
                                            <span className="text-[16px] font-semibold" style={{ color: headerTextColor }}>{sampleVars.sender_name}</span>
                                        )}
                                    </div>
                                    
                                    {/* Body */}
                                    <div className="p-8 text-[15px] leading-[1.6] text-[#444] font-sans">
                                        <div dangerouslySetInnerHTML={{ __html: previewBody }} />
                                    </div>

                                    {/* Footer */}
                                    <div className="bg-white border-t border-[#f0f0f0] px-8 py-6 text-left">
                                        <p className="m-0 text-[12px] text-[#999]">Securely sent via <span className="font-medium text-[#777]">{sampleVars.sender_name}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={cn(
                            "flex items-start gap-2 px-3 py-2.5 rounded-xl border text-[11px]",
                            isDark ? "bg-blue-500/10 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"
                        )}>
                            <Lightbulb size={12} className="shrink-0 mt-0.5" />
                            <span>Preview uses sample data. Real emails will use actual client and document values.</span>
                        </div>
                    </div>
                ) : (
                    /* Edit mode */
                    <div className="p-4 flex flex-col gap-4">
                        {/* Subject */}
                        <div>
                            <label className={cn("text-[11px] font-bold uppercase tracking-wider mb-1.5 block", isDark ? "text-white/30" : "text-black/30")}>
                                Subject Line
                            </label>
                            <input
                                value={current.subject}
                                onChange={e => update({ subject: e.target.value })}
                                placeholder="Email subject..."
                                className={cn(
                                    "w-full px-3 py-2.5 rounded-xl border outline-none text-[13px] font-medium transition-colors",
                                    isDark
                                        ? "bg-white/[0.04] border-white/10 text-white placeholder:text-white/20 focus:border-white/25"
                                        : "bg-black/[0.02] border-black/10 text-[#111] placeholder:text-black/25 focus:border-black/25"
                                )}
                            />
                        </div>
                        {/* Body */}
                        <div>
                            <label className={cn("text-[11px] font-bold uppercase tracking-wider mb-1.5 block", isDark ? "text-white/30" : "text-black/30")}>
                                Body
                            </label>
                            <textarea
                                value={current.body}
                                onChange={e => update({ body: e.target.value })}
                                rows={9}
                                placeholder="Email body..."
                                className={cn(
                                    "w-full px-3 py-2.5 rounded-xl border outline-none text-[13px] leading-relaxed resize-none transition-colors",
                                    isDark
                                        ? "bg-white/[0.04] border-white/10 text-white placeholder:text-white/20 focus:border-white/25"
                                        : "bg-black/[0.02] border-black/10 text-[#111] placeholder:text-black/25 focus:border-black/25"
                                )}
                            />
                        </div>
                        {/* Variable chips */}
                        <div>
                            <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-2", isDark ? "text-white/25" : "text-black/25")}>
                                Available Variables
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {def.vars.map(v => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => {
                                            const body = current.body;
                                            const sep = body && !body.endsWith(' ') && !body.endsWith('\n') ? ' ' : '';
                                            update({ body: body + sep + v });
                                        }}
                                        className={cn(
                                            "px-2 py-1 rounded-lg border text-[10px] font-mono transition-all active:scale-95",
                                            isDark
                                                ? "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80"
                                                : "bg-black/5 border-black/10 text-black/40 hover:bg-black/10 hover:text-black/70"
                                        )}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer actions */}
            <div className={cn(
                "flex items-center justify-between px-4 py-3 border-t shrink-0",
                isDark ? "border-[#252525] bg-[#0d0d0d]" : "border-[#f0f0f0] bg-[#fafafa]"
            )}>
                <button
                    onClick={handleReset}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                        isDark ? "text-white/25 hover:text-white/60 hover:bg-white/5" : "text-black/30 hover:text-black/60 hover:bg-black/5"
                    )}
                >
                    <RotateCcw size={11} /> Reset
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 disabled:opacity-50",
                        saved
                            ? "bg-emerald-500 text-white"
                            : "bg-primary hover:bg-primary-hover text-primary-foreground shadow-[0_4px_12px_-4px_rgba(77,191,57,0.4)]"
                    )}
                >
                    {isSaving ? <AppLoader size="xs" /> : saved ? <Check size={13} /> : <CheckCircle2 size={13} />}
                    {saved ? 'Saved!' : 'Save Template'}
                </button>
            </div>
        </div>
    );
}

/* ─────────────── Main Page ─────────────── */
export default function EmailsSettingsPage() {
    const { theme, activeWorkspaceId } = useUIStore();
    const isDark = theme === 'dark';
    const {
        emailConfig, fetchEmailConfig, fetchEmailTemplates,
        domains, fetchDomains, branding, fetchBranding,
        toolSettings, fetchToolSettings, updateToolSettings
    } = useSettingsStore();

    const [formData, setFormData] = useState<Partial<WorkspaceEmailConfig>>({});
    const [smtpPass, setSmtpPass] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [autoReceipt, setAutoReceipt] = useState(true);

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchEmailConfig(activeWorkspaceId);
            fetchEmailTemplates(activeWorkspaceId);
            fetchDomains(activeWorkspaceId);
            fetchBranding(activeWorkspaceId);
            fetchToolSettings(activeWorkspaceId, 'invoices');
        }
    }, [activeWorkspaceId, fetchEmailConfig, fetchEmailTemplates, fetchDomains, fetchBranding, fetchToolSettings]);

    useEffect(() => {
        if (emailConfig) {
            setFormData({
                smtp_host: emailConfig.smtp_host || '',
                smtp_port: emailConfig.smtp_port || 587,
                smtp_user: emailConfig.smtp_user || '',
                from_name: emailConfig.from_name || '',
                from_address: emailConfig.from_address || ''
            });
        }
    }, [emailConfig]);

    useEffect(() => {
        const s = toolSettings['invoices'];
        if (s && typeof s.auto_receipt !== 'undefined') {
            setAutoReceipt(s.auto_receipt);
        }
    }, [toolSettings]);

    const hasUnsavedSMTP =
        formData.smtp_host !== (emailConfig?.smtp_host || '') ||
        formData.smtp_port !== (emailConfig?.smtp_port || 587) ||
        formData.smtp_user !== (emailConfig?.smtp_user || '') ||
        formData.from_name !== (emailConfig?.from_name || '') ||
        formData.from_address !== (emailConfig?.from_address || '') ||
        smtpPass !== '';

    const handleSaveSMTP = async () => {
        if (!activeWorkspaceId) return;
        setIsSaving(true);
        const promise = fetch('/api/update-email-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, smtp_pass: smtpPass, workspace_id: activeWorkspaceId })
        }).then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save configuration');
        });

        appToast.promise(promise, {
            loading: 'Saving SMTP configuration…',
            success: 'SMTP configuration saved',
            error: 'Failed to save configuration',
        });

        try {
            await promise;
            setSmtpPass('');
            fetchEmailConfig(activeWorkspaceId);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendTest = async () => {
        if (!activeWorkspaceId) return;
        setIsTesting(true);
        const promise = fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workspace_id: activeWorkspaceId,
                to: formData.from_address || emailConfig?.from_address || formData.smtp_user,
                subject_override: 'Test Email from your Workspace',
                body_override: 'Hi there,\n\nIf you are seeing this, your SMTP configuration is successfully working!\n\nBest,\nYour App',
            })
        }).then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send test email');
        });

        appToast.promise(promise, {
            loading: 'Sending test email…',
            success: 'Test email sent — check your inbox!',
            error: 'Failed to send test email',
        });
        try { await promise; } catch (e) { console.error(e); } finally { setIsTesting(false); }
    };

    const handleAutoReceiptToggle = async (v: boolean) => {
        setAutoReceipt(v);
        if (!activeWorkspaceId) return;
        const existing = toolSettings['invoices'] || {};
        await updateToolSettings(activeWorkspaceId, 'invoices', { ...existing, auto_receipt: v });
        appToast.success('Setting Updated', v ? 'Auto-receipt enabled' : 'Auto-receipt disabled');
    };

    if (!activeWorkspaceId) return null;

    const smtpActive = !!emailConfig?.smtp_host;

    return (
        <div className="w-full max-w-2xl mx-auto py-8 px-4">
            {/* Page header */}
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-bold mb-1">Email Settings</h1>
                    <p className={cn("text-[13px]", isDark ? "text-white/40" : "text-black/40")}>
                        Configure SMTP and manage your email templates
                    </p>
                </div>
                {/* SMTP status pill */}
                <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-semibold",
                    smtpActive
                        ? isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : isDark ? "bg-white/5 border-white/10 text-white/30" : "bg-black/5 border-black/10 text-black/40"
                )}>
                    <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        smtpActive ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-current opacity-40"
                    )} />
                    {smtpActive ? `SMTP: ${emailConfig?.smtp_host}` : 'SMTP Not Configured'}
                </div>
            </div>

            {/* Single column layout */}
            <div className="flex flex-col gap-6">

                {/* ─── SMTP & Templates ─── */}
                <div className="flex flex-col gap-6">

                    {/* SMTP Card */}
                    <div className={cn(
                        "rounded-2xl border overflow-hidden",
                        isDark ? "bg-[#111] border-[#252525]" : "bg-white border-[#e5e5e5]"
                    )}>
                        {/* Header */}
                        <div className={cn(
                            "flex items-center justify-between px-5 py-4 border-b",
                            isDark ? "border-[#252525]" : "border-[#f0f0f0]"
                        )}>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center",
                                    isDark ? "bg-white/5" : "bg-black/5"
                                )}>
                                    <Activity size={15} className="opacity-60" />
                                </div>
                                <div>
                                    <h2 className="text-[14px] font-bold">SMTP Configuration</h2>
                                    <p className={cn("text-[11px] mt-0.5", isDark ? "text-white/30" : "text-black/35")}>
                                        Send emails via your own domain
                                    </p>
                                </div>
                            </div>
                            {hasUnsavedSMTP && (
                                <div className={cn(
                                    "text-[10px] font-semibold px-2 py-1 rounded-md",
                                    isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"
                                )}>
                                    Unsaved changes
                                </div>
                            )}
                        </div>

                        <div className="p-5 flex flex-col gap-5">
                            {/* Security note */}
                            <div className={cn(
                                "flex items-start gap-3 px-3.5 py-3 rounded-xl border text-[12px]",
                                isDark ? "bg-blue-500/8 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"
                            )}>
                                <ShieldCheck size={14} className="shrink-0 mt-0.5 opacity-70" />
                                <span>Passwords are encrypted via Supabase Vault — never stored in plaintext.</span>
                            </div>

                            {/* Server fields */}
                            <div>
                                <SectionLabel>Server</SectionLabel>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField
                                        label="SMTP Host"
                                        value={formData.smtp_host || ''}
                                        onChange={v => setFormData(f => ({ ...f, smtp_host: v }))}
                                        placeholder="smtp.gmail.com"
                                    />
                                    <InputField
                                        label="Port"
                                        type="number"
                                        value={formData.smtp_port || 587}
                                        onChange={v => setFormData(f => ({ ...f, smtp_port: parseInt(v) || 587 }))}
                                    />
                                </div>
                            </div>

                            {/* Auth fields */}
                            <div>
                                <SectionLabel>Authentication</SectionLabel>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField
                                        label="Username"
                                        value={formData.smtp_user || ''}
                                        onChange={v => setFormData(f => ({ ...f, smtp_user: v }))}
                                        placeholder="you@domain.com"
                                    />
                                    <div className="flex flex-col gap-1.5">
                                        <label className={cn("text-[11px] font-semibold", isDark ? "text-white/40" : "text-black/40")}>
                                            Password
                                        </label>
                                        <div className={cn(
                                            "flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors",
                                            isDark ? "bg-white/[0.04] border-white/10 focus-within:border-white/25" : "bg-black/[0.02] border-black/10 focus-within:border-black/25"
                                        )}>
                                            <input
                                                type={showPass ? 'text' : 'password'}
                                                value={smtpPass}
                                                onChange={e => setSmtpPass(e.target.value)}
                                                placeholder={smtpActive ? '••••••••' : 'App Password'}
                                                className={cn(
                                                    "flex-1 bg-transparent outline-none text-[13px] font-medium",
                                                    isDark ? "text-white placeholder:text-white/20" : "text-[#111] placeholder:text-black/25"
                                                )}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPass(p => !p)}
                                                className={cn("opacity-30 hover:opacity-60 transition-opacity")}
                                            >
                                                {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sender fields */}
                            <div>
                                <SectionLabel>Sender Profile</SectionLabel>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField
                                        label="From Name"
                                        value={formData.from_name || ''}
                                        onChange={v => setFormData(f => ({ ...f, from_name: v }))}
                                        placeholder="Acme Studio"
                                        hint="The name clients see in their inbox"
                                    />
                                    <div className="flex flex-col gap-1.5">
                                        <InputField
                                            label="From Address"
                                            type="email"
                                            value={formData.from_address || ''}
                                            onChange={v => setFormData(f => ({ ...f, from_address: v }))}
                                            placeholder="hello@acme.com"
                                            hint="Should match your SMTP domain"
                                        />
                                        {domains.filter(d => d.status === 'active').map(d => (
                                            <button
                                                key={d.id}
                                                type="button"
                                                onClick={() => setFormData(f => ({ ...f, from_address: `hello@${d.domain}` }))}
                                                className={cn(
                                                    "flex items-center gap-1.5 text-[10px] font-semibold transition-colors self-start",
                                                    isDark ? "text-primary hover:text-primary-hover" : "text-primary hover:text-primary-hover"
                                                )}
                                            >
                                                <Globe size={10} />
                                                Use {d.domain}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer actions */}
                            <div className={cn(
                                "flex items-center justify-between pt-4 border-t",
                                isDark ? "border-white/[0.06]" : "border-black/[0.06]"
                            )}>
                                <button
                                    type="button"
                                    onClick={handleSendTest}
                                    disabled={isTesting || !smtpActive}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 disabled:opacity-40",
                                        isDark ? "bg-white/8 hover:bg-white/12 text-white/70" : "bg-black/5 hover:bg-black/10 text-black/60"
                                    )}
                                >
                                    {isTesting ? <AppLoader size="xs" /> : <Send size={13} />}
                                    Send Test
                                </button>
                                <button
                                    onClick={handleSaveSMTP}
                                    disabled={isSaving || !hasUnsavedSMTP}
                                    className={cn(
                                        "flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 disabled:opacity-40",
                                        "bg-primary hover:bg-primary-hover text-primary-foreground shadow-[0_4px_12px_-4px_rgba(77,191,57,0.4)]"
                                    )}
                                >
                                    {isSaving ? <AppLoader size="xs" /> : <CheckCircle2 size={13} />}
                                    Save Config
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ─── Template Panel ─── */}
                    <div style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
                        <TemplatePanel isDark={isDark} branding={branding} />
                    </div>

                    {/* Auto-Receipt Toggle Card */}
                    <div className={cn(
                        "rounded-2xl border overflow-hidden",
                        isDark ? "bg-[#111] border-[#252525]" : "bg-white border-[#e5e5e5]"
                    )}>
                        <div className="flex items-start justify-between p-5 gap-4">
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                    isDark ? "bg-emerald-500/10" : "bg-emerald-50"
                                )}>
                                    <Receipt size={15} className="text-emerald-500" />
                                </div>
                                <div>
                                    <h3 className="text-[13px] font-bold">Automatic Receipts</h3>
                                    <p className={cn("text-[11px] mt-0.5 leading-relaxed", isDark ? "text-white/35" : "text-black/40")}>
                                        Automatically email a payment receipt when an invoice is marked as <strong>Paid</strong>. Disable to send receipts manually from the notification panel.
                                    </p>
                                </div>
                            </div>
                            <Toggle checked={autoReceipt} onChange={handleAutoReceiptToggle} isDark={isDark} />
                        </div>
                        {!autoReceipt && (
                            <div className={cn(
                                "mx-5 mb-5 flex items-start gap-2.5 px-3.5 py-3 rounded-xl border text-[11px]",
                                isDark ? "bg-amber-500/8 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700"
                            )}>
                                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                                <span>Manual mode: a notification will appear in your feed when payment is received, allowing you to review and send the receipt.</span>
                            </div>
                        )}
                    </div>

                    {/* Deliverability Tips */}
                    <div className={cn(
                        "rounded-2xl border p-5",
                        isDark ? "bg-[#111] border-[#252525]" : "bg-white border-[#e5e5e5]"
                    )}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                isDark ? "bg-emerald-500/10" : "bg-emerald-50"
                            )}>
                                <Zap size={15} className="text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-[13px] font-bold">Deliverability Tips</h3>
                                <p className={cn("text-[11px]", isDark ? "text-white/30" : "text-black/35")}>Improve inbox placement</p>
                            </div>
                        </div>
                        <ul className="space-y-2.5">
                            {[
                                'Set up SPF and DKIM records at your DNS provider.',
                                "Keep your 'From Name' consistent across all communications.",
                                "Avoid generic free accounts (gmail.com) for custom SMTP.",
                                'Use an App Password if you have 2FA enabled on your account.',
                            ].map((tip, i) => (
                                <li key={i} className={cn("flex items-start gap-2.5 text-[12px] leading-relaxed", isDark ? "text-white/50" : "text-black/55")}>
                                    <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-emerald-500" />
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
