"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, X, MoreHorizontal, CheckSquare, Square, Check,
    Flag, Calendar, Trash2, Edit3, CheckCircle2,
    PlayCircle, Eye, Inbox, RotateCcw, Circle, AlignLeft, Archive, Copy,
    List, Clock, Target, Zap, Star, Heart, Shield, Box, Layout, Package, 
    Briefcase, Ticket, Tags, Smile, User, Users, Home, Globe, Map, Compass,
    Bell, Mail, Smartphone, Laptop, Cpu, Layers, Hammer, Rocket, Plane, 
    Anchor, Coffee, Music, Lock, ShieldCheck, Key, Cloud, Umbrella, Sun, 
    Moon, Flame, Droplet, Leaf, Flower2, Search, Settings, Share, Download, Paperclip
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore, ProjectTask, ProjectTaskGroup, TaskStatus, TaskPriority } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import {
    DndContext, closestCenter, closestCorners, PointerSensor, KeyboardSensor,
    useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent
} from '@dnd-kit/core';
import {
    SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable,
    sortableKeyboardCoordinates, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { appToast } from '@/lib/toast';

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
    done:   <Circle      size={9}  className="text-emerald-400"   strokeWidth={2.5} />,
};

const GROUP_COLORS = [
    '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#6366F1',
    '#3B82F6', '#06B6D4', '#10B981', '#22C55E', '#71717A',
];

const GROUP_ICONS = [
    // Essentials & Status
    'List', 'CheckSquare', 'Flag', 'Clock', 'Target', 'Zap', 'Star', 'Heart', 'Shield', 'Box',
    'Layout', 'Package', 'Briefcase', 'Ticket', 'Tags', 'Kanban', 'Milestone', 'Award', 'Trophy', 'Medal',
    'CheckCircle', 'AlertCircle', 'Info', 'XCircle', 'HelpCircle', 'Pause', 'Play', 'RotateCcw', 'Eye',
    
    // Tech & Digital
    'Code', 'Binary', 'Terminal', 'Fingerprint', 'Activity', 'TrendingUp', 'PieChart', 'BarChart3', 'LineChart',
    'Wifi', 'Cpu', 'Laptop', 'Smartphone', 'Tablet', 'HardDrive', 'Network', 'Database', 'Cloud', 'Lock', 'Unlock',
    'Key', 'ShieldCheck', 'Settings', 'ShieldAlert', 'Bug', 'Layers', 'Share2', 'Link',
    
    // Communication & People
    'Bell', 'Mail', 'Phone', 'Inbox', 'Send', 'Globe', 'Map', 'Compass', 'Smile', 'User', 'Users', 'UserPlus',
    'MessageSquare', 'MessageCircle', 'Mic', 'Headphones', 'Speaker', 'Tv', 'Video', 'Radio',
    
    // Nature & Lifestyle
    'Sun', 'Moon', 'Umbrella', 'CloudRain', 'Snowflake', 'Wind', 'Sprout', 'TreeDeciduous', 'Mountain', 'Waves', 
    'Flame', 'Droplet', 'Leaf', 'Flower2', 'Apple', 'Wine', 'Pizza', 'Coffee', 'GlassWater', 'Beer',
    'HeartPulse', 'Scale', 'Stethoscope', 'Dumbbell', 'Crosshair', 'Anchor', 'Rocket', 'Plane', 'Car', 'Bike',
    
    // Business & Finance
    'Banknote', 'Coins', 'CreditCard', 'Wallet', 'ShoppingCart', 'Store', 'Building', 'Factory', 'Warehouse', 
    'FileText', 'Folder', 'Archive', 'Calculator', 'Library', 'GraduationCap', 'Book', 'PenTool', 'Brush', 'Palette',

    // Misc & Fun
    'Hammer', 'Wrench', 'Camera', 'Music', 'Gamepad2', 'Ghost', 'Dice5', 'Puzzle', 'Gift', 'Cake', 'Glasses',
    'Search', 'Trash', 'Lightbulb', 'Magnet', 'Crown', 'Plug', 'MapPin', 'Globe2'
];

function GroupIcon({ name, size = 10, className = "" }: { name?: string, size?: number, className?: string }) {
    if (!name) return null;
    const Icon = (LucideIcons as any)[name];
    if (!Icon) return null;
    return <Icon size={size} className={className} />;
}

const DEFAULT_PALETTE = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316'];

function shortId(id: string) { return `#${id.slice(-5).toUpperCase()}`; }
function fmtDate(d: string | null | undefined) {
    if (!d) return null;
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
}

type CtxMenuState = { x: number; y: number; id: string; type: 'task' | 'group' } | null;

// ─── Context Menu ─────────────────────────────────────────────────────────────

const ICON_ALIASES: Record<string, string[]> = {
    'eye': ['view', 'watch', 'look', 'visibility'],
    'zap': ['lightning', 'fast', 'quick', 'power', 'flash'],
    'smile': ['happy', 'face', 'emotion', 'mood'],
    'trash': ['delete', 'remove', 'bin', 'discard'],
    'archive': ['save', 'box', 'history'],
    'clock': ['time', 'timer', 'history', 'schedule'],
    'target': ['goal', 'aim', 'focus'],
    'flag': ['priority', 'danger', 'mark', 'goal'],
    'lock': ['secure', 'private', 'safety'],
    'unlock': ['open', 'unsecure'],
    'rocket': ['launch', 'fast', 'boost'],
    'plane': ['travel', 'flight', 'air'],
    'home': ['house', 'dashboard', 'start'],
    'users': ['team', 'people', 'group'],
    'user': ['person', 'profile', 'individual'],
    'mail': ['email', 'letter', 'message', 'send'],
    'phone': ['call', 'contact'],
    'smartphone': ['mobile', 'cell', 'app'],
    'laptop': ['computer', 'work', 'dev'],
    'cpu': ['chip', 'processor', 'tech', 'ai'],
    'database': ['storage', 'data', 'sql', 'server'],
    'code': ['dev', 'script', 'programming', 'binary'],
    'terminal': ['command', 'console', 'cli'],
    'sun': ['day', 'light', 'weather', 'bright'],
    'moon': ['night', 'dark', 'weather', 'sleep'],
    'cloud': ['weather', 'online', 'server', 'storage'],
    'umbrella': ['rain', 'protection', 'weather'],
    'flame': ['fire', 'hot', 'trending', 'burn'],
    'droplet': ['water', 'liquid', 'fluid'],
    'leaf': ['nature', 'green', 'eco', 'organic'],
    'flower2': ['nature', 'floral', 'growth'],
    'sprout': ['nature', 'growth', 'new', 'start'],
    'treedeciduous': ['nature', 'forest', 'wood'],
    'crosshair': ['aim', 'target', 'focus'],
    'dumbbell': ['fitness', 'gym', 'health', 'work'],
    'stethoscope': ['medical', 'health', 'doctor'],
    'heartpulse': ['health', 'medical', 'vital'],
    'scale': ['balance', 'weight', 'legal'],
    'link': ['chain', 'url', 'connect'],
    'award': ['prize', 'certificate', 'win'],
    'trophy': ['win', 'prize', 'first', 'goal'],
    'medal': ['award', 'prize', 'honor'],
    'briefcase': ['work', 'job', 'business', 'office'],
    'ticket': ['task', 'issue', 'event'],
    'tags': ['labels', 'category'],
    'layout': ['design', 'grid', 'structure'],
    'package': ['shipping', 'box', 'delivery'],
    'inbox': ['receive', 'mail'],
    'send': ['mail', 'message'],
    'globe': ['world', 'international', 'web'],
    'anchor': ['sea', 'marine', 'stable'],
    'coffee': ['drink', 'break', 'pause'],
    'music': ['sound', 'audio', 'play'],
    'camera': ['photo', 'image', 'picture'],
    'tv': ['screen', 'monitor'],
    'mic': ['sound', 'voice', 'audio'],
    'wifi': ['internet', 'signal', 'wireless'],
    'trendingup': ['growth', 'performance', 'profit'],
    'piechart': ['data', 'analytics', 'statistics'],
    'barchart3': ['data', 'analytics', 'stats'],
    'linechart': ['graph', 'trends', 'stats'],
    'fingerprint': ['security', 'identity', 'biometric'],
    'activity': ['pulse', 'health', 'vitals'],
    'gift': ['present', 'offer', 'birthday'],
    'cake': ['birthday', 'celebration', 'fun'],
    'ghost': ['scary', 'spooky', 'fun'],
    'dice5': ['game', 'random', 'luck'],
    'puzzle': ['problem', 'logic', 'piece'],
    'crown': ['king', 'queen', 'leader', 'first'],
    'plug': ['power', 'electricity', 'connect'],
};

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
    const { updateTask, updateTaskGroup } = useProjectStore();
    const { branding } = useSettingsStore();

    const colors = ((branding?.branding_colors && branding.branding_colors.length > 0) 
        ? branding.branding_colors 
        : DEFAULT_PALETTE).filter(c => c.toLowerCase() !== '#ffffff' && c.toLowerCase() !== '#000000');

    useEffect(() => {
        const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [onClose]);

    const [pos,        setPos]        = useState({ x: menu.x, y: menu.y });
    const [iconSearch, setIconSearch] = useState('');

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

    const filteredIcons = useMemo(() => {
        if (!iconSearch) return GROUP_ICONS;
        const q = iconSearch.toLowerCase();
        return GROUP_ICONS.filter(name => {
            const lowName = name.toLowerCase();
            if (lowName.includes(q)) return true;
            
            // Check aliases
            const aliases = ICON_ALIASES[lowName] || [];
            return aliases.some(a => a.includes(q));
        });
    }, [iconSearch]);

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
                    {(() => {
                        const task = tasks.find(t => t.id === menu.id);
                        const isPrivate = task?.is_private;
                        return (
                            <Item 
                                label={isPrivate ? "Privacy: Only Me" : "Privacy: Public"} 
                                icon={isPrivate ? <Lock size={12} className="text-amber-500" /> : <Globe size={12} className="text-blue-500" />} 
                                action="toggle-privacy" 
                            />
                        );
                    })()}
                    <Item label="Duplicate task" icon={<Copy size={12} />} action="duplicate" />
                    <Item label="Archive task" icon={<Archive size={12} />} action="archive" />
                    <Divider />
                    <div className="px-3 py-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className={cn('text-[9px] font-bold uppercase tracking-[0.12em]', isDark ? 'text-[#3a3a3a]' : 'text-[#c0c0c0]')}>
                                Task Color
                            </span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    onClick={() => { 
                                        updateTask(menu.id, projectId, { custom_fields: { color: c } }); 
                                        onClose(); 
                                    }}
                                    className={cn(
                                        'w-4 h-4 rounded-full transition-all hover:scale-110 duration-150',
                                        tasks.find(t => t.id === menu.id)?.custom_fields?.color === c && 'ring-1 ring-offset-1 ' + (isDark ? 'ring-white/40 ring-offset-[#181818]' : 'ring-black/40 ring-offset-white')
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                            <button
                                onClick={() => { 
                                    updateTask(menu.id, projectId, { custom_fields: { color: null } }); 
                                    onClose(); 
                                }}
                                className={cn('w-4 h-4 rounded-full border flex items-center justify-center transition-colors', isDark ? 'border-white/10 hover:bg-white/5 text-white/40' : 'border-black/10 hover:bg-black/5 text-black/40')}
                            >
                                <X size={8} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
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
                    <div className="px-3 py-2.5">
                        <div className="flex items-center justify-between mb-2.5">
                            <span className={cn('text-[9px] font-bold uppercase tracking-[0.12em]', isDark ? 'text-[#555]' : 'text-[#c0c0c0]')}>
                                Icon
                            </span>
                            {group.icon && (
                                <button
                                    onClick={() => { updateTaskGroup(group.id, projectId, { icon: '' }); onClose(); }}
                                    className={cn('p-1 rounded-md transition-colors', isDark ? 'text-[#333] hover:bg-white/5 hover:text-[#777]' : 'text-[#ccc] hover:bg-black/5 hover:text-[#888]')}
                                >
                                    <RotateCcw size={10} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>

                        {/* Search input for icons */}
                        <div className="relative mb-2.5">
                            <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#888] opacity-50" />
                            <input
                                autoFocus
                                value={iconSearch}
                                onChange={e => setIconSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => e.stopPropagation()}
                                placeholder="Search..."
                                className={cn(
                                    'w-full pl-6 pr-2 py-1.5 text-[10px] rounded-lg outline-none transition-all placeholder:text-[#888]/40 border',
                                    isDark 
                                        ? 'bg-black/20 border-white/5 text-white focus:bg-black/40' 
                                        : 'bg-black/[0.02] border-black/5 text-[#111] focus:bg-white focus:shadow-sm'
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-6 gap-1 max-h-[140px] overflow-y-auto no-scrollbar pr-1">
                            {filteredIcons.map(iconName => (
                                <button
                                    key={iconName}
                                    onClick={() => { updateTaskGroup(group.id, projectId, { icon: iconName }); onClose(); }}
                                    className={cn(
                                        'w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-110 duration-150',
                                        group.icon === iconName ? (isDark ? 'bg-white/10 text-white shadow-lg' : 'bg-black/5 text-black shadow-md') : 'text-[#666] opacity-40 hover:opacity-100 hover:bg-black/[0.03]'
                                    )}
                                >
                                    <GroupIcon name={iconName} size={14} />
                                </button>
                            ))}
                            {filteredIcons.length === 0 && (
                                <div className="col-span-6 py-4 text-center opacity-30 text-[9px] font-medium italic">No icons found</div>
                            )}
                        </div>
                    </div>
                    <Divider />
                    <Item label="Duplicate group" icon={<Copy size={12} />} action="duplicate" />
                    <Item label="Delete group" icon={<Trash2 size={12} />} action="delete" danger />
                </>
            )}
        </div>
    );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, isDark, onCtx, onAction, isFirst, isLast, isPreview, isSelected, onToggleSelect, isSelectionMode }: {
    task: ProjectTask;
    isDark: boolean;
    onCtx: (e: React.MouseEvent, id: string, type: 'task' | 'group') => void;
    onAction: (a: string, t: ProjectTask) => void;
    isFirst?: boolean;
    isLast?: boolean;
    isPreview?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    isSelectionMode?: boolean;
}) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showSure, setShowSure]     = useState(false);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: 'task' },
        disabled: isPreview,
    });
    const { updateTask, deleteTask } = useProjectStore();

    const style = { transform: CSS.Translate.toString(transform), transition };
    const pri    = PRIORITY_MAP[task.priority];
    const isDone = task.status === 'done';
    const tags = (task.custom_fields?.tags as { label: string; color: string }[] | undefined) ?? [];
    const checklists = (task.custom_fields?.checklists as { id: string; completed: boolean }[] | undefined) ?? [];
    const totalChecks = checklists.length;
    const completedChecks = checklists.filter(c => c.completed).length;
    const attachments = (task.custom_fields?.attachments as any[] | undefined) ?? [];
    const totalAttachments = attachments.length;

    const hasMeta = task.due_date || task.priority !== 'none' || tags.length > 0 || totalChecks > 0 || totalAttachments > 0;

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, touchAction: 'none' }}
            {...(!isPreview ? attributes : {})}
            {...(!isPreview ? listeners : {})}
            onContextMenu={e => !isPreview && onCtx(e, task.id, 'task')}
            onClick={() => {
                if (isSelectionMode && onToggleSelect) {
                    onToggleSelect();
                } else {
                    onAction('open', task);
                }
            }}
            className={cn(
                'relative select-none group/card overflow-hidden min-h-[62px]',
                !isDragging && 'transition-all duration-150',
                !isPreview && 'cursor-pointer',
                isDragging
                    ? isDark 
                        ? 'bg-white/[0.02] border-dashed border-white/10 opacity-70 scale-[0.98] z-20 shadow-inner' 
                        : 'bg-black/[0.01] border-dashed border-black/10 opacity-70 scale-[0.98] z-20 shadow-inner'
                    : isSelected
                        ? isDark ? 'bg-primary/5 ring-1 ring-primary/30' : 'bg-primary/[0.03] ring-1 ring-primary/30'
                        : isDark
                            ? 'hover:bg-white/[0.025]'
                            : 'hover:bg-[#f9f9f9]',
                isFirst && 'rounded-t-[14px]',
                isLast  && 'rounded-b-[14px]',
            )}
        >
            {/* Super Modern Minimal Color Indicator */}
            {task.custom_fields?.color && !isDragging && (
                <div 
                    className="absolute top-0 left-0 right-0 h-[2.5px] z-[1] opacity-70" 
                    style={{ 
                        backgroundColor: task.custom_fields.color,
                        boxShadow: `0 1px 4px ${task.custom_fields.color}15`
                    }} 
                />
            )}
            {/* Priority left accent bar - hide when dragging skeleton */}
            {!isDragging && (
                <div
                    className={cn(
                        'absolute left-0 inset-y-0 w-[3px] transition-opacity',
                        task.priority === 'none' ? 'opacity-0' : 'opacity-100',
                        isFirst && 'rounded-tl-[14px]',
                        isLast  && 'rounded-bl-[14px]',
                    )}
                    style={{ background: pri.color }}
                />
            )}

            <div className={cn("pl-4 pr-3 py-[20px] flex flex-col gap-2", isDragging && "invisible")}>

                {/* ── Top row: checkbox + title + action ── */}
                <div className="relative flex items-start gap-2.5">

                    {/* Checkbox */}
                    {isPreview ? (
                        <div className={cn(
                            'mt-[2px] shrink-0 w-[15px] h-[15px] rounded-[4px] border flex items-center justify-center transition-all',
                            isDone ? 'bg-emerald-500 border-emerald-500 text-white' : isDark ? 'border-white/10' : 'border-black/10'
                        )}>
                            {isDone && <Check size={9} strokeWidth={3.5} />}
                        </div>
                    ) : (
                        <button
                            onClick={e => {
                                e.stopPropagation();
                                if (isSelectionMode && onToggleSelect) {
                                    onToggleSelect();
                                } else {
                                    updateTask(task.id, task.project_id, { status: isDone ? 'todo' : 'done' });
                                }
                            }}
                            className={cn(
                                'mt-[2px] shrink-0 w-[15px] h-[15px] rounded-[4px] border flex items-center justify-center transition-all duration-200',
                                isDone
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : isDark ? 'border-white/10 hover:border-emerald-500/50' : 'border-black/10 hover:border-emerald-500/50'
                            )}
                        >
                            <AnimatePresence mode="wait">
                                {isDone && (
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    >
                                        <Check size={9} strokeWidth={3.5} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                    )}

                    {/* Title */}
                    <p className={cn(
                        'flex-1 text-[13.5px] font-semibold leading-snug min-w-0',
                        isDone
                            ? isDark ? 'text-[#383838]' : 'text-[#c0c0c0]'
                            : isDark ? 'text-[#e0e0e0]' : 'text-[#1a1a1a]'
                    )}>
                        {task.title}
                        {task.is_private && !isPreview && (
                            <LucideIcons.EyeOff size={10} className="inline-block ml-1.5 opacity-30 text-amber-500" />
                        )}
                    </p>

                    {/* Hover actions - absolute overlay so title doesn't shrink */}
                    {!isPreview && (
                        <div className={cn(
                            "absolute top-[-2px] right-[-4px] flex items-center gap-0.5 transition-all duration-200 py-0.5 pl-8 pr-1 z-10",
                            isSelected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none group-hover/card:opacity-100 group-hover/card:pointer-events-auto",
                            isDark 
                                ? "bg-gradient-to-l from-[#1b1b1b] via-[#1b1b1b]/80 to-transparent" 
                                : "bg-gradient-to-l from-[#f9f9f9] via-[#f9f9f9]/80 to-transparent"
                        )}>
                            
                            {/* Selection Checkbox */}
                            {onToggleSelect && (
                                <button
                                    onClick={e => { e.stopPropagation(); onToggleSelect(); }}
                                    className={cn(
                                        "w-5 h-5 flex items-center justify-center rounded-full transition-colors",
                                        isDark ? "hover:bg-white/[0.07]" : "hover:bg-black/[0.05]"
                                    )}
                                >
                                    <div className={cn("w-[13px] h-[13px] rounded-full border flex items-center justify-center transition-all",
                                        isSelected ? "bg-primary border-primary" : isDark ? "border-[#3a3a3a] bg-transparent" : "border-[#d0d0d0] bg-white"
                                    )}>
                                        {isSelected && <Check size={8} strokeWidth={3.5} className="text-primary-foreground text-white" />}
                                    </div>
                                </button>
                            )}

                            {/* Delete Button with Sure? logic */}
                            <div className="flex items-center">
                                <AnimatePresence mode="wait" initial={false}>
                                    {showSure ? (
                                        <motion.button
                                            key="sure"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (isSelectionMode && onToggleSelect) {
                                                    onToggleSelect();
                                                } else {
                                                    setIsDeleting(true);
                                                    await deleteTask(task.id, task.project_id);
                                                }
                                            }}
                                            className="px-1.5 h-5 flex items-center justify-center rounded-md bg-red-500 text-white text-[8.5px] font-bold shadow-sm active:scale-95"
                                        >
                                            {isDeleting ? '...' : 'Sure?'}
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            key="trash"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if (isSelectionMode && onToggleSelect) {
                                                    onToggleSelect();
                                                } else {
                                                    setShowSure(true); 
                                                    setTimeout(() => setShowSure(false), 3000); 
                                                }
                                            }}
                                            className={cn(
                                                "w-5 h-5 flex items-center justify-center rounded-md transition-colors",
                                                isDark ? "text-red-400/30 hover:text-red-400 hover:bg-red-500/10" : "text-red-300 hover:text-red-500 hover:bg-red-50"
                                            )}
                                        >
                                            <Trash2 size={11} />
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>

                            <button
                                onClick={e => { 
                                    e.stopPropagation(); 
                                    if (isSelectionMode && onToggleSelect) {
                                        onToggleSelect();
                                    } else {
                                        onCtx(e, task.id, 'task'); 
                                    }
                                }}
                                className={cn(
                                    'shrink-0 w-5 h-5 flex items-center justify-center rounded-md transition-all',
                                    isDark
                                        ? 'text-[#3a3a3a] hover:text-[#aaa] hover:bg-white/[0.07]'
                                        : 'text-[#d0d0d0] hover:text-[#666] hover:bg-black/[0.05]'
                                )}
                            >
                                <MoreHorizontal size={11} />
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Meta row: id · priority pill · tags · due date ── */}
                {hasMeta && (
                    <div className="flex flex-wrap items-center gap-1.5 pl-[23px]">
                        {/* Short ID */}
                        <span className={cn(
                            'h-5 px-1.5 flex items-center rounded-[4px] text-[11.5px] font-normal tabular-nums transition-colors',
                            isDark ? 'bg-white/[0.04] text-[#555]' : 'bg-black/[0.03] text-[#bbb]'
                        )}>
                            {shortId(task.id)}
                        </span>

                        {/* Priority pill (skip 'none') */}
                        {task.priority !== 'none' && (
                            <span
                                className="h-5 inline-flex items-center gap-1 px-1.5 rounded-[5px] text-[11.5px] font-bold"
                                style={{ backgroundColor: `${pri.color}18`, color: pri.color }}
                            >
                                <Flag size={11} strokeWidth={2.5} />
                                {pri.label}
                            </span>
                        )}

                        {/* Tags */}
                        {tags.map((t, i) => (
                            <span
                                key={i}
                                className="h-5 px-1.5 flex items-center rounded-[5px] text-[11.5px] font-bold"
                                style={{ backgroundColor: `${t.color}15`, color: t.color }}
                            >
                                {t.label}
                            </span>
                        ))}

                        {/* Due date */}
                        {task.due_date && (
                            <span className={cn(
                                'h-5 inline-flex items-center gap-1 px-1.5 rounded-[4px] text-[11.5px] font-normal transition-colors',
                                isDark ? 'bg-white/[0.06] text-[#999]' : 'bg-black/[0.04] text-[#666]'
                            )}>
                                <Calendar size={11} strokeWidth={2.4} />
                                {fmtDate(task.due_date)}
                            </span>
                        )}

                        {/* Subtasks Progress */}
                        {totalChecks > 0 && (
                            <span className={cn(
                                'h-5 flex items-center gap-1 px-1.5 rounded-[4px] text-[11.5px] font-normal transition-colors',
                                completedChecks === totalChecks ? 'bg-emerald-500/10 text-emerald-500' : isDark ? 'bg-white/[0.06] text-[#999]' : 'bg-black/[0.04] text-[#666]'
                            )}>
                                <CheckSquare size={11} strokeWidth={2.4} />
                                {completedChecks}/{totalChecks}
                            </span>
                        )}

                        {/* Attachments */}
                        {totalAttachments > 0 && (
                            <span className={cn(
                                'h-5 flex items-center gap-1 px-1.5 rounded-[4px] text-[11.5px] font-normal transition-colors',
                                isDark ? 'bg-white/[0.06] text-[#999]' : 'bg-black/[0.04] text-[#666]'
                            )}>
                                <Paperclip size={11} strokeWidth={2.4} />
                                {totalAttachments}
                            </span>
                        )}
                    </div>
                )}

                {/* ── Subtask Progress Bar (Minimal) ── */}
                {totalChecks > 0 && totalChecks !== completedChecks && (
                    <div className="pl-[23px] pr-2">
                        <div className={cn("w-full h-[1.5px] rounded-full overflow-hidden", isDark ? "bg-white/[0.03]" : "bg-black/[0.03]")}>
                            <div 
                                className="h-full bg-emerald-500/30 transition-all duration-500" 
                                style={{ width: `${(completedChecks / totalChecks) * 100}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


// ─── Task Group Column ────────────────────────────────────────────────────────

function TaskGroupCol({ group, tasks, isDark, projectId, onCtx, onAction, forceEditing, onRenameDone, isPreview, onAddTask, selectedIds, toggleSelection, isSelectionMode }: {
    group: ProjectTaskGroup;
    tasks: ProjectTask[];
    isDark: boolean;
    projectId: string;
    onCtx: (e: React.MouseEvent, id: string, type: 'task' | 'group') => void;
    onAction: (a: string, t: ProjectTask) => void;
    forceEditing?: boolean;
    onRenameDone?: () => void;
    isPreview?: boolean;
    onAddTask: (title?: string) => void;
    selectedIds?: Set<string>;
    toggleSelection?: (id: string) => void;
    isSelectionMode?: boolean;
}) {
    const { updateTaskGroup, addTask } = useProjectStore();
    const [adding,   setAdding]   = useState(false);
    const [titleStr, setTitleStr] = useState('');
    const [saving,   setSaving]   = useState(false);
    const [editing,  setEditing]  = useState(false);
    const [draft,    setDraft]    = useState(group.name);
    const addFormRef = useRef<HTMLDivElement>(null);
    const nameRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (editing && nameRef.current && document.activeElement !== nameRef.current) {
            nameRef.current.focus();
            const range = document.createRange();
            range.selectNodeContents(nameRef.current);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
    }, [editing]);

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
        disabled: isPreview || editing,
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

        const lines = titleStr.split('\n').map(l => l.trim());
        const bulkTasks = lines.filter(l => l.startsWith('//')).map(l => l.replace(/^\/\/\s*/, ''));

        if (bulkTasks.length > 0) {
            // Sequential creation to maintain order
            for (let i = 0; i < bulkTasks.length; i++) {
                const title = bulkTasks[i];
                if (!title) continue;
                await addTask({
                    project_id:    projectId,
                    task_group_id: group.id,
                    title,
                    status:        'todo',
                    priority:      'none',
                    position:      tasks.length + i,
                    custom_fields: {},
                    is_archived:   false,
                    is_private:    false,
                });
            }
        } else {
            await addTask({
                project_id:    projectId,
                task_group_id: group.id,
                title:         titleStr.trim(),
                status:        'todo',
                priority:      'none',
                position:      tasks.length,
                custom_fields: {},
                is_archived:   false,
                is_private:    false
            });
        }

        setSaving(false);
        setTitleStr('');
        setAdding(false);
    };

    const baseColor = group.color || '#374151';

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={{ transform: CSS.Translate.toString(transform), transition }}
                className={cn(
                    'flex flex-col w-[272px] min-w-[272px] shrink-0 h-[600px] rounded-[22px] border-2 border-dashed transition-colors duration-200',
                    isDark ? 'bg-white/[0.02] border-white/5' : 'bg-black/[0.01] border-black/[0.04]'
                )}
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className="flex flex-col w-[272px] min-w-[272px] shrink-0 h-full"
        >
            {/* ══ UNIFIED HEADER + CREATE TASK CARD ══ */}
            <div className={cn(
                'rounded-[18px] overflow-hidden border mb-3 shrink-0 group/col',
                isDark
                    ? 'bg-[#161616] border-[#232323]'
                    : 'bg-white border-[#e8e8e8] shadow-sm shadow-black/[0.04]'
            )}>
                {/* ─ Header row ─ */}
                <div
                    {...(!isPreview && !editing ? listeners : {})}
                    {...(!isPreview && !editing ? attributes : {})}
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

                    {/* Glowing color dot OR Icon */}
                    <div
                        className="w-4 h-4 flex items-center justify-center shrink-0 relative z-10"
                        style={{ color: baseColor }}
                    >
                        {group.icon ? (
                            <GroupIcon name={group.icon} size={15} className="shrink-0" />
                        ) : (
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: baseColor, boxShadow: `0 0 0 3px ${baseColor}28` }} />
                        )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0 relative z-10">
                        <span
                            ref={nameRef}
                            contentEditable={!isPreview}
                            suppressContentEditableWarning
                            onFocus={() => { if (!isPreview) setEditing(true); }}
                            onBlur={e => {
                                setEditing(false);
                                const val = e.currentTarget.innerText.trim();
                                if (val && val !== group.name) {
                                    updateTaskGroup(group.id, projectId, { name: val });
                                } else {
                                    e.currentTarget.innerText = group.name;
                                }
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.currentTarget.blur();
                                }
                                if (e.key === 'Escape') {
                                    e.currentTarget.innerText = group.name;
                                    e.currentTarget.blur();
                                }
                            }}
                            className={cn(
                                'block text-[12.5px] font-bold truncate leading-tight outline-none focus:caret-primary transition-colors',
                                isDark ? 'text-[#e0e0e0]' : 'text-[#111]',
                                !isPreview && 'cursor-text'
                            )}
                        >
                            {group.name}
                        </span>
                    </div>

                    <div className="shrink-0 relative z-10 w-6 h-6 ml-2">
                        <span className={cn(
                            'absolute inset-0 text-[10px] font-bold tabular-nums rounded-[6px] flex items-center justify-center transition-all duration-200',
                            isDark ? 'bg-white/[0.07] text-[#555]' : 'bg-black/[0.05] text-[#aaa]',
                            !isPreview && 'group-hover/hdr:opacity-0 group-hover/hdr:scale-90 pointer-events-none'
                        )}>
                            {tasks.length}
                        </span>
                        {!isPreview && (
                            <button
                                onClick={e => { e.stopPropagation(); onCtx(e, group.id, 'group'); }}
                                className={cn(
                                    'absolute inset-0 flex items-center justify-center rounded-[7px] opacity-0 group-hover/hdr:opacity-100 transition-all scale-90 group-hover/hdr:scale-100',
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
                    <div className="overflow-hidden transition-all duration-300 group-hover/col:max-h-[50px] max-h-0 opacity-0 group-hover/col:opacity-100">
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
                    </div>
                )}
            </div>

            {/* ══ TASK LIST ══ */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-8 min-h-[100px]">
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
                                    className="px-3.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    {saving ? '…' : 'Add'}
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
                                        isSelected={selectedIds?.has(t.id) ?? false}
                                        onToggleSelect={() => toggleSelection?.(t.id)}
                                        isSelectionMode={isSelectionMode}
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
                    className="flex-1 py-2 rounded-[12px] bg-primary text-primary-foreground text-[12px] font-bold transition-all hover:bg-primary/90 active:scale-[0.98]"
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
    onAddGroupOverride?: (name: string, color: string) => void;
    onRenameGroupOverride?: (id: string, name: string) => void;
    onDeleteGroupOverride?: (id: string) => void;
    onReorderGroupOverride?: (id: string, newIndex: number) => void;
    
    onAddTaskOverride?: (groupId: string, title?: string) => void;
    onUpdateTaskOverride?: (taskId: string, updates: Partial<ProjectTask>) => void;
    onDeleteTaskOverride?: (id: string) => void;
    onReorderTaskOverride?: (taskId: string, destGroupId: string, newPosition: number) => void;
}

export default React.memo(function KanbanBoard({ 
    projectId, isDark, searchQuery, showArchived,
    filterPriority = 'all', filterStatus = 'all', orderBy = 'position',
    onTaskClick, isPreview, externalTasks, externalGroups,
    onAddGroupOverride, onRenameGroupOverride, onDeleteGroupOverride, onReorderGroupOverride,
    onAddTaskOverride, onUpdateTaskOverride, onDeleteTaskOverride, onReorderTaskOverride
}: KanbanBoardProps) {
    const {
        tasksByProject, groupsByProject, fetchTasks, fetchTaskGroups,
        addTaskGroup, reorderTask, reorderTaskGroup, deleteTask, deleteTaskGroup, duplicateTaskGroup, updateTask, addTask
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
    const filteredAllTasks = useMemo(() => {
        return tasks.filter(t => 
            (showArchived ? t.is_archived : !t.is_archived) &&
            (!searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())) &&
            (filterPriority === 'all' || t.priority === filterPriority) &&
            (filterStatus === 'all' || t.status === filterStatus)
        );
    }, [tasks, showArchived, searchQuery, filterPriority, filterStatus]);
    const handleSelectAll = () => setSelectedIds(new Set(filteredAllTasks.map(t => t.id)));

    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleBulkDuplicate = async () => {
        const ids = Array.from(selectedIds);
        const promise = (async () => {
            for (const id of ids) {
                const original = tasks.find(t => t.id === id);
                if (original) {
                    const { id: _, created_at: __, workspace_id: ___, ...rest } = original;
                    await addTask({
                        ...rest,
                        title: `${original.title} (copy)`,
                        position: original.position + 1
                    });
                }
            }
        })();
        appToast.promise(promise, {
            loading: `Duplicating ${ids.length} task${ids.length !== 1 ? 's' : ''}…`,
            success: `${ids.length} task${ids.length !== 1 ? 's' : ''} duplicated`,
            error: 'Duplication failed'
        });
        await promise;
        setSelectedIds(new Set());
    };

    const handleBulkArchive = async () => {
        const ids = Array.from(selectedIds);
        const promise = Promise.all(ids.map(id => updateTask(id, projectId, { is_archived: true })));
        appToast.promise(promise, {
            loading: `Archiving ${ids.length} task${ids.length !== 1 ? 's' : ''}…`,
            success: `${ids.length} task${ids.length !== 1 ? 's' : ''} archived`,
            error: 'Archive failed'
        });
        await promise;
        setSelectedIds(new Set());
    };

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedIds);
        const promise = Promise.all(ids.map(id => deleteTask(id, projectId)));
        appToast.promise(promise, {
            loading: `Deleting ${ids.length} task${ids.length !== 1 ? 's' : ''}…`,
            success: `${ids.length} task${ids.length !== 1 ? 's' : ''} deleted`,
            error: 'Delete failed'
        });
        await promise;
        setSelectedIds(new Set());
    };

    const isDraggingRef = React.useRef(false);

    useEffect(() => {
        // Only sync local state when not in the middle of a drag
        if (!isDraggingRef.current) {
            setLocalTasks([...tasks].sort((a, b) => a.position - b.position));
        }
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
        isDraggingRef.current = true;
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeData = active.data.current;
        const overData = over.data.current;

        if (activeData?.type !== 'task') return;

        const activeId = active.id as string;
        const overId = over.id as string;

        setLocalTasks(prev => {
            const activeIndex = prev.findIndex(t => t.id === activeId);
            if (activeIndex === -1) return prev;

            const activeTask = prev[activeIndex];

            // Determine destination group
            let destGroupId: string | null | undefined;
            const overTaskIndex = prev.findIndex(t => t.id === overId);

            if (overTaskIndex !== -1) {
                // Dragging over another task
                destGroupId = prev[overTaskIndex].task_group_id;
            } else if (overData?.type === 'group') {
                // Dragging over a group header/column (empty group)
                destGroupId = overId;
            } else {
                return prev;
            }

            if (destGroupId === undefined) return prev;

            if (activeTask.task_group_id !== destGroupId) {
                // Cross-group: change the group id first, then reorder
                const updatedTask = { ...activeTask, task_group_id: destGroupId };
                const newItems = prev.map(t => t.id === activeId ? updatedTask : t);

                if (overTaskIndex !== -1) {
                    // Place next to the target task
                    const finalActiveIdx = newItems.findIndex(t => t.id === activeId);
                    return arrayMove(newItems, finalActiveIdx, overTaskIndex);
                }
                return newItems;
            } else {
                // Same-group: just reorder
                if (overTaskIndex !== -1) {
                    return arrayMove(prev, activeIndex, overTaskIndex);
                }
                return prev;
            }
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        isDraggingRef.current = false;
        setActiveId(null);
        setActiveType(null);

        if (!over) {
            // Revert to server state on cancelled drag
            setLocalTasks([...tasks].sort((a, b) => a.position - b.position));
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
            if (oi !== -1 && ni !== -1 && oi !== ni) {
                if (onReorderGroupOverride) {
                    onReorderGroupOverride(active.id as string, ni);
                } else {
                    reorderTaskGroup(active.id as string, projectId, ni);
                }
            }
        } else if (type === 'task') {
            const task = localTasks.find(t => t.id === active.id);
            if (task) {
                const destGroupId = task.task_group_id;
                // Calculate position based on final localTasks order within the destination group
                const colTasks = localTasks.filter(t => t.task_group_id === destGroupId);
                const finalPos = colTasks.findIndex(t => t.id === task.id);

                if (onReorderTaskOverride) {
                    onReorderTaskOverride(task.id, destGroupId || '', finalPos);
                } else {
                    reorderTask(task.id, projectId, destGroupId || null, finalPos);
                }
            }
        }
    };

    const handleAddGroup = async (name: string) => {
        const finalName = name.trim() || 'New Group';
        const color = GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
        if (onAddGroupOverride) {
            onAddGroupOverride(finalName, color);
        } else {
            await addTaskGroup({ project_id: projectId, name: finalName, position: groups.length, color });
        }
        setAddingGroup(false);
    };

    const handleAddTask = (groupId: string, title?: string) => {
        if (onAddTaskOverride) {
            onAddTaskOverride(groupId, title);
            return;
        }
        addTask({ 
            project_id: projectId, 
            task_group_id: groupId, 
            title: title || 'New Task',
            status: 'todo',
            priority: 'none',
            position: tasks.length,
            custom_fields: {},
            is_archived: false,
            is_private: false
        });
    };

    const handleCtxAction = (action: string, type: 'task' | 'group', id: string) => {
        if (type === 'task') {
            const t = tasks.find(x => x.id === id);
            if (!t) return;
            if (action === 'delete') {
                setPendingDelete({ id, type: 'task' });
            }
            if (action === 'archive') {
                if (onUpdateTaskOverride) onUpdateTaskOverride(id, { is_archived: true });
                else updateTask(id, projectId, { is_archived: true });
                appToast.success('Archived', 'Task moved to archive');
            }
            if (action === 'duplicate') {
                const { id: _id, created_at: _ca, workspace_id: _wsid, ...rest } = t;
                addTask({
                    ...rest,
                    title: `${t.title} (copy)`,
                    position: t.position + 1,
                    is_private: t.is_private
                });
                appToast.success('Duplicated', 'Task cloned successfully');
            }
            if (action === 'toggle-privacy') {
                updateTask(id, projectId, { is_private: !t.is_private });
                appToast.success('Privacy Updated', `Task is now ${!t.is_private ? 'private (Only Me)' : 'public'}`);
            }
            if (action === 'open') onTaskClick(t);
        } else if (type === 'group') {
            if (action === 'rename') {
                if (onRenameGroupOverride) {
                    const newName = prompt("Enter new group name:", groups.find(g => g.id === id)?.name || "");
                    if (newName !== null && newName.trim() !== '') {
                        onRenameGroupOverride(id, newName.trim());
                    }
                } else {
                    setRenamingId(id);
                }
            }
            if (action === 'duplicate') {
                duplicateTaskGroup(id, projectId);
                appToast.success('Duplicated', 'Group and tasks cloned successfully');
            }
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
        <div className="relative flex-1 min-h-0 flex flex-col overflow-x-hidden overflow-y-hidden" style={{ zoom: 0.9 }}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div
                    className="flex-1 overflow-x-auto overflow-y-hidden px-5 pt-5 pb-10 flex items-stretch gap-4 custom-scrollbar h-full"
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
                                    onAddTask={() => handleAddTask(g.id)}
                                    selectedIds={selectedIds}
                                    toggleSelection={toggleSelection}
                                    isSelectionMode={selectedIds.size > 0}
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
                                className={cn(
                                    'w-[272px] rounded-[18px] overflow-hidden border shadow-2xl scale-[1.02] opacity-95',
                                    isDark ? 'bg-[#161616] border-[#232323]' : 'bg-white border-[#e8e8e8]'
                                )}
                            >
                                <div className="relative flex items-center gap-2.5 px-3.5 py-3">
                                    {/* Ambient color wash */}
                                    <div
                                        className="absolute inset-0 pointer-events-none"
                                        style={{ background: `linear-gradient(125deg, ${activeGroup.color || '#374151'}18 0%, ${activeGroup.color || '#374151'}06 55%, transparent 100%)` }}
                                    />
                                    {/* Top accent line */}
                                    <div
                                        className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
                                        style={{ background: `linear-gradient(90deg, ${activeGroup.color || '#374151'} 0%, ${activeGroup.color || '#374151'}00 75%)` }}
                                    />

                                    {/* Glowing color dot OR Icon */}
                                    <div
                                        className="w-4 h-4 flex items-center justify-center shrink-0 relative z-10"
                                        style={{ color: activeGroup.color || '#374151' }}
                                    >
                                        {activeGroup.icon ? (
                                            <GroupIcon name={activeGroup.icon} size={15} className="shrink-0" />
                                        ) : (
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ 
                                                background: activeGroup.color || '#374151', 
                                                boxShadow: `0 0 0 3px ${activeGroup.color || '#374151'}28` 
                                            }} />
                                        )}
                                    </div>

                                    <span className={cn(
                                        'block text-[12.5px] font-bold truncate leading-tight relative z-10',
                                        isDark ? 'text-[#e0e0e0]' : 'text-[#111]'
                                    )}>
                                        {activeGroup.name}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>
                )}

                {/* Bulk banner floating bottom center */}
                <AnimatePresence>
                    {selectedIds.size > 0 && !isPreview && (
                        <motion.div 
                            initial={{ y: 50, opacity: 0 }} 
                            animate={{ y: 0, opacity: 1 }} 
                            exit={{ y: 50, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className={cn(
                                "absolute bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-4 py-3 rounded-2xl text-[12px] font-medium border shadow-2xl backdrop-blur-md",
                                isDark ? "bg-[#1c1c1c]/90 border-[#2e2e2e] text-[#aaa] shadow-black/60" : "bg-white/90 border-[#e8e8e8] text-[#666] shadow-black/10"
                            )}>
                            <div className="flex items-center gap-2.5">
                                <span className="opacity-90 font-bold tracking-tight">{selectedIds.size} task{selectedIds.size > 1 ? 's' : ''} selected</span>
                                {selectedIds.size < filteredAllTasks.length && (
                                    <button 
                                        onClick={handleSelectAll}
                                        className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                                            isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-black/5 hover:bg-black/10 text-black"
                                        )}
                                    >
                                        Select All
                                    </button>
                                )}
                            </div>
                            <div className={cn("w-[2px] h-4 rounded-full", isDark ? "bg-[#333]" : "bg-[#eee]")} />
                            <div className="flex items-center gap-4">
                                <button onClick={handleBulkDuplicate} className={cn("flex items-center gap-1.5 transition-all outline-none font-semibold", isDark ? "hover:text-white" : "hover:text-black")}>
                                    <Copy size={13} className="opacity-70" />Duplicate
                                </button>
                                <button onClick={handleBulkArchive} className={cn("flex items-center gap-1.5 transition-all outline-none font-semibold", isDark ? "hover:text-emerald-400 text-emerald-500/80" : "hover:text-emerald-600 text-emerald-500")}>
                                    <Archive size={13} className="opacity-70" />Archive
                                </button>
                                <div className={cn("w-[2px] h-4 rounded-full", isDark ? "bg-[#333]" : "bg-[#eee]")} />
                                <button onClick={handleBulkDelete} className={cn("flex items-center gap-1.5 transition-all outline-none font-semibold", isDark ? "hover:text-red-400 text-red-500/80" : "hover:text-red-600 text-red-500")}>
                                    <Trash2 size={13} className="opacity-70" />Delete
                                </button>
                                <button onClick={() => setSelectedIds(new Set())} className={cn("ml-2 p-1 rounded-md transition-colors", isDark ? "hover:bg-white/10 text-white/50 hover:text-white" : "hover:bg-black/5 text-black/40 hover:text-black")}>
                                    <X size={15} strokeWidth={2.5}/>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DndContext>

            {/* Delete Confirmation */}
            <DeleteConfirmModal 
                open={!!pendingDelete}
                onClose={() => setPendingDelete(null)}
                onConfirm={async () => {
                    if (pendingDelete) {
                        if (pendingDelete.type === 'task') {
                            if (onDeleteTaskOverride) onDeleteTaskOverride(pendingDelete.id);
                            else await deleteTask(pendingDelete.id, projectId);
                        } else {
                            if (onDeleteGroupOverride) {
                                onDeleteGroupOverride(pendingDelete.id);
                            } else {
                                await deleteTaskGroup(pendingDelete.id, projectId);
                            }
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
});
