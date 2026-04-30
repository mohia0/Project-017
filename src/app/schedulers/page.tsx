"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/useUIStore';
import { useSchedulerStore, Scheduler, SchedulerStatus } from '@/store/useSchedulerStore';
import { cn } from '@/lib/utils';
import {
    Search, Table2, LayoutGrid, Plus, ChevronDown,
    Calendar, Clock, MapPin, Users, Check,
    MoreHorizontal, Trash2, Copy, Edit3, Link, ExternalLink,
    SlidersHorizontal, ArrowUpDown, User, X
} from 'lucide-react';
import { useClientStore } from '@/store/useClientStore';
import ClientEditor from '@/components/clients/ClientEditor';
import { AppLoader } from '@/components/ui/AppLoader';
import { InlineDeleteButton } from '@/components/ui/InlineDeleteButton';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { SearchInput } from '@/components/ui/SearchInput';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useRouter } from 'next/navigation';
import { appToast } from '@/lib/toast';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Tooltip } from '@/components/ui/Tooltip';
import { ContextMenuRow } from '@/components/ui/RowContextMenu';
import { Avatar } from '@/components/ui/Avatar';
import { DataTable, DataTableColumn } from '@/components/ui/DataTable';
import { ListViewSkeleton } from '@/components/ui/ListViewSkeleton';
import { FilterPanel, FilterButton, SavedFilterPills } from '@/components/ui/FilterPanel';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useMenuStore } from '@/store/useMenuStore';
import { FilterField, FilterRow, SavedFilter, applyFilters } from '@/lib/filterUtils';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { fmtDate } from '@/lib/dateUtils';
import { Dropdown, DItem } from '@/components/ui/Dropdown';
import { StatusCell } from '@/components/ui/StatusCell';
import { ToolbarButton as TbBtn } from '@/components/ui/ToolbarButton';
import { Checkbox as Chk } from '@/components/ui/Checkbox';


/* ─── Status config ─────────────────────────────────────────── */
const STATUS_CFG: Record<SchedulerStatus, { bg: string; text: string; border: string; dot: string }> = {
    Active:   { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', dot: '#22c55e' },
    Draft:    { bg: '#f8f8f8', text: '#888',    border: '#e5e5e5', dot: '#aaa' },
    Inactive: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', dot: '#f97316' },
};
const STATUS_DARK: Record<SchedulerStatus, { text: string; dot: string }> = {
    Active:   { text: '#4ade80', dot: '#4ade80' },
    Draft:    { text: '#666',    dot: '#555' },
    Inactive: { text: '#f97316', dot: '#f97316' },
};



/* ─── Card view ─────────────────────────────────────────────── */
function SchedulerCard({ s, onOpen, onDelete, onCopy, isDark, isSelected, onToggle }: {
    s: Scheduler; onOpen: () => void; onDelete: () => void; onCopy: () => void; isDark: boolean;
    isSelected: boolean; onToggle: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [menuOpen]);

    const meta = (s.meta as any) || {};
    const durations: number[] = meta.durations || [];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={onOpen}
            className={cn(
                "relative rounded-xl border cursor-pointer transition-all duration-150 group flex flex-col overflow-hidden",
                isDark ? "bg-[#1a1a1a] border-[#2e2e2e] hover:border-[#444]"
                    : "bg-white border-[#f0f0f0] hover:shadow-md hover:border-[#e0e0e0]"
            )}
        >

            <div className="p-4 flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                        <div
                            onClick={(e) => { e.stopPropagation(); onToggle(); }}
                            className="mt-0.5 cursor-pointer"
                        >
                            <Chk checked={isSelected} isDark={isDark} />
                        </div>
                        <div className="min-w-0">
                            <div className={cn("font-bold text-[14px] truncate leading-tight", isDark ? "text-white" : "text-[#111]")}>
                                {s.title}
                            </div>
                            <div className={cn("text-[11px] mt-0.5 flex items-center gap-1.5", isDark ? "text-[#555]" : "text-[#aaa]")}>
                                <span>Created {fmtDate(s.created_at)}</span>
                                {meta.expirationDate && (
                                    <>
                                        <span>•</span>
                                        <span>Expires {fmtDate(meta.expirationDate)}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <StatusCell
                        status={s.status}
                        options={['Active', 'Draft', 'Inactive']}
                        onStatusChange={(newStatus) => useSchedulerStore.getState().updateScheduler(s.id, { status: newStatus })}
                        isDark={isDark}
                    />
                </div>

                {/* Meta */}
                {meta.organizer && (
                    <div className={cn("flex items-center gap-1.5 text-[12px]", isDark ? "text-[#666]" : "text-[#888]")}>
                        <Users size={11} />
                        <span className="truncate">{meta.organizer}</span>
                    </div>
                )}
                {meta.location && (
                    <div className={cn("flex items-center gap-1.5 text-[12px]", isDark ? "text-[#666]" : "text-[#888]")}>
                        <MapPin size={11} />
                        <span className="truncate">{meta.location}</span>
                    </div>
                )}

                {/* Duration chips */}
                {durations.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {durations.map((d: number) => (
                            <span key={d} className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                isDark ? "bg-white/5 text-[#888]" : "bg-[#f5f5f5] text-[#666]")}>
                                <Clock size={9} />
                                {d >= 60 ? `${d / 60}hr` : `${d}min`}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className={cn("flex items-center justify-between px-4 py-2.5 border-t",
                isDark ? "border-[#252525]" : "border-[#f5f5f5]")}>
                <div className={cn("text-[11px]", isDark ? "text-[#555]" : "text-[#bbb]")}>
                    0 bookings
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => window.open(window.location.origin + '/p/scheduler/' + s.id, '_blank')}
                        className={cn("p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all",
                            isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#ccc] hover:text-[#888] hover:bg-[#f0f0f0]")}>
                        <ExternalLink size={12} />
                    </button>
                    <button onClick={onCopy}
                        className={cn("p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all",
                            isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#ccc] hover:text-[#888] hover:bg-[#f0f0f0]")}>
                        <Link size={12} />
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
        </motion.div>
    );
}

function OrganizerCell({ currentName, currentId, onUpdate, isDark, variant = 'table' }: {
    currentName: string; currentId?: string | null; onUpdate: (id: string, name: string) => void;
    isDark: boolean; variant?: 'table' | 'card'
}) {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isClientEditorOpen, setIsClientEditorOpen] = useState(false);
    const { clients, fetchClients, addClient } = useClientStore();

    useEffect(() => {
        if (open) {
            if (clients.length === 0) fetchClients();
            setSearch('');
        }
    }, [open, clients.length, fetchClients]);

    const filtered = useMemo(() => {
        if (!search) return clients;
        const q = search.toLowerCase();
        return clients.filter(c => (c.company_name || '').toLowerCase().includes(q) || (c.contact_person || '').toLowerCase().includes(q));
    }, [clients, search]);

    const activeClient = useMemo(() => clients.find(c => c.id === currentId), [clients, currentId]);

    const display = (
        <div className={cn("flex items-center gap-2",
            variant === 'card' ? cn("px-2 py-1.5 rounded-[8px]", isDark ? "bg-white/[0.03] border border-white/5" : "bg-[#f8f8f8] border border-[#f0f0f0]") : "truncate")}>
            <div className="shrink-0">
                <Avatar 
                    src={activeClient?.avatar_url} 
                    name={currentName} 
                    className={cn("rounded-full", variant === 'card' ? "w-5 h-5" : "w-6 h-6")} 
                    isDark={isDark} 
                />
            </div>
            <span className={cn("truncate font-medium", variant === 'card' ? "text-[12px]" : "text-[13px]")}>{currentName || '—'}</span>
            {currentName && (
                <div 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        onUpdate('', ''); 
                    }}
                    className={cn(
                        "ml-auto p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer",
                        isDark ? "hover:bg-white/10 text-white/40 hover:text-white" : "hover:bg-black/5 text-black/40 hover:text-black"
                    )}
                >
                    <X size={10} />
                </div>
            )}
        </div>
    );

    const handleCreateClient = async (data: any) => {
        const client = await addClient(data);
        if (client) {
            onUpdate(client.id, client.contact_person || client.company_name);
            setIsClientEditorOpen(false);
            setOpen(false);
            appToast.success('Contact created and selected');
        }
    };

    return (
        <div className={cn("relative", variant === 'table' && "w-full h-full flex")}>
            <button
                ref={triggerRef}
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className={cn(
                    "text-left transition-colors",
                    variant === 'table' ? "w-full h-full px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]" : ""
                )}
            >
                {display}
            </button>
            <Dropdown 
                open={open} 
                onClose={() => setOpen(false)} 
                isDark={isDark} 
                align="center"
                triggerRef={triggerRef}
            >
                <div className={cn("p-2 border-b", isDark ? "border-[#2e2e2e]" : "border-[#f0f0f0]")}>
                    <div className="relative">
                        <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-30" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search contact..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className={cn("w-full pl-6 pr-2 py-1.5 text-[11px] rounded-md outline-none",
                                isDark ? "bg-white/5 border border-white/10 text-white" : "bg-[#f5f5f5] border border-[#e0e0e0] text-black"
                            )}
                        />
                    </div>
                </div>
                <div className="py-1 max-h-[180px] min-w-[240px] overflow-y-auto">
                    {filtered.length === 0 && !search ? (
                        <div className="px-3 py-4 text-center opacity-40 text-[11px]">
                            No contacts found
                        </div>
                    ) : (
                        <>
                            {filtered.map(c => (
                                <button key={c.id} onClick={(e) => { e.stopPropagation(); onUpdate(c.id, c.contact_person || c.company_name); setOpen(false); }}
                                    className={cn("w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors group",
                                        c.id === currentId ? (isDark ? "bg-white/5" : "bg-[#f5f5f5]") : (isDark ? "hover:bg-white/5" : "hover:bg-[#fafafa]")
                                    )}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar 
                                            src={c.avatar_url} 
                                            name={c.contact_person || c.company_name} 
                                            className="w-7 h-7 rounded-full" 
                                            isDark={isDark} 
                                        />
                                        <div className="flex flex-col min-w-0 leading-tight">
                                            <span className={cn("text-[12px] font-bold truncate transition-colors", 
                                                c.id === currentId ? "text-primary" : (isDark ? "text-[#ddd]" : "text-[#111]"))}>
                                                {c.contact_person || '—'}
                                            </span>
                                            {c.company_name && (
                                                <span className={cn("text-[10px] truncate", isDark ? "text-[#555]" : "text-[#aaa]")}>
                                                    {c.company_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {c.id === currentId && <Check size={12} className="text-primary opacity-60" />}
                                </button>
                            ))}
                            <div className={cn("mt-1 border-t", isDark ? "border-white/5" : "border-black/5")} />
                            {(!search || !clients.some(c => (c.contact_person?.toLowerCase() === search.toLowerCase() || c.company_name?.toLowerCase() === search.toLowerCase()))) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsClientEditorOpen(true); }}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3.5 py-2.5 text-[12px] font-bold transition-colors text-left",
                                        isDark ? "text-primary hover:bg-white/5" : "text-primary hover:bg-black/[0.02]"
                                    )}
                                >
                                    <Plus size={14} strokeWidth={2.5} />
                                    {search ? `Create "${search}"` : 'Create new contact'}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </Dropdown>

            {isClientEditorOpen && (
                <ClientEditor
                    onClose={() => setIsClientEditorOpen(false)}
                    onSave={handleCreateClient}
                    initialData={{
                        contact_person: '',
                        company_name: search,
                        email: ''
                    }}
                />
            )}
        </div>
    );
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function SchedulersPage() {
    const router = useRouter();
    const { navItems } = useMenuStore();
    const { theme, setCreateModalOpen, pageViews, setPageView } = useUIStore();
    const { schedulers, fetchSchedulers, addScheduler, updateScheduler, deleteScheduler, isLoading } = useSchedulerStore();
    const isDark = theme === 'dark';
    const isMobile = useIsMobile();

    const view = (pageViews['schedulers'] as 'table' | 'cards') || 'table';
    const setView = (v: 'table' | 'cards') => setPageView('schedulers', v);
    const [searchQuery, setSearchQuery] = usePersistentState('schedulers_filter_search', '');
    const [statusFilter, setStatusFilter] = usePersistentState<SchedulerStatus | 'All'>('schedulers_filter_status', 'All');
    const [filterOpen, setFilterOpen] = useState(false);
    const [orderOpen, setOrderOpen] = useState(false);
    const [orderBy, setOrderBy] = usePersistentState<'created_at' | 'title'>('schedulers_filter_order', 'created_at');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    /* ── Advanced Filters ── */
    const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
    const [filterRows, setFilterRows] = usePersistentState<FilterRow[]>('schedulers_filter_rows', []);
    const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
    const { saved: savedFilters, save: saveFilter, remove: deleteSavedFilter } = useSavedFilters('schedulers');

    const SCHEDULER_FILTER_FIELDS = useMemo<FilterField[]>(() => [
        { key: 'status',     label: 'Status',       type: 'enum', options: ['Active', 'Draft', 'Inactive'] },
        { key: 'title',      label: 'Title',        type: 'text' },
        { key: 'created_at', label: 'Date created', type: 'date' },
    ], []);

    useEffect(() => { fetchSchedulers(); }, [fetchSchedulers]);

    /* ─── Column resizing & reordering ─── */

    const filtered = useMemo(() => {
        let r = schedulers.filter(s => {
            if (statusFilter !== 'All' && s.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const org = (s.meta as any)?.organizer?.toLowerCase() || '';
                if (!s.title.toLowerCase().includes(q) && !org.includes(q)) return false;
            }
            return true;
        });

        // Apply advanced filters
        r = applyFilters(r, filterRows, SCHEDULER_FILTER_FIELDS);

        if (orderBy === 'title') r = [...r].sort((a, b) => a.title.localeCompare(b.title));
        else r = [...r].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return r;
    }, [schedulers, statusFilter, searchQuery, filterRows, SCHEDULER_FILTER_FIELDS, orderBy]);

    const handleNew = () => setCreateModalOpen(true, 'Scheduler');

    const toggleAll = () => setSelectedIds(selectedIds.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(s => s.id)));
    const toggleRow = (id: string, e: React.MouseEvent) => { e.stopPropagation(); const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };
    const isAllSelected = filtered.length > 0 && selectedIds.size === filtered.length;

    const copyLink = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}/p/scheduler/${id}`;
        navigator.clipboard.writeText(url);
        appToast.success('Link Copied', 'URL copied to clipboard');
    };

    const handleDuplicate = async (id: string) => {
        const original = schedulers.find(s => s.id === id);
        if (!original) return;
        const promise = (async () => {
            const { id: _, created_at: __, workspace_id: ___, ...payload } = original;
            await addScheduler({
                ...payload,
                title: `${payload.title} (Copy)`,
                status: 'Draft'
            });
        })();
        appToast.promise(promise, {
            loading: 'Duplicating scheduler…',
            success: 'Scheduler duplicated',
            error: 'Duplication failed',
        });
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
    };

    const handleBulkDelete = () => {
        setDeletingId('bulk');
    };

    const handleBulkDuplicate = async () => {
        const ids = Array.from(selectedIds);
        const promise = (async () => {
            for (const id of ids) {
                const original = schedulers.find(s => s.id === id);
                if (original) {
                    const { id: _, created_at: __, workspace_id: ___, ...payload } = original;
                    await addScheduler({
                        ...payload,
                        title: `${payload.title} (Copy)`,
                        status: 'Draft'
                    });
                }
            }
        })();
        appToast.promise(promise, {
            loading: `Duplicating ${ids.length} scheduler${ids.length !== 1 ? 's' : ''}…`,
            success: `${ids.length} scheduler${ids.length !== 1 ? 's' : ''} duplicated`,
            error: 'Duplication failed',
        });
        await promise;
        setSelectedIds(new Set());
    };

    const border = isDark ? "border-[#252525]" : "border-[#ebebeb]";

    const STATUSES: (SchedulerStatus | 'All')[] = ['All', 'Active', 'Draft', 'Inactive'];
    const statusCounts = useMemo(() => {
        const m: Record<string, number> = { All: schedulers.length };
        schedulers.forEach(s => { m[s.status] = (m[s.status] || 0) + 1; });
        return m;
    }, [schedulers]);

    return (
        <div className={cn("flex flex-col h-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-[#f7f7f7] text-[#111]")}>

            {/* ── Page header ── */}
            <div className={cn("hidden md:flex items-center justify-between px-5 py-3 shrink-0",
                isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-white")}>
                <h1 className="text-[15px] font-semibold tracking-tight">{navItems.find(item => item.href === '/schedulers')?.label || 'Schedulers'}</h1>
            </div>

            {/* Toolbar */}
            {isMobile ? (
                /* ── Mobile toolbar: compact row with search + filter sheet ── */
                <div className={cn("flex items-center gap-2 px-3 py-2 shrink-0 border-b relative z-10",
                    isDark ? "border-[#252525] bg-[#141414]" : "border-[#f0f0f0] bg-white")}>
                    {/* Search */}
                    <div className={cn("relative flex-1")}>
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" size={12} />
                        <input
                            type="text"
                            placeholder="Search schedulers..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={cn(
                                "w-full pl-7 pr-3 py-1.5 text-[12px] rounded-[8px] border focus:outline-none transition-all",
                                isDark
                                    ? "bg-white/[0.05] border-white/10 text-white placeholder:text-white/25"
                                    : "bg-[#f5f5f5] border-transparent text-[#111] placeholder:text-[#aaa]"
                            )}
                        />
                    </div>
                    {/* Filter button */}
                    <div className="relative shrink-0">
                        <button
                            onClick={() => setFilterOpen(v => !v)}
                            className={cn(
                                "w-[34px] h-[34px] rounded-[8px] flex items-center justify-center border transition-all",
                                filterOpen || statusFilter !== 'All'
                                    ? "bg-primary/15 border-primary/40 text-primary"
                                    : isDark ? "bg-white/[0.05] border-white/10 text-[#888]" : "bg-[#f5f5f5] border-transparent text-[#888]"
                            )}
                        >
                            <SlidersHorizontal size={14} />
                        </button>
                        <Dropdown open={filterOpen} onClose={() => setFilterOpen(false)} isDark={isDark}>
                            <div className={cn("px-3.5 py-2.5 border-b text-[11px] font-semibold", isDark ? "border-[#2e2e2e] text-[#666]" : "border-[#f0f0f0] text-[#aaa]")}>FILTER</div>
                            <div 
                                onClick={() => { setFilterOpen(false); setAdvancedFilterOpen(true); }}
                                className={cn("flex items-center gap-2 px-3.5 py-2.5 border-b cursor-pointer transition-colors", isDark ? "border-[#2e2e2e] hover:bg-white/5 text-[#ccc]" : "border-[#f0f0f0] hover:bg-black/5 text-[#444]")}>
                                <Plus size={12} className="opacity-70" />
                                <span className={cn("text-[12px] font-medium")}>Create filter</span>
                            </div>
                            {filterRows.length > 0 && !activeFilterId && (
                                <div onClick={() => { setFilterRows([]); setFilterOpen(false); }} className={cn("flex items-center gap-2 px-3.5 py-2 border-b cursor-pointer transition-colors", isDark ? "border-[#2e2e2e] hover:bg-white/5 text-red-400" : "border-[#f0f0f0] hover:bg-black/5 text-red-500")}>
                                    <X size={11} className="opacity-70" />
                                    <span className="text-[12px] font-medium">Clear active filters</span>
                                </div>
                            )}
                            {savedFilters.length > 0 && (
                                <>
                                    <div className={cn("px-3.5 py-2.5 border-b text-[11px] font-semibold", isDark ? "border-[#2e2e2e] text-[#666]" : "border-[#f0f0f0] text-[#aaa]")}>SAVED FILTERS</div>
                                    <SavedFilterPills saved={savedFilters} activeId={activeFilterId} onLoad={(f) => { if (activeFilterId === f.id) { setFilterRows([]); setActiveFilterId(null); } else { setFilterRows(f.rows); setActiveFilterId(f.id); } setFilterOpen(false); }} onDelete={(id) => { deleteSavedFilter(id); if (activeFilterId === id) { setActiveFilterId(null); } }} onClear={() => { setFilterRows([]); setActiveFilterId(null); setFilterOpen(false); }} isDark={isDark} />
                                </>
                            )}
                            <div className={cn("px-3.5 py-2.5 border-b text-[11px] font-semibold", isDark ? "border-[#2e2e2e] text-[#666]" : "border-[#f0f0f0] text-[#aaa]")}>STATUS</div>
                            <div className="py-1">
                                {STATUSES.map(s => (
                                    <button key={s} onClick={() => { setStatusFilter(s); setFilterOpen(false); }}
                                        className={cn("w-full flex items-center justify-between px-3.5 py-2 text-[12px] text-left transition-colors",
                                            statusFilter === s ? (isDark ? "bg-white/8" : "bg-[#f5f5f5]") : (isDark ? "hover:bg-white/5" : "hover:bg-[#fafafa]"),
                                            isDark ? "text-[#ccc]" : "text-[#333]")}>
                                        {s}
                                        {statusFilter === s && <Check size={11} className="text-primary" />}
                                    </button>
                                ))}
                            </div>
                            <div className={cn("px-3.5 py-2.5 border-t border-b text-[11px] font-semibold", isDark ? "border-[#2e2e2e] text-[#666]" : "border-[#f0f0f0] text-[#aaa]")}>SORT BY</div>
                            <div className="py-1">
                                {[['created_at', 'Date Created'], ['title', 'Name']].map(([val, label]) => (
                                    <button key={val} onClick={() => { setOrderBy(val as any); setFilterOpen(false); }}
                                        className={cn("w-full flex items-center justify-between px-3.5 py-2 text-[12px] text-left transition-colors",
                                            orderBy === val ? (isDark ? "bg-white/8" : "bg-[#f5f5f5]") : (isDark ? "hover:bg-white/5" : "hover:bg-[#fafafa]"),
                                            isDark ? "text-[#ccc]" : "text-[#333]")}>
                                        {label}
                                        {orderBy === val && <Check size={11} className="text-primary" />}
                                    </button>
                                ))}
                            </div>
                        </Dropdown>
                    </div>
                </div>
            ) : (
                /* ── Desktop toolbar ── */
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
                                            style={{ background: isDark ? STATUS_DARK[s as SchedulerStatus].dot : cfg.dot }} />
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
                        placeholder="Search schedulers..." 
                        isDark={isDark} 
                    />
                    <div className={cn('w-[1px] h-4', isDark ? 'bg-[#2e2e2e]' : 'bg-[#e0e0e0]')}/>

                    <div className="flex items-center gap-1">
                        {/* Sort */}
                        <div className="relative">
                            <TbBtn label={orderBy === 'title' ? 'Name' : 'Date'} icon={<ArrowUpDown size={11} />}
                                hasArrow active={false} isDark={isDark} onClick={() => setOrderOpen(v => !v)} />
                            <Dropdown open={orderOpen} onClose={() => setOrderOpen(false)} isDark={isDark}>
                                <div className="py-1">
                                    {[['created_at', 'Date Created'], ['title', 'Name']].map(([val, label]) => (
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
                        <div className="relative">
                            <FilterButton 
                                activeCount={filterRows.length} 
                                onClick={() => setAdvancedFilterOpen(true)} 
                                isDark={isDark} 
                            />
                        </div>
                        {savedFilters.length > 0 && (
                            <div className="ml-2 flex items-center">
                                <SavedFilterPills
                                    saved={savedFilters}
                                    activeId={activeFilterId}
                                    onLoad={(f) => {
                                        if (activeFilterId === f.id) {
                                            setFilterRows([]);
                                            setActiveFilterId(null);
                                        } else {
                                            setFilterRows(f.rows);
                                            setActiveFilterId(f.id);
                                        }
                                    }}
                                    onDelete={(id) => {
                                        deleteSavedFilter(id);
                                        if (activeFilterId === id) setActiveFilterId(null);
                                    }}
                                    onClear={() => {
                                        setFilterRows([]);
                                        setActiveFilterId(null);
                                    }}
                                    isDark={isDark}
                                />
                            </div>
                        )}

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

                    {/* ── Bulk banner ── */}
                    {!isMobile && selectedIds.size > 0 && (
                        <div className={cn("flex items-center gap-4 px-3 py-1 rounded-lg text-[11px] font-medium border animate-in fade-in zoom-in-95 duration-200",
                            isDark ? "bg-[#1c1c1c] border-[#2e2e2e] text-[#aaa]" : "bg-white border-[#e8e8e8] text-[#666]")}>
                            <span className="opacity-50 tracking-tight">{selectedIds.size} selected</span>
                            <div className={cn("w-[1px] h-3", isDark ? "bg-[#333]" : "bg-[#ddd]")} />
                            <div className="flex items-center gap-4">
                                <Tooltip content="Duplicate selected" side="bottom">
                                    <button onClick={handleBulkDuplicate} className="hover:text-blue-500 flex items-center gap-1.5 transition-colors font-bold">
                                        <Copy size={11} className="opacity-70" />Duplicate
                                    </button>
                                </Tooltip>
                                <Tooltip content="Delete selected" side="bottom">
                                    <button onClick={handleBulkDelete} className="hover:text-red-500 flex items-center gap-1.5 transition-colors font-bold text-red-500/80">
                                        <Trash2 size={11} className="opacity-70" />Delete
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Content ── */}
            <div className={cn("flex-1 overflow-auto p-5", isDark ? "bg-[#141414]" : "bg-[#f7f7f7]")}>
                {isLoading && schedulers.length === 0 ? (
                    <ListViewSkeleton view={view === 'cards' ? 'cards' : 'table'} isMobile={isMobile} isDark={isDark} />
                ) : view === 'cards' ? (
                    filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center",
                                isDark ? "bg-white/5" : "bg-[#f0f0f0]")}>
                                <Calendar size={24} className={isDark ? "text-[#444]" : "text-[#ccc]"} />
                            </div>
                            <div className="text-center">
                                <div className={cn("font-semibold text-[14px] mb-1", isDark ? "text-[#444]" : "text-[#bbb]")}>
                                    {searchQuery || statusFilter !== 'All' ? 'No results found' : 'No schedulers yet'}
                                </div>
                                <div className={cn("text-[12px]", isDark ? "text-[#333]" : "text-[#ccc]")}>
                                    {searchQuery || statusFilter !== 'All' ? 'Try adjusting your filters' : 'Create your first scheduler to get started'}
                                </div>
                            </div>
                            {!searchQuery && statusFilter === 'All' && (
                                <button onClick={handleNew}
                                    className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold rounded-[8px] bg-primary hover:bg-primary-hover text-primary-foreground transition-colors">
                                    <Plus size={13} strokeWidth={2.5} /> New Scheduler
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-20">
                            <AnimatePresence mode="popLayout">
                                {filtered.map(s => (
                                    <SchedulerCard
                                        key={s.id}
                                        s={s}
                                        onOpen={() => router.push(`/schedulers/${s.id}`)}
                                        onDelete={() => handleDelete(s.id)}
                                        isDark={isDark}
                                        isSelected={selectedIds.has(s.id)}
                                        onToggle={() => {
                                            const n = new Set(selectedIds);
                                            n.has(s.id) ? n.delete(s.id) : n.add(s.id);
                                            setSelectedIds(n);
                                        }}
                                        onCopy={() => {
                                            const url = `${window.location.origin}/p/scheduler/${s.id}`;
                                            navigator.clipboard.writeText(url);
                                            appToast.success('Link Copied', 'URL copied to clipboard');
                                        }}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center",
                            isDark ? "bg-white/5" : "bg-[#f0f0f0]")}>
                            <Calendar size={24} className={isDark ? "text-[#444]" : "text-[#ccc]"} />
                        </div>
                        <div className="text-center">
                            <div className={cn("font-semibold text-[14px] mb-1", isDark ? "text-[#444]" : "text-[#bbb]")}>
                                {searchQuery || statusFilter !== 'All' ? 'No results found' : 'No schedulers yet'}
                            </div>
                            <div className={cn("text-[12px]", isDark ? "text-[#333]" : "text-[#ccc]")}>
                                {searchQuery || statusFilter !== 'All' ? 'Try adjusting your filters' : 'Create your first scheduler to get started'}
                            </div>
                        </div>
                        {!searchQuery && statusFilter === 'All' && (
                            <button onClick={handleNew}
                                className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold rounded-[8px] bg-primary hover:bg-primary-hover text-primary-foreground transition-colors">
                                <Plus size={13} strokeWidth={2.5} /> New Scheduler
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 relative">
                        <DataTable
                            data={filtered}
                            columns={[
                                {
                                    id: 'name',
                                    label: 'Name',
                                    defaultWidth: 240,
                                    flexible: true,
                                    cell: (s) => (
                                        <div className="flex flex-col justify-center px-4 py-1.5 min-w-0">
                                            <div className={cn("font-bold truncate", isDark ? "text-white" : "text-black")}>{s.title}</div>
                                        </div>
                                    )
                                },
                                {
                                    id: 'organizer',
                                    label: 'Organizer',
                                    defaultWidth: 180,
                                    cell: (s) => (
                                        <div className="flex items-stretch overflow-hidden h-full">
                                            <OrganizerCell 
                                                currentName={(s.meta as any)?.organizer} 
                                                currentId={(s.meta as any)?.organizer_id}
                                                onUpdate={(id, name) => updateScheduler(s.id, { meta: { ...(s.meta as any), organizer: name, organizer_id: id } as any })}
                                                isDark={isDark}
                                            />
                                        </div>
                                    )
                                },
                                {
                                    id: 'status',
                                    label: 'Status',
                                    defaultWidth: 140,
                                    cell: (s) => (
                                        <div className="flex items-center px-4 py-1.5 h-full">
                                            <StatusCell
                                                status={s.status}
                                                options={['Active', 'Draft', 'Inactive']}
                                                onStatusChange={(newStatus) => updateScheduler(s.id, { status: newStatus })}
                                                isDark={isDark}
                                            />
                                        </div>
                                    )
                                },
                                {
                                    id: 'durations',
                                    label: 'Durations',
                                    defaultWidth: 160,
                                    cell: (s) => {
                                        const durations = (s.meta as any)?.durations || [];
                                        return (
                                            <div className="flex items-center px-4 py-1.5 h-full">
                                                {durations.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {durations.map((d: number) => (
                                                            <span key={d} className={cn(
                                                                "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold",
                                                                isDark ? "bg-white/5 text-[#888]" : "bg-[#f5f5f5] text-[#666]"
                                                            )}>
                                                                <Clock size={8} />
                                                                {d >= 60 ? `${d / 60}hr` : `${d}min`}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : <span className={cn("text-[11px]", isDark ? "text-[#444]" : "text-[#ccc]")}>—</span>}
                                            </div>
                                        );
                                    }
                                },
                                {
                                    id: 'bookings',
                                    label: 'Bookings',
                                    defaultWidth: 100,
                                    cell: (s) => (
                                        <div className={cn("flex flex-col justify-center px-4 py-1.5 h-full", isDark ? "text-[#777]" : "text-[#888]")}>
                                            <span className="text-[12px]">{s.bookings_count || 0}</span>
                                        </div>
                                    )
                                },
                                {
                                    id: 'location',
                                    label: 'Location',
                                    defaultWidth: 160,
                                    cell: (s) => {
                                        const loc = (s.meta as any)?.location;
                                        return (
                                            <div className="flex flex-col justify-center px-4 py-1.5 min-w-0 h-full">
                                                {loc ? (
                                                    <div className={cn("flex items-center gap-1.5 text-[12px] truncate", isDark ? "text-[#777]" : "text-[#888]")}>
                                                        <MapPin size={10} className="shrink-0" />
                                                        <span className="truncate">{loc}</span>
                                                    </div>
                                                ) : <span className="text-[11px] opacity-20">—</span>}
                                            </div>
                                        );
                                    }
                                },
                                {
                                    id: 'created',
                                    label: 'Created',
                                    defaultWidth: 140,
                                    cell: (s) => (
                                        <div className={cn("flex flex-col justify-center px-4 py-1.5 h-full", isDark ? "text-[#777]" : "text-[#888]")}>
                                            <span className="text-[12px]">{fmtDate(s.created_at)}</span>
                                        </div>
                                    )
                                },
                                {
                                    id: 'expires',
                                    label: 'Expires',
                                    defaultWidth: 140,
                                    cell: (s) => {
                                        const exp = (s.meta as any)?.expirationDate;
                                        return (
                                            <div className={cn("flex flex-col justify-center px-4 py-1.5 h-full", isDark ? "text-[#777]" : "text-[#888]")}>
                                                <span className="text-[12px]">{exp ? fmtDate(exp) : '—'}</span>
                                            </div>
                                        );
                                    }
                                }
                            ]}
                            storageKeyPrefix="sched"
                            selectedIds={selectedIds}
                            onToggleAll={toggleAll}
                            onToggleRow={toggleRow}
                            onRowClick={(s) => router.push(`/schedulers/${s.id}`)}
                            isDark={isDark}
                            isLoading={isLoading}
                            emptyState={(
                                <div className="flex flex-col items-center justify-center py-24 gap-4">
                                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center",
                                        isDark ? "bg-white/5" : "bg-[#f0f0f0]")}>
                                        <Calendar size={24} className={isDark ? "text-[#444]" : "text-[#ccc]"} />
                                    </div>
                                    <div className="text-center">
                                        <div className={cn("font-semibold text-[14px] mb-1", isDark ? "text-[#444]" : "text-[#bbb]")}>
                                            {searchQuery || statusFilter !== 'All' ? 'No results found' : 'No schedulers yet'}
                                        </div>
                                        <div className={cn("text-[12px]", isDark ? "text-[#333]" : "text-[#ccc]")}>
                                            {searchQuery || statusFilter !== 'All' ? 'Try adjusting your filters' : 'Create your first scheduler to get started'}
                                        </div>
                                    </div>
                                    {!searchQuery && statusFilter === 'All' && (
                                        <button onClick={handleNew}
                                            className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold rounded-[8px] bg-primary hover:bg-primary-hover text-primary-foreground transition-colors">
                                            <Plus size={13} strokeWidth={2.5} /> New Scheduler
                                        </button>
                                    )}
                                </div>
                            )}
                            rowMenuItems={(s) => [
                                { label: 'Open', icon: <ExternalLink size={12} />, onClick: () => router.push(`/schedulers/${s.id}`) },
                                { label: 'Open Public Link', icon: <ExternalLink size={12} />, onClick: () => window.open(window.location.origin + '/p/scheduler/' + s.id, '_blank') },
                                { label: 'Copy Public Link', icon: <Link size={12} />, onClick: (e: any) => copyLink(s.id, e as any) },
                                { label: 'Duplicate', icon: <Copy size={12} />, onClick: () => handleDuplicate(s.id) },
                                { label: 'Delete', icon: <Trash2 size={12} />, danger: true, onClick: () => setDeletingId(s.id), separator: true },
                            ]}
                            afterRows={!isLoading && (
                                <button onClick={handleNew}
                                    className={cn("flex items-center gap-1.5 px-4 py-3 w-full text-left text-[12px] font-medium transition-colors",
                                        isDark ? "text-[#555] border-[#1f1f1f] hover:text-[#aaa] hover:bg-white/[0.02]" : "text-[#aaa] border-[#f0f0f0] hover:text-[#555] hover:bg-[#fafafa]")}>
                                    <div className={cn("w-4 h-4 shrink-0 flex items-center justify-center rounded border border-dashed", isDark ? "border-[#444]" : "border-[#ccc]")}>
                                        <Plus size={10} />
                                    </div>
                                    <span className="leading-none">New Scheduler</span>
                                </button>
                            )}
                        />
                    </div>
                )}
            </div>

            {/* CreateSchedulerModal removed */}

            <DeleteConfirmModal
                open={!!deletingId}
                isDark={isDark}
                title={deletingId === 'bulk' ? `Delete ${selectedIds.size} items` : "Delete item"}
                description={deletingId === 'bulk' 
                    ? `Are you sure you want to permanently delete these ${selectedIds.size} items? This action cannot be undone.`
                    : "This action cannot be undone. This will permanently delete the item and all associated data."
                }
                onClose={() => setDeletingId(null)}
                onConfirm={async () => {
                    if (deletingId === 'bulk') {
                        const ids = Array.from(selectedIds);
                        await useSchedulerStore.getState().bulkDeleteSchedulers(ids);
                        setSelectedIds(new Set());
                        appToast.error('Deleted', `${ids.length} scheduler${ids.length !== 1 ? 's' : ''} removed`);
                    } else if (deletingId) {
                        await deleteScheduler(deletingId);
                        appToast.error('Deleted', 'Scheduler permanently removed');
                    }
                    setDeletingId(null);
                }}
            />
            {advancedFilterOpen && (
                <FilterPanel
                    fields={SCHEDULER_FILTER_FIELDS}
                    rows={filterRows}
                    savedFilters={savedFilters}
                    onChange={setFilterRows}
                    onApply={(rows) => { setFilterRows(rows); setActiveFilterId(null); }}
                    onSave={(name, rows) => { const f = saveFilter(name, rows); setFilterRows(rows); if (f) setActiveFilterId(f.id); }}
                    onLoadSaved={(f) => { setFilterRows(f.rows); setActiveFilterId(f.id); setAdvancedFilterOpen(false); }}
                    onDeleteSaved={(id) => { deleteSavedFilter(id); if (activeFilterId === id) setActiveFilterId(null); }}
                    isDark={isDark}
                    onClose={() => setAdvancedFilterOpen(false)}
                />
            )}
        </div>
    );
}
