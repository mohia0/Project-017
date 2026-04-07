"use client";

import React, { useState, useEffect } from 'react';
import {
    Search, Plus, Filter, LayoutGrid, List,
    Users, Mail, Phone, MapPin, Building2,
    Globe, Briefcase, Trash2, Archive, ArchiveRestore,
    Copy, Check, X, MoreHorizontal
} from 'lucide-react';
import { useClientStore } from '@/store/useClientStore';
import { useCompanyStore } from '@/store/useCompanyStore';
import { useUIStore } from '@/store/useUIStore';
import ClientEditor from '@/components/clients/ClientEditor';
import { CreateCompanyModal } from '@/components/modals/CreateCompanyModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { cn } from '@/lib/utils';

type Tab = 'people' | 'companies';
type ViewMode = 'grid' | 'list';

function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

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
                <span className="text-[11px] text-[#4dbf39] truncate">{value}</span>
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
                ? "bg-[#4dbf39] border-[#4dbf39] text-black"
                : isDark ? "border-white/[0.1] hover:border-white/[0.2]" : "border-[#ccc] hover:border-[#aaa]"
        )}>
            {checked && <Check size={10} strokeWidth={4} />}
            {indeterminate && !checked && <div className="w-[8px] h-[1.5px] bg-white rounded-full" />}
        </div>
    );
}

function TbBtn({ label, icon, active, onClick, isDark }: { label: string; icon: React.ReactNode; active?: boolean; onClick?: () => void; isDark: boolean }) {
    return (
        <button onClick={onClick} className={cn(
            "flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium rounded transition-all",
            active
                ? (isDark ? "bg-white/10 text-white shadow-sm" : "bg-[#f0f0f0] text-black shadow-sm")
                : (isDark ? "text-[#666] hover:text-[#aaa] hover:bg-white/5" : "text-[#888] hover:text-black hover:bg-black/5")
        )}>
            {icon}
            <span>{label}</span>
        </button>
    );
}

export default function ClientsPage() {
    const { clients, addClient, fetchClients } = useClientStore();
    const { companies, fetchCompanies } = useCompanyStore();
    const { theme, openRightPanel, rightPanel } = useUIStore();
    const isDark = theme === 'dark';
    const [tab, setTab] = useState<Tab>('people');
    const [view, setView] = useState<ViewMode>('grid');
    const [search, setSearch] = useState('');
    const [isContactEditorOpen, setIsContactEditorOpen] = useState(false);
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => { fetchClients(); fetchCompanies(); }, [fetchClients, fetchCompanies]);

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

            {/* ── Page header ── */}
            <div className={cn("flex items-center justify-between px-5 py-3 shrink-0", isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-white")}>
                <h1 className="text-[15px] font-semibold tracking-tight">Contacts</h1>
                <button
                    onClick={() => tab === 'companies' ? setIsCompanyModalOpen(true) : setIsContactEditorOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-[8px] bg-[#4dbf39] hover:bg-[#59d044] text-black transition-colors"
                >
                    <Plus size={13} strokeWidth={2.5} />
                    {tab === 'companies' ? 'New Company' : 'New Contact'}
                </button>
            </div>

            {/* ── Toolbar ── */}
            <div className={cn("flex items-center gap-0 px-4 py-1.5 shrink-0", isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-[#f7f7f7]")}>
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

                {tab === 'people' && (
                    <div className="ml-auto flex items-center gap-1">
                        {/* Bulk banner */}
                        {selectedIds.size > 0 && (
                            <div className={cn("mr-2 flex items-center gap-4 px-3 py-1 rounded-lg text-[11px] font-medium border",
                                isDark ? "bg-[#1c1c1c] border-[#2e2e2e] text-[#aaa]" : "bg-[#f8f8f8] border-[#e8e8e8] text-[#666]")}>
                                <span className="opacity-50">{selectedIds.size} selected</span>
                                <div className={cn("w-[1px] h-3", isDark ? "bg-[#333]" : "bg-[#ddd]")} />
                                <button onClick={() => setDeletingId('bulk')} className="hover:text-red-500 flex items-center gap-1.5 transition-colors text-red-500/80">
                                    <Trash2 size={11} className="opacity-70" />Delete
                                </button>
                            </div>
                        )}

                        {(['grid', 'list'] as ViewMode[]).map(v => (
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
                    </div>
                )}
            </div>

            {/* ── Content ── */}
            <div className={cn("flex-1 overflow-auto p-5", gridBg)}>

                {/* ── People ── */}
                {tab === 'people' && (
                    <>
                        {filteredPeople.length === 0 ? (
                            <div className={cn("flex flex-col items-center justify-center h-full gap-3", muted)}>
                                <Users size={32} strokeWidth={1.25} />
                                <p className="text-[12px]">No contacts yet.</p>
                                <button onClick={() => setIsContactEditorOpen(true)}
                                    className="mt-1 text-[11px] font-semibold px-3 py-1.5 rounded-[8px] bg-[#4dbf39] text-black hover:bg-[#59d044] transition-colors">
                                    + New Contact
                                </button>
                            </div>
                        ) : view === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {filteredPeople.map(client => {
                                    const isActive = activeContactId === client.id;
                                    return (
                                        <div
                                            key={client.id}
                                            onClick={() => openRightPanel({ type: 'contact', id: client.id })}
                                            className={cn(
                                                "rounded-xl border overflow-hidden cursor-pointer transition-all duration-150",
                                                cardBg, cardBorder,
                                                isActive
                                                    ? isDark ? "border-[#3a3a3a] ring-1 ring-[#3a3a3a]" : "border-[#c0c0d0] ring-1 ring-[#c0c0d0] shadow-sm"
                                                    : isDark ? "hover:border-[#2e2e2e] hover:bg-[#1c1c1c]" : "hover:border-[#ccc] hover:shadow-sm"
                                            )}
                                        >
                                            {/* Header */}
                                            <div className="flex items-center gap-3 px-4 py-3.5 relative group">
                                                <div className="absolute top-3.5 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={e => { e.stopPropagation(); toggleRow(client.id); }} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded">
                                                        <Chk checked={selectedIds.has(client.id)} isDark={isDark} />
                                                    </button>
                                                    <button onClick={e => { e.stopPropagation(); setDeletingId(client.id); }} className="p-1 hover:bg-red-500/10 text-[#bbb] hover:text-red-500 rounded transition-all">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                <div className={cn(
                                                    "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0",
                                                    isDark ? "bg-white/8 text-[#888]" : "bg-[#f0f0f0] text-[#777]"
                                                )}>
                                                    {getInitials(client.contact_person || client.company_name)}
                                                </div>
                                                <span className={cn("text-[13px] font-semibold truncate", textPrimary)}>
                                                    {client.contact_person || '—'}
                                                </span>
                                            </div>
                                            {/* Rows */}
                                            {client.company_name && <CardRow label="Company" value={client.company_name} isDark={isDark} />}
                                            {client.email        && <CardRow label="Email"   value={client.email}        isDark={isDark} isLink />}
                                            {client.phone        && <CardRow label="Phone"   value={client.phone}        isDark={isDark} />}
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
                                )} style={{ gridTemplateColumns: '40px 36px 1fr 180px 160px 140px' }}>
                                    <div className="flex items-center justify-center cursor-pointer" onClick={() => toggleAll(filteredPeople)}>
                                        <Chk checked={selectedIds.size === filteredPeople.length && filteredPeople.length > 0} indeterminate={selectedIds.size > 0 && selectedIds.size < filteredPeople.length} isDark={isDark} />
                                    </div>
                                    <div /><div>Name</div><div>Email</div><div>Phone</div><div>Company</div>
                                </div>
                                {filteredPeople.map((client, i) => {
                                    const isActive = activeContactId === client.id;
                                    return (
                                        <div
                                            key={client.id}
                                            onClick={() => openRightPanel({ type: 'contact', id: client.id })}
                                            className={cn(
                                                "grid px-4 py-2.5 text-[12px] cursor-pointer transition-colors group",
                                                selectedIds.has(client.id)
                                                    ? isDark ? "bg-blue-900/10" : "bg-blue-50/40"
                                                    : isDark ? "hover:bg-white/[0.025]" : "hover:bg-[#fafafa]",
                                                i !== 0 && `border-t ${isDark ? "border-[#1f1f1f]" : "border-[#f5f5f5]"}`
                                            )}
                                            style={{ gridTemplateColumns: '40px 36px 1fr 180px 160px 140px' }}
                                        >
                                            <div className="flex items-center justify-center" onClick={e => toggleRow(client.id, e)}>
                                                <Chk checked={selectedIds.has(client.id)} isDark={isDark} />
                                            </div>
                                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold",
                                                isDark ? "bg-white/8 text-[#888]" : "bg-[#f0f0f0] text-[#777]")}>
                                                {getInitials(client.contact_person || client.company_name)}
                                            </div>
                                            <div className={cn("flex items-center font-medium truncate", textPrimary)}>
                                                {client.contact_person || '—'}
                                            </div>
                                            <div className="flex items-center truncate text-[#3b82f6]">{client.email || <span className={textSecondary}>—</span>}</div>
                                            <div className={cn("flex items-center truncate", textSecondary)}>{client.phone || '—'}</div>
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
                        {filteredCompanies.length === 0 ? (
                            <div className={cn("flex flex-col items-center justify-center h-full gap-3", muted)}>
                                <Building2 size={32} strokeWidth={1.25} />
                                <p className="text-[12px]">No companies yet.</p>
                                <button onClick={() => setIsCompanyModalOpen(true)}
                                    className="mt-1 text-[11px] font-semibold px-3 py-1.5 rounded-[8px] bg-[#4dbf39] text-black hover:bg-[#59d044] transition-colors">
                                    + New Company
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {filteredCompanies.map(company => {
                                    const linkedCount = clients.filter(c => c.company_name === company.name).length;
                                    const isActive = activeCompanyId === company.id;
                                    return (
                                        <div
                                            key={company.id}
                                            onClick={() => openRightPanel({ type: 'company', id: company.id })}
                                            className={cn(
                                                "rounded-xl border overflow-hidden cursor-pointer transition-all duration-150",
                                                cardBg, cardBorder,
                                                isActive
                                                    ? isDark ? "border-[#3a3a3a] ring-1 ring-[#3a3a3a]" : "border-[#c0c0d0] ring-1 ring-[#c0c0d0] shadow-sm"
                                                    : isDark ? "hover:border-[#2e2e2e] hover:bg-[#1c1c1c]" : "hover:border-[#ccc] hover:shadow-sm"
                                            )}
                                        >
                                            {/* Header */}
                                            <div className="flex items-center gap-3 px-4 py-3.5 relative group">
                                                <div className="absolute top-3.5 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={e => { e.stopPropagation(); toggleRow(company.id); }} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded">
                                                        <Chk checked={selectedIds.has(company.id)} isDark={isDark} />
                                                    </button>
                                                    <button onClick={e => { e.stopPropagation(); setDeletingId(company.id); }} className="p-1 hover:bg-red-500/10 text-[#bbb] hover:text-red-500 rounded transition-all">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                <div className={cn(
                                                    "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0",
                                                    isDark ? "bg-white/8 text-[#888]" : "bg-[#f0f0f0] text-[#777]"
                                                )}>
                                                    {company.name.slice(0, 2).toUpperCase()}
                                                </div>
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
                    const { deleteClient } = useClientStore.getState();
                    const { deleteCompany } = useCompanyStore.getState();

                    if (deletingId === 'bulk') {
                        const ids = Array.from(selectedIds);
                        for (const id of ids) {
                            if (tab === 'people') await deleteClient(id);
                            else await deleteCompany(id);
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
