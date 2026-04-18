"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface RadioInputProps {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    name: string;
    isDark: boolean;
    primaryColor: string;
    borderRadius: number;
}

export const RadioInput = ({ 
    value, 
    onChange, 
    options, 
    name,
    isDark, 
    primaryColor,
    borderRadius
}: RadioInputProps) => {
    return (
        <div className="space-y-3">
            {options.map((opt, i) => {
                const isSelected = value === opt;
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
                    >
                        <input 
                            type="radio" 
                            name={name} 
                            className="hidden" 
                            value={opt} 
                            checked={isSelected} 
                            onChange={(e) => onChange(e.target.value)} 
                        />
                        
                        {/* Custom Radio Circle */}
                        <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                            isSelected 
                                ? "border-primary bg-primary" 
                                : (isDark ? "border-[#444] group-hover:border-[#666]" : "border-[#ccc] group-hover:border-[#aaa]")
                        )}
                        style={{ 
                            borderColor: isSelected ? primaryColor : undefined,
                            backgroundColor: isSelected ? primaryColor : undefined
                        }}>
                            <div className={cn(
                                "w-2 h-2 rounded-full bg-white transition-transform duration-300",
                                isSelected ? "scale-100" : "scale-0"
                            )} />
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
