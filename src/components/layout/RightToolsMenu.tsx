"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUIStore } from '@/store/useUIStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Plus, Bell, LayoutTemplate, Settings, Eye, EyeOff, RefreshCw, X, Check, ArrowLeftRight } from 'lucide-react';
import { AnimatedThemeToggler } from '@/components/ui/AnimatedThemeToggler';
import { cn, detectCreateModalTab } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import { AppLoader } from '@/components/ui/AppLoader';
import { Tooltip } from '@/components/ui/Tooltip';
import { CURRENCIES } from '@/lib/currencies';

import UserMenu from '@/components/auth/UserMenu';

/* ── Currency Converter Popover ─────────────────────────────────── */
function CurrencyConverterPopover({ isDark, onClose, className }: { isDark: boolean; onClose: () => void; className?: string }) {
    const {
        conversionCurrency,
        conversionRates,
        conversionLoading,
        setConversionCurrency,
        fetchConversionRates,
    } = useUIStore();
    const [search, setSearch] = useState('');

    const filtered = CURRENCIES.filter(c =>
        c.label.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (code: string) => {
        if (conversionCurrency === code) {
            // Toggle off
            setConversionCurrency(null);
        } else {
            setConversionCurrency(code);
        }
        setSearch('');
    };

    return (
        <div className={cn(
            "absolute right-full top-0 mr-2 w-[220px] rounded-[14px] border shadow-2xl overflow-hidden z-50",
            isDark ? "bg-[#161616] border-[#2a2a2a]" : "bg-white border-[#e4e4e4]",
            className
        )}>
            {/* Header */}
            <div className={cn(
                "flex items-center justify-between px-3 pt-3 pb-2 border-b",
                isDark ? "border-[#252525]" : "border-[#f0f0f0]"
            )}>
                <div className="flex items-center gap-2">
                    <ArrowLeftRight size={12} className="opacity-50" />
                    <span className={cn("text-[11px] font-bold", isDark ? "text-white/80" : "text-[#111]")}>
                        Currency Conversion
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {conversionCurrency && conversionLoading && (
                        <AppLoader size="xs" color="black" className="opacity-50" />
                    )}
                    {conversionCurrency && !conversionLoading && (
                        <Tooltip content="Refresh rates" side="left">
                            <button
                                onClick={() => fetchConversionRates(conversionCurrency)}
                                className={cn(
                                    "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                                    isDark ? "hover:bg-white/10 text-white/40 hover:text-white/80" : "hover:bg-black/5 text-black/30 hover:text-black/60"
                                )}
                            >
                                <RefreshCw size={10} />
                            </button>
                        </Tooltip>
                    )}
                    <button
                        onClick={onClose}
                        className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                            isDark ? "hover:bg-white/10 text-white/40 hover:text-white/80" : "hover:bg-black/5 text-black/30 hover:text-black/60"
                        )}
                    >
                        <X size={11} />
                    </button>
                </div>
            </div>

            {/* Active badge */}
            {conversionCurrency && (
                <div className={cn(
                    "mx-3 mt-2.5 mb-1 px-2.5 py-1.5 rounded-[8px] flex items-center justify-between",
                    isDark ? "bg-primary/15 border border-primary/20" : "bg-primary/8 border border-primary/15"
                )}>
                    <div>
                        <span className="text-[10px] font-medium opacity-60 block">Active conversion</span>
                        <span className="text-[12px] font-bold text-primary">
                            {CURRENCIES.find(c => c.code === conversionCurrency)?.label} ({conversionCurrency})
                        </span>
                    </div>
                    <button
                        onClick={() => setConversionCurrency(null)}
                        className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                            isDark ? "hover:bg-white/10 text-white/30 hover:text-red-400" : "hover:bg-red-50 text-black/20 hover:text-red-500"
                        )}
                    >
                        <X size={10} />
                    </button>
                </div>
            )}

            {/* Search */}
            <div className="px-3 pt-2 pb-1">
                <input
                    type="text"
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search currency..."
                    className={cn(
                        "w-full text-[11px] px-2.5 py-1.5 rounded-[8px] outline-none border",
                        isDark
                            ? "bg-white/5 border-white/10 text-white placeholder:text-white/30"
                            : "bg-black/[0.03] border-black/8 text-[#111] placeholder:text-[#aaa]"
                    )}
                />
            </div>

            {/* Currency list */}
            <div className="max-h-[200px] overflow-y-auto py-1 custom-scrollbar">
                {filtered.map(c => {
                    const isActive = conversionCurrency === c.code;
                    const rate = conversionRates[c.code];
                    return (
                        <button
                            key={c.code}
                            onClick={() => handleSelect(c.code)}
                            className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors",
                                isActive
                                    ? (isDark ? "bg-white/8 text-white" : "bg-black/[0.04] text-[#111]")
                                    : (isDark ? "hover:bg-white/5 text-[#aaa]" : "hover:bg-black/[0.03] text-[#444]")
                            )}
                        >
                            <span className={cn(
                                "w-7 text-[10px] font-bold shrink-0",
                                isActive ? "text-primary" : "opacity-60"
                            )}>
                                {c.code}
                            </span>
                            <span className="flex-1 text-[11px] truncate">{c.label}</span>
                            <span className={cn("text-[10px] opacity-40 shrink-0", isActive && "opacity-70")}>
                                {c.symbol}
                            </span>
                            {isActive && <Check size={11} className="text-primary shrink-0" />}
                        </button>
                    );
                })}
            </div>

            {/* Footer note */}
            <div className={cn(
                "px-3 py-2 border-t",
                isDark ? "border-[#252525]" : "border-[#f0f0f0]"
            )}>
                <p className="text-[10px] opacity-30 leading-snug">
                    Live rates via exchangerate-api.com. Amounts displayed app-wide are converted for reference only.
                </p>
            </div>
        </div>
    );
}

/* ── Main RightToolsMenu ─────────────────────────────────────────── */
export default function RightToolsMenu() {
    const router = useRouter();
    const pathname = usePathname();
    const {
        theme,
        setCreateModalOpen,
        toggleNotifications,
        rightPanel,
        isRightPanelCollapsed,
        toggleRightPanelCollapse,
        isPrivacyMode,
        togglePrivacyMode,
        conversionCurrency,
        conversionLoading,
    } = useUIStore();
    const isDark = theme === 'dark';
    const notificationsOpen = rightPanel?.type === 'notifications';
    const isTemplatesMode = pathname === '/templates';

    // Notifications state
    const { notifications, markAllAsRead } = useNotificationStore();
    const { branding } = useSettingsStore();
    const unreadCount = notifications.filter(n => !n.read).length;

    const [showCurrencyPopover, setShowCurrencyPopover] = useState(false);
    const currencyBtnRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Close popover on outside click
    useEffect(() => {
        if (!showCurrencyPopover) return;
        const handleClick = (e: MouseEvent) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
                currencyBtnRef.current && !currencyBtnRef.current.contains(e.target as Node)
            ) {
                setShowCurrencyPopover(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showCurrencyPopover]);

    const handleCreateClick = () => {
        const tab = detectCreateModalTab(pathname);
        setCreateModalOpen(true, tab);
    };

    const currencyActive = !!conversionCurrency;

    return (
        <nav className={cn(
            "h-full w-[44px] flex flex-col items-center shrink-0 transition-colors duration-300 z-10",
            ""
        )}>
            {/* Top: Create button */}
            <div className="flex flex-col items-center pt-1.5 pb-3 w-full px-1 gap-2">
                <button
                    onClick={handleCreateClick}
                    className="w-9 h-9 rounded-[12px] flex items-center justify-center transition-all bg-primary hover:bg-primary-hover text-[var(--brand-primary-foreground)] group"
                >
                    <Plus size={16} strokeWidth={2.5} className="transition-transform duration-300 group-hover:scale-125" />
                </button>
            </div>

            {/* Middle: Tool icons */}
            <div className="flex flex-col items-center gap-1 py-3 flex-1 w-full px-1">
                {/* Notifications */}
                <button
                    onClick={toggleNotifications}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        if (unreadCount > 0) {
                            markAllAsRead();
                        }
                    }}
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

            {/* Bottom: tools + templates + theme toggle + avatar */}
            <div className="flex flex-col items-center gap-2 pt-3 pb-1.5 w-full px-1">
                
                {/* Privacy Mode (Eye) */}
                <Tooltip content={isPrivacyMode ? "Show amounts" : "Hide amounts"} side="left">
                    <button
                        onClick={togglePrivacyMode}
                        className={cn(
                            "w-9 h-9 rounded-[12px] flex items-center justify-center transition-all group",
                            isDark
                                ? (isPrivacyMode
                                    ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                                    : "bg-transparent text-[#6b6b6b] hover:bg-white/5")
                                : (isPrivacyMode
                                    ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/15"
                                    : "bg-transparent text-[#888] hover:bg-black/[0.04]")
                        )}
                    >
                        {isPrivacyMode
                            ? <EyeOff size={15} strokeWidth={1.75} className="transition-transform duration-300 group-hover:scale-110" />
                            : <Eye size={15} strokeWidth={1.75} className="transition-transform duration-300 group-hover:scale-110" />
                        }
                    </button>
                </Tooltip>

                {/* Currency Converter */}
                <div className="relative w-9">
                    <Tooltip content={currencyActive ? `Showing in ${conversionCurrency}` : "Convert currency"} side="left">
                        <button
                            ref={currencyBtnRef}
                            onClick={() => setShowCurrencyPopover(v => !v)}
                            className={cn(
                                "w-9 h-9 rounded-[12px] flex items-center justify-center transition-all group relative",
                                isDark
                                    ? (currencyActive || showCurrencyPopover
                                        ? "bg-primary/20 text-primary hover:bg-primary/30"
                                        : "bg-transparent text-[#6b6b6b] hover:bg-white/5")
                                    : (currencyActive || showCurrencyPopover
                                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                                        : "bg-transparent text-[#888] hover:bg-black/[0.04]")
                            )}
                        >
                            {conversionLoading
                                ? <AppLoader size="xs" />
                                : <ArrowLeftRight size={14} strokeWidth={1.75} className="transition-transform duration-300 group-hover:scale-110" />
                            }
                            {/* Active dot indicator */}
                            {currencyActive && (
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                        </button>
                    </Tooltip>

                    {/* Popover via Portal */}
                    {showCurrencyPopover && typeof window !== 'undefined' && createPortal(
                        <div 
                            ref={popoverRef}
                            style={{
                                position: 'fixed',
                                bottom: (window.innerHeight - (currencyBtnRef.current?.getBoundingClientRect().bottom || 0)),
                                right: (window.innerWidth - (currencyBtnRef.current?.getBoundingClientRect().left || 0)) + 8,
                                zIndex: 9999
                            }}
                        >
                            <div className="relative">
                                {/* Override the absolute positioning to just be relative in the portal context */}
                                <CurrencyConverterPopover
                                    isDark={isDark}
                                    onClose={() => setShowCurrencyPopover(false)}
                                    className="!relative !right-0 !top-0 !mr-0"
                                />
                            </div>
                        </div>,
                        document.body
                    )}
                </div>

                {/* Separator */}
                <div className={cn("w-5 h-px my-0.5", isDark ? "bg-white/8" : "bg-black/8")} />

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

                <AnimatedThemeToggler variant="circle" duration={500} />

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
