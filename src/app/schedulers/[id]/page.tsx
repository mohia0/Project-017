'use client';

import React, { use } from 'react';
import dynamic from 'next/dynamic';
import { AppLoader } from '@/components/ui/AppLoader';

const SchedulerEditor = dynamic(
    () => import('@/components/schedulers/SchedulerEditor'),
    { ssr: false, loading: () => <AppLoader /> }
);

export default function SchedulerEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <SchedulerEditor id={id} />;
}
