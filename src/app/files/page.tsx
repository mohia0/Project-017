"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLocalStorage } from '@mantine/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Folder, FolderOpen, FolderPlus, File, FileText, FileImage, FileVideo,
    FileAudio, FileCode, FileArchive, Link2, Search, Upload, Download,
    Trash2, Copy, Scissors, ClipboardPaste, Plus,
    ChevronRight, ChevronDown, LayoutGrid, List, SortAsc, SortDesc,
    Star, StarOff, Eye, Check, X, RefreshCw,
    ArrowLeft, ArrowRight, Home, Image, Music, Video, Archive,
    Pencil, ExternalLink, FolderSymlink,
    Lock, Unlock, Link, CloudUpload, FileCheck2, AlertTriangle,
    PanelLeftClose, PanelLeftOpen, ZoomIn, ZoomOut, RotateCw, RotateCcw,
    Package, Globe, ExternalLink as OpenExternal, Info,
} from 'lucide-react';
import { AppLoader } from '@/components/ui/AppLoader';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useMenuStore } from '@/store/useMenuStore';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatDistanceToNow } from 'date-fns';
import { appToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { useFileStore, ItemType, FileItem } from '@/store/useFileStore';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { SearchInput } from '@/components/ui/SearchInput';
import { ViewToggle } from '@/components/ui/ViewToggle';

// ─── Shared Components ────────────────────────────────────────────────────────

const ProgressContent = ({ progress, isDark }: { progress: number; isDark: boolean }) => {
    const isComplete = progress >= 100;
    return (
        <div className="w-full min-w-[200px] mt-1.5 text-left">
            <div className={cn("h-1 w-full rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-black/5")}>
                <div 
                    className={cn(
                        "h-full bg-primary transition-all duration-300 ease-out",
                        isComplete && "opacity-80"
                    )} 
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-1.5">
                    {isComplete ? (
                        <AppLoader size="xs" />
                    ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                    <span className={cn("text-[10px] font-medium uppercase tracking-wider", isDark ? "text-[#555]" : "text-[#aaa]")}>
                        {isComplete ? 'Finalizing library...' : 'Uploading files...'}
                    </span>
                </div>
                <span className={cn("text-[10px] font-bold tabular-nums", isDark ? "text-primary/80" : "text-primary")}>
                    {Math.round(progress)}%
                </span>
            </div>
        </div>
    );
};

interface UploadFile {
    id: string;
    file: File;
    progress: number;         // 0–100
    status: 'pending' | 'uploading' | 'done' | 'error';
    type: ItemType;
    fileUrl?: string;
    errorMessage?: string;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_ITEMS: FileItem[] = [
    { id: 'root', name: 'Root', type: 'folder', parentId: null, createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString() },
];

// ─── File type detector ───────────────────────────────────────────────────────

function detectType(filename: string): ItemType {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp', 'avif'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext)) return 'audio';
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'txt', 'md', 'rtf'].includes(ext)) return 'doc';
    if (['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'rb', 'php', 'java', 'cs', 'cpp', 'c', 'html', 'css', 'json', 'yaml', 'yml', 'toml', 'sh', 'bash'].includes(ext)) return 'code';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return 'archive';
    return 'file';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function getTypeLabel(type: ItemType): string {
    const map: Record<ItemType, string> = {
        folder: 'Folder', file: 'File', link: 'Link',
        image: 'Image', video: 'Video', audio: 'Audio',
        doc: 'Document', code: 'Code', archive: 'Archive'
    };
    return map[type] || 'File';
}

// ─── Icon Rendering ───────────────────────────────────────────────────────────

function getItemIcon(type: ItemType, size = 16, color?: string) {
    const cls = "shrink-0";
    switch (type) {
        case 'folder': return <Folder size={size} className={cls} style={{ color: color || '#f59e0b' }} />;
        case 'image': return <FileImage size={size} className={cls} style={{ color: '#ec4899' }} />;
        case 'video': return <FileVideo size={size} className={cls} style={{ color: '#3b82f6' }} />;
        case 'audio': return <FileAudio size={size} className={cls} style={{ color: '#8b5cf6' }} />;
        case 'doc': return <FileText size={size} className={cls} style={{ color: '#f97316' }} />;
        case 'code': return <FileCode size={size} className={cls} style={{ color: '#10b981' }} />;
        case 'archive': return <FileArchive size={size} className={cls} style={{ color: '#6b7280' }} />;
        case 'link': return <Link2 size={size} className={cls} style={{ color: '#06b6d4' }} />;
        default: return <File size={size} className={cls} style={{ color: '#9ca3af' }} />;
    }
}

// ─── Image Thumbnail (handles load errors gracefully) ────────────────────────

const loadedImageThumbs = new Set<string>();

function ImageThumb({ src, alt, isDark, fallback }: {
    src: string; alt: string; isDark: boolean; fallback: React.ReactNode;
}) {
    const [failed, setFailed] = useState(false);
    const isAlreadyLoaded = loadedImageThumbs.has(src);
    const [loading, setLoading] = useState(!isAlreadyLoaded);
    
    useEffect(() => {
        if (loadedImageThumbs.has(src)) {
            setLoading(false);
        } else {
            setLoading(true);
        }
    }, [src]);
    
    if (failed) return (
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105', isDark ? 'bg-white/[0.03]' : 'bg-[#f5f5f5]')}>
            {fallback}
        </div>
    );

    return (
        <div 
            className="w-full h-[80px] rounded-xl overflow-hidden transition-transform group-hover:scale-[1.02] flex items-center justify-center relative p-1.5" 
            style={{ 
                background: isDark 
                    ? 'linear-gradient(45deg, #161616 25%, #1a1a1a 25%, #1a1a1a 50%, #161616 50%, #161616 75%, #1a1a1a 75%, #1a1a1a 100%)' 
                    : '#f9f9f9',
                backgroundSize: '10px 10px'
            }}
        >
            {/* Blinking skeleton skeleton */}
            {loading && (
                <div className={cn(
                    "absolute inset-0 z-10 animate-pulse",
                    isDark ? "bg-white/[0.05]" : "bg-black/[0.03]"
                )} />
            )}
            
            <img
                src={src}
                alt={alt}
                className={cn(
                    "max-w-full max-h-full object-contain pointer-events-none select-none drop-shadow-sm transition-opacity duration-300",
                    loading ? "opacity-0" : "opacity-100"
                )}
                loading="lazy"
                onLoad={() => {
                    loadedImageThumbs.add(src);
                    setLoading(false);
                }}
                onError={() => {
                    setFailed(true);
                    setLoading(false);
                }}
            />
        </div>
    );
}

// ─── File Preview Modal ──────────────────────────────────────────────────────

const CODE_SAMPLE: Record<string, string> = {
    ts: `// api-integration.ts\nimport { createClient } from '@supabase/supabase-js';\n\nconst supabase = createClient(\n  process.env.NEXT_PUBLIC_SUPABASE_URL!,\n  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!\n);\n\nexport async function fetchClients() {\n  const { data, error } = await supabase\n    .from('clients')\n    .select('*')\n    .order('created_at', { ascending: false });\n  if (error) throw error;\n  return data;\n}\n\nexport async function createClient(payload: any) {\n  const { data, error } = await supabase\n    .from('clients')\n    .insert([payload])\n    .select()\n    .single();\n  if (error) throw error;\n  return data;\n}`,
    md: `# Project README\n\n## Overview\nThis project is a high-performance SaaS CRM built with Next.js 14, Supabase, and Tailwind CSS.\n\n## Features\n- 📊 Client management with real-time updates\n- 📄 Proposal & invoice generation\n- 📁 File manager with drag-and-drop\n- 🔔 Toast notification system\n- 🌙 Dark/Light mode\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Environment Variables\n\`\`\`env\nNEXT_PUBLIC_SUPABASE_URL=your_url\nNEXT_PUBLIC_SUPABASE_ANON_KEY=your_key\n\`\`\`\n\n## Architecture\nThe project follows a modular architecture with feature-based directory structure.`,
    json: `{\n  "name": "project-crm",\n  "version": "1.0.0",\n  "dependencies": {\n    "next": "^14.0.0",\n    "react": "^18.0.0",\n    "@supabase/supabase-js": "^2.0.0",\n    "goey-toast": "^1.0.0",\n    "framer-motion": "^11.0.0",\n    "lucide-react": "^0.400.0",\n    "zustand": "^4.0.0"\n  }\n}`,
};

function getCodeSample(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return CODE_SAMPLE[ext] || `// ${name}\n// Content preview not available for this file type.\n// Download the file to view its contents.`;
}

function FilePreviewModal({ item, isDark, onClose, onDownload, onStar, onDelete }: {
    item: FileItem;
    isDark: boolean;
    onClose: () => void;
    onDownload: () => void;
    onStar: () => void;
    onDelete: () => void;
}) {
    const [imgZoom, setImgZoom] = useState(1);
    const [imgRotate, setImgRotate] = useState(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const isAlreadyLoaded = item.downloadUrl ? loadedImageThumbs.has(item.downloadUrl) : false;
    const [imgLoading, setImgLoading] = useState(!isAlreadyLoaded);

    useEffect(() => {
        if (item.downloadUrl && loadedImageThumbs.has(item.downloadUrl)) {
            setImgLoading(false);
        } else {
            setImgLoading(true);
        }
    }, [item.downloadUrl]);
    const ext = item.name.split('.').pop()?.toLowerCase() || '';

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const panelBg = isDark ? 'bg-[#141414]' : 'bg-white';
    const border = isDark ? 'border-[#222]' : 'border-[#e8e8e8]';
    const muted = isDark ? 'text-[#555]' : 'text-[#aaa]';
    const subtle = isDark ? 'bg-[#1a1a1a]' : 'bg-[#f8f8f8]';

    // ── Image preview
    const renderPreview = () => {
        if (item.type === 'image') {
            const realUrl = item.downloadUrl?.includes('example.com') ? null : item.downloadUrl;
            return (
                <div className="flex-1 flex flex-col items-center justify-center overflow-hidden relative">
                    <div className="relative overflow-hidden rounded-xl" style={{ transform: `scale(${imgZoom}) rotate(${imgRotate}deg)`, transition: 'transform 0.3s ease' }}>
                        {realUrl ? (
                            <>
                                {imgLoading && (
                                    <div className={cn(
                                        "absolute inset-0 z-10 animate-pulse",
                                        isDark ? "bg-white/[0.05]" : "bg-black/[0.03]"
                                    )} />
                                )}
                                <img 
                                    src={realUrl} 
                                    alt={item.name} 
                                    className={cn(
                                        "max-w-full max-h-[55vh] object-contain rounded-xl shadow-2xl transition-opacity duration-300",
                                        imgLoading ? "opacity-0" : "opacity-100"
                                    )} 
                                    onLoad={() => {
                                        loadedImageThumbs.add(realUrl);
                                        setImgLoading(false);
                                    }}
                                    onError={() => setImgLoading(false)}
                                />
                            </>
                        ) : (
                            // Placeholder gradient image for demo
                            <div className={`w-[400px] h-[280px] rounded-2xl flex flex-col items-center justify-center gap-4 ${isDark ? 'bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'}`}>
                                <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-white/10 backdrop-blur">
                                    <FileImage size={36} className="text-pink-400" />
                                </div>
                                <div className="text-center">
                                    <p className={`text-[13px] font-semibold ${isDark ? 'text-white/70' : 'text-[#666]'}`}>{item.name}</p>
                                    <p className={`text-[11px] mt-1 ${muted}`}>Image preview · {formatBytes(item.size)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Zoom controls (vertical on the left) */}
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 px-1.5 py-3 rounded-full border shadow-xl backdrop-blur-md ${isDark ? 'bg-[#1a1a1a]/90 border-[#333]' : 'bg-white/90 border-[#e5e5e5]'}`}>
                        <button onClick={() => setImgZoom(z => Math.min(4, z + 0.25))} className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-[#888] hover:text-primary' : 'hover:bg-[#f0f0f0] text-[#666] hover:text-primary'}`} title="Zoom In"><ZoomIn size={14}/></button>
                        <span className={`text-[9px] font-black tabular-nums h-6 flex items-center justify-center ${isDark ? 'text-[#444]' : 'text-[#bbb]'}`}>{Math.round(imgZoom * 100)}%</span>
                        <button onClick={() => setImgZoom(z => Math.max(0.25, z - 0.25))} className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-[#888] hover:text-red-400' : 'hover:bg-[#f0f0f0] text-[#666] hover:text-red-400'}`} title="Zoom Out"><ZoomOut size={14}/></button>
                        
                        <div className={`w-4 h-[1px] my-1 ${isDark ? 'bg-[#333]' : 'bg-[#e0e0e0]'}`}/>
                        
                        <button onClick={() => setImgRotate(r => r + 90)} className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-[#888] hover:text-white' : 'hover:bg-[#f0f0f0] text-[#666] hover:text-[#333]'}`} title="Rotate"><RotateCw size={14}/></button>
                        <button 
                            onClick={() => { setImgZoom(1); setImgRotate(0); }} 
                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors text-[8px] font-black uppercase ${isDark ? 'hover:bg-white/10 text-[#444] hover:text-white' : 'hover:bg-[#f0f0f0] text-[#ccc] hover:text-[#333]'}`}
                            title="Reset"
                        >
                            RST
                        </button>
                    </div>
                </div>
            );
        }

        if (item.type === 'video') {
            const realUrl = item.downloadUrl?.includes('example.com') ? null : item.downloadUrl;
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    {realUrl ? (
                        <video controls className="max-w-full max-h-[56vh] rounded-2xl shadow-2xl" src={realUrl}/>
                    ) : (
                        <div className={`w-full max-w-[480px] aspect-video rounded-2xl flex flex-col items-center justify-center gap-4 ${isDark ? 'bg-gradient-to-br from-[#0a0a0a] to-[#1a1a2e]' : 'bg-gradient-to-br from-slate-100 to-blue-50'} shadow-2xl`}>
                            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                                <Video size={36} className="text-blue-400" style={{ marginLeft: 4 }}/>
                            </div>
                            <div className="text-center">
                                <p className={`text-[13px] font-semibold ${isDark ? 'text-white/70' : 'text-[#555]'}`}>{item.name}</p>
                                <p className={`text-[11px] mt-1 ${muted}`}>{formatBytes(item.size)} · Video file</p>
                                <p className={`text-[10px] mt-2 ${muted} opacity-60`}>No preview available — download to play</p>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (item.type === 'audio') {
            const realUrl = item.downloadUrl?.includes('example.com') ? null : item.downloadUrl;
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
                    <div className={`w-32 h-32 rounded-[2rem] flex items-center justify-center shadow-2xl`} style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
                        <Music size={52} className="text-white/90"/>
                    </div>
                    <div className="text-center">
                        <p className={`text-[16px] font-bold ${isDark ? 'text-white' : 'text-[#111]'}`}>{item.name.replace(/\.[^.]+$/, '')}</p>
                        <p className={`text-[11px] mt-1 ${muted}`}>{formatBytes(item.size)} · {ext.toUpperCase()}</p>
                    </div>
                    {realUrl ? (
                        <audio controls className="w-full max-w-sm" src={realUrl}/>
                    ) : (
                        <div className={`w-full max-w-sm h-12 rounded-xl flex items-center justify-center gap-2 border ${isDark ? 'border-[#2a2a2a] bg-[#1a1a1a] text-[#555]' : 'border-[#e5e5e5] bg-[#fafafa] text-[#bbb]'}`}>
                            <Music size={13}/>
                            <span className="text-[11px] font-medium">Audio player — download to listen</span>
                        </div>
                    )}
                </div>
            );
        }

        if (item.type === 'code') {
            const code = getCodeSample(item.name);
            return (
                <div className="flex-1 overflow-auto p-4">
                    <pre className={`h-full text-[12px] leading-relaxed font-mono rounded-2xl p-5 overflow-auto ${isDark ? 'bg-[#0d1117] text-[#e6edf3]' : 'bg-[#f6f8fa] text-[#24292f]'}`}>
                        <code>{code}</code>
                    </pre>
                </div>
            );
        }

        if (item.type === 'doc') {
            const isPdf = ext === 'pdf';
            const isTxt = ['txt', 'md', 'rtf'].includes(ext);
            return (
                <div className="flex-1 overflow-auto p-6">
                    {isTxt ? (
                        <div className={`max-w-2xl mx-auto rounded-2xl p-8 shadow-inner text-[13px] leading-relaxed font-sans ${isDark ? 'bg-[#0f0f0f] text-[#c9d1d9]' : 'bg-white text-[#24292f] shadow-sm border border-[#e8e8e8]'}`}>
                            <div className="prose max-w-none">
                                <h1 className="text-[20px] font-bold mb-4 text-[#4dbf39]">Project README</h1>
                                <p className="mb-3">This project is a high-performance SaaS CRM built with <strong>Next.js 14</strong>, Supabase, and Tailwind CSS.</p>
                                <h2 className="text-[15px] font-bold mt-6 mb-2">Features</h2>
                                <ul className="space-y-1 pl-4 list-disc">
                                    {['Client management with real-time updates', 'Proposal & invoice generation', 'File manager with drag-and-drop', 'Toast notification system', 'Dark/Light mode'].map(f => <li key={f}>{f}</li>)}
                                </ul>
                                <h2 className="text-[15px] font-bold mt-6 mb-2">Getting Started</h2>
                                <pre className={`text-[11px] p-3 rounded-lg mt-2 font-mono ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'}`}>{`npm install\nnpm run dev`}</pre>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-6">
                            <div className={`w-48 h-64 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-2xl border ${isDark ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-[#e5e5e5]'}`}>
                                <div className="w-12 h-14 rounded-xl flex items-center justify-center" style={{ background: isPdf ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                                    <FileText size={24} className="text-white"/>
                                </div>
                                <div className="text-center px-4">
                                    <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-[#555]' : 'text-[#aaa]'}`}>{ext.toUpperCase()}</p>
                                    <p className={`text-[12px] font-semibold mt-1 ${isDark ? 'text-[#aaa]' : 'text-[#555]'}`}>{item.name}</p>
                                </div>
                                <div className={`w-3/4 space-y-1.5 mt-2`}>
                                    {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 rounded-full ${isDark ? 'bg-[#252525]' : 'bg-[#f0f0f0]'}`} style={{ width: `${60 + Math.sin(i) * 30}%` }}/>)}
                                </div>
                            </div>
                            <div className="text-center">
                                <p className={`text-[14px] font-semibold ${isDark ? 'text-[#aaa]' : 'text-[#555]'}`}>{item.name}</p>
                                <p className={`text-[11px] mt-1 ${muted}`}>{formatBytes(item.size)} · {ext.toUpperCase()} Document</p>
                                <p className={`text-[10px] mt-2 ${muted} opacity-60`}>Download to open in your default application</p>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (item.type === 'link') {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
                    <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl`} style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}>
                        <Globe size={44} className="text-white/90"/>
                    </div>
                    <div className="text-center max-w-xs">
                        <p className={`text-[18px] font-bold ${isDark ? 'text-white' : 'text-[#111]'}`}>{item.name}</p>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-cyan-500 hover:text-cyan-400 transition-colors mt-2 flex items-center justify-center gap-1.5">
                            {item.url} <OpenExternal size={11}/>
                        </a>
                    </div>
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-[13px] transition-all shadow-lg shadow-cyan-500/25 active:scale-95">
                        <OpenExternal size={14}/> Open Link
                    </a>
                </div>
            );
        }

        if (item.type === 'archive') {
            const ext = item.name.split('.').pop()?.toUpperCase() || 'Archive';
            return (
                <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
                    <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl relative ${isDark ? 'bg-[#1a1a1a]' : 'bg-[#f5f5f5]'}`}>
                        <FileArchive size={40} className={isDark ? 'text-[#444]' : 'text-[#bbb]'}/>
                        <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md text-[9px] font-black text-white tracking-wider" style={{ background: '#6b7280' }}>
                            {ext}
                        </div>
                    </div>
                    <div className="text-center">
                        <p className={`text-[15px] font-bold ${isDark ? 'text-[#ccc]' : 'text-[#444]'}`}>{item.name}</p>
                        <p className={`text-[11px] mt-1 ${muted}`}>{formatBytes(item.size)} · Compressed Archive</p>
                    </div>
                    <div className={`rounded-2xl border px-5 py-4 text-center max-w-xs ${isDark ? 'bg-[#1a1a1a] border-[#252525]' : 'bg-[#fafafa] border-[#ebebeb]'}`}>
                        <Package size={16} className={`mx-auto mb-2 ${isDark ? 'text-[#444]' : 'text-[#bbb]'}`}/>
                        <p className={`text-[11px] font-medium ${isDark ? 'text-[#666]' : 'text-[#999]'}`}>
                            Archive contents cannot be previewed in the browser.
                        </p>
                        <p className={`text-[10px] mt-1 ${muted} opacity-60`}>Download the file to inspect its contents.</p>
                    </div>
                    {item.downloadUrl && (
                        <button
                            onClick={onDownload}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg shadow-primary/20 active:scale-95"
                        >
                            <Download size={13}/> Download {ext}
                        </button>
                    )}
                </div>
            );
        }

        // Generic file fallback
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl ${isDark ? 'bg-[#1a1a1a]' : 'bg-[#f5f5f5]'}`}>
                    {getItemIcon(item.type, 42, item.color)}
                </div>
                <div className="text-center">
                    <p className={`text-[15px] font-bold ${isDark ? 'text-[#ccc]' : 'text-[#444]'}`}>{item.name}</p>
                    <p className={`text-[11px] mt-1 ${muted}`}>{formatBytes(item.size)} · {ext.toUpperCase() || 'File'}</p>
                    <p className={`text-[10px] mt-3 ${muted} opacity-60`}>No preview available for this file type</p>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
            onClick={onClose}>
            <div
                className={`relative flex flex-col rounded-2xl border shadow-2xl overflow-hidden w-full max-w-3xl max-h-[90vh] ${panelBg} ${border}`}
                style={{ boxShadow: isDark ? '0 40px 80px rgba(0,0,0,0.8)' : '0 40px 80px rgba(0,0,0,0.15)' }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={`flex items-center gap-3 px-5 py-3.5 border-b shrink-0 ${isDark ? 'border-[#1e1e1e]' : 'border-[#f0f0f0]'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5' : 'bg-[#f5f5f5]'}`}>
                        {getItemIcon(item.type, 16, item.color)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-bold truncate ${isDark ? 'text-white' : 'text-[#111]'}`}>{item.name}</p>
                        <p className={`text-[10px] ${muted}`}>{getTypeLabel(item.type)} · {formatBytes(item.size)} · Modified {formatDate(item.modifiedAt)}</p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                        <button onClick={onStar}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${item.starred ? 'text-amber-400' : isDark ? 'text-[#555] hover:text-amber-400 hover:bg-white/5' : 'text-[#ccc] hover:text-amber-400 hover:bg-[#f5f5f5]'}`}
                            title={item.starred ? 'Unstar' : 'Star'}>
                            <Star size={14} fill={item.starred ? 'currentColor' : 'none'}/>
                        </button>
                        <button onClick={onDownload}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isDark ? 'text-[#555] hover:text-white hover:bg-white/5' : 'text-[#aaa] hover:text-[#333] hover:bg-[#f5f5f5]'}`}
                            title="Download">
                            <Download size={14}/>
                        </button>
                        <AnimatePresence mode="wait">
                            {showDeleteConfirm ? (
                                <motion.button
                                    key="confirm"
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    onClick={onDelete}
                                    className="px-3 h-8 flex items-center justify-center rounded-lg bg-red-500 text-white text-[11px] font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                                >
                                    Sure?
                                </motion.button>
                            ) : (
                                <motion.button 
                                    key="delete"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-red-400/50 hover:text-red-500 ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
                                    title="Delete">
                                    <Trash2 size={14}/>
                                </motion.button>
                            )}
                        </AnimatePresence>
                        <div className={`w-[1px] h-5 mx-1 ${isDark ? 'bg-[#2a2a2a]' : 'bg-[#e8e8e8]'}`}/>
                        <button onClick={onClose}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isDark ? 'text-[#555] hover:text-white hover:bg-white/5' : 'text-[#aaa] hover:text-[#333] hover:bg-[#f5f5f5]'}`}>
                            <X size={14}/>
                        </button>
                    </div>
                </div>

                {/* Preview area */}
                <div className={`flex-1 overflow-hidden flex flex-col min-h-0 ${subtle}`}>
                    {renderPreview()}
                </div>

                {/* Footer info bar */}
                <div className={`flex items-center gap-4 px-5 py-2.5 border-t text-[10px] shrink-0 ${isDark ? 'border-[#1a1a1a] text-[#444]' : 'border-[#f0f0f0] text-[#bbb]'}`}>
                    <span>Type: <strong className={isDark ? 'text-[#666]' : 'text-[#999]'}>{getTypeLabel(item.type)}</strong></span>
                    <span>Size: <strong className={isDark ? 'text-[#666]' : 'text-[#999]'}>{formatBytes(item.size)}</strong></span>
                    <span>Created: <strong className={isDark ? 'text-[#666]' : 'text-[#999]'}>{formatDate(item.createdAt)}</strong></span>
                    <span>Modified: <strong className={isDark ? 'text-[#666]' : 'text-[#999]'}>{formatDate(item.modifiedAt)}</strong></span>
                    {item.starred && <span className="text-amber-400">★ Starred</span>}
                    {item.locked && <span className={isDark ? 'text-[#555]' : 'text-[#bbb]'}>🔒 Locked</span>}
                    <div className="flex-1"/>
                    <span className={`tabular-nums font-mono ${isDark ? 'text-[#333]' : 'text-[#ddd]'}`}>{item.id}</span>
                </div>
            </div>
        </div>
    );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

const ACCEPTED_FORMATS = [
    { label: 'Images', exts: ['JPG', 'PNG', 'SVG', 'WEBP', 'GIF', 'AVIF'], color: '#ec4899', icon: <FileImage size={13}/> },
    { label: 'Documents', exts: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'TXT', 'MD'], color: '#f97316', icon: <FileText size={13}/> },
    { label: 'Video', exts: ['MP4', 'MOV', 'WEBM', 'AVI'], color: '#3b82f6', icon: <FileVideo size={13}/> },
    { label: 'Audio', exts: ['MP3', 'WAV', 'OGG', 'FLAC'], color: '#8b5cf6', icon: <FileAudio size={13}/> },
    { label: 'Code', exts: ['TS', 'JS', 'PY', 'GO', 'JSON'], color: '#10b981', icon: <FileCode size={13}/> },
    { label: 'Archives', exts: ['ZIP', 'RAR', '7Z', 'TAR', 'GZ'], color: '#6b7280', icon: <FileArchive size={13}/> },
];

function UploadModal({ isDark, onClose, onUploaded, currentFolderId }: {
    isDark: boolean;
    onClose: () => void;
    onUploaded: (files: FileItem[]) => void;
    currentFolderId: string;
}) {
    const [uploads, setUploads] = useState<UploadFile[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addFiles = (fileList: FileList | null) => {
        if (!fileList) return;
        const newUploads: UploadFile[] = Array.from(fileList).map(f => ({
            id: `up-${Date.now()}-${Math.random()}`,
            file: f,
            progress: 0,
            status: 'pending',
            type: detectType(f.name),
        }));
        setUploads(prev => [...prev, ...newUploads]);
    };

    const removeUpload = (id: string) => setUploads(prev => prev.filter(u => u.id !== id));

    const startUpload = () => {
        const pendingIds = uploads.filter(u => u.status === 'pending').map(u => u.id);
        if (pendingIds.length === 0) return;

        pendingIds.forEach(id => {
            const uploadObj = uploads.find(u => u.id === id);
            if (!uploadObj) return;

            setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'uploading', progress: 0 } : u));

            const formData = new FormData();
            formData.append("file", uploadObj.file);

            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/upload", true);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    setUploads(prev => prev.map(u => u.id === id ? { ...u, progress } : u));
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    try {
                        const resp = JSON.parse(xhr.responseText);
                        setUploads(prev => prev.map(u => u.id === id ? {
                            ...u,
                            status: 'done',
                            progress: 100,
                            fileUrl: resp.url
                        } : u));
                    } catch {
                        setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error', errorMessage: 'Invalid server response' } : u));
                    }
                } else {
                    let errorMsg = 'Upload failed';
                    try {
                        const errBody = JSON.parse(xhr.responseText);
                        errorMsg = errBody.details || errBody.error || errorMsg;
                    } catch (e) {}
                    setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error', errorMessage: errorMsg } : u));
                }
            };

            xhr.onerror = () => {
                setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error', errorMessage: 'Network error' } : u));
            };

            xhr.send(formData);
        });
    };

    const allDone = uploads.length > 0 && uploads.every(u => u.status === 'done' || u.status === 'error');

    const confirmUpload = useCallback((currentUploads: UploadFile[]) => {
        const done = currentUploads.filter(u => u.status === 'done');
        const errors = currentUploads.filter(u => u.status === 'error');
        const newItems: FileItem[] = done.map(u => ({
            id: `file-${Date.now()}-${Math.random()}`,
            name: u.file.name,
            type: u.type,
            parentId: currentFolderId,
            size: u.file.size,
            downloadUrl: u.fileUrl || `https://cdn.example.com/files/${u.file.name}`,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
        }));
        onUploaded(newItems);
        const addPromise = new Promise<string>((resolve, reject) => {
            setTimeout(() => {
                if (errors.length === 0) {
                    resolve(`${done.length} file${done.length !== 1 ? 's' : ''} added to library`);
                } else {
                    reject(new Error(`${errors.length} file${errors.length !== 1 ? 's' : ''} failed`));
                }
            }, 150);
        });
        appToast.promise(addPromise, {
            loading: 'Adding to library...',
            success: 'Reference added',
            error: 'Failed to add reference'
        });
        onClose();
    }, [currentFolderId, onUploaded, onClose]);

    // Auto-confirm: pass the LATEST uploads snapshot directly — no stale closure.
    useEffect(() => {
        if (uploads.length > 0 && uploads.every(u => u.status === 'done')) {
            const snapshot = uploads; // capture current reference
            const t = setTimeout(() => confirmUpload(snapshot), 600);
            return () => clearTimeout(t);
        }
    }, [uploads, confirmUpload]);

    const panelBg = isDark ? 'bg-[#161616] border-[#2a2a2a]' : 'bg-white border-[#e5e5e5]';
    const dropZoneBg = isDragOver
        ? isDark ? 'border-primary bg-primary/5' : 'border-primary bg-primary/5'
        : isDark ? 'border-[#2a2a2a] hover:border-[#383838]' : 'border-[#e0e0e0] hover:border-[#ccc]';
    const itemBg = isDark ? 'bg-[#1e1e1e] border-[#2a2a2a]' : 'bg-[#fafafa] border-[#eeeeee]';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className={cn('relative rounded-2xl border shadow-2xl w-[560px] max-h-[86vh] flex flex-col overflow-hidden', panelBg)}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={cn('flex items-center justify-between px-5 py-4 border-b', isDark ? 'border-[#242424]' : 'border-[#f0f0f0]')}>
                    <div className="flex items-center gap-3">
                        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', isDark ? 'bg-white/5' : 'bg-[#f5f5f5]')}>
                            <CloudUpload size={16} className="text-primary"/>
                        </div>
                        <div>
                            <h2 className="text-[14px] font-bold">Upload Files</h2>
                            <p className={cn('text-[11px] mt-0.5', isDark ? 'text-[#555]' : 'text-[#aaa]')}>Drag & drop or browse your computer</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-colors', isDark ? 'text-[#555] hover:text-white hover:bg-white/8' : 'text-[#aaa] hover:text-[#333] hover:bg-[#f0f0f0]')}>
                        <X size={14}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Drop Zone */}
                    <div
                        className={cn('border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all', dropZoneBg)}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={e => { e.preventDefault(); setIsDragOver(false); addFiles(e.dataTransfer.files); }}
                    >
                        <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center transition-all', isDragOver ? 'bg-primary/15 scale-110' : isDark ? 'bg-white/5' : 'bg-[#f5f5f5]')}>
                            <CloudUpload size={26} className={isDragOver ? 'text-primary' : isDark ? 'text-[#444]' : 'text-[#bbb]'}/>
                        </div>
                        <div className="text-center">
                            <p className={cn('text-[13px] font-semibold', isDark ? 'text-[#ccc]' : 'text-[#444]')}>
                                {isDragOver ? 'Drop files here' : 'Click to browse or drag files'}
                            </p>
                            <p className={cn('text-[11px] mt-1', isDark ? 'text-[#444]' : 'text-[#bbb]')}>Max file size: 500 MB</p>
                        </div>
                        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => addFiles(e.target.files)}/>
                    </div>

                    {/* Accepted formats */}
                    <div className={cn('rounded-xl border p-3', isDark ? 'border-[#222]' : 'border-[#eeeeee]')}>
                        <p className={cn('text-[9.5px] font-bold uppercase tracking-widest mb-2.5', isDark ? 'text-[#444]' : 'text-[#bbb]')}>Accepted Formats</p>
                        <div className="flex flex-wrap gap-2">
                            {ACCEPTED_FORMATS.map(group => (
                                <div key={group.label} className="flex items-center gap-1.5">
                                    <span style={{ color: group.color }}>{group.icon}</span>
                                    <span className={cn('text-[10px] font-medium', isDark ? 'text-[#555]' : 'text-[#999]')}>{group.label}:</span>
                                    <div className="flex items-center gap-1">
                                        {group.exts.map(ext => (
                                            <span key={ext} className={cn('text-[9px] font-bold px-1 py-0.5 rounded', isDark ? 'bg-white/5 text-[#555]' : 'bg-[#f0f0f0] text-[#aaa]')}>{ext}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* File Queue */}
                    {uploads.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className={cn('text-[10px] font-bold uppercase tracking-widest', isDark ? 'text-[#444]' : 'text-[#bbb]')}>
                                    {uploads.length} file{uploads.length !== 1 ? 's' : ''} queued
                                </p>
                                {uploads.some(u => u.status === 'pending') && (
                                    <button onClick={() => setUploads([])} className={cn('text-[10px] font-medium transition-colors', isDark ? 'text-[#444] hover:text-[#888]' : 'text-[#bbb] hover:text-[#888]')}>
                                        Clear all
                                    </button>
                                )}
                            </div>
                            {uploads.map(upload => (
                                <div key={upload.id} className={cn('flex items-center gap-3 p-3 rounded-xl border', itemBg)}>
                                    {/* Icon */}
                                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', isDark ? 'bg-white/5' : 'bg-white')}>
                                        {getItemIcon(upload.type, 14)}
                                    </div>

                                    {/* Info + Progress */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <span className={cn('text-[12px] font-medium truncate', isDark ? 'text-[#ccc]' : 'text-[#333]')}>{upload.file.name}</span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className={cn('text-[10px] tabular-nums', isDark ? 'text-[#555]' : 'text-[#bbb]')}>{formatBytes(upload.file.size)}</span>
                                                {upload.status === 'done' && <FileCheck2 size={13} className="text-primary"/>}
                                                {upload.status === 'error' && <AlertTriangle size={13} className="text-red-500"/>}
                                                {upload.status === 'pending' && (
                                                    <button onClick={() => removeUpload(upload.id)} className={cn('w-4 h-4 flex items-center justify-center rounded transition-colors', isDark ? 'text-[#444] hover:text-red-400' : 'text-[#ccc] hover:text-red-500')}>
                                                        <X size={10}/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {/* Progress bar */}
                                        <div className={cn('h-1 rounded-full overflow-hidden', isDark ? 'bg-white/5' : 'bg-[#eeeeee]')}>
                                            <div
                                                className={cn('h-full rounded-full transition-all duration-300 ease-out',
                                                    upload.status === 'done' ? 'bg-primary'
                                                    : upload.status === 'error' ? 'bg-red-500'
                                                    : 'bg-primary'
                                                )}
                                                style={{ width: `${upload.progress}%` }}
                                            />
                                        </div>
                                        {upload.status === 'error' && upload.errorMessage && (
                                            <p className="text-[9px] text-red-400 mt-1 font-medium italic truncate">
                                                {upload.errorMessage}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between mt-1">
                                            <span className={cn('text-[9.5px]', isDark ? 'text-[#444]' : 'text-[#bbb]')}>
                                                {upload.status === 'pending' && 'Ready to upload'}
                                                {upload.status === 'uploading' && `Uploading… ${upload.progress}%`}
                                                {upload.status === 'done' && 'Complete'}
                                                {upload.status === 'error' && 'Upload failed'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className={cn('flex items-center gap-2 px-5 py-4 border-t', isDark ? 'border-[#242424]' : 'border-[#f0f0f0]')}>
                    {allDone ? (
                        <button onClick={confirmUpload.bind(null, uploads)} className="flex-1 h-10 rounded-xl text-[12px] font-bold bg-primary hover:bg-primary-hover text-primary-foreground transition-all active:scale-[0.98] shadow-lg shadow-primary/20">
                            Add to Library
                        </button>
                    ) : (
                        <button
                            onClick={startUpload}
                            disabled={uploads.length === 0 || uploads.every(u => u.status !== 'pending')}
                            className={cn(
                                'flex-1 h-10 rounded-xl text-[12px] font-bold transition-all active:scale-[0.98]',
                                uploads.length > 0 && uploads.some(u => u.status === 'pending')
                                    ? 'bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg shadow-primary/20'
                                    : 'bg-primary/30 text-primary-foreground/40 cursor-not-allowed'
                            )}
                        >
                            {uploads.some(u => u.status === 'uploading') ? (
                                <span className="flex items-center justify-center gap-2">
                                    <AppLoader size="xs" /> Uploading…
                                </span>
                            ) : (
                                `Upload ${uploads.filter(u => u.status === 'pending').length > 0 ? uploads.filter(u => u.status === 'pending').length + ' file' + (uploads.filter(u => u.status === 'pending').length !== 1 ? 's' : '') : 'Files'}`
                            )}
                        </button>
                    )}
                    <button onClick={onClose} className={cn('h-10 px-4 rounded-xl text-[12px] font-medium transition-colors border', isDark ? 'border-[#2a2a2a] text-[#666] hover:text-white hover:bg-white/5' : 'border-[#e5e5e5] text-[#888] hover:text-[#333] hover:bg-[#f5f5f5]')}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Tree Node ────────────────────────────────────────────────────────────────

function TreeNode({
    item, items, depth, currentFolderId, onNavigate, isDark, expandedIds, toggleExpand, dragOver, onDragOver, onDrop, onContextMenu
}: {
    item: FileItem; items: FileItem[]; depth: number; currentFolderId: string;
    onNavigate: (id: string) => void; isDark: boolean; expandedIds: Set<string>;
    toggleExpand: (id: string) => void; dragOver: string | null;
    onDragOver: (id: string | null) => void; onDrop: (targetId: string) => void;
    onContextMenu: (e: React.MouseEvent, itemId: string) => void;
}) {
    if (!item) return null;
    const children = items.filter(i => i.parentId === item.id && i.type === 'folder');
    const isExpanded = expandedIds.has(item.id);
    const isActive = currentFolderId === item.id;
    const isDragTarget = dragOver === item.id;

    return (
        <div>
            <div
                className={cn(
                    'group flex items-center gap-1 py-1 pr-2 rounded-lg cursor-pointer select-none transition-all',
                    isActive
                        ? isDark ? 'bg-white/8 text-white' : 'bg-[#f0f0f0] text-[#111]'
                        : isDark ? 'hover:bg-white/5 text-[#888]' : 'hover:bg-[#f5f5f5] text-[#666]',
                    isDragTarget && (isDark ? 'bg-white/10 ring-1 ring-primary/40' : 'bg-primary/10 ring-1 ring-primary/30'),
                )}
                style={{ paddingLeft: `${depth * 12 + 4}px` }}
                onClick={() => onNavigate(item.id)}
                onContextMenu={e => onContextMenu(e, item.id)}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver(item.id); }}
                onDragLeave={() => onDragOver(null)}
                onDrop={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDrop(item.id); }}
            >
                <button
                    onClick={e => { e.stopPropagation(); toggleExpand(item.id); }}
                    className={cn('w-4 h-4 flex items-center justify-center rounded transition-colors shrink-0', children.length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none')}
                >
                    {isExpanded ? <ChevronDown size={10} strokeWidth={2.5}/> : <ChevronRight size={10} strokeWidth={2.5}/>}
                </button>
                {isExpanded
                    ? <FolderOpen size={13} style={{ color: item.color || '#f59e0b' }} className="shrink-0"/>
                    : <Folder size={13} style={{ color: item.color || '#f59e0b' }} className="shrink-0"/>}
                <span className="text-[11.5px] font-medium truncate flex-1">{item.name}</span>
                {item.starred && <Star size={9} fill="currentColor" className="text-amber-400 opacity-60 shrink-0"/>}
            </div>
            {isExpanded && children.map(child => (
                <TreeNode key={child.id} item={child} items={items} depth={depth + 1} currentFolderId={currentFolderId}
                    onNavigate={onNavigate} isDark={isDark} expandedIds={expandedIds} toggleExpand={toggleExpand}
                    dragOver={dragOver} onDragOver={onDragOver} onDrop={onDrop} onContextMenu={onContextMenu}/>
            ))}
        </div>
    );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ folderId, items, onNavigate, isDark }: {
    folderId: string; items: FileItem[]; onNavigate: (id: string) => void; isDark: boolean;
}) {
    const { navItems } = useMenuStore();
    const path: FileItem[] = [];
    let current: FileItem | undefined = items.find(i => i.id === folderId);
    while (current) { path.unshift(current); current = current.parentId ? items.find(i => i.id === current!.parentId) : undefined; }
    return (
        <div className="flex items-center gap-0.5 min-w-0">
            <button onClick={() => onNavigate('root')} className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-colors shrink-0', isDark ? 'text-[#666] hover:text-white hover:bg-white/5' : 'text-[#aaa] hover:text-[#333] hover:bg-[#f0f0f0]')}>
                <Home size={12}/>
                <span className="text-[11px] font-semibold">{navItems.find(item => item.href === '/files')?.label || 'Home'}</span>
            </button>
            {path.map((item, i) => (
                <React.Fragment key={item.id}>
                    <ChevronRight size={10} className={isDark ? 'text-[#444]' : 'text-[#ccc]'}/>
                    <button onClick={() => onNavigate(item.id)} className={cn('px-1.5 py-0.5 text-[11px] rounded transition-colors whitespace-nowrap font-medium',
                        i === path.length - 1
                            ? isDark ? 'text-[#e5e5e5]' : 'text-[#111]'
                            : isDark ? 'text-[#666] hover:text-white hover:bg-white/5' : 'text-[#999] hover:text-[#333] hover:bg-[#f0f0f0]'
                    )}>
                        {item.name}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
}

// ─── Rename Input ─────────────────────────────────────────────────────────────

function RenameInput({ value, onConfirm, onCancel, isDark }: { value: string; onConfirm: (v: string) => void; onCancel: () => void; isDark: boolean }) {
    const [val, setVal] = React.useState(value);
    const ref = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
    return (
        <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
            onBlur={() => onConfirm(val)}
            onKeyDown={e => { if (e.key === 'Enter') onConfirm(val); if (e.key === 'Escape') onCancel(); }}
            onClick={e => e.stopPropagation()}
            className={cn('text-[12px] font-medium px-1.5 py-0.5 rounded border outline-none w-full min-w-0',
                isDark ? 'bg-[#1f1f1f] border-primary/40 text-white' : 'bg-white border-primary/50 text-[#111]')}
        />
    );
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

interface CtxMenu { x: number; y: number; itemId: string | null; }

function ContextMenu({ menu, items, isDark, onAction, onClose }: {
    menu: CtxMenu; items: FileItem[]; isDark: boolean;
    onAction: (action: string, itemId: string | null) => void; onClose: () => void;
}) {
    const item = menu.itemId ? items.find(i => i.id === menu.itemId) : null;
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Clamp menu position to viewport
    const [pos, setPos] = React.useState({ x: menu.x, y: menu.y });
    React.useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const x = Math.min(menu.x, window.innerWidth - rect.width - 8);
            const y = Math.min(menu.y, window.innerHeight - rect.height - 8);
            setPos({ x, y });
        }
    }, [menu.x, menu.y]);

    const menuBg = isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-white border-[#e8e8e8]';
    const mi = (label: string, icon: React.ReactNode, action: string, danger = false, accent = false) => (
        <button key={action} onClick={() => { onAction(action, menu.itemId); onClose(); }}
            className={cn('w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-medium text-left transition-colors rounded-lg',
                danger ? isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'
                : accent ? 'text-primary hover:bg-primary/10'
                : isDark ? 'text-[#ccc] hover:bg-white/5 hover:text-white' : 'text-[#444] hover:bg-[#f5f5f5] hover:text-[#111]'
            )}>
            {icon} {label}
        </button>
    );
    const divider = <div className={cn('my-1 border-t', isDark ? 'border-[#252525]' : 'border-[#efefef]')}/>;

    return (
        <div ref={menuRef} className={cn('fixed z-50 rounded-xl border shadow-2xl p-1.5 min-w-[190px]', menuBg)}
            style={{ left: pos.x, top: pos.y }} onContextMenu={e => e.preventDefault()}>
            {item ? (
                <>
                    {mi('Open', <Eye size={13}/>, 'open')}
                    {item.type !== 'link' && item.downloadUrl && mi('Copy Download Link', <Link size={13}/>, 'copyLink', false, true)}
                    {item.type !== 'link' && mi('Download', <Download size={13}/>, 'download')}
                    {divider}
                    {item.type === 'folder' && (
                        <>
                            <div className="px-3 py-2">
                                <div className="flex items-center justify-between mb-2">
                                    <p className={cn('text-[9px] font-bold uppercase tracking-widest', isDark ? 'text-[#444]' : 'text-[#bbb]')}>Folder Color</p>
                                    <button onClick={() => { onAction('color-null', menu.itemId); onClose(); }} 
                                        title="Reset to default"
                                        className={cn('p-1 rounded hover:bg-black/5 hover:text-primary transition-colors', isDark ? 'text-[#333] hover:bg-white/5' : 'text-[#bbb]')}>
                                        <RotateCcw size={11} strokeWidth={2.5} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    {[
                                        '#F5A623', '#F85359', '#E95F91', '#A85CF9', '#8289F1', 
                                        '#5D9CEC', '#4FC1E9', '#48CFAD', '#4DBF39', '#9B9B9B'
                                    ].map(c => (
                                        <button key={c} onClick={() => { onAction(`color-${c}`, menu.itemId); onClose(); }}
                                            className={cn('w-4.5 h-4.5 rounded-full transition-all hover:scale-125 border border-white/10 shadow-sm', 
                                                item.color === c ? (isDark ? 'ring-1 ring-white' : 'ring-1 ring-black') + ' ring-offset-1 ring-offset-transparent scale-110' : 'opacity-80')}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                            {divider}
                        </>
                    )}
                    {mi('Rename', <Pencil size={13}/>, 'rename')}
                    {mi('Duplicate', <Copy size={13}/>, 'duplicate')}
                    {mi('Move to…', <FolderSymlink size={13}/>, 'move')}
                    {divider}
                    {item.starred
                        ? mi('Remove Star', <StarOff size={13}/>, 'unstar')
                        : mi('Add Star', <Star size={13}/>, 'star')}
                    {item.locked
                        ? mi('Unlock', <Unlock size={13}/>, 'unlock')
                        : mi('Lock', <Lock size={13}/>, 'lock')}
                    {divider}
                    {mi('Delete', <Trash2 size={13}/>, 'delete', true)}
                </>
            ) : (
                <>
                    {mi('New Folder', <FolderPlus size={13}/>, 'newFolder')}
                    {mi('New Link', <Link2 size={13}/>, 'newLink')}
                    {mi('Upload Files', <Upload size={13}/>, 'upload')}
                    {divider}
                    {mi('Paste', <ClipboardPaste size={13}/>, 'paste')}
                </>
            )}
        </div>
    );
}

// ─── New Item Dialog ──────────────────────────────────────────────────────────

function NewItemDialog({ type, isDark, onConfirm, onCancel }: {
    type: 'folder' | 'link'; isDark: boolean;
    onConfirm: (name: string, url?: string) => void; onCancel: () => void;
}) {
    const [name, setName] = useState(type === 'folder' ? 'New Folder' : 'New Link');
    const [url, setUrl] = useState('https://');
    const nameRef = useRef<HTMLInputElement>(null);
    useEffect(() => { nameRef.current?.focus(); nameRef.current?.select(); }, []);

    const panelBg = isDark ? 'bg-[#1a1a1a] border-[#2c2c2c]' : 'bg-white border-[#e8e8e8]';
    const inputCls = cn('w-full px-3 py-2 text-[12px] rounded-lg border outline-none transition-colors',
        isDark ? 'bg-[#111] border-[#2e2e2e] text-white placeholder:text-[#444] focus:border-primary/40'
               : 'bg-[#fafafa] border-[#e5e5e5] text-[#111] placeholder:text-[#bbb] focus:border-primary/50');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className={cn('rounded-2xl border shadow-2xl p-5 w-80', panelBg)}>
                <div className="flex items-center gap-2.5 mb-4">
                    {type === 'folder' ? <FolderPlus size={16} className="text-amber-400"/> : <Link2 size={16} className="text-cyan-400"/>}
                    <h3 className="text-[14px] font-bold">New {type === 'folder' ? 'Folder' : 'Link'}</h3>
                </div>
                <div className="flex flex-col gap-2.5">
                    <div>
                        <label className={cn('text-[10px] font-semibold uppercase tracking-wider mb-1.5 block', isDark ? 'text-[#555]' : 'text-[#aaa]')}>Name</label>
                        <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && onConfirm(name, url)} className={inputCls}/>
                    </div>
                    {type === 'link' && (
                        <div>
                            <label className={cn('text-[10px] font-semibold uppercase tracking-wider mb-1.5 block', isDark ? 'text-[#555]' : 'text-[#aaa]')}>URL</label>
                            <input value={url} onChange={e => setUrl(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && onConfirm(name, url)}
                                placeholder="https://" className={inputCls}/>
                        </div>
                    )}
                </div>
                <div className="flex gap-2 mt-5">
                    <button onClick={() => onConfirm(name, url)}
                        className="flex-1 h-9 rounded-xl text-[12px] font-bold bg-primary hover:bg-primary-hover text-primary-foreground transition-colors active:scale-95">
                        Create
                    </button>
                    <button onClick={onCancel} className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-colors border',
                        isDark ? 'border-[#2e2e2e] hover:bg-white/5 text-[#666]' : 'border-[#e5e5e5] hover:bg-[#f5f5f5] text-[#888]')}>
                        <X size={14}/>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'list';
type SortKey = 'name' | 'type' | 'size' | 'modified';
type SortDir = 'asc' | 'desc';
type FilterType = 'all' | 'folder' | 'file' | 'image' | 'video' | 'audio' | 'doc' | 'code' | 'link' | 'archive' | 'starred';

// ─── File Skeleton ────────────────────────────────────────────────────────
const FileSkeleton = ({ view, isDark }: { view: ViewMode; isDark: boolean }) => {
    const pulseCls = cn("rounded-md", isDark ? "bg-white/[0.04]" : "bg-black/[0.04]");
    
    const SkeletonItem = () => (
        <motion.div 
            initial={{ opacity: 0.1 }}
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className={cn("p-3 rounded-xl border flex flex-col items-center gap-3", isDark ? "border-[#242424] bg-[#1a1a1a]" : "bg-white border-[#ededed]")}
        >
            <div className="relative w-full flex items-center justify-center py-2 mt-1">
                <div className={cn("w-12 h-12 rounded-2xl", pulseCls)} />
            </div>
            <div className="w-full space-y-2 flex flex-col items-center">
               <div className={cn("h-3 w-3/4", pulseCls)} />
               <div className={cn("h-2 w-1/2", pulseCls)} />
            </div>
            <div className="w-full h-8 mt-1 border-t border-dashed border-transparent" />
        </motion.div>
    );

    const ListItemSkeleton = () => (
        <motion.div 
            initial={{ opacity: 0.1 }}
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className={cn("grid px-3 py-[11px] items-center", isDark ? 'border-b border-[#1e1e1e]' : 'border-b border-[#f5f5f5]')}
            style={{ gridTemplateColumns: '32px 32px 1fr 80px 120px 120px 100px' }}>
            <div className={cn("w-3.5 h-3.5 mx-auto rounded-[3px]", pulseCls)} />
            <div className={cn("w-4 h-4 rounded-full", pulseCls)} />
            <div className={cn("h-2.5 w-3/4", pulseCls)} />
            <div className={cn("h-2 w-1/2", pulseCls)} />
            <div className={cn("h-2 w-1/2", pulseCls)} />
            <div className={cn("h-2 w-1/2", pulseCls)} />
            <div />
        </motion.div>
    );

    if (view === 'grid') {
        return (
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 content-start">
                {Array.from({ length: 32 }).map((_, i) => <SkeletonItem key={i} />)}
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className={cn("rounded-xl border overflow-hidden", isDark ? "border-[#222]" : "border-[#e8e8e8]")}>
                {Array.from({ length: 25 }).map((_, i) => <ListItemSkeleton key={i} />)}
            </div>
        </div>
    );
};

export default function FilesPage() {
    const { theme, activeWorkspaceId } = useUIStore();
    const { items, setItems, isLoading, fetchFiles } = useFileStore();
    const isDark = theme === 'dark';
    const [currentFolderId, setCurrentFolderId] = usePersistentState('files_filter_folder_id', 'root');
    const [view, setView] = usePersistentState<ViewMode>('files_filter_view', 'grid');
    const [sortKey, setSortKey] = usePersistentState<SortKey>('files_filter_sort_key', 'name');
    const [sortDir, setSortDir] = usePersistentState<SortDir>('files_filter_sort_dir', 'asc');
    const [filter, setFilter] = usePersistentState<FilterType>('files_filter_type', 'all');
    const [search, setSearch] = usePersistentState('files_filter_search', '');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['root']));
    const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState<string | null>(null);
    const [newDialog, setNewDialog] = useState<'folder' | 'link' | null>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [history, setHistory] = useState<string[]>(['root']);
    const [histIdx, setHistIdx] = useState(0);
    const [sidebarOpen, setSidebarOpen] = usePersistentState('files_filter_sidebar_open', true);
    const [previewItem, setPreviewItem] = useState<FileItem | null>(null);
    const [deleteWarning, setDeleteWarning] = useState<string[] | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [globalDragOver, setGlobalDragOver] = useState(false);
    const errorShown = useRef(false);

    // Sync files from Supabase
    useEffect(() => {
        if (!activeWorkspaceId) return;
        fetchFiles();
    }, [activeWorkspaceId, fetchFiles]);


    // Click-away listener for deletingId confirmation
    useEffect(() => {
        if (!deletingId) return;
        const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Only clear if we didn't click on a delete trigger or the confirmation itself
            if (!target.closest('.delete-trigger')) {
                setDeletingId(null);
            }
        };
        // Use capture to catch it before other stopPropagations if necessary, 
        // or just regular bubble is fine since we use closest()
        window.addEventListener('mousedown', handleOutsideClick);
        return () => window.removeEventListener('mousedown', handleOutsideClick);
    }, [deletingId]);

    // Migrate old direct Backblaze URLs to proxy URLs
    useEffect(() => {
        setItems(prev => prev.map(item => {
            if (item.downloadUrl && item.downloadUrl.includes('backblazeb2.com')) {
                const parts = item.downloadUrl.split('/');
                const key = parts[parts.length - 1];
                return { ...item, downloadUrl: `/api/files/${key}` };
            }
            return item;
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openPreview = (item: FileItem) => {
        if (item.type === 'folder') { navigate(item.id); return; }
        if (item.type === 'link' && item.url) { window.open(item.url, '_blank'); return; }
        setPreviewItem(item);
    };

    const navigate = useCallback((id: string) => {
        setCurrentFolderId(id);
        setSelectedIds(new Set());
        setDeletingId(null);
        setSearch('');
        setExpandedIds(prev => { const next = new Set(prev); next.add(id); return next; });
        setHistory(prev => { const h = prev.slice(0, histIdx + 1); h.push(id); return h; });
        setHistIdx(prev => prev + 1);
    }, [histIdx]);

    const goBack = () => {
        if (histIdx > 0) { setHistIdx(histIdx - 1); setCurrentFolderId(history[histIdx - 1]); setSelectedIds(new Set()); }
    };
    const goForward = () => {
        if (histIdx < history.length - 1) { setHistIdx(histIdx + 1); setCurrentFolderId(history[histIdx + 1]); setSelectedIds(new Set()); }
    };

    const currentChildren = React.useMemo(() => {
        let children = items.filter(i => i.parentId === currentFolderId);
        if (search.trim()) children = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.url && i.url.toLowerCase().includes(search.toLowerCase())));
        if (filter !== 'all') {
            if (filter === 'starred') children = children.filter(i => i.starred);
            else children = children.filter(i => i.type === filter);
        }
        return [...children].sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            let av: any, bv: any;
            if (sortKey === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
            else if (sortKey === 'type') { av = a.type; bv = b.type; }
            else if (sortKey === 'size') { av = a.size ?? 0; bv = b.size ?? 0; }
            else { av = a.modifiedAt; bv = b.modifiedAt; }
            return av < bv ? (sortDir === 'asc' ? -1 : 1) : av > bv ? (sortDir === 'asc' ? 1 : -1) : 0;
        });
    }, [items, currentFolderId, search, filter, sortKey, sortDir]);

    // Selection
    const toggleSelect = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    };
    const toggleAll = () => {
        if (selectedIds.size === currentChildren.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(currentChildren.map(i => i.id)));
    };
    const clearSelection = () => {
        setSelectedIds(new Set());
        setDeletingId(null);
    };

    const toggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    }, []);

    // D&D (items within file manager)
    const handleDrop = async (targetId: string) => {
        if (!draggedId || draggedId === targetId) { setDraggedId(null); setDragOver(null); return; }
        const target = items.find(i => i.id === targetId);
        if (!target || target.type !== 'folder') return;
        
        const { error } = await supabase
            .from('files')
            .update({ parent_id: targetId, modified_at: new Date().toISOString() })
            .eq('id', draggedId)
            .eq('workspace_id', activeWorkspaceId);
            
        if (!error) {
            setItems(prev => prev.map(i => i.id === draggedId ? { ...i, parentId: targetId } : i));
            appToast.success('Moved', `Item successfully moved to "${target.name}"`);
        } else {
            appToast.error('Move failed', 'Could not move the item');
        }
        setDraggedId(null); setDragOver(null);
    };

    const addFilesToDb = useCallback(async (newFiles: FileItem[]) => {
        if (!activeWorkspaceId) return;
        
        const dbItems = newFiles.map(i => ({
            id: i.id,
            name: i.name,
            type: i.type,
            parent_id: i.parentId,
            size: i.size,
            download_url: i.downloadUrl,
            workspace_id: activeWorkspaceId,
            created_at: i.createdAt,
            modified_at: i.modifiedAt,
            url: i.downloadUrl
        }));
        
        const { error } = await supabase.from('files').insert(dbItems);
        if (error) {
            console.error("Database error during file insertion:", error);
            throw error;
        }
        
        setItems(prev => [...prev, ...newFiles]);
    }, [activeWorkspaceId]);

    // Native OS file drag-and-drop upload
    const handleNativeFileDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setGlobalDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        // Initialize progress toast
        const toastId = appToast.message(`Uploading ${files.length} file${files.length !== 1 ? 's' : ''}...`, {
            description: <ProgressContent progress={0} isDark={isDark} />,
            duration: Infinity
        });
        const progresses = new Array(files.length).fill(0);

        const updateOverallProgress = () => {
            const totalSize = files.reduce((acc, f) => acc + f.size, 0);
            if (totalSize === 0) {
                const total = progresses.reduce((a, b) => a + b, 0);
                const average = total / files.length;
                appToast.update(toastId, { description: <ProgressContent progress={average} isDark={isDark} /> });
                return;
            }
            const totalLoaded = files.reduce((acc, f, i) => acc + (f.size * (progresses[i] / 100)), 0);
            const overallProgress = (totalLoaded / totalSize) * 100;
            appToast.update(toastId, {
                description: <ProgressContent progress={overallProgress} isDark={isDark} />
            });
        };

        try {
            const newItems: FileItem[] = [];
            
            await Promise.all(files.map(async (file, idx) => {
                return new Promise<void>((subResolve, subReject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("POST", "/api/upload", true);
                    
                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            progresses[idx] = (event.loaded / event.total) * 100;
                            updateOverallProgress();
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            const resp = JSON.parse(xhr.responseText);
                            newItems.push({
                                id: `file-${Date.now()}-${Math.random()}`,
                                name: file.name,
                                type: detectType(file.name),
                                parentId: currentFolderId,
                                size: file.size,
                                downloadUrl: resp.url,
                                createdAt: new Date().toISOString(),
                                modifiedAt: new Date().toISOString(),
                            });
                            subResolve();
                        } else {
                            subReject(new Error(`Failed to upload ${file.name}`));
                        }
                    };
                    xhr.onerror = () => subReject(new Error("Network error during upload"));
                    const formData = new FormData();
                    formData.append("file", file);
                    xhr.send(formData);
                });
            }));
            await addFilesToDb(newItems);
            appToast.success('Upload complete', 'All files have been uploaded successfully');
            appToast.dismiss(toastId);
        } catch (err: any) {
            appToast.error('Upload failed', (err as { message?: string })?.message || 'An error occurred during upload');
            appToast.dismiss(toastId);
        }
    }, [currentFolderId, addFilesToDb, isDark]);

    // CRUD
    // CRUD
    const createFolder = async (name: string) => {
        const newItem: FileItem = { id: `folder-${Date.now()}`, name, type: 'folder', parentId: currentFolderId, createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString() };
        const { error } = await supabase.from('files').insert([{ 
            id: newItem.id,
            name: newItem.name,
            type: newItem.type,
            parent_id: currentFolderId,
            workspace_id: activeWorkspaceId,
            created_at: newItem.createdAt,
            modified_at: newItem.modifiedAt
        }]);
        if (!error) {
            setItems(prev => [...prev, newItem]);
            appToast.success('Folder Created', `"${name}" has been created`);
            setNewDialog(null);
        }
    };
    const createLink = async (name: string, url?: string) => {
        const newItem: FileItem = { id: `link-${Date.now()}`, name, type: 'link', url, parentId: currentFolderId, createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString() };
        const { error } = await supabase.from('files').insert([{ 
            id: newItem.id,
            name: newItem.name,
            type: newItem.type,
            url: newItem.url,
            parent_id: currentFolderId,
            workspace_id: activeWorkspaceId,
            created_at: newItem.createdAt,
            modified_at: newItem.modifiedAt
        }]);
        if (!error) {
            setItems(prev => [...prev, newItem]);
            appToast.success('Link Added', `Link "${name}" has been added`);
            setNewDialog(null);
        }
    };
    const renameItem = async (id: string, newName: string) => {
        const { error } = await supabase
            .from('files')
            .update({ name: newName, modified_at: new Date().toISOString() })
            .eq('id', id)
            .eq('workspace_id', activeWorkspaceId);
        if (!error) {
            setItems(prev => prev.map(i => i.id === id ? { ...i, name: newName, modifiedAt: new Date().toISOString() } : i));
            setRenamingId(null);
        }
    };
    const deleteItems = async (ids: string[]) => {
        const toDelete = new Set<string>(ids);
        const addChildren = (id: string) => items.filter(i => i.parentId === id).forEach(child => { toDelete.add(child.id); addChildren(child.id); });
        ids.forEach(addChildren);
        
        const { error } = await supabase
            .from('files')
            .delete()
            .in('id', Array.from(toDelete))
            .eq('workspace_id', activeWorkspaceId);
        if (!error) {
            setItems(prev => prev.filter(i => !toDelete.has(i.id)));
            setSelectedIds(new Set());
            setDeleteWarning(null);
            appToast.error('Items Deleted', `${ids.length} item${ids.length !== 1 ? 's' : ''} have been removed`);
        }
    };

    const requestDelete = (ids: string[]) => {
        if (ids.length > 1) {
            setDeleteWarning(ids); // show warning for bulk
        } else {
            deleteItems(ids); // single item: delete directly
        }
    };
    const duplicateItems = async (ids: string[]) => {
        const clones = ids.map(id => { 
            const src = items.find(i => i.id === id)!; 
            return { ...src, id: `${src.id}-copy-${Date.now()}`, name: `${src.name} (copy)`, createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString() }; 
        });
        const dbClones = clones.map(c => ({
            id: c.id, 
            name: c.name, 
            type: c.type, 
            parent_id: c.parentId, 
            size: c.size, 
            download_url: c.downloadUrl, 
            starred: c.starred, 
            color: c.color,
            workspace_id: activeWorkspaceId,
            created_at: c.createdAt,
            modified_at: c.modifiedAt
        }));
        const { error } = await supabase.from('files').insert(dbClones);
        if (!error) {
            setItems(prev => [...prev, ...clones]);
            appToast.success('Duplicated', ids.length === 1 ? 'Item duplicated successfully' : `${ids.length} items duplicated successfully`);
        }
    };
    const toggleStar = async (id: string) => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        const newState = !item.starred;
        const { error } = await supabase
            .from('files')
            .update({ starred: newState })
            .eq('id', id)
            .eq('workspace_id', activeWorkspaceId);
        if (!error) {
            setItems(prev => prev.map(i => i.id === id ? { ...i, starred: newState } : i));
            if (newState) appToast.success('Starred', 'Item added to favorites');
            else appToast.message('Unstarred');
        }
    };
    const toggleLock = async (id: string) => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        const newState = !item.locked;
        const { error } = await supabase
            .from('files')
            .update({ locked: newState })
            .eq('id', id)
            .eq('workspace_id', activeWorkspaceId);
        if (!error) {
            setItems(prev => prev.map(i => i.id === id ? { ...i, locked: newState } : i));
            appToast.message(newState ? '🔒 Locked' : '🔓 Unlocked');
        }
    };
    const copyDownloadLink = (itemId: string) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        let link = item.downloadUrl || item.url || "";
        
        // Strip out legacy localhost origins if they were saved in the DB
        if (link.includes('localhost:3000')) {
            link = link.replace(/^https?:\/\/localhost:3000/, '');
        }

        // Use production domain if configured, otherwise fallback to current origin
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : "");
        const absoluteLink = (link.startsWith('/') && baseUrl) ? `${baseUrl}${link}` : link;

        navigator.clipboard.writeText(absoluteLink).then(() => {
            appToast.success('Link Copied', 'Download link copied to clipboard');
        }).catch(() => {
            appToast.error('Copy Failed', 'Could not copy link to clipboard');
        });
    };

    const recolorItem = async (id: string, color: string) => {
        const { error } = await supabase
            .from('files')
            .update({ color })
            .eq('id', id)
            .eq('workspace_id', activeWorkspaceId);
        if (!error) {
            setItems(prev => prev.map(i => i.id === id ? { ...i, color } : i));
            appToast.message('Color updated');
        }
    };

    const handleDownload = useCallback((item: FileItem) => {
        if (!item.downloadUrl) {
            appToast.error('Download Failed', "No download URL available for this file");
            return;
        }
        
        appToast.info('Downloading', `Started downloading "${item.name}"…`);
        
        // Trigger download via hidden link
        const link = document.createElement('a');
        link.href = item.downloadUrl;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    const handleCtxAction = (action: string, itemId: string | null) => {
        if (action === 'newFolder') setNewDialog('folder');
        else if (action === 'newLink') setNewDialog('link');
        else if (action === 'upload') setShowUpload(true);
        else if (itemId) {
            const item = items.find(i => i.id === itemId);
            if (action === 'open') {
                if (item?.type === 'folder') navigate(itemId);
                else if (item?.type === 'link' && item.url) window.open(item.url, '_blank');
                else if (item) openPreview(item);
            }
            else if (action === 'rename') setRenamingId(itemId);
            else if (action === 'duplicate') duplicateItems([itemId]);
            else if (action === 'delete') {
                if (itemId && selectedIds.has(itemId)) {
                    requestDelete(Array.from(selectedIds));
                } else {
                    requestDelete([itemId!]);
                }
            }
            else if (action === 'star') toggleStar(itemId);
            else if (action === 'unstar') toggleStar(itemId);
            else if (action === 'lock') toggleLock(itemId);
            else if (action === 'unlock') toggleLock(itemId);
            else if (action === 'copyLink') copyDownloadLink(itemId);
            else if (action === 'download' && item) handleDownload(item);
            else if (action.startsWith('color-')) recolorItem(itemId, action.replace('color-', ''));
        }
    };

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    // Theme tokens
    const border = isDark ? 'border-[#252525]' : 'border-[#ebebeb]';
    const panelBg = isDark ? 'bg-[#141414]' : 'bg-white';
    const gridBg = isDark ? 'bg-[#0f0f0f]' : 'bg-[#f7f7f7]';
    const cardBg = isDark ? 'bg-[#1a1a1a] border-[#242424]' : 'bg-white border-[#ededed]';
    const muted = isDark ? 'text-[#555]' : 'text-[#aaa]';
    const textPrimary = isDark ? 'text-[#e5e5e5]' : 'text-[#111]';

    const filterTabs: { id: FilterType; label: string; icon: React.ReactNode }[] = [
        { id: 'all', label: 'All', icon: <LayoutGrid size={11}/> },
        { id: 'folder', label: 'Folders', icon: <Folder size={11}/> },
        { id: 'image', label: 'Images', icon: <Image size={11}/> },
        { id: 'video', label: 'Videos', icon: <FileVideo size={11}/> },
        { id: 'audio', label: 'Audio', icon: <Music size={11}/> },
        { id: 'doc', label: 'Docs', icon: <FileText size={11}/> },
        { id: 'link', label: 'Links', icon: <Link2 size={11}/> },
        { id: 'archive', label: 'Archives', icon: <Archive size={11}/> },
        { id: 'starred', label: 'Starred', icon: <Star size={11}/> },
    ];

    const storageUsed = items.reduce((acc, i) => acc + (i.size || 0), 0);
    const storageTotal = 10 * 1024 * 1024 * 1024;
    const storagePct = Math.min((storageUsed / storageTotal) * 100, 100);

    return (
        <div className={cn('flex flex-col h-full overflow-hidden font-sans text-[13px]', isDark ? 'bg-[#141414] text-[#e5e5e5]' : 'bg-[#f7f7f7] text-[#111]')}
            onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, itemId: null }); }}>

            {/* ── Page Header ── */}
            <div className={cn('flex items-center justify-between px-5 py-3 shrink-0 border-b', panelBg, border)}>
                <div className="flex items-center gap-2">
                    {/* Back/Forward */}
                    <div className="flex items-center gap-0.5">
                        <button onClick={goBack} disabled={histIdx === 0}
                            className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all', histIdx === 0 ? 'opacity-20 cursor-not-allowed' : isDark ? 'hover:bg-white/8 text-[#888] hover:text-white' : 'hover:bg-[#f0f0f0] text-[#888] hover:text-[#111]')}>
                            <ArrowLeft size={13}/>
                        </button>
                        <button onClick={goForward} disabled={histIdx === history.length - 1}
                            className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all', histIdx === history.length - 1 ? 'opacity-20 cursor-not-allowed' : isDark ? 'hover:bg-white/8 text-[#888] hover:text-white' : 'hover:bg-[#f0f0f0] text-[#888] hover:text-[#111]')}>
                            <ArrowRight size={13}/>
                        </button>
                    </div>
                    <div className={cn('w-[1px] h-4', isDark ? 'bg-[#2e2e2e]' : 'bg-[#e0e0e0]')}/>
                    <Breadcrumb folderId={currentFolderId} items={items} onNavigate={navigate} isDark={isDark}/>
                </div>

                <div className="flex items-center gap-2">
                    <SearchInput 
                        value={search} 
                        onChange={setSearch} 
                        placeholder="Search files…" 
                        isDark={isDark} 
                    />
                    <div className={cn('w-[1px] h-4', isDark ? 'bg-[#2e2e2e]' : 'bg-[#e0e0e0]')}/>

                    <ViewToggle 
                        view={view} 
                        onViewChange={(v) => setView(v)} 
                        isDark={isDark} 
                    />
                    <div className={cn('w-[1px] h-4', isDark ? 'bg-[#2e2e2e]' : 'bg-[#e0e0e0]')}/>

                    {/* Upload */}
                    <button onClick={() => setShowUpload(true)} className={cn('flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-colors',
                        isDark ? 'text-[#888] hover:text-white hover:bg-white/5' : 'text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]')}>
                        <Upload size={12}/> Upload
                    </button>

                    {/* New */}
                    <div className="relative group">
                        <button onClick={() => setNewDialog('folder')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-[8px] bg-primary hover:bg-primary-hover text-primary-foreground transition-colors">
                            <Plus size={13} strokeWidth={2.5}/> New
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* ── Left Sidebar ── */}
                <div className={cn('flex flex-col shrink-0 transition-all duration-300 overflow-hidden absolute md:relative z-20 h-full max-w-[80vw]', panelBg, border, sidebarOpen ? 'w-56 border-r shadow-2xl md:shadow-none' : 'w-0 border-r-0')}>
                    <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 min-w-[224px]">
                        <div className="flex items-center justify-between px-2 pb-1">
                            <p className={cn('text-[9px] font-bold uppercase tracking-widest', muted)}>Folders</p>
                            <Tooltip content="Collapse sidebar" side="right">
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn('w-5 h-5 flex items-center justify-center rounded-md transition-colors', isDark ? 'text-[#444] hover:text-white hover:bg-white/8' : 'text-[#ccc] hover:text-[#555] hover:bg-[#f0f0f0]')}
                                >
                                    <PanelLeftClose size={12}/>
                                </button>
                            </Tooltip>
                        </div>
                        {isLoading ? (
                            <div className="px-2 py-4 space-y-3 animate-pulse">
                                {[1,2,3].map(i => (
                                    <div key={i} className={cn('h-3 w-3/4 rounded-full', isDark ? 'bg-white/5' : 'bg-black/5')}/>
                                ))}
                            </div>
                        ) : (
                            <TreeNode
                                item={{ id: 'root', name: 'Home', type: 'folder', parentId: '' } as any} items={items} depth={0}
                                currentFolderId={currentFolderId} onNavigate={navigate} isDark={isDark}
                                expandedIds={expandedIds} toggleExpand={toggleExpand} dragOver={dragOver}
                                onDragOver={setDragOver} onDrop={handleDrop}
                                onContextMenu={(e, itemId) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, itemId }); }}
                            />
                        )}
                        {/* Quick Links */}
                        {items.filter(i => i.type === 'link').length > 0 && (
                            <>
                                <div className={cn('mx-2 my-2 border-t', isDark ? 'border-[#222]' : 'border-[#efefef]')}/>
                                <p className={cn('px-2 pb-1 text-[9px] font-bold uppercase tracking-widest', muted)}>Quick Links</p>
                                {items.filter(i => i.type === 'link').map(link => (
                                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                                        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, itemId: link.id }); }}
                                        className={cn('flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-colors group', isDark ? 'text-[#888] hover:text-cyan-400 hover:bg-cyan-400/5' : 'text-[#999] hover:text-cyan-600 hover:bg-cyan-50')}>
                                        <Link2 size={11} className="shrink-0 text-cyan-500"/>
                                        <span className="truncate flex-1">{link.name}</span>
                                        <ExternalLink size={9} className="opacity-0 group-hover:opacity-50 transition-opacity shrink-0"/>
                                    </a>
                                ))}
                            </>
                        )}
                    </div>

                    {/* Upload shortcut in sidebar */}
                    <div className={cn('px-3 py-2 border-t', border)}>
                        <button onClick={() => setShowUpload(true)} className={cn(
                            'w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-semibold transition-all border-2 border-dashed',
                            isDark ? 'border-[#2a2a2a] text-[#555] hover:border-primary/40 hover:text-primary hover:bg-primary/5'
                                   : 'border-[#e5e5e5] text-[#ccc] hover:border-primary/40 hover:text-primary hover:bg-primary/5'
                        )}>
                            <Upload size={12}/> Upload Files
                        </button>
                    </div>

                    {/* Storage meter */}
                    <div className={cn('px-3 py-3 border-t', border)}>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={cn('text-[10px] font-semibold', muted)}>Storage</span>
                            <span className={cn('text-[10px] font-bold tabular-nums', isDark ? 'text-[#666]' : 'text-[#999]')}>{formatBytes(storageUsed)} / 10 GB</span>
                        </div>
                        <div className={cn('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/5' : 'bg-[#f0f0f0]')}>
                            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${storagePct}%` }}/>
                        </div>
                        <p className={cn('text-[9.5px] mt-1', muted)}>{storagePct.toFixed(1)}% used</p>
                    </div>
                </div>

                {/* ── Sidebar collapsed toggle ── */}
                {!sidebarOpen && (
                    <Tooltip content="Expand sidebar" side="right" triggerClassName="self-stretch flex">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className={cn(
                                'shrink-0 flex items-center justify-center w-6 h-full border-r transition-colors',
                                isDark ? 'border-[#252525] text-[#444] hover:text-white hover:bg-white/5' : 'border-[#ebebeb] text-[#ccc] hover:text-[#555] hover:bg-[#f5f5f5]'
                            )}
                        >
                            <PanelLeftOpen size={12}/>
                        </button>
                    </Tooltip>
                )}

                {/* ── Main Content ── */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                    {/* Toolbar strip */}
                    <div className={cn('flex items-center gap-0.5 px-4 border-b shrink-0', isDark ? 'bg-[#141414] border-[#1e1e1e]' : 'bg-white border-[#f0f0f0]')}>
                        {filterTabs.map(tab => {
                            const count = tab.id === 'all'
                                ? items.filter(i => i.parentId === currentFolderId).length
                                : tab.id === 'starred'
                                    ? items.filter(i => i.parentId === currentFolderId && i.starred).length
                                    : items.filter(i => i.parentId === currentFolderId && i.type === tab.id).length;
                            if (tab.id !== 'all' && count === 0) return null;
                            const isActive = filter === tab.id;
                            return (
                                <button key={tab.id} onClick={() => setFilter(tab.id)}
                                    className={cn(
                                        'relative flex items-center gap-1.5 px-2.5 py-2.5 text-[11px] font-bold transition-all',
                                        isActive
                                            ? isDark ? 'text-white' : 'text-[#111]'
                                            : isDark ? 'text-[#555] hover:text-[#aaa]' : 'text-[#aaa] hover:text-[#555]'
                                    )}>
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                    <span className={cn('text-[9px] tabular-nums', isActive ? (isDark ? 'text-[#aaa]' : 'text-[#777]') : 'opacity-40')}>{count}</span>
                                    {isActive && (
                                        <span className={cn('absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full', isDark ? 'bg-white' : 'bg-[#111]')} />
                                    )}
                                </button>
                            );
                        })}

                        <div className="flex-1"/>

                        {/* Bulk actions */}
                        {selectedIds.size > 0 && (
                            <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-xl border mr-2', isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-[#f8f8f8] border-[#e8e8e8]')}>
                                <span className={cn('text-[11px] font-semibold mr-1', isDark ? 'text-[#aaa]' : 'text-[#666]')}>{selectedIds.size} selected</span>
                                <div className={cn('w-[1px] h-3', isDark ? 'bg-[#333]' : 'bg-[#ddd]')}/>
                                <Tooltip content="Duplicate" side="bottom">
                                    <button onClick={() => duplicateItems(Array.from(selectedIds))}
                                        className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors', isDark ? 'text-[#777] hover:text-white hover:bg-white/5' : 'text-[#888] hover:text-[#333] hover:bg-[#ececec]')}>
                                        <Copy size={11}/>
                                    </button>
                                </Tooltip>
                                
                                <Tooltip content="Delete" side="bottom">
                                    <button onClick={() => requestDelete(Array.from(selectedIds))}
                                        className="px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors text-red-500/70 hover:text-red-500 hover:bg-red-500/10">
                                        <Trash2 size={11}/>
                                    </button>
                                </Tooltip>
                                
                                <Tooltip content="Clear selection" side="bottom">
                                    <button onClick={clearSelection}
                                        className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors', isDark ? 'text-[#555] hover:text-white hover:bg-white/5' : 'text-[#bbb] hover:text-[#333] hover:bg-[#ececec]')}>
                                        <X size={11}/>
                                    </button>
                                </Tooltip>
                            </div>
                        )}

                        {view === 'list' && ['name','type','size','modified'].map(k => (
                            <button key={k} onClick={() => toggleSort(k as SortKey)}
                                className={cn('flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg transition-all capitalize',
                                    sortKey === k ? isDark ? 'bg-white/8 text-white' : 'bg-[#f0f0f0] text-[#111]' : isDark ? 'text-[#555] hover:text-[#aaa] hover:bg-white/5' : 'text-[#aaa] hover:text-[#444] hover:bg-[#f5f5f5]')}>
                                {k} {sortKey === k && (sortDir === 'asc' ? <SortAsc size={9}/> : <SortDesc size={9}/>)}
                            </button>
                        ))}
                        <button className={cn('flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded-lg transition-all', isDark ? 'text-[#555] hover:text-[#aaa] hover:bg-white/5' : 'text-[#aaa] hover:text-[#444] hover:bg-[#f5f5f5]')}><RefreshCw size={10}/></button>
                    </div>

                    {/* Content Area */}
                    <div className={cn('flex-1 overflow-auto relative', gridBg)}
                        onClick={clearSelection}
                        onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, itemId: null }); }}
                        onDragOver={e => {
                            e.preventDefault();
                            // native file drag from OS
                            if (e.dataTransfer.types.includes('Files')) {
                                setGlobalDragOver(true);
                                e.dataTransfer.dropEffect = 'copy';
                            } else {
                                e.dataTransfer.dropEffect = 'move';
                                setDragOver(currentFolderId);
                            }
                        }}
                        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setGlobalDragOver(false); }}
                        onDrop={e => {
                            if (e.dataTransfer.types.includes('Files') && e.dataTransfer.files.length > 0) {
                                handleNativeFileDrop(e);
                            } else {
                                e.preventDefault();
                                handleDrop(currentFolderId);
                            }
                        }}>

                        {/* Native drag overlay */}
                        {globalDragOver && (
                            <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center gap-3"
                                style={{ background: isDark ? 'rgba(var(--brand-primary-rgb),0.08)' : 'rgba(var(--brand-primary-rgb),0.06)', border: '2px dashed var(--brand-primary)', borderRadius: 16 }}>
                                <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(var(--brand-primary-rgb),0.15)' }}>
                                    <CloudUpload size={32} className="text-primary"/>
                                </div>
                                <p className="text-[15px] font-bold text-primary">Drop to upload</p>
                                <p className={cn('text-[11px]', isDark ? 'text-[#555]' : 'text-[#aaa]')}>Files will be uploaded to this folder</p>
                            </div>
                        )}

                        {isLoading ? (
                            <FileSkeleton view={view} isDark={isDark} />
                        ) : currentChildren.length === 0 ? (
                            <div className={cn('flex flex-col items-center justify-center h-full gap-4', muted)}>
                                <div className={cn('w-16 h-16 rounded-3xl flex items-center justify-center', isDark ? 'bg-white/[0.03]' : 'bg-black/[0.03]')}>
                                    {filter === 'starred' ? <Star size={28} strokeWidth={1.25}/> : search ? <Search size={28} strokeWidth={1.25}/> : <FolderOpen size={28} strokeWidth={1.25}/>}
                                </div>
                                <div className="text-center">
                                    <p className="text-[14px] font-semibold">{search ? `No results for "${search}"` : filter !== 'all' ? `No ${filter} items here` : 'This folder is empty'}</p>
                                    <p className="text-[11px] mt-1 opacity-60">{!search && filter === 'all' && 'Right-click to create a folder or upload files'}</p>
                                </div>
                                {!search && filter === 'all' && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <button onClick={() => setNewDialog('folder')} className="text-[11px] font-semibold px-3 py-1.5 rounded-[8px] bg-primary text-primary-foreground hover:bg-primary-hover transition-colors">+ New Folder</button>
                                        <button onClick={() => setShowUpload(true)} className={cn('text-[11px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors border', isDark ? 'border-[#2e2e2e] text-[#666] hover:text-white hover:bg-white/5' : 'border-[#e5e5e5] text-[#888] hover:text-[#333] hover:bg-[#f5f5f5]')}>Upload Files</button>
                                    </div>
                                )}
                            </div>
                        ) : view === 'grid' ? (
                            /* Grid View */
                            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 content-start">
                                {currentChildren.map(item => {
                                    const isSelected = selectedIds.has(item.id);
                                    const isDragging = draggedId === item.id;
                                    const isRenaming = renamingId === item.id;
                                    return (
                                        <div key={item.id}
                                            draggable={!item.locked}
                                            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggedId(item.id); }}
                                            onDragEnd={() => { setDraggedId(null); setDragOver(null); }}
                                            onDragOver={e => { if (item.type === 'folder') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(item.id); } }}
                                            onDragLeave={() => setDragOver(null)}
                                            onDrop={e => { e.stopPropagation(); if (item.type === 'folder') { e.dataTransfer.dropEffect = 'move'; handleDrop(item.id); } }}
                                            onClick={e => { e.stopPropagation(); if (selectedIds.size > 0 || e.metaKey || e.ctrlKey || e.shiftKey) { toggleSelect(item.id, e as unknown as React.MouseEvent); } else { openPreview(item); } }}
                                            onDoubleClick={() => { if (selectedIds.size > 0) return; if (item.type === 'folder') navigate(item.id); }}
                                            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, itemId: item.id }); }}
                                            className={cn('relative flex flex-col items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all duration-150 group select-none', cardBg,
                                                isSelected ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                                                : dragOver === item.id && item.type === 'folder' ? isDark ? 'border-primary/40 bg-primary/5' : 'border-primary/40 bg-primary/5'
                                                : isDark ? 'hover:border-[#2e2e2e] hover:bg-[#1d1d1d]' : 'hover:border-[#d8d8d8] hover:shadow-sm hover:shadow-black/5',
                                                isDragging && 'opacity-40 scale-95')}>

                                            {/* Checkbox */}
                                            <div className={cn('absolute top-0 left-0 p-2 z-10 transition-all cursor-pointer', isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                                                onClick={e => { e.stopPropagation(); toggleSelect(item.id); }}>
                                                <div className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                                    <div className={cn('w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all',
                                                        isSelected ? 'bg-[#4dbf39] border-[#4dbf39]' : isDark ? 'border-white/20 bg-black/20 backdrop-blur' : 'border-[#ccc] bg-white/80 backdrop-blur')}>
                                                        {isSelected && <Check size={10} strokeWidth={3} className="text-black"/>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Star + Lock */}
                                            <div className="absolute top-0 right-0 flex items-start p-1.5 z-10" onClick={e => e.stopPropagation()}>
                                                {/* Star button */}
                                                <Tooltip content={item.starred ? 'Remove star' : 'Add star'} side="bottom">
                                                    <button
                                                        onClick={e => { e.stopPropagation(); toggleStar(item.id); }}
                                                        className={cn('w-8 h-8 flex items-center justify-center rounded-lg transition-all',
                                                            item.starred
                                                                ? 'opacity-100'
                                                                : (selectedIds.size > 0 ? 'opacity-0' : 'opacity-0 group-hover:opacity-70 hover:!opacity-100'),
                                                            item.starred ? 'text-amber-400' : isDark ? 'text-[#555] hover:text-amber-400 hover:bg-white/10' : 'text-[#ccc] hover:text-amber-400 hover:bg-black/5'
                                                        )}
                                                    >
                                                        <Star size={13} fill={item.starred ? 'currentColor' : 'none'}/>
                                                    </button>
                                                </Tooltip>
                                                {item.locked && (
                                                    <div className="w-8 h-8 flex items-center justify-center pointer-events-none">
                                                        <Lock size={10} className={isDark ? 'text-[#555]' : 'text-[#aaa]'}/>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Icon / Thumbnail */}
                                            <div className="relative w-full flex items-center justify-center py-2 mt-1">
                                                {item.type === 'image' && item.downloadUrl && !item.downloadUrl.includes('example.com') ? (
                                                    <ImageThumb
                                                        src={item.downloadUrl}
                                                        alt={item.name}
                                                        isDark={isDark}
                                                        fallback={getItemIcon(item.type, 22, item.color)}
                                                    />
                                                ) : item.type === 'doc' && item.name.toLowerCase().endsWith('.pdf') ? (
                                                    <div className="w-12 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-transform group-hover:scale-105 shadow-sm"
                                                        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                                        <FileText size={18} className="text-white"/>
                                                        <span className="text-[8px] font-bold text-white/80 uppercase tracking-wider">PDF</span>
                                                    </div>
                                                ) : (
                                                    <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105',
                                                        isDark ? 'bg-white/[0.03]' : 'bg-[#f5f5f5]')}>
                                                        {getItemIcon(item.type, 22, item.color)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Name & Meta */}
                                            <div className="w-full text-center px-1 mb-1">
                                                {isRenaming ? (
                                                    <RenameInput value={item.name} onConfirm={v => renameItem(item.id, v)} onCancel={() => setRenamingId(null)} isDark={isDark}/>
                                                ) : (
                                                    <span className={cn('text-[12.5px] font-medium truncate block', textPrimary)}>{item.name}</span>
                                                )}
                                                <span className={cn('text-[9.5px] mt-0.5 block opacity-60', muted)}>
                                                    {item.type === 'link' ? 'Link' : item.size ? formatBytes(item.size) : getTypeLabel(item.type)}
                                                </span>
                                            </div>

                                            {/* Expanding Action Bar */}
                                            {!isRenaming && selectedIds.size === 0 && (
                                                <div className={cn(
                                                    "w-full h-0 opacity-0 group-hover:h-8 group-hover:opacity-100 group-hover:mt-1 transition-all duration-300 overflow-hidden pointer-events-none group-hover:pointer-events-auto",
                                                    deletingId === item.id && "h-8 opacity-100 mt-1 pointer-events-auto"
                                                )}>
                                                    <div className="flex items-center justify-center gap-1.5 py-1 border-t border-dashed border-black/5 dark:border-white/5 h-8">
                                                        <AnimatePresence mode="wait">
                                                            {deletingId === item.id ? (
                                                                <motion.button
                                                                    key="confirm"
                                                                    initial={{ opacity: 0, x: 20, scale: 0.8 }}
                                                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                                                    exit={{ opacity: 0, x: 20, scale: 0.8 }}
                                                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                                    onClick={e => { e.stopPropagation(); deleteItems([item.id]); setDeletingId(null); }}
                                                                    className="delete-trigger px-3 h-6.5 flex items-center justify-center rounded-lg bg-red-500 text-white text-[10px] font-bold shadow-lg shadow-red-500/20 active:scale-95"
                                                                >
                                                                    Sure?
                                                                </motion.button>
                                                            ) : (
                                                                <motion.div 
                                                                    key="actions"
                                                                    initial={{ opacity: 0, x: -10 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    exit={{ opacity: 0, x: -10 }}
                                                                    transition={{ duration: 0.15 }}
                                                                    className="flex items-center gap-1.5"
                                                                >
                                                                    <Tooltip content="Rename" side="bottom">
                                                                        <button onClick={e => { e.stopPropagation(); setRenamingId(item.id); }}
                                                                            className={cn('w-6.5 h-6.5 flex items-center justify-center rounded-lg transition-colors', 
                                                                                isDark ? 'text-[#444] hover:text-white hover:bg-white/5' : 'text-[#bbb] hover:text-[#333] hover:bg-black/5')}>
                                                                            <Pencil size={11} strokeWidth={2}/>
                                                                        </button>
                                                                    </Tooltip>
                                                                    {item.type !== 'folder' && item.downloadUrl && (
                                                                        <Tooltip content="Download" side="bottom">
                                                                            <button onClick={e => { e.stopPropagation(); handleDownload(item); }}
                                                                                className={cn('w-6.5 h-6.5 flex items-center justify-center rounded-lg transition-colors', 
                                                                                    isDark ? 'text-[#444] hover:text-[#4dbf39] hover:bg-white/5' : 'text-[#ccc] hover:text-[#4dbf39] hover:bg-black/5')}>
                                                                                <Download size={11} strokeWidth={2}/>
                                                                            </button>
                                                                        </Tooltip>
                                                                    )}
                                                                    {(item.downloadUrl || item.url) && (
                                                                        <Tooltip content="Copy link" side="bottom">
                                                                            <button onClick={e => { e.stopPropagation(); copyDownloadLink(item.id); }}
                                                                                className={cn('w-6.5 h-6.5 flex items-center justify-center rounded-lg transition-colors', 
                                                                                    isDark ? 'text-[#444] hover:text-[#4dbf39] hover:bg-white/5' : 'text-[#ccc] hover:text-[#4dbf39] hover:bg-black/5')}>
                                                                                <Link size={11} strokeWidth={2}/>
                                                                            </button>
                                                                        </Tooltip>
                                                                    )}
                                                                    <Tooltip content="Delete" side="bottom">
                                                                        <button onClick={e => { e.stopPropagation(); setDeletingId(item.id); }}
                                                                            className={cn('delete-trigger w-6.5 h-6.5 flex items-center justify-center rounded-lg transition-colors', 
                                                                                isDark ? 'text-red-500/20 hover:text-red-500 hover:bg-red-500/10' : 'text-red-200 hover:text-red-500 hover:bg-red-50')}>
                                                                            <Trash2 size={11} strokeWidth={2}/>
                                                                        </button>
                                                                    </Tooltip>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* List View */
                            <div className="p-4">
                                <div className={cn('rounded-xl border overflow-hidden', isDark ? 'border-[#222]' : 'border-[#e8e8e8]')}>
                                    {/* Header */}
                                    <div className={cn('grid px-3 py-2 text-[9.5px] font-bold uppercase tracking-wider', isDark ? 'bg-[#1a1a1a] border-b border-[#252525] text-[#444]' : 'bg-[#fafafa] border-b border-[#ebebeb] text-[#bbb]')}
                                        style={{ gridTemplateColumns: '32px 32px 1fr 80px 120px 120px 100px' }}>
                                        <div className="flex items-center justify-center cursor-pointer" onClick={toggleAll}>
                                            <div className={cn('w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-all',
                                                selectedIds.size === currentChildren.length && currentChildren.length > 0 ? 'bg-[#4dbf39] border-[#4dbf39]' : isDark ? 'border-white/10' : 'border-[#ccc]')}>
                                                {selectedIds.size === currentChildren.length && currentChildren.length > 0 && <Check size={9} strokeWidth={4} className="text-black"/>}
                                                {selectedIds.size > 0 && selectedIds.size < currentChildren.length && <div className="w-2 h-0.5 bg-current rounded"/>}
                                            </div>
                                        </div>
                                        <div/>
                                        <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-left hover:opacity-80 transition-opacity">Name {sortKey === 'name' && (sortDir === 'asc' ? <SortAsc size={8}/> : <SortDesc size={8}/>)}</button>
                                        <button onClick={() => toggleSort('type')} className="flex items-center gap-1 hover:opacity-80 transition-opacity">Type {sortKey === 'type' && (sortDir === 'asc' ? <SortAsc size={8}/> : <SortDesc size={8}/>)}</button>
                                        <button onClick={() => toggleSort('size')} className="flex items-center gap-1 hover:opacity-80 transition-opacity">Size {sortKey === 'size' && (sortDir === 'asc' ? <SortAsc size={8}/> : <SortDesc size={8}/>)}</button>
                                        <button onClick={() => toggleSort('modified')} className="flex items-center gap-1 hover:opacity-80 transition-opacity">Modified {sortKey === 'modified' && (sortDir === 'asc' ? <SortAsc size={8}/> : <SortDesc size={8}/>)}</button>
                                        <div/>
                                    </div>

                                    {currentChildren.map((item, i) => {
                                        const isSelected = selectedIds.has(item.id);
                                        const isDragging = draggedId === item.id;
                                        const isRenaming = renamingId === item.id;
                                        return (
                                            <div key={item.id}
                                                draggable={!item.locked}
                                                onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggedId(item.id); }}
                                                onDragEnd={() => { setDraggedId(null); setDragOver(null); }}
                                                onDragOver={e => { if (item.type === 'folder') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(item.id); } }}
                                                onDragLeave={() => setDragOver(null)}
                                                onDrop={e => { e.stopPropagation(); if (item.type === 'folder') { e.dataTransfer.dropEffect = 'move'; handleDrop(item.id); } }}
                                                onClick={e => { e.stopPropagation(); if (selectedIds.size > 0 || e.metaKey || e.ctrlKey || e.shiftKey) toggleSelect(item.id, e as unknown as React.MouseEvent); else clearSelection(); }}
                                                onDoubleClick={() => { if (selectedIds.size > 0) return; if (item.type === 'folder') navigate(item.id); else if (item.type === 'link' && item.url) window.open(item.url, '_blank'); }}
                                                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, itemId: item.id }); }}
                                                className={cn('grid px-3 items-center group cursor-pointer transition-all select-none',
                                                    i !== 0 && (isDark ? 'border-t border-[#1e1e1e]' : 'border-t border-[#f5f5f5]'),
                                                    isSelected ? isDark ? 'bg-primary/5' : 'bg-primary/5'
                                                    : dragOver === item.id && item.type === 'folder' ? isDark ? 'bg-white/5' : 'bg-primary/5'
                                                    : isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-[#fafafa]',
                                                    isDragging && 'opacity-40')}
                                                style={{ gridTemplateColumns: '32px 32px 1fr 80px 120px 120px 100px', minHeight: '38px' }}>

                                                <div className="flex items-center justify-center" onClick={e => { e.stopPropagation(); toggleSelect(item.id); }}>
                                                    <div className={cn('w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-all',
                                                        isSelected ? 'bg-primary border-primary' : isDark ? 'border-white/10 opacity-0 group-hover:opacity-100' : 'border-[#ccc] opacity-0 group-hover:opacity-100')}>
                                                        {isSelected && <Check size={9} strokeWidth={4} className="text-black"/>}
                                                    </div>
                                                </div>
                                                {/* Row actions */}
                                                {selectedIds.size === 0 && (
                                                    <div className={cn(
                                                        "flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity",
                                                        deletingId === item.id && "opacity-100"
                                                    )}>
                                                        <AnimatePresence mode="wait">
                                                            {deletingId === item.id ? (
                                                                <motion.button
                                                                    key="confirm"
                                                                    initial={{ opacity: 0, x: 10, scale: 0.9 }}
                                                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                                                    exit={{ opacity: 0, x: 10, scale: 0.9 }}
                                                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                                    onClick={e => { e.stopPropagation(); deleteItems([item.id]); setDeletingId(null); }}
                                                                    className="delete-trigger px-2.5 h-6 flex items-center justify-center rounded-md bg-red-500 text-white text-[10px] font-bold shadow-lg shadow-red-500/20 active:scale-95"
                                                                >
                                                                    Sure?
                                                                </motion.button>
                                                            ) : (
                                                                <motion.div 
                                                                    key="actions"
                                                                    initial={{ opacity: 0, x: -5 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    exit={{ opacity: 0, x: -5 }}
                                                                    transition={{ duration: 0.15 }}
                                                                    className="flex items-center gap-0.5"
                                                                >
                                                                    {/* Star */}
                                                                    <button onClick={e => { e.stopPropagation(); toggleStar(item.id); }}
                                                                        className={cn('w-6 h-6 flex items-center justify-center rounded-md transition-colors', item.starred ? 'text-amber-400' : isDark ? 'text-[#555] hover:text-amber-400 hover:bg-white/5' : 'text-[#ccc] hover:text-amber-400 hover:bg-[#f0f0f0]')}
                                                                        title={item.starred ? 'Unstar' : 'Star'}>
                                                                        <Star size={11} fill={item.starred ? 'currentColor' : 'none'}/>
                                                                    </button>
                                                                    {/* Download */}
                                                                    {item.type !== 'folder' && item.downloadUrl && (
                                                                        <button onClick={e => { e.stopPropagation(); handleDownload(item); }}
                                                                            className={cn('w-6 h-6 flex items-center justify-center rounded-md transition-colors', isDark ? 'text-[#555] hover:text-[#4dbf39] hover:bg-white/5' : 'text-[#ccc] hover:text-[#4dbf39] hover:bg-[#f0f0f0]')}
                                                                            title="Download">
                                                                            <Download size={11}/>
                                                                        </button>
                                                                    )}
                                                                    {/* Copy link */}
                                                                    {(item.downloadUrl || item.url) && (
                                                                        <button onClick={e => { e.stopPropagation(); copyDownloadLink(item.id); }}
                                                                            className={cn('w-6 h-6 flex items-center justify-center rounded-md transition-colors', isDark ? 'text-[#555] hover:text-[#4dbf39] hover:bg-white/5' : 'text-[#ccc] hover:text-[#4dbf39] hover:bg-[#f0f0f0]')}
                                                                            title="Copy download link">
                                                                            <Link size={11}/>
                                                                        </button>
                                                                    )}
                                                                    <button onClick={e => { e.stopPropagation(); setRenamingId(item.id); }}
                                                                        className={cn('w-6 h-6 flex items-center justify-center rounded-md transition-colors', isDark ? 'hover:bg-white/8 text-[#555] hover:text-white' : 'hover:bg-[#f0f0f0] text-[#444] hover:text-black')}
                                                                        title="Rename"><Pencil size={11}/></button>
                                                                    <button onClick={e => { e.stopPropagation(); setDeletingId(item.id); }}
                                                                        className="delete-trigger w-6 h-6 flex items-center justify-center rounded-md transition-colors text-[#ccc] hover:text-red-500 hover:bg-red-500/10"
                                                                        title="Delete"><Trash2 size={11}/></button>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status Bar */}
                    <div className={cn('flex items-center justify-between px-4 py-1.5 border-t shrink-0 text-[10px]', isDark ? 'bg-[#0f0f0f] border-[#1e1e1e] text-[#444]' : 'bg-white border-[#f0f0f0] text-[#bbb]')}>
                        <div className="flex items-center gap-3">
                            <span>{currentChildren.length} item{currentChildren.length !== 1 ? 's' : ''}</span>
                            {selectedIds.size > 0 && <span className="text-primary font-semibold">{selectedIds.size} selected</span>}
                            {search && <span>Searching: <em className={isDark ? 'text-[#666]' : 'text-[#aaa]'}>"{search}"</em></span>}
                        </div>
                        <div className="flex items-center gap-3">
                            <span>{formatBytes(currentChildren.reduce((a, i) => a + (i.size || 0), 0))}</span>
                            {draggedId && <span className="text-primary">Drop to move</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Context Menu ── */}
            {ctxMenu && (
                <ContextMenu menu={ctxMenu} items={items} isDark={isDark} onAction={handleCtxAction} onClose={() => setCtxMenu(null)}/>
            )}

            {/* ── New Item Dialog ── */}
            {newDialog && (
                <NewItemDialog type={newDialog} isDark={isDark}
                    onConfirm={(name, url) => { if (newDialog === 'folder') createFolder(name); else createLink(name, url); }}
                    onCancel={() => setNewDialog(null)}/>
            )}

            {/* ── Upload Modal ── */}
            {showUpload && (
                <UploadModal
                    isDark={isDark}
                    onClose={() => setShowUpload(false)}
                    currentFolderId={currentFolderId}
                    onUploaded={addFilesToDb}
                />
            )}

            {/* ── File Preview Modal ── */}
            {previewItem && (
                <FilePreviewModal
                    item={previewItem}
                    isDark={isDark}
                    onClose={() => setPreviewItem(null)}
                    onDownload={() => handleDownload(previewItem)}
                    onStar={() => { toggleStar(previewItem.id); setPreviewItem(p => p ? { ...p, starred: !p.starred } : null); }}
                    onDelete={() => { deleteItems([previewItem.id]); setPreviewItem(null); }}
                />
            )}
            {/* ── Bulk Delete Warning ── */}
            <DeleteConfirmModal
                open={!!deleteWarning}
                onClose={() => setDeleteWarning(null)}
                onConfirm={() => deleteWarning && deleteItems(deleteWarning)}
                title={deleteWarning ? `Delete ${deleteWarning.length} items?` : "Delete items?"}
                description={deleteWarning ? `This will permanently delete ${deleteWarning.length} selected items and all their contents. This action cannot be undone.` : ""}
                actionLabel={deleteWarning ? `Delete ${deleteWarning.length} items` : "Delete"}
                isDark={isDark}
            />
        </div>
    );
}
