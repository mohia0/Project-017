import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';

export interface Company {
    id: string;
    workspace_id: string;
    name: string;
    industry?: string;
    website?: string;
    phone?: string;
    email?: string;
    address?: string;
    country?: string;
    tax_number?: string;
    notes?: string;
    avatar_url?: string;
    created_at: string;
}

interface CompanyState {
    companies: Company[];
    isLoading: boolean;
    error: string | null;
    fetchCompanies: () => Promise<void>;
    addCompany: (company: Omit<Company, 'id' | 'created_at' | 'workspace_id'>) => Promise<Company | null>;
    updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
    deleteCompany: (id: string) => Promise<void>;
    bulkDeleteCompanies: (ids: string[]) => Promise<void>;
    bulkDuplicateCompanies: (ids: string[]) => Promise<void>;
}

export const useCompanyStore = create<CompanyState>((set) => ({
    companies: [],
    isLoading: true,
    error: null,

    fetchCompanies: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) {
            set({ companies: [], isLoading: false });
            return;
        }

        set({ isLoading: true, error: null });
        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });
        if (error) {
            set({ error: error.message, isLoading: false });
        } else {
            set({ companies: data || [], isLoading: false });
        }
    },

    addCompany: async (company) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) {
            set({ error: 'No active workspace selected' });
            return null;
        }

        // Filter out empty/null fields to avoid issues with missing columns in DB
        const payload: any = { workspace_id: workspaceId };
        Object.entries(company).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                payload[key] = value;
            }
        });
        
        const { data, error } = await supabase
            .from('companies')
            .insert(payload)
            .select()
            .single();
        if (error) {
            set({ error: error.message });
            return null;
        } else if (data) {
            set((state) => ({ companies: [data, ...state.companies] }));
            return data;
        }
        return null;
    },

    updateCompany: async (id, updates) => {
        const { data, error } = await supabase
            .from('companies')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            set({ error: error.message });
        } else if (data) {
            set((state) => ({
                companies: state.companies.map((c) => (c.id === id ? data : c)),
            }));
        }
    },

    deleteCompany: async (id) => {
        const { error } = await supabase.from('companies').delete().eq('id', id);
        if (error) {
            set({ error: error.message });
        } else {
            set((state) => ({
                companies: state.companies.filter((c) => c.id !== id),
            }));
        }
    },

    bulkDeleteCompanies: async (ids) => {
        if (!ids.length) return;
        const { error } = await supabase.from('companies').delete().in('id', ids);
        if (error) {
            set({ error: error.message });
        } else {
            set((state) => ({
                companies: state.companies.filter((c) => !ids.includes(c.id)),
            }));
        }
    },

    bulkDuplicateCompanies: async (ids) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId || !ids.length) return;

        const state = useCompanyStore.getState();
        const companiesToDup = state.companies.filter(c => ids.includes(c.id));
        
        const payloads = companiesToDup.map(c => {
            const { id, created_at, ...rest } = c;
            return {
                ...rest,
                name: `${c.name} (Copy)`,
                workspace_id: workspaceId
            };
        });

        const { data, error } = await supabase.from('companies').insert(payloads).select();
        if (error) {
            set({ error: error.message });
        } else if (data) {
            set(s => ({ companies: [...(data as Company[]), ...s.companies] }));
        }
    },
}));
