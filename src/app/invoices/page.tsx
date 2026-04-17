"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useInvoiceStore, InvoiceStatus, Invoice } from '@/store/useInvoiceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useClientStore } from '@/store/useClientStore';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { STATUS_COLORS, getStatusColors } from '@/lib/statusConfig';
import {
    Search, Table2, LayoutGrid, Edit3, ChevronDown,
    ArrowUpDown, Archive, ArrowRightLeft, Download, Upload, Plus, User, Filter,
    Calendar, Check, X, ArchiveRestore, Receipt, ChevronsUpDown,
    Copy, Trash2, CheckCircle, SlidersHorizontal, ChevronRight,
    FileJson, FileSpreadsheet, Link2, ExternalLink, Send
} from 'lucide-react';
import { InlineDeleteButton } from '@/components/ui/InlineDeleteButton';
import { useRouter } from 'next/navigation';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { SendEmailModal } from '@/components/modals/SendEmailModal';
import ClientEditor from '@/components/clients/ClientEditor';
import { appToast } from '@/lib/toast';
import { Tooltip } from '@/components/ui/Tooltip';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SearchInput } from '@/components/ui/SearchInput';
import { ViewToggle } from '@/components/ui/ViewToggle';
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



function fmt$(val: number, currency: string = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(val);
}
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
    
    // Set both to midnight for accurate calendar day comparison
    const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffDays = Math.round((dNow.getTime() - dDate.getTime()) / 86400000);
    const ms = now.getTime() - date.getTime();
    const isFuture = ms < 0;
    const absDays = Math.abs(diffDays);

    if (diffDays === 0) return 'today';
    if (diffDays === -1) return 'tomorrow';
    if (diffDays === 1) return 'yesterday';
    
    if (absDays < 30) {
        return isFuture ? `due in ${absDays} days` : `${absDays} days ago`;
    }
    
    const months = Math.floor(absDays / 30);
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
    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div 
            ref={ref} 
            style={{ minWidth }}
            className={cn("absolute top-full mt-1 z-50 rounded-xl border shadow-xl overflow-hidden",
                align === 'right' && "right-0",
                align === 'left' && "left-0",
                align === 'center' && "left-1/2 -translate-x-1/2",
                isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]")}
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


function SortableHeader({ id, children, onResizeStart, isDark, width }: { 
    id: string; 
    children: React.ReactNode; 
    onResizeStart?: (e: React.MouseEvent) => void;
    isDark: boolean;
    width: number;
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
        width: `${width}px`,
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

function InvoiceCard({ i, onOpen, onArchive, onSendEmail, isDark, onStatusChange, isSelected, onToggle, onClientChange, customStatuses = [] }: {
    i: Invoice; onOpen: () => void; onArchive: () => void; onSendEmail?: () => void; isDark: boolean;
    onStatusChange: (s: InvoiceStatus) => void; isSelected: boolean; onToggle: () => void;
    onClientChange: (clientId: string, clientName: string) => void;
    customStatuses: any[];
}) {
    const [statusOpen, setStatusOpen] = useState(false);
    const sc = getStatusColors(i.status, customStatuses);

    // Sort and filter active statuses
    const activeStatues = customStatuses
        .filter(s => s.is_active || s.name === i.status)
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
                    {fmt$(Number(i.amount || 0), i.meta?.currency)}
                </CardRow>

                <CardRow label="Status" isDark={isDark} noBorder>
                    <div className="relative flex-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); setStatusOpen(!statusOpen); }}
                            style={sc.dynamic ? { backgroundColor: sc.dynamic.bg, color: sc.dynamic.text, borderColor: sc.dynamic.border } : {}}
                            className={cn(
                                "flex items-center justify-between min-w-[100px] px-2.5 py-1.5 text-[11px] font-semibold rounded-[6px] transition-all border",
                                !sc.dynamic ? (isDark ? "bg-white/[0.05] border-white/10 text-white/40 group-hover:bg-white/[0.08]" : cn(sc.badge, sc.badgeText, sc.badgeBorder, "hover:brightness-95")) : "hover:brightness-110"
                            )}
                        >
                            <span>{i.status}</span>
                            <ChevronsUpDown size={11} className="opacity-70" />
                        </button>
                        <Dropdown open={statusOpen} onClose={() => setStatusOpen(false)} isDark={isDark}>
                            <div className="py-1 min-w-[140px]">
                                {activeStatues.map(s => {
                                    const sSc = getStatusColors(s.name, customStatuses);
                                    const isActive = s.name === i.status;
                                    const sDynamic = (sSc as any).dynamic;
                                    return (
                                        <button key={s.name} onClick={(e) => { e.stopPropagation(); onStatusChange(s.name as any); setStatusOpen(false); }}
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
                {(i.status === 'Pending' || i.status === 'Overdue') && onSendEmail && (
                    <button
                        onClick={e => { e.stopPropagation(); onSendEmail(); }}
                        title={i.status === 'Overdue' ? "Send Reminder" : "Send Email"}
                        className={cn(
                            "w-6 h-6 rounded flex items-center justify-center transition-all",
                            isDark ? "bg-[#2a2a2a] text-[#aaa] hover:text-[#eee]" : "bg-white border border-[#e0e0e0] shadow-sm text-[#888] hover:bg-[#fafafa]"
                        )}
                    >
                        <Send size={11} />
                    </button>
                )}
                <button
                    onClick={e => { 
                        e.stopPropagation(); 
                        window.open(window.location.origin + '/p/invoice/' + i.id, '_blank');
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
    status: InvoiceStatus; 
    onStatusChange: (s: InvoiceStatus) => void; 
    isDark: boolean;
    customStatuses: any[];
}) {
    const [open, setOpen] = useState(false);
    const sc = getStatusColors(status, customStatuses);
    const activeStatues = customStatuses
        .filter(s => s.is_active || s.name === status)
        .sort((a,b) => a.position - b.position);

    const onClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(!open);
    };

    return (
        <div className="relative">
            <button
                onClick={onClick}
                style={sc.dynamic ? { backgroundColor: sc.dynamic.bg, color: sc.dynamic.text, borderColor: sc.dynamic.border } : {}}
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-[6px] transition-all border",
                    !sc.dynamic ? (isDark ? "bg-white/[0.05] border-white/10 text-white/40 group-hover:bg-white/[0.08]" : cn(sc.badge, sc.badgeText, sc.badgeBorder, "hover:brightness-95")) : "hover:brightness-110"
                )}
            >
                {status}
                <ChevronDown size={10} className="opacity-50" />
            </button>
            <Dropdown open={open} onClose={() => setOpen(false)} isDark={isDark}>
                <div className="py-1 min-w-[140px]">
                    {activeStatues.map(s => {
                        const sSc = getStatusColors(s.name, customStatuses);
                        const isActive = s.name === status;
                        const sDynamic = (sSc as any).dynamic;
                        return (
                            <button key={s.name} onClick={(e) => { e.stopPropagation(); onStatusChange(s.name as any); setOpen(false); }}
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

    const handleCreateClient = async (data: any) => {
        const client = await addClient(data);
        if (client) {
            onClientChange(client.id, client.contact_person || client.company_name);
            setIsClientEditorOpen(false);
            setOpen(false);
            appToast.success('Contact created and selected');
        }
    };

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

/* ─── Mobile invoice list item ──────────────────────────────── */
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
                    {fmt$(Number(inv.amount || 0), inv.meta?.currency)}
                </div>
                <ChevronRight size={14} className={cn("ml-auto mt-0.5", isDark ? "text-[#444]" : "text-[#ccc]")} />
            </div>
        </div>
    );
}

/* ─── Main page ─────────────────────────────────────────────────── */
export default function InvoicesPage() {
    const router = useRouter();
    const { theme, setImportModalOpen, activeWorkspaceId, setCreateModalOpen } = useUIStore();
    const { invoices, fetchInvoices, updateInvoice, addInvoice, deleteInvoice, isLoading } = useInvoiceStore();
    const { statuses, fetchStatuses } = useSettingsStore();

    useEffect(() => {
        if (activeWorkspaceId) fetchStatuses(activeWorkspaceId);
    }, [activeWorkspaceId]);

    const customStatuses = useMemo(() => statuses.filter(s => s.tool === 'invoices'), [statuses]);
    const activeStatues = useMemo(() => customStatuses.filter(s => s.is_active).sort((a,b) => a.position - b.position), [customStatuses]);

    const isDark = theme === 'dark';
    const isMobile = useIsMobile();
    const [view, setView] = useState<'table' | 'cards'>('table');
    const [importExportOpen, setImportExportOpen] = useState(false);
    const [sendInvoiceData, setSendInvoiceData] = useState<Invoice | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    /* ... existing state ... */
    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const defaults = {
            select: 44,
            name: 240,
            status: 160,
            issue: 180,
            due: 180,
            paid: 180,
            client: 180,
            amount: 220
        };
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('invoice_col_widths');
            if (saved) {
                return { ...defaults, ...JSON.parse(saved) };
            }
        }
        return defaults;
    });
    const [columnOrder, setColumnOrder] = useState<string[]>(() => {
        const defaults = ['name', 'client', 'status', 'issue', 'due', 'paid'];
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('invoice_col_order');
            if (saved) {
                const parsed = JSON.parse(saved) as string[];
                // Auto-sync new columns
                if (!parsed.includes('paid')) {
                    const dueIdx = parsed.indexOf('due');
                    if (dueIdx !== -1) {
                        parsed.splice(dueIdx + 1, 0, 'paid');
                    } else {
                        parsed.push('paid');
                    }
                }
                return parsed;
            }
        }
        return defaults;
    });

    useEffect(() => {
        localStorage.setItem('invoice_col_widths', JSON.stringify(colWidths));
    }, [colWidths]);

    useEffect(() => {
        localStorage.setItem('invoice_col_order', JSON.stringify(columnOrder));
    }, [columnOrder]);

    const isResizing = useRef<keyof typeof colWidths | null>(null);
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

    useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

    /* ── Derived data ── */
    const filtered = useMemo(() => {
        let r = invoices.filter(inv => {
            if (showArchived) return archivedIds.has(inv.id);
            if (archivedIds.has(inv.id)) return false;
            if (statusFilter !== 'All' && inv.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const idMatch = inv.id?.toLowerCase().slice(-6).includes(q);
                if (!inv.title?.toLowerCase().includes(q) && !inv.client_name?.toLowerCase().includes(q) && !idMatch) return false;
            }
            if (dateFilter === 'month' && !isThisMonth(inv.issue_date)) return false;
            if (dateFilter === 'year' && !isThisYear(inv.issue_date)) return false;
            return true;
        });
        if (orderBy === 'issue_date') r = [...r].sort((a, b) => new Date(b.issue_date || 0).getTime() - new Date(a.issue_date || 0).getTime());
        else if (orderBy === 'amount') r = [...r].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
        else r = [...r].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        return r;
    }, [invoices, statusFilter, searchQuery, dateFilter, orderBy, archivedIds, showArchived]);
    const stats = useMemo(() => {
        const s: Record<string, { count: number; amount: number }> = {
            All: { count: 0, amount: 0 }
        };
        
        // Initialize with active statuses
        activeStatues.forEach(st => s[st.name] = { count: 0, amount: 0 });

        invoices.filter(inv => {
            if (showArchived) return archivedIds.has(inv.id);
            if (archivedIds.has(inv.id)) return false;
            if (dateFilter === 'month' && !isThisMonth(inv.issue_date)) return false;
            if (dateFilter === 'year' && !isThisYear(inv.issue_date)) return false;
            return true;
        }).forEach(inv => {
            s.All.count++; s.All.amount += Number(inv.amount || 0);
            if (!s[inv.status]) s[inv.status] = { count: 0, amount: 0 };
            s[inv.status].count++; s[inv.status].amount += Number(inv.amount || 0);
        });
        return s;
    }, [invoices, archivedIds, dateFilter, showArchived, activeStatues]);

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
            loading: `Duplicating ${ids.length} invoice${ids.length !== 1 ? 's' : ''}…`,
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
    const datePill = dateFilter === 'month' ? 'This Month' : dateFilter === 'year' ? 'This Year' : 'All time';

    return (
        <div className={cn("flex flex-col h-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-[#f7f7f7] text-[#111]")}>

            {/* ── Page header — hidden on mobile (MobileTopBar handles title) ── */}
            <div className={cn("hidden md:flex items-center justify-between px-5 py-3 shrink-0", isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-white")}>
                <h1 className="text-[15px] font-semibold tracking-tight">Invoices</h1>
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
                            key={s.name} 
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
                        {stats.All.amount > 0 && <span className="ml-auto font-bold tabular-nums opacity-90 text-[9px]">{fmt$(stats.All.amount, displayCurrency)}</span>}
                    </button>
                    {activeStatues.map(s => {
                        const st = stats[s.name] || { count: 0, amount: 0 };
                        const isActive = statusFilter === s.name;
                        return (
                            <button key={s.name} onClick={() => { setStatusFilter(s.name); setShowArchived(false); }}
                                style={isActive ? { backgroundColor: s.color } : {}}
                                className={cn("flex-1 flex items-center justify-start gap-1.5 px-2.5 text-[10px] font-semibold transition-all hover:brightness-110",
                                    isActive ? "text-white" : (isDark ? "bg-[#252525] text-[#666]" : "bg-[#f0f0f0] text-[#aaa]"))}>
                                <span className="font-bold tabular-nums">{st.count}</span>
                                <span className="opacity-80 font-medium">{s.name}</span>
                                {st.amount > 0 && <span className="ml-auto font-bold tabular-nums opacity-90 text-[9px]">{fmt$(st.amount, displayCurrency)}</span>}
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
                                    <Plus size={13} className="opacity-60" />
                                    Create invoice
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ) : view === 'table' ? (
                <div className="flex-1 overflow-auto" style={{ backgroundColor: isDark ? '#141414' : '#f7f7f7' }}>
                    {/* Header */}
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <div className={cn("grid border-b text-[11px] font-semibold tracking-tight sticky top-0 z-30",
                            isDark ? "bg-[#1a1a1a] border-[#252525] text-[#888]" : "bg-[#f5f5f7] border-[#ebebeb] text-[#666]")}
                            style={{ gridTemplateColumns: gridTemplate }}>
                            
                            <div className="relative px-0 py-2 flex items-center justify-center border-r" style={{ borderColor: isDark ? '#2e2e2e' : '#e0e0e0' }}>
                                <div className="cursor-pointer" onClick={toggleAll}>
                                    <Chk checked={isAllSelected} indeterminate={selectedIds.size > 0 && !isAllSelected} isDark={isDark} />
                                </div>
                                <div onMouseDown={(e) => handleResizeStart('select', e)} className="absolute right-0 top-1.5 bottom-1.5 w-[1px] cursor-col-resize hover:bg-blue-400 transition-colors" />
                            </div>

                            <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                                {columnOrder.map(colId => {
                                    let label = '';
                                    if (colId === 'client') label = 'Client';
                                    if (colId === 'name') label = 'Name';
                                    if (colId === 'status') label = 'Status';
                                    if (colId === 'issue') label = 'Issue date';
                                    if (colId === 'due') label = 'Due date';
                                    if (colId === 'paid') label = 'Paid date';

                                    return (
                                        <SortableHeader 
                                            key={colId} 
                                            id={colId} 
                                            isDark={isDark} 
                                            width={colWidths[colId as keyof typeof colWidths]}
                                            onResizeStart={(e) => handleResizeStart(colId as keyof typeof colWidths, e)}
                                        >
                                            {label}
                                        </SortableHeader>
                                    );
                                })}
                            </SortableContext>

                            <div className={cn("sticky right-0 px-4 py-2 flex items-center justify-end z-40",
                                isDark ? "bg-[#1a1a1a]" : "bg-[#f5f5f7]")}>
                                Total: {fmt$(stats[statusFilter]?.amount ?? 0, displayCurrency)}
                            </div>
                        </div>
                    </DndContext>

                    {isLoading ? (
                        <div className="flex flex-col">{Array.from({ length: 25 }).map((_, i) => (
                            <div key={i} className={cn("grid px-0 border-b items-center h-[45px]", isDark ? "border-[#1f1f1f]" : "border-[#f0f0f0]")} style={{ gridTemplateColumns: gridTemplate }}>
                                <div className="flex justify-center"><div className={cn("w-3.5 h-3.5 rounded-[3px] animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /></div>
                                <div className="px-4 flex items-center gap-1.5"><div className={cn("w-3 h-3 rounded-full animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /><div className={cn("h-3 w-24 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /></div>
                                <div className="px-4"><div className={cn("h-3 w-10 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /></div>
                                <div className="px-4"><div className={cn("h-5 w-16 rounded-[4px] animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /></div>
                                <div className="px-4"><div className={cn("h-3 w-20 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /></div>
                                <div className="px-4"><div className={cn("h-3 w-20 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} /></div>
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
                                    <button onClick={() => setCreateModalOpen(true, 'Invoice')} className="px-4 py-1.5 text-[12px] font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover transition-colors">+ New Invoice</button>
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

                                        {columnOrder.map(colId => {
                                            if (colId === 'client') return (
                                                <div key={colId} className={cn("flex items-stretch", isDark ? "text-[#888]" : "text-[#666]")}>
                                                    <ClientCell
                                                        currentName={inv.client_name}
                                                        currentId={inv.client_id}
                                                        onClientChange={(id, name) => updateInvoice(inv.id, { client_id: id, client_name: name })}
                                                        isDark={isDark}
                                                        variant="table"
                                                    />
                                                </div>
                                            );
                                            if (colId === 'name') return (
                                                <div key={colId} className={cn("flex items-center px-4 py-3 font-bold truncate gap-2", isDark ? "text-white" : "text-black")}>
                                                    <span className="truncate">{inv.title || 'New Invoice'}</span>
                                                </div>
                                            );
                                            if (colId === 'status') return (
                                                <div key={colId} className="flex items-center px-4 py-3">
                                                    <StatusCell status={inv.status} onStatusChange={(s) => updateInvoice(inv.id, { status: s })} isDark={isDark} customStatuses={customStatuses} />
                                                </div>
                                            );
                                            if (colId === 'issue') return (
                                                <div key={colId} className={cn("flex flex-col justify-center px-4 py-3 leading-tight", isDark ? "text-[#777]" : "text-[#888]")}>
                                                    <span className="text-[12px]">{fmtDate(inv.issue_date)}</span>
                                                    <span className="text-[10px] opacity-50">{timeAgo(inv.issue_date)}</span>
                                                </div>
                                            );
                                            if (colId === 'due') return (
                                                <div key={colId} className={cn("flex flex-col justify-center px-4 py-3 leading-tight", isDark ? "text-[#777]" : "text-[#888]")}>
                                                    {inv.due_date ? (
                                                        <>
                                                            <span className="text-[12px]">{fmtDate(inv.due_date)}</span>
                                                            <span className="text-[10px] opacity-50">{timeAgo(inv.due_date)}</span>
                                                        </>
                                                    ) : <span className="text-[12px]">—</span>}
                                                </div>
                                            );
                                            if (colId === 'paid') return (
                                                <div key={colId} className={cn("flex flex-col justify-center px-4 py-3 leading-tight animate-in fade-in slide-in-from-left-2 duration-500", isDark ? "text-[#777]" : "text-[#888]")}>
                                                    {inv.paid_at ? (
                                                        <>
                                                            <span className="text-[12px]">{fmtDate(inv.paid_at)}</span>
                                                            <span className="text-[10px] opacity-50">{timeAgo(inv.paid_at)}</span>
                                                        </>
                                                    ) : <span className="text-[12px] opacity-20">—</span>}
                                                </div>
                                            );
                                            return null;
                                        })}

                                        <div className={cn("flex items-center justify-end px-4 py-3 gap-1.5 font-semibold tabular-nums pr-5 sticky right-0 z-20 transition-colors",
                                            isSelected ? (isDark ? "bg-[#1c1c1c]" : "bg-[#f0f7ff]") : (isDark ? "bg-[#141414] group-hover:bg-[#1a1a1a]" : "bg-white group-hover:bg-[#fafafa]"),
                                            isDark ? "text-[#ccc]" : "text-[#333]")}>
                                            <span className="transition-transform group-hover:-translate-x-[115px] duration-300">
                                                {fmt$(Number(inv.amount || 0), inv.meta?.currency)}
                                            </span>
                                            <div className="absolute right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                                {(inv.status === 'Pending' || inv.status === 'Overdue') && (
                                                    <button onClick={e => { e.stopPropagation(); setSendInvoiceData(inv); }} title={inv.status === 'Overdue' ? "Send Reminder" : "Send Email"}
                                                        className={cn("w-6 h-6 rounded flex items-center justify-center transition-all",
                                                            isDark ? "text-[#888] hover:text-[#ccc] hover:bg-white/8" : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]")}>
                                                        <Send size={11} />
                                                    </button>
                                                )}
                                                <button onClick={e => { 
                                                        e.stopPropagation(); 
                                                        window.open(window.location.origin + '/p/invoice/' + inv.id, '_blank');
                                                    }} title="Open Link"
                                                    className={cn("w-6 h-6 rounded flex items-center justify-center transition-all",
                                                        isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/8" : "text-[#bbb] hover:text-[#555] hover:bg-[#f0f0f0]")}>
                                                    <ExternalLink size={11} />
                                                </button>
                                                <button onClick={e => { 
                                                        e.stopPropagation(); 
                                                        const url = window.location.origin + '/p/invoice/' + inv.id;
                                                        navigator.clipboard.writeText(url);
                                                        appToast.success('Link copied');
                                                    }} title="Copy Link"
                                                    className={cn("w-6 h-6 rounded flex items-center justify-center transition-all",
                                                        isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/8" : "text-[#bbb] hover:text-[#555] hover:bg-[#f0f0f0]")}>
                                                    <Link2 size={11} />
                                                </button>
                                                <button onClick={e => { e.stopPropagation(); handleArchive(inv.id); }} title={archivedIds.has(inv.id) ? 'Unarchive' : 'Archive'}
                                                    className={cn("w-6 h-6 rounded flex items-center justify-center transition-all",
                                                        isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/8" : "text-[#bbb] hover:text-[#555] hover:bg-[#f0f0f0]")}>
                                                    {archivedIds.has(inv.id) ? <ArchiveRestore size={11} /> : <Archive size={11} />}
                                                </button>
                                                <InlineDeleteButton 
                                                    onDelete={async () => {
                                                        await deleteInvoice(inv.id);
                                                        appToast.error("Deleted", 'Invoice deleted');
                                                    }} 
                                                    isDark={isDark} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {!isLoading && !showArchived && (
                                <button onClick={() => setCreateModalOpen(true, 'Invoice')}
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
                            {filtered.map(inv => (
                                <InvoiceCard key={inv.id} i={inv}
                                    onOpen={() => router.push(`/invoices/${inv.id}`)}
                                    onArchive={() => handleArchive(inv.id)}
                                    onSendEmail={() => setSendInvoiceData(inv)}
                                    onStatusChange={(s) => updateInvoice(inv.id, { status: s })}
                                    onClientChange={(id, name) => updateInvoice(inv.id, { client_id: id, client_name: name })}
                                    isSelected={selectedIds.has(inv.id)}
                                    onToggle={() => {
                                        const n = new Set(selectedIds);
                                        n.has(inv.id) ? n.delete(inv.id) : n.add(inv.id);
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

            {sendInvoiceData && (
                <SendEmailModal
                    isOpen={!!sendInvoiceData}
                    onClose={() => setSendInvoiceData(null)}
                    templateKey={sendInvoiceData.status === 'Overdue' ? 'overdue_remind' : 'invoice'}
                    to={sendInvoiceData.meta?.clientEmail || ''}
                    variables={{
                        client_name: sendInvoiceData.client_name || '',
                        invoice_number: sendInvoiceData.title || sendInvoiceData.id.slice(-6).toUpperCase() || '',
                        amount_due: fmt$(Number(sendInvoiceData.amount || 0), sendInvoiceData.meta?.currency),
                        amount_paid: fmt$(Number(sendInvoiceData.amount || 0), sendInvoiceData.meta?.currency),
                        due_date: sendInvoiceData.due_date || '',
                        document_link: typeof window !== 'undefined' ? `${window.location.origin}/p/invoice/${sendInvoiceData.id}` : '',
                        days_overdue: sendInvoiceData.due_date ? String(Math.max(0, Math.floor((new Date().getTime() - new Date(sendInvoiceData.due_date).getTime()) / (1000 * 3600 * 24)))) : '0',
                    }}
                    workspaceId={activeWorkspaceId || ''}
                    documentTitle={sendInvoiceData.title || 'Invoice'}
                />
            )}
        </div>
    );
}
