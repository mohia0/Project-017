"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Send, Mail, Check, AlertCircle, Settings2,
    FileText, Receipt, FileCheck, Calendar, Clock,
    ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { appToast } from '@/lib/toast';
import { AppLoader } from '@/components/ui/AppLoader';
import {
    buildEmailHtml,
    DEFAULT_TEMPLATES,
    getBrightness
} from '@/lib/email-templates';

interface SendEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    templateKey: 'proposal' | 'invoice' | 'receipt' | 'overdue_remind' | 'booking_confirmed' | 'scheduler';
    to: string;
    variables: Record<string, string>;
    workspaceId: string;
    documentTitle?: string;
    onSuccess?: () => void;
}

const TEMPLATE_INFO = {
    proposal:          { label: 'Proposal',          color: '#6366f1', icon: FileText   },
    invoice:           { label: 'Invoice',            color: '#f59e0b', icon: Receipt    },
    receipt:           { label: 'Receipt',            color: '#10b981', icon: FileCheck  },
    overdue_remind:    { label: 'Overdue Reminder',   color: '#ef4444', icon: AlertCircle },
    booking_confirmed: { label: 'Booking Confirmed',  color: '#8b5cf6', icon: Calendar   },
    scheduler:         { label: 'Scheduler',          color: '#10b981', icon: Clock      },
};

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
    const { emailTemplates, emailConfigs, branding, fetchEmailConfigs } = useSettingsStore();

    const [selectedConfigId, setSelectedConfigId] = useState<string>('');
    const [to, setTo]               = useState(initialTo);
    const [subject, setSubject]     = useState('');
    const [body, setBody]           = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent]           = useState(false);
    const [error, setError]         = useState<string | null>(null);
    const [mounted, setMounted]     = React.useState(false);

    const activeConfig = emailConfigs.find(c => c.id === selectedConfigId) || emailConfigs.find(c => c.is_default) || emailConfigs[0];

    const iframeRef  = useRef<HTMLIFrameElement>(null);
    const bodyRef    = useRef(body);
    bodyRef.current  = body;

    useEffect(() => { setMounted(true); }, []);

    /* ── Branding / config ── */
    const accentColor  = branding?.primary_color || '#10b981';
    const logoUrl      = branding?.logo_light_url || branding?.logo_dark_url || undefined;
    const senderName   = activeConfig?.from_name || '';
    const info         = TEMPLATE_INFO[templateKey];

    /* ── Load template on open ── */
    useEffect(() => {
        if (!isOpen) return;
        setSent(false);
        setError(null);
        setTo(initialTo);
        fetchEmailConfigs(workspaceId);

        const dbTemplate = emailTemplates.find(t => t.template_key === templateKey);
        const fallback   = DEFAULT_TEMPLATES[templateKey] || DEFAULT_TEMPLATES.invoice;

        const rawSubject = dbTemplate?.subject || fallback.subject || '';
        const rawBody    = dbTemplate?.body    || fallback.body    || '';

        // Resolve subject
        const allVars: any = { 
            sender_name: senderName, 
            document_title: documentTitle || '', 
            accent_color: accentColor, 
            ...variables 
        };
        setSubject(rawSubject.replace(/\{\{(\w+)\}\}/g, (m, k) => allVars[k] ?? m));
        setBody(rawBody);
    }, [isOpen, templateKey, initialTo, emailTemplates, workspaceId, fetchEmailConfigs]);

    // Update selected config when configs load
    useEffect(() => {
        if (isOpen && emailConfigs.length > 0 && !selectedConfigId) {
            const defConfig = emailConfigs.find(c => c.is_default) || emailConfigs[0];
            if (defConfig) setSelectedConfigId(defConfig.id);
        }
    }, [isOpen, emailConfigs, selectedConfigId]);

    /* ── Build the preview HTML ── */
    const buildPreview = useCallback((currentBody: string) => {
        const dbTemplate = emailTemplates.find(t => t.template_key === templateKey);
        
        const html = buildEmailHtml(currentBody, {
            senderName,
            accentColor,
            logoUrl,
            isHtml:       true,
            wrapperHtml:  dbTemplate?.wrapper || undefined,
            vars:         { sender_name: senderName, document_title: documentTitle || '', ...variables },
            isPreview:    true,
            templateType: info.label,
        });

        return html;
    }, [templateKey, emailTemplates, senderName, accentColor, logoUrl, variables, documentTitle, info.label]);

    /* ── Push HTML to iframe ── */
    const pushToIframe = useCallback((html: string) => {
        if (!iframeRef.current) return;
        iframeRef.current.srcdoc = html;
    }, []);

    useEffect(() => {
        if (!isOpen || !body) return;
        pushToIframe(buildPreview(body));
    }, [isOpen, body, buildPreview, pushToIframe]);

    // Listen for edits from iframe
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data?.type === 'EMAIL_VISUAL_EDIT') {
                setBody(e.data.payload);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    /* ── Send ── */
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
                        sender_name: senderName, 
                        document_title: documentTitle || '', 
                        ...variables 
                    },
                    subject_override: subject,
                    body_override:    body,
                    config_id:        selectedConfigId
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

    const hasSmtp = emailConfigs.length > 0;

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div className={cn(
                "relative w-full max-w-[720px] h-[90vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden",
                "animate-in fade-in zoom-in-95 duration-200",
                isDark ? "bg-[#141414] border-[#2a2a2a]" : "bg-white border-[#e5e5e5]"
            )}>

                {/* ── Header ── */}
                <div className={cn(
                    "flex items-center justify-between px-5 py-4 border-b shrink-0",
                    isDark ? "border-[#252525]" : "border-[#f0f0f0]"
                )}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${info.color}18` }}>
                            <info.icon size={16} style={{ color: info.color }} />
                        </div>
                        <div>
                            <h2 className={cn("text-[15px] font-bold leading-tight", isDark ? "text-white" : "text-[#111]")}>
                                Send {info.label}
                            </h2>
                            <p className={cn("text-[11px] mt-0.5", isDark ? "text-white/30" : "text-black/30")}>
                                {activeConfig?.from_address || 'Sender not selected'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                            isDark ? "text-white/30 hover:text-white hover:bg-white/5" : "text-black/30 hover:text-black hover:bg-black/5"
                        )}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── SMTP warning ── */}
                {!hasSmtp && (
                    <div className={cn(
                        "mx-5 mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl border text-[12px] shrink-0",
                        isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700"
                    )}>
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>SMTP not configured. <a href="/settings/emails" className="underline font-semibold">Set it up →</a></span>
                    </div>
                )}

                {/* ── From / To / Subject ── */}
                <div className={cn(
                    "shrink-0 px-6 py-4 flex flex-col gap-3",
                    isDark ? "bg-[#111]" : "bg-[#fafafa]"
                )}>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex items-center gap-4">
                            <span className={cn("text-[10px] font-bold uppercase tracking-widest shrink-0 w-12", isDark ? "text-white/25" : "text-black/25")}>From</span>
                            {emailConfigs.length > 1 ? (
                                <div className="relative flex-1">
                                    <select
                                        value={selectedConfigId}
                                        onChange={(e) => setSelectedConfigId(e.target.value)}
                                        className={cn(
                                            "w-full pl-3 pr-8 py-2 rounded-xl border outline-none text-[13px] font-bold transition-all appearance-none cursor-pointer bg-transparent",
                                            isDark ? "border-white/8 text-white focus:border-white/20" : "border-black/8 text-[#111] focus:border-black/20"
                                        )}
                                    >
                                        {emailConfigs.map(c => (
                                            <option key={c.id} value={c.id} className={isDark ? "bg-[#141414] text-white" : "bg-white text-black"}>
                                                {c.from_name} ({c.from_address})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none" />
                                </div>
                            ) : (
                                <div className={cn(
                                    "flex-1 px-4 py-2 rounded-xl border text-[13px] font-bold opacity-60",
                                    isDark ? "bg-white/[0.03] border-white/8 text-white" : "bg-black/[0.02] border-black/8 text-[#111]"
                                )}>
                                    {activeConfig?.from_name} ({activeConfig?.from_address})
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <span className={cn("text-[10px] font-bold uppercase tracking-widest shrink-0 w-12", isDark ? "text-white/25" : "text-black/25")}>To</span>
                            <div className={cn(
                                "flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors",
                                isDark ? "bg-white/[0.03] border-white/8 focus-within:border-white/20" : "bg-black/[0.02] border-black/8 focus-within:border-black/20"
                            )}>
                                <Mail size={13} className="opacity-30 shrink-0" />
                                <input
                                    type="email"
                                    value={to}
                                    onChange={e => setTo(e.target.value)}
                                    className={cn("flex-1 bg-transparent outline-none text-[13px] font-bold", isDark ? "text-white" : "text-[#111]")}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 border-t pt-3 mt-1" style={{ borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest shrink-0 w-12", isDark ? "text-white/25" : "text-black/25")}>Subject</span>
                        <input
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className={cn(
                                "flex-1 px-4 py-2 rounded-xl border outline-none text-[13px] font-medium transition-colors",
                                isDark
                                    ? "bg-white/[0.03] border-white/8 text-white focus:border-white/20"
                                    : "bg-black/[0.02] border-black/8 text-[#111] focus:border-black/20"
                            )}
                        />
                    </div>
                </div>

                {/* ── Editor (Iframe) ── */}
                <div className={cn("flex-1 overflow-hidden", isDark ? "bg-[#0a0a0a]" : "bg-[#e2e2e2]")}>
                    <iframe
                        ref={iframeRef}
                        className="w-full h-full border-none block"
                        title="Email Preview"
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>

                {/* ── Footer ── */}
                <div className={cn(
                    "flex items-center justify-between px-6 py-4 border-t shrink-0",
                    isDark ? "border-[#252525] bg-[#111]" : "border-[#f0f0f0] bg-[#fafafa]"
                )}>
                    <Link
                        href="/settings/emails/templates"
                        onClick={onClose}
                        className={cn(
                            "flex items-center gap-1.5 text-[11px] font-semibold transition-colors",
                            isDark ? "text-white/25 hover:text-white/60" : "text-black/25 hover:text-black/60"
                        )}
                    >
                        <Settings2 size={12} />
                        Template Settings
                    </Link>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className={cn(
                                "px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors",
                                isDark ? "text-white/40 hover:text-white hover:bg-white/5" : "text-black/40 hover:text-black hover:bg-black/5"
                            )}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={isSending || sent || !hasSmtp}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-95 disabled:opacity-50",
                                sent
                                    ? "bg-emerald-500 text-white"
                                    : "bg-primary text-primary-foreground hover:bg-primary-hover shadow-lg shadow-primary/20"
                            )}
                        >
                            {isSending ? <AppLoader size="xs" /> : sent ? <Check size={14} /> : <Send size={14} />}
                            {isSending ? 'Sending...' : sent ? 'Sent!' : 'Send Email'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
