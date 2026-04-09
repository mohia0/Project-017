import { supabase } from '@/lib/supabase';
import PreviewClient from './PreviewClient';
import { notFound } from 'next/navigation';

export default async function PublicPreviewPage({ params }: { params: Promise<{ type: string, id: string }> }) {
    const { type, id } = await params;
    
    let table = '';
    if (type === 'proposal') table = 'proposals';
    else if (type === 'invoice') table = 'invoices';
    else return notFound();

    const { data: document, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

    if (error || !document) {
        return notFound();
    }

    // We don't want to expose workspace_id and other sensitive internal fields
    const safeData = {
        id: document.id,
        title: document.title,
        status: document.status,
        amount: document.amount,
        issue_date: document.issue_date,
        due_date: document.due_date,
        blocks: document.blocks || [],
        meta: document.meta || {},
        client_name: document.client_name,
        workspace_id: document.workspace_id,
    };

    return <PreviewClient type={type as any} data={safeData} />;
}
