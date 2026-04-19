import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';
import { getGeoIntelligence, getDeviceType } from '@/lib/geo';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, id, workspace_id, title, userAgent } = body;

        if (!workspace_id || !id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const docTitle = title || 'Untitled';
        const visitor = await getGeoIntelligence(req);
        const ip = visitor?.ip || 'unknown';
        
        const ua = userAgent || req.headers.get('user-agent') || 'unknown';
        const deviceType = getDeviceType(ua);
        const visitorWithDevice = visitor ? { ...visitor, deviceType } : { deviceType };

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
                metadata: { visitor: visitorWithDevice }
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
