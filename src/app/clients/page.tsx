"use client";

import React, { useState, useEffect } from 'react';
import {
    Search, Plus, Filter, LayoutGrid, List,
    Users, Mail, Phone, MapPin, Building2,
    Globe, Briefcase, Trash2, Archive, ArchiveRestore,
    Copy, Check, CheckSquare, X, MoreHorizontal,
    FileSpreadsheet, Upload, Download, ChevronRight
} from 'lucide-react';
import { gooeyToast } from 'goey-toast';
import { useClientStore } from '@/store/useClientStore';
import { useCompanyStore } from '@/store/useCompanyStore';
import { useUIStore } from '@/store/useUIStore';
import { motion, AnimatePresence } from 'framer-motion';
import ClientEditor from '@/components/clients/ClientEditor';
import { CreateCompanyModal } from '@/components/modals/CreateCompanyModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { cn } from '@/lib/utils';

import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';

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

function Chk({ checked, indeterminate, isDark }: { checked: boolean, indeterminate?: boolean, isDark: boolean }) {
    return (
        <div className={cn(
            "w-[14px] h-[14px] rounded-[3px] border flex items-center justify-center transition-all",
            checked || indeterminate
                ? "bg-primary border-primary text-black"
                : isDark ? "border-white/[0.1] hover:border-white/[0.2]" : "border-[#ccc] hover:border-[#aaa]"
        )}>
            {checked && <Check size={10} strokeWidth={4} />}
            {indeterminate && !checked && <div className="w-[8px] h-[1.5px] bg-white rounded-full" />}
        </div>
    );
}

function TbBtn({ label, icon, active, onClick, isDark, hasArrow }: { label: string; icon: React.ReactNode; active?: boolean; onClick?: () => void; isDark: boolean; hasArrow?: boolean; }) {
    return (
        <button onClick={onClick} className={cn(
            "flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium rounded transition-all",
            active
                ? (isDark ? "bg-white/10 text-white shadow-sm" : "bg-[#f0f0f0] text-black shadow-sm")
                : (isDark ? "text-[#666] hover:text-[#aaa] hover:bg-white/5" : "text-[#888] hover:text-black hover:bg-black/5")
        )}>
            {icon}
            <span>{label}</span>
            {hasArrow && <ChevronRight size={11} className={cn("opacity-40 transition-transform", active ? "rotate-90" : "rotate-0")} />}
        </button>
    );
}

function Dropdown({ open, onClose, isDark, children }: { open: boolean; onClose: () => void; isDark: boolean; children: React.ReactNode }) {
    const ref = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div ref={ref} className={cn("absolute top-full right-0 mt-1 z-50 min-w-[180px] rounded-xl border shadow-xl overflow-hidden",
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
            {active && <Check size={11} className="text-primary" />}
        </button>
    );
}

export default function ClientsPage() {
    const { clients, addClient, fetchClients, isLoading: isClientsLoading } = useClientStore();
    const { companies, fetchCompanies, isLoading: isCompaniesLoading } = useCompanyStore();
    const { theme, openRightPanel, rightPanel, setImportModalOpen } = useUIStore();
    const isDark = theme === 'dark';
    const [tab, setTab] = useState<Tab>('people');
    const [view, setView] = useState<ViewMode>('grid');
    const [search, setSearch] = useState('');
    const [isContactEditorOpen, setIsContactEditorOpen] = useState(false);
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [importExportOpen, setImportExportOpen] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deletingId, setDeletingId] = useState<string | null>(null);

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
        gooeyToast.success('Exported successfully');
        setImportExportOpen(false);
    };

    const handleExportCSV = () => {
        const data = tab === 'people' ? clients : companies;
        if (data.length === 0) {
            gooeyToast.error('No data to export');
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
        gooeyToast.success('CSV exported successfully');
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
                    gooeyToast.promise(promise, {
                        loading: 'Importing...',
                        success: 'Imported successfully',
                        error: 'Import failed'
                    });
                    await promise;
                }
            } catch (error) {
                gooeyToast.error('Invalid JSON file');
            }
        };
        reader.readAsText(file);
        if (e.target) e.target.value = '';
    };

    const handleSaveClient = async (data: any) => {
        await addClient(data);
        setIsContactEditorOpen(false);
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

    const filteredPeople = clients.filter(c =>
        c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );

    const filteredCompanies = companies.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.industry?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );

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

    return (
        <div className={cn(
            "flex flex-col h-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-[#f7f7f7] text-[#111]"
        )}>

            {/* ── Page header — hidden on mobile (MobileTopBar handles it) ── */}
            <div className={cn("hidden md:flex items-center justify-between px-5 py-3 shrink-0", isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-white")}>
                <h1 className="text-[15px] font-semibold tracking-tight">Contacts</h1>
                <button
                    onClick={() => tab === 'companies' ? setIsCompanyModalOpen(true) : setIsContactEditorOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-[8px] bg-primary hover:bg-primary-hover text-black transition-colors"
                >
                    <Plus size={13} strokeWidth={2.5} />
                    {tab === 'companies' ? 'New Company' : 'New Contact'}
                </button>
            </div>

            {/* ── Toolbar ── */}
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

                <div className={cn("w-[1px] h-4 mx-2", isDark ? "bg-[#333]" : "bg-[#e0e0e0]")} />

                <div className="relative mr-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 opacity-40" size={11} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search"
                        className={cn(
                            "pl-6 pr-3 py-1 text-[11px] rounded border focus:outline-none w-28 transition-all focus:w-44",
                            isDark
                                ? "bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-white/20"
                                : "bg-[#f5f5f5] border-[#e0e0e0] text-[#111] placeholder:text-[#aaa] focus:border-[#ccc]"
                        )}
                    />
                </div>

                <button className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-colors shrink-0",
                    isDark ? "text-[#777] hover:text-[#ccc] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]"
                )}>
                    <Filter size={11} /> Filter
                </button>

                <div className="flex-1" />

                <div className="flex items-center gap-1">
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
                                    gooeyToast.success(`${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''} duplicated`);
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
                                        <CheckSquare size={11}/>
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

                    {tab === 'people' && (['grid', 'list'] as ViewMode[]).map(v => (
                        <button key={v} onClick={() => { setView(v); setSelectedIds(new Set()); }}
                            className={cn(
                                "flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-colors",
                                view === v
                                    ? (isDark ? "bg-white/10 text-white" : "bg-[#f0f0f0] text-[#111]")
                                    : (isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]")
                            )}>
                            {v === 'grid' ? <LayoutGrid size={11} /> : <List size={11} />}
                        </button>
                    ))}

                    <div className={cn("w-[1px] h-4 mx-2 hidden md:block", isDark ? "bg-[#333]" : "bg-[#e0e0e0]")} />
                    
                    <div className="relative">
                        <TbBtn label="Import / Export" icon={<Upload size={11} />} hasArrow onClick={() => setImportExportOpen(v => !v)} isDark={isDark} active={importExportOpen} />
                        <Dropdown open={importExportOpen} onClose={() => setImportExportOpen(false)} isDark={isDark}>
                            <div className="py-1">
                                <DItem label="Import CSV" icon={<FileSpreadsheet size={12} />} onClick={() => { setImportModalOpen(true, tab === 'people' ? 'Contact' : 'Company'); setImportExportOpen(false); }} isDark={isDark} />
                                <DItem label="Export CSV" icon={<Download size={12} />} onClick={handleExportCSV} isDark={isDark} />
                                <DItem label="Import JSON" icon={<Upload size={12} />} onClick={() => { fileInputRef.current?.click(); setImportExportOpen(false); }} isDark={isDark} />
                                <DItem label="Export JSON" icon={<Download size={12} />} onClick={handleExportJSON} isDark={isDark} />
                            </div>
                        </Dropdown>
                        <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            <div className={cn("flex-1 overflow-auto p-5", gridBg)}>

                {/* ── People ── */}
                {tab === 'people' && (
                    <>
                        {isClientsLoading ? (
                            view === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {Array.from({ length: 20 }).map((_, i) => (
                                        <div key={i} className={cn("rounded-xl border overflow-hidden pointer-events-none", cardBg, cardBorder)}>
                                            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-transparent">
                                                <div className={cn("w-7 h-7 rounded-lg animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} />
                                                <div className={cn("h-3.5 w-24 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} />
                                            </div>
                                            <div className={cn("flex items-center gap-0 border-t py-2 px-4", isDark ? "border-white/[0.03]" : "border-dashed border-[#e8e8e8]")}>
                                                <span className={cn("text-[11px] shrink-0 w-[100px]", isDark ? "text-[#555]" : "text-[#aaa]")}>Email</span>
                                                <div className={cn("h-2.5 w-32 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} />
                                            </div>
                                            <div className={cn("flex items-center gap-0 border-t py-2 px-4", isDark ? "border-white/[0.03]" : "border-dashed border-[#e8e8e8]")}>
                                                <span className={cn("text-[11px] shrink-0 w-[100px]", isDark ? "text-[#555]" : "text-[#aaa]")}>Phone</span>
                                                <div className={cn("h-2.5 w-20 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} />
                                            </div>
                                            <div className={cn("flex items-center gap-0 border-t py-2 px-4", isDark ? "border-white/[0.03]" : "border-dashed border-[#e8e8e8]")}>
                                                <span className={cn("text-[11px] shrink-0 w-[100px]", isDark ? "text-[#555]" : "text-[#aaa]")}>Company</span>
                                                <div className={cn("h-2.5 w-24 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={cn("rounded-xl border overflow-hidden", isDark ? "border-[#222]" : "border-[#e8e8e8]")}>
                                    <div className={cn("grid px-4 py-2 text-[10px] font-semibold uppercase tracking-wider", isDark ? "bg-[#1a1a1a] border-b border-[#252525] text-[#555]" : "bg-[#fafafa] border-b border-[#ebebeb] text-[#aaa]")} style={{ gridTemplateColumns: '40px 36px 1fr 180px 160px 100px 140px' }}>
                                        <div /><div /><div>Name</div><div>Email</div><div>Phone</div><div>Country</div><div>Company</div>
                                    </div>
                                    {Array.from({ length: 25 }).map((_, i) => (
                                        <div key={i} className={cn("grid px-4 py-2.5 items-center pointer-events-none", i !== 0 && `border-t ${isDark ? "border-[#1f1f1f]" : "border-[#f5f5f5]"}`)} style={{ gridTemplateColumns: '40px 36px 1fr 180px 160px 100px 140px' }}>
                                            <div className="flex justify-center"><div className={cn("w-3.5 h-3.5 rounded-[3px] animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} /></div>
                                            <div className={cn("w-7 h-7 rounded-lg animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} />
                                            <div className="px-2"><div className={cn("h-3 w-28 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} /></div>
                                            <div className="px-2"><div className={cn("h-3 w-36 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} /></div>
                                            <div className="px-2"><div className={cn("h-3 w-20 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} /></div>
                                            <div className="px-2"><div className={cn("h-3 w-16 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} /></div>
                                            <div className="px-2"><div className={cn("h-3 w-24 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} /></div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : filteredPeople.length === 0 ? (
                            <div className={cn("flex flex-col items-center justify-center h-full gap-3", muted)}>
                                <Users size={32} strokeWidth={1.25} />
                                <p className="text-[12px]">No contacts yet.</p>
                                <button onClick={() => setIsContactEditorOpen(true)}
                                    className="mt-1 text-[11px] font-semibold px-3 py-1.5 rounded-[8px] bg-primary text-black hover:bg-primary-hover transition-colors">
                                    + New Contact
                                </button>
                            </div>
                        ) : view === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {filteredPeople.map(client => {
                                    const isSelected = selectedIds.has(client.id);
                                    const isActive = activeContactId === client.id;
                                    return (
                                        <div
                                            key={client.id}
                                            onClick={() => { if (selectedIds.size > 0) toggleRow(client.id); else openRightPanel({ type: 'contact', id: client.id }); }}
                                            className={cn(
                                                "rounded-xl border overflow-hidden cursor-pointer transition-all duration-150 relative group select-none",
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
                                                        <button onClick={e => { e.stopPropagation(); setDeletingId(client.id); }} className={cn("p-1.5 rounded-lg transition-colors", isDark ? "hover:bg-red-500/10 text-[#444] hover:text-red-500" : "hover:bg-red-50 text-[#ccc] hover:text-red-500")}>
                                                            <Trash2 size={12} />
                                                        </button>
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
                                    );
                                })}
                            </div>
                        ) : (
                            /* List view */
                            <div className={cn("rounded-xl border overflow-hidden", isDark ? "border-[#222]" : "border-[#e8e8e8]")}>
                                <div className={cn(
                                    "grid px-4 py-2 text-[10px] font-semibold uppercase tracking-wider",
                                    isDark ? "bg-[#1a1a1a] border-b border-[#252525] text-[#555]" : "bg-[#fafafa] border-b border-[#ebebeb] text-[#aaa]"
                                )} style={{ gridTemplateColumns: '40px 36px 1fr 180px 160px 100px 140px' }}>
                                    <div className="flex items-center justify-center cursor-pointer" onClick={() => toggleAll(filteredPeople)}>
                                        <div className={cn("w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-all",
                                            selectedIds.size === filteredPeople.length && filteredPeople.length > 0 ? "bg-primary border-primary" : isDark ? "border-white/10" : "border-[#ccc]")}>
                                            {selectedIds.size === filteredPeople.length && filteredPeople.length > 0 && <Check size={9} strokeWidth={4} className="text-black" />}
                                            {selectedIds.size > 0 && selectedIds.size < filteredPeople.length && <div className="w-2 h-0.5 bg-black rounded" />}
                                        </div>
                                    </div>
                                    <div /><div>Name</div><div>Email</div><div>Phone</div><div>Country</div><div>Company</div>
                                </div>
                                {filteredPeople.map((client, i) => {
                                    const isActive = activeContactId === client.id;
                                    return (
                                        <div
                                            key={client.id}
                                            onClick={() => openRightPanel({ type: 'contact', id: client.id })}
                                            className={cn(
                                                "grid px-4 py-2.5 text-[12px] cursor-pointer transition-colors group select-none",
                                                selectedIds.has(client.id)
                                                    ? "bg-primary/5"
                                                    : isDark ? "hover:bg-white/[0.025]" : "hover:bg-[#fafafa]",
                                                i !== 0 && `border-t ${isDark ? "border-[#1f1f1f]" : "border-[#f5f5f5]"}`
                                            )}
                                            style={{ gridTemplateColumns: '40px 36px 1fr 180px 160px 100px 140px' }}
                                        >
                                            <div className="flex items-center justify-center" onClick={e => { e.stopPropagation(); toggleRow(client.id); }}>
                                                <div className={cn("w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-all",
                                                    selectedIds.has(client.id) ? "bg-primary border-primary" : isDark ? "border-white/10 opacity-0 group-hover:opacity-100" : "border-[#ccc] opacity-0 group-hover:opacity-100")}>
                                                    {selectedIds.has(client.id) && <Check size={9} strokeWidth={4} className="text-black" />}
                                                </div>
                                            </div>
                                            <Avatar 
                                                src={client.avatar_url} 
                                                name={client.contact_person || client.company_name} 
                                                className="w-7 h-7" 
                                                isDark={isDark} 
                                            />
                                            <div className={cn("flex items-center font-medium truncate", textPrimary)}>
                                                {client.contact_person || '—'}
                                            </div>
                                            <div className="flex items-center truncate text-[#3b82f6]">{client.email || <span className={textSecondary}>—</span>}</div>
                                            <div className={cn("flex items-center truncate", textSecondary)}>{client.phone || '—'}</div>
                                            <div className={cn("flex items-center truncate", textSecondary)}>{client.country || '—'}</div>
                                            <div className={cn("flex items-center truncate relative", muted)}>
                                                {client.company_name || '—'}
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-inherit">
                                                    <button onClick={e => { e.stopPropagation(); setDeletingId(client.id); }} className="p-1 hover:bg-red-500/10 text-[#bbb] hover:text-red-500 rounded transition-all">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ── Companies ── */}
                {tab === 'companies' && (
                    <>
                        {isCompaniesLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <div key={i} className={cn("rounded-xl border overflow-hidden pointer-events-none", cardBg, cardBorder)}>
                                        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-transparent">
                                            <div className={cn("w-7 h-7 rounded-lg animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} />
                                            <div className={cn("h-3.5 w-32 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} />
                                        </div>
                                        <div className={cn("flex items-center gap-0 border-t py-2 px-4", isDark ? "border-white/[0.03]" : "border-dashed border-[#e8e8e8]")}>
                                            <span className={cn("text-[11px] shrink-0 w-[100px]", isDark ? "text-[#555]" : "text-[#aaa]")}>Industry</span>
                                            <div className={cn("h-2.5 w-24 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} />
                                        </div>
                                        <div className={cn("flex items-center gap-0 border-t py-2 px-4", isDark ? "border-white/[0.03]" : "border-dashed border-[#e8e8e8]")}>
                                            <span className={cn("text-[11px] shrink-0 w-[100px]", isDark ? "text-[#555]" : "text-[#aaa]")}>Email</span>
                                            <div className={cn("h-2.5 w-28 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} />
                                        </div>
                                        <div className={cn("flex items-center gap-0 border-t py-2 px-4", isDark ? "border-white/[0.03]" : "border-dashed border-[#e8e8e8]")}>
                                            <span className={cn("text-[11px] shrink-0 w-[100px]", isDark ? "text-[#555]" : "text-[#aaa]")}>Phone</span>
                                            <div className={cn("h-2.5 w-20 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} />
                                        </div>
                                        <div className={cn("flex items-center gap-1.5 border-t px-4 py-3", isDark ? "border-[#252525]" : "border-dashed border-[#e8e8e8]")}>
                                            <div className={cn("h-2.5 w-16 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.05]")} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredCompanies.length === 0 ? (
                            <div className={cn("flex flex-col items-center justify-center h-full gap-3", muted)}>
                                <Building2 size={32} strokeWidth={1.25} />
                                <p className="text-[12px]">No companies yet.</p>
                                <button onClick={() => setIsCompanyModalOpen(true)}
                                    className="mt-1 text-[11px] font-semibold px-3 py-1.5 rounded-[8px] bg-primary text-black hover:bg-primary-hover transition-colors">
                                    + New Company
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {filteredCompanies.map(company => {
                                    const linkedCount = clients.filter(c => c.company_name === company.name).length;
                                    const isSelected = selectedIds.has(company.id);
                                    const isActive = activeCompanyId === company.id;
                                    return (
                                        <div
                                            key={company.id}
                                            onClick={() => { if (selectedIds.size > 0) toggleRow(company.id); else openRightPanel({ type: 'company', id: company.id }); }}
                                            className={cn(
                                                "rounded-xl border overflow-hidden cursor-pointer transition-all duration-150 relative group select-none",
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
                                                        <button onClick={e => { e.stopPropagation(); setDeletingId(company.id); }} className={cn("p-1.5 rounded-lg transition-colors", isDark ? "hover:bg-red-500/10 text-[#444] hover:text-red-500" : "hover:bg-red-50 text-[#ccc] hover:text-red-500")}>
                                                            <Trash2 size={12} />
                                                        </button>
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
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Modals ── */}
            {isContactEditorOpen && (
                <ClientEditor onClose={() => setIsContactEditorOpen(false)} onSave={handleSaveClient} />
            )}
            <CreateCompanyModal
                open={isCompanyModalOpen}
                onClose={() => setIsCompanyModalOpen(false)}
                onCreated={() => fetchCompanies()}
            />

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
        </div>
    );
}
