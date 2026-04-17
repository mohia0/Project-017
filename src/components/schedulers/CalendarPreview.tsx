"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { DateTime } from 'luxon';

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

function timeTo24H(time12h: string) {
    const parts = (time12h || '').trim().split(/\s+/);
    if (parts.length < 2) return '00:00:00';
    const [time, period] = parts;
    let [hStr, mStr] = time.split(':');
    let h = parseInt(hStr, 10);
    if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (period.toUpperCase() === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(mStr).padStart(2, '0')}:00`;
}

export const getAvailableSlots = (
    viewDateStr: string | null, // 'YYYY-MM-DD'
    durations: number[],
    availability: any,
    existingBookings: any[] = [],
    workspaceTimezone: string = 'UTC',
    clientTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
) => {
    if (!viewDateStr) return [];
    
    const clientDayStart = DateTime.fromISO(viewDateStr, { zone: clientTimezone }).startOf('day');
    const clientDayEnd = clientDayStart.endOf('day');

    const wsCheckStart = clientDayStart.setZone(workspaceTimezone);
    const wsCheckEnd = clientDayEnd.setZone(workspaceTimezone);
    
    // Determine the unique dates in the workspace timezone that span this window
    const wsDatesToCheck = [wsCheckStart.toISODate(), wsCheckEnd.toISODate()].filter((v, i, a) => a.indexOf(v) === i);

    const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const duration = durations[0] || 30;
    
    let rawWorkspaceSlots: DateTime[] = [];
    
    for (const wsDateStr of wsDatesToCheck) {
        if (!wsDateStr) continue;
        const d = DateTime.fromISO(wsDateStr, { zone: workspaceTimezone });
        const luxonWeekdayToOurIndex = d.weekday === 7 ? 0 : d.weekday;
        const dayName = WEEKDAYS[luxonWeekdayToOurIndex];

        const config = (availability || {})[dayName] || { active: true, start: '9:00 AM', end: '5:00 PM' };
        if (!config.active) continue;

        const startMins = timeToMinutes(config.start);
        const endMins = timeToMinutes(config.end);

        const stepInterval = Math.min(30, duration);

        for (let m = startMins; m + duration <= endMins; m += stepInterval) {
            const h = Math.floor(m / 60);
            const mn = m % 60;
            const slotTime = d.set({ hour: h, minute: mn, second: 0, millisecond: 0 });
            rawWorkspaceSlots.push(slotTime);
        }
    }

    const now = DateTime.now();

    const validSlots = rawWorkspaceSlots.filter(wsSlot => {
        const clientSlot = wsSlot.setZone(clientTimezone);
        if (clientSlot.toISODate() !== viewDateStr) return false;
        if (wsSlot < now) return false; // In the past?

        const slotStartUnix = wsSlot.toMillis();
        const slotEndUnix = slotStartUnix + duration * 60000;
        
        for (const b of existingBookings) {
            if (b.status === 'cancelled') continue;
            
            const rawTime = b.booked_time;
            const bDateTimeStr = `${b.booked_date}T${timeTo24H(rawTime)}`;
            const bStart = DateTime.fromISO(bDateTimeStr, { zone: b.timezone });
            if (!bStart.isValid) continue;

            const bStartUnix = bStart.toMillis();
            const bEndUnix = bStartUnix + (b.duration_minutes || 30) * 60000;

            if (Math.max(slotStartUnix, bStartUnix) < Math.min(slotEndUnix, bEndUnix)) {
                return false;
            }
        }
        return true;
    });

    return validSlots.map(slot => {
        const clientSlot = slot.setZone(clientTimezone);
        // Match the previous h:mm AM format
        return clientSlot.toFormat('h:mm a').replace(' ', ' '); // toFormat sometimes includes a narrow no-break space
    });
};

/* ══════════════════════════════════════════════════════════
   CALENDAR COMPONENT
══════════════════════════════════════════════════════════ */
export interface CalendarPreviewProps {
    isDark: boolean;
    primaryColor: string;
    onDateSelect?: (d: string | null) => void;
    selDate?: string | null;
    meta?: any;
    currentMonthDate?: Date;
    workspaceTimezone?: string;
    clientTimezone?: string;
}

export function CalendarPreview({ 
    isDark, primaryColor, onDateSelect, selDate: externalSelDate, meta, currentMonthDate,
    workspaceTimezone = 'UTC',
    clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
}: CalendarPreviewProps) {
    
    const [internalSelDate, setInternalSelDate] = useState<string | null>(null);
    const [viewDate, setViewDate] = useState(currentMonthDate || new Date());
    
    // We render the calendar based on the client's current viewing month
    const activeDateStr = onDateSelect !== undefined ? externalSelDate : internalSelDate;

    // We use standard JS date for the grid layout, representing the "local" month view
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    while (cells.length % 7 !== 0) cells.push(null);

    const handleClick = (dStr: string, isPast: boolean, isDisabled: boolean) => {
        if (isPast || isDisabled) return;
        if (onDateSelect) onDateSelect(dStr);
        else setInternalSelDate(dStr);
    };

    const changeMonth = (delta: number) => {
        const next = new Date(year, month + delta, 1);
        setViewDate(next);
    };

    const todayStr = DateTime.now().setZone(clientTimezone).toISODate();

    const activeDaysMap = React.useMemo(() => {
        const map: Record<string, boolean> = {};
        const todayStart = DateTime.now().setZone(clientTimezone).startOf('day');
        
        for (const d of cells) {
            if (!d) continue;
            const cellDateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const luxonCell = DateTime.fromISO(cellDateStr, { zone: clientTimezone });
            
            if (luxonCell.startOf('day') < todayStart) {
                map[cellDateStr] = false;
                continue;
            }
            
            const daySlots = getAvailableSlots(cellDateStr, meta?.durations || [30], meta?.availability || {}, [], workspaceTimezone, clientTimezone);
            map[cellDateStr] = daySlots.length > 0;
        }
        return map;
    }, [month, year, clientTimezone, workspaceTimezone, JSON.stringify(meta?.durations), JSON.stringify(meta?.availability), cells.join(',')]);

    return (
        <div className={cn("rounded-xl overflow-hidden", isDark ? "bg-[#111]" : "bg-white")}>
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <span className={cn("font-bold text-[14px]", isDark ? "text-white" : "text-[#111]")}>
                    {MONTHS[month]} {year}
                </span>
                <div className="flex gap-1">
                    <button 
                        onClick={() => changeMonth(-1)}
                        className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[14px] transition-colors",
                            isDark ? "text-[#555] hover:text-white hover:bg-white/5" : "text-[#bbb] hover:text-[#111] hover:bg-[#f5f5f5]")}>←</button>
                    <button 
                        onClick={() => changeMonth(1)}
                        className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[14px] transition-colors",
                            isDark ? "text-[#555] hover:text-white hover:bg-white/5" : "text-[#bbb] hover:text-[#111] hover:bg-[#f5f5f5]")}>→</button>
                </div>
            </div>
            <div className="grid grid-cols-7 px-4">
                {DAYS.map((d, i) => (
                    <div key={i} className={cn("text-center text-[10px] font-bold py-1.5", isDark ? "text-[#444]" : "text-[#ccc]")}>{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5 px-4 pb-4">
                {cells.map((d, i) => {
                    if (!d) return <div key={i} />;
                    // Construct string representing this day in the currently viewed month
                    const cellDateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const luxonCell = DateTime.fromISO(cellDateStr, { zone: clientTimezone });
                    
                    const isPast = luxonCell.startOf('day') < DateTime.now().setZone(clientTimezone).startOf('day');
                    
                    // Use the memoized check
                    const isActive = activeDaysMap[cellDateStr] || false;
                    
                    const isDisabled = isPast || !isActive;
                    const isSel = cellDateStr === activeDateStr;
                    const isToday = cellDateStr === todayStr;

                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handleClick(cellDateStr, isPast, isDisabled)}
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
