import { create } from 'zustand';

export type Tool = {
    id: string;
    label: string;
    icon: string;
    path: string;
};

interface UIState {
    isToolsMenuExpanded: boolean;
    toggleToolsMenu: () => void;
    tools: Tool[];
    reorderTools: (newTools: Tool[]) => void;
    isNotificationsOpen: boolean;
    toggleNotifications: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isCreateModalOpen: boolean;
    setCreateModalOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    isToolsMenuExpanded: false,
    toggleToolsMenu: () =>
        set((state) => ({ isToolsMenuExpanded: !state.isToolsMenuExpanded })),

    tools: [
        { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
        { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    ],
    reorderTools: (newTools) => set({ tools: newTools }),

    isNotificationsOpen: false,
    toggleNotifications: () =>
        set((state) => ({ isNotificationsOpen: !state.isNotificationsOpen })),

    theme: 'light',
    toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

    isCreateModalOpen: false,
    setCreateModalOpen: (isOpen) => set({ isCreateModalOpen: isOpen }),
}));
