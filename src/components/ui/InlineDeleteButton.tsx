"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineDeleteButtonProps {
    onDelete: () => void;
    isDark?: boolean;
    className?: string;
    confirmText?: string;
}

export function InlineDeleteButton({ 
    onDelete, 
    isDark = false, 
    className,
    confirmText = "Sure?" 
}: InlineDeleteButtonProps) {
    const [isConfirming, setIsConfirming] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isConfirming || isLoading) return;
        
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsConfirming(false);
            }
        };

        const timer = setTimeout(() => setIsConfirming(false), 4000);
        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            clearTimeout(timer);
        };
    }, [isConfirming, isLoading]);

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isConfirming) {
            setIsConfirming(true);
            return;
        }
        
        if (isLoading) return;
        
        setIsLoading(true);
        try {
            await onDelete();
        } catch (err) {
            setIsLoading(false);
            setIsConfirming(false);
        }
    };

    return (
        <div ref={containerRef} className="relative flex items-center justify-center min-w-[24px]">
            <motion.button
                layout
                onClick={handleClick}
                disabled={isLoading}
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className={cn(
                    "relative flex items-center justify-center transition-all overflow-hidden",
                    !isConfirming 
                        ? (isDark ? "w-6 h-6 text-[#555] hover:text-red-400 hover:bg-red-500/10" : "w-6 h-6 text-[#bbb] hover:text-red-500 hover:bg-red-50")
                        : "h-6 px-2.5 bg-red-500 text-white font-bold shadow-sm active:scale-95",
                    "rounded-[6px]", // Consistency with squared-rounded theme
                    className
                )}
            >
                <motion.div 
                    layout 
                    className="flex items-center gap-1.5"
                >
                    {isLoading ? (
                        <motion.div 
                            initial={{ rotate: 0 }}
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full shrink-0"
                        />
                    ) : (
                        <Trash2 size={isConfirming ? 10 : 11} className="shrink-0" />
                    )}
                    
                    <AnimatePresence>
                        {isConfirming && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.8, x: -5 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.8, x: -5 }}
                                transition={{ duration: 0.15 }}
                                className="text-[10px] leading-none pt-[1px] whitespace-nowrap"
                            >
                                {isLoading ? 'Deleting…' : confirmText}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.button>
        </div>
    );
}
