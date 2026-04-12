import React from 'react';
import SchedulerEditor from '@/components/schedulers/SchedulerEditor';

export default async function SchedulerEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <SchedulerEditor id={id} />;
}
