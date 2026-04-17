"use client";

import React, { useState } from 'react';
import { X, ChevronRight, Clock, MapPin, User, Check } from 'lucide-react';
import { useTemplateStore } from '@/store/useTemplateStore';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useRouter } from 'next/navigation';
import { appToast } from '@/lib/toast';

interface Props {
    open: boolean;
    onClose: () => void;
}

const DURATION_OPTS = [
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '1 hr',  value: 60 },
    { label: '2 hr',  value: 120 },
];

export function CreateSchedulerModal({ open, onClose }: Props) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { addScheduler } = useSchedulerStore();
    const { workspaces } = useWorkspaceStore();
    const router = useRouter();

    const { templates, fetchTemplates } = useTemplateStore();
    const schedulerTemplates = templates.filter(t => t.entity_type === 'scheduler');

    const [title, setTitle]           = useState('New Scheduler');
    const [organizer, setOrganizer]   = useState('');
    const [location, setLocation]     = useState('');
    const [durations, setDurations]   = useState<number[]>([30, 60]);
    const [template, setTemplate]     = useState<string>('blank');
    const [loading, setLoading]       = useState(false);

    useEffect(() => {
        if (open) fetchTemplates();
    }, [open, fetchTemplates]);

    const toggleDuration = (v: number) =>
        setDurations(prev => prev.includes(v) ? prev.filter(d => d !== v) : [...prev, v].sort((a, b) => a - b));

    const handleCreate = async () => {
        if (!title.trim()) return;
        setLoading(true);
        try {
            const activeWorkspaceId = useUIStore.getState().activeWorkspaceId;
            const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
            
            const format24to12 = (time24: string) => {
                if (!time24 || !time24.includes(':')) return time24;
                let [h, m] = time24.split(':');
                let hours = parseInt(h, 10);
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                return `${hours}:${m} ${ampm}`;
            };

            const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            let availability: any = {};
            let meta: any = { organizer, location, durations };

            if (template !== 'blank') {
                const tpl = schedulerTemplates.find(t => t.id === template);
                if (tpl && tpl.meta) {
                    meta = { ...tpl.meta, title: title.trim() };
                }
            } else {
                DAYS_OF_WEEK.forEach(day => {
                    const wh = activeWorkspace?.working_hours?.[day] || { start: '09:00', end: '17:00', closed: day === 'Saturday' || day === 'Sunday' };
                    availability[day] = {
                        active: !wh.closed,
                        start: wh.start.includes('M') ? wh.start : format24to12(wh.start),
                        end: wh.end.includes('M') ? wh.end : format24to12(wh.end)
                    };
                });
                meta.availability = availability;
            }

            const s = await addScheduler({
                title: title.trim(),
                status: 'Draft',
                meta,
            });
            if (s) {
                appToast.success('Scheduler created');
                onClose();
                router.push(`/schedulers/${s.id}`);
            } else {
                appToast.error("Error", 'Failed to create scheduler');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    const field = cn(
        "w-full rounded-xl border px-4 py-3 text-[13px] outline-none transition-all focus-within:ring-2",
        isDark
            ? "bg-[#1c1c1c] border-[#2e2e2e] text-white placeholder:text-[#555] focus-within:ring-[#333] focus-within:border-[#444]"
            : "bg-white border-[#e0e0e0] text-[#111] placeholder:text-[#bbb] focus-within:ring-[#e8e8e8] focus-within:border-[#ccc]"
    );

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={cn(
                "w-full max-w-[480px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200",
                isDark ? "bg-[#161616] border border-[#252525]" : "bg-[#f7f7f7] border border-[#e0e0e0]"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                    <h2 className={cn("text-[17px] font-bold tracking-tight", isDark ? "text-white" : "text-[#111]")}>
                        Create scheduler
                    </h2>
                    <button
                        onClick={onClose}
                        className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                            isDark ? "bg-[#252525] text-[#666] hover:text-[#ccc]" : "bg-[#e8e8e8] text-[#888] hover:text-[#333]"
                        )}
                    >
                        <X size={14} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 pb-5 flex flex-col gap-2.5">
                    {/* Name */}
                    <div className={cn(field, "flex flex-col gap-0.5")}>
                        <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Name</span>
                        <input
                            autoFocus
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            className="bg-transparent outline-none text-[13px] w-full"
                        />
                    </div>

                    {/* Organizer */}
                    <div className={cn(field, "flex flex-col gap-0.5")}>
                        <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>
                            <span className="flex items-center gap-1.5"><User size={10} /> Organizer</span>
                        </span>
                        <input
                            value={organizer}
                            onChange={e => setOrganizer(e.target.value)}
                            placeholder="Your name or team"
                            className={cn("bg-transparent outline-none text-[13px] w-full", isDark ? "placeholder:text-[#444]" : "placeholder:text-[#bbb]")}
                        />
                    </div>

                    {/* Location */}
                    <div className={cn(field, "flex flex-col gap-0.5")}>
                        <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>
                            <span className="flex items-center gap-1.5"><MapPin size={10} /> Location</span>
                        </span>
                        <input
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            placeholder="Google Meet, Zoom, address…"
                            className={cn("bg-transparent outline-none text-[13px] w-full", isDark ? "placeholder:text-[#444]" : "placeholder:text-[#bbb]")}
                        />
                    </div>

                    {/* Divider */}
                    <div className="relative mt-1">
                        <div className={cn("absolute inset-x-0 top-1/2 border-t", isDark ? "border-[#252525]" : "border-[#e0e0e0]")} />
                        <span className={cn(
                            "relative z-10 px-2 text-[11px] font-semibold uppercase tracking-widest",
                            isDark ? "bg-[#161616] text-[#444]" : "bg-[#f7f7f7] text-[#bbb]"
                        )}>Start from</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[160px] pr-1">
                        <button
                            onClick={() => setTemplate('blank')}
                            className={cn(
                                "flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all",
                                template === 'blank'
                                    ? (isDark ? "border-primary/50 bg-primary/8 ring-1 ring-primary/20" : "border-primary/40 bg-primary/5 ring-1 ring-primary/15")
                                    : (isDark ? "border-[#252525] bg-[#1c1c1c] hover:border-[#333]" : "border-[#e0e0e0] bg-white hover:border-[#bbb]")
                            )}
                        >
                            <span className="text-[18px] leading-none shrink-0">📅</span>
                            <div className="min-w-0 flex-1">
                                <div className={cn("text-[12px] font-semibold truncate", isDark ? "text-[#ddd]" : "text-[#222]")}>
                                    Blank
                                </div>
                            </div>
                            {template === 'blank' && (
                                <div className="ml-auto shrink-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center border-2 border-primary-foreground/20">
                                    <Check size={8} className="text-primary-foreground" strokeWidth={4} />
                                </div>
                            )}
                        </button>

                        {schedulerTemplates.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTemplate(t.id)}
                                className={cn(
                                    "flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all",
                                    template === t.id
                                        ? (isDark ? "border-primary/50 bg-primary/8 ring-1 ring-primary/20" : "border-primary/40 bg-primary/5 ring-1 ring-primary/15")
                                        : (isDark ? "border-[#252525] bg-[#1c1c1c] hover:border-[#333]" : "border-[#e0e0e0] bg-white hover:border-[#bbb]")
                                )}
                            >
                                <span className="text-[18px] leading-none shrink-0 opacity-60">📑</span>
                                <div className="min-w-0 flex-1">
                                    <div className={cn("text-[12px] font-semibold truncate", isDark ? "text-[#ddd]" : "text-[#222]")}>
                                        {t.name}
                                    </div>
                                </div>
                                {template === t.id && (
                                    <div className="ml-auto shrink-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center border-2 border-primary-foreground/20">
                                        <Check size={8} className="text-primary-foreground" strokeWidth={4} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {template === 'blank' && (
                        <div className={cn(
                            "w-full rounded-xl border px-4 py-3 transition-all animate-in slide-in-from-top-2 duration-200",
                            isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                        )}>
                            <span className={cn("block text-[11px] font-semibold mb-2.5", isDark ? "text-[#555]" : "text-[#aaa]")}>
                                <span className="flex items-center gap-1.5"><Clock size={10} /> Durations</span>
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {DURATION_OPTS.map(({ label, value }) => {
                                    const on = durations.includes(value);
                                    return (
                                        <button
                                            key={value}
                                            onClick={() => toggleDuration(value)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all",
                                                on
                                                    ? "text-primary-foreground border-transparent bg-primary"
                                                    : (isDark
                                                        ? "border-[#2e2e2e] text-[#555] hover:text-[#aaa] hover:border-[#333]"
                                                        : "border-[#e5e5e5] text-[#aaa] hover:text-[#555] hover:border-[#ccc]")
                                            )}
                                        >
                                            <Clock size={10} />
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={cn(
                    "flex items-center justify-between px-5 py-4 border-t",
                    isDark ? "border-[#252525] bg-[#111]" : "border-[#e8e8e8] bg-white"
                )}>
                    <button
                        onClick={onClose}
                        className={cn(
                            "px-4 py-2 text-[13px] font-medium rounded-xl transition-colors",
                            isDark ? "text-[#777] hover:text-[#ccc] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]"
                        )}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={loading || !title.trim()}
                        className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Creating…' : 'Create scheduler'}
                        {!loading && <ChevronRight size={14} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
