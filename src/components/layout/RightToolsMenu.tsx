"use client";

import React from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Plus, Moon, Sun, Bell, LayoutTemplate, Settings, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import { Tooltip } from '@/components/ui/Tooltip';

import UserMenu from '@/components/auth/UserMenu';

export default function RightToolsMenu() {
    const router = useRouter();
    const pathname = usePathname();
    const { 
        theme, 
        toggleTheme, 
        setCreateModalOpen, 
        toggleNotifications, 
        rightPanel,
        isRightPanelCollapsed,
        toggleRightPanelCollapse
    } = useUIStore();
    const isDark = theme === 'dark';
    const notificationsOpen = rightPanel?.type === 'notifications';
    const isTemplatesMode = pathname === '/templates';
    
    // Notifications state
    const { notifications } = useNotificationStore();
    const { branding } = useSettingsStore();
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <nav className={cn(
            "h-full w-[44px] flex flex-col items-center shrink-0 transition-colors duration-300 z-10",
            rightPanel && (isDark ? "border-l border-[#222]" : "border-l border-[#e4e4e4]")
        )}>
            {/* Top: Create button or Expand toggle */}
            <div className="flex flex-col items-center pt-1.5 pb-3 w-full px-1 gap-2">
                <button
                    onClick={() => setCreateModalOpen(true)}
                    className="w-9 h-9 rounded-[12px] flex items-center justify-center transition-all bg-primary hover:bg-primary-hover text-[var(--brand-primary-foreground)] group"
                >
                    <Plus size={16} strokeWidth={2.5} className="transition-transform duration-300 group-hover:scale-125" />
                </button>
            </div>

            {/* Middle: Tool icons */}
            <div className="flex flex-col items-center gap-1 py-3 flex-1 w-full px-1">
                <button
                    onClick={toggleNotifications}
                    className={cn(
                        "w-9 h-9 rounded-[12px] flex items-center justify-center transition-all group",
                        isDark 
                            ? (notificationsOpen ? "bg-white/10 text-white" : "bg-transparent text-[#6b6b6b] hover:bg-white/5")
                            : (notificationsOpen ? "bg-black/[0.04] text-[#111]" : "bg-transparent text-[#888] hover:bg-black/[0.04]")
                    )}
                >
                    <div className="relative">
                        <Bell size={16} strokeWidth={1.75} className="transition-transform duration-300 group-hover:scale-110 group-hover:text-current" />
                        {unreadCount > 0 && (
                            <div className={cn(
                                "absolute top-[-6px] right-[-6px] min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold text-white",
                                notifications.some(n => !n.read && n.type === 'receipt_pending')
                                    ? "bg-emerald-500 animate-bell-pulse"
                                    : "bg-red-500"
                            )}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                        )}
                    </div>
                </button>
            </div>

            {/* Bottom: templates + theme toggle + avatar */}
            <div className="flex flex-col items-center gap-2 pt-3 pb-1.5 w-full px-1">
                <button
                    onClick={() => router.push('/templates')}
                    className={cn(
                        "w-9 h-9 rounded-[12px] flex items-center justify-center transition-all group",
                        isDark 
                            ? (isTemplatesMode ? "bg-white/10 text-white" : "bg-white/5 text-[#6b6b6b] hover:bg-white/10")
                            : (isTemplatesMode ? "bg-[#e4e4e4] text-[#111]" : "bg-[#f0f0f0] text-[#888] hover:bg-[#e8e8e8]")
                    )}
                >
                    <LayoutTemplate size={14} strokeWidth={2} className="transition-transform duration-300 group-hover:scale-110" />
                </button>

                <button
                    onClick={toggleTheme}
                    className={cn(
                        "w-9 h-9 rounded-[12px] flex items-center justify-center transition-all group",
                        isDark 
                            ? "bg-white/5 text-[#6b6b6b] hover:bg-white/10" 
                            : "bg-[#f0f0f0] text-[#fa6e34] hover:bg-[#e8e8e8]"
                    )}
                >
                    {isDark 
                        ? <Moon size={14} strokeWidth={1.75} className="transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:text-[#efca00]" /> 
                        : <Sun size={14} strokeWidth={1.75} className="transition-all duration-300 group-hover:scale-110 group-hover:rotate-45 group-hover:text-[#ff804b]" />
                    }
                </button>

                <button
                    onClick={() => router.push('/settings')}
                    className={cn(
                        "w-9 h-9 rounded-[12px] flex items-center justify-center transition-all group",
                        isDark 
                            ? (pathname.startsWith('/settings') ? "bg-white/10 text-white" : "bg-white/5 text-[#6b6b6b] hover:bg-white/10")
                            : (pathname.startsWith('/settings') ? "bg-[#e4e4e4] text-[#111]" : "bg-[#f0f0f0] text-[#888] hover:bg-[#e8e8e8]")
                    )}
                >
                    <Settings size={14} strokeWidth={2} className="transition-all duration-300 group-hover:scale-110 group-hover:rotate-90" />
                </button>

                <UserMenu />
            </div>
        </nav>
    );
}
