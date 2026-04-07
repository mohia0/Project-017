"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useProposalStore, ProposalStatus, Proposal } from '@/store/useProposalStore';
import { cn } from '@/lib/utils';
import {
    Search, Table2, Edit3, ChevronDown, Group, ArrowUpDown,
    Archive, Upload, Download, Plus, User, Filter, Calendar
} from 'lucide-react';
import { useRouter } from 'next/navigation';

/* ─── Status config ─────────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    All:       { bg: 'bg-[#5a5a5a]',  text: 'text-white', dot: 'bg-white/60',    label: 'Proposals' },
    Draft:     { bg: 'bg-[#4285F4]',  text: 'text-white', dot: 'bg-white/70',    label: 'Draft' },
    Pending:   { bg: 'bg-[#e28a02]',  text: 'text-white', dot: 'bg-white/70',    label: 'Pending' },
    Accepted:  { bg: 'bg-[#22c55e]',  text: 'text-white', dot: 'bg-white/70',    label: 'Accepted' },
    Overdue:   { bg: 'bg-[#ef4444]',  text: 'text-white', dot: 'bg-white/70',    label: 'Overdue' },
    Declined:  { bg: 'bg-[#a16a53]',  text: 'text-white', dot: 'bg-white/70',    label: 'Declined' },
    Cancelled: { bg: 'bg-[#64748b]',  text: 'text-white', dot: 'bg-white/70',    label: 'Cancelled' },
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
    Draft:    { bg: 'bg-[#dbeafe]',  text: 'text-[#1d4ed8]' },
    Pending:  { bg: 'bg-[#fef3c7]',  text: 'text-[#b45309]' },
    Accepted: { bg: 'bg-[#dcfce7]',  text: 'text-[#15803d]' },
    Overdue:  { bg: 'bg-[#fee2e2]',  text: 'text-[#dc2626]' },
    Declined: { bg: 'bg-[#f3e8e3]',  text: 'text-[#7c4d3a]' },
    Cancelled:{ bg: 'bg-[#f1f5f9]',  text: 'text-[#475569]' },
};

function formatCurrency(val: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(val);
}

function formatDate(dateStr: string | undefined | null) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

function timeAgo(dateStr: string | undefined | null) {
    if (!dateStr) return '';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `about ${weeks} month${weeks > 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    return `${months} months ago`;
}

/* ─── Main page ─────────────────────────────────────────────────── */
export default function ProposalsPage() {
    const router = useRouter();
    const { theme } = useUIStore();
    const { proposals, fetchProposals, isLoading } = useProposalStore();

    const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'All'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [dateRange] = useState('This Year');

    const isDark = theme === 'dark';

    useEffect(() => { fetchProposals(); }, [fetchProposals]);

    /* ── Derived stats ── */
    const stats = useMemo(() => {
        const s: Record<string, { count: number; amount: number }> = {
            All: { count: 0, amount: 0 },
            Draft: { count: 0, amount: 0 },
            Pending: { count: 0, amount: 0 },
            Accepted: { count: 0, amount: 0 },
            Overdue: { count: 0, amount: 0 },
            Declined: { count: 0, amount: 0 },
            Cancelled: { count: 0, amount: 0 },
        };
        proposals.forEach(p => {
            s.All.count++;
            s.All.amount += Number(p.amount || 0);
            if (s[p.status]) {
                s[p.status].count++;
                s[p.status].amount += Number(p.amount || 0);
            }
        });
        return s;
    }, [proposals]);

    /* ── Filtered data ── */
    const filtered = useMemo(() => {
        let result = proposals;
        if (statusFilter !== 'All') result = result.filter(p => p.status === statusFilter);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.title?.toLowerCase().includes(q) ||
                p.client_name?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [proposals, statusFilter, searchQuery]);

    /* ── Selection ── */
    const toggleAll = () => {
        if (selectedIds.size === filtered.length && filtered.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(p => p.id)));
        }
    };
    const toggleRow = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const isAllSelected = filtered.length > 0 && selectedIds.size === filtered.length;

    return (
        <div className={cn(
            "flex flex-col h-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-white text-[#111]"
        )}>

            {/* ── Page header ── */}
            <div className={cn(
                "flex items-center justify-between px-5 py-3 border-b shrink-0",
                isDark ? "border-[#252525]" : "border-[#ebebeb]"
            )}>
                <h1 className="text-[15px] font-semibold tracking-tight">Proposals</h1>
                <button
                    onClick={() => router.push('/proposals/new')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-[8px] bg-[#4dbf39] hover:bg-[#59d044] text-black transition-colors"
                >
                    <Plus size={13} strokeWidth={2.5} /> New Proposal
                </button>
            </div>

            {/* ── Toolbar ── */}
            <div className={cn(
                "flex items-center gap-0 px-4 py-1.5 border-b shrink-0 flex-wrap",
                isDark ? "border-[#252525]" : "border-[#ebebeb]"
            )}>
                {/* Search */}
                <div className="relative mr-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 opacity-40" size={11} />
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className={cn(
                            "pl-6 pr-3 py-1 text-[11px] rounded border focus:outline-none w-28 transition-all focus:w-44",
                            isDark
                                ? "bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-white/20"
                                : "bg-[#f5f5f5] border-[#e0e0e0] text-[#111] placeholder:text-[#aaa] focus:border-[#ccc]"
                        )}
                    />
                </div>

                <TbBtn label="Table" icon={<Table2 size={11} />} hasArrow isDark={isDark} />
                <TbBtn label="Edit view" icon={<Edit3 size={11} />} isDark={isDark} />

                {/* Date range pill */}
                <button className={cn(
                    "flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded mx-1 border transition-all",
                    isDark
                        ? "bg-[#252525] border-[#333] text-[#ccc] hover:border-[#444]"
                        : "bg-white border-[#d0d0d0] text-[#444] hover:border-[#bbb] shadow-xs"
                )}>
                    <Calendar size={11} className="opacity-60" />
                    {dateRange}
                </button>

                <div className={cn("w-[1px] h-4 mx-1", isDark ? "bg-[#333]" : "bg-[#e0e0e0]")} />

                <TbBtn label="Group" icon={<Group size={11} />} isDark={isDark} />
                <TbBtn label="Order" icon={<ArrowUpDown size={11} />} isDark={isDark} />

                <div className={cn("w-[1px] h-4 mx-1", isDark ? "bg-[#333]" : "bg-[#e0e0e0]")} />

                <TbBtn label="Archived" icon={<Archive size={11} />} isDark={isDark} />
                <TbBtn label="Import / Export" icon={<Upload size={11} />} isDark={isDark} />

                {/* Bulk selection banner */}
                {selectedIds.size > 0 && (
                    <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[11px] font-medium">
                        {selectedIds.size} selected
                        <button className="hover:underline">Delete</button>
                    </div>
                )}
            </div>

            {/* ── Status Bar ── */}
            <div className="flex items-stretch h-[26px] shrink-0">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const s = stats[key] || { count: 0, amount: 0 };
                    const isActive = statusFilter === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setStatusFilter(key as any)}
                            className={cn(
                                "flex-1 flex items-center justify-start gap-1.5 px-2.5 text-[10px] font-semibold transition-all relative overflow-hidden",
                                cfg.bg, cfg.text,
                                isActive ? "brightness-110" : "brightness-90 hover:brightness-100"
                            )}
                        >
                            <span className="font-bold tabular-nums">{s.count}</span>
                            <span className="opacity-80 font-medium">{cfg.label}</span>
                            {s.amount > 0 && (
                                <span className="ml-auto font-bold tabular-nums opacity-90 text-[9px]">
                                    {formatCurrency(s.amount)}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Table ── */}
            <div className="flex-1 overflow-auto">
                {/* Table header */}
                <div className={cn(
                    "grid px-4 py-2 border-b text-[10px] font-semibold uppercase tracking-wider sticky top-0 z-10",
                    isDark
                        ? "bg-[#1a1a1a] border-[#252525] text-[#555]"
                        : "bg-[#fafafa] border-[#ebebeb] text-[#aaa]",
                )}
                    style={{ gridTemplateColumns: '28px 40px 200px 160px 200px 180px 1fr' }}
                >
                    {/* Select all */}
                    <div
                        className="flex items-center cursor-pointer"
                        onClick={toggleAll}
                    >
                        <Checkbox checked={isAllSelected} indeterminate={selectedIds.size > 0 && !isAllSelected} isDark={isDark} />
                    </div>
                    <div /> {/* spacer for status dropdown chevron */}
                    <div>Status</div>
                    <div>Issue date</div>
                    <div>Expiration date</div>
                    <div>Client</div>
                    <div className="text-right">Total: {formatCurrency(stats[statusFilter]?.amount ?? 0)}</div>
                </div>

                {/* Rows */}
                {isLoading ? (
                    <LoadingSkeleton isDark={isDark} />
                ) : filtered.length === 0 ? (
                    <EmptyState isDark={isDark} onCreate={() => router.push('/proposals/new')} />
                ) : (
                    filtered.map(proposal => {
                        const isSelected = selectedIds.has(proposal.id);
                        const badge = STATUS_BADGE[proposal.status] || { bg: 'bg-gray-100', text: 'text-gray-500' };

                        return (
                            <div
                                key={proposal.id}
                                onClick={() => router.push(`/proposals/${proposal.id}`)}
                                className={cn(
                                    "grid px-4 py-0 border-b text-[12px] cursor-pointer group transition-colors",
                                    isDark
                                        ? "border-[#1f1f1f] hover:bg-white/[0.025]"
                                        : "border-[#f0f0f0] hover:bg-[#fafafa]",
                                    isSelected && (isDark ? "bg-blue-900/20" : "bg-blue-50/60")
                                )}
                                style={{ gridTemplateColumns: '28px 40px 200px 160px 200px 180px 1fr' }}
                            >
                                {/* Select checkbox */}
                                <div
                                    className="flex items-center self-stretch"
                                    onClick={e => toggleRow(proposal.id, e)}
                                >
                                    <Checkbox checked={isSelected} isDark={isDark} />
                                </div>

                                {/* ID / number label */}
                                <div className={cn(
                                    "flex items-center font-mono text-[10px]",
                                    isDark ? "text-[#555]" : "text-[#bbb]"
                                )}>
                                    {proposal.id?.slice(-4) ?? '—'}
                                </div>

                                {/* Status badge with dropdown */}
                                <div className="flex items-center py-2.5">
                                    <div className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold",
                                        badge.bg, badge.text
                                    )}>
                                        {proposal.status}
                                        <ChevronDown size={9} className="opacity-50" />
                                    </div>
                                </div>

                                {/* Issue date */}
                                <div className={cn(
                                    "flex items-center gap-1",
                                    isDark ? "text-[#777]" : "text-[#888]"
                                )}>
                                    <span>{formatDate(proposal.issue_date)}</span>
                                    <span className="text-[10px] opacity-50">({timeAgo(proposal.issue_date)})</span>
                                </div>

                                {/* Expiration date */}
                                <div className={cn(
                                    "flex items-center gap-1",
                                    isDark ? "text-[#777]" : "text-[#888]"
                                )}>
                                    {proposal.due_date ? (
                                        <>
                                            <span className="text-[#3b82f6]">{formatDate(proposal.due_date)}</span>
                                            <span className="text-[10px] opacity-50">({timeAgo(proposal.due_date)})</span>
                                        </>
                                    ) : '—'}
                                </div>

                                {/* Client */}
                                <div className={cn(
                                    "flex items-center gap-1.5 truncate",
                                    isDark ? "text-[#888]" : "text-[#666]"
                                )}>
                                    {proposal.client_name && (
                                        <User size={11} className="opacity-40 shrink-0" />
                                    )}
                                    <span className="truncate">{proposal.client_name || '—'}</span>
                                </div>

                                {/* Amount */}
                                <div className={cn(
                                    "flex items-center justify-end font-semibold tabular-nums",
                                    isDark ? "text-[#ccc]" : "text-[#333]"
                                )}>
                                    {formatCurrency(Number(proposal.amount || 0))}
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Create proposal row */}
                {!isLoading && (
                    <button
                        onClick={() => router.push('/proposals/new')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 w-full text-left text-[11px] font-medium transition-colors",
                            isDark
                                ? "text-[#555] hover:text-[#aaa] hover:bg-white/[0.02]"
                                : "text-[#aaa] hover:text-[#555] hover:bg-[#fafafa]"
                        )}
                    >
                        <Plus size={12} className="opacity-70" />
                        Create proposal
                    </button>
                )}
            </div>
        </div>
    );
}

/* ─── Sub-components ────────────────────────────────────────────── */

function TbBtn({
    label, icon, hasArrow, isDark
}: {
    label: string;
    icon?: React.ReactNode;
    hasArrow?: boolean;
    isDark: boolean;
}) {
    return (
        <button className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-colors shrink-0",
            isDark
                ? "text-[#777] hover:text-[#ccc] hover:bg-white/5"
                : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]"
        )}>
            {icon}
            {label}
            {hasArrow && <ChevronDown size={9} className="opacity-40" />}
        </button>
    );
}

function Checkbox({
    checked,
    indeterminate,
    isDark,
}: {
    checked: boolean;
    indeterminate?: boolean;
    isDark: boolean;
}) {
    return (
        <div className={cn(
            "w-[13px] h-[13px] rounded-[3px] border flex items-center justify-center transition-all shrink-0",
            checked
                ? "bg-[#3b82f6] border-[#3b82f6]"
                : indeterminate
                    ? "bg-[#3b82f6]/40 border-[#3b82f6]/60"
                    : isDark
                        ? "border-[#3a3a3a] bg-transparent"
                        : "border-[#d0d0d0] bg-white"
        )}>
            {(checked || indeterminate) && (
                <svg width="7" height="5" viewBox="0 0 8 6" fill="none">
                    {indeterminate && !checked
                        ? <line x1="1" y1="3" x2="7" y2="3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        : <polyline points="1,3 3,5 7,1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    }
                </svg>
            )}
        </div>
    );
}

function LoadingSkeleton({ isDark }: { isDark: boolean }) {
    return (
        <div className="flex flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "h-11 border-b animate-pulse",
                        isDark ? "border-[#1f1f1f] bg-white/[0.01]" : "border-[#f0f0f0] bg-[#fafafa]"
                    )}
                />
            ))}
        </div>
    );
}

function EmptyState({ isDark, onCreate }: { isDark: boolean; onCreate: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className={cn("text-[13px]", isDark ? "text-[#555]" : "text-[#aaa]")}>
                No proposals found.
            </div>
            <button
                onClick={onCreate}
                className="px-4 py-1.5 text-[12px] font-semibold text-white bg-[#22c55e] rounded hover:bg-[#16a34a] transition-colors"
            >
                Create proposal
            </button>
        </div>
    );
}
