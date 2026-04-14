import React, { useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownProps {
    open: boolean;
    onClose: () => void;
    isDark: boolean;
    children: React.ReactNode;
    align?: 'left' | 'right';
    className?: string;
}

export function Dropdown({ open, onClose, isDark, children, align = 'right', className }: DropdownProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div 
            ref={ref} 
            className={cn(
                "absolute top-full mt-1 z-50 min-w-[170px] rounded-xl border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100",
                align === 'right' ? "right-0" : "left-0",
                isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]",
                className
            )}
        >
            {children}
        </div>
    );
}

interface DItemProps {
    label: string | React.ReactNode;
    active?: boolean;
    onClick: () => void;
    isDark: boolean;
    className?: string;
}

export function DItem({ label, active, onClick, isDark, className }: DItemProps) {
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
