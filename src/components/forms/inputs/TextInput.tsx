"use client";

import React from 'react';
import { cn, isDarkColor } from '@/lib/utils';

interface TextInputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    type?: string;
    isDark: boolean;
    borderRadius: number;
    rows?: number;
    backgroundColor?: string;
}

export const TextInput = ({ 
    value, 
    onChange, 
    placeholder, 
    type = 'text', 
    isDark, 
    borderRadius,
    rows,
    backgroundColor
}: TextInputProps) => {
    const isBgDark = backgroundColor ? isDarkColor(backgroundColor) : isDark;

    const className = cn(
        "w-full px-4 py-3 text-[14px] border outline-none transition-all duration-200",
        !backgroundColor && (isDark 
            ? "bg-[#181818] border-[#333] text-[#ddd] placeholder:text-[#555]" 
            : "bg-[#f9f9f9] border-[#e5e5e5] text-[#111] placeholder:text-[#aaa]"),
        backgroundColor && (isBgDark 
            ? "text-white placeholder:text-white/50 border-white/10 hover:border-white/20 focus:border-white/30" 
            : "text-black placeholder:text-black/50 border-black/10 hover:border-black/20 focus:border-black/30"),
        !backgroundColor && "focus:border-primary focus:ring-1 focus:ring-primary/20 hover:border-primary/30",
        rows ? "resize-none" : ""
    );

    const style = { 
        borderRadius: `${borderRadius}px`,
        ...(backgroundColor ? { backgroundColor } : {})
    };

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
