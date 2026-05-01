"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface ListViewSkeletonProps {
    isMobile?: boolean;
    view?: 'table' | 'cards';
    isDark?: boolean;
    count?: number;
    /** If provided, renders the full page chrome: header bar + toolbar bar above the rows */
    pageTitle?: string;
}

export function SkeletonBox({ isDark, className }: { isDark: boolean; className?: string }) {
    return (
        <div className={cn(
            'animate-pulse rounded',
            isDark ? 'bg-white/[0.08]' : 'bg-black/[0.07]',
            className
        )} />
    );
}

/** Header bar — mirrors the `hidden md:flex` header in every list page */
function PageHeaderSkeleton({ isDark, title }: { isDark: boolean; title: string }) {
    return (
        <div className={cn(
            'hidden md:flex items-center justify-between px-5 py-3 shrink-0',
            isDark ? 'bg-[#141414] border-b border-[#252525]' : 'bg-white border-b border-[#f0f0f0]'
        )}>
            <span className={cn('text-[15px] font-semibold tracking-tight', isDark ? 'text-white' : 'text-[#111]')}>
                {title}
            </span>
            {/* Right-side action button ghost */}
            <SkeletonBox isDark={isDark} className="h-7 w-24" />
        </div>
    );
}

/** Toolbar bar — mirrors the desktop toolbar layout */
function ToolbarSkeleton({ isDark }: { isDark: boolean }) {
    return (
        <div className={cn(
            'flex items-center gap-2 px-4 py-2 shrink-0 border-b',
            isDark ? 'border-[#252525] bg-[#141414]' : 'border-[#ebebeb] bg-[#f7f7f7]'
        )}>
            {/* Status tab pills */}
            <div className="flex items-center gap-1">
                <SkeletonBox isDark={isDark} className="h-7 w-14" />
                <SkeletonBox isDark={isDark} className="h-7 w-16" />
                <SkeletonBox isDark={isDark} className="h-7 w-14" />
                <SkeletonBox isDark={isDark} className="h-7 w-18" />
            </div>
            <div className="flex-1" />
            {/* Search + toggle */}
            <SkeletonBox isDark={isDark} className="h-7 w-40" />
            <SkeletonBox isDark={isDark} className="h-7 w-16" />
        </div>
    );
}

export function ListViewSkeleton({
    isMobile = false,
    view = 'table',
    isDark = false,
    count = 12,
    pageTitle,
}: ListViewSkeletonProps) {
    const rows = (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        'flex items-center h-[52px] px-4 border-b',
                        isDark ? 'border-[#1f1f1f]' : 'border-[#f0f0f0] bg-white'
                    )}
                >
                    <SkeletonBox isDark={isDark} className="w-3.5 h-3.5 mr-4 shrink-0" />
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <SkeletonBox isDark={isDark} className="h-3.5 w-48" />
                        <SkeletonBox isDark={isDark} className={cn('h-2.5 w-32', isDark ? 'bg-white/[0.05]' : 'bg-black/[0.05]')} />
                    </div>
                    <SkeletonBox isDark={isDark} className="h-5 w-20 mr-4 shrink-0" />
                    <SkeletonBox isDark={isDark} className="h-3 w-16 shrink-0" />
                </div>
            ))}
        </>
    );

    const cards = (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        'rounded-xl border flex flex-col overflow-hidden',
                        isDark ? 'border-[#2e2e2e] bg-[#1a1a1a]' : 'border-[#f0f0f0] bg-white shadow-sm'
                    )}
                >
                    <div className={cn('p-4 flex flex-col gap-3')}>
                        <div className="flex items-start justify-between gap-2">
                            <SkeletonBox isDark={isDark} className="h-4 w-36" />
                            <SkeletonBox isDark={isDark} className="h-5 w-16" />
                        </div>
                        <SkeletonBox isDark={isDark} className="h-2.5 w-24" />
                        <SkeletonBox isDark={isDark} className="h-2.5 w-20" />
                    </div>
                    <div className={cn('px-4 py-2.5 border-t flex justify-end gap-2', isDark ? 'border-[#252525]' : 'border-[#f5f5f5]')}>
                        <SkeletonBox isDark={isDark} className="h-5 w-5" />
                        <SkeletonBox isDark={isDark} className="h-5 w-5" />
                    </div>
                </div>
            ))}
        </div>
    );

    // Mobile list
    if (isMobile) {
        return (
            <div className="flex flex-col w-full h-full">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className={cn('flex items-center gap-3 px-4 py-3.5 border-b', isDark ? 'border-[#1f1f1f]' : 'border-[#f0f0f0]')}>
                        <SkeletonBox isDark={isDark} className="w-[3px] h-10 rounded-full" />
                        <div className="flex-1">
                            <SkeletonBox isDark={isDark} className="h-3.5 w-36 mb-2" />
                            <SkeletonBox isDark={isDark} className="h-2.5 w-24" />
                        </div>
                        <SkeletonBox isDark={isDark} className="h-4 w-14" />
                    </div>
                ))}
            </div>
        );
    }

    // Full page shell (used by loading.tsx route boundaries)
    if (pageTitle) {
        return (
            <div className={cn('flex flex-col h-full overflow-hidden', isDark ? 'bg-[#141414] text-[#e5e5e5]' : 'bg-[#f7f7f7] text-[#111]')}>
                <PageHeaderSkeleton isDark={isDark} title={pageTitle} />
                <ToolbarSkeleton isDark={isDark} />
                <div className={cn('flex-1 overflow-hidden', isDark ? 'bg-[#141414]' : 'bg-[#f7f7f7]')}>
                    {view === 'cards' ? cards : (
                        <div className={cn('mx-5 mt-5 rounded-xl border overflow-hidden', isDark ? 'border-[#222]' : 'border-[#ebebeb]')}>
                            {/* Table header row */}
                            <div className={cn('flex items-center h-9 px-4 border-b shrink-0', isDark ? 'border-[#252525] bg-[#1a1a1a]' : 'border-[#ebebeb] bg-[#fafafa]')}>
                                <SkeletonBox isDark={isDark} className="w-3.5 h-3.5 mr-4" />
                                <SkeletonBox isDark={isDark} className="h-2.5 w-12 mr-8" />
                                <SkeletonBox isDark={isDark} className="h-2.5 w-12 mr-8" />
                                <SkeletonBox isDark={isDark} className="h-2.5 w-16" />
                            </div>
                            {rows}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Inline skeleton (used inside page.tsx when isLoading && items.length === 0)
    if (view === 'table') {
        return (
            <div className={cn('rounded-xl border overflow-hidden', isDark ? 'border-[#222]' : 'border-[#ebebeb]')}>
                <div className={cn('flex items-center h-9 px-4 border-b', isDark ? 'border-[#252525] bg-[#1a1a1a]' : 'border-[#ebebeb] bg-[#fafafa]')}>
                    <SkeletonBox isDark={isDark} className="w-3.5 h-3.5 mr-4" />
                    <SkeletonBox isDark={isDark} className="h-2.5 w-12 mr-8" />
                    <SkeletonBox isDark={isDark} className="h-2.5 w-12" />
                </div>
                {rows}
            </div>
        );
    }

    return cards;
}
