import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';

export async function POST(req: Request) {
    try {
        const { type, id, workspace_id, title } = await req.json();

        if (!workspace_id || !id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Generate a localized readable title
        const typeLabel = type === 'proposal' ? 'Proposal' : type === 'invoice' ? 'Invoice' : 'Document';
        const docTitle = title || 'a document';
        
        const notificationTitle = `${typeLabel} Viewed`;
        const notificationMessage = `Client viewed the ${typeLabel.toLowerCase()} "${docTitle}".`;

        // Insert into notifications
        const { error } = await supabaseService
            .from('notifications')
            .insert({
                workspace_id,
                title: notificationTitle,
                message: notificationMessage,
                link: `/app/${type}s/${id}`, // Dashboard internal link
                read: false
            });

        if (error) {
            console.error('Error recording notification:', error);
            // If the table doesn't exist yet, we silently fail to not break the preview API
            return NextResponse.json({ success: false, error: error.message });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
