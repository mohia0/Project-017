"use client";

import React, { useEffect } from 'react';
import LeftSystemMenu from './LeftSystemMenu';
import RightToolsMenu from './RightToolsMenu';
import RightPanel from './RightPanel';
import CreateEntryModal from '@/components/modals/CreateEntryModal';
import CSVImportModal from '@/components/modals/CSVImportModal';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useProposalStore } from '@/store/useProposalStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useClientStore } from '@/store/useClientStore';
import { useTemplateStore } from '@/store/useTemplateStore';
import { useMenuStore } from '@/store/useMenuStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useProjectStore } from '@/store/useProjectStore';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileTopBar, MobileBottomNav, MobileRightPanelDrawer } from './MobileNav';

function DocumentTitleSetter() {
    const pathname = usePathname();
    const activeWorkspaceId = useUIStore(s => s.activeWorkspaceId);
    const workspaces = useWorkspaceStore(s => s.workspaces);
    
    useEffect(() => {
        const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
        const workspaceName = activeWorkspace?.name || 'CRM 17';
        
        const path = pathname || '/';
        let pageTitle = '';

        if (path === '/') pageTitle = 'Dashboard';
        else if (path === '/proposals') pageTitle = 'Proposals';
        else if (path.startsWith('/proposals/')) pageTitle = 'Proposal Detail';
        else if (path === '/invoices') pageTitle = 'Invoices';
        else if (path.startsWith('/invoices/')) pageTitle = 'Invoice Detail';
        else if (path === '/clients') pageTitle = 'Clients';
        else if (path.startsWith('/clients/')) pageTitle = 'Client Detail';
        else if (path === '/files') pageTitle = 'File Manager';
        else if (path === '/templates') pageTitle = 'Templates';
        else if (path === '/settings') pageTitle = 'Settings';
        else if (path === '/onboarding') pageTitle = 'Onboarding';
        else if (path === '/login') pageTitle = 'Login';
        else if (path === '/projects') pageTitle = 'Projects';
        else if (path.startsWith('/projects/')) pageTitle = 'Project Detail';
        else if (path === '/hooks') pageTitle = 'Hook Generator';
        else {
            const segment = path.split('/').filter(Boolean).pop() || '';
            pageTitle = segment.charAt(0).toUpperCase() + segment.slice(1);
        }

        document.title = `${workspaceName} - ${pageTitle}`;
    }, [pathname, activeWorkspaceId, workspaces]);

    return null;
}

function WorkspaceDataSync() {
    const activeWorkspaceId = useUIStore(s => s.activeWorkspaceId);
    
    useEffect(() => {
        if (activeWorkspaceId) {
            useProposalStore.getState().fetchProposals();
            useInvoiceStore.getState().fetchInvoices();
            useClientStore.getState().fetchClients();
            useTemplateStore.getState().fetchTemplates();
            useProjectStore.getState().fetchProjects();
            
            // Notifications
            useNotificationStore.getState().fetchNotifications();
            useNotificationStore.getState().subscribe();
            
            return () => {
                useNotificationStore.getState().unsubscribe();
            };
        }
    }, [activeWorkspaceId]);

    return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { theme, isRightPanelCollapsed, rightPanel } = useUIStore();
    const { user, isLoading } = useAuthStore();
    const { fetchMenu } = useMenuStore();
    const { fetchWorkspaces, workspaces, isLoading: wsLoading, hasFetched: wsFetched } = useWorkspaceStore();
    const isDark = theme === 'dark';
    const pathname = usePathname();
    const router = useRouter();
    const isPublicPreview = pathname?.startsWith('/p/');
    const isAuthRoute = pathname === '/login';
    const isOnboarding = pathname === '/onboarding';
    const isMobile = useIsMobile();

    // Fetch workspaces and nav menu on mount
    useEffect(() => {
        if (user) {
            fetchWorkspaces();
            fetchMenu();
        }
    }, [user, fetchWorkspaces, fetchMenu]);

    useEffect(() => {
        if (!isLoading && !user && !isAuthRoute && !isPublicPreview && !isOnboarding) {
            router.push('/login');
        } else if (user && wsFetched && workspaces.length === 0 && !isOnboarding && !isPublicPreview) {
            router.push('/onboarding');
        }
    }, [user, isLoading, wsFetched, workspaces, isAuthRoute, isPublicPreview, isOnboarding, router]);

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

    if (isAuthRoute || isPublicPreview || isOnboarding) {
        return (
            <div className={cn(
                "flex h-screen w-full overflow-hidden",
                isDark ? "bg-[#0a0a0a] text-white" : "bg-[#f0f0f0] text-[#111]"
            )}>
                <DocumentTitleSetter />
                {children}
            </div>
        );
    }

    /* ─── MOBILE LAYOUT ─────────────────────────────────────────── */
    if (isMobile) {
        return (
            <div className={cn(
                "flex flex-col h-screen w-full overflow-hidden",
                isDark ? "bg-[#0a0a0a] text-white" : "bg-[#f0f0f0] text-[#111]"
            )}>
                {/* Top bar */}
                <MobileTopBar />

                {/* Main content — scrollable, padded bottom for bottom nav */}
                <main className={cn(
                    "flex-1 flex flex-col overflow-hidden",
                    isDark ? "bg-[#141414]" : "bg-white"
                )}>
                    <WorkspaceDataSync />
                    <DocumentTitleSetter />
                    {/* Inner scroll area with bottom padding for nav bar */}
                    <div className="flex-1 overflow-hidden flex flex-col pb-[68px]">
                        {children}
                    </div>
                </main>

                {/* Right panel as bottom drawer on mobile */}
                <MobileRightPanelDrawer />

                {/* Bottom navigation */}
                <MobileBottomNav />

                {/* Global Modals */}
                <CreateEntryModal />
                <CSVImportModal />
            </div>
        );
    }

    /* ─── DESKTOP LAYOUT ─────────────────────────────────────────── */
    return (
        <div className={cn(
            "flex h-screen w-full overflow-hidden p-2.5 gap-2.5",
            isDark ? "bg-[#0a0a0a] text-white" : "bg-[#f0f0f0] text-[#111]"
        )}>
            {/* LEFT — compact icon sidebar */}
            <LeftSystemMenu />

            {/* CENTER — main workspace */}
            <main className={cn(
                "flex-1 flex flex-col relative overflow-hidden rounded-2xl transition-all duration-300 min-w-0",
                isDark ? "bg-[#141414]" : "bg-white"
            )}>
                <WorkspaceDataSync />
                <DocumentTitleSetter />
                {children}
            </main>

            {/* RIGHT SIDEBAR UNIT — A unified rounded container */}
            <div className={cn(
                "flex shrink-0 transition-all duration-300 rounded-2xl overflow-hidden border",
                isDark ? "bg-[#0d0d0d] border-[#222]" : "bg-[#f5f5f5] border-[#e4e4e4]",
                (isRightPanelCollapsed || !rightPanel) && "w-auto"
            )}>
                {!isRightPanelCollapsed && <RightPanel />}
                <RightToolsMenu />
            </div>

            {/* Global Modals */}
            <CreateEntryModal />
            <CSVImportModal />
        </div>
    );
}
