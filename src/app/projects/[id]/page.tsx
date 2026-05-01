"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, ChevronDown, Check, X,
    Briefcase, Calendar, Users, Archive, Trash2, Plus,
    LayoutGrid, Filter, ArrowUpDown, Search,
    MoreHorizontal, RefreshCw, Edit3, Link2, FileText, Receipt,
    ArchiveRestore, Upload, Download, Copy, Zap,
    Target, TrendingUp, Clock, CheckCircle2, AlertCircle, Layers,
    ArrowLeft, Eye, PenLine, ExternalLink, Monitor, Smartphone, Send, Settings, LayoutTemplate
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppLoader } from '@/components/ui/AppLoader';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore, Project, ProjectTask, ProjectStatus, TaskStatus } from '@/store/useProjectStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useProposalStore } from '@/store/useProposalStore';
import { useRouter, useParams } from 'next/navigation';
import { appToast } from '@/lib/toast';
import { Avatar } from '@/components/ui/Avatar';
import { useTemplateStore } from '@/store/useTemplateStore';
import { DEFAULT_DOCUMENT_DESIGN } from '@/types/design';
import dynamic from 'next/dynamic';

const KanbanBoard = dynamic(() => import('@/components/projects/KanbanBoard'), { ssr: false });
const TaskDetailPanel = dynamic(() => import('@/components/projects/TaskDetailPanel'), { ssr: false });
const EditProjectModal = dynamic(() => import('@/components/projects/EditProjectModal'), { ssr: false });
const SaveTemplateModal = dynamic(() => import('@/components/modals/SaveTemplateModal').then(m => m.SaveTemplateModal), { ssr: false });

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_ORDER: ProjectStatus[] = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];

const STATUS_COLORS: Record<ProjectStatus, string> = {
    Planning:  '#6366f1',
    Active:    '#10b981',
    'On Hold': '#f59e0b',
    Completed: '#3d0ebf',
    Cancelled: '#6b7280',
};

const STATUS_BG: Record<ProjectStatus, string> = {
    Planning:  'rgba(99,102,241,0.1)',
    Active:    'rgba(16,185,129,0.1)',
    'On Hold': 'rgba(245,158,11,0.1)',
    Completed: 'rgba(61,14,191,0.1)',
    Cancelled: 'rgba(107,114,128,0.1)',
};

const STATUS_CFG: Record<ProjectStatus, { color: string; badge: string; badgeText: string; badgeBorder: string }> = {
    Planning:  { color: '#6366f1', badge: 'bg-indigo-50',  badgeText: 'text-indigo-700',  badgeBorder: 'border-indigo-200'  },
    Active:    { color: '#10b981', badge: 'bg-emerald-50', badgeText: 'text-emerald-700', badgeBorder: 'border-emerald-200' },
    'On Hold': { color: '#f59e0b', badge: 'bg-amber-50',   badgeText: 'text-amber-700',   badgeBorder: 'border-amber-200'   },
    Completed: { color: '#3d0ebf', badge: 'bg-violet-50',  badgeText: 'text-violet-700',  badgeBorder: 'border-violet-200'  },
    Cancelled: { color: '#9ca3af', badge: 'bg-gray-50',    badgeText: 'text-gray-500',    badgeBorder: 'border-gray-200'    },
};

type Tab = 'tasks' | 'linked';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

function deadlineMeta(d: string | null | undefined) {
    if (!d) return { text: 'No deadline', urgent: false };
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    if (diff < 0)   return { text: `${Math.abs(diff)}d overdue`, urgent: true };
    if (diff === 0) return { text: 'Due today', urgent: true };
    if (diff <= 7)  return { text: `${diff}d left`, urgent: true };
    return { text: fmtDate(d), urgent: false };
}

// ─── Shared toolbar button ─────────────────────────────────────────────────────

function TbBtn({ label, icon, active, hasArrow, onClick, isDark, danger, className }: {
    label?: string; icon?: React.ReactNode; active?: boolean;
    hasArrow?: boolean; onClick?: () => void; isDark: boolean; danger?: boolean;
    className?: string;
}) {
    return (
        <button onClick={onClick} className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all shrink-0",
            danger
                ? "text-red-400 hover:bg-red-500/10"
                : active
                    ? isDark ? "bg-white/10 text-white border border-white/10" : "bg-[#f0f0f5] text-[#111] border border-[#e5e5f0]"
                    : isDark ? "text-[#666] hover:text-[#ccc] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]",
            className
        )}>
            {icon}{label}{hasArrow && <ChevronDown size={11} className="opacity-40" />}
        </button>
    );
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

function Dropdown({ open, onClose, isDark, children, right }: {
    open: boolean; onClose: () => void; isDark: boolean;
    children: React.ReactNode; right?: boolean;
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
        <div ref={ref} className={cn(
            "absolute top-full mt-1.5 z-50 min-w-[175px] rounded-xl border shadow-2xl overflow-hidden",
            right ? "right-0" : "left-0",
            isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
        )}>
            {children}
        </div>
    );
}

function DItem({ label, icon, active, onClick, isDark, danger }: {
    label: string; icon?: React.ReactNode; active?: boolean;
    onClick: () => void; isDark: boolean; danger?: boolean;
}) {
    return (
        <button onClick={onClick} className={cn(
            "w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] transition-colors text-left",
            danger
                ? "text-red-400 hover:bg-red-500/10"
                : active
                    ? isDark ? "bg-white/8 text-white font-medium" : "bg-[#f0f0f0] text-[#111] font-medium"
                    : isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]"
        )}>
            {icon && <span className="opacity-60">{icon}</span>}
            <span className="flex-1">{label}</span>
            {active && !danger && <Check size={11} className="text-primary" />}
        </button>
    );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ icon, label, value, color, isDark }: {
    icon: React.ReactNode; label: string; value: string | number; color: string; isDark: boolean;
}) {
    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
            isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-[#ebebeb] shadow-sm"
        )}>
            <span style={{ color }}>{icon}</span>
            <div className="flex flex-col">
                <span className={cn("text-[9px] font-bold uppercase tracking-widest leading-tight", isDark ? "text-[#555]" : "text-[#bbb]")}>{label}</span>
                <span className={cn("text-[12px] font-bold tabular-nums leading-tight", isDark ? "text-white" : "text-[#111]")}>{value}</span>
            </div>
        </div>
    );
}

// ─── Circular Progress ────────────────────────────────────────────────────────

function CircleProgress({ pct, color, size = 36, isDark }: { pct: number; color: string; size?: number; isDark: boolean }) {
    const r = (size - 5) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={2.5}
                stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
            <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={2.5}
                stroke={color} strokeLinecap="round"
                strokeDasharray={`${dash} ${circ - dash}`}
                style={{ transition: 'stroke-dasharray 0.5s ease' }} />
        </svg>
    );
}

function LinkedItemsTab({ projectId, isDark }: { projectId: string; isDark: boolean }) {
    const router = useRouter();
    const { itemsByProject, fetchProjectItems, addProjectItem, removeProjectItem, isLoading: projectsLoading } = useProjectStore();
    const { invoices, fetchInvoices, isLoading: invoicesLoading } = useInvoiceStore();
    const { proposals, fetchProposals, isLoading: proposalsLoading } = useProposalStore();
    const items = itemsByProject[projectId] || [];

    const [linkOpen, setLinkOpen]   = useState(false);
    const [search, setSearch]       = useState('');
    const [linkType, setLinkType]   = useState<'invoice' | 'proposal'>('invoice');
    const [unlinking, setUnlinking] = useState<string | null>(null);

    const [tableFilter, setTableFilter] = useState<'invoice' | 'proposal'>('invoice');

    const { activeWorkspaceId } = useUIStore();

    useEffect(() => {
        if (!activeWorkspaceId || !projectId) return;
        fetchProjectItems(projectId);
        fetchInvoices();
        fetchProposals();
    }, [projectId, activeWorkspaceId, fetchProjectItems, fetchInvoices, fetchProposals]);

    const linkedInvoices  = items.filter(i => i.item_type === 'invoice');
    const linkedProposals = items.filter(i => i.item_type === 'proposal');
    const getInvoice  = (id: string) => invoices.find((i: any) => i.id === id) as any;
    const getProposal = (id: string) => proposals.find((p: any) => p.id === id) as any;

    const available = useMemo(() => {
        const linked = new Set(items.map(i => i.item_id));
        const src = linkType === 'invoice' ? invoices : proposals;
        return (src as any[]).filter(i => !linked.has(i.id) && (!search || i.title?.toLowerCase().includes(search.toLowerCase())));
    }, [linkType, invoices, proposals, items, search]);

    const totalInvoiced = linkedInvoices.reduce((sum, li) => {
        const inv = getInvoice(li.item_id);
        return sum + Number(inv?.amount || 0);
    }, 0);

    const handleLink = async (itemId: string) => {
        await addProjectItem({ project_id: projectId, item_type: linkType, item_id: itemId });
        appToast.success('Linked', 'Item linked to this project');
        setLinkOpen(false);
        setSearch('');
    };
    const handleUnlink = async (id: string) => {
        setUnlinking(id);
        await removeProjectItem(id, projectId);
        setUnlinking(null);
        appToast.success('Unlinked', 'Item removed from this project');
    };

    const STATUS_META: Record<string, { color: string; label: string }> = {
        draft:    { color: isDark ? '#555' : '#aaa', label: 'Draft'    },
        pending:  { color: '#f59e0b',                label: 'Pending'  },
        sent:     { color: '#6366f1',                label: 'Sent'     },
        paid:     { color: '#10b981',                label: 'Paid'     },
        overdue:  { color: '#ef4444',                label: 'Overdue'  },
        accepted: { color: '#10b981',                label: 'Accepted' },
        rejected: { color: '#ef4444',                label: 'Rejected' },
        viewed:   { color: '#f59e0b',                label: 'Viewed'   },
        approved: { color: '#10b981',                label: 'Approved' },
    };
    const getS = (s: string) => STATUS_META[s?.toLowerCase()] ?? { color: isDark ? '#444' : '#bbb', label: s || 'Draft' };

    const cardBase = cn(
        "group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
        isDark
            ? "bg-[#1c1c1c] border-[#252525] hover:border-[#333] hover:bg-[#1e1e1e]"
            : "bg-white border-[#ebebeb] hover:border-[#d5d5d5] shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
    );

    const skeletonCard = (key: string) => (
        <div key={key} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border", isDark ? "bg-[#1c1c1c] border-[#252525]" : "bg-white border-[#ebebeb]")}>
            <div className={cn("w-8 h-8 rounded-xl shrink-0 animate-pulse", isDark ? "bg-white/5" : "bg-[#f0f0f0]")} />
            <div className="flex-1 space-y-2">
                <div className={cn("h-2.5 w-32 rounded-full animate-pulse", isDark ? "bg-white/5" : "bg-[#efefef]")} />
                <div className={cn("h-2 w-20 rounded-full animate-pulse", isDark ? "bg-white/[0.03]" : "bg-[#f5f5f5]")} />
            </div>
        </div>
    );

    return (
        <div className={cn("flex-1 overflow-y-auto min-h-0 no-scrollbar", isDark ? "bg-[#141414]" : "bg-[#f4f4f6]")}>

            {/* ── Link picker overlay ── */}
            <AnimatePresence>
                {linkOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setLinkOpen(false); setSearch(''); }}
                            className="fixed inset-0 z-40"
                            style={{ background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.18)' }}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 14, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 14, scale: 0.97 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className={cn(
                                "fixed left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-50",
                                "w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden",
                                isDark ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-[#e0e0e0]"
                            )}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 pt-5 pb-4">
                                <div>
                                    <h4 className={cn("text-[14px] font-bold", isDark ? "text-white" : "text-[#111]")}>Link an Item</h4>
                                    <p className={cn("text-[11px] mt-0.5", isDark ? "text-[#555]" : "text-[#aaa]")}>Connect invoices or proposals to this project</p>
                                </div>
                                <button
                                    onClick={() => { setLinkOpen(false); setSearch(''); }}
                                    className={cn("w-8 h-8 flex items-center justify-center rounded-xl transition-all", isDark ? "text-[#555] hover:text-[#ccc] hover:bg-white/5" : "text-[#bbb] hover:text-[#555] hover:bg-[#f0f0f0]")}
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            {/* Type selector */}
                            <div className="px-5 pb-3">
                                <div className={cn("flex gap-1 p-1 rounded-xl", isDark ? "bg-white/5" : "bg-[#f5f5f5]")}>
                                    {(['invoice', 'proposal'] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => { setLinkType(t); setSearch(''); }}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11.5px] font-semibold transition-all",
                                                linkType === t
                                                    ? isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-[#111] shadow-sm"
                                                    : isDark ? "text-[#555] hover:text-[#aaa]" : "text-[#aaa] hover:text-[#555]"
                                            )}
                                        >
                                            {t === 'invoice' ? <Receipt size={12} /> : <FileText size={12} />}
                                            {t === 'invoice' ? 'Invoices' : 'Proposals'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Search */}
                            <div className="px-5 pb-3">
                                <div className={cn(
                                    "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border",
                                    isDark ? "bg-white/[0.03] border-white/[0.07]" : "bg-[#f9f9f9] border-[#ebebeb]"
                                )}>
                                    <Search size={13} className={isDark ? "text-[#444]" : "text-[#ccc]"} />
                                    <input
                                        autoFocus
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder={`Search ${linkType === 'invoice' ? 'invoices' : 'proposals'}…`}
                                        className={cn("flex-1 bg-transparent text-[12.5px] outline-none", isDark ? "text-[#ccc] placeholder:text-[#333]" : "text-[#333] placeholder:text-[#bbb]")}
                                    />
                                    {search && (
                                        <button onClick={() => setSearch('')} className={cn("transition-colors", isDark ? "text-[#444] hover:text-[#aaa]" : "text-[#ccc] hover:text-[#666]")}>
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Results */}
                            <div className={cn("border-t overflow-y-auto max-h-[280px] no-scrollbar", isDark ? "border-[#222]" : "border-[#f0f0f0]")}>
                                {available.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isDark ? "bg-white/5" : "bg-[#f5f5f5]")}>
                                            {linkType === 'invoice' ? <Receipt size={16} className={isDark ? "text-[#333]" : "text-[#ccc]"} /> : <FileText size={16} className={isDark ? "text-[#333]" : "text-[#ccc]"} />}
                                        </div>
                                        <p className={cn("text-[12px] font-medium", isDark ? "text-[#444]" : "text-[#999]")}>
                                            {search ? 'No results found' : `All ${linkType === 'invoice' ? 'invoices' : 'proposals'} already linked`}
                                        </p>
                                    </div>
                                ) : available.slice(0, 30).map((item: any) => {
                                    const { color: sc, label: statusLabel } = getS(item.status);
                                    const isInv = linkType === 'invoice';
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleLink(item.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-5 py-3 text-left transition-all group",
                                                isDark ? "hover:bg-white/[0.03]" : "hover:bg-[#fafafa]"
                                            )}
                                        >
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: isInv ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)' }}>
                                                {isInv ? <Receipt size={13} className="text-emerald-500" /> : <FileText size={13} className="text-indigo-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn("text-[12.5px] font-semibold truncate", isDark ? "text-[#ccc]" : "text-[#222]")}>
                                                    {item.title || `${isInv ? 'INV' : 'PROP'}-${item.id.slice(-6).toUpperCase()}`}
                                                </p>
                                                {item.client_name && <p className={cn("text-[11px] truncate mt-0.5", isDark ? "text-[#444]" : "text-[#aaa]")}>{item.client_name}</p>}
                                            </div>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                                                style={{ color: sc, background: `${sc}15` }}>
                                                {statusLabel}
                                            </span>
                                            {item.amount > 0 && (
                                                <span className={cn("text-[12px] font-bold tabular-nums shrink-0", isDark ? "text-[#555]" : "text-[#aaa]")}>
                                                    ${Number(item.amount).toLocaleString()}
                                                </span>
                                            )}
                                            <div className={cn(
                                                "w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0",
                                                isDark ? "bg-white/8 text-[#aaa]" : "bg-[#f0f0f0] text-[#555]"
                                            )}>
                                                <Plus size={11} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Main content ── */}
            <div className="max-w-3xl mx-auto px-5 pt-6 pb-10 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className={cn("text-[13.5px] font-bold", isDark ? "text-white" : "text-[#111]")}>Finances</h3>
                        <p className={cn("text-[11px] mt-0.5", isDark ? "text-[#444]" : "text-[#aaa]")}>
                            {items.length === 0 ? 'No items connected' : `${items.length} item${items.length !== 1 ? 's' : ''} connected`}
                        </p>
                    </div>
                    <button
                        onClick={() => { setLinkOpen(v => !v); setSearch(''); }}
                        className="flex items-center gap-1.5 px-3.5 h-8 rounded-xl text-[11.5px] font-semibold transition-all bg-primary hover:bg-primary/90 text-primary-foreground active:scale-95 shadow-sm shadow-primary/25"
                    >
                        <Plus size={13} /> Link Item
                    </button>
                </div>

                {/* ── Unified Table ── */}
                {items.length > 0 && (() => {
                    const baseRows: Array<{ linkId: string; type: 'invoice' | 'proposal'; item: any; isUnlinking: boolean; route: string; }> = [
                        ...linkedInvoices.map(li => ({ linkId: li.id, type: 'invoice' as const, item: getInvoice(li.item_id), isUnlinking: unlinking === li.id, route: `/invoices/${li.item_id}` })),
                        ...linkedProposals.map(lp => ({ linkId: lp.id, type: 'proposal' as const, item: getProposal(lp.item_id), isUnlinking: unlinking === lp.id, route: `/proposals/${lp.item_id}` })),
                    ];
                    const allRows = baseRows.filter(r => r.type === tableFilter);
                    const grandTotal = allRows.reduce((sum, r) => sum + Number(r.item?.amount || 0), 0);
                    const cols = '36px 1fr 110px 100px 90px 110px';
                    const thCls = cn('px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-left', isDark ? 'text-[#3a3a3a]' : 'text-[#bbb]');

                    const filterOptions: { id: 'invoice' | 'proposal'; label: string; count: number }[] = [
                        { id: 'invoice',  label: 'Invoices',  count: linkedInvoices.length },
                        { id: 'proposal', label: 'Proposals', count: linkedProposals.length },
                    ];

                    return (
                        <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'bg-[#161616] border-[#222]' : 'bg-white border-[#e8e8e8] shadow-sm')}>
                            {/* ── Type filter toggles ── */}
                            <div className={cn('flex items-center gap-1 px-3 py-2.5 border-b', isDark ? 'border-[#1e1e1e] bg-[#0e0e0e]' : 'border-[#f0f0f0] bg-[#f9f9f9]')}>
                                {filterOptions.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setTableFilter(opt.id)}
                                        className={cn(
                                            'flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] font-semibold transition-all',
                                            tableFilter === opt.id
                                                ? isDark ? 'bg-white/10 text-white' : 'bg-white text-[#111] shadow-sm border border-black/[0.06]'
                                                : isDark ? 'text-[#444] hover:text-[#aaa] hover:bg-white/5' : 'text-[#aaa] hover:text-[#555] hover:bg-black/[0.03]'
                                        )}
                                    >
                                        {opt.id === 'invoice' && <Receipt size={10} />}
                                        {opt.id === 'proposal' && <FileText size={10} />}
                                        {opt.label}
                                        <span className={cn('text-[9px] font-bold tabular-nums', tableFilter === opt.id ? (isDark ? 'text-white/40' : 'text-black/30') : (isDark ? 'text-[#333]' : 'text-[#ccc]'))}>
                                            {opt.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            {/* Table header */}
                            <div className={cn('grid items-center border-b', isDark ? 'border-[#1e1e1e] bg-[#111]' : 'border-[#f0f0f0] bg-[#fafafa]')} style={{ gridTemplateColumns: cols }}>
                                <div className={thCls} />
                                <div className={thCls}>Item</div>
                                <div className={thCls}>Client</div>
                                <div className={thCls}>Status</div>
                                <div className={cn(thCls, 'text-right')}>Amount</div>
                                <div className={thCls} />
                            </div>
                            {/* Rows */}
                            {allRows.map((row, idx) => {
                                const isLast = idx === allRows.length - 1;
                                if (!row.item) {
                                    const loading = row.type === 'invoice' ? invoicesLoading : proposalsLoading;
                                    if (loading) return (
                                        <div key={row.linkId} className={cn('grid items-center border-b', isDark ? 'border-[#1c1c1c]' : 'border-[#f5f5f5]')} style={{ gridTemplateColumns: cols }}>
                                            {[1,2,3,4,5].map(i => <div key={i} className={cn('h-2.5 rounded-full animate-pulse mx-2 my-4', isDark ? 'bg-white/5' : 'bg-[#f0f0f0]')} />)}
                                            <div />
                                        </div>
                                    );
                                    return (
                                        <div key={row.linkId} className={cn('grid items-center border-b opacity-50', isDark ? 'border-[#1c1c1c]' : 'border-[#f5f5f5]')} style={{ gridTemplateColumns: cols }}>
                                            <div className="flex items-center justify-center py-3"><AlertCircle size={13} className="text-red-400/60" /></div>
                                            <span className={cn('text-[11.5px] italic px-2', isDark ? 'text-[#444]' : 'text-[#bbb]')}>Not found</span>
                                            <span /><span /><span />
                                            <button onClick={(e) => { e.stopPropagation(); handleUnlink(row.linkId); }} className={cn('w-7 h-7 m-auto flex items-center justify-center rounded-lg transition-all', isDark ? 'text-[#333] hover:text-red-400 hover:bg-red-500/10' : 'text-[#ccc] hover:text-red-500 hover:bg-red-50')}><X size={12} /></button>
                                        </div>
                                    );
                                }
                                const { color: sc, label: statusLabel } = getS(row.item.status);
                                const isInv = row.type === 'invoice';
                                return (
                                    <div key={row.linkId} onClick={() => !row.isUnlinking && router.push(row.route)}
                                        className={cn('group grid items-center cursor-pointer transition-colors', !isLast && (isDark ? 'border-b border-[#1c1c1c]' : 'border-b border-[#f5f5f5]'), row.isUnlinking && 'opacity-50 pointer-events-none', isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-[#fafafa]')}
                                        style={{ gridTemplateColumns: cols }}>
                                        <div className="flex items-center justify-center py-3.5">
                                            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: isInv ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)' }}>
                                                {isInv ? <Receipt size={11} className="text-emerald-500" /> : <FileText size={11} className="text-indigo-500" />}
                                            </div>
                                        </div>
                                        <div className="min-w-0 px-3 py-3.5">
                                            <p className={cn('text-[12px] font-semibold truncate', isDark ? 'text-[#e0e0e0]' : 'text-[#111]')}>
                                                {row.item.title || `${isInv ? 'INV' : 'PROP'}-${row.item.id.slice(-6).toUpperCase()}`}
                                            </p>
                                        </div>
                                        <div className="px-3 py-3.5 min-w-0">
                                            <p className={cn('text-[11px] truncate', isDark ? 'text-[#444]' : 'text-[#aaa]')}>{row.item.client_name || '—'}</p>
                                        </div>
                                        <div className="px-3 py-3.5">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: sc, background: `${sc}18` }}>{statusLabel}</span>
                                        </div>
                                        <div className="px-3 py-3.5 text-right">
                                            <span className={cn('text-[12px] font-bold tabular-nums', isDark ? 'text-[#999]' : 'text-[#333]')}>
                                                {Number(row.item.amount || 0) > 0 ? `$${Number(row.item.amount).toLocaleString()}` : '—'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-end pr-2 gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(`${window.location.origin}/p/${row.type}/${row.item.id}`, '_blank');
                                                }}
                                                title="Preview"
                                                className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-all', isDark ? 'text-[#444] hover:text-[#ccc] hover:bg-white/5' : 'text-[#ccc] hover:text-[#555] hover:bg-black/[0.03]')}
                                            >
                                                <ExternalLink size={12} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(`${window.location.origin}/p/${row.type}/${row.item.id}`);
                                                    appToast.success('Link Copied');
                                                }}
                                                title="Copy Link"
                                                className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-all', isDark ? 'text-[#444] hover:text-[#ccc] hover:bg-white/5' : 'text-[#ccc] hover:text-[#555] hover:bg-black/[0.03]')}
                                            >
                                                <Copy size={12} />
                                            </button>
                                            <div className={cn("w-[1px] h-3 mx-0.5", isDark ? "bg-[#222]" : "bg-[#eee]")} />
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleUnlink(row.linkId); }} 
                                                disabled={row.isUnlinking}
                                                title="Unlink"
                                                className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-all', isDark ? 'text-[#444] hover:text-red-400 hover:bg-red-500/10' : 'text-[#ccc] hover:text-red-500 hover:bg-red-50')}
                                            >
                                                {row.isUnlinking ? <AppLoader size="xs" /> : <X size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Totals footer */}
                            <div className={cn('grid items-center border-t', isDark ? 'border-[#1e1e1e] bg-[#111]' : 'border-[#f0f0f0] bg-[#fafafa]')} style={{ gridTemplateColumns: cols }}>
                                <div />
                                <div className={cn('px-3 py-3 text-[10px] font-bold uppercase tracking-widest', isDark ? 'text-[#333]' : 'text-[#ccc]')}>{allRows.length} item{allRows.length !== 1 ? 's' : ''}</div>
                                <div />
                                <div className={cn('px-3 py-3 text-[10px] font-bold uppercase tracking-widest', isDark ? 'text-[#444]' : 'text-[#bbb]')}>Total</div>
                                <div className="px-3 py-3 text-right">
                                    <span className={cn('text-[13px] font-extrabold tabular-nums', isDark ? 'text-white' : 'text-[#111]')}>${grandTotal.toLocaleString()}</span>
                                </div>
                                <div />
                            </div>
                        </div>
                    );
                })()}

                {/* Empty state */}
                {items.length === 0 && !linkOpen && (
                    <div className={cn(
                        "flex flex-col items-center justify-center py-24 gap-5 rounded-3xl border border-dashed",
                        isDark ? "border-[#252525]" : "border-[#e0e0e0]"
                    )}>
                        <div className="relative">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", isDark ? "bg-white/[0.04]" : "bg-[#f5f5f5]")}>
                                <Link2 size={22} className={isDark ? "text-[#333]" : "text-[#d0d0d0]"} />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-primary">
                                <Plus size={11} className="text-white" />
                            </div>
                        </div>
                        <div className="text-center space-y-1">
                            <p className={cn("text-[13.5px] font-semibold", isDark ? "text-[#555]" : "text-[#888]")}>Nothing linked yet</p>
                            <p className={cn("text-[11.5px]", isDark ? "text-[#333]" : "text-[#bbb]")}>Connect invoices or proposals to track project financials</p>
                        </div>
                        <button
                            onClick={() => setLinkOpen(true)}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-semibold transition-all active:scale-95"
                        >
                            <Plus size={13} /> Link First Item
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}


export default function ProjectDetailPage() {
    const router    = useRouter();
    const params    = useParams();
    const projectId = params?.id as string;

    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { projects, updateProject, fetchProjects, tasksByProject, groupsByProject } = useProjectStore();
    const { addTemplate } = useTemplateStore();

    const [activeTab, setActiveTab]           = useState<Tab>('tasks');
    const [selectedTask, setSelectedTask]     = useState<ProjectTask | null>(null);
    const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
    const [statusOpen, setStatusOpen]         = useState(false);
    const [actionsOpen, setActionsOpen]       = useState(false);
    const [searchQuery, setSearchQuery]       = useState('');
    const [showArchived, setShowArchived]     = useState(false);
    const [showEdit, setShowEdit]             = useState(false);
    const [copied, setCopied]                 = useState(false);
    const [title, setTitle]                   = useState('');
    const [isLoaded, setIsLoaded]             = useState(false);

    // ── Toolbar filter / order state ──────────────────────────────────────────
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [filterStatus,   setFilterStatus]   = useState<string>('all');
    const [orderBy,        setOrderBy]         = useState<'position' | 'priority' | 'due_date' | 'title'>('position');
    const [filterOpen,   setFilterOpen]       = useState(false);
    const [orderOpen,    setOrderOpen]        = useState(false);
    const statusRef  = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);
    const filterRef  = useRef<HTMLDivElement>(null);
    const orderRef   = useRef<HTMLDivElement>(null);

    useEffect(() => { if (!projects.length) fetchProjects(); }, [fetchProjects, projects.length]);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (statusRef.current  && !statusRef.current.contains(e.target as Node))  setStatusOpen(false);
            if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setActionsOpen(false);
            if (filterRef.current  && !filterRef.current.contains(e.target as Node))  setFilterOpen(false);
            if (orderRef.current   && !orderRef.current.contains(e.target as Node))   setOrderOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const project = projects.find(p => p.id === projectId);

    const handleSaveTemplate = async (name: string, description: string, isDefault: boolean) => {
        if (!project) return;
        const projectTasks = tasksByProject[projectId] || [];
        const blocks = [...(groupsByProject[projectId] || [])].sort((a,b) => a.position - b.position).map((g) => ({
            id: g.id,
            name: g.name,
            color: g.color || '#333',
            icon: g.icon || null,
            position: g.position,
            items: projectTasks.filter(t => t.task_group_id === g.id && !t.is_archived).map(t => ({
                id: t.id,
                title: t.title,
                description: t.description || '',
                priority: t.priority,
                position: t.position
            }))
        }));

        const success = await addTemplate({
            name,
            description,
            entity_type: 'project',
            blocks,
            design: {
                ...DEFAULT_DOCUMENT_DESIGN,
                primaryColor: project.color || '#3d0ebf',
                fontFamily: 'Inter',
                documentTitle: project.name,
                backgroundColor: '#ffffff'
            },
            is_default: isDefault,
            meta: {
                icon: project.icon || 'Briefcase',
            }
        });
        if (success) {
            appToast.success('Template Saved', 'Project saved as a template.');
            setSaveTemplateOpen(false);
        }
    };

    useEffect(() => {
        if (project && !isLoaded) {
            setTitle(project.name);
            setIsLoaded(true);
        }
    }, [project, isLoaded]);

    const tasks = tasksByProject[projectId] || [];
    const progress = useMemo(() => {
        const active = tasks.filter(t => !t.is_archived);
        const done   = active.filter(t => t.status === 'done').length;
        const doing  = active.filter(t => t.status === 'doing').length;
        const review = active.filter(t => t.status === 'review').length;
        return { done, total: active.length, doing, review, pct: active.length ? Math.round((done / active.length) * 100) : 0 };
    }, [tasks]);

    if (!project) {
        return (
            <div className={cn("flex h-full items-center justify-center", isDark ? "bg-[#141414]" : "bg-white")}>
                <AppLoader size="md" />
            </div>
        );
    }

    const statusColor = STATUS_COLORS[project.status] || '#6b7280';
    const dl = deadlineMeta(project.deadline);

    const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'tasks',  label: 'Tasks',    icon: <Layers size={13} /> },
        { id: 'linked', label: 'Finances',  icon: <Receipt size={13} /> },
    ];

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.origin + '/p/project/' + projectId);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    const sc = STATUS_COLORS[project.status] || '#6b7280';

    return (
        <div className={cn("flex flex-col h-full overflow-hidden", isDark ? "bg-[#141414]" : "bg-[#f7f7f7]")}>

            {/* ── TOP BAR ── */}
            <div className={cn(
                "flex items-center justify-between px-3 md:px-6 py-2.5 md:py-4 border-b shrink-0 relative z-[100]",
                isDark ? "bg-[#141414] border-[#252525]" : "bg-white border-[#e4e4e4]"
            )}>
                {/* Subtle Branding Accent Glow */}
                <div 
                    className="absolute left-0 top-0 bottom-0 w-[240px] pointer-events-none opacity-[0.05]"
                    style={{ background: `linear-gradient(to right, ${project.color}, transparent)` }}
                />
                {/* Left */}
                <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    <button
                        onClick={() => router.push('/projects')}
                        className={cn("flex items-center justify-center w-8 h-8 shrink-0 rounded-[8px] transition-all",
                            isDark ? "text-[#666] hover:text-[#ccc] bg-[#222]" : "text-[#888] hover:text-[#111] bg-[#f0f0f0] hover:bg-[#e8e8e8]")}>
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className={cn("hidden md:flex items-center gap-2 text-[13px] font-medium shrink-0",
                            isDark ? "text-white/40" : "text-gray-400")}>
                            <span>Projects</span>
                            <span className="opacity-30">/</span>
                        </div>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onBlur={() => {
                                if (title.trim() && title !== project.name) {
                                    updateProject(project.id, { name: title.trim() });
                                    appToast.success('Renamed', 'Project name updated');
                                } else {
                                    setTitle(project.name);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                                if (e.key === 'Escape') { setTitle(project.name); e.currentTarget.blur(); }
                            }}
                            className={cn("text-[13px] font-semibold bg-transparent outline-none transition-all w-full min-w-0",
                                isDark ? "text-white/90 placeholder:text-white/20" : "text-gray-900 placeholder:text-gray-300")}
                            placeholder="Project Name"
                        />

                    </div>
                </div>

                {/* Center Toggle */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex">
                    <div className={cn("p-1 rounded-[10px] flex items-center gap-1", isDark ? "bg-white/[0.04]" : "bg-black/[0.04]")}>
                        {TABS.map(tab => {
                            const active = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "px-3.5 py-1 rounded-[7px] text-[11px] font-bold transition-all flex items-center gap-2 outline-none",
                                        active
                                            ? isDark 
                                                ? "bg-[#222] text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)] border border-white/5" 
                                                : "bg-white text-[#111] shadow-[0_2px_6px_rgba(0,0,0,0.06)] border border-black/5"
                                            : isDark 
                                                ? "text-[#444] hover:text-[#ccc]" 
                                                : "text-[#999] hover:text-[#555]"
                                    )}
                                >
                                    <span className={cn("opacity-40 transition-opacity", active && "text-primary opacity-100")}>
                                        {tab.icon}
                                    </span>
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                    <div className="relative hidden md:flex items-center" ref={statusRef}>
                        <button
                            onClick={() => setStatusOpen(s => !s)}
                            style={{ 
                                backgroundColor: isDark ? `${sc}15` : `${sc}10`,
                                color: sc,
                                borderColor: `${sc}30`
                            }}
                            className={cn(
                                "flex items-center gap-1.5 px-3 h-[32px] rounded-[8px] text-[12px] font-bold transition-all border outline-none hover:shadow-sm"
                            )}
                        >
                            <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]" style={{ backgroundColor: sc }} />
                            {project.status}
                            <ChevronDown size={14} className="ml-1 opacity-70" />
                        </button>
                        {statusOpen && (
                            <div className={cn(
                                "absolute right-0 top-full mt-1.5 w-40 rounded-[10px] border shadow-xl py-1 z-50",
                                isDark ? "bg-[#1f1f1f] border-[#333]" : "bg-white border-[#d2d2eb]"
                            )}>
                                {STATUS_ORDER.map(s => {
                                    const isActive = s === project.status;
                                    const sColor = STATUS_COLORS[s];
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => { updateProject(project.id, { status: s }); setStatusOpen(false); }}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors",
                                                isDark ? "hover:bg-white/5 text-[#ccc]" : "hover:bg-[#f5f5f5] text-[#333]",
                                                isActive ? "font-semibold" : ""
                                            )}
                                        >
                                            <div className="flex items-center gap-2 flex-1">
                                                <div 
                                                    className="w-1.5 h-1.5 rounded-full shrink-0" 
                                                    style={{ backgroundColor: sColor }} 
                                                />
                                                <span>{s}</span>
                                            </div>
                                            {isActive && <Check size={12} className="text-primary" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className={cn("w-px h-5 mx-0.5 hidden md:block", isDark ? "bg-white/10" : "bg-[#e2e2e2]")} />

                    <button
                        onClick={() => window.open(window.location.origin + '/p/project/' + project.id, '_blank')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 h-[32px] rounded-[8px] text-[12px] font-bold transition-all border",
                            isDark
                                ? "bg-white/[0.05] text-[#aaa] hover:text-white border-white/[0.08]"
                                : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111] border-black/5"
                        )}
                    >
                        <Eye size={14} />
                        Preview
                    </button>

                    <button 
                        onClick={copyLink}
                        className={cn("hidden md:flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all border",
                            isDark ? "bg-white/[0.05] text-[#aaa] hover:text-white border-white/[0.08]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111] border-black/5")}>
                        {copied ? <Check size={14} className="text-primary" /> : <Link2 size={14} />}
                    </button>

                    <button 
                        onClick={() => setShowEdit(true)}
                        className={cn("hidden sm:flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all border",
                            isDark ? "bg-white/[0.05] text-[#aaa] hover:text-white border-white/[0.08]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111] border-black/5")}>
                        <Settings size={14} />
                    </button>

                    <div className="relative" ref={actionsRef}>
                        <button onClick={() => setActionsOpen(v => !v)}
                            className={cn("flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all border",
                                isDark ? "bg-white/[0.05] text-[#aaa] hover:text-white border-white/[0.08]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111] border-black/5")}>
                            <MoreHorizontal size={14} />
                        </button>
                        {actionsOpen && (
                            <div className={cn("absolute right-0 top-full mt-1.5 w-48 rounded-[10px] shadow-xl py-1 z-50 border",
                                isDark ? "bg-[#0c0c0c] border-[#222]" : "bg-white border-[#d2d2eb]")}>
                                {[
                                    { icon: Settings, label: 'Project Settings', action: () => setShowEdit(true) },
                                    { icon: LayoutTemplate, label: 'Save as Template', action: () => setSaveTemplateOpen(true) },
                                    { icon: Archive, label: 'Archive Project', action: () => { updateProject(project.id, { is_archived: true }); router.push('/projects'); } },
                                    { icon: ExternalLink, label: 'Open Live View', action: () => window.open(window.location.origin + '/p/project/' + project.id, '_blank') },
                                    { icon: Link2, label: 'Copy Project Link', action: copyLink },
                                    { divider: true },
                                    { icon: Trash2, label: 'Delete Project', action: () => setActionsOpen(false), danger: true },
                                ].map((item, idx) => {
                                    if (item.divider) return <div key={idx} className={cn("my-1 h-px", isDark ? "bg-white/5" : "bg-black/5")} />;
                                    const Icon = item.icon!;
                                    return (
                                        <button key={item.label} onClick={() => { item.action?.(); setActionsOpen(false); }}
                                            className={cn("w-full flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors",
                                                item.danger ? "text-red-500 hover:bg-red-50" : isDark ? "hover:bg-white/5 text-[#ccc]" : "hover:bg-[#f5f5f5] text-[#333]"
                                            )}>
                                            <Icon size={14} className={item.danger ? "text-red-500" : "opacity-60"} />
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>



            {/* ── TASKS TOOLBAR ── */}
            {activeTab === 'tasks' && (
                <div className={cn(
                    "flex items-center gap-0.5 px-3 py-1.5 border-b shrink-0",
                    isDark ? "bg-[#141414] border-[#1e1e1e]" : "bg-white border-[#eaeaea]"
                )}>

                    {/* Filter by Priority dropdown */}
                    <div className="relative" ref={filterRef}>
                        <TbBtn
                            label="Filter"
                            icon={<Filter size={10} />}
                            hasArrow
                            active={filterPriority !== 'all' || filterStatus !== 'all'}
                            isDark={isDark}
                            onClick={() => { setFilterOpen(v => !v); setOrderOpen(false); }}
                        />
                        {filterOpen && (
                            <div className={cn(
                                "absolute left-0 top-full mt-1.5 z-50 rounded-xl border shadow-2xl overflow-hidden min-w-[200px]",
                                isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                            )}>
                                {/* Priority filter */}
                                <div className={cn("px-3 pt-3 pb-1.5", isDark ? "" : "")}>
                                    <p className={cn("text-[9.5px] font-bold uppercase tracking-widest mb-2", isDark ? "text-[#444]" : "text-[#bbb]")}>Priority</p>
                                    <div className="flex flex-wrap gap-1 mb-1">
                                        {(['all', 'none', 'low', 'medium', 'high', 'urgent'] as const).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setFilterPriority(p)}
                                                className={cn(
                                                    "px-2 py-0.5 rounded-md text-[10.5px] font-semibold border transition-all",
                                                    filterPriority === p
                                                        ? isDark ? "bg-primary/20 border-primary/40 text-primary" : "bg-primary/10 border-primary/30 text-primary"
                                                        : isDark ? "border-[#2a2a2a] text-[#555] hover:text-[#aaa] hover:border-[#3a3a3a]" : "border-[#ebebeb] text-[#aaa] hover:text-[#555] hover:border-[#ccc]"
                                                )}
                                            >{p === 'all' ? 'Any' : p.charAt(0).toUpperCase() + p.slice(1)}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className={cn("h-px mx-3", isDark ? "bg-[#252525]" : "bg-[#f0f0f0]")} />
                                {/* Status filter */}
                                <div className={cn("px-3 pt-2 pb-3")}>
                                    <p className={cn("text-[9.5px] font-bold uppercase tracking-widest mb-2", isDark ? "text-[#444]" : "text-[#bbb]")}>Status</p>
                                    <div className="flex flex-wrap gap-1">
                                        {(['all', 'todo', 'doing', 'review', 'done'] as const).map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setFilterStatus(s)}
                                                className={cn(
                                                    "px-2 py-0.5 rounded-md text-[10.5px] font-semibold border transition-all",
                                                    filterStatus === s
                                                        ? isDark ? "bg-primary/20 border-primary/40 text-primary" : "bg-primary/10 border-primary/30 text-primary"
                                                        : isDark ? "border-[#2a2a2a] text-[#555] hover:text-[#aaa] hover:border-[#3a3a3a]" : "border-[#ebebeb] text-[#aaa] hover:text-[#555] hover:border-[#ccc]"
                                                )}
                                            >{s === 'all' ? 'Any' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
                                        ))}
                                    </div>
                                </div>
                                {/* Clear button */}
                                {(filterPriority !== 'all' || filterStatus !== 'all') && (
                                    <>
                                        <div className={cn("h-px mx-3", isDark ? "bg-[#252525]" : "bg-[#f0f0f0]")} />
                                        <div className="px-3 py-2">
                                            <button
                                                onClick={() => { setFilterPriority('all'); setFilterStatus('all'); }}
                                                className={cn("w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10.5px] font-semibold transition-colors",
                                                    isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#aaa] hover:text-[#555] hover:bg-[#f5f5f5]")}
                                            >
                                                <X size={10} /> Clear filters
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Order dropdown */}
                    <div className="relative" ref={orderRef}>
                        <TbBtn
                            label="Order"
                            icon={<ArrowUpDown size={10} />}
                            hasArrow
                            active={orderBy !== 'position'}
                            isDark={isDark}
                            onClick={() => { setOrderOpen(v => !v); setFilterOpen(false); }}
                        />
                        {orderOpen && (
                            <div className={cn(
                                "absolute left-0 top-full mt-1.5 z-50 rounded-xl border shadow-2xl overflow-hidden min-w-[170px] py-1",
                                isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                            )}>
                                {([
                                    { id: 'position',  label: 'Default order' },
                                    { id: 'priority',  label: 'Priority' },
                                    { id: 'due_date',  label: 'Due date' },
                                    { id: 'title',     label: 'Title (A–Z)' },
                                ] as const).map(o => (
                                    <button
                                        key={o.id}
                                        onClick={() => { setOrderBy(o.id); setOrderOpen(false); }}
                                        className={cn(
                                            "w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] transition-colors text-left",
                                            orderBy === o.id
                                                ? isDark ? "bg-white/8 text-white font-medium" : "bg-[#f0f0f0] text-[#111] font-medium"
                                                : isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]"
                                        )}
                                    >
                                        <span className="flex-1">{o.label}</span>
                                        {orderBy === o.id && <Check size={11} className="text-primary" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Archived toggle */}
                    <TbBtn
                        label={showArchived ? 'Active' : 'Archived'}
                        active={showArchived}
                        icon={showArchived ? <ArchiveRestore size={10} /> : <Archive size={10} />}
                        isDark={isDark}
                        onClick={() => { setShowArchived(v => !v); setFilterOpen(false); setOrderOpen(false); }}
                    />

                    <div className="flex-1" />

                    {/* Active filter badges */}
                    <AnimatePresence>
                        {(filterPriority !== 'all' || filterStatus !== 'all') && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex items-center gap-1 mr-2"
                            >
                                {filterPriority !== 'all' && (
                                    <span className={cn(
                                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                        isDark ? "bg-primary/10 border-primary/20 text-primary/80" : "bg-primary/8 border-primary/20 text-primary"
                                    )}>
                                        Priority: {filterPriority}
                                        <button onClick={() => setFilterPriority('all')} className="hover:opacity-70"><X size={8} /></button>
                                    </span>
                                )}
                                {filterStatus !== 'all' && (
                                    <span className={cn(
                                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                        isDark ? "bg-primary/10 border-primary/20 text-primary/80" : "bg-primary/8 border-primary/20 text-primary"
                                    )}>
                                        Status: {filterStatus}
                                        <button onClick={() => setFilterStatus('all')} className="hover:opacity-70"><X size={8} /></button>
                                    </span>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Search */}
                    <div className="relative">
                        <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none", isDark ? "opacity-25" : "opacity-30")} size={11} />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search tasks…"
                            className={cn(
                                'pl-7 pr-3 py-1.5 text-[11px] rounded-lg border focus:outline-none transition-all w-36 focus:w-48',
                                isDark
                                    ? 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/20 focus:border-white/15'
                                    : 'bg-[#f6f6f6] border-[#e5e5e5] text-[#111] placeholder:text-[#bbb] focus:border-[#ccc] focus:bg-white'
                            )}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition-opacity">
                                <X size={9} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB CONTENT ── */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {activeTab === 'tasks' && (
                    <KanbanBoard
                        projectId={projectId}
                        projectColor={project.color}
                        isDark={isDark}
                        searchQuery={searchQuery}
                        showArchived={showArchived}
                        filterPriority={filterPriority}
                        filterStatus={filterStatus}
                        orderBy={orderBy}
                        onTaskClick={setSelectedTask}
                    />
                )}
                {activeTab === 'linked' && <LinkedItemsTab projectId={projectId} isDark={isDark} />}
            </div>

            {/* Task detail panel */}
            <AnimatePresence>
                {selectedTask && (
                    <TaskDetailPanel
                        key={selectedTask.id}
                        task={selectedTask}
                        projectId={projectId}
                        projectName={project.name}
                        isDark={isDark}
                        onClose={() => setSelectedTask(null)}
                    />
                )}
            </AnimatePresence>

            {/* Edit Project Modal */}
            {showEdit && (
                <EditProjectModal
                    open={showEdit}
                    onClose={() => setShowEdit(false)}
                    project={project}
                />
            )}

            {saveTemplateOpen && (
                <SaveTemplateModal
                    open={saveTemplateOpen}
                    onClose={() => setSaveTemplateOpen(false)}
                    onSave={handleSaveTemplate}
                    defaultName={`${project.name} Template`}
                    entityType="project"
                />
            )}
        </div>
    );
}
