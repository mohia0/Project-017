"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useInvoiceStore, InvoiceStatus, Invoice } from '@/store/useInvoiceStore';
import { useClientStore } from '@/store/useClientStore';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, getStatusColors } from '@/lib/statusConfig';
import {
    Search, Table2, LayoutGrid, Edit3, ChevronDown,
    ArrowUpDown, Archive, Upload, Plus, User, Filter,
    Calendar, Check, X, ArchiveRestore, Receipt, ChevronsUpDown,
    Copy, Trash2, CheckCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CreateInvoiceModal } from '@/components/modals/CreateInvoiceModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { gooeyToast } from 'goey-toast';



function fmt$(val: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(val);
}
function fmtDate(d: string | null | undefined) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}
function timeAgo(d: string | null | undefined) {
    if (!d) return '';
    const ms = Date.now() - new Date(d).getTime();
    const days = Math.floor(ms / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return `about ${months} month${months > 1 ? 's' : ''} ago`;
}

function isThisMonth(d: string | null | undefined) {
    if (!d) return false;
    const now = new Date(); const then = new Date(d);
    return then.getMonth() === now.getMonth() && then.getFullYear() === now.getFullYear();
}
function isThisYear(d: string | null | undefined) {
    if (!d) return false;
    return new Date(d).getFullYear() === new Date().getFullYear();
}

/* ─── Shared toolbar button ─────────────────────────────────────── */
function TbBtn({ label, icon, active, hasArrow, onClick, isDark }: {
    label?: string; icon?: React.ReactNode; active?: boolean;
    hasArrow?: boolean; onClick?: () => void; isDark: boolean;
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
            checked ? "bg-[#4dbf39] border-[#4dbf39]"
                : indeterminate ? "bg-[#4dbf39]/40 border-[#4dbf39]/60"
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

/* ─── Dropdown ──────────────────────────────────────────────────── */
function Dropdown({ open, onClose, isDark, children }: { open: boolean; onClose: () => void; isDark: boolean; children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div ref={ref} className={cn("absolute top-full left-0 mt-1 z-50 min-w-[180px] rounded-xl border shadow-xl overflow-hidden",
            isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]")}>
            {children}
        </div>
    );
}

function DItem({ label, icon, active, onClick, isDark }: { label: string; icon?: React.ReactNode; active?: boolean; onClick: () => void; isDark: boolean }) {
    return (
        <button onClick={onClick} className={cn("w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] transition-colors text-left",
            active
                ? isDark ? "bg-white/8 text-white font-medium" : "bg-[#f0f0f0] text-[#111] font-medium"
                : isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]")}>
            {icon && <span className="opacity-60">{icon}</span>}
            <span className="flex-1">{label}</span>
            {active && <Check size={11} className={isDark ? "text-[#4dbf39]" : "text-[#4dbf39]"} />}
        </button>
    );
}

/* ─── Invoice Card ───────────────────────────────── */
function CardRow({ label, children, isDark, noBorder }: { label: string; children?: React.ReactNode; isDark: boolean; noBorder?: boolean }) {
    return (
        <div className={cn("flex items-center gap-3 py-2", !noBorder && "border-b border-dashed", !noBorder && (isDark ? "border-[#2e2e2e]" : "border-[#e5e5e5]"))}>
            <div className={cn("w-[90px] text-[11.5px] font-normal shrink-0", isDark ? "text-[#888]" : "text-[#666]")}>{label}</div>
            <div className={cn("text-[11.5px] flex-1 flex items-center min-w-0 font-medium overflow-visible", isDark ? "text-[#ddd]" : "text-[#222]")}>
                {children}
            </div>
        </div>
    );
}

/* ─── Config ─────────────────────────────────────────────────────── */
const STATUS_ORDER: InvoiceStatus[] = ['Draft', 'Pending', 'Paid', 'Overdue', 'Cancelled'];

function InvoiceCard({ i, onOpen, onArchive, isDark, onStatusChange, isSelected, onToggle, onClientChange }: {
    i: Invoice; onOpen: () => void; onArchive: () => void; isDark: boolean;
    onStatusChange: (s: InvoiceStatus) => void; isSelected: boolean; onToggle: () => void;
    onClientChange: (clientId: string, clientName: string) => void;
}) {
    const [statusOpen, setStatusOpen] = useState(false);
    const sc = getStatusColors(i.status);
    return (
        <div
            onClick={onOpen}
            className={cn(
                "relative rounded-[8px] border cursor-pointer transition-all duration-150 group flex flex-col",
                isDark ? "bg-[#1a1a1a] border-[#2e2e2e] hover:border-[#444]"
                    : "bg-white border-transparent hover:shadow-sm"
            )}
        >
            {/* Header */}
            <div className={cn("flex items-center justify-between px-4 py-3 border-b", isDark ? "border-[#2e2e2e]" : "border-[#f0f0f0]")}>
                <div className={cn("font-bold text-[14px] tracking-tight", isDark ? "text-white" : "text-black")}>
                    {i.id?.slice(-6).toUpperCase() ?? '—'}
                </div>
                <div
                    onClick={(e) => { e.stopPropagation(); onToggle(); }}
                    className="cursor-pointer"
                >
                    <Chk checked={isSelected} isDark={isDark} />
                </div>
            </div>

            {/* Body */}
            <div className="px-4 py-1.5 flex flex-col">
                <CardRow label="Client" isDark={isDark}>
                    <ClientCell
                        currentName={i.client_name}
                        currentId={i.client_id}
                        onClientChange={onClientChange}
                        isDark={isDark}
                        variant="card"
                    />
                </CardRow>

                <CardRow label="Expiration date" isDark={isDark}>
                    {i.due_date ? <span>{fmtDate(i.due_date)} <span className="opacity-60 font-normal">({timeAgo(i.due_date)})</span></span> : ''}
                </CardRow>

                <CardRow label="Issue date" isDark={isDark}>
                    {i.issue_date ? <span>{fmtDate(i.issue_date)} <span className="opacity-60 font-normal">({timeAgo(i.issue_date)})</span></span> : ''}
                </CardRow>

                <CardRow label="Total" isDark={isDark}>
                    {fmt$(Number(i.amount || 0))}
                </CardRow>

                <CardRow label="Status" isDark={isDark} noBorder>
                    <div className="relative flex-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); setStatusOpen(!statusOpen); }}
                            className={cn("flex items-center justify-between w-full px-2.5 py-1.5 rounded-[6px] font-semibold border",
                                isDark ? "bg-white/[0.04] text-[#888] border-white/5" : cn(sc.badge, sc.badgeText, sc.badgeBorder))}
                        >
                            <span>{i.status}</span>
                            <ChevronsUpDown size={11} className="opacity-70" />
                        </button>
                        <Dropdown open={statusOpen} onClose={() => setStatusOpen(false)} isDark={isDark}>
                            <div className="py-1">
                                {STATUS_ORDER.map(s => {
                                    const sSc = getStatusColors(s);
                                    const isActive = s === i.status;
                                    return (
                                        <button key={s} onClick={(e) => { e.stopPropagation(); onStatusChange(s); setStatusOpen(false); }}
                                            className={cn("w-full flex items-center justify-between px-3.5 py-2 text-[12px] text-left transition-colors",
                                                isActive ? (isDark ? "bg-white/5" : "bg-[#f5f5f5]") : (isDark ? "hover:bg-white/5" : "hover:bg-[#fafafa]")
                                            )}
                                        >
                                            <span className={cn("font-medium", isDark ? "text-[#ccc]" : sSc.badgeText)}>
                                                {s}
                                            </span>
                                            {isActive && <Check size={12} className={isDark ? "text-white opacity-40" : "text-black opacity-40"} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </Dropdown>
                    </div>
                </CardRow>
            </div>

            {/* Archive button */}
            <button
                onClick={e => { e.stopPropagation(); onArchive(); }}
                title="Archive"
                className={cn(
                    "absolute top-2.5 right-10 w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all",
                    isDark ? "bg-[#2a2a2a] text-[#888] hover:text-[#ccc]" : "bg-white border border-[#e0e0e0] shadow-sm text-[#666] hover:bg-[#fafafa]"
                )}
            >
                <Archive size={11} />
            </button>
        </div>
    );
}

function StatusCell({ status, onStatusChange, isDark }: { status: InvoiceStatus; onStatusChange: (s: InvoiceStatus) => void; isDark: boolean }) {
    const [open, setOpen] = useState(false);
    const sc = getStatusColors(status);
    return (
        <div className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold border",
                    isDark ? "bg-white/[0.04] text-[#888] border-white/5" : cn(sc.badge, sc.badgeText, sc.badgeBorder))}
            >
                {status}<ChevronDown size={10} className="opacity-50" />
            </button>
            <Dropdown open={open} onClose={() => setOpen(false)} isDark={isDark}>
                <div className="py-1">
                    {STATUS_ORDER.map(s => {
                        const sSc = getStatusColors(s);
                        const isActive = s === status;
                        return (
                            <button key={s} onClick={(e) => { e.stopPropagation(); onStatusChange(s); setOpen(false); }}
                                className={cn("w-full flex items-center justify-between px-3.5 py-2 text-[12px] text-left transition-colors",
                                    isActive ? (isDark ? "bg-white/5" : "bg-[#f5f5f5]") : (isDark ? "hover:bg-white/5" : "hover:bg-[#fafafa]")
                                )}
                            >
                                <span className={cn("font-medium", isDark ? "text-[#ccc]" : sSc.badgeText)}>
                                    {s}
                                </span>
                                {isActive && <Check size={12} className={isDark ? "text-white opacity-40" : "text-black opacity-40"} />}
                            </button>
                        );
                    })}
                </div>
            </Dropdown>
        </div>
    );
}

function ClientCell({ currentName, currentId, onClientChange, isDark, variant = 'table' }: {
    currentName: string; currentId?: string | null; onClientChange: (id: string, name: string) => void;
    isDark: boolean; variant?: 'table' | 'card'
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const { clients, fetchClients } = useClientStore();

    useEffect(() => {
        if (open) {
            if (clients.length === 0) fetchClients();
            setSearch('');
        }
    }, [open, clients.length, fetchClients]);

    const filtered = useMemo(() => {
        if (!search) return clients;
        return clients.filter(c => c.company_name.toLowerCase().includes(search.toLowerCase()));
    }, [clients, search]);

    const display = (
        <div className={cn("flex items-center gap-1.5",
            variant === 'card' ? cn("px-2 py-1 rounded-[6px]", isDark ? "bg-white/10" : "bg-[#f5f5f5]") : "truncate")}>
            <User size={variant === 'card' ? 10 : 11} className={cn("opacity-40 shrink-0", isDark ? "text-[#aaa]" : "text-[#777]")} />
            <span className="truncate">{currentName || '—'}</span>
        </div>
    );

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
            <Dropdown open={open} onClose={() => setOpen(false)} isDark={isDark}>
                <div className={cn("p-2 border-b", isDark ? "border-[#2e2e2e]" : "border-[#f0f0f0]")}>
                    <div className="relative">
                        <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-30" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search client..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className={cn("w-full pl-6 pr-2 py-1.5 text-[11px] rounded-md outline-none",
                                isDark ? "bg-white/5 border border-white/10 text-white" : "bg-[#f5f5f5] border border-[#e0e0e0] text-black"
                            )}
                        />
                    </div>
                </div>
                <div className="py-1 max-h-[180px] overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-4 text-center opacity-40 text-[11px]">
                            {search ? 'No results' : 'No clients found'}
                        </div>
                    ) : (
                        filtered.map(c => (
                            <button key={c.id} onClick={(e) => { e.stopPropagation(); onClientChange(c.id, c.company_name); setOpen(false); }}
                                className={cn("w-full flex items-center justify-between px-3.5 py-2 text-[12px] text-left transition-colors",
                                    c.id === currentId ? (isDark ? "bg-white/5" : "bg-[#f5f5f5]") : (isDark ? "hover:bg-white/5" : "hover:bg-[#fafafa]")
                                )}
                            >
                                <span className={cn("font-medium", isDark ? "text-[#ddd]" : "text-[#444]")}>{c.company_name}</span>
                                {c.id === currentId && <Check size={12} className="opacity-40" />}
                            </button>
                        ))
                    )}
                </div>
            </Dropdown>
        </div>
    );
}

/* ─── Main page ─────────────────────────────────────────────────── */
export default function InvoicesPage() {
    const router = useRouter();
    const { theme } = useUIStore();
    const { invoices, fetchInvoices, updateInvoice, addInvoice, deleteInvoice, isLoading } = useInvoiceStore();
    const isDark = theme === 'dark';
    const [view, setView] = useState<'table' | 'cards'>('table');
    /* ... existing state ... */
    const [colWidths, setColWidths] = useState({
        select: 44,
        id: 70,
        status: 160,
        issue: 180,
        due: 180,
        client: 180,
        amount: 300
    });

    const isResizing = useRef<string | null>(null);
    const startX = useRef<number>(0);
    const startWidth = useRef<number>(0);

    const handleResizeStart = (key: keyof typeof colWidths, e: React.MouseEvent) => {
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
        const newWidth = Math.max(30, startWidth.current + delta);
        setColWidths(prev => ({ ...prev, [isResizing.current as string]: newWidth }));
    };

    const handleResizeEnd = () => {
        isResizing.current = null;
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    };

    const gridTemplate = `${colWidths.select}px ${colWidths.id}px ${colWidths.status}px ${colWidths.issue}px ${colWidths.due}px ${colWidths.client}px minmax(${colWidths.amount}px, 1fr)`;
    const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    /* Dropdowns */
    const [filterOpen, setFilterOpen] = useState(false);
    const [orderOpen, setOrderOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [dateFilter, setDateFilter] = useState<'all' | 'month' | 'year'>('year');
    const [orderBy, setOrderBy] = useState<'created_at' | 'issue_date' | 'amount'>('created_at');

    /* Local archive state (optimistic) */
    const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());

    useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

    /* ── Derived data ── */
    const filtered = useMemo(() => {
        let r = invoices.filter(inv => {
            if (showArchived) return archivedIds.has(inv.id);
            if (archivedIds.has(inv.id)) return false;
            if (statusFilter !== 'All' && inv.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!inv.title?.toLowerCase().includes(q) && !inv.client_name?.toLowerCase().includes(q)) return false;
            }
            if (dateFilter === 'month' && !isThisMonth(inv.issue_date)) return false;
            if (dateFilter === 'year' && !isThisYear(inv.issue_date)) return false;
            return true;
        });
        if (orderBy === 'issue_date') r = [...r].sort((a, b) => new Date(b.issue_date || 0).getTime() - new Date(a.issue_date || 0).getTime());
        if (orderBy === 'amount') r = [...r].sort((a, b) => Number(b.amount) - Number(a.amount));
        return r;
    }, [invoices, statusFilter, searchQuery, dateFilter, orderBy, archivedIds, showArchived]);

    const stats = useMemo(() => {
        const s: Record<string, { count: number; amount: number }> = {
            All: { count: 0, amount: 0 }, Draft: { count: 0, amount: 0 }, Pending: { count: 0, amount: 0 },
            Paid: { count: 0, amount: 0 }, Overdue: { count: 0, amount: 0 }, Cancelled: { count: 0, amount: 0 },
        };
        invoices.filter(inv => !archivedIds.has(inv.id)).forEach(inv => {
            s.All.count++; s.All.amount += Number(inv.amount || 0);
            if (s[inv.status]) { s[inv.status].count++; s[inv.status].amount += Number(inv.amount || 0); }
        });
        return s;
    }, [invoices, archivedIds]);

    const toggleAll = () => setSelectedIds(selectedIds.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(i => i.id)));
    const toggleRow = (id: string, e: React.MouseEvent) => { e.stopPropagation(); const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };
    const isAllSelected = filtered.length > 0 && selectedIds.size === filtered.length;

    const handleArchive = (id: string) => {
        const next = new Set(archivedIds);
        const isCurrentlyArchived = next.has(id);
        isCurrentlyArchived ? next.delete(id) : next.add(id);
        setArchivedIds(next);
        gooeyToast(isCurrentlyArchived ? 'Restored from archive' : 'Moved to archive', { duration: 2000 });
    };
    const handleBulkArchive = () => {
        const next = new Set(archivedIds);
        selectedIds.forEach(id => next.add(id));
        setArchivedIds(next);
        const count = selectedIds.size;
        setSelectedIds(new Set());
        gooeyToast(`${count} invoice${count !== 1 ? 's' : ''} archived`, { duration: 2500 });
    };
    const handleBulkDelete = async () => {
        setDeletingId('bulk');
    };
    const handleBulkDuplicate = async () => {
        const ids = Array.from(selectedIds);
        const promise = (async () => {
            for (const id of ids) {
                const original = invoices.find(inv => inv.id === id);
                if (original) {
                    const { id: _, created_at: __, ...payload } = original;
                    await addInvoice({
                        ...payload,
                        title: `${payload.title || 'Invoice'} (Copy)`,
                        status: 'Draft'
                    });
                }
            }
        })();
        gooeyToast.promise(promise, {
            loading: `Duplicating ${ids.length} invoice${ids.length !== 1 ? 's' : ''}…`,
            success: `${ids.length} invoice${ids.length !== 1 ? 's' : ''} duplicated`,
            error: 'Duplication failed',
        });
        await promise;
        setSelectedIds(new Set());
    };

    const border = isDark ? "border-[#252525]" : "border-[#ebebeb]";
    const datePill = dateFilter === 'month' ? 'This Month' : dateFilter === 'year' ? 'This Year' : 'All time';

    return (
        <div className={cn("flex flex-col h-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-[#f7f7f7] text-[#111]")}>

            {/* ── Page header ── */}
            <div className={cn("flex items-center justify-between px-5 py-3 shrink-0", isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-white")}>
                <h1 className="text-[15px] font-semibold tracking-tight">Invoices</h1>
                <button onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-[8px] bg-[#4dbf39] hover:bg-[#59d044] text-black transition-colors">
                    <Plus size={13} strokeWidth={2.5} /> New Invoice
                </button>
            </div>

            {/* ── Toolbar ── */}
            <div className={cn("flex items-center gap-0 px-4 py-1.5 shrink-0", isDark ? "border-b border-[#252525]" : "")}>
                {/* Search */}
                <div className="relative mr-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 opacity-40" size={11} />
                    <input type="text" placeholder="Search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className={cn("pl-6 pr-3 py-1 text-[11px] rounded border focus:outline-none w-28 transition-all focus:w-44",
                            isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-white/20"
                                : "bg-[#f5f5f5] border-[#e0e0e0] text-[#111] placeholder:text-[#aaa] focus:border-[#ccc]")} />
                </div>

                {/* View switcher */}
                <div className="relative mr-1">
                    <TbBtn label={view === 'table' ? 'Table' : 'Cards'} icon={view === 'table' ? <Table2 size={11} /> : <LayoutGrid size={11} />}
                        hasArrow onClick={() => setViewOpen(v => !v)} isDark={isDark} />
                    <Dropdown open={viewOpen} onClose={() => setViewOpen(false)} isDark={isDark}>
                        <div className="py-1">
                            <DItem label="Table" icon={<Table2 size={12} />} active={view === 'table'} onClick={() => { setView('table'); setViewOpen(false); }} isDark={isDark} />
                            <DItem label="Cards" icon={<LayoutGrid size={12} />} active={view === 'cards'} onClick={() => { setView('cards'); setViewOpen(false); }} isDark={isDark} />
                        </div>
                    </Dropdown>
                </div>

                {/* Filter / date */}

                <div className="relative mx-1">
                    <button onClick={() => setFilterOpen(v => !v)} className={cn(
                        "flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border transition-all",
                        filterOpen
                            ? isDark ? "bg-[#252525] border-[#444] text-[#ccc]" : "bg-white border-[#aaa] text-[#444] shadow-xs"
                            : isDark ? "bg-[#252525] border-[#333] text-[#ccc] hover:border-[#444]" : "bg-white border-[#d0d0d0] text-[#444] hover:border-[#bbb] shadow-xs"
                    )}>
                        <Calendar size={11} className="opacity-60" />
                        {datePill}
                        {dateFilter !== 'all' && (
                            <span onClick={e => { e.stopPropagation(); setDateFilter('all'); }}
                                className={cn("ml-0.5 opacity-50 hover:opacity-100 transition-opacity")}>
                                <X size={9} />
                            </span>
                        )}
                    </button>
                    <Dropdown open={filterOpen} onClose={() => setFilterOpen(false)} isDark={isDark}>
                        <div className={cn("flex items-center gap-2 px-3.5 py-2.5 border-b", isDark ? "border-[#2e2e2e]" : "border-[#f0f0f0]")}>
                            <Plus size={11} className="opacity-40" />
                            <span className={cn("text-[11px] font-medium", isDark ? "text-[#777]" : "text-[#aaa]")}>New filter</span>
                        </div>
                        <div className="py-1">
                            <DItem label="This Month" active={dateFilter === 'month'} onClick={() => { setDateFilter('month'); setFilterOpen(false); }} isDark={isDark} />
                            <DItem label="This Year" active={dateFilter === 'year'} onClick={() => { setDateFilter('year'); setFilterOpen(false); }} isDark={isDark} />
                            <DItem label="All time" active={dateFilter === 'all'} onClick={() => { setDateFilter('all'); setFilterOpen(false); }} isDark={isDark} />
                        </div>
                    </Dropdown>
                </div>

                <div className={cn("w-[1px] h-4 mx-1", isDark ? "bg-[#333]" : "bg-[#e0e0e0]")} />

                {/* Order */}
                <div className="relative">
                    <TbBtn label="Order" icon={<ArrowUpDown size={11} />} hasArrow onClick={() => setOrderOpen(v => !v)} isDark={isDark} />
                    <Dropdown open={orderOpen} onClose={() => setOrderOpen(false)} isDark={isDark}>
                        <div className="py-1">
                            <DItem label="Creation date" active={orderBy === 'created_at'} onClick={() => { setOrderBy('created_at'); setOrderOpen(false); }} isDark={isDark} />
                            <DItem label="Issue date" active={orderBy === 'issue_date'} onClick={() => { setOrderBy('issue_date'); setOrderOpen(false); }} isDark={isDark} />
                            <DItem label="Total amount" active={orderBy === 'amount'} onClick={() => { setOrderBy('amount'); setOrderOpen(false); }} isDark={isDark} />
                        </div>
                    </Dropdown>
                </div>

                <div className={cn("w-[1px] h-4 mx-1", isDark ? "bg-[#333]" : "bg-[#e0e0e0]")} />

                {/* Archived toggle */}
                <TbBtn label="Archived" icon={showArchived ? <ArchiveRestore size={11} /> : <Archive size={11} />}
                    active={showArchived} onClick={() => { setShowArchived(v => !v); setSelectedIds(new Set()); }} isDark={isDark} />

                <TbBtn label="Import / Export" icon={<Upload size={11} />} isDark={isDark} />

                {/* Bulk banner */}
                {selectedIds.size > 0 && (
                    <div className={cn("ml-auto flex items-center gap-4 px-3 py-1 rounded-lg text-[11px] font-medium border",
                        isDark ? "bg-[#1c1c1c] border-[#2e2e2e] text-[#aaa]" : "bg-[#f8f8f8] border-[#e8e8e8] text-[#666]")}>
                        <span className="opacity-50">{selectedIds.size} selected</span>
                        <div className={cn("w-[1px] h-3", isDark ? "bg-[#333]" : "bg-[#ddd]")} />
                        <div className="flex items-center gap-3">
                            <button onClick={handleBulkDuplicate} className="hover:text-blue-500 flex items-center gap-1.5 transition-colors">
                                <Copy size={11} className="opacity-70" />Duplicate
                            </button>
                            <button onClick={handleBulkArchive} className="hover:text-blue-500 flex items-center gap-1.5 transition-colors">
                                <Archive size={11} className="opacity-70" />Archive
                            </button>
                            <button onClick={handleBulkDelete} className="hover:text-red-500 flex items-center gap-1.5 transition-colors text-red-500/80">
                                <Trash2 size={11} className="opacity-70" />Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Status bar ── */}
            <div className="flex items-stretch h-[26px] shrink-0">
                {Object.entries(STATUS_COLORS).filter(([k]) => k !== 'Accepted' && k !== 'Declined').map(([key, cfg]) => {
                    const s = stats[key] || { count: 0, amount: 0 };
                    const isActive = statusFilter === key;
                    const barStyle = { backgroundColor: cfg.bar };
                    const activeStyle = isActive ? { filter: 'brightness(1.1)' } : { filter: 'brightness(0.88)' };
                    return (
                        <button key={key} onClick={() => { setStatusFilter(key as any); setShowArchived(false); }}
                            style={{ ...barStyle, ...activeStyle }}
                            className="flex-1 flex items-center justify-start gap-1.5 px-2.5 text-[10px] font-semibold transition-all text-white hover:brightness-100">
                            <span className="font-bold tabular-nums">{s.count}</span>
                            <span className="opacity-80 font-medium">{key === 'All' ? 'Invoices' : cfg.label}</span>
                            {s.amount > 0 && <span className="ml-auto font-bold tabular-nums opacity-90 text-[9px]">{fmt$(s.amount)}</span>}
                        </button>
                    );
                })}
            </div>

            {/* ── Content ── */}
            {view === 'table' ? (
                <div className="flex-1 overflow-auto" style={{ backgroundColor: isDark ? '#141414' : '#f7f7f7' }}>
                    {/* Header */}
                    <div className={cn("grid border-b text-[11px] font-semibold tracking-tight sticky top-0 z-10",
                        isDark ? "bg-[#1a1a1a] border-[#252525] text-[#888]" : "bg-[#f5f5f7] border-[#ebebeb] text-[#666]")}
                        style={{ gridTemplateColumns: gridTemplate }}>
                        
                        <div className="relative px-0 py-2 flex items-center justify-center border-r" style={{ borderColor: isDark ? '#2e2e2e' : '#e0e0e0' }}>
                            <div className="cursor-pointer" onClick={toggleAll}>
                                <Chk checked={isAllSelected} indeterminate={selectedIds.size > 0 && !isAllSelected} isDark={isDark} />
                            </div>
                            <div onMouseDown={(e) => handleResizeStart('select', e)} className="absolute right-0 top-1.5 bottom-1.5 w-[1px] cursor-col-resize hover:bg-blue-400 transition-colors" />
                        </div>
                        <div className="relative px-4 py-2 flex items-center border-r last:border-r-0" style={{ borderColor: isDark ? '#2e2e2e' : '#e0e0e0' }}>
                            ID
                            <div onMouseDown={(e) => handleResizeStart('id', e)} className="absolute right-0 top-1.5 bottom-1.5 w-[2px] cursor-col-resize hover:bg-blue-400 transition-colors" />
                        </div>
                        <div className="relative px-4 py-2 flex items-center border-r" style={{ borderColor: isDark ? '#2e2e2e' : '#e0e0e0' }}>
                            Status
                            <div onMouseDown={(e) => handleResizeStart('status', e)} className="absolute right-0 top-1.5 bottom-1.5 w-[1px] cursor-col-resize hover:bg-blue-400 transition-colors" />
                        </div>
                        <div className="relative px-4 py-2 flex items-center border-r" style={{ borderColor: isDark ? '#2e2e2e' : '#e0e0e0' }}>
                            Issue date
                            <div onMouseDown={(e) => handleResizeStart('issue', e)} className="absolute right-0 top-1.5 bottom-1.5 w-[1px] cursor-col-resize hover:bg-blue-400 transition-colors" />
                        </div>
                        <div className="relative px-4 py-2 flex items-center border-r" style={{ borderColor: isDark ? '#2e2e2e' : '#e0e0e0' }}>
                            Due date
                            <div onMouseDown={(e) => handleResizeStart('due', e)} className="absolute right-0 top-1.5 bottom-1.5 w-[1px] cursor-col-resize hover:bg-blue-400 transition-colors" />
                        </div>
                        <div className="relative px-4 py-2 flex items-center border-r" style={{ borderColor: isDark ? '#2e2e2e' : '#e0e0e0' }}>
                            Client
                            <div onMouseDown={(e) => handleResizeStart('client', e)} className="absolute right-0 top-1.5 bottom-1.5 w-[1px] cursor-col-resize hover:bg-blue-400 transition-colors" />
                        </div>
                        <div className="relative px-4 py-2 flex items-center justify-end">
                            Total: {fmt$(stats[statusFilter]?.amount ?? 0)}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col">{Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className={cn("grid px-0 border-b items-center h-[45px]", isDark ? "border-[#1f1f1f]" : "border-[#f0f0f0]")} style={{ gridTemplateColumns: gridTemplate }}>
                                <div className="flex justify-center"><div className={cn("w-3.5 h-3.5 rounded-[3px] animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /></div>
                                <div className="px-4"><div className={cn("h-3 w-10 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /></div>
                                <div className="px-4"><div className={cn("h-5 w-16 rounded-[4px] animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /></div>
                                <div className="px-4"><div className={cn("h-3 w-20 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /></div>
                                <div className="px-4"><div className={cn("h-3 w-20 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /></div>
                                <div className="px-4 flex items-center gap-1.5"><div className={cn("w-3 h-3 rounded-full animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /><div className={cn("h-3 w-24 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /></div>
                                <div className="px-4 flex justify-end pr-5"><div className={cn("h-3 w-12 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /></div>
                            </div>
                        ))}</div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3">
                            {showArchived
                                ? <p className={cn("text-[13px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No archived invoices.</p>
                                : <>
                                    <Receipt size={32} strokeWidth={1} className={isDark ? "text-[#333]" : "text-[#ccc]"} />
                                    <p className={cn("text-[13px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No invoices found.</p>
                                    <button onClick={() => setShowCreateModal(true)} className="px-4 py-1.5 text-[12px] font-semibold text-black bg-[#4dbf39] rounded-lg hover:bg-[#59d044] transition-colors">+ New Invoice</button>
                                </>}
                        </div>
                    ) : (
                        <>
                            {filtered.map(inv => {
                                const isSelected = selectedIds.has(inv.id);
                                return (
                                    <div key={inv.id} onClick={() => router.push(`/invoices/${inv.id}`)}
                                        className={cn("grid px-0 border-b text-[12px] cursor-pointer group transition-colors",
                                            isDark ? "border-[#1f1f1f] hover:bg-white/[0.025]" : "bg-white border-[#f0f0f0] hover:bg-[#fafafa]",
                                            isSelected && (isDark ? "bg-blue-900/10" : "bg-blue-50/40"))}
                                        style={{ gridTemplateColumns: gridTemplate }}>
                                        
                                        <div className="flex items-center justify-center px-0 py-3 self-stretch" onClick={e => toggleRow(inv.id, e)}>
                                            <Chk checked={isSelected} isDark={isDark} />
                                        </div>
                                        <div className={cn("flex items-center px-4 py-3 font-bold", isDark ? "text-white" : "text-black")}>
                                            {inv.id?.slice(-6).toUpperCase() ?? '—'}
                                        </div>
                                        <div className="flex items-center px-4 py-3">
                                            <StatusCell status={inv.status} onStatusChange={(s) => updateInvoice(inv.id, { status: s })} isDark={isDark} />
                                        </div>
                                        <div className={cn("flex items-center px-4 py-3 gap-1", isDark ? "text-[#777]" : "text-[#888]")}>
                                            <span>{fmtDate(inv.issue_date)}</span>
                                            <span className="text-[10px] opacity-50">({timeAgo(inv.issue_date)})</span>
                                        </div>
                                        <div className={cn("flex items-center px-4 py-3 gap-1", isDark ? "text-[#777]" : "text-[#888]")}>
                                            {inv.due_date ? <span>{fmtDate(inv.due_date)} <span className="text-[10px] opacity-50">({timeAgo(inv.due_date)})</span></span> : '—'}
                                        </div>
                                        <div className={cn("flex items-stretch", isDark ? "text-[#888]" : "text-[#666]")}>
                                            <ClientCell
                                                currentName={inv.client_name}
                                                currentId={inv.client_id}
                                                onClientChange={(id, name) => updateInvoice(inv.id, { client_id: id, client_name: name })}
                                                isDark={isDark}
                                                variant="table"
                                            />
                                        </div>
                                        <div className={cn("flex items-center justify-end px-4 py-3 gap-1.5 font-semibold tabular-nums pr-5", isDark ? "text-[#ccc]" : "text-[#333]")}>
                                            {fmt$(Number(inv.amount || 0))}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={e => { e.stopPropagation(); handleArchive(inv.id); }} title={archivedIds.has(inv.id) ? 'Unarchive' : 'Archive'}
                                                    className={cn("w-6 h-6 rounded flex items-center justify-center transition-all",
                                                        isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/8" : "text-[#bbb] hover:text-[#555] hover:bg-[#f0f0f0]")}>
                                                    {archivedIds.has(inv.id) ? <ArchiveRestore size={11} /> : <Archive size={11} />}
                                                </button>
                                                <button onClick={e => { e.stopPropagation(); setDeletingId(inv.id); }} title="Delete"
                                                    className={cn("w-6 h-6 rounded flex items-center justify-center transition-all",
                                                        isDark ? "text-[#555] hover:text-red-400 hover:bg-red-500/10" : "text-[#bbb] hover:text-red-500 hover:bg-red-50")}>
                                                    <Trash2 size={11} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {!isLoading && !showArchived && (
                                <button onClick={() => setShowCreateModal(true)}
                                    className={cn("flex items-center gap-1 px-4 py-3 w-full text-left text-[12px] font-medium transition-colors border-b",
                                        isDark ? "text-[#555] border-[#1f1f1f] hover:text-[#aaa] hover:bg-white/[0.02]" : "text-[#aaa] border-[#f0f0f0] hover:text-[#555] hover:bg-[#fafafa]")}>
                                    <div className={cn("w-4 h-4 flex items-center justify-center rounded border border-dashed", isDark ? "border-[#444]" : "border-[#ccc]")}>
                                        <Plus size={10} />
                                    </div>
                                    <span>Create invoice</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            ) : (
                /* ── Cards view (Grid) ── */
                <div className={cn("flex-1 overflow-y-auto p-4", isDark ? "bg-[#0f0f0f]" : "bg-[#f0f0f0]")}>
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className={cn("rounded-[8px] border flex flex-col pointer-events-none", isDark ? "border-[#2e2e2e] bg-[#1a1a1a]" : "border-transparent bg-white shadow-sm")}>
                                    <div className={cn("flex items-center justify-between px-4 py-3 border-b", isDark ? "border-[#2e2e2e]" : "border-[#f0f0f0]")}>
                                        <div className={cn("h-3 w-12 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                                        <div className={cn("w-3.5 h-3.5 rounded-[3px] animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                                    </div>
                                    <div className="px-4 py-2.5 flex flex-col gap-3">
                                        <div className="flex items-center gap-3 py-1">
                                            <div className={cn("w-[90px] h-2.5 rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                                            <div className={cn("flex-1 h-3 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                                        </div>
                                        <div className="flex items-center gap-3 py-1">
                                            <div className={cn("w-[90px] h-2.5 rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                                            <div className={cn("w-20 h-3 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                                        </div>
                                        <div className="flex items-center gap-3 py-1">
                                            <div className={cn("w-[90px] h-2.5 rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                                            <div className={cn("w-24 h-3 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                                        </div>
                                        <div className="flex items-center gap-3 py-1">
                                            <div className={cn("w-[90px] h-2.5 rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                                            <div className={cn("w-12 h-3 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3">
                            {showArchived
                                ? <p className={cn("text-[13px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No archived invoices.</p>
                                : <>
                                    <Receipt size={32} strokeWidth={1} className={isDark ? "text-[#333]" : "text-[#ccc]"} />
                                    <p className={cn("text-[13px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No invoices found.</p>
                                    <button onClick={() => setShowCreateModal(true)} className="px-4 py-1.5 text-[12px] font-semibold text-black bg-[#4dbf39] rounded-lg hover:bg-[#59d044] transition-colors">+ New Invoice</button>
                                </>}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                            {filtered.map(inv => (
                                <InvoiceCard key={inv.id} i={inv}
                                    onOpen={() => router.push(`/invoices/${inv.id}`)}
                                    onArchive={() => handleArchive(inv.id)}
                                    onStatusChange={(s) => updateInvoice(inv.id, { status: s })}
                                    onClientChange={(id, name) => updateInvoice(inv.id, { client_id: id, client_name: name })}
                                    isSelected={selectedIds.has(inv.id)}
                                    onToggle={() => {
                                        const n = new Set(selectedIds);
                                        n.has(inv.id) ? n.delete(inv.id) : n.add(inv.id);
                                        setSelectedIds(n);
                                    }}
                                    isDark={isDark} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            <CreateInvoiceModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
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
                        const count = ids.length;
                        for (const id of ids) {
                            await deleteInvoice(id);
                        }
                        setSelectedIds(new Set());
                        gooeyToast.error(`${count} invoice${count !== 1 ? 's' : ''} deleted`);
                    } else if (deletingId) {
                        deleteInvoice(deletingId);
                        gooeyToast.error('Invoice deleted');
                    }
                    setDeletingId(null);
                }}
            />
        </div>
    );
}
