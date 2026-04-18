import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';

export interface SectionTemplate {
    id: string;
    workspace_id: string;
    name: string;
    description?: string;
    block_type: string;
    source_entity: string;
    block_data: any;
    background_color?: string;
    tags: string[];
    created_at: string;
}

interface SectionTemplateState {
    sectionTemplates: SectionTemplate[];
    isLoading: boolean;
    error: string | null;
    fetchSectionTemplates: () => Promise<void>;
    addSectionTemplate: (t: Omit<SectionTemplate, 'id' | 'created_at' | 'workspace_id'>) => Promise<boolean>;
    deleteSectionTemplate: (id: string) => Promise<boolean>;
    updateSectionTemplate: (id: string, patch: Partial<Omit<SectionTemplate, 'id' | 'created_at'>>) => Promise<boolean>;
}

export const useSectionTemplateStore = create<SectionTemplateState>((set) => ({
    sectionTemplates: [],
    isLoading: false,
    error: null,

    fetchSectionTemplates: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) { set({ sectionTemplates: [], isLoading: false }); return; }

        set({ isLoading: true, error: null });
        const { data, error } = await supabase
            .from('section_templates')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

        if (error) {
            set({ error: error.message, isLoading: false });
        } else {
            set({ sectionTemplates: data || [], isLoading: false });
        }
    },

    addSectionTemplate: async (template) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return false;

        const payload = { ...template, workspace_id: workspaceId };
        const { data, error } = await supabase
            .from('section_templates')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error('[useSectionTemplateStore] insert error:', error.message);
            set({ error: error.message });
            return false;
        }

        set((state) => ({ sectionTemplates: [data as SectionTemplate, ...state.sectionTemplates] }));
        return true;
    },

    deleteSectionTemplate: async (id) => {
        const { error } = await supabase.from('section_templates').delete().eq('id', id);
        if (error) { set({ error: error.message }); return false; }
        set((state) => ({ sectionTemplates: state.sectionTemplates.filter((t) => t.id !== id) }));
        return true;
    },

    updateSectionTemplate: async (id, patch) => {
        const { data, error } = await supabase
            .from('section_templates')
            .update(patch)
            .eq('id', id)
            .select()
            .single();

        if (error) { set({ error: error.message }); return false; }
        set((state) => ({
            sectionTemplates: state.sectionTemplates.map((t) => (t.id === id ? (data as SectionTemplate) : t)),
        }));
        return true;
    },
}));
