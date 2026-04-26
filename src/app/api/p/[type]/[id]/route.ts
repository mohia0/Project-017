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

        if (safeData.status === 'Pending' && safeData.due_date) {
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            const dueDate = new Date(safeData.due_date);
            dueDate.setHours(0, 0, 0, 0);
            
            if (currentDate > dueDate) {
                safeData.status = 'Overdue';
            }
        }

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

        const { data: doc, error: docError } = await supabaseService
            .from(tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (docError || !doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        const updateData: any = {};
        let targetStatus = body.status;
        let isAutoPaid = false;

        // Auto-promote Processing to Paid if the setting is enabled
        if (type === 'invoice' && targetStatus === 'Processing') {
            const { data: toolSettings } = await supabaseService
                .from('workspace_tool_settings')
                .select('settings')
                .eq('workspace_id', doc.workspace_id)
                .eq('tool', 'invoices')
                .single();
            
            if (toolSettings?.settings?.auto_receipt_on_client_pay) {
                targetStatus = 'Paid';
                isAutoPaid = true;
            }
        }
        
        // Allowed field: status
        if (targetStatus && ['Accepted', 'Declined', 'Paid', 'Processing'].includes(targetStatus)) {
            updateData.status = targetStatus;
            if (targetStatus === 'Paid') {
                updateData.paid_at = new Date().toISOString();
            }
        }

        // If they act to accept a proposal, maybe they passed a signature block update
        if (body.signatureData) {
            if (Array.isArray(doc.blocks)) {
                updateData.blocks = doc.blocks.map((b: any) => 
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
            if (doc && doc.workspace_id) {
                let notifTitle = '';
                let notifMsg = '';
                const docName = doc.title || 'Untitled';

                if (type === 'proposal' && targetStatus === 'Accepted') {
                    notifTitle = 'Proposal Signed 🎉';
                    notifMsg = `${doc.client_name || 'A client'} just signed the proposal "${docName}"`;
                } else if (type === 'proposal' && targetStatus === 'Declined') {
                    notifTitle = 'Proposal Declined 😞';
                    notifMsg = `${doc.client_name || 'A client'} just declined the proposal "${docName}"`;
                } else if (type === 'invoice' && targetStatus === 'Processing') {
                    notifTitle = 'Payment Received — Verify Now 💳';
                    notifMsg = `${doc.client_name || 'A client'} reported a payment for "${docName}". Open to verify.`;
                } else if (type === 'invoice' && targetStatus === 'Paid') {
                    notifTitle = 'Invoice Paid 💸';
                    notifMsg = `${doc.client_name || 'A client'} just marked the invoice "${docName}" as paid`;
                    if (isAutoPaid) notifMsg = `${doc.client_name || 'A client'} paid the invoice "${docName}". Receipt sent automatically.`;
                }

                if (notifTitle) {
                    // For payment_verification or auto-receipt, gather invoice data
                    let notifType = 'info';
                    let notifMetadata: Record<string, any> | null = null;

                    if (type === 'invoice' && (targetStatus === 'Processing' || targetStatus === 'Paid')) {
                        const invoiceMeta = (doc.meta as any) || {};
                        const clientEmail = invoiceMeta.clientEmail || invoiceMeta.assignedClients?.[0]?.email || '';
                        const invoiceNumber = invoiceMeta.invoiceNumber || doc.invoice_number || id.slice(0, 8).toUpperCase();
                        const amountRaw = doc.amount || 0;
                        const currency = invoiceMeta.currency || 'USD';
                        const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amountRaw);

                        const vars = {
                            client_name: doc.client_name || '',
                            invoice_number: invoiceNumber,
                            amount_paid: amount,
                            amount_due: amount,
                            payment_date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                            currency_symbol: '', // Ensure placeholder is removed from template
                            document_link: body.document_link || `${new URL(req.url).origin}/p/invoice/${id}`,
                        };

                        if (targetStatus === 'Processing') {
                            notifType = 'payment_verification';
                            notifMetadata = {
                                invoice_id: id,
                                payment_method: body.paymentMethod,
                                to: clientEmail,
                                variables: vars,
                            };
                        } else if (targetStatus === 'Paid') {
                            // If it's Paid, we might need to send a receipt
                            // Case A: isAutoPaid (System just flipped it from Processing -> Paid)
                            // Case B: body.status was Paid (Client marked as Paid directly, e.g. for some methods)
                            
                            // Check tool settings for auto-receipt on client pay
                            const { data: toolSettings } = await supabaseService
                                .from('workspace_tool_settings')
                                .select('settings')
                                .eq('workspace_id', doc.workspace_id)
                                .eq('tool', 'invoices')
                                .single();

                            const settings = toolSettings?.settings || {};
                            
                            // If auto_receipt_on_client_pay is on, OR if it was already Paid and regular auto_receipt is on
                            // (Though usually for client-side marking, we use the specific new setting)
                            if (settings.auto_receipt_on_client_pay && clientEmail) {
                                // Auto-send receipt
                                (async () => {
                                    try {
                                        await fetch(`${new URL(req.url).origin}/api/send-email`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                workspace_id: doc.workspace_id,
                                                template_key: 'receipt',
                                                to: clientEmail,
                                                variables: vars,
                                            }),
                                        });
                                    } catch (err) {
                                        console.error('Auto-receipt send failed:', err);
                                    }
                                })();
                                if (!isAutoPaid) {
                                    notifMsg += ' (Receipt sent automatically)';
                                }
                            }
                        }
                    }

                    await supabaseService.from('notifications').insert({
                        workspace_id: doc.workspace_id,
                        title: notifTitle,
                        message: notifMsg,
                        link: targetStatus === 'Processing' ? `/invoices/${id}` : `/${type}s/${id}`,
                        read: false,
                        type: notifType,
                        metadata: notifMetadata,
                    });
                }
            }
        } catch (notifErr) {
            console.error('Failed to create notification or send receipt:', notifErr);
            // Don't fail the main request
        }

        return NextResponse.json({ success: true, updateData });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
