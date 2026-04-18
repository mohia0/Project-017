"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { X, Upload, Link as LinkIcon, Image as ImageIcon, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

interface FileUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (url: string) => void;
    onUploadMultiple?: (urls: string[]) => void;
    title?: string;
    fileType?: 'image' | 'all';
    multiple?: boolean;
}

export default function FileUploadModal({ 
    isOpen, 
    onClose, 
    onUpload, 
    onUploadMultiple,
    title = "Upload File",
    fileType = 'image',
    multiple = false
}: FileUploadModalProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    
    const [dragActive, setDragActive] = useState(false);
    const [tab, setTab] = useState<'upload' | 'url'>('upload');
    const [url, setUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const filesArray = Array.from(files);
        if (filesArray.length === 0) return;
        
        const filesToUpload = multiple ? filesArray : [filesArray[0]];

        setUploading(true);
        setError(null);
        setTab('upload');
        setUploadProgress(0);
        setIsFinished(false);
        setIsProcessing(false);

        try {
            const uploadedUrls: string[] = [];
            
            for (let i = 0; i < filesToUpload.length; i++) {
                const file = filesToUpload[i];
                
                if (fileType === 'image' && !file.type.startsWith('image/')) {
                    setError(`File "${file.name}" is not an image`);
                    continue;
                }

                const formData = new FormData();
                formData.append('file', file);

                const data = await new Promise<any>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    
                    xhr.upload.addEventListener('progress', (event) => {
                        if (event.lengthComputable) {
                            // Calculate total progress across all files
                            const fileWeight = 100 / filesToUpload.length;
                            const currentFileProgress = (event.loaded / event.total) * fileWeight;
                            const totalProgress = Math.round((i * fileWeight) + currentFileProgress);
                            
                            if (totalProgress >= 100) {
                                setUploadProgress(100);
                                if (i === filesToUpload.length - 1) setIsProcessing(true);
                            } else {
                                setUploadProgress(totalProgress);
                            }
                        }
                    });
                    
                    xhr.addEventListener('load', () => {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            if (xhr.status >= 200 && xhr.status < 300) {
                                resolve(response);
                            } else {
                                reject(new Error(response.details || response.error || 'Upload failed'));
                            }
                        } catch (e) {
                            reject(new Error('Invalid response from server'));
                        }
                    });
                    
                    xhr.addEventListener('error', () => {
                        reject(new Error('Network error occurred during upload.'));
                    });
                    
                    xhr.open('POST', '/api/upload');
                    xhr.send(formData);
                });
                
                uploadedUrls.push(data.url);
            }
            
            if (uploadedUrls.length === 0 && filesToUpload.length > 0) {
                throw new Error("No files were successfully uploaded");
            }

            // All good!
            setUploadProgress(100);
            setIsProcessing(false);
            setIsFinished(true);
            
            // Wait 800ms so they see the 100% and success state
            setTimeout(() => {
                if (multiple && onUploadMultiple) {
                    onUploadMultiple(uploadedUrls);
                } else if (uploadedUrls.length > 0) {
                    onUpload(uploadedUrls[0]);
                }
                setUploading(false);
                setUploadProgress(0);
                setIsFinished(false);
                onClose();
            }, 800);

        } catch (err: any) {
            console.error("Upload error:", err);
            setError(err.message || "Failed to upload image");
            setUploading(false);
            setUploadProgress(0);
            setIsFinished(false);
            setIsProcessing(false);
        }
    }, [onUpload, onUploadMultiple, onClose, multiple, fileType]);

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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/[0.15] backdrop-blur-[2px] transition-opacity" 
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
                        <div className="relative h-48 rounded-[20px] overflow-hidden">
                            <div 
                                onDragEnter={handleDrag}
                                className={cn(
                                    "absolute inset-0 flex flex-col items-center justify-center transition-all duration-300",
                                    dragActive 
                                        ? isDark ? "bg-primary/10" : "bg-primary/5"
                                        : isDark ? "bg-white/[0.01]" : "bg-gray-50",
                                    uploading && "opacity-10 pointer-events-none"
                                )}
                            >
                                {/* High-fidelity SVG Dashed Border */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                    <rect 
                                        x="1" y="1" 
                                        width="calc(100% - 2px)" height="calc(100% - 2px)" 
                                        rx="20" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2" 
                                        strokeDasharray="8 6"
                                        className={cn(
                                            "transition-colors duration-300",
                                            dragActive 
                                                ? "text-primary" 
                                                : isDark ? "text-white/10" : "text-gray-200"
                                        )}
                                    />
                                </svg>

                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    multiple={multiple}
                                    accept={fileType === 'image' ? "image/*" : "*"}
                                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                                />
                                
                                <div className="flex flex-col items-center gap-3">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                                        dragActive
                                            ? isDark ? "bg-primary/20 text-primary scale-110" : "bg-primary/10 text-primary scale-110"
                                            : isDark ? "bg-white/5 text-white/20" : "bg-white text-gray-300 shadow-sm"
                                    )}>
                                        <ImageIcon size={24} />
                                    </div>
                                    <div className="text-center">
                                        <p className={cn("text-[13px] font-bold", isDark ? "text-white/60" : "text-gray-900")}>
                                            Drop {fileType === 'image' ? 'image' : 'file'} here or click to browse
                                        </p>
                                        <p className={cn("text-[11px] mt-1", isDark ? "text-white/20" : "text-gray-400")}>
                                            {fileType === 'image' ? 'Supports PNG, JPG, GIF (Max 5MB)' : 'All file types supported (Max 50MB)'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {uploading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent z-20 animate-in fade-in duration-300">
                                    <div className="flex flex-col items-center gap-4 w-full px-8">
                                        <div className={cn(
                                            "w-full rounded-full h-2.5 overflow-hidden shadow-inner",
                                            isDark ? "bg-white/10" : "bg-black/5"
                                        )}>
                                            <div 
                                                className={cn(
                                                    "h-2.5 rounded-full transition-all duration-300 ease-out",
                                                    isFinished ? "bg-green-500" : "bg-primary shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.3)]"
                                                )}
                                                style={{ width: `${uploadProgress}%` }} 
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isFinished ? (
                                                <>
                                                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white scale-110 animate-in zoom-in duration-300">
                                                        <Check size={12} strokeWidth={4} />
                                                    </div>
                                                    <span className={cn("text-[13px] font-bold text-green-500")}>
                                                        Upload Complete!
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <Loader2 size={14} className="text-primary animate-spin" />
                                                    <span className={cn("text-[12px] font-bold", isDark ? "text-white/90" : "text-black/90")}>
                                                        {isProcessing ? "Processing..." : `Uploading ${uploadProgress}%`}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {dragActive && !uploading && (
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
                                    "rounded-xl border p-4 transition-all focus-within:border-primary/30",
                                    isDark ? "bg-white/[0.01] border-white/[0.05]" : "bg-gray-50 border-gray-100"
                                )}>
                                    <label className={cn("text-[10px] font-bold uppercase tracking-wider block mb-2", isDark ? "text-white/20" : "text-gray-400")}>
                                        Image URL or Action
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
                                            onClick={async () => {
                                                try {
                                                    const text = await navigator.clipboard.readText();
                                                    if (text) setUrl(text);
                                                } catch (err) {}
                                            }}
                                            className={cn(
                                                "h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                                                isDark ? "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white" : "bg-white text-gray-500 hover:bg-gray-100 shadow-sm"
                                            )}
                                        >
                                            Paste
                                        </button>
                                        <button 
                                            disabled={!url || uploading}
                                            onClick={() => { onUpload(url); onClose(); }}
                                            className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary-hover transition-all disabled:opacity-30"
                                        >
                                            <Check size={16} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                                <div className="text-center space-y-1">
                                    <p className={cn("text-[11px] font-medium animate-pulse", isDark ? "text-primary/60" : "text-primary")}>
                                        Click more to upload directly
                                    </p>
                                    <p className={cn("text-[11px]", isDark ? "text-white/10" : "text-gray-400")}>
                                        Make sure the link is direct to an image file.
                                    </p>
                                </div>
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
