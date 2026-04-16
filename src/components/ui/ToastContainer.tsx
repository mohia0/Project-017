"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore, Toast } from '@/store/useToastStore';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const TOAST_ICONS = {
    success: <CheckCircle2 size={18} className="text-emerald-500" />,
    error: <AlertCircle size={18} className="text-rose-500" />,
    info: <Info size={18} className="text-blue-500" />,
    warning: <AlertTriangle size={18} className="text-amber-500" />,
};

const TOAST_STYLES = {
    success: "border-emerald-500/10 bg-emerald-50/50 dark:bg-emerald-500/5",
    error: "border-rose-500/10 bg-rose-50/50 dark:bg-rose-500/5",
    info: "border-blue-500/10 bg-blue-50/50 dark:bg-blue-500/5",
    warning: "border-amber-500/10 bg-amber-50/50 dark:bg-amber-500/5",
};

export function ToastContainer() {
    const { toasts, removeToast } = useToastStore();

    return (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[10000] p-4 flex flex-col items-center gap-2 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        layout
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                        className={cn(
                            "pointer-events-auto flex items-start gap-3 p-3.5 pr-10 min-w-[300px] max-w-[420px] rounded-2xl border backdrop-blur-xl shadow-2xl relative group",
                            "bg-white/80 dark:bg-[#1c1c1c]/80 border-[#e5e5e5] dark:border-[#2e2e2e]",
                            // TOAST_STYLES[toast.type]
                        )}
                    >
                        <div className="shrink-0 mt-0.5">
                            {TOAST_ICONS[toast.type]}
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <h4 className="text-[13px] font-bold text-[#111] dark:text-white leading-tight">
                                {toast.title}
                            </h4>
                            {toast.description && (
                                <p className="text-[12px] text-[#666] dark:text-[#999] leading-relaxed">
                                    {toast.description}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="absolute right-2 top-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#999]"
                        >
                            <X size={14} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
