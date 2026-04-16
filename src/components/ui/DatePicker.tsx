"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, getDay, isSameDay, parseISO, setMonth, setYear } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

interface DatePickerProps {
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    isDark?: boolean;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    align?: 'left' | 'right' | 'center';
    style?: React.CSSProperties;
}

export default function DatePicker({ value, onChange, isDark: forcedIsDark, placeholder = "Select date", className, disabled, align = "left", style }: DatePickerProps) {
    const { theme } = useUIStore();
    const isDark = forcedIsDark !== undefined ? forcedIsDark : theme === 'dark';
    
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);

    const [showMonthList, setShowMonthList] = useState(false);
    const [showYearList, setShowYearList] = useState(false);

    // Provide a valid default date so we don't break if `value` is empty
    const initialDate = value || typeof window !== 'undefined' ? (value ? parseISO(value) : new Date()) : new Date();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(initialDate));

    const updateRect = () => {
        if (containerRef.current) {
            setRect(containerRef.current.getBoundingClientRect());
        }
    };

    // Handle clicks outside to close
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const isOutsideContainer = containerRef.current && !containerRef.current.contains(e.target as Node);
            const isOutsidePopover = popoverRef.current && !popoverRef.current.contains(e.target as Node);
            if (isOutsideContainer && isOutsidePopover) {
                setIsOpen(false);
                setShowMonthList(false);
                setShowYearList(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handler);
            window.addEventListener('resize', updateRect);
            window.addEventListener('scroll', updateRect, true);
        }
        return () => {
            document.removeEventListener('mousedown', handler);
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
        };
    }, [isOpen]);

    // When value changes externally (e.g. initial load), update month view
    useEffect(() => {
        if (value) {
            setCurrentMonth(startOfMonth(parseISO(value)));
        }
    }, [value]);

    const handlePreviousMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentMonth(subMonths(currentMonth, 1));
        setShowMonthList(false);
        setShowYearList(false);
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentMonth(addMonths(currentMonth, 1));
        setShowMonthList(false);
        setShowYearList(false);
    };

    const emitDate = (date: Date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        onChange(`${yyyy}-${mm}-${dd}`);
        setIsOpen(false);
        setShowMonthList(false);
        setShowYearList(false);
    };

    const handleSelectDate = (day: number) => {
        emitDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    };

    const handleSelectToday = () => {
        setCurrentMonth(startOfMonth(new Date()));
        emitDate(new Date());
    };

    const handleMonthSelect = (mIndex: number) => {
        setCurrentMonth(setMonth(currentMonth, mIndex));
        setShowMonthList(false);
    };

    const handleYearSelect = (y: number) => {
        setCurrentMonth(setYear(currentMonth, y));
        setShowYearList(false);
    };

    const daysInMonth = getDaysInMonth(currentMonth);
    const startDay = getDay(startOfMonth(currentMonth)); // 0 = Sunday
    
    const selectedDateObj = value ? parseISO(value) : null;

    const daysMatrix: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) {
        daysMatrix.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        daysMatrix.push(i);
    }

    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);
    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const popoverWidth = 240; // Smaller overall width
    
    // Calculate portal position
    let fixedTop = 0;
    let fixedLeft = 0;
    if (rect) {
        fixedTop = rect.bottom + 8; // 8px spacing
        if (align === 'right') {
            fixedLeft = rect.right - popoverWidth;
        } else if (align === 'center') {
            fixedLeft = rect.left + (rect.width / 2) - (popoverWidth / 2);
        } else {
            fixedLeft = rect.left;
        }
        
        // Prevent strictly going out of the viewport on the left/right
        if (typeof window !== 'undefined') {
            if (fixedLeft < 8) fixedLeft = 8;
            if (fixedLeft + popoverWidth > window.innerWidth - 8) {
                fixedLeft = window.innerWidth - popoverWidth - 8;
            }
            // Prevent going out bottom
            const estHeight = 300;
            if (fixedTop + estHeight > window.innerHeight) {
                // place it above
                fixedTop = rect.top - estHeight - 8;
            }
        }
    }

    return (
        <div className={cn("relative w-full", className)} ref={containerRef} style={style}>
            {/* Input Trigger */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (!disabled) {
                        updateRect();
                        setIsOpen(!isOpen);
                    }
                }}
                className={cn(
                    "w-full flex items-center justify-between text-left text-[11.5px] outline-none h-[22px]",
                    !value ? "text-[#bbb]" : (isDark ? "text-[#ccc]" : "text-[#111]"),
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <span className="truncate">{value ? format(parseISO(value), 'MMM dd, yyyy') : placeholder}</span>
            </button>

            {/* Popover Calendar (Rendered in Portal) */}
            {isOpen && typeof document !== 'undefined' && createPortal(
                <div 
                    ref={popoverRef}
                    style={{
                        position: 'fixed',
                        top: `${fixedTop}px`,
                        left: `${fixedLeft}px`,
                        width: `${popoverWidth}px`
                    }}
                    className={cn(
                        "z-[99999] p-3 rounded-xl shadow-2xl border animate-in fade-in zoom-in-95 duration-200",
                        isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                    )}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 relative">
                        <button
                            type="button"
                            onClick={handlePreviousMonth}
                            className={cn(
                                "shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                                isDark ? "hover:bg-white/10 text-white" : "hover:bg-black/5 text-[#111]"
                            )}
                        >
                            <ChevronLeft size={14} />
                        </button>
                        
                        <div className="flex items-center gap-2">
                            {/* Month Select */}
                            <div className="relative">
                                <button 
                                    className={cn(
                                        "text-[13px] font-bold cursor-pointer transition-colors px-1",
                                        isDark ? "text-white hover:text-[#ccc]" : "text-[#111] hover:text-[#555]"
                                    )}
                                    onClick={() => { setShowMonthList(!showMonthList); setShowYearList(false); }}
                                >
                                    {months[currentMonth.getMonth()]}
                                </button>
                                {showMonthList && (
                                    <div className={cn(
                                        "absolute top-full mt-1 -left-2 z-[1000] w-24 max-h-48 overflow-y-auto rounded-lg shadow-lg border py-1 scrollbar-hide",
                                        isDark ? "bg-[#252525] border-[#333]" : "bg-white border-[#e0e0e0]"
                                    )}>
                                        {months.map((m, i) => (
                                            <button
                                                key={m}
                                                onClick={() => handleMonthSelect(i)}
                                                className={cn(
                                                    "w-full text-left px-3 py-1.5 text-[12px] transition-colors",
                                                    currentMonth.getMonth() === i ? (isDark ? "bg-primary/20 text-primary" : "bg-primary/10 text-black font-semibold") : (isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]")
                                                )}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Year Select */}
                            <div className="relative">
                                <button 
                                    className={cn(
                                        "text-[13px] font-bold cursor-pointer transition-colors px-1",
                                        isDark ? "text-white hover:text-[#ccc]" : "text-[#111] hover:text-[#555]"
                                    )}
                                    onClick={() => { setShowYearList(!showYearList); setShowMonthList(false); }}
                                >
                                    {currentMonth.getFullYear()}
                                </button>
                                {showYearList && (
                                    <div className={cn(
                                        "absolute top-full mt-1 -left-2 z-[1000] w-20 max-h-48 overflow-y-auto rounded-lg shadow-lg border py-1 scrollbar-hide",
                                        isDark ? "bg-[#252525] border-[#333]" : "bg-white border-[#e0e0e0]"
                                    )}>
                                        {years.map(y => (
                                            <button
                                                key={y}
                                                onClick={() => handleYearSelect(y)}
                                                className={cn(
                                                    "w-full text-left px-3 py-1.5 text-[12px] transition-colors",
                                                    currentMonth.getFullYear() === y ? (isDark ? "bg-primary/20 text-primary" : "bg-primary/10 text-black font-semibold") : (isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]")
                                                )}
                                            >
                                                {y}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className={cn(
                                "shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                                isDark ? "hover:bg-white/10 text-white" : "hover:bg-black/5 text-[#111]"
                            )}
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* Days Header */}
                    <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                        {weekDays.map((wd) => (
                            <span key={wd} className={cn(
                                "text-[10px] font-bold uppercase",
                                isDark ? "text-[#555]" : "text-[#999]"
                            )}>
                                {wd}
                            </span>
                        ))}
                    </div>

                    {/* Matrix */}
                    <div className="grid grid-cols-7 gap-1 mb-3">
                        {daysMatrix.map((day, idx) => {
                            if (day === null) {
                                return <div key={`empty-${idx}`} />;
                            }
                            
                            const thisDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                            const isSelected = selectedDateObj && isSameDay(thisDate, selectedDateObj);
                            const isToday = isSameDay(thisDate, new Date());

                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleSelectDate(day)}
                                    className={cn(
                                        "w-7 h-7 mx-auto flex items-center justify-center rounded-full text-[12px] font-medium transition-all duration-150",
                                        isSelected 
                                            ? "bg-primary text-black shadow-[0_2px_8px_rgba(var(--brand-primary-rgb),0.4)]" 
                                            : isDark 
                                                ? "text-white hover:bg-[#333] hover:text-white" 
                                                : "text-[#333] hover:bg-[#f0f0f0]",
                                        (!isSelected && isToday) && (isDark ? "border border-[#444] text-[#ccc]" : "border border-[#ccc]")
                                    )}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className={cn("border-t pt-2 flex justify-center", isDark ? "border-[#2e2e2e]" : "border-[#e0e0e0]")}>
                        <button
                            type="button"
                            onClick={handleSelectToday}
                            className={cn(
                                "text-[11px] font-semibold px-4 py-1.5 rounded-full transition-colors",
                                isDark ? "bg-[#252525] text-white hover:bg-[#333]" : "bg-[#f5f5f5] text-[#333] hover:bg-[#e8e8e8]"
                            )}
                        >
                            Today
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
