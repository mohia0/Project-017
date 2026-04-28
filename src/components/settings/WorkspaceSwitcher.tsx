"use client";

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useUIStore } from '@/store/useUIStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Check, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export default function WorkspaceSwitcher({ isLightSidebar, isBranded }: { isLightSidebar?: boolean, isBranded?: boolean }) {
    const router = useRouter();
    const { workspaces, fetchWorkspaces, createWorkspace, isLoading } = useWorkspaceStore();
    const { activeWorkspaceId, setActiveWorkspaceId, isLeftMenuExpanded, theme } = useUIStore();
    const { user } = useAuthStore();
    const { profile } = useSettingsStore();
    const isDark = theme === 'dark';
    
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [rect, setRect] = useState<DOMRect | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchWorkspaces();
    }, [fetchWorkspaces]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                // If it's a click inside the portal, we should handle it carefully
                // but since we stopPropagation on the portal and we only want to close when clicking outside 
                // both the button and the portal...
                // Actually, an easier way is to just let the portal background handle it or add an overlay.
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                setIsCreating(false);
                setNewWorkspaceName('');
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);



    const handleToggle = (e: React.MouseEvent) => {
        if (!isOpen && dropdownRef.current) {
            setRect(dropdownRef.current.getBoundingClientRect());
        }
        setIsOpen(!isOpen);
    };

    const closeDropdown = () => {
        setIsOpen(false);
        setIsCreating(false);
        setNewWorkspaceName('');
    };

    return (
        <div className="w-full relative shrink-0" ref={dropdownRef}>
            <button
                onClick={handleToggle}
                className={cn(
                    "flex items-center w-full transition-all group",
                    isLightSidebar ? "hover:bg-black/[0.04]" : "hover:bg-white/[0.04]",
                    isLeftMenuExpanded ? "px-4 py-3 gap-2.5 rounded-none" : "justify-center py-2 h-14 rounded-none"
                )}
            >
                <Avatar 
                    src={activeWorkspace?.logo_url} 
                    name={activeWorkspace?.name || 'M'} 
                    className="w-7 h-7 rounded-lg" 
                    isDark={!isLightSidebar} 
                />

                {isLeftMenuExpanded && (
                    <>
                        <div className="flex flex-col items-start min-w-0 flex-1">
                            <span className={cn(
                                "text-[13px] font-medium truncate w-full text-left",
                                isLightSidebar ? "text-black" : "text-white"
                            )}>
                                {activeWorkspace?.name || 'My Workspace'}
                            </span>
                            <span className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase w-fit",
                                isLightSidebar 
                                    ? "bg-black/[0.06] text-black/60" 
                                    : "bg-white/[0.06] text-white/60"
                            )}>
                                {user?.email === 'mo7a.classico@gmail.com' ? 'ADMIN' : 'Free Plan'}
                            </span>
                        </div>
                        <ChevronRight size={13} strokeWidth={2.5} className={cn(
                            "transition-transform shrink-0",
                            isBranded
                                ? (isLightSidebar ? "text-black" : "text-white")
                                : (isLightSidebar ? "text-black/30" : "text-white/30"),
                            isOpen && "rotate-180"
                        )} />
                    </>
                )}
            </button>

            {isOpen && rect && createPortal(
                <div 
                    className="fixed inset-0 z-[9999]" 
                    onClick={closeDropdown}
                >
                    <div 
                        className={cn(
                            "fixed border border-white/10 rounded-xl shadow-2xl overflow-hidden p-1 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200",
                            isDark ? "bg-[#141414]" : "bg-[#1c1c1e]"
                        )}
                        style={{ 
                            top: 10, 
                            left: isLeftMenuExpanded ? 180 : 64, 
                            width: '240px'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-2 py-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                            Workspaces
                        </div>
                        
                        <div className="flex flex-col gap-0.5 max-h-[240px] overflow-y-auto">
                            {isLoading && workspaceItemsLoading(3)}
                            
                            {!isLoading && workspaces.map((ws) => (
                                <button
                                    key={ws.id}
                                    onClick={async () => {
                                        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'aroooxa.com';
                                        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';

                                        const { data: domainData } = await supabase
                                            .from('workspace_domains')
                                            .select('domain')
                                            .eq('workspace_id', ws.id)
                                            .eq('is_primary', true)
                                            .maybeSingle();
                                        
                                        const targetHostname = domainData?.domain || `${ws.slug}.${rootDomain}`;
                                        const currentHostname = window.location.hostname;
                                        
                                        if (currentHostname !== targetHostname) {
                                            const port = window.location.port ? `:${window.location.port}` : '';
                                            const finalHost = targetHostname.includes(':') ? targetHostname : `${targetHostname}${port}`;
                                            window.location.href = `${protocol}://${finalHost}${window.location.pathname}${window.location.search}`;
                                        } else {
                                            setActiveWorkspaceId(ws.id);
                                            closeDropdown();
                                        }
                                    }}
                                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-left group"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                            <Avatar 
                                                src={ws.logo_url} 
                                                name={ws.name} 
                                                className="w-6 h-6 rounded-md" 
                                                isDark={true} 
                                            />
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[12px] font-medium text-white/90 truncate">{ws.name}</span>
                                            {activeWorkspaceId === ws.id && (
                                                <span className="text-[10px] text-primary">Active</span>
                                            )}
                                        </div>
                                    </div>
                                    {activeWorkspaceId === ws.id && (
                                        <Check size={14} className="text-primary shrink-0 ml-2" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="h-px bg-white/10 my-1 shrink-0" />

                            <button
                                onClick={() => {
                                    closeDropdown();
                                    router.push('/onboarding?new=true');
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-left text-white/60 hover:text-white mt-0.5 shrink-0"
                            >
                                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-white/5 group-hover:bg-white/10">
                                    <Plus size={14} />
                                </div>
                                <span className="text-[12px] font-medium">New Workspace</span>
                            </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

function workspaceItemsLoading(count: number) {
    return Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 p-2">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-white/5 animate-pulse shrink-0" />
                <div className="h-3 w-24 bg-white/5 animate-pulse rounded" />
            </div>
        </div>
    ));
}
