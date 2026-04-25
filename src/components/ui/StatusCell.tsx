"use client";

import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusColors } from '@/lib/statusConfig';
import { Dropdown } from '@/components/ui/Dropdown';

interface CustomStatus {
    id: string;
    name: string;
    is_active: boolean;
    position: number;
}

interface StatusCellProps<T extends string = string> {
    status: T;
    onStatusChange: (s: T) => void;
    isDark: boolean;
    customStatuses: CustomStatus[];
}

/**
 * Unified status badge + dropdown for Invoice and Proposal pages.
 * Uses the `getStatusColors` system and supports fully custom statuses.
 * Previously ~200 lines of identical code in both invoices/page.tsx & proposals/page.tsx.
 *
 * Note: Projects page has a visually distinct StatusCell and intentionally remains local.
 */
export function StatusCell<T extends string = string>({
    status,
    onStatusChange,
    isDark,
    customStatuses = [],
}: StatusCellProps<T>) {
    const [open, setOpen] = useState(false);
    const sc = getStatusColors(status, customStatuses);

    const activeStatuses = customStatuses
        .filter((s) => s.is_active || s.name === status)
        .sort((a, b) => a.position - b.position);

    return (
        <div className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(!open);
                }}
                style={
                    sc.dynamic
                        ? {
                              backgroundColor: sc.dynamic.bg,
                              color: sc.dynamic.text,
                              borderColor: sc.dynamic.border,
                          }
                        : {}
                }
                className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-[6px] transition-all border',
                    !sc.dynamic
                        ? isDark
                            ? 'bg-white/[0.05] border-white/10 text-white/40 group-hover:bg-white/[0.08]'
                            : cn(sc.badge, sc.badgeText, sc.badgeBorder, 'hover:brightness-95')
                        : 'hover:brightness-110'
                )}
            >
                {status}
                <ChevronDown size={10} className="opacity-50" />
            </button>
            <Dropdown open={open} onClose={() => setOpen(false)} isDark={isDark} align="center">
                <div className="py-1 min-w-[140px]">
                    {activeStatuses.map((s) => {
                        const sSc = getStatusColors(s.name, customStatuses);
                        const isActive = s.name === status;
                        const sDynamic = (sSc as any).dynamic;
                        return (
                            <button
                                key={s.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange(s.name as T);
                                    setOpen(false);
                                }}
                                className={cn(
                                    'w-full flex items-center justify-between px-3.5 py-2 text-[12px] text-left transition-colors',
                                    isActive
                                        ? isDark
                                            ? 'bg-white/5'
                                            : 'bg-[#f5f5f5]'
                                        : isDark
                                        ? 'hover:bg-white/5'
                                        : 'hover:bg-[#fafafa]'
                                )}
                            >
                                <span
                                    className={cn('font-medium', isDark ? '' : sSc.badgeText)}
                                    style={
                                        isDark
                                            ? { color: sSc.bar }
                                            : sDynamic
                                            ? { color: sDynamic.text }
                                            : {}
                                    }
                                >
                                    {s.name}
                                </span>
                                {isActive && (
                                    <Check
                                        size={12}
                                        className={isDark ? 'text-white opacity-40' : 'text-black opacity-40'}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </Dropdown>
        </div>
    );
}
