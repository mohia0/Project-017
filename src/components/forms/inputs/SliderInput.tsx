"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SliderInputProps {
    value: string | number;
    onChange: (val: string) => void;
    min?: number;
    max?: number;
    isDark: boolean;
    primaryColor: string;
}

export const SliderInput = ({ 
    value, 
    onChange, 
    min = 0, 
    max = 100, 
    isDark, 
    primaryColor 
}: SliderInputProps) => {
    // Current value for live display
    const currentVal = Number(value) || min;
    
    // Percentage for background gradient
    const percentage = ((currentVal - min) / (max - min)) * 100;

    return (
        <div className="space-y-3 py-2">
            <div className="relative h-6 flex items-center">
                <input 
                    type="range" 
                    min={min} 
                    max={max} 
                    value={currentVal}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-1.5 appearance-none bg-transparent cursor-pointer z-10"
                    style={{ 
                        accentColor: primaryColor,
                    }} 
                />
                {/* Track Background */}
                <div 
                    className={cn(
                        "absolute inset-x-0 h-1.5 rounded-full",
                        isDark ? "bg-[#333]" : "bg-[#e5e5e5]"
                    )}
                >
                    <div 
                        className="h-full rounded-full transition-all duration-75"
                        style={{ 
                            width: `${percentage}%`,
                            backgroundColor: primaryColor,
                            boxShadow: `0 0 10px ${primaryColor}40`
                        }}
                    />
                </div>
            </div>
            <div className={cn("flex justify-between text-[11px] font-bold tracking-wider", isDark ? "text-[#555]" : "text-[#aaa]")}>
                <span>{min}</span>
                <span className={isDark ? "text-primary" : "text-primary-foreground"}>{currentVal}</span>
                <span>{max}</span>
            </div>

            <style jsx>{`
                input[type='range']::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: white;
                    border: 2px solid ${primaryColor};
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: transform 0.1s ease;
                }
                input[type='range']::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                }
                input[type='range']::-webkit-slider-thumb:active {
                    transform: scale(0.95);
                }
                input[type='range']::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: white;
                    border: 2px solid ${primaryColor};
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: transform 0.1s ease;
                }
            `}</style>
        </div>
    );
};
