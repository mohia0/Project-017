import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';

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
            .select('id, workspace_id, name, title, link')
            .eq('id', id)
            .single();

        if (!hookError && hook) {
            const ip =
                req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                req.headers.get('x-real-ip') ||
                'unknown';
            const ua = req.headers.get('user-agent') || 'unknown';

            // Log the view asynchronously — don't block the pixel response
            (async () => {
                await supabaseService.from('hook_events').insert({
                    hook_id: hook.id,
                    ip_address: ip,
                    user_agent: ua,
                });

                await supabaseService.from('notifications').insert({
                    workspace_id: hook.workspace_id,
                    title: hook.title || `Someone opened "${hook.name}"`,
                    message: hook.link
                        ? `A hook was triggered on: ${hook.link}`
                        : 'A tracking hook was triggered.',
                    link: `/hooks`,
                    read: false,
                });
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
