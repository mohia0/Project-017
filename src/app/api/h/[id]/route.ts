import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';
import { getGeoIntelligence } from '@/lib/geo';

// 1x1 transparent PNG (base64 decoded at runtime)
const TRANSPARENT_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
);

// Silently derive device category from User-Agent string
function getDeviceType(ua: string): 'Mobile' | 'Tablet' | 'Desktop' {
    if (!ua || ua === 'unknown') return 'Desktop';
    const u = ua.toLowerCase();
    if (/ipad|tablet|kindle|silk|playbook|nexus 7|nexus 10/.test(u)) return 'Tablet';
    if (/mobi|android|iphone|ipod|blackberry|windows phone|opera mini|opera mobi|iemobile|mobile/.test(u)) return 'Mobile';
    return 'Desktop';
}

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

            // Log the view asynchronously — don't block the pixel response
            (async () => {
                const thresholdDate = new Date(Date.now() - 30 * 1000).toISOString();
                
                // Group by IP and User-Agent within a 30-second window
                const { data: recentEvent } = await supabaseService
                    .from('hook_events')
                    .select('id')
                    .eq('hook_id', hook.id)
                    .eq('ip_address', ip)
                    .eq('user_agent', ua)
                    .gte('created_at', thresholdDate)
                    .limit(1)
                    .maybeSingle();

                if (!recentEvent) {
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
                            visitor: { ...visitor, deviceType }, 
                            color: hook.color 
                        }
                    });
                }
            })();
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
