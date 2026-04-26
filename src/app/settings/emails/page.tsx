"use client";

import React, { useEffect, useState } from 'react';
import { useSettingsStore, WorkspaceEmailConfig } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { appToast } from '@/lib/toast';
import {
    Mail, Send, ShieldCheck, Globe, Eye, EyeOff,
    Check, AlertCircle, Trash2, Settings2, Sparkles, Layout,
    Plus, MoreVertical, CheckCircle2, Circle, X, FlaskConical
} from 'lucide-react';
import { AppLoader } from '@/components/ui/AppLoader';
import Link from 'next/link';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';

export default function EmailSettingsPage() {
    const { emailConfigs, updateEmailConfig, fetchEmailConfigs, deleteEmailConfig, setDefaultEmailConfig } = useSettingsStore();
    const { activeWorkspaceId, theme } = useUIStore();
    const { user } = useAuthStore();
    const isDark = theme === 'dark';

    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [isAddMode, setIsAddMode] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [toDelete, setToDelete] = useState<string | null>(null);
    
    const [form, setForm] = useState<Partial<WorkspaceEmailConfig>>({
        from_name: '',
        from_address: '',
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass: '',
        smtp_secure: true,
        is_default: false
    });

    useEffect(() => {
        if (activeWorkspaceId) fetchEmailConfigs(activeWorkspaceId);
    }, [activeWorkspaceId]);

    const handleSave = async () => {
        if (!activeWorkspaceId) return;
        setIsSaving(true);
        try {
            const finalData = {
                ...form,
                smtp_port: Number(form.smtp_port) || 587
            };
            await updateEmailConfig(activeWorkspaceId, editingId || undefined, finalData);
            appToast.success('Settings Saved', editingId ? 'Email account updated.' : 'New email account added.');
            setIsAddMode(false);
            setEditingId(null);
            resetForm();
        } catch (err: any) {
            appToast.error('Save Failed', err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        if (!activeWorkspaceId || !form.from_address) {
            appToast.error('Incomplete Config', 'Please provide a "From Address" to send the test to.');
            return;
        }
        setIsTesting(true);
        try {
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspace_id: activeWorkspaceId,
                    to: form.from_address,
                    subject_override: 'Test Email from your Dashboard',
                    body_override: `<p>This is a test email to verify your SMTP settings for <b>${form.from_address}</b>. If you received this, your configuration is working correctly!</p>`,
                    config_override: {
                        ...form,
                        smtp_port: Number(form.smtp_port) || 587
                    }
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            appToast.success('Test Sent', `Check your inbox at ${form.from_address}`);
        } catch (err: any) {
            appToast.error('Test Failed', err.message);
        } finally {
            setIsTesting(false);
        }
    };

    const resetForm = () => {
        setForm({
            from_name: '',
            from_address: '',
            smtp_host: '',
            smtp_port: 587,
            smtp_user: '',
            smtp_pass: '',
            smtp_secure: true,
            is_default: false
        });
    };

    const handleEdit = (config: WorkspaceEmailConfig) => {
        setForm(config);
        setEditingId(config.id);
        setIsAddMode(true);
    };

    return (
        <div className="max-w-[800px] mx-auto pb-20 px-4 mt-6">
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className={cn("text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-[#111]")}>
                        Email Configuration
                    </h1>
                    <p className={cn("text-[13px] mt-1", isDark ? "text-white/40" : "text-black/40")}>
                        Manage your SMTP sender accounts and delivery settings.
                    </p>
                </div>
                <Link
                    href="/settings/emails/templates"
                    className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all border shadow-sm",
                        isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-black/5 border-black/10 text-black hover:bg-black/10"
                    )}
                >
                    <Layout size={14} />
                    Email Templates
                </Link>
            </div>

            {/* ── List of Accounts ── */}
            {!isAddMode && (
                <div className="grid grid-cols-1 gap-3">
                    {emailConfigs.map((cfg) => (
                        <div
                            key={cfg.id}
                            className={cn(
                                "group flex items-center justify-between p-4 rounded-2xl border transition-all",
                                isDark ? "bg-[#141414] border-white/5 hover:bg-[#181818]" : "bg-white border-black/5 hover:bg-gray-50",
                                cfg.is_default && (isDark ? "border-primary/30 bg-primary/5" : "border-primary/20 bg-primary/[0.02]")
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                    cfg.is_default ? "bg-primary text-white" : (isDark ? "bg-white/5 text-white/30" : "bg-black/5 text-black/30")
                                )}>
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <h4 className={cn("text-[14px] font-bold flex items-center gap-2", isDark ? "text-white" : "text-[#111]")}>
                                        {cfg.from_name}
                                        {cfg.is_default && (
                                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black tracking-tighter shadow-sm">DEFAULT</span>
                                        )}
                                    </h4>
                                    <p className={cn("text-[12px] opacity-40")}>{cfg.from_address}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!cfg.is_default && (
                                    <button
                                        onClick={() => setDefaultEmailConfig(activeWorkspaceId!, cfg.id)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:bg-primary/10 hover:text-primary",
                                            isDark ? "text-white/40" : "text-black/40"
                                        )}
                                    >
                                        Set as Default
                                    </button>
                                )}
                                <button
                                    onClick={() => handleEdit(cfg)}
                                    className={cn(
                                        "p-2 rounded-lg transition-colors border border-transparent",
                                        isDark ? "text-white/30 hover:text-white hover:bg-white/5" : "text-black/30 hover:text-black hover:bg-black/5"
                                    )}
                                >
                                    <Settings2 size={16} />
                                </button>
                                <button
                                    onClick={() => setToDelete(cfg.id)}
                                    className="p-2 rounded-lg text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={() => { resetForm(); setEditingId(null); setIsAddMode(true); }}
                        className={cn(
                            "flex items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed transition-all active:scale-[0.98]",
                            isDark ? "border-white/5 bg-white/[0.02] text-white/30 hover:bg-white/[0.04] hover:text-white/60 hover:border-white/20" : "border-black/5 bg-black/[0.01] text-black/30 hover:bg-black/[0.03] hover:text-black/60 hover:border-black/20"
                        )}
                    >
                        <Plus size={18} />
                        <span className="text-[14px] font-bold">Add Another Email Account</span>
                    </button>
                </div>
            )}

            {/* ── Form View (Add/Edit) ── */}
            {isAddMode && (
                <div className={cn(
                    "p-8 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300",
                    isDark ? "bg-[#141414] border-[#252525]" : "bg-white border-[#f0f0f0]"
                )}>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                {editingId ? <Settings2 size={20} className="text-primary" /> : <Plus size={20} className="text-primary" />}
                            </div>
                            <div>
                                <h3 className={cn("text-[16px] font-bold", isDark ? "text-white" : "text-[#111]")}>
                                    {editingId ? 'Edit Email Account' : 'Add Email Account'}
                                </h3>
                                <p className={cn("text-[12px] opacity-40")}>Configure your sender identity and SMTP credentials.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setIsAddMode(false); setEditingId(null); }}
                            className={cn("p-2 rounded-full", isDark ? "hover:bg-white/5" : "hover:bg-black/5")}
                        >
                            <X size={20} className="opacity-30" />
                        </button>
                    </div>

                    <div className="space-y-8">
                        {/* Panel 1: Sender */}
                        <div className="space-y-4">
                            <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em] opacity-30", isDark ? "text-white" : "text-black")}>Sender Details</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className={cn("text-[11px] font-bold opacity-40 ml-1")}>Display Name</label>
                                    <input
                                        type="text"
                                        value={form.from_name || ''}
                                        onChange={e => setForm({ ...form, from_name: e.target.value })}
                                        placeholder="Company Name"
                                        className={cn(
                                            "w-full px-4 py-2.5 rounded-xl border outline-none text-[13px] font-medium transition-all",
                                            isDark ? "bg-white/[0.03] border-white/8 text-white focus:border-white/20" : "bg-black/[0.02] border-black/8 text-[#111] focus:border-black/20"
                                        )}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={cn("text-[11px] font-bold opacity-40 ml-1")}>Email Address</label>
                                    <input
                                        type="email"
                                        value={form.from_address || ''}
                                        onChange={e => setForm({ ...form, from_address: e.target.value })}
                                        placeholder="hello@domain.com"
                                        className={cn(
                                            "w-full px-4 py-2.5 rounded-xl border outline-none text-[13px] font-medium transition-all",
                                            isDark ? "bg-white/[0.03] border-white/8 text-white focus:border-white/20" : "bg-black/[0.02] border-black/8 text-[#111] focus:border-black/20"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Panel 2: SMTP */}
                        <div className="space-y-4">
                            <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em] opacity-30", isDark ? "text-white" : "text-black")}>SMTP Server</p>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-1.5">
                                    <label className={cn("text-[11px] font-bold opacity-40 ml-1")}>Hostname</label>
                                    <input
                                        type="text"
                                        value={form.smtp_host || ''}
                                        onChange={e => setForm({ ...form, smtp_host: e.target.value })}
                                        placeholder="smtp.provider.com"
                                        className={cn(
                                            "w-full px-4 py-2.5 rounded-xl border outline-none text-[13px] font-medium transition-all",
                                            isDark ? "bg-white/[0.03] border-white/8 text-white focus:border-white/20" : "bg-black/[0.02] border-black/8 text-[#111] focus:border-black/20"
                                        )}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={cn("text-[11px] font-bold opacity-40 ml-1")}>Port</label>
                                    <input
                                        type="text"
                                        value={form.smtp_port || ''}
                                        onChange={e => setForm({ ...form, smtp_port: Number(e.target.value) || 0 })}
                                        className={cn(
                                            "w-full px-4 py-2.5 rounded-xl border outline-none text-[13px] font-medium transition-all",
                                            isDark ? "bg-white/[0.03] border-white/8 text-white focus:border-white/20" : "bg-black/[0.02] border-black/8 text-[#111] focus:border-black/20"
                                        )}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={cn("text-[11px] font-bold opacity-40 ml-1")}>Username</label>
                                    <input
                                        type="text"
                                        value={form.smtp_user || ''}
                                        onChange={e => setForm({ ...form, smtp_user: e.target.value })}
                                        className={cn(
                                            "w-full px-4 py-2.5 rounded-xl border outline-none text-[13px] font-medium transition-all",
                                            isDark ? "bg-white/[0.03] border-white/8 text-white focus:border-white/20" : "bg-black/[0.02] border-black/8 text-[#111] focus:border-black/20"
                                        )}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={cn("text-[11px] font-bold opacity-40 ml-1")}>Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPass ? "text" : "password"}
                                            value={form.smtp_pass || ''}
                                            onChange={e => setForm({ ...form, smtp_pass: e.target.value })}
                                            className={cn(
                                                "w-full pl-4 pr-10 py-2.5 rounded-xl border outline-none text-[13px] font-medium transition-all",
                                                isDark ? "bg-white/[0.03] border-white/8 text-white focus:border-white/20" : "bg-black/[0.02] border-black/8 text-[#111] focus:border-black/20"
                                            )}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(!showPass)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30"
                                        >
                                            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1.5 flex flex-col justify-end pb-1">
                                    <label className="text-[11px] font-bold opacity-0 select-none">Security</label>
                                    <button
                                        onClick={() => setForm({ ...form, smtp_secure: !form.smtp_secure })}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all border w-full h-[38px] justify-center",
                                            form.smtp_secure 
                                                ? "bg-primary/10 border-primary/20 text-primary" 
                                                : (isDark ? "bg-white/5 border-white/5 text-white/30" : "bg-black/5 border-black/5 text-black/30")
                                        )}
                                    >
                                        <ShieldCheck size={14} />
                                        {form.smtp_secure ? 'SSL Enabled' : 'SSL Disabled'}
                                    </button>
                                    <p className="text-[9px] opacity-20 px-1 italic">Note: Use SSL for port 465, disable for 587.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                            <button
                                onClick={handleTest}
                                disabled={isTesting || !form.smtp_host}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all border min-w-[160px] justify-center",
                                    isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-20" : "bg-black/5 border-black/10 text-black hover:bg-black/10 disabled:opacity-20"
                                )}
                            >
                                {isTesting ? <AppLoader size="xs" /> : <Send size={16} />}
                                {isTesting ? 'Sending Test...' : 'Test Sending!'}
                            </button>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => { setIsAddMode(false); setEditingId(null); }}
                                    className={cn(
                                        "px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all",
                                        isDark ? "text-white/40 hover:text-white hover:bg-white/5" : "text-black/40 hover:text-black hover:bg-black/5"
                                    )}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-[13px] font-bold transition-all bg-primary text-primary-foreground hover:bg-primary-hover shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
                                >
                                    {isSaving ? <AppLoader size="xs" /> : <Check size={16} />}
                                    {editingId ? 'Update & Save' : 'Save Account'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <DeleteConfirmModal
                open={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={async () => {
                    if (toDelete) await deleteEmailConfig(toDelete);
                    setToDelete(null);
                }}
                title="Delete Email Account?"
                description="This will permanently remove this SMTP configuration."
            />
        </div>
    );
}
