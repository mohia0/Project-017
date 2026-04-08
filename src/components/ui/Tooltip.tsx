"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    delay?: number;
    side?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

export function Tooltip({ children, content, delay = 0.2, side = 'top', className }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>(null);
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setCoords({
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height
                } as any);
                setIsVisible(true);
            }
        }, delay * 1000);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    // Calculate position based on side
    const getPosition = () => {
        const offset = 8;
        switch (side) {
            case 'bottom': return { top: coords.y + (coords as any).height + offset, left: coords.x };
            case 'left': return { top: coords.y + (coords as any).height / 2, left: coords.x - (coords as any).width / 2 - offset };
            case 'right': return { top: coords.y + (coords as any).height / 2, left: coords.x + (coords as any).width / 2 + offset };
            default: return { top: coords.y - offset, left: coords.x }; // top
        }
    };

    const pos = getPosition();

    return (
        <>
            <div 
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="inline-block"
            >
                {children}
            </div>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isVisible && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: side === 'top' ? 4 : -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            style={{ 
                                position: 'fixed',
                                top: pos.top,
                                left: pos.left,
                                transform: `translate(-50%, ${side === 'top' ? '-100%' : '0'})`,
                                zIndex: 9999,
                                pointerEvents: 'none'
                            }}
                            className={cn(
                                "px-2 py-1 rounded-md text-[10px] font-medium tracking-wide whitespace-nowrap shadow-xl border",
                                isDark 
                                    ? "bg-[#1a1a1a] text-white/90 border-white/10 shadow-black/50" 
                                    : "bg-white text-black/80 border-black/5 shadow-black/10",
                                className
                            )}
                        >
                            {content}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
