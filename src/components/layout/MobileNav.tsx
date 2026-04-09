"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useMenuStore, ICON_MAP } from '@/store/useMenuStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import RightPanel from './RightPanel';
import {
    Plus, Bell, Moon, Sun, Settings, LogOut, X,
    LayoutGrid, User, MoreHorizontal
} from 'lucide-react';

/* ─── Mobile Top Bar ─────────────────────────────────────────────── */
export function MobileTopBar() {
    const { theme, toggleTheme, setCreateModalOpen, toggleNotifications } = useUIStore();
    const { user } = useAuthStore();
    const { profile } = useSettingsStore();
    const isDark = theme === 'dark';
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const router = useRouter();

    const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

    // Route label from pathname
    const routeLabel: Record<string, string> = {
        '/dashboard': 'Dashboard',
        '/proposals': 'Proposals',
        '/invoices': 'Invoices',
        '/clients': 'Clients',
        '/projects': 'Projects',
        '/files': 'Files',
        '/templates': 'Templates',
        '/settings': 'Settings',
    };
    const currentLabel = Object.entries(routeLabel).find(([path]) =>
        pathname === path || (path !== '/' && pathname.startsWith(path))
    )?.[1] ?? 'App';

    return (
        <>
            {/* Top bar */}
            <div className={cn(
                "flex items-center justify-between px-4 h-14 shrink-0 border-b z-30",
                isDark
                    ? "bg-[#141414] border-[#252525]"
                    : "bg-white border-[#e8e8e8]"
            )}>
                {/* Left: logo / page title */}
                <div className="flex items-center gap-2.5">
                    <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black bg-[#4dbf39]"
                    )}>
                        <span className="text-black">M</span>
                    </div>
                    <span className={cn(
                        "text-[15px] font-bold tracking-tight",
                        isDark ? "text-white" : "text-[#111]"
                    )}>
                        {currentLabel}
                    </span>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-1.5">
                    {/* Notifications */}
                    <button
                        onClick={toggleNotifications}
                        className={cn(
                            "w-9 h-9 rounded-[11px] flex items-center justify-center transition-all active:scale-95",
                            isDark ? "bg-white/5 text-[#777] hover:bg-white/10" : "bg-[#f0f0f0] text-[#888] hover:bg-[#e8e8e8]"
                        )}
                    >
                        <Bell size={16} strokeWidth={1.75} />
                    </button>

                    {/* Create (single + button) */}
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="w-9 h-9 rounded-[11px] flex items-center justify-center bg-[#4dbf39] hover:bg-[#59d044] text-black active:scale-95 transition-all"
                    >
                        <Plus size={17} strokeWidth={2.5} />
                    </button>

                    {/* Avatar / menu */}
                    <button
                        onClick={() => setMenuOpen(true)}
                        className={cn(
                            "w-9 h-9 rounded-[11px] flex items-center justify-center transition-all active:scale-95 overflow-hidden",
                            isDark ? "bg-white/8 text-white" : "bg-[#f0f0f0] text-[#555]"
                        )}
                    >
                        {user ? (
                            <span className="text-[12px] font-bold">
                                {(displayName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
                            </span>
                        ) : (
                            <User size={15} />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile user menu drawer */}
            {menuOpen && (
                <div
                    className="fixed inset-0 z-[200]"
                    onClick={() => setMenuOpen(false)}
                >
                    <div
                        className={cn(
                            "absolute right-3 top-16 rounded-2xl border shadow-2xl overflow-hidden p-1.5 min-w-[240px]",
                            isDark ? "bg-[#1c1c1e] border-white/10" : "bg-white border-[#e0e0e0]"
                        )}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Profile header */}
                        <div className={cn(
                            "px-3.5 py-3 border-b mb-1 flex items-center gap-3",
                            isDark ? "border-white/8" : "border-[#f0f0f0]"
                        )}>
                            <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[13px]",
                                isDark ? "bg-white/8 text-white" : "bg-[#f0f0f0] text-[#555]"
                            )}>
                                {(displayName?.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className={cn("text-[13px] font-bold truncate", isDark ? "text-white" : "text-[#111]")}>
                                    {displayName || 'Account'}
                                </p>
                                <p className={cn("text-[11px] truncate mt-0.5", isDark ? "text-[#555]" : "text-[#aaa]")}>
                                    {user?.email}
                                </p>
                            </div>
                        </div>

                        {/* Theme toggle */}
                        <button
                            onClick={() => { toggleTheme(); setMenuOpen(false); }}
                            className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors",
                                isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]"
                            )}
                        >
                            {isDark ? <Moon size={15} className="opacity-70" /> : <Sun size={15} className="opacity-70" />}
                            {isDark ? 'Light Mode' : 'Dark Mode'}
                        </button>

                        {/* Settings */}
                        <button
                            onClick={() => { router.push('/settings'); setMenuOpen(false); }}
                            className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors",
                                isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]"
                            )}
                        >
                            <Settings size={15} className="opacity-70" />
                            Settings
                        </button>

                        <div className={cn("h-px my-1", isDark ? "bg-white/5" : "bg-[#f0f0f0]")} />

                        {/* Sign out */}
                        <button
                            onClick={async () => {
                                await useAuthStore.getState().signOut();
                                setMenuOpen(false);
                                router.push('/login');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut size={15} />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

/* ─── Mobile Bottom Navigation ───────────────────────────────────── */
/*
 * Design goals:
 *  - No center FAB (eliminates duplicate + button)
 *  - Horizontally scrollable for future nav items
 *  - Icon + label, active item highlighted with brand color dot
 *  - Equal-width tabs up to 5, then scroll
 */
export function MobileBottomNav() {
    const pathname = usePathname();
    const { theme } = useUIStore();
    const { navItems } = useMenuStore();
    const isDark = theme === 'dark';

    return (
        <nav className={cn(
            "fixed bottom-0 left-0 right-0 z-50",
            "pb-[env(safe-area-inset-bottom)]",
            isDark
                ? "bg-[#141414]/97 border-t border-[#252525] backdrop-blur-xl"
                : "bg-white/97 border-t border-[#e8e8e8] backdrop-blur-xl"
        )}>
            {/* Scrollable tab strip */}
            <div className="flex overflow-x-auto no-scrollbar px-1 pt-1 pb-1.5">
                {navItems.map(item => {
                    const Icon = ICON_MAP[item.icon] || LayoutGrid;
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-[3px] py-2 flex-1 min-w-[60px] max-w-[80px] rounded-xl transition-all shrink-0",
                                isActive
                                    ? isDark ? "text-white" : "text-[#111]"
                                    : isDark ? "text-white/25 hover:text-white/50" : "text-[#c0c0c0] hover:text-[#888]"
                            )}
                        >
                            {/* Icon with active dot */}
                            <div className="relative flex items-center justify-center">
                                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                                {isActive && (
                                    <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#4dbf39]" />
                                )}
                            </div>
                            <span className={cn(
                                "text-[9.5px] font-semibold tracking-wide leading-none mt-[7px]",
                                isActive ? "text-[#4dbf39]" : ""
                            )}>
                                {item.label.length > 9 ? item.label.slice(0, 8) + '…' : item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}


/* ─── Mobile Right Panel Drawer ──────────────────────────────────── */
export function MobileRightPanelDrawer() {
    const { rightPanel, closeRightPanel, theme } = useUIStore();
    const isDark = theme === 'dark';

    if (!rightPanel) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
                onClick={closeRightPanel}
            />
            {/* Drawer */}
            <div className={cn(
                "fixed bottom-0 left-0 right-0 z-[101] rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden",
                "animate-in slide-in-from-bottom duration-300",
                isDark ? "bg-[#141414] border-t border-[#252525]" : "bg-white border-t border-[#e8e8e8]"
            )}>
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <div className={cn("w-10 h-1 rounded-full", isDark ? "bg-white/15" : "bg-[#ddd]")} />
                </div>
                {/* Close button */}
                <button
                    onClick={closeRightPanel}
                    className={cn(
                        "absolute top-3 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                        isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#aaa] hover:text-[#555] hover:bg-[#f0f0f0]"
                    )}
                >
                    <X size={16} strokeWidth={2.5} />
                </button>
                <div className="flex-1 overflow-y-auto">
                    <RightPanel mobileMode />
                </div>
            </div>
        </>
    );
}
