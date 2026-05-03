"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';
import { ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AppLoader } from '@/components/ui/AppLoader';
import { AroooXaLogo } from '@/components/ui/AroooXaLogo';

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
    return params.get('type'); // 'invite' | 'magiclink' | 'recovery' | null
}

// Check if user has a usable password (i.e. not a brand-new invite-only account)
// New invited users have no identities with 'email' provider — they only have a temp account
function isNewInvitedUser(session: any): boolean {
    const identities = session?.user?.identities || [];
    // If there are no identities yet, or the only identity has no last_sign_in_at,
    // the account was just created via invite and has never signed in with a password.
    return identities.length === 0 || 
        !identities.some((id: any) => id.provider === 'email' && id.identity_data?.email_verified);
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
        fetch('/api/workspace/branding')
            .then(r => r.json())
            .then(({ branding }) => {
                if (branding) {
                    setBranding(branding);
                    if (branding.favicon_url) {
                        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
                        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
                        link.href = branding.favicon_url;
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

            setStage('success');
            setTimeout(() => router.push('/'), 1800);
        } catch (err: any) {
            setError(err.message || 'Failed to accept invitation.');
            setStage('error');
        }
    };

    // Listen for Supabase auth state — fires when magic link auto-authenticates the user
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const user = session.user;
                const linkType = getMagicLinkType();

                if (linkType === 'invite') {
                    // New user created via invite — they need to set a password before proceeding
                    setStage('set-password');
                } else if (linkType === 'magiclink') {
                    // Existing user authenticated via magic link — check if they already have
                    // a workspace. If yes, auto-accept. If not (new invited user with magiclink
                    // fallback), show password setup.
                    const { data: wsData } = await supabase
                        .from('workspaces')
                        .select('id')
                        .eq('owner_id', user.id)
                        .maybeSingle();

                    if (wsData?.id) {
                        // Established user — auto-accept into workspace
                        await acceptIntoWorkspace(user.id, user.email || email);
                    } else {
                        // No workspace yet = likely a new invited user, show password setup
                        setStage('set-password');
                    }
                } else {
                    // No type in hash (e.g., Supabase redirected to wrong place first) —
                    // Try to detect from user data. If they own a workspace, auto-accept.
                    const { data: wsData } = await supabase
                        .from('workspaces')
                        .select('id')
                        .eq('owner_id', user.id)
                        .maybeSingle();

                    if (wsData?.id) {
                        await acceptIntoWorkspace(user.id, user.email || email);
                    } else {
                        // No workspace → treat as new user needing password setup
                        setStage('set-password');
                    }
                }
            }
        });

        // Also check if already signed in (e.g. page refresh after magic link auth)
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user && stage === 'loading') {
                const linkType = getMagicLinkType();
                if (linkType === 'invite') {
                    setStage('set-password');
                } else {
                    // For existing sessions, just auto-accept (user already has account + password)
                    await acceptIntoWorkspace(session.user.id, session.user.email || email);
                }
            } else if (!session && stage === 'loading') {
                // No session yet — the magic link may still be processing via onAuthStateChange
                // Wait a bit before showing an error (the SIGNED_IN event will fire shortly)
                setTimeout(() => {
                    supabase.auth.getSession().then(({ data: { session: s2 } }) => {
                        if (!s2) {
                            setStage('error');
                            setError('Invalid or expired invitation link. Please ask the workspace owner to resend the invitation.');
                        }
                    });
                }, 3000);
            }
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
            // Set the password for the newly created account
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

            // Now get current session and accept into workspace
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
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

export default function JoinWorkspacePage({ params }: { params: { workspaceId: string } }) {
    return (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center" />}>
            <JoinForm workspaceId={params.workspaceId} />
        </Suspense>
    );
}
