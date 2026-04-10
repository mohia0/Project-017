"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useMenuStore, ICON_MAP } from '@/store/useMenuStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Avatar } from '@/components/ui/Avatar';
import RightPanel from './RightPanel';
import {
    Plus, Bell, Moon, Sun, Settings, LogOut, X,
    LayoutGrid, User, ChevronRight
} from 'lucide-react';

/* ─── Mobile Top Bar ─────────────────────────────────────────────── */
export function MobileTopBar() {
    const { theme, toggleTheme, setCreateModalOpen, toggleNotifications } = useUIStore();
    const { user } = useAuthStore();
    const { profile } = useSettingsStore();
    const { workspaces } = useWorkspaceStore();
    const { notifications } = useNotificationStore();
    const { activeWorkspaceId } = useUIStore();
    const unreadCount = notifications.filter(n => !n.read).length;
    const isDark = theme === 'dark';
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const router = useRouter();

    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const hasWorkspaceLogo = !!activeWorkspace?.logo_url;
    const avatarUrl = profile?.avatar_url;

    const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

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

    const initials = (displayName?.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase();

    return (
        <>
            {/* Top bar */}
            <div className={cn(
                "flex items-center justify-between px-4 shrink-0 border-b z-30",
                "h-[56px]",
                isDark
                    ? "bg-[#141414]/95 border-[#252525] backdrop-blur-xl"
                    : "bg-white/95 border-[#ebebeb] backdrop-blur-xl"
            )}>
                {/* Left: logo + page title */}
                <div className="flex items-center gap-3">
                    <Avatar 
                        src={activeWorkspace?.logo_url} 
                        name={activeWorkspace?.name || 'M'} 
                        className="w-[30px] h-[30px] rounded-[9px] shadow-sm" 
                        isDark={isDark} 
                        disableBlinking={!(hasWorkspaceLogo && avatarUrl)}
                    />
                    <div>
                        <h1 className={cn(
                            "text-[16px] font-bold tracking-tight leading-none",
                            isDark ? "text-white" : "text-[#111]"
                        )}>
                            {currentLabel}
                        </h1>
                    </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2">
                    {/* Notifications bell */}
                    <button
                        onClick={toggleNotifications}
                        className={cn(
                            "relative w-[36px] h-[36px] rounded-[10px] flex items-center justify-center transition-all active:scale-90",
                            isDark
                                ? "bg-transparent text-[#888] hover:bg-white/10 hover:text-white"
                                : "bg-transparent text-[#888] hover:bg-black/[0.04] hover:text-[#444]"
                        )}
                    >
                        <Bell size={17} strokeWidth={1.75} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                        )}
                    </button>

                    {/* New item */}
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center bg-[#4dbf39] hover:bg-[#59d044] text-black active:scale-90 transition-all shadow-sm shadow-[#4dbf39]/30"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                    </button>

                    <button
                        onClick={() => setMenuOpen(true)}
                        className="active:scale-95 transition-transform"
                    >
                        <Avatar 
                            src={avatarUrl} 
                            name={displayName} 
                            className="w-[36px] h-[36px] rounded-[10px]" 
                            isDark={isDark} 
                            disableBlinking={!(hasWorkspaceLogo && avatarUrl)}
                        />
                    </button>
                </div>
            </div>

            {/* User menu drawer */}
            {menuOpen && (
                <div
                    className="fixed inset-0 z-[200]"
                    onClick={() => setMenuOpen(false)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

                    {/* Menu panel */}
                    <div
                        className={cn(
                            "absolute right-3 top-[64px] rounded-2xl border shadow-2xl overflow-hidden min-w-[240px]",
                            "animate-in fade-in duration-150",
                            isDark
                                ? "bg-[#1c1c1e]/95 border-white/10 backdrop-blur-xl"
                                : "bg-white border-[#e0e0e0] shadow-xl"
                        )}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Profile header */}
                        <div className={cn(
                            "px-4 py-3.5 border-b flex items-center gap-3",
                            isDark ? "border-white/[0.06]" : "border-[#f0f0f0]"
                        )}>
                                <Avatar 
                                    src={avatarUrl} 
                                    name={displayName} 
                                    className="w-10 h-10 rounded-xl" 
                                    isDark={isDark} 
                                    disableBlinking={true}
                                />
                            <div className="min-w-0">
                                <p className={cn("text-[13px] font-semibold truncate", isDark ? "text-white" : "text-[#111]")}>
                                    {displayName || 'Account'}
                                </p>
                                <p className={cn("text-[11px] truncate mt-0.5", isDark ? "text-[#666]" : "text-[#aaa]")}>
                                    {user?.email}
                                </p>
                            </div>
                        </div>

                        {/* Menu items */}
                        <div className="p-1.5 flex flex-col gap-0.5">
                            <button
                                onClick={() => { toggleTheme(); setMenuOpen(false); }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors",
                                    isDark ? "text-[#ccc] hover:bg-white/[0.06]" : "text-[#333] hover:bg-[#f5f5f5]"
                                )}
                            >
                                <div className={cn(
                                    "w-7 h-7 rounded-lg flex items-center justify-center",
                                    isDark ? "bg-white/8 text-[#aaa]" : "bg-[#f0f0f0] text-[#666]"
                                )}>
                                    {isDark ? <Moon size={14} /> : <Sun size={14} />}
                                </div>
                                {isDark ? 'Light Mode' : 'Dark Mode'}
                                <ChevronRight size={13} className="ml-auto opacity-30" />
                            </button>

                            <button
                                onClick={() => { router.push('/settings'); setMenuOpen(false); }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors",
                                    isDark ? "text-[#ccc] hover:bg-white/[0.06]" : "text-[#333] hover:bg-[#f5f5f5]"
                                )}
                            >
                                <div className={cn(
                                    "w-7 h-7 rounded-lg flex items-center justify-center",
                                    isDark ? "bg-white/8 text-[#aaa]" : "bg-[#f0f0f0] text-[#666]"
                                )}>
                                    <Settings size={14} />
                                </div>
                                Settings
                                <ChevronRight size={13} className="ml-auto opacity-30" />
                            </button>

                            <div className={cn("h-px mx-2 my-1", isDark ? "bg-white/[0.05]" : "bg-[#f0f0f0]")} />

                            <button
                                onClick={async () => {
                                    await useAuthStore.getState().signOut();
                                    setMenuOpen(false);
                                    router.push('/login');
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                                    <LogOut size={14} />
                                </div>
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ─── Mobile Bottom Navigation ───────────────────────────────────── */
export function MobileBottomNav() {
    const pathname = usePathname();
    const { theme } = useUIStore();
    const { navItems } = useMenuStore();
    const isDark = theme === 'dark';

    // Show max 5 nav items on mobile bottom bar
    const visibleItems = navItems.slice(0, 5);

    return (
        <nav className={cn(
            "fixed bottom-0 left-0 right-0 z-50",
            "pb-[env(safe-area-inset-bottom)]",
            isDark
                ? "bg-[#141414]/97 border-t border-[#252525] backdrop-blur-xl"
                : "bg-white/97 border-t border-[#e8e8e8] backdrop-blur-xl"
        )}>
            <div className="flex items-stretch h-[56px] px-2">
                {visibleItems.map(item => {
                    const Icon = ICON_MAP[item.icon] || LayoutGrid;
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-[3px] flex-1 relative transition-all",
                                "active:scale-95",
                                isActive
                                    ? isDark ? "text-white" : "text-[#111]"
                                    : isDark ? "text-white/25" : "text-[#c8c8c8]"
                            )}
                        >
                            {/* Active pill indicator */}
                            {isActive && (
                                <div className={cn(
                                    "absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-[#4dbf39]",
                                )} />
                            )}

                            {/* Icon */}
                            <div className={cn(
                                "relative flex items-center justify-center w-[34px] h-[26px] rounded-[9px] transition-all",
                                isActive
                                    ? isDark ? "bg-white/[0.08]" : "bg-[#f0f0f0]"
                                    : "bg-transparent"
                            )}>
                                <Icon
                                    size={18}
                                    strokeWidth={isActive ? 2.25 : 1.5}
                                    className={isActive ? "text-[#4dbf39]" : ""}
                                />
                            </div>

                            {/* Label */}
                            <span className={cn(
                                "text-[9px] font-semibold tracking-wide leading-none",
                                isActive ? "text-[#4dbf39]" : ""
                            )}>
                                {item.label.length > 8 ? item.label.slice(0, 7) + '…' : item.label}
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
