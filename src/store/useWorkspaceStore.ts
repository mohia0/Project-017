import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';

export interface Workspace {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    logo_url: string | null;
    plan: string;
    owner_id: string;
    created_at: string;
    timezone?: string;
    week_start_day?: string;
    contact_emails?: any;
    contact_phones?: any;
    contact_address?: any;
    links?: any;
    working_hours?: any;
    additional_details?: any;
    metadata?: any;
    meta_title?: string | null;
    meta_description?: string | null;
    meta_image_url?: string | null;
}
interface WorkspaceState {
    workspaces: Workspace[];
    isLoading: boolean;
    hasFetched: boolean;
    error: string | null;
    fetchWorkspaces: () => Promise<void>;
    createWorkspace: (name: string, slug: string, logo_url?: string) => Promise<Workspace | null>;
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

        // Identify which workspace should be active based on the current Domain/Subdomain
        const { activeWorkspaceId, setActiveWorkspaceId } = useUIStore.getState();
        const validWorkspaceIds = workspaces.map(w => w.id);
        
        let detectedWorkspaceId: string | null = null;
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'aroooxa.com';
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

        // 1. Try to find by Subdomain (slug.rootDomain)
        if (hostname.endsWith(`.${rootDomain}`)) {
            const slug = hostname.split('.')[0];
            const found = workspaces.find(w => w.slug === slug);
            if (found) detectedWorkspaceId = found.id;
        }

        // 2. Try to find by Custom Domain (requires checking workspace_domains table)
        if (!detectedWorkspaceId && hostname && hostname !== rootDomain && hostname !== 'localhost' && !hostname.includes('127.0.0.1')) {
            const { data: domainData } = await supabase
                .from('workspace_domains')
                .select('workspace_id')
                .eq('domain', hostname)
                .maybeSingle();
            
            if (domainData) {
                detectedWorkspaceId = domainData.workspace_id;
            }
        }

        // Apply detected ID (prioritize URL detection over localStorage)
        if (detectedWorkspaceId && validWorkspaceIds.includes(detectedWorkspaceId)) {
            if (activeWorkspaceId !== detectedWorkspaceId) {
                setActiveWorkspaceId(detectedWorkspaceId);
            }
        } else if (activeWorkspaceId && !validWorkspaceIds.includes(activeWorkspaceId)) {
            // Stale active workspace from local storage (previous user session)
            setActiveWorkspaceId(workspaces.length > 0 ? workspaces[0].id : null);
        } else if (!activeWorkspaceId && workspaces.length > 0) {
            // Auto-select first workspace if none active and no direct URL match
            setActiveWorkspaceId(workspaces[0].id);
        }
    },

    createWorkspace: async (name: string, slug: string, logo_url?: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const insertData = { name, owner_id: user.id, slug, logo_url };

        const { data, error } = await supabase
            .from('workspaces')
            .insert(insertData)
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
            console.error("WORKSPACE UPDATE ERROR", error);
            alert("Database Error: " + error.message);
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
