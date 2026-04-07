"use client";

import React, { useState } from 'react';
import {
    Search, Plus, Filter, LayoutGrid, List,
    Users, Mail, Phone, MapPin
} from 'lucide-react';
import { useClientStore } from '@/store/useClientStore';
import { useUIStore } from '@/store/useUIStore';
import ClientEditor from '@/components/clients/ClientEditor';
import { cn } from '@/lib/utils';

type Tab = 'people' | 'companies';
type ViewMode = 'grid' | 'list';

function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

const AVATAR_COLORS = [
    'bg-violet-500/15 text-violet-400',
    'bg-blue-500/15 text-blue-400',
    'bg-emerald-500/15 text-emerald-400',
    'bg-orange-500/15 text-orange-400',
    'bg-rose-500/15 text-rose-400',
    'bg-cyan-500/15 text-cyan-400',
    'bg-amber-500/15 text-amber-400',
    'bg-indigo-500/15 text-indigo-400',
];

function getAvatarColor(name: string) {
    return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

export default function ClientsPage() {
    const { clients, addClient, fetchClients } = useClientStore();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const [tab, setTab] = useState<Tab>('people');
    const [view, setView] = useState<ViewMode>('grid');
    const [search, setSearch] = useState('');
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    React.useEffect(() => { fetchClients(); }, [fetchClients]);

    const handleSaveClient = async (data: any) => {
        await addClient(data);
        setIsEditorOpen(false);
    };

    const filtered = clients.filter(c =>
        c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );

    const total = clients.length;
    const withCompany = clients.filter(c => c.company_name).length;
    const withEmail = clients.filter(c => c.email).length;
    const withPhone = clients.filter(c => c.phone).length;

    const border = isDark ? 'border-[#252525]' : 'border-[#ebebeb]';
    const cardBg = isDark ? 'bg-[#1a1a1a]' : 'bg-white';
    const cardBorder = isDark ? 'border-[#1f1f1f]' : 'border-[#f0f0f0]';
    const cardHover = isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-[#fafafa]';
    const muted = isDark ? 'text-[#555]' : 'text-[#aaa]';
    const textPrimary = isDark ? 'text-[#e5e5e5]' : 'text-[#111]';
    const textSecondary = isDark ? 'text-[#777]' : 'text-[#888]';

    return (
        <div className={cn(
            "flex flex-col h-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-white text-[#111]"
        )}>
            {/* ── Page header — matches proposals page exactly ── */}
            <div className={cn(
                "flex items-center justify-between px-5 py-3 border-b shrink-0",
                isDark ? "border-[#252525]" : "border-[#ebebeb]"
            )}>
                <h1 className="text-[15px] font-semibold tracking-tight">Contacts</h1>
                <button
                    onClick={() => setIsEditorOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-[8px] bg-[#4dbf39] hover:bg-[#59d044] text-black transition-colors"
                >
                    <Plus size={13} strokeWidth={2.5} /> New Contact
                </button>
            </div>

            {/* ── Toolbar ── */}
            <div className={cn(
                "flex items-center gap-0 px-4 py-1.5 border-b shrink-0",
                isDark ? "border-[#252525]" : "border-[#ebebeb]"
            )}>
                {/* Tabs */}
                {(['people', 'companies'] as Tab[]).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={cn(
                            "px-2.5 py-1 text-[11px] font-medium rounded transition-colors capitalize mr-1",
                            tab === t
                                ? (isDark ? "bg-white/8 text-white" : "bg-[#f0f0f0] text-[#111]")
                                : (isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]")
                        )}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}

                <div className={cn("w-[1px] h-4 mx-2", isDark ? "bg-[#333]" : "bg-[#e0e0e0]")} />

                {/* Search */}
                <div className="relative mr-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 opacity-40" size={11} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search"
                        className={cn(
                            "pl-6 pr-3 py-1 text-[11px] rounded border focus:outline-none w-28 transition-all focus:w-44",
                            isDark
                                ? "bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-white/20"
                                : "bg-[#f5f5f5] border-[#e0e0e0] text-[#111] placeholder:text-[#aaa] focus:border-[#ccc]"
                        )}
                    />
                </div>

                <button className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-colors shrink-0",
                    isDark ? "text-[#777] hover:text-[#ccc] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]"
                )}>
                    <Filter size={11} /> Filter
                </button>

                <div className="ml-auto flex items-center gap-1">
                    <button
                        onClick={() => setView('grid')}
                        className={cn(
                            "flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-colors",
                            view === 'grid'
                                ? (isDark ? "bg-white/10 text-white" : "bg-[#f0f0f0] text-[#111]")
                                : (isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]")
                        )}
                    >
                        <LayoutGrid size={11} />
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={cn(
                            "flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-colors",
                            view === 'list'
                                ? (isDark ? "bg-white/10 text-white" : "bg-[#f0f0f0] text-[#111]")
                                : (isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]")
                        )}
                    >
                        <List size={11} />
                    </button>
                </div>
            </div>

            {/* ── Status bar — same style as proposals colored bar ── */}
            <div className="flex items-stretch h-[26px] shrink-0">
                <StatBar label="Contacts" count={total} bg="bg-[#5a5a5a]" />
                <StatBar label="With Company" count={withCompany} bg="bg-[#e28a02]" />
                <StatBar label="With Email" count={withEmail} bg="bg-[#22c55e]" />
                <StatBar label="With Phone" count={withPhone} bg="bg-[#4285F4]" />
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-auto p-5">
                {filtered.length === 0 ? (
                    <div className={cn("flex flex-col items-center justify-center h-full gap-3", muted)}>
                        <Users size={32} strokeWidth={1.25} />
                        <p className="text-[12px]">No contacts yet.</p>
                        <button
                            onClick={() => setIsEditorOpen(true)}
                            className="mt-1 text-[11px] font-semibold px-3 py-1.5 rounded-[8px] bg-[#4dbf39] text-black hover:bg-[#59d044] transition-colors"
                        >
                            + New Contact
                        </button>
                    </div>
                ) : view === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {filtered.map(client => (
                            <div
                                key={client.id}
                                className={cn(
                                    "rounded-xl border p-4 flex flex-col gap-3 transition-colors cursor-pointer",
                                    cardBg, cardBorder, cardHover
                                )}
                            >
                                {/* Avatar + Name */}
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-[8px] flex items-center justify-center text-[11px] font-bold shrink-0",
                                        getAvatarColor(client.contact_person || client.company_name)
                                    )}>
                                        {getInitials(client.contact_person || client.company_name)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={cn("text-[13px] font-semibold leading-tight truncate", textPrimary)}>
                                            {client.contact_person || '—'}
                                        </p>
                                        <p className={cn("text-[11px] truncate mt-0.5", muted)}>
                                            {client.company_name || 'No company'}
                                        </p>
                                    </div>
                                </div>

                                <div className={cn("border-t", isDark ? 'border-[#1f1f1f]' : 'border-[#f0f0f0]')} />

                                {/* Fields */}
                                <div className="flex flex-col gap-1.5">
                                    {client.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail size={10} className={muted} />
                                            <span className={cn("text-[11px] truncate", textSecondary)}>{client.email}</span>
                                        </div>
                                    )}
                                    {client.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone size={10} className={muted} />
                                            <span className={cn("text-[11px] truncate", textSecondary)}>{client.phone}</span>
                                        </div>
                                    )}
                                    {client.address && (
                                        <div className="flex items-center gap-2">
                                            <MapPin size={10} className={muted} />
                                            <span className={cn("text-[11px] truncate", textSecondary)}>{client.address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* List view */
                    <div className={cn("rounded-xl border overflow-hidden", isDark ? 'border-[#1f1f1f]' : 'border-[#f0f0f0]')}>
                        {/* List header */}
                        <div className={cn(
                            "grid px-4 py-2 text-[10px] font-semibold uppercase tracking-wider",
                            isDark ? "bg-[#1a1a1a] border-b border-[#252525] text-[#555]" : "bg-[#fafafa] border-b border-[#ebebeb] text-[#aaa]"
                        )} style={{ gridTemplateColumns: '40px 1fr 180px 160px 140px' }}>
                            <div />
                            <div>Name</div>
                            <div>Email</div>
                            <div>Phone</div>
                            <div>Company</div>
                        </div>
                        {filtered.map((client, i) => (
                            <div
                                key={client.id}
                                className={cn(
                                    "grid px-4 py-2.5 text-[12px] cursor-pointer transition-colors",
                                    cardHover,
                                    i !== 0 && `border-t ${isDark ? 'border-[#1f1f1f]' : 'border-[#f5f5f5]'}`
                                )}
                                style={{ gridTemplateColumns: '40px 1fr 180px 160px 140px' }}
                            >
                                <div className={cn(
                                    "w-7 h-7 rounded-[7px] flex items-center justify-center text-[10px] font-bold",
                                    getAvatarColor(client.contact_person || client.company_name)
                                )}>
                                    {getInitials(client.contact_person || client.company_name)}
                                </div>
                                <div className={cn("flex items-center font-medium truncate", textPrimary)}>
                                    {client.contact_person || '—'}
                                </div>
                                <div className={cn("flex items-center truncate", textSecondary)}>{client.email || '—'}</div>
                                <div className={cn("flex items-center truncate", textSecondary)}>{client.phone || '—'}</div>
                                <div className={cn("flex items-center truncate", muted)}>{client.company_name || '—'}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isEditorOpen && (
                <ClientEditor onClose={() => setIsEditorOpen(false)} onSave={handleSaveClient} />
            )}
        </div>
    );
}

function StatBar({ label, count, bg }: { label: string; count: number; bg: string }) {
    return (
        <div className={cn(
            "flex-1 flex items-center justify-start gap-1.5 px-2.5 text-[10px] font-semibold text-white",
            bg
        )}>
            <span className="font-bold tabular-nums">{count}</span>
            <span className="opacity-80 font-medium">{label}</span>
        </div>
    );
}
