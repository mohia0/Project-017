'use client';

import React, { use } from 'react';
import dynamic from 'next/dynamic';
import { AppLoader } from '@/components/ui/AppLoader';

const ProposalEditor = dynamic(
    () => import('@/components/proposals/ProposalEditor'),
    { ssr: false, loading: () => <AppLoader /> }
);

export default function ProposalEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <ProposalEditor id={id} />;
}
