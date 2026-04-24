"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useProposalStore, ProposalStatus, Proposal } from '@/store/useProposalStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useClientStore } from '@/store/useClientStore';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { STATUS_COLORS, getStatusColors } from '@/lib/statusConfig';
import {
    Search, Table2, LayoutGrid, Edit3, ChevronDown,
    ArrowUpDown, Archive, ArrowRightLeft, Download, Upload, Plus, User, Filter,
    Calendar, Check, X, ArchiveRestore, ChevronsUpDown,
    Copy, Trash2, CheckCircle, SlidersHorizontal, ChevronRight,
    FileJson, FileSpreadsheet, Link2, ExternalLink
} from 'lucide-react';
import { InlineDeleteButton } from '@/components/ui/InlineDeleteButton';
import { ThreeDotMenu, ContextMenuPopup, useRowContextMenu, ContextMenuRow } from '@/components/ui/RowContextMenu';
import { useRouter } from 'next/navigation';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import ClientEditor from '@/components/clients/ClientEditor';
import { appToast } from '@/lib/toast';
import { Tooltip } from '@/components/ui/Tooltip';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SearchInput } from '@/components/ui/SearchInput';
import { MoneyAmount, convertAmount } from '@/components/ui/MoneyAmount';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { DataTable, DataTableColumn } from '@/components/ui/DataTable';

/* ─── Config ─────────────────────────────────────────────────────── */
const STATUS_ORDER: ProposalStatus[] = ['Draft', 'Pending', 'Accepted', 'Overdue', 'Declined', 'Cancelled'];


// Removed local fmt$ to use global MoneyAmount component
function fmtDate(d: string | null | undefined) {
    if (!d) return '—';
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}
function timeAgo(d: string | null | undefined) {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const ms = now.getTime() - date.getTime();
    const days = Math.floor(Math.abs(ms) / 86400000);
    const isFuture = ms < 0;

    if (days === 0) return 'today';
    if (days === 1) return isFuture ? 'tomorrow' : 'yesterday';
    
    if (days < 30) {
        return isFuture ? `due in ${days} days` : `${days} days ago`;
    }
    
    const months = Math.floor(days / 30);
    if (isFuture) return `in about ${months} month${months > 1 ? 's' : ''}`;
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
function TbBtn({ label, icon, active, hasArrow, onClick, isDark, activeColor }: {
    label?: string; icon?: React.ReactNode; active?: boolean;
    hasArrow?: boolean; onClick?: () => void; isDark: boolean;
    activeColor?: string;
}) {
    return (
        <button onClick={onClick} className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-colors shrink-0",
            active
                ? activeColor || (isDark ? "bg-white/10 text-white" : "bg-[#ebebf5] text-[#111]")
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

/* ─── Dropdown ──────────────────────────────────────────────────── */
function Dropdown({ open, onClose, isDark, children, align = 'right', minWidth = '180px' }: { 
    open: boolean; 
    onClose: () => void; 
    isDark: boolean; 
    children: React.ReactNode; 
    align?: 'left' | 'right' | 'center';
    minWidth?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);

    React.useLayoutEffect(() => {
        if (open && ref.current?.parentElement) {
            const rect = ref.current.parentElement.getBoundingClientRect();
            let left = rect.left;
            if (align === 'center') left = rect.left + rect.width / 2;
            if (align === 'right') left = rect.right;
            setCoords({ top: rect.bottom + 4, left });
        }
    }, [open, align]);

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
            style={coords ? {
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                minWidth
            } : { opacity: 0 }}
            className={cn(
                "fixed z-[1000] rounded-xl border shadow-xl overflow-hidden",
                align === 'center' && "-translate-x-1/2",
                align === 'right' && "-translate-x-full",
                isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
            )}
        >
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

/* ─── Proposal Card ───────────────────────────────── */
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

function ProposalCard({ p, onOpen, onArchive, isDark, onStatusChange, isSelected, onToggle, onClientChange, customStatuses = [] }: {
    p: Proposal; onOpen: () => void; onArchive: () => void; isDark: boolean;
    onStatusChange: (s: ProposalStatus) => void; isSelected: boolean; onToggle: () => void;
    onClientChange: (clientId: string, clientName: string) => void;
    customStatuses: any[];
}) {
    const [statusOpen, setStatusOpen] = useState(false);
    const sc = getStatusColors(p.status, customStatuses);
    
    // Sort and filter active statuses
    const activeStatues = customStatuses
        .filter(s => s.is_active || s.name === p.status) // Keep current status even if inactive
        .sort((a,b) => a.position - b.position);

    const dynamicStyle = (sc as any).dynamic ? {
        backgroundColor: (sc as any).dynamic.bg,
        color: (sc as any).dynamic.text,
        borderColor: (sc as any).dynamic.border
    } : {};
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
                <div className={cn("font-bold text-[14px] tracking-tight text-primary uppercase", isDark ? "text-primary" : "text-primary")}>
                    {p.proposal_number || p.id?.slice(-6).toUpperCase() || '—'}
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
                        currentName={p.client_name}
                        currentId={p.client_id}
                        onClientChange={onClientChange}
                        isDark={isDark}
                        variant="card"
                    />
                </CardRow>

                <CardRow label="Expiration date" isDark={isDark}>
                    {p.due_date ? <span>{fmtDate(p.due_date)} <span className="opacity-60 font-normal">({timeAgo(p.due_date)})</span></span> : ''}
                </CardRow>

                {p.accepted_at && (
                    <CardRow label="Accepted date" isDark={isDark}>
                        <div className="flex items-center gap-1.5 text-green-500 font-bold">
                            <CheckCircle size={10} />
                            <span>{fmtDate(p.accepted_at)}</span>
                        </div>
                    </CardRow>
                )}

                <CardRow label="Issue date" isDark={isDark}>
                    {p.issue_date ? <span>{fmtDate(p.issue_date)} <span className="opacity-60 font-normal">({timeAgo(p.issue_date)})</span></span> : ''}
                </CardRow>

                <CardRow label="Total" isDark={isDark}>
                    <MoneyAmount amount={Number(p.amount || 0)} currency={p.meta?.currency} showBadge />
                </CardRow>

                <CardRow label="Status" isDark={isDark} noBorder>
                    <div className="relative flex-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); setStatusOpen(!statusOpen); }}
                            className="flex items-center justify-between min-w-[100px] px-2.5 py-1.5 rounded-[6px] font-semibold border"
                            style={sc.dynamic ? {
                                backgroundColor: sc.dynamic.bg,
                                color: sc.dynamic.text,
                                borderColor: sc.dynamic.border
                            } : {}}
                        >
                            <span>{p.status}</span>
                            <ChevronsUpDown size={11} className="opacity-70" />
                        </button>
                        <Dropdown open={statusOpen} onClose={() => setStatusOpen(false)} isDark={isDark}>
                            <div className="py-1 min-w-[140px]">
                                {activeStatues.map(s => {
                                    const sSc = getStatusColors(s.name, customStatuses);
                                    const isActive = s.name === p.status;
                                    const sDynamic = (sSc as any).dynamic;
                                    return (
                                        <button key={s.id} onClick={(e) => { e.stopPropagation(); onStatusChange(s.name as any); setStatusOpen(false); }}
                                            className={cn("w-full flex items-center justify-between px-3.5 py-2 text-[12px] text-left transition-colors",
                                                isActive ? (isDark ? "bg-white/5" : "bg-[#f5f5f5]") : (isDark ? "hover:bg-white/5" : "hover:bg-[#fafafa]")
                                            )}
                                        >
                                            <span 
                                                className={cn("font-medium", isDark ? "" : sSc.badgeText)} 
                                                style={isDark ? { color: sSc.bar } : (sDynamic ? { color: sDynamic.text } : {})}
                                            >
                                                {s.name}
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

            {/* Quick actions */}
            <div className="absolute top-2.5 right-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                    onClick={e => { 
                        e.stopPropagation(); 
                        window.open(window.location.origin + '/p/proposal/' + p.id, '_blank');
                    }}
                    title="Open Link"
                    className={cn(
                        "w-6 h-6 rounded flex items-center justify-center transition-all",
                        isDark ? "bg-[#2a2a2a] text-[#888] hover:text-[#ccc]" : "bg-white border border-[#e0e0e0] shadow-sm text-[#666] hover:bg-[#fafafa]"
                    )}
                >
                    <ExternalLink size={11} />
                </button>
                <button
                    onClick={e => { e.stopPropagation(); onArchive(); }}
                    title="Archive"
                    className={cn(
                        "w-6 h-6 rounded flex items-center justify-center transition-all",
                        isDark ? "bg-[#2a2a2a] text-[#888] hover:text-[#ccc]" : "bg-white border border-[#e0e0e0] shadow-sm text-[#666] hover:bg-[#fafafa]"
                    )}
                >
                    <Archive size={11} />
                </button>
            </div>
        </div>
    );
}


function StatusCell({ status, onStatusChange, isDark, customStatuses = [] }: { 
    status: ProposalStatus; 
    onStatusChange: (s: ProposalStatus) => void; 
    isDark: boolean;
    customStatuses: any[];
}) {
    const [open, setOpen] = useState(false);
    const sc = getStatusColors(status, customStatuses);
    const activeStatues = customStatuses
        .filter(s => s.is_active || s.name === status)
        .sort((a,b) => a.position - b.position);

    const dynamicStyle = (sc as any).dynamic ? {
        backgroundColor: (sc as any).dynamic.bg,
        color: (sc as any).dynamic.text,
        borderColor: (sc as any).dynamic.border
    } : {};

    return (
        <div className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold border transition-colors"
                style={sc.dynamic ? {
                    backgroundColor: sc.dynamic.bg,
                    color: sc.dynamic.text,
                    borderColor: sc.dynamic.border
                } : {}}
            >
                {status}<ChevronDown size={10} className="opacity-50" />
            </button>
            <Dropdown open={open} onClose={() => setOpen(false)} isDark={isDark} align="center">
                <div className="py-1 min-w-[140px]">
                    {activeStatues.map(s => {
                        const sSc = getStatusColors(s.name, customStatuses);
                        const isActive = s.name === status;
                        const sDynamic = (sSc as any).dynamic;
                        return (
                            <button key={s.id} onClick={(e) => { e.stopPropagation(); onStatusChange(s.name as any); setOpen(false); }}
                                className={cn("w-full flex items-center justify-between px-3.5 py-2 text-[12px] text-left transition-colors",
                                    isActive ? (isDark ? "bg-white/5" : "bg-[#f5f5f5]") : (isDark ? "hover:bg-white/5" : "hover:bg-[#fafafa]")
                                )}
                            >
                                <span 
                                    className={cn("font-medium", isDark ? "" : sSc.badgeText)} 
                                    style={isDark ? { color: sSc.bar } : (sDynamic ? { color: sDynamic.text } : {})}
                                >
                                    {s.name}
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
        return clients.filter(c => c.company_name.toLowerCase().includes(search.toLowerCase()));
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
                        onClientChange('', ''); 
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
            onClientChange(client.id, client.contact_person || client.company_name);
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
                align="center"
                minWidth="280px"
            >
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
                    {filtered.length === 0 && !search ? (
                        <div className="px-3 py-4 text-center opacity-40 text-[11px]">
                            No clients found
                        </div>
                    ) : (
                        <>
                            {filtered.map(c => (
                                <button key={c.id} onClick={(e) => { e.stopPropagation(); onClientChange(c.id, c.contact_person || c.company_name); setOpen(false); }}
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

/* ─── Mobile proposal list item ───────────────────────────────── */
function MobileProposalRow({ p, onOpen, isDark, onStatusChange, onArchive, isArchived }: {
    p: Proposal; onOpen: () => void; isDark: boolean;
    onStatusChange: (s: ProposalStatus) => void;
    onArchive: () => void; isArchived: boolean;
}) {
    const sc = getStatusColors(p.status);
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
                style={{ backgroundColor: getStatusColors(p.status).bar }}
            />
            {/* Main info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={cn("font-semibold text-[13.5px] truncate", isDark ? "text-white" : "text-[#111]")}>
                        {p.title || 'New Proposal'}
                    </span>
                    <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-[6px] shrink-0 border",
                        isDark ? "bg-white/[0.06] text-[#888] border-white/10" : cn(sc.badge, sc.badgeText, sc.badgeBorder)
                    )}>
                        {p.status}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className={cn("flex items-center gap-1 text-[11.5px]", isDark ? "text-[#666]" : "text-[#999]")}>
                        <User size={10} className="opacity-60" />
                        <span className="truncate max-w-[120px]">{p.client_name || '—'}</span>
                    </div>
                    <span className={cn("text-[11px]", isDark ? "text-[#555]" : "text-[#bbb]")}>
                        {p.status === 'Accepted' && p.accepted_at ? (
                            <span className="text-green-500 font-bold flex items-center gap-1">
                                <CheckCircle size={10} /> {fmtDate(p.accepted_at)}
                            </span>
                        ) : p.due_date ? fmtDate(p.due_date) : '—'}
                    </span>
                </div>
            </div>
            {/* Amount */}
            <div className="shrink-0 text-right">
                <div className={cn("text-[13px] font-bold tabular-nums", isDark ? "text-[#ddd]" : "text-[#222]")}>
                    <MoneyAmount amount={Number(p.amount || 0)} currency={p.meta?.currency} showBadge />
                </div>
                <ChevronRight size={14} className={cn("ml-auto mt-0.5", isDark ? "text-[#444]" : "text-[#ccc]")} />
            </div>
        </div>
    );
}

/* ─── Main page ─────────────────────────────────────────────────── */
export default function ProposalsPage() {
    const router = useRouter();
    const { theme, setImportModalOpen, activeWorkspaceId, setCreateModalOpen, pageViews, setPageView } = useUIStore();
    const { proposals, fetchProposals, updateProposal, addProposal, deleteProposal, isLoading } = useProposalStore();
    const { statuses, fetchStatuses } = useSettingsStore();

    useEffect(() => {
        if (activeWorkspaceId) fetchStatuses(activeWorkspaceId);
    }, [activeWorkspaceId]);

    const customStatuses = useMemo(() => statuses.filter(s => s.tool === 'proposals'), [statuses]);
    const activeStatues = useMemo(() => customStatuses.filter(s => s.is_active).sort((a,b) => a.position - b.position), [customStatuses]);

    const isDark = theme === 'dark';
    const isMobile = useIsMobile();
    const view = (pageViews['proposals'] as 'table' | 'cards') || 'table';
    const setView = (v: 'table' | 'cards') => setPageView('proposals', v);
    const [importExportOpen, setImportExportOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingStatusChange, setPendingStatusChange] = useState<{ id: string, status: ProposalStatus } | null>(null);

    const handleStatusChangeRequest = (id: string, newStatus: ProposalStatus) => {
        const p = proposals.find(prod => prod.id === id);
        if (p && (p.status === 'Accepted' || p.status === 'Declined')) {
            setPendingStatusChange({ id, status: newStatus });
        } else {
            updateProposal(id, { status: newStatus });
        }
    };

    const confirmStatusChange = () => {
        if (!pendingStatusChange) return;
        const p = proposals.find(prod => prod.id === pendingStatusChange.id);
        if (p) {
            const nb = Array.isArray(p.blocks) ? p.blocks.map((b: any) => 
                b.type === 'signature' ? { 
                    ...b, 
                    signed: false, 
                    signatureImage: null, 
                    signedAt: null,
                    signerName: '' 
                } : b
            ) : p.blocks;

            updateProposal(p.id, { 
                status: pendingStatusChange.status,
                blocks: nb 
            });
        }
        setPendingStatusChange(null);
    };
    /* ... existing state ... */
    const [statusFilter, setStatusFilter] = useState<string | 'All'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

    useEffect(() => { fetchProposals(); }, [fetchProposals]);

    /* ── Derived data ── */
    const filtered = useMemo(() => {
        let r = proposals.filter(p => {
            if (showArchived) return archivedIds.has(p.id);
            if (archivedIds.has(p.id)) return false;
            if (statusFilter !== 'All' && p.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const idMatch = p.id?.toLowerCase().slice(-6).includes(q);
                const numMatch = p.proposal_number?.toLowerCase().includes(q);
                if (!p.title?.toLowerCase().includes(q) && !p.client_name?.toLowerCase().includes(q) && !idMatch && !numMatch) return false;
            }
            if (dateFilter === 'month' && !isThisMonth(p.issue_date)) return false;
            if (dateFilter === 'year' && !isThisYear(p.issue_date)) return false;
            return true;
        });
        if (orderBy === 'issue_date') r = [...r].sort((a, b) => new Date(b.issue_date || 0).getTime() - new Date(a.issue_date || 0).getTime());
        else if (orderBy === 'amount') r = [...r].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
        else r = [...r].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        return r;
    }, [proposals, statusFilter, searchQuery, dateFilter, orderBy, archivedIds, showArchived]);

    const stats = useMemo(() => {
        const s: Record<string, { count: number; amount: number }> = {
            All: { count: 0, amount: 0 }
        };
        
        // Initialize with active statuses
        activeStatues.forEach(st => s[st.name] = { count: 0, amount: 0 });

        proposals.filter(p => {
            if (showArchived) return archivedIds.has(p.id);
            if (archivedIds.has(p.id)) return false;
            if (dateFilter === 'month' && !isThisMonth(p.issue_date)) return false;
            if (dateFilter === 'year' && !isThisYear(p.issue_date)) return false;
            return true;
        }).forEach(p => {
            s.All.count++; s.All.amount += Number(p.amount || 0);
            if (!s[p.status]) s[p.status] = { count: 0, amount: 0 };
            s[p.status].count++; s[p.status].amount += Number(p.amount || 0);
        });
        return s;
    }, [proposals, archivedIds, dateFilter, showArchived, activeStatues]);

    const handleDuplicate = async (id: string) => {
        const original = proposals.find(p => p.id === id);
        if (!original) return;
        const promise = (async () => {
            const { id: _, created_at: __, ...payload } = original;
            await addProposal({
                ...payload,
                title: `${original.title || 'Proposal'} (Copy)`,
                status: 'Draft'
            });
        })();
        appToast.promise(promise, {
            loading: 'Duplicating proposal…',
            success: 'Proposal duplicated',
            error: 'Duplication failed',
        });
    };

    const displayCurrency = useMemo(() => {
        if (filtered.length === 0) return 'USD';
        const first = filtered[0].meta?.currency || 'USD';
        const allSame = filtered.every(p => (p.meta?.currency || 'USD') === first);
        return allSame ? first : 'USD';
    }, [filtered]);

    const toggleAll = () => setSelectedIds(selectedIds.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(p => p.id)));
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
        appToast.success(`${count} proposal${count !== 1 ? 's' : ''} archived`);
    };
    const handleBulkDelete = async () => {
        setDeletingId('bulk');
    };
    const handleBulkDuplicate = async () => {
        const ids = Array.from(selectedIds);
        const promise = (async () => {
            for (const id of ids) {
                const original = proposals.find(p => p.id === id);
                if (original) {
                    const { id: _, created_at: __, ...payload } = original;
                    await addProposal({
                        ...payload,
                        title: `${payload.title} (Copy)`,
                        status: 'Draft'
                    });
                }
            }
        })();
        appToast.promise(promise, {
            loading: `Duplicating ${ids.length} proposal${ids.length !== 1 ? 's' : ''}…`,
            success: `${ids.length} proposal${ids.length !== 1 ? 's' : ''} duplicated`,
            error: 'Duplication failed',
        });
        await promise;
        setSelectedIds(new Set());
    };

    const handleDownloadPDF = async (p: Proposal) => {
        const fileName = `${p.title || 'Proposal'}-${p.id.substring(0, 8)}.pdf`;
        
        appToast.promise(
            (async () => {
                const response = await fetch(`/api/download-pdf?type=proposal&id=${p.id}`);
                if (!response.ok) throw new Error('Failed to generate PDF');
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })(),
            {
                loading: 'Generating your PDF...',
                success: 'PDF downloaded successfully!',
                error: 'Could not generate PDF. Please try again.'
            }
        );
    };

    const handleExportJSON = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(proposals));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", `proposals_export_${new Date().toISOString().split('T')[0]}.json`);
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
                            await addProposal(payload);
                        }
                    })();
                    appToast.promise(promise, {
                        loading: 'Importing proposals...',
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
    const datePill = dateFilter === 'month' ? 'This Month' : dateFilter === 'year' ? 'This Year' : 'All time';

    return (
        <div className={cn("flex flex-col h-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-[#f7f7f7] text-[#111]")}>

            {/* ── Page header — hidden on mobile (MobileTopBar handles title) ── */}
            <div className={cn("hidden md:flex items-center justify-between px-5 py-3 shrink-0", isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-white")}>
                <h1 className="text-[15px] font-semibold tracking-tight">Proposals</h1>
            </div>

            {/* ── Toolbar ── */}
            {isMobile ? (
                /* ── Mobile toolbar: compact row with search + filter sheet ── */
                <div className={cn("flex items-center gap-2 px-3 py-2 shrink-0 border-b",
                    isDark ? "border-[#252525] bg-[#141414]" : "border-[#f0f0f0] bg-white")}>
                    {/* Search */}
                    <div className={cn("relative flex-1")}>
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" size={12} />
                        <input
                            type="text"
                            placeholder="Search proposals..."
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
                                filterOpen || dateFilter !== 'all'
                                    ? "bg-primary/15 border-primary/40 text-primary"
                                    : isDark ? "bg-white/[0.05] border-white/10 text-[#888]" : "bg-[#f5f5f5] border-transparent text-[#888]"
                            )}
                        >
                            <SlidersHorizontal size={14} />
                        </button>
                        <Dropdown open={filterOpen} onClose={() => setFilterOpen(false)} isDark={isDark}>
                            <div className={cn("px-3.5 py-2.5 border-b text-[11px] font-semibold", isDark ? "border-[#2e2e2e] text-[#666]" : "border-[#f0f0f0] text-[#aaa]")}>FILTER</div>
                            <div className="py-1">
                                <DItem label="This Month" active={dateFilter === 'month'} onClick={() => { setDateFilter('month'); setFilterOpen(false); }} isDark={isDark} />
                                <DItem label="This Year" active={dateFilter === 'year'} onClick={() => { setDateFilter('year'); setFilterOpen(false); }} isDark={isDark} />
                                <DItem label="All time" active={dateFilter === 'all'} onClick={() => { setDateFilter('all'); setFilterOpen(false); }} isDark={isDark} />
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
                /* ── Desktop toolbar ── */
                <div className={cn("flex items-center gap-1 px-4 py-1.5 shrink-0", isDark ? "border-b border-[#252525]" : "")}>
                    {/* View Settings on Left */}
                    <div className="flex items-center gap-1">
                        {/* Filter / date */}
                        <div className="relative">
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
                            <Dropdown open={filterOpen} onClose={() => setFilterOpen(false)} isDark={isDark} align="left">
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
                                    <DItem label="Import CSV" icon={<Download size={12} />} onClick={() => { setImportModalOpen(true, 'Proposal'); setImportExportOpen(false); }} isDark={isDark} />
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

            {/* ── Status bar ── */}
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
                        <span className="opacity-80 font-medium">Proposals</span>
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

            {/* ── Content ── */}
            {/* On mobile: always show the mobile list view regardless of 'view' setting */}
            {isMobile ? (
                /* ── Mobile list view ── */
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
                                ? <p className={cn("text-[13px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No archived proposals.</p>
                                : <>
                                    <p className={cn("text-[13px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No proposals found.</p>
                                    <button onClick={() => setCreateModalOpen(true, 'Proposal')} className="px-4 py-1.5 text-[12px] font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover transition-colors">+ New Proposal</button>
                                </>}
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {filtered.map(p => (
                                <MobileProposalRow
                                    key={p.id}
                                    p={p}
                                    onOpen={() => router.push(`/proposals/${p.id}`)}
                                    isDark={isDark}
                                    onStatusChange={(s) => updateProposal(p.id, { status: s })}
                                    onArchive={() => handleArchive(p.id)}
                                    isArchived={archivedIds.has(p.id)}
                                />
                            ))}
                            {!isLoading && !showArchived && (
                                <button
                                    onClick={() => setCreateModalOpen(true, 'Proposal')}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-3.5 w-full text-left text-[13px] font-medium border-b transition-colors",
                                        isDark ? "text-[#555] border-[#1f1f1f] hover:text-[#aaa]" : "text-[#bbb] border-[#f0f0f0] hover:text-[#666]"
                                    )}
                                >
                                    <Plus size={13} className="opacity-60" />
                                    Create proposal
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
                                ? <p className={cn("text-[13px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No archived proposals.</p>
                                : <>
                                    <p className={cn("text-[13px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No proposals found.</p>
                                    <button onClick={() => setCreateModalOpen(true, 'Proposal')} className="px-4 py-1.5 text-[12px] font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover transition-colors">+ New Proposal</button>
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
                                        cell: (p) => (
                                            <div className={cn("flex items-center px-4 py-1.5 font-bold truncate gap-2", isDark ? "text-white" : "text-black")}>
                                                <span className="truncate">{p.title || 'New Proposal'}</span>
                                            </div>
                                        )
                                    },
                                    {
                                        id: 'client',
                                        label: 'Client',
                                        defaultWidth: 150,
                                        cell: (p) => (
                                            <div className="flex items-stretch h-full w-full">
                                                <ClientCell currentName={p.client_name} currentId={p.client_id} onClientChange={(id, name) => updateProposal(p.id, { client_id: id, client_name: name })} isDark={isDark} variant="table" />
                                            </div>
                                        )
                                    },
                                    {
                                        id: 'status',
                                        label: 'Status',
                                        defaultWidth: 120,
                                        cell: (p) => (
                                            <div className="flex items-center px-4 py-1.5 h-full">
                                                <StatusCell status={p.status} onStatusChange={(s) => handleStatusChangeRequest(p.id, s)} isDark={isDark} customStatuses={customStatuses} />
                                            </div>
                                        )
                                    },
                                    {
                                        id: 'issue',
                                        label: 'Issue date',
                                        defaultWidth: 120,
                                        cell: (p) => (
                                            <div className={cn("flex flex-col justify-center px-4 py-1.5 leading-tight h-full", isDark ? "text-[#777]" : "text-[#888]")}>
                                                <span className="text-[12px]">{fmtDate(p.issue_date)}</span>
                                                <span className="text-[10px] opacity-50">{timeAgo(p.issue_date)}</span>
                                            </div>
                                        )
                                    },
                                    {
                                        id: 'due',
                                        label: 'Expiration date',
                                        defaultWidth: 120,
                                        cell: (p) => (
                                            <div className={cn("flex flex-col justify-center px-4 py-1.5 leading-tight h-full", isDark ? "text-[#777]" : "text-[#888]")}>
                                                {p.due_date ? (
                                                    <>
                                                        <span className="text-[12px]">{fmtDate(p.due_date)}</span>
                                                        <span className="text-[10px] opacity-50">{timeAgo(p.due_date)}</span>
                                                    </>
                                                ) : <span className="text-[12px]">—</span>}
                                            </div>
                                        )
                                    },
                                    {
                                        id: 'accepted',
                                        label: 'Accepted date',
                                        defaultWidth: 120,
                                        cell: (p) => (
                                            <div className={cn("flex flex-col justify-center px-4 py-1.5 leading-tight h-full", isDark ? "text-[#777]" : "text-[#888]")}>
                                                {p.accepted_at ? (
                                                    <>
                                                        <span className="text-[12px]">{fmtDate(p.accepted_at)}</span>
                                                        <span className="text-[10px] opacity-50">{timeAgo(p.accepted_at)}</span>
                                                    </>
                                                ) : <span className="text-[12px] opacity-20">—</span>}
                                            </div>
                                        )
                                    }
                                ]}
                                storageKeyPrefix="proposals"
                                selectedIds={selectedIds}
                                onToggleAll={toggleAll}
                                onToggleRow={toggleRow}
                                onRowClick={(p) => router.push(`/proposals/${p.id}`)}
                                isDark={isDark}
                                isLoading={isLoading}
                                rightHeaderWidth={60}
                                rightHeaderSlot={<>Total: <MoneyAmount amount={stats[statusFilter]?.amount ?? 0} currency={displayCurrency} className="ml-1" /></>}
                                rightCellSlot={(p) => (
                                    <div className={cn("flex items-center justify-end px-1 py-1.5 gap-1 font-semibold tabular-nums w-full",
                                        isDark ? "text-[#ccc]" : "text-[#333]")}>
                                        <MoneyAmount amount={Number(p.amount || 0)} currency={p.meta?.currency} />
                                    </div>
                                )}
                                rowMenuItems={(p) => [
                                    { label: 'Open', icon: <ExternalLink size={12} />, onClick: () => router.push(`/proposals/${p.id}`) },
                                    { label: 'Open Public Link', icon: <Link2 size={12} />, onClick: () => window.open(window.location.origin + '/p/proposal/' + p.id, '_blank') },
                                    { label: 'Copy Public Link', icon: <Copy size={12} />, onClick: () => { navigator.clipboard.writeText(window.location.origin + '/p/proposal/' + p.id); appToast.success('Link copied'); } },
                                    { label: 'Duplicate', icon: <Copy size={12} />, onClick: () => handleDuplicate(p.id) },
                                    { label: archivedIds.has(p.id) ? 'Unarchive' : 'Archive', icon: archivedIds.has(p.id) ? <ArchiveRestore size={12} /> : <Archive size={12} />, onClick: () => handleArchive(p.id), separator: true },
                                    { label: 'Delete', icon: <Trash2 size={12} />, danger: true, onClick: () => setDeletingId(p.id), separator: true }
                                ]}
                                afterRows={!isLoading && !showArchived ? (
                                    <button onClick={() => setCreateModalOpen(true, 'Proposal')}
                                        className={cn("flex items-center gap-1 px-4 py-3 w-full text-left text-[12px] font-medium transition-colors",
                                            isDark ? "text-[#555] border-[#1f1f1f] hover:text-[#aaa] hover:bg-white/[0.02]" : "text-[#aaa] border-[#f0f0f0] hover:text-[#555] hover:bg-[#fafafa]")}>
                                        <div className={cn("w-4 h-4 flex items-center justify-center rounded border border-dashed", isDark ? "border-[#444]" : "border-[#ccc]")}>
                                            <Plus size={10} />
                                        </div>
                                        <span>Create proposal</span>
                                    </button>
                                ) : undefined}
                            />
                        </div>
                    )}
                </div>
            ) : (
                /* ── Cards view (Grid) ── */
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
                                ? <p className={cn("text-[13px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No archived proposals.</p>
                                : <>
                                    <p className={cn("text-[13px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No proposals found.</p>
                                    <button onClick={() => setCreateModalOpen(true, 'Proposal')} className="px-4 py-1.5 text-[12px] font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover transition-colors">+ New Proposal</button>
                                </>}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                            {filtered.map(p => (
                                <ProposalCard key={p.id} p={p}
                                    onOpen={() => router.push(`/proposals/${p.id}`)}
                                    onArchive={() => handleArchive(p.id)}
                                    onStatusChange={(s) => handleStatusChangeRequest(p.id, s)}
                                    onClientChange={(id, name) => updateProposal(p.id, { client_id: id, client_name: name })}
                                    isSelected={selectedIds.has(p.id)}
                                    onToggle={() => {
                                        const n = new Set(selectedIds);
                                        n.has(p.id) ? n.delete(p.id) : n.add(p.id);
                                        setSelectedIds(n);
                                    }}
                                    customStatuses={customStatuses}
                                    isDark={isDark} />
                            ))}
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
                        await useProposalStore.getState().bulkDeleteProposals(ids);
                        setSelectedIds(new Set());
                        appToast.error("Deleted", `${ids.length} proposal${ids.length !== 1 ? 's' : ''} deleted`);
                    } else if (deletingId) {
                        await deleteProposal(deletingId);
                        appToast.error("Deleted", 'Proposal deleted');
                    }
                    setDeletingId(null);
                }}
            />
            <DeleteConfirmModal
                open={!!pendingStatusChange}
                isDark={isDark}
                title="Invalidate Signature?"
                description={`Changing the status to "${pendingStatusChange?.status}" will invalidate and remove the client's existing signature. Are you sure you want to proceed?`}
                actionLabel="Proceed"
                onClose={() => setPendingStatusChange(null)}
                onConfirm={confirmStatusChange}
            />
        </div>
    );
}
