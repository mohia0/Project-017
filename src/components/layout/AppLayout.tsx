"use client";
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useUIStore } from '@/store/useUIStore';
import { FullScreenLoader } from '@/components/ui/AppLoader';
import { useAuthStore } from '@/store/useAuthStore';
import { useProposalStore } from '@/store/useProposalStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useClientStore } from '@/store/useClientStore';
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
import { useFaviconBadge } from '@/hooks/useFaviconBadge';

import LeftSystemMenu from './LeftSystemMenu';
import { MobileNavBar, MobileRightPanelDrawer } from './MobileNav';

const RightPanel = dynamic(() => import('./RightPanel'), { ssr: false });
const RightToolsMenu = dynamic(() => import('./RightToolsMenu'), { ssr: false });

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
    // ⚠️ Select ONLY the count (scalar) — selecting the full array causes a new
    // reference on every render, which makes the tasks-preload effect fire
    // endlessly and OOMs the dev server.
    const projectCount = useProjectStore(s => s.projects.length);
    
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
            useHookStore.getState().fetchHooks();
            
            return () => {
                useNotificationStore.getState().unsubscribe();
            };
        }
    }, [activeWorkspaceId]);

    // ── Background preload: tasks / groups / items per project ──────────────
    // Read projects via getState() inside the effect — avoids subscribing to
    // the array reference (which is always a new object and causes infinite loops).
    useEffect(() => {
        if (!projectCount) return;
        
        const store = useProjectStore.getState();
        store.projects.forEach(p => {
            // Only fetch if we don't already have data cached for this project
            if (!store.tasksByProject[p.id])  store.fetchTasks(p.id);
            if (!store.groupsByProject[p.id]) store.fetchTaskGroups(p.id);
            if (!store.itemsByProject[p.id])  store.fetchProjectItems(p.id);
        });
    }, [projectCount]);

    // ── Background preload: Actual image files for browser cache ────────────
    const fileCount = useFileStore(s => s.items.length);
    const avatarUrl = useSettingsStore(s => s.profile?.avatar_url);

    useEffect(() => {
        // Preload Account Avatar
        if (avatarUrl) {
            const img = new Image();
            img.src = avatarUrl;
        }

        const files = useFileStore.getState().items;
        if (!files.length) return;
        
        // Filter for images and preload their URLs
        const images = files.filter(f => f.type === 'image' && (f.url || f.downloadUrl));
        
        images.forEach(imgItem => {
            const src = imgItem.url || imgItem.downloadUrl;
            if (src) {
                const i = new Image();
                i.src = src;
            }
        });
    }, [fileCount, avatarUrl]);
}

// List pages handle their own inline skeleton states — no page-level loader needed.
function usePageDataLoading(_pathname: string): boolean {
    return false;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { theme, isRightPanelCollapsed, rightPanel, activeWorkspaceId, isCreateModalOpen, isImportModalOpen } = useUIStore();
    const { user } = useAuthStore();
    const { fetchMenu } = useMenuStore();
    const { fetchWorkspaces, workspaces, isLoading: wsLoading, hasFetched: wsFetched } = useWorkspaceStore();
    const isDark = theme === 'dark';
    const pathname = usePathname();
    const router = useRouter();
    const isPublicPreview = pathname?.startsWith('/p/');
    const isAuthRoute = pathname === '/login';
    const isOnboarding = pathname === '/onboarding';
    const isJoinRoute = pathname?.startsWith('/join/');
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
        if (user && wsFetched && workspaces.length === 0 && !isOnboarding && !isPublicPreview && !isJoinRoute) {
            router.push('/onboarding');
        }
    }, [user, wsFetched, workspaces, isPublicPreview, isOnboarding, isJoinRoute, router]);

    const isRedirectingToOnboarding = user && wsFetched && workspaces.length === 0 && !isOnboarding && !isPublicPreview && !isJoinRoute;
    const isProtectedRoute = !isAuthRoute && !isPublicPreview && !isOnboarding && !isJoinRoute;

    // Hold the loader until BOTH workspaces AND the current page's data are ready, 
    // AND at least 2 seconds have passed for the initial boot animation.
    const isInitialLoading = isProtectedRoute && (!wsFetched || isPageDataLoading || !minLoadingTimePassed);

    if (isInitialLoading || isRedirectingToOnboarding) {
        return <FullScreenLoader isDark={isDark} />;
    }

    if (isAuthRoute || isPublicPreview || isOnboarding || isJoinRoute) {
        return (
            <div className={cn(
                "flex h-screen w-full overflow-hidden",
                isDark ? "bg-[#000000] text-white" : "bg-[#e2e2e2] text-[#111]"
            )}>
                <DocumentTitleSetter />
                <PrivacyModeEffect />
                <FaviconBadgeEffect />
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
                    <FaviconBadgeEffect />
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
                {isCreateModalOpen && <CreateEntryModal />}
                {isImportModalOpen && <CSVImportModal />}
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
                <FaviconBadgeEffect />
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
            {isCreateModalOpen && <CreateEntryModal />}
            {isImportModalOpen && <CSVImportModal />}
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
    const isJoinRoute = pathname?.startsWith('/join/');

    useEffect(() => {
        const shouldApply = isPrivacyMode && !isPublicPreview && !isAuthRoute && !isOnboarding && !isJoinRoute;
        if (shouldApply) {
            document.documentElement.classList.add('privacy-mode');
        } else {
            document.documentElement.classList.remove('privacy-mode');
        }
    }, [isPrivacyMode, isPublicPreview, isAuthRoute, isOnboarding, isJoinRoute]);

    return null;
}

/** Renders an unread-count badge on the browser favicon using the accent color.
 *  Uses the workspace custom favicon if one is set, otherwise falls back to
 *  the default aroooxa favicon — preventing the custom favicon from being
 *  overwritten when the badge clears. */
function FaviconBadgeEffect() {
    const notifications = useNotificationStore(s => s.notifications);
    const branding = useSettingsStore(s => s.branding);
    const pathname = usePathname();
    
    const isPublicPreview = pathname?.startsWith('/p/');
    const isAuthRoute = pathname === '/login';
    const isOnboarding = pathname === '/onboarding';
    const isJoinRoute = pathname?.startsWith('/join/');
    
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const faviconSrc = branding?.favicon_url || '/favicon.svg?v=aroooxa';

    if (isPublicPreview || isAuthRoute || isOnboarding || isJoinRoute) {
        return null;
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useFaviconBadge(unreadCount, faviconSrc, pathname);
    return null;
}
