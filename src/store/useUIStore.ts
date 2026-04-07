import { create } from 'zustand';

export type Tool = {
    id: string;
    label: string;
    icon: string;
    path: string;
};

export type RightPanelState =
    | null
    | { type: 'notifications' }
    | { type: 'contact'; id: string }
    | { type: 'company'; id: string };

interface UIState {
    isLeftMenuExpanded: boolean;
    toggleLeftMenu: () => void;
    isToolsMenuExpanded: boolean;
    toggleToolsMenu: () => void;
    tools: Tool[];
    reorderTools: (newTools: Tool[]) => void;
    /* unified right panel */
    rightPanel: RightPanelState;
    openRightPanel: (panel: RightPanelState) => void;
    closeRightPanel: () => void;
    toggleNotifications: () => void;
    /* legacy – kept for compatibility */
    isNotificationsOpen: boolean;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isCreateModalOpen: boolean;
    setCreateModalOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
    isLeftMenuExpanded: false,
    toggleLeftMenu: () =>
        set((state) => ({ isLeftMenuExpanded: !state.isLeftMenuExpanded })),

    isToolsMenuExpanded: false,
    toggleToolsMenu: () =>
        set((state) => ({ isToolsMenuExpanded: !state.isToolsMenuExpanded })),

    tools: [
        { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
        { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    ],
    reorderTools: (newTools) => set({ tools: newTools }),

    /* Right panel */
    rightPanel: null,
    openRightPanel: (panel) => set({ rightPanel: panel, isNotificationsOpen: panel?.type === 'notifications' }),
    closeRightPanel: () => set({ rightPanel: null, isNotificationsOpen: false }),
    toggleNotifications: () => {
        const current = get().rightPanel;
        if (current?.type === 'notifications') {
            set({ rightPanel: null, isNotificationsOpen: false });
        } else {
            set({ rightPanel: { type: 'notifications' }, isNotificationsOpen: true });
        }
    },

    /* Legacy */
    isNotificationsOpen: false,

    theme: 'light',
    toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

    isCreateModalOpen: false,
    setCreateModalOpen: (isOpen) => set({ isCreateModalOpen: isOpen }),
}));
