"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ProposalDocument } from '@/components/proposals/ProposalEditor';
import { InvoiceDocument } from '@/components/invoices/InvoiceEditor';
import { ClientActionBar } from '@/components/ui/ClientActionBar';
import { AcceptSignModal } from '@/components/modals/AcceptSignModal';
import { PaymentMethodSelectorModal } from '@/components/modals/PaymentMethodSelectorModal';
import { cn, getBackgroundImageWithOpacity } from '@/lib/utils';

// Anon-key client — safe for public preview pages, used only to subscribe
// to Realtime events. No sensitive data is written through this client.
const supabasePublic = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PreviewClient({ type, data }: { type: 'proposal' | 'invoice', data: any }) {
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

    // Track view ONCE per page load — useRef guard prevents Strict Mode double-fire
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
    }, []); // Empty — fires once on mount only, data.id never changes after SSR

    // ─────────────────────────────────────────────────────────────────────────
    // Supabase Realtime — subscribe to row-level changes on this document.
    // The client sees updates the instant you save — no polling, no flicker,
    // no indicator that anything is happening behind the scenes.
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const tableName = type === 'proposal' ? 'proposals' : 'invoices';
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

                    // Merge only the safe fields — same set the server returns
                    setLiveData({
                        id: raw.id,
                        title: raw.title,
                        status: raw.status,
                        amount: raw.amount,
                        issue_date: raw.issue_date,
                        due_date: raw.due_date,
                        blocks: raw.blocks || [],
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
            
            // Replaced gooeyToast.promise with a silent fetch call as requested
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
            // Realtime will handle the UI update automatically,
            // but we apply it immediately for instant client feedback.
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

    return null;
}
