import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';

/**
 * Called after a workspace_invitation email is sent.
 * Creates a pending workspace_members row (no user_id yet) so the
 * contact panel can show the "Pending" badge and hide the invite button.
 */
export async function POST(req: NextRequest) {
    try {
        const { workspace_id, invited_email } = await req.json();

        if (!workspace_id || !invited_email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Upsert a pending member row — only if no row exists yet for this email
        const { data: existing } = await supabaseService
            .from('workspace_members')
            .select('id, user_id')
            .eq('workspace_id', workspace_id)
            .eq('invited_email', invited_email)
            .maybeSingle();

        if (!existing) {
            // No row yet — create a pending one (user_id = null)
            await supabaseService
                .from('workspace_members')
                .insert({
                    workspace_id,
                    invited_email,
                    user_id: null,
                });
        }
        // If row already exists (already a member or already pending), do nothing

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Track invitation error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
