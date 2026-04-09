"use client";

import React, { useEffect, useState } from 'react';
import { ProposalDocument } from '@/components/proposals/ProposalEditor';
import { InvoiceDocument } from '@/components/invoices/InvoiceEditor';
import { ClientActionBar } from '@/components/ui/ClientActionBar';
import { AcceptSignModal } from '@/components/modals/AcceptSignModal';
import { BankTransferModal } from '@/components/modals/BankTransferModal';

export default function PreviewClient({ type, data }: { type: 'proposal' | 'invoice', data: any }) {
    const [liveData, setLiveData] = useState(data);
    const [viewHasBeenTracked, setViewHasBeenTracked] = useState(false);
    
    // Modals
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (!viewHasBeenTracked) {
            // Track view via API route
            fetch('/api/track-view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, id: data.id, workspace_id: data.workspace_id, title: data.title || data.meta?.projectName || data.client_name }),
            }).catch(console.error);
            setViewHasBeenTracked(true);
        }
    }, [viewHasBeenTracked, type, data]);

    // Live Sync Polling
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/p/${type}/${data.id}?t=${Date.now()}`);
                if (res.ok) {
                    const latest = await res.json();
                    setLiveData(latest);
                }
            } catch (e) {
                console.error('Error fetching live data:', e);
            }
        }, 5000); // Polling every 5 seconds
        return () => clearInterval(interval);
    }, [type, data.id]);

    const handleUpdateStatus = async (status: string, signatureData?: any) => {
        if (isUpdating) return;
        try {
            setIsUpdating(true);
            const res = await fetch(`/api/p/${type}/${data.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, signatureData })
            });
            if (res.ok) {
                const updatedResponse = await res.json();
                if (updatedResponse.success) {
                    setLiveData((prev: any) => ({ ...prev, ...updatedResponse.updateData }));
                }
            }
        } catch (e) {
            console.error('Failed to update document status', e);
        } finally {
            setIsUpdating(false);
        }
    };

    const isDark = false; // We can force light mode for previews or read from system preference
    const totals = { subtotal: liveData.amount || 0, discAmt: 0, taxAmt: 0, total: liveData.amount || 0 };

    if (type === 'proposal') {
        const meta = {
            ...liveData.meta,
            clientName: liveData.client_name || '',
            projectName: liveData.title || '',
            issueDate: liveData.issue_date || '',
            expirationDate: liveData.due_date || '',
            status: liveData.status || 'Draft',
        };

        const signatureBlock = (liveData.blocks || []).find((b: any) => b.type === 'signature' && b.signed);
        const signedBy = signatureBlock ? (signatureBlock.signerName || 'Client') : undefined;
        // Using concise format like user requested: "4/1/2026"
        const signedAt = signatureBlock && liveData.updated_at 
            ? new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }).format(new Date(liveData.updated_at)) 
            : undefined;

        return (
            <div 
                className="flex-1 overflow-auto relative w-full h-screen"
                style={{ 
                    backgroundColor: (meta.design?.backgroundColor) || (isDark ? '#080808' : '#f7f7f7'),
                    backgroundImage: meta.design?.backgroundImage ? `url(${meta.design.backgroundImage})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundAttachment: 'fixed',
                }}
            >
                <div className="flex flex-col items-center min-h-full pt-4 pb-20 px-6">
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
                    />
                    
                    <div 
                        className="w-full max-w-[850px] overflow-hidden transition-all duration-300"
                        style={{ 
                            borderRadius: `${meta.design?.borderRadius ?? 16}px`,
                            backgroundColor: (meta.design?.blockBackgroundColor) || '#ffffff',
                            backgroundImage: meta.design?.backgroundImage ? `url(${meta.design.backgroundImage})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            boxShadow: meta.design?.blockShadow || '0 4px 20px -4px rgba(0,0,0,0.05)',
                        }}
                    >
                        <ProposalDocument
                            meta={meta}
                            blocks={liveData.blocks || []}
                            totals={totals}
                            isDark={isDark}
                            isPreview={true}
                            isMobile={false}
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
                    onAccept={(signatureData) => handleUpdateStatus('Accepted', signatureData)}
                    documentType="proposal"
                />
            </div>
        );
    }

    if (type === 'invoice') {
        const invoiceMeta = {
            ...liveData.meta,
            clientName: liveData.client_name || '',
            projectName: liveData.title || '',
            issueDate: liveData.issue_date || '',
            dueDate: liveData.due_date || '',
            status: liveData.status || 'Draft',
            currency: liveData.meta?.currency || 'USD'
        };

        const paidBy = invoiceMeta.clientName || 'Client';
        const paidAt = liveData.updated_at 
            ? new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }).format(new Date(liveData.updated_at)) 
            : undefined;

        return (
            <div 
                className="flex-1 overflow-auto relative w-full h-screen"
                style={{ 
                    backgroundColor: (invoiceMeta.design?.backgroundColor) || (isDark ? '#080808' : '#f7f7f7'),
                    backgroundImage: invoiceMeta.design?.backgroundImage ? `url(${invoiceMeta.design.backgroundImage})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundAttachment: 'fixed',
                }}
            >
                <div className="flex flex-col items-center min-h-full pt-4 pb-20 px-6">
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
                    />
                    
                    <div 
                        className="w-full max-w-[850px] overflow-hidden transition-all duration-300"
                        style={{ 
                            borderRadius: `${invoiceMeta.design?.borderRadius ?? 16}px`,
                            backgroundColor: (invoiceMeta.design?.blockBackgroundColor) || '#ffffff',
                            backgroundImage: invoiceMeta.design?.backgroundImage ? `url(${invoiceMeta.design.backgroundImage})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            boxShadow: invoiceMeta.design?.blockShadow || '0 4px 20px -4px rgba(0,0,0,0.05)',
                        }}
                    >
                        <InvoiceDocument
                            meta={invoiceMeta}
                            blocks={liveData.blocks || []}
                            totals={totals}
                            isDark={isDark}
                            isPreview={true}
                            isMobile={false}
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
                <BankTransferModal
                    isOpen={isBankModalOpen}
                    onClose={() => setIsBankModalOpen(false)}
                    onMarkAsPaid={() => handleUpdateStatus('Paid')}
                    amountDue={new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceMeta.currency, minimumFractionDigits: 2 }).format(totals.total)}
                />
            </div>
        );
    }

    return null;
}
