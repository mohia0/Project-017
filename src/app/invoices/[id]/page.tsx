import React from 'react';
import InvoiceEditor from '@/components/invoices/InvoiceEditor';

export default async function InvoiceEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <InvoiceEditor id={id} />;
}
