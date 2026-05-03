import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';

export async function POST(req: NextRequest) {
    try {
        const { workspace_id, user_id, invited_email, display_name } = await req.json();

        if (!workspace_id || !invited_email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Update workspace_members to set the user_id (mark as accepted)
        if (user_id) {
            await supabaseService
                .from('workspace_members')
                .update({ user_id })
                .eq('workspace_id', workspace_id)
                .eq('invited_email', invited_email)
                .is('user_id', null); // only update if not yet set
        }

        // 2. Fire a notification to the workspace
        const name = display_name || invited_email;
        await supabaseService
            .from('notifications')
            .insert({
                workspace_id,
                title: 'Invitation accepted',
                message: `${name} has accepted their workspace invitation and joined.`,
                type: 'invitation_accepted',
                metadata: {
                    invited_email,
                    user_id: user_id || null,
                    display_name: name,
                },
                read: false,
            });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Accept invitation error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
