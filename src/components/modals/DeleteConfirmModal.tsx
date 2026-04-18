"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    actionLabel?: string;
    isDark?: boolean;
}

export function DeleteConfirmModal({
    open,
    onClose,
    onConfirm,
    title = "Delete item",
    description = "This action cannot be undone. This will permanently delete the item and all associated data.",
    actionLabel = "Delete",
    isDark = false
}: DeleteConfirmModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
            <div className={cn(
                "w-full max-w-[400px] rounded-2xl shadow-2xl overflow-hidden border animate-in fade-in zoom-in duration-200",
                isDark ? "bg-[#1a1a1a] border-[#2e2e2e] text-[#eee]" : "bg-white border-[#f0f0f0] text-[#111]"
            )}>
                {/* Header */}
                <div className="flex items-start gap-4 p-6 pb-4">
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        isDark ? "bg-red-950/30 text-red-500" : "bg-red-50 text-red-500"
                    )}>
                        <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
                        <p className={cn("mt-1.5 text-[13px] leading-relaxed", isDark ? "text-[#888]" : "text-[#666]")}>
                            {description}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className={cn(
                    "flex items-center justify-end gap-3 px-6 py-4 mt-2",
                    isDark ? "bg-[#141414]" : "bg-[#fafafa]"
                )}>
                    <button
                        onClick={onClose}
                        className={cn(
                            "px-4 py-2 text-[13px] font-medium rounded-lg transition-colors",
                            isDark ? "hover:bg-white/5 text-[#888]" : "hover:bg-black/5 text-[#666]"
                        )}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className="px-5 py-2 text-[13px] font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
                    >
                        {actionLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
