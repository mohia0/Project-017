"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { cn } from '@/lib/utils';
import { ArrowRight, Building, Sparkles, AlertCircle, Globe, CheckCircle2, XCircle, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { FullScreenLoader, AppLoader } from '@/components/ui/AppLoader';
import ImageUploadModal from '@/components/modals/ImageUploadModal';
import { AroooXaLogo } from '@/components/ui/AroooXaLogo';

interface PortalBranding {
    name: string;
    logo_url: string | null;
}

function usePortalBranding() {
    const [branding, setBranding] = useState<PortalBranding | null>(null);
    useEffect(() => {
        fetch('/api/workspace/branding')
            .then(r => r.json())
            .then(({ branding, isCustomDomain }) => {
                if (isCustomDomain && branding) setBranding(branding);
            })
            .catch(() => {});
    }, []);
    return branding;
}

export default function OnboardingPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuthStore();
    const { theme } = useUIStore();
    const { createWorkspace, fetchWorkspaces, workspaces, isLoading: wsLoading, hasFetched: wsFetched } = useWorkspaceStore();
    const isDark = theme === 'dark';
    const portalBranding = usePortalBranding();
    
    const [workspaceName, setWorkspaceName] = useState('');
    const [slug, setSlug] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    
    // Slug validation state
    const [isCheckingSlug, setIsCheckingSlug] = useState(false);
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
    const [slugError, setSlugError] = useState<string | null>(null);
    const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Image upload state
    const [logoUrl, setLogoUrl] = useState('');
    const [imgError, setImgError] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

    useEffect(() => {
        if (!wsFetched && user && !wsLoading) {
            fetchWorkspaces();
        }
    }, [wsFetched, user, wsLoading, fetchWorkspaces]);

    useEffect(() => {
        // Only redirect if auth is loaded, user is logged in, and workspaces have been fetched
        if (!authLoading && !user) {
            router.push('/login');
        } else if (!authLoading && wsFetched && workspaces.length > 0) {
            // Check if user intentionally navigated to create a new workspace
            const isNew = new URLSearchParams(window.location.search).get('new') === 'true';
            if (!isNew) {
                router.push('/dashboard');
            }
        }
    }, [user, authLoading, workspaces, wsFetched, router]);

    // Handle slug formatting and validation
    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        setSlug(val);
        
        setSlugAvailable(null);
        setSlugError(null);
        
        if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
        
        if (val.length < 3) {
            if (val.length > 0) setSlugError('URL must be at least 3 characters');
            return;
        }

        setIsCheckingSlug(true);
        checkTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/workspace/check-slug?slug=${val}`);
                const data = await res.json();
                
                if (res.ok && data.available) {
                    setSlugAvailable(true);
                    setSlugError(null);
                } else {
                    setSlugAvailable(false);
                    setSlugError(data.error || 'This URL is already taken');
                }
            } catch (err) {
                setSlugError('Failed to verify availability');
            } finally {
                setIsCheckingSlug(false);
            }
        }, 600);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!workspaceName.trim() || !slug.trim() || slugAvailable === false || isCheckingSlug) return;
        
        setIsCreating(true);
        try {
            const ws = await createWorkspace(workspaceName.trim(), slug.trim(), logoUrl);
            if (ws) {
                router.push('/dashboard');
            }
        } catch (err) {
            console.error('Failed to create workspace:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const isNew = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('new') === 'true' : false;

    if (authLoading || !wsFetched || (user && workspaces.length > 0 && !isNew)) {
        return <FullScreenLoader isDark={isDark} />;
    }

    const domainSuffix = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'aroooxa.com';

    return (
        <div className="flex-1 flex relative w-full h-screen overflow-hidden">
            
            {/* Background design accents mirroring Login page */}
            <div className={cn(
                "absolute top-0 right-0 w-[50vw] h-full transition-colors duration-700 pointer-events-none",
                isDark ? "bg-gradient-to-l from-white/[0.02] to-transparent" : "bg-gradient-to-l from-black/[0.02] to-transparent"
            )} />
            
            <div className="flex-1 flex flex-col items-center justify-center p-6 z-10">
                <div className="w-full max-w-[400px] flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    
                    {/* Logo */}
                    <div className="mb-10 flex items-center justify-center">
                        {portalBranding?.logo_url ? (
                            <img
                                src={portalBranding.logo_url}
                                alt={portalBranding.name}
                                className="h-11 w-auto object-contain mx-auto"
                            />
                        ) : (
                            <AroooXaLogo
                                height={30}
                                color={isDark ? 'white' : '#1a1a1a'}
                                wave={true}
                                className="mx-auto"
                            />
                        )}
                    </div>

                    <div className="w-full flex flex-col items-center text-center mb-12">
                        <div className={cn(
                            "mb-5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2",
                            isDark ? "bg-white/5 text-white/40" : "bg-black/5 text-black/40"
                        )}>
                            <Sparkles size={12} className="text-[#4dbf39]" />
                            Welcome, {firstName}
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight mb-4 leading-tight">
                            Build your<br />headquarters.
                        </h1>
                        <p className={cn(
                            "text-[16px] font-medium max-w-[340px] leading-relaxed transition-colors",
                            isDark ? "text-white/30" : "text-black/30"
                        )}>
                            Every great operation needs a home. Give your workspace a name and claim your portal URL.
                        </p>
                    </div>

                    <form onSubmit={handleCreate} className="flex flex-col gap-6">
                        {/* Workspace Logo Upload */}
                        <div 
                            onClick={() => setIsModalOpen(true)}
                            className={cn(
                                "mx-auto w-24 h-24 rounded-[1.5rem] border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden relative group",
                                logoUrl && !imgError && isDark ? "border-transparent bg-white/5" :
                                logoUrl && !imgError && !isDark ? "border-transparent bg-black/5" :
                                isDark 
                                    ? "border-white/10 hover:border-white/30 bg-[#141414]" 
                                    : "border-black/10 hover:border-black/30 bg-white shadow-sm"
                            )}
                        >
                            {logoUrl && !imgError ? (
                                <>
                                    <img 
                                        src={logoUrl} 
                                        className="w-full h-full object-cover" 
                                        onError={() => setImgError(true)}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                        <Upload size={16} className="text-white" />
                                    </div>
                                </>
                            ) : (
                                <div className="relative z-10 flex flex-col items-center gap-1.5 opacity-40 group-hover:opacity-70 transition-opacity">
                                    <Upload size={20} />
                                    <span className="text-[10px] font-semibold text-center leading-tight">Upload<br/>Logo</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-5">
                            {/* Workspace Name */}
                            <div className="flex flex-col relative group">
                                <div className={cn(
                                    "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                                    isDark ? "text-white/20" : "text-black/20"
                                )}>
                                    <Building size={18} />
                                </div>
                                <input 
                                    type="text"
                                    required
                                    value={workspaceName}
                                onChange={e => {
                                    setWorkspaceName(e.target.value);
                                    if (!slug && e.target.value.length > 0) {
                                        // Auto-fill slug suggestion
                                        const suggested = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
                                        setSlug(suggested);
                                        // Trigger validation for suggestion
                                        handleSlugChange({ target: { value: suggested } } as any);
                                    }
                                }}
                                className={cn(
                                    "w-full h-14 pl-12 pr-4 rounded-2xl text-[15px] font-semibold transition-all focus:outline-none focus:ring-2",
                                    isDark 
                                        ? "bg-[#141414] border border-white/10 hover:border-white/20 focus:border-white/30 focus:ring-white/10 placeholder:text-white/20" 
                                        : "bg-white border border-black/10 hover:border-black/20 focus:border-black/30 focus:ring-black/5 placeholder:text-black/30 shadow-sm"
                                )}
                                placeholder="Workspace Name (e.g. Acme Studio)"
                            />
                        </div>

                        {/* Domain Setup */}
                        <div className="flex flex-col relative group">
                            <div className={cn(
                                "absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10",
                                isDark ? "text-white/20" : "text-black/20"
                            )}>
                                <Globe size={18} />
                            </div>
                            <div className="relative flex items-center w-full">
                                <input 
                                    type="text"
                                    required
                                    value={slug}
                                    onChange={handleSlugChange}
                                    className={cn(
                                        "w-full h-14 pl-12 pr-4 rounded-2xl text-[15px] font-semibold transition-all focus:outline-none focus:ring-2 relative z-0 text-right pr-32",
                                        isDark 
                                            ? "bg-[#141414] border border-white/10 hover:border-white/20 focus:border-white/30 focus:ring-white/10 placeholder:text-white/20" 
                                            : "bg-white border border-black/10 hover:border-black/20 focus:border-black/30 focus:ring-black/5 placeholder:text-black/30 shadow-sm",
                                        slugError ? "!border-red-500/50 !focus:ring-red-500/20" : "",
                                        slugAvailable ? "!border-green-500/50" : ""
                                    )}
                                    placeholder="your-url"
                                />
                                <div className={cn(
                                    "absolute right-4 top-1/2 -translate-y-1/2 font-medium text-sm pointer-events-none transition-colors",
                                    isDark ? "text-white/40" : "text-black/40"
                                )}>
                                    .{domainSuffix}
                                </div>
                            </div>
                            
                            {/* Slug status indicator */}
                            <div className="absolute right-[-32px] top-1/2 -translate-y-1/2 flex items-center justify-center">
                                {isCheckingSlug && <Loader2 size={16} className="animate-spin text-blue-500" />}
                                {!isCheckingSlug && slugAvailable === true && <CheckCircle2 size={16} className="text-green-500" />}
                                {!isCheckingSlug && (slugAvailable === false || slugError) && slug.length > 0 && <XCircle size={16} className="text-red-500" />}
                            </div>

                            {/* Error text below */}
                            {slugError && (
                                <div className="text-red-500 text-xs font-medium pl-4 mt-2 animate-in slide-in-from-top-1">
                                    {slugError}
                                </div>
                            )}
                        </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={isCreating || !workspaceName.trim() || !slug.trim() || !slugAvailable || isCheckingSlug}
                            className={cn(
                                "w-full h-14 mt-2 rounded-2xl flex items-center justify-center gap-3 font-bold text-[15px] transition-all hover:-translate-y-[1px] active:translate-y-[1px] disabled:opacity-50 disabled:hover:translate-y-0 disabled:grayscale",
                                isDark 
                                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]" 
                                    : "bg-black text-white shadow-xl shadow-black/15 hover:shadow-black/25"
                            )}
                        >
                            {isCreating ? (
                                <AppLoader size="xs" color="currentColor" />
                            ) : (
                                <>
                                    Launch Workspace
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>

                        {/* Error Message */}
                        {useWorkspaceStore.getState().error && (
                            <div className={cn(
                                "p-4 rounded-xl text-[12px] font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
                                isDark ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-red-50 text-red-600 border border-red-100"
                            )}>
                                <AlertCircle size={14} />
                                <span className="flex-1">{useWorkspaceStore.getState().error}</span>
                            </div>
                        )}
                        
                        {isNew && (
                            <div className="mt-4 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => router.push('/dashboard')}
                                    className={cn(
                                        "text-xs font-semibold px-4 py-2 rounded-full transition-colors",
                                        isDark ? "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white" : "bg-black/5 hover:bg-black/10 text-black/50 hover:text-black"
                                    )}
                                >
                                    Cancel & Return
                                </button>
                            </div>
                        )}
                    </form>

                    <ImageUploadModal 
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onUpload={(url) => {
                            setLogoUrl(url);
                            setImgError(false);
                            setIsModalOpen(false);
                        }}
                        title="Workspace Logo"
                    />

                    <div className="mt-12 flex flex-col items-center gap-6 opacity-40">
                         <div className={cn("w-full h-px", isDark ? "bg-white/10" : "bg-black/10")} />
                         <p className={cn("text-[11px] font-medium", isDark ? "text-white" : "text-black")}>
                             You can change your name and portal URL anytime in settings.
                         </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
