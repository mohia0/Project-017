"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useProposalStore, ProposalStatus, Proposal } from '@/store/useProposalStore';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';
import {
    Search, LayoutGrid, Edit3, Filter, Copy, ArrowDownUp,
    EyeOff, Plus, ChevronDown, User, FileText, ArrowRightLeft,
    Circle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProposalsPage() {
    const router = useRouter();
    const { theme } = useUIStore();
    const { proposals, fetchProposals, isLoading } = useProposalStore();

    const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'All'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchProposals();
    }, [fetchProposals]);

    // Derived State
    const filteredProposals = useMemo(() => {
        let result = proposals;

        if (statusFilter !== 'All') {
            result = result.filter(p => p.status === statusFilter);
        }

        if (searchQuery) {
            result = result.filter(p =>
                p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.client_name && p.client_name.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        return result;
    }, [proposals, searchQuery, statusFilter]);

    const stats = useMemo(() => {
        const s: Record<string, { count: number, amount: number, color: string, textColor: string }> = {
            All: { count: 0, amount: 0, color: theme === 'dark' ? 'bg-[#333]' : 'bg-[#e2e2e2]', textColor: theme === 'dark' ? 'text-white' : 'text-[#111]' },
            Draft: { count: 0, amount: 0, color: 'bg-[#4285F4]', textColor: 'text-white' },
            Pending: { count: 0, amount: 0, color: 'bg-[#E27602]', textColor: 'text-white' },
            Accepted: { count: 0, amount: 0, color: 'bg-[#4ade80]', textColor: 'text-black' },
            Overdue: { count: 0, amount: 0, color: 'bg-[#d91f4e]', textColor: 'text-white' },
            Declined: { count: 0, amount: 0, color: 'bg-[#a76b53]', textColor: 'text-white' },
            Cancelled: { count: 0, amount: 0, color: 'bg-[#60728c]', textColor: 'text-white' },
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
    }, [proposals, theme]);

    // Format currency helper
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    // Columns Definition for DataTable
    const columns: ColumnDef<Proposal>[] = useMemo(() => [
        {
            id: 'id',
            width: 300,
            minWidth: 150,
            header: 'Subject',
            cell: (prop) => (
                <div className="font-bold tracking-tight">
                    <span className={theme === 'dark' ? "text-white/90" : "text-black/90"}>
                        {prop.title || 'Untitled Proposal'}
                    </span>
                </div>
            )
        },
        {
            id: 'status',
            width: 140,
            minWidth: 100,
            header: 'Status',
            cell: (prop) => {
                let dotColor = 'bg-[#444]';
                let textColor = 'text-[#999]';
                if (prop.status === 'Accepted') { dotColor = 'bg-[#4ade80]'; textColor = theme === 'dark' ? 'text-white' : 'text-black'; }
                else if (prop.status === 'Pending') { dotColor = 'bg-[#E27602]'; textColor = 'text-[#E27602]'; }
                else if (prop.status === 'Draft') { dotColor = 'bg-[#4285F4]'; textColor = 'text-[#4285F4]'; }
                else if (prop.status === 'Overdue') { dotColor = 'bg-[#d91f4e]'; textColor = 'text-[#d91f4e]'; }

                return (
                    <div className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
                        <span className={cn("font-bold text-[10px] uppercase tracking-wider", textColor)}>{prop.status}</span>
                    </div>
                );
            }
        },
        {
            id: 'issueDate',
            width: 140,
            minWidth: 100,
            header: 'Issue',
            cell: (prop) => (
                <span className="opacity-40 font-normal">
                    {prop.issue_date ? new Date(prop.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                </span>
            )
        },
        {
            id: 'expirationDate',
            width: 140,
            minWidth: 100,
            header: 'Due',
            cell: (prop) => (
                <span className="opacity-40 font-normal text-red-500/50">
                    {prop.due_date ? new Date(prop.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                </span>
            )
        },
        {
            id: 'client',
            width: 250,
            minWidth: 150,
            header: 'Client',
            cell: (prop) => (
                <div className="flex items-center gap-2 truncate opacity-70">
                    <span className="truncate">{prop.client_name || '-'}</span>
                </div>
            )
        },
        {
            id: 'total',
            width: 120,
            minWidth: 100,
            header: (
                <div className="text-right w-full opacity-30">Amount</div>
            ),
            cell: (prop) => (
                <div className="font-black text-right w-full tracking-tighter text-[14px]">
                    {formatCurrency(Number(prop.amount || 0))}
                </div>
            )
        }
    ], [theme]);

    const getRowColor = (prop: Proposal, currentTheme: 'light' | 'dark') => {
        if (prop.status === 'Accepted') return currentTheme === 'dark' ? 'text-white font-medium' : 'text-[#111] font-medium';
        if (['Declined', 'Overdue', 'Cancelled'].includes(prop.status)) return currentTheme === 'dark' ? 'text-[#999]' : 'text-[#666]';
        return currentTheme === 'dark' ? 'text-[#ccc]' : 'text-[#444]'; // Pending or Draft
    };

    const EmptyState = (
        <div className="flex flex-col items-center justify-center p-16 text-[#666]">
            <FileText size={48} className="mb-4 opacity-50 stroke-1" />
            <p className="text-sm shadow-sm">No proposals found.</p>
            <button
                onClick={() => router.push('/proposals/new')}
                className="mt-4 px-4 py-2 text-[12px] font-bold text-white bg-emerald-500 rounded hover:bg-emerald-600 transition-all shadow-[0_4px_15px_rgba(16,185,129,0.3)]"
            >
                Create one now
            </button>
        </div>
    );

    const CreateNewRow = (
        <div
            onClick={() => router.push('/proposals/new')}
            className={cn(
                "flex items-center gap-2 px-10 py-3 text-[12px] font-bold cursor-pointer transition-colors mt-2",
                theme === 'dark' ? "text-[#ccc] hover:bg-white/5 hover:text-white" : "text-[#666] hover:bg-black/5 hover:text-black"
            )}>
            <Plus size={14} className="opacity-75" /> Create proposal
        </div>
    );

    return (
        <div className={cn(
            "flex flex-col h-full overflow-hidden transition-colors duration-300 font-sans",
            theme === 'dark' ? "bg-[#252525] text-white" : "bg-[#f5f5f5] text-[#111]"
        )}>
            <div className="flex flex-col flex-1 p-8 gap-8 max-w-[1600px] w-full mx-auto overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                    <h1 className="text-[26px] font-black tracking-tight">Proposals</h1>
                    <div className="text-[11px] font-bold opacity-40 uppercase tracking-[0.2em]">
                        {filteredProposals.length} Proposals found
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-1.5 flex-wrap opacity-40 hover:opacity-100 transition-opacity duration-300">
                    {/* Search */}
                    <div className="relative mr-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-current opacity-30" size={11} />
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={cn(
                                "pl-8 pr-4 py-1 text-[11px] font-medium rounded-full border focus:outline-none w-40 transition-all focus:w-60 focus:border-emerald-500/50",
                                theme === 'dark' ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-black/5 border-black/10 text-black placeholder:text-black/20"
                            )}
                        />
                    </div>

                    <ToolbarButton icon={<LayoutGrid size={11} />} label="View" hasDropdown theme={theme} />
                    <ToolbarButton icon={<Filter size={11} />} label="Filter" theme={theme} />
                    <ToolbarButton icon={<ArrowDownUp size={11} />} label="Sort" theme={theme} />

                    {/* Bulk Selection Actions (Appears contextually) */}
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg animate-in fade-in zoom-in-95 font-bold text-[12px]">
                            {selectedIds.size} Selected
                            <button className="ml-2 px-2 hover:bg-emerald-500/20 rounded py-0.5 transition-colors text-emerald-600 dark:text-emerald-400">
                                Send All
                            </button>
                            <button className="px-2 hover:bg-emerald-500/20 rounded py-0.5 transition-colors text-red-500 border-l border-emerald-500/20">
                                Archive
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats Bar */}
                <div className="flex items-stretch text-[10px] font-bold h-7 rounded-lg overflow-hidden shrink-0 shadow-sm border border-transparent dark:border-[#333]">
                    {Object.entries(stats).map(([key, value]) => (
                        <button
                            key={key}
                            onClick={() => setStatusFilter(key as any)}
                            className={cn(
                                "flex-1 min-w-[100px] px-3 flex items-center justify-center gap-1.5 transition-all hover:brightness-110",
                                value.color,
                                value.textColor,
                                statusFilter === key ? "ring-2 ring-inset ring-white/30 brightness-110 scale-[1.02] z-10" : "opacity-85"
                            )}
                        >
                            <span>{value.count}</span>
                            <span className="opacity-70 font-medium">{key}</span>
                            <span className="ml-auto font-black">{formatCurrency(value.amount)}</span>
                        </button>
                    ))}
                </div>

                {/* Reusable Data Table Component */}
                <DataTable<Proposal>
                    data={filteredProposals}
                    columns={columns}
                    keyExtractor={(prop) => prop.id}
                    onRowClick={(prop) => router.push(`/proposals/${prop.id}`)}
                    getRowColor={getRowColor}
                    theme={theme}
                    isLoading={isLoading}
                    emptyState={EmptyState}
                    bottomAction={(filteredProposals.length > 0 || !searchQuery) ? CreateNewRow : null}
                    enableSelection={true}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                />
            </div>
        </div>
    );
}

function ToolbarButton({ icon, label, hasDropdown, theme }: { icon: React.ReactNode, label: string, hasDropdown?: boolean, theme: 'light' | 'dark' }) {
    return (
        <button className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-full hover:bg-black/5 transition-colors shrink-0",
            theme === 'dark' ? "text-white/60 hover:text-white hover:bg-white/5" : "text-black/60 hover:text-black hover:bg-black/5"
        )}>
            {icon}
            {label}
            {hasDropdown && <ChevronDown size={10} className="ml-0.5 opacity-30" />}
        </button>
    );
}
