"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { AppLoader } from '@/components/ui/AppLoader';
import { AroooXaLogo } from '@/components/ui/AroooXaLogo';

interface WorkspaceBranding {
    name: string;
    logo_url: string | null;
    primary_color: string | null;
}

function JoinForm({ workspaceId }: { workspaceId: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { theme } = useUIStore();
    const { user } = useAuthStore();
    const isDark = theme === 'dark';

    const [branding, setBranding] = useState<WorkspaceBranding | null>(null);
    const [email, setEmail] = useState(searchParams?.get('email') || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Fetch workspace branding
    useEffect(() => {
        fetch('/api/workspace/branding')
            .then(r => r.json())
            .then(({ branding }) => {
                if (branding) setBranding(branding);
            })
            .catch(() => {});
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

        setLoading(true);
        try {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: { full_name: '' },
                },
            });

            if (signUpError) throw signUpError;

            // Insert into workspace_members — the workspace settings default_role_id is applied server-side
            if (signUpData.user) {
                await supabase.from('workspace_members').upsert({
                    workspace_id: workspaceId,
                    user_id: signUpData.user.id,
                    invited_email: email.trim(),
                }, { onConflict: 'workspace_id,user_id' });

                // Fire notification to workspace
                await fetch('/api/accept-invitation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        workspace_id: workspaceId,
                        user_id: signUpData.user.id,
                        invited_email: email.trim(),
                        display_name: email.trim(),
                    }),
                });
            }

            setSuccessMsg("Account created! We've sent a verification link to your email. Please check your inbox to activate your account.");
        } catch (err: any) {
            if (err.message?.includes('User already registered')) {
                setError('An account with this email already exists. Try signing in instead.');
            } else {
                setError(err.message || 'Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptAsExisting = async () => {
        if (!user) return;
        setLoading(true);
        setError('');
        try {
            await supabase.from('workspace_members').upsert({
                workspace_id: workspaceId,
                user_id: user.id,
                invited_email: email.trim() || user.email,
            }, { onConflict: 'workspace_id,user_id' });

            // Fire notification to workspace owner
            await fetch('/api/accept-invitation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    user_id: user.id,
                    invited_email: email.trim() || user.email,
                    display_name: user.user_metadata?.full_name || user.email,
                }),
            });

            // Redirect to dashboard
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Failed to accept invitation.');
            setLoading(false);
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
                            <img
                                src={branding.logo_url}
                                alt={branding.name}
                                className="h-14 w-auto object-contain mx-auto"
                            />
                        ) : (
                            <AroooXaLogo
                                height={40}
                                color={isDark ? 'white' : '#1a1a1a'}
                                wave={true}
                                className="mx-auto"
                            />
                        )}
                    </div>

                    {/* Heading */}
                    <div className="w-full flex flex-col mb-8 text-center">
                        <h1 className="text-3xl font-bold tracking-tight mb-2.5">
                            Join {branding?.name || 'the workspace'}.
                        </h1>
                        <p className={cn(
                            "text-[15px] font-medium transition-colors",
                            isDark ? "text-white/50" : "text-black/50"
                        )}>
                            Create your account to get started.
                        </p>
                    </div>

                    {successMsg ? (
                        <div className={cn(
                            "p-4 rounded-xl text-[13px] font-semibold flex items-start gap-3 animate-in fade-in",
                            isDark ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border border-emerald-200 text-emerald-700"
                        )}>
                            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                            {successMsg}
                        </div>
                    ) : user ? (
                        <div className="flex flex-col gap-4 text-center animate-in fade-in">
                            <div className={cn(
                                "p-4 rounded-xl text-[14px] font-medium border text-left flex items-start gap-3",
                                isDark ? "bg-white/5 border-white/10 text-white/80" : "bg-black/5 border-black/10 text-black/80"
                            )}>
                                <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-500" />
                                <div>
                                    <span className="block font-semibold mb-1">Already signed in</span>
                                    You are currently signed in as <strong className={isDark ? "text-white" : "text-black"}>{user.email}</strong>.
                                </div>
                            </div>

                            {error && (
                                <div className={cn(
                                    "p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 text-left",
                                    isDark ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-red-50 text-red-600 border border-red-100"
                                )}>
                                    <AlertCircle size={14} className="shrink-0" />
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleAcceptAsExisting}
                                disabled={loading}
                                style={{ backgroundColor: accentColor }}
                                className={cn(
                                    "w-full h-12 mt-2 rounded-xl flex items-center justify-center gap-2 font-bold text-[14px] text-white transition-all hover:-translate-y-[1px] active:translate-y-[1px] disabled:opacity-50 disabled:hover:translate-y-0 shadow-lg"
                                )}
                            >
                                {loading ? (
                                    <AppLoader size="xs" color="currentColor" />
                                ) : (
                                    <>
                                        Back to your dashboard
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                            
                            <div className="mt-4 flex items-center justify-center gap-2 text-[13px] font-medium">
                                <span className={cn("opacity-50", isDark ? "text-white" : "text-black")}>
                                    Not you?
                                </span>
                                <button
                                    onClick={() => useAuthStore.getState().signOut()}
                                    className={cn(
                                        "hover:underline underline-offset-4 decoration-2 font-semibold",
                                        isDark ? "text-white" : "text-black"
                                    )}
                                >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                            {/* Email — pre-filled, editable */}
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className={cn(
                                    "w-full h-12 px-4 rounded-xl text-[14px] font-medium transition-all focus:outline-none focus:ring-2",
                                    isDark
                                        ? "bg-[#141414] border border-white/10 hover:border-white/20 focus:border-white/30 focus:ring-white/10 placeholder:text-white/30"
                                        : "bg-white border border-black/10 hover:border-black/20 focus:border-black/30 focus:ring-black/5 placeholder:text-black/40 shadow-sm"
                                )}
                                placeholder="name@company.com"
                            />

                            {/* Password */}
                            <div className="relative group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className={cn(
                                        "w-full h-12 px-4 pr-12 rounded-xl text-[14px] font-medium transition-all focus:outline-none focus:ring-2",
                                        isDark
                                            ? "bg-[#141414] border border-white/10 hover:border-white/20 focus:border-white/30 focus:ring-white/10 placeholder:text-white/30"
                                            : "bg-white border border-black/10 hover:border-black/20 focus:border-black/30 focus:ring-black/5 placeholder:text-black/40 shadow-sm"
                                    )}
                                    placeholder="Password"
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
                                disabled={loading}
                                style={{ backgroundColor: accentColor }}
                                className={cn(
                                    "w-full h-12 mt-2 rounded-xl flex items-center justify-center gap-2 font-bold text-[14px] text-white transition-all hover:-translate-y-[1px] active:translate-y-[1px] disabled:opacity-50 disabled:hover:translate-y-0",
                                    "shadow-lg"
                                )}
                            >
                                {loading ? (
                                    <AppLoader size="xs" color="currentColor" />
                                ) : (
                                    <>
                                        Create Account
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Sign in link */}
                    {(!successMsg && !user) && (
                        <div className="mt-8 flex items-center justify-center gap-2 text-[13px] font-medium">
                            <span className={cn("opacity-50", isDark ? "text-white" : "text-black")}>
                                Already have an account?
                            </span>
                            <a
                                href="/login"
                                className={cn(
                                    "hover:underline underline-offset-4 decoration-2 font-semibold",
                                    isDark ? "text-white" : "text-black"
                                )}
                            >
                                Sign in
                            </a>
                        </div>
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
