"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

interface TooltipProps {
    children: React.ReactNode;
    content: React.ReactNode;
    delay?: number;
    side?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
    triggerClassName?: string;
}

export function Tooltip({ children, content, delay = 0.2, side = 'top', className, triggerClassName }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>(null);
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const updateCoords = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                x: rect.left + rect.width / 2,
                y: rect.top,
                width: rect.width,
                height: rect.height
            } as any);
        }
    };

    const handleMouseEnter = () => {
        // Don't use hover logic if we are on a touch device to avoid sticky tooltips
        if (window.matchMedia('(pointer: coarse)').matches) return;

        timeoutRef.current = setTimeout(() => {
            updateCoords();
            setIsVisible(true);
        }, delay * 1000);
    };

    const handleMouseLeave = () => {
        if (window.matchMedia('(pointer: coarse)').matches) return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    const handleClick = (e: React.MouseEvent) => {
        // Only handle clicks for touch devices to open/close
        if (window.matchMedia('(pointer: coarse)').matches) {
            e.stopPropagation();
            if (!isVisible) {
                updateCoords();
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: Event) => {
            if (isVisible && 
                window.matchMedia('(pointer: coarse)').matches &&
                triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
                tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                setIsVisible(false);
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isVisible]);

    // Calculate position based on side
    const getPosStyles = () => {
        if (!coords.width) return {};
        const offset = 8;
        
        switch (side) {
            case 'bottom': 
                return { 
                    top: coords.y + coords.height + offset, 
                    left: coords.x
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
                    left: coords.x
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
                onClick={handleClick}
                className={cn("inline-block", triggerClassName)}
            >
                {children}
            </div>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isVisible && (
                        <motion.div
                            ref={tooltipRef}
                            initial={{ 
                                opacity: 0, 
                                scale: 0.95, 
                                x: side === 'left' ? "-95%" : side === 'right' ? "5%" : "-50%",
                                y: side === 'top' ? "-90%" : side === 'bottom' ? "-10%" : "-50%",
                            }}
                            animate={{ 
                                opacity: 1, 
                                scale: 1, 
                                x: (side === 'top' || side === 'bottom') ? "-50%" : side === 'left' ? "-100%" : "0%",
                                y: (side === 'left' || side === 'right') ? "-50%" : side === 'top' ? "-100%" : "0%"
                            }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            style={{ 
                                position: 'fixed',
                                top: (posStyles as any).top,
                                left: (posStyles as any).left,
                                zIndex: 9999,
                                pointerEvents: isVisible && window.matchMedia('(pointer: coarse)').matches ? 'auto' : 'none'
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
