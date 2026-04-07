"use client";

import React from 'react';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';
import { 
    LayoutGrid, Plus, Calendar, Search, 
    ArrowUpRight, BarChart3, TrendingUp, Users 
} from 'lucide-react';

export default function DashboardPage() {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const border = isDark ? 'border-[#252525]' : 'border-[#ebebeb]';
    const textPrimary = isDark ? 'text-[#e5e5e5]' : 'text-[#111]';
    const muted = isDark ? 'text-[#555]' : 'text-[#aaa]';

    return (
        <div className={cn(
            "flex flex-col h-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-[#f7f7f7] text-[#111]"
        )}>
            {/* ── Page header ── */}
            <div className={cn(
                "flex items-center justify-between px-5 py-3 shrink-0",
                isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-white"
            )}>
                <h1 className="text-[15px] font-semibold tracking-tight">Dashboard</h1>
                <button
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-[8px] bg-[#4dbf39] hover:bg-[#59d044] text-black transition-colors"
                >
                    <Plus size={13} strokeWidth={2.5} /> New Project
                </button>
            </div>

            {/* ── Toolbar ── */}
            <div className={cn(
                "flex items-center gap-0 px-4 py-1.5 border-b shrink-0",
                border
            )}>
                {/* Search */}
                <div className="relative mr-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 opacity-40" size={11} />
                    <input
                        placeholder="Search"
                        className={cn(
                            "pl-6 pr-3 py-1 text-[11px] rounded border focus:outline-none w-28 transition-all focus:w-44",
                            isDark
                                ? "bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-white/20"
                                : "bg-[#f5f5f5] border-[#e0e0e0] text-[#111] placeholder:text-[#aaa] focus:border-[#ccc]"
                        )}
                    />
                </div>

                <button className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-colors shrink-0",
                    isDark ? "text-[#777] hover:text-[#ccc] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]"
                )}>
                    <Calendar size={11} className="opacity-60" /> This Month
                </button>
            </div>

            {/* ── Status bar ── */}
            <div className="flex items-stretch h-[26px] shrink-0">
                <div className="flex-1 flex items-center gap-1.5 px-2.5 text-[10px] font-semibold text-white bg-[#5a5a5a]">
                    <BarChart3 size={11} />
                    <span className="opacity-80 font-medium">Analytics</span>
                </div>
                <div className="flex-1 flex items-center gap-1.5 px-2.5 text-[10px] font-semibold text-white bg-[#e28a02]">
                    <TrendingUp size={11} />
                    <span className="opacity-80 font-medium">Growth</span>
                </div>
                <div className="flex-1 flex items-center gap-1.5 px-2.5 text-[10px] font-semibold text-white bg-[#22c55e]">
                    <Users size={11} />
                    <span className="opacity-80 font-medium">Visitors</span>
                </div>
                <div className="flex-1 flex items-center gap-1.5 px-2.5 text-[10px] font-semibold text-white bg-[#4285F4]">
                    <ArrowUpRight size={11} />
                    <span className="opacity-80 font-medium">Active</span>
                </div>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-auto p-5">
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
                    <LayoutGrid size={32} strokeWidth={1} />
                    <p className="text-[14px]">Overview coming soon</p>
                </div>
            </div>
        </div>
    );
}
