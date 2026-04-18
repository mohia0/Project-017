import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { appToast } from '@/lib/toast';
import { useUIStore } from './useUIStore';

export type FormStatus = 'Draft' | 'Active' | 'Inactive';

export type FormFieldType =
    | 'short_text' | 'long_text' | 'dropdown' | 'multi_choice' | 'picture_choice'
    | 'file_upload' | 'email' | 'phone' | 'full_name' | 'address' | 'countries'
    | 'number' | 'slider' | 'date' | 'datepicker' | 'link' | 'signature';

export interface FormField {
    id: string;
    type: FormFieldType;
    label: string;
    description?: string;
    required?: boolean;
    placeholder?: string;
    options?: string[]; // for dropdown, multi_choice, picture_choice
    min?: number;
    max?: number;
}

export interface FormResponse {
    id: string;
    form_id: string;
    workspace_id: string;
    data: Record<string, any>;
    created_at: string;
}

export interface Form {
    id: string;
    workspace_id: string;
    title: string;
    status: FormStatus;
    fields: FormField[];
    meta?: any;
    created_at: string;
    responses_count?: number;
}

interface FormState {
    forms: Form[];
    responses: FormResponse[];
    isLoading: boolean;
    error: string | null;
    fetchForms: () => Promise<void>;
    addForm: (f: Omit<Form, 'id' | 'created_at' | 'workspace_id'>) => Promise<Form | null>;
    updateForm: (id: string, updates: Partial<Form>) => Promise<void>;
    deleteForm: (id: string) => Promise<void>;
    bulkDeleteForms: (ids: string[]) => Promise<void>;
    fetchResponses: (formId: string) => Promise<void>;
    bulkDeleteResponses: (ids: string[]) => Promise<void>;
}

export const useFormStore = create<FormState>((set) => ({
    forms: [],
    responses: [],
    isLoading: true,
    error: null,

    fetchForms: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) { set({ forms: [], isLoading: false }); return; }

        const hasData = useFormStore.getState().forms.length > 0;
        if (!hasData) set({ isLoading: true, error: null });

        const { data, error } = await supabase
            .from('forms')
            .select('*, responses_count:form_responses(count)')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[useFormStore] Error fetching forms:', error.message);
            set({ error: error.message, isLoading: false });
        } else {
            // Ensure fields is always an array to prevent "0 fields" loading issues
            const formsWithFields = (data || []).map(f => ({
                ...f,
                fields: Array.isArray(f.fields) ? f.fields : [],
                responses_count: f.responses_count?.[0]?.count || 0
            }));
            set({ forms: formsWithFields, isLoading: false });
        }
    },

    addForm: async (form) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return null;

        const payload = { ...form, workspace_id: workspaceId };
        const { data, error } = await supabase.from('forms').insert(payload).select().single();

        if (error) { set({ error: error.message }); return null; }
        if (data) { 
            const newForm = { ...data, responses_count: 0 };
            set((state) => ({ forms: [newForm, ...state.forms] })); 
            return data; 
        }
        return null;
    },

    updateForm: async (id, updates) => {
        set((state) => ({
            forms: state.forms.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        }));
        const { data, error } = await supabase.from('forms').update(updates).eq('id', id).select().single();
        if (error) set({ error: error.message });
        else if (data) set((state) => ({ 
            forms: state.forms.map((f) => (f.id === id ? { ...data, responses_count: f.responses_count } : f)) 
        }));
    },

    deleteForm: async (id) => {
        const { error } = await supabase.from('forms').delete().eq('id', id);
        if (error) set({ error: error.message });
        else set((state) => ({ forms: state.forms.filter((f) => f.id !== id) }));
    },

    bulkDeleteForms: async (ids) => {
        if (!ids.length) return;
        const { error } = await supabase.from('forms').delete().in('id', ids);
        if (error) set({ error: error.message });
        else set((state) => ({ forms: state.forms.filter((f) => !ids.includes(f.id)) }));
    },

    fetchResponses: async (formId) => {
        const { data, error } = await supabase
            .from('form_responses')
            .select('*')
            .eq('form_id', formId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching responses:', error);
            appToast.error("Error", 'Failed to load responses');
            return;
        }
        if (data) set({ responses: data });
    },

    bulkDeleteResponses: async (ids) => {
        if (!ids.length) return;
        const { error } = await supabase.from('form_responses').delete().in('id', ids);
        if (error) set({ error: error.message });
        else set((state) => ({ responses: state.responses.filter((r) => !ids.includes(r.id)) }));
    },
}));
