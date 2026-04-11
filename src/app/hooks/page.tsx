"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    Zap, Plus, Search, LayoutGrid, List, Copy,
    Trash2, Check, X, CheckSquare, Link2, Globe, FileText,
    MoreHorizontal, Radio, Activity, ExternalLink, Edit2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHookStore, Hook } from '@/store/useHookStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { ColorisInput } from '@/components/ui/ColorisInput';
import { gooeyToast } from 'goey-toast';

/* ─── Helpers ──────────────────────────────────────────────────────── */
function getBaseUrl() {
    if (typeof window !== 'undefined') return window.location.origin;
    return process.env.NEXT_PUBLIC_SITE_URL || '';
}

function buildPixelUrl(hookId: string) {
    return `${getBaseUrl()}/api/h/${hookId}`;
}

function buildEmbedCode(hookId: string) {
    const src = buildPixelUrl(hookId);
    return `<img src="${src}" width="1" height="1" style="display:none;width:1px;height:1px;border:0;" alt="" />`;
}

function timeAgo(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const day = Math.floor(h / 24);
    if (day < 30) return `${day}d ago`;
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ─── FormField (Same as single edit panels) ─────────────────────────── */
function FormField({
    label, icon, value, onChange, type = 'text', placeholder = '', isDark, autoFocus
}: {
    label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void;
    type?: string; placeholder?: string; isDark: boolean; autoFocus?: boolean;
}) {
    return (
        <div className={cn(
            "w-full rounded-xl border px-4 py-3 text-[13px] transition-all focus-within:ring-2",
            isDark
                ? "bg-[#1c1c1c] border-[#2e2e2e] focus-within:ring-[#333] focus-within:border-[#444]"
                : "bg-white border-[#e0e0e0] focus-within:ring-[#e8e8e8] focus-within:border-[#ccc]"
        )}>
            <div className="flex items-center gap-1.5 mb-0.5">
                <span className={cn("opacity-40", isDark ? "text-white" : "text-[#333]")}>{icon}</span>
                <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>{label}</span>
            </div>
            <input
                autoFocus={autoFocus}
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    "bg-transparent outline-none text-[13px] w-full",
                    isDark ? "text-white placeholder:text-[#555]" : "text-[#111] placeholder:text-[#bbb]"
                )}
            />
        </div>
    );
}

/* ─── Hook Editor Modal ─────────────────────────────────────────────── */
function HookEditorModal({
    isDark,
    onClose,
    onSaved,
    initial,
}: {
    isDark: boolean;
    onClose: () => void;
    onSaved: (hook: Hook) => void;
    initial?: Hook;
}) {
    const [name, setName] = useState(initial?.name ?? '');
    const [title, setTitle] = useState(initial?.title ?? 'Someone opened your page');
    const [link, setLink] = useState(initial?.link ?? '');
    const [color, setColor] = useState(initial?.color ?? '#4dbf39');
    const [saving, setSaving] = useState(false);
    const { addHook, updateHook } = useHookStore();

    const handleSave = async () => {
        if (!name.trim()) {
            gooeyToast.error('Please enter a hook name');
            return;
        }
        setSaving(true);
        try {
            if (initial) {
                await updateHook(initial.id, { 
                    name: name.trim(), 
                    title: title.trim(), 
                    link: link.trim() || null,
                    color 
                });
                const updated = { ...initial, name: name.trim(), title: title.trim(), link: link.trim() || null, color };
                gooeyToast.success('Hook updated');
                onSaved(updated as Hook);
            } else {
                const hook = await addHook({ 
                    name: name.trim(), 
                    title: title.trim(), 
                    link: link.trim() || null,
                    color 
                });
                if (hook) {
                    gooeyToast.success('Hook created');
                    onSaved(hook);
                } else {
                    gooeyToast.error('Failed to create hook');
                }
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={cn(
                "w-full max-w-[480px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200",
                isDark ? "bg-[#161616] border border-[#252525]" : "bg-[#f7f7f7] border border-[#e0e0e0]"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                    <h2 className={cn("text-[17px] font-bold tracking-tight flex items-center gap-2", isDark ? "text-white" : "text-[#111]")}>
                        <Zap size={16} className="text-primary" fill="currentColor" />
                        {initial ? 'Edit Hook' : 'New Hook'}
                    </h2>
                    <button
                        onClick={onClose}
                        className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                            isDark ? "bg-[#252525] text-[#666] hover:text-[#ccc]" : "bg-[#e8e8e8] text-[#888] hover:text-[#333]"
                        )}
                    >
                        <X size={14} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 pb-5 flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto">
                    <FormField
                        isDark={isDark}
                        autoFocus
                        label="Hook name *"
                        icon={<Zap size={11} fill="currentColor" />}
                        value={name}
                        onChange={setName}
                        placeholder="e.g. Website tracker"
                    />

                    <FormField
                        isDark={isDark}
                        label="Notification title"
                        icon={<FileText size={11} />}
                        value={title}
                        onChange={setTitle}
                        placeholder="Someone opened your page"
                    />

                    <FormField
                        isDark={isDark}
                        label="Placement URL (optional)"
                        icon={<Globe size={11} />}
                        value={link}
                        onChange={setLink}
                        placeholder="https://example.com"
                    />

                    <div className="flex flex-col gap-1.5 px-1 mt-1">
                        <span className={cn("text-[11px] font-semibold opacity-40", isDark ? "text-white" : "text-[#333]")}>Display Color</span>
                        <ColorisInput 
                            value={color}
                            onChange={setColor}
                            isDark={isDark}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className={cn(
                    "flex items-center justify-between px-5 py-4 border-t",
                    isDark ? "border-[#252525] bg-[#111]" : "border-[#e8e8e8] bg-white"
                )}>
                    <button
                        onClick={onClose}
                        className={cn(
                            "px-4 py-2 text-[13px] font-medium rounded-xl transition-colors",
                            isDark ? "text-[#777] hover:text-[#ccc] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]"
                        )}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl bg-primary hover:bg-primary-hover text-black transition-colors disabled:opacity-60"
                    >
                        {saving ? 'Saving...' : (initial ? 'Save changes' : 'Create hook')}
                        {/* No chevron here as it's an inline edit, but matches the green button vibe if primary */}
                    </button>
                </div>
            </div>
        </div>
    );
}


/* ─── Hook Card (Grid View) ─────────────────────────────────────────── */
function HookCard({
    hook, isDark, isSelected, onToggle, onEdit, onDelete, onShowEmbed,
}: {
    hook: Hook; isDark: boolean; isSelected: boolean;
    onToggle: () => void; onEdit: () => void; onDelete: () => void; onShowEmbed: () => void;
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            onClick={onShowEmbed}
            className={cn(
                'relative rounded-2xl border cursor-pointer transition-all duration-150 group overflow-hidden select-none',
                isDark ? 'bg-[#1a1a1a]' : 'bg-white',
                isSelected
                    ? 'border-primary/40 ring-1 ring-primary/20'
                    : isDark
                        ? 'border-[#252525] hover:border-[#333] hover:bg-[#1c1c1c]'
                        : 'border-transparent shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]'
            )}
        >
            {/* Accent bar */}
            <div 
                className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity" 
                style={{ 
                    background: `linear-gradient(to right, ${hook.color}99, ${hook.color}4D, transparent)` 
                }}
            />

            {/* Top actions (checkbox + delete) */}
            <div className="absolute top-2 right-2 flex items-center gap-0.5 z-10">
                <div
                    className={cn('transition-all cursor-pointer', isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                    onClick={e => { e.stopPropagation(); onToggle(); }}
                >
                    <div className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors">
                        <div className={cn('w-[14px] h-[14px] rounded-[3px] border flex items-center justify-center transition-all',
                            isSelected ? 'bg-primary border-primary' : isDark ? 'border-white/20 bg-black/20' : 'border-[#ccc] bg-white/80')}>
                            {isSelected && <Check size={9} strokeWidth={3} className="text-black" />}
                        </div>
                    </div>
                </div>
                {!isSelected && (
                    <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5">
                        <Tooltip content="Edit" side="bottom">
                            <button onClick={e => { e.stopPropagation(); onEdit(); }} className={cn('p-1.5 rounded-lg transition-colors', isDark ? 'text-[#444] hover:text-white hover:bg-white/5' : 'text-[#ccc] hover:text-[#333] hover:bg-black/5')}>
                                <Edit2 size={11} />
                            </button>
                        </Tooltip>
                        <Tooltip content="Delete" side="bottom">
                            <button onClick={e => { e.stopPropagation(); onDelete(); }} className={cn('p-1.5 rounded-lg transition-colors', isDark ? 'text-[#444] hover:text-red-500 hover:bg-red-500/10' : 'text-[#ccc] hover:text-red-500 hover:bg-red-50')}>
                                <Trash2 size={11} />
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>

            <div className="p-4 pb-3">
                {/* Icon + name */}
                <div className="flex items-start gap-3 mb-3 pr-16">
                <div 
                    className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0')}
                    style={{ backgroundColor: `${hook.color}${isDark ? '1A' : '15'}` }}
                >
                    <Zap size={16} style={{ color: hook.color }} fill="currentColor" />
                </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                        <p className={cn('text-[13px] font-bold truncate leading-tight', isDark ? 'text-white' : 'text-[#111]')}>{hook.name}</p>
                        <p className={cn('text-[11px] truncate mt-0.5 leading-tight', isDark ? 'text-[#555]' : 'text-[#bbb]')}>{hook.title}</p>
                    </div>
                </div>

                {/* Placement URL */}
                {hook.link ? (
                    <div className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-3', isDark ? 'bg-white/[0.03]' : 'bg-[#f4f4f4]')}>
                        <Globe size={10} className={cn(isDark ? 'text-[#555]' : 'text-[#bbb]')} />
                        <span className={cn('text-[11px] truncate', isDark ? 'text-[#666]' : 'text-[#999]')}>{hook.link}</span>
                    </div>
                ) : (
                    <div className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-3', isDark ? 'bg-white/[0.02]' : 'bg-[#f7f7f7]')}>
                        <Link2 size={10} className={cn(isDark ? 'text-[#333]' : 'text-[#ddd]')} />
                        <span className={cn('text-[11px] italic', isDark ? 'text-[#3a3a3a]' : 'text-[#ccc]')}>No placement URL</span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className={cn('flex items-center justify-between px-4 py-2.5 border-t', isDark ? 'border-[#222]' : 'border-[#f0f0f0]')}>
                <div className="flex items-center gap-1.5">
                    <Activity size={11} className={cn(isDark ? 'text-[#555]' : 'text-[#ccc]')} />
                    <span className={cn('text-[11px] font-medium', isDark ? 'text-[#555]' : 'text-[#bbb]')}>
                        {hook.event_count ?? 0} trigger{(hook.event_count ?? 0) !== 1 ? 's' : ''}
                    </span>
                </div>
                <span className={cn('text-[10px]', isDark ? 'text-[#3a3a3a]' : 'text-[#ccc]')}>{timeAgo(hook.created_at)}</span>
            </div>
        </motion.div>
    );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function HooksPage() {
    const { hooks, fetchHooks, deleteHook, bulkDeleteHooks, isLoading } = useHookStore();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const [search, setSearch] = useState('');
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editorHook, setEditorHook] = useState<Hook | 'new' | null>(null);
    const { openRightPanel, rightPanel, closeRightPanel } = useUIStore();

    useEffect(() => { fetchHooks(); }, [fetchHooks]);

    const filtered = hooks.filter(h =>
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.title.toLowerCase().includes(search.toLowerCase()) ||
        (h.link ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const toggleRow = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(h => h.id)));
    };

    /* Theme tokens */
    const gridBg = isDark ? 'bg-[#141414]' : 'bg-[#f7f7f7]';
    const border = isDark ? 'border-[#252525]' : 'border-transparent';
    const muted = isDark ? 'text-[#555]' : 'text-[#aaa]';

    /* ── Skeleton ── */
    const SkeletonCard = () => (
        <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'bg-[#1a1a1a] border-[#252525]' : 'bg-white border-transparent shadow-sm pointer-events-none')}>
            <div className="p-4 pb-3">
                <div className="flex items-start gap-3 mb-3">
                    <div className={cn('w-9 h-9 rounded-xl animate-pulse', isDark ? 'bg-white/[0.06]' : 'bg-black/[0.05]')} />
                    <div className="flex-1 pt-0.5 space-y-2">
                        <div className={cn('h-3 w-32 rounded animate-pulse', isDark ? 'bg-white/[0.06]' : 'bg-black/[0.05]')} />
                        <div className={cn('h-2.5 w-44 rounded animate-pulse', isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]')} />
                    </div>
                </div>
                <div className={cn('h-7 rounded-lg animate-pulse', isDark ? 'bg-white/[0.03]' : 'bg-black/[0.03]')} />
            </div>
            <div className={cn('flex items-center justify-between px-4 py-2.5 border-t', isDark ? 'border-[#222]' : 'border-[#f0f0f0]')}>
                <div className={cn('h-2.5 w-16 rounded animate-pulse', isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]')} />
                <div className={cn('h-2.5 w-12 rounded animate-pulse', isDark ? 'bg-white/[0.04]' : 'bg-black/[0.03]')} />
            </div>
        </div>
    );

    return (
        <div className={cn('flex flex-col h-full overflow-hidden font-sans text-[13px]', isDark ? 'bg-[#141414] text-[#e5e5e5]' : 'bg-[#f7f7f7] text-[#111]')}>

            {/* ── Page Header ── */}
            <div className={cn('hidden md:flex items-center justify-between px-5 py-3 shrink-0', isDark ? 'bg-[#141414] border-b border-[#252525]' : 'bg-white')}>
                <div className="flex items-center gap-2">
                    <h1 className="text-[15px] font-semibold tracking-tight">Hook Generator</h1>
                    {hooks.length > 0 && (
                        <span className={cn('text-[11px] px-1.5 py-0.5 rounded-md font-semibold', isDark ? 'bg-white/[0.06] text-[#666]' : 'bg-[#f0f0f0] text-[#aaa]')}>
                            {hooks.length}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => {
                        useUIStore.getState().setCreateModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-[8px] bg-primary hover:bg-primary-hover text-black transition-colors"
                >
                    <Plus size={13} strokeWidth={2.5} />
                    New Hook
                </button>
            </div>

            {/* ── Toolbar ── */}
            <div className={cn('flex items-center gap-0 px-3 md:px-4 py-1.5 shrink-0 overflow-x-auto no-scrollbar', isDark ? 'bg-[#141414] border-b border-[#252525]' : 'bg-[#f7f7f7]')}>

                {/* Search */}
                <div className="relative mr-1.5">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 opacity-40" size={11} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search hooks…"
                        className={cn(
                            'pl-6 pr-3 py-1 text-[11px] rounded border focus:outline-none w-28 transition-all focus:w-44',
                            isDark
                                ? 'bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-white/20'
                                : 'bg-[#f5f5f5] border-[#e0e0e0] text-[#111] placeholder:text-[#aaa] focus:border-[#ccc]'
                        )}
                    />
                </div>

                <div className="flex-1" />

                {/* Bulk actions */}
                <AnimatePresence>
                    {selectedIds.size > 0 && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className={cn('flex items-center gap-1.5 px-3 py-1 rounded-xl border mr-2', isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-[#f8f8f8] border-[#e8e8e8]')}
                        >
                            <span className={cn('text-[11px] font-semibold mr-1', isDark ? 'text-[#aaa]' : 'text-[#666]')}>{selectedIds.size} selected</span>
                            <div className={cn('w-[1px] h-3', isDark ? 'bg-[#333]' : 'bg-[#ddd]')} />

                            <Tooltip content="Delete" side="bottom">
                                <button onClick={() => setDeletingId('bulk')} className="px-1.5 py-0.5 rounded transition-colors text-red-500/70 hover:text-red-500 hover:bg-red-500/10">
                                    <Trash2 size={11} />
                                </button>
                            </Tooltip>

                            {selectedIds.size >= 2 && (
                                <Tooltip content={selectedIds.size === filtered.length ? 'Deselect all' : 'Select all'} side="bottom">
                                    <button onClick={toggleAll} className={cn('px-1.5 py-0.5 rounded transition-colors', isDark ? 'text-[#777] hover:text-white hover:bg-white/5' : 'text-[#888] hover:text-[#333] hover:bg-[#ececec]')}>
                                        <CheckSquare size={11} />
                                    </button>
                                </Tooltip>
                            )}
                            <div className={cn('w-[1px] h-3', isDark ? 'bg-[#333]' : 'bg-[#ddd]')} />
                            <Tooltip content="Clear" side="bottom">
                                <button onClick={() => setSelectedIds(new Set())} className={cn('px-1.5 py-0.5 rounded transition-colors', isDark ? 'text-[#555] hover:text-white hover:bg-white/5' : 'text-[#bbb] hover:text-[#333] hover:bg-[#ececec]')}>
                                    <X size={11} />
                                </button>
                            </Tooltip>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* View toggle */}
                <div className="flex items-center gap-1">
                    {(['grid', 'list'] as const).map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={cn(
                                'flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-colors',
                                view === v
                                    ? isDark ? 'bg-white/10 text-white' : 'bg-[#f0f0f0] text-[#111]'
                                    : isDark ? 'text-[#555] hover:text-[#aaa] hover:bg-white/5' : 'text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]'
                            )}
                        >
                            {v === 'grid' ? <LayoutGrid size={11} /> : <List size={11} />}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Content ── */}
            <div className={cn('flex-1 overflow-auto p-5', gridBg)}>

                {isLoading ? (
                    <div className={cn('grid gap-3', view === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}>
                        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={cn('flex flex-col items-center justify-center h-full gap-4 text-center', muted)}>
                        <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center', isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]')}>
                            <Zap size={28} strokeWidth={1.25} className="text-primary/40" />
                        </div>
                        <div>
                            <p className="text-[14px] font-semibold mb-1">{search ? 'No results found' : 'No hooks yet'}</p>
                            <p className="text-[12px] opacity-60 max-w-[240px]">
                                {search ? 'Try a different search term.' : 'Create a hook and embed it anywhere to track views silently.'}
                            </p>
                        </div>
                        {!search && (
                            <button
                                onClick={() => {
                                    useUIStore.getState().setCreateModalOpen(true);
                                }}
                                className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold px-3.5 py-2 rounded-[10px] bg-primary text-black hover:bg-primary-hover transition-colors"
                            >
                                <Plus size={12} strokeWidth={2.5} />
                                New Hook
                            </button>
                        )}
                    </div>
                ) : view === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        <AnimatePresence>
                            {filtered.map(hook => (
                                <HookCard
                                    key={hook.id}
                                    hook={hook}
                                    isDark={isDark}
                                    isSelected={selectedIds.has(hook.id)}
                                    onToggle={() => toggleRow(hook.id)}
                                    onEdit={() => setEditorHook(hook)}
                                    onDelete={() => setDeletingId(hook.id)}
                                    onShowEmbed={() => {
                                        if (selectedIds.size > 0) { toggleRow(hook.id); }
                                        else { openRightPanel({ type: 'hook', id: hook.id }); }
                                    }}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    /* ── List View ── */
                    <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'border-[#222]' : 'border-[#e8e8e8]')}>
                        {/* Header */}
                        <div
                            className={cn('grid items-center px-4 py-2 text-[10px] font-semibold uppercase tracking-wider', isDark ? 'bg-[#1a1a1a] border-b border-[#252525] text-[#555]' : 'bg-[#fafafa] border-b border-[#ebebeb] text-[#aaa]')}
                            style={{ gridTemplateColumns: '36px 1fr 220px 120px 90px' }}
                        >
                            <div className="flex items-center justify-center cursor-pointer" onClick={toggleAll}>
                                <div className={cn('w-[13px] h-[13px] rounded-[3px] border flex items-center justify-center transition-all',
                                    selectedIds.size === filtered.length && filtered.length > 0 ? 'bg-primary border-primary' : isDark ? 'border-white/10' : 'border-[#ccc]')}>
                                    {selectedIds.size === filtered.length && filtered.length > 0 && <Check size={8} strokeWidth={4} className="text-black" />}
                                    {selectedIds.size > 0 && selectedIds.size < filtered.length && <div className="w-2 h-0.5 bg-current rounded" />}
                                </div>
                            </div>
                            <div>Name / Title</div>
                            <div>Placement</div>
                            <div>Triggers</div>
                            <div>Created</div>
                        </div>

                        {/* Rows */}
                        <AnimatePresence>
                            {filtered.map((hook, i) => (
                                <motion.div
                                    key={hook.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => selectedIds.size > 0 ? toggleRow(hook.id) : openRightPanel({ type: 'hook', id: hook.id })}
                                    className={cn(
                                        'grid items-center px-4 py-3 text-[12px] cursor-pointer transition-colors group select-none',
                                        selectedIds.has(hook.id) ? 'bg-primary/5' : isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-[#fafafa]',
                                        i !== 0 && `border-t ${isDark ? 'border-[#1f1f1f]' : 'border-[#f5f5f5]'}`
                                    )}
                                    style={{ gridTemplateColumns: '36px 1fr 220px 120px 90px' }}
                                >
                                    {/* Checkbox */}
                                    <div className="flex items-center justify-center" onClick={e => { e.stopPropagation(); toggleRow(hook.id); }}>
                                        <div className={cn('w-[13px] h-[13px] rounded-[3px] border flex items-center justify-center transition-all',
                                            selectedIds.has(hook.id) ? 'bg-primary border-primary' : isDark ? 'border-white/10 opacity-0 group-hover:opacity-100' : 'border-[#ccc] opacity-0 group-hover:opacity-100')}>
                                            {selectedIds.has(hook.id) && <Check size={8} strokeWidth={4} className="text-black" />}
                                        </div>
                                    </div>

                                    {/* Name / Title */}
                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                        <div 
                                            className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0')}
                                            style={{ backgroundColor: `${hook.color}${isDark ? '1A' : '15'}` }}
                                        >
                                            <Zap size={13} style={{ color: hook.color }} fill="currentColor" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={cn('font-semibold truncate text-[12px]', isDark ? 'text-[#ddd]' : 'text-[#111]')}>{hook.name}</p>
                                            <p className={cn('text-[11px] truncate', isDark ? 'text-[#555]' : 'text-[#bbb]')}>{hook.title}</p>
                                        </div>
                                    </div>

                                    {/* Placement */}
                                    <div className={cn('truncate text-[11px] flex items-center gap-1', isDark ? 'text-[#555]' : 'text-[#bbb]')}>
                                        {hook.link ? (
                                            <><Globe size={10} className="shrink-0" /><span className="truncate">{hook.link}</span></>
                                        ) : '—'}
                                    </div>

                                    {/* Triggers */}
                                    <div className="flex items-center gap-1.5">
                                        <Activity size={11} className={cn(isDark ? 'text-[#444]' : 'text-[#ccc]')} />
                                        <span className={cn('font-medium', isDark ? 'text-[#666]' : 'text-[#888]')}>{hook.event_count ?? 0}</span>
                                    </div>

                                    {/* Created + row actions */}
                                    <div className={cn('flex items-center justify-between relative', isDark ? 'text-[#444]' : 'text-[#ccc]')}>
                                        <span className="text-[11px]">{timeAgo(hook.created_at)}</span>
                                        <div className="absolute right-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                            <Tooltip content="Edit" side="bottom">
                                                <button onClick={e => { e.stopPropagation(); setEditorHook(hook); }} className={cn('p-1 rounded transition-colors', isDark ? 'text-[#444] hover:text-white hover:bg-white/5' : 'text-[#ccc] hover:text-[#333] hover:bg-black/5')}>
                                                    <Edit2 size={11} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Delete" side="bottom">
                                                <button onClick={e => { e.stopPropagation(); setDeletingId(hook.id); }} className="p-1 rounded transition-colors text-[#ccc] hover:text-red-500 hover:bg-red-500/10">
                                                    <Trash2 size={11} />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>



            {/* ── Editor Modal (For Editing Only) ── */}
            <AnimatePresence>
                {editorHook && editorHook !== 'new' && (
                    <HookEditorModal
                        isDark={isDark}
                        onClose={() => setEditorHook(null)}
                        initial={editorHook}
                        onSaved={(hook) => {
                            setEditorHook(null);
                            openRightPanel({ type: 'hook', id: hook.id });
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ── Delete Modal ── */}
            <DeleteConfirmModal
                open={!!deletingId}
                isDark={isDark}
                title={deletingId === 'bulk' ? `Delete ${selectedIds.size} hooks` : 'Delete hook'}
                description={
                    deletingId === 'bulk'
                        ? `Delete ${selectedIds.size} hooks and all their tracking data? This cannot be undone.`
                        : 'This will permanently delete the hook and all its tracking events.'
                }
                onClose={() => setDeletingId(null)}
                onConfirm={async () => {
                    if (deletingId === 'bulk') {
                        await bulkDeleteHooks(Array.from(selectedIds));
                        setSelectedIds(new Set());
                        gooeyToast.success(`${selectedIds.size} hooks deleted`);
                    } else if (deletingId) {
                        await deleteHook(deletingId);
                        if (rightPanel?.type === 'hook' && rightPanel.id === deletingId) closeRightPanel();
                        gooeyToast.success('Hook deleted');
                    }
                    setDeletingId(null);
                }}
            />
        </div>
    );
}
