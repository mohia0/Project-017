import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';
import { 
    LayoutGrid, 
    Users, 
    FileText, 
    Receipt, 
    Folder,
    Briefcase,
    Zap,
    CalendarDays,
    ClipboardList,
    LucideIcon
} from 'lucide-react';

export interface NavItem {
    id: string;
    href: string;
    icon: string; // Stored as name
    label: string;
    isHidden?: boolean;
}

export const ICON_MAP: Record<string, LucideIcon> = {
    LayoutGrid,
    Users,
    FileText,
    Receipt,
    Folder,
    Briefcase,
    Zap,
    CalendarDays,
    ClipboardList,
};

interface MenuState {
    navItems: NavItem[];
    isLoading: boolean;
    fetchMenu: () => Promise<void>;
    updateMenu: (items: NavItem[]) => Promise<void>;
}

export const DEFAULT_NAV = [
    { id: 'dashboard',   href: '/dashboard',   icon: 'LayoutGrid',   label: 'Dashboard' },
    { id: 'projects',    href: '/projects',    icon: 'Briefcase',    label: 'Projects' },
    { id: 'clients',     href: '/clients',     icon: 'Users',        label: 'Contacts' },
    { id: 'proposals',   href: '/proposals',   icon: 'FileText',     label: 'Proposals' },
    { id: 'invoices',    href: '/invoices',    icon: 'Receipt',      label: 'Invoices' },
    { id: 'schedulers',  href: '/schedulers',  icon: 'CalendarDays', label: 'Schedulers' },
    { id: 'forms',       href: '/forms',       icon: 'ClipboardList',label: 'Forms' },
    { id: 'files',       href: '/files',       icon: 'Folder',       label: 'File Manager' },
    { id: 'hooks',       href: '/hooks',       icon: 'Zap',          label: 'Hook Generator' },
];

export const useMenuStore = create<MenuState>((set) => ({
    navItems: DEFAULT_NAV,
    isLoading: false,
    fetchMenu: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return;

        set({ isLoading: true });
        try {
            const { data, error } = await supabase
                .from('system_config')
                .select('value')
                .eq('key', `left_menu_${workspaceId}`)
                .single();

            if (data && data.value) {
                // Merge default items into saved items to ensure new tools appear
                const savedItems: NavItem[] = data.value;
                const merged = [...savedItems];
                
                DEFAULT_NAV.forEach(def => {
                    const exists = merged.some(item => item.id === def.id || item.href === def.href);
                    if (!exists) {
                        merged.push(def);
                    }
                });
                set({ navItems: merged });
            } else {
                set({ navItems: DEFAULT_NAV });
            }
        } catch (err) {
            console.error('Error fetching menu:', err);
            set({ navItems: DEFAULT_NAV });
        } finally {
            set({ isLoading: false });
        }
    },
    updateMenu: async (items) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return;

        set({ navItems: items });
        try {
            await supabase
                .from('system_config')
                .upsert({ 
                    key: `left_menu_${workspaceId}`, 
                    value: items 
                });
        } catch (err) {
            console.error('Error updating menu:', err);
        }
    },
}));
