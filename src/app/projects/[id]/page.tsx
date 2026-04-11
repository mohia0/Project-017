"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, ChevronDown, Check, X,
    Briefcase, Calendar, Users, Archive, Trash2, Plus,
    LayoutGrid, List, Filter, ArrowUpDown, Search,
    MoreHorizontal, RefreshCw, Edit3, Link2, FileText, Receipt,
    ArchiveRestore, Upload, Download, Copy, Zap,
    Target, TrendingUp, Clock, CheckCircle2, AlertCircle, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore, Project, ProjectTask, ProjectStatus, TaskStatus } from '@/store/useProjectStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useProposalStore } from '@/store/useProposalStore';
import { useRouter, useParams } from 'next/navigation';
import { gooeyToast } from 'goey-toast';
import { Avatar } from '@/components/ui/Avatar';
import dynamic from 'next/dynamic';

const KanbanBoard = dynamic(() => import('@/components/projects/KanbanBoard'), { ssr: false });
const TaskDetailPanel = dynamic(() => import('@/components/projects/TaskDetailPanel'), { ssr: false });

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

type Tab = 'tasks' | 'linked' | 'edit';

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

function TbBtn({ label, icon, active, hasArrow, onClick, isDark, danger }: {
    label?: string; icon?: React.ReactNode; active?: boolean;
    hasArrow?: boolean; onClick?: () => void; isDark: boolean; danger?: boolean;
}) {
    return (
        <button onClick={onClick} className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all shrink-0",
            danger
                ? "text-red-400 hover:bg-red-500/10"
                : active
                    ? isDark ? "bg-white/10 text-white border border-white/10" : "bg-[#ebebf5] text-[#111] border border-[#d5d5ee]"
                    : isDark ? "text-[#666] hover:text-[#ccc] hover:bg-white/5" : "text-[#888] hover:text-[#333] hover:bg-[#f0f0f0]"
        )}>
            {icon}{label}{hasArrow && <ChevronDown size={9} className="opacity-40" />}
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

// ─── Linked Items Tab ─────────────────────────────────────────────────────────

function LinkedItemsTab({ projectId, isDark }: { projectId: string; isDark: boolean }) {
    const { itemsByProject, fetchProjectItems, addProjectItem, removeProjectItem } = useProjectStore();
    const { invoices } = useInvoiceStore();
    const { proposals } = useProposalStore();
    const items = itemsByProject[projectId] || [];

    const [linkOpen, setLinkOpen] = useState(false);
    const [search, setSearch]     = useState('');
    const [linkType, setLinkType] = useState<'invoice' | 'proposal'>('invoice');

    useEffect(() => { fetchProjectItems(projectId); }, [projectId, fetchProjectItems]);

    const available = useMemo(() => {
        const linked = new Set(items.map(i => i.item_id));
        const src = linkType === 'invoice' ? invoices : proposals;
        return src.filter((i: any) => !linked.has(i.id) && (!search || i.title?.toLowerCase().includes(search.toLowerCase())));
    }, [linkType, invoices, proposals, items, search]);

    const handleLink = async (itemId: string) => {
        await addProjectItem({ project_id: projectId, item_type: linkType, item_id: itemId });
        gooeyToast.success('Item linked');
        setLinkOpen(false);
        setSearch('');
    };
    const handleUnlink = async (id: string) => {
        await removeProjectItem(id, projectId);
        gooeyToast('Unlinked', { duration: 1500 });
    };

    const linkedInvoices  = items.filter(i => i.item_type === 'invoice');
    const linkedProposals = items.filter(i => i.item_type === 'proposal');
    const getInvoice  = (id: string) => invoices.find((i: any) => i.id === id);
    const getProposal = (id: string) => proposals.find((p: any) => p.id === id);

    const totalInvoiced = linkedInvoices.reduce((sum, li) => {
        const inv = getInvoice(li.item_id) as any;
        return sum + Number(inv?.amount || 0);
    }, 0);

    return (
        <div className={cn("flex-1 overflow-y-auto min-h-0", isDark ? "bg-[#141414]" : "bg-[#f7f7f7]")}>
            <div className="max-w-3xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className={cn("text-[15px] font-bold tracking-tight", isDark ? "text-white" : "text-[#111]")}>
                            Linked Items
                        </h3>
                        <p className={cn("text-[11px] mt-0.5", isDark ? "text-[#555]" : "text-[#bbb]")}>
                            Connect invoices and proposals to this project
                        </p>
                    </div>
                    <button
                        onClick={() => setLinkOpen(v => !v)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-white text-[12px] font-bold rounded-[8px] transition-all active:scale-95 shadow-lg shadow-primary/20"
                    >
                        <Plus size={13} /> Link Item
                    </button>
                </div>

                {/* Summary Cards */}
                {items.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Total Links', value: items.length, color: '#6366f1', icon: <Link2 size={14} /> },
                            { label: 'Invoices', value: linkedInvoices.length, color: '#10b981', icon: <Receipt size={14} /> },
                            { label: 'Proposals', value: linkedProposals.length, color: '#f59e0b', icon: <FileText size={14} /> },
                        ].map(s => (
                            <div key={s.label} className={cn(
                                "flex items-center gap-3 p-4 rounded-xl border",
                                isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-white border-[#ebebeb] shadow-sm"
                            )}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}18` }}>
                                    <span style={{ color: s.color }}>{s.icon}</span>
                                </div>
                                <div>
                                    <p className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-[#444]" : "text-[#bbb]")}>{s.label}</p>
                                    <p className={cn("text-[18px] font-bold leading-tight", isDark ? "text-white" : "text-[#111]")}>{s.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Link picker */}
                <AnimatePresence>
                    {linkOpen && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            className={cn("rounded-xl border shadow-xl overflow-hidden", isDark ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-[#e0e0e0]")}>
                            <div className={cn("flex border-b", isDark ? "border-[#222]" : "border-[#f0f0f0]")}>
                                {(['invoice', 'proposal'] as const).map(t => (
                                    <button key={t} onClick={() => setLinkType(t)}
                                        className={cn("flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-2",
                                            linkType === t ? "border-primary text-primary" : `border-transparent ${isDark ? "text-[#555]" : "text-[#ccc]"}`)}>
                                        {t === 'invoice' ? 'Invoices' : 'Proposals'}
                                    </button>
                                ))}
                            </div>
                            <div className={cn("flex items-center gap-2 px-3 py-2 border-b", isDark ? "border-[#1e1e1e]" : "border-[#f5f5f5]")}>
                                <Search size={11} className={isDark ? "text-[#444]" : "text-[#ccc]"} />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                                    className={cn("flex-1 bg-transparent text-[12px] outline-none", isDark ? "text-[#ccc] placeholder:text-[#333]" : "text-[#333] placeholder:text-[#bbb]")} />
                            </div>
                            <div className="max-h-[200px] overflow-y-auto py-1">
                                {available.length === 0
                                    ? <p className={cn("text-center text-[11px] py-6", isDark ? "text-[#444]" : "text-[#bbb]")}>No items available</p>
                                    : (available as any[]).slice(0, 25).map((item: any) => (
                                        <button key={item.id} onClick={() => handleLink(item.id)}
                                            className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-[#fafafa]")}>
                                            <span className={cn("text-[12px] font-medium truncate flex-1", isDark ? "text-[#ccc]" : "text-[#333]")}>{item.title || item.id.slice(-6).toUpperCase()}</span>
                                            <span className={cn("text-[10px] shrink-0", isDark ? "text-[#555]" : "text-[#bbb]")}>{item.status}</span>
                                        </button>
                                    ))
                                }
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Linked invoices */}
                {linkedInvoices.length > 0 && (
                    <div>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2", isDark ? "text-[#444]" : "text-[#bbb]")}>
                            <Receipt size={10} /> Invoices
                            <span className="ml-auto font-normal normal-case tracking-normal">
                                Total: <strong className={isDark ? "text-[#888]" : "text-[#555]"}>${totalInvoiced.toLocaleString()}</strong>
                            </span>
                        </p>
                        <div className="flex flex-col gap-2">
                            {linkedInvoices.map(li => {
                                const inv = getInvoice(li.item_id) as any;
                                if (!inv) return null;
                                return (
                                    <div key={li.id} className={cn(
                                        "flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all group hover:shadow-sm",
                                        isDark ? "bg-[#1a1a1a] border-[#252525] hover:border-[#333]" : "bg-white border-[#ebebeb] hover:border-[#d8d8d8]"
                                    )}>
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
                                            <Receipt size={14} className="text-emerald-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn("text-[12.5px] font-semibold truncate", isDark ? "text-[#ddd]" : "text-[#222]")}>{inv.title || `INV-${inv.id.slice(-6).toUpperCase()}`}</p>
                                            <p className={cn("text-[11px]", isDark ? "text-[#555]" : "text-[#aaa]")}>{inv.client_name || '—'}</p>
                                        </div>
                                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", isDark ? "bg-white/5 text-[#777]" : "bg-[#f5f5f5] text-[#999]")}>{inv.status}</span>
                                        <span className={cn("text-[13px] font-bold tabular-nums", isDark ? "text-[#aaa]" : "text-[#444]")}>${Number(inv.amount || 0).toLocaleString()}</span>
                                        <button onClick={() => handleUnlink(li.id)} className={cn("w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all", isDark ? "text-[#444] hover:text-red-400 hover:bg-red-500/10" : "text-[#ccc] hover:text-red-400 hover:bg-red-50")}>
                                            <X size={12} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Linked proposals */}
                {linkedProposals.length > 0 && (
                    <div>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2", isDark ? "text-[#444]" : "text-[#bbb]")}>
                            <FileText size={10} /> Proposals
                        </p>
                        <div className="flex flex-col gap-2">
                            {linkedProposals.map(lp => {
                                const prop = getProposal(lp.item_id) as any;
                                if (!prop) return null;
                                return (
                                    <div key={lp.id} className={cn(
                                        "flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all group hover:shadow-sm",
                                        isDark ? "bg-[#1a1a1a] border-[#252525] hover:border-[#333]" : "bg-white border-[#ebebeb] hover:border-[#d8d8d8]"
                                    )}>
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.1)' }}>
                                            <FileText size={14} className="text-indigo-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn("text-[12.5px] font-semibold truncate", isDark ? "text-[#ddd]" : "text-[#222]")}>{prop.title || `PROP-${prop.id.slice(-6).toUpperCase()}`}</p>
                                            <p className={cn("text-[11px]", isDark ? "text-[#555]" : "text-[#aaa]")}>{prop.client_name || '—'}</p>
                                        </div>
                                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", isDark ? "bg-white/5 text-[#777]" : "bg-[#f5f5f5] text-[#999]")}>{prop.status}</span>
                                        <span className={cn("text-[13px] font-bold tabular-nums", isDark ? "text-[#aaa]" : "text-[#444]")}>${Number(prop.amount || 0).toLocaleString()}</span>
                                        <button onClick={() => handleUnlink(lp.id)} className={cn("w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all", isDark ? "text-[#444] hover:text-red-400 hover:bg-red-500/10" : "text-[#ccc] hover:text-red-400 hover:bg-red-50")}>
                                            <X size={12} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {items.length === 0 && !linkOpen && (
                    <div className={cn("flex flex-col items-center justify-center py-20 gap-5 text-center rounded-2xl border border-dashed", isDark ? "border-[#252525]" : "border-[#e5e5e5]")}>
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", isDark ? "bg-white/5" : "bg-[#f5f5f5]")}>
                            <Link2 size={24} className={isDark ? "text-[#333]" : "text-[#ccc]"} />
                        </div>
                        <div>
                            <p className={cn("text-[14px] font-semibold", isDark ? "text-[#505050]" : "text-[#888]")}>No linked items</p>
                            <p className={cn("text-[12px] mt-1", isDark ? "text-[#333]" : "text-[#ccc]")}>Connect invoices or proposals to track financials</p>
                        </div>
                        <button onClick={() => setLinkOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-primary hover:bg-primary/90 text-white text-[12px] font-semibold transition-all">
                            <Plus size={13} /> Link First Item
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Edit Tab ─────────────────────────────────────────────────────────────────

function EditTab({ project, isDark }: { project: Project; isDark: boolean }) {
    const { updateProject } = useProjectStore();
    const [name, setName]         = useState(project.name);
    const [desc, setDesc]         = useState(project.description || '');
    const [deadline, setDeadline] = useState(project.deadline || '');
    const [saving, setSaving]     = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await updateProject(project.id, { name: name.trim() || project.name, description: desc.trim() || null, deadline: deadline || null });
        setSaving(false);
        gooeyToast.success('Project updated');
    };

    const inputCls = cn(
        "w-full px-4 py-2.5 rounded-xl text-[13px] border outline-none transition-all",
        isDark
            ? "bg-white/[0.04] border-[#2a2a2a] text-white placeholder:text-[#3a3a3a] focus:border-[#444] focus:bg-white/[0.06]"
            : "bg-white border-[#e0e0e0] text-[#111] placeholder:text-[#bbb] focus:border-[#bbb] shadow-sm"
    );
    const labelCls = cn("text-[10.5px] font-bold mb-2 block uppercase tracking-wider", isDark ? "text-[#444]" : "text-[#aaa]");

    return (
        <div className={cn("flex-1 overflow-y-auto min-h-0", isDark ? "bg-[#141414]" : "bg-[#f7f7f7]")}>
            <div className="max-w-2xl mx-auto p-6">
                {/* Header */}
                <div className="mb-6">
                    <h3 className={cn("text-[15px] font-bold tracking-tight", isDark ? "text-white" : "text-[#111]")}>Edit Project</h3>
                    <p className={cn("text-[11px] mt-0.5", isDark ? "text-[#555]" : "text-[#bbb]")}>Update project details and settings</p>
                </div>

                <div className={cn("rounded-2xl border p-6 space-y-5", isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-white border-[#ebebeb] shadow-sm")}>
                    <div>
                        <label className={labelCls}>Project Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Project name…" />
                    </div>
                    <div>
                        <label className={labelCls}>Description</label>
                        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} className={cn(inputCls, "resize-none")} placeholder="Describe what this project is about…" />
                    </div>
                    <div>
                        <label className={labelCls}>Deadline</label>
                        <div className="relative">
                            <Calendar size={13} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none", isDark ? "text-[#444]" : "text-[#bbb]")} />
                            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={cn(inputCls, "pl-9 cursor-pointer")} style={{ colorScheme: isDark ? 'dark' : 'light' }} />
                        </div>
                    </div>
                    <div className="pt-2">
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/20">
                            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                            Save Changes
                        </button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className={cn("mt-6 rounded-2xl border p-5", isDark ? "bg-red-500/5 border-red-500/20" : "bg-red-50 border-red-200")}>
                    <p className="text-[12px] font-bold text-red-500 mb-1">Danger Zone</p>
                    <p className={cn("text-[11px] mb-4", isDark ? "text-[#666]" : "text-[#888]")}>These actions cannot be undone.</p>
                    <div className="flex gap-2">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                            <Archive size={11} /> Archive Project
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-bold bg-red-500 hover:bg-red-600 text-white transition-all active:scale-95 shadow-md shadow-red-500/20">
                            <Trash2 size={11} /> Delete Project
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Project Detail Page ─────────────────────────────────────────────────

export default function ProjectDetailPage() {
    const router    = useRouter();
    const params    = useParams();
    const projectId = params?.id as string;

    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { projects, updateProject, fetchProjects, tasksByProject } = useProjectStore();

    const [activeTab, setActiveTab]       = useState<Tab>('tasks');
    const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
    const [statusOpen, setStatusOpen]     = useState(false);
    const [actionsOpen, setActionsOpen]   = useState(false);
    const statusRef  = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => { if (!projects.length) fetchProjects(); }, [fetchProjects, projects.length]);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
            if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setActionsOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const project = projects.find(p => p.id === projectId);

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
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const statusColor = STATUS_COLORS[project.status] || '#6b7280';
    const dl = deadlineMeta(project.deadline);

    const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'tasks',  label: 'Tasks',        icon: <Layers size={13} /> },
        { id: 'linked', label: 'Linked Items', icon: <Link2 size={13} /> },
        { id: 'edit',   label: 'Edit',         icon: <Edit3 size={13} /> },
    ];

    return (
        <div className={cn("flex flex-col h-full overflow-hidden", isDark ? "bg-[#141414]" : "bg-[#f7f7f7]")}>

            {/* ── HEADER ── */}
            <div className={cn(
                "flex items-center gap-2 px-5 border-b shrink-0 h-[44px]",
                isDark ? "bg-[#141414] border-[#1e1e1e]" : "bg-white border-[#eaeaea]"
            )}>
                {/* Back */}
                <button
                    onClick={() => router.push('/projects')}
                    className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center transition-colors shrink-0",
                        isDark ? "text-[#444] hover:text-[#ccc] hover:bg-white/5" : "text-[#ccc] hover:text-[#444] hover:bg-[#f5f5f5]"
                    )}
                >
                    <ChevronLeft size={13} />
                </button>

                {/* Breadcrumb */}
                <div className={cn("flex items-center gap-1 text-[11px] shrink-0", isDark ? "text-[#3a3a3a]" : "text-[#ccc]")}>
                    <button onClick={() => router.push('/projects')} className={cn("transition-colors", isDark ? "hover:text-[#666]" : "hover:text-[#888]")}>
                        Projects
                    </button>
                    <ChevronRight size={10} className="opacity-40" />
                </div>

                {/* Project identity */}
                <div className="flex items-center gap-2 min-w-0 flex-1 group/name">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: project.color }} />
                    <span
                        contentEditable
                        suppressContentEditableWarning
                        spellCheck={false}
                        onBlur={(e) => {
                            const newName = e.currentTarget.textContent?.trim();
                            if (newName && newName !== project.name) {
                                updateProject(project.id, { name: newName });
                                gooeyToast.success('Project renamed');
                            } else {
                                e.currentTarget.textContent = project.name;
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
                            if (e.key === 'Escape') { e.currentTarget.textContent = project.name; e.currentTarget.blur(); }
                        }}
                        className={cn(
                            "text-[12.5px] font-semibold tracking-tight truncate outline-none cursor-text",
                            isDark ? "text-[#e0e0e0]" : "text-[#111]"
                        )}
                        title="Click to rename"
                    >
                        {project.name}
                    </span>
                    {project.client_name && (
                        <span className={cn("text-[11px] hidden lg:block shrink-0 truncate max-w-[160px]", isDark ? "text-[#333]" : "text-[#ccc]")}>
                            · {project.client_name}
                        </span>
                    )}
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-1 shrink-0">

                    {/* Progress pill */}
                    <div className={cn(
                        "hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg border",
                        isDark ? "border-[#1e1e1e] bg-[#181818]" : "border-[#ebebeb] bg-[#fafafa] shadow-sm"
                    )}>
                        <div className="relative shrink-0">
                            <CircleProgress pct={progress.pct} color={project.color} size={20} isDark={isDark} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={cn("text-[5px] font-bold tabular-nums", isDark ? "text-[#999]" : "text-[#555]")}>{progress.pct}%</span>
                            </div>
                        </div>
                        <div className="leading-none">
                            <p className={cn("text-[8px] font-bold uppercase tracking-widest leading-none mb-0.5", isDark ? "text-[#3a3a3a]" : "text-[#bbb]")}>Progress</p>
                            <p className={cn("text-[10.5px] font-semibold tabular-nums leading-none", isDark ? "text-[#bbb]" : "text-[#222]")}>{progress.done}/{progress.total} tasks</p>
                        </div>
                    </div>

                    {/* Deadline chip */}
                    {project.deadline && (
                        <div className={cn(
                            "hidden md:flex items-center gap-1 px-2 py-1 rounded-md border text-[10.5px] font-medium",
                            dl.urgent
                                ? "border-red-500/20 bg-red-500/8 text-red-400"
                                : isDark ? "border-[#1e1e1e] bg-[#181818] text-[#3a3a3a]" : "border-[#ebebeb] bg-[#fafafa] text-[#bbb] shadow-sm"
                        )}>
                            <Calendar size={9} />
                            {dl.text}
                        </div>
                    )}

                    {/* Separator */}
                    <div className={cn("w-px h-4 mx-0.5", isDark ? "bg-[#222]" : "bg-[#eaeaea]")} />

                    {/* Member avatars */}
                    {project.members.length > 0 && (
                        <div className="hidden md:flex -space-x-1.5">
                            {project.members.slice(0, 3).map((m, i) => (
                                <Avatar key={i} name={m.name} src={m.avatar_url} className={cn("w-5 h-5 rounded-full ring-[1.5px]", isDark ? "ring-[#141414]" : "ring-white")} isDark={isDark} />
                            ))}
                            {project.members.length > 3 && (
                                <div className={cn("w-5 h-5 rounded-full ring-[1.5px] flex items-center justify-center text-[7px] font-bold", isDark ? "bg-[#222] text-[#666] ring-[#141414]" : "bg-[#eee] text-[#aaa] ring-white")}>
                                    +{project.members.length - 3}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Status badge / dropdown */}
                    <div className="relative" ref={statusRef}>
                        <button
                            onClick={() => setStatusOpen(v => !v)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-semibold border transition-all"
                            style={{ background: `${statusColor}10`, borderColor: `${statusColor}25`, color: statusColor }}
                        >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusColor }} />
                            {project.status}
                            <ChevronDown size={8} className="opacity-50" />
                        </button>

                        <AnimatePresence>
                            {statusOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                    transition={{ duration: 0.12 }}
                                    className={cn(
                                        "absolute right-0 top-full mt-1.5 z-50 rounded-xl border shadow-2xl overflow-hidden min-w-[148px]",
                                        isDark ? "bg-[#1c1c1c] border-[#2a2a2a]" : "bg-white border-[#e0e0e0]"
                                    )}
                                >
                                    <div className="py-1">
                                        {STATUS_ORDER.map(s => (
                                            <button key={s} onClick={() => { updateProject(project.id, { status: s }); setStatusOpen(false); }}
                                                className={cn(
                                                    "w-full flex items-center gap-2.5 px-3 py-1.5 text-[11.5px] transition-colors",
                                                    s === project.status
                                                        ? isDark ? "bg-white/5 font-semibold" : "bg-[#f5f5f5] font-semibold"
                                                        : isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#fafafa]"
                                                )}
                                                style={{ color: STATUS_COLORS[s] }}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[s] }} />
                                                {s}
                                                {s === project.status && <Check size={10} className="ml-auto opacity-40" />}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Actions menu */}
                    <div className="relative" ref={actionsRef}>
                        <button
                            onClick={() => setActionsOpen(v => !v)}
                            className={cn(
                                "w-6 h-6 flex items-center justify-center rounded-md transition-colors",
                                isDark ? "text-[#3a3a3a] hover:text-[#aaa] hover:bg-white/5" : "text-[#bbb] hover:text-[#444] hover:bg-[#f0f0f0]"
                            )}
                        >
                            <MoreHorizontal size={13} />
                        </button>
                        <Dropdown open={actionsOpen} onClose={() => setActionsOpen(false)} isDark={isDark} right>
                            <div className="py-1">
                                <DItem label="Edit project" icon={<Edit3 size={12} />} onClick={() => { setActiveTab('edit'); setActionsOpen(false); }} isDark={isDark} />
                                <DItem label="Archive project" icon={<Archive size={12} />} onClick={() => { updateProject(project.id, { is_archived: true }); router.push('/projects'); }} isDark={isDark} />
                                <div className={cn("h-px mx-2 my-1", isDark ? "bg-[#252525]" : "bg-[#f0f0f0]")} />
                                <DItem label="Delete project" icon={<Trash2 size={12} />} onClick={() => setActionsOpen(false)} isDark={isDark} danger />
                            </div>
                        </Dropdown>
                    </div>
                </div>
            </div>

            {/* ── TAB BAR ── */}
            <div className={cn(
                "flex items-center border-b shrink-0 px-5",
                isDark ? "bg-[#141414] border-[#1e1e1e]" : "bg-white border-[#eaeaea]"
            )}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-2.5 text-[11.5px] font-medium border-b-[1.5px] transition-all whitespace-nowrap",
                            activeTab === tab.id
                                ? "border-primary text-primary"
                                : `border-transparent ${isDark ? "text-[#3a3a3a] hover:text-[#777]" : "text-[#bbb] hover:text-[#555]"}`
                        )}
                    >
                        <span className={cn("transition-colors", activeTab === tab.id ? "text-primary" : isDark ? "text-[#3a3a3a]" : "text-[#ccc]")}>{tab.icon}</span>
                        {tab.label}
                        {tab.id === 'tasks' && (
                            <span className={cn(
                                "ml-1 text-[8.5px] font-bold tabular-nums px-1.5 py-0.5 rounded-full",
                                activeTab === 'tasks'
                                    ? "bg-primary/15 text-primary"
                                    : isDark ? "bg-white/[0.05] text-[#3a3a3a]" : "bg-[#f0f0f0] text-[#bbb]"
                            )}>{progress.total}</span>
                        )}
                    </button>
                ))}

                <div className="flex-1" />

                {activeTab === 'tasks' && progress.total > 0 && (
                    <div className="hidden md:flex items-center gap-3 mr-1">
                        <span className="text-[10px] font-medium flex items-center gap-1 text-emerald-500">
                            <CheckCircle2 size={9} /> {progress.done} done
                        </span>
                        {progress.doing > 0 && (
                            <span className="text-[10px] font-medium flex items-center gap-1 text-blue-500">
                                <Zap size={9} /> {progress.doing} doing
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ── TASKS TOOLBAR ── */}
            {activeTab === 'tasks' && (
                <div className={cn(
                    "flex items-center gap-1 px-4 py-1.5 border-b shrink-0",
                    isDark ? "bg-[#141414] border-[#1e1e1e]" : "bg-white border-[#eaeaea]"
                )}>
                    {/* Search */}
                    <div className={cn(
                        "relative flex items-center rounded-md border h-6 px-2 gap-1.5 mr-1",
                        isDark ? "bg-white/[0.03] border-[#242424]" : "bg-[#f8f8f8] border-[#eaeaea]"
                    )}>
                        <Search size={10} className={isDark ? "text-[#333]" : "text-[#ccc]"} />
                        <input
                            placeholder="Search tasks…"
                            className={cn("bg-transparent text-[11px] outline-none w-28", isDark ? "text-[#bbb] placeholder:text-[#2a2a2a]" : "text-[#333] placeholder:text-[#ccc]")}
                        />
                    </div>

                    <TbBtn label="Kanban"   icon={<LayoutGrid size={10} />} hasArrow isDark={isDark} />
                    <TbBtn label="Filter"   icon={<Filter size={10} />}     isDark={isDark} />
                    <TbBtn label="Group"    icon={<Layers size={10} />}     isDark={isDark} />
                    <TbBtn label="Order"    icon={<ArrowUpDown size={10} />} hasArrow isDark={isDark} />
                    <TbBtn label="Archived" icon={<Archive size={10} />}    isDark={isDark} />

                    <div className={cn("h-3 w-px mx-1", isDark ? "bg-[#252525]" : "bg-[#e5e5e5]")} />
                    <TbBtn label="Import / Export" icon={<Upload size={10} />} isDark={isDark} />
                </div>
            )}

            {/* ── TAB CONTENT ── */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {activeTab === 'tasks' && (
                    <KanbanBoard
                        projectId={projectId}
                        projectColor={project.color}
                        isDark={isDark}
                        onTaskClick={setSelectedTask}
                    />
                )}
                {activeTab === 'linked' && <LinkedItemsTab projectId={projectId} isDark={isDark} />}
                {activeTab === 'edit'   && <EditTab project={project} isDark={isDark} />}
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
        </div>
    );
}
