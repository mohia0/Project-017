import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';

export interface Workspace {
    id: string;
    name: string;
    logo_url: string | null;
    plan: string;
    owner_id: string;
    created_at: string;
    contact_emails?: any;
    contact_phones?: any;
    contact_address?: any;
    links?: any;
    working_hours?: any;
    additional_details?: any;
    metadata?: any;
}
interface WorkspaceState {
    workspaces: Workspace[];
    isLoading: boolean;
    hasFetched: boolean;
    error: string | null;
    fetchWorkspaces: () => Promise<void>;
    createWorkspace: (name: string) => Promise<Workspace | null>;
    updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
    deleteWorkspace: (id: string) => Promise<boolean>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
    workspaces: [],
    isLoading: false,
    hasFetched: false,
    error: null,

    fetchWorkspaces: async () => {
        set({ isLoading: true, error: null });

        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            set({ workspaces: [], isLoading: false, hasFetched: true });
            return;
        }

        // Fetch workspaces owned by the user or where they are a member
        // For simplicity, we fetch all where owner_id = user.id for now
        // A more complex query could join with workspace_members later
        const { data, error } = await supabase
            .from('workspaces')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            set({ error: error.message, isLoading: false, hasFetched: true });
            return;
        }

        const workspaces = data as Workspace[];
        set({ workspaces, isLoading: false, hasFetched: true });

        // Validate that the active workspace belongs to the user
        const { activeWorkspaceId, setActiveWorkspaceId } = useUIStore.getState();
        const validWorkspaceIds = workspaces.map(w => w.id);

        if (activeWorkspaceId && !validWorkspaceIds.includes(activeWorkspaceId)) {
            // Stale active workspace from local storage (previous user session)
            setActiveWorkspaceId(workspaces.length > 0 ? workspaces[0].id : null);
        } else if (!activeWorkspaceId && workspaces.length > 0) {
            // Auto-select first workspace if none active
            setActiveWorkspaceId(workspaces[0].id);
        }
    },

    createWorkspace: async (name: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('workspaces')
            .insert({ name, owner_id: user.id })
            .select()
            .single();

        if (error) {
            set({ error: error.message });
            return null;
        }

        const newWorkspace = data as Workspace;
        set(state => ({ workspaces: [newWorkspace, ...state.workspaces] }));
        
        // Auto-select the newly created workspace
        useUIStore.getState().setActiveWorkspaceId(newWorkspace.id);

        return newWorkspace;
    },

    updateWorkspace: async (id: string, updates: Partial<Workspace>) => {
        const { data, error } = await supabase
            .from('workspaces')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            set({ error: error.message });
            return;
        }

        set(state => ({
            workspaces: state.workspaces.map(w => w.id === id ? data as Workspace : w)
        }));
    },

    deleteWorkspace: async (id: string) => {
        set({ isLoading: true, error: null });
        
        const { error } = await supabase
            .from('workspaces')
            .delete()
            .eq('id', id);

        if (error) {
            set({ error: error.message, isLoading: false });
            return false;
        }

        const { activeWorkspaceId, setActiveWorkspaceId } = useUIStore.getState();
        const updatedWorkspaces = get().workspaces.filter(w => w.id !== id);
        
        set({ 
            workspaces: updatedWorkspaces, 
            isLoading: false 
        });

        // If the deleted workspace was active, switch to another one
        if (activeWorkspaceId === id) {
            if (updatedWorkspaces.length > 0) {
                setActiveWorkspaceId(updatedWorkspaces[0].id);
            } else {
                setActiveWorkspaceId(null);
            }
        }

        return true;
    }
}));
