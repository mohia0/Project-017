"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/useUIStore';
import { useHookStore, Hook, HookStatus } from '@/store/useHookStore';
import { SettingsToggle } from '@/components/settings/SettingsField';
import { cn } from '@/lib/utils';
import {
    Search, Table2, LayoutGrid, Plus, ChevronDown,
    Zap, Activity, Link, ExternalLink, Trash2, Pencil,
    Check, ArrowUpDown, Globe, Copy, X, SquareCheck, Clock
} from 'lucide-react';
import { InlineDeleteButton } from '@/components/ui/InlineDeleteButton';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { AppLoader } from '@/components/ui/AppLoader';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, DataTableColumn } from '@/components/ui/DataTable';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useRouter } from 'next/navigation';
import { appToast } from '@/lib/toast';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatDistanceToNow } from 'date-fns';
import { ContextMenuRow } from '@/components/ui/RowContextMenu';
import { 
    DndContext, 
    closestCenter, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import { 
    arrayMove, 
    SortableContext, 
    sortableKeyboardCoordinates, 
    horizontalListSortingStrategy, 
    useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function fmtDate(d: string) {
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
}

/* ─── Status config ─────────────────────────────────────────── */
const STATUS_CFG: Record<HookStatus, { bg: string; text: string; border: string; dot: string }> = {
    Active:   { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', dot: '#22c55e' },
    Inactive: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', dot: '#f97316' },
};
const STATUS_DARK: Record<HookStatus, { text: string; dot: string }> = {
    Active:   { text: '#4ade80', dot: '#4ade80' },
    Inactive: { text: '#f97316', dot: '#f97316' },
};

function Dropdown({ open, onClose, isDark, children, side = 'bottom' }: { open: boolean; onClose: () => void; isDark: boolean; children: React.ReactNode; side?: 'top' | 'bottom' }) {
    const ref = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);

    React.useLayoutEffect(() => {
        if (open && ref.current?.parentElement) {
            const rect = ref.current.parentElement.getBoundingClientRect();
            setCoords({
                top: side === 'bottom' ? rect.bottom + 4 : rect.top - 4,
                left: rect.left + rect.width / 2
            });
        }
    }, [open, side]);

    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        const s = () => onClose();
        document.addEventListener('mousedown', h);
        window.addEventListener('scroll', s, true);
        return () => {
            document.removeEventListener('mousedown', h);
            window.removeEventListener('scroll', s, true);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div 
            ref={ref} 
            className={cn(
                "fixed -translate-x-1/2 z-[1000] min-w-[160px] rounded-xl border shadow-xl overflow-hidden",
                side === 'top' && "-translate-y-full",
                isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
            )}
            style={coords ? {
                top: `${coords.top}px`,
                left: `${coords.left}px`,
            } : { opacity: 0 }}
        >
            {children}
        </div>
    );
}

function TbBtn({ label, icon, active, hasArrow, onClick, isDark }: {
    label?: string; icon?: React.ReactNode; active?: boolean; hasArrow?: boolean; onClick?: () => void; isDark: boolean;
}) {
    return (
        <button onClick={onClick} className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-colors shrink-0",
            active
                ? isDark ? "bg-white/10 text-white" : "bg-[#ebebf5] text-[#111]"
                : isDark ? "text-[#777] hover:text-[#ccc] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]"
        )}>
            {icon}{label}{hasArrow && <ChevronDown size={9} className="opacity-40" />}
        </button>
    );
}

function Chk({ checked, indeterminate, isDark }: { checked: boolean; indeterminate?: boolean; isDark: boolean }) {
    return (
        <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors",
            checked || indeterminate ? "bg-primary border-primary" : (isDark ? "border-[#333] bg-[#1a1a1a]" : "border-[#ddd] bg-white"))}>
            {checked && <Check size={10} className="text-white" />}
            {indeterminate && <div className="w-2 h-0.5 bg-white rounded-full" />}
        </div>
    );
}

function HookCard({ h, onOpen, onDelete, isDark, isSelected, onToggle }: {
    h: Hook; onOpen: () => void; onDelete: () => void; isDark: boolean;
    isSelected: boolean; onToggle: () => void;
}) {
    const [deleting, setDeleting] = useState(false);

    const menuItems = [
        { label: 'Open', icon: <ExternalLink size={12} />, onClick: onOpen },
        { label: h.status === 'Active' ? 'Deactivate' : 'Activate', 
          icon: <Activity size={12} />, 
          onClick: () => useHookStore.getState().updateHook(h.id, { status: h.status === 'Active' ? 'Inactive' : 'Active' }) 
        },
        { label: 'Duplicate', icon: <Copy size={12} />, onClick: async () => {
            const { duplicateHook } = useHookStore.getState();
            await duplicateHook(h.id);
            appToast.success('Duplicated', 'Hook has been duplicated successfully');
        }},
        { label: 'Delete', icon: <Trash2 size={12} />, danger: true, onClick: onDelete, separator: true }
    ];

    return (
        <ContextMenuRow
            items={menuItems}
            isDark={isDark}
            onRowClick={onOpen}
            component={motion.div}
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={cn(
                "relative rounded-xl border cursor-pointer transition-all duration-150 group flex flex-col overflow-hidden",
                isDark ? "bg-[#1a1a1a] border-[#2e2e2e] hover:border-[#444]"
                    : "bg-white border-[#f0f0f0] hover:shadow-md hover:border-[#e0e0e0]"
            )}>
            <div className="p-3 flex flex-col gap-2 flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", isDark ? "bg-white/5" : "bg-[#f5f5f5]")}>
                            <Zap size={13} style={{ color: h.color }} fill="currentColor" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className={cn("font-bold text-[13px] truncate", isDark ? "text-white" : "text-[#111]")}>
                                {h.name}
                            </div>
                            <div className={cn("text-[10px] mt-0.5 flex items-center gap-1.5", isDark ? "text-[#555] " : "text-[#aaa]")}>
                                <span>Created {fmtDate(h.created_at)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div onClick={(e) => e.stopPropagation()}>
                        <SettingsToggle
                            checked={h.status === 'Active'}
                            onChange={(checked) => useHookStore.getState().updateHook(h.id, { status: checked ? 'Active' : 'Inactive' })}
                        />
                    </div>
                </div>

                {/* Subtitle */}
                <div className={cn("text-[11px] opacity-70 truncate px-1", isDark ? "text-[#888]" : "text-[#666]")}>
                    {h.title}
                </div>

                <div className={cn("flex items-center gap-3 text-[11px]", isDark ? "text-[#666]" : "text-[#888]")}>
                    <span className="flex items-center gap-1">
                        <Activity size={10} />
                        {h.event_count ?? 0} triggers
                    </span>
                    {h.last_fired_at ? (
                        <span className="flex items-center gap-1 min-w-0">
                            <Clock size={10} className="shrink-0" />
                            <span className="truncate">{formatDistanceToNow(new Date(h.last_fired_at), { addSuffix: true })}</span>
                        </span>
                    ) : h.link ? (
                        <span className="flex items-center gap-1 min-w-0">
                            <Globe size={10} className="shrink-0" />
                            <span className="truncate max-w-[100px]">{h.link}</span>
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Footer */}
            <div className={cn("flex items-center justify-between px-3 py-2 border-t",
                isDark ? "border-[#252525]" : "border-[#f5f5f5]")} onClick={e => e.stopPropagation()}>
                <div onClick={onToggle}>
                    <Chk checked={isSelected} isDark={isDark} />
                </div>
                
                <div className="flex items-center gap-0.5">
                    <button onClick={async () => {
                        const { duplicateHook } = useHookStore.getState();
                        await duplicateHook(h.id);
                        appToast.success('Duplicated', 'Hook has been duplicated successfully');
                    }}
                        className={cn("p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all",
                            isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#ccc] hover:text-[#888] hover:bg-[#f0f0f0]")}>
                        <Copy size={12} />
                    </button>
                    {deleting ? (
                        <InlineDeleteButton onDelete={onDelete} isDark={isDark} />
                    ) : (
                        <button onClick={() => setDeleting(true)}
                            className={cn("p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-red-400",
                                isDark ? "hover:bg-red-500/10" : "hover:bg-red-50")}>
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            </div>
        </ContextMenuRow>
    );
}

export default function HooksPage() {
    const { theme, openRightPanel, closeRightPanel, rightPanel, setCreateModalOpen, pageViews, setPageView } = useUIStore();
    const { hooks, fetchHooks, addHook, updateHook, deleteHook, bulkDeleteHooks, isLoading } = useHookStore();
    const isDark = theme === 'dark';
    const isMobile = useIsMobile();

    const view = (pageViews['hooks'] as 'table' | 'cards') || 'cards';
    const setView = (v: 'table' | 'cards') => setPageView('hooks', v);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<HookStatus | 'All'>('All');
    const [orderBy, setOrderBy] = useState<'created_at' | 'name'>('created_at');
    const [orderOpen, setOrderOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const columns: DataTableColumn<Hook>[] = [
        {
            id: 'name',
            label: 'Name',
            defaultWidth: 260,
            flexible: true,
            noBorder: true,
            cell: (h) => (
                <div className="flex items-center px-4 py-1.5 min-w-0 self-center">
                    <div className="flex items-center gap-2 min-w-0">
                        <Zap size={12} style={{ color: h.color }} className="shrink-0" fill="currentColor" />
                        <div className={cn("font-bold truncate", isDark ? "text-white" : "text-black")}>
                            {h.name}
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'title',
            label: 'Description',
            defaultWidth: 200,
            cell: (h) => (
                <div className="flex items-center px-4 py-1.5 truncate self-center">
                    <span className={isDark ? "text-[#888]" : "text-[#666]"}>{h.title}</span>
                </div>
            )
        },
        {
            id: 'triggers',
            label: 'Triggers',
            defaultWidth: 120,
            cell: (h) => (
                <div className="flex items-center px-4 py-1.5 self-center">
                    <span className={isDark ? "text-[#888]" : "text-[#666]"}>{h.event_count ?? 0}</span>
                </div>
            )
        },
        {
            id: 'created',
            label: 'Created',
            defaultWidth: 140,
            cell: (h) => (
                <div className="flex items-center px-4 py-1.5 self-center">
                    <span className={isDark ? "text-[#555]" : "text-[#aaa]"}>{fmtDate(h.created_at)}</span>
                </div>
            )
        },
        {
            id: 'placement',
            label: 'Placement',
            defaultWidth: 150,
            cell: (h) => (
                <div className="flex items-center px-4 py-1.5 min-w-0 self-center overflow-hidden">
                    {h.link ? (
                        <span className={cn(isDark ? "text-[#555]" : "text-[#aaa] truncate")}>
                            {h.link}
                        </span>
                    ) : (
                        <span className={cn("opacity-20", isDark ? "text-white" : "text-black")}>—</span>
                    )}
                </div>
            )
        }
    ];

    useEffect(() => { fetchHooks(); }, [fetchHooks]);

    const filtered = useMemo(() => {
        let r = hooks.filter(h => {
            if (statusFilter !== 'All' && h.status !== statusFilter) return false;
            if (searchQuery && !h.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(h.title?.toLowerCase() || '').includes(searchQuery.toLowerCase())) return false;
            return true;
        });
        if (orderBy === 'name') r = [...r].sort((a, b) => a.name.localeCompare(b.name));
        else r = [...r].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return r;
    }, [hooks, statusFilter, searchQuery, orderBy]);

    const STATUSES: (HookStatus | 'All')[] = ['All', 'Active', 'Inactive'];
    const statusCounts = useMemo(() => {
        const m: Record<string, number> = { All: hooks.length };
        hooks.forEach(h => { m[h.status] = (m[h.status] || 0) + 1; });
        return m;
    }, [hooks]);

    const handleNew = () => setCreateModalOpen(true, 'Hook');

    const toggleAll = () => setSelectedIds(selectedIds.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(h => h.id)));
    const toggleRow = (id: string, e: React.MouseEvent) => { e.stopPropagation(); const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };
    const isAllSelected = filtered.length > 0 && selectedIds.size === filtered.length;

    const handleDelete = async (id: string) => {
        setDeletingId(id);
    };

    const handleBulkDelete = () => {
        setDeletingId('bulk');
    };

    return (
        <div className={cn("flex flex-col h-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-[#f7f7f7] text-[#111]")}>

            {/* Header */}
            <div className={cn("hidden md:flex items-center justify-between px-5 py-3 shrink-0",
                isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-white")}>
                <h1 className="text-[15px] font-semibold tracking-tight">Hooks</h1>
            </div>

            {/* Toolbar */}
            <div className={cn("flex items-center gap-2 px-4 py-2 shrink-0 border-b",
                isDark ? "border-[#252525] bg-[#141414]" : "border-[#ebebeb] bg-[#f7f7f7]")}>
                
                {/* Status tabs merged into toolbar */}
                <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none py-0.5">
                    {STATUSES.map(s => {
                        const active = statusFilter === s;
                        const count = statusCounts[s] || 0;
                        const cfg = s !== 'All' ? STATUS_CFG[s] : null;
                        return (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-all shrink-0",
                                    active
                                        ? isDark ? "bg-white/10 text-white" : "bg-white text-[#111] shadow-sm border border-[#e8e8e8]"
                                        : isDark ? "text-[#666] hover:text-[#aaa] hover:bg-white/5" : "text-[#999] hover:text-[#555] hover:bg-black/5"
                                 )}>
                                {s !== 'All' && cfg && (
                                    <span className="w-1.5 h-1.5 rounded-full"
                                        style={{ background: isDark ? STATUS_DARK[s as HookStatus].dot : cfg.dot }} />
                                )}
                                {s}
                                <span className={cn("text-[10px] font-bold tabular-nums",
                                    active ? (isDark ? "text-white/60" : "text-[#555]") : (isDark ? "text-[#555]" : "text-[#ccc]"))}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1" />

                <SearchInput 
                    value={searchQuery} 
                    onChange={setSearchQuery} 
                    placeholder="Search hooks..." 
                    isDark={isDark} 
                />
                <div className={cn('w-[1px] h-4', isDark ? 'bg-[#2e2e2e]' : 'bg-[#e0e0e0]')}/>

                <div className="flex items-center gap-1">
                    <div className="relative">
                        <TbBtn label={orderBy === 'name' ? 'Name' : 'Date'} icon={<ArrowUpDown size={11} />}
                            hasArrow isDark={isDark} onClick={() => setOrderOpen(v => !v)} />
                        <Dropdown open={orderOpen} onClose={() => setOrderOpen(false)} isDark={isDark}>
                            <div className="py-1">
                                {[['created_at', 'Date Created'], ['name', 'Name']].map(([val, label]) => (
                                    <button key={val} onClick={() => { setOrderBy(val as any); setOrderOpen(false); }}
                                        className={cn("w-full flex items-center justify-between px-3.5 py-2 text-[12px] text-left transition-colors",
                                            orderBy === val ? (isDark ? "bg-white/8" : "bg-[#f5f5f5]") : (isDark ? "hover:bg-white/5" : "hover:bg-[#fafafa]"),
                                            isDark ? "text-[#ccc]" : "text-[#333]"
                                        )}>
                                        {label}
                                        {orderBy === val && <Check size={11} className="text-primary" />}
                                    </button>
                                ))}
                            </div>
                        </Dropdown>
                    </div>

                    <ViewToggle 
                        view={view} 
                        onViewChange={setView} 
                        isDark={isDark} 
                        options={[
                            { id: 'cards', icon: <LayoutGrid size={12}/> },
                            { id: 'table', icon: <Table2 size={12}/> }
                        ]}
                    />


                </div>

                {/* Bulk action bar */}
                {!isMobile && selectedIds.size > 0 && (
                    <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-xl border ml-2', 
                        isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-[#f8f8f8] border-[#e8e8e8]')}>
                        <span className={cn('text-[11px] font-semibold mr-1', 
                            isDark ? 'text-[#aaa]' : 'text-[#666]')}>
                            {selectedIds.size} selected
                        </span>
                        
                        <div className={cn('w-[1px] h-3', isDark ? 'bg-[#333]' : 'bg-[#ddd]')}/>
                        
                        <Tooltip content="Duplicate" side="bottom">
                            <button onClick={async () => {
                                const ids = Array.from(selectedIds);
                                await useHookStore.getState().bulkDuplicateHooks(ids);
                                appToast.success('Duplicated', `${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''} duplicated successfully`);
                                setSelectedIds(new Set());
                            }}
                                className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors', isDark ? 'text-[#777] hover:text-white hover:bg-white/5' : 'text-[#888] hover:text-[#333] hover:bg-[#ececec]')}>
                                <Copy size={11}/>
                            </button>
                        </Tooltip>

                        <Tooltip content="Delete" side="bottom">
                            <button onClick={handleBulkDelete}
                                className="px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors text-red-500/70 hover:text-red-500 hover:bg-red-500/10">
                                <Trash2 size={11}/>
                            </button>
                        </Tooltip>

                        {selectedIds.size >= 2 && (
                            <Tooltip content={isAllSelected ? "Deselect All" : "Select All"} side="bottom">
                                <button onClick={toggleAll}
                                    className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors', 
                                        isDark ? 'text-[#777] hover:text-white hover:bg-white/5' : 'text-[#888] hover:text-[#333] hover:bg-[#ececec]')}>
                                    <SquareCheck size={11}/>
                                </button>
                            </Tooltip>
                        )}

                        <div className={cn('w-[1px] h-3', isDark ? 'bg-[#333]' : 'bg-[#ddd]')}/>
                        
                        <Tooltip content="Clear selection" side="bottom">
                            <button onClick={() => setSelectedIds(new Set())}
                                className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors', 
                                    isDark ? 'text-[#555] hover:text-white hover:bg-white/5' : 'text-[#bbb] hover:text-[#333] hover:bg-[#ececec]')}>
                                <X size={11}/>
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className={cn("flex-1 overflow-auto p-5", isDark ? "bg-[#141414]" : "bg-[#f7f7f7]")}>
                {isLoading && hooks.length === 0 ? (
                    <div className="flex items-center justify-center h-40">
                        <AppLoader size="md" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center",
                            isDark ? "bg-white/5" : "bg-[#f0f0f0]")}>
                            <Zap size={24} className={isDark ? "text-[#444]" : "text-[#ccc]"} />
                        </div>
                        <div className="text-center">
                            <div className={cn("font-semibold text-[14px] mb-1", isDark ? "text-[#444]" : "text-[#bbb]")}>
                                {searchQuery || statusFilter !== 'All' ? 'No results found' : 'No hooks yet'}
                            </div>
                            <div className={cn("text-[12px]", isDark ? "text-[#333]" : "text-[#ccc]")}>
                                {searchQuery || statusFilter !== 'All' ? 'Try adjusting your filters' : 'Create your first hook to track events'}
                            </div>
                        </div>
                        {!searchQuery && statusFilter === 'All' && (
                            <button onClick={handleNew}
                                className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold rounded-[8px] bg-primary hover:bg-primary-hover text-primary-foreground transition-colors">
                                <Plus size={13} strokeWidth={2.5} /> New Hook
                            </button>
                        )}
                    </div>
                ) : view === 'cards' ? (
                    <div className="p-3 grid gap-2 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(220px,320px))]">
                        <AnimatePresence mode="popLayout">
                            {filtered.map(h => (
                                <HookCard
                                    key={h.id} h={h}
                                    onOpen={() => openRightPanel({ type: 'hook', id: h.id })}
                                    onDelete={() => handleDelete(h.id)}
                                    isDark={isDark}
                                    isSelected={selectedIds.has(h.id)}
                                    onToggle={() => {
                                        const n = new Set(selectedIds);
                                        n.has(h.id) ? n.delete(h.id) : n.add(h.id);
                                        setSelectedIds(n);
                                    }}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <DataTable
                        data={filtered}
                        columns={columns}
                        storageKeyPrefix="hooks"
                        selectedIds={selectedIds}
                        onToggleAll={toggleAll}
                        onToggleRow={toggleRow}
                        onRowClick={(h) => openRightPanel({ type: 'hook', id: h.id })}
                        isDark={isDark}
                        isLoading={isLoading}
                        rightHeaderWidth={80}
                        rightCellSlot={(h) => (
                            <div className="flex items-center justify-end pr-4 h-full">
                                <SettingsToggle
                                    checked={h.status === 'Active'}
                                    onChange={(c) => {
                                        useHookStore.getState().updateHook(h.id, { status: c ? 'Active' : 'Inactive' })
                                    }}
                                />
                            </div>
                        )}
                        rowMenuItems={(h) => [
                            { label: 'Open', icon: <ExternalLink size={12} />, onClick: () => openRightPanel({ type: 'hook', id: h.id }) },
                            { label: h.status === 'Active' ? 'Deactivate' : 'Activate', 
                                icon: <Activity size={12} />, 
                                onClick: () => useHookStore.getState().updateHook(h.id, { status: h.status === 'Active' ? 'Inactive' : 'Active' }) 
                            },
                            { label: 'Duplicate', icon: <Copy size={12} />, onClick: async () => {
                                await useHookStore.getState().duplicateHook(h.id);
                                appToast.success('Duplicated', 'Hook duplicated successfully');
                            }},
                            { label: 'Delete', icon: <Trash2 size={12} />, danger: true, onClick: () => setDeletingId(h.id), separator: true }
                        ]}
                    />
                )}
            </div>

            <DeleteConfirmModal
                open={!!deletingId}
                isDark={isDark}
                title={deletingId === 'bulk' ? `Delete ${selectedIds.size} hooks` : "Delete hook"}
                description={deletingId === 'bulk' 
                    ? `Are you sure you want to permanently delete these ${selectedIds.size} hooks? This action cannot be undone.`
                    : "This action cannot be undone. This will permanently delete the hook and all associated event data."
                }
                onClose={() => setDeletingId(null)}
                onConfirm={async () => {
                    if (deletingId === 'bulk') {
                        const ids = Array.from(selectedIds);
                        await bulkDeleteHooks(ids);
                        setSelectedIds(new Set());
                        appToast.error('Deleted', `${ids.length} hook${ids.length !== 1 ? 's' : ''} removed`);
                    } else if (deletingId) {
                        await deleteHook(deletingId);
                        if (rightPanel?.type === 'hook' && rightPanel.id === deletingId) closeRightPanel();
                        appToast.error('Deleted', 'Hook permanently removed');
                    }
                    setDeletingId(null);
                }}
            />
            {/* CreateHookModal removed */}
        </div>
    );
}
