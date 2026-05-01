'use client';

import React, { use } from 'react';
import dynamic from 'next/dynamic';
import { AppLoader } from '@/components/ui/AppLoader';

const EditorLoading = () => (
    <div className="w-full h-full flex items-center justify-center min-h-[500px]">
        <AppLoader size="lg" />
    </div>
);

const FormEditor = dynamic(
    () => import('@/components/forms/FormEditor'),
    { ssr: false, loading: EditorLoading }
);

export default function FormEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <FormEditor id={id} />;
}
