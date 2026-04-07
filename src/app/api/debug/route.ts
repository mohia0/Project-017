export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data, error } = await supabase.from('proposals').insert({
            client_name: 'test',
            title: 'test'
        }).select();
        
        return NextResponse.json({
            message: "Insert check 2",
            data: data,
            error: error
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
    }
}
