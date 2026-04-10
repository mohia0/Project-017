import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';

export type ItemType = 'folder' | 'file' | 'link' | 'image' | 'video' | 'audio' | 'doc' | 'code' | 'archive';

export interface FileItem {
    id: string;
    name: string;
    type: ItemType;
    parentId: string | null;
    size?: number;
    url?: string;
    starred?: boolean;
    tags?: string[];
    createdAt: string;
    modifiedAt: string;
    locked?: boolean;
    color?: string;
    downloadUrl?: string;
}

interface FileState {
    items: FileItem[];
    isLoading: boolean;
    error: string | null;
    fetchFiles: () => Promise<void>;
    addItem: (item: FileItem) => void;
    removeItem: (id: string) => void;
    updateItem: (id: string, updates: Partial<FileItem>) => void;
    setItems: (items: | FileItem[] | ((prev: FileItem[]) => FileItem[])) => void;
}

export const useFileStore = create<FileState>((set, get) => ({
    items: [],
    isLoading: true,
    error: null,

    fetchFiles: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) {
            set({ items: [], isLoading: false });
            return;
        }

        const state = get();
        const hasData = state.items.length > 0;

        if (!hasData) {
            set({ isLoading: true, error: null });
        } else {
            set({ error: null });
        }

        const { data, error } = await supabase
            .from('files')
            .select('*')
            .eq('workspace_id', workspaceId);

        if (error) {
            set({ error: error.message, isLoading: false });
        } else {
            if (data.length === 0) {
                const rootFolder = {
                    id: 'root',
                    name: 'Root',
                    type: 'folder',
                    parent_id: null,
                    workspace_id: workspaceId,
                    created_at: new Date().toISOString(),
                    modified_at: new Date().toISOString()
                };
                const { error: insertErr } = await supabase.from('files').insert([rootFolder]);
                if (!insertErr) {
                    set({ items: [{
                        id: rootFolder.id,
                        name: rootFolder.name,
                        type: rootFolder.type as ItemType,
                        parentId: rootFolder.parent_id,
                        createdAt: rootFolder.created_at,
                        modifiedAt: rootFolder.modified_at
                    }], isLoading: false });
                } else {
                    set({ error: insertErr.message, isLoading: false });
                }
            } else {
                const mappedData: FileItem[] = data.map((i: any) => ({
                    id: i.id,
                    name: i.name,
                    type: i.type,
                    parentId: i.parent_id,
                    size: i.size,
                    starred: i.starred,
                    url: i.url,
                    tags: i.tags,
                    downloadUrl: i.download_url,
                    color: i.color,
                    createdAt: i.created_at,
                    modifiedAt: i.modified_at,
                    locked: i.locked
                }));
                
                set({ items: mappedData, isLoading: false });
            }
        }
    },

    addItem: (item) => set((state) => ({ items: [...state.items, item] })),
    removeItem: (id) => set((state) => ({ items: state.items.filter(i => i.id !== id) })),
    updateItem: (id, updates) => set((state) => ({
        items: state.items.map(i => i.id === id ? { ...i, ...updates } : i)
    })),
    setItems: (newItems) => set((state) => ({
        items: typeof newItems === 'function' ? newItems(state.items) : newItems
    }))
}));
