"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useInvoiceStore, InvoiceStatus, Invoice } from '@/store/useInvoiceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useClientStore } from '@/store/useClientStore';
import { useMenuStore } from '@/store/useMenuStore';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { getStatusColors } from '@/lib/statusConfig';
import {
    Search, Table2, LayoutGrid, Edit3, ChevronDown,
    ArrowUpDown, Archive, ArrowRightLeft, Download, Upload, Plus, User, Filter,
    Calendar, Check, X, ArchiveRestore, Receipt, ChevronsUpDown, CheckCircle, SlidersHorizontal, ChevronRight,
    FileJson, FileSpreadsheet, Link2, Copy, Trash2, ExternalLink, Send, Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InlineDeleteButton } from '@/components/ui/InlineDeleteButton';
import { ThreeDotMenu, ContextMenuRow, ContextMenuItem } from '@/components/ui/RowContextMenu';
import { useRouter } from 'next/navigation';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { SendEmailModal } from '@/components/modals/SendEmailModal';
import { appToast } from '@/lib/toast';
import { Tooltip } from '@/components/ui/Tooltip';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SearchInput } from '@/components/ui/SearchInput';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { DataTable, DataTableColumn } from '@/components/ui/DataTable';
import { MoneyAmount, convertAmount, formatAmount, formatAmountOnly, getCurrencySymbol } from '@/components/ui/MoneyAmount';
import { FilterPanel, FilterButton, SavedFilterPills } from '@/components/ui/FilterPanel';
import { FilterField, FilterRow, SavedFilter, applyFilters } from '@/lib/filterUtils';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { usePersistentState } from '@/hooks/usePersistentState';
import { Dropdown, DItem } from '@/components/ui/Dropdown';
import { ToolbarButton as TbBtn } from '@/components/ui/ToolbarButton';
import { Checkbox as Chk } from '@/components/ui/Checkbox';
import { CardRow } from '@/components/ui/CardRow';
import { ClientCell } from '@/components/ui/ClientCell';
import { StatusCell } from '@/components/ui/StatusCell';
import { fmtDate, timeAgo } from '@/lib/dateUtils';
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
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';



/* â”€â”€â”€ Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */




function InvoiceCard({ i, onOpen, onArchive, isDark, onStatusChange, isSelected, onToggle, onAssignClients, customStatuses = [], menuItems }: {
    i: Invoice; onOpen: () => void; onArchive: () => void; isDark: boolean;
    onStatusChange: (s: InvoiceStatus) => void; isSelected: boolean; onToggle: () => void;
    onAssignClients: (clients: { id: string; name: string; avatar_url?: string | null }[]) => void;
    customStatuses: any[];
    menuItems: any[];
}) {
    return (
        <ContextMenuRow 
            items={menuItems} 
            isDark={isDark} 
            onRowClick={onOpen}
            className="h-full"
        >
            <div
                onClick={onOpen}
                className={cn(
                    "relative rounded-[8px] border cursor-pointer transition-all duration-150 group flex flex-col h-full",
                    isDark ? "bg-[#1a1a1a] border-[#2e2e2e] hover:border-[#444]"
                        : "bg-white border-transparent hover:shadow-sm"
                )}
            >
                {/* Header */}
                <div className={cn("flex items-center justify-between px-4 py-3 border-b", isDark ? "border-[#2e2e2e]" : "border-[#f0f0f0]")}>
                    <div className={cn("font-bold text-[14px] tracking-tight text-primary uppercase")}>
                        {i.invoice_number || i.id?.slice(-6).toUpperCase() || '—'}
                    </div>
                    <div onClick={(e) => { e.stopPropagation(); onToggle(); }} className="cursor-pointer">
                        <Chk checked={isSelected} isDark={isDark} />
                    </div>
                </div>

                {/* Body */}
                <div className="px-4 py-1.5 flex flex-col">
                    <CardRow label="Client" isDark={isDark}>
                        <ClientCell
                            assignedClients={i.meta?.assignedClients}
                            currentName={i.client_name}
                            currentId={i.client_id}
                            onAssignClients={onAssignClients}
                            isDark={isDark}
                            variant="card"
                        />
                    </CardRow>

                    <CardRow label="Expiration date" isDark={isDark}>
                        {i.due_date ? <span>{fmtDate(i.due_date)} <span className="opacity-60 font-normal">({timeAgo(i.due_date)})</span></span> : ''}
                    </CardRow>

                    {i.paid_at && (
                        <CardRow label="Payment date" isDark={isDark}>
                            <div className="flex items-center gap-1.5 text-green-500 font-bold">
                                <CheckCircle size={10} />
                                <span>{fmtDate(i.paid_at)}</span>
                            </div>
                        </CardRow>
                    )}

                    <CardRow label="Issue date" isDark={isDark}>
                        {i.issue_date ? <span>{fmtDate(i.issue_date)} <span className="opacity-60 font-normal">({timeAgo(i.issue_date)})</span></span> : ''}
                    </CardRow>

                    <CardRow label="Total" isDark={isDark}>
                        <MoneyAmount amount={Number(i.amount || 0)} currency={i.meta?.currency} showBadge />
                    </CardRow>

                    <CardRow label="Status" isDark={isDark} noBorder>
                        <div onClick={(e) => e.stopPropagation()}>
                            <StatusCell status={i.status} onStatusChange={onStatusChange} isDark={isDark} customStatuses={customStatuses} />
                        </div>
                    </CardRow>
                </div>

                {/* Quick actions */}
                <div className="absolute top-2.5 right-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                        onClick={e => { e.stopPropagation(); window.open(window.location.origin + '/p/invoice/' + i.id, '_blank'); }}
                        title="Open Link"
                        className={cn("w-6 h-6 rounded flex items-center justify-center transition-all",
                            isDark ? "bg-[#2a2a2a] text-[#888] hover:text-[#ccc]" : "bg-white border border-[#e0e0e0] shadow-sm text-[#666] hover:bg-[#fafafa]")}
                    >
                        <ExternalLink size={11} />
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); onArchive(); }}
                        title="Archive"
                        className={cn("w-6 h-6 rounded flex items-center justify-center transition-all",
                            isDark ? "bg-[#2a2a2a] text-[#888] hover:text-[#ccc]" : "bg-white border border-[#e0e0e0] shadow-sm text-[#666] hover:bg-[#fafafa]")}
                    >
                        <Archive size={11} />
                    </button>
                </div>
            </div>
        </ContextMenuRow>
    );
}

/* â”€â”€â”€ Mobile invoice list item â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function MobileInvoiceRow({ inv, onOpen, isDark, onStatusChange, onArchive, isArchived }: {
    inv: Invoice; onOpen: () => void; isDark: boolean;
    onStatusChange: (s: InvoiceStatus) => void;
    onArchive: () => void; isArchived: boolean;
}) {
    const sc = getStatusColors(inv.status);
    return (
        <div
            onClick={onOpen}
            className={cn(
                "flex items-center gap-3 px-4 py-3.5 border-b cursor-pointer active:opacity-70 transition-opacity",
                isDark ? "border-[#1f1f1f] bg-[#141414]" : "border-[#f0f0f0] bg-white"
            )}
        >
            {/* Status accent bar */}
            <div
                className="w-[3px] h-10 rounded-full shrink-0"
                style={{ backgroundColor: getStatusColors(inv.status).bar }}
            />
            {/* Main info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={cn("font-semibold text-[13.5px] truncate", isDark ? "text-white" : "text-[#111]")}>
                        {inv.title || 'New Invoice'}
                    </span>
                    <span 
                        style={sc.dynamic ? { backgroundColor: sc.dynamic.bg, color: sc.dynamic.text, borderColor: sc.dynamic.border } : {}}
                        className={cn(
                            "text-[10px] font-bold px-2.5 py-1 rounded-[6px] shrink-0 border transition-all",
                            !sc.dynamic ? (isDark ? "bg-white/[0.05] border-white/10 text-white/40" : cn(sc.badge, sc.badgeText, sc.badgeBorder)) : ""
                        )}
                    >
                        {inv.status}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className={cn("flex items-center gap-1 text-[11.5px]", isDark ? "text-[#666]" : "text-[#999]")}>
                        <User size={10} className="opacity-60" />
                        <span className="truncate max-w-[120px]">{inv.client_name || '—'}</span>
                    </div>
                    <span className={cn("text-[11px]", isDark ? "text-[#555]" : "text-[#bbb]")}>
                        {inv.status === 'Paid' && inv.paid_at ? (
                             <span className="text-green-500 font-bold flex items-center gap-1">
                                 <Check size={10} /> {fmtDate(inv.paid_at)}
                             </span>
                        ) : inv.due_date ? fmtDate(inv.due_date) : '—'}
                    </span>
                </div>
            </div>
            {/* Amount */}
            <div className="shrink-0 text-right">
                <div className={cn("text-[13px] font-bold tabular-nums", isDark ? "text-[#ddd]" : "text-[#222]")}>
                    <MoneyAmount amount={Number(inv.amount || 0)} currency={inv.meta?.currency} showBadge />
                </div>
                <ChevronRight size={14} className={cn("ml-auto mt-0.5", isDark ? "text-[#444]" : "text-[#ccc]")} />
            </div>
        </div>
    );
}

/* ──────────────────────────────── Main page ──────────────────────────────── */
export default function InvoicesPage() {
    const router = useRouter();
    const { navItems } = useMenuStore();
    const { theme, setImportModalOpen, activeWorkspaceId, setCreateModalOpen, pageViews, setPageView } = useUIStore();
    const { invoices, fetchInvoices, updateInvoice, addInvoice, deleteInvoice, isLoading } = useInvoiceStore();
    const { statuses, fetchStatuses } = useSettingsStore();
    const { clients, fetchClients } = useClientStore();

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchStatuses(activeWorkspaceId);
            fetchInvoices();
            fetchClients();
        }
    }, [activeWorkspaceId, fetchStatuses, fetchInvoices, fetchClients]);

    const customStatuses = useMemo(() => statuses.filter((s: any) => s.tool === 'invoices'), [statuses]);
    const activeStatues = useMemo(() => customStatuses.filter((s: any) => s.is_active).sort((a: any, b: any) => a.position - b.position), [customStatuses]);

    const isDark = theme === 'dark';
    const isMobile = useIsMobile();
    const view = (pageViews['invoices'] as 'table' | 'cards') || 'table';
    const setView = (v: 'table' | 'cards') => setPageView('invoices', v);
    const [importExportOpen, setImportExportOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    /* ... existing state ... */
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        select: 44,
        name: 240,
        status: 160,
        issue: 180,
        due: 180,
        paid: 180,
        client: 180,
        amount: 220
    });
    const [columnOrder, setColumnOrder] = useState<string[]>(['name', 'client', 'status', 'issue', 'due', 'paid']);

    useEffect(() => {
        const savedWidths = localStorage.getItem('invoice_col_widths');
        if (savedWidths) setColWidths(prev => ({ ...prev, ...JSON.parse(savedWidths) }));

        const savedOrder = localStorage.getItem('invoice_col_order');
        if (savedOrder) {
            const parsed = JSON.parse(savedOrder) as string[];
            if (!parsed.includes('paid')) {
                const dueIdx = parsed.indexOf('due');
                if (dueIdx !== -1) {
                    parsed.splice(dueIdx + 1, 0, 'paid');
                } else {
                    parsed.push('paid');
                }
            }
            setColumnOrder(parsed);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('invoice_col_widths', JSON.stringify(colWidths));
    }, [colWidths]);

    useEffect(() => {
        localStorage.setItem('invoice_col_order', JSON.stringify(columnOrder));
    }, [columnOrder]);



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

    const gridTemplate = `${colWidths.select}px ${columnOrder.map(c => `${colWidths[c as keyof typeof colWidths]}px`).join(' ')} minmax(${colWidths.amount}px, 1fr)`;
    const [statusFilter, setStatusFilter] = usePersistentState<string | 'All'>('invoices_filter_status', 'All');
    const [searchQuery, setSearchQuery] = usePersistentState('invoices_filter_search', '');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showArchived, setShowArchived] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    /* Dropdowns */
    const [filterOpen, setFilterOpen] = useState(false);
    const [orderOpen, setOrderOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [orderBy, setOrderBy] = usePersistentState<'created_at' | 'issue_date' | 'amount'>('invoices_filter_order', 'created_at');

    /* Local archive state (optimistic) */
    const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());

    /* â”€â”€ Advanced Filters â”€â”€ */
    const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
    const [filterRows, setFilterRows] = usePersistentState<FilterRow[]>('invoices_filter_rows', []);
    const [activeFilterId, setActiveFilterId] = usePersistentState<string | null>('invoices_active_filter_id', null);
    const { saved: savedFilters, save: saveFilter, remove: deleteSavedFilter } = useSavedFilters('invoices');

    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [sendingItem, setSendingItem] = useState<Invoice | null>(null);
    const [sendingTemplateKey, setSendingTemplateKey] = useState<'invoice' | 'receipt'>('invoice');

    const handleSend = (i: Invoice, type: 'invoice' | 'receipt' = 'invoice') => {
        setSendingItem(i);
        setSendingTemplateKey(type);
        setIsSendModalOpen(true);
    };

    const INVOICE_FILTER_FIELDS = useMemo<FilterField[]>(() => [
        { key: 'status',      label: 'Status',          type: 'enum',   options: activeStatues.map(s => s.name) },
        { key: 'client_name', label: 'Client',          type: 'enum',   options: Array.from(new Set(clients.map((c: any) => c.contact_person || c.company_name).filter(Boolean))).sort() },
        { key: 'issue_date',  label: 'Issue date',      type: 'date' },
        { key: 'due_date',    label: 'Expiration date', type: 'date' },
        { key: 'paid_at',     label: 'Payment date',    type: 'date' },
        { key: 'amount',      label: 'Amount',          type: 'number' },
    ], [activeStatues, clients]);

    useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

    const baseFiltered = useMemo(() => {
        let r = invoices.filter(inv => {
            if (showArchived) return archivedIds.has(inv.id);
            if (archivedIds.has(inv.id)) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const idMatch = inv.id?.toLowerCase().slice(-6).includes(q);
                const numMatch = inv.invoice_number?.toLowerCase().includes(q);
                if (!inv.title?.toLowerCase().includes(q) && !inv.client_name?.toLowerCase().includes(q) && !idMatch && !numMatch) return false;
            }
            return true;
        });
        
        // Apply advanced filters
        return applyFilters(r, filterRows, INVOICE_FILTER_FIELDS);
    }, [invoices, searchQuery, filterRows, INVOICE_FILTER_FIELDS, archivedIds, showArchived]);

    const filtered = useMemo(() => {
        let r = baseFiltered;
        if (statusFilter !== 'All') {
            r = r.filter(inv => inv.status === statusFilter);
        }

        if (orderBy === 'issue_date') r = [...r].sort((a, b) => new Date(b.issue_date || 0).getTime() - new Date(a.issue_date || 0).getTime());
        else if (orderBy === 'amount') r = [...r].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
        else r = [...r].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        return r;
    }, [baseFiltered, statusFilter, orderBy]);

    const stats = useMemo(() => {
        const s: Record<string, { count: number; amount: number }> = {
            All: { count: 0, amount: 0 }
        };
        
        // Initialize with active statuses
        activeStatues.forEach(st => s[st.name] = { count: 0, amount: 0 });

        baseFiltered.forEach((inv: any) => {
            s.All.count++; s.All.amount += Number(inv.amount || 0);
            if (!s[inv.status]) s[inv.status] = { count: 0, amount: 0 };
            s[inv.status].count++; s[inv.status].amount += Number(inv.amount || 0);
        });
        return s;
    }, [baseFiltered, activeStatues]);

    const handleDuplicate = async (id: string) => {
        const original = invoices.find(inv => inv.id === id);
        if (!original) return;
        const promise = (async () => {
            const { id: _, created_at: __, ...payload } = original;
            await addInvoice({
                ...payload,
                title: `${original.title || 'Invoice'} (Copy)`,
                status: 'Draft'
            });
        })();
        appToast.promise(promise, {
            loading: 'Duplicating invoiceâ€¦',
            success: 'Invoice duplicated',
            error: 'Duplication failed',
        });
    };

    const displayCurrency = useMemo(() => {
        if (filtered.length === 0) return 'USD';
        const first = filtered[0].meta?.currency || 'USD';
        const allSame = filtered.every(inv => (inv.meta?.currency || 'USD') === first);
        return allSame ? first : 'USD';
    }, [filtered]);

    const toggleAll = () => setSelectedIds(selectedIds.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(i => i.id)));
    const toggleRow = (id: string, e: React.MouseEvent) => { e.stopPropagation(); const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };
    const isAllSelected = filtered.length > 0 && selectedIds.size === filtered.length;

    const handleArchive = (id: string) => {
        const next = new Set(archivedIds);
        const isCurrentlyArchived = next.has(id);
        isCurrentlyArchived ? next.delete(id) : next.add(id);
        setArchivedIds(next);
        appToast.success(isCurrentlyArchived ? 'Restored from archive' : 'Moved to archive');
    };
    const handleBulkArchive = () => {
        const next = new Set(archivedIds);
        selectedIds.forEach(id => next.add(id));
        setArchivedIds(next);
        const count = selectedIds.size;
        setSelectedIds(new Set());
        appToast.success(`${count} invoice${count !== 1 ? 's' : ''} archived`);
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
        appToast.promise(promise, {
            loading: `Duplicating ${ids.length} invoice${ids.length !== 1 ? 's' : ''}â€¦`,
            success: `${ids.length} invoice${ids.length !== 1 ? 's' : ''} duplicated`,
            error: 'Duplication failed',
        });
        await promise;
        setSelectedIds(new Set());
    };

    const handleExportJSON = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(invoices));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", `invoices_export_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        appToast.success('Exported successfully');
        setImportExportOpen(false);
    };

    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (Array.isArray(json)) {
                    const promise = (async () => {
                        for (const item of json) {
                            const { id, created_at, workspace_id, ...payload } = item;
                            await addInvoice(payload);
                        }
                    })();
                    appToast.promise(promise, {
                        loading: 'Importing invoices...',
                        success: 'Imported successfully',
                        error: 'Import failed'
                    });
                    await promise;
                }
            } catch (error) {
                appToast.error("Error", 'Invalid JSON file');
            }
        };
        reader.readAsText(file);
        if (e.target) e.target.value = ''; // Reset input
    };

    const border = isDark ? "border-[#252525]" : "border-[#ebebeb]";

    return (
        <div className={cn("flex flex-col h-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-[#f7f7f7] text-[#111]")}>

            {/* ── Page header — hidden on mobile (MobileTopBar handles title) ── */}
            <div className={cn("hidden md:flex items-center justify-between px-5 py-3 shrink-0", isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-white")}>
                <h1 className="text-[15px] font-semibold tracking-tight">{navItems.find(item => item.href === '/invoices')?.label || 'Invoices'}</h1>
            </div>

            {/* â”€â”€ Toolbar â”€â”€ */}
            {isMobile ? (
                /* â”€â”€ Mobile toolbar: compact row with search + filter sheet â”€â”€ */
                <div className={cn("flex items-center gap-2 px-3 py-2 shrink-0 border-b",
                    isDark ? "border-[#252525] bg-[#141414]" : "border-[#f0f0f0] bg-white")}>
                    {/* Search */}
                    <div className={cn("relative flex-1")}>
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" size={12} />
                        <input
                            type="text"
                            placeholder="Search invoices..."
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
                                filterOpen
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
                            <div className={cn("px-3.5 py-2.5 border-t border-b text-[11px] font-semibold", isDark ? "border-[#2e2e2e] text-[#666]" : "border-[#f0f0f0] text-[#aaa]")}>SORT BY</div>
                            <div className="py-1">
                                <DItem label="Creation date" active={orderBy === 'created_at'} onClick={() => { setOrderBy('created_at'); setFilterOpen(false); }} isDark={isDark} />
                                <DItem label="Issue date" active={orderBy === 'issue_date'} onClick={() => { setOrderBy('issue_date'); setFilterOpen(false); }} isDark={isDark} />
                                <DItem label="Total amount" active={orderBy === 'amount'} onClick={() => { setOrderBy('amount'); setFilterOpen(false); }} isDark={isDark} />
                            </div>
                        </Dropdown>
                    </div>

                </div>
            ) : (
                /* â”€â”€ Desktop toolbar â”€â”€ */
                <div className={cn("flex items-center gap-1 px-4 py-1.5 shrink-0", isDark ? "border-b border-[#252525]" : "")}>
                    {/* View Settings on Left */}
                    <div className="flex items-center gap-1">
                        <div className="relative">
                            <FilterButton
                                activeCount={filterRows.filter(r => r.field && r.value != null && r.value !== '' && !(Array.isArray(r.value) && r.value.length === 0)).length}
                                onClick={() => setFilterOpen(v => !v)}
                                isDark={isDark}
                            />
                            <Dropdown open={filterOpen} onClose={() => setFilterOpen(false)} isDark={isDark} align="left">
                                <div className="py-1 min-w-[160px]">
                                    <div className={cn("px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider", isDark ? "text-[#666]" : "text-[#aaa]")}>Custom Filter</div>
                                    <div 
                                        onClick={() => { setFilterOpen(false); setAdvancedFilterOpen(true); }}
                                        className={cn("flex items-center gap-2 px-3.5 py-2.5 cursor-pointer transition-colors hover:bg-black/5", isDark ? "hover:bg-white/5" : "")}>
                                        <Plus size={11} className="opacity-40" />
                                        <span className={cn("text-[11px] font-medium", isDark ? "text-[#777]" : "text-[#aaa]")}>
                                            {filterRows.length > 0 ? "Edit active filter" : "New filter"}
                                        </span>
                                    </div>

                                    {filterRows.length > 0 && !activeFilterId && (
                                        <div 
                                            onClick={() => { setFilterRows([]); setFilterOpen(false); }}
                                            className={cn("flex items-center gap-2 px-3.5 py-2 cursor-pointer transition-colors hover:bg-black/5", isDark ? "hover:bg-white/5 text-red-400" : "text-red-500")}>
                                            <X size={11} className="opacity-70" />
                                            <span className="text-[11px] font-medium">Clear active filters</span>
                                        </div>
                                    )}
                                    
                                    {savedFilters.length > 0 && (
                                        <>
                                            <div className={cn("h-px my-1", isDark ? "bg-[#252525]" : "bg-[#efefef]")} />
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
                                                    setFilterOpen(false); 
                                                }}
                                                onDelete={(id) => { deleteSavedFilter(id); if (activeFilterId === id) { setActiveFilterId(null); } }}
                                                onClear={() => { setFilterRows([]); setActiveFilterId(null); setFilterOpen(false); }}
                                                isDark={isDark}
                                            />
                                        </>
                                    )}
                                </div>
                            </Dropdown>

                            {advancedFilterOpen && (
                                <FilterPanel
                                    fields={INVOICE_FILTER_FIELDS}
                                    rows={filterRows}
                                    savedFilters={savedFilters}
                                    onChange={setFilterRows}
                                    onApply={(rows) => { setFilterRows(rows); setActiveFilterId(null); }}
                                    onSave={(name, rows) => { const f = saveFilter(name, rows); setFilterRows(rows); setActiveFilterId(f.id); }}
                                    onLoadSaved={(f) => { setFilterRows(f.rows); setActiveFilterId(f.id); setAdvancedFilterOpen(false); }}
                                    onDeleteSaved={(id) => { deleteSavedFilter(id); if (activeFilterId === id) setActiveFilterId(null); }}
                                    isDark={isDark}
                                    onClose={() => setAdvancedFilterOpen(false)}
                                />
                            )}
                        </div>

                        <div className={cn("w-[1px] h-4 mx-0.5", isDark ? "bg-[#2e2e2e]" : "bg-[#e0e0e0]")} />

                        {/* Order */}
                        <div className="relative">
                            <TbBtn label="Order" icon={<ArrowUpDown size={11} />} hasArrow onClick={() => setOrderOpen(v => !v)} isDark={isDark} active={orderOpen} />
                            <Dropdown open={orderOpen} onClose={() => setOrderOpen(false)} isDark={isDark} align="left">
                                <div className="py-1">
                                    <DItem label="Creation date" active={orderBy === 'created_at'} onClick={() => { setOrderBy('created_at'); setOrderOpen(false); }} isDark={isDark} />
                                    <DItem label="Issue date" active={orderBy === 'issue_date'} onClick={() => { setOrderBy('issue_date'); setOrderOpen(false); }} isDark={isDark} />
                                    <DItem label="Total amount" active={orderBy === 'amount'} onClick={() => { setOrderBy('amount'); setOrderOpen(false); }} isDark={isDark} />
                                </div>
                            </Dropdown>
                        </div>

                        <div className={cn("w-[1px] h-4 mx-0.5", isDark ? "bg-[#2e2e2e]" : "bg-[#e0e0e0]")} />

                        <TbBtn label="Archived" icon={showArchived ? <ArchiveRestore size={11} /> : <Archive size={11} />}
                            active={showArchived} onClick={() => { setShowArchived(v => !v); setSelectedIds(new Set()); }} isDark={isDark} />
                    </div>

                    <div className="flex-1" />

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-3">
                        <SearchInput 
                            value={searchQuery} 
                            onChange={setSearchQuery} 
                            isDark={isDark} 
                        />
                        
                        <div className={cn('w-[1px] h-4', isDark ? 'bg-[#2e2e2e]' : 'bg-[#e0e0e0]')}/>

                        <ViewToggle 
                            view={view} 
                            onViewChange={setView} 
                            isDark={isDark} 
                            options={[
                                { id: 'table', icon: <Table2 size={12}/> },
                                { id: 'cards', icon: <LayoutGrid size={12}/> }
                            ]}
                        />

                        <div className={cn('w-[1px] h-4', isDark ? 'bg-[#2e2e2e]' : 'bg-[#e0e0e0]')}/>

                        <div className="relative">
                            <TbBtn label="Import / Export" icon={<ArrowRightLeft size={11} />} hasArrow onClick={() => setImportExportOpen(v => !v)} isDark={isDark} />
                            <Dropdown open={importExportOpen} onClose={() => setImportExportOpen(false)} isDark={isDark} align="right">
                                <div className="py-1">
                                    <DItem label="Import CSV" icon={<Download size={12} />} onClick={() => { setImportModalOpen(true, 'Invoice'); setImportExportOpen(false); }} isDark={isDark} />
                                    <DItem label="Import JSON" icon={<Download size={12} />} onClick={() => { fileInputRef.current?.click(); setImportExportOpen(false); }} isDark={isDark} />
                                    <DItem label="Export JSON" icon={<Upload size={12} />} onClick={handleExportJSON} isDark={isDark} />
                                </div>
                            </Dropdown>
                            <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
                        </div>
                    </div>


                    {/* Bulk banner */}
                    {selectedIds.size > 0 && (
                        <div className={cn("flex items-center gap-4 px-3 py-1 rounded-lg text-[11px] font-medium border",
                            isDark ? "bg-[#1c1c1c] border-[#2e2e2e] text-[#aaa]" : "bg-[#f8f8f8] border-[#e8e8e8] text-[#666]")}>
                            <span className="opacity-50">{selectedIds.size} selected</span>
                            <div className={cn("w-[1px] h-3", isDark ? "bg-[#333]" : "bg-[#ddd]")} />
                            <div className="flex items-center gap-3">
                                <Tooltip content="Duplicate" side="bottom">
                                    <button onClick={handleBulkDuplicate} className="hover:text-blue-500 flex items-center gap-1.5 transition-colors">
                                        <Copy size={11} className="opacity-70" />Duplicate
                                    </button>
                                </Tooltip>
                                <Tooltip content="Archive" side="bottom">
                                    <button onClick={handleBulkArchive} className="hover:text-blue-500 flex items-center gap-1.5 transition-colors">
                                        <Archive size={11} className="opacity-70" />Archive
                                    </button>
                                </Tooltip>
                                <Tooltip content="Delete" side="bottom">
                                    <button onClick={handleBulkDelete} className="hover:text-red-500 flex items-center gap-1.5 transition-colors text-red-500/80">
                                        <Trash2 size={11} className="opacity-70" />Delete
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* â”€â”€ Status bar â”€â”€ */}
            {isMobile ? (
                /* Mobile: horizontally scrollable pill tabs */
                <div className={cn(
                    "flex gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar shrink-0 border-b",
                    isDark ? "border-[#252525] bg-[#141414]" : "border-[#f0f0f0] bg-white"
                )}>
                    <TbBtn label={`All (${stats.All.count})`} active={statusFilter === 'All'} onClick={() => setStatusFilter('All')} isDark={isDark} />
                    {activeStatues.map(s => (
                        <TbBtn 
                            key={s.id} 
                            label={`${s.name} (${stats[s.name]?.count || 0})`} 
                            active={statusFilter === s.name} 
                            onClick={() => setStatusFilter(s.name as any)} 
                            isDark={isDark} 
                        />
                    ))}
                    <div className={cn("w-[1px] h-3 mx-1", isDark ? "bg-white/10" : "bg-black/10")} />
                    <TbBtn 
                        label="Archived" 
                        icon={<Archive size={11} />} 
                        active={showArchived} 
                        onClick={() => setShowArchived(!showArchived)} 
                        isDark={isDark} 
                        activeColor="bg-amber-500/10 text-amber-500"
                    />
                </div>
            ) : (
                /* Desktop: full-width colored bar */
                <div className="flex items-stretch h-[26px] shrink-0">
                    <button onClick={() => { setStatusFilter('All'); setShowArchived(false); }}
                        className={cn("flex-1 flex items-center justify-start gap-1.5 px-2.5 text-[10px] font-semibold transition-all hover:brightness-110",
                            statusFilter === 'All' ? (isDark ? "bg-[#333] text-white" : "bg-[#e0e0e0] text-black") : (isDark ? "bg-[#252525] text-[#666]" : "bg-[#f0f0f0] text-[#aaa]"))}>
                        <span className="font-bold tabular-nums">{stats.All.count}</span>
                        <span className="opacity-80 font-medium">Invoices</span>
                        {stats.All.amount > 0 && <span className="ml-auto font-bold tabular-nums opacity-90 text-[9px]"><MoneyAmount amount={stats.All.amount} currency={displayCurrency} /></span>}
                    </button>
                    {activeStatues.map(s => {
                        const st = stats[s.name] || { count: 0, amount: 0 };
                        const isActive = statusFilter === s.name;
                        return (
                            <button key={s.id} onClick={() => { setStatusFilter(s.name); setShowArchived(false); }}
                                style={isActive ? { backgroundColor: s.color } : {}}
                                className={cn("flex-1 flex items-center justify-start gap-1.5 px-2.5 text-[10px] font-semibold transition-all hover:brightness-110",
                                    isActive ? "text-white" : (isDark ? "bg-[#252525] text-[#666]" : "bg-[#f0f0f0] text-[#aaa]"))}>
                                <span className="font-bold tabular-nums">{st.count}</span>
                                <span className="opacity-80 font-medium">{s.name}</span>
                                {st.amount > 0 && <span className="ml-auto font-bold tabular-nums opacity-90 text-[9px]"><MoneyAmount amount={st.amount} currency={displayCurrency} /></span>}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* â”€â”€ Content â”€â”€ */}
            {/* On mobile: always show the mobile list view regardless of 'view' setting */}
            {isMobile ? (
                /* â”€â”€ Mobile list view â”€â”€ */
                <div className={cn("flex-1 overflow-y-auto", isDark ? "bg-[#141414]" : "bg-[#fafafa]")}>
                    {isLoading ? (
                        <div className="flex flex-col">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className={cn("flex items-center gap-3 px-4 py-3.5 border-b",
                                    isDark ? "border-[#1f1f1f]" : "border-[#f0f0f0]")}>
                                    <div className={cn("w-[3px] h-10 rounded-full animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                                    <div className="flex-1">
                                        <div className={cn("h-3.5 w-36 rounded animate-pulse mb-2", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                                        <div className={cn("h-2.5 w-24 rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                                    </div>
                                    <div className={cn("h-4 w-14 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
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
                                    <button onClick={() => setCreateModalOpen(true, 'Invoice')} className="px-4 py-1.5 text-[12px] font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover transition-colors">+ New Invoice</button>
                                </>}
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {filtered.map(inv => (
                                <MobileInvoiceRow
                                    key={inv.id}
                                    inv={inv}
                                    onOpen={() => router.push(`/invoices/${inv.id}`)}
                                    isDark={isDark}
                                    onStatusChange={(s) => updateInvoice(inv.id, { status: s })}
                                    onArchive={() => handleArchive(inv.id)}
                                    isArchived={archivedIds.has(inv.id)}
                                />
                            ))}
                            {!isLoading && !showArchived && (
                                <button
                                    onClick={() => setCreateModalOpen(true, 'Invoice')}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-3.5 w-full text-left text-[13px] font-medium border-b transition-colors",
                                        isDark ? "text-[#555] border-[#1f1f1f] hover:text-[#aaa]" : "text-[#bbb] border-[#f0f0f0] hover:text-[#666]"
                                    )}
                                >
                                    <Plus size={13} className="opacity-60 shrink-0" />
                                    <span className="leading-none">Create invoice</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ) : view === 'table' ? (
                <div className={cn("flex-1 overflow-auto p-5", isDark ? "bg-[#141414]" : "bg-[#f7f7f7]")}>
                    {filtered.length === 0 && !isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3">
                            {showArchived
                                ? <p className={cn("text-[13px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No archived invoices.</p>
                                : <>
                                    <Receipt size={32} strokeWidth={1} className={isDark ? "text-[#333]" : "text-[#ccc]"} />
                                    <p className={cn("text-[13px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No invoices found.</p>
                                    <button onClick={() => setCreateModalOpen(true, 'Invoice')} className="px-4 py-1.5 text-[12px] font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover transition-colors">+ New Invoice</button>
                                </>}
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 relative">
                            <DataTable
                                data={filtered}
                                columns={[
                                    {
                                        id: 'name',
                                        label: 'Name',
                                        defaultWidth: 150,
                                        flexible: true,
                                        cell: (inv) => (
                                            <div className="flex flex-col px-4 py-1.5 h-full justify-center">
                                                <div className={cn("font-bold truncate leading-tight", isDark ? "text-white" : "text-[#111]")}>
                                                    {inv.title || 'New Invoice'}
                                                </div>
                                            </div>
                                        )
                                    },
                                    {
                                        id: 'client',
                                        label: 'Client',
                                        defaultWidth: 240,
                                        cell: (inv) => (
                                            <div className="flex items-stretch h-full w-full">
                                                <ClientCell assignedClients={inv.meta?.assignedClients} currentName={inv.client_name} currentId={inv.client_id} onAssignClients={(clients) => updateInvoice(inv.id, { client_id: clients[0]?.id || null, client_name: clients[0]?.name || '', meta: { ...inv.meta, assignedClients: clients } as any })} isDark={isDark} variant="table" />
                                            </div>
                                        )
                                    },
                                    {
                                        id: 'status',
                                        label: 'Status',
                                        defaultWidth: 120,
                                        cell: (inv) => (
                                            <div className="flex items-center px-4 py-1.5 h-full">
                                                <StatusCell status={inv.status} onStatusChange={(s) => updateInvoice(inv.id, { status: s })} isDark={isDark} customStatuses={customStatuses} />
                                            </div>
                                        )
                                    },
                                    {
                                        id: 'issue',
                                        label: 'Issue date',
                                        defaultWidth: 120,
                                        cell: (inv) => (
                                            <div className={cn("flex flex-col justify-center px-4 py-1.5 leading-tight h-full", isDark ? "text-[#777]" : "text-[#888]")}>
                                                <span className="text-[12px]">{fmtDate(inv.issue_date)}</span>
                                                <span className="text-[10px] opacity-50">{timeAgo(inv.issue_date)}</span>
                                            </div>
                                        )
                                    },
                                    {
                                        id: 'due',
                                        label: 'Due date',
                                        defaultWidth: 120,
                                        cell: (inv) => (
                                            <div className={cn("flex flex-col justify-center px-4 py-1.5 leading-tight h-full", isDark ? "text-[#777]" : "text-[#888]")}>
                                                {inv.due_date ? (
                                                    <>
                                                        <span className="text-[12px]">{fmtDate(inv.due_date)}</span>
                                                        <span className="text-[10px] opacity-50">{timeAgo(inv.due_date)}</span>
                                                    </>
                                                ) : <span className="text-[12px]">—</span>}
                                            </div>
                                        )
                                    },
                                    {
                                        id: 'paid',
                                        label: 'Paid date',
                                        defaultWidth: 120,
                                        cell: (inv) => (
                                            <div className={cn("flex flex-col justify-center px-4 py-1.5 leading-tight h-full", isDark ? "text-[#777]" : "text-[#888]")}>
                                                {inv.paid_at ? (
                                                    <>
                                                        <span className="text-[12px]">{fmtDate(inv.paid_at)}</span>
                                                        <span className="text-[10px] opacity-50">{timeAgo(inv.paid_at)}</span>
                                                    </>
                                                ) : <span className="text-[12px] opacity-20">—</span>}
                                            </div>
                                        )
                                    }
                                ]}
                                storageKeyPrefix="invoices"
                                selectedIds={selectedIds}
                                onToggleAll={toggleAll}
                                onToggleRow={toggleRow}
                                onRowClick={(inv) => router.push(`/invoices/${inv.id}`)}
                                isDark={isDark}
                                isLoading={isLoading}
                                rightHeaderWidth={60}
                                rightHeaderSlot={<>Total: <MoneyAmount amount={stats[statusFilter]?.amount ?? 0} currency={displayCurrency} className="ml-1" /></>}
                                rightCellSlot={(inv) => (
                                    <div className={cn("flex items-center justify-end px-1 py-1.5 gap-1 font-semibold tabular-nums w-full",
                                        isDark ? "text-[#ccc]" : "text-[#333]")}>
                                        <MoneyAmount amount={Number(inv.amount || 0)} currency={inv.meta?.currency} />
                                    </div>
                                )}
                                rowMenuItems={(inv) => [
                                    { label: 'Open', icon: <ExternalLink size={12} />, onClick: () => router.push(`/invoices/${inv.id}`) },
                                    { label: 'Send', icon: <Send size={12} />, onClick: () => handleSend(inv, 'invoice') },
                                    ...(inv.status === 'Paid' ? [{ label: 'Send Receipt', icon: <Receipt size={12} />, onClick: () => handleSend(inv, 'receipt') }] : []),
                                    { label: 'Open Public Link', icon: <Link2 size={12} />, onClick: () => window.open(window.location.origin + '/p/invoice/' + inv.id, '_blank') },
                                    { label: 'Copy Public Link', icon: <Link2 size={12} />, onClick: () => { navigator.clipboard.writeText(window.location.origin + '/p/invoice/' + inv.id); appToast.success('Link copied'); } },
                                    { label: 'Duplicate', icon: <Copy size={12} />, onClick: () => handleDuplicate(inv.id) },
                                    { label: archivedIds.has(inv.id) ? 'Unarchive' : 'Archive', icon: archivedIds.has(inv.id) ? <ArchiveRestore size={12} /> : <Archive size={12} />, onClick: () => handleArchive(inv.id), separator: true },
                                    { label: 'Delete', icon: <Trash2 size={12} />, danger: true, onClick: () => setDeletingId(inv.id), separator: true }
                                ]}
                                afterRows={!isLoading && !showArchived ? (
                                    <button onClick={() => setCreateModalOpen(true, 'Invoice')}
                                        className={cn("flex items-center gap-1.5 px-4 py-3 w-full text-left text-[12px] font-medium transition-colors",
                                            isDark ? "text-[#555] border-[#1f1f1f] hover:text-[#aaa] hover:bg-white/[0.02]" : "text-[#aaa] border-[#f0f0f0] hover:text-[#555] hover:bg-[#fafafa]")}>
                                        <div className={cn("w-4 h-4 shrink-0 flex items-center justify-center rounded border border-dashed", isDark ? "border-[#444]" : "border-[#ccc]")}>
                                            <Plus size={10} />
                                        </div>
                                        <span className="leading-none">Create invoice</span>
                                    </button>
                                ) : undefined}
                            />
                        </div>
                    )}
                </div>
            ) : (
                /* â”€â”€ Cards view (Grid) â”€â”€ */
                <div className={cn("flex-1 overflow-y-auto p-4", isDark ? "bg-[#0f0f0f]" : "bg-[#f0f0f0]")}>
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                            {Array.from({ length: 30 }).map((_, i) => (
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
                                    <button onClick={() => setCreateModalOpen(true, 'Invoice')} className="px-4 py-1.5 text-[12px] font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover transition-colors">+ New Invoice</button>
                                </>}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                            {filtered.map(inv => {
                                const menuItems = [
                                    { label: 'Open', icon: <ExternalLink size={12} />, onClick: () => router.push(`/invoices/${inv.id}`) },
                                    { label: 'Send', icon: <Send size={12} />, onClick: () => handleSend(inv, 'invoice') },
                                    ...(inv.status === 'Paid' ? [{ label: 'Send Receipt', icon: <Receipt size={12} />, onClick: () => handleSend(inv, 'receipt') }] : []),
                                    { label: 'Open Public Link', icon: <Link2 size={12} />, onClick: () => window.open(window.location.origin + '/p/invoice/' + inv.id, '_blank') },
                                    { label: 'Copy Public Link', icon: <Link2 size={12} />, onClick: () => { navigator.clipboard.writeText(window.location.origin + '/p/invoice/' + inv.id); appToast.success('Link copied'); } },
                                    { label: 'Duplicate', icon: <Copy size={12} />, onClick: () => handleDuplicate(inv.id) },
                                    { label: archivedIds.has(inv.id) ? 'Unarchive' : 'Archive', icon: archivedIds.has(inv.id) ? <ArchiveRestore size={12} /> : <Archive size={12} />, onClick: () => handleArchive(inv.id), separator: true },
                                    { label: 'Delete', icon: <Trash2 size={12} />, danger: true, onClick: () => setDeletingId(inv.id), separator: true }
                                ];
                                return (
                                    <InvoiceCard key={inv.id} i={inv}
                                        onOpen={() => router.push(`/invoices/${inv.id}`)}
                                        onArchive={() => handleArchive(inv.id)}
                                        onStatusChange={(s) => updateInvoice(inv.id, { status: s })}
                                        onAssignClients={(clients) => updateInvoice(inv.id, { client_id: clients[0]?.id || null, client_name: clients[0]?.name || '', meta: { ...inv.meta, assignedClients: clients } as any })}
                                        isSelected={selectedIds.has(inv.id)}
                                        onToggle={() => {
                                            const n = new Set(selectedIds);
                                            n.has(inv.id) ? n.delete(inv.id) : n.add(inv.id);
                                            setSelectedIds(n);
                                        }}
                                        customStatuses={customStatuses}
                                        isDark={isDark}
                                        menuItems={menuItems} />
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

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
                        await useInvoiceStore.getState().bulkDeleteInvoices(ids);
                        setSelectedIds(new Set());
                        appToast.error("Deleted", `${ids.length} invoice${ids.length !== 1 ? 's' : ''} deleted`);
                    } else if (deletingId) {
                        await deleteInvoice(deletingId);
                        appToast.error("Deleted", 'Invoice deleted');
                    }
                    setDeletingId(null);
                }}
            />


            <SendEmailModal
                isOpen={isSendModalOpen}
                onClose={() => setIsSendModalOpen(false)}
                templateKey={sendingTemplateKey}
                to={sendingItem?.meta?.clientEmail || ''}
                variables={{
                    client_name: sendingItem?.client_name || '',
                    invoice_number: sendingItem?.invoice_number || '',
                    amount_due: formatAmount(Number(sendingItem?.amount || 0), sendingItem?.meta?.currency || 'USD'),
                    amount_paid: formatAmount(Number(sendingItem?.amount || 0), sendingItem?.meta?.currency || 'USD'),
                    due_date: sendingItem?.due_date || '',
                    document_link: typeof window !== 'undefined' ? `${window.location.origin}/p/invoice/${sendingItem?.id}` : '',
                    days_overdue: sendingItem?.due_date ? String(Math.max(0, Math.floor((new Date().getTime() - new Date(sendingItem.due_date).getTime()) / (1000 * 3600 * 24)))) : '0',
                }}
                workspaceId={activeWorkspaceId || ''}
                documentTitle={sendingItem?.title || 'Invoice'}
            />
        </div>
    );
}
