'use client';

import React, { use } from 'react';
import dynamic from 'next/dynamic';
import { AppLoader } from '@/components/ui/AppLoader';

const FormEditor = dynamic(
    () => import('@/components/forms/FormEditor'),
    { ssr: false, loading: () => <AppLoader /> }
);

export default function FormEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <FormEditor id={id} />;
}
