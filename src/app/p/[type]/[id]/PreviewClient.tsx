"use client";

import React, { useEffect, useState } from 'react';
import { ProposalDocument } from '@/components/proposals/ProposalEditor';
import { InvoiceDocument } from '@/components/invoices/InvoiceEditor';

export default function PreviewClient({ type, data }: { type: 'proposal' | 'invoice', data: any }) {
    const [viewHasBeenTracked, setViewHasBeenTracked] = useState(false);

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

    const isDark = false; // We can force light mode for previews or read from system preference
    const totals = { subtotal: data.amount || 0, discAmt: 0, taxAmt: 0, total: data.amount || 0 };

    if (type === 'proposal') {
        const meta = {
            ...data.meta,
            clientName: data.client_name || '',
            projectName: data.title || '',
            issueDate: data.issue_date || '',
            expirationDate: data.due_date || '',
            status: data.status || 'Draft',
        };

        return (
            <div className="min-h-screen w-full bg-[#f7f7f7] flex justify-center pb-20">
                <div 
                    className="w-full max-w-[850px] mt-8 bg-white overflow-hidden shadow-sm"
                    style={{ 
                        borderRadius: `${meta.design?.borderRadius ?? 16}px`,
                        backgroundColor: (meta.design?.blockBackgroundColor) || '#ffffff',
                        backgroundImage: meta.design?.backgroundImage ? `url(${meta.design.backgroundImage})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <ProposalDocument
                        meta={meta}
                        blocks={data.blocks || []}
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
        );
    }

    if (type === 'invoice') {
        const invoiceMeta = {
            ...data.meta,
            clientName: data.client_name || '',
            projectName: data.title || '',
            issueDate: data.issue_date || '',
            dueDate: data.due_date || '',
            status: data.status || 'Draft',
        };

        return (
            <div className="min-h-screen w-full bg-[#f7f7f7] flex justify-center pb-20">
                <div 
                    className="w-full max-w-[850px] mt-8 bg-white overflow-hidden shadow-sm"
                    style={{ 
                        borderRadius: `${invoiceMeta.design?.borderRadius ?? 16}px`,
                        backgroundColor: (invoiceMeta.design?.blockBackgroundColor) || '#ffffff',
                        backgroundImage: invoiceMeta.design?.backgroundImage ? `url(${invoiceMeta.design.backgroundImage})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <InvoiceDocument
                        meta={invoiceMeta}
                        blocks={data.blocks || []}
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
        );
    }

    return null;
}
