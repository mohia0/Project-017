import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { 
    LayoutGrid, 
    Users, 
    FileText, 
    Receipt, 
    Folder,
    LucideIcon
} from 'lucide-react';

export interface NavItem {
    id: string;
    href: string;
    icon: string; // Stored as name
    label: string;
}

export const ICON_MAP: Record<string, LucideIcon> = {
    LayoutGrid,
    Users,
    FileText,
    Receipt,
    Folder
};

interface MenuState {
    navItems: NavItem[];
    isLoading: boolean;
    fetchMenu: () => Promise<void>;
    updateMenu: (items: NavItem[]) => Promise<void>;
}

export const useMenuStore = create<MenuState>((set) => ({
    navItems: [
        { id: 'dashboard', href: '/dashboard', icon: 'LayoutGrid', label: 'Dashboard' },
        { id: 'clients', href: '/clients', icon: 'Users', label: 'Contacts' },
        { id: 'proposals', href: '/proposals', icon: 'FileText', label: 'Proposals' },
        { id: 'invoices', href: '/invoices', icon: 'Receipt', label: 'Invoices' },
        { id: 'files', href: '/files', icon: 'Folder', label: 'File Manager' },
    ],
    isLoading: false,
    fetchMenu: async () => {
        set({ isLoading: true });
        try {
            const { data, error } = await supabase
                .from('system_config')
                .select('value')
                .eq('key', 'left_menu')
                .single();

            if (data && data.value) {
                set({ navItems: data.value });
            }
        } catch (err) {
            console.error('Error fetching menu:', err);
        } finally {
            set({ isLoading: false });
        }
    },
    updateMenu: async (items) => {
        set({ navItems: items });
        try {
            await supabase
                .from('system_config')
                .upsert({ key: 'left_menu', value: items });
        } catch (err) {
            console.error('Error updating menu:', err);
        }
    },
}));
