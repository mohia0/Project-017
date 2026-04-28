import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';

/**
 * POST /api/domains/delete
 * Deletes a domain from both the Supabase database and the Vercel project.
 */
export async function POST(req: Request) {
    try {
        const { domainId, domainName } = await req.json();

        if (!domainId || !domainName) {
            return NextResponse.json({ error: 'Missing domainId or domainName' }, { status: 400 });
        }

        const vercelToken     = process.env.VERCEL_TOKEN;
        const vercelProjectId = process.env.VERCEL_PROJECT_ID;

        if (!vercelToken || !vercelProjectId) {
            return NextResponse.json({
                error: 'VERCEL_TOKEN or VERCEL_PROJECT_ID missing from environment variables.',
            }, { status: 500 });
        }

        // 1. Remove from Vercel
        const deleteUrl = `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domainName}`;
        const vercelRes = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${vercelToken}`,
            },
        });

        if (!vercelRes.ok && vercelRes.status !== 404) {
            const errBody = await vercelRes.json().catch(() => ({}));
            console.error('Vercel delete error:', errBody);
            // We continue anyway to clean up the DB
        }

        // 2. Remove from DB
        const { error: dbError } = await supabaseService
            .from('workspace_domains')
            .delete()
            .eq('id', domainId);

        if (dbError) {
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
    }
}
