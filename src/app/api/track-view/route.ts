import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';
import { getGeoIntelligence } from '@/lib/geo';

export async function POST(req: Request) {
    try {
        const { type, id, workspace_id, title } = await req.json();

        if (!workspace_id || !id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const docTitle = title || 'Untitled';
        const visitor = await getGeoIntelligence(req);
        const ip = visitor?.ip || 'unknown';

        // Session Grouping: Check if we've notified about this view from this IP in the last 30 sec
        const thresholdDate = new Date(Date.now() - 30 * 1000).toISOString();
        const { data: recentNotification } = await supabaseService
            .from('notifications')
            .select('id')
            .eq('workspace_id', workspace_id)
            .eq('link', `/${type}s/${id}`)
            .eq('metadata->visitor->>ip', ip)
            .gte('created_at', thresholdDate)
            .limit(1)
            .maybeSingle();

        if (recentNotification) {
            return NextResponse.json({ success: true, message: 'Session already tracked' });
        }

        // Message format matches the design: `Someone opened "Title"`
        const notificationTitle = `Someone opened "${docTitle}"`;

        const notificationMessage =
            type === 'proposal'
                ? `A client opened your proposal.`
                : type === 'invoice'
                ? `A client opened your invoice.`
                : `A client opened a shared document.`;

        // Insert into notifications
        const { error } = await supabaseService
            .from('notifications')
            .insert({
                workspace_id,
                title: notificationTitle,
                message: notificationMessage,
                link: `/${type}s/${id}`,
                read: false,
                type: 'view',
                metadata: visitor ? { visitor } : null
            });

        if (error) {
            console.error('Error recording notification:', error);
            return NextResponse.json({ success: false, error: error.message });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
