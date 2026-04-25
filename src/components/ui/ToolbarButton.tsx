"use client";
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolbarButtonProps {
    label?: string;
    icon?: React.ReactNode;
    active?: boolean;
    hasArrow?: boolean;
    onClick?: () => void;
    isDark: boolean;
    /** Override active background/text color (e.g. for a specific status tint) */
    activeColor?: string;
    /** Renders in a danger / red style */
    danger?: boolean;
    className?: string;
}

/**
 * Standard compact toolbar button used across all list pages.
 * Supports icons, active states, custom active colors, and chevron arrows.
 */
export function ToolbarButton({
    label, icon, active, hasArrow, onClick, isDark, activeColor, danger, className
}: ToolbarButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-colors shrink-0",
                danger
                    ? "text-red-500 hover:bg-red-500/10"
                    : active
                        ? activeColor || (isDark ? "bg-white/10 text-white" : "bg-[#ebebf5] text-[#111]")
                        : isDark
                            ? "text-[#777] hover:text-[#ccc] hover:bg-white/5"
                            : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]",
                className
            )}
        >
            {icon}
            {label}
            {hasArrow && <ChevronDown size={9} className="opacity-40" />}
        </button>
    );
}

/** @deprecated Use named export `ToolbarButton` instead */
export const TbBtn = ToolbarButton;
