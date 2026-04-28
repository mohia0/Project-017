"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, Building, Globe, Upload, Loader2, XCircle } from 'lucide-react';
import { AppLoader } from '@/components/ui/AppLoader';

interface PortalBranding {
    name: string;
    logo_url: string | null;
    primary_color: string | null;
}

function usePortalBranding() {
    const [branding, setBranding] = useState<PortalBranding | null>(null);
    useEffect(() => {
        fetch('/api/workspace/branding')
            .then(r => r.json())
            .then(({ branding, isCustomDomain }) => {
                // Only apply tenant branding on genuine custom domains
                if (isCustomDomain && branding) setBranding(branding);
            })
            .catch(() => {});
    }, []);
    return branding;
}

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading } = useAuthStore();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const portalBranding = usePortalBranding();

    const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [name, setName] = useState(''); // Adding name for full signup
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Signup Step 2 (Workspace)
    const [wizardStep, setWizardStep] = useState(1);
    const [workspaceName, setWorkspaceName] = useState('');
    const [slug, setSlug] = useState('');
    const [isCheckingSlug, setIsCheckingSlug] = useState(false);
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
    const [slugError, setSlugError] = useState<string | null>(null);
    const checkTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (user) {
            router.push('/');
        }
    }, [user, router]);

    useEffect(() => {
        const errorParam = searchParams?.get('error');
        if (errorParam === 'restricted') {
            setError("Standard accounts must log in via their workspace portal. Admin only access here.");
        }
    }, [searchParams]);

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
                const res = await fetch(`/api/workspace/check-slug?slug=${encodeURIComponent(val)}`);
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

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        try {
            if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else if (mode === 'forgot_password') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/settings/account`,
                });
                if (error) throw error;
                setSuccessMsg("Reset link sent! Please check your email.");
            } else {
                // Sign Up flow
                if (wizardStep === 1) {
                    if (password !== confirmPassword) {
                        setError("Passwords do not match.");
                        return;
                    }
                    if (!name.trim()) {
                        setError("Please enter your name.");
                        return;
                    }
                    setWizardStep(2);
                    return;
                }

                // If wizardStep === 2, proceed to real signup
                if (!workspaceName.trim() || !slug.trim() || slugAvailable === false || isCheckingSlug) {
                    setError("Please complete all workspace details properly.");
                    return;
                }

                setLoading(true);
                const { error } = await supabase.auth.signUp({  
                    email, 
                    password,
                    options: {
                        data: {
                            full_name: name,
                            workspace_name: workspaceName,
                            workspace_slug: slug
                        }
                    }
                });
                if (error) throw error;
                
                // Supabase defaults to requiring email confirmation
                setSuccessMsg("We've sent a verification link. Please check your inbox to activate your account.");
                setName('');
                setPassword(''); // clear password field for security
                setConfirmPassword('');
            }
        } catch (err: any) {
            // Make error messages more friendly if needed
            if (err.message.includes('User already registered')) {
                setError("An account with this email already exists. Try signing in.");
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    if (isLoading || user) {
        return (
            <div className={cn(
                "flex-1 flex"
            )}>
               {/* Invisible background loader handler so as not to jarringly flash */}
            </div>
        );
    }

    return (
        <div className="flex-1 flex relative w-full h-screen overflow-hidden">
            
            {/* Background design accents */}
            <div className={cn(
                "absolute top-0 right-0 w-[50vw] h-full transition-colors duration-700 pointer-events-none",
                isDark ? "bg-gradient-to-l from-white/[0.02] to-transparent" : "bg-gradient-to-l from-black/[0.02] to-transparent"
            )} />
            
            {/* Main Center Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 z-10">
                <div className="w-full max-w-[360px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
                    
                    {/* Logo */}
                    <div className="mb-10 flex items-start">
                        {portalBranding?.logo_url ? (
                            <img
                                src={portalBranding.logo_url}
                                alt={portalBranding.name}
                                className="h-10 w-auto object-contain"
                            />
                        ) : (
                            <img 
                                src="/logo.svg" 
                                alt="aroooxa" 
                                className={cn(
                                    "h-10 w-auto",
                                    isDark && "invert brightness-[100]"
                                )}
                            />
                        )}
                    </div>

                    <div className="w-full flex flex-col mb-8">
                        <h1 className="text-3xl font-bold tracking-tight mb-2.5 text-center">
                            {mode === 'signin' 
                                ? `Sign in${portalBranding ? ` to ${portalBranding.name}` : ' to portal'}.` 
                                : mode === 'signup' 
                                    ? (wizardStep === 1 ? 'Create your account.' : 'Build your headquarters.') 
                                    : 'Reset password.'}
                        </h1>
                        <p className={cn(
                            "text-[15px] font-medium transition-colors text-center",
                            isDark ? "text-white/50" : "text-black/50"
                        )}>
                            {mode === 'signin' 
                                ? 'Enter your details below to proceed.' 
                                : mode === 'signup' 
                                    ? (wizardStep === 1 ? 'Join the platform to run your operations.' : 'Give your workspace a name and claim your portal URL.') 
                                    : 'Enter your email to receive a reset link.'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="flex flex-col gap-4">
                        {mode === 'signup' && wizardStep === 2 && (
                            <div className="flex flex-col gap-5 animate-in slide-in-from-right-4 duration-500">
                                <div className="flex flex-col gap-4">
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
                                                    const suggested = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
                                                    setSlug(suggested);
                                                    handleSlugChange({ target: { value: suggested } } as any);
                                                }
                                            }}
                                            className={cn(
                                                "w-full h-12 pl-12 pr-4 rounded-xl text-[14px] font-medium transition-all focus:outline-none focus:ring-2",
                                                isDark 
                                                    ? "bg-[#141414] border border-white/10 hover:border-white/20 focus:border-white/30 focus:ring-white/10 placeholder:text-white/30" 
                                                    : "bg-white border border-black/10 hover:border-black/20 focus:border-black/30 focus:ring-black/5 placeholder:text-black/40 shadow-sm"
                                            )}
                                            placeholder="Workspace Name (e.g. Acme Studio)"
                                        />
                                    </div>

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
                                                    "w-full h-12 pl-12 pr-4 rounded-xl text-[14px] font-medium transition-all focus:outline-none focus:ring-2 relative z-0 text-right pr-[100px]",
                                                    isDark 
                                                        ? "bg-[#141414] border border-white/10 hover:border-white/20 focus:border-white/30 focus:ring-white/10 placeholder:text-white/30" 
                                                        : "bg-white border border-black/10 hover:border-black/20 focus:border-black/30 focus:ring-black/5 placeholder:text-black/40 shadow-sm",
                                                    slugError ? "!border-red-500/50 !focus:ring-red-500/20" : "",
                                                    slugAvailable ? "!border-green-500/50" : ""
                                                )}
                                                placeholder="your-url"
                                            />
                                            <div className={cn(
                                                "absolute right-4 top-1/2 -translate-y-1/2 font-medium text-xs pointer-events-none transition-colors",
                                                isDark ? "text-white/40" : "text-black/40"
                                            )}>
                                                .aroooxa.com
                                            </div>
                                        </div>
                                        <div className="absolute right-[-28px] top-1/2 -translate-y-1/2 flex items-center justify-center">
                                            {isCheckingSlug && <Loader2 size={14} className="animate-spin text-blue-500" />}
                                            {!isCheckingSlug && slugAvailable === true && <CheckCircle2 size={14} className="text-green-500" />}
                                            {!isCheckingSlug && (slugAvailable === false || slugError) && slug.length > 0 && <XCircle size={14} className="text-red-500" />}
                                        </div>
                                    </div>
                                    {slugError && (
                                        <div className="text-red-500 text-xs font-semibold pl-1 animate-in slide-in-from-top-1">
                                            {slugError}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {mode === 'signup' && wizardStep === 1 && (
                            <div className="flex flex-col">
                                <input 
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className={cn(
                                        "w-full h-12 px-4 rounded-xl text-[14px] font-medium transition-all focus:outline-none focus:ring-2",
                                        isDark 
                                            ? "bg-[#141414] border border-white/10 hover:border-white/20 focus:border-white/30 focus:ring-white/10 placeholder:text-white/30" 
                                            : "bg-white border border-black/10 hover:border-black/20 focus:border-black/30 focus:ring-black/5 placeholder:text-black/40 shadow-sm"
                                    )}
                                    placeholder="Full Name"
                                />
                            </div>
                        )}

                        <div className="flex flex-col">
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
                        </div>

                        {mode !== 'forgot_password' && (
                            <div className="flex flex-col gap-2">
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
                                        placeholder="••••••••"
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

                                {mode === 'signin' && (
                                    <div className="flex justify-end pr-1">
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setMode('forgot_password');
                                                setError('');
                                                setSuccessMsg('');
                                            }}
                                            className={cn(
                                                "text-[12px] font-semibold opacity-60 hover:opacity-100 transition-opacity",
                                                isDark ? "text-white" : "text-black"
                                            )}
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {mode === 'signup' && wizardStep === 1 && (
                            <div className="relative group">
                                <input 
                                    type={showConfirmPassword ? "text" : "password"}
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
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className={cn(
                                        "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors",
                                        isDark ? "text-white/20 hover:text-white/60 hover:bg-white/5" : "text-black/20 hover:text-black/60 hover:bg-black/5"
                                    )}
                                >
                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 mt-1 rounded-xl bg-red-500/10 text-red-500 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                <AlertCircle size={16} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3 mt-1 rounded-xl bg-[#4dbf39]/10 text-[#4dbf39] text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                <CheckCircle2 size={16} className="shrink-0" />
                                {successMsg}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={loading || !!successMsg}
                            className={cn(
                                "w-full h-12 mt-2 rounded-xl flex items-center justify-center gap-2 font-bold text-[14px] transition-all hover:-translate-y-[1px] active:translate-y-[1px] disabled:opacity-50 disabled:hover:translate-y-0",
                                isDark 
                                    ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                                    : "bg-black text-white shadow-xl shadow-black/20 hover:shadow-black/30"
                            )}
                        >
                            {loading ? (
                                <AppLoader size="xs" color="currentColor" />
                            ) : (
                                <>
                                    {mode === 'signin' ? 'Sign in securely' : mode === 'signup' ? (wizardStep === 1 ? 'Continue' : 'Create account') : 'Send reset link'}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 flex flex-col gap-2.5">
                        {(mode === 'signin' || mode === 'forgot_password') && (
                            <div className="flex items-center justify-center gap-2 text-[13px] font-medium">
                                <span className={cn("opacity-50", isDark ? "text-white" : "text-black")}>
                                    Don't have an account?
                                </span>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setMode('signup');
                                        setWizardStep(1);
                                        setError('');
                                        setSuccessMsg('');
                                    }}
                                    className={cn(
                                        "hover:underline underline-offset-4 decoration-2",
                                        isDark ? "text-white" : "text-black"
                                    )}
                                >
                                    Sign up
                                </button>
                            </div>
                        )}

                        {mode === 'signup' && wizardStep === 2 && (
                            <div className="flex items-center justify-center gap-2 text-[13px] font-medium animate-in fade-in duration-700">
                                <button 
                                    type="button"
                                    onClick={() => setWizardStep(1)}
                                    className={cn(
                                        "opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1.5",
                                        isDark ? "text-white" : "text-black"
                                    )}
                                >
                                    &larr; Back to account details
                                </button>
                            </div>
                        )}
                        
                        {(mode === 'signup' && wizardStep === 1) && (
                            <div className="flex items-center justify-center gap-2 text-[13px] font-medium">
                                <span className={cn("opacity-50", isDark ? "text-white" : "text-black")}>
                                    Already have an account?
                                </span>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setMode('signin');
                                        setError('');
                                        setSuccessMsg('');
                                    }}
                                    className={cn(
                                        "hover:underline underline-offset-4 decoration-2",
                                        isDark ? "text-white" : "text-black"
                                    )}
                                >
                                    Sign in
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
