import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';
import { getGeoIntelligence, getDeviceType, getOS } from '@/lib/geo';

// 1x1 transparent PNG (base64 decoded at runtime)
const TRANSPARENT_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        // Fetch hook details — needed for notification title/link
            const { data: hook, error: hookError } = await supabaseService
            .from('hooks')
            .select('id, workspace_id, name, title, link, status, color')
            .eq('id', id)
            .single();

        if (!hookError && hook && hook.status === 'Active') {
            const visitor = await getGeoIntelligence(req);
            const ip = visitor?.ip || 'unknown';
            const ua = req.headers.get('user-agent') || 'unknown';
            const deviceType = getDeviceType(ua);
            const os = getOS(ua);

            // Log the view asynchronously — don't block the pixel response
            (async () => {
                await supabaseService.from('hook_events').insert({
                    hook_id: hook.id,
                    ip_address: ip,
                    user_agent: ua,
                });

                    const notificationTitle = `Someone opened "${hook.name}"`;

                    await supabaseService.from('notifications').insert({
                        workspace_id: hook.workspace_id,
                        title: notificationTitle,
                        message: '',
                        link: `/hooks`,
                        read: false,
                        type: 'hook',
                        metadata: { 
                            visitor: visitor ? { ...visitor, deviceType, os } : { deviceType, os }, 
                            color: hook.color 
                        }
                    });
            })().catch(err => console.error('Error logging hook view:', err));
        }
    } catch (_) {
        // Silently fail — always return the pixel
    }

    return new NextResponse(TRANSPARENT_PNG, {
        status: 200,
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
        },
    });
}
