"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, detectCreateModalTab } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useMenuStore, ICON_MAP } from '@/store/useMenuStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Avatar } from '@/components/ui/Avatar';
import RightPanel from './RightPanel';
import {
    Plus, Bell, Moon, Sun, Settings, LogOut, X, Menu,
    LayoutGrid, ChevronRight, LayoutTemplate
} from 'lucide-react';

/* ─── Mobile Left Drawer ─────────────────────────────────────────── */
interface MobileLeftDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MobileLeftDrawer({ isOpen, onClose }: MobileLeftDrawerProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, toggleTheme } = useUIStore();
    const { navItems } = useMenuStore();
    const { user } = useAuthStore();
    const { profile } = useSettingsStore();
    const { workspaces } = useWorkspaceStore();
    const { activeWorkspaceId } = useUIStore();
    const isDark = theme === 'dark';

    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const avatarUrl = profile?.avatar_url;
    const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

    // Close on route change
    useEffect(() => {
        onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const visibleItems = navItems.filter(item => !item.isHidden);

    const bgCls = isDark
        ? 'bg-[#121212] border-r border-[#232323]'
        : 'bg-white border-r border-[#e8e8e8]';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="drawer-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-[2px]"
                        onClick={onClose}
                    />

                    {/* Drawer panel */}
                    <motion.div
                        key="drawer-panel"
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.8 }}
                        className={cn(
                            'fixed top-0 left-0 bottom-0 z-[151] w-[280px] flex flex-col',
                            bgCls
                        )}
                    >
                        {/* ── Header: workspace ── */}
                        <div className={cn(
                            'flex items-center gap-3 px-5 pt-[env(safe-area-inset-top)] pb-0 mt-[env(safe-area-inset-top)]',
                            'min-h-[72px] shrink-0 border-b',
                            isDark ? 'border-[#232323]' : 'border-[#f0f0f0]'
                        )}>
                            <Avatar
                                src={activeWorkspace?.logo_url}
                                name={activeWorkspace?.name || 'W'}
                                className="w-9 h-9 rounded-[10px] shadow-sm shrink-0"
                                isDark={isDark}
                            />
                            <div className="min-w-0 flex-1">
                                <p className={cn(
                                    'text-[15px] font-bold truncate leading-tight',
                                    isDark ? 'text-white' : 'text-[#111]'
                                )}>
                                    {activeWorkspace?.name || 'Workspace'}
                                </p>
                                <p className={cn(
                                    'text-[11px] truncate mt-0.5',
                                    isDark ? 'text-[#555]' : 'text-[#bbb]'
                                )}>
                                    {user?.email}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors',
                                    isDark ? 'text-[#555] hover:text-[#aaa] hover:bg-white/5' : 'text-[#ccc] hover:text-[#888] hover:bg-black/5'
                                )}
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* ── Nav items ── */}
                        <div className="flex-1 overflow-y-auto py-3 px-3">
                            <p className={cn(
                                'text-[9px] font-bold uppercase tracking-[0.1em] px-3 pb-2 pt-1',
                                isDark ? 'text-[#444]' : 'text-[#ccc]'
                            )}>
                                Navigation
                            </p>
                            <div className="flex flex-col gap-1">
                                {visibleItems.map(item => {
                                    const Icon = ICON_MAP[item.icon] || LayoutGrid;
                                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            onClick={onClose}
                                            className={cn(
                                                'flex items-center gap-3 px-3 py-2.5 rounded-[13px] transition-all active:scale-[0.98]',
                                                isActive
                                                    ? isDark
                                                        ? 'bg-[#4dbf39]/10 text-[#4dbf39]'
                                                        : 'bg-[#4dbf39]/10 text-[#3aad28]'
                                                    : isDark
                                                        ? 'text-[#888] hover:text-white hover:bg-white/[0.04]'
                                                        : 'text-[#aaa] hover:text-[#333] hover:bg-black/[0.04]'
                                            )}
                                        >
                                            {/* Active bar */}
                                            <div className={cn(
                                                'w-[3px] h-5 rounded-full shrink-0 transition-all',
                                                isActive ? 'bg-[#4dbf39]' : 'bg-transparent'
                                            )} />
                                            <Icon
                                                size={17}
                                                strokeWidth={isActive ? 2.25 : 1.75}
                                                className="shrink-0"
                                            />
                                            <span className={cn(
                                                'text-[13.5px] font-medium flex-1',
                                            )}>
                                                {item.label}
                                            </span>
                                            {isActive && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#4dbf39] shrink-0" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Footer: user actions ── */}
                        <div className={cn(
                            'shrink-0 border-t px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]',
                            isDark ? 'border-[#222]' : 'border-[#f0f0f0]'
                        )}>
                            {/* Action buttons (Top part) */}
                            <div className="flex flex-col gap-0.5 mt-1">
                                {/* Dual Row: Theme & Templates */}
                                <div className="flex items-center gap-1.5 mb-1 px-1">
                                    <button
                                        onClick={() => { toggleTheme(); }}
                                        className={cn(
                                            "flex-1 h-[38px] rounded-[11px] flex items-center justify-center transition-all",
                                            isDark 
                                                ? "bg-white/5 text-[#888] hover:bg-white/10 hover:text-white" 
                                                : "bg-black/[0.04] text-[#888] hover:bg-black/[0.08] hover:text-[#fa6e34]"
                                        )}
                                    >
                                        {isDark ? <Moon size={16} className="text-[#888] group-hover:text-white" /> : <Sun size={16} className="text-[#fa6e34]" />}
                                    </button>

                                    <button
                                        onClick={() => { router.push('/templates'); onClose(); }}
                                        className={cn(
                                            "flex-1 h-[38px] rounded-[11px] flex items-center justify-center transition-all",
                                            isDark 
                                                ? "bg-white/5 text-[#888] hover:bg-white/10 hover:text-white"
                                                : "bg-[#f0f0f0] text-[#888] hover:bg-[#e8e8e8] hover:text-[#555]"
                                        )}
                                    >
                                        <LayoutTemplate size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* User profile row */}
                            <div className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-[13px] mb-1',
                                isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]'
                            )}>
                                <Avatar
                                    src={avatarUrl}
                                    name={displayName}
                                    className="w-8 h-8 rounded-[9px] shrink-0"
                                    isDark={isDark}
                                />
                                <div className="min-w-0 flex-1">
                                    <p className={cn(
                                        'text-[12px] font-semibold truncate leading-tight',
                                        isDark ? 'text-white' : 'text-[#111]'
                                    )}>
                                        {displayName || 'Account'}
                                    </p>
                                </div>
                            </div>

                            {/* Action buttons (Bottom part) */}
                            <div className="flex flex-col gap-0.5 mt-1">

                                <button
                                    onClick={() => { router.push('/settings'); onClose(); }}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-[13px] text-[13px] font-medium transition-colors active:scale-[0.98]',
                                        isDark ? 'text-[#888] hover:text-white hover:bg-white/[0.04]' : 'text-[#aaa] hover:text-[#333] hover:bg-black/[0.04]'
                                    )}
                                >
                                    <div className={cn(
                                        'w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0',
                                        isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]'
                                    )}>
                                        <Settings size={13} />
                                    </div>
                                    Settings
                                    <ChevronRight size={13} className="ml-auto opacity-30" />
                                </button>

                                <div className={cn('h-px mx-2 my-1', isDark ? 'bg-white/[0.05]' : 'bg-[#f0f0f0]')} />

                                <button
                                    onClick={async () => {
                                        await useAuthStore.getState().signOut();
                                        onClose();
                                        router.push('/login');
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[13px] text-[13px] font-medium text-red-500 hover:bg-red-500/[0.07] transition-colors active:scale-[0.98]"
                                >
                                    <div className="w-7 h-7 rounded-[9px] bg-red-500/10 flex items-center justify-center shrink-0">
                                        <LogOut size={13} />
                                    </div>
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

/* ─── Mobile Nav Bar (floating pill at the bottom) ───────────────── */
export function MobileNavBar() {
    const { theme, setCreateModalOpen, toggleNotifications } = useUIStore();
    const { notifications } = useNotificationStore();
    const pathname = usePathname();
    const isDark = theme === 'dark';
    const unreadCount = notifications.filter(n => !n.read).length;
    const [drawerOpen, setDrawerOpen] = useState(false);

    const pillBg = isDark
        ? 'bg-[#1a1a1a]/95 border border-[#2a2a2a] shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
        : 'bg-white/95 border border-[#e0e0e0] shadow-[0_8px_32px_rgba(0,0,0,0.12)]';

    return (
        <>
            <MobileLeftDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

            {/* Floating nav bar */}
            <div className={cn(
                'fixed bottom-0 left-0 right-0 z-[100]',
                'pb-[env(safe-area-inset-bottom)]',
                'px-4 pb-4',
            )}
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
            >
                <div className={cn(
                    'flex items-center justify-between h-[64px] rounded-2xl px-4',
                    'backdrop-blur-xl',
                    pillBg
                )}>
                    {/* Left: hamburger menu button */}
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className={cn(
                            'flex flex-col items-center min-w-[64px] h-full justify-center transition-all active:scale-90',
                        )}
                    >
                        <div className={cn(
                            'w-[44px] h-[44px] rounded-[14px] flex items-center justify-center transition-colors',
                            isDark ? 'text-[#888] hover:text-white hover:bg-white/[0.06]' : 'text-[#999] hover:text-[#333] hover:bg-black/[0.05]'
                        )}>
                            <Menu size={22} strokeWidth={1.75} />
                        </div>
                    </button>

                    {/* Center: Create Entry button */}
                    <button
                        onClick={() => {
                            const tab = detectCreateModalTab(pathname);
                            setCreateModalOpen(true, tab);
                        }}
                        className={cn(
                            'flex flex-col items-center transition-all active:scale-90',
                        )}
                    >
                        <div className={cn(
                            'w-[48px] h-[48px] rounded-[16px] flex items-center justify-center',
                            'bg-[#4dbf39] shadow-[0_4px_20px_rgba(77,191,57,0.45)]',
                            'hover:bg-[#59d044] transition-colors',
                        )}>
                            <Plus size={24} strokeWidth={2.5} className="text-black" />
                        </div>
                    </button>

                    {/* Right: Notifications bell */}
                    <button
                        onClick={toggleNotifications}
                        className={cn(
                            'flex flex-col items-center min-w-[64px] h-full justify-center transition-all active:scale-90',
                        )}
                    >
                        <div className={cn(
                            'relative w-[44px] h-[44px] rounded-[14px] flex items-center justify-center transition-colors',
                            isDark ? 'text-[#888] hover:text-white hover:bg-white/[0.06]' : 'text-[#999] hover:text-[#333] hover:bg-black/[0.05]'
                        )}>
                            <Bell size={22} strokeWidth={1.75} />
                            {unreadCount > 0 && (
                                <span className={cn(
                                    'absolute top-[8px] right-[8px] min-w-[8px] h-[8px] rounded-full',
                                    'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
                                    'flex items-center justify-center',
                                )}>
                                    {unreadCount > 9 && (
                                        <span className="text-[6px] font-bold text-white px-[2px]">9+</span>
                                    )}
                                </span>
                            )}
                        </div>
                    </button>
                </div>
            </div>
        </>
    );
}


/* ─── Mobile Right Panel Drawer ──────────────────────────────────── */
export function MobileRightPanelDrawer() {
    const { rightPanel, closeRightPanel, theme } = useUIStore();
    const isDark = theme === 'dark';

    return (
        <AnimatePresence>
            {!!rightPanel && (
                <>
                    {/* Overlay */}
                    <motion.div
                        key="right-drawer-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px]"
                        onClick={closeRightPanel}
                    />

                    {/* Drawer panel */}
                    <motion.div
                        key="right-drawer-panel"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.8 }}
                        className={cn(
                            "fixed top-0 bottom-0 right-0 z-[201] w-[320px] max-w-[90vw] flex flex-col overflow-hidden shadow-2xl",
                            isDark ? "bg-[#141414] border-l border-[#252525]" : "bg-white border-l border-[#e8e8e8]"
                        )}
                    >
                        <div className="flex-1 overflow-y-auto w-full">
                            <RightPanel mobileMode />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
