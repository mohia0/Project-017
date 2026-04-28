"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsInput } from '@/components/settings/SettingsField';
import { useSettingsStore, WorkspaceDomain } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Plus, Globe, Check, RefreshCw, Copy, Trash2, ExternalLink, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { AppLoader } from '@/components/ui/AppLoader';

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
                <AppLoader size="xs" /> Verifying...
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

function HelpTip({ text, isDark }: { text: string; isDark: boolean }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative flex items-center justify-center">
            <button
                type="button"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                className={cn('opacity-30 hover:opacity-100 transition-all p-1.5 rounded-lg', isDark ? 'text-white hover:bg-white/10' : 'text-black hover:bg-black/10')}
            >
                <HelpCircle size={15} strokeWidth={2.5} />
            </button>
            {show && (
                <div className={cn(
                    'absolute bottom-full right-0 mb-2 w-64 px-3 py-2.5 rounded-xl text-[11px] shadow-2xl z-[100] pointer-events-none leading-relaxed animate-in fade-in zoom-in-95 duration-200',
                    isDark ? 'bg-[#222] text-white/80 border border-white/10' : 'bg-white text-black/70 border border-black/10'
                )}>
                    {text}
                </div>
            )}
        </div>
    );
}


// ── DNSRecordCard ─────────────────────────────────────────────────────────────
// Shows the exact DNS records returned by Vercel for this domain.
// They're fetched + stored in the DB when the user clicks "Add Domain".
function DNSRecordCard({ domain, onRefetch }: { domain: WorkspaceDomain; onRefetch: () => void }) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    if (domain.status === 'active') return null;

    const records = domain.dns_records;

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
            {!records || records.length === 0 ? (
                // Loading state — records are being fetched from Vercel
                <div className="flex items-center gap-2">
                    <AppLoader size="xs" />
                    <span className="text-[12px] opacity-40">Generating your custom connection settings...</span>
                    <button
                        onClick={onRefetch}
                        className="ml-auto text-[11px] font-semibold text-[#4dbf39] hover:underline"
                    >
                        Refresh
                    </button>
                </div>
            ) : (
                <>
                    <p className="text-[12px] opacity-50 font-medium">
                        Add these DNS records to your provider, then click <strong>Verify DNS</strong>:
                    </p>
                    <div className="flex flex-col gap-2">
                        {records.map((rec, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg p-3 px-4 text-[13px]",
                                    isDark ? "bg-[#1a1a1c]" : "bg-[#efefef]"
                                )}
                            >
                                {/* Type */}
                                <div className="flex items-center gap-1.5">
                                    <span className="opacity-40 text-[11px] font-bold uppercase tracking-tight">Type:</span>
                                    <span className={cn(
                                        "font-mono font-bold",
                                        rec.type === 'A' ? "text-blue-500" : rec.type === 'TXT' ? "text-purple-500" : ""
                                    )}>{rec.type}</span>
                                </div>
                                {/* Name */}
                                <div className="flex items-center gap-1.5">
                                    <span className="opacity-40 text-[11px] font-bold uppercase tracking-tight">Name:</span>
                                    <span className="font-mono font-bold">{rec.name}</span>
                                    <button
                                        onClick={() => copyValue(`${i}-name`, rec.name)}
                                        className="text-[#4dbf39] flex items-center justify-center p-1 hover:bg-[#4dbf39]/10 rounded-md transition-colors"
                                    >
                                        {copiedKey === `${i}-name` ? <Check size={12} /> : <Copy size={12} />}
                                    </button>
                                </div>
                                {/* Value */}
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="opacity-40 text-[11px] font-bold uppercase tracking-tight shrink-0">
                                        {rec.type === 'A' ? 'Value:' : 'Target:'}
                                    </span>
                                    <span className="font-mono font-bold text-[12px] truncate max-w-[260px]" title={rec.value}>{rec.value}</span>
                                    <button
                                        onClick={() => copyValue(`${i}-val`, rec.value)}
                                        className="text-[#4dbf39] flex items-center justify-center p-1 hover:bg-[#4dbf39]/10 rounded-md transition-colors shrink-0"
                                    >
                                        {copiedKey === `${i}-val` ? <Check size={12} /> : <Copy size={12} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default function DomainsSettingsPage() {
    const { activeWorkspaceId } = useUIStore();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { domains, fetchDomains, hasFetched } = useSettingsStore();
    const { workspaces } = useWorkspaceStore();
    
    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const domainSuffix = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'aroooxa.com';
    // Subdomain portal URL: slug.aroooxa.com
    const systemPortalUrl = activeWorkspace?.slug ? `https://${activeWorkspace.slug}.${domainSuffix}` : null;
    const [newDomain, setNewDomain] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [domainToDelete, setDomainToDelete] = useState<{ id: string, name: string } | null>(null);
    const [mounted, setMounted] = useState(false);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [verifyMessages, setVerifyMessages] = useState<Record<string, { type: 'error' | 'success', text: string }>>({});

    useEffect(() => {
        setMounted(true);
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

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [activeWorkspaceId, fetchDomains]);

    if (!activeWorkspaceId || !mounted || !hasFetched.domains) {
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
        
        // 1. Save to database first (status = pending, dns_records = [])
        const { data: inserted, error } = await supabase.from('workspace_domains').insert({
            workspace_id: activeWorkspaceId,
            domain: cleanDomain,
            status: 'pending',
            is_primary: domains.length === 0,
        }).select().single();
        
        if (error || !inserted) {
            setIsAdding(false);
            return;
        }

        setNewDomain('');
        fetchDomains(activeWorkspaceId);

        // 2. Immediately call verify to register with Vercel + get real DNS records
        try {
            await fetch('/api/domains/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domainId: inserted.id, domain: cleanDomain }),
            });
            fetchDomains(activeWorkspaceId);
        } catch {}

        setIsAdding(false);
    };


    const handleRemoveDomain = async (id: string, name: string) => {
        try {
            await fetch('/api/domains/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domainId: id, domainName: name }),
            });
            if (activeWorkspaceId) fetchDomains(activeWorkspaceId);
        } catch (err) {
            console.error('Failed to delete domain:', err);
        }
    };

    const handleSetPrimary = async (id: string) => {
        if (!activeWorkspaceId) return;
        await supabase.from('workspace_domains').update({ is_primary: false }).eq('workspace_id', activeWorkspaceId);
        await supabase.from('workspace_domains').update({ is_primary: true }).eq('id', id);
        fetchDomains(activeWorkspaceId);
    };

    const handleVerifyDomain = async (domainId: string, domainName: string) => {
        setVerifyingId(domainId);
        setVerifyMessages(prev => ({ ...prev, [domainId]: { type: 'success', text: 'Checking...' } }));
        try {
            const res = await fetch('/api/domains/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domainId, domain: domainName })
            });
            const data = await res.json();
            
            if (!res.ok) {
                setVerifyMessages(prev => ({ ...prev, [domainId]: { type: 'error', text: data.error || 'Server error' } }));
            } else if (data.verified === false) {
                setVerifyMessages(prev => ({ ...prev, [domainId]: { type: 'error', text: data.error || 'DNS not propagated yet.' } }));
            } else {
                setVerifyMessages(prev => ({ ...prev, [domainId]: { type: 'success', text: 'Domain linked to aroooxa successfully!' } }));
                // Auto-hide success message after 5s
                setTimeout(() => {
                    setVerifyMessages(prev => {
                        const next = { ...prev };
                        delete next[domainId];
                        return next;
                    });
                }, 5000);
            }
            
            // Update Supabase manually here to reflect the latest status!
            const newStatus = data.verified ? 'active' : 'pending';
            await supabase.from('workspace_domains').update({ status: newStatus }).eq('id', domainId);
            if (activeWorkspaceId) fetchDomains(activeWorkspaceId);

        } catch (err: any) {
            setVerifyMessages(prev => ({ ...prev, [domainId]: { type: 'error', text: 'Network connection failed.' } }));
        }
        setVerifyingId(null);
    };

    if (!activeWorkspaceId) return <div>Loading...</div>;

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8">
            {systemPortalUrl && (
                <SettingsCard
                    title="Your Portal URL"
                    description="This is your unique system-provided access URL. Share it with clients."
                >
                    <div className={cn(
                        "p-4 border rounded-xl flex items-center justify-between",
                        isDark ? "border-white/10 bg-white/[0.02]" : "border-black/10 bg-white/50"
                    )}>
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                isDark ? "bg-white/5 text-[#4dbf39]" : "bg-[#4dbf39]/10 text-[#4dbf39]"
                            )}>
                                <Globe size={14} />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm font-mono">{systemPortalUrl.replace('https://', '')}</span>
                                <span className="inline-flex mt-1 items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#4dbf39]/10 text-[#4dbf39] w-fit">
                                    <Check size={12} /> Active
                                </span>
                            </div>
                        </div>
                        <a 
                            href={systemPortalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 h-8 rounded-lg text-xs font-semibold flex items-center transition-colors dark:bg-white/10 dark:hover:bg-white/20 bg-black/5 hover:bg-black/10"
                        >
                            <ExternalLink size={12} className="mr-1.5" /> Visit
                        </a>
                    </div>
                </SettingsCard>
            )}
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
                        {isAdding ? <AppLoader size="xs" /> : <Plus size={16} />}
                        Add Domain
                    </button>
                </form>
            </SettingsCard>

            {domains.length > 0 && (
                <SettingsCard
                    title="Your Domains"
                    description="Domains linked to this workspace."
                    extra={<HelpTip isDark={isDark} text="Link your own domain to white-label your client portal. Once DNS records are verified, you can set it as the primary access point for your workspace." />}
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
                                             <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-semibold text-sm truncate">{domain.domain}</span>
                                                <a 
                                                    href={`https://${domain.domain}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={cn(
                                                        "opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center translate-y-[1px]",
                                                        isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60"
                                                    )}

                                                    title={`Visit ${domain.domain}`}
                                                >
                                                    <ExternalLink size={11} strokeWidth={2.5} />
                                                </a>
                                                
                                                {domain.is_primary && (
                                                    <span className={cn(
                                                        "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ml-0.5",
                                                        isDark ? "bg-white/10" : "bg-black/5"
                                                    )}>Primary</span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 mt-1">
                                                <DomainStatusBadge domain={domain} />
                                            </div>

                                            {domain.status === 'active' && (
                                                <div className={cn(
                                                    "mt-3 pt-3 border-t flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-700",
                                                    isDark ? "border-white/5" : "border-black/5"
                                                )}>
                                                    <div className="flex shrink-0 w-1.5 h-1.5 rounded-full bg-[#4dbf39] animate-pulse" />
                                                    <span className={cn(
                                                        "text-[10px] font-semibold tracking-tight",
                                                        isDark ? "text-white/20" : "text-black/30"
                                                    )}>
                                                        Domain confirmed. It may take up to 30 minutes for DNS & SSL to manifest globally.
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 shrink-0">
                                        {domain.status !== 'active' && (
                                            <button
                                                onClick={() => handleVerifyDomain(domain.id, domain.domain)}
                                                disabled={verifyingId === domain.id}
                                                className={cn(
                                                    "px-3 h-8 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors",
                                                    isDark ? "bg-white/10 hover:bg-white/20" : "bg-black/5 hover:bg-black/10",
                                                    verifyingId === domain.id && "opacity-60 cursor-not-allowed"
                                                )}
                                            >
                                                {verifyingId === domain.id ? <AppLoader size="xs" /> : <RefreshCw size={12} />}
                                                {verifyingId === domain.id ? 'Checking...' : 'Verify DNS'}
                                            </button>
                                        )}
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
                                            onClick={() => setDomainToDelete({ id: domain.id, name: domain.domain })}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove Domain"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {verifyMessages[domain.id] && (
                                    <div className={cn(
                                        "mx-4 mt-1 px-3 py-2 text-[11px] font-medium rounded-lg border",
                                        verifyMessages[domain.id].type === 'error' ? (isDark ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-red-50 text-red-600 border-red-100") :
                                        (isDark ? "bg-[#4dbf39]/10 text-[#4dbf39] border-[#4dbf39]/20" : "bg-green-50 text-green-600 border-green-100")
                                    )}>
                                        {verifyMessages[domain.id].text}
                                    </div>
                                )}

                                <DNSRecordCard 
                                    domain={domain} 
                                    onRefetch={() => fetchDomains(activeWorkspaceId!)}
                                />
                            </div>
                        ))}
                    </div>
                </SettingsCard>
            )}

            <DeleteConfirmModal
                open={!!domainToDelete}
                onClose={() => setDomainToDelete(null)}
                onConfirm={() => { if (domainToDelete) handleRemoveDomain(domainToDelete.id, domainToDelete.name); }}
                title="Remove domain"
                description="Are you sure you want to remove this domain? This will disconnect it from your workspace and cannot be undone."
                isDark={isDark}
            />
        </div>
    );
}
