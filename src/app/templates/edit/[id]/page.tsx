import React from 'react';
import TemplateEditor from '@/components/templates/TemplateEditor';

export default async function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TemplateEditor id={id} />;
}
