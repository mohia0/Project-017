"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ProposalDocument } from '@/components/proposals/ProposalEditor';
import { InvoiceDocument } from '@/components/invoices/InvoiceEditor';
import { ClientActionBar } from '@/components/ui/ClientActionBar';
import { AcceptSignModal } from '@/components/modals/AcceptSignModal';
import { PaymentMethodSelectorModal } from '@/components/modals/PaymentMethodSelectorModal';
import { cn, getBackgroundImageWithOpacity } from '@/lib/utils';
import dynamic from 'next/dynamic';
import FieldPreview from '@/components/forms/FieldPreview';
import { Check, Clock, Calendar as CalendarIcon, MapPin, ChevronRight } from 'lucide-react';
import { gooeyToast } from 'goey-toast';

const KanbanBoard = dynamic(() => import('@/components/projects/KanbanBoard'), { ssr: false });

// Anon-key client — safe for public preview pages, used only to subscribe
// to Realtime events. No sensitive data is written through this client.
const supabasePublic = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─────────────────────────────────────────────────────────────────────────────
// FormPreview — isolated component with its own state so it doesn't pollute
// the parent and can be cleanly reused.
// ─────────────────────────────────────────────────────────────────────────────
function FormPreview({ liveData, data }: { liveData: any; data: any }) {
    const meta = liveData.meta || {};
    const design = meta.design || {};
    const isFormDark = design.theme === 'dark';
    const primaryColor = design.primaryColor || '#4dbf39';

    // Fields come from `fields` column (forms) — fall back to `blocks` for safety
    const fields: any[] = Array.isArray(liveData.fields) && liveData.fields.length > 0
        ? liveData.fields
        : Array.isArray(liveData.blocks)
            ? liveData.blocks
            : [];

    // Controlled values keyed by field id
    const [values, setValues] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const setValue = (id: string, val: string) => {
        setValues(prev => ({ ...prev, [id]: val }));
        if (errors[id]) setErrors(prev => ({ ...prev, [id]: false }));
    };

    const handleSubmit = async () => {
        // Validate required fields
        const newErrors: Record<string, boolean> = {};
        let hasError = false;
        for (const f of fields) {
            if (f.required && !values[f.id]?.trim()) {
                newErrors[f.id] = true;
                hasError = true;
            }
        }
        if (hasError) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const res = await fetch('/api/form-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    form_id: data.id,
                    workspace_id: data.workspace_id,
                    data: values,
                    form_title: liveData.title,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                const msg = err.error || 'Failed to submit';
                setSubmitError(msg);
                gooeyToast.error(msg);
                return;
            }
            
            const result = await res.json();
            if (!result.success) {
                const msg = result.error || 'Failed to submit';
                setSubmitError(msg);
                gooeyToast.error(msg);
                return;
            }

            setIsSubmitted(true);
        } catch (err: any) {
            // Only log as error if it wasn't a handled 4xx
            if (!submitError) console.error('Form submission unexpected error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const limitVal = meta.submissionLimit ?? meta.submissionsLimit;
    const submissionLimit = (limitVal !== undefined && limitVal !== null && limitVal !== '') ? parseInt(String(limitVal)) : null;
    const hasReachedLimit = submissionLimit !== null && (data.submissionCount || 0) >= submissionLimit;

    const now = new Date();
    const isExpired = meta.expirationDate && new Date(meta.expirationDate) < now;
    const isNotYetActive = meta.activationDate && new Date(meta.activationDate) > now;
    const isRestricted = liveData.status === 'Draft' || liveData.status === 'Inactive' || hasReachedLimit || isExpired || isNotYetActive;

    return (
        <div
            className="flex-1 overflow-auto relative w-full min-h-screen"
            style={{
                backgroundColor: design.backgroundColor || (isFormDark ? '#080808' : '#f7f7f7'),
                backgroundImage: getBackgroundImageWithOpacity(
                    design.backgroundImage,
                    design.backgroundColor || (isFormDark ? '#080808' : '#f7f7f7'),
                    design.backgroundImageOpacity
                ),
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
            }}
        >
            <div className={cn(
                "flex flex-col items-center min-h-screen py-12 px-6",
                (isSubmitted || isRestricted) && "justify-center"
            )}>
                <div
                    className="w-full max-w-[620px] overflow-hidden shadow-2xl transition-all duration-300"
                    style={{
                        backgroundColor: design.blockBackgroundColor || (isFormDark ? '#111' : '#fff'),
                        boxShadow: design.blockShadow || '0 10px 40px -10px rgba(0,0,0,0.15)',
                        fontFamily: design.fontFamily || 'Inter',
                        borderRadius: `${design.borderRadius ?? 16}px`,
                    }}
                >
                    {isSubmitted ? (
                        // ── SUCCESS SCREEN ──────────────────────────────────
                        <div className="flex flex-col items-center justify-center text-center py-20 px-4 md:px-8">
                            <div className="w-full max-w-[500px] flex flex-col items-center">
                                {(meta.confirmationBlocks || [
                                    { id: 'default-s', type: 'success' },
                                    { id: 'default-h', type: 'heading', level: 2, content: 'Thanks!' },
                                    { id: 'default-t', type: 'text', content: meta.confirmationMessage || "Thank you for your submission! We'll be in touch soon." }
                                ]).map((block: any) => (
                                    <div key={block.id} className="w-full">
                                        {block.type === 'success' && (
                                            <div className="flex flex-col items-center text-center py-6 gap-4">
                                                <div className="w-16 h-16 rounded-full flex items-center justify-center text-black shadow-lg shadow-black/5 animate-in zoom-in-50 duration-500"
                                                    style={{ background: primaryColor }}>
                                                    <Check size={28} strokeWidth={2.5} />
                                                </div>
                                            </div>
                                        )}

                                        {block.type === 'heading' && (
                                            <div className="px-4 py-2 text-center">
                                                <h2 
                                                    className={cn(
                                                        "font-bold tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-500",
                                                        block.level === 1 ? "text-[32px]" : block.level === 3 ? "text-[18px]" : "text-[24px]"
                                                    )}
                                                    style={{ color: isFormDark ? '#fff' : '#111' }}
                                                >
                                                    {block.content}
                                                </h2>
                                            </div>
                                        )}

                                        {block.type === 'text' && (
                                            <div className="px-4 py-1 text-center font-normal">
                                                <div 
                                                    className="text-[15px] leading-relaxed opacity-70 animate-in fade-in slide-in-from-bottom-2 duration-700"
                                                    style={{ color: isFormDark ? '#ccc' : '#444' }}
                                                    dangerouslySetInnerHTML={{ __html: block.content }}
                                                />
                                            </div>
                                        )}

                                        {block.type === 'divider' && (
                                            <div className="px-4 py-6">
                                                <div className={cn("w-full h-px", isFormDark ? "bg-white/10" : "bg-black/10")} />
                                            </div>
                                        )}

                                        {block.type === 'image' && block.url && (
                                            <div className="px-4 py-4 flex justify-center">
                                                <img src={block.url} alt="" className="max-w-full h-auto rounded-xl shadow-lg animate-in zoom-in-95 duration-700" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : isRestricted ? (
                        // ── RESTRICTED MESSAGE ──────────────────────────────
                        <div className="flex flex-col items-center justify-center text-center py-20 px-8 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className={cn(
                                "w-16 h-16 rounded-full flex items-center justify-center",
                                (hasReachedLimit || isExpired) ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                            )}>
                                {isNotYetActive ? <CalendarIcon size={28} /> : <Clock size={28} strokeWidth={2.5} />}
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-[24px] font-bold tracking-tight" style={{ color: isFormDark ? '#fff' : '#111' }}>
                                    {hasReachedLimit ? 'Form Limit Reached' : isExpired ? 'Form Expired' : isNotYetActive ? 'Coming Soon' : 'Form Not Available'}
                                </h2>
                                <p className="text-[15px] opacity-70 leading-relaxed max-w-[400px] mx-auto" style={{ color: isFormDark ? '#ccc' : '#444' }}>
                                    {hasReachedLimit ? (
                                        "This form has reached its maximum number of submissions and is no longer accepting new responses."
                                    ) : isExpired ? (
                                        <>This form <b>expired</b> on {new Date(meta.expirationDate).toLocaleDateString()} and is no longer available.</>
                                    ) : isNotYetActive ? (
                                        <>This form is <b>scheduled</b> to become active on {new Date(meta.activationDate).toLocaleDateString()}.</>
                                    ) : (
                                        <>This form is currently in <b>{(liveData.status || 'Draft').toLowerCase()}</b> mode and is not accepting responses yet.</>
                                    )}
                                </p>
                            </div>
                        </div>
                    ) : (
                        // ── FORM ────────────────────────────────────────────
                        <div className="p-8 md:p-12">
                            {/* Header */}
                            <div className="mb-8">
                                {meta.logoUrl && (
                                    <img
                                        src={meta.logoUrl}
                                        alt="Logo"
                                        className="mb-4 object-contain"
                                        style={{ height: `${design.logoSize || 40}px` }}
                                    />
                                )}
                                <h1
                                    className="text-[28px] font-bold leading-tight tracking-tight mb-2"
                                    style={{ color: isFormDark ? '#fff' : '#111' }}
                                >
                                    {liveData.title}
                                </h1>
                                {meta.description && (
                                    <p
                                        className="text-[14px] opacity-60 max-w-[90%]"
                                        style={{ color: isFormDark ? '#aaa' : '#555' }}
                                    >
                                        {meta.description}
                                    </p>
                                )}
                            </div>

                            {/* Fields */}
                            {fields.length === 0 ? (
                                <div className="text-center py-12 opacity-30" style={{ color: isFormDark ? '#fff' : '#111' }}>
                                    <div className="text-[13px]">This form has no fields yet.</div>
                                </div>
                            ) : (
                                <div className="space-y-0">
                                    {fields.map((f: any) => (
                                        <div key={f.id}>
                                            <FieldPreview
                                                field={f}
                                                isDark={isFormDark}
                                                primaryColor={primaryColor}
                                                borderRadius={design.borderRadius ?? 16}
                                                isPreview={true}
                                                marginTop={design.marginTop}
                                                marginBottom={design.marginBottom}
                                                value={values[f.id] ?? ''}
                                                onChange={val => setValue(f.id, val)}
                                            />
                                            {errors[f.id] && (
                                                <p className="text-[11px] text-red-500 mt-1 mb-1 font-medium">
                                                    This field is required
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Submit */}
                            {fields.length > 0 && (
                                <div className="space-y-4">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="mt-10 w-full py-4 font-bold text-[15px] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        style={{
                                            background: primaryColor,
                                            borderRadius: `${design.borderRadius ?? 16}px`,
                                            color: '#000',
                                        }}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                Submitting…
                                            </>
                                        ) : 'Submit'}
                                    </button>
                                    {submitError && (
                                        <p className="text-center text-[12px] font-medium text-red-500 animate-in fade-in slide-in-from-top-1">
                                            {submitError}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SchedulerPreview
// ─────────────────────────────────────────────────────────────────────────────
function SchedulerPreview({ liveData, data }: { liveData: any; data: any }) {
    const meta = liveData.meta || {};
    const design = meta.design || {};
    const isDark = design.theme === 'dark';
    const primaryColor = design.primaryColor || '#4dbf39';

    const [step, setStep] = useState<'scheduler' | 'form' | 'confirmation'>('scheduler');
    const [selDate, setSelDate] = useState<Date | null>(null);
    const [selTime, setSelTime] = useState<string | null>(null);
    const [duration, setDuration] = useState<number>(Array.isArray(meta.durations) ? meta.durations[0] : 30);
    
    // Booker info
    const [info, setInfo] = useState({ name: '', email: '', phone: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const limitVal = meta.submissionLimit ?? meta.submissionsLimit;
    const submissionLimit = (limitVal !== undefined && limitVal !== null && limitVal !== '') ? parseInt(String(limitVal)) : null;
    const hasReachedLimit = submissionLimit !== null && (data.submissionCount || 0) >= submissionLimit;

    const now = new Date();
    const isExpired = meta.expirationDate && new Date(meta.expirationDate) < now;
    const isNotYetActive = meta.activationDate && new Date(meta.activationDate) > now;
    const isRestricted = liveData.status === 'Draft' || liveData.status === 'Inactive' || hasReachedLimit || isExpired || isNotYetActive;

    const timeToMinutes = (timeStr: string) => {
        const parts = timeStr.trim().split(/\s+/);
        if (parts.length < 2) return 0;
        const [time, period] = parts;
        let [hStr, mStr] = time.split(':');
        let h = parseInt(hStr, 10);
        let m = parseInt(mStr || '0', 10);
        if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
        if (period.toUpperCase() === 'AM' && h === 12) h = 0;
        return h * 60 + m;
    };

    const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let availableSlots: string[] = [];

    if (selDate) {
        const dayStr = WEEKDAYS[selDate.getDay()];
        const availConfig = (meta.availability || {
            Monday: { active: true, start: '9:00 AM', end: '5:00 PM' },
            Tuesday: { active: true, start: '9:00 AM', end: '5:00 PM' },
            Wednesday: { active: true, start: '9:00 AM', end: '5:00 PM' },
            Thursday: { active: true, start: '9:00 AM', end: '5:00 PM' },
            Friday: { active: true, start: '9:00 AM', end: '5:00 PM' },
            Saturday: { active: false, start: '9:00 AM', end: '5:00 PM' },
            Sunday: { active: false, start: '9:00 AM', end: '5:00 PM' }
        })[dayStr];

        if (availConfig && availConfig.active) {
            const startMins = timeToMinutes(availConfig.start);
            const endMins = timeToMinutes(availConfig.end);
            
            const allSlots: string[] = [];
            for (let m = startMins; m + duration <= endMins; m += duration) {
                const h = Math.floor(m / 60);
                const mn = m % 60;
                const ampm = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 === 0 ? 12 : h % 12;
                allSlots.push(`${h12}:${String(mn).padStart(2, '0')} ${ampm}`);
            }

            const selectedDateStr = selDate.getFullYear() + '-' + String(selDate.getMonth() + 1).padStart(2, '0') + '-' + String(selDate.getDate()).padStart(2, '0');
            const dayBookings = (data.schedulerBookings || []).filter((b: any) => b.booked_date === selectedDateStr);

            availableSlots = allSlots.filter(slot => {
                const slotStart = timeToMinutes(slot);
                const slotEnd = slotStart + duration;
                for (const b of dayBookings) {
                    const bStart = timeToMinutes(b.booked_time);
                    const bEnd = bStart + (b.duration_minutes || 30);
                    if (Math.max(slotStart, bStart) < Math.min(slotEnd, bEnd)) {
                        return false;
                    }
                }
                return true;
            });
        }
    }

    if (isRestricted) {
        return (
            <div
                className="flex-1 overflow-auto relative w-full min-h-screen"
                style={{
                    backgroundColor: design.backgroundColor || (isDark ? '#080808' : '#f7f7f7'),
                    backgroundImage: getBackgroundImageWithOpacity(
                        design.backgroundImage,
                        design.backgroundColor || (isDark ? '#080808' : '#f7f7f7'),
                        design.backgroundImageOpacity
                    ),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundAttachment: 'fixed',
                }}
            >
                <div className={cn(
                    "flex flex-col items-center justify-center min-h-screen py-12 px-6"
                )}>
                    <div
                        className="w-full max-w-[620px] overflow-hidden shadow-2xl transition-all duration-300"
                        style={{
                            backgroundColor: design.blockBackgroundColor || (isDark ? '#111' : '#fff'),
                            boxShadow: design.blockShadow || '0 10px 40px -10px rgba(0,0,0,0.15)',
                            fontFamily: design.fontFamily || 'Inter',
                            borderRadius: `${design.borderRadius ?? 16}px`,
                        }}
                    >
                        <div className="flex flex-col items-center justify-center text-center py-20 px-8 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className={cn(
                                "w-16 h-16 rounded-full flex items-center justify-center",
                                (hasReachedLimit || isExpired) ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                            )}>
                                {isNotYetActive ? <CalendarIcon size={28} /> : <Clock size={28} strokeWidth={2.5} />}
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-[24px] font-bold tracking-tight" style={{ color: isDark ? '#fff' : '#111' }}>
                                    {hasReachedLimit ? 'Booking Limit Reached' : isExpired ? 'Booking Expired' : isNotYetActive ? 'Coming Soon' : 'Scheduler Not Available'}
                                </h2>
                                <p className="text-[15px] opacity-70 leading-relaxed max-w-[400px] mx-auto" style={{ color: isDark ? '#ccc' : '#444' }}>
                                    {hasReachedLimit ? (
                                        "This scheduler has reached its maximum number of bookings and is no longer accepting new appointments."
                                    ) : isExpired ? (
                                        <>This scheduler <b>expired</b> on {new Date(meta.expirationDate).toLocaleDateString()} and is no longer accepting bookings.</>
                                    ) : isNotYetActive ? (
                                        <>This scheduler is <b>scheduled</b> to go live on {new Date(meta.activationDate).toLocaleDateString()}.</>
                                    ) : (
                                        <>This scheduler is currently in <b>{(liveData.status || 'Draft').toLowerCase()}</b> mode and is not accepting bookings yet.</>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const handleConfirmBooking = async () => {
        if (!info.name || !info.email || !selDate || !selTime) return;

        setIsSubmitting(true);
        try {
            const localDateStr = selDate.getFullYear() + '-' + String(selDate.getMonth() + 1).padStart(2, '0') + '-' + String(selDate.getDate()).padStart(2, '0');
            const res = await fetch('/api/scheduler-booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scheduler_id: data.id,
                    workspace_id: data.workspace_id,
                    booker_name: info.name,
                    booker_email: info.email,
                    booker_phone: info.phone,
                    booked_date: localDateStr,
                    booked_time: selTime,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    duration_minutes: duration,
                    scheduler_title: liveData.title,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                const msg = err.error || 'Failed to book';
                gooeyToast.error(msg);
                if (res.status >= 400 && res.status < 500) {
                    console.warn('Booking prevented:', msg);
                    return;
                }
                throw new Error(msg);
            }

            setStep('confirmation');
        } catch (err: any) {
            console.error('Booking unexpected error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="flex-1 overflow-auto relative w-full min-h-screen"
            style={{
                backgroundColor: design.backgroundColor || (isDark ? '#080808' : '#f7f7f7'),
                backgroundImage: getBackgroundImageWithOpacity(
                    design.backgroundImage,
                    design.backgroundColor || (isDark ? '#080808' : '#f7f7f7'),
                    design.backgroundImageOpacity
                ),
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
            }}
        >
            <div className={cn(
                "flex flex-col items-center min-h-screen py-12 px-4",
                (step === 'confirmation') && "justify-center"
            )}>
                <div
                    className="w-full max-w-[1400px] overflow-hidden shadow-2xl transition-all duration-300"
                    style={{
                        backgroundColor: design.blockBackgroundColor || (isDark ? '#111' : '#fff'),
                        boxShadow: design.blockShadow || '0 10px 40px -10px rgba(0,0,0,0.15)',
                        fontFamily: design.fontFamily || 'Inter',
                        borderRadius: `${design.borderRadius ?? 16}px`,
                    }}
                >
                    <div className="flex flex-col h-full bg-transparent">
                        <div className="px-8 pt-8 pb-5 border-b border-black/5 dark:border-white/5">
                            <div className="flex items-center gap-4 mb-6">
                    {meta.logoUrl ? (
                        <img src={meta.logoUrl} alt="Logo" className="h-10 object-contain" />
                    ) : (
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-[20px]"
                            style={{ background: primaryColor }}>
                            {(meta.organizer || liveData.title || 'S')[0].toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h1 className="font-bold text-[20px]" style={{ color: isDark ? '#fff' : '#111' }}>
                            {meta.organizer || liveData.title}
                        </h1>
                        <div className="text-[13px] opacity-50" style={{ color: isDark ? '#aaa' : '#777' }}>
                            {liveData.title}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {step === 'scheduler' && (Array.isArray(meta.durations) ? meta.durations : [30]).map((d: number) => (
                        <button key={d} 
                            onClick={() => setDuration(d)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all",
                                duration === d ? "scale-105" : "opacity-60 grayscale"
                            )}
                            style={{ background: primaryColor, color: '#000' }}>
                            <Clock size={12} />
                            {d >= 60 ? `${d / 60}hr` : `${d}min`}
                        </button>
                    ))}
                    {meta.location && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium opacity-60 ml-auto"
                            style={{ color: isDark ? '#ccc' : '#444' }}>
                            <MapPin size={12} />
                            {meta.location}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto min-h-[520px]">
                {step === 'scheduler' && (
                    <div className="grid grid-cols-1 md:grid-cols-[1.8fr_1fr] gap-12 animate-in fade-in duration-300">
                        <div>
                            <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-6">
                                <h3 className="text-[14px] font-bold mb-4" style={{ color: isDark ? '#fff' : '#111' }}>
                                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </h3>
                                <div className="grid grid-cols-7 gap-2">
                                    {['S','M','T','W','T','F','S'].map((d, i) => (
                                        <div key={i} className="text-center text-[10px] font-bold opacity-30">{d}</div>
                                    ))}
                                    {Array.from({ length: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() }).map((_, i) => {
                                        const day = i + 1;
                                        const date = new Date(now.getFullYear(), now.getMonth(), day);
                                        const isPast = day < now.getDate();
                                        const isSelected = selDate?.getDate() === day;
                                        return (
                                            <button key={i}
                                                disabled={isPast}
                                                onClick={() => setSelDate(date)}
                                                className={cn(
                                                    "aspect-square rounded-2xl flex items-center justify-center text-[15px] font-bold transition-all",
                                                    isPast ? "opacity-20 cursor-not-allowed" : "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5",
                                                    isSelected && "font-black text-black"
                                                )}
                                                style={isSelected ? { background: primaryColor } : {}}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <div className="text-[11px] font-bold uppercase tracking-wider opacity-30 mb-2 px-1">Available times</div>
                            {!selDate ? (
                                <div className="text-[12px] opacity-40 italic px-1">Select a date first</div>
                            ) : availableSlots.length === 0 ? (
                                <div className="text-[12px] opacity-40 italic px-1">No slots available</div>
                            ) : (
                                availableSlots.map(t => (
                                    <button key={t}
                                        onClick={() => { setSelTime(t); setStep('form'); }}
                                        className="w-full py-3 rounded-xl border border-black/5 dark:border-white/5 text-[13px] font-bold transition-all hover:border-transparent hover:text-black"
                                        style={selTime === t ? { background: primaryColor, color: '#000', borderColor: 'transparent' } : { color: isDark ? '#fff' : '#111' }}
                                    >
                                        {t}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {step === 'form' && (
                    <div className="max-w-[400px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="text-center space-y-1">
                            <h3 className="text-[18px] font-bold" style={{ color: isDark ? '#fff' : '#111' }}>Confirm Details</h3>
                            <p className="text-[13px] opacity-50">
                                {selDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selTime} ({duration}m)
                            </p>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider opacity-40">Name</label>
                                <input 
                                    type="text" 
                                    value={info.name}
                                    onChange={e => setInfo({ ...info, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent outline-none focus:border-primary text-[14px]"
                                    placeholder="Enter your name"
                                    style={{ color: isDark ? '#fff' : '#111' }}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider opacity-40">Email</label>
                                <input 
                                    type="email" 
                                    value={info.email}
                                    onChange={e => setInfo({ ...info, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent outline-none focus:border-primary text-[14px]"
                                    placeholder="your@email.com"
                                    style={{ color: isDark ? '#fff' : '#111' }}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider opacity-40">Phone (Optional)</label>
                                <input 
                                    type="tel" 
                                    value={info.phone}
                                    onChange={e => setInfo({ ...info, phone: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent outline-none focus:border-primary text-[14px]"
                                    placeholder="+1 (555) 000-0000"
                                    style={{ color: isDark ? '#fff' : '#111' }}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button 
                                onClick={() => setStep('scheduler')}
                                className="flex-1 py-3.5 rounded-xl font-bold text-[14px] border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-[#111] dark:text-[#eee]"
                            >
                                Back
                            </button>
                            <button 
                                onClick={handleConfirmBooking}
                                disabled={isSubmitting || !info.name || !info.email}
                                className="flex-[2] py-3.5 rounded-xl font-bold text-[14px] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                style={{ background: primaryColor, color: '#000' }}
                            >
                                {isSubmitting ? 'Booking...' : 'Schedule Meeting'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'confirmation' && (
                    <div className="flex flex-col items-center justify-center text-center py-12 gap-6 animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl animate-in fade-in scale-in duration-700"
                            style={{ background: primaryColor }}>
                            <Check size={36} strokeWidth={3} className="text-black" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-[28px] font-bold tracking-tight" style={{ color: isDark ? '#fff' : '#111' }}>
                                Booking Confirmed!
                            </h2>
                            <p className="text-[15px] opacity-70 max-w-[400px]" style={{ color: isDark ? '#ccc' : '#444' }}>
                                {meta.confirmationMessage || "Your booking is confirmed! We'll send a calendar invite shortly."}
                            </p>
                        </div>
                        <div className="mt-4 p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-3 w-full max-w-[360px]">
                            <div className="flex items-center gap-3">
                                <CalendarIcon size={16} className="opacity-50" />
                                <span className="text-[14px] font-medium">{selDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Clock size={16} className="opacity-50" />
                                <span className="text-[14px] font-medium">{selTime} ({duration} min)</span>
                            </div>
                            {meta.location && (
                                <div className="flex items-center gap-3">
                                    <MapPin size={16} className="opacity-50" />
                                    <span className="text-[14px] font-medium">{meta.location}</span>
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={() => window.location.reload()}
                            className="text-[13px] font-bold opacity-40 hover:opacity-100 transition-opacity mt-4"
                            style={{ color: isDark ? '#fff' : '#111' }}
                        >
                            Book another session
                        </button>
                    </div>
                )}
            </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main PreviewClient
// ─────────────────────────────────────────────────────────────────────────────
export default function PreviewClient({ type, data }: { type: 'proposal' | 'invoice' | 'project' | 'form' | 'scheduler', data: any }) {
    const [liveData, setLiveData] = useState(data);
    // useRef persists across React Strict Mode double-mounts (unlike useState)
    const viewHasBeenTracked = useRef(false);

    // Modals
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobileViewport(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Project specific state
    const [projectTasks, setProjectTasks] = useState<any[]>(data.projectTasks || []);
    const [projectGroups, setProjectGroups] = useState<any[]>(data.projectGroups || []);
    const [isProjectLoading, setIsProjectLoading] = useState(false);

    // Track view ONCE per page load
    useEffect(() => {
        if (viewHasBeenTracked.current) return;
        viewHasBeenTracked.current = true;

        fetch('/api/track-view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type,
                id: data.id,
                workspace_id: data.workspace_id,
                title: data.title || data.meta?.projectName || data.client_name,
            }),
        }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Supabase Realtime — live updates for all document types
    useEffect(() => {
        const tableName = (type === 'form' || type === 'forms') ? 'forms' : 
                          (type === 'scheduler' || type === 'schedulers') ? 'schedulers' : 
                          type === 'project' ? 'projects' :
                          type === 'proposal' ? 'proposals' : 'invoices';
        
        const channelName = `preview:${tableName}:${data.id}`;

        const channel = supabasePublic
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: tableName,
                    filter: `id=eq.${data.id}`,
                },
                (payload) => {
                    if (!payload.new) return;
                    const raw = payload.new as any;
                    // For projects, we want to keep the name/status/color updated
                    setLiveData((prev: any) => ({ ...prev, ...raw }));
                }
            );

        // Extra listeners for project tasks and groups
        if (type === 'project') {
            channel
                .on('postgres_changes', { event: '*', schema: 'public', table: 'project_tasks', filter: `project_id=eq.${data.id}` }, (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setProjectTasks(prev => [...prev.filter(t => t.id !== (payload.new as any).id), payload.new]);
                    } else if (payload.eventType === 'UPDATE') {
                        setProjectTasks(prev => prev.map(t => t.id === (payload.new as any).id ? payload.new : t));
                    } else if (payload.eventType === 'DELETE') {
                        setProjectTasks(prev => prev.filter(t => t.id !== (payload.old as any).id));
                    }
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'project_task_groups', filter: `project_id=eq.${data.id}` }, (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setProjectGroups(prev => [...prev.filter(g => g.id !== (payload.new as any).id), payload.new]);
                    } else if (payload.eventType === 'UPDATE') {
                        setProjectGroups(prev => prev.map(g => g.id === (payload.new as any).id ? payload.new : g));
                    } else if (payload.eventType === 'DELETE') {
                        setProjectGroups(prev => prev.filter(g => g.id !== (payload.old as any).id));
                    }
                });
        }

        channel.subscribe();

        return () => {
            supabasePublic.removeChannel(channel);
        };
    }, [type, data.id]);

    const handleUpdateStatus = async (status: string, signatureData?: any) => {
        if (isUpdating) return;

        try {
            setIsUpdating(true);
            const res = await fetch(`/api/p/${type}/${data.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, signatureData }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update');
            }

            const updatedResponse = await res.json();
            if (updatedResponse.success) {
                setLiveData((prev: any) => ({ ...prev, ...updatedResponse.updateData }));
            }
        } catch (e) {
            console.error('Failed to update document status:', e);
        } finally {
            setIsUpdating(false);
        }
    };

    const isDark = false;
    const totals = { subtotal: liveData.amount || 0, discAmt: 0, taxAmt: 0, total: liveData.amount || 0 };

    // ── PROPOSAL ─────────────────────────────────────────────────────────────
    if (type === 'proposal') {
        const meta = {
            ...liveData.meta,
            clientName:      liveData.client_name || '',
            projectName:     liveData.title        || '',
            issueDate:       liveData.issue_date   || '',
            expirationDate:  liveData.due_date     || '',
            status:          liveData.status       || 'Draft',
        };

        const signatureBlock = (liveData.blocks || []).find((b: any) => b.type === 'signature' && b.signed);
        const signedBy = signatureBlock ? (signatureBlock.signerName || 'Client') : undefined;
        const signedAt = signatureBlock && liveData.updated_at
            ? new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }).format(new Date(liveData.updated_at))
            : undefined;

        return (
            <div
                className="flex-1 overflow-auto relative w-full h-screen"
                style={{
                    backgroundColor:   meta.design?.backgroundColor  || (isDark ? '#080808' : '#f7f7f7'),
                    backgroundImage:   getBackgroundImageWithOpacity(meta.design?.backgroundImage, meta.design?.backgroundColor || (isDark ? '#080808' : '#f7f7f7'), meta.design?.backgroundImageOpacity),
                    backgroundSize:    'cover',
                    backgroundPosition:'center',
                    backgroundAttachment: 'fixed',
                }}
            >
                <div className="z-30 flex justify-center sticky top-0 transition-all w-full pt-4 pb-8 pointer-events-none">
                    <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                        }}
                    >
                        <div className={cn(
                            "absolute inset-0 pointer-events-none",
                            isDark 
                                ? "bg-gradient-to-b from-[#080808]/80 to-transparent" 
                                : "bg-gradient-to-b from-[#f7f7f7]/80 to-transparent"
                        )} />
                    </div>
                    <div className="relative z-10 w-full pointer-events-auto">
                        <ClientActionBar
                            type="proposal"
                            status={meta.status as any}
                            design={meta.design}
                            signedBy={signedBy}
                            signedAt={signedAt}
                            inline={true}
                            onDownloadPDF={() => window.print()}
                            onPrint={() => window.print()}
                            onAccept={() => setIsSignModalOpen(true)}
                            onDecline={() => handleUpdateStatus('Declined')}
                            className="w-full max-w-[850px] mx-auto px-6"
                        />
                    </div>
                </div>

                <div className={cn("flex flex-col items-center min-h-full pb-20", isMobileViewport ? "pt-2 px-4" : "pt-4 px-6")}>
                    <div
                        className="w-full max-w-[850px] overflow-hidden transition-all duration-300"
                        style={{
                            borderRadius:    `${meta.design?.borderRadius ?? 16}px`,
                            backgroundColor: meta.design?.blockBackgroundColor || '#ffffff',
                            boxShadow:       meta.design?.blockShadow || '0 4px 20px -4px rgba(0,0,0,0.05)',
                        }}
                    >
                        <ProposalDocument
                            meta={meta}
                            blocks={liveData.blocks || []}
                            totals={totals}
                            isDark={false}
                            isPreview={true}
                            isMobile={isMobileViewport}
                            updateBlock={() => {}}
                            removeBlock={() => {}}
                            addBlock={() => {}}
                            openInsertMenu={null}
                            setOpenInsertMenu={() => {}}
                            updateMeta={() => {}}
                            setBlocks={() => {}}
                            currency={meta.currency || 'USD'}
                            setImageUploadOpen={() => {}}
                            setUploadTarget={() => {}}
                            isSaveTemplateModalOpen={false}
                            setIsSaveTemplateModalOpen={() => {}}
                            addTemplate={async () => {}}
                        />
                    </div>
                </div>

                <AcceptSignModal
                    isOpen={isSignModalOpen}
                    onClose={() => setIsSignModalOpen(false)}
                    documentType={type as any}
                    onAccept={(signatureData) => handleUpdateStatus('Accepted', signatureData)}
                    design={meta.design}
                />
            </div>
        );
    }

    // ── INVOICE ──────────────────────────────────────────────────────────────
    if (type === 'invoice') {
        const invoiceMeta = {
            ...liveData.meta,
            clientName:  liveData.client_name    || '',
            projectName: liveData.title           || '',
            issueDate:   liveData.issue_date      || '',
            dueDate:     liveData.due_date        || '',
            status:      liveData.status          || 'Draft',
            currency:    liveData.meta?.currency  || 'USD',
        };

        const paidBy = invoiceMeta.clientName || 'Client';
        const paidAt = liveData.updated_at
            ? new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }).format(new Date(liveData.updated_at))
            : undefined;

        return (
            <div
                className="flex-1 overflow-auto relative w-full h-screen"
                style={{
                    backgroundColor:   invoiceMeta.design?.backgroundColor  || (isDark ? '#080808' : '#f7f7f7'),
                    backgroundImage:   getBackgroundImageWithOpacity(invoiceMeta.design?.backgroundImage, invoiceMeta.design?.backgroundColor || (isDark ? '#080808' : '#f7f7f7'), invoiceMeta.design?.backgroundImageOpacity),
                    backgroundSize:    'cover',
                    backgroundPosition:'center',
                    backgroundAttachment: 'fixed',
                }}
            >
                <div className="z-30 flex justify-center sticky top-0 transition-all w-full pt-4 pb-8 pointer-events-none">
                    <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                        }}
                    >
                        <div className={cn(
                            "absolute inset-0 pointer-events-none",
                            isDark 
                                ? "bg-gradient-to-b from-[#080808]/80 to-transparent" 
                                : "bg-gradient-to-b from-[#f7f7f7]/80 to-transparent"
                        )} />
                    </div>
                    <div className="relative z-10 w-full pointer-events-auto">
                        <ClientActionBar
                            type="invoice"
                            status={invoiceMeta.status as any}
                            amountDue={new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceMeta.currency, minimumFractionDigits: 2 }).format(totals.total)}
                            paidAt={paidAt}
                            paidBy={paidBy}
                            design={invoiceMeta.design}
                            inline={true}
                            onDownloadPDF={() => window.print()}
                            onPrint={() => window.print()}
                            onPay={() => setIsBankModalOpen(true)}
                            className="w-full max-w-[850px] mx-auto px-6"
                        />
                    </div>
                </div>

                <div className={cn("flex flex-col items-center min-h-full pb-20", isMobileViewport ? "pt-2 px-4" : "pt-4 px-6")}>
                    <div
                        className="w-full max-w-[850px] overflow-hidden transition-all duration-300"
                        style={{
                            borderRadius:    `${invoiceMeta.design?.borderRadius ?? 16}px`,
                            backgroundColor: invoiceMeta.design?.blockBackgroundColor || '#ffffff',
                            boxShadow:       invoiceMeta.design?.blockShadow || '0 4px 20px -4px rgba(0,0,0,0.05)',
                        }}
                    >
                        <InvoiceDocument
                            meta={invoiceMeta}
                            blocks={liveData.blocks || []}
                            totals={totals}
                            isDark={false}
                            isPreview={true}
                            isMobile={isMobileViewport}
                            updateBlock={() => {}}
                            removeBlock={() => {}}
                            addBlock={() => {}}
                            openInsertMenu={null}
                            setOpenInsertMenu={() => {}}
                            updateMeta={() => {}}
                            setBlocks={() => {}}
                        />
                    </div>
                </div>

                <PaymentMethodSelectorModal
                    isOpen={isBankModalOpen}
                    onClose={() => setIsBankModalOpen(false)}
                    invoice={{ ...liveData, amount: totals.total }}
                    onMarkAsPaid={() => handleUpdateStatus('Paid')}
                />
            </div>
        );
    }

    // ── PROJECT ──────────────────────────────────────────────────────────────
    if (type === 'project') {
        const projectColor = liveData.color || '#6366f1';

        return (
            <div className="flex-1 flex flex-col w-full h-screen overflow-hidden bg-[#f7f7f7]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ background: projectColor }} />
                            <h1 className="text-[16px] font-bold text-[#111]">{liveData.name || liveData.title}</h1>
                        </div>
                        {liveData.client_name && (
                            <>
                                <div className="w-px h-4 bg-black/10" />
                                <span className="text-[12px] text-[#888] font-medium">For: {liveData.client_name}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[12px] text-[#ccc] font-bold uppercase tracking-wider px-2.5 py-1 bg-[#f5f5f5] rounded-lg border border-black/[0.03]">
                            {liveData.status}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 bg-[#f7f7f7]">
                    {isProjectLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <KanbanBoard
                            projectId={data.id}
                            projectColor={projectColor}
                            isDark={false}
                            searchQuery=""
                            showArchived={false}
                            onTaskClick={() => {}}
                            isPreview={true}
                            externalTasks={projectTasks}
                            externalGroups={projectGroups}
                        />
                    )}
                </div>
            </div>
        );
    }

    // ── FORM ─────────────────────────────────────────────────────────────────
    if (type === 'form' || type === 'forms') {
        return <FormPreview liveData={liveData} data={data} />;
    }

    // ── SCHEDULER ────────────────────────────────────────────────────────────
    if (type === 'scheduler' || type === 'schedulers') {
        return <SchedulerPreview liveData={liveData} data={data} />;
    }

    return null;
}
