"use client";
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownProps {
    open: boolean;
    onClose: () => void;
    isDark: boolean;
    children: React.ReactNode;
    align?: 'left' | 'right' | 'center';
    className?: string;
    /** The ref of the trigger element to anchor to. Required for portal mode. */
    triggerRef?: React.RefObject<HTMLElement | null>;
    zIndex?: number;
}

export function Dropdown({ open, onClose, isDark, children, align = 'right', className, triggerRef, zIndex = 9999 }: DropdownProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number; minWidth: number } | null>(null);

    const updateCoords = useCallback(() => {
        if (!triggerRef?.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        let left = rect.left;
        if (align === 'right') left = rect.right;
        else if (align === 'center') left = rect.left + rect.width / 2;
        setCoords({ top: rect.bottom + 4, left, minWidth: rect.width });
    }, [triggerRef, align]);

    useEffect(() => {
        if (!open) return;
        updateCoords();
        const handleClickOutside = (e: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target as Node) &&
                triggerRef?.current && !triggerRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        const handleScroll = () => updateCoords();
        const handleResize = () => updateCoords();
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleResize);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleResize);
        };
    }, [open, onClose, updateCoords, triggerRef]);

    if (!open) return null;

    // Portal mode: render into document.body to escape overflow containers
    if (triggerRef && typeof document !== 'undefined') {
        if (!coords) return null;
        return createPortal(
            <div
                ref={menuRef}
                style={{ 
                    position: 'fixed', 
                    top: coords.top, 
                    left: coords.left, 
                    minWidth: coords.minWidth, 
                    zIndex: zIndex,
                    transform: align === 'center' ? 'translateX(-50%)' : align === 'right' ? 'translateX(-100%)' : 'none'
                }}
                className={cn(
                    "rounded-xl border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100",
                    isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]",
                    className
                )}
            >
                {children}
            </div>,
            document.body
        );
    }

    // Fallback: inline absolute (backwards-compatible for non-table use)
    return (
        <div
            ref={menuRef}
            className={cn(
                "absolute top-full mt-1 z-50 min-w-[170px] rounded-xl border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100",
                align === 'right' ? "right-0" : align === 'left' ? "left-0" : "left-1/2 -translate-x-1/2",
                isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]",
                className
            )}
        >
            {children}
        </div>
    );
}

interface DItemProps {
    icon?: React.ReactNode;
    label: string | React.ReactNode;
    active?: boolean;
    onClick: () => void;
    isDark: boolean;
    className?: string;
}

export function DItem({ label, active, onClick, isDark, className, icon }: DItemProps) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className={cn(
                "w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] transition-colors text-left",
                active
                    ? isDark ? "bg-white/8 text-white font-medium" : "bg-[#f0f0f0] text-[#111] font-medium"
                    : isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]",
                className
            )}
        >
            <span className="flex-1">{label}</span>
            {active && <Check size={11} className="text-primary" />}
        </button>
    );
}

