import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';

export interface Client {
    id: string;
    workspace_id: string;
    company_id?: string | null;
    company_name: string;
    contact_person: string;
    email: string;
    phone: string;
    address: string;
    country?: string;
    tax_number: string;
    notes: string;
    avatar_url?: string;
    created_at: string;
}

interface ClientState {
    clients: Client[];
    isLoading: boolean;
    error: string | null;
    fetchClients: () => Promise<void>;
    addClient: (client: Omit<Client, 'id' | 'created_at' | 'workspace_id'>) => Promise<Client | null>;
    updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
    deleteClient: (id: string) => Promise<void>;
    bulkDeleteClients: (ids: string[]) => Promise<void>;
    bulkDuplicateClients: (ids: string[]) => Promise<void>;
}

export const useClientStore = create<ClientState>((set) => ({
    clients: [],
    isLoading: true,
    error: null,

    fetchClients: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) {
            set({ clients: [], isLoading: false });
            return;
        }

        const state = useClientStore.getState();
        const hasData = state.clients.length > 0;

        if (!hasData) {
            set({ isLoading: true, error: null });
        } else {
            set({ error: null });
        }

        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });
            
        if (error) {
            set({ error: error.message, isLoading: false });
        } else {
            set({ clients: data || [], isLoading: false });
        }
    },

    addClient: async (client) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return null;

        // Filter out null/undefined/empty fields to avoid DB schema cache errors
        const payload: any = { workspace_id: workspaceId };
        Object.entries(client).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                payload[key] = value;
            }
        });

        const { data, error } = await supabase.from('clients').insert(payload).select().single();
        if (error) {
            console.error("Supabase insert error (clients):", error.message, error.details, error.hint);
            set({ error: error.message });
            return null;
        } else if (data) {
            set((state) => ({ clients: [data as Client, ...state.clients] }));
            return data as Client;
        }
        return null;
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

    bulkDeleteClients: async (ids) => {
        if (!ids.length) return;
        const { error } = await supabase.from('clients').delete().in('id', ids);
        if (error) {
            set({ error: error.message });
        } else {
            set((state) => ({
                clients: state.clients.filter((c) => !ids.includes(c.id)),
            }));
        }
    },

    bulkDuplicateClients: async (ids) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId || !ids.length) return;

        const state = useClientStore.getState();
        const clientsToDup = state.clients.filter(c => ids.includes(c.id));
        
        const payloads = clientsToDup.map(c => {
            const { id, created_at, ...rest } = c;
            return {
                ...rest,
                contact_person: c.contact_person ? `${c.contact_person} (Copy)` : '',
                workspace_id: workspaceId
            };
        });

        const { data, error } = await supabase.from('clients').insert(payloads).select();
        if (error) {
            set({ error: error.message });
        } else if (data) {
            set(s => ({ clients: [...(data as Client[]), ...s.clients] }));
        }
    },
}));
