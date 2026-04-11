"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { ChevronDown } from 'lucide-react';

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
                        <label className={cn("block text-sm font-semibold whitespace-nowrap", isDark ? "text-white" : "text-black")}>
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
            <div className="flex items-center gap-2 mb-1.5">
                <label className={cn("block text-sm font-semibold whitespace-nowrap", isDark ? "text-white" : "text-black")}>
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
                    ? "bg-[#141414] border-[#252525] text-white placeholder:text-white/20 focus:border-white/30 focus:ring-black ring-offset-black" 
                    : "bg-[#fafafa] border-[#ebebeb] text-black placeholder:text-black/30 focus:border-black/30 focus:ring-white ring-offset-white",
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
                    ? "bg-[#141414] border-[#252525] text-white placeholder:text-white/20 focus:border-white/30 focus:ring-black ring-offset-black" 
                    : "bg-[#fafafa] border-[#ebebeb] text-black placeholder:text-black/30 focus:border-black/30 focus:ring-white ring-offset-white",
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
                    : (isDark ? "bg-[#252525]" : "bg-[#ebebeb]")
            )}
        >
            <div className={cn(
                "w-4 h-4 rounded-full bg-white shadow-sm absolute transition-transform",
                checked ? "translate-x-6" : "translate-x-1"
            )} />
        </button>
    );
}

export function SettingsSelect({ 
    value, 
    onChange, 
    options, 
    className,
    isDark 
}: { 
    value: string; 
    onChange: (val: string) => void; 
    options: { label: string; value: string }[];
    className?: string;
    isDark?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
        <div 
            className={cn("relative w-full", isOpen && "z-[110]")} 
            ref={containerRef}
        >
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-10 px-3 flex items-center justify-between rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2",
                    isDark 
                        ? "bg-[#141414] border-[#252525] text-white focus:ring-black ring-offset-black" 
                        : "bg-[#fafafa] border-[#ebebeb] text-black focus:ring-white ring-offset-white",
                    className
                )}
            >
                <span className="truncate">{selectedOption?.label}</span>
                <ChevronDown className={cn("ml-2 opacity-50 shrink-0 transition-transform", isOpen && "rotate-180")} size={14} />
            </button>

            {isOpen && (
                <div className={cn(
                    "absolute left-0 right-0 top-full mt-1.5 z-[100] p-1.5 rounded-xl border shadow-xl animate-in zoom-in-95 fade-in duration-200",
                    isDark ? "bg-[#1c1c1c] border-[#2e2e2e] shadow-black/50" : "bg-white border-[#ebebeb] shadow-black/5"
                )}>
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={cn(
                                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 last:mb-0",
                                value === option.value
                                    ? isDark ? "bg-white/10 text-white" : "bg-black/5 text-[#111]"
                                    : isDark ? "text-white/60 hover:bg-white/5 hover:text-white" : "text-black/60 hover:bg-black/[0.03] hover:text-black"
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
