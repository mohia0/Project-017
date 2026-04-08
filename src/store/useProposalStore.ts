import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export type ProposalStatus = 'Draft' | 'Pending' | 'Accepted' | 'Overdue' | 'Declined' | 'Cancelled';

export interface Proposal {
    id: string;
    client_id?: string | null;
    client_name: string; // Since we don't have full client DB mapped yet, we use client_name for now
    title: string;
    status: ProposalStatus;
    amount: number;
    issue_date: string;
    due_date: string;
    notes: string;
    blocks: any[]; // For Notion-style editor blocks
    meta?: any; // Contains design, custom fields
    created_at: string;
}

interface ProposalState {
    proposals: Proposal[];
    isLoading: boolean;
    error: string | null;
    fetchProposals: () => Promise<void>;
    addProposal: (proposal: Omit<Proposal, 'id' | 'created_at'>) => Promise<Proposal | null>;
    updateProposal: (id: string, updates: Partial<Proposal>) => Promise<void>;
    deleteProposal: (id: string) => Promise<void>;
}

export const useProposalStore = create<ProposalState>((set) => ({
    proposals: [],
    isLoading: false,
    error: null,

    fetchProposals: async () => {
        set({ isLoading: true, error: null });
        const { data, error } = await supabase.from('proposals').select('*').order('created_at', { ascending: false });
        if (error) {
            set({ error: error.message, isLoading: false });
        } else {
            set({ proposals: data || [], isLoading: false });
        }
    },

    addProposal: async (proposal) => {
        try {
            const payload = {
                ...proposal,
                client_id: proposal.client_id || null,
                due_date: proposal.due_date || null,
                issue_date: proposal.issue_date || null
            };
            const { data, error } = await supabase.from('proposals').insert(payload).select().single();
            if (error) {
                const errStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
                console.error("Supabase insert error details:", error);
                set({ error: error.message || errStr });
                return null;
            } else if (data) {
                set((state) => ({ proposals: [data, ...state.proposals] }));
                return data;
            }
            return null;
        } catch (err: any) {
            console.error("Store error inserting proposal:", err);
            set({ error: err.message });
            return null;
        }
    },

    updateProposal: async (id, updates) => {
        const payload: any = { ...updates };
        if (payload.due_date === '') payload.due_date = null;
        if (payload.issue_date === '') payload.issue_date = null;

        const { data, error } = await supabase.from('proposals').update(payload).eq('id', id).select().single();
        if (error) {
            console.error("Store error updating proposal:", error);
            set({ error: error.message });
        } else if (data) {
            set((state) => ({
                proposals: state.proposals.map((p) => (p.id === id ? data : p)),
            }));
        }
    },

    deleteProposal: async (id) => {
        const { error } = await supabase.from('proposals').delete().eq('id', id);
        if (error) {
            set({ error: error.message });
        } else {
            set((state) => ({
                proposals: state.proposals.filter((p) => p.id !== id),
            }));
        }
    },
}));
