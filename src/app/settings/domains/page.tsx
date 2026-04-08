"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsInput } from '@/components/settings/SettingsField';
import { useSettingsStore, WorkspaceDomain } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { Plus, Globe, Check, RefreshCw, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';

function DomainStatusBadge({ domain }: { domain: WorkspaceDomain }) {
    if (domain.status === 'active') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#4dbf39]/10 text-[#4dbf39]">
                <Check size={12} /> Verified
            </span>
        );
    }
    
    if (domain.status === 'verifying') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-500">
                <RefreshCw size={12} className="animate-spin" /> Verifying...
            </span>
        );
    }

    // pending, error, or anything else → show as Pending DNS
    return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-500">
            <RefreshCw size={12} /> Pending DNS
        </span>
    );
}

function DNSRecordCard({ domain }: { domain: WorkspaceDomain }) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    if (domain.status === 'active') return null;

    const subdomain = domain.domain.split('.')[0] === domain.domain ? '@' : domain.domain.split('.')[0];
    const target = 'cname.vercel-dns.com';

    const copyValue = (key: string, value: string) => {
        navigator.clipboard.writeText(value);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    return (
        <div className={cn(
            "mt-3 p-4 rounded-xl flex flex-col gap-3 border",
            isDark ? "bg-[#111] border-white/5" : "bg-[#f5f5f5] border-black/5"
        )}>
            <p className="text-[12px] opacity-50 font-medium">
                Add this CNAME record to your DNS provider to verify ownership:
            </p>
            <div className={cn(
                "flex flex-wrap items-center gap-x-10 gap-y-3 rounded-lg p-3 px-4 text-[13px]",
                isDark ? "bg-[#1a1a1c]" : "bg-[#efefef]"
            )}>
                {/* Type */}
                <div className="flex items-center gap-2">
                    <span className="opacity-40 text-[11px] font-bold uppercase tracking-tight">Type:</span>
                    <span className="font-mono font-bold">CNAME</span>
                    <button
                        onClick={() => copyValue('type', 'CNAME')}
                        className="text-[#4dbf39] flex items-center justify-center p-1 hover:bg-[#4dbf39]/10 rounded-md transition-colors"
                        title="Copy Type"
                    >
                        {copiedKey === 'type' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                </div>
                {/* Name */}
                <div className="flex items-center gap-2">
                    <span className="opacity-40 text-[11px] font-bold uppercase tracking-tight">Name:</span>
                    <span className="font-mono font-bold">{subdomain}</span>
                    <button
                        onClick={() => copyValue('name', subdomain)}
                        className="text-[#4dbf39] flex items-center justify-center p-1 hover:bg-[#4dbf39]/10 rounded-md transition-colors"
                        title="Copy Name"
                    >
                        {copiedKey === 'name' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                </div>
                {/* Target */}
                <div className="flex items-center gap-2">
                    <span className="opacity-40 text-[11px] font-bold uppercase tracking-tight">Target:</span>
                    <span className="font-mono font-bold">{target}</span>
                    <button
                        onClick={() => copyValue('target', target)}
                        className="text-[#4dbf39] flex items-center justify-center p-1 hover:bg-[#4dbf39]/10 rounded-md transition-colors"
                        title="Copy Target"
                    >
                        {copiedKey === 'target' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function DomainsSettingsPage() {
    const { activeWorkspaceId } = useUIStore();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { domains, fetchDomains } = useSettingsStore();
    const [newDomain, setNewDomain] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [domainToDelete, setDomainToDelete] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchDomains(activeWorkspaceId);
            
            const channel = supabase.channel('domain_updates')
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'workspace_domains',
                    filter: `workspace_id=eq.${activeWorkspaceId}` 
                }, () => {
                    fetchDomains(activeWorkspaceId);
                })
                .subscribe();

            const t = setTimeout(() => setMounted(true), 80);
                
            return () => {
                supabase.removeChannel(channel);
                clearTimeout(t);
            };
        }
    }, [activeWorkspaceId, fetchDomains]);

    if (!activeWorkspaceId || !mounted) {
        return (
            <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8 animate-pulse">
                <div className={cn("h-24 rounded-2xl", isDark ? "bg-white/5" : "bg-black/5")} />
                <div className={cn("h-40 rounded-2xl", isDark ? "bg-white/5" : "bg-black/5")} />
            </div>
        );
    }

    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeWorkspaceId || !newDomain) return;
        
        setIsAdding(true);
        let cleanDomain = newDomain.toLowerCase().trim();
        cleanDomain = cleanDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        
        const { error } = await supabase.from('workspace_domains').insert({
            workspace_id: activeWorkspaceId,
            domain: cleanDomain,
            status: 'pending',
            is_primary: domains.length === 0,
        });
        
        setIsAdding(false);
        if (!error) {
            setNewDomain('');
            fetchDomains(activeWorkspaceId);
        }
    };

    const handleRemoveDomain = async (id: string) => {
        await supabase.from('workspace_domains').delete().eq('id', id);
        if (activeWorkspaceId) fetchDomains(activeWorkspaceId);
    };

    const handleSetPrimary = async (id: string) => {
        if (!activeWorkspaceId) return;
        await supabase.from('workspace_domains').update({ is_primary: false }).eq('workspace_id', activeWorkspaceId);
        await supabase.from('workspace_domains').update({ is_primary: true }).eq('id', id);
        fetchDomains(activeWorkspaceId);
    };

    if (!activeWorkspaceId) return <div>Loading...</div>;

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8">
            <SettingsCard
                title="Add Custom Domain"
                description="Use your own domain for client portals and document share links."
            >
                <form onSubmit={handleAddDomain} className="flex gap-3">
                    <div className="flex-1">
                        <SettingsInput 
                            placeholder="e.g. portal.yourdomain.com"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit"
                        disabled={!newDomain || isAdding}
                        className="shrink-0 h-10 px-4 rounded-xl flex items-center justify-center gap-2 bg-black text-white dark:bg-white dark:text-black font-semibold text-sm disabled:opacity-50"
                    >
                        {isAdding ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                        Add Domain
                    </button>
                </form>
            </SettingsCard>

            {domains.length > 0 && (
                <SettingsCard
                    title="Your Domains"
                    description="Domains linked to this workspace."
                >
                    <div className="flex flex-col gap-4">
                        {domains.map((domain) => (
                            <div key={domain.id} className={cn(
                                "p-4 border rounded-xl group transition-all",
                                isDark ? "border-white/10 bg-white/[0.02]" : "border-black/10 bg-white/50"
                            )}>
                                <div className="flex items-center gap-3 justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                            isDark ? "bg-white/5" : "bg-black/5"
                                        )}>
                                            <Globe size={14} className="opacity-50" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm truncate">{domain.domain}</span>
                                                {domain.is_primary && (
                                                    <span className={cn(
                                                        "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
                                                        isDark ? "bg-white/10" : "bg-black/5"
                                                    )}>Primary</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <DomainStatusBadge domain={domain} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 shrink-0">
                                        {domain.status === 'active' && !domain.is_primary && (
                                            <button
                                                onClick={() => handleSetPrimary(domain.id)}
                                                className={cn(
                                                    "px-3 h-8 rounded-lg text-xs font-semibold transition-colors opacity-0 group-hover:opacity-100",
                                                    isDark ? "bg-white/10 hover:bg-white/20" : "bg-black/5 hover:bg-black/10"
                                                )}
                                            >
                                                Make Primary
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setDomainToDelete(domain.id)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove Domain"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <DNSRecordCard domain={domain} />
                            </div>
                        ))}
                    </div>
                </SettingsCard>
            )}

            <DeleteConfirmModal
                open={!!domainToDelete}
                onClose={() => setDomainToDelete(null)}
                onConfirm={() => { if (domainToDelete) handleRemoveDomain(domainToDelete); }}
                title="Remove domain"
                description="Are you sure you want to remove this domain? This will disconnect it from your workspace and cannot be undone."
                isDark={isDark}
            />
        </div>
    );
}
