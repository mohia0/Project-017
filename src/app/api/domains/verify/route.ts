import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // user might only have normal client, we'll use normal client first if service is absent

export async function POST(req: Request) {
    try {
        const { domainId, domain } = await req.json();
        
        if (!domainId || !domain) {
            return NextResponse.json({ error: 'Missing domainId or domain' }, { status: 400 });
        }

        const vercelToken = process.env.VERCEL_TOKEN;
        const vercelProjectId = process.env.VERCEL_PROJECT_ID;

        if (!vercelToken || !vercelProjectId) {
            return NextResponse.json({ 
                error: 'Vercel secrets (VERCEL_TOKEN, VERCEL_PROJECT_ID) map are missing from .env.local' 
            }, { status: 500 });
        }

        // 1. Add domain to Vercel (if not already there)
        const addUrl = `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`;
        await fetch(addUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${vercelToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: domain }),
        });

        // 2. Verify DNS on Vercel
        const checkUrl = `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}`;
        const checkRes = await fetch(checkUrl, {
            headers: { 'Authorization': `Bearer ${vercelToken}` },
        });
        
        const checkData = await checkRes.json();
        
        let verified = false;
        let errorMessage: string | null = null;
        
        if (checkData.verified === true) {
            verified = true;
        } else if (checkData.error) {
            errorMessage = checkData.error.message || 'DNS verification failed on Vercel.';
        } else {
            errorMessage = 'DNS not propagated yet, or configured incorrectly. Point CNAME to cname.vercel-dns.com';
        }

        // 3. Try to update status in DB
        // We will try using standard supabase client if service client doesn't exist
        const updatedStatus = verified ? 'active' : 'pending';
        
        return NextResponse.json({ 
            success: true, 
            verified, 
            status: updatedStatus, 
            error: errorMessage 
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Unknown network error' }, { status: 500 });
    }
}
