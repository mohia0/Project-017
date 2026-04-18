"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useProposalStore } from '@/store/useProposalStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';
import {
    TrendingUp, TrendingDown, FileText, Receipt,
    ChevronLeft, ChevronRight, Minus,
    AlertCircle, CheckCircle2, Clock, Ban
} from 'lucide-react';
import { MoneyAmount } from '@/components/ui/MoneyAmount';

// Removed local fmt$ and fmtShort$ to use global MoneyAmount component

function pctChange(current: number, previous: number): number | null {
    if (previous === 0 && current === 0) return null;
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
}

/* ─── Date helpers ───────────────────────────────────────────────── */
function isInPeriod(dateStr: string | null | undefined, start: Date, end: Date): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= start && d <= end;
}

function startOfDay(d: Date) { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; }
function endOfDay(d: Date) { const r = new Date(d); r.setHours(23, 59, 59, 999); return r; }

/* ─── Bar Chart ──────────────────────────────────────────────────── */
interface BarData { label: string; value: number; color: string; }

function BarChart({ data, isDark }: { data: BarData[]; isDark: boolean }) {
    const max = Math.max(...data.map(d => d.value), 1);
    const steps = 5;
    const stepVal = max / steps;

    return (
        <div className="flex flex-col gap-2 w-full h-full">
            {/* Y-axis + bars */}
            <div className="flex gap-3 items-end flex-1 min-h-0">
                {/* Y labels */}
                <div className="flex flex-col justify-between h-full pb-5 text-right">
                    {Array.from({ length: steps + 1 }).map((_, i) => {
                        const v = stepVal * (steps - i);
                        return (
                            <span key={i} className={cn("text-[9px] tabular-nums leading-none",
                                isDark ? "text-[#444]" : "text-[#ccc]")}>
                                <MoneyAmount amount={v} abbreviate />
                            </span>
                        );
                    })}
                </div>
                {/* Bars */}
                <div className="flex-1 flex items-end gap-[3px] h-full relative">
                    {/* Grid lines */}
                    {Array.from({ length: steps }).map((_, i) => (
                        <div key={i}
                            className={cn("absolute left-0 right-0 border-t",
                                isDark ? "border-[#1f1f1f]" : "border-[#f0f0f0]")}
                            style={{ bottom: `${((i + 1) / steps) * 100}%` }}
                        />
                    ))}
                    {data.map((d, i) => {
                        const pct = max === 0 ? 0 : (d.value / max) * 100;
                        return (
                            <div key={i} className="flex-1 h-full flex flex-col group relative">
                                {/* Bar Area */}
                                <div className="flex-1 flex flex-col justify-end relative h-full">
                                    {/* Tooltip */}
                                    {d.value > 0 && (
                                        <div className={cn(
                                            "absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded text-[10px] font-semibold",
                                            "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10",
                                            isDark ? "bg-[#222] text-white border border-[#333]" : "bg-white text-[#111] border border-[#e0e0e0] shadow-md"
                                        )}>
                                            <MoneyAmount amount={d.value} />
                                        </div>
                                    )}
                                    
                                    <div
                                        className="w-full rounded-t-[3px] transition-all duration-300"
                                        style={{
                                            height: `${Math.max(pct, pct === 0 ? 0 : 4)}%`,
                                            backgroundColor: d.color,
                                            opacity: d.value === 0 ? 0.2 : 1,
                                            minHeight: d.value > 0 ? '3px' : '0'
                                        }}
                                    />
                                </div>
                                
                                {/* Label Area */}
                                <div className="h-5 flex items-center justify-center shrink-0">
                                    <span className={cn("text-[9px] text-center truncate w-full leading-tight",
                                        isDark ? "text-[#555]" : "text-[#bbb]")}>
                                        {d.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ─── KPI Card ───────────────────────────────────────────────────── */
interface KpiProps {
    label: string;
    value: number | string;
    subValue?: React.ReactNode;
    change?: number | null;
    icon: React.ReactNode;
    iconBg: string;
    isDark: boolean;
    currency?: string;
}

function KpiCard({ label, value, subValue, change, icon, iconBg, isDark, currency }: KpiProps) {
    const isPositive = change !== null && change !== undefined && change > 0;
    const isNegative = change !== null && change !== undefined && change < 0;
    const isNeutral = change === null || change === undefined || change === 0;

    return (
        <div className={cn(
            "rounded-[10px] border p-4 flex flex-col gap-3 transition-all",
            isDark
                ? "bg-[#1a1a1a] border-[#252525] hover:border-[#333]"
                : "bg-white border-[#ebebeb] hover:border-[#d8d8d8] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
        )}>
            <div className="flex items-center justify-between">
                <span className={cn("text-[11px] font-medium tracking-tight",
                    isDark ? "text-[#666]" : "text-[#999]")}>
                    {label}
                </span>
                <div className={cn("w-7 h-7 rounded-[7px] flex items-center justify-center")} style={{ backgroundColor: iconBg }}>
                    {icon}
                </div>
            </div>

            <div className="flex items-end justify-between gap-2">
                <div>
                    <div className={cn("text-[22px] font-bold tracking-tight leading-none",
                        isDark ? "text-[#e5e5e5]" : "text-[#111]")}>
                        {typeof value === 'number' || !isNaN(Number(value)) ? (
                            <MoneyAmount amount={Number(value)} currency={currency} />
                        ) : value}
                    </div>
                    {subValue && (
                        <div className={cn("text-[11px] mt-1", isDark ? "text-[#555]" : "text-[#bbb]")}>
                            {subValue}
                        </div>
                    )}
                </div>

                {!isNeutral && (
                    <div className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                        isPositive
                            ? "bg-[#f0fdf4] text-[#16a34a]"
                            : "bg-[#fff5f5] text-[#dc2626]",
                        isDark && isPositive ? "bg-green-500/10 text-green-400" : "",
                        isDark && isNegative ? "bg-red-500/10 text-red-400" : ""
                    )}>
                        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(change!).toFixed(1)}%
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Income Heatmap (full-width calendar style) ─────────────────── */
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const DOW_LABELS = ['Mon', 'Wed', 'Fri']; // labels at positions 1,3,5 (0-indexed)

function IncomeHeatmap({ heatmapData, year, onYearChange, isDark }: {
    heatmapData: number[][];
    year: number;
    onYearChange: (y: number) => void;
    isDark: boolean;
}) {
    const flat = heatmapData.flat();
    const maxVal = Math.max(...flat, 1);
    const today = new Date();

    function cellColor(val: number): string {
        if (val === 0) return isDark ? '#242424' : '#f0f0f0';
        const intensity = Math.min(val / maxVal, 1);
        if (isDark) {
            // dark: deep teal → bright green
            const r = Math.round(20 + intensity * 30);
            const g = Math.round(120 + intensity * 75);
            const b = Math.round(40 + intensity * 10);
            return `rgb(${r},${g},${b})`;
        } else {
            // light: pale mint → rich green
            const r = Math.round(220 - intensity * 120);
            const g = Math.round(245 - intensity * 50);
            const b = Math.round(215 - intensity * 140);
            return `rgb(${r},${g},${b})`;
        }
    }

    // Build each month as a 2D grid: cols = weeks, rows = days-of-week (0=Sun)
    // We want Mon-first display (row 0 = Mon … row 6 = Sun)
    function buildMonthWeeks(monthIdx: number, yr: number) {
        const daysInMonth = new Date(yr, monthIdx + 1, 0).getDate();
        const firstDow = new Date(yr, monthIdx, 1).getDay(); // 0=Sun
        // shift so Mon=0 … Sun=6
        const offset = (firstDow + 6) % 7;
        // total cells = offset + daysInMonth, padded up to full weeks
        const totalCells = offset + daysInMonth;
        const weeks = Math.ceil(totalCells / 7);
        // grid[col][row] = { day: number | null, val: number }
        const grid: Array<Array<{ day: number | null; val: number }>> = [];
        for (let w = 0; w < weeks; w++) {
            const col: Array<{ day: number | null; val: number }> = [];
            for (let r = 0; r < 7; r++) {
                const cellIdx = w * 7 + r;
                const dayNum = cellIdx - offset + 1;
                if (dayNum < 1 || dayNum > daysInMonth) {
                    col.push({ day: null, val: 0 });
                } else {
                    col.push({ day: dayNum, val: (heatmapData[monthIdx] && heatmapData[monthIdx][dayNum - 1]) || 0 });
                }
            }
            grid.push(col);
        }
        return grid;
    }

    const CELL = 8;  // Slightly larger than 7
    const GAP_X = 4; // More horizontal spacing to fill width intuitively
    const GAP_Y = 3; // Minimal vertical spacing to prevent height breakage

    return (
        <div className={cn("rounded-[10px] border p-4 flex flex-col h-full",
            isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-white border-[#ebebeb]")}>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className={cn("text-[12px] font-semibold", isDark ? "text-[#e5e5e5]" : "text-[#111]")}>
                    Income Heatmap
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => onYearChange(year - 1)}
                        className={cn("w-5 h-5 rounded flex items-center justify-center transition-colors",
                            isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#ccc] hover:text-[#555] hover:bg-[#f5f5f5]")}>
                        <ChevronLeft size={12} />
                    </button>
                    <span className={cn("text-[10px] font-bold w-10 text-center tabular-nums",
                        isDark ? "text-[#888]" : "text-[#666]")}>{year}</span>
                    <button onClick={() => onYearChange(year + 1)}
                        className={cn("w-5 h-5 rounded flex items-center justify-center transition-colors",
                            isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#ccc] hover:text-[#555] hover:bg-[#f5f5f5]")}>
                        <ChevronRight size={12} />
                    </button>
                </div>
            </div>

            {/* Grid — 2 rows × 6 months */}
            <div className="flex-1 flex flex-col justify-center gap-3">
                {[0, 1].map(rowIdx => (
                    <div key={rowIdx} className="grid grid-cols-6 gap-1 lg:gap-2">
                        {Array.from({ length: 6 }).map((_, colIdx) => {
                            const monthIdx = rowIdx * 6 + colIdx;
                            const weeks = buildMonthWeeks(monthIdx, year);
                            return (
                                <div key={monthIdx} className="flex flex-col gap-1.5 w-full items-center">
                                    <div className="w-full flex items-start">
                                        <span className={cn("text-[9px] font-bold uppercase tracking-wider",
                                            isDark ? "text-[#444]" : "text-[#ccc]")}>
                                            {MONTH_NAMES[monthIdx]}
                                        </span>
                                    </div>
                                    <div className="flex w-full" style={{ gap: GAP_X }}>
                                        {weeks.map((col, wIdx) => (
                                            <div key={wIdx} className="flex flex-col" style={{ gap: GAP_Y }}>
                                                {col.map((cell, rIdx) => {
                                                    if (cell.day === null) {
                                                        return (
                                                            <div key={rIdx} 
                                                                className="rounded-[2px]" 
                                                                style={{ 
                                                                    width: CELL, 
                                                                    height: CELL, 
                                                                    backgroundColor: isDark ? '#1e1e1e' : '#f0f0f0',
                                                                    opacity: 0.1 
                                                                }} 
                                                            />
                                                        );
                                                    }
                                                    
                                                    const isToday = year === today.getFullYear() && monthIdx === today.getMonth() && cell.day === today.getDate();
                                                    
                                                    return (
                                                        <div key={rIdx} className="relative group">
                                                            <div
                                                                className="rounded-[2px] cursor-pointer transition-transform hover:scale-125 hover:z-10"
                                                                style={{
                                                                    width: CELL,
                                                                    height: CELL,
                                                                    backgroundColor: cellColor(cell.val),
                                                                    boxShadow: isToday ? `0 0 0 1px ${isDark ? '#aaa' : '#666'}` : undefined
                                                                }}
                                                            />
                                                            
                                                            {/* Custom Tooltip */}
                                                            <div className={cn(
                                                                "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2.5 rounded-lg shadow-2xl z-[100]",
                                                                "opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap",
                                                                "flex flex-col gap-0.5 min-w-[120px] scale-90 group-hover:scale-100 origin-bottom",
                                                                isDark ? "bg-[#1c1c1c] border border-[#333] text-white" : "bg-white border border-[#eee] text-[#111]"
                                                            )}>
                                                                <span className={cn("text-[9px] font-bold uppercase tracking-widest opacity-40", isDark ? "text-white" : "text-black")}>
                                                                    {cell.day} {MONTH_NAMES_FULL[monthIdx]} {year}
                                                                </span>
                                                                <div className="flex items-center justify-between gap-4 mt-0.5">
                                                                    <span className={cn("text-[13px] font-black tabular-nums", cell.val > 0 ? "text-green-500" : "opacity-30")}>
                                                                        {cell.val > 0 ? <MoneyAmount amount={cell.val} /> : "No Income"}
                                                                    </span>
                                                                </div>
                                                                {isToday && (
                                                                    <div className={cn("flex items-center gap-1.5 mt-1 pt-1 border-t", isDark ? "border-white/5" : "border-black/5")}>
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">Current Day</span>
                                                                    </div>
                                                                )}
                                                                
                                                                {/* Tooltip Arrow */}
                                                                <div className={cn(
                                                                    "absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 border-[6px] border-transparent",
                                                                    isDark ? "border-t-[#1c1c1c]" : "border-t-white"
                                                                )} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Total only (minimal legend) */}
            <div className="mt-3 pt-3 border-t border-dashed border-gray-100 flex items-center justify-between">
                 <div className="flex items-center gap-1">
                    {[0, 0.2, 0.4, 0.7, 1].map((v, i) => (
                        <div key={i} className="rounded-[1px]" style={{ width: 6, height: 6, backgroundColor: cellColor(v * maxVal) }} />
                    ))}
                </div>
                <span className={cn("text-[10px] font-bold tabular-nums", isDark ? "text-[#444]" : "text-[#bbb]")}>
                    Annual Total: <MoneyAmount amount={flat.reduce((a, b) => a + b, 0)} />
                </span>
            </div>
        </div>
    );
}


/* ─── Status Row Item ────────────────────────────────────────────── */
function StatusRow({ label, count, amount, icon, iconColor, barColor, isDark }: {
    label: string; count: number; amount: number;
    icon: React.ReactNode; iconColor: string; barColor: string; isDark: boolean;
}) {
    return (
        <div className={cn("flex items-center gap-3 py-2.5 border-b last:border-b-0",
            isDark ? "border-[#1e1e1e]" : "border-[#f5f5f5]")}>
            <div className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${iconColor}18`, color: iconColor }}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className={cn("text-[11px] font-medium", isDark ? "text-[#aaa]" : "text-[#555]")}>{label}</span>
                    <div className="flex items-center gap-2">
                        <span className={cn("text-[11px] tabular-nums", isDark ? "text-[#666]" : "text-[#bbb]")}>{count}</span>
                        <span className={cn("text-[11px] font-semibold tabular-nums", isDark ? "text-[#ddd]" : "text-[#222]")}>
                            <MoneyAmount amount={amount} />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Main Dashboard ─────────────────────────────────────────────── */
export default function DashboardPage() {
    const { theme, activeWorkspaceId } = useUIStore();
    const { invoices, fetchInvoices } = useInvoiceStore();
    const { proposals, fetchProposals } = useProposalStore();
    const { user } = useAuthStore();
    const { profile, fetchProfile } = useSettingsStore();
    const isDark = theme === 'dark';

    const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());

    useEffect(() => { fetchInvoices(); }, [fetchInvoices, activeWorkspaceId]);
    useEffect(() => { fetchProposals(); }, [fetchProposals, activeWorkspaceId]);
    useEffect(() => { fetchProfile(); }, [fetchProfile, activeWorkspaceId]);

    /* ── Date boundaries (memoized so they don't recreate Date objects every render) ── */
    const { now, y, m, last30Start, last30End, prior30Start, prior30End } = useMemo(() => {
        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth();
        const last30End = endOfDay(now);
        const last30Start = startOfDay(new Date(now.getTime() - 29 * 86400000));
        const prior30End = endOfDay(new Date(last30Start.getTime() - 1));
        const prior30Start = startOfDay(new Date(prior30End.getTime() - 29 * 86400000));
        return { now, y, m, last30Start, last30End, prior30Start, prior30End };
    }, []);


    /* ── Invoice stats ── */
    const invoiceStats = useMemo(() => {
        const paid = invoices.filter(i => i.status === 'Paid');
        const pending = invoices.filter(i => i.status === 'Pending');
        const overdue = invoices.filter(i => i.status === 'Overdue');
        const draft = invoices.filter(i => i.status === 'Draft');
        const cancelled = invoices.filter(i => i.status === 'Cancelled');

        const sumAmt = (arr: typeof invoices) => arr.reduce((s, i) => s + Number(i.amount || 0), 0);

        // Paid invoices: last 3 months vs prior 3 months
        const last3End = endOfDay(now);
        const last3Start = new Date(y, m - 2, 1);
        const prior3End = endOfDay(new Date(last3Start.getTime() - 1));
        const prior3Start = new Date(y, m - 5, 1);

        const paidLast3 = paid.filter(i => isInPeriod(i.issue_date || i.created_at, last3Start, last3End));
        const paidPrior3 = paid.filter(i => isInPeriod(i.issue_date || i.created_at, prior3Start, prior3End));

        // Current income = all paid this year
        const thisYearStart = new Date(y, 0, 1);
        const paidThisYear = paid.filter(i => isInPeriod(i.issue_date || i.created_at, thisYearStart, last3End));
        const paidLastYear = paid.filter(i => {
            const d = i.issue_date || i.created_at;
            if (!d) return false;
            return new Date(d).getFullYear() === y - 1;
        });

        // Missing: pending + overdue (money owed)
        const missing = [...pending, ...overdue].reduce((s, i) => s + Number(i.amount || 0), 0);

        return {
            paid: { count: paid.length, amount: sumAmt(paid) },
            pending: { count: pending.length, amount: sumAmt(pending) },
            overdue: { count: overdue.length, amount: sumAmt(overdue) },
            draft: { count: draft.length, amount: sumAmt(draft) },
            cancelled: { count: cancelled.length, amount: sumAmt(cancelled) },
            total: { count: invoices.length, amount: sumAmt(invoices) },
            paidLast3Amount: sumAmt(paidLast3),
            paidPrior3Amount: sumAmt(paidPrior3),
            paidPrior3Count: paidPrior3.length,
            currentIncome: sumAmt(paidThisYear),
            lastYearIncome: sumAmt(paidLastYear),
            missing,
            missingCount: pending.length + overdue.length,
        };
    }, [invoices, y, m]);

    /* ── Proposal stats ── */
    const proposalStats = useMemo(() => {
        const accepted = proposals.filter(p => p.status === 'Accepted');
        const declined = proposals.filter(p => p.status === 'Declined');
        const pending = proposals.filter(p => p.status === 'Pending');
        const overdue = proposals.filter(p => p.status === 'Overdue');
        const cancelled = proposals.filter(p => p.status === 'Cancelled');
        const draft = proposals.filter(p => p.status === 'Draft');
        const sumAmt = (arr: typeof proposals) => arr.reduce((s, p) => s + Number(p.amount || 0), 0);

        // Signed (accepted) last 30 days
        const signedLast30 = accepted.filter(p => isInPeriod(p.issue_date || p.created_at, last30Start, last30End));
        const signedPrior30 = accepted.filter(p => isInPeriod(p.issue_date || p.created_at, prior30Start, prior30End));

        return {
            accepted: { count: accepted.length, amount: sumAmt(accepted) },
            declined: { count: declined.length, amount: sumAmt(declined) },
            pending: { count: pending.length, amount: sumAmt(pending) },
            overdue: { count: overdue.length, amount: sumAmt(overdue) },
            cancelled: { count: cancelled.length, amount: sumAmt(cancelled) },
            draft: { count: draft.length, amount: sumAmt(draft) },
            total: { count: proposals.length, amount: sumAmt(proposals) },
            signedLast30Count: signedLast30.length,
            signedPrior30Count: signedPrior30.length,
            signedLast30Amount: sumAmt(signedLast30),
        };
    }, [proposals, last30Start, last30End, prior30Start, prior30End]);

    /* ── Chart data ── */
    const invoiceChartData: BarData[] = useMemo(() => [
        { label: 'Paid', value: invoiceStats.paid.amount, color: '#22c55e' },
        { label: 'Pending', value: invoiceStats.pending.amount, color: '#f59e0b' },
        { label: 'Overdue', value: invoiceStats.overdue.amount, color: '#ef4444' },
        { label: 'Draft', value: invoiceStats.draft.amount, color: '#6366f1' },
        { label: 'Cancelled', value: invoiceStats.cancelled.amount, color: '#94a3b8' },
    ], [invoiceStats]);

    const proposalChartData: BarData[] = useMemo(() => [
        { label: 'Accepted', value: proposalStats.accepted.amount, color: '#22c55e' },
        { label: 'Pending', value: proposalStats.pending.amount, color: '#f59e0b' },
        { label: 'Overdue', value: proposalStats.overdue.amount, color: '#ef4444' },
        { label: 'Declined', value: proposalStats.declined.amount, color: '#78716c' },
        { label: 'Cancelled', value: proposalStats.cancelled.amount, color: '#94a3b8' },
        { label: 'Draft', value: proposalStats.draft.amount, color: '#6366f1' },
    ], [proposalStats]);

    /* ── Heatmap data ── */
    const heatmapData = useMemo(() => {
        const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
        return Array.from({ length: 12 }, (_, monthIdx) => {
            const days = daysInMonth(heatmapYear, monthIdx);
            return Array.from({ length: days }, (_, dayIdx) => {
                const dayStart = new Date(heatmapYear, monthIdx, dayIdx + 1, 0, 0, 0);
                const dayEnd = new Date(heatmapYear, monthIdx, dayIdx + 1, 23, 59, 59);
                return invoices
                    .filter(inv => inv.status === 'Paid' && isInPeriod(inv.issue_date || inv.created_at, dayStart, dayEnd))
                    .reduce((s, inv) => s + Number(inv.amount || 0), 0);
            });
        });
    }, [invoices, heatmapYear]);

    /* ── Percentage changes ── */
    const paidLast3Change = pctChange(invoiceStats.paidLast3Amount, invoiceStats.paidPrior3Amount);
    const currentIncomeChange = pctChange(invoiceStats.currentIncome, invoiceStats.lastYearIncome);
    const signedProposalsChange = pctChange(proposalStats.signedLast30Count, proposalStats.signedPrior30Count);

    /* ── Greeting ── */
    const greeting = useMemo(() => {
        const h = now.getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    }, []);

    const displayName = profile?.full_name
        || user?.user_metadata?.full_name
        || user?.email?.split('@')[0]?.toUpperCase()
        || 'there';
    const firstName = displayName.split(' ')[0];


    const border = isDark ? 'border-[#252525]' : 'border-[#ebebeb]';

    return (
        <div className={cn(
            "flex flex-col h-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-[#f7f7f7] text-[#111]"
        )}>
            {/* ── Page header — hidden on mobile (MobileTopBar handles it) ── */}
            <div className={cn(
                "hidden md:flex items-center justify-between px-5 py-3 shrink-0",
                isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-white"
            )}>
                <div>
                    <h1 className="text-[15px] font-semibold tracking-tight">Dashboard</h1>
                    <p className={cn("text-[11px] mt-0.5", isDark ? "text-[#555]" : "text-[#bbb]")}>
                        {greeting}, {firstName} · {(() => {
                            const day = now.getDate();
                            const month = now.toLocaleDateString('en-GB', { month: 'long' });
                            const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' });
                            return `${weekday}, ${day} ${month}`;
                        })()}
                    </p>
                </div>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-auto">
                <div className="p-3 md:p-4 flex flex-col gap-3">

                    {/* ── Row 1: KPI Cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <KpiCard
                            label="Paid Invoices (3 Months)"
                            value={invoiceStats.paidLast3Amount}
                            subValue={`${invoiceStats.paid.count} total paid`}
                            change={paidLast3Change}
                            icon={<Receipt size={13} className="text-white" />}
                            iconBg="#22c55e"
                            isDark={isDark}
                        />
                        <KpiCard
                            label="Current Year Revenue"
                            value={invoiceStats.currentIncome}
                            subValue={<>vs {invoiceStats.lastYearIncome === 0 ? 'no data' : <MoneyAmount amount={invoiceStats.lastYearIncome} />} last year</>}
                            change={currentIncomeChange}
                            icon={<TrendingUp size={13} className="text-white" />}
                            iconBg="#6366f1"
                            isDark={isDark}
                        />
                        <KpiCard
                            label="Signed Proposals (30d)"
                            value={String(proposalStats.signedLast30Count)}
                            subValue={proposalStats.signedLast30Amount > 0 ? <MoneyAmount amount={proposalStats.signedLast30Amount} /> : `${proposalStats.accepted.count} total accepted`}
                            change={signedProposalsChange}
                            icon={<FileText size={13} className="text-white" />}
                            iconBg="#f59e0b"
                            isDark={isDark}
                        />
                        <KpiCard
                            label="Uncollected Revenue"
                            value={invoiceStats.missing}
                            subValue={`${invoiceStats.missingCount} outstanding invoice${invoiceStats.missingCount !== 1 ? 's' : ''}`}
                            change={null}
                            icon={<AlertCircle size={13} className="text-white" />}
                            iconBg="#ef4444"
                            isDark={isDark}
                        />
                    </div>

                    {/* ── Row 2: Charts ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Invoice chart */}
                        <div className={cn("rounded-[10px] border p-4",
                            isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-white border-[#ebebeb]")}>
                            <div className="mb-3">
                                <div className={cn("text-[12px] font-semibold", isDark ? "text-[#e5e5e5]" : "text-[#111]")}>
                                    All-Time Invoices
                                </div>
                                <div className={cn("text-[10px] mt-0.5", isDark ? "text-[#555]" : "text-[#bbb]")}>
                                    Total value by status · <MoneyAmount amount={invoiceStats.total.amount} />
                                </div>
                            </div>
                            <div style={{ height: 140 }}>
                                <BarChart data={invoiceChartData} isDark={isDark} />
                            </div>
                        </div>

                        {/* Proposal chart */}
                        <div className={cn("rounded-[10px] border p-4",
                            isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-white border-[#ebebeb]")}>
                            <div className="mb-3">
                                <div className={cn("text-[12px] font-semibold", isDark ? "text-[#e5e5e5]" : "text-[#111]")}>
                                    All-Time Proposals
                                </div>
                                <div className={cn("text-[10px] mt-0.5", isDark ? "text-[#555]" : "text-[#bbb]")}>
                                    Total value by status · <MoneyAmount amount={proposalStats.total.amount} />
                                </div>
                            </div>
                            <div style={{ height: 140 }}>
                                <BarChart data={proposalChartData} isDark={isDark} />
                            </div>
                        </div>
                    </div>

                    {/* ── Row 3: Breakdowns + Heatmap (Combined) ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr] gap-3">

                        {/* Invoice breakdown */}
                        <div className={cn("rounded-[10px] border p-4",
                            isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-white border-[#ebebeb]")}>
                            <div className={cn("text-[12px] font-semibold mb-3", isDark ? "text-[#e5e5e5]" : "text-[#111]")}>
                                Invoice Breakdown
                            </div>
                            <StatusRow label="Paid" count={invoiceStats.paid.count} amount={invoiceStats.paid.amount}
                                icon={<CheckCircle2 size={12} />} iconColor="#22c55e" barColor="#22c55e" isDark={isDark} />
                            <StatusRow label="Pending" count={invoiceStats.pending.count} amount={invoiceStats.pending.amount}
                                icon={<Clock size={12} />} iconColor="#f59e0b" barColor="#f59e0b" isDark={isDark} />
                            <StatusRow label="Overdue" count={invoiceStats.overdue.count} amount={invoiceStats.overdue.amount}
                                icon={<AlertCircle size={12} />} iconColor="#ef4444" barColor="#ef4444" isDark={isDark} />
                            <StatusRow label="Draft" count={invoiceStats.draft.count} amount={invoiceStats.draft.amount}
                                icon={<FileText size={12} />} iconColor="#6366f1" barColor="#6366f1" isDark={isDark} />
                            <StatusRow label="Cancelled" count={invoiceStats.cancelled.count} amount={invoiceStats.cancelled.amount}
                                icon={<Ban size={12} />} iconColor="#94a3b8" barColor="#94a3b8" isDark={isDark} />
                        </div>

                        {/* Proposal breakdown */}
                        <div className={cn("rounded-[10px] border p-4",
                            isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-white border-[#ebebeb]")}>
                            <div className={cn("text-[12px] font-semibold mb-3", isDark ? "text-[#e5e5e5]" : "text-[#111]")}>
                                Proposal Breakdown
                            </div>
                            <StatusRow label="Accepted" count={proposalStats.accepted.count} amount={proposalStats.accepted.amount}
                                icon={<CheckCircle2 size={12} />} iconColor="#22c55e" barColor="#22c55e" isDark={isDark} />
                            <StatusRow label="Pending" count={proposalStats.pending.count} amount={proposalStats.pending.amount}
                                icon={<Clock size={12} />} iconColor="#f59e0b" barColor="#f59e0b" isDark={isDark} />
                            <StatusRow label="Declined" count={proposalStats.declined.count} amount={proposalStats.declined.amount}
                                icon={<AlertCircle size={12} />} iconColor="#ef4444" barColor="#ef4444" isDark={isDark} />
                            <StatusRow label="Draft" count={proposalStats.draft.count} amount={proposalStats.draft.amount}
                                icon={<FileText size={12} />} iconColor="#6366f1" barColor="#6366f1" isDark={isDark} />
                            <StatusRow label="Cancelled" count={proposalStats.cancelled.count} amount={proposalStats.cancelled.amount}
                                icon={<Ban size={12} />} iconColor="#94a3b8" barColor="#94a3b8" isDark={isDark} />
                        </div>

                        {/* Income Heatmap (Fits in the 3rd 2fr column) */}
                        <IncomeHeatmap
                            heatmapData={heatmapData}
                            year={heatmapYear}
                            onYearChange={setHeatmapYear}
                            isDark={isDark}
                        />

                    </div>

                </div>
            </div>
        </div>
    );
}
