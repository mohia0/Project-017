"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface RadioInputProps {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    name: string;
    isDark: boolean;
    primaryColor: string;
    borderRadius: number;
    multiple?: boolean;
}

export const RadioInput = ({ 
    value, 
    onChange, 
    options, 
    name,
    isDark, 
    primaryColor,
    borderRadius,
    multiple
}: RadioInputProps) => {
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
        }
    };

    return (
        <div className="space-y-3">
            {options.map((opt, i) => {
                const isSelected = values.includes(opt);
                return (
                    <label 
                        key={i} 
                        className={cn(
                            "flex items-center gap-4 px-4 py-3 border-2 transition-all duration-200 cursor-pointer group",
                            isSelected 
                                ? "border-primary bg-primary/5 shadow-sm" 
                                : (isDark ? "border-[#333] hover:border-[#444] bg-[#181818]" : "border-[#e5e5e5] hover:border-[#ddd] bg-[#f9f9f9]")
                        )}
                        style={{ 
                            borderRadius: `${borderRadius}px`,
                            borderColor: isSelected ? primaryColor : undefined,
                            backgroundColor: isSelected ? `${primaryColor}08` : undefined
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            toggleOption(opt);
                        }}
                    >
                        <input 
                            type={multiple ? "checkbox" : "radio"} 
                            name={name} 
                            className="hidden" 
                            value={opt} 
                            checked={isSelected} 
                            readOnly
                        />
                        
                        {/* Custom Indicator */}
                        <div className={cn(
                            "w-5 h-5 flex items-center justify-center transition-all duration-300 border-2",
                            multiple ? "rounded-md" : "rounded-full",
                            isSelected 
                                ? "border-primary bg-primary" 
                                : (isDark ? "border-[#444] group-hover:border-[#666]" : "border-[#ccc] group-hover:border-[#aaa]")
                        )}
                        style={{ 
                            borderColor: isSelected ? primaryColor : undefined,
                            backgroundColor: isSelected ? primaryColor : undefined
                        }}>
                            {multiple ? (
                                <Check size={12} strokeWidth={4} className={cn("text-white transition-transform duration-300", isSelected ? "scale-100" : "scale-0")} />
                            ) : (
                                <div className={cn(
                                    "w-2 h-2 rounded-full bg-white transition-transform duration-300",
                                    isSelected ? "scale-100" : "scale-0"
                                )} />
                            )}
                        </div>

                        <span className={cn(
                            "text-[14px] font-medium transition-colors",
                            isSelected ? (isDark ? "text-white" : "text-black") : (isDark ? "text-[#999]" : "text-[#555]")
                        )}>
                            {opt}
                        </span>
                    </label>
                );
            })}
        </div>
    );
};
