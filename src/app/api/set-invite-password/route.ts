import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/set-invite-password
 *
 * Sets a password for a newly invited user.
 * Called from the join page after the user fills in their password.
 *
 * We cannot use client-side supabase.auth.updateUser() here because
 * Supabase requires a "recovery" session to set a password without
 * knowing the current one. Invite links create an "implicit" session,
 * not a recovery session, so the client-side call is rejected.
 *
 * Using the service role admin API bypasses this restriction safely,
 * since we first validate the caller's access token before updating.
 */
export async function POST(req: NextRequest) {
    try {
        const { access_token, password } = await req.json();

        if (!access_token || !password) {
            return NextResponse.json({ error: 'Missing access_token or password' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        // Verify the caller's token to get their user ID
        const { data: { user }, error: userError } = await supabaseService.auth.getUser(access_token);
        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
        }

        // Use admin API to set the password — no current password required
        const { error: updateError } = await supabaseService.auth.admin.updateUserById(user.id, {
            password,
        });

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[set-invite-password] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
