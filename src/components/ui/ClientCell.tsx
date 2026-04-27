"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Search, Plus, User, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dropdown } from '@/components/ui/Dropdown';
import { useClientStore } from '@/store/useClientStore';
import ClientEditor from '@/components/clients/ClientEditor';
import { appToast } from '@/lib/toast';
import { Avatar } from '@/components/ui/Avatar';

export interface AssignedClient {
    id: string;
    name: string;
    avatar_url?: string | null;
}

interface ClientCellProps {
    assignedClients?: AssignedClient[];
    currentName?: string;
    currentId?: string | null;
    onAssignClients: (clients: AssignedClient[]) => void;
    isDark: boolean;
    variant?: 'table' | 'card';
}

/**
 * Reusable search-and-select component for assigning clients.
 * Supports multi-client pill display, inline search, and "Create new contact".
 * Previously duplicated in invoices/page.tsx and proposals/page.tsx.
 */
export function ClientCell({
    assignedClients,
    currentName,
    currentId,
    onAssignClients,
    isDark,
    variant = 'table',
}: ClientCellProps) {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isClientEditorOpen, setIsClientEditorOpen] = useState(false);
    const { clients, fetchClients, addClient } = useClientStore();

    const handleCreateClient = async (data: any) => {
        const client = await addClient(data);
        if (client) {
            onAssignClients([
                ...activeClients,
                { id: client.id, name: client.contact_person || client.company_name || '', avatar_url: client.avatar_url },
            ]);
            setIsClientEditorOpen(false);
            setOpen(false);
            appToast.success('Contact created and selected');
        }
    };

    useEffect(() => {
        if (clients.length === 0) fetchClients();
    }, [clients.length, fetchClients]);

    useEffect(() => {
        if (open) setSearch('');
    }, [open]);

    const filtered = useMemo(() => {
        if (!search) return clients;
        const s = search.toLowerCase();
        
        const matched = clients.filter(
            (c) =>
                c.contact_person?.toLowerCase().includes(s) ||
                c.company_name?.toLowerCase().includes(s)
        );

        matched.sort((a, b) => {
            const aName = a.contact_person?.toLowerCase() || '';
            const bName = b.contact_person?.toLowerCase() || '';
            const aComp = a.company_name?.toLowerCase() || '';
            const bComp = b.company_name?.toLowerCase() || '';

            let scoreA = 0;
            if (aName === s) scoreA += 100;
            else if (aName.startsWith(s)) scoreA += 50;
            else if (aName.includes(s)) scoreA += 10;
            
            if (aComp === s) scoreA += 5;
            else if (aComp.startsWith(s)) scoreA += 2;
            else if (aComp.includes(s)) scoreA += 1;

            let scoreB = 0;
            if (bName === s) scoreB += 100;
            else if (bName.startsWith(s)) scoreB += 50;
            else if (bName.includes(s)) scoreB += 10;
            
            if (bComp === s) scoreB += 5;
            else if (bComp.startsWith(s)) scoreB += 2;
            else if (bComp.includes(s)) scoreB += 1;

            return scoreB - scoreA;
        });

        return matched;
    }, [clients, search]);

    const activeClient = useMemo(() => clients.find((c) => c.id === currentId), [clients, currentId]);

    const activeClients: AssignedClient[] = useMemo(() => {
        const base = assignedClients?.length
            ? assignedClients
            : currentId
            ? [{ id: currentId, name: currentName || '', avatar_url: activeClient?.avatar_url }]
            : [];
            
        return base.map(ac => {
            const fresh = clients.find(c => c.id === ac.id);
            return {
                ...ac,
                avatar_url: fresh?.avatar_url || ac.avatar_url,
                name: fresh ? (fresh.contact_person || fresh.company_name || ac.name) : ac.name
            };
        });
    }, [assignedClients, currentId, currentName, activeClient, clients]);

    const display =
        activeClients.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                {activeClients.map((ac, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 group/pill">
                        <span
                            className={cn(
                                'flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[11px] font-semibold border transition-colors',
                                isDark
                                    ? 'bg-white/[0.05] border-white/10 text-white/80'
                                    : 'bg-[#f5f5f5] border-[#e5e5e5] text-[#333]'
                            )}
                        >
                            <Avatar
                                src={ac.avatar_url}
                                name={ac.name}
                                isDark={isDark}
                                className="w-4 h-4 -ml-1 rounded-full"
                                fallbackIcon={<User size={10} className={isDark ? "text-white/40" : "text-black/30"} />}
                            />
                            <span className="truncate max-w-[120px]">{ac.name}</span>
                        </span>
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                onAssignClients(activeClients.filter((_, i) => i !== idx));
                            }}
                            className={cn(
                                'p-1 rounded-full opacity-0 group-hover/pill:opacity-100 transition-all cursor-pointer',
                                isDark
                                    ? 'hover:bg-white/10 text-white/40 hover:text-white'
                                    : 'hover:bg-black/5 text-black/40 hover:text-black'
                            )}
                        >
                            <X size={10} />
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <span className={cn('text-[12px]', isDark ? 'text-[#444]' : 'text-[#ccc]')}>—</span>
        );

    return (
        <div className={cn('relative', variant === 'table' && 'w-full h-full flex')}>
            <button
                ref={triggerRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(!open);
                }}
                className={cn(
                    'text-left transition-colors',
                    variant === 'table'
                        ? 'w-full h-full px-4 py-3'
                        : ''
                )}
            >
                {display}
            </button>
            <Dropdown
                open={open}
                onClose={() => setOpen(false)}
                isDark={isDark}
                align="center"
                triggerRef={triggerRef}
                className="min-w-[224px] max-w-[224px]"
            >
                <div className={cn('p-2 border-b', isDark ? 'border-[#2e2e2e]' : 'border-[#f0f0f0]')}>
                    <div className="relative">
                        <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-30" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search client..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                                'w-full pl-6 pr-2 py-1.5 text-[11px] rounded-md outline-none',
                                isDark
                                    ? 'bg-white/5 border border-white/10 text-white'
                                    : 'bg-[#f5f5f5] border border-[#e0e0e0] text-black'
                            )}
                        />
                    </div>
                </div>
                <div
                    className="py-1 max-h-[180px] overflow-y-auto"
                    onWheel={(e) => e.stopPropagation()}
                >
                    {filtered.length === 0 ? (
                        <div className="px-4 py-3 text-[11px] opacity-40 text-center">No clients found</div>
                    ) : (
                        filtered.map((c) => {
                            const isSelected = activeClients.some((ac) => ac.id === c.id);
                            return (
                                <button
                                    key={c.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isSelected) {
                                            onAssignClients(activeClients.filter((ac) => ac.id !== c.id));
                                        } else {
                                            onAssignClients([
                                                ...activeClients,
                                                {
                                                    id: c.id,
                                                    name: c.contact_person || c.company_name || '',
                                                    avatar_url: c.avatar_url,
                                                },
                                            ]);
                                        }
                                    }}
                                    className={cn(
                                        'w-full flex items-center justify-between text-left px-3 py-2 text-[12px] transition-colors border-b last:border-0',
                                        isDark
                                            ? 'border-[#333] hover:bg-white/5'
                                            : 'border-[#f0f0f0] hover:bg-[#fafafa]'
                                    )}
                                >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <Avatar
                                            src={c.avatar_url}
                                            name={c.contact_person || c.company_name}
                                            isDark={isDark}
                                            className="w-5 h-5 rounded-full"
                                            fallbackIcon={<User size={12} className={isDark ? "text-white/40" : "text-black/30"} />}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div
                                                className={cn(
                                                    'font-semibold truncate',
                                                    isDark ? 'text-white' : 'text-black',
                                                    isSelected ? 'text-[var(--brand-primary)]' : ''
                                                )}
                                            >
                                                {c.contact_person || c.company_name}
                                            </div>
                                            {c.contact_person && c.company_name && (
                                                <div
                                                    className={cn(
                                                        'text-[9.5px] truncate',
                                                        isDark ? 'text-white/40' : 'text-black/40'
                                                    )}
                                                >
                                                    {c.company_name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <Check size={14} className="text-[var(--brand-primary)] shrink-0 ml-2" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
                {(!search ||
                    !clients.some(
                        (c) =>
                            c.contact_person?.toLowerCase() === search.toLowerCase() ||
                            c.company_name?.toLowerCase() === search.toLowerCase()
                    )) && (
                    <div className={cn('border-t', isDark ? 'border-white/5' : 'border-black/5')}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsClientEditorOpen(true);
                            }}
                            className={cn(
                                'w-full flex items-center gap-2 px-3.5 py-2.5 text-[12px] font-bold transition-colors text-left',
                                isDark ? 'text-primary hover:bg-white/5' : 'text-primary hover:bg-black/[0.02]'
                            )}
                        >
                            <Plus size={14} strokeWidth={2.5} />
                            {search ? `Create "${search}"` : 'Create new contact'}
                        </button>
                    </div>
                )}
            </Dropdown>

            {isClientEditorOpen && (
                <div onClick={(e) => e.stopPropagation()}>
                    <ClientEditor
                        onClose={() => setIsClientEditorOpen(false)}
                        onSave={handleCreateClient}
                        initialData={{
                            contact_person: search,
                            company_name: '',
                            email: '',
                        }}
                    />
                </div>
            )}
        </div>
    );
}
