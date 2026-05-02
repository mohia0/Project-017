"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/useUIStore';
import { useFormStore, Form, FormStatus } from '@/store/useFormStore';
import { cn } from '@/lib/utils';
import { fmtDate } from '@/lib/dateUtils';
import {
    Search, Table2, LayoutGrid, Plus, ChevronDown,
    ClipboardList, Check, Trash2,
    ArrowUpDown, MessageSquare, Copy, Link, ExternalLink,
    SlidersHorizontal
} from 'lucide-react';
import { AppLoader } from '@/components/ui/AppLoader';
import { InlineDeleteButton } from '@/components/ui/InlineDeleteButton';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { SearchInput } from '@/components/ui/SearchInput';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { ContextMenuRow } from '@/components/ui/RowContextMenu';
import { useRouter } from 'next/navigation';
import { appToast } from '@/lib/toast';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Tooltip } from '@/components/ui/Tooltip';
import { usePersistentState } from '@/hooks/usePersistentState';
import { ListViewSkeleton } from '@/components/ui/ListViewSkeleton';
import { useMenuStore } from '@/store/useMenuStore';
import { Dropdown, DItem } from '@/components/ui/Dropdown';
import { StatusCell } from '@/components/ui/StatusCell';
import { ToolbarButton as TbBtn } from '@/components/ui/ToolbarButton';
import { Checkbox as Chk } from '@/components/ui/Checkbox';

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

/* ─── Status config ─────────────────────────────────────────── */
const STATUS_CFG: Record<FormStatus, { bg: string; text: string; border: string; dot: string }> = {
    Active:   { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', dot: '#22c55e' },
    Draft:    { bg: '#f8f8f8', text: '#888',    border: '#e5e5e5', dot: '#aaa' },
    Inactive: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', dot: '#f97316' },
};
const STATUS_DARK: Record<FormStatus, { text: string; dot: string }> = {
    Active:   { text: '#4ade80', dot: '#4ade80' },
    Draft:    { text: '#666',    dot: '#555' },
    Inactive: { text: '#f97316', dot: '#f97316' },
};




function SortableHeader({ id, children, onLeftResizeStart, onRightResizeStart, isDark, width, flexible }: { 
    id: string; 
    children: React.ReactNode; 
    onLeftResizeStart?: (e: React.MouseEvent) => void;
    onRightResizeStart?: (e: React.MouseEvent) => void;
    isDark: boolean;
    width: number;
    flexible?: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        width: flexible ? '100%' : `${width}px`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 20 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={cn(
                "relative px-4 py-2 flex items-center select-none group/header border-x border-transparent",
                isDragging ? "bg-blue-500/10" : "",
                isDark ? "hover:border-[#2e2e2e]" : "hover:border-[#e0e0e0]"
            )}
        >
            {onLeftResizeStart && (
                <div 
                    onMouseDown={onLeftResizeStart} 
                    className={cn(
                        "absolute -left-[12px] top-0 bottom-0 w-[24px] flex items-center justify-center cursor-col-resize z-20 group/resizer transition-colors",
                        "hover:bg-primary/5 active:bg-primary/10"
                    )}
                >
                    <div className="w-[2px] h-5 rounded-full opacity-0 group-hover/resizer:opacity-100 transition-opacity bg-primary" />
                </div>
            )}
            <div {...attributes} {...listeners} className="flex-1 cursor-grab active:cursor-grabbing truncate">
                {children}
            </div>
            {onRightResizeStart && (
                <div 
                    onMouseDown={onRightResizeStart} 
                    className={cn(
                        "absolute -right-[12px] top-0 bottom-0 w-[24px] flex items-center justify-center cursor-col-resize z-20 group/resizer transition-colors",
                        "hover:bg-primary/5 active:bg-primary/10"
                    )}
                >
                    <div className="w-[2px] h-5 rounded-full opacity-0 group-hover/resizer:opacity-100 transition-opacity bg-primary" />
                </div>
            )}
        </div>
    );
}

/* ─── Form Card ─────────────────────────────────────────────── */
function FormCard({ f, onOpen, onDelete, onCopy, isDark, isSelected, onToggle }: {
    f: Form; onOpen: () => void; onDelete: () => void; onCopy: (e: React.MouseEvent) => void; isDark: boolean;
    isSelected: boolean; onToggle: () => void;
}) {
    const [deleting, setDeleting] = useState(false);
    const fields = Array.isArray(f.fields) ? f.fields : [];

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
            )}>

            <div className="p-4 flex flex-col gap-3 flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-1.5 min-w-0 -ml-2">
                        <div
                            onClick={(e) => { e.stopPropagation(); onToggle(); }}
                            className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer",
                                isDark ? "hover:bg-white/10 active:scale-90" : "hover:bg-black/5 active:scale-90")}>
                            <Chk checked={isSelected} isDark={isDark} />
                        </div>
                        <div className="min-w-0 pt-1.5">
                            <div className={cn("font-bold text-[14px] truncate", isDark ? "text-white" : "text-[#111]")}>
                                {f.title}
                            </div>
                            <div className={cn("text-[11px] mt-0.5 flex items-center gap-1.5", isDark ? "text-[#555]" : "text-[#aaa]")}>
                                <span>Created {fmtDate(f.created_at)}</span>
                                {f.meta?.expirationDate && (
                                    <>
                                        <span>•</span>
                                        <span>Expires {fmtDate(f.meta.expirationDate)}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <StatusCell
                        status={f.status}
                        options={['Active', 'Draft', 'Inactive']}
                        onStatusChange={async (s) => {
                            await useFormStore.getState().updateForm(f.id, { status: s });
                            appToast.success('Updated', `Form status set to ${s.toLowerCase()}`);
                        }}
                        isDark={isDark}
                    />
                </div>

                {/* Field count */}
                <div className={cn("flex items-center gap-3 text-[12px]", isDark ? "text-[#666]" : "text-[#888]")}>
                    <span className="flex items-center gap-1">
                        <ClipboardList size={11} />
                        {fields.length} field{fields.length !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                        <MessageSquare size={11} />
                        {f.responses_count || 0} response{f.responses_count !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Footer */}
            <div className={cn("flex items-center justify-end px-4 py-2.5 border-t gap-1",
                isDark ? "border-[#252525]" : "border-[#f5f5f5]")} onClick={e => e.stopPropagation()}>
                <button onClick={() => window.open(window.location.origin + '/p/form/' + f.id, '_blank')}
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
        </motion.div>
    );
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function FormsPage() {
    const router = useRouter();
    const { navItems } = useMenuStore();
    const { theme, setCreateModalOpen, pageViews, setPageView } = useUIStore();
    const { forms, fetchForms, addForm, updateForm, deleteForm, isLoading } = useFormStore();
    const isDark = theme === 'dark';
    const isMobile = useIsMobile();

    const view = (pageViews['forms'] as 'table' | 'cards') || 'table';
    const setView = (v: 'table' | 'cards') => setPageView('forms', v);
    const [searchQuery, setSearchQuery] = usePersistentState('forms_filter_search', '');
    const [statusFilter, setStatusFilter] = usePersistentState<FormStatus | 'All'>('forms_filter_status', 'All');
    const [orderBy, setOrderBy] = usePersistentState<'created_at' | 'title'>('forms_filter_order', 'created_at');
    const [orderOpen, setOrderOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => { fetchForms(); }, [fetchForms]);

    /* ─── Column resizing & reordering ─── */
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        select: 44,
        name: 300,
        status: 160,
        fields: 100,
        responses: 120,
        created: 140,
        expires: 140,
        actions: 20
    });
    const [columnOrder, setColumnOrder] = useState<string[]>(['name', 'status', 'fields', 'responses', 'created', 'expires']);

    useEffect(() => {
        const savedWidths = localStorage.getItem('forms_col_widths');
        if (savedWidths) setColWidths(prev => ({ ...prev, ...JSON.parse(savedWidths) }));
        const savedOrder = localStorage.getItem('forms_col_order');
        if (savedOrder) setColumnOrder(JSON.parse(savedOrder));
    }, []);

    useEffect(() => { localStorage.setItem('forms_col_widths', JSON.stringify(colWidths)); }, [colWidths]);
    useEffect(() => { localStorage.setItem('forms_col_order', JSON.stringify(columnOrder)); }, [columnOrder]);

    const handleResizeStart = (leftKey: string, rightKey: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startWidthLeft = colWidths[leftKey];
        const startWidthRight = colWidths[rightKey];

        const onMouseMove = (moveEvent: MouseEvent) => {
            const delta = moveEvent.clientX - startX;
            let newWidthLeft = Math.max(30, startWidthLeft + delta);
            let finalDelta = newWidthLeft - startWidthLeft;
            let newWidthRight = Math.max(30, startWidthRight - finalDelta);
            finalDelta = startWidthRight - newWidthRight;
            newWidthLeft = startWidthLeft + finalDelta;

            setColWidths(prev => ({ 
                ...prev, 
                [leftKey]: newWidthLeft,
                [rightKey]: newWidthRight 
            }));
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setColumnOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const gridTemplate = `${colWidths.select}px ${columnOrder.map(c => 
        c === 'name' ? `minmax(${colWidths[c]}px, 1fr)` : `${colWidths[c]}px`
    ).join(' ')} 20px`;

    const filtered = useMemo(() => {
        let r = forms.filter(f => {
            if (statusFilter !== 'All' && f.status !== statusFilter) return false;
            if (searchQuery && !f.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
        if (orderBy === 'title') r = [...r].sort((a, b) => a.title.localeCompare(b.title));
        else r = [...r].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return r;
    }, [forms, statusFilter, searchQuery, orderBy]);

    const handleNew = () => setCreateModalOpen(true, 'Form');

    const toggleAll = () => setSelectedIds(selectedIds.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(f => f.id)));
    const toggleRow = (id: string, e: React.MouseEvent) => { e.stopPropagation(); const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };
    const isAllSelected = filtered.length > 0 && selectedIds.size === filtered.length;

    const copyLink = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}/p/form/${id}`;
        navigator.clipboard.writeText(url);
        appToast.success('Link Copied', 'URL copied to clipboard');
    };

    const handleDuplicate = async (id: string) => {
        const original = forms.find(f => f.id === id);
        if (!original) return;
        const promise = (async () => {
            const { id: _, created_at: __, workspace_id: ___, ...payload } = original;
            await addForm({
                ...payload,
                title: `${payload.title} (Copy)`,
                status: 'Draft'
            });
        })();
        appToast.promise(promise, {
            loading: 'Duplicating form…',
            success: 'Form duplicated',
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
                const original = forms.find(f => f.id === id);
                if (original) {
                    const { id: _, created_at: __, workspace_id: ___, ...payload } = original;
                    await addForm({
                        ...payload,
                        title: `${payload.title} (Copy)`,
                        status: 'Draft'
                    });
                }
            }
        })();
        appToast.promise(promise, {
            loading: `Duplicating ${ids.length} form${ids.length !== 1 ? 's' : ''}…`,
            success: `${ids.length} form${ids.length !== 1 ? 's' : ''} duplicated`,
            error: 'Duplication failed',
        });
        await promise;
        setSelectedIds(new Set());
    };

    const STATUSES: (FormStatus | 'All')[] = ['All', 'Active', 'Draft', 'Inactive'];
    const statusCounts = useMemo(() => {
        const m: Record<string, number> = { All: forms.length };
        forms.forEach(f => { m[f.status] = (m[f.status] || 0) + 1; });
        return m;
    }, [forms]);

    return (
        <div className={cn("flex flex-col h-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-[#f7f7f7] text-[#111]")}>

            {/* Header */}
            <div className={cn("hidden md:flex items-center justify-between px-5 py-3 shrink-0",
                isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-white")}>
                <h1 className="text-[15px] font-semibold tracking-tight">{navItems.find(item => item.href === '/forms')?.label || 'Forms'}</h1>
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
                            placeholder="Search forms..."
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
                                            style={{ background: isDark ? STATUS_DARK[s as FormStatus].dot : cfg.dot }} />
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
                        placeholder="Search forms..." 
                        isDark={isDark} 
                    />
                    <div className={cn('w-[1px] h-4', isDark ? 'bg-[#2e2e2e]' : 'bg-[#e0e0e0]')}/>

                    <div className="flex items-center gap-1">
                        <div className="relative">
                            <TbBtn label={orderBy === 'title' ? 'Name' : 'Date'} icon={<ArrowUpDown size={11} />}
                                hasArrow isDark={isDark} onClick={() => setOrderOpen(v => !v)} />
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



            {/* Content */}
            <div className={cn("flex-1 overflow-auto p-5", isDark ? "bg-[#141414]" : "bg-[#f7f7f7]")}>
                {isLoading && forms.length === 0 && (view === 'cards' || isMobile) ? (
                    <ListViewSkeleton view="cards" isMobile={isMobile} isDark={isDark} />
                ) : filtered.length === 0 && !isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center",
                            isDark ? "bg-white/5" : "bg-[#f0f0f0]")}>
                            <ClipboardList size={24} className={isDark ? "text-[#444]" : "text-[#ccc]"} />
                        </div>
                        <div className="text-center">
                            <div className={cn("font-semibold text-[14px] mb-1", isDark ? "text-[#444]" : "text-[#bbb]")}>
                                {searchQuery || statusFilter !== 'All' ? 'No results found' : 'No forms yet'}
                            </div>
                            <div className={cn("text-[12px]", isDark ? "text-[#333]" : "text-[#ccc]")}>
                                {searchQuery || statusFilter !== 'All' ? 'Try adjusting your filters' : 'Create your first form to collect responses'}
                            </div>
                        </div>
                        {!searchQuery && statusFilter === 'All' && (
                            <button onClick={handleNew}
                                className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold rounded-[8px] bg-primary hover:bg-primary-hover text-primary-foreground transition-colors">
                                <Plus size={13} strokeWidth={2.5} /> New Form
                            </button>
                        )}
                    </div>
                ) : view === 'cards' ? (
                    <div className="p-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        <AnimatePresence mode="popLayout">
                            {filtered.map(f => (
                                <FormCard
                                    key={f.id} f={f}
                                    onOpen={() => router.push(`/forms/${f.id}`)}
                                    onDelete={() => handleDelete(f.id)}
                                    isDark={isDark}
                                    isSelected={selectedIds.has(f.id)}
                                    onToggle={() => {
                                        const n = new Set(selectedIds);
                                        n.has(f.id) ? n.delete(f.id) : n.add(f.id);
                                        setSelectedIds(n);
                                    }}
                                    onCopy={(e: any) => copyLink(f.id, e)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="overflow-x-auto no-scrollbar">
                        <div className={cn("rounded-xl border min-w-full w-max overflow-hidden", isDark ? "border-[#222]" : "border-[#ebebeb]")}>
                            {/* Header */}
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <div className={cn("grid border-b text-[10px] font-semibold uppercase tracking-wider sticky top-0 z-30",
                                    isDark ? "bg-[#1a1a1a] border-[#252525] text-[#555]" : "bg-[#fafafa] border-[#ebebeb] text-[#aaa]")}
                                    style={{ gridTemplateColumns: gridTemplate }}>
                                    
                                    <div className="relative px-0 py-2 flex items-center justify-center" style={{ borderColor: isDark ? '#2e2e2e' : '#e0e0e0' }}>
                                        <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleAll(); }}>
                                            <Chk checked={isAllSelected} indeterminate={selectedIds.size > 0 && !isAllSelected} isDark={isDark} />
                                        </div>
                                    </div>

                                    <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                                        {columnOrder.map((colId, index) => {
                                            let label = '';
                                            if (colId === 'name') label = 'Name';
                                            if (colId === 'status') label = 'Status';
                                            if (colId === 'fields') label = 'Fields';
                                            if (colId === 'responses') label = 'Responses';
                                            if (colId === 'created') label = 'Created';
                                            if (colId === 'expires') label = 'Expires';

                                            const prevColId = index > 0 ? columnOrder[index - 1] : null;
                                            const nextColId = index < columnOrder.length - 1 ? columnOrder[index + 1] : null;

                                            return (
                                                <SortableHeader 
                                                    key={colId} 
                                                    id={colId} 
                                                    isDark={isDark} 
                                                    width={colWidths[colId] || 150}
                                                    flexible={colId === 'name'}
                                                    onLeftResizeStart={prevColId ? (e: React.MouseEvent) => handleResizeStart(prevColId, colId, e) : undefined}
                                                    onRightResizeStart={
                                                        nextColId 
                                                            ? (e: React.MouseEvent) => handleResizeStart(colId, nextColId, e) 
                                                            : (e: React.MouseEvent) => handleResizeStart(colId, 'actions', e)
                                                    }
                                                >
                                                    {label}
                                                </SortableHeader>
                                            );
                                        })}
                                    </SortableContext>
                                    <div 
                                        className={cn("relative px-4 py-2 flex items-center justify-end group/header border-l border-transparent", 
                                            isDark ? "hover:border-[#2e2e2e]" : "hover:border-[#e0e0e0]")}
                                        style={{ width: colWidths.actions }}
                                    >
                                        {columnOrder.length > 0 && (
                                            <div 
                                                onMouseDown={(e) => handleResizeStart(columnOrder[columnOrder.length - 1], 'actions', e)} 
                                                className={cn(
                                                    "absolute -left-[12px] top-0 bottom-0 w-[24px] flex items-center justify-center cursor-col-resize z-20 group/resizer transition-colors",
                                                    "hover:bg-primary/5 active:bg-primary/10"
                                                )}
                                            >
                                                <div className="w-[2px] h-5 rounded-full opacity-0 group-hover/resizer:opacity-100 transition-opacity bg-primary" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DndContext>

                            {/* Rows */}
                            <div className="flex flex-col">
                                <AnimatePresence mode="popLayout">
                                    {filtered.map(f => {
                                        const fields = Array.isArray(f.fields) ? f.fields : [];
                                        const isSelected = selectedIds.has(f.id);

                                        const menuItems = [
                                            { label: 'Open', icon: <ExternalLink size={12} />, onClick: () => router.push(`/forms/${f.id}`) },
                                            { label: 'Open Public Link', icon: <ExternalLink size={12} />, onClick: () => window.open(window.location.origin + '/p/form/' + f.id, '_blank') },
                                            { label: 'Copy Public Link', icon: <Link size={12} />, onClick: (e: any) => copyLink(f.id, e as any) },
                                            { label: 'Duplicate', icon: <Copy size={12} />, onClick: () => handleDuplicate(f.id) },
                                            { label: 'Delete', icon: <Trash2 size={12} />, danger: true, onClick: () => setDeletingId(f.id), separator: true },
                                        ];

                                        return (
                                            <ContextMenuRow
                                                key={f.id}
                                                items={menuItems}
                                                isDark={isDark}
                                                onRowClick={() => router.push(`/forms/${f.id}`)}
                                                component={motion.div}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.15 }}
                                                className={cn("grid px-0 border-b text-[12px] cursor-pointer group transition-colors",
                                                    isDark ? "border-[#1f1f1f] hover:bg-white/[0.025]" : "bg-white border-[#f0f0f0] hover:bg-[#fafafa]",
                                                    isSelected && (isDark ? "bg-blue-900/10" : "bg-blue-50/40"))}
                                                style={{ gridTemplateColumns: gridTemplate }}
                                            >
                                                <div className="flex items-center justify-center px-0 py-1.5 self-stretch" onClick={e => toggleRow(f.id, e)}>
                                                    <Chk checked={isSelected} isDark={isDark} />
                                                </div>

                                                {columnOrder.map(colId => {
                                                    if (colId === 'name') return (
                                                        <div key={colId} className="flex items-center px-4 py-1.5 font-bold truncate self-center">
                                                            <span className={isDark ? "text-white" : "text-black"}>{f.title || 'Untitled Form'}</span>
                                                        </div>
                                                    );
                                                    if (colId === 'status') return (
                                                        <div key={colId} className="flex items-center px-4 py-1.5 self-center">
                                                            <StatusCell
                                                                status={f.status}
                                                                options={['Active', 'Draft', 'Inactive']}
                                                                onStatusChange={(s) => updateForm(f.id, { status: s })}
                                                                isDark={isDark}
                                                            />
                                                        </div>
                                                    );
                                                    if (colId === 'fields') return (
                                                        <div key={colId} className={cn("flex flex-col justify-center px-4 py-1.5 self-center", isDark ? "text-[#777]" : "text-[#888]")}>
                                                            <span className="text-[12px]">{fields.length}</span>
                                                        </div>
                                                    );
                                                    if (colId === 'responses') return (
                                                        <div key={colId} className={cn("flex flex-col justify-center px-4 py-1.5 self-center", isDark ? "text-[#777]" : "text-[#888]")}>
                                                            <span className="text-[12px]">{f.responses_count || 0}</span>
                                                        </div>
                                                    );
                                                    if (colId === 'created') return (
                                                        <div key={colId} className={cn("flex flex-col justify-center px-4 py-1.5 self-center", isDark ? "text-[#777]" : "text-[#888]")}>
                                                            <span className="text-[12px]">{fmtDate(f.created_at)}</span>
                                                        </div>
                                                    );
                                                    if (colId === 'expires') return (
                                                        <div key={colId} className={cn("flex flex-col justify-center px-4 py-1.5 self-center", isDark ? "text-[#777]" : "text-[#888]")}>
                                                            <span className="text-[12px]">{f.meta?.expirationDate ? fmtDate(f.meta.expirationDate) : '—'}</span>
                                                        </div>
                                                    );
                                                    return null;
                                                })}
                                                <div />
                                            </ContextMenuRow>
                                        );
                                    })}

                                    {isLoading && (
                                        <motion.div
                                            key="shimmer-container"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className="flex flex-col"
                                        >
                                            {Array.from({ length: 8 }).map((_, i) => (
                                                <div key={`shimmer-${i}`} className={cn("grid border-b", isDark ? "border-[#1f1f1f] bg-white/[0.01]" : "border-[#f0f0f0] bg-[#fafafa]")} style={{ gridTemplateColumns: gridTemplate }}>
                                                    <div className="flex items-center justify-center p-3">
                                                        <div className={cn("w-3 h-3 rounded-[3px]", isDark ? "bg-[#333]" : "bg-[#ebebeb]", "animate-pulse")} />
                                                    </div>
                                                    {columnOrder.map(colId => (
                                                        <div key={colId} className="p-3 flex items-center">
                                                            <div className={cn("h-4 rounded-md w-3/4 max-w-[150px] animate-pulse bg-primary/20")} />
                                                        </div>
                                                    ))}
                                                    <div />
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}

                                    {!isLoading && (
                                        <motion.button 
                                            key="new-form-btn"
                                            layout 
                                            onClick={handleNew}
                                            className={cn("flex items-center gap-1.5 px-4 py-3 w-full text-left text-[12px] font-medium transition-colors border-b",
                                                isDark ? "text-[#555] border-[#1f1f1f] hover:text-[#aaa] hover:bg-white/[0.02]" : "text-[#aaa] border-[#f0f0f0] hover:text-[#555] hover:bg-[#fafafa]")}>
                                            <div className={cn("w-4 h-4 flex items-center justify-center rounded border border-dashed", isDark ? "border-[#444]" : "border-[#ccc]")}>
                                                <Plus size={10} />
                                            </div>
                                            New Form
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                )}
                </div>

            {/* CreateFormModal removed */}
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
                        await useFormStore.getState().bulkDeleteForms(ids);
                        setSelectedIds(new Set());
                        appToast.error('Deleted', `${ids.length} form${ids.length !== 1 ? 's' : ''} removed`);
                    } else if (deletingId) {
                        await deleteForm(deletingId);
                        appToast.error('Deleted', 'Form permanently removed');
                    }
                    setDeletingId(null);
                }}
            />
        </div>
    );
}
