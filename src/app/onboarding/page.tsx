"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { cn } from '@/lib/utils';
import { Loader2, ArrowRight, Building, Sparkles, AlertCircle } from 'lucide-react';
import { FullScreenLoader, AppLoader } from '@/components/ui/AppLoader';

export default function OnboardingPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuthStore();
    const { theme } = useUIStore();
    const { createWorkspace, workspaces, isLoading: wsLoading, hasFetched: wsFetched } = useWorkspaceStore();
    const isDark = theme === 'dark';
    
    const [workspaceName, setWorkspaceName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

    useEffect(() => {
        // Only redirect if auth is loaded, user is logged in, and workspaces have been fetched
        if (!authLoading && !user) {
            router.push('/login');
        } else if (!authLoading && wsFetched && workspaces.length > 0) {
            router.push('/dashboard');
        }
    }, [user, authLoading, workspaces, wsFetched, router]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!workspaceName.trim()) return;
        
        setIsCreating(true);
        try {
            const ws = await createWorkspace(workspaceName.trim());
            if (ws) {
                router.push('/dashboard');
            }
        } catch (err) {
            console.error('Failed to create workspace:', err);
        } finally {
            setIsCreating(false);
        }
    };

    if (authLoading || !wsFetched || (user && workspaces.length > 0)) {
        return <FullScreenLoader isDark={isDark} />;
    }

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
                    <div className="mb-14 flex items-center justify-center">
                        <img 
                            src="/logo.svg" 
                            alt="CRM 17" 
                            className={cn(
                                "h-11 w-auto transform hover:rotate-3 transition-transform duration-500",
                                isDark && "invert brightness-[100]"
                            )}
                        />
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
                            Every great operation needs a home. Give your workspace a name and let's get to work.
                        </p>
                    </div>

                    <form onSubmit={handleCreate} className="flex flex-col gap-5">
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
                                onChange={e => setWorkspaceName(e.target.value)}
                                className={cn(
                                    "w-full h-14 pl-12 pr-4 rounded-2xl text-[15px] font-semibold transition-all focus:outline-none focus:ring-2",
                                    isDark 
                                        ? "bg-[#141414] border border-white/10 hover:border-white/20 focus:border-white/30 focus:ring-white/10 placeholder:text-white/20" 
                                        : "bg-white border border-black/10 hover:border-black/20 focus:border-black/30 focus:ring-black/5 placeholder:text-black/30 shadow-sm"
                                )}
                                placeholder="e.g. Acme Studio"
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={isCreating || !workspaceName.trim()}
                            className={cn(
                                "w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-bold text-[15px] transition-all hover:-translate-y-[1px] active:translate-y-[1px] disabled:opacity-50 disabled:hover:translate-y-0 disabled:grayscale",
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
                    </form>

                    <div className="mt-12 flex flex-col items-center gap-6 opacity-40">
                         <div className={cn("w-full h-px", isDark ? "bg-white/10" : "bg-black/10")} />
                         <p className={cn("text-[11px] font-medium", isDark ? "text-white" : "text-black")}>
                             You can change this name anytime in settings.
                         </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
