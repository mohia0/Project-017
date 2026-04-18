import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';

export interface Snippet {
    id: string;
    workspace_id: string;
    name: string;
    content_blocks: any[];
    content_text: string;
    tags: string[];
    created_at: string;
}

interface SnippetState {
    snippets: Snippet[];
    isLoading: boolean;
    error: string | null;
    fetchSnippets: () => Promise<void>;
    addSnippet: (s: Omit<Snippet, 'id' | 'created_at' | 'workspace_id'>) => Promise<boolean>;
    deleteSnippet: (id: string) => Promise<boolean>;
    updateSnippet: (id: string, patch: Partial<Omit<Snippet, 'id' | 'created_at'>>) => Promise<boolean>;
}

export const useSnippetStore = create<SnippetState>((set) => ({
    snippets: [],
    isLoading: false,
    error: null,

    fetchSnippets: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) { set({ snippets: [], isLoading: false }); return; }

        set({ isLoading: true, error: null });
        const { data, error } = await supabase
            .from('snippets')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

        if (error) {
            set({ error: error.message, isLoading: false });
        } else {
            set({ snippets: data || [], isLoading: false });
        }
    },

    addSnippet: async (snippet) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return false;

        const payload = { ...snippet, workspace_id: workspaceId };
        const { data, error } = await supabase
            .from('snippets')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error('[useSnippetStore] insert error:', error.message);
            set({ error: error.message });
            return false;
        }

        set((state) => ({ snippets: [data as Snippet, ...state.snippets] }));
        return true;
    },

    deleteSnippet: async (id) => {
        const { error } = await supabase.from('snippets').delete().eq('id', id);
        if (error) { set({ error: error.message }); return false; }
        set((state) => ({ snippets: state.snippets.filter((s) => s.id !== id) }));
        return true;
    },

    updateSnippet: async (id, patch) => {
        const { data, error } = await supabase
            .from('snippets')
            .update(patch)
            .eq('id', id)
            .select()
            .single();

        if (error) { set({ error: error.message }); return false; }
        set((state) => ({
            snippets: state.snippets.map((s) => (s.id === id ? (data as Snippet) : s)),
        }));
        return true;
    },
}));
