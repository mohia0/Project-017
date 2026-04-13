"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ProposalDocument } from '@/components/proposals/ProposalEditor';
import { InvoiceDocument } from '@/components/invoices/InvoiceEditor';
import { ClientActionBar } from '@/components/ui/ClientActionBar';
import { AcceptSignModal } from '@/components/modals/AcceptSignModal';
import { PaymentMethodSelectorModal } from '@/components/modals/PaymentMethodSelectorModal';
import { cn, getBackgroundImageWithOpacity } from '@/lib/utils';
import dynamic from 'next/dynamic';
import FieldPreview from '@/components/forms/FieldPreview';
import { Check, Clock, Calendar as CalendarIcon, MapPin, ChevronRight } from 'lucide-react';

const KanbanBoard = dynamic(() => import('@/components/projects/KanbanBoard'), { ssr: false });

// Anon-key client — safe for public preview pages, used only to subscribe
// to Realtime events. No sensitive data is written through this client.
const supabasePublic = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─────────────────────────────────────────────────────────────────────────────
// FormPreview — isolated component with its own state so it doesn't pollute
// the parent and can be cleanly reused.
// ─────────────────────────────────────────────────────────────────────────────
function FormPreview({ liveData, data }: { liveData: any; data: any }) {
    const meta = liveData.meta || {};
    const design = meta.design || {};
    const isFormDark = design.theme === 'dark';
    const primaryColor = design.primaryColor || '#4dbf39';

    // Fields come from `fields` column (forms) — fall back to `blocks` for safety
    const fields: any[] = Array.isArray(liveData.fields) && liveData.fields.length > 0
        ? liveData.fields
        : Array.isArray(liveData.blocks)
            ? liveData.blocks
            : [];

    // Controlled values keyed by field id
    const [values, setValues] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const setValue = (id: string, val: string) => {
        setValues(prev => ({ ...prev, [id]: val }));
        if (errors[id]) setErrors(prev => ({ ...prev, [id]: false }));
    };

    const handleSubmit = async () => {
        // Validate required fields
        const newErrors: Record<string, boolean> = {};
        let hasError = false;
        for (const f of fields) {
            if (f.required && !values[f.id]?.trim()) {
                newErrors[f.id] = true;
                hasError = true;
            }
        }
        if (hasError) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/form-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    form_id: data.id,
                    workspace_id: data.workspace_id,
                    data: values,
                    form_title: liveData.title,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to submit');
            }

            setIsSubmitted(true);
        } catch (err) {
            console.error('Form submission error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const submissionLimit = meta.submissionLimit ? parseInt(meta.submissionLimit) : null;
    const hasReachedLimit = submissionLimit !== null && (data.submissionCount || 0) >= submissionLimit;
    const isRestricted = liveData.status === 'Draft' || liveData.status === 'Inactive' || hasReachedLimit;

    return (
        <div
            className="flex-1 overflow-auto relative w-full min-h-screen"
            style={{
                backgroundColor: design.backgroundColor || (isFormDark ? '#080808' : '#f7f7f7'),
                backgroundImage: getBackgroundImageWithOpacity(
                    design.backgroundImage,
                    design.backgroundColor || (isFormDark ? '#080808' : '#f7f7f7'),
                    design.backgroundImageOpacity
                ),
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
            }}
        >
            <div className={cn(
                "flex flex-col items-center min-h-screen py-12 px-6",
                (isSubmitted || isRestricted) && "justify-center"
            )}>
                <div
                    className="w-full max-w-[620px] overflow-hidden shadow-2xl transition-all duration-300"
                    style={{
                        backgroundColor: design.blockBackgroundColor || (isFormDark ? '#111' : '#fff'),
                        boxShadow: design.blockShadow || '0 10px 40px -10px rgba(0,0,0,0.15)',
                        fontFamily: design.fontFamily || 'Inter',
                        borderRadius: `${design.borderRadius ?? 16}px`,
                    }}
                >
                    {isSubmitted ? (
                        // ── SUCCESS SCREEN ──────────────────────────────────
                        <div className="space-y-0 pb-12">
                            {(meta.confirmationBlocks || [
                                { id: 'default-s', type: 'success' },
                                { id: 'default-h', type: 'heading', level: 1, content: 'Thanks!' },
                                { id: 'default-t', type: 'text', content: "<p style='text-align: center'>Thank you for your submission! We'll be in touch soon.</p>" }
                            ]).map((b: any) => (
                                <div key={b.id}>
                                    {b.type === 'success' && (
                                        <div className="flex flex-col items-center text-center py-16 px-8 gap-6">
                                            <div
                                                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-75 duration-300"
                                                style={{ background: primaryColor }}
                                            >
                                                <Check size={28} strokeWidth={2.5} className="text-black" />
                                            </div>
                                        </div>
                                    )}
                                    {b.type === 'heading' && (
                                        <div className="px-12 py-4 text-center">
                                            <div 
                                                className={cn("font-bold tracking-tight", 
                                                    b.level === 1 ? "text-[32px]" : b.level === 3 ? "text-[18px]" : "text-[24px]")}
                                                style={{ color: isFormDark ? '#fff' : '#111' }}
                                            >
                                                {b.content}
                                            </div>
                                        </div>
                                    )}
                                    {b.type === 'text' && (
                                        <div className="px-12 py-2">
                                            <div 
                                                className="text-[15px] leading-relaxed opacity-70"
                                                style={{ color: isFormDark ? '#ccc' : '#444' }}
                                                dangerouslySetInnerHTML={{ __html: b.content }} 
                                            />
                                        </div>
                                    )}
                                    {b.type === 'divider' && (
                                        <div className="px-12 py-6">
                                            <div className={cn("w-full h-px", isFormDark ? "bg-white/10" : "bg-black/5")} />
                                        </div>
                                    )}
                                    {b.type === 'image' && b.url && (
                                        <div className="px-12 py-6">
                                            <img src={b.url} alt="" className="w-full h-auto rounded-2xl shadow-sm" />
                                        </div>
                                    )}
                                </div>
                            )).filter(Boolean)}
                        </div>
                    ) : (liveData.status === 'Draft' || liveData.status === 'Inactive') ? (
                        // ── DRAFT / INACTIVE MESSAGE ─────────────────────────
                        <div className="flex flex-col items-center justify-center text-center py-20 px-8 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className={cn(
                                "w-16 h-16 rounded-full flex items-center justify-center",
                                hasReachedLimit ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                            )}>
                                {hasReachedLimit ? <Clock size={28} strokeWidth={2.5} /> : <Clock size={28} strokeWidth={2.5} />}
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-[24px] font-bold tracking-tight" style={{ color: isFormDark ? '#fff' : '#111' }}>
                                    {hasReachedLimit ? 'Form Limit Reached' : 'Form Not Available'}
                                </h2>
                                <p className="text-[15px] opacity-70 leading-relaxed max-w-[340px] mx-auto" style={{ color: isFormDark ? '#ccc' : '#444' }}>
                                    {hasReachedLimit 
                                        ? "This form has reached its maximum number of submissions and is no longer accepting new entries."
                                        : <>This form is currently in <b>{(liveData.status || 'Draft').toLowerCase()}</b> mode and is not accepting submissions yet.</>
                                    }
                                </p>
                            </div>
                        </div>
                    ) : (
                        // ── FORM ────────────────────────────────────────────
                        <div className="p-8 md:p-12">
                            {/* Header */}
                            <div className="mb-10">
                                {meta.logoUrl && (
                                    <img
                                        src={meta.logoUrl}
                                        alt="Logo"
                                        className="mb-6 object-contain"
                                        style={{ height: `${design.logoSize || 40}px` }}
                                    />
                                )}
                                <h1
                                    className="text-[32px] md:text-[42px] font-bold leading-tight tracking-tight mb-2"
                                    style={{ color: isFormDark ? '#fff' : '#111' }}
                                >
                                    {liveData.title}
                                </h1>
                                {meta.description && (
                                    <p
                                        className="text-[14px] opacity-60 max-w-[90%]"
                                        style={{ color: isFormDark ? '#aaa' : '#555' }}
                                    >
                                        {meta.description}
                                    </p>
                                )}
                            </div>

                            {/* Fields */}
                            {fields.length === 0 ? (
                                <div className="text-center py-12 opacity-30" style={{ color: isFormDark ? '#fff' : '#111' }}>
                                    <div className="text-[13px]">This form has no fields yet.</div>
                                </div>
                            ) : (
                                <div className="space-y-0">
                                    {fields.map((f: any) => (
                                        <div key={f.id}>
                                            <FieldPreview
                                                field={f}
                                                isDark={isFormDark}
                                                primaryColor={primaryColor}
                                                borderRadius={design.borderRadius ?? 16}
                                                isPreview={true}
                                                marginTop={design.marginTop}
                                                marginBottom={design.marginBottom}
                                                value={values[f.id] ?? ''}
                                                onChange={val => setValue(f.id, val)}
                                            />
                                            {errors[f.id] && (
                                                <p className="text-[11px] text-red-500 mt-1 mb-1 font-medium">
                                                    This field is required
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Submit */}
                            {fields.length > 0 && (
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="mt-10 w-full py-4 font-bold text-[15px] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    style={{
                                        background: primaryColor,
                                        borderRadius: `${design.borderRadius ?? 16}px`,
                                        color: '#000',
                                    }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            Submitting…
                                        </>
                                    ) : 'Submit'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SchedulerPreview
// ─────────────────────────────────────────────────────────────────────────────
function SchedulerPreview({ liveData, data }: { liveData: any; data: any }) {
    const meta = liveData.meta || {};
    const design = meta.design || {};
    const isDark = design.theme === 'dark';
    const primaryColor = design.primaryColor || '#4dbf39';

    const durations: number[] = Array.isArray(meta.durations) ? meta.durations : [30, 60];

    const submissionLimit = meta.submissionLimit ? parseInt(meta.submissionLimit) : null;
    const hasReachedLimit = submissionLimit !== null && (data.submissionCount || 0) >= submissionLimit;
    const isRestricted = liveData.status === 'Draft' || liveData.status === 'Inactive' || hasReachedLimit;

    return (
        <div
            className="flex-1 overflow-auto relative w-full min-h-screen"
            style={{
                backgroundColor: design.backgroundColor || (isDark ? '#080808' : '#f7f7f7'),
                backgroundImage: getBackgroundImageWithOpacity(
                    design.backgroundImage,
                    design.backgroundColor || (isDark ? '#080808' : '#f7f7f7'),
                    design.backgroundImageOpacity
                ),
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
            }}
        >
            <div className={cn(
                "flex flex-col items-center min-h-screen py-12 px-6",
                isRestricted && "justify-center"
            )}>
                <div
                    className="w-full max-w-[680px] overflow-hidden shadow-2xl transition-all duration-300"
                    style={{
                        backgroundColor: design.blockBackgroundColor || (isDark ? '#111' : '#fff'),
                        boxShadow: design.blockShadow || '0 10px 40px -10px rgba(0,0,0,0.15)',
                        fontFamily: design.fontFamily || 'Inter',
                        borderRadius: `${design.borderRadius ?? 16}px`,
                    }}
                >
                    {isRestricted ? (
                        // ── DRAFT / INACTIVE MESSAGE ─────────────────────────
                        <div className="flex flex-col items-center justify-center text-center py-20 px-8 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className={cn(
                                "w-16 h-16 rounded-full flex items-center justify-center",
                                hasReachedLimit ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                            )}>
                                <Clock size={28} strokeWidth={2.5} />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-[24px] font-bold tracking-tight" style={{ color: isDark ? '#fff' : '#111' }}>
                                    {hasReachedLimit ? 'Booking Limit Reached' : 'Scheduler Not Available'}
                                </h2>
                                <p className="text-[15px] opacity-70 leading-relaxed max-w-[340px] mx-auto" style={{ color: isDark ? '#ccc' : '#444' }}>
                                    {hasReachedLimit
                                        ? "This scheduler has reached its maximum number of bookings and is no longer accepting new appointments."
                                        : <>This scheduler is currently in <b>{(liveData.status || 'Draft').toLowerCase()}</b> mode and is not accepting bookings yet.</>
                                    }
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="px-8 pt-8 pb-5 border-b border-black/5 dark:border-white/5">
                                <div className="flex items-center gap-4 mb-6">
                                    {meta.logoUrl ? (
                                        <img src={meta.logoUrl} alt="Logo" className="h-10 object-contain" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-[20px]"
                                            style={{ background: primaryColor }}>
                                            {(meta.organizer || liveData.title || 'S')[0].toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <h1 className="font-bold text-[20px]" style={{ color: isDark ? '#fff' : '#111' }}>
                                            {meta.organizer || liveData.title}
                                        </h1>
                                        <div className="text-[13px] opacity-50" style={{ color: isDark ? '#aaa' : '#777' }}>
                                            {liveData.title}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {durations.map(d => (
                                        <div key={d} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold"
                                            style={{ background: primaryColor, color: '#000' }}>
                                            <Clock size={12} />
                                            {d >= 60 ? `${d / 60}hr` : `${d}min`}
                                        </div>
                                    ))}
                                    {meta.location && (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium opacity-60"
                                            style={{ color: isDark ? '#ccc' : '#444' }}>
                                            <MapPin size={12} />
                                            {meta.location}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Placeholder Content */}
                            <div className="p-12 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto">
                                    <CalendarIcon size={24} className="opacity-30" />
                                </div>
                                <div>
                                    <div className="font-bold text-[18px]" style={{ color: isDark ? '#fff' : '#111' }}>
                                        Public Booking Page
                                    </div>
                                    <p className="text-[14px] opacity-50 max-w-[300px] mx-auto" style={{ color: isDark ? '#aaa' : '#777' }}>
                                        Full booking functionality will be available once this scheduler is activated.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main PreviewClient
// ─────────────────────────────────────────────────────────────────────────────
export default function PreviewClient({ type, data }: { type: 'proposal' | 'invoice' | 'project' | 'form' | 'scheduler', data: any }) {
    const [liveData, setLiveData] = useState(data);
    // useRef persists across React Strict Mode double-mounts (unlike useState)
    const viewHasBeenTracked = useRef(false);

    // Modals
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobileViewport(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Project specific state
    const [projectTasks, setProjectTasks] = useState<any[]>(data.projectTasks || []);
    const [projectGroups, setProjectGroups] = useState<any[]>(data.projectGroups || []);
    const [isProjectLoading, setIsProjectLoading] = useState(false);

    // Track view ONCE per page load
    useEffect(() => {
        if (viewHasBeenTracked.current) return;
        viewHasBeenTracked.current = true;

        fetch('/api/track-view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type,
                id: data.id,
                workspace_id: data.workspace_id,
                title: data.title || data.meta?.projectName || data.client_name,
            }),
        }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Supabase Realtime — live updates for proposals/invoices/forms
    useEffect(() => {
        if (type === 'project') return;
        const tableName = type === 'form' ? 'forms' : type === 'scheduler' ? 'schedulers' : type === 'proposal' ? 'proposals' : 'invoices';
        const channelName = `preview:${tableName}:${data.id}`;

        const channel = supabasePublic
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: tableName,
                    filter: `id=eq.${data.id}`,
                },
                (payload) => {
                    if (!payload.new) return;
                    const raw = payload.new as any;
                    setLiveData({
                        id: raw.id,
                        title: raw.title,
                        status: raw.status,
                        amount: raw.amount,
                        issue_date: raw.issue_date,
                        due_date: raw.due_date,
                        blocks: raw.blocks || [],
                        fields: raw.fields || [],
                        meta: raw.meta || {},
                        client_name: raw.client_name,
                        workspace_id: raw.workspace_id,
                        updated_at: raw.updated_at,
                    });
                }
            )
            .subscribe();

        return () => {
            supabasePublic.removeChannel(channel);
        };
    }, [type, data.id]);

    const handleUpdateStatus = async (status: string, signatureData?: any) => {
        if (isUpdating) return;

        try {
            setIsUpdating(true);
            const res = await fetch(`/api/p/${type}/${data.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, signatureData }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update');
            }

            const updatedResponse = await res.json();
            if (updatedResponse.success) {
                setLiveData((prev: any) => ({ ...prev, ...updatedResponse.updateData }));
            }
        } catch (e) {
            console.error('Failed to update document status:', e);
        } finally {
            setIsUpdating(false);
        }
    };

    const isDark = false;
    const totals = { subtotal: liveData.amount || 0, discAmt: 0, taxAmt: 0, total: liveData.amount || 0 };

    // ── PROPOSAL ─────────────────────────────────────────────────────────────
    if (type === 'proposal') {
        const meta = {
            ...liveData.meta,
            clientName:      liveData.client_name || '',
            projectName:     liveData.title        || '',
            issueDate:       liveData.issue_date   || '',
            expirationDate:  liveData.due_date     || '',
            status:          liveData.status       || 'Draft',
        };

        const signatureBlock = (liveData.blocks || []).find((b: any) => b.type === 'signature' && b.signed);
        const signedBy = signatureBlock ? (signatureBlock.signerName || 'Client') : undefined;
        const signedAt = signatureBlock && liveData.updated_at
            ? new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }).format(new Date(liveData.updated_at))
            : undefined;

        return (
            <div
                className="flex-1 overflow-auto relative w-full h-screen"
                style={{
                    backgroundColor:   meta.design?.backgroundColor  || (isDark ? '#080808' : '#f7f7f7'),
                    backgroundImage:   getBackgroundImageWithOpacity(meta.design?.backgroundImage, meta.design?.backgroundColor || (isDark ? '#080808' : '#f7f7f7'), meta.design?.backgroundImageOpacity),
                    backgroundSize:    'cover',
                    backgroundPosition:'center',
                    backgroundAttachment: 'fixed',
                }}
            >
                <div className="z-30 flex justify-center sticky top-0 transition-all w-full pt-4 pb-8 pointer-events-none">
                    <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                        }}
                    >
                        <div className={cn(
                            "absolute inset-0 pointer-events-none",
                            isDark 
                                ? "bg-gradient-to-b from-[#080808]/80 to-transparent" 
                                : "bg-gradient-to-b from-[#f7f7f7]/80 to-transparent"
                        )} />
                    </div>
                    <div className="relative z-10 w-full pointer-events-auto">
                        <ClientActionBar
                            type="proposal"
                            status={meta.status as any}
                            design={meta.design}
                            signedBy={signedBy}
                            signedAt={signedAt}
                            inline={true}
                            onDownloadPDF={() => window.print()}
                            onPrint={() => window.print()}
                            onAccept={() => setIsSignModalOpen(true)}
                            onDecline={() => handleUpdateStatus('Declined')}
                            className="w-full max-w-[850px] mx-auto px-6"
                        />
                    </div>
                </div>

                <div className={cn("flex flex-col items-center min-h-full pb-20", isMobileViewport ? "pt-2 px-4" : "pt-4 px-6")}>
                    <div
                        className="w-full max-w-[850px] overflow-hidden transition-all duration-300"
                        style={{
                            borderRadius:    `${meta.design?.borderRadius ?? 16}px`,
                            backgroundColor: meta.design?.blockBackgroundColor || '#ffffff',
                            boxShadow:       meta.design?.blockShadow || '0 4px 20px -4px rgba(0,0,0,0.05)',
                        }}
                    >
                        <ProposalDocument
                            meta={meta}
                            blocks={liveData.blocks || []}
                            totals={totals}
                            isDark={false}
                            isPreview={true}
                            isMobile={isMobileViewport}
                            updateBlock={() => {}}
                            removeBlock={() => {}}
                            addBlock={() => {}}
                            openInsertMenu={null}
                            setOpenInsertMenu={() => {}}
                            updateMeta={() => {}}
                            setBlocks={() => {}}
                            currency={meta.currency || 'USD'}
                            setImageUploadOpen={() => {}}
                            setUploadTarget={() => {}}
                            isSaveTemplateModalOpen={false}
                            setIsSaveTemplateModalOpen={() => {}}
                            addTemplate={async () => {}}
                        />
                    </div>
                </div>

                <AcceptSignModal
                    isOpen={isSignModalOpen}
                    onClose={() => setIsSignModalOpen(false)}
                    documentType={type as any}
                    onAccept={(signatureData) => handleUpdateStatus('Accepted', signatureData)}
                    design={meta.design}
                />
            </div>
        );
    }

    // ── INVOICE ──────────────────────────────────────────────────────────────
    if (type === 'invoice') {
        const invoiceMeta = {
            ...liveData.meta,
            clientName:  liveData.client_name    || '',
            projectName: liveData.title           || '',
            issueDate:   liveData.issue_date      || '',
            dueDate:     liveData.due_date        || '',
            status:      liveData.status          || 'Draft',
            currency:    liveData.meta?.currency  || 'USD',
        };

        const paidBy = invoiceMeta.clientName || 'Client';
        const paidAt = liveData.updated_at
            ? new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }).format(new Date(liveData.updated_at))
            : undefined;

        return (
            <div
                className="flex-1 overflow-auto relative w-full h-screen"
                style={{
                    backgroundColor:   invoiceMeta.design?.backgroundColor  || (isDark ? '#080808' : '#f7f7f7'),
                    backgroundImage:   getBackgroundImageWithOpacity(invoiceMeta.design?.backgroundImage, invoiceMeta.design?.backgroundColor || (isDark ? '#080808' : '#f7f7f7'), invoiceMeta.design?.backgroundImageOpacity),
                    backgroundSize:    'cover',
                    backgroundPosition:'center',
                    backgroundAttachment: 'fixed',
                }}
            >
                <div className="z-30 flex justify-center sticky top-0 transition-all w-full pt-4 pb-8 pointer-events-none">
                    <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                        }}
                    >
                        <div className={cn(
                            "absolute inset-0 pointer-events-none",
                            isDark 
                                ? "bg-gradient-to-b from-[#080808]/80 to-transparent" 
                                : "bg-gradient-to-b from-[#f7f7f7]/80 to-transparent"
                        )} />
                    </div>
                    <div className="relative z-10 w-full pointer-events-auto">
                        <ClientActionBar
                            type="invoice"
                            status={invoiceMeta.status as any}
                            amountDue={new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceMeta.currency, minimumFractionDigits: 2 }).format(totals.total)}
                            paidAt={paidAt}
                            paidBy={paidBy}
                            design={invoiceMeta.design}
                            inline={true}
                            onDownloadPDF={() => window.print()}
                            onPrint={() => window.print()}
                            onPay={() => setIsBankModalOpen(true)}
                            className="w-full max-w-[850px] mx-auto px-6"
                        />
                    </div>
                </div>

                <div className={cn("flex flex-col items-center min-h-full pb-20", isMobileViewport ? "pt-2 px-4" : "pt-4 px-6")}>
                    <div
                        className="w-full max-w-[850px] overflow-hidden transition-all duration-300"
                        style={{
                            borderRadius:    `${invoiceMeta.design?.borderRadius ?? 16}px`,
                            backgroundColor: invoiceMeta.design?.blockBackgroundColor || '#ffffff',
                            boxShadow:       invoiceMeta.design?.blockShadow || '0 4px 20px -4px rgba(0,0,0,0.05)',
                        }}
                    >
                        <InvoiceDocument
                            meta={invoiceMeta}
                            blocks={liveData.blocks || []}
                            totals={totals}
                            isDark={false}
                            isPreview={true}
                            isMobile={isMobileViewport}
                            updateBlock={() => {}}
                            removeBlock={() => {}}
                            addBlock={() => {}}
                            openInsertMenu={null}
                            setOpenInsertMenu={() => {}}
                            updateMeta={() => {}}
                            setBlocks={() => {}}
                        />
                    </div>
                </div>

                <PaymentMethodSelectorModal
                    isOpen={isBankModalOpen}
                    onClose={() => setIsBankModalOpen(false)}
                    invoice={{ ...liveData, amount: totals.total }}
                    onMarkAsPaid={() => handleUpdateStatus('Paid')}
                />
            </div>
        );
    }

    // ── PROJECT ──────────────────────────────────────────────────────────────
    if (type === 'project') {
        const projectColor = data.color || '#6366f1';

        return (
            <div className="flex-1 flex flex-col w-full h-screen overflow-hidden bg-[#f7f7f7]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ background: projectColor }} />
                            <h1 className="text-[16px] font-bold text-[#111]">{data.name}</h1>
                        </div>
                        {data.client_name && (
                            <>
                                <div className="w-px h-4 bg-black/10" />
                                <span className="text-[12px] text-[#888] font-medium">For: {data.client_name}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[12px] text-[#ccc] font-bold uppercase tracking-wider px-2.5 py-1 bg-[#f5f5f5] rounded-lg border border-black/[0.03]">
                            {data.status}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 bg-[#f7f7f7]">
                    {isProjectLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <KanbanBoard
                            projectId={data.id}
                            projectColor={projectColor}
                            isDark={false}
                            searchQuery=""
                            showArchived={false}
                            onTaskClick={() => {}}
                            isPreview={true}
                            externalTasks={projectTasks}
                            externalGroups={projectGroups}
                        />
                    )}
                </div>
            </div>
        );
    }

    // ── FORM ─────────────────────────────────────────────────────────────────
    if (type === 'form') {
        return <FormPreview liveData={liveData} data={data} />;
    }

    // ── SCHEDULER ────────────────────────────────────────────────────────────
    if (type === 'scheduler') {
        return <SchedulerPreview liveData={liveData} data={data} />;
    }

    return null;
}
