"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, usePresence } from 'framer-motion';
import {
    X, Calendar, Flag, User, ChevronDown,
    MessageSquare, Paperclip, Activity, Trash2, Check,
    AlignLeft, Play, PanelRight, Maximize,
    MoreHorizontal, Repeat, HelpCircle, GripVertical,
    Eye, Tag, Plus, CheckCircle2, Clock, Zap,
    Hash, ArrowUpRight, Circle, Inbox, TrendingUp, Link2,
    FileImage, FileVideo, FileAudio, FileText, FileCode, FileArchive, File,
    Download, ZoomIn, ZoomOut, RotateCw, Music,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore, ProjectTask, TaskStatus, TaskPriority, ProjectTaskGroup } from '@/store/useProjectStore';
import { KANBAN_COLS } from './KanbanBoard';
import { appToast } from '@/lib/toast';
import { AppLoader } from '@/components/ui/AppLoader';
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

// ─── File type helpers (mirrored from file manager) ──────────────────────────

type FileKind = 'image' | 'video' | 'audio' | 'doc' | 'code' | 'archive' | 'file';

function detectFileKind(name: string): FileKind {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['jpg','jpeg','png','gif','webp','svg','ico','bmp','avif'].includes(ext)) return 'image';
    if (['mp4','mov','avi','mkv','webm','flv'].includes(ext)) return 'video';
    if (['mp3','wav','ogg','aac','flac','m4a'].includes(ext)) return 'audio';
    if (['pdf','doc','docx','xls','xlsx','ppt','pptx','odt','txt','md','rtf'].includes(ext)) return 'doc';
    if (['ts','tsx','js','jsx','py','rs','go','rb','php','java','cs','cpp','c','html','css','json','yaml','yml','sh'].includes(ext)) return 'code';
    if (['zip','rar','7z','tar','gz','bz2'].includes(ext)) return 'archive';
    return 'file';
}

function FileKindIcon({ kind, size = 16 }: { kind: FileKind; size?: number }) {
    const s = size;
    switch (kind) {
        case 'image':   return <FileImage   size={s} className="shrink-0" style={{ color: '#ec4899' }} />;
        case 'video':   return <FileVideo   size={s} className="shrink-0" style={{ color: '#3b82f6' }} />;
        case 'audio':   return <FileAudio   size={s} className="shrink-0" style={{ color: '#8b5cf6' }} />;
        case 'doc':     return <FileText    size={s} className="shrink-0" style={{ color: '#f97316' }} />;
        case 'code':    return <FileCode    size={s} className="shrink-0" style={{ color: '#10b981' }} />;
        case 'archive': return <FileArchive size={s} className="shrink-0" style={{ color: '#6b7280' }} />;
        default:        return <File        size={s} className="shrink-0" style={{ color: '#9ca3af' }} />;
    }
}

function fmtBytes(b: number) {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
    return `${(b/1048576).toFixed(1)} MB`;
}

function downloadFile(url: string, name: string) {
    const link = document.createElement('a');
    // Append a query parameter to hint backend storage (like Supabase/S3) to force Content-Disposition attachment
    link.href = url + (url.includes('?') ? '&' : '?') + 'download=1';
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ─── Attachment Preview Lightbox ──────────────────────────────────────────────

type AttachmentFile = { id: string; name: string; url: string; size: number; type: string };

function AttachmentPreview({ file, isDark, onClose, onDelete }: {
    file: AttachmentFile;
    isDark: boolean;
    onClose: () => void;
    onDelete: () => void;
}) {
    const kind = detectFileKind(file.name);
    const [zoom, setZoom]     = useState(1);
    const [rotate, setRotate] = useState(0);
    const [imgLoading, setImgLoading] = useState(true);
    const [confirmDel, setConfirmDel] = useState(false);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [onClose]);

    const panelBg = isDark ? 'bg-[#141414] border-[#222]' : 'bg-white border-[#e8e8e8]';
    const muted   = isDark ? 'text-[#555]' : 'text-[#aaa]';

    const renderContent = () => {
        if (kind === 'image') {
            return (
                <div className="flex-1 flex items-center justify-center overflow-hidden relative p-6">
                    {imgLoading && <div className={cn('absolute inset-0 z-10 animate-pulse', isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]')} />}
                    <div style={{ transform: `scale(${zoom}) rotate(${rotate}deg)`, transition: 'transform 0.25s ease' }}>
                        <img
                            src={file.url}
                            alt={file.name}
                            className={cn('max-w-full max-h-[55vh] object-contain rounded-xl shadow-2xl transition-opacity duration-300', imgLoading ? 'opacity-0' : 'opacity-100')}
                            onLoad={() => setImgLoading(false)}
                            onError={() => setImgLoading(false)}
                        />
                    </div>
                    {/* Zoom/rotate sidebar */}
                    <div className={cn('absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 px-1.5 py-3 rounded-full border shadow-xl backdrop-blur-md', isDark ? 'bg-[#1a1a1a]/90 border-[#333]' : 'bg-white/90 border-[#e5e5e5]')}>
                        <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} title="Zoom in" className={cn('w-8 h-8 flex items-center justify-center rounded-xl transition-colors', isDark ? 'hover:bg-white/10 text-[#888] hover:text-primary' : 'hover:bg-[#f0f0f0] text-[#666] hover:text-primary')}><ZoomIn size={14}/></button>
                        <span className={cn('text-[9px] font-black tabular-nums h-6 flex items-center', isDark ? 'text-[#444]' : 'text-[#bbb]')}>{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} title="Zoom out" className={cn('w-8 h-8 flex items-center justify-center rounded-xl transition-colors', isDark ? 'hover:bg-white/10 text-[#888] hover:text-red-400' : 'hover:bg-[#f0f0f0] text-[#666] hover:text-red-400')}><ZoomOut size={14}/></button>
                        <div className={cn('w-4 h-px my-1', isDark ? 'bg-[#333]' : 'bg-[#e0e0e0]')}/>
                        <button onClick={() => setRotate(r => r + 90)} title="Rotate" className={cn('w-8 h-8 flex items-center justify-center rounded-xl transition-colors', isDark ? 'hover:bg-white/10 text-[#888] hover:text-white' : 'hover:bg-[#f0f0f0] text-[#666]')}><RotateCw size={14}/></button>
                        <button onClick={() => { setZoom(1); setRotate(0); }} title="Reset" className={cn('w-8 h-8 flex items-center justify-center rounded-xl text-[8px] font-black uppercase transition-colors', isDark ? 'hover:bg-white/10 text-[#444] hover:text-white' : 'hover:bg-[#f0f0f0] text-[#ccc]')}>RST</button>
                    </div>
                </div>
            );
        }
        if (kind === 'video') {
            return (
                <div className="flex-1 flex items-center justify-center p-6">
                    <video controls className="max-w-full max-h-[56vh] rounded-2xl shadow-2xl" src={file.url} />
                </div>
            );
        }
        if (kind === 'audio') {
            return (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
                    <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>
                        <Music size={40} className="text-white/90" />
                    </div>
                    <p className={cn('text-[15px] font-bold', isDark ? 'text-white' : 'text-[#111]')}>{file.name.replace(/\.[^.]+$/, '')}</p>
                    <audio controls className="w-full max-w-sm" src={file.url} />
                </div>
            );
        }
        // Generic / doc / archive
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
                <div className={cn('w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl', isDark ? 'bg-white/5' : 'bg-[#f5f5f5]')}>
                    <FileKindIcon kind={kind} size={36} />
                </div>
                <div className="text-center">
                    <p className={cn('text-[14px] font-bold', isDark ? 'text-[#ccc]' : 'text-[#444]')}>{file.name}</p>
                    <p className={cn('text-[11px] mt-1', muted)}>{fmtBytes(file.size)}</p>
                    <p className={cn('text-[10px] mt-2 opacity-60', muted)}>Download to open this file</p>
                </div>
                <button
                    onClick={() => downloadFile(file.url, file.name)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold transition-all hover:bg-primary/90 active:scale-95 shadow-lg shadow-primary/20"
                >
                    <Download size={13} /> Download
                </button>
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.18, ease: [0.22,1,0.36,1] }}
                className={cn('relative flex flex-col rounded-2xl border shadow-2xl overflow-hidden w-full max-w-3xl max-h-[90vh]', panelBg)}
                style={{ boxShadow: isDark ? '0 40px 80px rgba(0,0,0,0.8)' : '0 40px 80px rgba(0,0,0,0.15)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={cn('flex items-center gap-3 px-5 py-3.5 border-b shrink-0', isDark ? 'border-[#1e1e1e]' : 'border-[#f0f0f0]')}>
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', isDark ? 'bg-white/5' : 'bg-[#f5f5f5]')}>
                        <FileKindIcon kind={kind} size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={cn('text-[13px] font-bold truncate', isDark ? 'text-white' : 'text-[#111]')}>{file.name}</p>
                        <p className={cn('text-[10px]', muted)}>{fmtBytes(file.size)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={() => downloadFile(file.url, file.name)}
                            className={cn('h-8 px-3 gap-1.5 flex items-center justify-center rounded-lg transition-colors text-[11px] font-bold', isDark ? 'text-[#ccc] hover:text-white hover:bg-white/5' : 'text-[#666] hover:text-[#111] hover:bg-[#f5f5f5]')}
                            title="Download">
                            <Download size={13} />
                            Download
                        </button>
                        <button
                            onClick={() => {
                                const fullUrl = `${window.location.origin}${file.url}`;
                                navigator.clipboard.writeText(fullUrl);
                                appToast.success('Link copied', 'Download link copied to clipboard');
                            }}
                            className={cn('w-8 h-8 flex items-center justify-center rounded-lg transition-colors', isDark ? 'text-[#ccc] hover:text-white hover:bg-white/5' : 'text-[#666] hover:text-[#111] hover:bg-[#f5f5f5]')}
                            title="Copy Link">
                            <Link2 size={14} />
                        </button>
                        <div className={cn('w-px h-5 mx-1', isDark ? 'bg-[#2a2a2a]' : 'bg-[#e8e8e8]')} />
                        <AnimatePresence mode="wait">
                            {confirmDel ? (
                                <motion.button key="sure" initial={{ opacity:0,scale:0.8 }} animate={{ opacity:1,scale:1 }} exit={{ opacity:0,scale:0.8 }}
                                    onClick={() => { onDelete(); onClose(); }}
                                    className="px-3 h-8 flex items-center gap-1.5 rounded-lg bg-red-500 text-white text-[11px] font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all">
                                    <Trash2 size={12} /> Delete
                                </motion.button>
                            ) : (
                                <motion.button key="del" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                                    onClick={() => { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); }}
                                    className={cn('w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-red-400/50 hover:text-red-500', isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50')}>
                                    <Trash2 size={14} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                        <div className={cn('w-px h-5 mx-1', isDark ? 'bg-[#2a2a2a]' : 'bg-[#e8e8e8]')} />
                        <button onClick={onClose} className={cn('w-8 h-8 flex items-center justify-center rounded-lg transition-colors', isDark ? 'text-[#555] hover:text-white hover:bg-white/5' : 'text-[#aaa] hover:text-[#333] hover:bg-[#f5f5f5]')}>
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className={cn('flex-1 overflow-hidden flex flex-col min-h-0', isDark ? 'bg-[#0e0e0e]' : 'bg-[#f8f8f8]')}>
                    {renderContent()}
                </div>
            </motion.div>
        </div>
    );
}

// ─── Attachment Card ──────────────────────────────────────────────────────────

function AttachmentCard({ file, isDark, readOnly, onClick, onDelete }: {
    file: AttachmentFile;
    isDark: boolean;
    readOnly?: boolean;
    onClick: () => void;
    onDelete: () => void;
}) {
    const kind = detectFileKind(file.name);
    const isImg = kind === 'image';
    const [confirmDel, setConfirmDel] = useState(false);

    return (
        <div
            onClick={onClick}
            className={cn(
                'group/afile relative flex flex-col items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 select-none',
                isDark ? 'bg-[#1a1a1a] border-[#242424] hover:border-[#2e2e2e] hover:bg-[#1d1d1d]' 
                       : 'bg-white border-[#f0f0f0] hover:border-[#d8d8d8] hover:shadow-sm hover:shadow-black/5'
            )}
        >
            {/* Thumbnail area */}
            <div className="relative w-full aspect-square flex items-center justify-center py-1 min-h-[80px]">
                {isImg ? (
                    <div
                        className="w-full h-full rounded-xl overflow-hidden flex items-center justify-center relative p-1.5"
                        style={{
                            background: isDark
                                ? 'linear-gradient(45deg,#161616 25%,#1a1a1a 25%,#1a1a1a 50%,#161616 50%,#161616 75%,#1a1a1a 75%)'
                                : '#f9f9f9',
                            backgroundSize: '10px 10px'
                        }}
                    >
                        <img
                            src={file.url}
                            alt={file.name}
                            loading="lazy"
                            className="max-w-full max-h-full object-contain select-none pointer-events-none drop-shadow-sm transition-transform duration-300 group-hover/afile:scale-105"
                        />
                    </div>
                ) : (
                    <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover/afile:scale-105', isDark ? 'bg-white/[0.03]' : 'bg-[#f8f8f8]')}>
                        <FileKindIcon kind={kind} size={42} />
                    </div>
                )}
            </div>

            {/* Info bar */}
            <div className="w-full text-center px-1 space-y-0.5">
                <p className={cn('text-[11px] font-semibold truncate transition-colors', isDark ? 'text-[#ddd]' : 'text-[#444] group-hover/afile:text-primary')}>
                    {file.name}
                </p>
                <div className="flex items-center justify-center gap-1.5 opacity-40 group-hover/afile:opacity-70 transition-opacity">
                    <span className={cn('text-[9px] font-medium uppercase tracking-wider', isDark ? 'text-white' : 'text-black')}>
                        {fmtBytes(file.size)}
                    </span>
                    <div className={cn('w-[2px] h-[2px] rounded-full', isDark ? 'bg-white' : 'bg-black')} />
                    <span className={cn('text-[9px] font-medium uppercase tracking-wider', isDark ? 'text-white' : 'text-black')}>
                        {kind}
                    </span>
                </div>
            </div>

            {/* Floating Bottom actions */}
            <div className={cn(
                "absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-xl opacity-0 group-hover/afile:opacity-100 transition-all translate-y-1 group-hover/afile:translate-y-0 shadow-xl border",
                isDark ? "bg-[#1a1a1a]/95 border-[#333] backdrop-blur-md" : "bg-white border-[#ececec] shadow-black/5"
            )}>
                <button
                    onClick={e => { e.stopPropagation(); downloadFile(file.url, file.name); }}
                    className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                        isDark ? 'text-[#aaa] hover:text-white hover:bg-white/10' : 'text-[#666] hover:text-[#111] hover:bg-black/5'
                    )}
                    title="Download"
                >
                    <Download size={13} />
                </button>

                <button
                    onClick={e => {
                        e.stopPropagation();
                        const fullUrl = `${window.location.origin}${file.url}`;
                        navigator.clipboard.writeText(fullUrl);
                        appToast.success('Link copied', 'Download link copied to clipboard');
                    }}
                    className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                        isDark ? 'text-[#aaa] hover:text-white hover:bg-white/10' : 'text-[#666] hover:text-[#111] hover:bg-black/5'
                    )}
                    title="Copy Link"
                >
                    <Link2 size={13} />
                </button>

                {!readOnly && (
                    <AnimatePresence mode="wait">
                        {confirmDel ? (
                            <motion.button key="sure" initial={{ opacity:0,scale:0.8 }} animate={{ opacity:1,scale:1 }} exit={{ opacity:0,scale:0.8 }}
                                onClick={e => { e.stopPropagation(); onDelete(); }}
                                className="px-2 h-7 flex items-center justify-center rounded-lg bg-red-500 text-white text-[9px] font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all">
                                Sure?
                            </motion.button>
                        ) : (
                            <motion.button key="del" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                                onClick={e => { e.stopPropagation(); setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); }}
                                className={cn(
                                    'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                                    isDark ? 'text-red-400 opacity-60 hover:opacity-100 hover:bg-red-500/10' : 'text-red-400 hover:bg-red-50'
                                )}>
                                <Trash2 size={13} />
                            </motion.button>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}

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

function ChecklistItemRow({ item, isDark, onToggle, onDelete }: {
    item: { id: string; label: string; completed: boolean };
    isDark: boolean;
    onToggle: () => void;
    onDelete: () => void;
}) {
    const [confirmDel, setConfirmDel] = useState(false);

    return (
        <div className="flex items-center gap-3 group/item py-1">
            <button 
                onClick={onToggle}
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
            
            <AnimatePresence mode="wait">
                {confirmDel ? (
                    <motion.button 
                        key="sure" 
                        initial={{ opacity: 0, scale: 0.8 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={onDelete}
                        className="opacity-100 px-1.5 h-[22px] flex items-center justify-center rounded bg-red-500 text-white text-[8.5px] font-bold shadow-sm active:scale-95 transition-all"
                    >
                        Sure?
                    </motion.button>
                ) : (
                    <motion.button 
                        key="del" 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        onClick={() => { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); }}
                        className={cn(
                            "opacity-0 group-hover/item:opacity-40 hover:!opacity-100 transition-all p-1 rounded flex items-center justify-center h-[22px]",
                            isDark ? "text-[#555] hover:text-red-400 hover:bg-red-500/10" : "text-[#999] hover:text-red-500 hover:bg-red-50"
                        )}
                    >
                        <Trash2 size={12} />
                    </motion.button>
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
    const [activeTab, setActiveTab] = useState<'comments' | 'checklists' | 'attachments'>('checklists');
    const [deleting, setDeleting] = useState(false);
    const [comment, setComment]   = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Fast exit handling for AnimatePresence
    const [isPresent, safeToRemove] = usePresence();
    useEffect(() => {
        if (!isPresent) {
            const timer = setTimeout(safeToRemove, 180);
            return () => clearTimeout(timer);
        }
    }, [isPresent, safeToRemove]);

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
    const [isUploading, setIsUploading]   = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewingFile, setPreviewingFile] = useState<{id: string, name: string, url: string, size: number, type: string} | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const dropzoneRef = React.useRef<HTMLDivElement>(null);
    const wasFocusedRef = React.useRef(false);
    const [isDropzoneFocused, setIsDropzoneFocused] = useState(false);

    const [viewMode, setViewMode] = useState<'right' | 'center'>('right');
    const tagPickerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showTagPicker) return;
        const h = (e: MouseEvent) => {
            if (tagPickerRef.current && !tagPickerRef.current.contains(e.target as Node)) {
                setShowTagPicker(false);
            }
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [showTagPicker]);

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
    ] as const;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        await uploadFiles(files);
        e.target.value = '';
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        if (e.clipboardData.files.length > 0) {
            e.preventDefault();
            uploadFiles(Array.from(e.clipboardData.files));
        }
    };

    const uploadFiles = async (files: File[]) => {
        if (!files.length) return;
        setIsUploading(true);
        setUploadProgress(0);
        try {
            const uploaded: {id: string, name: string, url: string, size: number, type: string}[] = [];
            let totalBytes = files.reduce((acc, f) => acc + f.size, 0);
            let uploadedBytes = 0;
            for (const file of files) {
                const contentType = file.type || 'application/octet-stream';
                
                // 1. Get Presigned URL
                const presignResp = await fetch("/api/upload/presign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fileName: file.name,
                        contentType: contentType
                    })
                });
                
                if (!presignResp.ok) continue;
                const { presignedUrl, fileUrl } = await presignResp.json();

                // 2. Direct PUT to S3
                const json = await new Promise<any>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('PUT', presignedUrl);
                    xhr.setRequestHeader('Content-Type', contentType);
                    
                    let fileUploaded = 0;
                    xhr.upload.onprogress = (ev) => {
                        if (ev.lengthComputable) {
                            const newTotal = uploadedBytes + ev.loaded - fileUploaded;
                            fileUploaded = ev.loaded;
                            const progress = Math.min(100, Math.round((newTotal / totalBytes) * 100));
                            setUploadProgress(progress);
                        }
                    };
                    xhr.onload = () => {
                        uploadedBytes += file.size; // finalize this file's bytes length
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve({ url: fileUrl });
                        } else {
                            reject(new Error('S3 Upload failed'));
                        }
                    };
                    xhr.onerror = () => reject(new Error('Network Error'));
                    xhr.send(file);
                });

                if (json.url) {
                    uploaded.push({ id: crypto.randomUUID(), name: file.name, url: json.url, size: file.size, type: file.type });
                } else {
                    appToast.error('Upload failed', 'Unknown error');
                }
            }
            if (uploaded.length) {
                const next = [...attachments, ...uploaded];
                setAttachments(next);
                save({ custom_fields: { ...task.custom_fields, attachments: next } });
                appToast.success(`${uploaded.length} file${uploaded.length > 1 ? 's' : ''} uploaded`);
            }
        } catch (err: any) {
            appToast.error('Upload failed', err.message);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // Snappy ease curve: custom cubic-bezier for fast open, quick close
    const EASE_OUT: [number,number,number,number] = [0.22, 1, 0.36, 1];
    const EASE_IN:  [number,number,number,number] = [0.64, 0, 0.78, 0];

    const isRight = viewMode === 'right';

    return (
        <>
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
                            status === 'done' && (isDark ? "text-[#555]" : "text-[#aaa]")
                        )}
                        placeholder="Task title"
                    />

                    {/* Right controls */}
                    <div className="flex items-center gap-0.5 shrink-0">
                        <div className={cn("w-px h-4 mx-1", isDark ? "bg-[#2a2a2a]" : "bg-[#e8e8e8]")} />


                        <button onClick={toggleViewMode} title={viewMode === 'center' ? 'Dock right' : 'Center focus'}
                            className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                                isDark ? "text-[#666] hover:text-white hover:bg-white/8" : "text-[#aaa] hover:text-[#333] hover:bg-[#f5f5f5]")}>
                            {viewMode === 'center' ? <PanelRight size={14} /> : <Maximize size={14} />}
                        </button>

                        {!readOnly && (
                            <>

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
                                                {deleting ? <AppLoader size="xs" /> : <Trash2 size={12} />}
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
                                         <div className="flex flex-wrap items-center gap-1.5 w-full min-h-[26px]">
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
                                                 <div className="relative" ref={tagPickerRef}>
                                                     <button 
                                                         onClick={() => setShowTagPicker(!showTagPicker)}
                                                         className={cn(
                                                             "flex items-center gap-1.5 px-1.5 py-0.5 rounded-[5px] text-[9.5px] font-bold transition-all",
                                                             isDark ? "bg-white/5 text-[#555] hover:text-white" : "bg-black/5 text-[#aaa] hover:text-[#555]"
                                                         )}
                                                     >
                                                         <Plus size={8} />
                                                         Add
                                                     </button>
                                                     
                                                     {showTagPicker && (
                                                          <div className={cn(
                                                              "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[210] rounded-xl border shadow-2xl overflow-hidden p-1 flex flex-col gap-1",
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
                                            <ChecklistItemRow
                                                key={item.id}
                                                item={item}
                                                isDark={isDark}
                                                onToggle={() => {
                                                    const next = checklists.map(c => c.id === item.id ? { ...c, completed: !c.completed } : c);
                                                    setChecklists(next);
                                                    save({ custom_fields: { ...task.custom_fields, checklists: next } });
                                                }}
                                                onDelete={() => {
                                                    const next = checklists.filter(c => c.id !== item.id);
                                                    setChecklists(next);
                                                    save({ custom_fields: { ...task.custom_fields, checklists: next } });
                                                }}
                                            />
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
                                        <div 
                                            ref={dropzoneRef}
                                            tabIndex={0}
                                            onPaste={handlePaste}
                                            onFocus={() => setIsDropzoneFocused(true)}
                                            onBlur={() => setIsDropzoneFocused(false)}
                                            onMouseDown={() => {
                                                wasFocusedRef.current = (document.activeElement === dropzoneRef.current);
                                            }}
                                            onClick={() => {
                                                if (wasFocusedRef.current) {
                                                    fileInputRef.current?.click();
                                                }
                                            }}
                                            className={cn(
                                                "relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group/upload overflow-hidden outline-none",
                                                isUploading ? (isDark ? "border-primary/60 bg-primary/10" : "border-primary/40 bg-primary/[0.04]") 
                                                : isDropzoneFocused ? (isDark ? "border-primary bg-primary/10 ring-4 ring-primary/20" : "border-primary bg-primary/5 ring-4 ring-primary/10")
                                                : isDark ? "border-[#252525] hover:border-[#333] hover:bg-white/[0.02]" 
                                                : "border-[#e5e5e5] hover:border-[#ccc] hover:bg-black/[0.02]"
                                            )}
                                        >
                                            {isUploading && (
                                                <div 
                                                    className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-300 pointer-events-none" 
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            )}
                                            <div className="relative z-10 flex flex-col items-center gap-2 pointer-events-none">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-hover/upload:scale-110", 
                                                    (isUploading || isDropzoneFocused) ? "bg-primary text-white shadow-lg shadow-primary/25" : (isDark ? "bg-white/5" : "bg-[#f5f5f5]")
                                                )}>
                                                    {isUploading
                                                        ? <div className="text-[10px] font-bold">{uploadProgress}%</div>
                                                        : <Paperclip size={17} className={(isUploading || isDropzoneFocused) ? "text-white" : (isDark ? "text-[#444]" : "text-[#aaa]")} />
                                                    }
                                                </div>
                                                <p className={cn(
                                                    "text-[12.5px] font-bold transition-colors", 
                                                    (isUploading || isDropzoneFocused) ? "text-primary" : (isDark ? "text-[#ddd]" : "text-[#333]")
                                                )}>
                                                    {isUploading ? 'Uploading…' : isDropzoneFocused ? 'Paste Ready!' : 'Attach files'}
                                                </p>
                                                {!isUploading && (
                                                    <p className={cn("text-[10.5px] text-center transition-colors", isDropzoneFocused ? "text-primary/70 font-medium" : isDark ? "text-[#444]" : "text-[#888]")}>
                                                        {isDropzoneFocused ? 'Press Ctrl + V to paste or click again to upload' : 'Click to focus and paste, or click again to upload files'}
                                                    </p>
                                                )}
                                            </div>
                                            <input 
                                                ref={fileInputRef} 
                                                type="file" 
                                                multiple 
                                                className="hidden" 
                                                disabled={isUploading} 
                                                onChange={handleFileUpload} 
                                            />
                                        </div>
                                    )}

                                    {/* File grid/list */}
                                    {attachments.length > 0 && (
                                        <div className="grid grid-cols-2 gap-2">
                                            {attachments.map(file => (
                                                <AttachmentCard
                                                    key={file.id}
                                                    file={file}
                                                    isDark={isDark}
                                                    readOnly={readOnly}
                                                    onClick={() => setPreviewingFile(file)}
                                                    onDelete={() => {
                                                        const next = attachments.filter(a => a.id !== file.id);
                                                        setAttachments(next);
                                                        save({ custom_fields: { ...task.custom_fields, attachments: next } });
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {attachments.length === 0 && (
                                        <div className="py-10 flex flex-col items-center justify-center gap-3 opacity-20">
                                            <Paperclip size={24} />
                                            <span className="text-[12px] font-medium">No files attached</span>
                                        </div>
                                    )}
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

        {/* Attachment lightbox — rendered above the panel */}
        <AnimatePresence>
            {previewingFile && (
                <AttachmentPreview
                    file={previewingFile!}
                    isDark={isDark}
                    onClose={() => setPreviewingFile(null)}
                    onDelete={() => {
                        const f = previewingFile;
                        const next = attachments.filter(a => a.id !== f.id);
                        setAttachments(next);
                        save({ custom_fields: { ...task.custom_fields, attachments: next } });
                        setPreviewingFile(null);
                    }}
                />
            )}
        </AnimatePresence>
        </>
    );
}
