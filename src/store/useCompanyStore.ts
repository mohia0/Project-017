import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Company {
    id: string;
    name: string;
    industry?: string;
    website?: string;
    phone?: string;
    email?: string;
    address?: string;
    tax_number?: string;
    notes?: string;
    created_at: string;
}

interface CompanyState {
    companies: Company[];
    isLoading: boolean;
    error: string | null;
    fetchCompanies: () => Promise<void>;
    addCompany: (company: Omit<Company, 'id' | 'created_at'>) => Promise<Company | null>;
    updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
    deleteCompany: (id: string) => Promise<void>;
}

export const useCompanyStore = create<CompanyState>((set) => ({
    companies: [],
    isLoading: true,
    error: null,

    fetchCompanies: async () => {
        set({ isLoading: true, error: null });
        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            set({ error: error.message, isLoading: false });
        } else {
            set({ companies: data || [], isLoading: false });
        }
    },

    addCompany: async (company) => {
        const { data, error } = await supabase
            .from('companies')
            .insert(company)
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
}));
