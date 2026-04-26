import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';

export type InvoiceStatus = 'Draft' | 'Pending' | 'Processing' | 'Paid' | 'Overdue' | 'Cancelled';

export interface Invoice {
    id: string;
    workspace_id: string;
    invoice_number?: string;
    client_id?: string | null;
    client_name: string;
    title: string;
    status: InvoiceStatus;
    amount: number;
    issue_date: string;
    due_date: string;
    notes: string;
    blocks: any[]; 
    meta?: any;
    created_at: string;
    paid_at?: string | null;
}

interface InvoiceState {
    invoices: Invoice[];
    isLoading: boolean;
    error: string | null;
    fetchInvoices: () => Promise<void>;
    addInvoice: (invoice: Omit<Invoice, 'id' | 'created_at' | 'workspace_id'>) => Promise<Invoice | null>;
    updateInvoice: (id: string, updates: Partial<Invoice>, options?: { forceReceipt?: boolean }) => Promise<void>;
    deleteInvoice: (id: string) => Promise<void>;
    bulkDeleteInvoices: (ids: string[]) => Promise<void>;
}

export const useInvoiceStore = create<InvoiceState>((set) => ({
    invoices: [],
    isLoading: true,
    error: null,

    fetchInvoices: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) {
            set({ invoices: [], isLoading: false });
            return;
        }

        const state = useInvoiceStore.getState();
        const hasData = state.invoices.length > 0;
        
        if (!hasData) {
            set({ isLoading: true, error: null });
        } else {
            set({ error: null });
        }
        
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });
            
        if (error) {
            set({ error: error.message, isLoading: false });
        } else {
            set({ invoices: data || [], isLoading: false });
        }
    },

    addInvoice: async (invoice) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return null;

        const { generateNextId, incrementCounter, hasFetched, fetchToolSettings } = (await import('./useSettingsStore')).useSettingsStore.getState();
        
        // Ensure settings are loaded
        if (!hasFetched['toolSettings_invoices']) {
            await fetchToolSettings(workspaceId, 'invoices');
        }

        const invoiceNumber = generateNextId('invoices');

        try {
            const payload = {
                ...invoice,
                invoice_number: invoice.invoice_number || invoiceNumber,
                client_id: invoice.client_id || null,
                due_date: invoice.due_date || null,
                issue_date: invoice.issue_date || null,
                workspace_id: workspaceId
            };
            const { data, error } = await supabase.from('invoices').insert(payload).select().single();
            if (error) {
                console.error("Supabase insert error (invoices):", error.message);
                set({ error: error.message });
                return null;
            } else if (data) {
                set((state) => ({ invoices: [data, ...state.invoices] }));
                
                // Increment counter after successful creation
                // Increment counter after successful creation if assign_to_draft is enabled
                const settings = (await import('./useSettingsStore')).useSettingsStore.getState().toolSettings['invoices'];
                if (settings?.assign_to_draft !== false) {
                    await incrementCounter(workspaceId, 'invoices');
                }
                
                return data;
            }
            return null;
        } catch (err: any) {
            console.error("Store error inserting invoice:", err);
            set({ error: err.message });
            return null;
        }
    },

    updateInvoice: async (id, updates, options) => {
        const state = useInvoiceStore.getState();
        const current = state.invoices.find(i => i.id === id);
        
        const payload: any = { ...updates };
        if (payload.due_date === '') payload.due_date = null;
        if (payload.issue_date === '') payload.issue_date = null;

        if (current) {
            let metaUpdated = false;
            let newMeta = updates.meta ? { ...updates.meta } : (current.meta ? { ...current.meta } : {});

            if (updates.status && newMeta.status !== updates.status) {
                newMeta.status = updates.status;
                metaUpdated = true;
            }
            if (updates.client_name && newMeta.clientName !== updates.client_name) {
                newMeta.clientName = updates.client_name;
                metaUpdated = true;
            }
            if (metaUpdated || updates.meta) {
                payload.meta = newMeta;
            }
        }

        // Auto-timestamp paid_at when status changes
        if (updates.status) {
            if (updates.status === 'Paid') {
                payload.paid_at = updates.paid_at || new Date().toISOString();
            } else if (current && current.status === 'Paid') {
                // If it was paid and we change to something else, clear the paid date
                payload.paid_at = null;
            }
        }

        // Optimistic update
        set((state) => ({
            invoices: state.invoices.map((i) => (i.id === id ? { ...i, ...payload } : i)),
        }));

        const { data, error } = await supabase.from('invoices').update(payload).eq('id', id).select().single();
        if (error) {
            console.error("Store error updating invoice:", error);
            set({ error: error.message });
        } else if (data) {
            set((state) => ({
                invoices: state.invoices.map((i) => (i.id === id ? data : i)),
            }));

            // Auto-send receipt if status was changed to Paid and auto_receipt is enabled
            if (updates.status === 'Paid' && current?.status !== 'Paid') {
                const settingsStore = (await import('./useSettingsStore')).useSettingsStore.getState();
                if (!settingsStore.hasFetched['toolSettings_invoices'] && data.workspace_id) {
                    await settingsStore.fetchToolSettings(data.workspace_id, 'invoices');
                }
                const settings = (await import('./useSettingsStore')).useSettingsStore.getState().toolSettings['invoices'];
                
                // Centralized receipt automation logic
                // If forceReceipt is true (from manual verification), we ignore the auto_receipt setting
                const autoReceiptEnabled = options?.forceReceipt || settings?.auto_receipt !== false;
                
                const { formatAmount } = await import('@/components/ui/MoneyAmount');
                const { fmtDate } = await import('@/lib/dateUtils');
                const { appToast } = await import('@/lib/toast');
                const { useNotificationStore } = await import('./useNotificationStore');
                
                const clientEmail = data.meta?.clientEmail || '';
                const hasEmail = !!clientEmail;
                const amountFormatted = formatAmount(Number(data.amount || 0), data.meta?.currency || 'USD');
                const docLink = typeof window !== 'undefined' ? `${window.location.origin}/p/invoice/${data.id}` : '';

                const receiptVars = {
                    client_name: data.client_name || '',
                    invoice_number: data.invoice_number || '',
                    currency_symbol: '',
                    amount_due: amountFormatted,
                    amount_paid: amountFormatted,
                    payment_date: fmtDate(data.paid_at || new Date().toISOString()),
                    due_date: data.due_date ? fmtDate(data.due_date) : '',
                    document_link: docLink,
                    days_overdue: '0',
                };

                if (autoReceiptEnabled && hasEmail) {
                    fetch('/api/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            workspace_id: data.workspace_id,
                            template_key: 'receipt',
                            to: clientEmail,
                            variables: receiptVars
                        })
                    }).then(r => r.json())
                      .then(res => {
                          if (res.success) {
                              appToast.success('Receipt Sent', 'Client has been notified.');
                          } else {
                              appToast.error('Receipt Failed', res.error || 'Could not send auto-receipt');
                          }
                      })
                      .catch(err => console.error("Auto-receipt failed:", err));
                } else {
                    // Push actionable notification for manual dispatch
                    const reason = !hasEmail ? 'No client email on file.' : 'Auto-receipt is disabled.';
                    useNotificationStore.getState().addNotification({
                        title: `Receipt pending — ${data.client_name || 'Client'}`,
                        message: `${reason} Open the notification to send the receipt for ${data.invoice_number || 'this invoice'} (${amountFormatted}).`,
                        link: `/invoices/${data.id}`,
                        type: 'receipt_pending',
                        metadata: {
                            invoice_id: data.id,
                            workspace_id: data.workspace_id,
                            to: clientEmail,
                            variables: receiptVars,
                        },
                    });
                    appToast.info('Receipt Queued', 'Check your notifications to send manually');
                }
            }
        }
    },

    deleteInvoice: async (id) => {
        const { error } = await supabase.from('invoices').delete().eq('id', id);
        if (error) {
            set({ error: error.message });
        } else {
            set((state) => ({
                invoices: state.invoices.filter((i) => i.id !== id),
            }));
        }
    },

    bulkDeleteInvoices: async (ids) => {
        if (!ids.length) return;
        const { error } = await supabase.from('invoices').delete().in('id', ids);
        if (error) {
            set({ error: error.message });
        } else {
            set((state) => ({
                invoices: state.invoices.filter((i) => !ids.includes(i.id)),
            }));
        }
    },
}));
