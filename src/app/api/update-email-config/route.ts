import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            workspace_id,
            smtp_host,
            smtp_port,
            smtp_user,
            smtp_pass,
            from_name,
            from_address
        } = body;

        if (!workspace_id) {
            return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 });
        }

        const updates: any = {
            smtp_host,
            smtp_port,
            smtp_user,
            from_name,
            from_address,
            updated_at: new Date().toISOString()
        };

        if (smtp_pass) {
            updates.smtp_pass = smtp_pass;
        }

        const { error } = await supabaseService
            .from('workspace_email_config')
            .upsert({ workspace_id, ...updates });

        if (error) {
            console.error('Error saving email config:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
