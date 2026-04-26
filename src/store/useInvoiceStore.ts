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
    updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
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

    updateInvoice: async (id, updates) => {
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
                const { toolSettings } = (await import('./useSettingsStore')).useSettingsStore.getState();
                const settings = toolSettings['invoices'];
                
                if (settings?.auto_receipt) {
                    const { formatAmount, getCurrencySymbol } = await import('@/components/ui/MoneyAmount');
                    const { fmtDate } = await import('@/lib/dateUtils');
                    
                    fetch('/api/send-email', {
                        method: 'POST',
                        body: JSON.stringify({
                            workspace_id: data.workspace_id,
                            template_key: 'receipt',
                            to: data.meta?.clientEmail || '',
                            variables: {
                                client_name: data.client_name || '',
                                invoice_number: data.invoice_number || '',
                                currency_symbol: '', // Removed as per user request to avoid redundancy with formatted amount
                                amount_due: formatAmount(Number(data.amount || 0), data.meta?.currency || 'USD'),
                                amount_paid: formatAmount(Number(data.amount || 0), data.meta?.currency || 'USD'),
                                payment_date: fmtDate(data.paid_at || new Date().toISOString()),
                                due_date: data.due_date ? fmtDate(data.due_date) : '',
                                document_link: typeof window !== 'undefined' ? `${window.location.origin}/p/invoice/${data.id}` : '',
                                days_overdue: '0',
                            }
                        })
                    }).catch(err => console.error("Auto-receipt failed:", err));
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
