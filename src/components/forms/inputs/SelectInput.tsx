"use client";

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SelectInputProps {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    placeholder?: string;
    isDark: boolean;
    borderRadius: number;
}

export const SelectInput = ({ 
    value, 
    onChange, 
    options, 
    placeholder,
    isDark, 
    borderRadius 
}: SelectInputProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt === value);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full px-4 py-3 text-[14px] flex items-center justify-between transition-all duration-300 border-2 cursor-pointer group",
                    isDark 
                        ? "bg-[#181818] border-[#333] text-white hover:border-[#444]" 
                        : "bg-[#f9f9f9] border-[#e5e5e5] text-black hover:bg-white hover:shadow-sm",
                    isOpen && (isDark ? "border-primary/50 ring-4 ring-primary/5" : "border-primary/50 ring-4 ring-primary/5")
                )}
                style={{ borderRadius: `${borderRadius}px` }}
            >
                <span className={cn(
                    "truncate",
                    !selectedOption && (isDark ? "text-white/30" : "text-black/30")
                )}>
                    {selectedOption || placeholder || "Select an option"}
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
                            isDark ? "bg-[#1c1c1c] border-[#2a2a2a]" : "bg-white border-[#f0f0f0]"
                        )}
                        style={{ borderRadius: `${Math.max(0, borderRadius - 2)}px` }}
                    >
                        <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                            {options.length === 0 ? (
                                <div className={cn("px-4 py-3 text-[13px] text-center italic", isDark ? "text-white/20" : "text-black/20")}>
                                    No options available
                                </div>
                            ) : (
                                options.map((opt, i) => (
                                    <div
                                        key={i}
                                        onClick={() => {
                                            onChange(opt);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2.5 text-[13px] rounded-lg transition-all cursor-pointer mb-0.5 last:mb-0",
                                            value === opt 
                                                ? (isDark ? "bg-primary/10 text-primary" : "bg-primary/5 text-primary")
                                                : (isDark ? "text-[#999] hover:bg-white/5 hover:text-white" : "text-[#555] hover:bg-black/5 hover:text-black")
                                        )}
                                    >
                                        <span className="truncate flex-1">{opt}</span>
                                        {value === opt && (
                                            <Check size={14} className="ml-2 animate-in zoom-in-50 duration-300" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
