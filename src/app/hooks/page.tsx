"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useHookStore, Hook, HookStatus } from '@/store/useHookStore';
import { SettingsToggle } from '@/components/settings/SettingsField';
import { cn } from '@/lib/utils';
import {
    Search, Table2, LayoutGrid, Plus, ChevronDown,
    Zap, Activity, Link, ExternalLink, Trash2, Pencil,
    Check, ArrowUpDown, Globe, Copy, X, SquareCheck
} from 'lucide-react';
import { InlineDeleteButton } from '@/components/ui/InlineDeleteButton';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { SearchInput } from '@/components/ui/SearchInput';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useRouter } from 'next/navigation';
import { appToast } from '@/lib/toast';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Tooltip } from '@/components/ui/Tooltip';

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
        <div className={cn("w-[13px] h-[13px] rounded-[3px] border flex items-center justify-center transition-all shrink-0",
            checked ? "bg-primary border-primary"
                : indeterminate ? "bg-primary/40 border-primary/60"
                    : isDark ? "border-[#3a3a3a] bg-transparent" : "border-[#d0d0d0] bg-white")}>
            {(checked || indeterminate) && (
                <svg width="7" height="5" viewBox="0 0 8 6" fill="none">
                    {indeterminate && !checked
                        ? <line x1="1" y1="3" x2="7" y2="3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        : <polyline points="1,3 3,5 7,1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
                </svg>
            )}
        </div>
    );
}

function HookCard({ h, onOpen, onDelete, isDark, isSelected, onToggle }: {
    h: Hook; onOpen: () => void; onDelete: () => void; isDark: boolean;
    isSelected: boolean; onToggle: () => void;
}) {
    const [deleting, setDeleting] = useState(false);

    return (
        <div
            onClick={onOpen}
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
                            <div className={cn("text-[10px] mt-0.5 flex items-center gap-1.5", isDark ? "text-[#555]" : "text-[#aaa]")}>
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
                    {h.link && (
                        <span className="flex items-center gap-1 min-w-0">
                            <Globe size={10} className="shrink-0" />
                            <span className="truncate max-w-[100px]">{h.link}</span>
                        </span>
                    )}
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
                    <button onClick={() => useUIStore.getState().openRightPanel({ type: 'hook', id: h.id, editing: true })}
                        className={cn("p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all",
                            isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#ccc] hover:text-[#888] hover:bg-[#f0f0f0]")}>
                        <Pencil size={12} />
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
        </div>
    );
}

export default function HooksPage() {
    const { theme, openRightPanel, closeRightPanel, rightPanel, setCreateModalOpen } = useUIStore();
    const { hooks, fetchHooks, addHook, updateHook, deleteHook, bulkDeleteHooks, isLoading } = useHookStore();
    const isDark = theme === 'dark';
    const isMobile = useIsMobile();

    const [view, setView] = useState<'table' | 'cards'>('cards');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<HookStatus | 'All'>('All');
    const [orderBy, setOrderBy] = useState<'created_at' | 'name'>('created_at');
    const [orderOpen, setOrderOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => { fetchHooks(); }, [fetchHooks]);

    const filtered = useMemo(() => {
        let r = hooks.filter(h => {
            if (statusFilter !== 'All' && h.status !== statusFilter) return false;
            if (searchQuery && !h.name.toLowerCase().includes(searchQuery.toLowerCase()) && !h.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
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
            <div className="flex-1 overflow-auto pb-44">
                {isLoading && hooks.length === 0 ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full border-collapse text-[12.5px]">
                            <thead>
                                <tr className={cn("border-b text-[10.5px] uppercase tracking-wider",
                                    isDark ? "border-[#252525] text-[#444]" : "border-[#ebebeb] text-[#bbb]")}>
                                    <th className="px-4 py-2.5 w-[44px] text-center">
                                        <div className="cursor-pointer flex justify-center" onClick={(e) => { e.stopPropagation(); toggleAll(); }}>
                                            <Chk checked={isAllSelected} indeterminate={selectedIds.size > 0 && !isAllSelected} isDark={isDark} />
                                        </div>
                                    </th>
                                    <th className="text-left font-semibold px-4 py-2.5 w-[260px]">Name</th>
                                    <th className="text-left font-semibold px-4 py-2.5 w-[200px]">Notification Title</th>
                                    <th className="text-left font-semibold px-4 py-2.5 w-[120px]">Triggers</th>
                                    <th className="text-left font-semibold px-4 py-2.5 w-[140px]">Created</th>
                                    <th className="text-left font-semibold px-4 py-2.5">Placement</th>
                                    <th className="w-[80px]" />
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(h => {
                                    const isSelected = selectedIds.has(h.id);
                                    return (
                                        <tr key={h.id}
                                            onClick={() => openRightPanel({ type: 'hook', id: h.id })}
                                            className={cn("border-b cursor-pointer transition-colors group",
                                                isDark
                                                    ? "border-[#1e1e1e] hover:bg-white/[0.025]"
                                                    : "border-[#f0f0f0] hover:bg-[#fafafa]",
                                                isSelected && (isDark ? "bg-blue-900/10" : "bg-blue-50/40"))}>
                                            <td className="px-4 py-3 text-center" onClick={e => toggleRow(h.id, e)}>
                                                <div className="flex justify-center">
                                                    <Chk checked={isSelected} isDark={isDark} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Zap size={12} style={{ color: h.color }} className="shrink-0" fill="currentColor" />
                                                    <div className={cn("font-semibold truncate", isDark ? "text-[#e0e0e0]" : "text-[#111]")}>
                                                        {h.name}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn(isDark ? "text-[#666]" : "text-[#888]")}>
                                                    {h.title}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn(isDark ? "text-[#666]" : "text-[#888]")}>
                                                    {h.event_count ?? 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn(isDark ? "text-[#555]" : "text-[#aaa]")}>
                                                    {fmtDate(h.created_at)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {h.link ? (
                                                    <span className={cn(isDark ? "text-[#555]" : "text-[#aaa] truncate max-w-[120px] block")}>
                                                        {h.link}
                                                    </span>
                                                ) : (
                                                    <span className={cn("opacity-20", isDark ? "text-white" : "text-black")}>—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                                    <div className="mr-2">
                                                        <SettingsToggle
                                                            checked={h.status === 'Active'}
                                                            onChange={(checked) => updateHook(h.id, { status: checked ? 'Active' : 'Inactive' })}
                                                        />
                                                    </div>
                                                    <Tooltip content="Hook Settings" side="top">
                                                        <button onClick={(e) => { e.stopPropagation(); openRightPanel({ type: 'hook', id: h.id, editing: true }); }}
                                                            className={cn("p-1.5 rounded-lg transition-colors",
                                                                isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#ccc] hover:text-[#888] hover:bg-[#f0f0f0]")}>
                                                            <Pencil size={12} />
                                                        </button>
                                                    </Tooltip>
                                                    {deletingId === h.id ? (
                                                        <InlineDeleteButton onDelete={() => handleDelete(h.id)} isDark={isDark} />
                                                    ) : (
                                                        <button onClick={() => setDeletingId(h.id)}
                                                            className={cn("p-1.5 rounded-lg transition-colors text-red-400",
                                                                isDark ? "hover:bg-red-500/10" : "hover:bg-red-50")}>
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
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
