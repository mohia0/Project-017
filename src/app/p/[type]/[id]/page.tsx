import { supabaseService } from '@/lib/supabase-service';
import PreviewClient from './PreviewClient';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AppLoader } from '@/components/ui/AppLoader';

async function getDocumentData(type: string, id: string) {
    let table = '';
    if (type === 'proposal') table = 'proposals';
    else if (type === 'invoice') table = 'invoices';
    else if (type === 'project') table = 'projects';
    else if (type === 'form' || type === 'forms') table = 'forms';
    else if (type === 'scheduler' || type === 'schedulers') table = 'schedulers';
    else return null;

    const { data, error } = await supabaseService
        .from(table)
        .select('*')
        .eq('id', id.trim())
        .single();
    
    if (error || !data) return null;
    return data;
}

export async function generateMetadata({ params }: { params: Promise<{ type: string, id: string }> }): Promise<Metadata> {
    const { type, id } = await params;
    const document = await getDocumentData(type, id);
    
    if (!document) return { title: 'Not Found' };

    const title = document.title || document.name || 'Untitled';
    let faviconUrl = '/favicon.svg';

    let workspaceName = 'CRM 17';

    if (document.workspace_id) {
        const { data: branding } = await supabaseService
            .from('workspace_branding')
            .select('favicon_url')
            .eq('workspace_id', document.workspace_id)
            .single();
        if (branding?.favicon_url) faviconUrl = branding.favicon_url;

        const { data: workspace } = await supabaseService
            .from('workspaces')
            .select('name')
            .eq('id', document.workspace_id)
            .single();
        if (workspace?.name) workspaceName = workspace.name;
    }

    const fullTitle = `${title} | ${workspaceName}`;

    return {
        title: fullTitle,
        icons: {
            icon: faviconUrl,
        },
        openGraph: {
            title: fullTitle,
            type: 'website',
            siteName: workspaceName,
        },
        twitter: {
            card: 'summary_large_image',
            title: fullTitle,
        }
    };
}

export default async function PublicPreviewPage({ params }: { params: Promise<{ type: string, id: string }> }) {
    const { type, id } = await params;
    const document = await getDocumentData(type, id);

    if (!document) {
        console.warn(`[PreviewPage] No document found for id ${id}`);
        return notFound();
    }

    // Status check - allow anything that isn't explicitly 'Draft' (case-insensitive)
    // Exception: Allow forms in draft status for previewing
    let status = (document.status || '').toLowerCase();
    if (status === 'draft' && type !== 'form' && type !== 'forms' && type !== 'scheduler' && type !== 'schedulers') {
        console.warn(`[PreviewPage] Document ${id} is in Draft status, blocking access.`);
        return notFound();
    }

    // Dynmically transition to 'Overdue' if the due_date has passed and status is 'Pending'
    if (status === 'pending' && document.due_date) {
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Ignore exact time, use date
        const dueDate = new Date(document.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        if (currentDate > dueDate) {
            document.status = 'Overdue';
            status = 'overdue';
        }
    }

    // If it's a project, fetch tasks and groups
    let projectTasks = [];
    let projectGroups = [];
    let submissionCount = 0;
    let schedulerBookings: any[] = [];

    const cleanId = id.trim();

    if (type === 'project') {
        const [tasksRes, groupsRes] = await Promise.all([
            supabaseService.from('project_tasks').select('*').eq('project_id', cleanId).eq('is_private', false).order('position'),
            supabaseService.from('project_task_groups').select('*').eq('project_id', cleanId).order('position')
        ]);
        projectTasks = tasksRes.data || [];
        projectGroups = groupsRes.data || [];
    } else if (type === 'form' || type === 'forms') {
        const { count } = await supabaseService
            .from('form_responses')
            .select('*', { count: 'exact', head: true })
            .eq('form_id', cleanId);
        submissionCount = count || 0;
    } else if (type === 'scheduler' || type === 'schedulers') {
        const { data: bookingsRes, count } = await supabaseService
            .from('scheduler_bookings')
            .select('booked_date, booked_time, duration_minutes', { count: 'exact' })
            .eq('scheduler_id', cleanId)
            .neq('status', 'cancelled');
        submissionCount = count || 0;
        schedulerBookings = bookingsRes || [];
    }

    // Fetch workspace timezone and week start day
    let workspaceTimezone = 'UTC';
    let workspaceWeekStartDay = 'Saturday';
    if (document.workspace_id) {
        const { data: wsData } = await supabaseService.from('workspaces').select('timezone, week_start_day').eq('id', document.workspace_id).single();
        if (wsData?.timezone) workspaceTimezone = wsData.timezone;
        if (wsData?.week_start_day) workspaceWeekStartDay = wsData.week_start_day;
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
        submissionCount,
        schedulerBookings,
        workspaceTimezone,
        workspaceWeekStartDay,
    };

    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-white"><AppLoader size="md" color="black" /></div>}>
            <PreviewClient type={type as any} data={safeData} />
        </Suspense>
    );
}

