"use client";
import React from 'react';
import { cn } from '@/lib/utils';

interface CardRowProps {
    label: string;
    children?: React.ReactNode;
    isDark: boolean;
    noBorder?: boolean;
}

/**
 * A compact labeled row for data display inside grid/card views.
 * Used in InvoiceCard and ProposalCard.
 */
export function CardRow({ label, children, isDark, noBorder }: CardRowProps) {
    return (
        <div className={cn(
            "flex items-center gap-3 py-2",
            !noBorder && "border-b border-dashed",
            !noBorder && (isDark ? "border-[#2e2e2e]" : "border-[#e5e5e5]")
        )}>
            <div className={cn(
                "w-[90px] text-[11.5px] font-normal shrink-0",
                isDark ? "text-[#888]" : "text-[#666]"
            )}>
                {label}
            </div>
            <div className={cn(
                "text-[11.5px] flex-1 flex items-center min-w-0 font-medium overflow-visible",
                isDark ? "text-[#ddd]" : "text-[#222]"
            )}>
                {children}
            </div>
        </div>
    );
}
