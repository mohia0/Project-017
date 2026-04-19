import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';
import { appToast } from '@/lib/toast';

export type HookStatus = 'Active' | 'Inactive';

export interface Hook {
    id: string;
    workspace_id: string;
    name: string;
    title: string | null;
    link: string | null;
    color: string;
    status: HookStatus;
    created_at: string;
    // Client-side enrichment
    event_count?: number;
    last_fired_at?: string | null;
}

interface HookState {
    hooks: Hook[];
    isLoading: boolean;
    error: string | null;
    fetchHooks: () => Promise<void>;
    refreshHookEventCount: (hookId: string) => Promise<void>;
    addHook: (hook: Omit<Hook, 'id' | 'created_at' | 'workspace_id' | 'event_count' | 'status' | 'last_fired_at'>) => Promise<Hook | null>;
    updateHook: (id: string, updates: Partial<Pick<Hook, 'name' | 'title' | 'link' | 'color' | 'status'>>) => Promise<void>;
    deleteHook: (id: string) => Promise<void>;
    bulkDeleteHooks: (ids: string[]) => Promise<void>;
    duplicateHook: (id: string) => Promise<Hook | null>;
    bulkDuplicateHooks: (ids: string[]) => Promise<void>;
}

export const useHookStore = create<HookState>((set) => ({
    hooks: [],
    isLoading: false,
    error: null,

    fetchHooks: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) {
            set({ hooks: [], isLoading: false });
            return;
        }

        const hasData = useHookStore.getState().hooks.length > 0;
        if (!hasData) set({ isLoading: true, error: null });

        // Fetch hooks with all events to derive count and timestamps
        const { data, error } = await supabase
            .from('hooks')
            .select('*, hook_events(created_at)')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

        if (error) {
            set({ error: error.message, isLoading: false });
        } else {
            const enriched: Hook[] = (data || []).map((h: any) => {
                const events: any[] = h.hook_events || [];
                const count = events.length;
                // Find most recent event timestamp
                const lastFiredAt = events
                    .map((e: any) => e.created_at)
                    .filter(Boolean)
                    .sort()
                    .reverse()[0] ?? null;
                return {
                    ...h,
                    status: h.status || 'Active',
                    color: h.color || '#4dbf39',
                    event_count: count,
                    last_fired_at: lastFiredAt,
                    hook_events: undefined,
                };
            });
            set({ hooks: enriched, isLoading: false });
        }
    },

    // Re-fetch a single hook's event count — called when the panel opens
    refreshHookEventCount: async (hookId: string) => {
        const { data: events, error } = await supabase
            .from('hook_events')
            .select('created_at')
            .eq('hook_id', hookId)
            .order('created_at', { ascending: false });

        if (!error && events) {
            set((state) => ({
                hooks: state.hooks.map((h) =>
                    h.id === hookId
                        ? {
                            ...h,
                            event_count: events.length,
                            last_fired_at: events[0]?.created_at ?? null,
                        }
                        : h
                ),
            }));
        }
    },

    addHook: async (hook) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return null;

        const payload = { ...hook, workspace_id: workspaceId, status: 'Active' };
        const { data, error } = await supabase.from('hooks').insert(payload).select().single();
        if (error) {
            set({ error: error.message });
            return null;
        }
        const newHook: Hook = { ...(data as Hook), event_count: 0, last_fired_at: null };
        set((state) => ({ hooks: [newHook, ...state.hooks] }));
        return newHook;
    },

    updateHook: async (id, updates) => {
        const { data, error } = await supabase
            .from('hooks')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('updateHook error:', error);
            set({ error: error.message });
            appToast.error("Error", `Update failed: ${error.message}`);
        } else if (data) {
            set((state) => ({
                hooks: state.hooks.map((h) =>
                    h.id === id ? { ...h, ...(data as Hook) } : h
                ),
            }));
            // Only toast for meaningful updates — not silent status toggles
            const isStatusOnlyUpdate = Object.keys(updates).length === 1 && 'status' in updates;
            if (!isStatusOnlyUpdate) {
                appToast.success('Hook updated');
            }
        }
    },

    deleteHook: async (id) => {
        const { error } = await supabase.from('hooks').delete().eq('id', id);
        if (error) {
            set({ error: error.message });
        } else {
            set((state) => ({ hooks: state.hooks.filter((h) => h.id !== id) }));
        }
    },

    bulkDeleteHooks: async (ids) => {
        if (!ids.length) return;
        const { error } = await supabase.from('hooks').delete().in('id', ids);
        if (error) {
            set({ error: error.message });
        } else {
            set((state) => ({ hooks: state.hooks.filter((h) => !ids.includes(h.id)) }));
        }
    },

    duplicateHook: async (id) => {
        const h = useHookStore.getState().hooks.find(x => x.id === id);
        if (!h) return null;
        // Keep workspace_id — only strip DB-generated fields
        const { id: _, created_at: __, event_count: ___, last_fired_at: ____, ...payload } = h;
        const newHookPayload = { ...payload, name: `${payload.name} (Copy)`, title: `${payload.title} (Copy)`, status: 'Active' };
        const { data, error } = await supabase.from('hooks').insert(newHookPayload).select().single();
        if (error) {
            set({ error: error.message });
            return null;
        }
        const newHook: Hook = { ...(data as Hook), event_count: 0, last_fired_at: null };
        set((state) => ({ hooks: [newHook, ...state.hooks] }));
        return newHook;
    },

    bulkDuplicateHooks: async (ids) => {
        const hooksToDuplicate = useHookStore.getState().hooks.filter(h => ids.includes(h.id));
        if (!hooksToDuplicate.length) return;

        // Keep workspace_id — only strip DB-generated fields
        const payloads = hooksToDuplicate.map(h => {
            const { id: _, created_at: __, event_count: ___, last_fired_at: ____, ...payload } = h;
            return { ...payload, name: `${payload.name} (Copy)`, title: `${payload.title} (Copy)`, status: 'Active' };
        });

        const { data, error } = await supabase.from('hooks').insert(payloads).select();
        if (error) {
            set({ error: error.message });
        } else if (data) {
            const newHooks = (data as any[]).map(h => ({ ...h, event_count: 0, last_fired_at: null }));
            set((state) => ({ hooks: [...newHooks, ...state.hooks] }));
        }
    }
}));
