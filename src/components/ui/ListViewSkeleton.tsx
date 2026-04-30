"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface ListViewSkeletonProps {
    isMobile?: boolean;
    view?: 'table' | 'cards';
    isDark?: boolean;
    count?: number;
}

export function ListViewSkeleton({ 
    isMobile = false, 
    view = 'table', 
    isDark = false,
    count = 12
}: ListViewSkeletonProps) {
    if (isMobile) {
        return (
            <div className="flex flex-col w-full h-full">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className={cn("flex items-center gap-3 px-4 py-3.5 border-b",
                        isDark ? "border-[#1f1f1f]" : "border-[#f0f0f0]")}>
                        <div className={cn("w-[3px] h-10 rounded-full animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                        <div className="flex-1">
                            <div className={cn("h-3.5 w-36 rounded animate-pulse mb-2", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                            <div className={cn("h-2.5 w-24 rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                        </div>
                        <div className={cn("h-4 w-14 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                    </div>
                ))}
            </div>
        );
    }

    if (view === 'table') {
        return (
            <div className="flex flex-col w-full h-full">
                {/* Table Header Skeleton */}
                <div className={cn("flex items-center h-9 px-2 border-b shrink-0", isDark ? "border-[#2e2e2e]" : "border-[#f0f0f0]")}>
                     <div className={cn("w-3.5 h-3.5 rounded-[3px] animate-pulse ml-2", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                     <div className={cn("h-3 w-16 rounded animate-pulse ml-4", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                </div>
                {/* Table Rows Skeleton */}
                <div className="flex flex-col flex-1 overflow-hidden pt-2">
                    {Array.from({ length: count }).map((_, i) => (
                        <div key={i} className={cn("flex items-center h-[52px] px-2", isDark ? "hover:bg-white/[0.02]" : "hover:bg-black/[0.02]")}>
                             <div className={cn("w-3.5 h-3.5 rounded-[3px] animate-pulse ml-2", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                             <div className="flex flex-col ml-4 gap-1.5 flex-1">
                                 <div className={cn("h-3.5 w-48 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                                 <div className={cn("h-2.5 w-32 rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                             </div>
                             <div className={cn("h-3 w-24 rounded animate-pulse mr-4", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                             <div className={cn("h-4 w-16 rounded animate-pulse mr-2", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Cards view
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {Array.from({ length: count * 2 }).map((_, i) => (
                <div key={i} className={cn("rounded-[8px] border flex flex-col pointer-events-none", isDark ? "border-[#2e2e2e] bg-[#1a1a1a]" : "border-transparent bg-white shadow-sm")}>
                    <div className={cn("flex items-center justify-between px-4 py-3 border-b", isDark ? "border-[#2e2e2e]" : "border-[#f0f0f0]")}>
                        <div className={cn("h-3 w-12 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                        <div className={cn("w-3.5 h-3.5 rounded-[3px] animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                    </div>
                    <div className="px-4 py-2.5 flex flex-col gap-3">
                        <div className="flex items-center gap-3 py-1">
                            <div className={cn("w-[90px] h-2.5 rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                            <div className={cn("flex-1 h-3 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                        </div>
                        <div className="flex items-center gap-3 py-1">
                            <div className={cn("w-[90px] h-2.5 rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                            <div className={cn("w-20 h-3 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                        </div>
                        <div className="flex items-center gap-3 py-1">
                            <div className={cn("w-[90px] h-2.5 rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                            <div className={cn("w-24 h-3 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                        </div>
                        <div className="flex items-center gap-3 py-1">
                            <div className={cn("w-[90px] h-2.5 rounded animate-pulse", isDark ? "bg-white/[0.05]" : "bg-black/[0.05]")} />
                            <div className={cn("w-12 h-3 rounded animate-pulse", isDark ? "bg-white/[0.08]" : "bg-black/[0.08]")} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
