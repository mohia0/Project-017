import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';

export type ProposalStatus = 'Draft' | 'Pending' | 'Accepted' | 'Overdue' | 'Declined' | 'Cancelled';

export interface Proposal {
    id: string;
    workspace_id: string;
    proposal_number?: string;
    client_id?: string | null;
    client_name: string; 
    title: string;
    status: ProposalStatus;
    amount: number;
    issue_date: string;
    due_date: string;
    notes: string;
    blocks: any[]; 
    meta?: any; 
    accepted_at?: string | null;
    created_at: string;
}

interface ProposalState {
    proposals: Proposal[];
    isLoading: boolean;
    error: string | null;
    fetchProposals: () => Promise<void>;
    addProposal: (proposal: Omit<Proposal, 'id' | 'created_at' | 'workspace_id'>) => Promise<Proposal | null>;
    updateProposal: (id: string, updates: Partial<Proposal>) => Promise<void>;
    deleteProposal: (id: string) => Promise<void>;
    bulkDeleteProposals: (ids: string[]) => Promise<void>;
}

export const useProposalStore = create<ProposalState>((set) => ({
    proposals: [],
    isLoading: true,
    error: null,

    fetchProposals: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) {
            set({ proposals: [], isLoading: false });
            return;
        }

        const state = useProposalStore.getState();
        const hasData = state.proposals.length > 0;

        if (!hasData) {
            set({ isLoading: true, error: null });
        } else {
            set({ error: null });
        }

        const { data, error } = await supabase
            .from('proposals')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });
            
        if (error) {
            set({ error: error.message, isLoading: false });
        } else {
            set({ proposals: data || [], isLoading: false });
        }
    },

    addProposal: async (proposal) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return null;

        const { generateNextId, incrementCounter, hasFetched, fetchToolSettings } = (await import('./useSettingsStore')).useSettingsStore.getState();
        
        // Ensure settings are loaded
        if (!hasFetched['toolSettings_proposals']) {
            await fetchToolSettings(workspaceId, 'proposals');
        }

        const proposalNumber = generateNextId('proposals');

        try {
            const payload = {
                ...proposal,
                client_id: proposal.client_id || null,
                due_date: proposal.due_date || null,
                issue_date: proposal.issue_date || null,
                workspace_id: workspaceId
            };
            const { data, error } = await supabase.from('proposals').insert(payload).select().single();
            if (error) {
                console.error("Supabase insert error (proposals):", error.message, error.details, error.hint);
                set({ error: error.message });
                return null;
            } else if (data) {
                set((state) => ({ proposals: [data, ...state.proposals] }));
                
                // Increment counter after successful creation
                // Increment counter after successful creation if assign_to_draft is enabled
                const settings = (await import('./useSettingsStore')).useSettingsStore.getState().toolSettings['proposals'];
                if (settings?.assign_to_draft !== false) {
                    await incrementCounter(workspaceId, 'proposals');
                }
                
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
        const state = useProposalStore.getState();
        const current = state.proposals.find(p => p.id === id);
        
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
            proposals: state.proposals.map((p) => (p.id === id ? { ...p, ...payload } : p)),
        }));

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

    bulkDeleteProposals: async (ids) => {
        if (!ids.length) return;
        const { error } = await supabase.from('proposals').delete().in('id', ids);
        if (error) {
            set({ error: error.message });
        } else {
            set((state) => ({
                proposals: state.proposals.filter((p) => !ids.includes(p.id)),
            }));
        }
    },
}));
