import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';

export interface AppNotification {
    id: string;
    workspace_id: string;
    title: string;
    message: string;
    link?: string;
    read: boolean;
    created_at: string;
}

interface NotificationState {
    notifications: AppNotification[];
    isLoading: boolean;
    fetchNotifications: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    subscribe: () => void;
    unsubscribe: () => void;
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

        subscription = supabase.channel('public:notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `workspace_id=eq.${workspaceId}`
            }, (payload) => {
                const newNotification = payload.new as AppNotification;
                
                // Add to local state and trigger toast
                set(state => ({
                    notifications: [newNotification, ...state.notifications]
                }));

                const { gooeyToast } = require('goey-toast');
                gooeyToast.success(newNotification.message);
            })
            .subscribe();
    },

    unsubscribe: () => {
        if (subscription) {
            supabase.removeChannel(subscription);
            subscription = null;
        }
    }
}));
