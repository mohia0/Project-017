import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';
import { appToast } from '@/lib/toast';

export interface AppNotification {
    id: string;
    workspace_id: string;
    title: string;
    message: string;
    link?: string;
    read: boolean;
    type?: string;
    metadata?: Record<string, any>;
    created_at: string;
}

interface NotificationState {
    notifications: AppNotification[];
    isLoading: boolean;
    fetchNotifications: () => Promise<void>;
    addNotification: (n: { title: string; message: string; link?: string; type?: string; metadata?: Record<string, any> }) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    subscribe: () => void;
    unsubscribe: () => void;
    clearAll: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    updateNotification: (id: string, updates: Partial<AppNotification>) => Promise<void>;
}

let subscription: any = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    isLoading: true,

    fetchNotifications: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) {
            set({ notifications: [], isLoading: false });
            return;
        }

        set({ isLoading: true });
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            set({ notifications: data as AppNotification[], isLoading: false });
        } else {
            set({ isLoading: false });
        }
    },

    addNotification: async ({ title, message, link, type, metadata }) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return;

        const { data, error } = await supabase
            .from('notifications')
            .insert({
                workspace_id: workspaceId,
                title,
                message,
                link: link || null,
                type: type || 'info',
                metadata: metadata || null,
                read: false,
            })
            .select()
            .single();

        if (!error && data) {
            const newNotif = data as AppNotification;
            set(state => {
                if (state.notifications.some(n => n.id === newNotif.id)) {
                    return state;
                }
                return { notifications: [newNotif, ...state.notifications] };
            });
        }
    },

    markAsRead: async (id: string) => {
        const previousNotifications = get().notifications;
        set(state => ({
            notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
        }));

        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

        if (error) {
            set({ notifications: previousNotifications });
        }
    },

    updateNotification: async (id: string, updates: Partial<AppNotification>) => {
        const { error } = await supabase
            .from('notifications')
            .update(updates)
            .eq('id', id);

        if (!error) {
            set(state => ({
                notifications: state.notifications.map(n => n.id === id ? { ...n, ...updates } : n)
            }));
        }
    },

    markAllAsRead: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return;

        const unreadIds = get().notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length === 0) return;

        const previousNotifications = get().notifications;
        set(state => ({
            notifications: state.notifications.map(n => ({ ...n, read: true }))
        }));

        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', unreadIds);

        if (error) {
            set({ notifications: previousNotifications });
        }
    },

    subscribe: () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return;

        // Always tear down any existing channel before creating a new one.
        // This handles workspace switches and stale connections correctly.
        if (subscription) {
            supabase.removeChannel(subscription);
            subscription = null;
        }

        subscription = supabase.channel(`notifications:${workspaceId}:${Date.now()}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `workspace_id=eq.${workspaceId}`
            }, (payload) => {
                const newNotification = payload.new as AppNotification;

                set(state => {
                    // Prevent duplicates if already added locally
                    if (state.notifications.some(n => n.id === newNotification.id)) {
                        return state;
                    }
                    return {
                        notifications: [newNotification, ...state.notifications]
                    };
                });

                appToast.success(newNotification.title, newNotification.message);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[Notifications] Realtime subscribed for workspace:', workspaceId);
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    console.warn('[Notifications] Channel issue, will retry on next subscribe call:', status);
                    subscription = null;
                }
            });
    },

    unsubscribe: () => {
        if (subscription) {
            supabase.removeChannel(subscription);
            subscription = null;
        }
    },

    clearAll: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return;

        const previousNotifications = get().notifications;
        set({ notifications: [] });

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('workspace_id', workspaceId);

        if (!error) {
            appToast.success('Notifications cleared');
        } else {
            set({ notifications: previousNotifications });
            appToast.error('Failed to clear notifications');
        }
    },

    deleteNotification: async (id: string) => {
        const previousNotifications = get().notifications;
        set(state => ({
            notifications: state.notifications.filter(n => n.id !== id)
        }));

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) {
            set({ notifications: previousNotifications });
            appToast.error('Failed to delete notification');
        }
    }
}));
