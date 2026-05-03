"use client";

import React, { useState, useEffect } from 'react';
import {
    Search, Plus, Filter, LayoutGrid, List,
    Users, Mail, Phone, MapPin, Building2,
    Globe, Briefcase, Trash2, Archive, ArchiveRestore,
    Copy, Check, SquareCheck, X, MoreHorizontal,
    FileSpreadsheet, Upload, Download, ChevronDown, ArrowUpDown, ArrowRightLeft,
    SlidersHorizontal, UserPlus
} from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { appToast } from '@/lib/toast';
import { useClientStore } from '@/store/useClientStore';
import { useCompanyStore } from '@/store/useCompanyStore';
import { useUIStore } from '@/store/useUIStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { InlineDeleteButton } from '@/components/ui/InlineDeleteButton';
import { cn } from '@/lib/utils';

import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import { SearchInput } from '@/components/ui/SearchInput';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { ListViewSkeleton } from '@/components/ui/ListViewSkeleton';
import { ContextMenuRow } from '@/components/ui/RowContextMenu';
import { ExternalLink, Mail as MailIcon, Phone as PhoneIcon } from 'lucide-react';
import { FilterPanel, FilterButton, SavedFilterPills } from '@/components/ui/FilterPanel';
import { FilterField, FilterRow, SavedFilter, applyFilters } from '@/lib/filterUtils';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useMenuStore } from '@/store/useMenuStore';
import { Dropdown, DItem } from '@/components/ui/Dropdown';
import { ToolbarButton as TbBtn } from '@/components/ui/ToolbarButton';
import { Checkbox as Chk } from '@/components/ui/Checkbox';


import { DataTable, DataTableColumn } from '@/components/ui/DataTable';
import { SendEmailModal } from '@/components/modals/SendEmailModal';
import { usePermissions } from '@/hooks/usePermissions';

type Tab = 'people' | 'companies';

type ViewMode = 'grid' | 'list';

/** A single labeled row inside a card — matches the minimal reference design */
function CardRow({ label, value, isDark, isLink }: {
    label: string; value?: string | null; isDark: boolean; isLink?: boolean;
}) {
    if (!value) return null;
    return (
        <div className={cn(
            "flex items-center gap-0 border-t py-2 px-4",
            isDark ? "border-white/[0.03]" : "border-dashed border-[#e8e8e8]"
        )}>
            <span className={cn("text-[11px] shrink-0 w-[100px]", isDark ? "text-[#555]" : "text-[#aaa]")}>{label}</span>
            {isLink ? (
                <span className="text-[11px] text-primary truncate">{value}</span>
            ) : (
                <span className={cn("text-[11px] truncate font-medium", isDark ? "text-[#bbb]" : "text-[#333]")}>{value}</span>
            )}
        </div>
    );
}

/* ─── Shared UI Components ────────────────────────────────────────── */


export default function ClientsPage() {
    const { navItems } = useMenuStore();
    const { clients, addClient, fetchClients, isLoading: isClientsLoading } = useClientStore();
    const { companies, fetchCompanies, isLoading: isCompaniesLoading } = useCompanyStore();
    const { theme, openRightPanel, rightPanel, setImportModalOpen, setCreateModalOpen, pageViews, setPageView, activeWorkspaceId } = useUIStore();
    const { isOwner, role } = usePermissions();
    const isOwnerOrCoOwner = isOwner || role?.name === 'Co-Owner';
    const isMobile = useIsMobile();
    const isDark = theme === 'dark';
    const [tab, setTab] = usePersistentState<Tab>('clients_filter_tab', 'people');
    const view = (pageViews['clients'] as ViewMode) || 'grid';
    const setView = (v: ViewMode) => setPageView('clients', v);
    const [search, setSearch] = usePersistentState('clients_filter_search', '');
    const [importExportOpen, setImportExportOpen] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [inviteModalContact, setInviteModalContact] = useState<any>(null);

    const [orderBy, setOrderBy] = usePersistentState<'name' | 'name-desc' | 'recent' | 'oldest'>('clients_filter_order', 'recent');
    const [orderOpen, setOrderOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);

    /* ── Advanced Filters ── */
    const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
    const [peopleFilterRows, setPeopleFilterRows] = usePersistentState<FilterRow[]>('clients_people_filter_rows', []);
    const [companyFilterRows, setCompanyFilterRows] = usePersistentState<FilterRow[]>('clients_companies_filter_rows', []);
    const [activeFilterId, setActiveFilterId] = usePersistentState<string | null>('clients_active_filter_id', null);

    const filterRows = tab === 'people' ? peopleFilterRows : companyFilterRows;
    const setFilterRows = tab === 'people' ? setPeopleFilterRows : setCompanyFilterRows;
    const { saved: savedPeopleFilters, save: savePeopleFilter, remove: deletePeopleFilter } = useSavedFilters('clients_people');
    const { saved: savedCompanyFilters, save: saveCompanyFilter, remove: deleteCompanyFilter } = useSavedFilters('clients_companies');

    const savedFilters = tab === 'people' ? savedPeopleFilters : savedCompanyFilters;
    const saveFilter = tab === 'people' ? savePeopleFilter : saveCompanyFilter;
    const deleteSavedFilter = tab === 'people' ? deletePeopleFilter : deleteCompanyFilter;



    const CLIENT_FILTER_FIELDS = useMemo<FilterField[]>(() => [
        { key: 'contact_person', label: 'Name', type: 'text' },
        { key: 'company_name', label: 'Company', type: 'enum', options: Array.from(new Set(companies.map(c => c.name).filter(Boolean))).sort() },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'address', label: 'Address', type: 'text' },
        { key: 'tax_number', label: 'Tax number', type: 'text' },
        { key: 'created_at', label: 'Date added', type: 'date' },
    ], [companies]);

    const COMPANY_FILTER_FIELDS = useMemo<FilterField[]>(() => [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'industry', label: 'Industry', type: 'text' },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'website', label: 'Website', type: 'text' },
        { key: 'address', label: 'Address', type: 'text' },
        { key: 'created_at', label: 'Date added', type: 'date' },
    ], []);

    const filterFields = tab === 'people' ? CLIENT_FILTER_FIELDS : COMPANY_FILTER_FIELDS;

    useEffect(() => { fetchClients(); fetchCompanies(); }, [fetchClients, fetchCompanies]);

    const handleExportJSON = () => {
        const data = tab === 'people' ? clients : companies;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${tab}_export_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        appToast.success('Exported successfully');
        setImportExportOpen(false);
    };

    const handleExportCSV = () => {
        const data = tab === 'people' ? clients : companies;
        if (data.length === 0) {
            appToast.error("Error", 'No data to export');
            return;
        }
        
        let csvContent = "";
        if (tab === 'people') {
            csvContent += "contact_person,company_name,email,phone,address,tax_number,notes\n";
            data.forEach((c: any) => {
                const row = [c.contact_person, c.company_name, c.email, c.phone, c.address, c.tax_number, c.notes]
                    .map(v => v ? `"${String(v).replace(/"/g, '""')}"` : "")
                    .join(",");
                csvContent += row + "\n";
            });
        } else {
            csvContent += "name,industry,email,phone,website,address\n";
            data.forEach((c: any) => {
                const row = [c.name, c.industry, c.email, c.phone, c.website, c.address]
                    .map(v => v ? `"${String(v).replace(/"/g, '""')}"` : "")
                    .join(",");
                csvContent += row + "\n";
            });
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${tab}_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        appToast.success('CSV exported successfully');
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
                            if (tab === 'people') {
                                await addClient(payload);
                            } else {
                                const { addCompany } = useCompanyStore.getState();
                                await addCompany(payload);
                            }
                        }
                    })();
                    appToast.promise(promise, {
                        loading: 'Importing...',
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
        if (e.target) e.target.value = '';
    };



    const handleDuplicateClient = async (id: string) => {
        const original = clients.find(c => c.id === id);
        if (!original) return;
        const promise = (async () => {
            const { id: _, created_at: __, workspace_id: ___, ...payload } = original;
            await addClient({
                ...payload,
                contact_person: `${original.contact_person || 'Contact'} (Copy)`
            });
        })();
        appToast.promise(promise, {
            loading: 'Duplicating contact…',
            success: 'Contact duplicated',
            error: 'Duplication failed',
        });
    };

    const handleDuplicateCompany = async (id: string) => {
        const original = companies.find(c => c.id === id);
        if (!original) return;
        const promise = (async () => {
            const { id: _, created_at: __, workspace_id: ___, ...payload } = original;
            const { addCompany } = useCompanyStore.getState();
            await addCompany({
                ...payload,
                name: `${original.name || 'Company'} (Copy)`
            });
        })();
        appToast.promise(promise, {
            loading: 'Duplicating company…',
            success: 'Company duplicated',
            error: 'Duplication failed',
        });
    };

    const toggleRow = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = (items: (any)[]) => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(i => i.id)));
        }
    };

    const filteredPeople = useMemo(() => {
        let items = clients.filter(c =>
            c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
            c.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
            c.email?.toLowerCase().includes(search.toLowerCase())
        );

        items = applyFilters(items, filterRows, CLIENT_FILTER_FIELDS);

        if (orderBy === 'name') {
            items = [...items].sort((a, b) => (a.contact_person || '').localeCompare(b.contact_person || ''));
        } else if (orderBy === 'name-desc') {
            items = [...items].sort((a, b) => (b.contact_person || '').localeCompare(a.contact_person || ''));
        } else if (orderBy === 'oldest') {
            items = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        } else {
            // Default to newest first
            items = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        return items;
    }, [clients, search, filterRows, CLIENT_FILTER_FIELDS, orderBy]);

    const filteredCompanies = useMemo(() => {
        let items = companies.filter(c =>
            c.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.industry?.toLowerCase().includes(search.toLowerCase()) ||
            c.email?.toLowerCase().includes(search.toLowerCase())
        );

        items = applyFilters(items, filterRows, COMPANY_FILTER_FIELDS);

        if (orderBy === 'name') {
            items = [...items].sort((a, b) => a.name.localeCompare(b.name));
        } else if (orderBy === 'name-desc') {
            items = [...items].sort((a, b) => b.name.localeCompare(a.name));
        } else if (orderBy === 'oldest') {
            items = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        } else {
            // Default to newest first
            items = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        return items;
    }, [companies, search, filterRows, COMPANY_FILTER_FIELDS, orderBy]);

    /* ── Theme tokens ── */
    const pageBg     = isDark ? 'bg-[#141414]' : 'bg-white';
    const gridBg     = isDark ? 'bg-[#141414]' : 'bg-[#f7f7f7]';
    const border     = isDark ? 'border-[#252525]' : 'border-[#ebebeb]';
    const cardBg     = isDark ? 'bg-[#1a1a1a]'  : 'bg-white';
    const cardBorder = isDark ? 'border-[#222]'  : 'border-transparent';
    const muted      = isDark ? 'text-[#555]'    : 'text-[#aaa]';
    const textPrimary    = isDark ? 'text-[#e5e5e5]' : 'text-[#111]';
    const textSecondary  = isDark ? 'text-[#777]'    : 'text-[#888]';

    /* Active card highlight */
    const activeContactId = rightPanel?.type === 'contact' ? (rightPanel as any).id : null;
    const activeCompanyId = rightPanel?.type === 'company' ? (rightPanel as any).id : null;

    const peopleColumns: DataTableColumn<any>[] = useMemo(() => [
        { id: 'name', label: 'Name', flexible: true, defaultWidth: 200, cell: (c: any) => (
            <div className="flex items-center gap-3 px-4 py-1.5 h-full">
                <Avatar src={c.avatar_url} name={c.contact_person || c.company_name} className="w-7 h-7" isDark={isDark} />
                <span className={cn("text-[13px] font-semibold truncate", textPrimary)}>{c.contact_person || '—'}</span>
            </div>
        )},
        { id: 'email', label: 'Email', defaultWidth: 180, cell: (c: any) => (
            <div className="flex items-center px-4 py-1.5 h-full truncate text-primary">{c.email || <span className={textSecondary}>—</span>}</div>
        )},
        { id: 'phone', label: 'Phone', defaultWidth: 140, cell: (c: any) => (
            <div className={cn("flex flex-col justify-center px-4 py-1.5 h-full truncate", textSecondary)}><span className="text-[12px]">{c.phone || '—'}</span></div>
        )},
        { id: 'country', label: 'Country', defaultWidth: 120, cell: (c: any) => (
            <div className={cn("flex items-center px-4 py-1.5 h-full truncate", textSecondary)}><span className="text-[12px]">{c.country || '—'}</span></div>
        )},
        { id: 'company', label: 'Company', defaultWidth: 160, cell: (c: any) => (
            <div className={cn("flex items-center px-4 py-1.5 h-full truncate", muted)}><span className="text-[12px] font-medium">{c.company_name || '—'}</span></div>
        )}
    ], [isDark, textPrimary, textSecondary, muted]);

    const companyColumns: DataTableColumn<any>[] = useMemo(() => [
        { id: 'name', label: 'Name', flexible: true, defaultWidth: 200, cell: (c: any) => (
            <div className="flex items-center gap-3 px-4 py-1.5 h-full">
                <Avatar src={c.avatar_url} name={c.name} className="w-7 h-7" isDark={isDark} />
                <span className={cn("text-[13px] font-semibold truncate", textPrimary)}>{c.name}</span>
            </div>
        )},
        { id: 'industry', label: 'Industry', defaultWidth: 140, cell: (c: any) => (
            <div className={cn("flex flex-col justify-center px-4 py-1.5 h-full truncate", textSecondary)}><span className="text-[12px]">{c.industry || '—'}</span></div>
        )},
        { id: 'email', label: 'Email', defaultWidth: 180, cell: (c: any) => (
            <div className="flex items-center px-4 py-1.5 h-full truncate text-primary">{c.email || <span className={textSecondary}>—</span>}</div>
        )},
        { id: 'phone', label: 'Phone', defaultWidth: 140, cell: (c: any) => (
            <div className={cn("flex flex-col justify-center px-4 py-1.5 h-full truncate", textSecondary)}><span className="text-[12px]">{c.phone || '—'}</span></div>
        )},
        { id: 'website', label: 'Website', defaultWidth: 160, cell: (c: any) => (
            <div className={cn("flex items-center px-4 py-1.5 h-full truncate text-primary")}>{c.website || <span className={textSecondary}>—</span>}</div>
        )},
        { id: 'contacts', label: 'Contacts', defaultWidth: 100, cell: (c: any) => {
            const linkedCount = clients.filter(client => client.company_name === c.name).length;
            return (
                <div className={cn("flex items-center gap-1.5 px-4 py-1.5 h-full truncate", muted)}>
                    <Users size={12} className="opacity-50" />
                    <span className="text-[12px]">{linkedCount}</span>
                </div>
            )
        }}
    ], [isDark, textPrimary, textSecondary, muted, clients]);

    const getPeopleMenu = (client: any) => {
        const menu: any[] = [
            { label: 'View Profile', icon: <Users size={14} />, onClick: () => openRightPanel({ type: 'contact', id: client.id }) },
            { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => handleDuplicateClient(client.id) },
        ];
        
        if (isOwnerOrCoOwner && client.email) {
            menu.push({ label: 'Invite to Workspace', icon: <UserPlus size={14} />, onClick: () => setInviteModalContact(client) });
        }
        
        menu.push({ label: 'Delete', icon: <Trash2 size={14} />, danger: true, onClick: async () => {
            const { deleteClient } = useClientStore.getState();
            await deleteClient(client.id);
            appToast.error("Deleted", 'Contact deleted');
        }, separator: true });
        
        return menu;
    };

    const getCompanyMenu = (company: any) => [
        { label: 'View Profile', icon: <Building2 size={14} />, onClick: () => openRightPanel({ type: 'company', id: company.id }) },
        { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => handleDuplicateCompany(company.id) },
        { label: 'Delete', icon: <Trash2 size={14} />, danger: true, onClick: async () => {
            const { deleteCompany } = useCompanyStore.getState();
            await deleteCompany(company.id);
            appToast.error("Deleted", 'Company deleted');
        }, separator: true },
    ];

    return (
        <div className={cn(
            "flex flex-col h-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-[#f7f7f7] text-[#111]"
        )}>

            {/* ── Page header — hidden on mobile (MobileTopBar handles title) ── */}
            <div className={cn("hidden md:flex items-center justify-between px-5 py-3 shrink-0", isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-white")}>
                <h1 className="text-[15px] font-semibold tracking-tight">{navItems.find(item => item.href === '/clients')?.label || 'Contacts'}</h1>
            </div>

            {/* ── Toolbar ── */}
            {isMobile ? (
                <div className="flex flex-col shrink-0">
                    <div className={cn("flex items-center gap-2 px-3 py-2 border-b",
                        isDark ? "border-[#252525] bg-[#141414]" : "border-[#f0f0f0] bg-white")}>
                        {/* Search */}
                        <div className={cn("relative flex-1")}>
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" size={12} />
                            <input
                                type="text"
                                placeholder={`Search ${tab}...`}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className={cn(
                                    "w-full pl-7 pr-3 py-1.5 text-[12px] rounded-[8px] border focus:outline-none transition-all",
                                    isDark
                                        ? "bg-white/[0.05] border-white/10 text-white placeholder:text-white/25"
                                        : "bg-[#f5f5f5] border-transparent text-[#111] placeholder:text-[#aaa]"
                                )}
                            />
                        </div>
                        {/* Actions */}
                        <div className="relative shrink-0 flex items-center gap-1.5">
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
                                {filterRows.length > 0 && !activeFilterId && (
                                    <div 
                                        onClick={() => { setFilterRows([]); setFilterOpen(false); }}
                                        className={cn("flex items-center gap-2 px-3.5 py-2 border-b cursor-pointer transition-colors", isDark ? "border-[#2e2e2e] hover:bg-white/5 text-red-400" : "border-[#f0f0f0] hover:bg-black/5 text-red-500")}>
                                        <X size={11} className="opacity-70" />
                                        <span className="text-[12px] font-medium">Clear active filters</span>
                                    </div>
                                )}
                                {savedFilters.length > 0 && (
                                    <>
                                        <div className={cn("px-3.5 py-2.5 border-b text-[11px] font-semibold", isDark ? "border-[#2e2e2e] text-[#666]" : "border-[#f0f0f0] text-[#aaa]")}>SAVED FILTERS</div>
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
                                <div className={cn("px-3.5 py-2.5 border-b text-[11px] font-semibold", isDark ? "border-[#2e2e2e] text-[#666]" : "border-[#f0f0f0] text-[#aaa]")}>SORT BY</div>
                                <div className="py-1">
                                    <DItem label="Alphabetical (A-Z)" active={orderBy === 'name'} onClick={() => { setOrderBy('name'); setFilterOpen(false); }} isDark={isDark} />
                                    <DItem label="Alphabetical (Z-A)" active={orderBy === 'name-desc'} onClick={() => { setOrderBy('name-desc'); setFilterOpen(false); }} isDark={isDark} />
                                    <DItem label="Recently Added" active={orderBy === 'recent'} onClick={() => { setOrderBy('recent'); setFilterOpen(false); }} isDark={isDark} />
                                    <DItem label="Oldest Added" active={orderBy === 'oldest'} onClick={() => { setOrderBy('oldest'); setFilterOpen(false); }} isDark={isDark} />
                                </div>
                                <div className={cn("px-3.5 py-2.5 border-t border-b text-[11px] font-semibold", isDark ? "border-[#2e2e2e] text-[#666]" : "border-[#f0f0f0] text-[#aaa]")}>OPTIONS</div>
                                <div className="py-1">
                                    <DItem label="Import / Export" icon={<ArrowRightLeft size={12} />} onClick={() => { setImportExportOpen(true); setFilterOpen(false); }} isDark={isDark} />
                                </div>
                            </Dropdown>
                            {/* Import/Export sub-dropdown for mobile if needed, or just open modal */}
                        </div>
                    </div>
                    {/* Tabs row */}
                    <div className={cn("flex items-center gap-1.5 px-3 py-2 border-b",
                        isDark ? "border-[#252525] bg-[#141414]" : "border-[#f0f0f0] bg-white")}>
                        {(['people', 'companies'] as Tab[]).map(t => (
                            <button
                                key={t}
                                onClick={() => { setTab(t); setSearch(''); }}
                                className={cn(
                                    "px-3 py-1.5 text-[11px] font-semibold rounded-[8px] border transition-all capitalize",
                                    tab === t
                                        ? isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-[#e0e0e0] shadow-sm text-[#111]"
                                        : isDark ? "border-transparent text-[#555] hover:text-[#aaa]" : "border-transparent text-[#aaa] hover:text-[#555]"
                                )}
                            >
                                {t === 'people' ? 'People' : 'Companies'}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className={cn("flex items-center gap-0 px-3 md:px-4 py-1.5 shrink-0 overflow-visible flex-wrap", isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-[#f7f7f7]")}>
                    {(['people', 'companies'] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setSearch(''); }}
                            className={cn(
                                "px-2.5 py-1 text-[11px] font-medium rounded transition-colors capitalize mr-1",
                                tab === t
                                    ? (isDark ? "bg-white/8 text-white" : "bg-[#f0f0f0] text-[#111]")
                                    : (isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]")
                            )}
                        >
                            {t === 'people' ? 'People' : 'Companies'}
                        </button>
                    ))}
                    <div className="flex-1" />

                    <SearchInput 
                        value={search} 
                        onChange={setSearch} 
                        isDark={isDark} 
                    />
                    
                    <div className={cn('w-[1px] h-4 mx-1', isDark ? 'bg-[#2e2e2e]' : 'bg-[#e0e0e0]')}/>
                    
                    <ViewToggle 
                        view={view} 
                        onViewChange={(v) => { setView(v); setSelectedIds(new Set()); }} 
                        isDark={isDark} 
                        options={[
                            { id: 'grid', icon: <LayoutGrid size={12}/> },
                            { id: 'list', icon: <List size={12}/> }
                        ]}
                    />

                    <div className={cn('w-[1px] h-4 mx-1', isDark ? 'bg-[#2e2e2e]' : 'bg-[#e0e0e0]')}/>

                    <div className="flex items-center gap-1">
                        {/* Advanced filter */}
                        <div className="relative">
                            <FilterButton
                                activeCount={filterRows.filter(r => r.field && r.value != null && r.value !== '' && !(Array.isArray(r.value) && r.value.length === 0)).length}
                                onClick={() => setFilterOpen(v => !v)}
                                isDark={isDark}
                            />
                            
                            <Dropdown open={filterOpen} onClose={() => setFilterOpen(false)} isDark={isDark} align="left">
                                <div className="py-1 min-w-[160px]">
                                    <div 
                                        onClick={() => { setFilterOpen(false); setAdvancedFilterOpen(true); }}
                                        className={cn("flex items-center gap-2 px-3.5 py-2.5 cursor-pointer transition-colors hover:bg-black/5", isDark ? "hover:bg-white/5" : "")}>
                                        <Plus size={11} className="opacity-40" />
                                        <span className={cn("text-[11px] font-medium", isDark ? "text-[#777]" : "text-[#aaa]")}>New filter</span>
                                    </div>
                                    
                                    {savedFilters.length > 0 && (
                                        <>
                                            <div className={cn("h-px my-1", isDark ? "bg-[#252525]" : "bg-[#efefef]")} />
                                            <SavedFilterPills
                                                saved={savedFilters}
                                                activeId={activeFilterId}
                                                onLoad={(f) => { setFilterRows(f.rows); setActiveFilterId(f.id); setFilterOpen(false); }}
                                                onDelete={(id) => { deleteSavedFilter(id); if (activeFilterId === id) { setActiveFilterId(null); } }}
                                                onClear={() => { setFilterRows([]); setActiveFilterId(null); setFilterOpen(false); }}
                                                isDark={isDark}
                                            />
                                        </>
                                    )}
                                </div>
                            </Dropdown>


                        </div>

                        {savedFilters.length > 0 && (
                            <div className={cn("w-[1px] h-4 mx-1.5", isDark ? "bg-[#2e2e2e]" : "bg-[#e0e0e0]")} />
                        )}

                        <div className="relative">
                        <TbBtn 
                            label="Order by"
                            icon={<ArrowUpDown size={11}/>}
                            active={orderOpen}
                            onClick={() => setOrderOpen(!orderOpen)}
                            isDark={isDark}
                            hasArrow
                        />
                            <Dropdown open={orderOpen} onClose={() => setOrderOpen(false)} isDark={isDark}>
                                <div className="py-1">
                                    <DItem label="Alphabetical (A-Z)" active={orderBy === 'name'} onClick={() => { setOrderBy('name'); setOrderOpen(false); }} isDark={isDark} />
                                    <DItem label="Alphabetical (Z-A)" active={orderBy === 'name-desc'} onClick={() => { setOrderBy('name-desc'); setOrderOpen(false); }} isDark={isDark} />
                                    <DItem label="Recently Added" active={orderBy === 'recent'} onClick={() => { setOrderBy('recent'); setOrderOpen(false); }} isDark={isDark} />
                                    <DItem label="Oldest Added" active={orderBy === 'oldest'} onClick={() => { setOrderBy('oldest'); setOrderOpen(false); }} isDark={isDark} />
                                </div>
                            </Dropdown>
                        </div>

                        {/* Bulk actions */}
                        {selectedIds.size > 0 && (
                            <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-xl border mr-2', isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-[#f8f8f8] border-[#e8e8e8]')}>
                                <span className={cn('text-[11px] font-semibold mr-1', isDark ? 'text-[#aaa]' : 'text-[#666]')}>{selectedIds.size} selected</span>
                                <div className={cn('w-[1px] h-3', isDark ? 'bg-[#333]' : 'bg-[#ddd]')}/>
                                
                                <Tooltip content="Duplicate" side="bottom">
                                    <button onClick={async () => {
                                        const ids = Array.from(selectedIds);
                                        const { bulkDuplicateClients } = useClientStore.getState();
                                        const { bulkDuplicateCompanies } = useCompanyStore.getState();
                                        if (tab === 'people') await bulkDuplicateClients(ids);
                                        else await bulkDuplicateCompanies(ids);
                                        appToast.success(`${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''} duplicated`);
                                        setSelectedIds(new Set());
                                    }}
                                        className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors', isDark ? 'text-[#777] hover:text-white hover:bg-white/5' : 'text-[#888] hover:text-[#333] hover:bg-[#ececec]')}>
                                        <Copy size={11}/>
                                    </button>
                                </Tooltip>
                                
                                <Tooltip content="Delete" side="bottom">
                                    <button onClick={() => setDeletingId('bulk')}
                                        className="px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors text-red-500/70 hover:text-red-500 hover:bg-red-500/10">
                                        <Trash2 size={11}/>
                                    </button>
                                </Tooltip>

                                {selectedIds.size >= 2 && (
                                    <Tooltip content={selectedIds.size === (tab === 'people' ? filteredPeople.length : filteredCompanies.length) ? "Deselect All" : "Select All"} side="bottom">
                                        <button onClick={() => toggleAll(tab === 'people' ? filteredPeople : filteredCompanies)}
                                            className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors', isDark ? 'text-[#777] hover:text-white hover:bg-white/5' : 'text-[#888] hover:text-[#333] hover:bg-[#ececec]')}>
                                            <SquareCheck size={11}/>
                                        </button>
                                    </Tooltip>
                                )}
                                <div className={cn('w-[1px] h-3', isDark ? 'bg-[#333]' : 'bg-[#ddd]')}/>
                                <Tooltip content="Clear selection" side="bottom">
                                    <button onClick={() => setSelectedIds(new Set())}
                                        className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors', isDark ? 'text-[#555] hover:text-white hover:bg-white/5' : 'text-[#bbb] hover:text-[#333] hover:bg-[#ececec]')}>
                                        <X size={11}/>
                                    </button>
                                </Tooltip>
                            </div>
                        )}

                        <div className="relative">
                            <TbBtn label="Import / Export" icon={<ArrowRightLeft size={11} />} hasArrow onClick={() => setImportExportOpen(v => !v)} isDark={isDark} active={importExportOpen} />
                            <Dropdown open={importExportOpen} onClose={() => setImportExportOpen(false)} isDark={isDark}>
                                <div className="py-1">
                                    <DItem label="Import CSV" icon={<Download size={12} />} onClick={() => { setImportModalOpen(true, tab === 'people' ? 'Contact' : 'Company'); setImportExportOpen(false); }} isDark={isDark} />
                                    <DItem label="Export CSV" icon={<Upload size={12} />} onClick={handleExportCSV} isDark={isDark} />
                                    <DItem label="Import JSON" icon={<Download size={12} />} onClick={() => { fileInputRef.current?.click(); setImportExportOpen(false); }} isDark={isDark} />
                                    <DItem label="Export JSON" icon={<Upload size={12} />} onClick={handleExportJSON} isDark={isDark} />
                                </div>
                            </Dropdown>
                            <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Content ── */}
            <div className={cn("flex-1 overflow-auto p-5", gridBg)}>

                {/* ── People ── */}
                {tab === 'people' && (
                    <>
                        {isClientsLoading && clients.length === 0 && (view === 'grid' || isMobile) ? (
                            <ListViewSkeleton view="cards" isMobile={isMobile} isDark={isDark} />
                        ) : filteredPeople.length === 0 && !isClientsLoading ? (
                            <div className={cn("flex flex-col items-center justify-center h-full gap-3", muted)}>
                                <Users size={32} strokeWidth={1.25} />
                                <p className="text-[12px]">No contacts yet.</p>
                                <button onClick={() => setCreateModalOpen(true, 'Contact')}
                                    className="mt-1 text-[11px] font-semibold px-3 py-1.5 rounded-[8px] bg-primary text-primary-foreground hover:bg-primary-hover transition-colors">
                                    + New Contact
                                </button>
                            </div>
                        ) : (view === 'grid' || isMobile) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {filteredPeople.map(client => {
                                    const isSelected = selectedIds.has(client.id);
                                    const isActive = activeContactId === client.id;
                                    return (
                                        <ContextMenuRow
                                            key={client.id}
                                            items={getPeopleMenu(client)}
                                            isDark={isDark}
                                            onRowClick={() => openRightPanel({ type: 'contact', id: client.id })}
                                            className="h-full"
                                        >
                                            <div
                                                onClick={() => { if (selectedIds.size > 0) toggleRow(client.id); else openRightPanel({ type: 'contact', id: client.id }); }}
                                                className={cn(
                                                    "rounded-xl border h-full overflow-hidden cursor-pointer transition-all duration-150 relative group select-none",
                                                    cardBg, cardBorder,
                                                    isSelected
                                                        ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                                                        : isActive
                                                            ? isDark ? "border-[#3a3a3a] ring-1 ring-[#3a3a3a]" : "border-[#c0c0d0] ring-1 ring-[#c0c0d0] shadow-sm"
                                                            : isDark ? "hover:border-[#2e2e2e] hover:bg-[#1c1c1c]" : "hover:border-[#ccc] hover:shadow-sm"
                                                )}
                                            >
                                                {/* Header */}
                                                {/* Actions Overlay (Checkbox + Delete) */}
                                                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 z-20">
                                                    {/* Checkbox */}
                                                    <div className={cn('transition-all cursor-pointer', isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                                                        onClick={e => { e.stopPropagation(); toggleRow(client.id); }}>
                                                        <div className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                                            <div className={cn('w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all',
                                                                isSelected ? 'bg-primary border-primary' : isDark ? 'border-white/20 bg-black/20 backdrop-blur' : 'border-[#ccc] bg-white/80 backdrop-blur')}>
                                                                {isSelected && <Check size={10} strokeWidth={3} className="text-black"/>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Delete Individual (Hover) */}
                                                    {!isSelected && (
                                                        <div className="opacity-0 group-hover:opacity-100 transition-all">
                                                            <InlineDeleteButton 
                                                                onDelete={async () => {
                                                                    const { deleteClient } = useClientStore.getState();
                                                                    await deleteClient(client.id);
                                                                    appToast.error("Deleted", 'Contact deleted');
                                                                }} 
                                                                isDark={isDark} 
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 px-4 py-3.5 relative group">
                                                    <Avatar 
                                                        src={client.avatar_url} 
                                                        name={client.contact_person || client.company_name} 
                                                        className="w-7 h-7" 
                                                        isDark={isDark} 
                                                    />
                                                    <span className={cn("text-[13px] font-semibold truncate", textPrimary)}>
                                                        {client.contact_person || '—'}
                                                    </span>
                                                </div>
                                                {/* Rows */}
                                                {client.company_name && <CardRow label="Company" value={client.company_name} isDark={isDark} />}
                                                {client.email        && <CardRow label="Email"   value={client.email}        isDark={isDark} isLink />}
                                                {client.phone        && <CardRow label="Phone"   value={client.phone}        isDark={isDark} />}
                                                {client.country      && <CardRow label="Country" value={client.country}      isDark={isDark} />}
                                                {client.address      && <CardRow label="Address" value={client.address}      isDark={isDark} />}
                                                {!client.company_name && !client.email && !client.phone && !client.address && (
                                                    <div className={cn("border-t px-4 py-2 text-[11px]",
                                                        isDark ? "border-[#252525] text-[#444]" : "border-dashed border-[#e8e8e8] text-[#ccc]")}>
                                                        No details added
                                                    </div>
                                                )}
                                            </div>
                                        </ContextMenuRow>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-4 flex flex-col min-h-0 overflow-hidden">
                                <DataTable
                                    data={filteredPeople}
                                    columns={peopleColumns}
                                    storageKeyPrefix="clients_people"
                                    selectedIds={selectedIds}
                                    onToggleAll={() => toggleAll(filteredPeople)}
                                    onToggleRow={(id) => toggleRow(id)}
                                    onRowClick={(c) => openRightPanel({ type: 'contact', id: c.id })}
                                    rowMenuItems={getPeopleMenu}
                                    isLoading={isClientsLoading}
                                    isDark={isDark}
                                />
                            </div>
                        )}
                        {inviteModalContact && (
                            <SendEmailModal
                                isOpen={!!inviteModalContact}
                                onClose={() => setInviteModalContact(null)}
                                templateKey="workspace_invitation"
                                to={inviteModalContact.email}
                                variables={{}}
                                workspaceId={activeWorkspaceId || ''}
                                documentTitle="Workspace Invitation"
                            />
                        )}
                    </>
                )}

                {/* ── Companies ── */}
                {tab === 'companies' && (
                    <>
                        {isCompaniesLoading && companies.length === 0 && (view === 'grid' || isMobile) ? (
                            <ListViewSkeleton view="cards" isMobile={isMobile} isDark={isDark} />
                        ) : filteredCompanies.length === 0 && !isCompaniesLoading ? (
                            <div className={cn("flex flex-col items-center justify-center h-full gap-3", muted)}>
                                <Building2 size={32} strokeWidth={1.25} />
                                <p className="text-[12px]">No companies yet.</p>
                                <button onClick={() => setCreateModalOpen(true, 'Company')}
                                    className="mt-1 text-[11px] font-semibold px-3 py-1.5 rounded-[8px] bg-primary text-primary-foreground hover:bg-primary-hover transition-colors">
                                    + New Company
                                </button>
                            </div>
                        ) : (view === 'grid' || isMobile) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {filteredCompanies.map(company => {
                                    const linkedCount = clients.filter(c => c.company_name === company.name).length;
                                    const isSelected = selectedIds.has(company.id);
                                    const isActive = activeCompanyId === company.id;
                                    return (
                                        <ContextMenuRow
                                            key={company.id}
                                            items={getCompanyMenu(company)}
                                            isDark={isDark}
                                            onRowClick={() => openRightPanel({ type: 'company', id: company.id })}
                                            className="h-full"
                                        >
                                            <div
                                                onClick={() => { if (selectedIds.size > 0) toggleRow(company.id); else openRightPanel({ type: 'company', id: company.id }); }}
                                                className={cn(
                                                    "rounded-xl border h-full overflow-hidden cursor-pointer transition-all duration-150 relative group select-none",
                                                    cardBg, cardBorder,
                                                    isSelected
                                                        ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                                                        : isActive
                                                            ? isDark ? "border-[#3a3a3a] ring-1 ring-[#3a3a3a]" : "border-[#c0c0d0] ring-1 ring-[#c0c0d0] shadow-sm"
                                                            : isDark ? "hover:border-[#2e2e2e] hover:bg-[#1c1c1c]" : "hover:border-[#ccc] hover:shadow-sm"
                                                )}
                                            >
                                                {/* Header */}
                                                {/* Actions Overlay (Checkbox + Delete) */}
                                                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 z-20">
                                                    {/* Checkbox */}
                                                    <div className={cn('transition-all cursor-pointer', isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                                                        onClick={e => { e.stopPropagation(); toggleRow(company.id); }}>
                                                        <div className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                                            <div className={cn('w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all',
                                                                isSelected ? 'bg-primary border-primary' : isDark ? 'border-white/20 bg-black/20 backdrop-blur' : 'border-[#ccc] bg-white/80 backdrop-blur')}>
                                                                {isSelected && <Check size={10} strokeWidth={3} className="text-black"/>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Delete Individual (Hover) */}
                                                    {!isSelected && (
                                                        <div className="opacity-0 group-hover:opacity-100 transition-all">
                                                            <InlineDeleteButton 
                                                                onDelete={async () => {
                                                                    const { deleteCompany } = useCompanyStore.getState();
                                                                    await deleteCompany(company.id);
                                                                    appToast.error("Deleted", 'Company deleted');
                                                                }} 
                                                                isDark={isDark} 
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 px-4 py-3.5 relative group">
                                                    <Avatar 
                                                        src={company.avatar_url} 
                                                        name={company.name} 
                                                        className="w-7 h-7" 
                                                        isDark={isDark} 
                                                    />
                                                    <span className={cn("text-[13px] font-semibold truncate", textPrimary)}>
                                                        {company.name}
                                                    </span>
                                                </div>
                                                {/* Rows */}
                                                {company.industry && <CardRow label="Industry" value={company.industry} isDark={isDark} />}
                                                {company.email    && <CardRow label="Email"    value={company.email}    isDark={isDark} isLink />}
                                                {company.phone    && <CardRow label="Phone"    value={company.phone}    isDark={isDark} />}
                                                {company.website  && <CardRow label="Website"  value={company.website}  isDark={isDark} isLink />}
                                                {company.address  && <CardRow label="Address"  value={company.address}  isDark={isDark} />}
                                                {/* Footer */}
                                                <div className={cn(
                                                    "flex items-center gap-1.5 border-t px-4 py-2",
                                                    isDark ? "border-[#252525] text-[#444]" : "border-dashed border-[#e8e8e8] text-[#bbb]"
                                                )}>
                                                    <Users size={10} />
                                                    <span className="text-[10px]">{linkedCount} contact{linkedCount !== 1 ? 's' : ''}</span>
                                                </div>
                                            </div>
                                        </ContextMenuRow>
                                    );
                                })}
                            </div>
                            ) : (
                                <div className="p-4 flex flex-col min-h-0 overflow-hidden">
                                    <DataTable
                                        data={filteredCompanies}
                                        columns={companyColumns}
                                        storageKeyPrefix="clients_companies"
                                        selectedIds={selectedIds}
                                        onToggleAll={() => toggleAll(filteredCompanies)}
                                        onToggleRow={(id) => toggleRow(id)}
                                        onRowClick={(c) => openRightPanel({ type: 'company', id: c.id })}
                                        rowMenuItems={getCompanyMenu}
                                        isLoading={isCompaniesLoading}
                                        isDark={isDark}
                                    />
                                </div>
                            )}
                    </>

                )}
            </div>

            {/* ── Modals ── */}
            {/* Creation modals removed */}

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
                    const { deleteClient, bulkDeleteClients } = useClientStore.getState();
                    const { deleteCompany, bulkDeleteCompanies } = useCompanyStore.getState();

                    if (deletingId === 'bulk') {
                        const ids = Array.from(selectedIds);
                        if (tab === 'people') {
                            await bulkDeleteClients(ids);
                        } else {
                            await bulkDeleteCompanies(ids);
                        }
                        setSelectedIds(new Set());
                    } else if (deletingId) {
                        if (tab === 'people') await deleteClient(deletingId);
                        else await deleteCompany(deletingId);
                    }
                    setDeletingId(null);
                }}
            />
            {advancedFilterOpen && (
                <FilterPanel
                    fields={filterFields}
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
