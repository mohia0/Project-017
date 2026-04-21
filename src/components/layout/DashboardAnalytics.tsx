"use client";

import React, { useMemo, useState } from 'react';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useProposalStore } from '@/store/useProposalStore';
import { cn } from '@/lib/utils';
import { MoneyAmount } from '@/components/ui/MoneyAmount';
import {
    TrendingUp, Wallet, Award, Users, Gem, Zap, CheckCircle,
    Clock, Lightbulb, ChevronLeft, ChevronRight
} from 'lucide-react';

/* ─── helpers ────────────────────────────────────────────────── */
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ─── SVG Line / Area chart ──────────────────────────────────── */
function LineAreaChart({
    points, w = 400, h = 120, fill, stroke, label, isDark, yMax
}: {
    points: number[]; w?: number; h?: number; fill: string; stroke: string;
    label: string; isDark: boolean; yMax?: number;
}) {
    if (points.length < 2) return (
        <div className="flex items-center justify-center h-full text-xs opacity-30">
            {points.length === 0 ? 'No data yet' : 'Need more data'}
        </div>
    );
    const max = yMax ?? Math.max(...points, 1);
    const pad = { l: 4, r: 4, t: 8, b: 4 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const xs = points.map((_, i) => pad.l + (i / (points.length - 1)) * cw);
    const ys = points.map(v => pad.t + ch - (v / max) * ch);
    const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    const area = path + ` L${xs[xs.length-1].toFixed(1)},${(pad.t+ch).toFixed(1)} L${xs[0].toFixed(1)},${(pad.t+ch).toFixed(1)} Z`;
    const gradId = `g_${label.replace(/\s/g,'_')}`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stroke} stopOpacity="0.3"/>
                    <stop offset="100%" stopColor={stroke} stopOpacity="0.02"/>
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gradId})`} />
            <path d={path} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
            {/* last dot */}
            <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="3" fill={stroke} />
        </svg>
    );
}

/* ─── Donut ──────────────────────────────────────────────────── */
interface DonutSlice { label: string; value: number; color: string; }
function DonutChart({ slices, size = 100, thickness = 20, center }: {
    slices: DonutSlice[]; size?: number; thickness?: number; center: React.ReactNode;
}) {
    const total = slices.reduce((s, x) => s + x.value, 0) || 1;
    const r = (size - thickness) / 2;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size, flexShrink: 0 }}>
            <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full -rotate-90" style={{ transform: 'rotate(-90deg)' }}>
                {slices.map((s, i) => {
                    const frac = s.value / total;
                    const dash = frac * circ;
                    const gap = circ - dash;
                    const el = (
                        <circle key={i}
                            cx={size/2} cy={size/2} r={r}
                            fill="none" stroke={s.color} strokeWidth={thickness}
                            strokeDasharray={`${dash} ${gap}`}
                            strokeDashoffset={-offset * circ}
                        />
                    );
                    offset += frac;
                    return el;
                })}
            </svg>
            <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
                {center}
            </div>
        </div>
    );
}

/* ─── Horizontal bar ─────────────────────────────────────────── */
function HBar({ label, value, max, color, isDark }: { label: string; value: number; max: number; color: string; isDark: boolean }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="flex items-center gap-2 min-w-0">
            <span className={cn("text-[10px] truncate w-20 shrink-0 text-right", isDark ? "text-[#777]" : "text-[#888]")}>{label}</span>
            <div className={cn("flex-1 rounded-full h-[5px]", isDark ? "bg-[#232323]" : "bg-[#f0f0f0]")}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className={cn("text-[10px] tabular-nums shrink-0 font-semibold", isDark ? "text-[#ccc]" : "text-[#222]")}>
                <MoneyAmount amount={value} abbreviate />
            </span>
        </div>
    );
}

/* ─── Insight tile ────────────────────────────────────────────── */
function InsightTile({ icon, label, value, sub, color, isDark }: {
    icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode; color: string; isDark: boolean;
}) {
    return (
        <div className={cn("rounded-[10px] border p-3 flex items-center gap-3",
            isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-white border-[#ebebeb]")}>
            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18`, color }}>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <div className={cn("text-[10px]", isDark ? "text-[#555]" : "text-[#999]")}>{label}</div>
                <div className={cn("text-[15px] font-bold tracking-tight leading-tight", isDark ? "text-[#e5e5e5]" : "text-[#111]")}>{value}</div>
                {sub && <div className={cn("text-[9px] mt-0.5", isDark ? "text-[#444]" : "text-[#bbb]")}>{sub}</div>}
            </div>
        </div>
    );
}

/* ─── Smart suggestion item ──────────────────────────────────── */
function Suggestion({ text, type, isDark }: { text: React.ReactNode; type: 'warn' | 'good' | 'tip'; isDark: boolean }) {
    const colors = { warn: '#f59e0b', good: '#22c55e', tip: '#6366f1' };
    const c = colors[type];
    return (
        <div className={cn("flex items-start gap-2 py-1.5 border-b last:border-b-0",
            isDark ? "border-[#1e1e1e]" : "border-[#f5f5f5]")}>
            <div className="mt-[3px] w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
            <div className={cn("text-[11px] leading-snug", isDark ? "text-[#aaa]" : "text-[#555]")}>{text}</div>
        </div>
    );
}

/* ─── Card wrapper ───────────────────────────────────────────── */
function Card({ title, sub, children, isDark, className }: {
    title: string; sub?: string; children: React.ReactNode; isDark: boolean; className?: string;
}) {
    return (
        <div className={cn("rounded-[10px] border p-3 flex flex-col min-h-0",
            isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-white border-[#ebebeb]", className)}>
            <div className="shrink-0 mb-2">
                <div className={cn("text-[11px] font-semibold", isDark ? "text-[#e5e5e5]" : "text-[#111]")}>{title}</div>
                {sub && <div className={cn("text-[9px] mt-0.5", isDark ? "text-[#555]" : "text-[#bbb]")}>{sub}</div>}
            </div>
            <div className="flex-1 min-h-0">{children}</div>
        </div>
    );
}

/* ─── Main Analytics Component ──────────────────────────────── */
export default function DashboardAnalytics({ isDark }: { isDark: boolean }) {
    const { invoices } = useInvoiceStore();
    const { proposals } = useProposalStore();

    const now = new Date();
    const thisYear = now.getFullYear();
    const [chartYear, setChartYear] = useState(thisYear);

    /* ── Paid invoices sorted by date ── */
    const paidSorted = useMemo(() =>
        invoices.filter(i => i.status === 'Paid')
            .sort((a, b) => new Date(a.issue_date || a.created_at).getTime() - new Date(b.issue_date || b.created_at).getTime()),
        [invoices]
    );

    /* ── Lifetime cumulative balance ── */
    const lifetimePoints = useMemo(() => {
        let cum = 0;
        return paidSorted.map(i => { cum += Number(i.amount || 0); return cum; });
    }, [paidSorted]);

    /* ── Monthly revenue for selected year ── */
    const monthlyRevenue = useMemo(() => {
        const totals = Array(12).fill(0);
        invoices.filter(i => i.status === 'Paid').forEach(i => {
            const d = new Date(i.issue_date || i.created_at);
            if (d.getFullYear() === chartYear) totals[d.getMonth()] += Number(i.amount || 0);
        });
        return totals;
    }, [invoices, chartYear]);

    /* ── Invoice donut ── */
    const invoiceDonut: DonutSlice[] = useMemo(() => {
        const byStatus: Record<string, number> = {};
        invoices.forEach(i => { byStatus[i.status] = (byStatus[i.status] || 0) + Number(i.amount || 0); });
        const map: Record<string, string> = { Paid: '#22c55e', Pending: '#f59e0b', Overdue: '#ef4444', Draft: '#6366f1', Cancelled: '#94a3b8' };
        return Object.entries(byStatus).filter(([, v]) => v > 0).map(([k, v]) => ({ label: k, value: v, color: map[k] || '#888' }));
    }, [invoices]);

    /* ── Proposal win-rate donut ── */
    const proposalDonut: DonutSlice[] = useMemo(() => {
        const acc = proposals.filter(p => p.status === 'Accepted').reduce((s, p) => s + Number(p.amount || 0), 0);
        const dec = proposals.filter(p => p.status === 'Declined').reduce((s, p) => s + Number(p.amount || 0), 0);
        const pend = proposals.filter(p => p.status === 'Pending' || p.status === 'Draft' || p.status === 'Overdue').reduce((s, p) => s + Number(p.amount || 0), 0);
        return [
            { label: 'Won', value: acc, color: '#22c55e' },
            { label: 'Lost', value: dec, color: '#ef4444' },
            { label: 'Open', value: pend, color: '#f59e0b' },
        ].filter(s => s.value > 0);
    }, [proposals]);

    const winRate = useMemo(() => {
        const acc = proposals.filter(p => p.status === 'Accepted').length;
        const dec = proposals.filter(p => p.status === 'Declined').length;
        const total = acc + dec;
        return total === 0 ? null : Math.round((acc / total) * 100);
    }, [proposals]);

    /* ── Top clients by paid revenue ── */
    const topClients = useMemo(() => {
        const map: Record<string, number> = {};
        invoices.filter(i => i.status === 'Paid').forEach(i => {
            const key = i.client_name || 'Unknown';
            map[key] = (map[key] || 0) + Number(i.amount || 0);
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
    }, [invoices]);

    const topClientMax = topClients[0]?.[1] || 1;

    /* ── Insight metrics ── */
    const insights = useMemo(() => {
        const totalPaid = paidSorted.reduce((s, i) => s + Number(i.amount || 0), 0);
        const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
        const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;
        const avgInvoiceVal = invoices.length > 0 ? totalInvoiced / invoices.length : 0;

        // avg days to pay
        let daysSum = 0; let daysCount = 0;
        paidSorted.forEach(i => {
            const startStr = i.issue_date || i.created_at || '';
            if (i.paid_at && startStr) {
                const payDateStr = i.paid_at.substring(0, 10);
                const startDateStr = startStr.substring(0, 10);
                let d = (new Date(payDateStr).getTime() - new Date(startDateStr).getTime()) / 86400000;
                d = Math.round(d); // Smooth out any fractional DST daylight savings errors
                
                // Keep a console log just to help user debug the specific invoices taking huge days to pay
                if (typeof window !== 'undefined' && d > 20) {
                     console.log(`[Days To Pay Debug] Invoice: "${i.title || i.id}" | Issued: ${startDateStr} | Paid: ${payDateStr} | Days: ${d}`);
                }
                
                // Payment before issue date shouldn't negatively skew, cap cleanly at 0.
                if (d > -100 && d < 700) { daysSum += Math.max(0, d); daysCount++; }
            }
        });
        const avgDays = daysCount > 0 ? Math.round(daysSum / daysCount) : null;

        // best month (all time)
        const monthTotals: Record<string, number> = {};
        paidSorted.forEach(i => {
            const d = new Date(i.issue_date || i.created_at);
            const key = `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
            monthTotals[key] = (monthTotals[key] || 0) + Number(i.amount || 0);
        });
        const bestEntry = Object.entries(monthTotals).sort((a, b) => b[1] - a[1])[0];

        // NEW: Largest Deal
        let largestDeal = 0;
        paidSorted.forEach(i => {
            if (Number(i.amount || 0) > largestDeal) largestDeal = Number(i.amount || 0);
        });

        // NEW: Repeat Client Rate
        const clientInvoiceCounts: Record<string, number> = {};
        paidSorted.forEach(i => {
            const cl = i.client_name || 'Unknown';
            clientInvoiceCounts[cl] = (clientInvoiceCounts[cl] || 0) + 1;
        });
        const totalClients = Object.keys(clientInvoiceCounts).length;
        const repeatClients = Object.values(clientInvoiceCounts).filter(c => c > 1).length;
        const repeatRate = totalClients === 0 ? 0 : Math.round((repeatClients / totalClients) * 100);
        const avgCLV = totalClients === 0 ? 0 : totalPaid / totalClients;

        // NEW: Proposal Win Velocity
        let winDaysSum = 0; let winDaysCount = 0;
        proposals.filter(p => p.status === 'Accepted').forEach(p => {
             const startStr = p.issue_date || p.created_at || '';
             if (p.accepted_at && startStr) {
                 const d = (new Date(p.accepted_at.substring(0,10)).getTime() - new Date(startStr.substring(0,10)).getTime()) / 86400000;
                 const rd = Math.round(d);
                 if (rd >= 0 && rd < 365) { winDaysSum += rd; winDaysCount++; }
             }
        });
        const avgWinDays = winDaysCount > 0 ? Math.round(winDaysSum / winDaysCount) : null;

        return { 
            totalPaid, totalInvoiced, collectionRate, avgInvoiceVal, avgDays, bestMonth: bestEntry,
            largestDeal, repeatRate, avgCLV, avgWinDays
        };
    }, [paidSorted, invoices, proposals]);

    /* ── Smart suggestions ── */
    const suggestions = useMemo(() => {
        const list: Array<{ text: React.ReactNode; type: 'warn' | 'good' | 'tip' }> = [];

        const overdue = invoices.filter(i => i.status === 'Overdue');
        if (overdue.length > 0) {
            const overdueAmt = overdue.reduce((s, i) => s + Number(i.amount || 0), 0);
            list.push({ text: <><strong>{overdue.length}</strong> overdue invoice{overdue.length > 1 ? 's' : ''} totalling <strong><MoneyAmount amount={overdueAmt} /></strong> — follow up immediately.</>, type: 'warn' });
        }

        if (insights.collectionRate >= 80) {
            list.push({ text: <>Your collection rate is <strong>{insights.collectionRate}%</strong> — excellent cash flow health.</>, type: 'good' });
        } else if (insights.collectionRate > 0) {
            list.push({ text: <>Collection rate is <strong>{insights.collectionRate}%</strong>. Consider sending payment reminders to improve cash flow.</>, type: 'tip' });
        }

        if (insights.avgDays !== null && insights.avgDays > 30) {
            list.push({ text: <>Average payment takes <strong>{insights.avgDays} days</strong>. Consider shorter payment terms or early-pay discounts.</>, type: 'tip' });
        } else if (insights.avgDays !== null && insights.avgDays <= 14) {
            list.push({ text: <>Clients pay in <strong>{insights.avgDays} days</strong> on average — faster than industry standard.</>, type: 'good' });
        }

        if (winRate !== null && winRate >= 60) {
            list.push({ text: <>Proposal win rate is <strong>{winRate}%</strong> — strong conversion. Keep your pricing competitive.</>, type: 'good' });
        } else if (winRate !== null && winRate < 40) {
            list.push({ text: <>Proposal win rate is <strong>{winRate}%</strong>. Review your pricing or proposal presentation to improve conversions.</>, type: 'warn' });
        }

        if (insights.bestMonth) {
            list.push({ text: <><strong>{insights.bestMonth[0]}</strong> was your best revenue month — study what drove that peak.</>, type: 'tip' });
        }

        if (topClients.length > 0) {
            const topName = topClients[0][0];
            const topPct = insights.totalPaid > 0 ? Math.round((topClients[0][1] / insights.totalPaid) * 100) : 0;
            if (topPct > 40) {
                list.push({ text: <><strong>{topName}</strong> accounts for <strong>{topPct}%</strong> of your revenue — consider diversifying your client base.</>, type: 'warn' });
            }
        }

        const pendingProposals = proposals.filter(p => p.status === 'Pending');
        if (pendingProposals.length > 0) {
            const pendAmt = pendingProposals.reduce((s, p) => s + Number(p.amount || 0), 0);
            list.push({ text: <><strong>{pendingProposals.length}</strong> pending proposal{pendingProposals.length > 1 ? 's' : ''} worth <strong><MoneyAmount amount={pendAmt} /></strong> waiting for a decision.</>, type: 'tip' });
        }

        if (list.length === 0) {
            list.push({ text: <>No active issues detected. Keep up the great work!</>, type: 'good' });
        }

        return list.slice(0, 5);
    }, [invoices, proposals, insights, winRate, topClients]);

    const totalInvoiceAmt = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);

    return (
        <div className="flex-1 min-h-0 p-3 md:p-4 overflow-hidden">
            {/* Main grid — 3 rows */}
            <div className="h-full grid gap-3" style={{ gridTemplateRows: '1fr 1fr auto' }}>

                {/* ── Row 1: Lifetime balance | Monthly Revenue | Win Rate donut ── */}
                <div className="grid gap-3 min-h-0" style={{ gridTemplateColumns: '2fr 2fr 1fr' }}>

                    {/* Lifetime Balance */}
                    <Card title="Lifetime Balance" sub={`Cumulative revenue · ${paidSorted.length} paid invoices`} isDark={isDark}>
                        {lifetimePoints.length >= 2 ? (
                            <div className="h-full flex flex-col justify-between gap-1">
                                <div className="flex-1 min-h-0">
                                    <LineAreaChart points={lifetimePoints} stroke="#22c55e" fill="#22c55e" label="lifetime" isDark={isDark} h={90} />
                                </div>
                                <div className="flex items-center justify-between shrink-0">
                                    <span className={cn("text-[9px]", isDark ? "text-[#444]" : "text-[#bbb]")}>
                                        {new Date(paidSorted[0].issue_date || paidSorted[0].created_at).getFullYear()}
                                    </span>
                                    <span className={cn("text-[14px] font-bold tabular-nums", isDark ? "text-green-400" : "text-green-600")}>
                                        <MoneyAmount amount={lifetimePoints[lifetimePoints.length - 1] || 0} />
                                    </span>
                                    <span className={cn("text-[9px]", isDark ? "text-[#444]" : "text-[#bbb]")}>Now</span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <span className={cn("text-xs", isDark ? "text-[#444]" : "text-[#ccc]")}>Pay invoices to see your balance grow</span>
                            </div>
                        )}
                    </Card>

                    {/* Monthly Revenue */}
                    <Card
                        title={`Monthly Revenue · ${chartYear}`}
                        sub="Paid invoices grouped by month"
                        isDark={isDark}
                    >
                        <div className="h-full flex flex-col gap-1 min-h-0">
                            {/* area chart rows */}
                            <div className="flex-1 min-h-0">
                                <LineAreaChart points={monthlyRevenue} stroke="#6366f1" fill="#6366f1" label="monthly" isDark={isDark} h={80} />
                            </div>
                            {/* month labels + year nav */}
                            <div className="flex items-center justify-between shrink-0 mt-1">
                                <button onClick={() => setChartYear(y => y - 1)}
                                    className={cn("w-5 h-5 rounded flex items-center justify-center",
                                        isDark ? "text-[#555] hover:text-[#aaa]" : "text-[#ccc] hover:text-[#555]")}>
                                    <ChevronLeft size={11} />
                                </button>
                                <div className="flex gap-0.5 flex-1 mx-1">
                                    {MONTH_SHORT.map((m, i) => (
                                        <div key={m} className="flex-1 text-center" style={{ fontSize: 7 }}>
                                            <span className={cn(isDark ? "text-[#444]" : "text-[#ccc]")}>{m[0]}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setChartYear(y => Math.min(y + 1, thisYear))}
                                    className={cn("w-5 h-5 rounded flex items-center justify-center",
                                        isDark ? "text-[#555] hover:text-[#aaa]" : "text-[#ccc] hover:text-[#555]")}
                                    disabled={chartYear >= thisYear}>
                                    <ChevronRight size={11} />
                                </button>
                            </div>
                        </div>
                    </Card>

                    {/* Proposal Win Rate */}
                    <Card title="Win Rate" sub="Accepted vs declined proposals" isDark={isDark}>
                        <div className="h-full flex flex-col items-center justify-center gap-2">
                            <DonutChart
                                slices={proposalDonut.length > 0 ? proposalDonut : [{ label: 'No data', value: 1, color: isDark ? '#333' : '#eee' }]}
                                size={80} thickness={14}
                                center={
                                    <span className={cn("text-[15px] font-black tabular-nums", isDark ? "text-[#e5e5e5]" : "text-[#111]")}>
                                        {winRate !== null ? `${winRate}%` : '—'}
                                    </span>
                                }
                            />
                            <div className="flex flex-col gap-1 w-full">
                                {proposalDonut.map(s => (
                                    <div key={s.label} className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                        <span className={cn("text-[9px] flex-1", isDark ? "text-[#666]" : "text-[#999]")}>{s.label}</span>
                                        <span className={cn("text-[9px] tabular-nums font-semibold", isDark ? "text-[#ccc]" : "text-[#333]")}>
                                            <MoneyAmount amount={s.value} abbreviate />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* ── Row 2: Top Clients | Invoice Donut ── */}
                <div className="grid gap-3 min-h-0" style={{ gridTemplateColumns: '2fr 1fr' }}>

                    {/* Top Clients */}
                    <Card title="Top Clients by Revenue" sub="Ranked by total paid invoices" isDark={isDark}>
                        {topClients.length > 0 ? (
                            <div className="h-full flex flex-col justify-around gap-1">
                                {topClients.map(([name, val]) => (
                                    <HBar key={name} label={name} value={val} max={topClientMax} color="#6366f1" isDark={isDark} />
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <span className={cn("text-xs", isDark ? "text-[#444]" : "text-[#ccc]")}>No paid invoices yet</span>
                            </div>
                        )}
                    </Card>

                    {/* Invoice Status Donut */}
                    <Card title="Invoice Mix" sub={`Total invoiced · ${totalInvoiceAmt > 0 ? '' : 'No data'}`} isDark={isDark}>
                        <div className="h-full flex flex-col items-center justify-center gap-2">
                            <DonutChart
                                slices={invoiceDonut.length > 0 ? invoiceDonut : [{ label: 'No data', value: 1, color: isDark ? '#333' : '#eee' }]}
                                size={80} thickness={14}
                                center={
                                    <span className={cn("text-[10px] font-black tabular-nums text-center leading-tight", isDark ? "text-[#e5e5e5]" : "text-[#111]")}>
                                        {invoices.length}<br/>
                                        <span className={cn("text-[8px] font-normal", isDark ? "text-[#555]" : "text-[#aaa]")}>total</span>
                                    </span>
                                }
                            />
                            <div className="flex flex-col gap-1 w-full">
                                {invoiceDonut.map(s => (
                                    <div key={s.label} className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                        <span className={cn("text-[9px] flex-1", isDark ? "text-[#666]" : "text-[#999]")}>{s.label}</span>
                                        <span className={cn("text-[9px] tabular-nums font-semibold", isDark ? "text-[#ccc]" : "text-[#333]")}>
                                            <MoneyAmount amount={s.value} abbreviate />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* ── Row 3: Insight tiles + Smart suggestions ── */}
                <div className="grid gap-3" style={{ gridTemplateColumns: '4fr 1.6fr' }}>
                    
                    {/* Metrics 2x4 Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <InsightTile
                            icon={<Wallet size={14} />} color="#22c55e"
                            label="Collection Rate" value={`${insights.collectionRate}%`}
                            sub="of all invoiced amount" isDark={isDark}
                        />
                        <InsightTile
                            icon={<TrendingUp size={14} />} color="#6366f1"
                            label="Avg Invoice" value={<MoneyAmount amount={insights.avgInvoiceVal} abbreviate />}
                            sub="across all statuses" isDark={isDark}
                        />
                        <InsightTile
                            icon={<Clock size={14} />} color="#f59e0b"
                            label="Avg Days to Pay"
                            value={insights.avgDays !== null ? `${insights.avgDays}d` : '—'}
                            sub={insights.avgDays !== null ? "from issue to payment" : "no payment data yet"} isDark={isDark}
                        />
                        <InsightTile
                            icon={<Award size={14} />} color="#ec4899"
                            label="Best Month"
                            value={insights.bestMonth ? insights.bestMonth[0] : '—'}
                            sub={insights.bestMonth ? <MoneyAmount amount={insights.bestMonth[1]} /> as any : 'no data'} isDark={isDark}
                        />
                        
                        <InsightTile
                            icon={<Gem size={14} />} color="#06b6d4"
                            label="Largest Deal" value={<MoneyAmount amount={insights.largestDeal} abbreviate />}
                            sub="single biggest paid invoice" isDark={isDark}
                        />
                        <InsightTile
                            icon={<Users size={14} />} color="#8b5cf6"
                            label="Repeat Clients" value={`${insights.repeatRate}%`}
                            sub="clients with >1 paid invoice" isDark={isDark}
                        />
                        <InsightTile
                            icon={<CheckCircle size={14} />} color="#10b981"
                            label="Avg Client Value" value={<MoneyAmount amount={insights.avgCLV} abbreviate />}
                            sub="lifetime value per client" isDark={isDark}
                        />
                        <InsightTile
                            icon={<Zap size={14} />} color="#f43f5e"
                            label="Time to Win"
                            value={insights.avgWinDays !== null ? `${insights.avgWinDays}d` : '—'}
                            sub={insights.avgWinDays !== null ? "from proposal to accepted" : "no proposal data yet"} isDark={isDark}
                        />
                    </div>

                    {/* Smart Suggestions */}
                    <div className={cn("rounded-[10px] border p-3 flex flex-col",
                        isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-white border-[#ebebeb]")}>
                        <div className="flex items-center gap-1.5 mb-2 shrink-0">
                            <Lightbulb size={11} className={isDark ? "text-[#f59e0b]" : "text-[#f59e0b]"} />
                            <span className={cn("text-[11px] font-semibold", isDark ? "text-[#e5e5e5]" : "text-[#111]")}>Smart Insights</span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            {suggestions.map((s, i) => <Suggestion key={i} text={s.text} type={s.type} isDark={isDark} />)}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
