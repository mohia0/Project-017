"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
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

function fmtDate(d: string) {
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
}

function SortableHeader({ id, children, onResizeStart, isDark, width, flexible }: { 
    id: string; 
    children: React.ReactNode; 
    onResizeStart?: (e: React.MouseEvent) => void;
    isDark: boolean;
    width?: number;
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
                "relative px-4 py-2 flex items-center border-r select-none group/header",
                isDragging ? "bg-blue-500/10" : "",
                isDark ? "border-[#2e2e2e]" : "border-[#e0e0e0]"
            )}
        >
            <div {...attributes} {...listeners} className="flex-1 cursor-grab active:cursor-grabbing truncate">
                {children}
            </div>
            {onResizeStart && (
                <div 
                    onMouseDown={onResizeStart} 
                    className="absolute -right-3 top-0 bottom-0 w-[24px] flex items-center justify-center cursor-col-resize z-10 group/resizer transition-colors hover:bg-primary/10"
                >
                    <div className="w-[2px] h-[50%] rounded-full opacity-0 group-hover/resizer:opacity-100 transition-opacity bg-primary" />
                </div>
            )}
        </div>
    );
}

/* ─── Shared dropdown ───────────────────────────────────────── */
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

/* ─── Status pill ───────────────────────────────────────────── */
function StatusCell({ status, onStatusChange, isDark }: {
    status: SchedulerStatus;
    onStatusChange: (s: SchedulerStatus) => void;
    isDark: boolean;
}) {
    const [open, setOpen] = useState(false);
    const cfg = STATUS_CFG[status];
    const dark = STATUS_DARK[status];
    const STATUSES: SchedulerStatus[] = ['Active', 'Draft', 'Inactive'];

    return (
        <div className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold border transition-all hover:brightness-95",
                    isDark ? "bg-white/5 border-white/10" : ""
                )}
                style={isDark ? { color: dark.text } : { background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
            >
                {status}
                <ChevronDown size={10} className="opacity-40" />
            </button>

            <Dropdown open={open} onClose={() => setOpen(false)} isDark={isDark} side="bottom">
                <div className="py-1 min-w-[120px]">
                    {STATUSES.map(s => {
                        const sCfg = STATUS_CFG[s];
                        const sDark = STATUS_DARK[s];
                        const isActive = s === status;
                        return (
                            <button key={s} onClick={(e) => { e.stopPropagation(); onStatusChange(s); setOpen(false); }}
                                className={cn("w-full flex items-center justify-between px-3.5 py-2 text-[12px] text-left transition-colors",
                                    isActive ? (isDark ? "bg-white/10" : "bg-[#f5f5f5]") : (isDark ? "hover:bg-white/5" : "hover:bg-[#fafafa]")
                                )}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: isDark ? sDark.dot : sCfg.dot }} />
                                    <span className="font-medium" style={isDark ? { color: sDark.text } : { color: sCfg.text }}>{s}</span>
                                </span>
                                {isActive && <Check size={11} className="text-primary" />}
                            </button>
                        );
                    })}
                </div>
            </Dropdown>
        </div>
    );
}

/* ─── Toolbar button ─────────────────────────────────────────── */
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

/* ─── Checkbox ──────────────────────────────────────────────────── */
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
        <div
            onClick={onOpen}
            className={cn(
                "relative rounded-xl border cursor-pointer transition-all duration-150 group flex flex-col overflow-hidden",
                isDark ? "bg-[#1a1a1a] border-[#2e2e2e] hover:border-[#444]"
                    : "bg-white border-[#f0f0f0] hover:shadow-md hover:border-[#e0e0e0]"
            )}
        >
            {/* Color strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4dbf39] to-[#7de86a]" />

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
        </div>
    );
}

function OrganizerCell({ currentName, currentId, onUpdate, isDark, variant = 'table' }: {
    currentName: string; currentId?: string | null; onUpdate: (id: string, name: string) => void;
    isDark: boolean; variant?: 'table' | 'card'
}) {
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
                side={variant === 'card' ? 'bottom' : 'bottom'}
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
    const { theme, setCreateModalOpen, pageViews, setPageView } = useUIStore();
    const { schedulers, fetchSchedulers, addScheduler, updateScheduler, deleteScheduler, isLoading } = useSchedulerStore();
    const isDark = theme === 'dark';
    const isMobile = useIsMobile();

    const view = (pageViews['schedulers'] as 'table' | 'cards') || 'table';
    const setView = (v: 'table' | 'cards') => setPageView('schedulers', v);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<SchedulerStatus | 'All'>('All');
    const [filterOpen, setFilterOpen] = useState(false);
    const [orderOpen, setOrderOpen] = useState(false);
    const [orderBy, setOrderBy] = useState<'created_at' | 'title'>('created_at');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => { fetchSchedulers(); }, [fetchSchedulers]);

    /* ─── Column resizing & reordering ─── */
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        select: 44,
        name: 240,
        organizer: 180,
        status: 140,
        durations: 160,
        bookings: 100,
        location: 160,
        created: 140,
        expires: 140,
        actions: 20
    });
    const [columnOrder, setColumnOrder] = useState<string[]>(['name', 'organizer', 'status', 'durations', 'bookings', 'location', 'created', 'expires']);

    useEffect(() => {
        const savedWidths = localStorage.getItem('sched_col_widths');
        if (savedWidths) setColWidths(prev => ({ ...prev, ...JSON.parse(savedWidths) }));
        const savedOrder = localStorage.getItem('sched_col_order');
        if (savedOrder) {
            const parsed = JSON.parse(savedOrder) as string[];
            if (!parsed.includes('organizer')) {
                const nameIdx = parsed.indexOf('name');
                if (nameIdx !== -1) {
                    parsed.splice(nameIdx + 1, 0, 'organizer');
                } else {
                    parsed.push('organizer');
                }
            }
            setColumnOrder(parsed);
        }
    }, []);

    useEffect(() => { localStorage.setItem('sched_col_widths', JSON.stringify(colWidths)); }, [colWidths]);
    useEffect(() => { localStorage.setItem('sched_col_order', JSON.stringify(columnOrder)); }, [columnOrder]);

    const isResizing = useRef<string | null>(null);
    const startX = useRef<number>(0);
    const startWidth = useRef<number>(0);

    const handleResizeStart = (key: string, e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = key;
        startX.current = e.clientX;
        startWidth.current = colWidths[key];
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const delta = e.clientX - startX.current;
        const newWidth = Math.max(50, startWidth.current + delta);
        setColWidths(prev => ({ ...prev, [isResizing.current as string]: newWidth }));
    };

    const handleResizeEnd = () => {
        isResizing.current = null;
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
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
        let r = schedulers.filter(s => {
            if (statusFilter !== 'All' && s.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const org = (s.meta as any)?.organizer?.toLowerCase() || '';
                if (!s.title.toLowerCase().includes(q) && !org.includes(q)) return false;
            }
            return true;
        });
        if (orderBy === 'title') r = [...r].sort((a, b) => a.title.localeCompare(b.title));
        else r = [...r].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return r;
    }, [schedulers, statusFilter, searchQuery, orderBy]);

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
                <h1 className="text-[15px] font-semibold tracking-tight">Schedulers</h1>
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
            <div className="flex-1 overflow-auto pb-44">
                {isLoading && schedulers.length === 0 ? (
                    view === 'cards' ? (
                        <div className="p-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className={cn("rounded-xl border flex flex-col pointer-events-none", isDark ? "border-[#2e2e2e] bg-[#1a1a1a]" : "border-[#f0f0f0] bg-white")}>
                                    <div className="h-1.5 w-full bg-gradient-to-r from-[#4dbf39]/20 to-[#7de86a]/20" />
                                    <div className="p-4 flex flex-col gap-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                                <div className={cn("w-3.5 h-3.5 mt-0.5 rounded-[3px] animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                                                <div className="min-w-0 flex-1 space-y-1.5">
                                                    <div className={cn("h-4 w-[70%] rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                                                    <div className={cn("h-3 w-[40%] rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                                                </div>
                                            </div>
                                            <div className={cn("h-5 w-16 rounded-full animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                                        </div>
                                        <div className="space-y-2">
                                            <div className={cn("h-3 w-32 rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                                            <div className={cn("h-3 w-24 rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                                        </div>
                                    </div>
                                    <div className={cn("flex items-center justify-between px-4 py-2.5 border-t mt-auto", isDark ? "border-[#252525]" : "border-[#f5f5f5]")}>
                                        <div className={cn("h-3 w-16 rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                                        <div className="flex gap-1">
                                            <div className={cn("w-6 h-6 rounded-lg animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                                            <div className={cn("w-6 h-6 rounded-lg animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                                            <div className={cn("w-6 h-6 rounded-lg animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <div className={cn("grid border-b h-10 items-center", isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-[#f5f5f7] border-[#ebebeb]")} style={{ gridTemplateColumns: gridTemplate }}>
                                <div className="flex justify-center"><div className={cn("w-3.5 h-3.5 rounded-[3px] animate-pulse", isDark ? "bg-white/[0.1]" : "bg-black/[0.1]")} /></div>
                                {columnOrder.map(colId => (
                                    <div key={colId} className="px-4"><div className={cn("h-3 w-16 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /></div>
                                ))}
                                <div />
                            </div>
                            {Array.from({ length: 25 }).map((_, i) => (
                                <div key={i} className={cn("grid border-b items-center h-[52px]", isDark ? "border-[#1f1f1f] bg-[#141414]" : "border-[#f0f0f0] bg-white")} style={{ gridTemplateColumns: gridTemplate }}>
                                    <div className="flex justify-center"><div className={cn("w-3.5 h-3.5 rounded-[3px] animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} /></div>
                                    {columnOrder.map(colId => (
                                        <div key={colId} className="px-4">
                                            {colId === 'name' ? (
                                                <div className={cn("h-4 w-32 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                                            ) : colId === 'status' ? (
                                                <div className={cn("h-5 w-16 rounded-full animate-pulse", isDark ? "bg-white/[0.06]" : "bg-black/[0.06]")} />
                                            ) : (
                                                <div className={cn("h-3 w-20 rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                                            )}
                                        </div>
                                    ))}
                                    <div />
                                </div>
                            ))}
                        </div>
                    )
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
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
                ) : view === 'cards' ? (
                    /* ── Cards ── */
                    <div className="p-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                    </div>
                ) : (
                    /* ── Table ── */
                    /* ── List ── */
                    <div className="flex-1 overflow-x-auto w-full">
                        <div className="min-w-[1000px] flex flex-col">
                            {/* Header */}
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <div className={cn("grid border-b text-[11px] font-semibold tracking-tight sticky top-0 z-30",
                                    isDark ? "bg-[#1a1a1a] border-[#252525] text-[#888]" : "bg-[#f5f5f7] border-[#ebebeb] text-[#666]")}
                                    style={{ gridTemplateColumns: gridTemplate }}>
                                    
                                    <div className="relative px-0 py-2 flex items-center justify-center border-r" style={{ borderColor: isDark ? '#2e2e2e' : '#e0e0e0' }}>
                                        <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleAll(); }}>
                                            <Chk checked={isAllSelected} indeterminate={selectedIds.size > 0 && !isAllSelected} isDark={isDark} />
                                        </div>
                                        <div onMouseDown={(e) => handleResizeStart('select', e)} className="absolute right-0 top-1.5 bottom-1.5 w-[1px] cursor-col-resize hover:bg-blue-400 transition-colors" />
                                    </div>

                                    <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                                        {columnOrder.map(colId => {
                                            let label = '';
                                            if (colId === 'name') label = 'Name';
                                            if (colId === 'organizer') label = 'Organizer';
                                            if (colId === 'status') label = 'Status';
                                            if (colId === 'durations') label = 'Durations';
                                            if (colId === 'bookings') label = 'Bookings';
                                            if (colId === 'location') label = 'Location';
                                            if (colId === 'created') label = 'Created';
                                            if (colId === 'expires') label = 'Expires';

                                            return (
                                                <SortableHeader 
                                                    key={colId} 
                                                    id={colId} 
                                                    isDark={isDark} 
                                                    width={colId === 'name' ? undefined : colWidths[colId]}
                                                    flexible={colId === 'name'}
                                                    onResizeStart={(e) => handleResizeStart(colId, e)}
                                                >
                                                    {label}
                                                </SortableHeader>
                                            );
                                        })}
                                    </SortableContext>
                                    <div />
                                </div>
                            </DndContext>

                            {/* Rows */}
                            <div className="flex flex-col">
                                {filtered.map(s => {
                                    const meta = (s.meta as any) || {};
                                    const durations: number[] = meta.durations || [];
                                    const isSelected = selectedIds.has(s.id);

                                    const menuItems = [
                                        { label: 'Open', icon: <ExternalLink size={12} />, onClick: () => router.push(`/schedulers/${s.id}`) },
                                        { label: 'Open Public Link', icon: <ExternalLink size={12} />, onClick: () => window.open(window.location.origin + '/p/scheduler/' + s.id, '_blank') },
                                        { label: 'Copy Public Link', icon: <Link size={12} />, onClick: (e: any) => copyLink(s.id, e as any) },
                                        { label: 'Duplicate', icon: <Copy size={12} />, onClick: () => handleDuplicate(s.id) },
                                        { label: 'Delete', icon: <Trash2 size={12} />, danger: true, onClick: () => setDeletingId(s.id), separator: true },
                                    ];

                                    return (
                                        <ContextMenuRow
                                            key={s.id}
                                            items={menuItems}
                                            isDark={isDark}
                                            onRowClick={() => router.push(`/schedulers/${s.id}`)}
                                            className={cn("grid px-0 border-b text-[12px] cursor-pointer group transition-colors",
                                                isDark ? "border-[#1f1f1f] hover:bg-white/[0.025]" : "bg-white border-[#f0f0f0] hover:bg-[#fafafa]",
                                                isSelected && (isDark ? "bg-blue-900/10" : "bg-blue-50/40"))}
                                            style={{ gridTemplateColumns: gridTemplate }}
                                        >
                                            <div className="flex items-center justify-center px-0 py-1.5 self-stretch" onClick={e => toggleRow(s.id, e)}>
                                                <Chk checked={isSelected} isDark={isDark} />
                                            </div>

                                            {columnOrder.map(colId => {
                                            const meta = (s.meta || {}) as any;
                                            if (colId === 'organizer') return (
                                                <div key={colId} className="flex items-stretch overflow-hidden">
                                                    <OrganizerCell 
                                                        currentName={meta.organizer} 
                                                        currentId={meta.organizer_id}
                                                        onUpdate={(id, name) => updateScheduler(s.id, { meta: { ...meta, organizer: name, organizer_id: id } as any })}
                                                        isDark={isDark}
                                                    />
                                                </div>
                                            );
                                            if (colId === 'name') return (
                                                    <div key={colId} className="flex flex-col justify-center px-4 py-1.5 min-w-0 self-center">
                                                        <div className={cn("font-bold truncate", isDark ? "text-white" : "text-black")}>{s.title}</div>
                                                    </div>
                                                );
                                                if (colId === 'status') return (
                                                    <div key={colId} className="flex items-center px-4 py-1.5 self-center">
                                                        <StatusCell
                                                            status={s.status}
                                                            onStatusChange={(newStatus) => updateScheduler(s.id, { status: newStatus })}
                                                            isDark={isDark}
                                                        />
                                                    </div>
                                                );
                                                if (colId === 'durations') return (
                                                    <div key={colId} className="flex items-center px-4 py-1.5 self-center">
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
                                                if (colId === 'bookings') return (
                                                    <div key={colId} className={cn("flex flex-col justify-center px-4 py-1.5 self-center", isDark ? "text-[#777]" : "text-[#888]")}>
                                                        <span className="text-[12px]">{s.bookings_count || 0}</span>
                                                    </div>
                                                );
                                                if (colId === 'location') return (
                                                    <div key={colId} className="flex flex-col justify-center px-4 py-1.5 min-w-0 self-center">
                                                        {meta.location ? (
                                                            <div className={cn("flex items-center gap-1.5 text-[12px] truncate", isDark ? "text-[#777]" : "text-[#888]")}>
                                                                <MapPin size={10} className="shrink-0" />
                                                                <span className="truncate">{meta.location}</span>
                                                            </div>
                                                        ) : <span className="text-[11px] opacity-20">—</span>}
                                                    </div>
                                                );
                                                if (colId === 'created') return (
                                                    <div key={colId} className={cn("flex flex-col justify-center px-4 py-1.5 self-center", isDark ? "text-[#777]" : "text-[#888]")}>
                                                        <span className="text-[12px]">{fmtDate(s.created_at)}</span>
                                                    </div>
                                                );
                                                if (colId === 'expires') return (
                                                    <div key={colId} className={cn("flex flex-col justify-center px-4 py-1.5 self-center", isDark ? "text-[#777]" : "text-[#888]")}>
                                                        <span className="text-[12px]">{meta.expirationDate ? fmtDate(meta.expirationDate) : '—'}</span>
                                                    </div>
                                                );
                                                return null;
                                            })}
                                            <div />
                                        </ContextMenuRow>
                                    );
                                })}
                            </div>
                        </div>
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
        </div>
    );
}
