import { supabaseService } from '@/lib/supabase-service';
import PreviewClient from './PreviewClient';
import { notFound } from 'next/navigation';

export default async function PublicPreviewPage({ params }: { params: Promise<{ type: string, id: string }> }) {
    const { type, id } = await params;
    
    let table = '';
    if (type === 'proposal') table = 'proposals';
    else if (type === 'invoice') table = 'invoices';
    else if (type === 'project') table = 'projects';
    else if (type === 'form' || type === 'forms') table = 'forms';
    else if (type === 'scheduler' || type === 'schedulers') table = 'schedulers';
    else {
        console.warn('[PreviewPage] Invalid type:', type);
        return notFound();
    }

    const cleanId = id.trim();
    console.log(`[PreviewPage] Fetching [${type}] with id [${cleanId}]`);

    // Fetch the document
    const { data: document, error } = await supabaseService
        .from(table)
        .select('*')
        .eq('id', cleanId)
        .single();

    if (error) {
        console.error(`[PreviewPage] Error fetching from ${table}:`, error.message);
        return notFound();
    }

    if (!document) {
        console.warn(`[PreviewPage] No document found in ${table} for id ${cleanId}`);
        return notFound();
    }

    // Status check - allow anything that isn't explicitly 'Draft' (case-insensitive)
    // Exception: Allow forms in draft status for previewing
    const status = (document.status || '').toLowerCase();
    if (status === 'draft' && type !== 'form' && type !== 'forms' && type !== 'scheduler' && type !== 'schedulers') {
        console.warn(`[PreviewPage] Document ${cleanId} is in Draft status, blocking access.`);
        return notFound();
    }

    console.log(`[PreviewPage] Success! Found ${table} [${document.id}] with status [${document.status}]`);

    // If it's a project, fetch tasks and groups
    let projectTasks = [];
    let projectGroups = [];
    if (type === 'project') {
        const [tasksRes, groupsRes] = await Promise.all([
            supabaseService.from('project_tasks').select('*').eq('project_id', cleanId).order('position'),
            supabaseService.from('project_task_groups').select('*').eq('project_id', cleanId).order('position')
        ]);
        projectTasks = tasksRes.data || [];
        projectGroups = groupsRes.data || [];
    }

    // Map data to a safe format for the client
    const safeData = {
        ...document,
        id: document.id,
        title: document.title || document.name || 'Untitled',
        fields: document.fields || document.blocks || [],
        meta: document.meta || {},
        projectTasks,
        projectGroups,
    };

    return <PreviewClient type={type as any} data={safeData} />;
}
