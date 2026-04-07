"use client";

import React from 'react';
import { useUIStore } from '@/store/useUIStore';
import { Plus, Moon, Sun, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RightToolsMenu() {
    const { theme, toggleTheme, setCreateModalOpen } = useUIStore();
    const isDark = theme === 'dark';

    return (
        <nav className={cn(
            "h-full w-[44px] flex flex-col items-center shrink-0 transition-colors duration-300 rounded-2xl z-10",
            isDark ? "bg-[#1c1c1e]" : "bg-[#fff] border border-[#d2d2eb]"
        )}>
            {/* Top: Create button */}
            <div className={cn(
                "flex flex-col items-center pt-3 pb-3 w-full",
                isDark ? "border-b border-white/5" : "border-b border-[#ebebf5]"
            )}>
                <button
                    onClick={() => setCreateModalOpen(true)}
                    title="Create new"
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-all bg-[#4dbf39] hover:bg-[#59d044] text-black"
                >
                    <Plus size={16} strokeWidth={2.5} />
                </button>
            </div>

            {/* Middle: Tool icons */}
            <div className="flex flex-col items-center gap-1 py-3 flex-1 w-full px-2">
                <button
                    title="Notifications"
                    className={cn(
                        "w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors",
                        isDark ? "text-[#6b6b6b] hover:text-white hover:bg-white/5" : "text-[#888] hover:text-[#111] hover:bg-[#f1f1f9]"
                    )}
                >
                    <Bell size={16} strokeWidth={1.75} />
                </button>
            </div>

            {/* Bottom: theme toggle + avatar */}
            <div className={cn(
                "flex flex-col items-center gap-2 pt-3 pb-3 w-full px-2",
                isDark ? "border-t border-white/5" : "border-t border-[#ebebf5]"
            )}>
                <button
                    onClick={toggleTheme}
                    title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                    className={cn(
                        "w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors",
                        isDark ? "text-[#6b6b6b] hover:text-[#efca00] hover:bg-white/5" : "bg-[#f1f1f9] text-[#fa6e34] hover:text-[#ff804b]"
                    )}
                >
                    {isDark ? <Moon size={14} strokeWidth={1.75} /> : <Sun size={14} strokeWidth={1.75} />}
                </button>

                {/* User avatar */}
                <div className={cn(
                    "w-8 h-8 rounded-[10px] flex items-center justify-center cursor-pointer transition-colors select-none",
                    isDark ? "bg-[#2c2c2e] text-white/60 hover:bg-[#333]" : "bg-[#f1f1f9] text-[#666] hover:bg-[#eaeaef]"
                )}>
                    <span className="text-[10px] font-semibold">MH</span>
                </div>
            </div>
        </nav>
    );
}
