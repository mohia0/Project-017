'use client';

import React, { use } from 'react';
import dynamic from 'next/dynamic';
import { AppLoader } from '@/components/ui/AppLoader';

const EditorLoading = () => (
    <div className="w-full h-full flex items-center justify-center min-h-[500px]">
        <AppLoader size="lg" />
    </div>
);

const TemplateEditor = dynamic(
    () => import('@/components/templates/TemplateEditor'),
    { ssr: false, loading: EditorLoading }
);

export default function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <TemplateEditor id={id} />;
}
