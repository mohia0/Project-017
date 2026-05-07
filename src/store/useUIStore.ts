import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    | { type: 'company'; id: string }
    | { type: 'hook'; id: string; editing?: boolean }
    | { type: 'form_response'; id: string; formId: string }
    | { type: 'template_browser'; onInsert: (blockData: any) => void };

interface UIState {
    activeWorkspaceId: string | null;
    setActiveWorkspaceId: (id: string | null) => void;
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
    createModalTab: 'Contact' | 'Company' | 'Project' | 'Proposal' | 'Invoice' | 'Scheduler' | 'Form' | 'Hook';
    setCreateModalOpen: (isOpen: boolean, tab?: 'Contact' | 'Company' | 'Project' | 'Proposal' | 'Invoice' | 'Scheduler' | 'Form' | 'Hook') => void;
    isImportModalOpen: boolean;
    setImportModalOpen: (isOpen: boolean, type?: 'Invoice' | 'Proposal' | 'Contact' | 'Company') => void;
    importType: 'Invoice' | 'Proposal' | 'Contact' | 'Company';
    rightPanelWidth: number;
    setRightPanelWidth: (width: number) => void;
    isRightPanelCollapsed: boolean;
    toggleRightPanelCollapse: () => void;
    isPrivacyMode: boolean;
    togglePrivacyMode: () => void;
    /* currency conversion */
    conversionCurrency: string | null;        // target currency code, null = disabled
    conversionRates: Record<string, number>;  // base→target rates keyed by source code
    conversionLoading: boolean;
    setConversionCurrency: (code: string | null) => void;
    fetchConversionRates: (targetCode: string) => Promise<void>;
    /* page views persistence */
    pageViews: Record<string, string>;
    setPageView: (pageId: string, view: string) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set, get) => ({
            activeWorkspaceId: null,
            setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),

            isLeftMenuExpanded: false,
            toggleLeftMenu: () =>
                set((state) => ({ isLeftMenuExpanded: !state.isLeftMenuExpanded })),

            isToolsMenuExpanded: false,
            toggleToolsMenu: () =>
                set((state) => ({ isToolsMenuExpanded: !state.isToolsMenuExpanded })),

            tools: [
                { id: 'proposals', label: 'Proposals', icon: 'FileSignature', path: '/proposals' },
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
            createModalTab: 'Contact',
            setCreateModalOpen: (isOpen, tab = 'Contact') => set({ isCreateModalOpen: isOpen, createModalTab: tab }),

            isImportModalOpen: false,
            importType: 'Invoice' as 'Invoice' | 'Proposal' | 'Contact' | 'Company',
            setImportModalOpen: (isOpen, type) => set({ 
                isImportModalOpen: isOpen, 
                importType: type || get().importType 
            }),

            rightPanelWidth: 320,
            setRightPanelWidth: (width) => set({ rightPanelWidth: width }),
            isRightPanelCollapsed: false,
            toggleRightPanelCollapse: () => set((state) => ({ isRightPanelCollapsed: !state.isRightPanelCollapsed })),
            isPrivacyMode: false,
            togglePrivacyMode: () => set((state) => ({ isPrivacyMode: !state.isPrivacyMode })),

            /* currency conversion */
            conversionCurrency: null,
            conversionRates: {},
            conversionLoading: false,
            setConversionCurrency: (code) => {
                if (!code) {
                    set({ conversionCurrency: null, conversionRates: {}, conversionLoading: false });
                } else {
                    set({ conversionCurrency: code });
                    get().fetchConversionRates(code);
                }
            },
            fetchConversionRates: async (targetCode) => {
                set({ conversionLoading: true });
                try {
                    // Using exchangerate-api.com free tier (no key needed for basic endpoint)
                    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${targetCode}`);
                    if (!res.ok) throw new Error('Rate fetch failed');
                    const data = await res.json();
                    // data.rates[srcCode] = how many targetCode per 1 srcCode, so we invert
                    const rates: Record<string, number> = {};
                    for (const [code, rate] of Object.entries(data.rates as Record<string, number>)) {
                        rates[code] = rate === 0 ? 0 : (1 / rate);
                    }
                    set({ conversionRates: rates, conversionLoading: false });
                } catch {
                    set({ conversionLoading: false });
                }
            },

            /* Page Views */
            pageViews: {
                proposals: 'table',
                invoices: 'table',
                clients: 'grid',
                forms: 'table',
                schedulers: 'table',
                hooks: 'table',
                templates: 'table',
            },
            setPageView: (pageId, view) => set((state) => ({
                pageViews: { ...state.pageViews, [pageId]: view }
            })),
        }),
        {
            name: 'ui-storage',
            partialize: (state) => ({ 
                activeWorkspaceId: state.activeWorkspaceId,
                theme: state.theme,
                isLeftMenuExpanded: state.isLeftMenuExpanded,
                isToolsMenuExpanded: state.isToolsMenuExpanded,
                rightPanelWidth: state.rightPanelWidth,
                isRightPanelCollapsed: state.isRightPanelCollapsed,
                isPrivacyMode: state.isPrivacyMode,
                conversionCurrency: state.conversionCurrency,
                pageViews: state.pageViews,
            }),
        }
    )
);
