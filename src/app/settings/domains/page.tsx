"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput } from '@/components/settings/SettingsField';
import { useSettingsStore, WorkspaceDomain } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { Plus, Globe, Check, AlertCircle, RefreshCw, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

function DomainStatusBadge({ domain }: { domain: WorkspaceDomain }) {
    if (domain.status === 'active' && domain.ssl_status === 'active') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#4dbf39]/10 text-[#4dbf39]">
                <Check size={12} /> Active
            </span>
        );
    }
    
    if (domain.status === 'pending' || domain.status === 'verifying') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-500">
                <RefreshCw size={12} className={domain.status === 'verifying' ? "animate-spin" : ""} />
                {domain.status === 'pending' ? 'Pending DNS' : 'Verifying...'}
            </span>
        );
    }

    if (domain.status === 'active' && domain.ssl_status !== 'active') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-500">
                <RefreshCw size={12} className="animate-spin" /> Provisioning SSL
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-500">
            <AlertCircle size={12} /> Error
        </span>
    );
}

function DNSRecordCopy({ domain }: { domain: WorkspaceDomain }) {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText('proxy.minimal-crm.app');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (domain.status === 'active') return null;

    return (
        <div className="mt-3 p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
            <p className="text-xs text-black/60 dark:text-white/60 mb-2">
                Add this CNAME record to your DNS provider to verify ownership:
            </p>
            <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-xs bg-black/5 dark:bg-black/40 px-3 py-2 rounded flex items-center justify-between">
                    <span>
                        <span className="opacity-50 select-none mr-2">Type: </span>CNAME
                    </span>
                    <span>
                        <span className="opacity-50 select-none mr-2">Name: </span>
                        {domain.domain.split('.')[0] === domain.domain ? '@' : domain.domain.split('.')[0]}
                    </span>
                    <span>
                        <span className="opacity-50 select-none mr-2">Target: </span>proxy.minimal-crm.app
                    </span>
                </div>
                <button 
                    onClick={handleCopy}
                    className="shrink-0 h-8 px-3 flex items-center justify-center gap-1.5 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors text-xs font-semibold"
                >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            {domain.error_message && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle size={12} /> {domain.error_message}
                </p>
            )}
        </div>
    );
}

export default function DomainsSettingsPage() {
    const { activeWorkspaceId } = useUIStore();
    const { domains, fetchDomains } = useSettingsStore();
    const [newDomain, setNewDomain] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isVerifyingId, setIsVerifyingId] = useState<string | null>(null);

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchDomains(activeWorkspaceId);
            
            // Subscribe to real-time changes for this workspace's domains
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
                
            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [activeWorkspaceId, fetchDomains]);

    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeWorkspaceId || !newDomain) return;
        
        setIsAdding(true);
        // Normalize domain
        let cleanDomain = newDomain.toLowerCase().trim();
        cleanDomain = cleanDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        
        const { error } = await supabase.from('workspace_domains').insert({
            workspace_id: activeWorkspaceId,
            domain: cleanDomain,
            is_primary: domains.length === 0, // make primary if first
        });
        
        setIsAdding(false);
        if (!error) {
            setNewDomain('');
            fetchDomains(activeWorkspaceId);
        }
    };

    const handleRemoveDomain = async (id: string) => {
        if (!confirm('Are you sure you want to remove this domain?')) return;
        await supabase.from('workspace_domains').delete().eq('id', id);
        if (activeWorkspaceId) fetchDomains(activeWorkspaceId);
    };

    const handleSetPrimary = async (id: string) => {
        if (!activeWorkspaceId) return;
        // Turn off all other primaries
        await supabase.from('workspace_domains').update({ is_primary: false }).eq('workspace_id', activeWorkspaceId);
        // Turn on this one
        await supabase.from('workspace_domains').update({ is_primary: true }).eq('id', id);
        fetchDomains(activeWorkspaceId);
    };

    const triggerVerification = async (domainObj: WorkspaceDomain) => {
        setIsVerifyingId(domainObj.id);
        
        // Optimistically set to verifying
        await supabase.from('workspace_domains').update({ status: 'verifying' }).eq('id', domainObj.id);
        if (activeWorkspaceId) fetchDomains(activeWorkspaceId);
        
        try {
            // This invokes the Supabase Edge Function that would do the DNS check
            const { error } = await supabase.functions.invoke('verify-domain', {
                body: { domainId: domainObj.id }
            });
            
            if (error) throw error;
        } catch (e: any) {
            // Note: If the edge function doesn't exist yet, we catch the error 
            // and fail gracefully to show testing state
            console.error("Verification error or function missing:", e);
            setTimeout(async () => {
                await supabase.from('workspace_domains')
                    .update({ status: 'error', error_message: 'Verification Edge Function not deployed yet.' })
                    .eq('id', domainObj.id);
                if (activeWorkspaceId) fetchDomains(activeWorkspaceId);
                setIsVerifyingId(null);
            }, 1500);
            return;
        }
        
        setIsVerifyingId(null);
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
                            <div key={domain.id} className="p-4 border border-black/10 dark:border-white/10 rounded-xl bg-white/50 dark:bg-black/20 group">
                                <div className="flex items-center gap-3 justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                                            <Globe size={14} className="text-black/50 dark:text-white/50" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm truncate">{domain.domain}</span>
                                                {domain.is_primary && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wide bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">Primary</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <DomainStatusBadge domain={domain} />
                                                {domain.status === 'active' && domain.ssl_status === 'active' && (
                                                    <span className="text-xs text-black/40 dark:text-white/40 flex items-center gap-1">
                                                        <Check size={10} /> SSL secured
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 shrink-0">
                                        {domain.status !== 'active' && (
                                            <button
                                                onClick={() => triggerVerification(domain)}
                                                disabled={isVerifyingId === domain.id || domain.status === 'verifying'}
                                                className="px-3 h-8 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                                            >
                                                Verify DNS
                                            </button>
                                        )}
                                        {domain.status === 'active' && !domain.is_primary && (
                                            <button
                                                onClick={() => handleSetPrimary(domain.id)}
                                                className="px-3 h-8 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                Make Primary
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleRemoveDomain(domain.id)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove Domain"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <DNSRecordCopy domain={domain} />
                            </div>
                        ))}
                    </div>
                </SettingsCard>
            )}
        </div>
    );
}
