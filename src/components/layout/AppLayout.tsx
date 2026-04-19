"use client";
import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
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

// Lazy-load heavy layout panels — they will be compiled once on first render
// instead of eagerly on every route, dramatically reducing initial compile time.
const LeftSystemMenu   = dynamic(() => import('./LeftSystemMenu'),   { ssr: false });
const RightPanel       = dynamic(() => import('./RightPanel'),       { ssr: false });
const RightToolsMenu   = dynamic(() => import('./RightToolsMenu'),   { ssr: false });
const MobileNavBar          = dynamic(() => import('./MobileNav').then(m => ({ default: m.MobileNavBar })),          { ssr: false });
const MobileRightPanelDrawer = dynamic(() => import('./MobileNav').then(m => ({ default: m.MobileRightPanelDrawer })), { ssr: false });
const CreateEntryModal = dynamic(() => import('@/components/modals/CreateEntryModal'), { ssr: false });
const CSVImportModal   = dynamic(() => import('@/components/modals/CSVImportModal'),   { ssr: false });

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
                isDark ? "bg-[#000000]" : "bg-[#e2e2e2]"
            )}>
                <div className="w-8 h-8 rounded-full border-2 border-[#4dbf39] border-t-transparent animate-spin" />
            </div>
        );
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
                    <WorkspaceDataSync />
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
                <WorkspaceDataSync />
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
