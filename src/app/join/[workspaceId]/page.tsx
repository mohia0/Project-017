"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';
import { ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AppLoader } from '@/components/ui/AppLoader';
import { AroooXaLogo } from '@/components/ui/AroooXaLogo';
import { AuthDotPanel } from '@/components/ui/DotPattern';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

interface WorkspaceBranding {
    name: string;
    logo_url: string | null;
    primary_color: string | null;
    favicon_url?: string | null;
}

// Detect the magic link type from the URL hash (set by Supabase after redirect)
function getMagicLinkType(): string | null {
    if (typeof window === 'undefined') return null;
    
    const hash = window.location.hash.replace('#', '');
    const params = new URLSearchParams(hash);
    const type = params.get('type'); // 'invite' | 'magiclink' | 'recovery' | null
    
    // Store it in sessionStorage so we remember they came from an invite even if Supabase clears the hash
    if (type) {
        sessionStorage.setItem('join_link_type', type);
        return type;
    }
    
    return sessionStorage.getItem('join_link_type');
}

// Check if user has a usable password
function isNewInvitedUser(session: any): boolean {
    // If the link type in storage is 'invite', they are a new user who needs a password
    if (typeof window !== 'undefined' && sessionStorage.getItem('join_link_type') === 'invite') {
        return true;
    }
    
    const identities = session?.user?.identities || [];
    // Fallback: If no identities exist
    return identities.length === 0;
}

function JoinForm({ workspaceId }: { workspaceId: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const [branding, setBranding] = useState<WorkspaceBranding | null>(null);
    const [email] = useState(searchParams?.get('email') || '');

    // UI state machine: 'loading' | 'set-password' | 'auto-accepting' | 'success' | 'already-member' | 'error'
    const [stage, setStage] = useState<'loading' | 'set-password' | 'auto-accepting' | 'success' | 'already-member' | 'error'>('loading');
    const [error, setError] = useState('');

    // Password-setup form fields (only shown for new users via invite link)
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    // Fetch workspace branding
    useEffect(() => {
        fetch(`/api/workspace/branding?workspaceId=${workspaceId}`)
            .then(r => r.json())
            .then(({ branding }) => {
                if (branding) {
                    setBranding(branding);
                    if (branding.favicon_url) {
                        const links = document.querySelectorAll("link[rel~='icon']");
                        links.forEach(l => l.remove());
                        const link = document.createElement('link');
                        link.rel = 'icon';
                        link.href = branding.favicon_url;
                        document.head.appendChild(link);
                    }
                }
            })
            .catch(() => {});
    }, []);

    // Accept the authenticated user into this workspace
    const acceptIntoWorkspace = async (userId: string, userEmail: string) => {
        setStage('auto-accepting');
        try {
            // Check if already a confirmed member of THIS workspace
            const { data: existing } = await supabase
                .from('workspace_members')
                .select('user_id')
                .eq('workspace_id', workspaceId)
                .eq('invited_email', userEmail)
                .not('user_id', 'is', null)
                .maybeSingle();

            if (existing?.user_id) {
                setStage('already-member');
                return;
            }

            // Upsert the member row to confirm acceptance
            await supabase.from('workspace_members').upsert({
                workspace_id: workspaceId,
                user_id: userId,
                invited_email: userEmail,
            }, { onConflict: 'workspace_id,user_id' });

            // Fire notification to workspace owner
            await fetch('/api/accept-invitation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    user_id: userId,
                    invited_email: userEmail,
                    display_name: userEmail,
                }),
            });

            // Refresh workspaces before navigating so AppLayout knows we have one now!
            await useWorkspaceStore.getState().fetchWorkspaces();

            setStage('success');
            setTimeout(() => router.push('/'), 1800);
        } catch (err: any) {
            setError(err.message || 'Failed to accept invitation.');
            setStage('error');
        }
    };

    // Listen for Supabase auth state — fires when magic link auto-authenticates the user
    useEffect(() => {
        let handled = false;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user && !handled) {
                handled = true;
                const user = session.user;
                const linkType = getMagicLinkType();

                if (linkType === 'invite') {
                    // New user created via invite — they need to set a password before proceeding
                    setStage('set-password');
                } else {
                    // magiclink or unknown type — check if the user is already an established user
                    if (!isNewInvitedUser(session)) {
                        // Established user — auto-accept into workspace
                        await acceptIntoWorkspace(user.id, user.email || email);
                    } else {
                        // No password yet = new invited user, show password setup
                        setStage('set-password');
                    }
                }
            }
        });

        // Also check if already signed in (e.g. page refresh after magic link auth)
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (handled) return; // SIGNED_IN already fired above, ignore

            if (session?.user) {
                handled = true;
                const linkType = getMagicLinkType();
                if (linkType === 'invite') {
                    setStage('set-password');
                } else {
                    await acceptIntoWorkspace(session.user.id, session.user.email || email);
                }
                return;
            }

            // No session. Check if there is a hash token in the URL.
            // If yes, Supabase is still processing it — SIGNED_IN will fire soon. Stay in 'loading'.
            // If no hash at all, nothing will ever fire — show error immediately.
            const hasToken = typeof window !== 'undefined' && window.location.hash.includes('access_token');
            if (!hasToken) {
                setStage('error');
                setError('Invalid or expired invitation link. Please ask the workspace owner to resend the invitation.');
            }
            // else: stay loading, wait for onAuthStateChange
        });

        return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle password setup for new users (type=invite)
    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

        setSavingPassword(true);
        try {
            // Get the current access token to authenticate the API call
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error('No active session. Please try the invitation link again.');

            // Use server-side admin API to set password — bypasses Supabase's
            // client-side "reauthentication required" restriction for invite sessions
            const res = await fetch('/api/set-invite-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: session.access_token, password }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to set password.');

            sessionStorage.removeItem('join_link_type');

            // Accept the user into the workspace now that they have a proper password
            if (session.user) {
                await acceptIntoWorkspace(session.user.id, session.user.email || email);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to set password.');
            setSavingPassword(false);
        }
    };

    const accentColor = branding?.primary_color || '#10b981';

    return (
        <div className="flex-1 flex relative w-full min-h-screen overflow-hidden">
            {/* Left decorative panel — dot pattern + glow */}
            <div className="absolute top-0 left-0 w-[45%] h-full pointer-events-none">
                <AuthDotPanel isDark={isDark} />
            </div>

            {/* Background accent */}
            <div className={cn(
                "absolute top-0 right-0 w-[50vw] h-full pointer-events-none transition-colors duration-700",
                isDark ? "bg-gradient-to-l from-white/[0.02] to-transparent" : "bg-gradient-to-l from-black/[0.02] to-transparent"
            )} />

            <div className="flex-1 flex flex-col items-center justify-center p-6 z-10">
                <div className="w-full max-w-[360px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">

                    {/* Logo */}
                    <div className="mb-10 flex items-center justify-center">
                        {branding?.logo_url ? (
                            <img src={branding.logo_url} alt={branding.name} className="h-14 w-auto object-contain mx-auto" />
                        ) : (
                            <AroooXaLogo height={40} color={isDark ? 'white' : '#1a1a1a'} wave={true} className="mx-auto" />
                        )}
                    </div>

                    {/* Heading */}
                    <div className="w-full flex flex-col mb-8 text-center">
                        <h1 className="text-3xl font-bold tracking-tight mb-2.5">
                            Join {branding?.name || 'the workspace'}.
                        </h1>
                        <p className={cn("text-[15px] font-medium transition-colors", isDark ? "text-white/50" : "text-black/50")}>
                            {stage === 'set-password' ? 'Set a password to secure your account.' : 'Verifying your invitation…'}
                        </p>
                    </div>

                    {/* ── LOADING ── */}
                    {stage === 'loading' && (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <Loader2 size={28} className="animate-spin opacity-40" />
                            <p className={cn("text-sm font-medium", isDark ? "text-white/40" : "text-black/40")}>
                                Verifying your invitation…
                            </p>
                        </div>
                    )}

                    {/* ── AUTO-ACCEPTING ── */}
                    {stage === 'auto-accepting' && (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <Loader2 size={28} className="animate-spin opacity-40" />
                            <p className={cn("text-sm font-medium", isDark ? "text-white/40" : "text-black/40")}>
                                Accepting your invitation…
                            </p>
                        </div>
                    )}

                    {/* ── SUCCESS ── */}
                    {stage === 'success' && (
                        <div className={cn(
                            "p-4 rounded-xl text-[13px] font-semibold flex items-start gap-3 animate-in fade-in",
                            isDark ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border border-emerald-200 text-emerald-700"
                        )}>
                            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                            You've joined the workspace! Redirecting you now…
                        </div>
                    )}

                    {/* ── ALREADY A MEMBER ── */}
                    {stage === 'already-member' && (
                        <div className={cn(
                            "p-4 rounded-xl text-[14px] font-medium border text-left flex items-start gap-3 animate-in fade-in",
                            isDark ? "bg-white/5 border-white/10 text-white/80" : "bg-black/5 border-black/10 text-black/80"
                        )}>
                            <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-500" />
                            <div>
                                <span className="block font-semibold mb-1">Already a member</span>
                                You already have an account in this workspace.{' '}
                                <a href="/" className="underline font-semibold">Go to dashboard →</a>
                            </div>
                        </div>
                    )}

                    {/* ── ERROR ── */}
                    {stage === 'error' && (
                        <div className={cn(
                            "p-4 rounded-xl text-[13px] font-semibold flex items-start gap-3 animate-in fade-in",
                            isDark ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-red-50 border border-red-200 text-red-700"
                        )}>
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    {/* ── SET PASSWORD (new user via invite link) ── */}
                    {stage === 'set-password' && (
                        <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
                            {/* Email — greyed out, read-only */}
                            <input
                                type="email"
                                readOnly
                                value={email}
                                tabIndex={-1}
                                className={cn(
                                    "w-full h-12 px-4 rounded-xl text-[14px] font-medium cursor-not-allowed select-none",
                                    isDark
                                        ? "bg-white/[0.03] border border-white/5 text-white/30"
                                        : "bg-black/[0.03] border border-black/5 text-black/30"
                                )}
                            />

                            {/* Password */}
                            <div className="relative group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    autoFocus
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className={cn(
                                        "w-full h-12 px-4 pr-12 rounded-xl text-[14px] font-medium transition-all focus:outline-none focus:ring-2",
                                        isDark
                                            ? "bg-[#141414] border border-white/10 hover:border-white/20 focus:border-white/30 focus:ring-white/10 placeholder:text-white/30"
                                            : "bg-white border border-black/10 hover:border-black/20 focus:border-black/30 focus:ring-black/5 placeholder:text-black/40 shadow-sm"
                                    )}
                                    placeholder="Create a password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={cn(
                                        "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors",
                                        isDark ? "text-white/20 hover:text-white/60 hover:bg-white/5" : "text-black/20 hover:text-black/60 hover:bg-black/5"
                                    )}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>

                            {/* Confirm Password */}
                            <div className="relative group">
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className={cn(
                                        "w-full h-12 px-4 pr-12 rounded-xl text-[14px] font-medium transition-all focus:outline-none focus:ring-2",
                                        isDark
                                            ? "bg-[#141414] border border-white/10 hover:border-white/20 focus:border-white/30 focus:ring-white/10 placeholder:text-white/30"
                                            : "bg-white border border-black/10 hover:border-black/20 focus:border-black/30 focus:ring-black/5 placeholder:text-black/40 shadow-sm"
                                    )}
                                    placeholder="Confirm password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className={cn(
                                        "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors",
                                        isDark ? "text-white/20 hover:text-white/60 hover:bg-white/5" : "text-black/20 hover:text-black/60 hover:bg-black/5"
                                    )}
                                >
                                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>

                            {error && (
                                <div className={cn(
                                    "p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1",
                                    isDark ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-red-50 text-red-600 border border-red-100"
                                )}>
                                    <AlertCircle size={14} className="shrink-0" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                id="join-workspace-btn"
                                disabled={savingPassword}
                                style={{ backgroundColor: accentColor }}
                                className="w-full h-12 mt-2 rounded-xl flex items-center justify-center gap-2 font-bold text-[14px] text-white transition-all hover:-translate-y-[1px] active:translate-y-[1px] disabled:opacity-50 disabled:hover:translate-y-0 shadow-lg"
                            >
                                {savingPassword ? (
                                    <AppLoader size="xs" color="currentColor" />
                                ) : (
                                    <>
                                        Set Password & Join
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function JoinWorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = React.use(params);
    return (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center" />}>
            <JoinForm workspaceId={workspaceId} />
        </Suspense>
    );
}
