import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export type ProposalStatus = 'Draft' | 'Pending' | 'Accepted' | 'Overdue' | 'Declined' | 'Cancelled';

export interface Proposal {
    id: string;
    client_name: string; // Since we don't have full client DB mapped yet, we use client_name for now
    title: string;
    status: ProposalStatus;
    amount: number;
    issue_date: string;
    due_date: string;
    notes: string;
    blocks: any[]; // For Notion-style editor blocks
    created_at: string;
}

interface ProposalState {
    proposals: Proposal[];
    isLoading: boolean;
    error: string | null;
    fetchProposals: () => Promise<void>;
    addProposal: (proposal: Omit<Proposal, 'id' | 'created_at'>) => Promise<void>;
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
        const { data, error } = await supabase.from('proposals').insert(proposal).select().single();
        if (error) {
            set({ error: error.message });
        } else if (data) {
            set((state) => ({ proposals: [data, ...state.proposals] }));
        }
    },

    updateProposal: async (id, updates) => {
        const { data, error } = await supabase.from('proposals').update(updates).eq('id', id).select().single();
        if (error) {
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
