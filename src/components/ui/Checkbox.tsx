"use client";
import React from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps {
    checked: boolean;
    indeterminate?: boolean;
    isDark: boolean;
    className?: string;
}

/**
 * Tiny styled checkbox with indeterminate state support.
 * Used in Invoices, Proposals, Schedulers, Forms, Hooks, and Clients pages.
 */
export function Checkbox({ checked, indeterminate, isDark, className }: CheckboxProps) {
    return (
        <div className={cn(
            "w-[13px] h-[13px] rounded-[3px] border flex items-center justify-center transition-all shrink-0",
            checked
                ? "bg-primary border-primary"
                : indeterminate
                    ? "bg-primary/40 border-primary/60"
                    : isDark ? "border-[#3a3a3a] bg-transparent" : "border-[#d0d0d0] bg-white",
            className
        )}>
            {(checked || indeterminate) && (
                <svg width="7" height="5" viewBox="0 0 8 6" fill="none">
                    {indeterminate && !checked
                        ? <line x1="1" y1="3" x2="7" y2="3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        : <polyline points="1,3 3,5 7,1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
                </svg>
            )}
        </div>
    );
}

/** @deprecated Use named export `Checkbox` instead */
export const Chk = Checkbox;
