"use client";

import React, { useEffect, useRef, useState } from "react";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/lib/utils";

interface ColorisInputProps {
    value: string;
    onChange: (val: string) => void;
    className?: string;
    presetColors?: string[];
}

export function ColorisInput({ value, onChange, className, presetColors }: ColorisInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => {
        const initColoris = () => {
            if (typeof window === 'undefined' || !(window as any).Coloris) return;
            
            try {
                if (typeof (window as any).Coloris.init === 'function') {
                    (window as any).Coloris.init();
                }
                (window as any).Coloris({
                    el: `#coloris-${inputRef.current?.id || 'picker'}`,
                    themeMode: isDark ? 'dark' : 'light',
                    alpha: true,
                    formatToggle: true,
                    swatches: presetColors || [
                        '#ffffff', '#000000', '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#db2777'
                    ],
                    onChange: (color: string) => {
                        setLocalValue(color);
                        onChange(color);
                    }
                });
            } catch (e) {
                console.error("Coloris initialization failed", e);
            }
        };

        if (!(window as any).Coloris && !document.getElementById('coloris-script')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/gh/mdbassit/Coloris@latest/dist/coloris.min.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.id = 'coloris-script';
            script.src = 'https://cdn.jsdelivr.net/gh/mdbassit/Coloris@latest/dist/coloris.min.js';
            script.onload = () => {
                setTimeout(initColoris, 100);
            };
            document.head.appendChild(script);
        } else if ((window as any).Coloris) {
            initColoris();
        }

        return () => {};
    }, [isDark, onChange, presetColors]);

    // Generate unique ID for this picker instance
    const id = useRef(`picker-${Math.random().toString(36).substr(2, 9)}`).current;

    return (
        <div className="relative inline-flex items-center w-full group/coloris">
            <input
                ref={inputRef}
                id={`coloris-${id}`}
                type="text"
                value={localValue}
                readOnly
                onClick={() => {
                     if ((window as any).Coloris) {
                        (window as any).Coloris({ el: `#coloris-${id}` });
                     }
                }}
                className={cn(
                    "h-10 rounded-xl border pl-4 pr-14 text-[13px] font-mono tracking-wider w-full outline-none transition-all cursor-pointer",
                    isDark 
                        ? "bg-[#141414] border-white/5 text-white/90 group-hover/coloris:border-white/10" 
                        : "bg-white border-black/10 text-black/90 group-hover/coloris:border-black/20",
                    className
                )}
            />
            {/* Premium Color Indicator Block */}
            <div className="absolute right-1.5 top-1.5 bottom-1.5 w-10 flex items-center justify-center pointer-events-none">
                <div 
                    className={cn(
                        "w-full h-full rounded-[8px] transition-all",
                        isDark ? "border border-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]" : "border border-black/[0.08] shadow-sm"
                    )}
                    style={{ backgroundColor: localValue || 'transparent' }}
                />
            </div>
        </div>
    );
}
