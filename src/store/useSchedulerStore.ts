import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';

export type SchedulerStatus = 'Active' | 'Draft' | 'Inactive';

export interface SchedulerBooking {
    id: string;
    scheduler_id: string;
    workspace_id: string;
    booker_name: string;
    booker_email: string;
    booker_phone?: string;
    booked_date: string;
    booked_time: string;
    timezone: string;
    duration_minutes: number;
    location?: string;
    status: 'confirmed' | 'cancelled' | 'pending';
    created_at: string;
}

export interface Scheduler {
    id: string;
    workspace_id: string;
    title: string;
    status: SchedulerStatus;
    meta?: any;
    created_at: string;
    bookings_count?: number;
}

interface SchedulerState {
    schedulers: Scheduler[];
    bookings: SchedulerBooking[];
    isLoading: boolean;
    error: string | null;
    fetchSchedulers: () => Promise<void>;
    addScheduler: (s: Omit<Scheduler, 'id' | 'created_at' | 'workspace_id'>) => Promise<Scheduler | null>;
    updateScheduler: (id: string, updates: Partial<Scheduler>) => Promise<void>;
    deleteScheduler: (id: string) => Promise<void>;
    bulkDeleteSchedulers: (ids: string[]) => Promise<void>;
    fetchBookings: (schedulerId: string) => Promise<void>;
    cancelBooking: (id: string) => Promise<void>;
}

export const useSchedulerStore = create<SchedulerState>((set) => ({
    schedulers: [],
    bookings: [],
    isLoading: false,
    error: null,

    fetchSchedulers: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) { set({ schedulers: [], isLoading: false }); return; }

        const hasData = useSchedulerStore.getState().schedulers.length > 0;
        if (!hasData) set({ isLoading: true, error: null });

        const { data, error } = await supabase
            .from('schedulers')
            .select('*, bookings_count:scheduler_bookings(count)')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

        if (error) set({ error: error.message, isLoading: false });
        else {
            const schedulersWithCounts = (data || []).map(s => ({
                ...s,
                bookings_count: s.bookings_count?.[0]?.count || 0
            }));
            set({ schedulers: schedulersWithCounts, isLoading: false });
        }
    },

    addScheduler: async (scheduler) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return null;

        const payload = { ...scheduler, workspace_id: workspaceId };
        const { data, error } = await supabase.from('schedulers').insert(payload).select().single();

        if (error) { set({ error: error.message }); return null; }
        if (data) { set((state) => ({ schedulers: [data, ...state.schedulers] })); return data; }
        return null;
    },

    updateScheduler: async (id, updates) => {
        set((state) => ({
            schedulers: state.schedulers.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }));
        const { data, error } = await supabase.from('schedulers').update(updates).eq('id', id).select().single();
        if (error) set({ error: error.message });
        else if (data) set((state) => ({ schedulers: state.schedulers.map((s) => (s.id === id ? data : s)) }));
    },

    deleteScheduler: async (id) => {
        const { error } = await supabase.from('schedulers').delete().eq('id', id);
        if (error) set({ error: error.message });
        else set((state) => ({ schedulers: state.schedulers.filter((s) => s.id !== id) }));
    },

    bulkDeleteSchedulers: async (ids) => {
        if (!ids.length) return;
        const { error } = await supabase.from('schedulers').delete().in('id', ids);
        if (error) set({ error: error.message });
        else set((state) => ({ schedulers: state.schedulers.filter((s) => !ids.includes(s.id)) }));
    },

    fetchBookings: async (schedulerId) => {
        const { data, error } = await supabase
            .from('scheduler_bookings')
            .select('*')
            .eq('scheduler_id', schedulerId)
            .order('booked_date', { ascending: false });

        if (!error && data) set({ bookings: data });
    },

    cancelBooking: async (id) => {
        await supabase.from('scheduler_bookings').update({ status: 'cancelled' }).eq('id', id);
        set((state) => ({
            bookings: state.bookings.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)),
        }));
    },
}));
