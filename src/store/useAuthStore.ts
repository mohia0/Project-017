import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { useUIStore } from './useUIStore';

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isAuthModalOpen: boolean;
    setAuthModalOpen: (isOpen: boolean) => void;
    hydrate: (session: Session | null) => void;
    initialize: () => void;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    // Initialize with false because SSR already hydrates the user
    isLoading: false,
    isAuthModalOpen: false,

    setAuthModalOpen: (isOpen) => set({ isAuthModalOpen: isOpen }),

    hydrate: (session) => {
        set({ session, user: session?.user || null, isLoading: false });
    },

    initialize: () => {
        // We no longer call getSession() here because it hits the DB/cookies and causes a delay.
        // It's already hydrated via layout.tsx -> Providers.tsx -> hydrate(session).
        
        // Listen for auth changes to keep UI reactive across tabs
        supabase.auth.onAuthStateChange((_event, session) => {
            if (_event === 'SIGNED_OUT') {
                set({ session: null, user: null });
                useUIStore.getState().setActiveWorkspaceId(null);
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('ui-storage');
                    window.location.href = '/login';
                }
            } else {
                set({ session, user: session?.user || null, isLoading: false });
            }
        });
    },

    signOut: async () => {
        await supabase.auth.signOut();
        // The onAuthStateChange listener will handle the cleanup and redirect
    }
}));
