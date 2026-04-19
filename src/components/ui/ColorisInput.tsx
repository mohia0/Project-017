"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Hash } from 'lucide-react';
import { useUIStore } from "@/store/useUIStore";
import { useSettingsStore } from '@/store/useSettingsStore';

interface ColorPickerProps {
    value: string;
    onChange: (val: string) => void;
    className?: string;
    isDark?: boolean;
    compact?: boolean;
    large?: boolean;
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
    if (!color) return { r: 0, g: 0, b: 0, a: 1 };
    if (color.startsWith('#')) return hexToRgba(color);
    if (color.startsWith('rgb')) {
        const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (m) return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]), a: m[4] ? parseFloat(m[4]) : 1 };
    }
    // Assume hex if it's alphanumeric and looks like a hex string
    if (/^[0-9a-fA-F]+$/.test(color)) return hexToRgba('#' + color);
    
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

export function ColorisInput({ value, onChange, className, isDark: isDarkProp, compact, large }: ColorPickerProps) {
    const { theme } = useUIStore();
    const { branding } = useSettingsStore();
    const brandingColors = branding?.branding_colors || [];

    const isDark = isDarkProp ?? (theme === 'dark');
    const [isOpen, setIsOpen] = useState(false);
    

    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, direction: 'down' as 'up' | 'down' });
    const containerRef = useRef<HTMLDivElement>(null);

    const colorObj = useMemo(() => parseColor(value), [value]);
    const hsv = useMemo(() => rgbToHsv(colorObj.r, colorObj.g, colorObj.b), [colorObj]);
    const [localHsv, setLocalHsv] = useState(hsv);
    const [localAlpha, setLocalAlpha] = useState(colorObj.a);
    const [isDragging, setIsDragging] = useState<'satVal' | 'hue' | null>(null);

    const satValRef = useRef<HTMLDivElement>(null);
    const hueRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLocalHsv(hsv);
        setLocalAlpha(colorObj.a);
    }, [hsv, colorObj.a]);

    const updateColor = useCallback((newHsv: { h: number, s: number, v: number }, newAlpha: number) => {
        setLocalHsv(newHsv);
        setLocalAlpha(newAlpha);
        const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
        onChange(rgbaToHex(rgb.r, rgb.g, rgb.b, newAlpha));
    }, [onChange]);

    const updateCoords = useCallback(() => {
        // Centering is now handled by CSS, no need for complex calculations
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
                   addToHistory(value);
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

    const handleSatValDrag = useCallback((e: MouseEvent | TouchEvent) => {
        if (!satValRef.current) return;
        const rect = satValRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
        
        const nextHsv = { ...localHsv, s: x * 100, v: y * 100 };
        setLocalHsv(nextHsv);
        const rgb = hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v);
        onChange(rgbaToHex(rgb.r, rgb.g, rgb.b, localAlpha));
    }, [onChange, localAlpha, localHsv]);

    const handleHueDrag = useCallback((e: MouseEvent | TouchEvent) => {
        if (!hueRef.current) return;
        const rect = hueRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const h = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        
        const nextHsv = { ...localHsv, h: h * 360 };
        setLocalHsv(nextHsv);
        const rgb = hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v);
        onChange(rgbaToHex(rgb.r, rgb.g, rgb.b, localAlpha));
    }, [onChange, localAlpha, localHsv]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (isDragging === 'satVal') handleSatValDrag(e);
            if (isDragging === 'hue') handleHueDrag(e);
        };

        const handleEnd = () => {
            setIsDragging(null);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleEnd);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, handleSatValDrag, handleHueDrag]);

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <div 
                className={cn(
                    "flex items-center gap-2 rounded-xl transition-all cursor-pointer border",
                    large ? "p-3" : "p-1 rounded-lg",
                    isDark 
                        ? (isOpen ? "border-[#4dbf39]/50 bg-[#1a1a1a]" : "border-white/5 hover:border-white/10 bg-white/5")
                        : (isOpen ? "border-[#4dbf39]/50 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)]" : "border-black/[0.08] hover:border-black/[0.15] bg-black/[0.02]")
                )}
                onClick={() => {
                    if (isOpen) addToHistory(value);
                    setIsOpen(!isOpen);
                }}
            >
                <div 
                    className={cn(
                        "rounded shadow-inner border border-black/5 shrink-0",
                        large ? "w-6 h-6" : "w-5 h-5"
                    )} 
                    style={{ backgroundColor: value }} 
                />
                {!compact && (
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className={cn(
                            "font-sans font-bold truncate tracking-tight",
                            large ? "text-[13px]" : "text-[11px]",
                            isDark ? "text-white/90" : "text-black/70"
                        )}>
                            {value}
                        </span>
                    </div>
                )}
            </div>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <>
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                addToHistory(value);
                                setIsOpen(false);
                            }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[1px] z-[99998]"
                        />

                        <motion.div
                            id="color-picker-portal-content"
                            initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-40%' }}
                            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                            exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-40%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 400 }}
                            style={{ 
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                width: 210, 
                                zIndex: 99999
                            }}
                            className={cn(
                                "rounded-xl border p-2 overflow-hidden shadow-2xl backdrop-blur-sm",
                                isDark ? "bg-[#1f1f1f]/95 border-white/10 shadow-black/50" : "bg-white/95 border-gray-100 shadow-gray-200/50"
                            )}
                        >
                            {/* Saturation / Value */}
                            <div 
                                ref={satValRef}
                                className="relative w-full aspect-square rounded cursor-crosshair overflow-hidden mb-2"
                                style={{ backgroundColor: `hsl(${localHsv.h}, 100%, 50%)` }}
                                onMouseDown={(e) => {
                                    setIsDragging('satVal');
                                    handleSatValDrag(e.nativeEvent);
                                }}
                                onTouchStart={(e) => {
                                    setIsDragging('satVal');
                                    handleSatValDrag(e.nativeEvent);
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                                <div 
                                    className="absolute w-3 h-3 -ml-1.5 -mb-1.5 border-2 border-white rounded-full pointer-events-none shadow-sm" 
                                    style={{ left: `${localHsv.s}%`, bottom: `${localHsv.v}%` }} 
                                />
                            </div>

                            {/* Hue Slider */}
                            <div 
                                ref={hueRef}
                                className="relative h-1.5 w-full rounded-full cursor-pointer mb-2"
                                style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}
                                onMouseDown={(e) => {
                                    setIsDragging('hue');
                                    handleHueDrag(e.nativeEvent);
                                }}
                                onTouchStart={(e) => {
                                    setIsDragging('hue');
                                    handleHueDrag(e.nativeEvent);
                                }}
                            >
                                <div 
                                    className="absolute top-1/2 -mt-1.5 w-3 h-3 -ml-1.5 bg-white rounded-full shadow-sm pointer-events-none border border-black/5" 
                                    style={{ left: `${(localHsv.h / 360) * 100}%` }} 
                                />
                            </div>

                            {/* Hex Input */}
                            <div className={cn("flex items-center gap-1.5 mb-2 bg-gray-50/50 rounded px-1.5 py-1 border", isDark ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100")}>
                                <input 
                                    className={cn("bg-transparent text-[10px] font-sans font-medium outline-none w-full", isDark ? "text-white" : "text-black")}
                                    value={value}
                                    onChange={(e) => {
                                        let v = e.target.value;
                                        if (v && !v.startsWith('#') && !v.startsWith('rgb') && !v.startsWith('hsl')) {
                                            if (/^[0-9a-fA-F]+$/.test(v)) {
                                                v = '#' + v;
                                            }
                                        }
                                        onChange(v);
                                    }}
                                    placeholder="#HEX"
                                />
                            </div>




                            {/* Branding Swatches */}
                            {brandingColors.length > 0 && (
                                <div className="mt-1">
                                    <div className={cn("text-[9px] font-bold uppercase tracking-wider opacity-40 mb-1 pl-0.5", isDark ? "text-white" : "text-black")}>
                                        Branding
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 justify-start mb-2">
                                        {brandingColors.map((color) => (
                                            <button
                                                key={color}
                                                className="w-4 h-4 rounded border border-black/5 hover:scale-110 active:scale-95 transition-all outline-none"
                                                style={{ backgroundColor: color }}
                                                onClick={(e) => { e.stopPropagation(); onChange(color); addToHistory(color); }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Color History / Recent Colors */}
                            <div className="mt-1">
                                <div className={cn("text-[9px] font-bold uppercase tracking-wider opacity-40 mb-1 pl-0.5", isDark ? "text-white" : "text-black")}>
                                    Recent
                                </div>
                                <div className="flex flex-wrap gap-1.5 justify-start mb-2">
                                    {(typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('recent-colors') || '[]') : []).length === 0 ? (
                                        <div className={cn("text-[9px] opacity-20 py-1 pl-0.5", isDark ? "text-white" : "text-black")}>No history</div>
                                    ) : (
                                        (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('recent-colors') || '[]') : []).map((color: string) => (
                                            <button
                                                key={color}
                                                className="w-4 h-4 rounded border border-black/5 hover:scale-110 active:scale-95 transition-all outline-none"
                                                style={{ backgroundColor: color }}
                                                onClick={(e) => { e.stopPropagation(); onChange(color); addToHistory(color); }}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>


                        </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}

// ── UTILITY TO ADD TO HISTORY ──
function addToHistory(color: string) {
    if (typeof window === 'undefined') return;
    const history = JSON.parse(localStorage.getItem('recent-colors') || '[]');
    const newHistory = [color, ...history.filter((c: string) => c !== color)].slice(0, 6);
    localStorage.setItem('recent-colors', JSON.stringify(newHistory));
}
