"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, ChevronDown, Link2, MoreHorizontal, Trash2, Copy,
    Check, Settings, Palette, ChevronRight, Clock, Calendar,
    MapPin, User, Mail, Phone, Globe, Bell, Tag, Sliders,
    Monitor, Smartphone, PenLine, Eye, ExternalLink
} from 'lucide-react';
import { cn, getBackgroundImageWithOpacity } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useSchedulerStore, SchedulerStatus } from '@/store/useSchedulerStore';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/lib/supabase';
import { DesignSettingsPanel, MetaField } from '@/components/ui/DesignSettingsPanel';
import ImageUploadModal from '@/components/modals/ImageUploadModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { DEFAULT_DOCUMENT_DESIGN, DocumentDesign } from '@/types/design';
import { gooeyToast } from 'goey-toast';
import DatePicker from '@/components/ui/DatePicker';
import { SchedulerFormBuilder } from './SchedulerFormBuilder';
import { SettingsSelect, SettingsToggle } from '@/components/settings/SettingsField';

/* ══════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════ */
type EditorTab    = 'editor' | 'bookings' | 'availability';
type CanvasStep   = 'scheduler' | 'form' | 'confirmation';
type RightPanelTab = 'details' | 'design';

interface SchedulerMeta {
    organizer: string;
    location: string;
    durations: number[];   // minutes e.g. [30, 60]
    bufferBefore: number;  // minutes
    bufferAfter: number;   // minutes
    maxPerDay: number;
    advanceNotice: number; // hours
    futureLimit: number;   // days
    confirmationMessage: string;
    activationDate: string;
    expirationDate: string;
    submissionLimit: number | null;
    logoUrl: string;
    design: DocumentDesign;
    fields?: any[];
    availability?: Record<string, { active: boolean; start: string; end: string }>;
}

const DEFAULT_META: SchedulerMeta = {
    organizer: '',
    location: '',
    durations: [30, 60],
    bufferBefore: 0,
    bufferAfter: 0,
    maxPerDay: 8,
    advanceNotice: 24,
    futureLimit: 60,
    confirmationMessage: "Your booking is confirmed! We'll send a calendar invite shortly.",
    activationDate: '',
    expirationDate: '',
    submissionLimit: null,
    logoUrl: '',
    design: DEFAULT_DOCUMENT_DESIGN,
    availability: {
        Monday:    { active: true,  start: '9:00 AM', end: '5:00 PM' },
        Tuesday:   { active: true,  start: '9:00 AM', end: '5:00 PM' },
        Wednesday: { active: true,  start: '9:00 AM', end: '5:00 PM' },
        Thursday:  { active: true,  start: '9:00 AM', end: '5:00 PM' },
        Friday:    { active: true,  start: '9:00 AM', end: '5:00 PM' },
        Saturday:  { active: false, start: '9:00 AM', end: '5:00 PM' },
        Sunday:    { active: false, start: '9:00 AM', end: '5:00 PM' },
    }
};

const STATUS_OPTS: SchedulerStatus[] = ['Active', 'Draft', 'Inactive'];
const STATUS_COLORS: Record<SchedulerStatus, string> = {
    Active: '#22c55e',
    Draft: '#888',
    Inactive: '#f97316',
};
const DURATION_OPTS = [15, 30, 45, 60, 90, 120];
const TIMEZONE_OPTIONS = Intl.supportedValuesOf('timeZone').map(tz => {
    try {
        const parts = tz.split('/');
        const city = parts[parts.length - 1].replace(/_/g, ' ');
        const region = parts.length > 1 ? parts[0] : '';
        const offset = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || '';
        return { label: `${offset} ${city} (${region})`, value: tz };
    } catch (e) {
        return { label: tz.replace(/_/g, ' '), value: tz };
    }
}).sort((a, b) => a.label.localeCompare(b.label));

function isColorDark(color: string) {
    if (!color) return false;
    let hex = color.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
}

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
import { CalendarPreview, getAvailableSlots, timeToMinutes } from './CalendarPreview';

function SectionAccordion({ label, icon, isDark, children, defaultOpen = true }: {
    label: string; icon: React.ReactNode; isDark: boolean; children: React.ReactNode; defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={cn("border-b last:border-b-0", isDark ? "border-[#252525]" : "border-[#f0f0f0]")}>
            <button
                onClick={() => setOpen(v => !v)}
                className={cn("w-full flex items-center justify-between px-4 py-3 text-[11.5px] font-semibold transition-colors",
                    isDark ? "text-[#666] hover:text-[#aaa]" : "text-[#aaa] hover:text-[#555]"
                )}>
                <div className="flex items-center gap-2">
                    {icon}
                    {label}
                </div>
                <ChevronRight size={11} className={cn("transition-transform", open && "rotate-90")} />
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                    {children}
                </div>
            )}
        </div>
    );
}

function Field({ label, isDark, children }: { label: string; isDark: boolean; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className={cn("block text-[10.5px] font-semibold uppercase tracking-wide",
                isDark ? "text-[#555]" : "text-[#bbb]")}>
                {label}
            </label>
            {children}
        </div>
    );
}
function PanelInput({ value, onChange, placeholder, type = 'text', isDark, min, max }: {
    value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; isDark: boolean; min?: number; max?: number;
}) {
    return (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} min={min} max={max}
            className={cn("w-full text-[12px] bg-transparent outline-none transition-all font-medium",
                isDark ? "text-[#ccc] placeholder:text-[#444]" : "text-[#111] placeholder:text-[#ccc]"
            )} />
    );
}

/* ══════════════════════════════════════════════════════════
   CALENDAR PREVIEW
══════════════════════════════════════════════════════════ */
// CalendarPreview removed (using shared component)

const TIME_SLOTS_PREVIEW = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '2:00 PM', '2:30 PM', '3:00 PM'];

/* ══════════════════════════════════════════════════════════
   AVAILABILITY TAB
══════════════════════════════════════════════════════════ */
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const START_TIMES = [
    '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM',
];

const END_TIMES = [
    '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
    '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
    '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '9:00 PM',
];

type DayAvailability = { active: boolean; start: string; end: string };
type AvailabilityMap = Record<string, DayAvailability>;

const DEFAULT_AVAILABILITY: AvailabilityMap = DEFAULT_META.availability!;

function AvailabilityTab({ isDark, meta, updateMeta, primaryColor }: {
    isDark: boolean;
    meta: SchedulerMeta;
    updateMeta: (patch: Partial<SchedulerMeta>) => void;
    primaryColor: string;
}) {
    const availability: AvailabilityMap = (meta as any).availability || DEFAULT_AVAILABILITY;

    const updateDay = (day: string, patch: Partial<DayAvailability>) => {
        updateMeta({
            availability: {
                ...availability,
                [day]: { ...availability[day], ...patch },
            },
        } as any);
    };

    return (
        <div className="flex-1 overflow-auto p-6">
            <div className={cn("font-semibold text-[13px] mb-1", isDark ? "text-[#aaa]" : "text-[#555]")}>
                Weekly Availability
            </div>
            <div className={cn("text-[11.5px] mb-5", isDark ? "text-[#444]" : "text-[#bbb]")}>
                Set the days and hours you are available for bookings.
            </div>
            <div className="space-y-2 max-w-[640px]">
                {DAYS_OF_WEEK.map((day) => {
                    const cfg = availability[day] || DEFAULT_AVAILABILITY[day];
                    return (
                        <div key={day}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                                isDark ? "bg-[#111] border-[#252525]" : "bg-white border-[#ebebeb]",
                                !cfg.active && "opacity-60"
                            )}>
                            {/* Toggle */}
                            <SettingsToggle
                                checked={cfg.active}
                                onChange={checked => updateDay(day, { active: checked })}
                            />

                            {/* Day name */}
                            <div className={cn(
                                "w-[80px] text-[12px] font-semibold shrink-0",
                                cfg.active
                                    ? (isDark ? "text-[#ccc]" : "text-[#333]")
                                    : (isDark ? "text-[#444]" : "text-[#bbb]")
                            )}>
                                {day}
                            </div>

                            {/* Time pickers */}
                            {cfg.active ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="flex-1">
                                        <SettingsSelect
                                            isDark={isDark}
                                            value={cfg.start}
                                            onChange={val => updateDay(day, { start: val })}
                                            options={START_TIMES.map(t => ({ label: t, value: t }))}
                                            className="!h-8 !text-[11px] !rounded-lg"
                                            allowCustom={true}
                                        />
                                    </div>
                                    <span className={cn("text-[11px] shrink-0", isDark ? "text-[#444]" : "text-[#ccc]")}>–</span>
                                    <div className="flex-1">
                                        <SettingsSelect
                                            isDark={isDark}
                                            value={cfg.end}
                                            onChange={val => updateDay(day, { end: val })}
                                            options={END_TIMES.map(t => ({ label: t, value: t }))}
                                            className="!h-8 !text-[11px] !rounded-lg"
                                            allowCustom={true}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className={cn("text-[11.5px] italic", isDark ? "text-[#3a3a3a]" : "text-[#ccc]")}>Unavailable</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function TinyCopy({ text, isDark }: { text: string; isDark: boolean }) {
    const [copied, setCopied] = useState(false);
    const onCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={onCopy} className={cn(
            "p-1 rounded-[4px] transition-all opacity-0 group-hover/line:opacity-100 shrink-0",
            isDark ? "hover:bg-white/10 text-white/30 hover:text-white" : "hover:bg-black/5 text-black/30 hover:text-black"
        )}>
            {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
        </button>
    );
}

/* ══════════════════════════════════════════════════════════
   MAIN EDITOR
══════════════════════════════════════════════════════════ */
export default function SchedulerEditor({ id }: { id?: string }) {
    const router = useRouter();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const searchParams = useSearchParams();
    const highlightId = searchParams.get('highlight');
    const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
    const tabParam = searchParams.get('tab');
    const { workspaces } = useWorkspaceStore();
    const activeWorkspaceId = useUIStore.getState().activeWorkspaceId;
    const activeWorkspace = workspaces.find((w: any) => w.id === activeWorkspaceId);
    const workspaceTimezone = activeWorkspace?.timezone || 'UTC';
    const { schedulers, updateScheduler, deleteScheduler, fetchSchedulers, bookings, fetchBookings } = useSchedulerStore();

    const [title, setTitle] = useState('New Scheduler');
    const [status, setStatus] = useState<SchedulerStatus>('Draft');
    const [meta, setMeta] = useState<SchedulerMeta>(DEFAULT_META);
    const [isLoaded, setIsLoaded] = useState(false);

    const [editorTab, setEditorTab] = useState<EditorTab>('editor');
    const [canvasStep, setCanvasStep] = useState<CanvasStep>('scheduler');
    const [rightTab, setRightTab] = useState<RightPanelTab>('details');
    const [prevRightTab, setPrevRightTab] = useState<RightPanelTab>('details');
    const [showStatus, setShowStatus] = useState(false);
    const [mobileBottomPanelOpen, setMobileBottomPanelOpen] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [copied, setCopied] = useState(false);
    const [imageUploadOpen, setImageUploadOpen] = useState(false);
    const [uploadTarget, setUploadTarget] = useState<'logo' | 'background'>('logo');
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isPreview, setIsPreview] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    // Preview calendar state (editor preview only)
    const [previewSelDate, setPreviewSelDate] = useState<string | null>(null);
    const [previewSelTime, setPreviewSelTime] = useState<string | null>(null);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

    const statusRef = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);

    const metaRef = useRef(meta);
    useEffect(() => { metaRef.current = meta; }, [meta]);

    useEffect(() => {
        if (selectedFieldId) {
            setPrevRightTab(rightTab === 'details' ? prevRightTab : rightTab);
            setRightTab('details');
        } else {
            setRightTab(prevRightTab);
        }
    }, [selectedFieldId]);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (statusRef.current && !statusRef.current.contains(e.target as Node)) setShowStatus(false);
            if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setShowActions(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    
    useEffect(() => {
        if (tabParam === 'bookings') {
            setEditorTab('bookings');
        }
    }, [tabParam]);

    useEffect(() => {
        if (activeHighlightId && bookings.length > 0) {
            // Wait for render
            const tid = setTimeout(() => {
                const el = document.getElementById(`booking-${activeHighlightId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
            return () => clearTimeout(tid);
        }
    }, [activeHighlightId, bookings.length]);

    useEffect(() => {
        if (highlightId) {
            setActiveHighlightId(highlightId.trim());
        }
    }, [highlightId]);

    // Stop highlight on any interaction
    const stopHighlight = () => {
        if (activeHighlightId) setActiveHighlightId(null);
    };

    useEffect(() => {
        if (!id || isLoaded || schedulers.length === 0) return;
        const s = schedulers.find(s => s.id === id);
        if (!s) return;
        setTitle(s.title);
        setStatus(s.status);
        if (s.meta && typeof s.meta === 'object') {
            const m = { ...DEFAULT_META, ...(s.meta as any) };
            
            // Add default fields if empty
            if (!m.fields || m.fields.length === 0) {
                m.fields = [
                    { id: 'f_name', type: 'full_name', label: 'Full name', required: true, placeholder: 'Enter your name' },
                    { id: 'f_email', type: 'email', label: 'Email address', required: true, placeholder: 'Enter your email' },
                    { id: 'f_phone', type: 'phone', label: 'Phone number', required: false, placeholder: 'Enter your phone number' },
                    { id: 'f_notes', type: 'long_text', label: 'Additional notes', required: false, placeholder: 'Any details you want to share...' }
                ];
            }
            setMeta(m);
        }
        setIsLoaded(true);
    }, [id, schedulers, isLoaded]);

    useEffect(() => { fetchSchedulers(); }, [fetchSchedulers]);
    useEffect(() => { if (id) fetchBookings(id); }, [id, fetchBookings]);

    // Realtime subscription for new bookings
    useEffect(() => {
        if (!id) return;
        
        const channel = supabase
            .channel(`scheduler_bookings_${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'scheduler_bookings',
                    filter: `scheduler_id=eq.${id}`
                },
                (payload) => {
                    const newBooking = payload.new as any;
                    
                    // Add to store
                    useSchedulerStore.setState((state) => {
                        const exists = state.bookings.some(b => b.id === newBooking.id);
                        if (exists) return state;
                        return {
                            bookings: [newBooking, ...state.bookings]
                        };
                    });

                    // Set highlight after state update
                    setTimeout(() => {
                        setActiveHighlightId(String(newBooking.id));
                        gooeyToast.success(`New booking: ${newBooking.booker_name}`);
                    }, 100);
                }
            )
            .subscribe();
            
        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    const debouncedTitle = useDebounce(title, 1000);
    const debouncedStatus = useDebounce(status, 500);
    const debouncedMeta = useDebounce(meta, 1000);
    const isFirst = useRef(true);

    useEffect(() => {
        if (isFirst.current || !isLoaded || !id) {
            if (isLoaded) isFirst.current = false;
            return;
        }
        gooeyToast.promise(
            updateScheduler(id, { title: debouncedTitle, status: debouncedStatus, meta: debouncedMeta as any }),
            { loading: 'Saving...', success: 'Saved', error: 'Failed to save' }
        );
    }, [debouncedTitle, debouncedStatus, debouncedMeta, id, isLoaded, updateScheduler]);

    const updateMeta = useCallback((patch: Partial<SchedulerMeta>) => {
        setMeta(prev => ({ ...prev, ...patch }));
    }, []);

    const updateDesign = useCallback((patch: Partial<DocumentDesign>) => {
        setMeta(prev => ({ ...prev, design: { ...prev.design, ...patch } }));
    }, []);

    const updateField = useCallback((fieldId: string, patch: any) => {
        setMeta(prev => ({
            ...prev,
            fields: (prev.fields || []).map(f => f.id === fieldId ? { ...f, ...patch } : f)
        }));
    }, []);

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.origin + '/p/scheduler/' + id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    const handleDelete = async () => {
        if (!id) return;
        await deleteScheduler(id);
        gooeyToast.success('Scheduler deleted');
        router.push('/schedulers');
    };

    const sc = STATUS_COLORS[status];
    const design = meta.design || DEFAULT_DOCUMENT_DESIGN;

    const STEPS: { id: CanvasStep; label: string }[] = [
        { id: 'scheduler', label: 'Scheduler' },
        { id: 'form',      label: 'Form' },
        { id: 'confirmation', label: 'Confirmation' },
    ];

    return (
        <div 
            onClick={stopHighlight}
            className={cn("flex flex-col h-full w-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-white text-[#111]")}>

            {/* ── TOP BAR ── */}
            <div className={cn(
                "flex items-center justify-between px-3 md:px-6 py-2.5 border-b shrink-0",
                isDark ? "bg-[#141414] border-[#252525]" : "bg-white border-[#e4e4e4]"
            )}>
                {/* Left */}
                <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    <button
                        onClick={() => router.push('/schedulers')}
                        className={cn("flex items-center justify-center w-8 h-8 shrink-0 rounded-[8px] transition-all",
                            isDark ? "text-[#666] hover:text-[#ccc] bg-[#222]" : "text-[#888] hover:text-[#111] bg-[#f0f0f0] hover:bg-[#e8e8e8]")}>
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className={cn("hidden md:flex items-center gap-2 text-[13px] font-medium shrink-0",
                            isDark ? "text-white/40" : "text-gray-400")}>
                            <span>Schedulers</span>
                            <span className="opacity-30">/</span>
                        </div>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className={cn("text-[13px] font-semibold bg-transparent outline-none transition-all w-full min-w-0",
                                isDark ? "text-white/90 placeholder:text-white/20" : "text-gray-900 placeholder:text-gray-300")}
                            placeholder="Scheduler Name"
                        />
                    </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                    {/* Status */}
                    <div className="relative hidden md:flex" ref={statusRef}>
                        <button
                            onClick={() => setShowStatus(v => !v)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all border",
                                isDark ? "bg-white/[0.06] text-[#aaa] border-white/10 hover:bg-white/10" : "bg-[#f5f5f5] text-[#555] border-[#e5e5e5] hover:bg-[#eaeaea]"
                            )}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc }} />
                            {status}
                            <ChevronDown size={12} className="ml-1 opacity-50" />
                        </button>
                        {showStatus && (
                            <div className={cn("absolute right-0 top-full mt-1.5 w-36 rounded-[10px] shadow-xl py-1 z-50 border",
                                isDark ? "bg-[#0c0c0c] border-[#222]" : "bg-white border-[#e4e4e4]")}>
                                {STATUS_OPTS.map(s => (
                                    <button key={s} onClick={() => { setStatus(s); setShowStatus(false); }}
                                        className={cn("w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors",
                                            isDark ? "hover:bg-white/5 text-[#ccc]" : "hover:bg-[#f5f5f5] text-[#333]",
                                            status === s ? "font-semibold" : ""
                                        )}>
                                        {status === s ? <Check size={12} className="text-emerald-500" /> : <div className="w-3" />}
                                        <span>{s}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-0.5 hidden md:block" />

                    <button
                        onClick={() => {
                            if (isPreview) setIsPreview(false);
                            else { setIsPreview(true); setPreviewMode('desktop'); }
                        }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 h-[32px] rounded-[8px] text-[12px] font-bold transition-all",
                            isPreview
                                ? "bg-primary text-black hover:bg-primary-hover"
                                : isDark
                                    ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]"
                                    : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]"
                        )}
                    >
                        {isPreview ? <PenLine size={14} /> : <Eye size={14} />}
                        {isPreview ? "Edit" : "Preview"}
                    </button>

                    {isPreview && (
                        <div className="flex items-center gap-1 ml-1">
                            <button
                                onClick={() => setPreviewMode('desktop')}
                                className={cn("p-1.5 rounded-[6px] transition-colors",
                                    previewMode === 'desktop' ? (isDark ? "bg-white/10 text-white" : "bg-black/5 text-black") : (isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60"))}
                            >
                                <Monitor size={14} />
                            </button>
                            <button
                                onClick={() => setPreviewMode('mobile')}
                                className={cn("p-1.5 rounded-[6px] transition-colors",
                                    previewMode === 'mobile' ? (isDark ? "bg-white/10 text-white" : "bg-black/5 text-black") : (isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60"))}
                            >
                                <Smartphone size={14} />
                            </button>
                        </div>
                    )}

                    {/* Copy link */}
                    <button onClick={() => window.open(window.location.origin + '/p/scheduler/' + id, '_blank')}
                        className={cn("hidden md:flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                            isDark ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]")}>
                        <ExternalLink size={14} />
                    </button>

                    <button onClick={copyLink}
                        className={cn("hidden md:flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                            isDark ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]")}>
                        {copied ? <Check size={14} className="text-primary" /> : <Link2 size={14} />}
                    </button>

                    {/* Actions */}
                    <div className="relative" ref={actionsRef}>
                        <button onClick={() => setShowActions(v => !v)}
                            className={cn("flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                                isDark ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]")}>
                            <MoreHorizontal size={14} />
                        </button>
                        {showActions && (
                            <div className={cn("absolute right-0 top-full mt-1.5 w-44 rounded-[10px] shadow-xl py-1 z-50 border",
                                isDark ? "bg-[#0c0c0c] border-[#222]" : "bg-white border-[#d2d2eb]")}>
                                {[
                                    { icon: ExternalLink, label: 'Open Link', action: () => window.open(window.location.origin + '/p/scheduler/' + id, '_blank') },
                                    { icon: Link2, label: 'Copy Link', action: copyLink },
                                    { icon: Copy, label: 'Duplicate', action: () => gooeyToast('Coming soon') },
                                    { icon: Trash2, label: 'Delete', action: () => setIsDeleteOpen(true) },
                                ].map(({ icon: Icon, label, action }) => (
                                    <button key={label} onClick={() => { action(); setShowActions(false); }}
                                        className={cn("w-full flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors",
                                            label === 'Delete'
                                                ? "text-red-500 hover:bg-red-50"
                                                : isDark ? "hover:bg-white/5 text-[#ccc]" : "hover:bg-[#f5f5f5] text-[#333]"
                                        )}>
                                        <Icon size={14} className={label === 'Delete' ? "text-red-500" : "opacity-60"} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── SECONDARY TAB BAR ── */}
            <div className={cn("flex items-center gap-0 px-4 md:px-6 border-b shrink-0",
                isDark ? "bg-[#111] border-[#252525]" : "bg-[#fafafa] border-[#ebebeb]")}>
                {([
                    ['editor', 'Editor'],
                    ['bookings', 'Bookings'],
                    ['availability', 'Availability'],
                ] as const).map(([tab, label]) => (
                    <button key={tab} onClick={() => setEditorTab(tab)}
                        className={cn(
                            "px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-all",
                            editorTab === tab
                                ? "border-primary text-primary"
                                : (isDark ? "border-transparent text-[#555] hover:text-[#aaa]" : "border-transparent text-[#aaa] hover:text-[#555]")
                        )}>
                        {label}
                    </button>
                ))}
            </div>

            {/* ── BODY ── */}
            <div className="flex-1 flex overflow-hidden">
                {editorTab === 'editor' && (
                    <>
                        {/* ── CANVAS ── */}
                        <div
                            className="flex-1 overflow-auto relative"
                            onClick={() => setSelectedFieldId(null)}
                            style={{
                                backgroundColor: design.backgroundColor || '#f7f7f7',
                                backgroundImage: getBackgroundImageWithOpacity(design.backgroundImage, design.backgroundColor || '#f7f7f7', design.backgroundImageOpacity),
                                backgroundSize: 'cover',
                                backgroundAttachment: 'fixed',
                            }}>
                            {/* Top blur */}
                            <div className="z-30 flex justify-center sticky top-0 w-full pt-4 pb-6 pointer-events-none">
                                <div className="absolute inset-0 pointer-events-none"
                                    style={{
                                    }}>
                                    <div className={cn("absolute inset-0",
                                        design.topBlurTheme === 'dark'
                                            ? "bg-gradient-to-b from-[#080808]/80 to-transparent"
                                            : "bg-gradient-to-b from-[#f7f7f7]/80 to-transparent"
                                    )} />
                                </div>
                                {/* Step breadcrumb */}
                                <div className="relative z-10 flex items-center gap-1.5 pointer-events-auto">
                                    {STEPS.map((s, i) => (
                                        <React.Fragment key={s.id}>
                                            {i > 0 && <ChevronRight size={11} className={isDark ? "text-white/20" : "text-black/20"} />}
                                            <button
                                                onClick={() => setCanvasStep(s.id)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-all border",
                                                    canvasStep === s.id
                                                        ? "text-black border-transparent shadow-sm"
                                                        : (isDark ? "text-[#555] border-[#333] hover:text-[#aaa]" : "text-[#aaa] border-[#e5e5e5] hover:text-[#555]")
                                                )}
                                                style={canvasStep === s.id ? { background: design.primaryColor || '#4dbf39' } : undefined}
                                            >
                                                {s.label}
                                            </button>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            {/* Booking card */}
                            <div className={cn("flex flex-col items-center min-h-full", isPreview && previewMode === 'mobile' ? "py-8 px-4" : "pb-20 px-4 pt-2")}>
                                {isPreview && previewMode === 'mobile' ? (
                                    <div className="flex flex-col items-center">
                                        <div className={cn("relative rounded-[44px] border-[4px] overflow-visible shrink-0 transition-all duration-300 bg-[#000] w-[390px] h-[844px]", isDark ? "border-[#1a1a1a] shadow-2xl" : "border-[#000] shadow-2xl")}>
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] rounded-b-[16px] z-10 bg-white/[0.05]" />
                                            <div className="flex items-center justify-between px-8 pt-4 pb-2 text-[11px] font-medium z-10 relative opacity-40 text-white">
                                                <span>9:41</span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-4 h-2.5 rounded-[2px] border border-current opacity-50" />
                                                </div>
                                            </div>
                                            <div className="absolute inset-0 top-[52px] pb-[34px] overflow-y-auto overflow-visible scrollbar-none z-0"
                                                style={{ backgroundColor: design.backgroundColor || (isDark ? '#080808' : '#f7f7f7') }}>
                                                <div className="pb-8 overflow-visible min-h-full"
                                                    style={{
                                                        backgroundColor: design.blockBackgroundColor || '#fff',
                                                        fontFamily: design.fontFamily || 'Inter',
                                                    }}>

                                                    {/* Card header */}
                                                    <div className="px-5 pt-7 pb-5 border-b"
                                                        style={{ borderColor: isColorDark(design.blockBackgroundColor || '#fff') ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}>
                                                        <div className="flex items-center gap-3 mb-4">
                                                            {meta.logoUrl ? (
                                                                <img src={meta.logoUrl} alt="Logo"
                                                                    className="object-contain"
                                                                    style={{ height: `${design.logoSize || 40}px` }} />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-[16px]"
                                                                    style={{ 
                                                                        background: design.primaryColor || '#4dbf39',
                                                                        color: isColorDark(design.primaryColor || '#4dbf39') ? '#fff' : '#000'
                                                                    }}>
                                                                    {(meta.organizer || title || 'S')[0].toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="font-bold text-[15px]" style={{ color: isColorDark(design.blockBackgroundColor || '#fff') ? '#fff' : '#111' }}>
                                                                    {meta.organizer || title || 'Scheduler Name'}
                                                                </div>
                                                                <div className="text-[12px] opacity-50" style={{ color: isColorDark(design.blockBackgroundColor || '#fff') ? '#aaa' : '#777' }}>Book a time</div>
                                                            </div>
                                                        </div>

                                                        {/* Duration selector — only on scheduler step */}
                                                        {canvasStep === 'scheduler' && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {(meta.durations && meta.durations.length > 0 ? meta.durations : [30, 60]).map((d: number) => (
                                                                <button key={d}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                                                                    style={{
                                                                        background: design.primaryColor || '#4dbf39',
                                                                        color: isColorDark(design.primaryColor || '#4dbf39') ? '#fff' : '#000'
                                                                    }}>
                                                                    <Clock size={11} />
                                                                    {d >= 60 ? `${d / 60} hr` : `${d} min`}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        )}
                                                    </div>

                                                    {/* Canvas step content */}
                                                    <div className="p-5">
                                                        {canvasStep === 'scheduler' && (
                                                            <div className="flex flex-col gap-4">
                                                                <CalendarPreview
                                                                    isDark={isColorDark(design.blockBackgroundColor || '#fff')}
                                                                    primaryColor={design.primaryColor || '#4dbf39'}
                                                                    selDate={previewSelDate}
                                                                    meta={meta}
                                                                    workspaceTimezone={workspaceTimezone}
                                                                    onDateSelect={(d) => { setPreviewSelDate(d); setPreviewSelTime(null); }}
                                                                />
                                                                {previewSelDate && (() => {
                                                                    const availableSlots = getAvailableSlots(previewSelDate, meta?.durations || [30], meta?.availability || {}, [], workspaceTimezone, Intl.DateTimeFormat().resolvedOptions().timeZone);
                                                                    return (
                                                                    <div>
                                                                        <div className="text-[10.5px] font-bold uppercase tracking-wider mb-2 opacity-40" style={{ color: isColorDark(design.blockBackgroundColor || '#fff') ? '#fff' : '#000' }}>
                                                                            Available times
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-1.5 overflow-y-auto max-h-[250px] pr-1 custom-scrollbar">
                                                                            {availableSlots.length > 0 ? availableSlots.map(t => (
                                                                                <button key={t}
                                                                                    onClick={() => setPreviewSelTime(t)}
                                                                                    className="px-2 py-1.5 rounded-lg text-[11.5px] font-medium border transition-all text-center"
                                                                                    style={previewSelTime === t
                                                                                        ? { background: design.primaryColor || '#4dbf39', color: isColorDark(design.primaryColor || '#4dbf39') ? '#fff' : '#000', borderColor: 'transparent' }
                                                                                        : { borderColor: isColorDark(design.blockBackgroundColor || '#fff') ? '#333' : '#e5e5e5', color: isColorDark(design.blockBackgroundColor || '#fff') ? '#aaa' : '#555' }
                                                                                    }>
                                                                                    {t}
                                                                                </button>
                                                                            )) : (
                                                                                <div className="col-span-2 text-[11px] opacity-40 italic text-center py-4" style={{ color: isColorDark(design.blockBackgroundColor || '#fff') ? '#aaa' : '#888' }}>
                                                                                    No slots available for this day
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}

                                                        {canvasStep === 'form' && (
                                                            <div className="max-w-[460px] mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-4">
                                                                <SchedulerFormBuilder 
                                                                    isDark={isColorDark(design.blockBackgroundColor || '#fff')} 
                                                                    design={design} 
                                                                    fields={meta.fields || []} 
                                                                    updateFields={(newFields) => updateMeta({ fields: newFields })} 
                                                                    selectedFieldId={selectedFieldId}
                                                                    onSelectField={setSelectedFieldId}
                                                                />
                                                                <div className="flex gap-3 pt-2">
                                                                    <button className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-all"
                                                                        onClick={() => setCanvasStep('scheduler')}
                                                                        style={{ 
                                                                            borderColor: isColorDark(design.blockBackgroundColor || '#fff') ? '#333' : '#e5e5e5', 
                                                                            color: isColorDark(design.blockBackgroundColor || '#fff') ? '#aaa' : '#555',
                                                                            borderRadius: `${Math.max(0, (design.borderRadius ?? 16) - 4)}px`,
                                                                        }}>← Back</button>
                                                                    <button className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all text-white"
                                                                        onClick={() => setCanvasStep('confirmation')}
                                                                        style={{ 
                                                                            background: design.primaryColor || '#4dbf39',
                                                                            color: isColorDark(design.primaryColor || '#4dbf39') ? '#fff' : '#000',
                                                                            borderRadius: `${Math.max(0, (design.borderRadius ?? 16) - 4)}px`,
                                                                        }}>Schedule →</button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {canvasStep === 'confirmation' && (
                                                            <div className="flex flex-col items-center text-center py-8 gap-4">
                                                                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white"
                                                                    style={{ background: design.primaryColor || '#4dbf39' }}>
                                                                    <Check size={28} strokeWidth={2.5} />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-[18px] mb-2" style={{ color: isColorDark(design.blockBackgroundColor || '#fff') ? '#fff' : '#111' }}>
                                                                        Booking Confirmed!
                                                                    </div>
                                                                    <textarea
                                                                        value={meta.confirmationMessage}
                                                                        onChange={e => updateMeta({ confirmationMessage: e.target.value })}
                                                                        className="text-[13px] text-center bg-transparent outline-none resize-none w-full opacity-60"
                                                                        style={{ color: isColorDark(design.blockBackgroundColor || '#fff') ? '#aaa' : '#555' }}
                                                                        rows={3}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                </div>
                                            </div>
                                            <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[100px] h-[4px] rounded-full z-10 bg-white/[0.05]" />
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="w-full max-w-[680px] overflow-visible"
                                        onClick={() => setSelectedFieldId(null)}
                                        style={{
                                            backgroundColor: design.blockBackgroundColor || '#fff',
                                            boxShadow: design.blockShadow || '0 4px 20px -4px rgba(0,0,0,0.08)',
                                            fontFamily: design.fontFamily || 'Inter',
                                            borderRadius: `${design.borderRadius ?? 16}px`,
                                        }}>
                                        {/* Card header */}
                                        <div className="px-5 md:px-8 pt-8 pb-5 border-b"
                                            style={{ borderColor: isColorDark(design.blockBackgroundColor || '#fff') ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}>
                                            <div className="flex items-center gap-3 mb-4">
                                                {meta.logoUrl ? (
                                                    <img src={meta.logoUrl} alt="Logo"
                                                        className="object-contain"
                                                        style={{ height: `${design.logoSize || 40}px` }} />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-[16px]"
                                                        style={{ 
                                                            background: design.primaryColor || '#4dbf39',
                                                            color: isColorDark(design.primaryColor || '#4dbf39') ? '#fff' : '#000' 
                                                        }}>
                                                        {(meta.organizer || title || 'S')[0].toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-[15px]" style={{ color: isColorDark(design.blockBackgroundColor || '#fff') ? '#fff' : '#111' }}>
                                                        {meta.organizer || title || 'Scheduler Name'}
                                                    </div>
                                                    <div className="text-[12px] opacity-50" style={{ color: isColorDark(design.blockBackgroundColor || '#fff') ? '#aaa' : '#777' }}>Book a time</div>
                                                </div>
                                            </div>

                                            {/* Duration selector — only on scheduler step */}
                                            {canvasStep === 'scheduler' && (
                                            <div className="flex flex-wrap gap-2">
                                                {(meta.durations && meta.durations.length > 0 ? meta.durations : [30, 60]).map((d: number) => (
                                                    <button key={d}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                                                        style={{
                                                            background: design.primaryColor || '#4dbf39',
                                                            color: isColorDark(design.primaryColor || '#4dbf39') ? '#fff' : '#000',
                                                        }}>
                                                        <Clock size={11} />
                                                        {d >= 60 ? `${d / 60} hr` : `${d} min`}
                                                    </button>
                                                ))}
                                            </div>
                                            )}
                                        </div>

                                        {/* Canvas step content */}
                                        <div className="p-5 md:p-8">
                                            {canvasStep === 'scheduler' && (
                                                <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6">
                                                    <CalendarPreview
                                                        isDark={isColorDark(design.blockBackgroundColor || '#fff')}
                                                        primaryColor={design.primaryColor || '#4dbf39'}
                                                        selDate={previewSelDate}
                                                        meta={meta}
                                                        onDateSelect={(d) => { setPreviewSelDate(d); setPreviewSelTime(null); }}
                                                    />
                                                    <div>
                                                        <div className="text-[10.5px] font-bold uppercase tracking-wider mb-3 opacity-40" style={{ color: isColorDark(design.blockBackgroundColor || '#fff') ? '#fff' : '#000' }}>
                                                            {previewSelDate
                                                                ? new Date(new Date().getFullYear(), new Date().getMonth(), previewSelDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                                                                : 'Select a date'
                                                            }
                                                        </div>
                                                        {!previewSelDate ? (
                                                            <div className="text-[11px] opacity-40 italic" style={{ color: isColorDark(design.blockBackgroundColor || '#fff') ? '#aaa' : '#888' }}>Choose a date to see available times</div>
                                                        ) : (
                                                            <div className="space-y-1.5 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
                                                                {getAvailableSlots(previewSelDate, meta.durations, meta.availability).length > 0 ? (
                                                                    getAvailableSlots(previewSelDate, meta.durations, meta.availability).map(t => (
                                                                        <button key={t}
                                                                            onClick={() => setPreviewSelTime(t)}
                                                                            className="w-full py-2 rounded-lg text-[12px] font-semibold border text-center transition-all"
                                                                            style={previewSelTime === t
                                                                                ? { background: design.primaryColor || '#4dbf39', color: isColorDark(design.primaryColor || '#4dbf39') ? '#fff' : '#000', borderColor: 'transparent', borderRadius: `${Math.max(0, (design.borderRadius ?? 16) - 8)}px` }
                                                                                : { borderColor: isColorDark(design.blockBackgroundColor || '#fff') ? '#333' : '#e5e5e5', color: isColorDark(design.blockBackgroundColor || '#fff') ? '#aaa' : '#888', borderRadius: `${Math.max(0, (design.borderRadius ?? 16) - 8)}px` }
                                                                            }>
                                                                            {t}
                                                                        </button>
                                                                    ))
                                                                ) : (
                                                                    <div className="text-[11px] opacity-40 italic text-center py-4" style={{ color: isColorDark(design.blockBackgroundColor || '#fff') ? '#aaa' : '#888' }}>
                                                                        No slots available for this day
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {canvasStep === 'form' && (
                                                <div className="max-w-[460px] mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-4">
                                                    <SchedulerFormBuilder 
                                                        isDark={isColorDark(design.blockBackgroundColor || '#fff')} 
                                                        design={design} 
                                                        fields={meta.fields || []} 
                                                        updateFields={(newFields) => updateMeta({ fields: newFields })} 
                                                        selectedFieldId={selectedFieldId}
                                                        onSelectField={setSelectedFieldId}
                                                        isReadOnly={isPreview}
                                                    />
                                                    <div className="flex gap-3 pt-2">
                                                        <button className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-all"
                                                            onClick={() => setCanvasStep('scheduler')}
                                                            style={{ 
                                                                borderColor: isColorDark(design.blockBackgroundColor || '#fff') ? '#333' : '#e5e5e5', 
                                                                color: isColorDark(design.blockBackgroundColor || '#fff') ? '#aaa' : '#555',
                                                                borderRadius: `${Math.max(0, (design.borderRadius ?? 16) - 4)}px`,
                                                            }}>← Back</button>
                                                        <button className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all text-white"
                                                            onClick={() => setCanvasStep('confirmation')}
                                                            style={{ 
                                                                background: design.primaryColor || '#4dbf39',
                                                                color: isColorDark(design.primaryColor || '#4dbf39') ? '#fff' : '#000',
                                                                borderRadius: `${Math.max(0, (design.borderRadius ?? 16) - 4)}px`,
                                                            }}>Schedule →</button>
                                                    </div>
                                                </div>
                                            )}

                                            {canvasStep === 'confirmation' && (
                                                <div className="flex flex-col items-center text-center py-8 gap-4">
                                                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-white"
                                                        style={{ background: design.primaryColor || '#4dbf39' }}>
                                                        <Check size={28} strokeWidth={2.5} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-[18px] mb-2" style={{ color: isColorDark(design.blockBackgroundColor || '#fff') ? '#fff' : '#111' }}>
                                                            Booking Confirmed!
                                                        </div>
                                                        <textarea
                                                            value={meta.confirmationMessage}
                                                            onChange={e => updateMeta({ confirmationMessage: e.target.value })}
                                                            className="text-[13px] text-center bg-transparent outline-none resize-none w-full opacity-60"
                                                            style={{ color: isColorDark(design.blockBackgroundColor || '#fff') ? '#aaa' : '#555' }}
                                                            rows={3}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── RIGHT PANEL ── */}
                        {!isPreview && (
                        <div className={cn(
                            "hidden md:flex flex-col overflow-hidden border-l w-[240px] shrink-0",
                            isDark ? "bg-[#0d0d0d] border-[#252525]" : "bg-[#f5f5f5] border-[#e4e4e4]"
                        )}>
                            {/* Tab switcher */}
                            <div className="flex items-center shrink-0 p-1.5 gap-1">
                                {([['details', Settings, selectedFieldId ? 'Field' : 'Details'], ['design', Palette, 'Design']] as const).map(([tab, Icon, label]) => (
                                    <button key={tab} onClick={() => {
                                        setRightTab(tab);
                                        if (tab !== 'details') setSelectedFieldId(null);
                                    }}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold transition-all rounded-xl",
                                            rightTab === tab
                                                ? (isDark ? "bg-white/10 text-white" : "bg-[#111]/5 text-[#111]")
                                                : (isDark ? "text-[#555] hover:bg-white/[0.03] hover:text-[#aaa]" : "text-[#bbb] hover:bg-black/[0.03] hover:text-[#666]")
                                        )}>
                                        <Icon size={14} strokeWidth={rightTab === tab ? 2.5 : 2} />
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                 {rightTab === 'details' && (
                                    <div className={cn("divide-y", isDark ? "divide-[#252525]" : "divide-[#f0f0f0]")}>
                                        {!selectedFieldId ? (
                                            <>
                                                <SectionAccordion label="Organizer" icon={<User size={11} />} isDark={isDark}>
                                                    <MetaField isDark={isDark}>
                                                        <PanelInput value={meta.organizer} onChange={v => updateMeta({ organizer: v })}
                                                            placeholder="Your name or team" isDark={isDark} />
                                                    </MetaField>
                                                </SectionAccordion>

                                                <SectionAccordion label="Location" icon={<MapPin size={11} />} isDark={isDark}>
                                                    <MetaField isDark={isDark}>
                                                        <PanelInput value={meta.location} onChange={v => updateMeta({ location: v })}
                                                            placeholder="Google Meet / Zoom / address" isDark={isDark} />
                                                    </MetaField>
                                                </SectionAccordion>

                                                <SectionAccordion label="Durations" icon={<Clock size={11} />} isDark={isDark}>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {DURATION_OPTS.map(d => {
                                                            const on = (meta.durations || []).includes(d);
                                                            return (
                                                                <button key={d}
                                                                    onClick={() => {
                                                                        const cur = meta.durations || [];
                                                                        updateMeta({ durations: on ? cur.filter(x => x !== d) : [...cur, d].sort((a, b) => a - b) });
                                                                    }}
                                                                    className={cn(
                                                                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all",
                                                                        on
                                                                            ? "text-black border-transparent"
                                                                            : (isDark ? "border-[#2a2a2a] text-[#555] hover:text-[#aaa]" : "border-[#e0e0e0] text-[#aaa] hover:text-[#555]")
                                                                    )}
                                                                    style={on ? { background: design.primaryColor || '#4dbf39', borderColor: 'transparent' } : undefined}>
                                                                    <Clock size={9} />
                                                                    {d >= 60 ? `${d / 60}hr` : `${d}min`}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </SectionAccordion>

                                                <SectionAccordion label="Buffers" icon={<Sliders size={11} />} isDark={isDark}>
                                                    <div className="space-y-2">
                                                        {[['Before', 'bufferBefore'], ['After', 'bufferAfter']].map(([label, key]) => (
                                                            <MetaField key={key} label={label as string} isDark={isDark}>
                                                                <SettingsSelect
                                                                    isDark={isDark}
                                                                    value={String((meta as any)[key])}
                                                                    onChange={val => updateMeta({ [key]: Number(val) } as any)}
                                                                    options={[0, 5, 10, 15, 30, 60].map(v => ({ 
                                                                        label: v === 0 ? 'None' : `${v} min`, 
                                                                        value: String(v) 
                                                                    }))}
                                                                    className="!h-7 !text-[11px] !border-none !bg-transparent !px-0"
                                                                />
                                                            </MetaField>
                                                        ))}
                                                    </div>
                                                </SectionAccordion>

                                                <SectionAccordion label="Limits" icon={<Tag size={11} />} isDark={isDark}>
                                                    <div className="space-y-2">
                                                        <MetaField label="Max per day" isDark={isDark}>
                                                            <PanelInput type="number" min={1} max={50} value={meta.maxPerDay}
                                                                    onChange={v => updateMeta({ maxPerDay: Number(v) })}
                                                                    isDark={isDark} />
                                                        </MetaField>
                                                        <MetaField label="Advance notice (hrs)" isDark={isDark}>
                                                            <PanelInput type="number" min={0} value={meta.advanceNotice}
                                                                    onChange={v => updateMeta({ advanceNotice: Number(v) })}
                                                                    isDark={isDark} />
                                                        </MetaField>
                                                        <MetaField label="Future limit (days)" isDark={isDark}>
                                                            <PanelInput type="number" min={1} value={meta.futureLimit}
                                                                    onChange={v => updateMeta({ futureLimit: Number(v) })}
                                                                    isDark={isDark} />
                                                        </MetaField>
                                                        <MetaField label="Submission limit" isDark={isDark}>
                                                            <PanelInput type="number" value={meta.submissionLimit ?? ''}
                                                                    onChange={v => updateMeta({ submissionLimit: v ? Number(v) : null })}
                                                                    placeholder="Unlimited" isDark={isDark} />
                                                        </MetaField>
                                                    </div>
                                                </SectionAccordion>

                                                <SectionAccordion label="Automation" icon={<Bell size={11} />} isDark={isDark}>
                                                    <div className="space-y-2.5 pt-1">
                                                        {['Email confirmation to booker', 'Email notification to organizer'].map(label => (
                                                            <label key={label} className="flex items-center gap-2.5 cursor-pointer group">
                                                                <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center transition-all",
                                                                    isDark ? "border-[#333] bg-[#151515]" : "border-[#ddd] bg-white")}>
                                                                    <Check size={9} className="text-primary opacity-80" />
                                                                </div>
                                                                <span className={cn("text-[11.5px] font-medium transition-colors", 
                                                                    isDark ? "text-[#555] group-hover:text-[#888]" : "text-[#aaa] group-hover:text-[#555]")}>{label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </SectionAccordion>

                                                <SectionAccordion label="Dates" icon={<Calendar size={11} />} isDark={isDark}>
                                                    <div className="space-y-2">
                                                        <MetaField label="Activation date" isDark={isDark}>
                                                            <DatePicker 
                                                                value={meta.activationDate} 
                                                                onChange={v => updateMeta({ activationDate: v })} 
                                                                isDark={isDark} 
                                                                placeholder="No activation date"
                                                                className="!h-auto !p-0 !bg-transparent !border-none"
                                                            />
                                                        </MetaField>
                                                        <MetaField label="Expiration date" isDark={isDark}>
                                                            <DatePicker 
                                                                value={meta.expirationDate} 
                                                                onChange={v => updateMeta({ expirationDate: v })} 
                                                                isDark={isDark} 
                                                                placeholder="No expiration date"
                                                                className="!h-auto !p-0 !bg-transparent !border-none"
                                                            />
                                                        </MetaField>
                                                    </div>
                                                </SectionAccordion>

                                                <SectionAccordion label="Localisation" icon={<Globe size={11} />} isDark={isDark}>
                                                    <MetaField label="Timezone" isDark={isDark}>
                                                        <SettingsSelect
                                                            isDark={isDark}
                                                            value={activeWorkspace?.timezone || 'UTC'}
                                                            onChange={val => {
                                                                // If workspace-level timezone update is needed, handle it here
                                                                // For now just showing the active workspace timezone
                                                            }}
                                                            options={TIMEZONE_OPTIONS}
                                                            className="!h-7 !text-[11px] !border-none !bg-transparent !px-0"
                                                        />
                                                    </MetaField>
                                                </SectionAccordion>
                                            </>
                                        ) : (() => {
                                            const field = (meta.fields || []).find(f => f.id === selectedFieldId);
                                            if (!field) return null;
                                            return (
                                                <div className="p-4 space-y-4">
                                                    <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-2", isDark ? "text-[#555]" : "text-[#bbb]")}>
                                                        Field Settings
                                                    </div>
                                                    <div className="space-y-3 pb-6">
                                                        <div>
                                                            <label className={cn("block text-[10px] font-semibold mb-1 uppercase tracking-wide", isDark ? "text-[#555]" : "text-[#bbb]")}>Label</label>
                                                            <PanelInput value={field.label} onChange={v => updateField(field.id, { label: v })} isDark={isDark} />
                                                        </div>
                                                        <div>
                                                            <label className={cn("block text-[10px] font-semibold mb-1 uppercase tracking-wide", isDark ? "text-[#555]" : "text-[#bbb]")}>Placeholder</label>
                                                            <PanelInput value={field.placeholder || ''} onChange={v => updateField(field.id, { placeholder: v })} isDark={isDark} />
                                                        </div>
                                                        <div>
                                                            <label className={cn("block text-[10px] font-semibold mb-1 uppercase tracking-wide", isDark ? "text-[#555]" : "text-[#bbb]")}>Description</label>
                                                            <textarea
                                                                rows={2}
                                                                value={field.description || ''}
                                                                onChange={e => updateField(field.id, { description: e.target.value })}
                                                                className={cn("w-full px-3 py-2 text-[12px] rounded-lg border outline-none resize-none",
                                                                    isDark ? "bg-[#151515] border-[#2a2a2a] text-[#ddd]" : "bg-white border-[#e5e5e5] text-[#111]")}
                                                            />
                                                        </div>
                                                        <label className="flex items-center gap-2.5 cursor-pointer"
                                                            onClick={() => updateField(field.id, { required: !field.required })}>
                                                            <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center transition-all",
                                                                field.required ? "border-primary bg-primary" : (isDark ? "border-[#333] bg-[#151515]" : "border-[#ddd] bg-white"))}>
                                                                {field.required && <Check size={9} className="text-black" />}
                                                            </div>
                                                            <span className={cn("text-[11.5px]", isDark ? "text-[#666]" : "text-[#888]")}>Required field</span>
                                                        </label>

                                                        {(field.type === 'dropdown' || field.type === 'multi_choice') && (
                                                            <div>
                                                                <label className={cn("block text-[10px] font-semibold mb-1 uppercase tracking-wide", isDark ? "text-[#555]" : "text-[#bbb]")}>Options (one per line)</label>
                                                                <textarea
                                                                    rows={4}
                                                                    value={(field.options || []).join('\n')}
                                                                    onChange={e => updateField(field.id, { options: e.target.value.split('\n') })}
                                                                    className={cn("w-full px-3 py-2 text-[12px] rounded-lg border outline-none resize-none",
                                                                        isDark ? "bg-[#151515] border-[#2a2a2a] text-[#ddd]" : "bg-white border-[#e5e5e5] text-[#111]")}
                                                                />
                                                            </div>
                                                        )}
                                                        
                                                        <button 
                                                            onClick={() => {
                                                                updateMeta({ fields: (meta.fields || []).filter(f => f.id !== field.id) });
                                                                setSelectedFieldId(null);
                                                            }}
                                                            className="w-full py-2.5 mt-4 flex items-center justify-center gap-2 text-[11px] font-bold text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-xl transition-all"
                                                        >
                                                            <Trash2 size={13} /> Delete Field
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {rightTab === 'design' && (
                                    <div className="px-3 py-2">
                                        <DesignSettingsPanel
                                            isDark={isDark}
                                            meta={{ logoUrl: meta.logoUrl, design: meta.design }}
                                            updateMeta={(patch) => {
                                                if ('logoUrl' in patch) updateMeta({ logoUrl: patch.logoUrl });
                                                if ('design' in patch) updateMeta({ design: { ...meta.design, ...patch.design } });
                                            }}
                                            onUploadLogo={() => { setUploadTarget('logo'); setImageUploadOpen(true); }}
                                            onUploadBackground={() => { setUploadTarget('background'); setImageUploadOpen(true); }}
                                            hideSignature={true}
                                            hideTable={true}
                                            hideActionBar={true}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        )}
                    </>
                )}

                {editorTab === 'bookings' && (
                    <div className={cn("flex-1 overflow-auto p-4 md:p-8", isDark ? "bg-[#141414]" : "bg-[#fafafa]")}>
                        <div className="max-w-[1000px] mx-auto w-full">
                            {bookings && bookings.length > 0 ? (
                                <div className="w-full">
                                    <div className={cn("text-[14px] font-semibold mb-4", isDark ? "text-white" : "text-black")}>
                                        Recent Bookings ({bookings.length})
                                    </div>
                                    <div className={cn("overflow-hidden rounded-xl border", isDark ? "border-[#252525] bg-[#1a1a1a]" : "border-[#ebebeb] bg-white")}>
                                        <table className="w-full text-left border-collapse text-[12.5px]">
                                            <thead>
                                                <tr className={cn("border-b text-[10.5px] uppercase tracking-wider", isDark ? "border-[#252525] text-[#888] bg-[#111]" : "border-[#ebebeb] text-[#888] bg-[#f8f8f8]")}>
                                                    <th className="px-5 py-3.5 font-semibold">Booker</th>
                                                    <th className="px-5 py-3.5 font-semibold">Location</th>
                                                    <th className="px-5 py-3.5 font-semibold">Date & Time</th>
                                                    <th className="px-5 py-3.5 font-semibold">Duration</th>
                                                    <th className="px-5 py-3.5 font-semibold">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className={cn("divide-y", isDark ? "divide-[#252525]" : "divide-[#ebebeb]")}>
                                                {bookings.map((booking) => (
                                                    <tr key={booking.id} 
                                                        id={`booking-${booking.id}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            stopHighlight();
                                                        }}
                                                        className={cn(
                                                            "group transition-all duration-500", 
                                                            isDark ? "hover:bg-white/[0.02]" : "hover:bg-[#fafafa]",
                                                            activeHighlightId === String(booking.id) && "animate-highlight-row"
                                                        )}
                                                        style={activeHighlightId === String(booking.id) ? {
                                                            backgroundColor: isDark ? `${design.primaryColor || '#4dbf39'}33` : `${design.primaryColor || '#4dbf39'}1a`,
                                                            boxShadow: `inset 3px 0 0 ${design.primaryColor || '#4dbf39'}`,
                                                        } : undefined}>
                                                        <td className="px-5 py-4">
                                                            <div className={cn("group/line font-semibold text-[13px] flex items-center gap-1.5", isDark ? "text-white" : "text-black")}>
                                                                <User size={12} className="opacity-40" />
                                                                <span className="truncate">{booking.booker_name}</span>
                                                                <TinyCopy text={booking.booker_name} isDark={isDark} />
                                                            </div>
                                                            <div className={cn("group/line text-[11.5px] mt-1 flex items-center gap-1.5", isDark ? "text-[#888]" : "text-[#888]")}>
                                                                <Mail size={11} className="opacity-40" />
                                                                <span className="truncate">{booking.booker_email}</span>
                                                                <TinyCopy text={booking.booker_email} isDark={isDark} />
                                                            </div>
                                                            {booking.booker_phone && (
                                                                <div className={cn("group/line text-[11.5px] mt-1 flex items-center gap-1.5", isDark ? "text-[#888]" : "text-[#888]")}>
                                                                    <Phone size={11} className="opacity-40" />
                                                                    <span className="truncate">{booking.booker_phone}</span>
                                                                    <TinyCopy text={booking.booker_phone} isDark={isDark} />
                                                                </div>
                                                            )}
                                                            
                                                            {(() => {
                                                                const customData = (booking as any).custom_fields || {};
                                                                const fields = meta.fields || [];
                                                                const answers = Object.entries(customData).filter(([id, val]) => {
                                                                    const field = fields.find(f => f.id === id);
                                                                    if (!field) return false;
                                                                    if (field.type === 'full_name' || field.type === 'email' || field.type === 'phone') return false;
                                                                    if (typeof val === 'string' && !val.trim()) return false;
                                                                    return val !== null && val !== undefined;
                                                                });

                                                                if (answers.length === 0) return null;

                                                                return (
                                                                    <div className={cn("mt-3 pt-3 border-t space-y-1.5", isDark ? "border-[#252525]" : "border-[#ebebeb]")}>
                                                                        {answers.map(([id, val]) => {
                                                                            const field = fields.find(f => f.id === id);
                                                                            return (
                                                                                <div key={id} className="text-[11px] leading-tight">
                                                                                    <span className={cn("font-semibold mr-1", isDark ? "text-[#888]" : "text-[#999]")}>
                                                                                        {field?.label || 'Unknown'}:
                                                                                    </span>
                                                                                    <span className={cn("break-words", isDark ? "text-[#ccc]" : "text-[#444]")}>
                                                                                        {typeof val === 'string' ? val : JSON.stringify(val)}
                                                                                    </span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className={cn("text-[12px] flex items-center gap-1.5", isDark ? "text-[#ccc]" : "text-[#444]")}>
                                                                <MapPin size={12} className="opacity-40" />
                                                                {booking.location || <span className="opacity-20">-</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 whitespace-nowrap">
                                                            <div className={cn("font-medium text-[12.5px]", isDark ? "text-white" : "text-black")}>
                                                                {new Date(booking.booked_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </div>
                                                            <div className={cn("text-[11.5px] mt-0.5", isDark ? "text-[#888]" : "text-[#888]")}>
                                                                {booking.booked_time} • {booking.timezone}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 whitespace-nowrap">
                                                            <div className={cn("text-[12.5px] font-medium", isDark ? "text-[#ccc]" : "text-[#555]")}>
                                                                {booking.duration_minutes} min
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <span className={cn(
                                                                "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                                                                booking.status === 'cancelled' 
                                                                    ? (isDark ? "bg-red-500/10 text-red-400" : "bg-red-500/10 text-red-600")
                                                                    : (isDark ? "bg-green-500/10 text-green-400" : "bg-green-500/10 text-green-600")
                                                            )}>
                                                                {booking.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center gap-4 mt-20">
                                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center",
                                        isDark ? "bg-white/5" : "bg-[#f0f0f0]")}>
                                        <Calendar size={24} className={isDark ? "text-[#444]" : "text-[#ccc]"} />
                                    </div>
                                    <div className="text-center">
                                        <div className={cn("font-semibold text-[14px] mb-1", isDark ? "text-[#444]" : "text-[#bbb]")}>No bookings yet</div>
                                        <div className={cn("text-[12px]", isDark ? "text-[#333]" : "text-[#ccc]")}>Bookings will appear here once people schedule time</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {editorTab === 'availability' && (
                    <div className={cn("flex-1 overflow-auto p-4 md:p-8", isDark ? "bg-[#141414]" : "bg-[#fafafa]")}>
                        <div className="max-w-[800px] mx-auto w-full">
                            <AvailabilityTab isDark={isDark} meta={meta} updateMeta={updateMeta} primaryColor={design.primaryColor || '#4dbf39'} />
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {imageUploadOpen && (
                <ImageUploadModal
                    isOpen={imageUploadOpen}
                    onClose={() => setImageUploadOpen(false)}
                    onUpload={(url: string) => {
                        if (uploadTarget === 'logo') updateMeta({ logoUrl: url });
                        else updateDesign({ backgroundImage: url });
                        setImageUploadOpen(false);
                    }}
                />
            )}

            {isDeleteOpen && (
                <DeleteConfirmModal
                    open={isDeleteOpen}
                    title="Delete Scheduler"
                    description="This will permanently delete this scheduler and all its bookings."
                    onConfirm={handleDelete}
                    onClose={() => setIsDeleteOpen(false)}
                />
            )}
        </div>
    );
}
