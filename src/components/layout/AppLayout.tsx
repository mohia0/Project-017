"use client";

import React, { useEffect } from 'react';
import LeftSystemMenu from './LeftSystemMenu';
import RightToolsMenu from './RightToolsMenu';
import RightPanel from './RightPanel';
import CreateEntryModal from '@/components/modals/CreateEntryModal';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useProposalStore } from '@/store/useProposalStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useClientStore } from '@/store/useClientStore';
import { useTemplateStore } from '@/store/useTemplateStore';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';

function WorkspaceDataSync() {
    const activeWorkspaceId = useUIStore(s => s.activeWorkspaceId);
    
    useEffect(() => {
        if (activeWorkspaceId) {
            useProposalStore.getState().fetchProposals();
            useInvoiceStore.getState().fetchInvoices();
            useClientStore.getState().fetchClients();
            useTemplateStore.getState().fetchTemplates();
        }
    }, [activeWorkspaceId]);

    return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { theme } = useUIStore();
    const { user, isLoading } = useAuthStore();
    const isDark = theme === 'dark';
    const pathname = usePathname();
    const router = useRouter();
    const isAuthRoute = pathname === '/login';

    useEffect(() => {
        if (!isLoading && !user && !isAuthRoute) {
            router.push('/login');
        }
    }, [user, isLoading, isAuthRoute, router]);

    // Don't render until we know auth state, unless we are already on auth route
    if (isLoading && !isAuthRoute) {
        return (
            <div className={cn(
                "flex h-screen w-full items-center justify-center",
                isDark ? "bg-[#0a0a0a]" : "bg-[#f0f0f0]"
            )}>
                <div className="w-8 h-8 rounded-full border-2 border-[#4dbf39] border-t-transparent animate-spin" />
            </div>
        );
    }

    if (isAuthRoute) {
        return (
            <div className={cn(
                "flex h-screen w-full overflow-hidden",
                isDark ? "bg-[#0a0a0a] text-white" : "bg-[#f0f0f0] text-[#111]"
            )}>
                {children}
            </div>
        );
    }

    return (
        <div className={cn(
            "flex h-screen w-full overflow-hidden p-2.5 gap-2.5",
            isDark ? "bg-[#0a0a0a] text-white" : "bg-[#f0f0f0] text-[#111]"
        )}>
            {/* LEFT — compact icon sidebar */}
            <LeftSystemMenu />

            {/* CENTER — main workspace */}
            <main className={cn(
                "flex-1 flex flex-col relative overflow-hidden rounded-2xl transition-colors duration-300 min-w-0",
                isDark ? "bg-[#141414]" : "bg-white"
            )}>
                <WorkspaceDataSync />
                {children}
            </main>

            {/* RIGHT SIDEBAR UNIT — A unified rounded container */}
            <div className={cn(
                "flex shrink-0 transition-all duration-300 rounded-2xl overflow-hidden border",
                isDark ? "bg-[#141414] border-[#222]" : "bg-white border-[#e4e4e4]"
            )}>
                <RightPanel />
                <RightToolsMenu />
            </div>

            {/* Global Modals */}
            <CreateEntryModal />
        </div>
    );
}
