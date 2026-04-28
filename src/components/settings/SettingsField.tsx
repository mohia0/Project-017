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
    id?: string;
}

export function SettingsField({ label, description, children, layout = 'vertical', extra, id }: SettingsFieldProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    if (layout === 'horizontal') {
        return (
            <div id={id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
        <div id={id} className="w-full">
            <div className="flex items-center justify-between gap-2 mb-1.5">
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
                    ? (isDark ? "bg-[var(--brand-primary)]" : "bg-black")
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
    isDark,
    allowCustom = false
}: { 
    value: string; 
    onChange: (val: string) => void; 
    options: { label: string; value: string }[];
    className?: string;
    isDark?: boolean;
    allowCustom?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keep search in sync with value when closed
    useEffect(() => {
        if (!isOpen) {
            const selected = options.find(o => o.value === value);
            setSearch(selected ? selected.label : value);
        }
    }, [isOpen, value, options]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const filteredOptions = options.filter(o => 
        o.label.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && isOpen) {
            if (filteredOptions.length > 0) {
                handleSelect(filteredOptions[0].value);
            } else if (allowCustom && search) {
                handleSelect(search);
            }
        }
    };

    return (
        <div 
            className={cn("relative w-full", isOpen && "z-[110]")} 
            ref={containerRef}
        >
            <div
                className={cn(
                    "flex items-center justify-between rounded-xl border transition-all h-10 px-3",
                    isDark 
                        ? "bg-[#141414] border-[#252525] focus-within:border-white/20" 
                        : "bg-[#fafafa] border-[#ebebeb] focus-within:border-black/20",
                    className
                )}
                onClick={() => setIsOpen(true)}
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Select..."
                    className={cn(
                        "w-full bg-transparent border-none outline-none text-sm p-0 placeholder:text-black/50 dark:placeholder:text-white/20",
                        isDark ? "text-white" : "text-black"
                    )}
                />
                <ChevronDown 
                    className={cn(
                        "ml-2 opacity-50 shrink-0 transition-transform cursor-pointer", 
                        isOpen && "rotate-180"
                    )} 
                    size={14} 
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                />
            </div>

            {isOpen && (
                <div className={cn(
                    "absolute left-0 right-0 top-full mt-1.5 z-[100] p-1.5 rounded-xl border shadow-xl animate-in zoom-in-95 fade-in duration-200 max-h-[300px] overflow-y-auto custom-scrollbar",
                    isDark ? "bg-[#1c1c1c] border-[#2e2e2e] shadow-black/50" : "bg-white border-[#ebebeb] shadow-black/5"
                )}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => {
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-all mb-0.5 last:mb-0",
                                        value === option.value
                                            ? isDark ? "bg-white/10 text-white font-bold" : "bg-black/5 text-black font-bold"
                                            : isDark 
                                                ? "text-white font-bold"
                                                : "text-black font-normal hover:bg-black/[0.03]"
                                    )}
                                >
                                    {(() => {
                                        if (!search) return option.label;
                                        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                        const regex = new RegExp(`(${escapedSearch})`, 'gi');
                                        const parts = option.label.split(regex);
                                        return (
                                            <>
                                                {parts.map((p, i) => 
                                                    regex.test(p) ? (
                                                        <span key={i} className={cn("rounded-sm px-0.5", isDark ? "bg-white/20 text-white" : "bg-primary/30 text-primary-foreground")}>{p}</span>
                                                    ) : (
                                                        <span key={i}>{p}</span>
                                                    )
                                                )}
                                            </>
                                        );
                                    })()}
                                </button>
                            );
                        })
                    ) : (
                        <div className={cn("px-3 py-2 text-sm italic opacity-50", isDark ? "text-white" : "text-black")}>
                            {allowCustom ? `Press Enter to use "${search}"` : "No results found"}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
