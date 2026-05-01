"use client";
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useUIStore } from '@/store/useUIStore';
import { FullScreenLoader } from '@/components/ui/AppLoader';
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

import LeftSystemMenu from './LeftSystemMenu';
import RightPanel from './RightPanel';
import RightToolsMenu from './RightToolsMenu';
import { MobileNavBar, MobileRightPanelDrawer } from './MobileNav';

// Lazy-load heavy modals
const CreateEntryModal = dynamic(() => import('@/components/modals/CreateEntryModal'), { ssr: false });
const CSVImportModal   = dynamic(() => import('@/components/modals/CSVImportModal'),   { ssr: false });

function DocumentTitleSetter() {
    const pathname = usePathname();
    const activeWorkspaceId = useUIStore(s => s.activeWorkspaceId);
    const { workspaces, hasFetched } = useWorkspaceStore();
    const { navItems } = useMenuStore();
    
    useEffect(() => {
        // Do not touch document title on public previews, Next.js metadata handles it correctly
        if (pathname?.startsWith('/p/')) return;
        
        // Wait until workspaces finish fetching
        if (!hasFetched) return;

        const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
        const workspaceName = activeWorkspace?.name || 'AROOOXA';
        
        const path = pathname || '/';
        let pageTitle = '';

        // Try to find the title in navItems first
        const matchedItem = navItems.find(item => 
            path === item.href || (item.href !== '/' && path.startsWith(item.href))
        );

        if (matchedItem) {
            pageTitle = matchedItem.label;
            // Handle sub-pages (e.g., /proposals/123)
            if (path !== matchedItem.href && path.startsWith(matchedItem.href + '/')) {
                pageTitle += ' Detail';
            }
        } else if (path === '/') {
            pageTitle = 'Dashboard';
        } else if (path === '/onboarding') {
            pageTitle = 'Onboarding';
        } else if (path === '/login') {
            pageTitle = 'Login';
        } else {
            const segment = path.split('/').filter(Boolean).pop() || '';
            pageTitle = segment.charAt(0).toUpperCase() + segment.slice(1);
        }

        document.title = `${workspaceName} - ${pageTitle}`;
    }, [pathname, activeWorkspaceId, workspaces, hasFetched]);

    return null;
}

function useWorkspaceDataSync() {
    const activeWorkspaceId = useUIStore(s => s.activeWorkspaceId);
    const projects = useProjectStore(s => s.projects);
    
    useEffect(() => {
        if (activeWorkspaceId) {
            // Settings Preload (Global features)
            const settingsStore = useSettingsStore.getState();
            settingsStore.fetchStatuses(activeWorkspaceId);
            settingsStore.fetchBranding(activeWorkspaceId);
            
            // Notifications (Global icon)
            useNotificationStore.getState().fetchNotifications();
            useNotificationStore.getState().subscribe();

            // Aggressive Background Prefetching (Perceived Performance Improvement)
            // This ensures data is ready in Zustand before the user navigates to the page
            useInvoiceStore.getState().fetchInvoices();
            useProposalStore.getState().fetchProposals();
            useClientStore.getState().fetchClients();
            useFormStore.getState().fetchForms();
            useSchedulerStore.getState().fetchSchedulers();
            
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
    const { profile } = useSettingsStore();

    useEffect(() => {
        // Preload Account Avatar
        if (profile?.avatar_url) {
            const img = new Image();
            img.src = profile.avatar_url;
        }

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
    }, [files, profile?.avatar_url]);
}

/** Map the current pathname to a store's isLoading flag so we can hold the
 *  full-screen loader until the current page's data is also ready. */
function usePageDataLoading(pathname: string): boolean {
    const invoiceLoading   = useInvoiceStore(s => s.isLoading);
    const proposalLoading  = useProposalStore(s => s.isLoading);
    const clientLoading    = useClientStore(s => s.isLoading);
    const formLoading      = useFormStore(s => s.isLoading);
    const schedulerLoading = useSchedulerStore(s => s.isLoading);
    const projectLoading   = useProjectStore(s => s.isLoading);

    if (pathname.startsWith('/invoices'))  return invoiceLoading;
    if (pathname.startsWith('/proposals')) return proposalLoading;
    if (pathname.startsWith('/clients'))   return clientLoading;
    if (pathname.startsWith('/forms'))     return formLoading;
    if (pathname.startsWith('/schedulers'))return schedulerLoading;
    if (pathname.startsWith('/projects'))  return projectLoading;
    return false; // dashboard, settings, etc — no page-level loader needed
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { theme, isRightPanelCollapsed, rightPanel, activeWorkspaceId } = useUIStore();
    const { user } = useAuthStore();
    const { fetchMenu } = useMenuStore();
    const { fetchWorkspaces, workspaces, isLoading: wsLoading, hasFetched: wsFetched } = useWorkspaceStore();
    const isDark = theme === 'dark';
    const pathname = usePathname();
    const router = useRouter();
    const isPublicPreview = pathname?.startsWith('/p/');
    const isAuthRoute = pathname === '/login';
    const isOnboarding = pathname === '/onboarding';
    const isMobile = useIsMobile();

    const [minLoadingTimePassed, setMinLoadingTimePassed] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setMinLoadingTimePassed(true);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    // Watch if the current page's data store is still loading
    const isPageDataLoading = usePageDataLoading(pathname || '/');

    // Trigger aggressive background fetches immediately regardless of loader visibility
    useWorkspaceDataSync();

    // Fetch workspaces on mount
    useEffect(() => {
        if (user) {
            fetchWorkspaces();
        }
    }, [user, fetchWorkspaces]);

    // Fetch nav menu whenever active workspace changes
    useEffect(() => {
        if (user && activeWorkspaceId) {
            fetchMenu();
        }
    }, [user, activeWorkspaceId, fetchMenu]);

    useEffect(() => {
        if (user && wsFetched && workspaces.length === 0 && !isOnboarding && !isPublicPreview) {
            router.push('/onboarding');
        }
    }, [user, wsFetched, workspaces, isPublicPreview, isOnboarding, router]);

    const isRedirectingToOnboarding = user && wsFetched && workspaces.length === 0 && !isOnboarding && !isPublicPreview;
    const isProtectedRoute = !isAuthRoute && !isPublicPreview && !isOnboarding;

    // Hold the loader until BOTH workspaces AND the current page's data are ready, 
    // AND at least 2 seconds have passed for the initial boot animation.
    const isInitialLoading = isProtectedRoute && (!wsFetched || isPageDataLoading || !minLoadingTimePassed);

    if (isInitialLoading || isRedirectingToOnboarding) {
        return <FullScreenLoader isDark={isDark} />;
    }

    if (isAuthRoute || isPublicPreview || isOnboarding) {
        return (
            <div className={cn(
                "flex h-screen w-full overflow-hidden",
                isDark ? "bg-[#000000] text-white" : "bg-[#e2e2e2] text-[#111]"
            )}>
                <DocumentTitleSetter />
                <PrivacyModeEffect />
                <ConversionRatesInitEffect />
                {children}
            </div>
        );
    }

    /* ─── MOBILE LAYOUT ─────────────────────────────────────────── */
    if (isMobile) {
        return (
            <div className={cn(
                "flex flex-col h-screen w-full overflow-hidden",
                isDark ? "bg-[#000000] text-white" : "bg-[#e2e2e2] text-[#111]"
            )}>
                <main className={cn(
                    "flex-1 flex flex-col overflow-hidden",
                    isDark ? "bg-[#141414]" : "bg-white"
                )}>
                    <DocumentTitleSetter />
                    <PrivacyModeEffect />
                    <ConversionRatesInitEffect />
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
            isDark ? "bg-[#000000] text-white" : "bg-[#e2e2e2] text-[#111]"
        )}>
            {/* LEFT — compact icon sidebar */}
            <LeftSystemMenu />

            {/* CENTER — main workspace */}
            <main className={cn(
                "flex-1 flex flex-col relative overflow-hidden rounded-2xl transition-all duration-300 min-w-0 border shadow-2xl",
                isDark ? "bg-[#141414] border-white/5 shadow-black/40" : "bg-white border-black/[0.03] shadow-black/[0.04]"
            )}>
                <DocumentTitleSetter />
                {children}
            </main>

            {/* RIGHT SIDEBAR UNIT — A unified rounded container */}
            <div className={cn(
                "flex shrink-0 transition-all duration-300 rounded-2xl overflow-hidden border shadow-2xl z-50",
                isDark ? "bg-[#0d0d0d] border-white/5 shadow-black/40" : "bg-[#f5f5f5] border-black/[0.03] shadow-black/[0.04]",
                !rightPanel && "w-auto"
            )}>
                <RightPanel />
                <RightToolsMenu />
            </div>

            {/* Global Modals */}
            <CreateEntryModal />
            <CSVImportModal />
            <PrivacyModeEffect />
            <ConversionRatesInitEffect />
        </div>
    );
}

/* Restore live rates for persisted conversionCurrency on startup */
function ConversionRatesInitEffect() {
    const conversionCurrency = useUIStore(s => s.conversionCurrency);
    const fetchConversionRates = useUIStore(s => s.fetchConversionRates);
    const hasFetched = React.useRef(false);

    useEffect(() => {
        if (!hasFetched.current && conversionCurrency) {
            hasFetched.current = true;
            fetchConversionRates(conversionCurrency);
        }
    }, [conversionCurrency, fetchConversionRates]);

    return null;
}
function PrivacyModeEffect() {
    const isPrivacyMode = useUIStore(s => s.isPrivacyMode);
    const pathname = usePathname();
    const isPublicPreview = pathname?.startsWith('/p/');
    const isAuthRoute = pathname === '/login';
    const isOnboarding = pathname === '/onboarding';

    useEffect(() => {
        const shouldApply = isPrivacyMode && !isPublicPreview && !isAuthRoute && !isOnboarding;
        if (shouldApply) {
            document.documentElement.classList.add('privacy-mode');
        } else {
            document.documentElement.classList.remove('privacy-mode');
        }
    }, [isPrivacyMode, isPublicPreview, isAuthRoute, isOnboarding]);

    return null;
}
