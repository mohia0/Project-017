import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';

export type InvoiceStatus = 'Draft' | 'Pending' | 'Paid' | 'Overdue' | 'Cancelled';

export interface Invoice {
    id: string;
    client_id?: string | null;
    client_name: string;
    title: string;
    status: InvoiceStatus;
    amount: number;
    issue_date: string;
    due_date: string;
    notes: string;
    blocks: any[]; // For Notion-style editor blocks
    meta?: any;
    created_at: string;
}

interface InvoiceState {
    invoices: Invoice[];
    isLoading: boolean;
    error: string | null;
    fetchInvoices: () => Promise<void>;
    addInvoice: (invoice: Omit<Invoice, 'id' | 'created_at'>) => Promise<Invoice | null>;
    updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
    deleteInvoice: (id: string) => Promise<void>;
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

        try {
            const payload = {
                ...invoice,
                client_id: invoice.client_id || null,
                due_date: invoice.due_date || null,
                issue_date: invoice.issue_date || null,
                workspace_id: workspaceId,
            };
            const { data, error } = await supabase.from('invoices').insert(payload).select().single();
            if (error) {
                console.error("Supabase insert error (invoices):", error);
                set({ error: error.message });
                return null;
            } else if (data) {
                set((state) => ({ invoices: [data, ...state.invoices] }));
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

        if (current && current.meta) {
            let metaUpdated = false;
            const newMeta = { ...current.meta };
            if (updates.status && newMeta.status !== updates.status) {
                newMeta.status = updates.status;
                metaUpdated = true;
            }
            if (updates.client_name && newMeta.clientName !== updates.client_name) {
                newMeta.clientName = updates.client_name;
                metaUpdated = true;
            }
            if (metaUpdated) {
                payload.meta = newMeta;
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
}));
