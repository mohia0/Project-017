import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isAuthModalOpen: boolean;
    setAuthModalOpen: (isOpen: boolean) => void;
    initialize: () => Promise<void>;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    isLoading: true,
    isAuthModalOpen: false,

    setAuthModalOpen: (isOpen) => set({ isAuthModalOpen: isOpen }),

    initialize: async () => {
        set({ isLoading: true });
        
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        set({ session, user: session?.user || null, isLoading: false });

        // Listen for auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
            set({ session, user: session?.user || null });
        });
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null });
        // Can optionally clear workspace UI data here
    }
}));
