'use client';

import React, { use } from 'react';
import dynamic from 'next/dynamic';
import { AppLoader } from '@/components/ui/AppLoader';

const TemplateEditor = dynamic(
    () => import('@/components/templates/TemplateEditor'),
    { ssr: false, loading: () => <AppLoader /> }
);

export default function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <TemplateEditor id={id} />;
}
