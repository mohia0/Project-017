"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, LayoutGrid, List, ChevronDown, Plus, Archive,
    ArchiveRestore, Trash2, Check, X, Filter,
    ArrowUpDown, Briefcase, Calendar, Users, Copy, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore, Project, ProjectStatus, ProjectMember } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useRouter } from 'next/navigation';
import { appToast } from '@/lib/toast';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import { SearchInput } from '@/components/ui/SearchInput';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { AppLoader } from '@/components/ui/AppLoader';
import { ContextMenuRow } from '@/components/ui/RowContextMenu';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_ORDER: ProjectStatus[] = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];

const STATUS_CFG: Record<ProjectStatus, { color: string; bar: string; badge: string; badgeText: string; badgeBorder: string }> = {
    Planning:  { color: '#6366f1', bar: '#6366f1', badge: 'bg-indigo-50',  badgeText: 'text-indigo-700',  badgeBorder: 'border-indigo-200'  },
    Active:    { color: '#10b981', bar: '#10b981', badge: 'bg-emerald-50', badgeText: 'text-emerald-700', badgeBorder: 'border-emerald-200' },
    'On Hold': { color: '#f59e0b', bar: '#f59e0b', badge: 'bg-amber-50',   badgeText: 'text-amber-700',   badgeBorder: 'border-amber-200'   },
    Completed: { color: '#3d0ebf', bar: '#3d0ebf', badge: 'bg-violet-50',  badgeText: 'text-violet-700',  badgeBorder: 'border-violet-200'  },
    Cancelled: { color: '#9ca3af', bar: '#9ca3af', badge: 'bg-gray-50',    badgeText: 'text-gray-500',    badgeBorder: 'border-gray-200'    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

function deadlineMeta(d: string | null | undefined): { text: string; urgent: boolean } {
    if (!d) return { text: '—', urgent: false };
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    if (diff < 0)   return { text: `${Math.abs(diff)}d overdue`, urgent: true  };
    if (diff === 0) return { text: 'Due today',                  urgent: true  };
    if (diff <= 7)  return { text: `${diff}d left`,              urgent: true  };
    return { text: fmtDate(d), urgent: false };
}

// ─── Shared Toolbar Button ────────────────────────────────────────────────────

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

import { Dropdown, DItem } from '@/components/ui/Dropdown';

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isDark }: { status: ProjectStatus; isDark: boolean }) {
    const cfg = STATUS_CFG[status];
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-1.5 py-[1px] rounded-[4px] text-[9.5px] font-semibold border shrink-0",
            isDark ? "bg-white/[0.04] border-white/5" : cn(cfg.badge, cfg.badgeBorder)
        )} style={isDark ? { color: cfg.color } : {}}>
            <span className={isDark ? '' : cfg.badgeText}>{status}</span>
        </span>
    );
}

function StatusCell({ status, onStatusChange, isDark }: { status: ProjectStatus; onStatusChange: (s: ProjectStatus) => void; isDark: boolean }) {
    const [open, setOpen] = useState(false);
    const cfg = STATUS_CFG[status];
    return (
        <div className="relative inline-block">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className={cn(
                    "inline-flex items-center gap-1.5 px-1.5 py-[1px] rounded-[4px] text-[9.5px] font-semibold border shrink-0 transition-colors",
                    isDark ? "bg-white/[0.04] border-white/5 hover:bg-white/[0.08]" : cn(cfg.badge, cfg.badgeBorder, "hover:brightness-95")
                )}
                style={isDark ? { color: cfg.color } : {}}
            >
                <span className={isDark ? '' : cfg.badgeText}>{status}</span>
                <ChevronDown size={10} className="opacity-50" />
            </button>
            <Dropdown open={open} onClose={() => setOpen(false)} isDark={isDark} align="left">
                <div className="py-1">
                    {STATUS_ORDER.map(s => {
                        const sCfg = STATUS_CFG[s];
                        const isActive = s === status;
                        return (
                            <button
                                key={s}
                                onClick={(e) => { e.stopPropagation(); onStatusChange(s); setOpen(false); }}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3.5 py-2 text-[11.5px] font-semibold text-left transition-colors",
                                    isActive
                                        ? isDark ? "bg-white/10" : "bg-black/5"
                                        : isDark ? "hover:bg-white/5" : "hover:bg-black/[0.02]"
                                )}
                            >
                                <span className={cn("flex-1", isDark ? "text-white" : "text-black")}>{s}</span>
                                {isActive && <Check size={12} className={cn("opacity-50", isDark ? "text-white" : "text-black")} />}
                            </button>
                        );
                    })}
                </div>
            </Dropdown>
        </div>
    );
}

// ─── Circular Progress ────────────────────────────────────────────────────────

function CircleProgress({ pct, color, size = 44, isDark }: { pct: number; color: string; size?: number; isDark: boolean }) {
    const r = (size - 6) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={3}
                stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
            <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={3}
                stroke={color} strokeLinecap="round"
                strokeDasharray={`${dash} ${circ - dash}`}
                style={{ transition: 'stroke-dasharray 0.5s ease' }} />
        </svg>
    );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, isDark, onClick, onArchive, onDelete, onDuplicate, taskProgress, isSelected, onToggle, onStatusChange, currentUser }: {
    project: Project; isDark: boolean; onClick: () => void;
    onArchive: () => void; onDelete: () => void; onDuplicate: () => void;
    taskProgress: { total: number; done: number; pct: number };
    isSelected: boolean; onToggle: () => void; onStatusChange: (status: ProjectStatus) => void;
    currentUser?: any;
}) {
    const dl = deadlineMeta(project.deadline);
    const cfg = STATUS_CFG[project.status];

    const displayMembers = useMemo(() => {
        const m = [...project.members];
        if (currentUser && !m.some(u => u.id === currentUser.id)) {
            m.unshift({ id: currentUser.id, name: currentUser.full_name || 'Owner', avatar_url: currentUser.avatar_url } as ProjectMember);
        }
        return m;
    }, [project.members, currentUser]);

    const menuItems = [
        { label: 'Open', icon: <ExternalLink size={12} />, onClick: onClick },
        { label: 'Copy Name', icon: <Copy size={12} />, onClick: () => { navigator.clipboard.writeText(project.name); appToast.success('Name copied'); } },
        { label: 'Duplicate', icon: <Copy size={12} />, onClick: onDuplicate },
        { label: project.is_archived ? 'Unarchive' : 'Archive', icon: project.is_archived ? <ArchiveRestore size={12} /> : <Archive size={12} />, onClick: onArchive, separator: true },
        { label: 'Delete', icon: <Trash2 size={12} />, danger: true, onClick: onDelete, separator: true },
    ];

    return (
        <ContextMenuRow items={menuItems} isDark={isDark} onRowClick={onClick}>
            <motion.div
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className={cn(
                    "relative rounded-[10px] border cursor-pointer transition-all duration-150 group flex flex-col select-none h-full",
                    isSelected
                        ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                        : isDark
                            ? "bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3d3d3d] hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
                            : "bg-white border-[#ebebeb] hover:border-[#d4d4d4] hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)]"
                )}
            >
            {/* Left accent vertical line */}
            <div className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-[9px]" style={{ background: project.color }} />

            {/* Card header */}
            <div className={cn(
                "flex items-start justify-between px-4 pt-3.5 pb-3 border-b",
                isDark ? "border-[#242424]" : "border-[#f0f0f0]"
            )}>
                <div className="flex flex-col min-w-0 flex-1">
                    <p className={cn("font-bold text-[13.5px] tracking-tight truncate leading-tight",
                        isDark ? "text-white" : "text-[#111]")}>
                        {project.name}
                    </p>
                    {/* Client name removed as per request for cleaner UI */}
                </div>
                {/* Checkbox */}
                <div onClick={e => { e.stopPropagation(); onToggle(); }} className={cn('cursor-pointer ml-2 shrink-0 transition-opacity mt-0.5', isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                    <div className={cn('w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all',
                        isSelected ? 'bg-primary border-primary' : isDark ? 'border-white/20' : 'border-[#ccc]')}>
                        {isSelected && <Check size={10} strokeWidth={3} className="text-black"/>}
                    </div>
                </div>
            </div>

            {/* Progress ring + meta */}
            <div className="px-4 py-3 flex items-center gap-3">
                <div className="relative shrink-0">
                    <CircleProgress pct={taskProgress.pct} color={project.color} size={44} isDark={isDark} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className={cn("text-[10px] font-bold tabular-nums",
                            isDark ? "text-[#aaa]" : "text-[#444]")}>
                            {taskProgress.pct}%
                        </span>
                    </div>
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                    <StatusCell status={project.status} onStatusChange={onStatusChange} isDark={isDark} />
                    <p className={cn("text-[10.5px]", isDark ? "text-[#555]" : "text-[#aaa]")}>
                        {taskProgress.done} / {taskProgress.total} tasks done
                    </p>
                </div>
            </div>

            {/* Footer: members + deadline */}
            <div className={cn(
                "flex items-center justify-between px-4 py-2.5 border-t mt-auto",
                isDark ? "border-[#202020]" : "border-[#f5f5f5]"
            )}>
                {displayMembers.length > 0 ? (
                    <div className="flex -space-x-1.5">
                        {displayMembers.slice(0, 4).map((m, i) => (
                            <Avatar key={i} name={m.name} src={m.avatar_url}
                                className={cn("w-5 h-5 rounded-full ring-1",
                                    isDark ? "ring-[#1a1a1a]" : "ring-white")}
                                isDark={isDark} />
                        ))}
                        {displayMembers.length > 4 && (
                            <div className={cn(
                                "w-5 h-5 rounded-full ring-1 flex items-center justify-center text-[8px] font-bold",
                                isDark ? "ring-[#1a1a1a] bg-[#2a2a2a] text-[#777]" : "ring-white bg-[#eee] text-[#aaa]"
                            )}>+{displayMembers.length - 4}</div>
                        )}
                    </div>
                ) : (
                    <div className={cn("flex items-center gap-1 text-[10.5px]",
                        isDark ? "text-[#3a3a3a]" : "text-[#ccc]")}>
                        <Users size={10} /> No members
                    </div>
                )}
                <span className={cn("text-[10.5px] font-medium flex items-center gap-1",
                    dl.urgent ? "text-red-400" : isDark ? "text-[#555]" : "text-[#aaa]")}>
                    {dl.urgent && <Calendar size={9} />}
                    {dl.text}
                </span>
            </div>

            </motion.div>
        </ContextMenuRow>
    );
}

// ─── Table Row ────────────────────────────────────────────────────────────────

function TableRow({ project, isDark, onClick, onArchive, onDelete, onDuplicate, taskProgress, isSelected, onToggle, onStatusChange, currentUser }: {
    project: Project; isDark: boolean; onClick: () => void;
    onArchive: () => void; onDelete: () => void; onDuplicate: () => void;
    taskProgress: { total: number; done: number; pct: number };
    isSelected: boolean; onToggle: () => void; onStatusChange: (status: ProjectStatus) => void;
    currentUser?: any;
}) {
    const dl  = deadlineMeta(project.deadline);
    const cfg = STATUS_CFG[project.status];

    const displayMembers = useMemo(() => {
        const m = [...project.members];
        if (currentUser && !m.some(u => u.id === currentUser.id)) {
            m.unshift({ id: currentUser.id, name: currentUser.full_name || 'Owner', avatar_url: currentUser.avatar_url } as ProjectMember);
        }
        return m;
    }, [project.members, currentUser]);

    const menuItems = [
        { label: 'Open', icon: <ExternalLink size={12} />, onClick: onClick },
        { label: 'Copy Name', icon: <Copy size={12} />, onClick: () => { navigator.clipboard.writeText(project.name); appToast.success('Name copied'); } },
        { label: 'Duplicate', icon: <Copy size={12} />, onClick: onDuplicate },
        { label: project.is_archived ? 'Unarchive' : 'Archive', icon: project.is_archived ? <ArchiveRestore size={12} /> : <Archive size={12} />, onClick: onArchive, separator: true },
        { label: 'Delete', icon: <Trash2 size={12} />, danger: true, onClick: onDelete, separator: true },
    ];

    return (
        <ContextMenuRow
            items={menuItems}
            isDark={isDark}
            onRowClick={onClick}
            className={cn(
                "grid border-b cursor-pointer group transition-colors select-none w-full",
                isSelected ? (isDark ? 'bg-primary/10' : 'bg-primary/5')
                : (isDark ? "border-[#1f1f1f] hover:bg-white/[0.02]" : "border-[#f3f3f3] hover:bg-[#fafafa]"),
            )}
            style={{ gridTemplateColumns: '44px 3px 1fr 150px 160px 80px 90px 120px 20px' }}
        >
            {/* Select */}
            <div className="flex flex-col justify-center items-center h-full" onClick={e => { e.stopPropagation(); onToggle(); }}>
                <div className={cn("w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-all",
                    isSelected ? "bg-primary border-primary" : isDark ? "border-white/10 opacity-0 group-hover:opacity-100" : "border-[#ccc] opacity-0 group-hover:opacity-100")}>
                    {isSelected && <Check size={9} strokeWidth={4} className="text-black" />}
                </div>
            </div>
            {/* Left color stripe */}
            <div className="w-full shrink-0 self-stretch rounded-full my-1.5 ml-1.5" style={{ background: project.color }} />
            {/* Name */}
            <div className="flex-1 min-w-0 py-1.5 pl-3 pr-4 self-center">
                <p className={cn("font-bold text-[12.5px] truncate", isDark ? "text-white" : "text-[#111]")}>{project.name}</p>
            </div>
            {/* Status */}
            <div className="shrink-0 py-1.5 pr-4 self-center">
                <StatusCell status={project.status} onStatusChange={onStatusChange} isDark={isDark} />
            </div>
            {/* Progress */}
            <div className="shrink-0 py-1.5 pr-4 self-center">
                <div className="flex items-center gap-2">
                    <div className={cn("flex-1 h-1 rounded-full overflow-hidden", isDark ? "bg-white/[0.07]" : "bg-black/[0.07]")}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${taskProgress.pct}%`, background: project.color }} />
                    </div>
                    <span className={cn("text-[10.5px] tabular-nums shrink-0 font-medium", isDark ? "text-[#555]" : "text-[#aaa]")}>{taskProgress.pct}%</span>
                </div>
            </div>
            {/* Tasks */}
            <div className={cn("shrink-0 py-1.5 text-[11.5px] tabular-nums self-center", isDark ? "text-[#555]" : "text-[#aaa]")}>
                <span className={isDark ? "text-[#ccc]" : "text-[#444]"}>{taskProgress.done}</span>
                <span className="opacity-40">/{taskProgress.total}</span>
            </div>
            {/* Members */}
            <div className="shrink-0 py-1.5 self-center">
                {displayMembers.length > 0 ? (
                    <div className="flex -space-x-1.5">
                        {displayMembers.slice(0, 3).map((m, i) => (
                            <Avatar key={i} name={m.name} src={m.avatar_url}
                                className={cn("w-5 h-5 rounded-full ring-1",
                                    isDark ? "ring-[#1a1a1a]" : "ring-white")}
                                isDark={isDark} />
                        ))}
                        {displayMembers.length > 3 && (
                            <div className={cn(
                                "w-5 h-5 rounded-full ring-1 flex items-center justify-center text-[8px] font-bold",
                                isDark ? "ring-[#1a1a1a] bg-[#252525] text-[#666]" : "ring-white bg-[#eee] text-[#aaa]"
                            )}>+{displayMembers.length - 3}</div>
                        )}
                    </div>
                ) : (
                    <span className={isDark ? "text-[#333]" : "text-[#ddd]"}>—</span>
                )}
            </div>
            {/* Deadline */}
            <div className={cn("shrink-0 py-1.5 text-[11.5px] self-center",
                dl.urgent ? "text-red-400 font-semibold" : isDark ? "text-[#666]" : "text-[#999]")}>
                {dl.urgent && <Calendar size={9} className="inline mr-1 mb-0.5" />}
                {dl.text}
            </div>
            {/* Empty space for alignment */}
            <div className="shrink-0 py-1.5" />
        </ContextMenuRow>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isDark, onNew, isArchived }: { isDark: boolean; onNew: () => void; isArchived: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-4 px-6 py-20 text-center">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center",
                isDark ? "bg-white/[0.04] border border-[#2a2a2a]" : "bg-[#f5f5f5] border border-[#ebebeb]")}>
                <Briefcase size={26} className={isDark ? "text-[#333]" : "text-[#ccc]"} />
            </div>
            <div>
                <p className={cn("text-[14px] font-semibold", isDark ? "text-[#505050]" : "text-[#888]")}>
                    {isArchived ? 'No archived projects' : 'No projects yet'}
                </p>
                <p className={cn("text-[11.5px] mt-1", isDark ? "text-[#333]" : "text-[#ccc]")}>
                    {isArchived ? 'Archived items will appear here' : 'Create your first project to get started'}
                </p>
            </div>
                <button onClick={onNew}
                    className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-primary hover:bg-primary-hover text-primary-foreground text-[12px] font-semibold transition-colors">
                    <Plus size={13} strokeWidth={2.5} /> New Project
                </button>
        </div>
    );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel, isDark }: { name: string; onConfirm: () => void; onCancel: () => void; isDark: boolean }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className={cn("rounded-2xl border shadow-2xl p-6 w-full max-w-[380px]", isDark ? "bg-[#161616] border-[#2a2a2a]" : "bg-white border-[#e5e5e5]")}>
                <h3 className={cn("text-[15px] font-bold mb-2", isDark ? "text-white" : "text-[#111]")}>Delete project?</h3>
                <p className={cn("text-[13px] mb-5", isDark ? "text-[#666]" : "text-[#888]")}>
                    <strong className={isDark ? "text-[#ccc]" : "text-[#333]"}>"{name}"</strong> will be permanently deleted.
                </p>
                <div className="flex gap-2 justify-end">
                    <button onClick={onCancel} className={cn("px-4 py-2 rounded-[8px] text-[12px] font-medium transition-colors", isDark ? "text-[#666] hover:bg-white/5" : "text-[#888] hover:bg-[#f5f5f5]")}>Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-[8px] bg-red-500 hover:bg-red-600 text-white text-[12px] font-bold transition-all active:scale-95">Delete</button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
    const router  = useRouter();
    const { theme, setCreateModalOpen } = useUIStore();
    const isDark  = theme === 'dark';
    const { projects, fetchProjects, updateProject, deleteProject, bulkDuplicateProjects, isLoading, tasksByProject } = useProjectStore();
    const { profile: currentUser } = useSettingsStore();
    const allTasks = useMemo(() => Object.values(tasksByProject).flat(), [tasksByProject]);

    const [view, setView]             = useState<'cards' | 'table'>('cards');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'All'>('All');
    const [showArchived, setShowArchived] = useState(false);
    const [archivedIds, setArchivedIds]   = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
// Removed showCreate state
    const [deletingId, setDeletingId]     = useState<string | null>(null);
    const [orderBy, setOrderBy]           = useState<'created_at' | 'name' | 'deadline'>('created_at');

    const [viewOpen, setViewOpen]         = useState(false);
    const [filterOpen, setFilterOpen]     = useState(false);
    const [orderOpen, setOrderOpen]       = useState(false);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('templateId') || params.get('new')) {
                setCreateModalOpen(true, 'Project');
                // Optional: remove params from URL without reloading
                // window.history.replaceState({}, '', '/projects');
            }
        }
    }, [setCreateModalOpen]);

    /* ── Derived ── */
    const filtered = useMemo(() => {
        let r = projects.filter(p => {
            const isArch = archivedIds.has(p.id) || p.is_archived;
            if (showArchived) return isArch;
            if (isArch) return false;
            if (statusFilter !== 'All' && p.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!p.name?.toLowerCase().includes(q) && !p.client_name?.toLowerCase().includes(q)) return false;
            }
            return true;
        });
        if (orderBy === 'name')     r = [...r].sort((a, b) => a.name.localeCompare(b.name));
        if (orderBy === 'deadline') r = [...r].sort((a, b) => (a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1);
        return r;
    }, [projects, statusFilter, searchQuery, archivedIds, showArchived, orderBy]);

    const stats = useMemo(() => {
        const s: Record<string, number> = { All: 0 };
        STATUS_ORDER.forEach(st => s[st] = 0);
        projects.filter(p => !p.is_archived && !archivedIds.has(p.id)).forEach(p => {
            s.All++;
            if (s[p.status] !== undefined) s[p.status]++;
        });
        return s;
    }, [projects, archivedIds]);

    const progressMap = useMemo(() => {
        const m: Record<string, { total: number; done: number; pct: number }> = {};
        projects.forEach(p => {
            const pt = allTasks.filter(t => t.project_id === p.id && !t.is_archived);
            const done = pt.filter(t => t.status === 'done').length;
            m[p.id] = { total: pt.length, done, pct: pt.length ? Math.round(done / pt.length * 100) : 0 };
        });
        return m;
    }, [projects, allTasks]);

    const handleArchive = (id: string) => {
        const next = new Set(archivedIds);
        const wasArch = next.has(id) || projects.find(p => p.id === id)?.is_archived;
        wasArch ? next.delete(id) : next.add(id);
        setArchivedIds(next);
        updateProject(id, { is_archived: !wasArch });
        appToast.success(wasArch ? 'Restored' : 'Archived', wasArch ? 'Project restored from archive' : 'Project moved to archive');
    };

    const handleDuplicate = async (id: string) => {
        const promise = bulkDuplicateProjects([id]);
        appToast.promise(promise, {
            loading: 'Duplicating project…',
            success: 'Project duplicated',
            error: 'Duplication failed',
        });
    };

    const toggleRow = (id: string) => {
        const n = new Set(selectedIds);
        n.has(id) ? n.delete(id) : n.add(id);
        setSelectedIds(n);
    };
    const toggleAll = () => {
        setSelectedIds(selectedIds.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(p => p.id)));
    };
    const isAllSelected = filtered.length > 0 && selectedIds.size === filtered.length;

    const totalSelected = selectedIds.size;

    return (
        <div className={cn("flex flex-col h-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-[#f7f7f7] text-[#111]")}>

            {/* ── Page header — hidden on mobile (MobileTopBar handles title) ── */}
            <div className={cn("hidden md:flex items-center justify-between px-5 py-3 shrink-0", isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-white")}>
                <h1 className="text-[15px] font-semibold tracking-tight">Projects</h1>
            </div>

            {/* ── Toolbar ── */}
            <div className={cn("flex items-center gap-1 px-4 py-2 border-b shrink-0 flex-wrap", isDark ? "border-[#252525]" : "border-[#ebebeb]")}>
                {/* View Settings on Left */}
                <div className="flex items-center gap-1.5">
                    {/* Filter */}
                    <div className="relative">
                        <TbBtn label="Filter" icon={<Filter size={11} />} active={statusFilter !== 'All'} isDark={isDark} onClick={() => setFilterOpen(v => !v)} />
                        <Dropdown open={filterOpen} onClose={() => setFilterOpen(false)} isDark={isDark} align="left">
                            <div className="py-1">
                                {(['All', ...STATUS_ORDER] as const).map(s => (
                                    <DItem key={s} label={s} active={statusFilter === s} onClick={() => { setStatusFilter(s); setFilterOpen(false); }} isDark={isDark} />
                                ))}
                            </div>
                        </Dropdown>
                    </div>

                    {/* Order */}
                    <div className="relative">
                        <TbBtn label="Order" icon={<ArrowUpDown size={11} />} hasArrow isDark={isDark} onClick={() => setOrderOpen(v => !v)} />
                        <Dropdown open={orderOpen} onClose={() => setOrderOpen(false)} isDark={isDark} align="left">
                            <div className="py-1">
                                <DItem label="Date created" active={orderBy === 'created_at'} onClick={() => { setOrderBy('created_at'); setOrderOpen(false); }} isDark={isDark} />
                                <DItem label="Name (A–Z)"   active={orderBy === 'name'}       onClick={() => { setOrderBy('name');       setOrderOpen(false); }} isDark={isDark} />
                                <DItem label="Deadline"     active={orderBy === 'deadline'}   onClick={() => { setOrderBy('deadline');   setOrderOpen(false); }} isDark={isDark} />
                            </div>
                        </Dropdown>
                    </div>

                    <div className={cn('w-[1px] h-4 mx-0.5', isDark ? 'bg-[#2e2e2e]' : 'bg-[#e0e0e0]')}/>

                    <TbBtn
                        label={showArchived ? 'Active Projects' : 'Archived'}
                        icon={showArchived ? <ArchiveRestore size={11} /> : <Archive size={11} />}
                        active={showArchived} isDark={isDark}
                        onClick={() => setShowArchived(v => !v)}
                    />
                </div>

                <div className="flex-1" />

                {/* Search & View Actions on Right */}
                <div className="flex items-center gap-3">
                    <SearchInput 
                        value={searchQuery} 
                        onChange={setSearchQuery} 
                        placeholder="Search projects…" 
                        isDark={isDark} 
                    />
                    
                    <div className={cn('w-[1px] h-4', isDark ? 'bg-[#2e2e2e]' : 'bg-[#e0e0e0]')}/>

                    <ViewToggle 
                        view={view} 
                        onViewChange={setView} 
                        isDark={isDark} 
                        options={[
                            { id: 'cards', icon: <LayoutGrid size={12}/> },
                            { id: 'table', icon: <List size={12}/> }
                        ]}
                    />

                    {/* Top-Right Bulk Edit Pill */}
                    <AnimatePresence mode="popLayout">
                        {totalSelected > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, x: 10 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95, x: 10 }}
                                transition={{ duration: 0.15 }}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded-xl border",
                                    isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-[#f8f8f8] border-[#e8e8e8]"
                                )}
                            >
                                <span className={cn("text-[11px] font-semibold mr-1 pl-1", isDark ? "text-[#aaa]" : "text-[#666]")}>
                                    {totalSelected} selected
                                </span>
                                <div className={cn("w-[1px] h-3", isDark ? "bg-[#333]" : "bg-[#ddd]")} />
                                
                                <Tooltip content="Duplicate" side="bottom">
                                    <button
                                        onClick={async () => {
                                            const ids = Array.from(selectedIds);
                                            await bulkDuplicateProjects(ids);
                                            appToast.success('Duplicated', `${totalSelected} project${totalSelected > 1 ? 's' : ''} duplicated successfully`);
                                            setSelectedIds(new Set());
                                        }}
                                        className={cn("flex items-center justify-center px-1.5 py-0.5 text-[10px] rounded transition-colors", isDark ? "text-[#777] hover:text-white hover:bg-white/5" : "text-[#888] hover:text-[#333] hover:bg-[#ececec]")}
                                    >
                                        <Copy size={11} strokeWidth={2.5} />
                                    </button>
                                </Tooltip>
                                
                                <Tooltip content="Delete" side="bottom">
                                    <button
                                        onClick={() => setDeletingId('bulk')}
                                        className={cn("flex items-center justify-center px-1.5 py-0.5 text-[10px] rounded transition-colors", isDark ? "text-red-400 hover:text-red-400 hover:bg-red-500/10" : "text-red-400 hover:bg-red-50 focus:text-red-500")}
                                    >
                                        <Trash2 size={11} strokeWidth={2.5} />
                                    </button>
                                </Tooltip>
                                
                                <div className={cn("w-[1px] h-3", isDark ? "bg-[#333]" : "bg-[#ddd]")} />
                                
                                <Tooltip content="Clear selection" side="bottom">
                                    <button
                                        onClick={() => setSelectedIds(new Set())}
                                        className={cn("flex items-center justify-center px-1.5 py-0.5 text-[10px] rounded transition-colors", isDark ? "text-[#555] hover:text-white hover:bg-white/5" : "text-[#bbb] hover:text-[#333] hover:bg-[#ececec]")}
                                    >
                                        <X size={11} strokeWidth={3} />
                                    </button>
                                </Tooltip>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Status pills (matches proposals) ── */}
            {!showArchived && (
                <div className={cn("flex items-center gap-1 px-4 py-2 border-b shrink-0 overflow-x-auto no-scrollbar", isDark ? "border-[#1a1a1a]" : "border-[#f5f5f5]")}>
                    {(['All', ...STATUS_ORDER] as const).map(s => {
                        const cfg = s !== 'All' ? STATUS_CFG[s as ProjectStatus] : null;
                        const isActive = statusFilter === s;
                        return (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] text-[10px] font-medium border transition-all shrink-0",
                                    isActive
                                        ? isDark ? "bg-white/10 border-white/15 text-white" : "bg-[#ebebf5] border-[#d8d8f0] text-[#111]"
                                        : isDark ? "border-transparent text-[#555] hover:text-[#aaa]" : "border-transparent text-[#aaa] hover:text-[#555]"
                                )}
                            >
                                {cfg && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />}
                                {s}
                                <span className={cn("text-[10px] tabular-nums font-semibold", isActive ? "opacity-70" : "opacity-50")}>
                                    {stats[s] ?? 0}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <AppLoader size="sm" />
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState isDark={isDark} onNew={() => setCreateModalOpen(true, 'Project')} isArchived={showArchived} />
                ) : view === 'cards' ? (
                    /* ── Cards ── */
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                        <AnimatePresence>
                            {filtered.map(p => (
                                    <ProjectCard
                                        key={p.id}
                                        project={p}
                                        isDark={isDark}
                                        onClick={() => router.push(`/projects/${p.id}`)}
                                        onArchive={() => handleArchive(p.id)}
                                        onDelete={() => setDeletingId(p.id)}
                                        onDuplicate={() => handleDuplicate(p.id)}
                                        taskProgress={progressMap[p.id] ?? { total: 0, done: 0, pct: 0 }}
                                        isSelected={selectedIds.has(p.id)}
                                        onToggle={() => toggleRow(p.id)}
                                        onStatusChange={(status) => updateProject(p.id, { status })}
                                        currentUser={currentUser}
                                    />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    /* ── Table ── */
                    <div className="flex flex-col">
                        {/* Header */}
                        <div className={cn("grid px-0 py-2.5 border-b text-[10px] font-bold uppercase tracking-wider sticky top-0 z-30",
                        isDark ? "bg-[#141414] border-[#252525] text-[#555]" : "bg-[#fafafa] border-[#ebebeb] text-[#aaa]")}
                        style={{ gridTemplateColumns: '44px 3px 1fr 150px 160px 80px 90px 120px 20px' }}>
                            <div className="flex items-center justify-center py-2 cursor-pointer" onClick={toggleAll}>
                                <div className={cn("w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-all",
                                    isAllSelected ? "bg-primary border-primary" : isDark ? "border-[#333] bg-transparent" : "border-[#d0d0d0] bg-white")}>
                                    {isAllSelected && <Check size={9} strokeWidth={4} className="text-black" />}
                                </div>
                            </div>
                            <div />
                            <div className="px-4 py-2">Name</div>
                            <div className="px-4 py-2">Status</div>
                            <div className="px-4 py-2">Progress</div>
                            <div className="px-4 py-2">Tasks</div>
                            <div className="px-4 py-2">Members</div>
                            <div className="px-4 py-2">Deadline</div>
                            <div />
                        </div>
                        <AnimatePresence>
                            {filtered.map(p => (
                                <TableRow
                                    key={p.id}
                                    project={p}
                                    isDark={isDark}
                                    onClick={() => router.push(`/projects/${p.id}`)}
                                    onArchive={() => handleArchive(p.id)}
                                    onDelete={() => setDeletingId(p.id)}
                                    onDuplicate={() => handleDuplicate(p.id)}
                                    taskProgress={progressMap[p.id] ?? { total: 0, done: 0, pct: 0 }}
                                    isSelected={selectedIds.has(p.id)}
                                    onToggle={() => toggleRow(p.id)}
                                    onStatusChange={(status) => updateProject(p.id, { status })}
                                    currentUser={currentUser}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Creation Modals governed by layout */}

            {deletingId && (
                <DeleteModal
                    isDark={isDark}
                    name={deletingId === 'bulk' ? `${totalSelected} projects` : (projects.find(p => p.id === deletingId)?.name || 'project')}
                    onConfirm={async () => {
                        if (deletingId === 'bulk') {
                            for (const id of Array.from(selectedIds)) await deleteProject(id);
                            setSelectedIds(new Set());
                        } else {
                            await deleteProject(deletingId);
                        }
                        setDeletingId(null);
                        appToast.success('Deleted', 'Project permanently removed');
                    }}
                    onCancel={() => setDeletingId(null)}
                />
            )}
        </div>
    );
}
