"use client";

import React, { useEffect, useState } from 'react';
import { useSettingsStore, WorkspaceEmailConfig } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';
import { appToast } from '@/lib/toast';
import {
    Mail, Send, ShieldCheck, Globe, Eye, EyeOff,
    Check, AlertCircle, Trash2, Settings2, Sparkles, Layout
} from 'lucide-react';
import { AppLoader } from '@/components/ui/AppLoader';
import Link from 'next/link';

export default function EmailSettingsPage() {
    const { emailConfig, updateEmailConfig, fetchEmailConfig } = useSettingsStore();
    const { activeWorkspaceId, theme } = useUIStore();
    const isDark = theme === 'dark';

    const [isSaving, setIsSaving] = useState(false);
    const [showPass, setShowPass] = useState(false);
    
    const [config, setConfig] = useState<Partial<WorkspaceEmailConfig>>({
        from_name: '',
        from_address: '',
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass: '',
        smtp_secure: true
    });

    useEffect(() => {
        if (activeWorkspaceId) fetchEmailConfig(activeWorkspaceId);
    }, [activeWorkspaceId]);

    useEffect(() => {
        if (emailConfig) {
            setConfig(emailConfig);
        }
    }, [emailConfig]);

    const handleSave = async () => {
        if (!activeWorkspaceId) return;
        setIsSaving(true);
        try {
            // Coerce port to number
            const finalData = {
                ...config,
                smtp_port: Number(config.smtp_port) || 587
            };
            await updateEmailConfig(activeWorkspaceId, finalData);
            appToast.success('Settings Saved', 'Email configuration updated successfully.');
        } catch (err: any) {
            appToast.error('Save Failed', err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-[800px] mx-auto pb-20">
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className={cn("text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-[#111]")}>
                        Email Configuration
                    </h1>
                    <p className={cn("text-[13px] mt-1", isDark ? "text-white/40" : "text-black/40")}>
                        Configure your SMTP server and sender identity.
                    </p>
                </div>
                <Link
                    href="/settings/emails/templates"
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95 border shadow-sm",
                        isDark 
                            ? "bg-white/5 border-white/10 text-white hover:bg-white/10" 
                            : "bg-black/5 border-black/10 text-black hover:bg-black/10"
                    )}
                >
                    <Layout size={14} />
                    Email Templates
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-6">
                
                {/* ── Sender Identity ── */}
                <div className={cn(
                    "p-6 rounded-2xl border shadow-sm",
                    isDark ? "bg-[#141414] border-[#252525]" : "bg-white border-[#f0f0f0]"
                )}>
                    <div className="flex items-center gap-2.5 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Mail size={16} className="text-primary" />
                        </div>
                        <h3 className={cn("text-[15px] font-bold", isDark ? "text-white" : "text-[#111]")}>Sender Identity</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={cn("text-[11px] font-bold uppercase tracking-widest opacity-40 ml-1", isDark ? "text-white" : "text-black")}>From Name</label>
                            <input
                                type="text"
                                value={config.from_name || ''}
                                onChange={e => setConfig({ ...config, from_name: e.target.value })}
                                placeholder="Your Name or Studio"
                                className={cn(
                                    "w-full px-4 py-2.5 rounded-xl border outline-none text-[13px] font-medium transition-all focus:ring-2 ring-primary/10",
                                    isDark ? "bg-white/[0.03] border-white/8 text-white focus:border-white/20" : "bg-black/[0.02] border-black/8 text-[#111] focus:border-black/20"
                                )}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className={cn("text-[11px] font-bold uppercase tracking-widest opacity-40 ml-1", isDark ? "text-white" : "text-black")}>From Address</label>
                            <input
                                type="email"
                                value={config.from_address || ''}
                                onChange={e => setConfig({ ...config, from_address: e.target.value })}
                                placeholder="hello@yourstudio.com"
                                className={cn(
                                    "w-full px-4 py-2.5 rounded-xl border outline-none text-[13px] font-medium transition-all focus:ring-2 ring-primary/10",
                                    isDark ? "bg-white/[0.03] border-white/8 text-white focus:border-white/20" : "bg-black/[0.02] border-black/8 text-[#111] focus:border-black/20"
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* ── SMTP Configuration ── */}
                <div className={cn(
                    "p-6 rounded-2xl border shadow-sm",
                    isDark ? "bg-[#141414] border-[#252525]" : "bg-white border-[#f0f0f0]"
                )}>
                    <div className="flex items-center gap-2.5 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Globe size={16} className="text-primary" />
                        </div>
                        <h3 className={cn("text-[15px] font-bold", isDark ? "text-white" : "text-[#111]")}>SMTP Settings</h3>
                    </div>

                    <div className="space-y-5">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-1.5">
                                <label className={cn("text-[11px] font-bold uppercase tracking-widest opacity-40 ml-1", isDark ? "text-white" : "text-black")}>SMTP Host</label>
                                <input
                                    type="text"
                                    value={config.smtp_host || ''}
                                    onChange={e => setConfig({ ...config, smtp_host: e.target.value })}
                                    placeholder="smtp.gmail.com"
                                    className={cn(
                                        "w-full px-4 py-2.5 rounded-xl border outline-none text-[13px] font-medium transition-all",
                                        isDark ? "bg-white/[0.03] border-white/8 text-white focus:border-white/20" : "bg-black/[0.02] border-black/8 text-[#111] focus:border-black/20"
                                    )}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={cn("text-[11px] font-bold uppercase tracking-widest opacity-40 ml-1", isDark ? "text-white" : "text-black")}>Port</label>
                                <input
                                    type="text"
                                    value={config.smtp_port || ''}
                                    onChange={e => setConfig({ ...config, smtp_port: Number(e.target.value) || 0 })}
                                    placeholder="587"
                                    className={cn(
                                        "w-full px-4 py-2.5 rounded-xl border outline-none text-[13px] font-medium transition-all",
                                        isDark ? "bg-white/[0.03] border-white/8 text-white focus:border-white/20" : "bg-black/[0.02] border-black/8 text-[#111] focus:border-black/20"
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className={cn("text-[11px] font-bold uppercase tracking-widest opacity-40 ml-1", isDark ? "text-white" : "text-black")}>SMTP User</label>
                                <input
                                    type="text"
                                    value={config.smtp_user || ''}
                                    onChange={e => setConfig({ ...config, smtp_user: e.target.value })}
                                    className={cn(
                                        "w-full px-4 py-2.5 rounded-xl border outline-none text-[13px] font-medium transition-all",
                                        isDark ? "bg-white/[0.03] border-white/8 text-white focus:border-white/20" : "bg-black/[0.02] border-black/8 text-[#111] focus:border-black/20"
                                    )}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={cn("text-[11px] font-bold uppercase tracking-widest opacity-40 ml-1", isDark ? "text-white" : "text-black")}>SMTP Password</label>
                                <div className="relative">
                                    <input
                                        type={showPass ? "text" : "password"}
                                        value={config.smtp_pass || ''}
                                        onChange={e => setConfig({ ...config, smtp_pass: e.target.value })}
                                        className={cn(
                                            "w-full pl-4 pr-10 py-2.5 rounded-xl border outline-none text-[13px] font-medium transition-all",
                                            isDark ? "bg-white/[0.03] border-white/8 text-white focus:border-white/20" : "bg-black/[0.02] border-black/8 text-[#111] focus:border-black/20"
                                        )}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className={cn("absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-black/5")}
                                    >
                                        {showPass ? <EyeOff size={14} className="opacity-40" /> : <Eye size={14} className="opacity-40" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-primary/20 bg-primary/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <ShieldCheck size={16} className="text-primary" />
                                </div>
                                <div>
                                    <p className={cn("text-[13px] font-bold", isDark ? "text-white" : "text-[#111]")}>SSL/TLS Connection</p>
                                    <p className={cn("text-[11px] opacity-40")}>Always use a secure connection for email delivery.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setConfig({ ...config, smtp_secure: !config.smtp_secure })}
                                className={cn(
                                    "w-10 h-5 rounded-full relative transition-all duration-300",
                                    config.smtp_secure ? "bg-primary" : (isDark ? "bg-white/10" : "bg-black/10")
                                )}
                            >
                                <div className={cn(
                                    "absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300",
                                    config.smtp_secure ? "translate-x-6" : "translate-x-1"
                                )} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={cn(
                            "flex items-center gap-2 px-8 py-3 rounded-xl text-[14px] font-bold transition-all active:scale-95 shadow-lg shadow-primary/20",
                            "bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                        )}
                    >
                        {isSaving ? <><AppLoader size="xs" /> Saving...</> : <><Send size={16} /> Save Email Config</>}
                    </button>
                </div>

            </div>
        </div>
    );
}
