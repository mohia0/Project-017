"use client";

import React, { useState } from 'react';
import { X, ChevronRight, Zap, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useHookStore } from '@/store/useHookStore';
import { appToast } from '@/lib/toast';

interface Props {
    open: boolean;
    onClose: () => void;
}

const COLORS = [
    '#f43f5e', // rose
    '#ec4899', // pink
    '#d946ef', // fuchsia
    '#a855f7', // purple
    '#8b5cf6', // violet
    '#6366f1', // indigo
    '#3b82f6', // blue
    '#0ea5e9', // sky
    '#06b6d4', // cyan
    '#14b8a6', // teal
    '#10b981', // emerald
    '#22c55e', // green
    '#84cc16', // lime
    '#eab308', // yellow
    '#f59e0b', // amber
    '#f97316', // orange
];

export function CreateHookModal({ open, onClose }: Props) {
    const { theme, openRightPanel } = useUIStore();
    const isDark = theme === 'dark';
    const { addHook } = useHookStore();

    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [color, setColor] = useState(COLORS[6]); // default blue
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            const h = await addHook({
                name: name.trim(),
                title: title.trim() || null,
                color,
                link: link.trim() || null
            });
            if (h) {
                onClose();
                appToast.success('Hook created');
                // Open the config panel immediately
                openRightPanel({ type: 'hook', id: h.id });
            } else {
                appToast.error("Error", 'Failed to create hook');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    const field = cn(
        "w-full rounded-xl border px-4 py-3 text-[13px] outline-none transition-all focus-within:ring-2",
        isDark
            ? "bg-[#1c1c1c] border-[#2e2e2e] text-white placeholder:text-[#555] focus-within:ring-[#333] focus-within:border-[#444]"
            : "bg-white border-[#e0e0e0] text-[#111] placeholder:text-[#bbb] focus-within:ring-[#e8e8e8] focus-within:border-[#ccc]"
    );

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={cn(
                "w-full max-w-[440px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200",
                isDark ? "bg-[#161616] border border-[#252525]" : "bg-[#f7f7f7] border border-[#e0e0e0]"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                    <h2 className={cn("text-[17px] font-bold tracking-tight", isDark ? "text-white" : "text-[#111]")}>
                        Create Hook
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
                <div className="px-5 pb-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-2.5">
                        {/* Name */}
                        <div className={cn(field, "flex flex-col gap-0.5")}>
                            <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Endpoint Name</span>
                            <input
                                autoFocus
                                value={name}
                                placeholder="e.g. Stripe Webhook"
                                onChange={e => setName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                className="bg-transparent outline-none text-[13px] w-full"
                            />
                        </div>

                        {/* Title/Description */}
                        <div className={cn(field, "flex flex-col gap-0.5")}>
                            <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Short Description</span>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="What is this hook for?"
                                className={cn("bg-transparent outline-none text-[13px] w-full", isDark ? "placeholder:text-[#444]" : "placeholder:text-[#bbb]")}
                            />
                        </div>

                        {/* Placement Link */}
                        <div className={cn(field, "flex flex-col gap-0.5")}>
                            <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Placement URL (Optional)</span>
                            <input
                                value={link}
                                onChange={e => setLink(e.target.value)}
                                placeholder="e.g. yourwebsite.com"
                                className={cn("bg-transparent outline-none text-[13px] w-full", isDark ? "placeholder:text-[#444]" : "placeholder:text-[#bbb]")}
                            />
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div className="flex flex-col gap-2">
                        <span className={cn("text-[11px] font-semibold ml-1 flex items-center gap-1.5", isDark ? "text-[#555]" : "text-[#aaa]")}>
                            <Palette size={10} /> Brand Color
                        </span>
                        <div className="grid grid-cols-8 gap-2">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                                        color === c ? (isDark ? "border-white" : "border-[#111]") : "border-transparent"
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
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
                        onClick={handleCreate}
                        disabled={loading || !name.trim()}
                        className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Creating…' : 'Create hook'}
                        {!loading && <ChevronRight size={14} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
