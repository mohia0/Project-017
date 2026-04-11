"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, X, MoreHorizontal, GripVertical, CheckSquare, Square,
    Flag, Calendar, Trash2, Edit3, AlignLeft, CheckCircle2,
    PlayCircle, Eye, Inbox, RotateCcw, Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore, ProjectTask, ProjectTaskGroup, TaskStatus, TaskPriority } from '@/store/useProjectStore';
import {
    DndContext, closestCenter, PointerSensor, KeyboardSensor,
    useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent
} from '@dnd-kit/core';
import {
    SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Constants ────────────────────────────────────────────────────────────────

export const PRIORITY_MAP: Record<TaskPriority, { color: string; label: string }> = {
    none:   { color: '#6b7280', label: 'None'   },
    low:    { color: '#22c55e', label: 'Low'    },
    medium: { color: '#f59e0b', label: 'Medium' },
    high:   { color: '#ef4444', label: 'High'   },
    urgent: { color: '#ec4899', label: 'Urgent' },
};

export const KANBAN_COLS = [
    { status: 'todo'   as TaskStatus, label: 'To Do',  accent: '#374151' },
    { status: 'doing'  as TaskStatus, label: 'Doing',  accent: '#3b82f6' },
    { status: 'review' as TaskStatus, label: 'Review', accent: '#f97316' },
    { status: 'done'   as TaskStatus, label: 'Done',   accent: '#22c55e' },
];

export const STATUS_ICON_MAP: Record<TaskStatus, React.ReactNode> = {
    todo:   <Circle      size={9}  className="text-[#888]"        strokeWidth={2.5} />,
    doing:  <PlayCircle  size={9}  className="text-blue-400"      />,
    review: <Eye         size={9}  className="text-orange-400"    />,
    done:   <CheckCircle2 size={9} className="text-emerald-400"   />,
};

const GROUP_COLORS = [
    '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#6366F1',
    '#3B82F6', '#06B6D4', '#10B981', '#22C55E', '#71717A',
];

function shortId(id: string) { return `#${id.slice(-3).toUpperCase()}`; }
function fmtDate(d: string | null | undefined) {
    if (!d) return null;
    const dt = new Date(d);
    return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
}

type CtxMenuState = { x: number; y: number; id: string; type: 'task' | 'group' } | null;

// ─── Context Menu ─────────────────────────────────────────────────────────────

function ContextMenu({ menu, isDark, onAction, onClose, tasks, groups, projectId }: {
    menu: NonNullable<CtxMenuState>;
    isDark: boolean;
    onAction: (action: string, type: 'task' | 'group', id: string) => void;
    onClose: () => void;
    tasks: ProjectTask[];
    groups: ProjectTaskGroup[];
    projectId: string;
}) {
    const menuRef = useRef<HTMLDivElement>(null);
    const { updateTaskGroup } = useProjectStore();

    useEffect(() => {
        const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [onClose]);

    const [pos, setPos] = useState({ x: menu.x, y: menu.y });
    useEffect(() => {
        if (menuRef.current) {
            const r = menuRef.current.getBoundingClientRect();
            setPos({
                x: Math.min(menu.x, window.innerWidth  - r.width  - 8),
                y: Math.min(menu.y, window.innerHeight - r.height - 8),
            });
        }
    }, [menu.x, menu.y]);

    const group = menu.type === 'group' ? groups.find(g => g.id === menu.id) : null;

    const Item = ({ label, icon, action, danger = false }: { label: string; icon: React.ReactNode; action: string; danger?: boolean }) => (
        <button
            onClick={() => { onAction(action, menu.type, menu.id); onClose(); }}
            className={cn(
                'w-full flex items-center gap-2.5 px-3 py-[7px] text-[11.5px] font-medium text-left rounded-lg transition-colors',
                danger
                    ? 'text-red-400 hover:bg-red-500/10'
                    : isDark
                        ? 'text-[#b0b0b0] hover:bg-white/5 hover:text-white'
                        : 'text-[#444] hover:bg-[#f4f4f4] hover:text-[#111]'
            )}
        >
            <span className="opacity-70">{icon}</span> {label}
        </button>
    );

    const Divider = () => <div className={cn('my-1 h-px', isDark ? 'bg-[#252525]' : 'bg-[#f0f0f0]')} />;

    return (
        <div
            ref={menuRef}
            className={cn(
                'fixed z-[60] rounded-2xl border shadow-2xl p-1.5 min-w-[196px]',
                isDark
                    ? 'bg-[#181818] border-[#272727] shadow-black/60'
                    : 'bg-white border-[#e8e8e8] shadow-black/10'
            )}
            style={{ left: pos.x, top: pos.y }}
            onContextMenu={e => e.preventDefault()}
        >
            {menu.type === 'task' && (
                <>
                    <Item label="Open details" icon={<Eye size={12} />}    action="open" />
                    <Item label="Edit task"    icon={<Edit3 size={12} />}   action="edit" />
                    <Divider />
                    <Item label="Delete task"  icon={<Trash2 size={12} />}  action="delete" danger />
                </>
            )}

            {menu.type === 'group' && group && (
                <>
                    <Item label="Rename group" icon={<Edit3 size={12} />} action="rename" />
                    <Divider />
                    <div className="px-3 py-2.5">
                        <div className="flex items-center justify-between mb-2.5">
                            <span className={cn('text-[9px] font-bold uppercase tracking-[0.12em]', isDark ? 'text-[#3a3a3a]' : 'text-[#c0c0c0]')}>
                                Color
                            </span>
                            <button
                                onClick={() => { updateTaskGroup(group.id, projectId, { color: '' }); onClose(); }}
                                className={cn('p-1 rounded-md transition-colors', isDark ? 'text-[#333] hover:bg-white/5 hover:text-[#777]' : 'text-[#ccc] hover:bg-black/5 hover:text-[#888]')}
                            >
                                <RotateCcw size={10} strokeWidth={2.5} />
                            </button>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                            {GROUP_COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => { updateTaskGroup(group.id, projectId, { color: c }); onClose(); }}
                                    className={cn(
                                        'w-5 h-5 rounded-full transition-all hover:scale-110 duration-150',
                                        group.color === c && 'ring-2 ring-offset-1 ring-offset-transparent scale-110',
                                        group.color === c ? (isDark ? 'ring-white/60' : 'ring-black/40') : 'opacity-70 hover:opacity-100'
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>
                    <Divider />
                    <Item label="Delete group" icon={<Trash2 size={12} />} action="delete" danger />
                </>
            )}
        </div>
    );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, isDark, onCtx, onAction }: {
    task: ProjectTask;
    isDark: boolean;
    onCtx: (e: React.MouseEvent, id: string, type: 'task' | 'group') => void;
    onAction: (a: string, t: ProjectTask) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: 'task' },
    });
    const { updateTask } = useProjectStore();
    const style = { transform: CSS.Translate.toString(transform), transition };
    const pri   = PRIORITY_MAP[task.priority];
    const isDone = task.status === 'done';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            onContextMenu={e => onCtx(e, task.id, 'task')}
            onClick={() => onAction('open', task)}
            className={cn(
                'relative rounded-[14px] border cursor-pointer select-none group/card transition-all duration-150 overflow-hidden',
                isDragging
                    ? 'opacity-30 scale-[0.97] shadow-2xl ring-2 ring-primary/30 z-20'
                    : isDark
                        ? 'bg-[#1a1a1a] border-[#252525] hover:border-[#343434] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
                        : 'bg-white border-[#ebebeb] hover:border-[#d8d8d8] hover:shadow-[0_6px_24px_rgba(0,0,0,0.07)] shadow-sm shadow-black/[0.025]'
            )}
        >
            {/* Priority bar */}
            {task.priority !== 'none' && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[14px]"
                    style={{ background: pri.color }}
                />
            )}

            <div className="flex items-start gap-2 pl-[18px] pr-3 pt-3 pb-3">
                {/* Drag handle */}
                <div
                    {...listeners}
                    className="mt-[1px] shrink-0 opacity-0 group-hover/card:opacity-20 hover:!opacity-50 cursor-grab active:cursor-grabbing transition-opacity"
                    onClick={e => e.stopPropagation()}
                >
                    <GripVertical size={11} className={isDark ? 'text-[#666]' : 'text-[#bbb]'} />
                </div>

                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <p className={cn(
                        'text-[12px] font-semibold leading-[1.4] mb-2 pr-10',
                        isDone
                            ? isDark ? 'line-through text-[#383838]' : 'line-through text-[#c8c8c8]'
                            : isDark ? 'text-[#e8e8e8]' : 'text-[#1a1a1a]'
                    )}>
                        {task.title}
                    </p>

                    {/* Chips row */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* Status + ID */}
                        <span className={cn(
                            'inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-[3px] rounded-md tabular-nums',
                            isDark ? 'bg-white/[0.04] text-[#4a4a4a]' : 'bg-[#f5f5f5] text-[#aaa]'
                        )}>
                            {STATUS_ICON_MAP[task.status]}
                            {shortId(task.id)}
                        </span>

                        {/* Description dot */}
                        {task.description && (
                            <span className={cn(isDark ? 'text-[#333]' : 'text-[#d5d5d5]')}>
                                <AlignLeft size={9} />
                            </span>
                        )}

                        {/* Priority */}
                        {task.priority !== 'none' && (
                            <span
                                className="inline-flex items-center gap-[3px] text-[9.5px] font-bold px-1.5 py-[3px] rounded-md"
                                style={{ color: pri.color, background: `${pri.color}14` }}
                            >
                                <Flag size={8} strokeWidth={2.5} />
                                {pri.label}
                            </span>
                        )}

                        {/* Due date */}
                        {task.due_date && (
                            <span className={cn(
                                'inline-flex items-center gap-[3px] text-[9.5px] font-medium',
                                isDark ? 'text-[#484848]' : 'text-[#c0c0c0]'
                            )}>
                                <Calendar size={8} />
                                {fmtDate(task.due_date)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Hover actions */}
            <div className={cn(
                'absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity z-10',
                isDone && 'opacity-100'
            )}>
                <button
                    onClick={e => { e.stopPropagation(); onCtx(e, task.id, 'task'); }}
                    className={cn(
                        'w-6 h-6 flex items-center justify-center rounded-lg transition-colors',
                        isDark ? 'text-[#3a3a3a] hover:text-[#aaa] hover:bg-white/[0.07]' : 'text-[#d0d0d0] hover:text-[#777] hover:bg-black/[0.05]'
                    )}
                >
                    <MoreHorizontal size={12} />
                </button>
                <button
                    onClick={e => {
                        e.stopPropagation();
                        updateTask(task.id, task.project_id, { status: isDone ? 'todo' : 'done' });
                    }}
                    className={cn(
                        'w-6 h-6 flex items-center justify-center rounded-lg transition-colors',
                        isDone
                            ? 'text-emerald-500 hover:bg-emerald-500/10'
                            : isDark
                                ? 'text-[#3a3a3a] hover:text-white hover:bg-white/[0.07]'
                                : 'text-[#d0d0d0] hover:text-[#555] hover:bg-black/[0.05]'
                    )}
                >
                    {isDone ? <CheckSquare size={12} /> : <Square size={12} />}
                </button>
            </div>
        </div>
    );
}

// ─── Column Header ────────────────────────────────────────────────────────────

function ColHeader({ group, isUngrouped, isDark, projectId, onCtx, dragListeners, dragAttributes }: {
    group: ProjectTaskGroup | null;
    isUngrouped: boolean;
    isDark: boolean;
    projectId: string;
    onCtx: (e: React.MouseEvent, id: string, type: 'group') => void;
    dragListeners?: object;
    dragAttributes?: object;
    taskCount: number;
}) {
    const { updateTaskGroup } = useProjectStore();
    const [editing, setEditing] = useState(false);
    const [draft,   setDraft]   = useState(group?.name || '');

    const baseColor = group?.color || (isUngrouped ? '#5a6270' : '#374151');

    const commitRename = async () => {
        setEditing(false);
        if (!group) return;
        if (draft.trim() && draft !== group.name) {
            await updateTaskGroup(group.id, projectId, { name: draft.trim() });
        } else {
            setDraft(group.name);
        }
    };

    return (
        <div
            className="rounded-[18px] overflow-hidden relative group/hdr select-none"
            style={{ background: baseColor }}
            onContextMenu={e => !isUngrouped && group && onCtx(e, group.id, 'group')}
        >
            {/* Highlight shine */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.22) 0%, transparent 65%)',
                }}
            />

            {/* Drag + Options — visible on hover */}
            {!isUngrouped && group && (
                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2 z-10 opacity-0 group-hover/hdr:opacity-100 transition-opacity duration-150">
                    <div
                        {...dragListeners}
                        {...dragAttributes}
                        className="w-6 h-6 flex items-center justify-center rounded-lg cursor-grab active:cursor-grabbing text-white/40 hover:text-white hover:bg-white/15 transition-colors"
                    >
                        <GripVertical size={12} />
                    </div>
                    <button
                        onClick={e => onCtx(e, group.id, 'group')}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/15 transition-colors"
                    >
                        <MoreHorizontal size={12} />
                    </button>
                </div>
            )}

            {/* Center pill */}
            <div className="flex items-center justify-center pt-5 pb-[10px] px-4">
                <div
                    className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-full"
                    style={{ background: 'rgba(0,0,0,0.20)' }}
                >
                    {isUngrouped
                        ? <Inbox    size={11} className="text-white/75 shrink-0" />
                        : <AlignLeft size={11} className="text-white/75 shrink-0" />
                    }
                    {editing ? (
                        <input
                            autoFocus
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={e => {
                                if (e.key === 'Enter') commitRename();
                                if (e.key === 'Escape') { setDraft(group?.name ?? ''); setEditing(false); }
                            }}
                            className="text-[11.5px] font-bold text-white bg-transparent outline-none w-[90px] border-b border-white/40 text-center placeholder:text-white/40"
                        />
                    ) : (
                        <span
                            onDoubleClick={() => !isUngrouped && setEditing(true)}
                            className="text-[11.5px] font-bold text-white tracking-[0.02em] cursor-text whitespace-nowrap"
                        >
                            {isUngrouped ? 'Ungrouped' : group?.name}
                        </span>
                    )}
                </div>
            </div>

            {/* Footer strip */}
            <div
                className="flex items-center justify-between px-3.5 py-[9px]"
                style={{ background: 'rgba(0,0,0,0.22)' }}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-[6px] h-[6px] rounded-full bg-white/35 shrink-0" />
                    <span className="text-[10.5px] font-semibold text-white/55 truncate">
                        {isUngrouped ? 'Ungrouped' : group?.name}
                    </span>
                </div>
                <span className="text-[10px] font-bold text-white/45 tabular-nums bg-white/[0.12] px-2 py-[2px] rounded-md ml-2 shrink-0">
                    {/* taskCount is passed as a prop from parent — read via closure */}
                    0
                </span>
            </div>
        </div>
    );
}

// ─── Task Group Column ────────────────────────────────────────────────────────

function TaskGroupCol({ group, tasks, isDark, projectId, onCtx, onAction, forceEditing, onRenameDone }: {
    group: ProjectTaskGroup | null;
    tasks: ProjectTask[];
    isDark: boolean;
    projectId: string;
    onCtx: (e: React.MouseEvent, id: string, type: 'task' | 'group') => void;
    onAction: (a: string, t: ProjectTask) => void;
    forceEditing?: boolean;
    onRenameDone?: () => void;
}) {
    const { updateTaskGroup, addTask } = useProjectStore();
    const [adding,   setAdding]   = useState(false);
    const [titleStr, setTitleStr] = useState('');
    const [saving,   setSaving]   = useState(false);
    const [editing,  setEditing]  = useState(false);
    const [draft,    setDraft]    = useState(group?.name ?? '');

    useEffect(() => {
        if (forceEditing) { setEditing(true); setDraft(group?.name ?? ''); }
    }, [forceEditing, group?.name]);

    const isUngrouped = !group;
    const sortId = isUngrouped ? 'ungrouped' : group.id;

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: sortId,
        data: { type: 'group' },
        disabled: isUngrouped,
    });

    const commitRename = async () => {
        setEditing(false);
        if (onRenameDone) onRenameDone();
        if (!group) return;
        if (draft.trim() && draft !== group.name) {
            await updateTaskGroup(group.id, projectId, { name: draft.trim() });
        } else {
            setDraft(group.name);
        }
    };

    const doSaveTask = async () => {
        if (!titleStr.trim()) { setAdding(false); return; }
        setSaving(true);
        await addTask({
            project_id:    projectId,
            task_group_id: isUngrouped ? null : group.id,
            title:         titleStr.trim(),
            status:        'todo',
            priority:      'none',
            position:      tasks.length,
            custom_fields: {},
            is_archived:   false,
        });
        setSaving(false);
        setTitleStr('');
        setAdding(false);
    };

    const baseColor = group?.color || (isUngrouped ? '#5a6270' : '#374151');

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cn('flex flex-col w-[268px] min-w-[268px] shrink-0 h-full', isDragging && 'opacity-20 z-30')}
        >
            {/* ── Header ── */}
            <div
                className="rounded-[18px] overflow-hidden relative group/hdr select-none mb-3"
                style={{ background: baseColor }}
                onContextMenu={e => !isUngrouped && group && onCtx(e, group.id, 'group')}
            >
                {/* Shine */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.2) 0%, transparent 70%)' }}
                />

                {/* Drag + options */}
                {!isUngrouped && group && (
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2 z-10 opacity-0 group-hover/hdr:opacity-100 transition-opacity duration-150">
                        <div
                            {...listeners}
                            {...attributes}
                            className="w-6 h-6 flex items-center justify-center rounded-lg cursor-grab active:cursor-grabbing text-white/40 hover:text-white hover:bg-white/15 transition-colors"
                        >
                            <GripVertical size={12} />
                        </div>
                        <button
                            onClick={e => onCtx(e, group.id, 'group')}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/15 transition-colors"
                        >
                            <MoreHorizontal size={12} />
                        </button>
                    </div>
                )}

                {/* Center pill */}
                <div className="flex items-center justify-center pt-5 pb-[10px] px-4">
                    <div
                        className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-full"
                        style={{ background: 'rgba(0,0,0,0.20)' }}
                    >
                        {isUngrouped
                            ? <Inbox     size={11} className="text-white/70 shrink-0" />
                            : <AlignLeft size={11} className="text-white/70 shrink-0" />
                        }
                        {editing ? (
                            <input
                                autoFocus
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                onBlur={commitRename}
                                onKeyDown={e => {
                                    if (e.key === 'Enter')  commitRename();
                                    if (e.key === 'Escape') { setDraft(group?.name ?? ''); setEditing(false); }
                                }}
                                className="text-[11.5px] font-bold text-white bg-transparent outline-none w-[90px] border-b border-white/40 text-center"
                            />
                        ) : (
                            <span
                                onDoubleClick={() => !isUngrouped && setEditing(true)}
                                className="text-[11.5px] font-bold text-white tracking-[0.015em] cursor-text whitespace-nowrap"
                            >
                                {isUngrouped ? 'Ungrouped' : group?.name}
                            </span>
                        )}
                    </div>
                </div>

                {/* Footer strip */}
                <div
                    className="flex items-center justify-between px-3.5 py-[9px]"
                    style={{ background: 'rgba(0,0,0,0.22)' }}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-[6px] h-[6px] rounded-full bg-white/35 shrink-0" />
                        <span className="text-[10.5px] font-semibold text-white/55 truncate">
                            {isUngrouped ? 'Ungrouped' : group?.name}
                        </span>
                    </div>
                    <span className="text-[10px] font-bold text-white/45 tabular-nums bg-white/[0.12] px-2 py-[2px] rounded-md ml-2 shrink-0">
                        {tasks.length}
                    </span>
                </div>
            </div>

            {/* ── Add task button ── */}
            <button
                onClick={() => setAdding(true)}
                className={cn(
                    'flex items-center gap-1.5 px-3 py-2 mb-3 rounded-[12px] text-[11px] font-semibold transition-all duration-150 border border-dashed group/add',
                    isDark
                        ? 'border-[#272727] text-[#3a3a3a] hover:border-[#3a3a3a] hover:text-[#888] hover:bg-white/[0.025]'
                        : 'border-[#e6e6e6] text-[#c8c8c8] hover:border-[#c8c8c8] hover:text-[#555] hover:bg-black/[0.015]'
                )}
            >
                <Plus size={11} strokeWidth={2.5} className="transition-colors" />
                Add task
            </button>

            {/* ── Task list ── */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-8 min-h-[100px]">
                <AnimatePresence>
                    {adding && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -4, height: 0 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className={cn(
                                'rounded-[14px] border p-3 mb-2.5 overflow-hidden',
                                isDark
                                    ? 'bg-[#1c1c1c] border-[#2a2a2a]'
                                    : 'bg-white border-[#e0e0e0] shadow-sm'
                            )}
                        >
                            <textarea
                                autoFocus
                                value={titleStr}
                                onChange={e => setTitleStr(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSaveTask(); }
                                    if (e.key === 'Escape') setAdding(false);
                                }}
                                placeholder="Task title…"
                                rows={2}
                                className={cn(
                                    'w-full bg-transparent text-[12px] outline-none resize-none leading-relaxed',
                                    isDark ? 'text-white placeholder:text-[#2e2e2e]' : 'text-[#111] placeholder:text-[#ccc]'
                                )}
                            />
                            <div className="flex items-center gap-1.5 mt-2 justify-end">
                                <button
                                    onClick={() => setAdding(false)}
                                    className={cn(
                                        'px-2.5 py-1 rounded-lg text-[10.5px] font-bold uppercase tracking-wide transition-colors',
                                        isDark ? 'text-[#404040] hover:text-[#888]' : 'text-[#c0c0c0] hover:text-[#777]'
                                    )}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={doSaveTask}
                                    disabled={saving || !titleStr.trim()}
                                    className="px-3.5 py-1 rounded-lg bg-primary text-black text-[11px] font-bold transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    {saving ? '…' : 'Save'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-2">
                        {tasks.map(t => (
                            <TaskCard
                                key={t.id}
                                task={t}
                                isDark={isDark}
                                onCtx={onCtx}
                                onAction={onAction}
                            />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
}

// ─── New Group Form ───────────────────────────────────────────────────────────

function NewGroupForm({ isDark, onSave, onCancel }: {
    isDark: boolean;
    onSave: (name: string) => void;
    onCancel: () => void;
}) {
    const [value, setValue] = useState('');
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => { ref.current?.focus(); }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={cn(
                'rounded-[18px] border overflow-hidden',
                isDark
                    ? 'bg-[#1a1a1a] border-[#272727]'
                    : 'bg-white border-[#e5e5e5] shadow-sm'
            )}
        >
            {/* Input */}
            <div className={cn('px-4 pt-4 pb-3')}>
                <input
                    ref={ref}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') onSave(value);
                        if (e.key === 'Escape') onCancel();
                    }}
                    placeholder="Group name…"
                    className={cn(
                        'w-full bg-transparent text-[13px] font-semibold outline-none',
                        isDark
                            ? 'text-white placeholder:text-[#2e2e2e]'
                            : 'text-[#111] placeholder:text-[#ccc]'
                    )}
                />
            </div>

            {/* Actions */}
            <div className={cn('flex items-center gap-2 px-3 pb-3')}>
                <button
                    onClick={() => onSave(value)}
                    className="flex-1 py-2 rounded-[12px] bg-primary text-black text-[12px] font-bold transition-all hover:bg-primary/90 active:scale-[0.98]"
                >
                    Save
                </button>
                <button
                    onClick={onCancel}
                    className={cn(
                        'w-9 h-9 flex items-center justify-center rounded-[12px] transition-colors shrink-0',
                        isDark
                            ? 'bg-[#252525] text-[#666] hover:text-white hover:bg-[#2e2e2e]'
                            : 'bg-[#f0f0f0] text-[#aaa] hover:text-[#333] hover:bg-[#e8e8e8]'
                    )}
                >
                    <X size={13} strokeWidth={2.5} />
                </button>
            </div>
        </motion.div>
    );
}

// ─── Kanban Board Root ────────────────────────────────────────────────────────

interface KanbanBoardProps {
    projectId:    string;
    projectColor: string;
    isDark:       boolean;
    searchQuery:  string;
    showArchived: boolean;
    onTaskClick:  (task: ProjectTask) => void;
}

export default function KanbanBoard({ projectId, isDark, searchQuery, showArchived, onTaskClick }: KanbanBoardProps) {
    const {
        tasksByProject, groupsByProject, fetchTasks, fetchTaskGroups,
        addTaskGroup, reorderTask, reorderTaskGroup, deleteTask, deleteTaskGroup,
    } = useProjectStore();

    const tasks  = tasksByProject[projectId] || [];
    const groups = useMemo(
        () => [...(groupsByProject[projectId] || [])].sort((a, b) => a.position - b.position),
        [groupsByProject, projectId]
    );

    const [activeId,   setActiveId]   = useState<string | null>(null);
    const [activeType, setActiveType] = useState<'task' | 'group' | null>(null);
    const [addingGroup, setAddingGroup] = useState(false);
    const [ctxMenu,    setCtxMenu]    = useState<CtxMenuState>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);

    useEffect(() => {
        fetchTasks(projectId);
        fetchTaskGroups(projectId);
    }, [projectId, fetchTasks, fetchTaskGroups]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (e: DragStartEvent) => {
        setActiveId(e.active.id as string);
        setActiveType(e.active.data.current?.type ?? null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveType(null);
        if (!over || active.id === over.id) return;

        const type = active.data.current?.type;

        if (type === 'group') {
            const oi = groups.findIndex(g => g.id === active.id);
            const ni = groups.findIndex(g => g.id === over.id);
            if (oi !== -1 && ni !== -1) reorderTaskGroup(active.id as string, projectId, ni);
        } else if (type === 'task') {
            const from = tasks.find(t => t.id === active.id);
            const to   = tasks.find(t => t.id === over.id);
            if (from && to) {
                if (from.task_group_id !== to.task_group_id || from.position !== to.position) {
                    reorderTask(from.id, projectId, to.task_group_id ?? null, to.position);
                }
            } else if (from && !to) {
                reorderTask(from.id, projectId, over.id as string, 0);
            }
        }
    };

    const handleAddGroup = async (name: string) => {
        const finalName = name.trim() || 'New Group';
        const color = GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
        await addTaskGroup({ project_id: projectId, name: finalName, position: groups.length, color });
        setAddingGroup(false);
    };

    const handleCtxAction = (action: string, type: 'task' | 'group', id: string) => {
        if (type === 'task') {
            const t = tasks.find(x => x.id === id);
            if (!t) return;
            if (action === 'open' || action === 'edit') onTaskClick(t);
            if (action === 'delete') deleteTask(id, projectId);
        } else if (type === 'group') {
            if (action === 'rename') setRenamingId(id);
            if (action === 'delete') {
                const g = groups.find(g => g.id === id);
                if (window.confirm(`Delete group "${g?.name}" and all its tasks?`)) {
                    deleteTaskGroup(id, projectId);
                }
            }
        }
    };

    const openCtx = (e: React.MouseEvent, id: string, type: 'task' | 'group') => {
        e.preventDefault();
        e.stopPropagation();
        setCtxMenu({ x: e.clientX, y: e.clientY, id, type });
    };

    const activeTask  = activeType === 'task'  ? tasks.find(t  => t.id  === activeId) : null;
    const activeGroup = activeType === 'group' ? groups.find(g => g.id === activeId)  : null;

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div
                    className="flex-1 overflow-x-auto overflow-y-hidden px-5 py-5 flex items-start gap-4 no-scrollbar h-full"
                    onContextMenu={e => { e.preventDefault(); setCtxMenu(null); }}
                >
                    <SortableContext items={groups.map(g => g.id)} strategy={horizontalListSortingStrategy}>
                        {groups.map(g => {
                            const colTasks = tasks
                                .filter(t =>
                                    t.task_group_id === g.id
                                    && (showArchived ? t.is_archived : !t.is_archived)
                                    && (!searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                )
                                .sort((a, b) => a.position - b.position);

                            return (
                                <TaskGroupCol
                                    key={g.id}
                                    group={g}
                                    tasks={colTasks}
                                    isDark={isDark}
                                    projectId={projectId}
                                    onCtx={openCtx}
                                    onAction={(a, t) => { if (a === 'open') onTaskClick(t); }}
                                    forceEditing={renamingId === g.id}
                                    onRenameDone={() => setRenamingId(null)}
                                />
                            );
                        })}
                    </SortableContext>

                    {/* New group */}
                    <div className="shrink-0 w-[268px]">
                        <AnimatePresence mode="wait">
                            {addingGroup ? (
                                <NewGroupForm
                                    key="form"
                                    isDark={isDark}
                                    onSave={handleAddGroup}
                                    onCancel={() => setAddingGroup(false)}
                                />
                            ) : (
                                <motion.button
                                    key="trigger"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setAddingGroup(true)}
                                    className={cn(
                                        'flex items-center gap-2.5 w-full px-4 py-3 rounded-[18px] border border-dashed text-[12px] font-semibold transition-all duration-150',
                                        isDark
                                            ? 'border-[#252525] text-[#333] hover:border-[#363636] hover:text-[#777] hover:bg-white/[0.02]'
                                            : 'border-[#e3e3e3] text-[#c0c0c0] hover:border-[#c8c8c8] hover:text-[#555] hover:bg-black/[0.01]'
                                    )}
                                >
                                    <div className={cn(
                                        'w-5 h-5 rounded-full flex items-center justify-center shrink-0 border',
                                        isDark ? 'border-[#333]' : 'border-[#ddd]'
                                    )}>
                                        <Plus size={9} strokeWidth={3} />
                                    </div>
                                    New group
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Context menu */}
                {ctxMenu && (
                    <ContextMenu
                        menu={ctxMenu}
                        isDark={isDark}
                        onAction={handleCtxAction}
                        onClose={() => setCtxMenu(null)}
                        tasks={tasks}
                        groups={groups}
                        projectId={projectId}
                    />
                )}

                {/* Drag overlay */}
                <DragOverlay dropAnimation={null}>
                    {activeTask ? (
                        <div className="rotate-[1.5deg] scale-[1.02] opacity-95">
                            <TaskCard task={activeTask} isDark={isDark} onCtx={() => {}} onAction={() => {}} />
                        </div>
                    ) : activeGroup ? (
                        <div
                            className="w-[268px] rounded-[18px] overflow-hidden shadow-2xl ring-2 ring-primary/30 scale-[1.02] opacity-90"
                            style={{ background: activeGroup.color || '#374151' }}
                        >
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.2) 0%, transparent 70%)' }}
                            />
                            <div className="flex items-center justify-center pt-5 pb-[10px] px-4">
                                <div className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-full" style={{ background: 'rgba(0,0,0,0.20)' }}>
                                    <AlignLeft size={11} className="text-white/70" />
                                    <span className="text-[11.5px] font-bold text-white">{activeGroup.name}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between px-3.5 py-[9px]" style={{ background: 'rgba(0,0,0,0.22)' }}>
                                <div className="flex items-center gap-2">
                                    <div className="w-[6px] h-[6px] rounded-full bg-white/35" />
                                    <span className="text-[10.5px] font-semibold text-white/55">{activeGroup.name}</span>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
