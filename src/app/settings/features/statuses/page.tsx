"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useSettingsStore, WorkspaceStatus } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { GripVertical, Plus, Trash2, Check, Info, Pencil, FileText, Receipt, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { gooeyToast } from 'goey-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tool = WorkspaceStatus['tool'];

const TABS: { key: Tool; label: string; icon: React.ReactNode }[] = [
    { key: 'proposals', label: 'Proposals', icon: <FileText size={14} /> },
    { key: 'invoices',  label: 'Invoices',  icon: <Receipt size={14} /> },
    { key: 'projects',  label: 'Projects',  icon: <FolderKanban size={14} /> },
];

// ─── ColorSwatch ──────────────────────────────────────────────────────────────

function ColorSwatch({ color, onChange }: { color: string; onChange: (c: string) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div
            className="w-7 h-7 rounded-lg shrink-0 cursor-pointer border border-black/10 dark:border-white/10 relative overflow-hidden transition-transform hover:scale-110 active:scale-95"
            style={{ backgroundColor: color }}
            onClick={() => inputRef.current?.click()}
            title="Click to change color"
        >
            <input
                ref={inputRef}
                type="color"
                value={color}
                onChange={e => onChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
        </div>
    );
}

// ─── StatusRow ────────────────────────────────────────────────────────────────

function StatusRow({
    status, isDark, isDragging, isDragOver,
    onDragStart, onDragOver, onDrop, onDragEnd,
    onChange, onDelete,
}: {
    status: WorkspaceStatus;
    isDark: boolean;
    isDragging: boolean;
    isDragOver: boolean;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onChange: (updates: Partial<WorkspaceStatus>) => void;
    onDelete: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [nameVal, setNameVal] = useState(status.name);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setNameVal(status.name); }, [status.name]);
    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
    useEffect(() => {
        if (confirmDelete) {
            const t = setTimeout(() => setConfirmDelete(false), 3000);
            return () => clearTimeout(t);
        }
    }, [confirmDelete]);

    const commitName = () => {
        const trimmed = nameVal.trim();
        if (trimmed && trimmed !== status.name) onChange({ name: trimmed });
        else setNameVal(status.name);
        setEditing(false);
    };

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            className={cn(
                'group flex items-center gap-3 px-4 py-3 transition-all duration-150',
                isDragOver && 'border-t-2 border-blue-500',
                isDragging && 'opacity-40 scale-[0.98]',
                isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.02]'
            )}
        >
            {/* Drag Handle */}
            <div className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 hover:!opacity-70 transition-opacity">
                <GripVertical size={15} />
            </div>

            {/* Color Swatch */}
            <ColorSwatch color={status.color} onChange={c => onChange({ color: c })} />

            {/* Preview badge */}
            <div
                className="hidden sm:flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide shrink-0"
                style={{ backgroundColor: `${status.color}22`, color: status.color }}
            >
                {status.name}
            </div>

            {/* Name editor */}
            <div className="flex-1 min-w-0">
                {editing ? (
                    <input
                        ref={inputRef}
                        value={nameVal}
                        onChange={e => setNameVal(e.target.value)}
                        onBlur={commitName}
                        onKeyDown={e => {
                            if (e.key === 'Enter') commitName();
                            if (e.key === 'Escape') { setNameVal(status.name); setEditing(false); }
                        }}
                        className={cn(
                            'w-full max-w-[180px] bg-transparent border-b-2 border-blue-500 outline-none text-sm font-medium py-0.5',
                            isDark ? 'text-white' : 'text-black'
                        )}
                    />
                ) : (
                    <button
                        onClick={() => setEditing(true)}
                        className={cn(
                            'text-sm font-medium text-left flex items-center gap-1.5 group/name',
                            isDark ? 'text-white/70' : 'text-black/70'
                        )}
                        title="Click to rename"
                    >
                        {status.name}
                        <Pencil size={11} className="opacity-0 group-hover/name:opacity-40 transition-opacity" />
                    </button>
                )}
            </div>

            {/* Active toggle */}
            <button
                onClick={() => onChange({ is_active: !status.is_active })}
                className={cn(
                    'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full transition-all shrink-0',
                    status.is_active
                        ? isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600'
                        : isDark ? 'bg-white/5 text-white/25' : 'bg-black/5 text-black/25'
                )}
            >
                {status.is_active ? 'Active' : 'Inactive'}
            </button>

            {/* Delete */}
            <button
                onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return; } onDelete(); }}
                title={confirmDelete ? 'Click again to confirm delete' : 'Delete'}
                className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-lg transition-all opacity-0 group-hover:opacity-100',
                    confirmDelete
                        ? 'bg-red-500/15 text-red-500 opacity-100'
                        : isDark
                            ? 'hover:bg-white/5 text-white/30 hover:text-white/70'
                            : 'hover:bg-black/5 text-black/30 hover:text-black/70'
                )}
            >
                <Trash2 size={13} />
            </button>
        </div>
    );
}

// ─── ToolStatusList ───────────────────────────────────────────────────────────

function ToolStatusList({ tool, isDark }: { tool: Tool; isDark: boolean }) {
    const { statuses, addStatus, updateStatus, deleteStatus, reorderStatuses } = useSettingsStore();
    const { activeWorkspaceId } = useUIStore();

    const toolStatuses = statuses.filter(s => s.tool === tool);
    const [localList, setLocalList] = useState<WorkspaceStatus[]>(() => 
        [...toolStatuses].sort((a, b) => a.position - b.position)
    );
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLocalList([...toolStatuses].sort((a, b) => a.position - b.position));
    }, [statuses, tool]);

    const hasOrderChanged =
        JSON.stringify(localList.map(s => s.id)) !==
        JSON.stringify([...toolStatuses].sort((a, b) => a.position - b.position).map(s => s.id));

    const handleChange = async (id: string, updates: Partial<WorkspaceStatus>) => {
        setLocalList(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        await updateStatus(id, updates);
    };

    const handleDelete = async (id: string) => {
        await deleteStatus(id);
        gooeyToast.success('Status removed');
    };

    const handleAdd = async () => {
        if (!activeWorkspaceId) return;
        const palette = ['#2196F3', '#FF9800', '#9C27B0', '#009688', '#F44336', '#607D8B', '#E91E63'];
        const color = palette[localList.length % palette.length];
        await addStatus(activeWorkspaceId, {
            tool,
            name: 'New Status',
            color,
            position: localList.length,
            is_active: true,
        });
        gooeyToast.success('Status added');
    };

    const handleSaveOrder = async () => {
        setIsSaving(true);
        const reordered = localList.map((s, i) => ({ ...s, position: i }));
        await reorderStatuses(tool, reordered);
        setIsSaving(false);
        gooeyToast.success('Order saved');
    };

    // Drag
    const handleDragStart = (idx: number) => setDraggedIdx(idx);
    const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
    const handleDrop = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === idx) return;
        const next = [...localList];
        const [moved] = next.splice(draggedIdx, 1);
        next.splice(idx, 0, moved);
        setLocalList(next.map((s, i) => ({ ...s, position: i })));
        setDraggedIdx(null);
        setDragOverIdx(null);
    };
    const handleDragEnd = () => { setDraggedIdx(null); setDragOverIdx(null); };

    return (
        <div className={cn(
            'w-full rounded-2xl overflow-hidden border shadow-sm',
            isDark ? 'bg-[#111] border-white/10' : 'bg-white border-black/10'
        )}>
            {/* Add row */}
            <button
                onClick={handleAdd}
                className={cn(
                    'w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b transition-colors',
                    isDark
                        ? 'border-white/5 text-white/40 hover:text-white hover:bg-white/[0.03]'
                        : 'border-black/5 text-black/40 hover:text-black hover:bg-black/[0.02]'
                )}
            >
                <div className={cn('w-5 h-5 rounded-md flex items-center justify-center', isDark ? 'bg-white/10' : 'bg-black/8')}>
                    <Plus size={12} strokeWidth={2.5} />
                </div>
                Add status
            </button>

            {/* Rows */}
            <div className="flex flex-col" style={{ borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                {localList.length === 0 ? (
                    <div className={cn('flex flex-col items-center justify-center py-12 gap-3', isDark ? 'text-white/20' : 'text-black/20')}>
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', isDark ? 'bg-white/5' : 'bg-black/5')}>
                            <Check size={18} />
                        </div>
                        <p className="text-sm font-medium">No statuses — add one above</p>
                    </div>
                ) : (
                    localList.map((status, idx) => (
                        <div key={status.id} className={cn('border-b last:border-b-0', isDark ? 'border-white/[0.04]' : 'border-black/[0.04]')}>
                            <StatusRow
                                status={status}
                                isDark={isDark}
                                isDragging={draggedIdx === idx}
                                isDragOver={dragOverIdx === idx}
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={e => handleDragOver(e, idx)}
                                onDrop={e => handleDrop(e, idx)}
                                onDragEnd={handleDragEnd}
                                onChange={updates => handleChange(status.id, updates)}
                                onDelete={() => handleDelete(status.id)}
                            />
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className={cn(
                'px-4 py-3 border-t flex items-center justify-between',
                isDark ? 'bg-[#0d0d0d] border-white/5' : 'bg-[#f9f9f9] border-black/5'
            )}>
                <span className={cn('text-xs', isDark ? 'text-white/25' : 'text-black/30')}>
                    {localList.length} status{localList.length !== 1 ? 'es' : ''}
                    {hasOrderChanged ? ' · unsaved order' : ''}
                </span>
                <button
                    onClick={handleSaveOrder}
                    disabled={!hasOrderChanged || isSaving}
                    className={cn(
                        'h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
                        hasOrderChanged && !isSaving
                            ? 'bg-black text-white dark:bg-white dark:text-black hover:opacity-80 active:scale-95'
                            : isDark ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-black/5 text-black/20 cursor-not-allowed'
                    )}
                >
                    {isSaving ? <span className="animate-pulse">Saving…</span> : <><Check size={11} strokeWidth={3} /> Save Order</>}
                </button>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatusesSettingsPage() {
    const { theme, activeWorkspaceId } = useUIStore();
    const isDark = theme === 'dark';
    const { fetchStatuses, hasFetched } = useSettingsStore();

    const [activeTab, setActiveTab] = useState<Tool>('proposals');

    useEffect(() => {
        if (activeWorkspaceId && !hasFetched['statuses']) {
            fetchStatuses(activeWorkspaceId);
        }
    }, [activeWorkspaceId, fetchStatuses, hasFetched]);

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8 px-4">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Statuses</h1>
                <p className={cn('text-sm mt-1', isDark ? 'text-white/50' : 'text-black/50')}>
                    Manage statuses per tool. Each tool has its own independent set.
                </p>
            </div>

            {/* Info */}
            <div className={cn(
                'flex items-start gap-3 px-4 py-3 rounded-xl border text-sm',
                isDark ? 'bg-blue-500/5 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'
            )}>
                <Info size={14} className="shrink-0 mt-0.5 opacity-70" />
                <span>
                    Drag the <strong>grip handle</strong> to reorder. Click a <strong>color swatch</strong> to change it.
                    Click a <strong>name</strong> to rename inline. Changes to color save instantly.
                </span>
            </div>

            {/* Tabs */}
            <div className={cn(
                'flex items-center gap-1 p-1 rounded-xl self-start',
                isDark ? 'bg-white/5' : 'bg-black/5'
            )}>
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                            activeTab === tab.key
                                ? isDark
                                    ? 'bg-white/10 text-white shadow-sm'
                                    : 'bg-white text-black shadow-sm'
                                : isDark
                                    ? 'text-white/40 hover:text-white/70'
                                    : 'text-black/40 hover:text-black/70'
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Active tool status list — always shown (store pre-seeds defaults) */}
            <ToolStatusList key={activeTab} tool={activeTab} isDark={isDark} />
        </div>
    );
}
