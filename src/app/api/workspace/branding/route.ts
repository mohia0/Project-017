import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/workspace/branding
 * Returns branding for the current workspace resolved by middleware.
 * Also returns isCustomDomain=true when accessed via a custom tenant domain,
 * so the UI knows to apply full white-label mode.
 */
export const runtime = 'edge';

export async function GET(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    let workspaceId    = req.headers.get('x-workspace-id');
    const isCustomDomain = req.headers.get('x-custom-domain') === '1';

    if (!workspaceId) {
        const { searchParams } = new URL(req.url);
        workspaceId = searchParams.get('workspaceId');
    }

    if (!workspaceId) {
        return NextResponse.json({ branding: null, isCustomDomain: false }, { status: 200 });
    }

    const [wsRes, brandRes, settingsRes] = await Promise.all([
        fetch(
            `${supabaseUrl}/rest/v1/workspaces?id=eq.${encodeURIComponent(workspaceId)}&select=name,logo_url&limit=1`,
            { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        ),
        fetch(
            `${supabaseUrl}/rest/v1/workspace_branding?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=primary_color,secondary_color,logo_url,favicon_url,font_family&limit=1`,
            { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        ),
        fetch(
            `${supabaseUrl}/rest/v1/workspace_settings?workspace_id=eq.${encodeURIComponent(workspaceId)}&tool_name=eq.members&select=settings&limit=1`,
            { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        ),
    ]);

    const [wsData, brandData, settingsData] = await Promise.all([wsRes.json(), brandRes.json(), settingsRes.json()]);
    const workspace = wsData?.[0]  ?? null;
    const brand     = brandData?.[0] ?? null;
    const settings  = settingsData?.[0]?.settings ?? null;
    const allowSignup = settings?.allow_signup === true;

    return NextResponse.json({
        isCustomDomain,
        workspaceId,
        allowSignup,
        branding: workspace ? {
            name:            workspace.name,
            logo_url:        brand?.logo_url || workspace.logo_url || null,
            primary_color:   brand?.primary_color  || null,
            secondary_color: brand?.secondary_color || null,
            font_family:     brand?.font_family     || null,
            favicon_url:     brand?.favicon_url     || null,
        } : null,
    });
}
