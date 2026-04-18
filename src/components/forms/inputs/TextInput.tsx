"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface TextInputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    type?: string;
    isDark: boolean;
    borderRadius: number;
    rows?: number;
}

export const TextInput = ({ 
    value, 
    onChange, 
    placeholder, 
    type = 'text', 
    isDark, 
    borderRadius,
    rows
}: TextInputProps) => {
    const className = cn(
        "w-full px-4 py-3 text-[14px] border outline-none transition-all duration-200",
        isDark 
            ? "bg-[#181818] border-[#333] text-[#ddd] placeholder:text-[#555]" 
            : "bg-[#f9f9f9] border-[#e5e5e5] text-[#111] placeholder:text-[#aaa]",
        "focus:border-primary focus:ring-1 focus:ring-primary/20 hover:border-primary/30",
        rows ? "resize-none" : ""
    );

    const style = { borderRadius: `${borderRadius}px` };

    if (rows) {
        return (
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className={className}
                style={style}
            />
        );
    }

    return (
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={className}
            style={style}
        />
    );
};
