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
            paid_at: data.paid_at,
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
        
        // Safety check for Service Key
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'placeholder_key') {
            console.warn('SUPABASE_SERVICE_ROLE_KEY is missing or using placeholder');
            // We can try to proceed, but it will likely fail with 401 if RLS is on.
            // Better to return a clear error.
        }

        const updateData: any = {};
        
        // Allowed field: status
        if (body.status && ['Accepted', 'Declined', 'Paid'].includes(body.status)) {
            updateData.status = body.status;
            if (body.status === 'Paid') {
                updateData.paid_at = new Date().toISOString();
            }
        }

        // If they act to accept a proposal, maybe they passed a signature block update
        if (body.signatureData) {
            // Fetch current blocks to patch the signature block securely Without letting them overwrite everything
            const { data: currData, error: fetchErr } = await supabaseService.from(tableName).select('blocks').eq('id', id).single();
            
            if (fetchErr) {
                console.error('Error fetching current blocks:', fetchErr);
            } else if (currData && Array.isArray(currData.blocks)) {
                updateData.blocks = currData.blocks.map((b: any) => 
                    b.type === 'signature' ? { 
                        ...b, 
                        signed: true, 
                        signerName: body.signatureData.name, 
                        signatureImage: body.signatureData.image,
                        signedAt: new Date().toISOString()
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
            return NextResponse.json({ 
                error: 'Failed to update document', 
                message: error.message,
                code: error.code
            }, { status: 500 });
        }

        // CREATE NOTIFICATION
        try {
            // Fetch minimal info for notification if we don't have it
            const { data: doc } = await supabaseService
                .from(tableName)
                .select('workspace_id, title, client_name')
                .eq('id', id)
                .single();

            if (doc && doc.workspace_id) {
                let notifTitle = '';
                let notifMsg = '';
                const docName = doc.title || 'Untitled';

                if (type === 'proposal' && body.status === 'Accepted') {
                    notifTitle = 'Proposal Signed 🎉';
                    notifMsg = `${doc.client_name || 'A client'} just signed the proposal "${docName}"`;
                } else if (type === 'invoice' && body.status === 'Paid') {
                    notifTitle = 'Invoice Paid 💸';
                    notifMsg = `${doc.client_name || 'A client'} just marked the invoice "${docName}" as paid`;
                }

                if (notifTitle) {
                    await supabaseService.from('notifications').insert({
                        workspace_id: doc.workspace_id,
                        title: notifTitle,
                        message: notifMsg,
                        link: `/${type}s/${id}`,
                        read: false
                    });
                }
            }
        } catch (notifErr) {
            console.error('Failed to create notification silent error:', notifErr);
            // Don't fail the main request if notification fails
        }

        return NextResponse.json({ success: true, updateData });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
