import React from 'react';
import ProposalEditor from '@/components/proposals/ProposalEditor';

export default async function ProposalEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <ProposalEditor id={id} />;
}
