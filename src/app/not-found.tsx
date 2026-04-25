"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FileQuestion, Home } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function NotFound() {
    const { theme } = useUIStore();
    const { branding } = useSettingsStore();
    const isDark = theme === 'dark';
    
    // Default fallback to green if no primary color is set
    const primaryColor = branding?.primary_color || (isDark ? "#4dbf39" : "#3aaa29");

    return (
        <div className={cn(
            "flex h-screen w-full items-center justify-center p-6",
            isDark ? "bg-[#0a0a0a] text-white" : "bg-[#f0f0f0] text-[#111]"
        )}>
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="max-w-md w-full flex flex-col items-center text-center space-y-8"
            >
                {/* 404 Large Text Backdrop */}
                <div className="relative">
                    <motion.h1 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.03, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className={cn(
                            "text-[180px] font-black absolute inset-0 flex items-center justify-center select-none pointer-events-none -mt-8",
                            isDark ? "text-white" : "text-black"
                        )}
                    >
                        404
                    </motion.h1>
                    
                    <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ 
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            delay: 0.1 
                        }}
                        className={cn(
                            "relative z-10 w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl",
                            isDark ? "bg-[#141414] border border-[#222]" : "bg-white border border-[#e0e0e0]"
                        )}
                    >
                        <FileQuestion size={32} style={{ color: primaryColor }} strokeWidth={1.5} />
                    </motion.div>
                </div>

                <div className="space-y-3 relative z-10">
                    <h2 className="text-2xl font-bold tracking-tight">Document Not Found</h2>
                    <p className={cn(
                        "text-[15px] leading-relaxed",
                        isDark ? "text-[#777]" : "text-[#777]"
                    )}>
                        The link you followed may have expired, or the document has been moved or deleted.
                    </p>
                </div>

                {/* Decorative Dots */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className={cn(
                        "absolute top-1/4 left-1/4 w-1 h-1 rounded-full opacity-20",
                        isDark ? "bg-white" : "bg-black"
                    )} />
                    <div className={cn(
                        "absolute bottom-1/3 right-1/4 w-1.5 h-1.5 rounded-full opacity-10",
                        isDark ? "bg-white" : "bg-black"
                    )} />
                    <div className={cn(
                        "absolute top-1/2 right-1/3 w-1 h-1 rounded-full opacity-15",
                        isDark ? "bg-white" : "bg-black"
                    )} />
                </div>
            </motion.div>
        </div>
    );
}
