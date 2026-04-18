"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { useProjectStore, ProjectTask, TaskStatus, TaskPriority, ProjectTaskGroup } from '@/store/useProjectStore';
import { KANBAN_COLS } from './KanbanBoard';
import { appToast } from '@/lib/toast';
import { ContentBlock } from '../proposals/blocks/ContentBlock';
import DatePicker from '../ui/DatePicker';
import { useSettingsStore } from '@/store/useSettingsStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const TAG_COLORS = [
    { name: 'Gray',   hex: '#6b7280' },
    { name: 'Red',    hex: '#ef4444' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Amber',  hex: '#f59e0b' },
    { name: 'Green',  hex: '#10b981' },
    { name: 'Blue',   hex: '#3b82f6' },
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Violet', hex: '#8b5cf6' },
    { name: 'Pink',   hex: '#ec4899' },
    { name: 'Rose',   hex: '#f43f5e' },
];

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
    const containerRef = React.useRef<HTMLDivElement>(null);
    const cur = options.find(o => o.value === value);

    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open]);

    return (
        <div className="relative" ref={containerRef}>
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
    readOnly?: boolean;
}

export default function TaskDetailPanel({ task, projectId, projectName, isDark, onClose, readOnly }: Props) {
    const { updateTask, deleteTask, groupsByProject, tasksByProject } = useProjectStore();
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
    const [activeTab, setActiveTab] = useState<'comments' | 'checklists' | 'attachments' | 'links'>('checklists');
    const [deleting, setDeleting] = useState(false);
    const [comment, setComment]   = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Branding for tags
    const branding = useSettingsStore(s => s.branding);
    const primaryColor = branding?.primary_color || '#3b82f6';

    // Tags
    const [tags, setTags] = useState<{ label: string, color: string }[]>(task.custom_fields?.tags || []);
    const [tagInput, setTagInput] = useState('');
    const [tagColor, setTagColor] = useState('#3b82f6');
    const [showTagPicker, setShowTagPicker] = useState(false);
    const [showCreateTag, setShowCreateTag] = useState(false);

    // Checklists
    const [checklists, setChecklists] = useState<{id: string, label: string, completed: boolean}[]>(task.custom_fields?.checklists || []);
    const [checklistInput, setChecklistInput] = useState('');

    // Comments
    const [comments, setComments] = useState<{id: string, user: string, text: string, date: string}[]>(task.custom_fields?.comments || []);

    // Attachments
    const [attachments, setAttachments] = useState<{id: string, name: string, url: string, size: number, type: string}[]>(task.custom_fields?.attachments || []);
    const [isUploading, setIsUploading] = useState(false);

    const [viewMode, setViewMode] = useState<'right' | 'center'>('right');

    // Get all unique tags in the project
    const allTasks = tasksByProject[task.project_id] || [];
    const projectTags = useMemo(() => {
        const map = new Map();
        allTasks.forEach(t => {
            t.custom_fields?.tags?.forEach((tag: { label: string, color: string }) => {
                if (!map.has(tag.label)) map.set(tag.label, tag);
            });
        });
        return Array.from(map.values()) as { label: string, color: string }[];
    }, [allTasks]);

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
        ...groups.map(g => ({ value: g.id, label: g.name, color: g.color || '#6366f1', bg: `${g.color || '#6366f1'}18` }))
    ];

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [onClose]);

    const handleDelete = async () => {
        setDeleting(true);
        await deleteTask(task.id, projectId);
        appToast.success('Task deleted');
        onClose();
    };

    const priMeta = PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[0];
    const statMeta = STATUS_META[status];

    const TABS = [
        { id: 'checklists' as const,  icon: <Check size={13} />,           label: 'Checklist'   },
        { id: 'comments' as const,    icon: <MessageSquare size={13} />,  label: 'Comments'    },
        { id: 'attachments' as const, icon: <Paperclip size={13} />,       label: 'Files'       },
        { id: 'links' as const,       icon: <Link2 size={13} />,           label: 'Links'       },
    ] as const;

    // Snappy ease curve: custom cubic-bezier for fast open, quick close
    const EASE_OUT: [number,number,number,number] = [0.22, 1, 0.36, 1];
    const EASE_IN:  [number,number,number,number] = [0.64, 0, 0.78, 0];

    const isRight = viewMode === 'right';

    return (
        <div className={cn(
            "fixed inset-0 z-[100] flex p-0 sm:p-2.5 overflow-hidden pointer-events-none",
            isRight ? "items-stretch justify-end" : "items-center justify-center"
        )}>
            {/* Overlay — 120ms fade */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: EASE_OUT }}
                className={cn("fixed inset-0 pointer-events-auto", isDark ? "bg-black/35" : "bg-black/12")}
                onClick={onClose}
            />

            {/* Panel */}
            <motion.div
                initial={isRight ? { opacity: 0, x: 40 } : { opacity: 0, y: 10, scale: 0.98 }}
                animate={isRight ? { opacity: 1, x: 0 } : { opacity: 1, y: 0, scale: 1 }}
                exit={isRight
                    ? { opacity: 0, x: 40, transition: { duration: 0.13, ease: EASE_IN } }
                    : { opacity: 0, y: 8,  scale: 0.98, transition: { duration: 0.11, ease: EASE_IN } }
                }
                transition={{ duration: isRight ? 0.18 : 0.15, ease: EASE_OUT }}
                className={cn(
                    "flex flex-col relative pointer-events-auto overflow-hidden shadow-2xl",
                    isDark
                        ? "bg-[#161616] border-[#252525]"
                        : "bg-white border-[#e0e0e0]",
                    isRight
                        ? "w-[820px] max-w-[92vw] h-full rounded-2xl border shadow-none"
                        : "w-[860px] max-w-[92vw] h-[78vh] rounded-2xl border"
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
                            if (readOnly) return;
                            const newStatus = status === 'done' ? 'todo' : 'done';
                            setStatus(newStatus);
                            save({ status: newStatus });
                        }}
                        className={cn(
                            "w-[22px] h-[22px] rounded-[6px] border-2 flex items-center justify-center shrink-0 transition-all duration-200",
                            readOnly && "cursor-default opacity-80",
                            status === 'done'
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                                : isDark ? "border-white/10 hover:border-white/30" : "border-black/10 hover:border-black/20"
                        )}
                    >
                        <AnimatePresence mode="wait">
                            {status === 'done' && (
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                >
                                    <Check size={12} strokeWidth={4} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </button>

                    {/* Title */}
                    <input
                        value={title}
                        readOnly={readOnly}
                        onChange={e => !readOnly && setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        className={cn(
                            "flex-1 text-[15px] font-bold bg-transparent outline-none truncate",
                            readOnly && "cursor-default",
                            isDark ? "text-white placeholder:text-[#333]" : "text-[#111] placeholder:text-[#ccc]",
                            status === 'done' && (isDark ? "line-through text-[#555]" : "line-through text-[#aaa]")
                        )}
                        placeholder="Task title"
                    />

                    {/* Right controls */}
                    <div className="flex items-center gap-0.5 shrink-0">
                        <div className={cn("w-px h-4 mx-1", isDark ? "bg-[#2a2a2a]" : "bg-[#e8e8e8]")} />


                        {!readOnly && (
                            <>
                                <button onClick={toggleViewMode} title={viewMode === 'center' ? 'Dock right' : 'Center focus'}
                                    className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                                        isDark ? "text-[#666] hover:text-white hover:bg-white/8" : "text-[#aaa] hover:text-[#333] hover:bg-[#f5f5f5]")}>
                                    {viewMode === 'center' ? <PanelRight size={14} /> : <Maximize size={14} />}
                                </button>

                                {/* Delete with confirm */}
                                <div className="relative flex items-center justify-center">
                                    <AnimatePresence initial={false}>
                                        {showDeleteConfirm ? (
                                            <motion.button
                                                key="confirm"
                                                initial={{ opacity: 0, scale: 0.8, x: 10 }}
                                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.8, x: 10 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                onClick={handleDelete}
                                                disabled={deleting}
                                                className="px-3 h-8 flex items-center gap-1.5 rounded-lg bg-red-500 text-white text-[11px] font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all whitespace-nowrap"
                                            >
                                                {deleting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={12} />}
                                                {deleting ? 'Deleting…' : 'Confirm delete'}
                                            </motion.button>
                                        ) : (
                                            <motion.button
                                                key="delete"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                onClick={() => setShowDeleteConfirm(true)}
                                                className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                                                    isDark ? "text-red-400/40 hover:text-red-400 hover:bg-red-500/10" : "text-red-300 hover:text-red-500 hover:bg-red-50")}
                                            >
                                                <Trash2 size={13} />
                                            </motion.button>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}

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
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", isDark ? "text-[#4a4a4a]" : "text-[#888]")}>
                                    Description
                                </p>
                                <div className="w-full transition-all">
                                    <ContentBlock 
                                        id={task.id} 
                                        data={blockData} 
                                        readOnly={readOnly}
                                        updateData={(__: string, patch: any) => {
                                            if (readOnly) return;
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
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-3", isDark ? "text-[#4a4a4a]" : "text-[#888]")}>
                                     Properties
                                </p>
                                <div className="space-y-2">

                                    {/* Priority */}
                                    <FieldRow label="Priority" icon={<Flag size={13} />} isDark={isDark}>
                                        {readOnly ? (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 text-[12px] font-semibold" style={{ color: priMeta.color }}>
                                                {priMeta.label}
                                            </div>
                                        ) : (
                                            <InlineSelect
                                                value={priority}
                                                options={PRIORITY_OPTIONS}
                                                onChange={v => { setPriority(v); save({ priority: v }); }}
                                                isDark={isDark}
                                                renderLabel={opt => (
                                                    <div className="flex items-center gap-1.5">
                                                        <span style={opt?.color ? { color: opt.color } : {}} className="font-semibold text-[12px]">{opt?.label}</span>
                                                    </div>
                                                )}
                                            />
                                        )}
                                    </FieldRow>

                                    {/* Task Color */}
                                    <FieldRow label="Accent Color" icon={<Zap size={13} />} isDark={isDark}>
                                        <div className="flex items-center gap-1.5 px-1">
                                            {((branding?.branding_colors && branding.branding_colors.length > 0) 
                                                ? branding.branding_colors 
                                                : ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316']).filter(c => c.toLowerCase() !== '#ffffff' && c.toLowerCase() !== '#000000').map(c => (
                                                <button
                                                    key={c}
                                                    disabled={readOnly}
                                                    onClick={() => save({ custom_fields: { color: c } })}
                                                    className={cn(
                                                        "w-3.5 h-3.5 rounded-full transition-all",
                                                        task.custom_fields?.color === c ? "ring-2 ring-offset-1 scale-110" : "opacity-40 hover:opacity-100 hover:scale-110",
                                                        task.custom_fields?.color === c ? (isDark ? "ring-white/40 ring-offset-[#161616]" : "ring-black/40 ring-offset-white") : ""
                                                    )}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                            {!readOnly && (
                                                <button
                                                    onClick={() => save({ custom_fields: { color: null } })}
                                                    className={cn(
                                                        "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors",
                                                        isDark ? "border-white/10 hover:bg-white/5 text-white/40" : "border-black/10 hover:bg-black/5 text-black/40"
                                                    )}
                                                >
                                                    <X size={8} strokeWidth={3} />
                                                </button>
                                            )}
                                        </div>
                                    </FieldRow>

                                    {/* Group */}
                                    <FieldRow label="Group" icon={<AlignLeft size={13} />} isDark={isDark}>
                                        {readOnly ? (
                                            <div className={cn("px-2 py-0.5 text-[12px] font-medium", isDark ? "text-[#ddd]" : "text-[#333]")}>
                                                {group ? group.name : 'Ungrouped'}
                                            </div>
                                        ) : (
                                            <InlineSelect
                                                value={groupId || ''}
                                                options={groupOptions}
                                                onChange={v => {
                                                    setGroupId(v);
                                                    save({ task_group_id: v });
                                                }}
                                                isDark={isDark}
                                                renderLabel={opt => (
                                                    <div className="flex items-center gap-1.5 text-[12px]">
                                                        <span className={cn("font-medium", isDark ? "text-[#ddd]" : "text-[#333]")}>{opt?.label}</span>
                                                    </div>
                                                )}
                                            />
                                        )}
                                    </FieldRow>

                                    {/* Start date */}
                                    <FieldRow label="Start date" icon={<Clock size={13} />} isDark={isDark}>
                                        {readOnly ? (
                                            <div className={cn("px-2 py-0.5 text-[12px] font-medium", isDark ? "text-[#ddd]" : "text-[#333]")}>
                                                {startDate || 'None'}
                                            </div>
                                        ) : (
                                            <DatePicker
                                                value={startDate}
                                                onChange={val => { setStartDate(val); save({ start_date: val || null }); }}
                                                isDark={isDark}
                                                placeholder="Select start date"
                                                className="px-0.5 text-[12px]"
                                            />
                                        )}
                                    </FieldRow>

                                    {/* Due date */}
                                    <FieldRow label="Due date" icon={<Calendar size={13} />} isDark={isDark}>
                                        {readOnly ? (
                                            <div className={cn("px-2 py-0.5 text-[12px] font-medium", isDark ? "text-[#ddd]" : "text-[#333]")}>
                                                {dueDate || 'None'}
                                            </div>
                                        ) : (
                                            <DatePicker
                                                value={dueDate}
                                                onChange={val => { setDueDate(val); save({ due_date: val || null }); }}
                                                isDark={isDark}
                                                placeholder="Select due date"
                                                className="px-0.5 text-[12px]"
                                            />
                                        )}
                                    </FieldRow>

                                    {/* Tags */}
                                     <FieldRow label="Tags" icon={<Tag size={13} />} isDark={isDark}>
                                         <div className="flex flex-wrap gap-1.5 min-h-[22px]">
                                             {tags.map((t, i) => (
                                                 <span 
                                                     key={i} 
                                                     className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-[5px] text-[9.5px] font-bold transition-all group/tag"
                                                     style={{ backgroundColor: `${t.color}15`, color: t.color }}
                                                 >
                                                     
                                                     <span className="truncate">{t.label}</span>
                                                     {!readOnly && (
                                                         <button 
                                                             onClick={() => {
                                                                 const next = tags.filter((_, idx) => idx !== i);
                                                                 setTags(next);
                                                                 save({ custom_fields: { ...task.custom_fields, tags: next } });
                                                             }}
                                                             className={cn(
                                                                 "w-3.5 h-3.5 flex items-center justify-center rounded-full transition-colors",
                                                                 isDark ? "hover:bg-white/10" : "hover:bg-black/5"
                                                             )}
                                                         >
                                                             <X size={8} />
                                                         </button>
                                                     )}
                                                 </span>
                                             ))}
                                             {!readOnly && (
                                                 <div className="relative">
                                                     <button 
                                                         onClick={() => setShowTagPicker(!showTagPicker)}
                                                         className={cn(
                                                             "flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] font-bold transition-all",
                                                             isDark ? "bg-white/5 text-[#555] hover:text-white" : "bg-black/5 text-[#aaa] hover:text-[#555]"
                                                         )}
                                                     >
                                                         <Plus size={9} />
                                                         Add
                                                     </button>
                                                     
                                                     {showTagPicker && (
                                                          <div className={cn(
                                                              "absolute top-full left-0 mt-2 z-[210] rounded-xl border shadow-2xl overflow-hidden p-1 flex flex-col gap-1",
                                                              isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                                                          )} style={{ minWidth: '140px' }}>
                                                              <input 
                                                                  autoFocus
                                                                  value={tagInput}
                                                                  onChange={e => setTagInput(e.target.value)}
                                                                  placeholder="Type a tag..."
                                                                  className={cn(
                                                                      "w-full px-2 py-1 text-[10px] font-medium bg-transparent outline-none rounded-lg transition-colors",
                                                                      isDark ? "text-white placeholder:text-[#3a3a3a] hover:bg-white/5 focus:bg-white/5" : "text-[#111] placeholder:text-[#aaa] hover:bg-black/5 focus:bg-black/5"
                                                                  )}
                                                                  onKeyDown={e => {
                                                                      if (e.key === 'Enter' && tagInput.trim()) {
                                                                          // Check if tag exists
                                                                          const exists = projectTags.find((pt: any) => pt.label.toLowerCase() === tagInput.trim().toLowerCase());
                                                                          if (exists) {
                                                                              if (!tags.some(t => t.label === exists.label)) {
                                                                                  const next = [...tags, exists];
                                                                                  setTags(next);
                                                                                  save({ custom_fields: { ...task.custom_fields, tags: next } });
                                                                              }
                                                                          } else {
                                                                              const next = [...tags, { label: tagInput.trim(), color: primaryColor }];
                                                                              setTags(next);
                                                                              save({ custom_fields: { ...task.custom_fields, tags: next } });
                                                                          }
                                                                          setTagInput('');
                                                                          setShowTagPicker(false);
                                                                      }
                                                                      if (e.key === 'Escape') {
                                                                          setShowTagPicker(false);
                                                                          setTagInput('');
                                                                      }
                                                                  }}
                                                              />
                                                              
                                                              <div className="max-h-[140px] overflow-y-auto no-scrollbar flex flex-col gap-0.5">
                                                                  {projectTags
                                                                      .filter((pt: any) => !tags.some(t => t.label === pt.label))
                                                                      .filter((pt: any) => pt.label.toLowerCase().includes(tagInput.toLowerCase()))
                                                                      .map((pt: any) => (
                                                                          <button
                                                                              key={pt.label}
                                                                              onClick={() => {
                                                                                  const next = [...tags, pt];
                                                                                  setTags(next);
                                                                                  save({ custom_fields: { ...task.custom_fields, tags: next } });
                                                                                  setShowTagPicker(false);
                                                                                  setTagInput('');
                                                                              }}
                                                                              className={cn(
                                                                                  "w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11.5px] rounded-lg transition-colors group/opt font-medium",
                                                                                  isDark ? "hover:bg-white/10 text-[#ddd]" : "hover:bg-black/5 text-[#333]"
                                                                              )}
                                                                          >
                                                                              <div className="w-1.5 h-1.5 rounded-full opacity-70 group-hover/opt:opacity-100 transition-opacity" style={{ backgroundColor: pt.color }} />
                                                                              <span className="flex-1 truncate">{pt.label}</span>
                                                                          </button>
                                                                      ))
                                                                  }
                                                                  
                                                                  {tagInput.trim() && !projectTags.some((pt: any) => pt.label.toLowerCase() === tagInput.trim().toLowerCase()) && (
                                                                      <div className={cn(
                                                                          "flex flex-col gap-1.5 p-1.5 rounded-lg border mt-1",
                                                                          isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                                                                      )}>
                                                                          <button
                                                                              onClick={() => {
                                                                                  const next = [...tags, { label: tagInput.trim(), color: primaryColor }];
                                                                                  setTags(next);
                                                                                  save({ custom_fields: { ...task.custom_fields, tags: next } });
                                                                                  setTagInput('');
                                                                                  setShowTagPicker(false);
                                                                              }}
                                                                              className="w-full flex items-center gap-2 text-left text-[11px] font-medium transition-colors opacity-90 hover:opacity-100"
                                                                          >
                                                                              <Plus size={11} className="opacity-70" />
                                                                              <span className="flex-1 truncate">Create "{tagInput}"</span>
                                                                          </button>
                                                                          <div className="flex flex-wrap gap-1 mt-0.5 pl-0.5">
                                                                              <button
                                                                                   onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        const next = [...tags, { label: tagInput.trim(), color: primaryColor }];
                                                                                        setTags(next);
                                                                                        save({ custom_fields: { ...task.custom_fields, tags: next } });
                                                                                        setTagInput('');
                                                                                        setShowTagPicker(false);
                                                                                   }}
                                                                                   className="w-3.5 h-3.5 rounded-full ring-2 ring-offset-1 transition-transform hover:scale-110"
                                                                                   style={{ backgroundColor: primaryColor, '--tw-ring-color': primaryColor, '--tw-ring-opacity': '0.3', ...(isDark ? { '--tw-ring-offset-color': '#1c1c1c' } : { '--tw-ring-offset-color': '#fff' }) } as any}
                                                                                   title="Brand Color"
                                                                              />
                                                                              {TAG_COLORS.map(c => (
                                                                                  <button
                                                                                      key={c.hex}
                                                                                      onClick={(e) => {
                                                                                           e.stopPropagation();
                                                                                           const next = [...tags, { label: tagInput.trim(), color: c.hex }];
                                                                                           setTags(next);
                                                                                           save({ custom_fields: { ...task.custom_fields, tags: next } });
                                                                                           setTagInput('');
                                                                                           setShowTagPicker(false);
                                                                                      }}
                                                                                      className="w-3.5 h-3.5 rounded-full transition-transform hover:scale-110 opacity-70 hover:opacity-100"
                                                                                      style={{ backgroundColor: c.hex }}
                                                                                      title={c.name}
                                                                                  />
                                                                              ))}
                                                                          </div>
                                                                      </div>
                                                                  )}
                                                              </div>
                                                          </div>
                                                      )}
                                                 </div>
                                             )}
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
                                    {!readOnly && (
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
                                                        onClick={() => { appToast.info('Comments coming soon'); setComment(''); }}
                                                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold disabled:opacity-40 transition-all hover:bg-primary/90 active:scale-95"
                                                    >
                                                        Post
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

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
                                <div className="flex flex-col gap-4">
                                    {/* Checklist Input */}
                                    {!readOnly && (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                value={checklistInput}
                                                onChange={e => setChecklistInput(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && checklistInput.trim()) {
                                                        const newItem = { id: crypto.randomUUID(), label: checklistInput.trim(), completed: false };
                                                        const next = [...checklists, newItem];
                                                        setChecklists(next);
                                                        save({ custom_fields: { ...task.custom_fields, checklists: next } });
                                                        setChecklistInput('');
                                                    }
                                                }}
                                                placeholder="Add a sub-task..."
                                                className={cn(
                                                    "flex-1 px-3 py-2 rounded-xl border bg-transparent text-[12px] outline-none transition-all focus:ring-2 focus:ring-primary/20",
                                                    isDark ? "border-[#252525] text-white placeholder:text-[#333]" : "border-[#e5e5e5] text-[#111] placeholder:text-[#ccc]"
                                                )}
                                            />
                                        </div>
                                    )}

                                    {/* Checklist Items */}
                                    <div className="flex flex-col gap-1">
                                        {checklists.map(item => (
                                            <div key={item.id} className="flex items-center gap-3 group/item py-1">
                                                <button 
                                                    onClick={() => {
                                                        const next = checklists.map(c => c.id === item.id ? { ...c, completed: !c.completed } : c);
                                                        setChecklists(next);
                                                        save({ custom_fields: { ...task.custom_fields, checklists: next } });
                                                    }}
                                                    className={cn(
                                                        "w-4 h-4 rounded border transition-all flex items-center justify-center",
                                                        item.completed 
                                                            ? "bg-primary border-primary text-primary-foreground" 
                                                            : isDark ? "border-[#333] hover:border-[#555]" : "border-[#ccc] hover:border-[#aaa]"
                                                    )}
                                                >
                                                    {item.completed && <Check size={10} strokeWidth={4} />}
                                                </button>
                                                <span className={cn(
                                                    "flex-1 text-[12.5px] transition-all",
                                                    item.completed ? "line-through opacity-40" : isDark ? "text-[#ddd]" : "text-[#333]"
                                                )}>
                                                    {item.label}
                                                </span>
                                                <button 
                                                    onClick={() => {
                                                        const next = checklists.filter(c => c.id !== item.id);
                                                        setChecklists(next);
                                                        save({ custom_fields: { ...task.custom_fields, checklists: next } });
                                                    }}
                                                    className="opacity-0 group-hover/item:opacity-40 hover:!opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10 text-red-500"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}

                                        {checklists.length === 0 && (
                                            <div className="py-10 flex flex-col items-center justify-center gap-3 opacity-20">
                                                <Check size={24} />
                                                <span className="text-[12px] font-medium">No sub-tasks yet</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'attachments' && (
                                <div className="flex flex-col gap-4">
                                    {!readOnly && (
                                        <div className={cn(
                                            "relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group/upload",
                                            isDark ? "border-[#252525] hover:border-[#333] hover:bg-white/[0.02]" : "border-[#e5e5e5] hover:border-[#ccc] hover:bg-black/[0.02]"
                                        )}>
                                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-1 transition-all group-hover/upload:scale-110", isDark ? "bg-white/5" : "bg-[#f5f5f5]")}>
                                                <Paperclip size={20} className={isDark ? "text-[#444]" : "text-[#aaa]"} />
                                            </div>
                                            <p className={cn("text-[13px] font-semibold", isDark ? "text-[#ddd]" : "text-[#333]")}>Upload attachments</p>
                                            <p className={cn("text-[11px] text-center max-w-[200px]", isDark ? "text-[#444]" : "text-[#888]")}>Drag & drop or Click to browse files</p>
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={() => appToast.info('B2 Upload logic active')} />
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-2">
                                        {attachments.map(file => (
                                            <div key={file.id} className={cn(
                                                "p-3 rounded-xl border flex items-center gap-3 group/file transition-all",
                                                isDark ? "bg-[#1a1a1a] border-[#252525] hover:bg-[#1f1f1f]" : "bg-white border-[#f0f0f0] hover:bg-[#fafafa]"
                                            )}>
                                                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", isDark ? "bg-white/5" : "bg-[#f5f5f5]")}>
                                                    <Paperclip size={16} className={isDark ? "text-[#444]" : "text-[#aaa]"} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn("text-[12.5px] font-semibold truncate", isDark ? "text-white" : "text-[#111]")}>{file.name}</p>
                                                    <p className={cn("text-[10px] uppercase font-bold tracking-wider opacity-30 mt-0.5", isDark ? "text-white" : "text-black")}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity">
                                                    <a href={file.url} download className={cn("p-1.5 rounded-lg transition-colors", isDark ? "hover:bg-white/10 text-white/40" : "hover:bg-black/5 text-black/40")}>
                                                        <ArrowUpRight size={13} />
                                                    </a>
                                                    <button className={cn("p-1.5 rounded-lg transition-colors", isDark ? "hover:bg-red-500/10 text-red-500/60" : "hover:bg-red-500/10 text-red-500/60")}>
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {attachments.length === 0 && (
                                            <div className="py-10 flex flex-col items-center justify-center gap-3 opacity-20">
                                                <Paperclip size={24} />
                                                <span className="text-[12px] font-medium">No files attached</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'links' && (
                                <div className="flex flex-col gap-3">
                                    {!readOnly && (
                                        <button className={cn(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-semibold transition-all",
                                            isDark ? "border-[#252525] text-[#555] hover:text-white hover:bg-white/5" : "border-[#e5e5e5] text-[#aaa] hover:text-[#333] hover:bg-[#f5f5f5]"
                                        )}>
                                            <Link2 size={13} /> Add link
                                        </button>
                                    )}
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


                    </div>
                </div>

                {/* Floating Task ID bottom left */}
                <div className={cn(
                    "absolute bottom-4 left-6 flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase opacity-[0.15] select-none pointer-events-none",
                    isDark ? "text-white" : "text-black"
                )}>
                    <Hash size={9} />
                    {task.id.slice(-5).toUpperCase()}
                </div>

            </motion.div>
        </div>
    );
}
