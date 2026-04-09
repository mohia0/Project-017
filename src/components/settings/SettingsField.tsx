"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

interface SettingsFieldProps {
    label: string;
    description?: string;
    children: React.ReactNode;
    layout?: 'horizontal' | 'vertical'; // default is vertical, but some fields look better horizontal
    extra?: React.ReactNode;
}

export function SettingsField({ label, description, children, layout = 'vertical', extra }: SettingsFieldProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    if (layout === 'horizontal') {
        return (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <label className={cn("block text-sm font-semibold", isDark ? "text-white" : "text-black")}>
                            {label}
                        </label>
                        {extra}
                    </div>
                    {description && (
                        <p className={cn("text-xs", isDark ? "text-white/50" : "text-black/50")}>
                            {description}
                        </p>
                    )}
                </div>
                <div className="shrink-0 w-full md:w-[320px]">
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-1.5">
                <label className={cn("block text-sm font-semibold", isDark ? "text-white" : "text-black")}>
                    {label}
                </label>
                {extra}
            </div>
            {description && (
                <p className={cn("text-[13px] mb-2.5", isDark ? "text-white/50" : "text-black/50")}>
                    {description}
                </p>
            )}
            <div className="w-full">
                {children}
            </div>
        </div>
    );
}

// Common input styles wrapper for use inside SettingsField
export function SettingsInput({ className, value, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    
    return (
        <input 
            className={cn(
                "w-full h-10 px-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2",
                isDark 
                    ? "bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-white/30 focus:ring-black ring-offset-black" 
                    : "bg-black/5 border-black/10 text-black placeholder:text-black/30 focus:border-black/30 focus:ring-white ring-offset-white",
                className
            )}
            value={value ?? ''}
            {...props}
        />
    );
}

export function SettingsTextarea({ className, value, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    
    return (
        <textarea 
            className={cn(
                "w-full p-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[100px] resize-y",
                isDark 
                    ? "bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-white/30 focus:ring-black ring-offset-black" 
                    : "bg-black/5 border-black/10 text-black placeholder:text-black/30 focus:border-black/30 focus:ring-white ring-offset-white",
                className
            )}
            value={value ?? ''}
            {...props}
        />
    );
}

// A simple toggle switch component
export function SettingsToggle({ checked, onChange, disabled }: { checked: boolean, onChange: (v: boolean) => void, disabled?: boolean }) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                "w-11 h-6 rounded-full transition-colors relative flex items-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed",
                checked 
                    ? (isDark ? "bg-[#4dbf39]" : "bg-black")
                    : (isDark ? "bg-white/10" : "bg-black/10")
            )}
        >
            <div className={cn(
                "w-4 h-4 rounded-full bg-white shadow-sm absolute transition-transform",
                checked ? "translate-x-6" : "translate-x-1"
            )} />
        </button>
    );
}
