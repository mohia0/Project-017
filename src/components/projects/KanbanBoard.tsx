"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, X, MoreHorizontal, CheckSquare, Square, Check,
    Flag, Calendar, Trash2, Edit3, CheckCircle2,
    PlayCircle, Eye, Inbox, RotateCcw, Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore, ProjectTask, ProjectTaskGroup, TaskStatus, TaskPriority } from '@/store/useProjectStore';
import {
    DndContext, closestCenter, PointerSensor, KeyboardSensor,
    useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent
} from '@dnd-kit/core';
import {
    SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';

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
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
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

function TaskCard({ task, isDark, onCtx, onAction, isFirst, isLast, isPreview }: {
    task: ProjectTask;
    isDark: boolean;
    onCtx: (e: React.MouseEvent, id: string, type: 'task' | 'group') => void;
    onAction: (a: string, t: ProjectTask) => void;
    isFirst?: boolean;
    isLast?: boolean;
    isPreview?: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: 'task' },
        disabled: isPreview,
    });
    const { updateTask } = useProjectStore();
    const style = { transform: CSS.Translate.toString(transform), transition };
    const pri   = PRIORITY_MAP[task.priority];
    const isDone = task.status === 'done';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...(!isPreview ? attributes : {})}
            {...(!isPreview ? listeners : {})}
            onContextMenu={e => !isPreview && onCtx(e, task.id, 'task')}
            onClick={() => onAction('open', task)}
            className={cn(
                'relative flex items-center select-none group/card transition-all duration-150 overflow-hidden',
                !isPreview && "cursor-pointer",
                isDragging
                    ? 'opacity-[0.05] scale-[0.98] z-20 rounded-[14px] bg-primary/5 border border-primary/20'
                    : isDark
                        ? 'hover:bg-white/[0.025]'
                        : 'hover:bg-[#f9f9f9]',
                isFirst && 'rounded-t-[14px]',
                isLast  && 'rounded-b-[14px]',
            )}
        >
            {/* Priority left accent */}
            {task.priority !== 'none' && (
                <div
                    className={cn(
                        'absolute left-0 top-[14px] bottom-[14px] w-[2.5px]',
                        isFirst && 'top-[8px]',
                        isLast  && 'bottom-[8px]',
                    )}
                    style={{ background: pri.color }}
                />
            )}

            <div className="flex items-center gap-2.5 pl-4 pr-3 py-[14px] flex-1">

                {/* Checkbox toggle - Hidden or disabled in preview */}
                {!isPreview && (
                    <button
                        onClick={e => {
                            e.stopPropagation();
                            updateTask(task.id, task.project_id, { status: isDone ? 'todo' : 'done' });
                        }}
                        className={cn(
                            'shrink-0 w-[16px] h-[16px] rounded-[5px] border flex items-center justify-center transition-all duration-200',
                            isDone
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : isDark
                                    ? 'border-white/10 hover:border-white/30'
                                    : 'border-black/10 hover:border-black/20'
                        )}
                    >
                        <AnimatePresence mode="wait">
                            {isDone && (
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                >
                                    <Check size={10} strokeWidth={3.5} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </button>
                )}

                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <p className={cn(
                        'text-[12.5px] font-semibold leading-relaxed',
                        isDone
                            ? isDark ? 'line-through text-[#383838]' : 'line-through text-[#c0c0c0]'
                            : isDark ? 'text-[#e0e0e0]' : 'text-[#1a1a1a]'
                    )}>
                        {task.title}
                    </p>

                    {/* Chips row */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {/* Status + ID chip */}
                        <span className={cn(
                            'inline-flex items-center gap-[5px] text-[9.5px] font-bold px-2 py-[3px] rounded-md tabular-nums',
                            isDark
                                ? 'bg-[#252525] text-[#4a4a4a] border border-[#2e2e2e]'
                                : 'bg-[#f0f0f0] text-[#aaa] border border-[#e8e8e8]'
                        )}>
                            {STATUS_ICON_MAP[task.status]}
                            {shortId(task.id)}
                        </span>
                        
                        {/* More chips... */}
                        {task.due_date && (
                             <span className={cn(
                                'inline-flex items-center gap-[3px] text-[9.5px] font-bold',
                                isDark ? 'text-[#4a4a4a]' : 'text-[#aaa]'
                            )}>
                                <Calendar size={8} strokeWidth={2.5} />
                                {fmtDate(task.due_date)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Hover actions - Hidden in preview */}
                {!isPreview && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 shrink-0">
                        <button
                            onClick={e => { e.stopPropagation(); onCtx(e, task.id, 'task'); }}
                            className={cn(
                                'w-6 h-6 flex items-center justify-center rounded-lg transition-colors',
                                isDark ? 'text-[#3a3a3a] hover:text-[#aaa] hover:bg-white/[0.07]' : 'text-[#d0d0d0] hover:text-[#777] hover:bg-black/[0.05]'
                            )}
                        >
                            <MoreHorizontal size={12} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}


// ─── Task Group Column ────────────────────────────────────────────────────────

function TaskGroupCol({ group, tasks, isDark, projectId, onCtx, onAction, forceEditing, onRenameDone, isPreview }: {
    group: ProjectTaskGroup;
    tasks: ProjectTask[];
    isDark: boolean;
    projectId: string;
    onCtx: (e: React.MouseEvent, id: string, type: 'task' | 'group') => void;
    onAction: (a: string, t: ProjectTask) => void;
    forceEditing?: boolean;
    onRenameDone?: () => void;
    isPreview?: boolean;
}) {
    const { updateTaskGroup, addTask } = useProjectStore();
    const [adding,   setAdding]   = useState(false);
    const [titleStr, setTitleStr] = useState('');
    const [saving,   setSaving]   = useState(false);
    const [editing,  setEditing]  = useState(false);
    const [draft,    setDraft]    = useState(group.name);
    const addFormRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (forceEditing) { setEditing(true); setDraft(group.name); }
    }, [forceEditing, group.name]);

    useEffect(() => {
        if (!adding) return;
        const h = (e: MouseEvent) => {
            if (addFormRef.current && !addFormRef.current.contains(e.target as Node)) setAdding(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [adding]);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: group.id,
        data: { type: 'group' },
        disabled: isPreview,
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
            task_group_id: group.id,
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

    const baseColor = group.color || '#374151';

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cn('flex flex-col w-[272px] min-w-[272px] shrink-0 h-full', isDragging && 'opacity-20 z-30')}
        >
            {/* ══ UNIFIED HEADER + CREATE TASK CARD ══ */}
            <div className={cn(
                'rounded-[18px] overflow-hidden border mb-3 shrink-0',
                isDark
                    ? 'bg-[#161616] border-[#232323]'
                    : 'bg-white border-[#e8e8e8] shadow-sm shadow-black/[0.04]'
            )}>
                {/* ─ Header row ─ */}
                <div
                    {...(!isPreview ? listeners : {})}
                    {...(!isPreview ? attributes : {})}
                    className={cn(
                        'relative flex items-center gap-2.5 px-3.5 py-3 select-none group/hdr overflow-hidden',
                        !isPreview ? 'cursor-grab active:cursor-grabbing' : ''
                    )}
                    onContextMenu={e => !isPreview && onCtx(e, group.id, 'group')}
                >
                    {/* Ambient color wash */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: `linear-gradient(125deg, ${baseColor}18 0%, ${baseColor}06 55%, transparent 100%)` }}
                    />
                    {/* Top accent line */}
                    <div
                        className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
                        style={{ background: `linear-gradient(90deg, ${baseColor} 0%, ${baseColor}00 75%)` }}
                    />

                    {/* Glowing color dot */}
                    <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 relative z-10"
                        style={{ background: baseColor, boxShadow: `0 0 0 3px ${baseColor}28` }}
                    />

                    {/* Name */}
                    <div className="flex-1 min-w-0 relative z-10">
                        {editing && !isPreview ? (
                            <input
                                autoFocus
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                onBlur={commitRename}
                                onKeyDown={e => {
                                    if (e.key === 'Enter')  commitRename();
                                    if (e.key === 'Escape') { setDraft(group.name); setEditing(false); }
                                }}
                                className={cn(
                                    'w-full text-[12.5px] font-bold bg-transparent outline-none border-b pb-px',
                                    isDark ? 'text-white border-white/20' : 'text-[#111] border-black/15'
                                )}
                            />
                        ) : (
                            <span
                                onDoubleClick={() => !isPreview && setEditing(true)}
                                className={cn(
                                    'block text-[12.5px] font-bold truncate leading-tight',
                                    isDark ? 'text-[#e0e0e0]' : 'text-[#111]'
                                )}
                            >
                                {group.name}
                            </span>
                        )}
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-1 shrink-0 relative z-10">
                        <span className={cn(
                            'text-[10px] font-bold tabular-nums min-w-[20px] h-[20px] px-1.5 rounded-[6px] flex items-center justify-center',
                            isDark ? 'bg-white/[0.07] text-[#555]' : 'bg-black/[0.05] text-[#aaa]'
                        )}>
                            {tasks.length}
                        </span>
                        {!isPreview && (
                            <button
                                onClick={e => { e.stopPropagation(); onCtx(e, group.id, 'group'); }}
                                className={cn(
                                    'w-6 h-6 flex items-center justify-center rounded-[7px] opacity-0 group-hover/hdr:opacity-100 transition-all',
                                    isDark
                                        ? 'text-[#444] hover:text-[#aaa] hover:bg-white/[0.08]'
                                        : 'text-[#ccc] hover:text-[#555] hover:bg-black/[0.06]'
                                )}
                            >
                                <MoreHorizontal size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* ─ Hairline divider ─ */}
                <div className={cn('h-px mx-3.5', isDark ? 'bg-[#1e1e1e]' : 'bg-[#f0f0f0]')} />

                {/* ─ Create task button — same card, unified unit ─ */}
                {!isPreview && (
                    <button
                        onClick={() => setAdding(true)}
                        className={cn(
                            'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11.5px] font-semibold transition-all group/add',
                            isDark
                                ? 'text-[#383838] hover:text-[#888] hover:bg-white/[0.025]'
                                : 'text-[#c4c4c4] hover:text-[#555] hover:bg-black/[0.018]'
                        )}
                    >
                        <div className={cn(
                            'w-[18px] h-[18px] rounded-[5px] flex items-center justify-center border transition-all',
                            isDark
                                ? 'border-[#2e2e2e] text-[#3a3a3a] group-hover/add:border-[#444] group-hover/add:text-[#888]'
                                : 'border-[#e0e0e0] text-[#ccc] group-hover/add:border-[#bbb] group-hover/add:text-[#555]'
                        )}>
                            <Plus size={10} strokeWidth={2.5} />
                        </div>
                        Create task
                    </button>
                )}
            </div>

            {/* ══ TASK LIST ══ */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-8 min-h-[100px]">
                <AnimatePresence>
                    {adding && (
                        <motion.div
                            key="add-form"
                            ref={addFormRef}
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
                    {tasks.length > 0 && (
                        <div className={cn(
                            'rounded-[16px] border overflow-hidden',
                            isDark
                                ? 'bg-[#161616] border-[#232323]'
                                : 'bg-white border-[#e8e8e8] shadow-sm shadow-black/[0.025]'
                        )}>
                            {tasks.map((t, i) => (
                                <React.Fragment key={t.id}>
                                    <TaskCard
                                        task={t}
                                        isDark={isDark}
                                        onCtx={onCtx}
                                        onAction={onAction}
                                        isFirst={i === 0}
                                        isLast={i === tasks.length - 1}
                                        isPreview={isPreview}
                                    />
                                    {i < tasks.length - 1 && (
                                        <div className={cn('mx-4 h-px', isDark ? 'bg-[#1e1e1e]' : 'bg-[#f4f4f4]')} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
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
    projectId:      string;
    projectColor:   string;
    isDark:         boolean;
    searchQuery:    string;
    showArchived:   boolean;
    filterPriority?: string;
    filterStatus?:   string;
    orderBy?:        'position' | 'priority' | 'due_date' | 'title';
    onTaskClick:    (task: ProjectTask) => void;
    isPreview?:     boolean;
    externalTasks?:  ProjectTask[];
    externalGroups?: ProjectTaskGroup[];
}

export default function KanbanBoard({ 
    projectId, isDark, searchQuery, showArchived,
    filterPriority = 'all', filterStatus = 'all', orderBy = 'position',
    onTaskClick, isPreview, externalTasks, externalGroups 
}: KanbanBoardProps) {
    const {
        tasksByProject, groupsByProject, fetchTasks, fetchTaskGroups,
        addTaskGroup, reorderTask, reorderTaskGroup, deleteTask, deleteTaskGroup,
    } = useProjectStore();

    const tasks  = useMemo(() => externalTasks || tasksByProject[projectId] || [], [externalTasks, tasksByProject, projectId]);
    const groups = useMemo(
        () => [...(externalGroups || groupsByProject[projectId] || [])].sort((a, b) => a.position - b.position),
        [externalGroups, groupsByProject, projectId]
    );

    const [localTasks, setLocalTasks] = useState<ProjectTask[]>([]);
    const [activeId,   setActiveId]   = useState<string | null>(null);
    const [activeType, setActiveType] = useState<'task' | 'group' | null>(null);
    const [addingGroup, setAddingGroup] = useState(false);
    const [ctxMenu,    setCtxMenu]    = useState<CtxMenuState>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<{ id: string, type: 'task' | 'group' } | null>(null);

    useEffect(() => {
        setLocalTasks(tasks);
    }, [tasks]);

    useEffect(() => {
        if (!isPreview) {
            fetchTasks(projectId);
            fetchTaskGroups(projectId);
        }
    }, [projectId, fetchTasks, fetchTaskGroups, isPreview]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (e: DragStartEvent) => {
        setActiveId(e.active.id as string);
        setActiveType(e.active.data.current?.type ?? null);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeData = active.data.current;
        const overData = over.data.current;

        if (activeData?.type === 'task') {
            const activeIdStr = active.id as string;
            const overIdStr = over.id as string;

            setLocalTasks(prev => {
                const activeTask = prev.find(t => t.id === activeIdStr);
                if (!activeTask) return prev;

                // If over a group column
                if (overData?.type === 'group') {
                    if (activeTask.task_group_id !== overIdStr) {
                        return prev.map(t => 
                            t.id === activeIdStr ? { ...t, task_group_id: overIdStr, position: 0 } : t
                        );
                    }
                } 
                // If over another task
                else {
                    const overTask = prev.find(t => t.id === overIdStr);
                    if (overTask && activeTask.task_group_id !== overTask.task_group_id) {
                        return prev.map(t => 
                            t.id === activeIdStr 
                                ? { ...t, task_group_id: overTask.task_group_id, position: overTask.position } 
                                : t
                        );
                    }
                }
                return prev;
            });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveType(null);
        if (!over) {
            setLocalTasks(tasksByProject[projectId] || []);
            return;
        }

        const type = active.data.current?.type;

        if (type === 'group') {
            const overId = over.id as string;
            let ni = groups.findIndex(g => g.id === overId);
            if (ni === -1) {
                const overTask = localTasks.find(t => t.id === overId);
                if (overTask) ni = groups.findIndex(g => g.id === overTask.task_group_id);
            }
            const oi = groups.findIndex(g => g.id === active.id);
            if (oi !== -1 && ni !== -1 && oi !== ni) reorderTaskGroup(active.id as string, projectId, ni);
        } else if (type === 'task') {
            const task = localTasks.find(t => t.id === active.id);
            if (task) {
                const overId = over.id as string;
                const overTask = localTasks.find(t => t.id === overId);
                
                if (overTask) {
                    reorderTask(task.id, projectId, overTask.task_group_id ?? null, overTask.position);
                } else {
                    // Over a group
                    reorderTask(task.id, projectId, overId, 0);
                }
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
            if (action === 'delete') {
                setPendingDelete({ id, type: 'task' });
            }
        } else if (type === 'group') {
            if (action === 'rename') setRenamingId(id);
            if (action === 'delete') {
                setPendingDelete({ id, type: 'group' });
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
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ zoom: 0.9 }}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div
                    className="flex-1 overflow-x-auto overflow-y-hidden px-5 py-5 flex items-start gap-4 no-scrollbar h-full"
                    onContextMenu={e => { e.preventDefault(); setCtxMenu(null); }}
                >
                    <SortableContext items={groups.map(g => g.id)} strategy={horizontalListSortingStrategy}>
                        {groups.map(g => {
                            const PRIORITY_ORDER: Record<string, number> = {
                                urgent: 4, high: 3, medium: 2, low: 1, none: 0
                            };

                            let colTasks = localTasks
                                .filter(t =>
                                    t.task_group_id === g.id
                                    && (showArchived ? t.is_archived : !t.is_archived)
                                    && (!searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                    && (filterPriority === 'all' || t.priority === filterPriority)
                                    && (filterStatus   === 'all' || t.status   === filterStatus)
                                );

                            // Apply ordering
                            if (orderBy === 'priority') {
                                colTasks = [...colTasks].sort((a, b) => (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0));
                            } else if (orderBy === 'due_date') {
                                colTasks = [...colTasks].sort((a, b) => {
                                    if (!a.due_date && !b.due_date) return 0;
                                    if (!a.due_date) return 1;
                                    if (!b.due_date) return -1;
                                    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                                });
                            } else if (orderBy === 'title') {
                                colTasks = [...colTasks].sort((a, b) => a.title.localeCompare(b.title));
                            } else {
                                colTasks = colTasks.sort((a, b) => a.position - b.position);
                            }

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
                                    isPreview={isPreview}
                                />
                            );
                        })}
                    </SortableContext>

                    {/* New group */}
                    {!isPreview && (
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
                    )}
                </div>

                {/* Context menu */}
                {ctxMenu && !isPreview && (
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
                {!isPreview && (
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
                )}
            </DndContext>

            {/* Delete Confirmation */}
            <DeleteConfirmModal 
                open={!!pendingDelete}
                onClose={() => setPendingDelete(null)}
                onConfirm={async () => {
                    if (pendingDelete) {
                        if (pendingDelete.type === 'task') {
                            await deleteTask(pendingDelete.id, projectId);
                        } else {
                            await deleteTaskGroup(pendingDelete.id, projectId);
                        }
                        setPendingDelete(null);
                    }
                }}
                title={pendingDelete?.type === 'task' ? "Delete Task" : "Delete Group"}
                description={pendingDelete?.type === 'task' 
                    ? "Are you sure you want to delete this task? This action cannot be undone."
                    : "Are you sure you want to delete this group? All tasks within this group will also be deleted."
                }
                isDark={isDark}
            />
        </div>
    );
}
