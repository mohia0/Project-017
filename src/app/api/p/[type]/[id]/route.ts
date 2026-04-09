import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ type: string, id: string }> }) {
    try {
        const { type, id } = await params;
        const validTypes = ['proposal', 'invoice'];

        if (!validTypes.includes(type)) {
            return NextResponse.json({ error: 'Invalid document type' }, { status: 404 });
        }

        const tableName = type === 'proposal' ? 'proposals' : 'invoices';

        const { data, error } = await supabaseService
            .from(tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        const safeData = {
            id: data.id,
            title: data.title,
            status: data.status,
            amount: data.amount,
            issue_date: data.issue_date,
            due_date: data.due_date,
            blocks: data.blocks || [],
            meta: data.meta || {},
            client_name: data.client_name,
            workspace_id: data.workspace_id,
        };

        return NextResponse.json(safeData);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ type: string, id: string }> }) {
    try {
        const { type, id } = await params;
        const body = await req.json();
        
        const validTypes = ['proposal', 'invoice'];
        if (!validTypes.includes(type)) {
            return NextResponse.json({ error: 'Invalid document type' }, { status: 404 });
        }

        const tableName = type === 'proposal' ? 'proposals' : 'invoices';
        
        const updateData: any = {};
        
        // Allowed field: status
        if (body.status && ['Accepted', 'Declined', 'Paid'].includes(body.status)) {
            updateData.status = body.status;
        }

        // If they act to accept a proposal, maybe they passed a signature block update
        if (body.signatureData) {
            // Fetch current blocks to patch the signature block securely Without letting them overwrite everything
            const { data: currData } = await supabaseService.from(tableName).select('blocks').eq('id', id).single();
            if (currData && currData.blocks) {
                updateData.blocks = currData.blocks.map((b: any) => 
                    b.type === 'signature' ? { 
                        ...b, 
                        signed: true, 
                        signerName: body.signatureData.name, 
                        signatureImage: body.signatureData.image 
                    } : b
                );
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
        }

        const { error } = await supabaseService
            .from(tableName)
            .update(updateData)
            .eq('id', id);

        if (error) {
            console.error('Supabase Update Error:', error);
            return NextResponse.json({ error: 'Failed to update document', details: error }, { status: 500 });
        }

        return NextResponse.json({ success: true, updateData });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
