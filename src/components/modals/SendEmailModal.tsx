"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Send, Mail, Check, AlertCircle, Settings2,
    FileText, Receipt, FileCheck, Calendar, Clock,
    ChevronDown, Monitor, Smartphone, UserPlus
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
import { Dropdown, DItem } from '@/components/ui/Dropdown';

interface SendEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    templateKey: 'proposal' | 'invoice' | 'receipt' | 'overdue_remind' | 'booking_confirmed' | 'scheduler' | 'workspace_invitation';
    to: string;
    variables: Record<string, string>;
    workspaceId: string;
    documentTitle?: string;
    onSuccess?: () => void;
}

const TEMPLATE_INFO = {
    proposal:             { label: 'Proposal',          color: '#6366f1', icon: FileText   },
    invoice:              { label: 'Invoice',            color: '#f59e0b', icon: Receipt    },
    receipt:              { label: 'Receipt',            color: '#10b981', icon: FileCheck  },
    overdue_remind:       { label: 'Overdue Reminder',   color: '#ef4444', icon: AlertCircle },
    booking_confirmed:    { label: 'Booking Confirmed',  color: '#8b5cf6', icon: Calendar   },
    scheduler:            { label: 'Scheduler',          color: '#10b981', icon: Clock      },
    workspace_invitation: { label: 'Invitation',         color: '#6366f1', icon: UserPlus   },
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

    const [isConfigMenuOpen, setIsConfigMenuOpen] = useState(false);
    const configMenuRef = useRef<HTMLButtonElement>(null);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const lastPushedBodyRef = useRef('');

    const activeConfig = emailConfigs.find(c => c.id === selectedConfigId) || emailConfigs.find(c => c.is_default) || emailConfigs[0];

    const iframeRef  = useRef<HTMLIFrameElement>(null);
    const bodyRef    = useRef(body);
    bodyRef.current  = body;

    useEffect(() => { setMounted(true); }, []);

    /* ── Branding / config ── */
    const accentColor  = branding?.primary_color || '#10b981';
    const rawLogoUrl   = branding?.logo_light_url || branding?.logo_dark_url || '/logo.svg';
    const logoUrl      = typeof window !== 'undefined' && rawLogoUrl.startsWith('/') 
                           ? `${window.location.origin}${rawLogoUrl}` 
                           : rawLogoUrl;
    const senderName   = activeConfig?.from_name || '';
    const info         = TEMPLATE_INFO[templateKey];

    /* ── Load template on open ── */
    useEffect(() => {
        if (!isOpen) return;
        setSent(false);
        setError(null);
        setTo(initialTo);
        fetchEmailConfigs(workspaceId);
        
        lastPushedBodyRef.current = ''; // Reset so it definitely pushes to the iframe

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
        setSubject(rawSubject.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => allVars[k] ?? m));
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
        
        const previewVars: Record<string, any> = { sender_name: senderName, document_title: documentTitle || '', ...variables };
        if (templateKey === 'workspace_invitation' && !previewVars.signup_link) {
            previewVars.signup_link = `${window.location.origin}/join/${workspaceId}?email=${encodeURIComponent(to)}`;
        }

        const html = buildEmailHtml(currentBody, {
            senderName,
            accentColor,
            logoUrl,
            isHtml:       true,
            wrapperHtml:  dbTemplate?.wrapper || undefined,
            vars:         previewVars,
            isPreview:    true,
            templateType: info.label,
        });

        return html;
    }, [templateKey, emailTemplates, senderName, accentColor, logoUrl, variables, documentTitle, info.label, to, workspaceId]);

    /* ── Push HTML to iframe ── */
    const pushToIframe = useCallback((html: string) => {
        if (!iframeRef.current) return;
        iframeRef.current.srcdoc = html;
    }, []);

    useEffect(() => {
        if (!isOpen || !body) return;
        if (body === lastPushedBodyRef.current) return;
        
        lastPushedBodyRef.current = body;
        pushToIframe(buildPreview(body));
    }, [isOpen, body, buildPreview, pushToIframe]);

    // Listen for edits from iframe
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data?.type === 'EMAIL_VISUAL_EDIT') {
                lastPushedBodyRef.current = e.data.payload;
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

            // For workspace invitations: create a pending member row so the UI tracks the invite state
            if (templateKey === 'workspace_invitation' && workspaceId) {
                await fetch('/api/track-invitation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workspace_id: workspaceId, invited_email: to.trim() }),
                }).catch(() => {}); // non-critical
            }

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
                    "shrink-0 flex flex-col border-b",
                    isDark ? "bg-[#111] border-[#252525]" : "bg-[#fafafa] border-[#f0f0f0]"
                )}>
                    <div className="grid grid-cols-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                        <div className="flex items-center gap-2 px-5 py-1.5 border-r" style={{ borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                            <span className={cn("text-[9.5px] font-bold uppercase tracking-wide shrink-0 w-9", isDark ? "text-white/40" : "text-black/40")}>From:</span>
                            <div className="relative flex-1 min-w-0">
                                <button
                                    ref={configMenuRef}
                                    onClick={() => setIsConfigMenuOpen(true)}
                                    className={cn(
                                        "w-full flex items-center justify-between py-1 text-[11px] font-medium transition-colors hover:opacity-70",
                                        isDark ? "text-white" : "text-[#111]"
                                    )}
                                >
                                    <span className="truncate">
                                        {activeConfig?.from_name || 'Select sender...'}
                                    </span>
                                    <ChevronDown size={12} className="opacity-40 ml-2 shrink-0" />
                                </button>
                                
                                <Dropdown
                                    open={isConfigMenuOpen}
                                    onClose={() => setIsConfigMenuOpen(false)}
                                    triggerRef={configMenuRef}
                                    isDark={isDark}
                                    align="left"
                                    zIndex={1000000}
                                    matchTriggerWidth={true}
                                >
                                    {emailConfigs.map(c => (
                                        <DItem
                                            key={c.id}
                                            label={
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{c.from_name}</span>
                                                    <span className="text-[10px] opacity-50 italic">{c.from_address}</span>
                                                </div>
                                            }
                                            active={c.id === selectedConfigId}
                                            onClick={() => {
                                                setSelectedConfigId(c.id);
                                                setIsConfigMenuOpen(false);
                                            }}
                                            isDark={isDark}
                                        />
                                    ))}
                                </Dropdown>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-5 py-1.5">
                            <span className={cn("text-[9.5px] font-bold uppercase tracking-wide shrink-0 w-9", isDark ? "text-white/40" : "text-black/40")}>To:</span>
                            <input
                                type="email"
                                value={to}
                                onChange={e => setTo(e.target.value)}
                                className={cn("flex-1 bg-transparent outline-none text-[11px] font-medium py-1", isDark ? "text-white" : "text-[#111]")}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-5 py-1.5">
                        <span className={cn("text-[9.5px] font-bold uppercase tracking-wide shrink-0 w-9", isDark ? "text-white/40" : "text-black/40")}>Subj:</span>
                        <input
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className={cn("flex-1 bg-transparent outline-none text-[11px] font-medium py-1", isDark ? "text-white" : "text-[#111]")}
                        />
                    </div>
                </div>

                {/* ── Editor (Iframe) ── */}
                <div className={cn("flex-1 overflow-hidden relative flex flex-col", isDark ? "bg-[#0a0a0a]" : "bg-[#f5f5f5]")}>
                    {/* View Toggle Overlay */}
                    <div className={cn(
                        "absolute top-4 left-4 z-10 flex items-center p-1 rounded-lg border shadow-lg backdrop-blur-md",
                        isDark ? "bg-[#1c1c1c]/80 border-[#2e2e2e]" : "bg-white/80 border-[#e0e0e0]"
                    )}>
                        <button
                            onClick={() => setPreviewMode('desktop')}
                            className={cn(
                                "p-1.5 rounded-md transition-all flex items-center justify-center",
                                previewMode === 'desktop'
                                    ? (isDark ? "bg-white/10 text-white" : "bg-white shadow text-black")
                                    : (isDark ? "text-white/40 hover:text-white/80" : "text-black/40 hover:text-black/80")
                            )}
                        >
                            <Monitor size={14} />
                        </button>
                        <button
                            onClick={() => setPreviewMode('mobile')}
                            className={cn(
                                "p-1.5 rounded-md transition-all flex items-center justify-center",
                                previewMode === 'mobile'
                                    ? (isDark ? "bg-white/10 text-white" : "bg-white shadow text-black")
                                    : (isDark ? "text-white/40 hover:text-white/80" : "text-black/40 hover:text-black/80")
                            )}
                        >
                            <Smartphone size={14} />
                        </button>
                    </div>

                    <div className={cn(
                        "h-full w-full mx-auto transition-all duration-300 flex justify-center",
                        previewMode === 'mobile' ? "max-w-[375px]" : "max-w-full"
                    )}>
                        <iframe
                            ref={iframeRef}
                            className={cn(
                                "w-full h-full border-none block bg-white",
                                previewMode === 'mobile' && "shadow-2xl border-x border-black/5"
                            )}
                            title="Email Preview"
                            sandbox="allow-scripts allow-same-origin"
                        />
                    </div>
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
