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
            set(state => ({ notifications: [data as AppNotification, ...state.notifications] }));
        }
    },

    markAsRead: async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

        if (!error) {
            set(state => ({
                notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
            }));
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

        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', unreadIds);

        if (!error) {
            set(state => ({
                notifications: state.notifications.map(n => ({ ...n, read: true }))
            }));
        }
    },

    subscribe: () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return;

        if (subscription) {
            supabase.removeChannel(subscription);
        }

        subscription = supabase.channel(`notifications:${workspaceId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `workspace_id=eq.${workspaceId}`
            }, (payload) => {
                const newNotification = payload.new as AppNotification;

                set(state => ({
                    notifications: [newNotification, ...state.notifications]
                }));

                appToast.success(newNotification.title, newNotification.message);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to notifications for workspace:', workspaceId);
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

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('workspace_id', workspaceId);

        if (!error) {
            set({ notifications: [] });
            appToast.success('Notifications cleared');
        } else {
            appToast.error('Failed to clear notifications');
        }
    },

    deleteNotification: async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (!error) {
            set(state => ({
                notifications: state.notifications.filter(n => n.id !== id)
            }));
        } else {
            appToast.error('Failed to delete notification');
        }
    }
}));
