"use client";

import React from 'react';
import { useUIStore } from '@/store/useUIStore';
import { Plus, Moon, Sun, Bell, LayoutTemplate } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import { Tooltip } from '@/components/ui/Tooltip';

export default function RightToolsMenu() {
    const router = useRouter();
    const pathname = usePathname();
    const { theme, toggleTheme, setCreateModalOpen, toggleNotifications, rightPanel } = useUIStore();
    const isDark = theme === 'dark';
    const notificationsOpen = rightPanel?.type === 'notifications';
    const isTemplatesMode = pathname === '/templates';

    return (
        <nav className={cn(
            "h-full w-[44px] flex flex-col items-center shrink-0 transition-colors duration-300 z-10",
            rightPanel && (isDark ? "border-l border-[#222]" : "border-l border-[#e4e4e4]")
        )}>
            {/* Top: Create button */}
            <div className="flex flex-col items-center pt-1.5 pb-3 w-full">
                <Tooltip content="Create new" side="left" delay={0.1}>
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-all bg-[#4dbf39] hover:bg-[#59d044] text-black"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                    </button>
                </Tooltip>
            </div>

            {/* Middle: Tool icons */}
            <div className="flex flex-col items-center gap-1 py-3 flex-1 w-full px-2">
                <Tooltip content="Notifications" side="left" delay={0.1}>
                    <button
                        onClick={toggleNotifications}
                        className={cn(
                            "w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors",
                            notificationsOpen
                                ? isDark
                                    ? "bg-white/10 text-white"
                                    : "bg-[#f0f0f0] text-[#111]"
                                : isDark
                                    ? "text-[#6b6b6b] hover:text-white hover:bg-white/5"
                                    : "text-[#888] hover:text-[#111] hover:bg-[#f0f0f0]"
                        )}
                    >
                        <Bell size={16} strokeWidth={1.75} />
                    </button>
                </Tooltip>
            </div>

            {/* Bottom: templates + theme toggle + avatar */}
            <div className="flex flex-col items-center gap-2 pt-3 pb-1.5 w-full px-2">
                <Tooltip content="Templates" side="left" delay={0.1}>
                    <button
                        onClick={() => router.push('/templates')}
                        className={cn(
                            "w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors",
                            isTemplatesMode
                                ? isDark ? "bg-white/10 text-white" : "bg-[#f0f0f0] text-[#111]"
                                : isDark ? "text-[#6b6b6b] hover:text-white hover:bg-white/5" : "text-[#888] hover:text-[#111] hover:bg-[#f0f0f0]"
                        )}
                    >
                        <LayoutTemplate size={14} strokeWidth={2} />
                    </button>
                </Tooltip>

                <Tooltip content={isDark ? "Light Mode" : "Dark Mode"} side="left" delay={0.1}>
                    <button
                        onClick={toggleTheme}
                        className={cn(
                            "w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors",
                            isDark ? "text-[#6b6b6b] hover:text-[#efca00] hover:bg-white/5" : "bg-[#f0f0f0] text-[#fa6e34] hover:text-[#ff804b]"
                        )}
                    >
                        {isDark ? <Moon size={14} strokeWidth={1.75} /> : <Sun size={14} strokeWidth={1.75} />}
                    </button>
                </Tooltip>

                {/* User avatar */}
                <Tooltip content="Account Settings" side="left" delay={0.1}>
                    <div className={cn(
                        "w-8 h-8 rounded-[10px] flex items-center justify-center cursor-pointer transition-colors select-none",
                        isDark ? "bg-[#2a2a2a] text-white/60 hover:bg-[#333]" : "bg-[#f0f0f0] text-[#666] hover:bg-[#e8e8e8]"
                    )}>
                        <span className="text-[10px] font-semibold">MH</span>
                    </div>
                </Tooltip>
            </div>
        </nav>
    );
}
