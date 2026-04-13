"use client";

import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    isDark: boolean;
    className?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search...", isDark, className }: SearchInputProps) {
    return (
        <div className={cn("relative", className)}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-35" size={11} />
            <input 
                value={value} 
                onChange={e => onChange(e.target.value)} 
                placeholder={placeholder}
                className={cn(
                    'pl-7 pr-3 py-1.5 text-[11px] rounded-lg border focus:outline-none transition-all w-36 focus:w-52',
                    isDark ? 'bg-white/5 border-white/8 text-white placeholder:text-white/25 focus:border-white/15'
                           : 'bg-[#f5f5f5] border-[#e0e0e0] text-[#111] placeholder:text-[#aaa] focus:border-[#ccc]'
                )}
            />
            {value && (
                <button 
                    onClick={() => onChange('')} 
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition-opacity"
                >
                    <X size={10} />
                </button>
            )}
        </div>
    );
}
