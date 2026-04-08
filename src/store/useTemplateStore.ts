import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';
import { DocumentDesign } from '@/types/design';

export interface Template {
    id: string;
    name: string;
    description?: string;
    entity_type: 'proposal' | 'invoice';
    blocks: any[]; // The structured content blocks
    design: DocumentDesign; 
    is_default: boolean;
    created_at: string;
}

interface TemplateState {
    templates: Template[];
    isLoading: boolean;
    error: string | null;
    fetchTemplates: () => Promise<void>;
    addTemplate: (template: Omit<Template, 'id' | 'created_at'>) => Promise<boolean>;
    deleteTemplate: (id: string) => Promise<boolean>;
    updateTemplate: (id: string, patch: Partial<Omit<Template, 'id' | 'created_at'>>) => Promise<boolean>;
    setDefaultTemplate: (id: string, entity_type: 'proposal' | 'invoice') => Promise<void>;
}

export const useTemplateStore = create<TemplateState>((set) => ({
    templates: [],
    isLoading: true,
    error: null,

    fetchTemplates: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) {
            set({ templates: [], isLoading: false });
            return;
        }

        set({ isLoading: true, error: null });
        const { data, error } = await supabase
            .from('templates')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });
            
        if (error) {
            set({ error: error.message, isLoading: false });
        } else {
            set({ templates: data || [], isLoading: false });
        }
    },

    addTemplate: async (template) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return false;

        set({ isLoading: true });
        try {
            // Auto-disable previous defaults for this entity if new is set to default
            if (template.is_default) {
                await supabase.from('templates')
                    .update({ is_default: false })
                    .eq('entity_type', template.entity_type)
                    .eq('workspace_id', workspaceId);
            }

            const payload = { ...template, workspace_id: workspaceId };
            const { data, error } = await supabase.from('templates').insert([payload]).select().single();
            if (error) throw error;
            
            set((state) => ({ 
                templates: [data, ...state.templates.map(t => t.entity_type === template.entity_type && template.is_default ? {...t, is_default: false} : t)],
                isLoading: false,
                error: null
            }));
            return true;
        } catch (err: any) {
            console.error("Store error inserting template:", err);
            set({ error: err.message, isLoading: false });
            return false;
        }
    },

    deleteTemplate: async (id) => {
        try {
            const { error } = await supabase.from('templates').delete().eq('id', id);
            if (error) throw error;
            
            set((state) => ({
                templates: state.templates.filter((t) => t.id !== id),
            }));
            return true;
        } catch (err: any) {
            set({ error: err.message });
            return false;
        }
    },

    updateTemplate: async (id, patch) => {
        try {
            const { data, error } = await supabase
                .from('templates')
                .update(patch)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            set((state) => ({
                templates: state.templates.map((t) => (t.id === id ? data : t)),
            }));
            return true;
        } catch (err: any) {
            console.error("Store error updating template:", err);
            set({ error: err.message });
            return false;
        }
    },

    setDefaultTemplate: async (id: string, entity_type: 'proposal' | 'invoice') => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return;

        // Reset all templates for this entity type to false
        await supabase.from('templates')
            .update({ is_default: false })
            .eq('entity_type', entity_type)
            .eq('workspace_id', workspaceId);
            
        // Set the specific one to true
        const { error } = await supabase.from('templates').update({ is_default: true }).eq('id', id);
        
        if (!error) {
            set(state => ({
                templates: state.templates.map(t => 
                    t.entity_type === entity_type 
                        ? { ...t, is_default: t.id === id }
                        : t
                )
            }));
        }
    }
}));
