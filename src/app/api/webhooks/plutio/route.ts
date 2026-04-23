import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';

export async function POST(req: Request) {
    try {
        const bodyText = await req.text();
        const signature = req.headers.get('x-plutio-signature');
        
        // 1. Find all workspaces that might have Plutio enabled
        // In a real multi-tenant scenario, you might have a dedicated table for integrations
        // or a workspace_id in the webhook URL. 
        // For now, we'll try to find any workspace that has 'plutio' settings with a matching secret.
        
        const { data: allSettings, error: settingsError } = await supabaseService
            .from('workspace_tool_settings')
            .select('workspace_id, settings')
            .eq('tool', 'plutio');

        if (settingsError || !allSettings) {
            console.error('[Plutio Webhook] Error fetching tool settings:', settingsError);
            return NextResponse.json({ error: 'Config not found' }, { status: 500 });
        }

        // 2. Identify the correct workspace by verifying the secret header
        let activeWorkspaceId = null;
        let payload = null;

        for (const entry of allSettings) {
            const settings = entry.settings as any;
            if (!settings.enabled || !settings.webhook_secret) continue;

            // Plutio doesn't have system signatures, we use a custom header e.g. x-plutio-secret
            const headerSecret = req.headers.get('x-plutio-secret');

            if (headerSecret === settings.webhook_secret) {
                activeWorkspaceId = entry.workspace_id;
                payload = JSON.parse(bodyText);
                break;
            }
        }

        // If no workspace matched the signature, return unauthorized
        if (!activeWorkspaceId || !payload) {
            console.warn('[Plutio Webhook] Unauthorized or no matching secret found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 3. Process the payload and create a notification
        const { event, data } = payload;
        
        let title = '';
        let message = '';
        let link = data.public_url || '#';
        let type = 'plutio';

        // Only handle viewed/opened events as requested by user
        if (event === 'proposal.viewed' || event === 'proposal.opened') {
            title = 'Plutio: Proposal Viewed';
            message = `Your proposal "${data.title || 'Untitled'}" was just viewed by ${data.client?.name || 'a client'}.`;
        } else if (event === 'invoice.viewed' || event === 'invoice.opened') {
            title = 'Plutio: Invoice Viewed';
            message = `Your invoice ${data.number || ''} was just viewed by ${data.client?.name || 'a client'}.`;
        } else {
            // Ignore other events as per user request
            return NextResponse.json({ success: true, ignored: true });
        }

        // 4. Insert notification into the database
        await supabaseService
            .from('notifications')
            .insert({
                workspace_id: activeWorkspaceId,
                title,
                message,
                link,
                read: false,
                type: 'view', // Using 'view' type for the Eye icon design
                metadata: { 
                    plutio_event: event,
                    plutio_id: data.id,
                    raw: data 
                }
            });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[Plutio Webhook] Error processing webhook:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
