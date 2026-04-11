"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, X, MoreHorizontal, GripVertical, CheckSquare, Square,
    Flag, Calendar, Trash2, Edit3, AlignLeft, CheckCircle2, PlayCircle, Eye, Inbox, RotateCcw
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

// ─── Constants ──────────────────────────────────────────────────────────────

export const PRIORITY_MAP: Record<TaskPriority, { color: string; label: string }> = {
    none:   { color: '#6b7280', label: 'None'   },
    low:    { color: '#22c55e', label: 'Low'    },
    medium: { color: '#f59e0b', label: 'Medium' },
    high:   { color: '#ef4444', label: 'High'   },
    urgent: { color: '#ec4899', label: 'Urgent' },
};

export const KANBAN_COLS = [
    { status: 'todo' as TaskStatus, label: 'To Do', accent: '#374151' },
    { status: 'doing' as TaskStatus, label: 'Doing', accent: '#3b82f6' },
    { status: 'review' as TaskStatus, label: 'Review', accent: '#f97316' },
    { status: 'done' as TaskStatus, label: 'Done', accent: '#22c55e' },
];

export const STATUS_ICON_MAP: Record<TaskStatus, React.ReactNode> = {
    todo:     <MoreHorizontal size={13} className="text-[#888]" />,
    doing:    <PlayCircle size={13} className="text-blue-500" />,
    review:   <Eye size={13} className="text-orange-500" />,
    done:     <CheckCircle2 size={13} className="text-green-500" />,
};

const GROUP_COLORS = [
    '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#6366F1', 
    '#3B82F6', '#06B6D4', '#10B981', '#22C55E', '#71717A'
];

function shortId(id: string) { return `#${id.slice(-3).toUpperCase()}`; }
function fmtMd(d: string | null | undefined) {
    if (!d) return null;
    const dt = new Date(d);
    return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
}

type CtxMenuState = { x: number; y: number; id: string; type: 'task' | 'group' } | null;

// ─── Context Menu ─────────────────────────────────────────────────────────────

function ContextMenu({ menu, isDark, onAction, onClose, tasks, groups, projectId }: {
    menu: NonNullable<CtxMenuState>; isDark: boolean;
    onAction: (action: string, type: 'task' | 'group', id: string) => void;
    onClose: () => void;
    tasks: ProjectTask[];
    groups: ProjectTaskGroup[];
    projectId: string;
}) {
    const menuRef = useRef<HTMLDivElement>(null);
    const { updateTaskGroup } = useProjectStore();

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const [pos, setPos] = useState({ x: menu.x, y: menu.y });
    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const x = Math.min(menu.x, window.innerWidth - rect.width - 8);
            const y = Math.min(menu.y, window.innerHeight - rect.height - 8);
            setPos({ x, y });
        }
    }, [menu.x, menu.y]);

    const group = menu.type === 'group' ? groups.find(g => g.id === menu.id) : null;
    const menuBg = isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-white border-[#e8e8e8]';

    const mi = (label: string, icon: React.ReactNode, action: string, danger = false) => (
        <button key={action} onClick={() => { onAction(action, menu.type, menu.id); onClose(); }}
            className={cn('w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-medium text-left transition-colors rounded-lg',
                danger ? isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'
                : isDark ? 'text-[#ccc] hover:bg-white/5 hover:text-white' : 'text-[#444] hover:bg-[#f5f5f5] hover:text-[#111]'
            )}>
            {icon} {label}
        </button>
    );

    const divider = <div className={cn('my-1 border-t', isDark ? 'border-[#252525]' : 'border-[#efefef]')}/>;

    return (
        <div ref={menuRef} className={cn('fixed z-50 rounded-xl border shadow-2xl p-1.5 min-w-[190px]', menuBg)}
            style={{ left: pos.x, top: pos.y }} onContextMenu={e => e.preventDefault()}>
            
            {menu.type === 'task' && (
                <>
                    {mi('Open details', <Eye size={13}/>, 'open')}
                    {mi('Edit', <Edit3 size={13}/>, 'edit')}
                    {divider}
                    {mi('Delete task', <Trash2 size={13}/>, 'delete', true)}
                </>
            )}

            {menu.type === 'group' && group && (
                <>
                    {mi('Rename group', <Edit3 size={13}/>, 'rename')}
                    {divider}
                    <div className="px-3 py-2">
                        <div className="flex items-center justify-between mb-2">
                            <p className={cn('text-[9px] font-bold uppercase tracking-widest', isDark ? 'text-[#444]' : 'text-[#bbb]')}>Group Color</p>
                            <button onClick={() => { updateTaskGroup(group.id, projectId, { color: '' }); onClose(); }} 
                                title="Reset to default"
                                className={cn('p-1 rounded hover:bg-black/5 hover:text-primary transition-colors', isDark ? 'text-[#333] hover:bg-white/5' : 'text-[#bbb]')}>
                                <RotateCcw size={11} strokeWidth={2.5} />
                            </button>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {GROUP_COLORS.map(c => (
                                <button key={c} onClick={() => { updateTaskGroup(group.id, projectId, { color: c }); onClose(); }}
                                    className={cn('w-4.5 h-4.5 rounded-full transition-all hover:scale-125 border border-white/10 shadow-sm', 
                                        group.color === c ? (isDark ? 'ring-1 ring-white' : 'ring-1 ring-black') + ' ring-offset-1 ring-offset-transparent scale-110' : 'opacity-80')}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>
                    {divider}
                    {mi('Delete group', <Trash2 size={13}/>, 'delete', true)}
                </>
            )}
        </div>
    );
}

// ─── Task Card (Sortable) ─────────────────────────────────────────────────────

function TaskCard({ task, isDark, onCtx, onAction }: {
    task: ProjectTask; isDark: boolean; onCtx: (e: React.MouseEvent, id: string, type: 'task'|'group') => void; onAction: (a: string, t: ProjectTask) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: 'task' } });
    const { updateTask } = useProjectStore();
    const style = { transform: CSS.Translate.toString(transform), transition };
    const pri = PRIORITY_MAP[task.priority];
    const isDone = task.status === 'done';
    const statusIcon = STATUS_ICON_MAP[task.status];
    const priColor = pri.color;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            onContextMenu={e => onCtx(e, task.id, 'task')}
            className={cn(
                "rounded-xl border cursor-pointer select-none group/card transition-all duration-150 relative overflow-hidden",
                isDragging ? "opacity-30 scale-95 shadow-2xl ring-2 ring-primary/30 z-20" : "",
                isDark
                    ? "bg-[#1d1d1d] border-[#282828] hover:border-[#3a3a3a] hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                    : "bg-white border-[#e8e8e8] hover:border-[#ccc] hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] shadow-sm shadow-black/[0.03]"
            )}
            onClick={() => onAction('open', task)}
        >
            {/* Left priority stripe */}
            {task.priority !== 'none' && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: priColor }} />
            )}

            <div className="flex items-start gap-2 pl-4 pr-3 py-3">
                {/* Drag handle */}
                <div
                    {...listeners}
                    className="mt-0.5 shrink-0 opacity-0 group-hover/card:opacity-30 hover:!opacity-80 cursor-grab active:cursor-grabbing transition-opacity"
                    onClick={e => e.stopPropagation()}
                >
                    <GripVertical size={12} className={isDark ? "text-[#888]" : "text-[#bbb]"} />
                </div>

                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <p className={cn(
                        "text-[12.5px] font-semibold leading-snug pr-10 mb-2",
                        isDone
                            ? isDark ? "line-through text-[#444]" : "line-through text-[#bbb]"
                            : isDark ? "text-[#ddd]" : "text-[#1a1a1a]"
                    )}>
                        {task.title}
                    </p>

                    {/* Meta chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* ID + Status */}
                        <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums",
                            isDark ? "bg-white/[0.05] text-[#666]" : "bg-[#f5f5f5] text-[#999]"
                        )}>
                            {statusIcon} {shortId(task.id)}
                        </span>

                        {/* Description indicator */}
                        {task.description && (
                            <span className={cn("flex items-center", isDark ? "text-[#444]" : "text-[#ccc]")}>
                                <AlignLeft size={10} />
                            </span>
                        )}

                        {/* Priority chip */}
                        {task.priority !== 'none' && (
                            <span
                                className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                                style={{ color: priColor, background: `${priColor}18` }}
                            >
                                <Flag size={8} /> {pri.label}
                            </span>
                        )}

                        {/* Due date */}
                        {task.due_date && (
                            <span className={cn(
                                "inline-flex items-center gap-0.5 text-[10px] font-medium",
                                isDark ? "text-[#555]" : "text-[#aaa]"
                            )}>
                                <Calendar size={8} /> {fmtMd(task.due_date)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Hover action buttons */}
            <div className={cn(
                "absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover/card:opacity-100 transition-all z-10",
                isDone && "opacity-100"
            )}>
                <button
                    onClick={e => { e.stopPropagation(); onCtx(e, task.id, 'task'); }}
                    className={cn("w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
                        isDark ? "hover:bg-white/[0.10] text-[#555] hover:text-[#aaa]" : "hover:bg-black/[0.06] text-[#ccc] hover:text-[#888]")}
                >
                    <MoreHorizontal size={13} />
                </button>
                <button
                    onClick={e => { e.stopPropagation(); updateTask(task.id, task.project_id, { status: isDone ? 'todo' : 'done' }); }}
                    className={cn("w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
                        isDone
                            ? "text-emerald-500 hover:bg-emerald-500/10"
                            : isDark ? "hover:bg-white/[0.10] text-[#555] hover:text-white" : "hover:bg-black/[0.06] text-[#ccc] hover:text-[#555]")}
                >
                    {isDone ? <CheckSquare size={13} /> : <Square size={13} />}
                </button>
            </div>
        </div>
    );
}

// ─── Kanban Column (Task Group) ───────────────────────────────────────────────

function TaskGroupCol({ group, tasks, isDark, projectId, onCtx, onAction, forceEditing, onRenameDone }: {
    group: ProjectTaskGroup | null;
    tasks: ProjectTask[];
    isDark: boolean;
    projectId: string;
    onCtx: (e: React.MouseEvent, id: string, type: 'task'|'group') => void;
    onAction: (a: string, t: ProjectTask) => void;
    forceEditing?: boolean;
    onRenameDone?: () => void;
}) {
    const { updateTaskGroup, addTask } = useProjectStore();
    const [adding, setAdding] = useState(false);
    const [titleStr, setTitleStr] = useState('');
    const [saving, setSaving] = useState(false);
    
    // Group Rename state
    const [editing, setEditing] = useState(false);
    const [draft, setDraft]     = useState(group?.name || 'Group');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (forceEditing) {
            setEditing(true);
            setDraft(group?.name || '');
        }
    }, [forceEditing, group?.name]);

    const isUngrouped = !group;
    const sortId = isUngrouped ? 'ungrouped' : group.id;

    // Use Sortable for the Column itself
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
        id: sortId, 
        data: { type: 'group' },
        disabled: isUngrouped // Cannot drag the ungrouped column
    });

    const style = { transform: CSS.Translate.toString(transform), transition };

    // Derived theme details for this group
    const baseColor = group?.color || (isUngrouped ? '#6b7280' : '#374151');
    const headerBg = baseColor;
    const pillBg = isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)';

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
            project_id: projectId,
            task_group_id: isUngrouped ? null : group.id,
            title: titleStr.trim(),
            status: 'todo', // default for new tasks
            priority: 'none',
            position: tasks.length,
            custom_fields: {},
            is_archived: false,
        });
        setSaving(false);
        setTitleStr('');
        setAdding(false);
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("flex flex-col w-[260px] min-w-[260px] shrink-0 h-full", isDragging && "opacity-30 z-30")}>
            {/* Header Area */}
            <div
                className="rounded-xl mb-3 overflow-hidden shadow-sm shadow-black/5 relative group/col-header"
                style={{ background: headerBg }}
            >
                {/* Drag Handle & Context Menu Actions */}
                {!isUngrouped && (
                    <div className="absolute top-0 right-0 left-0 p-2 flex items-start justify-between z-10 opacity-0 group-hover/col-header:opacity-100 transition-opacity">
                        <div
                            {...listeners}
                            {...attributes}
                            className="w-6 h-6 flex items-center justify-center rounded cursor-grab active:cursor-grabbing hover:bg-white/20 text-white/80 hover:text-white"
                        >
                            <GripVertical size={13} />
                        </div>
                        <button
                            onClick={e => onCtx(e, group!.id, 'group')}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 text-white/80 hover:text-white"
                        >
                            <MoreHorizontal size={13} />
                        </button>
                    </div>
                )}

                <div 
                    className="flex flex-col items-center justify-center py-4 px-3"
                    onContextMenu={e => !isUngrouped && onCtx(e, group!.id, 'group')}
                >
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-1" style={{ background: pillBg }}>
                        {isUngrouped ? <Inbox size={13} className="text-white" /> : <AlignLeft size={13} className="text-white" />}
                        {editing ? (
                            <input
                                autoFocus
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                onBlur={commitRename}
                                onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setDraft(group!.name); setEditing(false); } }}
                                className="text-[12px] font-bold text-white tracking-wide bg-transparent outline-none w-24 border-b border-white/50 px-1 text-center"
                            />
                        ) : (
                            <span 
                                onDoubleClick={() => !isUngrouped && setEditing(true)} 
                                className="text-[12px] font-bold text-white tracking-wide select-none cursor-text"
                            >
                                {isUngrouped ? 'Ungrouped' : group.name}
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center justify-between gap-2 px-3 py-1.5" style={{ background: 'rgba(0,0,0,0.25)' }}>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/50 shrink-0" />
                        <span className="text-[10.5px] font-bold text-white/70 flex-1 truncate max-w-[150px]">{isUngrouped ? 'Ungrouped Tasks' : group.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-white/50 tabular-nums bg-white/10 px-1.5 py-0.5 rounded-md">{tasks.length}</span>
                </div>
            </div>

            {/* + Create task button */}
            <button
                onClick={() => setAdding(true)}
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-2 mb-3 rounded-lg text-[11px] font-bold transition-all shadow-sm border border-transparent group/add",
                    isDark ? "text-[#555] hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border-white/5 hover:border-white/10" 
                           : "text-[#888] hover:text-[#222] bg-black/[0.02] hover:bg-black/[0.04] border-black/5 hover:border-black/10"
                )}
            >
                <Plus size={12} className={isDark ? "text-[#555] group-hover/add:text-white transition-colors" : "text-[#aaa] group-hover/add:text-[#222] transition-colors"} /> Add task
            </button>

            {/* Task list source */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-6 min-h-[150px]">
                <AnimatePresence>
                    {adding && (
                        <motion.div
                            initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, scale: 0.95, height: 0 }}
                            className={cn("rounded-[8px] border p-2.5 mb-2 overflow-hidden", isDark ? "bg-[#1e1e1e] border-[#2e2e2e]" : "bg-white border-[#ddd] shadow-sm")}
                        >
                            <textarea
                                autoFocus
                                value={titleStr}
                                onChange={e => setTitleStr(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSaveTask(); } if (e.key === 'Escape') setAdding(false); }}
                                placeholder="What needs doing?"
                                rows={2}
                                className={cn("w-full bg-transparent text-[12.5px] outline-none resize-none", isDark ? "text-white placeholder:text-[#3a3a3a]" : "text-[#111] placeholder:text-[#ccc]")}
                            />
                            <div className="flex items-center gap-1.5 mt-2 justify-end">
                                <button onClick={() => setAdding(false)} className={cn("px-2 py-1.5 rounded-[6px] text-[10.5px] font-bold uppercase transition-colors", isDark ? "text-[#555] hover:text-[#999]" : "text-[#aaa] hover:text-[#777]")}>Cancel</button>
                                <button onClick={doSaveTask} disabled={saving} className="px-3 py-1.5 rounded-[6px] bg-primary text-black text-[11px] font-bold transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50">
                                    {saving ? '…' : 'Save'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-2 min-h-full">
                        {tasks.map(t => (
                            <TaskCard key={t.id} task={t} isDark={isDark} onCtx={onCtx} onAction={onAction} />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
}

// ─── Kanban Board Main ────────────────────────────────────────────────────────

interface KanbanBoardProps {
    projectId: string;
    projectColor: string;
    isDark: boolean;
    searchQuery: string;
    showArchived: boolean;
    onTaskClick: (task: ProjectTask) => void;
}

export default function KanbanBoard({ projectId, isDark, searchQuery, showArchived, onTaskClick }: KanbanBoardProps) {
    const { 
        tasksByProject, groupsByProject, fetchTasks, fetchTaskGroups, 
        addTaskGroup, reorderTask, reorderTaskGroup, deleteTask, deleteTaskGroup
    } = useProjectStore();

    const tasks  = tasksByProject[projectId] || [];
    const groups = useMemo(() => [...(groupsByProject[projectId] || [])].sort((a,b) => a.position - b.position), [groupsByProject, projectId]);

    const [activeId, setActiveId]         = useState<string | null>(null);
    const [activeType, setActiveType]     = useState<'task' | 'group' | null>(null);
    
    // Board-level add group inline input
    const [addingGroup, setAddingGroup]   = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const groupInputRef = useRef<HTMLInputElement>(null);

    const [ctxMenu, setCtxMenu] = useState<CtxMenuState>(null);
    const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);

    useEffect(() => {
        fetchTasks(projectId);
        fetchTaskGroups(projectId);
    }, [projectId, fetchTasks, fetchTaskGroups]);

    useEffect(() => {
        if (addingGroup) groupInputRef.current?.focus();
    }, [addingGroup]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (e: DragStartEvent) => {
        setActiveId(e.active.id as string);
        setActiveType(e.active.data.current?.type || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveType(null);
        if (!over || active.id === over.id) return;

        const type = active.data.current?.type;

        if (type === 'group') {
            const oldIndex = groups.findIndex(g => g.id === active.id);
            const newIndex = groups.findIndex(g => g.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                reorderTaskGroup(active.id as string, projectId, newIndex);
            }
        } else if (type === 'task') {
            const fromTask = tasks.find(t => t.id === active.id);
            const toTask   = tasks.find(t => t.id === over.id);
            
            if (fromTask && toTask) {
                if (fromTask.task_group_id !== toTask.task_group_id || fromTask.position !== toTask.position) {
                    reorderTask(fromTask.id, projectId, toTask.task_group_id || null, toTask.position);
                }
            } else if (fromTask && !toTask) {
                // Determine if they dropped into an empty group column.
                // active.id is the task, over.id is the group id.
                const destGroupId = (over.id as string);
                reorderTask(fromTask.id, projectId, destGroupId, 0); 
            }
        }
    };

    const handleAddGroup = async () => {
        const name = newGroupName.trim() || 'New Group';
        const randomColor = GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
        await addTaskGroup({ project_id: projectId, name, position: groups.length, color: randomColor });
        setNewGroupName('');
        setAddingGroup(false);
    };

    const handleCtxAction = (action: string, type: 'task' | 'group', id: string) => {
        if (type === 'task') {
            const t = tasks.find(x => x.id === id);
            if (!t) return;
            if (action === 'open' || action === 'edit') onTaskClick(t);
            if (action === 'delete') deleteTask(id, projectId);
        } else if (type === 'group') {
            if (action === 'rename') {
                setRenamingGroupId(id);
            }
            if (action === 'delete') {
                if (window.confirm(`Are you sure you want to delete the group "${groups.find(g => g.id === id)?.name}" and all its tasks?`)) {
                    deleteTaskGroup(id, projectId);
                }
            }
        }
    };

    const handleOpenCtx = (e: React.MouseEvent, id: string, type: 'task'|'group') => {
        e.preventDefault();
        e.stopPropagation();
        setCtxMenu({ x: e.clientX, y: e.clientY, id, type });
    };


    const activeTask     = activeType === 'task' ? tasks.find(t => t.id === activeId) : null;
    const activeGroup    = activeType === 'group' ? groups.find(g => g.id === activeId) : null;

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 flex items-start gap-5 no-scrollbar h-full"
                onContextMenu={e => { e.preventDefault(); setCtxMenu(null); }}
            >
                


                {/* Sortable Task Groups (Columns) */}
                <SortableContext items={groups.map(g => g.id)} strategy={horizontalListSortingStrategy}>
                    {groups.map(g => (
                        <TaskGroupCol
                            key={g.id}
                            group={g}
                            tasks={tasks.filter(t => t.task_group_id === g.id 
                                && (showArchived ? t.is_archived : !t.is_archived)
                                && (searchQuery ? t.title.toLowerCase().includes(searchQuery.toLowerCase()) : true)
                            ).sort((a,b) => a.position - b.position)}
                            isDark={isDark}
                            projectId={projectId}
                            onCtx={handleOpenCtx}
                            onAction={(a, t) => { if(a === 'open') onTaskClick(t); }}
                            forceEditing={renamingGroupId === g.id}
                            onRenameDone={() => setRenamingGroupId(null)}
                        />
                    ))}
                </SortableContext>

                {/* Create Task Group Trigger */}
                <div className="shrink-0 w-[260px]">
                    {addingGroup ? (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={cn("p-2 rounded-xl border shadow-sm", isDark ? "bg-[#1a1a1a] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]")}>
                            <input
                                ref={groupInputRef}
                                value={newGroupName}
                                onChange={e => setNewGroupName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleAddGroup(); if (e.key === 'Escape') setAddingGroup(false); }}
                                placeholder="Group name…"
                                className={cn("px-3 py-2 w-full rounded-lg text-[13px] outline-none font-bold mb-2 transition-colors", isDark ? "bg-white/[0.04] text-white border border-transparent focus:border-[#444]" : "bg-[#f5f5f5] text-[#111] border border-transparent focus:border-[#ccc]")}
                            />
                            <div className="flex gap-2">
                                <button onClick={handleAddGroup} className="flex-1 py-1.5 rounded-[8px] bg-primary text-black text-[12px] font-bold active:scale-95 transition-all">
                                    Save
                                </button>
                                <button onClick={() => setAddingGroup(false)} className={cn("px-3 py-1.5 rounded-[8px] transition-colors", isDark ? "bg-[#252525] text-[#aaa] hover:text-white" : "bg-[#f0f0f0] text-[#777] hover:text-[#111]")}>
                                    <X size={14} />
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <button
                            onClick={() => setAddingGroup(true)}
                            className={cn(
                                "flex items-center gap-2 w-full px-4 py-3 rounded-xl border text-[13px] font-bold transition-all h-12 shadow-sm whitespace-nowrap",
                                isDark ? "bg-[#141414] border-[#2e2e2e] text-[#666] hover:bg-[#1a1a1a] hover:text-[#eee] hover:border-[#444]" 
                                       : "bg-[#fafafa] border-[#e5e5e5] text-[#888] hover:bg-white hover:text-[#222] hover:border-[#ccc]"
                            )}
                        >
                            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", isDark ? "border-[#444]" : "border-[#ccc]")}>
                                <Plus size={10} strokeWidth={4} className={isDark ? "text-[#444]" : "text-[#ccc]"} />
                            </div>
                            <span className="flex-1 text-left opacity-80">Create task group</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Context Menu Render Portal */}
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

            {/* Drag Overlay overrides for aesthetics while dragging */}
            <DragOverlay dropAnimation={null}>
                {activeTask ? (
                    <TaskCard task={activeTask} isDark={isDark} onCtx={() => {}} onAction={() => {}} />
                ) : activeGroup ? (
                    <div className={cn("flex flex-col w-[260px] opacity-80 ring-2 ring-primary rounded-xl overflow-hidden shadow-2xl scale-105")}
                        style={{ background: activeGroup.color || '#374151' }}>
                        <div className="flex flex-col flex-1 pb-16 pt-5 px-4 items-center gap-2">
                             <span className="text-white font-bold tracking-wide text-[14px]">{activeGroup.name}</span>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
        </div>
    );
}
