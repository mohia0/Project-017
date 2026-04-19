"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AppLoader } from '@/components/ui/AppLoader';
import { ProposalDocument } from '@/components/proposals/ProposalEditor';
import { InvoiceDocument } from '@/components/invoices/InvoiceEditor';
import { ClientActionBar } from '@/components/ui/ClientActionBar';
import { AcceptSignModal } from '@/components/modals/AcceptSignModal';
import { PaymentMethodSelectorModal } from '@/components/modals/PaymentMethodSelectorModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { cn, getBackgroundImageWithOpacity, replaceVariables } from '@/lib/utils';
import dynamic from 'next/dynamic';
import FieldPreview from '@/components/forms/FieldPreview';
import { Check, Clock, Calendar as CalendarIcon, MapPin, ChevronRight, User, Mail, Phone, ExternalLink } from 'lucide-react';
import { appToast } from '@/lib/toast';
import { CalendarPreview, getAvailableSlots, timeToMinutes } from '@/components/schedulers/CalendarPreview';
import { AnimatePresence } from 'framer-motion';
import { DateTime } from 'luxon';
import { useSearchParams } from 'next/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// Google Font loader — injects a <link> for the document's chosen font family.
// NOTE: We always load from Google Fonts, including Inter, because it is NOT
// a system font on Windows or Android and must be fetched explicitly.
// ─────────────────────────────────────────────────────────────────────────────
const LOADED_FONTS = new Set<string>();
function loadGoogleFont(family: string) {
    if (!family || LOADED_FONTS.has(family)) return;
    LOADED_FONTS.add(family);
    const encoded = encodeURIComponent(family);
    const id = `gfont-${encoded}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap`;
    document.head.appendChild(link);
}

// ─────────────────────────────────────────────────────────────────────────────
// Full-screen paper-drop confetti celebration
// ─────────────────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
    '#d4af37', // Gold
    '#bf953f', // Dark Gold
    '#fcf6ba', // Light Gold
    '#b38728', // Medium Gold
    '#fbf5b7', // Pale Gold
    '#ffffff', // White
    '#e5e4e2', // Platinum
    '#c0c0c0', // Silver
    '#222222', // Charcoal/Dark Iron
];

function launchFullScreenConfetti(container: HTMLElement) {
    const count = 220;
    const dropped: HTMLElement[] = [];

    // Inject keyframes once
    const kfId = 'confetti-kf-fullscreen';
    if (!document.getElementById(kfId)) {
        const s = document.createElement('style');
        s.id = kfId;
        s.textContent = `
            @keyframes cffall {
                0%   { transform: translateY(-20px) translateX(0) rotate(0deg) scale(1); opacity:1; }
                85%  { opacity:1; }
                100% { transform: translateY(105vh) translateX(var(--cf-drift)) rotate(var(--cf-rot)) scale(var(--cf-scale)); opacity:0; }
            }
            @keyframes cfsway {
                0%,100% { margin-left: 0; }
                50%     { margin-left: var(--cf-sway); }
            }
        `;
        document.head.appendChild(s);
    }

    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        const size = 5 + Math.random() * 9;
        const left = Math.random() * 100;
        const delay = Math.random() * 1200;
        const duration = 2200 + Math.random() * 1800;
        const drift = (Math.random() - 0.5) * 280;
        const rot   = Math.random() * 900 - 450;
        const sway  = (Math.random() - 0.5) * 60;
        const scale = 0.4 + Math.random() * 0.8;
        const isCircle = Math.random() > 0.45;
        const isLong   = !isCircle && Math.random() > 0.5;

        el.style.cssText = `
            position:fixed;
            top:-20px;
            left:${left}%;
            width:${size}px;
            height:${isLong ? size * 2.5 : size}px;
            background:${color};
            border-radius:${isCircle ? '50%' : '2px'};
            animation:
                cffall ${duration}ms ${delay}ms cubic-bezier(.25,.46,.45,.94) forwards,
                cfsway ${duration * 0.6}ms ${delay}ms ease-in-out infinite alternate;
            --cf-drift:${drift}px;
            --cf-rot:${rot}deg;
            --cf-scale:${scale};
            --cf-sway:${sway}px;
            pointer-events:none;
            z-index:99999;
            will-change:transform,opacity;
        `;
        container.appendChild(el);
        dropped.push(el);
    }

    // Auto-clean when all animations done
    setTimeout(() => dropped.forEach(el => el.remove()), 4200);
}

const KanbanBoard = dynamic(() => import('@/components/projects/KanbanBoard'), { ssr: false });
const TaskDetailPanel = dynamic(() => import('@/components/projects/TaskDetailPanel'), { ssr: false });

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
                appToast.error('Submission Failed', msg);
                return;
            }
            
            const result = await res.json();
            if (!result.success) {
                const msg = result.error || 'Failed to submit';
                setSubmitError(msg);
                appToast.error('Submission Failed', msg);
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
                "flex flex-col items-center justify-center min-h-screen py-12 px-6"
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
                                                    dangerouslySetInnerHTML={{ __html: replaceVariables(block.content) }}
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
                                        className="text-[14px] opacity-60"
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
                                            <AppLoader size="xs" color="black" />
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
    const [selDate, setSelDate] = useState<string | null>(null);
    const [selTime, setSelTime] = useState<string | null>(null);
    const [duration, setDuration] = useState<number>(Array.isArray(meta.durations) ? meta.durations[0] : 30);
    
    const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const workspaceTimezone = data.workspaceTimezone || 'UTC';
    const workspaceWeekStartDay = data.workspaceWeekStartDay || 'Saturday';
    // Booker info
    const [info, setInfo] = useState({ name: '', email: '', phone: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const hasCustomName = (meta.fields || []).some((f: any) => f.type === 'full_name');
    const hasCustomEmail = (meta.fields || []).some((f: any) => f.type === 'email');

    const limitVal = meta.submissionLimit ?? meta.submissionsLimit;
    const submissionLimit = (limitVal !== undefined && limitVal !== null && limitVal !== '') ? parseInt(String(limitVal)) : null;
    const hasReachedLimit = submissionLimit !== null && (data.submissionCount || 0) >= submissionLimit;

    const now = new Date();
    const isExpired = meta.expirationDate && new Date(meta.expirationDate) < now;
    const isNotYetActive = meta.activationDate && new Date(meta.activationDate) > now;
    const isRestricted = liveData.status === 'Draft' || liveData.status === 'Inactive' || hasReachedLimit || isExpired || isNotYetActive;

    const availableSlots = getAvailableSlots(selDate, [duration], meta.availability, data.schedulerBookings || [], workspaceTimezone, clientTimezone);

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

    const [formValues, setFormValues] = useState<Record<string, any>>({});

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



    const isFormValid = () => {
        if (!meta.fields || meta.fields.length === 0) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const field of meta.fields) {
            const val = formValues[field.id];
            
            // Check required
            if (field.required) {
                if (!val || (typeof val === 'string' && val.trim() === '')) return false;
            }

            // Check email format if it's an email field and has value
            if (field.type === 'email' && val && typeof val === 'string') {
                if (!emailRegex.test(val)) return false;
            }
        }
        return true;
    };

    const handleConfirmBooking = async (directInfo?: { name: string, email: string, phone?: string }) => {
        const finalInfo = directInfo || info;
        if (!selDate || !selTime) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/scheduler-booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scheduler_id: data.id,
                    workspace_id: data.workspace_id,
                    booker_name: finalInfo.name || 'Guest',
                    booker_email: finalInfo.email || 'no-email@provided.com',
                    booker_phone: finalInfo.phone || '',
                    booked_date: selDate,
                    booked_time: selTime,
                    timezone: clientTimezone,
                    duration_minutes: duration,
                    scheduler_title: liveData.title,
                    custom_fields: formValues, // Send custom fields
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                const msg = err.error || 'Failed to book';
                appToast.error('Booking Failed', msg);
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

    const isBlockDark = isColorDark(design.blockBackgroundColor || '#fff');

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
                "flex flex-col items-center justify-center min-h-screen py-12 px-4"
            )}>
                <div
                    className="w-full max-w-[680px] overflow-hidden shadow-2xl transition-all duration-300"
                    style={{
                        backgroundColor: design.blockBackgroundColor || (isDark ? '#111' : '#fff'),
                        boxShadow: design.blockShadow || '0 10px 40px -10px rgba(0,0,0,0.15)',
                        fontFamily: design.fontFamily || 'Inter',
                        borderRadius: `${design.borderRadius ?? 16}px`,
                    }}
                >
                    {/* Card header */}
                    {step !== 'confirmation' && (
                        <div className="px-5 md:px-8 pt-8 pb-5 border-b"
                            style={{ borderColor: isBlockDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}>
                        <div className={cn(
                            "mb-4",
                            (step === 'scheduler' && meta.logoUrl) ? "flex items-center justify-between" : "flex flex-col items-center text-center"
                        )}>
                            {step === 'scheduler' && meta.logoUrl ? (
                                <>
                                    <img src={meta.logoUrl} alt="Logo" 
                                        className="object-contain" 
                                        style={{ height: `${design.logoSize || 40}px` }} />
                                    <div className="text-right">
                                        <div className="font-bold text-[14px] opacity-60" style={{ color: isBlockDark ? '#aaa' : '#666' }}>
                                            {meta.organizer || liveData.title || 'Scheduler Name'}
                                        </div>
                                        <h1 className="text-[28px] font-black tracking-tight leading-tight" style={{ color: isBlockDark ? '#fff' : '#111' }}>
                                            Book a time
                                        </h1>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-1">
                                    <div className="font-bold text-[14px] opacity-60" style={{ color: isBlockDark ? '#aaa' : '#666' }}>
                                        {meta.organizer || liveData.title || 'Scheduler Name'}
                                    </div>
                                    <h1 className="text-[32px] font-black tracking-tight leading-tight" style={{ color: isBlockDark ? '#fff' : '#111' }}>
                                        {step === 'scheduler' ? 'Book a time' : step === 'form' ? 'Confirm Details' : 'Confirmed'}
                                    </h1>
                                    {step === 'form' && selDate && (
                                        <div className="text-[12px] opacity-50 font-medium" style={{ color: isBlockDark ? '#aaa' : '#777' }}>
                                            {DateTime.fromISO(selDate, { zone: clientTimezone }).toFormat('cccc, MMMM d')} at {selTime} ({duration}m)
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Duration selector — only on scheduler step */}
                        {step === 'scheduler' && (
                        <div className="flex flex-wrap justify-center gap-2 mt-8">
                            {(meta.durations && meta.durations.length > 0 ? meta.durations : [30, 60]).map((d: number) => (
                                <button key={d}
                                    onClick={() => setDuration(d)}
                                    className={cn(
                                        "flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold transition-all shadow-sm",
                                        duration === d ? "scale-105" : "opacity-40 grayscale hover:opacity-100 hover:grayscale-0"
                                    )}
                                    style={{
                                        background: design.primaryColor || '#4dbf39',
                                        color: isColorDark(design.primaryColor || '#4dbf39') ? '#fff' : '#000'
                                    }}>
                                    <Clock size={10} />
                                    {d >= 60 ? `${d / 60} hr` : `${d} min`}
                                </button>
                            ))}
                        </div>
                        )}
                    </div>
                    )}

                    {/* Canvas step content */}
                    <div className="p-5 md:p-8">
                        {step === 'scheduler' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6 animate-in fade-in duration-300">
                                    <CalendarPreview
                                        isDark={isBlockDark}
                                        primaryColor={design.primaryColor || '#4dbf39'}
                                        selDate={selDate}
                                        meta={meta}
                                        workspaceTimezone={workspaceTimezone}
                                        workspaceWeekStartDay={workspaceWeekStartDay}
                                        clientTimezone={clientTimezone}
                                        onDateSelect={(d) => { setSelDate(d); setSelTime(null); }}
                                    />
                                    <div>
                                        <div className="text-[10.5px] font-bold uppercase tracking-wider mb-3 opacity-40" style={{ color: isBlockDark ? '#fff' : '#000' }}>
                                            {selDate
                                                ? DateTime.fromISO(selDate, { zone: clientTimezone }).toFormat('cccc, MMMM d')
                                                : 'Select a date'
                                            }
                                        </div>
                                    {!selDate ? (
                                        <div className="text-[11px] opacity-40 italic" style={{ color: isBlockDark ? '#aaa' : '#888' }}>Choose a date to see available times</div>
                                    ) : (
                                        <div className="space-y-1.5 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
                                            {availableSlots.length > 0 ? (
                                                availableSlots.map(t => (
                                                    <button key={t}
                                                        onClick={() => setSelTime(t)}
                                                        className="w-full py-2 rounded-lg text-[12px] font-semibold border text-center transition-all"
                                                        style={selTime === t
                                                            ? { background: design.primaryColor || '#4dbf39', color: isColorDark(design.primaryColor || '#4dbf39') ? '#fff' : '#000', borderColor: 'transparent', borderRadius: `${Math.max(0, (design.borderRadius ?? 16) - 8)}px` }
                                                            : { borderColor: isBlockDark ? '#333' : '#e5e5e5', color: isBlockDark ? '#aaa' : '#888', borderRadius: `${Math.max(0, (design.borderRadius ?? 16) - 8)}px` }
                                                        }>
                                                        {t}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="text-[11px] opacity-40 italic text-center py-4" style={{ color: isBlockDark ? '#aaa' : '#888' }}>
                                                    No slots available for this day
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {selDate && selTime && (
                                <div className="mt-8 flex justify-center animate-in fade-in slide-in-from-top-2">
                                    <button
                                        onClick={async () => {
                                            if (!meta.fields || meta.fields.length === 0) {
                                                await handleConfirmBooking({ name: 'Guest', email: 'no-email@provided.com' });
                                            } else {
                                                setStep('form');
                                            }
                                        }}
                                        className="px-10 py-3 rounded-xl font-bold text-[15px] transition-all hover:brightness-110 active:scale-[0.98] shadow-lg"
                                        style={{
                                            background: design.primaryColor || '#4dbf39',
                                            color: isColorDark(design.primaryColor || '#4dbf39') ? '#fff' : '#000'
                                        }}
                                    >
                                        {(!meta.fields || meta.fields.length === 0) ? 'Schedule Meeting' : 'Next Step'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                        {step === 'form' && (
                            <div className="max-w-[460px] mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4">

                                
                                <div className="space-y-2">


                                    {/* Render custom fields if any */}
                                    {meta.fields && meta.fields.length > 0 && (
                                        <div className="pt-1.5 space-y-2">
                                            {meta.fields.map((field: any) => (
                                                <FieldPreview 
                                                    key={field.id}
                                                    field={field}
                                                    isDark={isBlockDark}
                                                    primaryColor={primaryColor}
                                                    borderRadius={design.borderRadius ?? 16}
                                                    value={formValues[field.id]}
                                                    onChange={(val) => {
                                                        setFormValues(prev => ({ ...prev, [field.id]: val }));
                                                        // Sync custom contact info fields to the primary info state
                                                        if (field.type === 'full_name') setInfo(prev => ({ ...prev, name: val }));
                                                        if (field.type === 'email') setInfo(prev => ({ ...prev, email: val }));
                                                        if (field.type === 'phone') setInfo(prev => ({ ...prev, phone: val }));
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={() => setStep('scheduler')}
                                        className={cn(
                                            "flex-1 py-3.5 rounded-xl font-bold text-[14px] border transition-all",
                                            isBlockDark ? "border-white/10 text-[#eee] hover:bg-white/5" : "border-black/10 text-[#111] hover:bg-black/5"
                                        )}
                                        style={{ borderRadius: `${Math.max(0, (design.borderRadius ?? 16) - 4)}px` }}
                                    >
                                        Back
                                    </button>
                                    <button 
                                        onClick={() => handleConfirmBooking()}
                                        disabled={isSubmitting || !isFormValid()}
                                        className="flex-[2] py-3.5 rounded-xl font-bold text-[14px] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                        style={{ background: primaryColor, color: isColorDark(primaryColor) ? '#fff' : '#000', borderRadius: `${Math.max(0, (design.borderRadius ?? 16) - 4)}px` }}
                                    >
                                        {isSubmitting ? <AppLoader size="xs" color={isColorDark(primaryColor) ? 'white' : 'black'} /> : 'Schedule Meeting'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 'confirmation' && (
                            <div className="flex flex-col items-center text-center py-8 gap-6 animate-in zoom-in-95 duration-500">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white"
                                    style={{ background: primaryColor }}>
                                    <Check size={32} strokeWidth={3} style={{ color: isColorDark(primaryColor) ? '#fff' : '#000' }} />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-[28px] font-bold tracking-tight" style={{ color: isBlockDark ? '#fff' : '#111' }}>
                                        Booking Confirmed!
                                    </h2>
                                    <p className="text-[15px] opacity-70 max-w-[400px]" style={{ color: isBlockDark ? '#ccc' : '#444' }}>
                                        {meta.confirmationMessage || "Your booking is confirmed! We'll send a calendar invite shortly."}
                                    </p>
                                </div>
                                <div className={cn(
                                    "mt-4 p-6 rounded-2xl border space-y-3 w-full max-w-[360px]",
                                    isBlockDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5"
                                )}
                                    style={{ borderRadius: `${design.borderRadius ?? 16}px` }}>
                                    <div className="flex items-center gap-3">
                                        <CalendarIcon size={16} className="opacity-50" />
                                        <span className="text-[14px] font-medium" style={{ color: isBlockDark ? '#eee' : '#111' }}>
                                            {selDate && DateTime.fromISO(selDate, { zone: clientTimezone }).toFormat('cccc, MMMM d')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Clock size={16} className="opacity-50" />
                                        <span className="text-[14px] font-medium" style={{ color: isBlockDark ? '#eee' : '#111' }}>
                                            {selTime} ({duration} min)
                                        </span>
                                    </div>
                                    {meta.location && (
                                        <div className="flex items-center gap-3">
                                            <MapPin size={16} className="opacity-50" />
                                            <span className="text-[14px] font-medium" style={{ color: isBlockDark ? '#eee' : '#111' }}>
                                                {meta.location}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => window.location.reload()}
                                    className="text-[13px] font-bold opacity-40 hover:opacity-100 transition-opacity mt-4"
                                    style={{ color: isBlockDark ? '#fff' : '#111' }}
                                >
                                    Book another session
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main PreviewClient
// ─────────────────────────────────────────────────────────────────────────────
export default function PreviewClient({ type, data }: { type: 'proposal' | 'invoice' | 'project' | 'form' | 'scheduler' | 'forms' | 'schedulers', data: any }) {
    const [liveData, setLiveData] = useState(data);
    const searchParams = useSearchParams();
    const isPrinting = searchParams.get('print') === '1';

    // useRef persists across React Strict Mode double-mounts (unlike useState)
    const viewHasBeenTracked = useRef(false);

    // Modals
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationName, setCelebrationName] = useState('');
    const celebrationRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => setIsMobileViewport(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load the document's chosen Google Font so public pages match the editor.
    // Always load Inter as the default fallback — it's not a system font on
    // Windows or Android, so it must be fetched from Google Fonts explicitly.
    useEffect(() => {
        const family = liveData?.meta?.design?.fontFamily || 'Inter';
        loadGoogleFont(family);
        // Always ensure Inter is available as a base fallback
        if (family !== 'Inter') loadGoogleFont('Inter');
    }, [liveData?.meta?.design?.fontFamily]);
    
    // Project specific state
    const [projectTasks, setProjectTasks] = useState<any[]>(data.projectTasks || []);
    const [projectGroups, setProjectGroups] = useState<any[]>(data.projectGroups || []);
    const [isProjectLoading, setIsProjectLoading] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);

    // Track view ONCE per page load
    useEffect(() => {
        if (viewHasBeenTracked.current || isPrinting) return;
        viewHasBeenTracked.current = true;

        fetch('/api/track-view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type,
                id: data.id,
                workspace_id: data.workspace_id,
                title: data.title || data.meta?.projectName || data.client_name,
                userAgent: navigator.userAgent
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
                        setProjectTasks(prev => prev.map(t => t.id === (payload.new as any).id ? { ...t, ...(payload.new as any) } : t));
                    } else if (payload.eventType === 'DELETE') {
                        setProjectTasks(prev => prev.filter(t => t.id !== (payload.old as any).id));
                    }
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'project_task_groups', filter: `project_id=eq.${data.id}` }, (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setProjectGroups(prev => [...prev.filter(g => g.id !== (payload.new as any).id), payload.new]);
                    } else if (payload.eventType === 'UPDATE') {
                        setProjectGroups(prev => prev.map(g => g.id === (payload.new as any).id ? { ...g, ...(payload.new as any) } : g));
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
    
    const handleDownload = async () => {
        const docTitle = liveData.title || liveData.meta?.invoiceNumber || liveData.meta?.projectName || 'Document';
        const fileName = `${docTitle}-${data.id.substring(0, 8)}.pdf`;
        
        appToast.promise(
            (async () => {
                const response = await fetch(`/api/download-pdf?type=${type}&id=${data.id}`);
                if (!response.ok) throw new Error('Failed to generate PDF');
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })(),
            {
                loading: 'Generating your PDF...',
                success: 'PDF downloaded successfully!',
                error: 'Could not generate PDF. Please try again.'
            }
        );
    };

    const handleUpdateStatus = async (status: string, signatureData?: any) => {
        if (isUpdating) return;

        // If accepting a proposal, trigger the full-screen celebration immediately
        if (status === 'Accepted') {
            setCelebrationName(signatureData?.name ? signatureData.name.split(' ')[0] : 'there');
            setShowCelebration(true);
            setTimeout(() => {
                if (celebrationRef.current) launchFullScreenConfetti(celebrationRef.current);
            }, 50);
        }

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
            proposalNumber:  liveData.proposal_number || liveData.meta?.proposalNumber || '',
        };

        const signatureBlock = (liveData.blocks || []).find((b: any) => b.type === 'signature' && b.signed);
        const signedBy = signatureBlock ? (signatureBlock.signerName || 'Client') : undefined;
        const signedAt = signatureBlock && liveData.updated_at
            ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(new Date(liveData.updated_at))
            : undefined;

        return (
            <div
                className="flex-1 overflow-auto relative w-full h-screen preview-scroll-container"
                style={{
                    backgroundColor:   meta.design?.backgroundColor  || (isDark ? '#080808' : '#f7f7f7'),
                    backgroundImage:   getBackgroundImageWithOpacity(meta.design?.backgroundImage, meta.design?.backgroundColor || (isDark ? '#080808' : '#f7f7f7'), meta.design?.backgroundImageOpacity),
                    backgroundSize:    'cover',
                    backgroundPosition:'center',
                    backgroundAttachment: 'fixed',
                }}
            >
                <div className="z-30 flex justify-center sticky top-0 transition-all w-full pt-1 md:pt-3 pb-0 pointer-events-none no-print">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className={cn(
                            "absolute inset-0 pointer-events-none",
                            meta.design?.topBlurTheme === 'dark'
                                ? "bg-gradient-to-b from-black/80 to-transparent" 
                                : "bg-gradient-to-b from-white/80 to-transparent"
                        )} />
                    </div>
                    <div className="relative z-10 w-full pointer-events-auto px-4 md:px-0">
                        <ClientActionBar
                            type="proposal"
                            status={meta.status as any}
                            design={meta.design}
                            signedBy={signedBy}
                            signedAt={signedAt}
                            inline={true}
                            onDownloadPDF={handleDownload}
                            onPrint={() => window.print()}
                            onAccept={() => setIsSignModalOpen(true)}
                            onDecline={() => setIsDeclineModalOpen(true)}
                            className="w-full max-w-[850px] mx-auto md:px-6"
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

                <DeleteConfirmModal
                    open={isDeclineModalOpen}
                    onClose={() => setIsDeclineModalOpen(false)}
                    onConfirm={() => handleUpdateStatus('Declined')}
                    title="Decline Proposal"
                    description="Are you sure you want to decline this proposal? This action cannot be undone."
                    actionLabel="Decline Proposal"
                    isDark={false}
                />

                {/* 🎉 Full-screen celebration overlay */}
                {showCelebration && (
                    <div
                        className="fixed inset-0 overflow-hidden flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-700"
                        style={{ zIndex: 99998 }}
                        aria-hidden="true"
                    >
                        <div ref={celebrationRef} className="absolute inset-0 pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col items-center justify-center animate-in zoom-in-[0.98] fade-in duration-1000 delay-150 px-6 text-center w-full max-w-lg mx-auto">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-6 md:mb-8 shadow-[0_0_30px_rgba(212,175,55,0.15)] ring-1 ring-[#D4AF37]/30 backdrop-blur-sm">
                                <Check className="text-[#D4AF37] w-8 h-8 md:w-10 md:h-10" strokeWidth={1.5} />
                            </div>

                            <h2 
                                className="text-3xl md:text-5xl lg:text-5xl text-white font-bold tracking-[0.08em] uppercase mb-4 leading-tight text-center"
                                style={{
                                    textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                    fontFamily: 'var(--font-inter), system-ui, sans-serif'
                                }}
                            >
                                Proposal Signed
                            </h2>
                            <h3 
                                className="text-lg md:text-2xl text-[#D4AF37] tracking-[0.2em] font-medium uppercase mb-12"
                                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.4)', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
                            >
                                Thank You, {celebrationName}
                            </h3>
                            
                            <button
                                onClick={() => setShowCelebration(false)}
                                className="group relative px-12 py-3.5 md:py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs md:text-sm tracking-[0.15em] uppercase font-bold rounded-full overflow-hidden transition-all duration-300 hover:bg-white hover:text-black hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}
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
            invoiceNumber: liveData.invoice_number || liveData.meta?.invoiceNumber || '',
        };

        const paidBy = invoiceMeta.clientName || 'Client';
        const paidAt = liveData.updated_at
            ? new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }).format(new Date(liveData.updated_at))
            : undefined;

        return (
            <div
                className="flex-1 overflow-auto relative w-full h-screen preview-scroll-container"
                style={{
                    backgroundColor:   invoiceMeta.design?.backgroundColor  || (isDark ? '#080808' : '#f7f7f7'),
                    backgroundImage:   getBackgroundImageWithOpacity(invoiceMeta.design?.backgroundImage, invoiceMeta.design?.backgroundColor || (isDark ? '#080808' : '#f7f7f7'), invoiceMeta.design?.backgroundImageOpacity),
                    backgroundSize:    'cover',
                    backgroundPosition:'center',
                    backgroundAttachment: 'fixed',
                }}
            >
                <div className="z-30 flex justify-center sticky top-0 transition-all w-full pt-1 md:pt-3 pb-0 pointer-events-none no-print">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className={cn(
                            "absolute inset-0 pointer-events-none",
                            invoiceMeta.design?.topBlurTheme === 'dark'
                                ? "bg-gradient-to-b from-black/80 to-transparent" 
                                : "bg-gradient-to-b from-white/80 to-transparent"
                        )} />
                    </div>
                    <div className="relative z-10 w-full pointer-events-auto px-4 md:px-0">
                        <ClientActionBar
                            type="invoice"
                            status={invoiceMeta.status as any}
                            amountDue={new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceMeta.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(totals.total)}
                            paidAt={paidAt}
                            paidBy={paidBy}
                            design={invoiceMeta.design}
                            inline={true}
                            onDownloadPDF={handleDownload}
                            onPrint={() => window.print()}
                            onPay={() => setIsBankModalOpen(true)}
                            className="w-full max-w-[850px] mx-auto md:px-6"
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
                        {(() => {
                            const status = liveData.status || 'Planning';
                            const statusConfigs: Record<string, { badge: string; text: string }> = {
                                Planning:  { badge: 'bg-indigo-50 border-indigo-100', text: 'text-indigo-600' },
                                Active:    { badge: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-600' },
                                'On Hold': { badge: 'bg-amber-50 border-amber-100', text: 'text-amber-600' },
                                Completed: { badge: 'bg-violet-50 border-violet-100', text: 'text-violet-600' },
                                Cancelled: { badge: 'bg-gray-50 border-gray-100', text: 'text-gray-500' },
                            };
                            const cfg = statusConfigs[status] || { badge: 'bg-[#f5f5f5] border-black/[0.03]', text: 'text-[#ccc]' };

                            return (
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-colors",
                                    cfg.badge,
                                    cfg.text
                                )}>
                                    {status}
                                </span>
                            );
                        })()}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 bg-[#f7f7f7]">
                    {isProjectLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <AppLoader size="md" color={projectColor} />
                        </div>
                    ) : (
                        <KanbanBoard
                            projectId={data.id}
                            projectColor={projectColor}
                            isDark={false}
                            searchQuery=""
                            showArchived={false}
                            onTaskClick={(task) => setSelectedTask(task)}
                            isPreview={true}
                            externalTasks={projectTasks}
                            externalGroups={projectGroups}
                        />
                    )}
                </div>

                <AnimatePresence>
                    {selectedTask && (
                        <TaskDetailPanel
                            task={selectedTask as any}
                            projectId={data.id}
                            projectName={liveData.name || liveData.title}
                            isDark={false}
                            readOnly={true}
                            onClose={() => setSelectedTask(null)}
                        />
                    )}
                </AnimatePresence>
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
