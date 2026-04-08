"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Hash } from 'lucide-react';
import { useUIStore } from "@/store/useUIStore";

interface ColorPickerProps {
    value: string;
    onChange: (val: string) => void;
    className?: string;
    isDark?: boolean;
}

// ── COLOR UTILS ──

function hexToRgba(hex: string) {
    let s = hex.replace('#', '');
    let r, g, b, a = 1;
    if (s.length === 3) {
        r = parseInt(s[0] + s[0], 16);
        g = parseInt(s[1] + s[1], 16);
        b = parseInt(s[2] + s[2], 16);
    } else if (s.length === 6) {
        r = parseInt(s.substring(0, 2), 16);
        g = parseInt(s.substring(2, 4), 16);
        b = parseInt(s.substring(4, 6), 16);
    } else if (s.length === 8) {
        r = parseInt(s.substring(0, 2), 16);
        g = parseInt(s.substring(2, 4), 16);
        b = parseInt(s.substring(4, 6), 16);
        a = parseInt(s.substring(6, 8), 16) / 255;
    } else {
        r = 0; g = 0; b = 0;
    }
    return { r, g, b, a };
}

function parseColor(color: string) {
    if (color.startsWith('#')) return hexToRgba(color);
    if (color.startsWith('rgb')) {
        const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (m) return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]), a: m[4] ? parseFloat(m[4]) : 1 };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
}

function rgbToHsv(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
}

function hsvToRgb(h: number, s: number, v: number) {
    h /= 360; s /= 100; v /= 100;
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function rgbaToHex(r: number, g: number, b: number, a: number) {
    const hex = (x: number) => x.toString(16).padStart(2, '0').toUpperCase();
    if (a >= 1) return `#${hex(r)}${hex(g)}${hex(b)}`;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

export function ColorisInput({ value, onChange, className, isDark: isDarkProp }: ColorPickerProps) {
    const { theme } = useUIStore();
    const isDark = isDarkProp ?? (theme === 'dark');
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, direction: 'down' as 'up' | 'down' });
    const containerRef = useRef<HTMLDivElement>(null);

    const colorObj = useMemo(() => parseColor(value), [value]);
    const hsv = useMemo(() => rgbToHsv(colorObj.r, colorObj.g, colorObj.b), [colorObj]);
    const [localHsv, setLocalHsv] = useState(hsv);
    const [localAlpha, setLocalAlpha] = useState(colorObj.a);

    useEffect(() => {
        setLocalHsv(hsv);
        setLocalAlpha(colorObj.a);
    }, [hsv, colorObj.a]);

    const updateColor = (newHsv: { h: number, s: number, v: number }, newAlpha: number) => {
        setLocalHsv(newHsv);
        setLocalAlpha(newAlpha);
        const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
        onChange(rgbaToHex(rgb.r, rgb.g, rgb.b, newAlpha));
    };

    const updateCoords = useCallback(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const pickerHeight = 220; // Estimated height of scaled-down picker
            const spaceBelow = window.innerHeight - rect.bottom;
            const direction = spaceBelow < pickerHeight ? 'up' : 'down';
            
            setCoords({
                top: direction === 'down' 
                    ? rect.bottom + window.scrollY 
                    : rect.top + window.scrollY - pickerHeight,
                left: rect.left + window.scrollX,
                width: rect.width,
                direction
            });
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener('scroll', updateCoords, true);
            window.addEventListener('resize', updateCoords);
            const handleClickOutside = (e: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                   const portalContent = document.getElementById('color-picker-portal-content');
                   if (portalContent && portalContent.contains(e.target as Node)) return;
                   setIsOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                window.removeEventListener('scroll', updateCoords, true);
                window.removeEventListener('resize', updateCoords);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen, updateCoords]);

    const handleSatValDrag = (e: React.MouseEvent | React.TouchEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
        updateColor({ ...localHsv, s: x * 100, v: y * 100 }, localAlpha);
    };

    const handleHueDrag = (e: React.MouseEvent | React.TouchEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const h = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        updateColor({ ...localHsv, h: h * 360 }, localAlpha);
    };

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <div 
                className={cn(
                    "flex items-center gap-2 p-1 rounded-lg transition-all cursor-pointer border",
                    isDark 
                        ? (isOpen ? "border-[#4dbf39]/50 bg-[#1a1a1a]" : "border-white/5 hover:border-white/10 bg-white/5")
                        : (isOpen ? "border-[#4dbf39]/50 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]" : "border-gray-100 hover:border-gray-200 bg-gray-50/50")
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="w-5 h-5 rounded shadow-inner border border-black/5 shrink-0" style={{ backgroundColor: value }} />
                <div className="flex flex-col min-w-0 flex-1">
                    <span className={cn("text-[11px] font-mono font-medium truncate", isDark ? "text-white/90" : "text-gray-700")}>{value}</span>
                </div>
                <Hash size={10} className={cn("opacity-20 mr-1", isDark ? "text-white" : "text-black")} />
            </div>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            id="color-picker-portal-content"
                            initial={{ opacity: 0, y: coords.direction === 'down' ? 4 : -4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: coords.direction === 'down' ? 4 : -4, scale: 0.98 }}
                            transition={{ type: "spring", damping: 30, stiffness: 600 }}
                            style={{ 
                                position: 'absolute',
                                top: coords.direction === 'down' ? coords.top + 6 : coords.top - 6,
                                left: coords.left,
                                width: 180, // Scaled down width
                                zIndex: 99999
                            }}
                            className={cn(
                                "rounded-xl border p-2 overflow-hidden shadow-2xl",
                                isDark ? "bg-[#1f1f1f] border-white/10 shadow-black/50" : "bg-white border-gray-100 shadow-gray-200/50"
                            )}
                        >
                            {/* Saturation / Value */}
                            <div 
                                className="relative w-full aspect-square rounded cursor-crosshair overflow-hidden mb-2"
                                style={{ backgroundColor: `hsl(${localHsv.h}, 100%, 50%)` }}
                                onMouseDownCapture={handleSatValDrag}
                                onTouchStartCapture={handleSatValDrag}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                                <motion.div className="absolute w-3 h-3 -ml-1.5 -mb-1.5 border-2 border-white rounded-full pointer-events-none shadow-sm" animate={{ left: `${localHsv.s}%`, bottom: `${localHsv.v}%` }} />
                            </div>

                            {/* Hue Slider */}
                            <div 
                                className="relative h-1.5 w-full rounded-full cursor-pointer mb-2"
                                style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}
                                onMouseDownCapture={handleHueDrag}
                                onTouchStartCapture={handleHueDrag}
                            >
                                <motion.div className="absolute top-1/2 -mt-1.5 w-3 h-3 -ml-1.5 bg-white rounded-full shadow-sm pointer-events-none border border-black/5" animate={{ left: `${(localHsv.h / 360) * 100}%` }} />
                            </div>

                            {/* Hex Input */}
                            <div className={cn("flex items-center gap-1.5 mb-2 bg-gray-50/50 rounded px-1.5 py-1 border", isDark ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100")}>
                                <Hash size={10} className="opacity-40" />
                                <input 
                                    className={cn("bg-transparent text-[10px] font-mono font-medium outline-none w-full", isDark ? "text-white" : "text-black")}
                                    value={value}
                                    onChange={(e) => onChange(e.target.value)}
                                    placeholder="#HEX"
                                />
                            </div>

                            {/* Minimal Swatches */}
                            <div className="flex flex-wrap gap-1.5 justify-start">
                                {['#FFFFFF', '#000000', '#4DBF39', '#2563EB', '#D97706', '#E11D48'].map((color) => (
                                    <button
                                        key={color}
                                        className={cn(
                                            "w-4 h-4 rounded border border-black/5 hover:scale-110 active:scale-95 transition-all outline-none",
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={(e) => { e.stopPropagation(); onChange(color); }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
