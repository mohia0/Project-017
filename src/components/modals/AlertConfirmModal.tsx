"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type AlertType = 'warning' | 'danger' | 'info';

interface AlertConfirmModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: AlertType;
    isDark?: boolean;
}

export function AlertConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    type = 'warning',
    isDark = false
}: AlertConfirmModalProps) {
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => { setMounted(true); }, []);

    if (!open || !mounted) return null;

    const config = {
        warning: {
            icon: AlertTriangle,
            iconBg: isDark ? "bg-amber-950/30 text-amber-500" : "bg-amber-50 text-amber-600",
            button: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
        },
        danger: {
            icon: AlertCircle,
            iconBg: isDark ? "bg-red-950/30 text-red-500" : "bg-red-50 text-red-600",
            button: "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
        },
        info: {
            icon: Info,
            iconBg: isDark ? "bg-blue-950/30 text-blue-500" : "bg-blue-50 text-blue-600",
            button: "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20"
        }
    }[type];

    const Icon = config.icon;

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
            <div className={cn(
                "w-full max-w-[400px] rounded-2xl shadow-2xl overflow-hidden border animate-in fade-in zoom-in duration-200",
                isDark ? "bg-[#1a1a1a] border-[#2e2e2e] text-[#eee]" : "bg-white border-[#f0f0f0] text-[#111]"
            )}>
                {/* Header */}
                <div className="flex items-start gap-4 p-6 pb-4">
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        config.iconBg
                    )}>
                        <Icon size={20} />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="text-[17px] font-semibold tracking-tight leading-none">{title}</h3>
                        <p className={cn("mt-2 text-[13px] leading-relaxed", isDark ? "text-[#888]" : "text-[#666]")}>
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
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={cn(
                            "px-5 py-2 text-[13px] font-semibold rounded-lg transition-all shadow-sm",
                            config.button
                        )}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
