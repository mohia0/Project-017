"use client";

import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { AppLoader } from '@/components/ui/AppLoader';
import { appToast } from '@/lib/toast';
import { 
    Zap, 
    Copy, 
    Check, 
    RefreshCcw, 
    Bell, 
    ShieldCheck, 
    ExternalLink,
    AlertCircle,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export default function PlutioSettingsPage() {
    const { activeWorkspaceId, theme } = useUIStore();
    const { fetchToolSettings, updateToolSettings, toolSettings, isLoading } = useSettingsStore();
    const [webhookUrl, setWebhookUrl] = useState('');
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [copiedSecret, setCopiedSecret] = useState(false);
    
    const isDark = theme === 'dark';
    const plutioSettings = toolSettings['plutio'] || {
        enabled: false,
        webhook_secret: '',
        events: ['invoice.paid', 'task.completed', 'project.created']
    };

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchToolSettings(activeWorkspaceId, 'plutio');
        }
    }, [activeWorkspaceId, fetchToolSettings]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWebhookUrl(`${window.location.origin}/api/webhooks/plutio`);
        }
    }, []);

    const handleToggle = async (enabled: boolean) => {
        if (!activeWorkspaceId) return;
        
        let secret = plutioSettings.webhook_secret;
        if (enabled && !secret) {
            secret = `pl_wh_${uuidv4().replace(/-/g, '')}`;
        }

        try {
            await updateToolSettings(activeWorkspaceId, 'plutio', {
                ...plutioSettings,
                enabled,
                webhook_secret: secret
            });
            appToast.success(enabled ? 'Plutio integration enabled' : 'Plutio integration disabled');
        } catch (error) {
            appToast.error('Failed to update settings');
        }
    };

    const generateSecret = async () => {
        if (!activeWorkspaceId) return;
        const newSecret = `pl_wh_${uuidv4().replace(/-/g, '')}`;
        try {
            await updateToolSettings(activeWorkspaceId, 'plutio', {
                ...plutioSettings,
                webhook_secret: newSecret
            });
            appToast.success('New webhook secret generated');
        } catch (error) {
            appToast.error('Failed to generate secret');
        }
    };

    const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        appToast.success('Copied to clipboard');
    };

    if (isLoading && !toolSettings['plutio']) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <AppLoader size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section with toggle */}
            <div className={cn(
                "p-6 rounded-[24px] border transition-all duration-300",
                isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-white border-[#ebebeb] shadow-sm"
            )}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-[16px] flex items-center justify-center",
                            isDark ? "bg-primary/10 text-primary" : "bg-primary/5 text-primary"
                        )}>
                            <Zap size={24} fill="currentColor" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Plutio Notifications</h1>
                            <p className={cn("text-sm mt-0.5", isDark ? "text-[#888]" : "text-[#666]")}>
                                Push real-time notifications from your Plutio account to this dashboard.
                            </p>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => handleToggle(!plutioSettings.enabled)}
                        className={cn(
                            "w-12 h-6 rounded-full relative transition-all duration-300",
                            plutioSettings.enabled ? "bg-primary" : (isDark ? "bg-[#333]" : "bg-[#e5e5e5]")
                        )}
                    >
                        <div className={cn(
                            "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300",
                            plutioSettings.enabled ? "left-7" : "left-1"
                        )} />
                    </button>
                </div>
            </div>

            {/* Main configuration (only shown if enabled) */}
            <div className={cn(
                "space-y-6 transition-all duration-500",
                plutioSettings.enabled ? "opacity-100 translate-y-0" : "opacity-40 pointer-events-none translate-y-4"
            )}>
                {/* Steps Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#888] px-1">Setup Instructions</h3>
                    
                    <div className="grid gap-4">
                        {/* Step 1: Webhook URL */}
                        <div className={cn(
                            "p-5 rounded-[20px] border",
                            isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-white border-[#ebebeb]"
                        )}>
                            <div className="flex items-start gap-4">
                                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", 
                                    isDark ? "bg-[#333] text-[#888]" : "bg-[#f0f0f0] text-[#777]")}>1</div>
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <h4 className="text-[15px] font-bold">Copy your Webhook URL</h4>
                                        <p className={cn("text-xs mt-1", isDark ? "text-[#666]" : "text-[#999]")}>
                                            Go to your Plutio dashboard → <span className="font-semibold">Settings</span> → <span className="font-semibold">API</span> and paste this URL into the Webhook field.
                                        </p>
                                        {!webhookUrl.startsWith('https') && (
                                            <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-500 font-medium">
                                                <AlertCircle size={12} />
                                                Plutio requires a public HTTPS URL. Localhost URLs will not work.
                                            </div>
                                        )}
                                    </div>
                                    <div className={cn(
                                        "flex items-center gap-2 p-2 rounded-[12px] border group",
                                        isDark ? "bg-black/20 border-[#252525]" : "bg-[#f9f9fb] border-[#ebebeb]"
                                    )}>
                                        <code className={cn("flex-1 text-[11px] font-mono px-2 truncate", isDark ? "text-primary" : "text-primary")}>
                                            {webhookUrl ? `${webhookUrl}?workspace_id=${activeWorkspaceId}` : 'Loading URL...'}
                                        </code>
                                        <button 
                                            onClick={() => copyToClipboard(webhookUrl ? `${webhookUrl}?workspace_id=${activeWorkspaceId}` : '', setCopiedUrl)}
                                            className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95",
                                                isDark ? "hover:bg-white/5 text-[#555] hover:text-white" : "hover:bg-white text-[#999] hover:text-black shadow-sm"
                                            )}
                                        >
                                            {copiedUrl ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Advanced (Optional) */}
                        <div className={cn(
                            "p-5 rounded-[20px] border border-dashed opacity-70",
                            isDark ? "bg-black/10 border-[#252525]" : "bg-black/[0.02] border-[#ebebeb]"
                        )}>
                            <div className="flex items-start gap-4">
                                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", 
                                    isDark ? "bg-[#333] text-[#888]" : "bg-[#f0f0f0] text-[#777]")}>2</div>
                                <div className="flex-1">
                                     <h4 className="text-[13px] font-bold">Advanced: Security (Optional)</h4>
                                     <p className={cn("text-[11px] mt-1 pr-4", isDark ? "text-[#555]" : "text-[#aaa]")}>
                                         If you use the standalone **Webhooks** section in Plutio, you can add a custom header `x-plutio-secret` with the value:
                                         <span className="font-mono ml-2 text-primary">{plutioSettings.webhook_secret}</span>
                                     </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Help Link */}
                        <a 
                            href="https://docs.plutio.com/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={cn(
                                "p-4 rounded-[20px] border flex items-center justify-between group transition-all",
                                isDark ? "bg-black/20 border-[#252525] hover:border-[#333]" : "bg-[#f9f9fb] border-[#ebebeb] hover:border-[#ddd]"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", isDark ? "bg-primary/10" : "bg-primary/5")}>
                                    <Info size={16} className="text-primary" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold">Plutio API Documentation</h4>
                                    <p className={cn("text-[11px]", isDark ? "text-[#555]" : "text-[#aaa]")}>Need help finding webhook settings in Plutio?</p>
                                </div>
                            </div>
                            <ExternalLink size={14} className={cn("transition-transform group-hover:translate-x-1", isDark ? "text-[#333]" : "text-[#ccc]")} />
                        </a>
                    </div>
                </div>

                {/* Notifications Config */}
                <div className={cn(
                    "p-6 rounded-[24px] border",
                    isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-white border-[#ebebeb]"
                )}>
                    <div className="flex items-center gap-3 mb-6">
                        <Bell size={18} className="text-primary" />
                        <h3 className="text-[15px] font-bold">Proposal & Invoice Tracking</h3>
                    </div>
                    
                    <div className="grid gap-3">
                        {[
                            { id: 'view_events', label: 'Proposal & Invoice Views', desc: 'Get notified as soon as a client opens your documents.' },
                        ].map((event) => (
                            <div key={event.id} className={cn(
                                "flex items-center justify-between p-4 rounded-[16px] transition-colors",
                                isDark ? "bg-white/[0.02] hover:bg-white/[0.04]" : "bg-black/[0.01] hover:bg-black/[0.03]"
                            )}>
                                <div>
                                    <p className="text-sm font-semibold">{event.label}</p>
                                    <p className={cn("text-[10px] uppercase font-bold tracking-wider mt-0.5", isDark ? "text-[#444]" : "text-[#bbb]")}>{event.desc}</p>
                                </div>
                                <div className={cn(
                                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all bg-primary border-primary text-white"
                                )}>
                                    <Check size={12} strokeWidth={4} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={cn(
                        "mt-6 flex items-center gap-3 p-4 rounded-[16px]",
                        isDark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200"
                    )}>
                        <AlertCircle size={16} className="text-amber-500 shrink-0" />
                        <p className={cn("text-[11px] font-medium leading-normal", isDark ? "text-amber-200/60" : "text-amber-700/70")}>
                            Note: Only "viewed" and "opened" events for proposals and invoices will trigger notifications.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
