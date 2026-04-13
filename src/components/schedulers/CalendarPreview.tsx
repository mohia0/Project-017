"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
export const timeToMinutes = (timeStr: string) => {
    const parts = (timeStr || '').trim().split(/\s+/);
    if (parts.length < 2) return 0;
    const [time, period] = parts;
    if (!time) return 0;
    let [hStr, mStr] = time.split(':');
    let h = parseInt(hStr, 10);
    let m = parseInt(mStr || '0', 10);
    if (period && period.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (period && period.toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + m;
};

export const getAvailableSlots = (date: number | null, durations: number[], availability: any, existingBookings: any[] = []) => {
    if (!date) return [];
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth(), date);
    const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStr = WEEKDAYS[d.getDay()];
    const config = (availability || {})[dayStr] || { active: true, start: '9:00 AM', end: '5:00 PM' };
    
    if (!config.active) return [];
    
    const startMins = timeToMinutes(config.start);
    const endMins = timeToMinutes(config.end);
    const duration = durations[0] || 30;

    const allSlots: string[] = [];
    for (let m = startMins; m + duration <= endMins; m += duration) {
        const h = Math.floor(m / 60);
        const mn = m % 60;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 === 0 ? 12 : h % 12;
        allSlots.push(`${h12}:${String(mn).padStart(2, '0')} ${ampm}`);
    }

    // Filter by existing bookings
    if (existingBookings && existingBookings.length > 0) {
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const dayBookings = existingBookings.filter((b: any) => b.booked_date === dateStr);
        
        return allSlots.filter(slot => {
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

    return allSlots;
};

/* ══════════════════════════════════════════════════════════
   CALENDAR COMPONENT
══════════════════════════════════════════════════════════ */
export interface CalendarPreviewProps {
    isDark: boolean;
    primaryColor: string;
    onDateSelect?: (d: number | null) => void;
    selDate?: number | null;
    meta?: any;
    currentMonthDate?: Date;
}

export function CalendarPreview({ isDark, primaryColor, onDateSelect, selDate: externalSelDate, meta, currentMonthDate }: CalendarPreviewProps) {
    const today = new Date();
    const [internalSelDate, setInternalSelDate] = useState<number | null>(null);
    const [viewDate, setViewDate] = useState(currentMonthDate || new Date());

    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Fill to 6 rows
    while (cells.length % 7 !== 0) cells.push(null);

    const activeDate = onDateSelect !== undefined ? externalSelDate : internalSelDate;
    
    const handleClick = (d: number, isPast: boolean, isDisabled: boolean) => {
        if (isPast || isDisabled) return;
        if (onDateSelect) onDateSelect(d);
        else setInternalSelDate(d);
    };

    const changeMonth = (delta: number) => {
        const next = new Date(year, month + delta, 1);
        setViewDate(next);
    };

    return (
        <div className={cn("rounded-xl overflow-hidden", isDark ? "bg-[#111]" : "bg-white")}>
            {/* Month header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <span className={cn("font-bold text-[14px]", isDark ? "text-white" : "text-[#111]")}>
                    {MONTHS[month]} {year}
                </span>
                <div className="flex gap-1">
                    <button 
                        onClick={() => changeMonth(-1)}
                        className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center text-[14px] transition-colors",
                            isDark ? "text-[#555] hover:text-white hover:bg-white/5" : "text-[#bbb] hover:text-[#111] hover:bg-[#f5f5f5]"
                        )}>←</button>
                    <button 
                        onClick={() => changeMonth(1)}
                        className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center text-[14px] transition-colors",
                            isDark ? "text-[#555] hover:text-white hover:bg-white/5" : "text-[#bbb] hover:text-[#111] hover:bg-[#f5f5f5]"
                        )}>→</button>
                </div>
            </div>
            {/* Week headers */}
            <div className="grid grid-cols-7 px-4">
                {DAYS.map((d, i) => (
                    <div key={i} className={cn("text-center text-[10px] font-bold py-1.5",
                        isDark ? "text-[#444]" : "text-[#ccc]")}>{d}</div>
                ))}
            </div>
            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0.5 px-4 pb-4">
                {cells.map((d, i) => {
                    if (!d) return <div key={i} />;
                    const date = new Date(year, month, d);
                    
                    // Is today or future?
                    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    
                    const dayStr = WEEKDAYS[date.getDay()];
                    const availability = (meta?.availability) || {};
                    const defaultAvail: Record<string, boolean> = { Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true, Saturday: false, Sunday: false };
                    const isActive = availability[dayStr] ? availability[dayStr].active : (defaultAvail[dayStr] ?? true);
                    const isDisabled = isPast || !isActive;

                    const isSel = d === activeDate && month === viewDate.getMonth() && year === viewDate.getFullYear();
                    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handleClick(d, isPast, isDisabled)}
                            disabled={isDisabled}
                            className={cn(
                                "aspect-square flex items-center justify-center text-[11.5px] font-medium rounded-lg transition-all",
                                isDisabled ? "opacity-20 cursor-not-allowed" : "cursor-pointer",
                                isSel
                                    ? "text-black font-bold"
                                    : isToday
                                        ? (isDark ? "text-white bg-white/10" : "text-[#111] bg-[#f0f0f0]")
                                        : (isDark ? "text-[#aaa] hover:bg-white/8 hover:text-white" : "text-[#333] hover:bg-[#f5f5f5]")
                            )}
                            style={isSel ? { background: primaryColor } : undefined}
                        >
                            {d}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
