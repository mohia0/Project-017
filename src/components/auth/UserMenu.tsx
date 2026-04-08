"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { User, Settings, LogOut, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UserMenu() {
    const router = useRouter();
    const { user, isLoading, signOut } = useAuthStore();
    const { profile, fetchProfile } = useSettingsStore();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const [isOpen, setIsOpen] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);

    const avatarRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user, fetchProfile]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    const handleToggle = () => {
        if (isLoading) return;
        
        if (!user) {
            router.push('/login');
            return;
        }

        if (!isOpen && avatarRef.current) {
            setRect(avatarRef.current.getBoundingClientRect());
        }
        setIsOpen(!isOpen);
    };

    const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0];
    const avatarUrl = profile?.avatar_url;

    return (
        <div className="relative shrink-0 flex items-center justify-center w-full">
            <button 
                ref={avatarRef}
                onClick={handleToggle}
                className={cn(
                    "w-9 h-9 rounded-[12px] flex items-center justify-center cursor-pointer transition-all select-none overflow-hidden group",
                    isLoading ? "animate-pulse opacity-50" : "active:scale-95",
                    !avatarUrl && (
                        isDark 
                            ? "bg-white/5 text-[#6b6b6b] hover:bg-white/10" 
                            : "bg-[#f0f0f0] text-[#888] hover:text-[#111] hover:bg-[#e8e8e8]"
                    ),
                    avatarUrl && (isDark ? "text-white/80" : "text-black")
                )}
                title={user ? "Account" : "Sign In"}
            >
                {isLoading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : user ? (
                    avatarUrl ? (
                         <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                    ) : (
                        <span className="text-[11px] font-bold transition-transform duration-300 group-hover:scale-110">
                            {displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                        </span>
                    )
                ) : (
                    <User size={14} strokeWidth={2.5} className="transition-transform duration-300 group-hover:scale-110" />
                )}
            </button>

            {isOpen && rect && user && createPortal(
                <div 
                    className="fixed inset-0 z-[9999]" 
                    onClick={() => setIsOpen(false)}
                >
                    <div 
                        className={cn(
                            "fixed border rounded-2xl shadow-2xl overflow-hidden p-1.5 flex flex-col min-w-[260px] animate-in fade-in slide-in-from-bottom-2 duration-200",
                            isDark ? "bg-[#0d0d0d] border-white/10" : "bg-white border-black/10 shadow-black/10"
                        )}
                        style={{ 
                            bottom: 10,
                            right: 64
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex flex-col">
                            <div className="px-3.5 py-4 border-b flex items-center gap-3 mb-1" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
                                <div className={cn(
                                    "w-10 h-10 rounded-[12px] flex items-center justify-center overflow-hidden shrink-0",
                                    isDark ? "bg-white/5" : "bg-black/5"
                                )}>
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className={cn("text-sm font-bold", isDark ? "text-white/40" : "text-black/40")}>
                                            {displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-bold truncate leading-tight uppercase tracking-tight">{displayName}</span>
                                    <span className="text-[11px] font-medium opacity-50 truncate mt-0.5">{user.email}</span>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    router.push('/settings/profile');
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-[13px] font-bold",
                                    isDark ? "hover:bg-white/5 text-white" : "hover:bg-black/5 text-black"
                                )}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isDark ? "bg-white/5" : "bg-black/5")}>
                                        <Settings size={14} className="opacity-70" strokeWidth={2.5} />
                                    </div>
                                    Manage Profile
                                </div>
                                <ChevronRight size={14} className="opacity-20" strokeWidth={3} />
                            </button>

                            <div className="h-px my-1" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }} />

                            <button
                                onClick={async () => {
                                    await signOut();
                                    setIsOpen(false);
                                    router.push('/login');
                                }}
                                className={cn(
                                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-[13px] font-bold text-red-500",
                                    isDark ? "hover:bg-red-500/10" : "hover:bg-red-50/80"
                                )}
                            >
                                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                                    <LogOut size={14} strokeWidth={2.5} />
                                </div>
                                Terminate Session
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
