"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';
import { appToast } from '@/lib/toast';
import {
    renderTemplate,
    buildEmailHtml,
    DEFAULT_TEMPLATES as SHARED_DEFAULTS,
    getBrightness
} from '@/lib/email-templates';
import {
    Send, Receipt, FileText, AlertTriangle, CalendarCheck,
    Code2, Eye, RotateCcw, CheckCircle2, Check, Sparkles,
    Monitor, Smartphone, Copy, ChevronLeft, UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { AppLoader } from '@/components/ui/AppLoader';
import { SkeletonBox } from '@/components/ui/ListViewSkeleton';
import { AlertConfirmModal } from '@/components/modals/AlertConfirmModal';

/* ─────────────── Constants ─────────────── */
const TEMPLATE_DEFS = [
    {
        key: 'invoice', label: 'Invoice', icon: FileText, color: '#f59e0b',
        sample: { client_name: 'John Smith', invoice_number: 'INV-0042', amount_due: '$3,200', due_date: 'May 15, 2026', document_link: 'https://app.example.com/p/invoice/xxx' }
    },
    {
        key: 'proposal', label: 'Proposal', icon: Send, color: '#3b82f6',
        sample: { client_name: 'John Smith', document_title: 'Website Redesign Proposal', document_link: 'https://app.example.com/p/proposal/xxx' }
    },
    {
        key: 'receipt', label: 'Receipt', icon: Receipt, color: '#10b981',
        sample: { client_name: 'John Smith', invoice_number: 'INV-0042', amount_paid: '$3,200', payment_date: 'Apr 26, 2026', document_link: 'https://app.example.com/p/invoice/xxx' }
    },
    {
        key: 'overdue_remind', label: 'Overdue', icon: AlertTriangle, color: '#ef4444',
        sample: { client_name: 'John Smith', invoice_number: 'INV-0042', days_overdue: '3', amount_due: '$3,200', document_link: 'https://app.example.com/p/invoice/xxx' }
    },
    {
        key: 'booking_confirmed', label: 'Booking', icon: CalendarCheck, color: '#8b5cf6',
        sample: { client_name: 'John Smith', scheduler_title: 'Strategy Session', booked_date: 'May 20, 2026', booked_time: '10:00 AM', timezone: '(UTC-05:00) Eastern Time' }
    },
    {
        key: 'workspace_invitation', label: 'Invitation', icon: UserPlus, color: '#6366f1',
        sample: { invitee_email: 'jane@example.com', workspace_name: 'Acme Studio', role_name: 'Member', signup_link: 'https://app.example.com/join/ws-xxx?email=jane%40example.com' }
    },
];

const DEFAULT_TEMPLATES = SHARED_DEFAULTS;

interface TemplateState {
    subject: string;
    body: string;
    is_html: boolean;
    wrapper?: string | null;
    fullHtml?: string;
}

type EditorMode = 'html' | 'preview';

export default function EmailTemplatesPage() {
    const { emailTemplates, updateEmailTemplate, emailConfigs, branding, fetchBranding, fetchEmailTemplates, fetchEmailConfigs } = useSettingsStore();
    const { activeWorkspaceId, theme } = useUIStore();
    const isDark = theme === 'dark';

    const [activeKey, setActiveKey]     = useState('invoice');
    const [editorMode, setEditorMode]   = useState<EditorMode>('preview');
    const [previewSize, setPreviewSize] = useState<'desktop' | 'mobile'>('desktop');
    const [isSaving, setIsSaving]       = useState(false);
    const [saved, setSaved]             = useState(false);
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [templateData, setTemplateData] = useState<Record<string, TemplateState>>({});

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchBranding(activeWorkspaceId);
            fetchEmailTemplates(activeWorkspaceId);
            fetchEmailConfigs(activeWorkspaceId);
        }
    }, [activeWorkspaceId]);

    const hasFetchedTemplates = useSettingsStore(state => state.hasFetched.emailTemplates);
    const hasFetchedConfigs = useSettingsStore(state => state.hasFetched.emailConfigs);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);


    const emailConfig = emailConfigs.find(c => c.is_default) || emailConfigs[0];

    useEffect(() => {
        const data: Record<string, TemplateState> = {};
        Object.keys(DEFAULT_TEMPLATES).forEach(k => {
            data[k] = { ...DEFAULT_TEMPLATES[k], is_html: !!DEFAULT_TEMPLATES[k].is_html };
        });
        if (emailTemplates?.length) {
            emailTemplates.forEach(t => {
                if (data[t.template_key]) {
                    if (t.subject) data[t.template_key].subject = t.subject;
                    if (t.body)    data[t.template_key].body    = t.body;
                    data[t.template_key].is_html = !!t.is_html;
                    data[t.template_key].wrapper = t.wrapper;
                }
            });
        }
        setTemplateData(data);
    }, [emailTemplates]);

    const def     = TEMPLATE_DEFS.find(d => d.key === activeKey)!;
    const current: TemplateState = templateData[activeKey] || { subject: '', body: '', is_html: false };

    const accentColor  = branding?.primary_color || '#10b981';
    const isAccentDark = getBrightness(accentColor) < 128;
    const rawLogoUrl   = branding?.logo_light_url || branding?.logo_dark_url || '/logo.svg';
    const logoUrl      = typeof window !== 'undefined' && rawLogoUrl.startsWith('/') 
                           ? `${window.location.origin}${rawLogoUrl}` 
                           : rawLogoUrl;
    const senderName   = emailConfig?.from_name || 'Acme Studio';
    const sampleVars   = { ...def.sample, sender_name: senderName, accent_color: accentColor };

    /* Build vars with highlighted amounts for preview */
    const htmlVars: Record<string, any> = { ...sampleVars };
    if (htmlVars.amount_due)  htmlVars.amount_due  = `<strong style="color:${accentColor};font-size:1.15em;">${htmlVars.amount_due}</strong>`;
    if (htmlVars.amount_paid) htmlVars.amount_paid = `<strong style="color:${accentColor};font-size:1.15em;">${htmlVars.amount_paid}</strong>`;

    const livePreviewHtml = buildEmailHtml(current.body, {
        senderName,
        accentColor,
        logoUrl,
        isHtml:       current.is_html,
        wrapperHtml:  current.wrapper || undefined,
        vars:         htmlVars,
        isPreview:    true,
        templateType: def.label
    });

    // Version for the HTML editor (No pills/spans)
    const liveRawHtml = buildEmailHtml(current.body, {
        senderName,
        accentColor,
        logoUrl,
        isHtml:       current.is_html,
        wrapperHtml:  current.wrapper || undefined,
        vars:         sampleVars,
        isPreview:    false,
        templateType: def.label
    });

    /* In HTML tab: show fullHtml override or the live built RAW html */
    const htmlEditorValue = current.fullHtml ?? liveRawHtml;

    const update = useCallback((patch: Partial<TemplateState>) => {
        setTemplateData(prev => ({ ...prev, [activeKey]: { ...prev[activeKey], ...patch } }));
    }, [activeKey]);

    const switchToHtml = () => {
        if (!current.fullHtml) update({ fullHtml: liveRawHtml });
        setEditorMode('html');
    };

    const handleCopyHtml = () => {
        navigator.clipboard.writeText(htmlEditorValue);
        appToast.success('Copied', 'Email HTML copied to clipboard');
    };

    const handleReset = () => {
        const def = SHARED_DEFAULTS[activeKey];
        
        // Force an iframe reload by clearing the visual edit flag
        isVisualEdit.current = false;

        setTemplateData(prev => ({
            ...prev,
            [activeKey]: { 
                subject: def.subject, 
                body: def.body, 
                is_html: !!def.is_html, 
                wrapper: undefined, 
                fullHtml: undefined 
            }
        }));
        setEditorMode('preview');
        appToast.success('Template Reset', 'Restored to default built-in version');
    };

    const isVisualEdit = useRef(false);
    const iframeRef    = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'EMAIL_VISUAL_EDIT') {
                isVisualEdit.current = true;
                update({ body: event.data.payload });
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [update]);

    // Manually control srcdoc to prevent blinking on every state update
    useEffect(() => {
        if (!iframeRef.current) return;
        
        if (isVisualEdit.current) {
            isVisualEdit.current = false;
            return;
        }

        // If the user has manually overridden the HTML, show their raw code.
        // Otherwise, show the live visually editable preview with pills and sync scripts.
        const previewSrc = current.fullHtml ? current.fullHtml : livePreviewHtml;
        iframeRef.current.srcdoc = previewSrc;
    }, [current.fullHtml, livePreviewHtml, activeKey, previewSize, editorMode]);

    const handleSave = async () => {
        if (!activeWorkspaceId) return;
        setIsSaving(true);
        try {
            const { wrapper, fullHtml, ...rest } = current;
            const payload = fullHtml
                ? { subject: rest.subject, body: fullHtml, is_html: true, wrapper: undefined }
                : { ...rest, wrapper: wrapper || undefined };
            await updateEmailTemplate(activeWorkspaceId, activeKey, payload);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            appToast.success('Template Saved', 'Your changes have been saved');
        } catch (error) {
            console.error('Failed to save template:', error);
            appToast.error('Save Failed', 'Failed to save template');
        } finally {
            setIsSaving(false);
        }
    };
    if (!activeWorkspaceId || !mounted || !hasFetchedTemplates || !hasFetchedConfigs) {
        return (
            <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8">
                <SkeletonBox isDark={isDark} className="h-32 rounded-2xl w-full" />
                <SkeletonBox isDark={isDark} className="h-64 rounded-2xl w-full" />
            </div>
        );
    }

    return (
        /* Full height, no outer padding — matches layout's flex-1 h-full container */
        <div className="flex h-full overflow-hidden">

            {/* ── Left sidebar: template selector + subject ── */}
            <div className={cn(
                "w-[200px] shrink-0 flex flex-col border-r overflow-y-auto",
                isDark ? "border-[#252525]" : "border-[#e5e5e5]"
            )}>
                <div className="p-3 flex flex-col gap-0.5">
                    <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-2 px-2 mt-1", isDark ? "text-white/20" : "text-black/25")}>
                        Template
                    </p>
                    {TEMPLATE_DEFS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => { setActiveKey(t.key); setEditorMode('preview'); }}
                            style={activeKey === t.key ? { backgroundColor: `${t.color}15`, color: t.color } : {}}
                            className={cn(
                                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all text-left w-full",
                                activeKey === t.key
                                    ? ""
                                    : isDark ? "text-white/40 hover:text-white/70 hover:bg-white/5" : "text-black/40 hover:text-black/70 hover:bg-black/5"
                            )}
                        >
                            <t.icon size={13} />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Subject editor */}
                <div className={cn(
                    "border-t mt-auto p-3 flex flex-col gap-2",
                    isDark ? "border-[#252525]" : "border-[#e5e5e5]"
                )}>
                    <p className={cn("text-[8px] font-black uppercase tracking-widest mb-2 opacity-20", isDark ? "text-white" : "text-black")}>
                        Variables
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                        {Object.keys(sampleVars).map(key => (
                            <button
                                key={key}
                                title={`Click to copy {{${key}}}`}
                                onClick={() => {
                                    navigator.clipboard.writeText(`{{${key}}}`);
                                    appToast.success('Variable copied');
                                }}
                                className={cn(
                                    "px-1.5 py-0.5 rounded text-[9px] font-mono transition-all border",
                                    isDark 
                                        ? "bg-white/[0.02] border-white/5 text-white/30 hover:text-white hover:bg-white/5 hover:border-white/10" 
                                        : "bg-black/[0.02] border-black/5 text-black/30 hover:text-black hover:bg-black/5 hover:border-black/10"
                                )}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <button
                            onClick={() => setIsResetOpen(true)}
                            className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all flex-1 justify-center",
                                isDark ? "bg-white/5 hover:bg-white/8 text-white/35 hover:text-white/60" : "bg-black/5 hover:bg-black/8 text-black/35 hover:text-black/60"
                            )}
                        >
                            <RotateCcw size={9} /> Reset
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all flex-1 justify-center disabled:opacity-50",
                                "bg-primary hover:bg-primary-hover text-primary-foreground"
                            )}
                        >
                            {isSaving ? <AppLoader size="xs" /> : saved ? <Check size={9} /> : <CheckCircle2 size={9} />}
                            {isSaving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Editor area ── */}
            <div className="flex flex-col flex-1 overflow-hidden">

                {/* Compact Unified Header */}
                <div className={cn(
                    "flex items-center gap-4 px-5 py-2 border-b shrink-0 transition-colors",
                    isDark ? "border-[#252525] focus-within:bg-[#111]" : "border-[#e5e5e5] focus-within:bg-[#fafafa]"
                )}>
                    {/* Template Info */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: `${def.color}20` }}>
                            <def.icon size={11} style={{ color: def.color }} />
                        </div>
                        <span className={cn("text-[12px] font-bold hidden xl:inline", isDark ? "text-white/70" : "text-black/70")}>
                            {def.label} Template
                        </span>
                    </div>

                    <div className={cn("w-px h-4 shrink-0", isDark ? "bg-white/10" : "bg-black/10")} />

                    {/* Subject Row (Merged) */}
                    <div className="flex-1 flex items-center gap-3">
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest shrink-0 mt-[1px]", isDark ? "text-white/25" : "text-black/25")}>Subject</span>
                        <input
                            type="text"
                            value={current.subject}
                            onChange={e => update({ subject: e.target.value })}
                            className={cn(
                                "flex-1 bg-transparent border-none outline-none text-[13px] font-semibold",
                                isDark ? "text-white/90 placeholder:text-white/20" : "text-black/90 placeholder:text-black/20"
                            )}
                            placeholder="Email Subject..."
                        />
                    </div>

                    {/* Toggles Group */}
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Device Toggle */}
                        <div className={cn(
                            "flex items-center gap-0.5 p-0.5 rounded-lg",
                            isDark ? "bg-white/5" : "bg-black/5"
                        )}>
                            <button
                                onClick={() => setPreviewSize('desktop')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    previewSize === 'desktop'
                                        ? isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-black shadow-sm"
                                        : isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60"
                                )}
                            >
                                <Monitor size={12} />
                            </button>
                            <button
                                onClick={() => setPreviewSize('mobile')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    previewSize === 'mobile'
                                        ? isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-black shadow-sm"
                                        : isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60"
                                )}
                            >
                                <Smartphone size={12} />
                            </button>
                        </div>

                        <div className={cn("w-px h-4", isDark ? "bg-white/10" : "bg-black/10")} />

                        {/* Editor Mode Toggle */}
                        <div className={cn(
                            "flex items-center gap-0.5 p-0.5 rounded-lg",
                            isDark ? "bg-white/5" : "bg-black/5"
                        )}>
                            {([
                                { mode: 'html' as EditorMode,    icon: Code2 },
                                { mode: 'preview' as EditorMode, icon: Eye   },
                            ] as const).map(({ mode, icon: Icon }) => (
                                <button
                                    key={mode}
                                    onClick={mode === 'html' ? switchToHtml : () => setEditorMode('preview')}
                                    className={cn(
                                        "p-1.5 rounded-md transition-all",
                                        editorMode === mode
                                            ? isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-black shadow-sm"
                                            : isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60"
                                    )}
                                >
                                    <Icon size={12} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Editor body */}
                <div className="flex-1 overflow-hidden relative">
                    {editorMode === 'html' ? (
                        <div className="absolute inset-0 flex flex-col p-4 gap-3">
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] border shrink-0",
                                isDark ? "bg-blue-500/8 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"
                            )}>
                                <Sparkles size={11} className="shrink-0" />
                                <span>
                                    Editing the <strong>complete email HTML</strong> — includes wrapper, header, content, and footer.
                                    Template variables like <code className="font-mono">{'{{client_name}}'}</code> are resolved at send-time.
                                </span>
                                <button
                                    onClick={handleCopyHtml}
                                    className={cn(
                                        "ml-auto flex items-center gap-1.5 px-2 py-1 rounded transition-colors",
                                        isDark ? "hover:bg-blue-500/10" : "hover:bg-blue-600/10"
                                    )}
                                >
                                    <Copy size={12} />
                                    <span>Copy HTML</span>
                                </button>
                            </div>
                            <textarea
                                value={htmlEditorValue}
                                onChange={e => update({ fullHtml: e.target.value, is_html: true })}
                                className={cn(
                                    "flex-1 w-full px-4 py-4 rounded-xl border outline-none text-[12px] font-mono leading-relaxed resize-none custom-scrollbar",
                                    isDark
                                        ? "bg-[#080808] border-white/5 text-[#cdd6f4] focus:border-purple-500/30 selection:bg-purple-500/20"
                                        : "bg-[#1e1e1e] border-black/5 text-[#d4d4d4] focus:border-purple-500/30"
                                )}
                                spellCheck={false}
                            />
                        </div>
                    ) : (
                        <div className={cn(
                            "absolute inset-0 flex flex-col overflow-hidden",
                            isDark ? "bg-[#0c0c0c]" : "bg-[#eaeaea]"
                        )}>
                            {/* Email preview — Fill entire area */}
                            <div className={cn(
                                "flex-1 overflow-auto transition-all duration-300 flex justify-center items-center",
                                previewSize === 'mobile' 
                                    ? isDark ? "bg-black/50 p-6" : "bg-black/5 p-6"
                                    : ""
                            )}>
                                <div className={cn(
                                    "transition-all duration-300",
                                    previewSize === 'mobile' 
                                        ? "w-[375px] h-[760px] max-h-full max-w-full shadow-2xl rounded-[36px] border-[4px] border-[#222] overflow-hidden" 
                                        : "w-full h-full"
                                )}>
                                    <iframe
                                        ref={iframeRef}
                                        className="w-full h-full border-none block"
                                        title="Email Preview"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <AlertConfirmModal
                open={isResetOpen}
                onClose={() => setIsResetOpen(false)}
                onConfirm={handleReset}
                title="Reset Template?"
                description="This will permanentely delete your changes and restore the default built-in version for this category."
                confirmLabel="Reset Template"
                type="warning"
                isDark={isDark}
            />
        </div>
    );
}
