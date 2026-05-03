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

        // 3. Construct signup_link
        const encodedEmail = encodeURIComponent(to);
        let joinBase: string;
        if (domainRow?.domain) {
            joinBase = `https://${domainRow.domain}`;
        } else if (wsSlug) {
            joinBase = `https://${wsSlug}.${ROOT_DOMAIN}`;
        } else {
            joinBase = req.nextUrl.origin;
        }
        const signup_link = `${joinBase}/join/${workspace_id}?email=${encodedEmail}`;

        // 4. Forward to /api/send-email with the workspace_invitation template
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

        return NextResponse.json({ success: true, signup_link });
    } catch (err: any) {
        console.error('Send Invitation Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
