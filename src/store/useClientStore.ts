import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Client {
    id: string;
    company_name: string;
    contact_person: string;
    email: string;
    phone: string;
    address: string;
    tax_number: string;
    notes: string;
    created_at: string;
}

interface ClientState {
    clients: Client[];
    isLoading: boolean;
    error: string | null;
    fetchClients: () => Promise<void>;
    addClient: (client: Omit<Client, 'id' | 'created_at'>) => Promise<void>;
    updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
    deleteClient: (id: string) => Promise<void>;
}

export const useClientStore = create<ClientState>((set) => ({
    clients: [],
    isLoading: false,
    error: null,

    fetchClients: async () => {
        set({ isLoading: true, error: null });
        const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
        if (error) {
            set({ error: error.message, isLoading: false });
        } else {
            set({ clients: data || [], isLoading: false });
        }
    },

    addClient: async (client) => {
        const { data, error } = await supabase.from('clients').insert(client).select().single();
        if (error) {
            set({ error: error.message });
        } else if (data) {
            set((state) => ({ clients: [data, ...state.clients] }));
        }
    },

    updateClient: async (id, updates) => {
        const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select().single();
        if (error) {
            set({ error: error.message });
        } else if (data) {
            set((state) => ({
                clients: state.clients.map((c) => (c.id === id ? data : c)),
            }));
        }
    },

    deleteClient: async (id) => {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) {
            set({ error: error.message });
        } else {
            set((state) => ({
                clients: state.clients.filter((c) => c.id !== id),
            }));
        }
    },
}));
