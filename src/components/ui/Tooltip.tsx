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
    const [coords, setCoords] = useState({ x: 0, y: 0, width: 0, height: 0 });
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
    const getPosStyles = () => {
        if (!coords.width) return {};
        const offset = 8;
        
        switch (side) {
            case 'bottom': 
                return { 
                    top: coords.y + coords.height + offset, 
                    left: coords.x,
                    transform: 'translateX(-50%)'
                };
            case 'left': 
                return { 
                    top: coords.y + coords.height / 2, 
                    left: coords.x - (coords.width / 2) - offset,
                    transform: 'translate(-100%, -50%)'
                };
            case 'right': 
                return { 
                    top: coords.y + coords.height / 2, 
                    left: coords.x + (coords.width / 2) + offset,
                    transform: 'translate(0, -50%)'
                };
            default: // top
                return { 
                    top: coords.y - offset, 
                    left: coords.x,
                    transform: 'translate(-50%, -100%)'
                };
        }
    };

    const posStyles = getPosStyles();

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
                            initial={{ 
                                opacity: 0, 
                                scale: 0.95, 
                                x: side === 'left' ? 4 : side === 'right' ? -4 : 0,
                                y: side === 'top' ? 4 : side === 'bottom' ? -4 : 0,
                            }}
                            animate={{ 
                                opacity: 1, 
                                scale: 1, 
                                x: 0, 
                                y: 0 
                            }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            style={{ 
                                position: 'fixed',
                                top: (posStyles as any).top,
                                left: (posStyles as any).left,
                                transform: (posStyles as any).transform,
                                zIndex: 9999,
                                pointerEvents: 'none'
                            }}
                            className={cn(
                                "px-2 py-1.5 rounded-lg text-[10px] font-bold tracking-tight whitespace-nowrap shadow-2xl border",
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
