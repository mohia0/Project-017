import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'aroooxa.com';

export async function POST(req: NextRequest) {
    try {
        const { workspace_id, to, role_name, workspace_name } = await req.json();

        if (!workspace_id || !to) {
            return NextResponse.json({ error: 'Missing required fields (workspace_id, to)' }, { status: 400 });
        }

        // 1. Fetch workspace slug for portal domain
        const { data: ws } = await supabaseService
            .from('workspaces')
            .select('slug, name')
            .eq('id', workspace_id)
            .single();

        const wsName = workspace_name || ws?.name || 'Your Workspace';
        const wsSlug = ws?.slug || '';

        // 2. Try to find primary custom domain
        const { data: domainRow } = await supabaseService
            .from('workspace_domains')
            .select('domain')
            .eq('workspace_id', workspace_id)
            .eq('is_primary', true)
            .eq('status', 'active')
            .maybeSingle();

        // 3. Construct the join URL (where the user lands after clicking)
        //    IMPORTANT: redirect_to MUST use a URL that is in Supabase's "Allowed Redirect URLs" list.
        //    We have https://*.aroooxa.com/** whitelisted, so we always use the slug subdomain here.
        //    Custom domains are NOT used as redirect_to (they're not in Supabase's whitelist).
        //    The user will still land on the correct workspace join page via the subdomain URL.
        const encodedEmail = encodeURIComponent(to);
        const isLocalDev = req.nextUrl.hostname.includes('localhost') || req.nextUrl.hostname.includes('127.0.0.1');
        let joinBase: string;
        if (wsSlug && !isLocalDev) {
            // Always use the whitelisted *.aroooxa.com subdomain — never the custom domain for redirects
            joinBase = `https://${wsSlug}.${ROOT_DOMAIN}`;
        } else {
            // Dev fallback — use the same origin so the link works on localhost
            joinBase = req.nextUrl.origin;
        }
        const joinUrl = `${joinBase}/join/${workspace_id}?email=${encodedEmail}`;

        // 4. Generate a real Supabase magic link.
        //    type='invite' creates the account if it doesn't exist.
        //    type='magiclink' is the fallback for existing users.
        let { data: linkData, error: linkError } = await supabaseService.auth.admin.generateLink({
            type: 'invite',
            email: to,
            options: { redirectTo: joinUrl },
        });

        // Fallback to magiclink if user already exists
        if (linkError && linkError.message.includes('already been registered')) {
            const result = await supabaseService.auth.admin.generateLink({
                type: 'magiclink',
                email: to,
                options: { redirectTo: joinUrl },
            });
            linkData = result.data;
            linkError = result.error;
        }

        if (linkError || !linkData?.properties?.action_link) {
            console.error('generateLink error:', linkError);
            return NextResponse.json(
                { error: linkError?.message || 'Failed to generate invite link' },
                { status: 500 }
            );
        }

        // 5. CRITICAL: Rewrite the redirect_to inside the action_link.
        //    Supabase only honours redirect_to if the URL is in "Allowed Redirect URLs".
        //    Since we can't add every workspace portal domain there, we overwrite the param
        //    directly in the generated URL so it always lands on the correct join page.
        //    action_link format: https://[project].supabase.co/auth/v1/verify?token=...&redirect_to=[url]
        let signup_link = linkData.properties.action_link;
        try {
            const linkUrl = new URL(signup_link);
            linkUrl.searchParams.set('redirect_to', joinUrl);
            signup_link = linkUrl.toString();
        } catch {
            // If URL parsing fails, use the original link
        }

        // 6. Send our custom branded email with the magic link embedded as signup_link
        const sendRes = await fetch(`${req.nextUrl.origin}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workspace_id,
                template_key: 'workspace_invitation',
                to,
                variables: {
                    invitee_email: to,
                    workspace_name: wsName,
                    role_name: role_name || 'Member',
                    signup_link,
                },
            }),
        });

        const result = await sendRes.json();
        if (!sendRes.ok || !result.success) {
            return NextResponse.json({ error: result.error || 'Failed to send invitation' }, { status: sendRes.status });
        }

        // 7. Create a pending workspace_members row to track the invite state in the UI
        await supabaseService
            .from('workspace_members')
            .upsert({
                workspace_id,
                invited_email: to,
                user_id: null,
            }, { onConflict: 'workspace_id,invited_email', ignoreDuplicates: true });

        return NextResponse.json({ success: true, signup_link });

    } catch (err: any) {
        console.error('Send Invitation Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
