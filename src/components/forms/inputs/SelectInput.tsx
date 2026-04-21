"use client";

import React, { useState, useRef, useEffect } from 'react';
import { cn, isDarkColor } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SelectInputProps {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    placeholder?: string;
    isDark: boolean;
    borderRadius: number;
    multiple?: boolean;
    backgroundColor?: string;
}

export const SelectInput = ({ 
    value, 
    onChange, 
    options, 
    placeholder,
    isDark, 
    borderRadius,
    multiple,
    backgroundColor
}: SelectInputProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isBgDark = backgroundColor ? isDarkColor(backgroundColor) : isDark;

    const values = multiple ? (() => {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [value].filter(Boolean);
        } catch {
            return value ? [value] : [];
        }
    })() : [value];

    const toggleOption = (opt: string) => {
        if (multiple) {
            const next = values.includes(opt) 
                ? values.filter(v => v !== opt)
                : [...values, opt];
            onChange(JSON.stringify(next));
        } else {
            onChange(opt);
            setIsOpen(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const displayText = multiple 
        ? (values.length > 0 ? `${values.length} selected` : placeholder || "Select options")
        : (options.find(opt => opt === value) || placeholder || "Select an option");

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full px-4 py-3 text-[14px] flex items-center justify-between transition-all duration-300 border cursor-pointer group",
                    !backgroundColor && (isDark 
                        ? "bg-[#181818] border-[#333] text-[#ddd] hover:border-[#444]" 
                        : "bg-[#f9f9f9] border-[#e5e5e5] text-[#111] hover:bg-white hover:shadow-sm"),
                    backgroundColor && (isBgDark 
                        ? "text-white border-white/10 hover:border-white/20" 
                        : "text-black border-black/10 hover:border-black/20"),
                    isOpen && "border-primary/50 ring-4 ring-primary/5"
                )}
                style={{ 
                    borderRadius: `${borderRadius}px`,
                    backgroundColor: backgroundColor || undefined
                }}
            >
                <span className={cn(
                    "truncate",
                    values.length === 0 && (!backgroundColor ? (isDark ? "text-white/30" : "text-black/30") : (isBgDark ? "text-white/50" : "text-black/50"))
                )}>
                    {displayText}
                </span>
                <ChevronDown 
                    size={16} 
                    className={cn(
                        "transition-transform duration-300 opacity-30 group-hover:opacity-100",
                        isOpen && "rotate-180 opacity-100 text-primary"
                    )} 
                />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 4, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={cn(
                            "absolute z-[100] w-full mt-1 p-1.5 shadow-2xl border-2 overflow-hidden",
                            !backgroundColor && (isDark ? "bg-[#1c1c1c] border-[#2a2a2a]" : "bg-white border-[#f0f0f0]"),
                            backgroundColor && (isBgDark ? "border-white/10" : "border-black/10")
                        )}
                        style={{ 
                            borderRadius: `${Math.max(0, borderRadius - 2)}px`,
                            backgroundColor: backgroundColor || undefined
                        }}
                    >
                        <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                            {options.length === 0 ? (
                                <div className={cn("px-4 py-3 text-[13px] text-center italic", !backgroundColor ? (isDark ? "text-white/20" : "text-black/20") : (isBgDark ? "text-white/50" : "text-black/50"))}>
                                    No options available
                                </div>
                            ) : (
                                options.map((opt, i) => {
                                    const isSelected = values.includes(opt);
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => toggleOption(opt)}
                                            className={cn(
                                                "flex items-center justify-between px-4 py-3 text-[14px] transition-all cursor-pointer mb-0.5 last:mb-0",
                                                isSelected 
                                                    ? (isBgDark ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary")
                                                    : (!backgroundColor 
                                                        ? (isDark ? "text-[#999] hover:bg-white/5 hover:text-white" : "text-[#555] hover:bg-black/5 hover:text-black") 
                                                        : (isBgDark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-black/70 hover:bg-black/5 hover:text-black"))
                                            )}
                                            style={{ borderRadius: `${Math.max(0, borderRadius - 4)}px` }}
                                        >
                                            <span className="truncate flex-1">{opt}</span>
                                            {isSelected && (
                                                <Check size={14} className="ml-2 animate-in zoom-in-50 duration-300" />
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
