import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
        return NextResponse.json({ available: false, error: 'Slug is required' }, { status: 400 });
    }

    try {
        // Query the workspaces table for the slug
        const { data, error } = await supabaseService
            .from('workspaces')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

        if (error) throw error;

        return NextResponse.json({ 
            available: !data,
            slug 
        });
    } catch (err: any) {
        console.error('Error checking slug:', err);
        return NextResponse.json({ available: false, error: 'Internal server error' }, { status: 500 });
    }
}
