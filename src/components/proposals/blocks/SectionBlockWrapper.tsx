"use client";

import React, { ReactNode, useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy, Palette, X, LayoutPanelTop, ChevronUp, ChevronDown, ArrowUpDown, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { ColorisInput } from '@/components/ui/ColorisInput';
import { Tooltip } from '@/components/ui/Tooltip';

interface SectionBlockWrapperProps {
    id: string;
    children: ReactNode;
    type: string;
    onDelete: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    isPreview?: boolean;
    isFirst?: boolean;
    isLast?: boolean;
    backgroundColor?: string;
    onBackgroundColorChange?: (color: string) => void;
    paddingTop?: number;
    paddingBottom?: number;
    globalMarginTop?: number;
    globalMarginBottom?: number;
    onPaddingTopChange?: (value: number | undefined) => void;
    onPaddingBottomChange?: (value: number | undefined) => void;
    onSaveAsTemplate?: (id: string) => void;
}

// A small inline colour palette
const SECTION_PALETTE = [
    { label: 'White (default)', value: '' },
    { label: 'Soft grey', value: '#f7f7f7' },
    { label: 'Warm sand', value: '#faf6f0' },
    { label: 'Sage',      value: '#f0f4f0' },
    { label: 'Sky',       value: '#f0f5fa' },
    { label: 'Lavender',  value: '#f5f0fa' },
    { label: 'Peach',     value: '#faf0f0' },
    { label: 'Mint',      value: '#f0faf4' },
    { label: 'Lemon',     value: '#fafaf0' },
    { label: 'Slate dark',value: '#1a1f2e' },
    { label: 'Charcoal',  value: '#1e1e1e' },
    { label: 'Ink',       value: '#111827' },
];

export function SectionBlockWrapper({
    id,
    children,
    type,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    isPreview = false,
    isFirst = false,
    isLast = false,
    backgroundColor,
    onBackgroundColorChange,
    paddingTop,
    paddingBottom,
    globalMarginTop = 0,
    globalMarginBottom = 0,
    onPaddingTopChange,
    onPaddingBottomChange,
    onSaveAsTemplate,
}: SectionBlockWrapperProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const [hovered, setHovered] = useState(false);
    const [showPalette, setShowPalette] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
    const deleteResetTimerRef = useRef<NodeJS.Timeout | null>(null);
    const paletteRef = useRef<HTMLDivElement>(null);
    const spacingRef = useRef<HTMLDivElement>(null);
    const [showSpacing, setShowSpacing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const handleMouseEnter = () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        if (deleteResetTimerRef.current) clearTimeout(deleteResetTimerRef.current);
        setHovered(true);
    };

    const handleMouseLeave = () => {
        hoverTimerRef.current = setTimeout(() => {
            if (!showPalette && !showSpacing) {
                setHovered(false);
                setIsConfirmingDelete(false);
            }
        }, 150); // Small delay to allow crossing the gap
    };

    const currentPaddingTop = paddingTop !== undefined ? paddingTop : globalMarginTop;
    const currentPaddingBottom = paddingBottom !== undefined ? paddingBottom : globalMarginBottom;

    // The section bg colour — all blocks use current document default (var(--document-bg)); only change when user picks a color
    const sectionBg = backgroundColor || 'var(--document-bg, #ffffff)';
    const hasBg = true; // always render the bg layer so white is explicit

    // Outer wrapper holds the DnD transform and top/bottom spacing
    const outerStyle: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
    };

    // Close palette/spacing on outside click
    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (showPalette && paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
                // Prevent closing if the click is inside the ColorisInput portal
                const portal = document.getElementById('color-picker-portal-content');
                if (portal && portal.contains(e.target as Node)) {
                    return;
                }
                setShowPalette(false);
                if (!showSpacing) setHovered(false);
            }
            if (showSpacing && spacingRef.current && !spacingRef.current.contains(e.target as Node)) {
                setShowSpacing(false);
                if (!showPalette) setHovered(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showPalette, showSpacing]);

    // The full-bleed background layer — extends horizontally beyond document padding (px-12 = 3rem = 48px)
    const bgLayerStyle: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        left: '-3rem',
        right: '-3rem',
        backgroundColor: sectionBg,
        pointerEvents: 'none',
        borderTopLeftRadius: isFirst ? 'var(--block-border-radius)' : undefined,
        borderTopRightRadius: isFirst ? 'var(--block-border-radius)' : undefined,
        borderBottomLeftRadius: isLast ? 'var(--block-border-radius)' : undefined,
        borderBottomRightRadius: isLast ? 'var(--block-border-radius)' : undefined,
    };

    if (isPreview) {
        return (
            <div
                style={{
                    paddingTop: currentPaddingTop,
                    paddingBottom: isLast ? `calc(${currentPaddingBottom}px + 7%)` : currentPaddingBottom,
                    position: 'relative',
                }}
            >
                {/* Full-bleed section background */}
                {hasBg && <div style={bgLayerStyle} />}
                <div style={{ position: 'relative' }}>{children}</div>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={outerStyle}
            className={cn('group overflow-visible', isDragging && 'opacity-40', isLast && "pb-[7%]")}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Full-bleed section background */}
            <div
                className={cn(
                    'transition-all duration-300',
                    hovered && !isPreview ? 'border-2 border-primary border-dashed' : 'border-2 border-transparent'
                )}
                style={{
                    position: 'absolute',
                    inset: 0,
                    left: '-3rem',
                    right: '-3rem',
                    backgroundColor: sectionBg,
                    pointerEvents: 'none',
                    borderTopLeftRadius: isFirst ? 'var(--block-border-radius)' : undefined,
                    borderTopRightRadius: isFirst ? 'var(--block-border-radius)' : undefined,
                    borderBottomLeftRadius: isLast ? 'var(--block-border-radius)' : undefined,
                    borderBottomRightRadius: isLast ? 'var(--block-border-radius)' : undefined,
                }}
            />

            {/* Spacing from CSS variable or block local setting */}
            <div
                style={{
                    paddingTop: currentPaddingTop,
                    paddingBottom: currentPaddingBottom,
                    position: 'relative',
                }}
            >
                {/* Floating action bar */}
                {hovered && (
                    <div
                        className={cn(
                            'absolute right-0 flex items-center gap-0.5 z-[9990]',
                            'rounded-lg border px-1.5 py-0.5 transition-all animate-in fade-in zoom-in-95 duration-200',
                            isDark
                                ? 'bg-[#1a1a1a] border-white/[0.1] text-[#999]'
                                : 'bg-white border-[#e2e2e2] text-[#888]',
                        )}
                        style={{ 
                            top: isFirst ? 'calc(100% + 7px)' : '-36px'
                        }}
                    >
                        {/* Move Up/Down buttons */}
                        <div className="flex items-center gap-0.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMoveUp?.();
                                    }}
                                    disabled={isFirst}
                                    className={cn(
                                        "px-1.5 py-1 rounded-md transition-all min-w-[28px] flex items-center justify-center",
                                        isFirst ? "opacity-20 cursor-not-allowed" : isDark ? "hover:bg-white/10 text-white/40 hover:text-white" : "hover:bg-black/5 text-black/40 hover:text-black"
                                    )}
                                >
                                    <ChevronUp size={12} strokeWidth={3} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMoveDown?.();
                                    }}
                                    disabled={isLast}
                                    className={cn(
                                        "px-1.5 py-1 rounded-md transition-all min-w-[28px] flex items-center justify-center",
                                        isLast ? "opacity-20 cursor-not-allowed" : isDark ? "hover:bg-white/10 text-white/40 hover:text-white" : "hover:bg-black/5 text-black/40 hover:text-black"
                                    )}
                                >
                                    <ChevronDown size={12} strokeWidth={3} />
                                </button>
                        </div>

                        <span className="w-px h-3 bg-white/10 mx-1" />

                        {/* Section background colour picker */}
                        {onBackgroundColorChange && (
                            <div className="relative" ref={paletteRef}>
                                <Tooltip content="Section Color" side={isFirst ? "bottom" : "top"}>
                                    <button
                                        onClick={() => setShowPalette(s => {
                                            if (!s) setShowSpacing(false);
                                            return !s;
                                        })}
                                        className={cn(
                                            'px-1.5 py-1 rounded-md transition-all flex items-center gap-1.5 min-w-[28px] justify-center',
                                            isDark ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-black/5 text-black/40 hover:text-black',
                                            showPalette && (isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'),
                                        )}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-sm border border-black/10"
                                            style={{ backgroundColor: backgroundColor || '#ffffff' }}
                                        />
                                        <Palette size={11} />
                                    </button>
                                </Tooltip>

                                {showPalette && (
                                    <div className={cn(
                                        'absolute right-0 top-full mt-2 rounded-xl border shadow-xl z-[200] p-3 min-w-[200px]',
                                        isDark ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-[#e8e8e8]',
                                    )}>
                                        <p className={cn('text-[9px] uppercase tracking-widest font-bold mb-2 px-0.5', isDark ? 'text-[#555]' : 'text-[#bbb]')}>
                                            Section Background
                                        </p>

                                        {/* Swatches grid */}
                                        <div className="grid grid-cols-6 gap-1.5 mb-3">
                                            {SECTION_PALETTE.map(sw => (
                                                <button
                                                    key={sw.value}
                                                    title={sw.label}
                                                    onClick={() => {
                                                        onBackgroundColorChange(sw.value);
                                                        if (!sw.value) setShowPalette(false);
                                                    }}
                                                    className={cn(
                                                        'w-7 h-7 rounded-lg border transition-all hover:scale-110',
                                                        backgroundColor === sw.value
                                                            ? 'border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]'
                                                            : isDark ? 'border-white/10' : 'border-black/10',
                                                    )}
                                                    style={{
                                                        backgroundColor: sw.value || '#ffffff',
                                                        backgroundImage: !sw.value
                                                            ? 'repeating-linear-gradient(45deg,#ccc 0,#ccc 1px,transparent 0,transparent 50%)'
                                                            : undefined,
                                                        backgroundSize: '6px 6px',
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        {/* Advanced Color Picker */}
                                        <ColorisInput
                                            value={backgroundColor || '#ffffff'}
                                            onChange={onBackgroundColorChange}
                                            isDark={isDark}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Section Spacing */}
                        {(onPaddingTopChange || onPaddingBottomChange) && (
                            <div className="relative" ref={spacingRef}>
                                <Tooltip content="Section Spacing" side={isFirst ? "bottom" : "top"}>
                                    <button
                                        onClick={() => setShowSpacing(s => {
                                            if (!s) setShowPalette(false);
                                            return !s;
                                        })}
                                        className={cn(
                                            'px-1.5 py-1 rounded-md transition-all flex items-center gap-1 min-w-[28px] justify-center',
                                            isDark ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-black/5 text-black/40 hover:text-black',
                                            showSpacing && (isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'),
                                        )}
                                    >
                                        <ArrowUpDown size={13} />
                                    </button>
                                </Tooltip>

                                {showSpacing && (
                                    <div className={cn(
                                        'absolute right-0 top-full mt-2 rounded-xl border shadow-xl z-[200] p-3 min-w-[200px]',
                                        isDark ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-[#e8e8e8]',
                                    )}>
                                        <p className={cn('text-[9px] uppercase tracking-widest font-bold mb-3 px-0.5', isDark ? 'text-[#555]' : 'text-[#bbb]')}>
                                            Block Spacing
                                        </p>
                                        
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between px-0.5">
                                                    <span className={cn("text-[10px] font-semibold tracking-wide", isDark ? "text-[#555]" : "text-[#bbb]")}>Top Padding</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={cn("text-[9.5px] font-mono", isDark ? "text-[#444]" : "text-[#ccc]")}>{currentPaddingTop}px</span>
                                                        {paddingTop !== undefined && (
                                                            <button
                                                                onClick={() => onPaddingTopChange?.(undefined)}
                                                                title="Reset to global"
                                                                className={cn("rounded transition-all", isDark ? "text-[#444] hover:text-[#888]" : "text-[#ccc] hover:text-[#888]")}
                                                            >
                                                                <RotateCcw size={9} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <input 
                                                    type="range" min="0" max="150" step="4" 
                                                    value={currentPaddingTop} 
                                                    onChange={e => onPaddingTopChange?.(Number(e.target.value))}
                                                    className="w-full cursor-pointer" 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between px-0.5">
                                                    <span className={cn("text-[10px] font-semibold tracking-wide", isDark ? "text-[#555]" : "text-[#bbb]")}>Bottom Padding</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={cn("text-[9.5px] font-mono", isDark ? "text-[#444]" : "text-[#ccc]")}>{currentPaddingBottom}px</span>
                                                        {paddingBottom !== undefined && (
                                                            <button
                                                                onClick={() => onPaddingBottomChange?.(undefined)}
                                                                title="Reset to global"
                                                                className={cn("rounded transition-all", isDark ? "text-[#444] hover:text-[#888]" : "text-[#ccc] hover:text-[#888]")}
                                                            >
                                                                <RotateCcw size={9} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <input 
                                                    type="range" min="0" max="150" step="4" 
                                                    value={currentPaddingBottom} 
                                                    onChange={e => onPaddingBottomChange?.(Number(e.target.value))}
                                                    className="w-full cursor-pointer" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}



                        {onSaveAsTemplate && (
                            <Tooltip content="Save as Template" side={isFirst ? "bottom" : "top"}>
                                <button
                                    onClick={() => onSaveAsTemplate(id)}
                                    className={cn(
                                        'px-1.5 py-1 rounded-md transition-all min-w-[28px] flex items-center justify-center',
                                        isDark ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-black/5 text-black/40 hover:text-black',
                                    )}
                                >
                                    <LayoutPanelTop size={13} />
                                </button>
                            </Tooltip>
                        )}
                        
                        <Tooltip content="Duplicate Section" side={isFirst ? "bottom" : "top"}>
                            <button
                                onClick={() => onDuplicate?.(id)}
                                className={cn(
                                    'px-1.5 py-1 rounded-md transition-all min-w-[28px] flex items-center justify-center',
                                    isDark ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-black/5 text-black/40 hover:text-black',
                                )}
                            >
                                <Copy size={13} />
                            </button>
                        </Tooltip>
                        <button
                            onClick={() => {
                                if (isConfirmingDelete) {
                                    onDelete(id);
                                } else {
                                    setIsConfirmingDelete(true);
                                }
                            }}
                            onMouseLeave={() => {
                                // Reset after 3 seconds if not clicked
                                deleteResetTimerRef.current = setTimeout(() => setIsConfirmingDelete(false), 3000);
                            }}
                            className={cn(
                                'px-1.5 py-1 rounded-md transition-all text-[11px] font-bold flex items-center gap-1 min-w-[28px] justify-center',
                                isConfirmingDelete 
                                    ? 'bg-red-500 text-white shadow-lg' 
                                    : isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'
                            )}
                        >
                            {isConfirmingDelete ? (
                                <>
                                    <Trash2 size={12} strokeWidth={2.5} />
                                    <span>Sure?</span>
                                </>
                            ) : (
                                <Trash2 size={13} />
                            )}
                        </button>
                    </div>
                )}

                {/* Content */}
                <div
                    className={cn(
                        'transition-all duration-300 py-3 -my-3 px-12 -mx-12 relative',
                        hovered && !isPreview ? 'z-10' : ''
                    )}
                    style={{
                        borderTopLeftRadius: isFirst ? 'var(--block-border-radius)' : undefined,
                        borderTopRightRadius: isFirst ? 'var(--block-border-radius)' : undefined,
                        borderBottomLeftRadius: isLast ? 'var(--block-border-radius)' : undefined,
                        borderBottomRightRadius: isLast ? 'var(--block-border-radius)' : undefined,
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

// Re-export BlockProps type for compatibility
export interface BlockProps {
    id: string;
    data: any;
    updateData: (id: string, data: any) => void;
    removeBlock: (id: string) => void;
    addBlockAfter?: (id: string) => void;
}
