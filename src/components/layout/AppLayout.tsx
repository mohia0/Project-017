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
import { useFormStore } from '@/store/useFormStore';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { useHookStore } from '@/store/useHookStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFileStore } from '@/store/useFileStore';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileNavBar, MobileRightPanelDrawer } from './MobileNav';

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
    const projects = useProjectStore(s => s.projects);
    
    useEffect(() => {
        if (activeWorkspaceId) {
            useProposalStore.getState().fetchProposals();
            useInvoiceStore.getState().fetchInvoices();
            useClientStore.getState().fetchClients();
            useTemplateStore.getState().fetchTemplates();
            useProjectStore.getState().fetchProjects();
            useFormStore.getState().fetchForms();
            useSchedulerStore.getState().fetchSchedulers();
            useHookStore.getState().fetchHooks();
            useFileStore.getState().fetchFiles();
            
            // Settings Preload
            const settingsStore = useSettingsStore.getState();
            settingsStore.fetchProfile();
            settingsStore.fetchStatuses(activeWorkspaceId);
            settingsStore.fetchBranding(activeWorkspaceId);
            settingsStore.fetchPayments(activeWorkspaceId);
            settingsStore.fetchDomains(activeWorkspaceId);
            settingsStore.fetchEmailConfig(activeWorkspaceId);
            settingsStore.fetchEmailTemplates(activeWorkspaceId);
            
            // Notifications
            useNotificationStore.getState().fetchNotifications();
            useNotificationStore.getState().subscribe();
            
            return () => {
                useNotificationStore.getState().unsubscribe();
            };
        }
    }, [activeWorkspaceId]);

    // ── Background preload: tasks / groups / items per project ──────────────
    useEffect(() => {
        if (!projects.length) return;
        
        const store = useProjectStore.getState();
        projects.forEach(p => {
            // Only fetch if we don't already have data cached for this project
            if (!store.tasksByProject[p.id])  store.fetchTasks(p.id);
            if (!store.groupsByProject[p.id]) store.fetchTaskGroups(p.id);
            if (!store.itemsByProject[p.id])  store.fetchProjectItems(p.id);
        });
    }, [projects]);

    // ── Background preload: Actual image files for browser cache ────────────
    const files = useFileStore(s => s.items);
    useEffect(() => {
        if (!files.length) return;
        
        // Filter for images and preload their URLs
        const images = files.filter(f => f.type === 'image' && (f.url || f.downloadUrl));
        
        images.forEach(img => {
            const src = img.url || img.downloadUrl;
            if (src) {
                const i = new Image();
                i.src = src;
            }
        });
    }, [files]);

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

    // Don't render until we know auth state, or if we are about to redirect
    const isRedirectingToLogin = !isLoading && !user && !isAuthRoute && !isPublicPreview && !isOnboarding;
    const isRedirectingToOnboarding = user && wsFetched && workspaces.length === 0 && !isOnboarding && !isPublicPreview;

    if ((isLoading && !isAuthRoute) || isRedirectingToLogin || isRedirectingToOnboarding) {
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
                {/* Main content — full height, bottom padding reserved for the floating nav bar */}
                <main className={cn(
                    "flex-1 flex flex-col overflow-hidden",
                    isDark ? "bg-[#141414]" : "bg-white"
                )}>
                    <WorkspaceDataSync />
                    <DocumentTitleSetter />
                    {/* Inner scroll area — padded so content isn't hidden behind floating nav */}
                    <div className="flex-1 overflow-hidden flex flex-col" style={{ paddingBottom: 'max(92px, calc(env(safe-area-inset-bottom) + 80px))' }}>
                        {children}
                    </div>
                </main>

                {/* Right panel as bottom sheet on mobile */}
                <MobileRightPanelDrawer />

                {/* Floating bottom nav bar (hamburger + create + bell) */}
                <MobileNavBar />

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
                !rightPanel && "w-auto"
            )}>
                <RightPanel />
                <RightToolsMenu />
            </div>

            {/* Global Modals */}
            <CreateEntryModal />
            <CSVImportModal />
            <PrivacyModeEffect />
        </div>
    );
}

function PrivacyModeEffect() {
    const isPrivacyMode = useUIStore(s => s.isPrivacyMode);

    useEffect(() => {
        if (isPrivacyMode) {
            document.body.classList.add('privacy-mode');
            
            // Smart blurring logic
            const blurNumbers = () => {
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
                let node;
                while(node = walker.nextNode()) {
                    const text = node.nodeValue || '';
                    // Match currency symbols or numbers with 3+ digits or decimals
                    const hasCurrencyValue = /[$€£¥]\s?\d+|[\d,]{3,}(\.\d+)?/.test(text);
                    
                    if (hasCurrencyValue && node.parentElement) {
                        // Avoid blurring parent if it's an input or already has a child with blur
                        if (['INPUT', 'TEXTAREA', 'SCRIPT', 'STYLE'].includes(node.parentElement.tagName)) continue;
                        node.parentElement.classList.add('privacy-blur');
                    }
                }
            };

            // Run once
            blurNumbers();
            
            // Re-run on DOM changes for dynamic content
            const observer = new MutationObserver(blurNumbers);
            observer.observe(document.body, { childList: true, subtree: true });
            
            return () => {
                observer.disconnect();
                document.body.classList.remove('privacy-mode');
                document.querySelectorAll('.privacy-blur').forEach(el => el.classList.remove('privacy-blur'));
            };
        } else {
            document.body.classList.remove('privacy-mode');
            document.querySelectorAll('.privacy-blur').forEach(el => el.classList.remove('privacy-blur'));
        }
    }, [isPrivacyMode]);

    return null;
}
