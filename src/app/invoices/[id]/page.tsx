'use client';

import React, { use } from 'react';
import dynamic from 'next/dynamic';
import { AppLoader } from '@/components/ui/AppLoader';

const InvoiceEditor = dynamic(
    () => import('@/components/invoices/InvoiceEditor'),
    { ssr: false, loading: () => <AppLoader /> }
);

export default function InvoiceEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <InvoiceEditor id={id} />;
}
