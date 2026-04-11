"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Calendar, Flag, User, ChevronDown,
    MessageSquare, Paperclip, Activity, Trash2, Check,
    AlignLeft, Link2, Play, PanelRight, Maximize,
    MoreHorizontal, Repeat, HelpCircle, GripVertical,
    Eye, Tag, Plus, CheckCircle2, Clock, Zap,
    Hash, ArrowUpRight, Circle, Inbox, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore, ProjectTask, TaskStatus, TaskPriority } from '@/store/useProjectStore';
import { KANBAN_COLS } from './KanbanBoard';
import { gooeyToast } from 'goey-toast';
import { ContentBlock } from '../proposals/blocks/ContentBlock';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string; bg: string }[] = [
    { value: 'none',   label: 'None',   color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
    { value: 'low',    label: 'Low',    color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
    { value: 'medium', label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
    { value: 'high',   label: 'High',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
    { value: 'urgent', label: 'Urgent', color: '#ec4899', bg: 'rgba(236,72,153,0.1)'  },
];

const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    todo:   { label: 'To Do',   color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: <Circle size={12} />           },
    doing:  { label: 'Doing',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: <Play size={12} />              },
    review: { label: 'Review',  color: '#f97316', bg: 'rgba(249,115,22,0.1)', icon: <Eye size={12} />               },
    done:   { label: 'Done',    color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <CheckCircle2 size={12} />      },
};

// ─── Shared UI Primitives ──────────────────────────────────────────────────────

function FieldRow({ label, icon, children, isDark }: {
    label: string; icon: React.ReactNode; children: React.ReactNode; isDark: boolean;
}) {
    return (
        <div className="flex items-center min-h-[28px] group/field">
            <div className={cn(
                "flex items-center gap-2 w-[150px] shrink-0 text-[11.5px] font-medium",
                isDark ? "text-[#666]" : "text-[#888]"
            )}>
                <span className="opacity-60">{icon}</span>
                {label}
            </div>
            <div className="flex-1 flex items-center min-w-0 pl-1">
                {children}
            </div>
        </div>
    );
}

function FieldValue({ children, isDark, placeholder, onClick }: {
    children?: React.ReactNode; isDark: boolean; placeholder?: string; onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer",
                isDark ? "hover:bg-white/[0.06] text-[#ddd]" : "hover:bg-black/[0.04] text-[#333]",
                !children && (isDark ? "text-[#444]" : "text-[#ccc]")
            )}
        >
            {children || <span>{placeholder || 'Empty'}</span>}
        </div>
    );
}

function InlineSelect<T extends string>({ value, options, onChange, isDark, renderLabel }: {
    value: T;
    options: { value: T; label: string; color?: string; bg?: string }[];
    onChange: (v: T) => void;
    isDark: boolean;
    renderLabel?: (opt: { value: T; label: string; color?: string; bg?: string }) => React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const cur = options.find(o => o.value === value);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[12px] font-medium transition-all outline-none h-6",
                    isDark ? "hover:bg-white/[0.06] text-[#ddd]" : "hover:bg-black/[0.04] text-[#333]"
                )}
            >
                {cur ? (renderLabel ? renderLabel(cur) : <span>{cur.label}</span>) : <span className={isDark ? "text-[#444]" : "text-[#aaa]"}>Empty</span>}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                            "absolute top-full left-0 mt-1 z-[200] min-w-[160px] rounded-xl border shadow-2xl overflow-hidden",
                            isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                        )}
                    >
                        <div className="py-1.5 px-1">
                            {options.map(o => (
                                <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-1.5 text-[12px] transition-colors text-left rounded-lg",
                                        o.value === value
                                            ? isDark ? "bg-white/[0.08] text-white" : "bg-[#f5f5f5] text-[#111]"
                                            : isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#fafafa]"
                                    )}>
                                    {renderLabel ? renderLabel(o) : <span className="font-medium" style={o.color ? { color: o.color } : {}}>{o.label}</span>}
                                    {o.value === value && <Check size={11} className="text-primary ml-auto shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Task Detail Panel ─────────────────────────────────────────────────────────

interface Props {
    task: ProjectTask;
    projectId: string;
    projectName: string;
    isDark: boolean;
    onClose: () => void;
}

export default function TaskDetailPanel({ task, projectId, projectName, isDark, onClose }: Props) {
    const { updateTask, deleteTask, groupsByProject } = useProjectStore();
    const groups = groupsByProject[projectId] || [];
    const group  = groups.find(g => g.id === task.task_group_id);

    const [title, setTitle]       = useState(task.title);
    
    // Parse block data string if available, otherwise just use empty blocks.
    const [blockData, setBlockData] = useState<{blocks?: any[], content?: string}>(() => {
        try {
            if (task.description && typeof task.description === 'string' && task.description.startsWith('[')) {
                return { blocks: JSON.parse(task.description) };
            }
        } catch(e) {}
        return task.description ? { blocks: [{ type: 'paragraph', content: task.description }] } : { blocks: undefined };
    });

    const [status, setStatus]     = useState<TaskStatus>(task.status);
    const [groupId, setGroupId]   = useState<string | null>(task.task_group_id || null);
    const [priority, setPriority] = useState<TaskPriority>(task.priority);
    const [dueDate, setDueDate]   = useState(task.due_date || '');
    const [startDate, setStartDate] = useState(task.start_date || '');
    const [activeTab, setActiveTab] = useState<'comments' | 'checklists' | 'attachments' | 'activity' | 'links'>('comments');
    const [deleting, setDeleting] = useState(false);
    const [comment, setComment]   = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [viewMode, setViewMode] = useState<'right' | 'center'>('right');

    useEffect(() => {
        const saved = localStorage.getItem('task_panel_view_mode');
        if (saved === 'right' || saved === 'center') setViewMode(saved);
    }, []);

    const toggleViewMode = () => {
        const next = viewMode === 'center' ? 'right' : 'center';
        setViewMode(next);
        localStorage.setItem('task_panel_view_mode', next);
    };

    const save = (updates: Partial<ProjectTask>) => {
        updateTask(task.id, projectId, updates);
    };

    const handleTitleBlur = () => {
        if (title.trim() && title !== task.title) save({ title: title.trim() });
    };

    const groupOptions = [
        { value: 'ungrouped', label: 'Ungrouped', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
        ...groups.map(g => ({ value: g.id, label: g.name, color: g.color || '#6366f1', bg: `${g.color || '#6366f1'}18` }))
    ];

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    const handleDelete = async () => {
        setDeleting(true);
        await deleteTask(task.id, projectId);
        gooeyToast.success('Task deleted');
        onClose();
    };

    const priMeta = PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[0];
    const statMeta = STATUS_META[status];

    const TABS = [
        { id: 'comments' as const,    icon: <MessageSquare size={13} />,  label: 'Comments'    },
        { id: 'checklists' as const,  icon: <Check size={13} />,           label: 'Checklist'   },
        { id: 'attachments' as const, icon: <Paperclip size={13} />,       label: 'Files'       },
        { id: 'activity' as const,    icon: <Activity size={13} />,        label: 'Activity'    },
        { id: 'links' as const,       icon: <Link2 size={13} />,           label: 'Links'       },
    ] as const;

    const panelInitial = viewMode === 'center'
        ? { opacity: 0, scale: 0.97, y: 12 }
        : { opacity: 0, x: '100%' };

    const panelExit = viewMode === 'center'
        ? { opacity: 0, scale: 0.97, y: 12 }
        : { opacity: 0, x: '100%' };

    const panelVariants = {
        center: { opacity: 1, scale: 1, y: 0, x: 0 },
        right:  { opacity: 1, x: 0, scale: 1, y: 0 }
    };

    return (
        <div className={cn(
            "fixed inset-0 z-[100] flex p-0 sm:p-2.5 overflow-hidden pointer-events-none",
            viewMode === 'center' ? "items-center justify-center" : "items-stretch justify-end"
        )}>
            {/* Overlay */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={cn("fixed inset-0 pointer-events-auto", isDark ? "bg-black/40" : "bg-black/15")}
                onClick={onClose}
            />

            {/* Panel */}
            <motion.div
                initial={panelInitial}
                animate={viewMode}
                exit={panelExit}
                variants={panelVariants}
                transition={{ type: 'spring', damping: 32, stiffness: 380 }}
                className={cn(
                    "flex flex-col relative pointer-events-auto overflow-hidden shadow-2xl",
                    isDark
                        ? "bg-[#161616] border-[#252525]"
                        : "bg-white border-[#e0e0e0]",
                    viewMode === 'center'
                        ? "w-[92vw] max-w-[1320px] h-[88vh] rounded-2xl border"
                        : "w-[820px] max-w-[92vw] h-full rounded-2xl border shadow-none"
                )}
                onClick={e => e.stopPropagation()}
                style={{
                    boxShadow: isDark
                        ? '0 32px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)'
                        : '0 32px 64px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)'
                }}
            >
                {/* ── HEADER ── */}
                <div className={cn(
                    "flex items-center gap-3 px-6 h-[56px] shrink-0 border-b",
                    isDark ? "border-[#202020]" : "border-[#f0f0f0]"
                )}>
                    {/* Status toggle checkbox */}
                    <button
                        onClick={() => {
                            const newStatus = status === 'done' ? 'todo' : 'done';
                            setStatus(newStatus);
                            save({ status: newStatus });
                        }}
                        className={cn(
                            "w-[20px] h-[20px] rounded-[5px] border-2 flex items-center justify-center shrink-0 transition-all",
                            status === 'done'
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                                : isDark ? "border-[#3a3a3a] hover:border-[#588]" : "border-[#ccc] hover:border-[#999]"
                        )}
                    >
                        {status === 'done' && <Check size={11} strokeWidth={3} />}
                    </button>

                    {/* Title */}
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        className={cn(
                            "flex-1 text-[15px] font-bold bg-transparent outline-none truncate",
                            isDark ? "text-white placeholder:text-[#333]" : "text-[#111] placeholder:text-[#ccc]",
                            status === 'done' && (isDark ? "line-through text-[#555]" : "line-through text-[#aaa]")
                        )}
                        placeholder="Task title"
                    />

                    {/* Right controls */}
                    <div className="flex items-center gap-0.5 shrink-0">
                        {/* Task ID badge */}
                        <div className={cn(
                            "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg mr-2 text-[10.5px] font-bold tracking-wider uppercase",
                            isDark ? "bg-white/[0.05] text-[#555]" : "bg-[#f5f5f5] text-[#bbb]"
                        )}>
                            <Hash size={9} />
                            {task.id.slice(-5).toUpperCase()}
                        </div>

                        {/* Breadcrumb path */}
                        <div className={cn("hidden md:flex items-center gap-1 text-[11px] font-medium mr-3", isDark ? "text-[#444]" : "text-[#bbb]")}>
                            <span>{projectName}</span>
                            <span className="opacity-40">·</span>
                            <span>{group ? group.name : 'Ungrouped'}</span>
                        </div>

                        <div className={cn("w-px h-4 mx-1", isDark ? "bg-[#2a2a2a]" : "bg-[#e8e8e8]")} />

                        <button onClick={toggleViewMode} title={viewMode === 'center' ? 'Dock right' : 'Center focus'}
                            className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                                isDark ? "text-[#666] hover:text-white hover:bg-white/8" : "text-[#aaa] hover:text-[#333] hover:bg-[#f5f5f5]")}>
                            {viewMode === 'center' ? <PanelRight size={14} /> : <Maximize size={14} />}
                        </button>

                        {/* Delete with confirm */}
                        <AnimatePresence mode="wait">
                            {showDeleteConfirm ? (
                                <motion.button
                                    key="confirm"
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="overflow-hidden px-3 h-8 flex items-center gap-1.5 rounded-lg bg-red-500 text-white text-[11px] font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                                >
                                    {deleting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={12} />}
                                    {deleting ? 'Deleting…' : 'Confirm delete'}
                                </motion.button>
                            ) : (
                                <motion.button
                                    key="delete"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                                        isDark ? "text-red-400/40 hover:text-red-400 hover:bg-red-500/10" : "text-red-300 hover:text-red-500 hover:bg-red-50")}
                                >
                                    <Trash2 size={13} />
                                </motion.button>
                            )}
                        </AnimatePresence>

                        <button onClick={onClose}
                            className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                                isDark ? "text-[#666] hover:text-white hover:bg-white/8" : "text-[#aaa] hover:text-[#333] hover:bg-[#f5f5f5]")}>
                            <X size={15} />
                        </button>
                    </div>
                </div>

                {/* ── BODY ── */}
                <div className="flex flex-1 overflow-hidden min-h-0">

                    {/* ── LEFT COLUMN: Properties ── */}
                    <div className={cn(
                        "flex-1 overflow-y-auto min-w-[280px] custom-scrollbar",
                        isDark ? "bg-[#161616]" : "bg-white"
                    )}>
                        <div className="px-6 py-5 space-y-6">

                            {/* Description */}
                            <div>
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", isDark ? "text-[#444]" : "text-[#bbb]")}>
                                    Description
                                </p>
                                <div className={cn(
                                    "w-full rounded-xl p-3 outline-none transition-all border",
                                    isDark
                                        ? "bg-white/[0.03] border-[#252525] focus-within:border-[#363636] focus-within:bg-white/[0.05]"
                                        : "bg-[#fafafa] border-[#f0f0f0] focus-within:border-[#ddd] focus-within:bg-white"
                                )}>
                                    <ContentBlock 
                                        id={task.id} 
                                        data={blockData} 
                                        updateData={(__: string, patch: any) => {
                                            setBlockData(patch);
                                            save({ description: JSON.stringify(patch.blocks) });
                                        }} 
                                        backgroundColor={isDark ? "var(--bg-dark, #161616)" : "var(--bg-light, #fafafa)"}
                                    />
                                </div>
                            </div>

                            {/* Divider */}
                            <div className={cn("h-px", isDark ? "bg-[#1e1e1e]" : "bg-[#f0f0f0]")} />

                            {/* Properties */}
                            <div>
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-3", isDark ? "text-[#444]" : "text-[#bbb]")}>
                                    Properties
                                </p>
                                <div className="space-y-0.5">

                                    {/* Status */}
                                    <FieldRow label="Status" icon={<Zap size={13} />} isDark={isDark}>
                                        <InlineSelect
                                            value={status}
                                            options={Object.entries(STATUS_META).map(([v, m]) => ({ value: v as TaskStatus, label: m.label, color: m.color, bg: m.bg }))}
                                            onChange={v => { setStatus(v); save({ status: v }); }}
                                            isDark={isDark}
                                            renderLabel={opt => (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: opt?.color }} />
                                                    <span style={opt?.color ? { color: opt.color } : {}} className="font-semibold text-[11.5px]">{opt?.label}</span>
                                                </div>
                                            )}
                                        />
                                    </FieldRow>

                                    {/* Priority */}
                                    <FieldRow label="Priority" icon={<Flag size={13} />} isDark={isDark}>
                                        <InlineSelect
                                            value={priority}
                                            options={PRIORITY_OPTIONS}
                                            onChange={v => { setPriority(v); save({ priority: v }); }}
                                            isDark={isDark}
                                            renderLabel={opt => (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: opt?.color }} />
                                                    <span style={opt?.color ? { color: opt.color } : {}} className="font-semibold text-[11.5px]">{opt?.label}</span>
                                                </div>
                                            )}
                                        />
                                    </FieldRow>

                                    {/* Group */}
                                    <FieldRow label="Group" icon={<AlignLeft size={13} />} isDark={isDark}>
                                        <InlineSelect
                                            value={groupId || 'ungrouped'}
                                            options={groupOptions}
                                            onChange={v => {
                                                const newGroup = v === 'ungrouped' ? null : v;
                                                setGroupId(newGroup);
                                                save({ task_group_id: newGroup });
                                            }}
                                            isDark={isDark}
                                            renderLabel={opt => (
                                                <div className="flex items-center gap-1.5 text-[11.5px]">
                                                    {opt?.color && opt.value !== 'ungrouped' && <div className="w-2 h-2 rounded-[3px] shrink-0" style={{ backgroundColor: opt.color }} />}
                                                    <span className={cn("font-medium", isDark ? "text-[#ddd]" : "text-[#333]")}>{opt?.label}</span>
                                                </div>
                                            )}
                                        />
                                    </FieldRow>

                                    {/* Start date */}
                                    <FieldRow label="Start date" icon={<Calendar size={13} />} isDark={isDark}>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={e => { setStartDate(e.target.value); save({ start_date: e.target.value || null }); }}
                                            className={cn(
                                                "px-2.5 py-1 text-[12px] outline-none cursor-pointer rounded-lg transition-colors font-medium",
                                                isDark ? "bg-transparent text-[#ccc] hover:bg-white/[0.06]" : "bg-transparent text-[#333] hover:bg-black/[0.04]"
                                            )}
                                            style={{ colorScheme: isDark ? 'dark' : 'light' }}
                                        />
                                    </FieldRow>

                                    {/* Due date */}
                                    <FieldRow label="Due date" icon={<Calendar size={13} />} isDark={isDark}>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={e => { setDueDate(e.target.value); save({ due_date: e.target.value || null }); }}
                                            className={cn(
                                                "px-2.5 py-1 text-[12px] outline-none cursor-pointer rounded-lg transition-colors font-medium",
                                                isDark ? "bg-transparent text-[#ccc] hover:bg-white/[0.06]" : "bg-transparent text-[#333] hover:bg-black/[0.04]"
                                            )}
                                            style={{ colorScheme: isDark ? 'dark' : 'light' }}
                                        />
                                    </FieldRow>

                                    {/* Assignee */}
                                    <FieldRow label="Assignee" icon={<User size={13} />} isDark={isDark}>
                                        <FieldValue isDark={isDark} placeholder="Unassigned" />
                                    </FieldRow>

                                    {/* Repeats */}
                                    <FieldRow label="Repeats" icon={<Repeat size={13} />} isDark={isDark}>
                                        <FieldValue isDark={isDark}>
                                            <span className={cn("text-[12px]", isDark ? "text-[#555]" : "text-[#999]")}>Never</span>
                                        </FieldValue>
                                    </FieldRow>

                                    {/* Tag */}
                                    <FieldRow label="Tag" icon={<Tag size={13} />} isDark={isDark}>
                                        <FieldValue isDark={isDark} placeholder="Add tag…" />
                                    </FieldRow>

                                </div>
                            </div>

                            {/* Divider */}
                            <div className={cn("h-px", isDark ? "bg-[#1e1e1e]" : "bg-[#f0f0f0]")} />

                            {/* Followers */}
                            <div>
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-3", isDark ? "text-[#444]" : "text-[#bbb]")}>
                                    People
                                </p>
                                <div className="space-y-0.5">
                                    <FieldRow label="Followers" icon={<Eye size={13} />} isDark={isDark}>
                                        <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg", isDark ? "bg-white/[0.05]" : "bg-[#f5f5f5]")}>
                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[8px] font-bold text-white border border-black/10">MH</div>
                                            <span className={cn("text-[11px] font-semibold tracking-wide uppercase", isDark ? "text-[#ccc]" : "text-[#444]")}>Mohi Hassan</span>
                                        </div>
                                    </FieldRow>
                                    <FieldRow label="Creator" icon={<User size={13} />} isDark={isDark}>
                                        <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg", isDark ? "bg-white/[0.05]" : "bg-[#f5f5f5]")}>
                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[8px] font-bold text-white border border-black/10">MH</div>
                                            <span className={cn("text-[11px] font-semibold tracking-wide uppercase", isDark ? "text-[#ccc]" : "text-[#444]")}>Mohi Hassan</span>
                                        </div>
                                    </FieldRow>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className={cn("h-px", isDark ? "bg-[#1e1e1e]" : "bg-[#f0f0f0]")} />

                        </div>
                    </div>

                    {/* ── RIGHT COLUMN: Interaction pane ── */}
                    <div className={cn(
                        "w-[360px] shrink-0 border-l flex flex-col overflow-hidden",
                        isDark ? "border-[#1e1e1e] bg-[#111]" : "border-[#f0f0f0] bg-[#f8f8f8]"
                    )}>

                        {/* Tab bar */}
                        <div className={cn(
                            "flex items-center border-b shrink-0 px-3 pt-3",
                            isDark ? "border-[#1e1e1e]" : "border-[#eeeeee]"
                        )}>
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    title={tab.label}
                                    className={cn(
                                        "flex-1 flex flex-col items-center gap-1 py-2 pb-2.5 text-[10px] font-bold border-b-2 transition-all",
                                        activeTab === tab.id
                                            ? "border-primary text-primary"
                                            : `border-transparent ${isDark ? "text-[#444] hover:text-[#777]" : "text-[#ccc] hover:text-[#888]"}`
                                    )}
                                >
                                    {tab.icon}
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">

                            {activeTab === 'comments' && (
                                <>
                                    {/* Comment input */}
                                    <div className={cn(
                                        "rounded-xl border overflow-hidden transition-all",
                                        isDark ? "bg-[#161616] border-[#252525]" : "bg-white border-[#e8e8e8] shadow-sm"
                                    )}>
                                        <textarea
                                            value={comment}
                                            onChange={e => setComment(e.target.value)}
                                            placeholder="Write a comment… (Shift+Enter for new line)"
                                            rows={comment.trim() ? 3 : 2}
                                            className={cn(
                                                "w-full px-4 py-3 text-[12.5px] bg-transparent outline-none resize-none",
                                                isDark ? "text-white placeholder:text-[#3a3a3a]" : "text-[#333] placeholder:text-[#bbb]"
                                            )}
                                        />
                                        {comment.trim() && (
                                            <div className={cn("flex items-center justify-between px-3 py-2 border-t", isDark ? "border-[#222]" : "border-[#f0f0f0]")}>
                                                <div className="flex items-center gap-1">
                                                    <button className={cn("w-7 h-7 flex items-center justify-center rounded-lg transition-colors", isDark ? "text-[#555] hover:bg-white/8" : "text-[#aaa] hover:bg-[#f0f0f0]")}>
                                                        <Paperclip size={13} />
                                                    </button>
                                                    <button className={cn("w-7 h-7 flex items-center justify-center rounded-lg transition-colors", isDark ? "text-[#555] hover:bg-white/8" : "text-[#aaa] hover:bg-[#f0f0f0]")}>
                                                        <AlignLeft size={13} />
                                                    </button>
                                                </div>
                                                <button
                                                    disabled={!comment.trim()}
                                                    onClick={() => { gooeyToast('Comments coming soon'); setComment(''); }}
                                                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold disabled:opacity-40 transition-all hover:bg-primary/90 active:scale-95"
                                                >
                                                    Post
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Empty state */}
                                    <div className="flex-1 flex flex-col items-center justify-center py-10 gap-3">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isDark ? "bg-white/5" : "bg-[#f0f0f0]")}>
                                            <MessageSquare size={18} className={isDark ? "text-[#333]" : "text-[#ccc]"} />
                                        </div>
                                        <p className={cn("text-[12px] font-medium", isDark ? "text-[#444]" : "text-[#bbb]")}>No comments yet</p>
                                        <p className={cn("text-[11px]", isDark ? "text-[#333]" : "text-[#ccc]")}>Be the first to comment on this task</p>
                                    </div>
                                </>
                            )}

                            {activeTab === 'checklists' && (
                                <div className="flex flex-col gap-3">
                                    <button className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-semibold transition-all",
                                        isDark ? "border-[#252525] text-[#555] hover:text-white hover:bg-white/5" : "border-[#e5e5e5] text-[#aaa] hover:text-[#333] hover:bg-[#f5f5f5]"
                                    )}>
                                        <Plus size={13} /> Add checklist
                                    </button>
                                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isDark ? "bg-white/5" : "bg-[#f0f0f0]")}>
                                            <Check size={18} className={isDark ? "text-[#333]" : "text-[#ccc]"} />
                                        </div>
                                        <p className={cn("text-[12px] font-medium", isDark ? "text-[#444]" : "text-[#bbb]")}>No checklists</p>
                                        <p className={cn("text-[11px]", isDark ? "text-[#333]" : "text-[#ccc]")}>Break this task into steps</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'attachments' && (
                                <div className="flex flex-col gap-3">
                                    <button className={cn(
                                        "flex items-center justify-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed text-[12px] font-semibold transition-all",
                                        isDark ? "border-[#252525] text-[#444] hover:text-white hover:border-[#383838] hover:bg-white/[0.03]" : "border-[#e5e5e5] text-[#bbb] hover:text-[#333] hover:border-[#bbb]"
                                    )}>
                                        <Paperclip size={16} />
                                        <span>Drop files here or click to upload</span>
                                    </button>
                                </div>
                            )}

                            {activeTab === 'activity' && (
                                <div className="space-y-4 py-1">
                                    {/* Activity item */}
                                    <div className="flex gap-3">
                                        <div className="relative shrink-0">
                                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                                                <Plus size={11} className="text-primary" />
                                            </div>
                                            <div className={cn("absolute left-1/2 top-full w-px h-4 -translate-x-1/2", isDark ? "bg-[#252525]" : "bg-[#e8e8e8]")} />
                                        </div>
                                        <div className={cn("flex flex-col gap-0.5 pt-1", isDark ? "text-[#666]" : "text-[#888]")}>
                                            <span className={cn("text-[12px] font-semibold", isDark ? "text-[#ddd]" : "text-[#222]")}>Task created</span>
                                            <span className={cn("text-[10px]", isDark ? "text-[#444]" : "text-[#bbb]")}>
                                                by <strong className={isDark ? "text-[#888]" : "text-[#555]"}>Mohi Hassan</strong> ·{' '}
                                                {new Date(task.created_at).toLocaleDateString('en-GB')} at {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'links' && (
                                <div className="flex flex-col gap-3">
                                    <button className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-semibold transition-all",
                                        isDark ? "border-[#252525] text-[#555] hover:text-white hover:bg-white/5" : "border-[#e5e5e5] text-[#aaa] hover:text-[#333] hover:bg-[#f5f5f5]"
                                    )}>
                                        <Link2 size={13} /> Add link
                                    </button>
                                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isDark ? "bg-white/5" : "bg-[#f0f0f0]")}>
                                            <Link2 size={18} className={isDark ? "text-[#333]" : "text-[#ccc]"} />
                                        </div>
                                        <p className={cn("text-[12px] font-medium", isDark ? "text-[#444]" : "text-[#bbb]")}>No links added</p>
                                        <p className={cn("text-[11px]", isDark ? "text-[#333]" : "text-[#ccc]")}>Attach relevant URLs to this task</p>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer: metadata bar */}
                        <div className={cn(
                            "px-4 py-2.5 border-t shrink-0 flex items-center gap-3",
                            isDark ? "border-[#1e1e1e]" : "border-[#eeeeee]"
                        )}>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statMeta.color }} />
                                <span className="text-[10px] font-semibold" style={{ color: statMeta.color }}>{statMeta.label}</span>
                            </div>
                            <div className={cn("h-3 w-px", isDark ? "bg-[#252525]" : "bg-[#e5e5e5]")} />
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: priMeta.color }} />
                                <span className="text-[10px] font-semibold" style={{ color: priMeta.color }}>{priMeta.label}</span>
                            </div>
                            {dueDate && (
                                <>
                                    <div className={cn("h-3 w-px", isDark ? "bg-[#252525]" : "bg-[#e5e5e5]")} />
                                    <span className={cn("text-[10px] font-medium flex items-center gap-1", isDark ? "text-[#555]" : "text-[#aaa]")}>
                                        <Calendar size={9} />
                                        {new Date(dueDate).toLocaleDateString('en-GB')}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
