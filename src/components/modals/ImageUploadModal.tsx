"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { X, Upload, Link as LinkIcon, Image as ImageIcon, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

interface ImageUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (url: string) => void;
    title?: string;
}

export default function ImageUploadModal({ isOpen, onClose, onUpload, title = "Upload Image" }: ImageUploadModalProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    
    const [dragActive, setDragActive] = useState(false);
    const [tab, setTab] = useState<'upload' | 'url'>('upload');
    const [url, setUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const file = files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError("Please upload an image file");
            return;
        }

        setUploading(true);
        setError(null);
        setTab('upload'); // Switch to upload tab to show progress

        // Simulation of upload – in a real app, this would go to Supabase Storage
        // For this demo, we use FileReader to get a base64 string
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            onUpload(result);
            setUploading(false);
            onClose();
        };
        reader.readAsDataURL(file);
    }, [onUpload, onClose]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handlePaste = useCallback((e: ClipboardEvent) => {
        if (!isOpen) return;
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                if (blob) handleFiles([blob]);
                break;
            }
        }
    }, [handleFiles, isOpen]);

    useEffect(() => {
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handlePaste]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose} 
            />
            
            <div className={cn(
                "relative w-full max-w-md rounded-[24px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200",
                isDark ? "bg-[#0d0d0d] border border-white/[0.05]" : "bg-white border-[#eaeaef]"
            )}>
                {/* Header */}
                <div className={cn(
                    "px-6 py-4 border-b flex items-center justify-between",
                    isDark ? "border-white/[0.05]" : "border-[#f0f0f5]"
                )}>
                    <h3 className={cn("text-[13px] font-bold uppercase tracking-wider", isDark ? "text-white/40" : "text-[#111]")}>
                        {title}
                    </h3>
                    <button 
                        onClick={onClose}
                        className={cn("p-1.5 rounded-full transition-colors", isDark ? "hover:bg-white/5 text-white/30" : "hover:bg-gray-100 text-gray-400")}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-1.5 gap-1">
                    <button 
                        onClick={() => {
                            if (tab === 'upload') {
                                fileInputRef.current?.click();
                            } else {
                                setTab('upload');
                            }
                        }}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-[12px] font-medium rounded-xl transition-all",
                            tab === 'upload' 
                                ? isDark ? "bg-white/5 text-white" : "bg-gray-100 text-black"
                                : isDark ? "text-white/20 hover:text-white/40" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <Upload size={14} /> Upload
                    </button>
                    <button 
                        onClick={() => setTab('url')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-[12px] font-medium rounded-xl transition-all",
                            tab === 'url' 
                                ? isDark ? "bg-white/5 text-white" : "bg-gray-100 text-black"
                                : isDark ? "text-white/20 hover:text-white/40" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <LinkIcon size={14} /> URL
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {tab === 'upload' ? (
                        <div 
                            onDragEnter={handleDrag}
                            className={cn(
                                "relative flex flex-col items-center justify-center h-48 rounded-[20px] border-2 border-dashed transition-all",
                                dragActive 
                                    ? isDark ? "border-[#4dbf39] bg-[#4dbf39]/5" : "border-[#4dbf39] bg-[#4dbf39]/5"
                                    : isDark ? "border-white/5 bg-white/[0.01]" : "border-gray-200 bg-gray-50",
                                uploading && "opacity-50 pointer-events-none"
                            )}
                        >
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept="image/*"
                                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                            />
                            
                            {uploading ? (
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 size={32} className="text-[#4dbf39] animate-spin" />
                                    <span className="text-[12px] font-medium text-white/40">Uploading...</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                                        isDark ? "bg-white/5 text-white/20" : "bg-white text-gray-300 shadow-sm"
                                    )}>
                                        <ImageIcon size={24} />
                                    </div>
                                    <div className="text-center">
                                        <p className={cn("text-[13px] font-bold", isDark ? "text-white/60" : "text-gray-900")}>
                                            Drop image here or click to browse
                                        </p>
                                        <p className={cn("text-[11px] mt-1", isDark ? "text-white/20" : "text-gray-400")}>
                                            Supports PNG, JPG, GIF (Max 5MB)
                                        </p>
                                    </div>
                                </div>
                            )}

                            {dragActive && (
                                <div 
                                    className="absolute inset-0 w-full h-full z-10"
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className={cn(
                                "rounded-xl border p-4 transition-all focus-within:border-[#4dbf39]/30",
                                isDark ? "bg-white/[0.01] border-white/[0.05]" : "bg-gray-50 border-gray-100"
                            )}>
                                <label className={cn("text-[10px] font-bold uppercase tracking-wider block mb-2", isDark ? "text-white/20" : "text-gray-400")}>
                                    Image URL
                                </label>
                                <div className="flex gap-2">
                                    <input 
                                        autoFocus
                                        type="text" 
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://example.com/image.jpg"
                                        className={cn(
                                            "flex-1 bg-transparent outline-none text-[13px]",
                                            isDark ? "text-white placeholder:text-white/20" : "text-black placeholder:text-gray-400"
                                        )}
                                    />
                                    <button 
                                        disabled={!url || uploading}
                                        onClick={() => { onUpload(url); onClose(); }}
                                        className="h-8 w-8 rounded-lg bg-[#4dbf39] flex items-center justify-center text-black hover:bg-[#59d044] transition-all disabled:opacity-30"
                                    >
                                        <Check size={16} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                            <p className={cn("text-[11px] text-center", isDark ? "text-white/10" : "text-gray-400")}>
                                Make sure the link is direct to an image file.
                            </p>
                        </div>
                    )}
                    
                    {error && (
                        <p className="text-red-500 text-[11px] font-medium mt-4 text-center">
                            {error}
                        </p>
                    )}

                    <div className={cn(
                        "mt-6 pt-4 border-t flex items-center justify-center gap-2",
                        isDark ? "border-white/[0.05]" : "border-gray-100"
                    )}>
                         <span className={cn("text-[11px] font-medium uppercase tracking-widest", isDark ? "text-white/10" : "text-gray-300")}>
                            Pro Tip: Paste (Ctrl+V) works too
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
