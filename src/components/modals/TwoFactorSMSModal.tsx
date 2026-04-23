"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Shield, X, Smartphone, CheckCircle, Trash2, AlertCircle, ArrowRight, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { appToast } from '@/lib/toast';

interface TwoFactorSMSModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDark: boolean;
    currentFactors: any[];
}

export default function TwoFactorSMSModal({
    isOpen,
    onClose,
    isDark,
    currentFactors
}: TwoFactorSMSModalProps) {
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<'list' | 'phone' | 'verify'>('list');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [enrollData, setEnrollData] = useState<any>(null);
    const [challengeData, setChallengeData] = useState<any>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [factors, setFactors] = useState<any[]>(currentFactors);

    useEffect(() => { 
        setMounted(true); 
        if (isOpen) {
            setStep('list');
            setFactors(currentFactors);
        }
    }, [isOpen, currentFactors]);

    if (!isOpen || !mounted) return null;

    const handleStartEnroll = () => {
        setStep('phone');
    };

    const handleEnrollPhone = async () => {
        if (!phoneNumber) {
            appToast.error('Please enter a phone number');
            return;
        }

        setIsSubmitting(true);
        try {
            // Step 1: Enroll the factor
            const { data, error } = await (supabase.auth.mfa as any).enroll({
                factorType: 'phone',
                phone: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
            });

            if (error) throw error;
            setEnrollData(data);

            // Step 2: Challenge the factor to send SMS
            const challenge = await (supabase.auth.mfa as any).challenge({
                factorId: data.id
            });

            if (challenge.error) throw challenge.error;
            setChallengeData(challenge.data);

            setStep('verify');
        } catch (error: any) {
            appToast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerify = async () => {
        if (verificationCode.length !== 6) return;

        setIsSubmitting(true);
        try {
            const verify = await (supabase.auth.mfa as any).verify({
                factorId: enrollData.id,
                challengeId: challengeData.id,
                code: verificationCode
            });

            if (verify.error) throw verify.error;

            appToast.success('Two-factor SMS enabled');
            onClose();
        } catch (error: any) {
            appToast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUnenroll = async (factorId: string) => {
        setIsSubmitting(true);
        try {
            const { error } = await (supabase.auth.mfa as any).unenroll({
                factorId
            });

            if (error) throw error;

            appToast.success('Factor removed');
            const { data } = await (supabase.auth.mfa as any).listFactors();
            if (data) setFactors(data.all);
            if (data?.all.length === 0) setStep('list');
        } catch (error: any) {
            appToast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
            <div className={cn(
                "w-full max-w-[450px] rounded-3xl shadow-2xl overflow-hidden border animate-in fade-in zoom-in duration-200",
                isDark ? "bg-[#111] border-white/10 text-white" : "bg-white border-black/10 text-black"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            isDark ? "bg-blue-500/10 text-blue-500" : "bg-blue-50 text-blue-600"
                        )}>
                            <Smartphone size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-base leading-tight">SMS Authentication</h3>
                            <p className={cn("text-[11px] font-medium opacity-50 uppercase tracking-wider", isDark ? "text-white" : "text-black")}>
                                Secure your account
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors opacity-50">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {step === 'list' && (
                        <div className="space-y-6">
                            {factors.length > 0 ? (
                                <div className="space-y-3">
                                    {factors.map((factor) => (
                                        <div key={factor.id} className={cn(
                                            "flex items-center justify-between p-4 rounded-2xl border",
                                            isDark ? "bg-white/[0.02] border-white/5" : "bg-black/[0.02] border-black/5"
                                        )}>
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center",
                                                    isDark ? "bg-emerald-500/10 text-emerald-500" : "bg-emerald-50 text-emerald-600"
                                                )}>
                                                    <Smartphone size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold uppercase tracking-tighter">
                                                        {factor.phone_rel || factor.phone_number || 'Mobile Device'}
                                                    </p>
                                                    <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Active SMS Factor</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleUnenroll(factor.id)}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <div className={cn(
                                        "w-20 h-20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 relative",
                                        isDark ? "bg-white/[0.03]" : "bg-black/[0.03]"
                                    )}>
                                        <Smartphone size={32} className="opacity-40" />
                                        <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center border-4 border-white dark:border-[#111]">
                                            <Zap size={14} fill="currentColor" />
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold mb-2">Enable SMS 2FA</h4>
                                    <p className={cn("text-xs opacity-50 mb-8 leading-loose max-w-[280px] mx-auto", isDark ? "text-white" : "text-black")}>
                                        We'll send a secure code via SMS to your phone number every time you sign in.
                                    </p>
                                    <button 
                                        onClick={handleStartEnroll}
                                        className="w-full h-12 bg-black text-white dark:bg-white dark:text-black rounded-2xl text-sm font-bold shadow-[0_8px_30px_rgb(0,0,0,0.12)] active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                    >
                                        Get Started <ArrowRight size={16} />
                                    </button>
                                </div>
                            )}

                            {factors.length > 0 && (
                                <button 
                                    onClick={handleStartEnroll}
                                    className={cn(
                                        "w-full h-12 rounded-2xl text-sm font-bold border transition-all hover:bg-black/5 dark:hover:bg-white/5",
                                        isDark ? "border-white/10" : "border-black/10"
                                    )}
                                >
                                    Add New Number
                                </button>
                            )}
                        </div>
                    )}

                    {step === 'phone' && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h4 className="text-lg font-bold mb-2">Your Mobile Number</h4>
                                <p className={cn("text-xs opacity-50", isDark ? "text-white" : "text-black")}>
                                    Enter your number with country code (e.g. +1234567890)
                                </p>
                            </div>

                            <div className="space-y-4">
                                <input 
                                    type="tel"
                                    autoFocus
                                    value={phoneNumber}
                                    onChange={e => setPhoneNumber(e.target.value)}
                                    placeholder="+1 234 567 8900"
                                    className={cn(
                                        "w-full h-14 px-6 text-center text-xl font-bold rounded-2xl border transition-all focus:ring-2",
                                        isDark 
                                            ? "bg-white/[0.03] border-white/10 focus:border-blue-500 focus:ring-blue-500/20" 
                                            : "bg-black/[0.03] border-black/10 focus:border-blue-500 focus:ring-blue-500/10"
                                    )}
                                />

                                <div className="flex gap-3 mt-8">
                                    <button 
                                        onClick={() => setStep('list')}
                                        className={cn(
                                            "flex-1 h-12 rounded-xl text-sm font-bold opacity-60 hover:opacity-100 transition-opacity",
                                            isDark ? "text-white" : "text-black"
                                        )}
                                    >
                                        Back
                                    </button>
                                    <button 
                                        onClick={handleEnrollPhone}
                                        disabled={isSubmitting || !phoneNumber}
                                        className="flex-[2] h-12 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Sending SMS...' : 'Send Verification Code'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'verify' && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-widest mb-4">
                                    SMS Sent to {phoneNumber}
                                </div>
                                <h4 className="text-lg font-bold mb-2">Verify your device</h4>
                                <p className={cn("text-xs opacity-50", isDark ? "text-white" : "text-black")}>
                                    Please enter the 6-digit code we just sent you.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <input 
                                    type="text"
                                    maxLength={6}
                                    autoFocus
                                    value={verificationCode}
                                    onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className={cn(
                                        "w-full h-16 text-center text-3xl font-black tracking-[0.3em] rounded-2xl border transition-all",
                                        isDark 
                                            ? "bg-white/[0.03] border-white/10 focus:border-blue-500" 
                                            : "bg-black/[0.03] border-black/10 focus:border-blue-500"
                                    )}
                                />

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setStep('phone')}
                                        className={cn(
                                            "flex-1 h-12 rounded-xl text-sm font-bold opacity-60 hover:opacity-100",
                                            isDark ? "text-white" : "text-black"
                                        )}
                                    >
                                        Resend
                                    </button>
                                    <button 
                                        onClick={handleVerify}
                                        disabled={isSubmitting || verificationCode.length !== 6}
                                        className="flex-[2] h-12 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-bold shadow-xl active:scale-95 transition-all"
                                    >
                                        {isSubmitting ? 'Verifying...' : 'Complete Activation'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className={cn(
                    "p-6 flex items-start gap-3 border-t",
                    isDark ? "bg-[#0d0d0d] border-white/5" : "bg-[#fafafa] border-black/5"
                )}>
                    <AlertCircle size={16} className="shrink-0 mt-0.5 opacity-40 text-blue-500" />
                    <p className={cn("text-[10px] leading-relaxed opacity-40 font-bold uppercase tracking-tight", isDark ? "text-white" : "text-black")}>
                        Carrier rates may apply for international SMS. SMS MFA is managed directly via Supabase Auth services.
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}
