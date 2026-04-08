"use client";

import React, { ReactNode, useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy, Palette, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { ColorisInput } from '@/components/ui/ColorisInput';

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
}: SectionBlockWrapperProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const [hovered, setHovered] = useState(false);
    const [showPalette, setShowPalette] = useState(false);
    const paletteRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

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

    // Close palette on outside click
    React.useEffect(() => {
        if (!showPalette) return;
        const handler = (e: MouseEvent) => {
            if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
                // Prevent closing if the click is inside the ColorisInput portal
                const portal = document.getElementById('color-picker-portal-content');
                if (portal && portal.contains(e.target as Node)) {
                    return;
                }
                setShowPalette(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showPalette]);

    // The full-bleed background layer — extends horizontally beyond document padding (px-12 = 3rem = 48px)
    const bgLayerStyle: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        left: '-3rem',
        right: '-3rem',
        backgroundColor: sectionBg,
        pointerEvents: 'none',
    };

    if (isPreview) {
        return (
            <div
                style={{
                    paddingTop: 'var(--block-margin-top)',
                    paddingBottom: 'var(--block-margin-bottom)',
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
            className={cn('group overflow-visible', isDragging && 'z-50')}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setShowPalette(false); }}
        >
            {/* Full-bleed section background */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    left: '-3rem',
                    right: '-3rem',
                    backgroundColor: sectionBg,
                    pointerEvents: 'none',
                    transition: 'background-color 0.2s',
                }}
            />

            {/* Spacing from CSS variable */}
            <div
                style={{
                    paddingTop: 'var(--block-margin-top)',
                    paddingBottom: 'var(--block-margin-bottom)',
                    position: 'relative',
                }}
            >
                {/* Floating action bar */}
                {hovered && (
                    <div
                        className={cn(
                            'absolute right-0 flex items-center gap-0.5 z-[100]',
                            'rounded-xl border px-2 py-1 transition-all animate-in fade-in zoom-in-95 duration-200',
                            isDark
                                ? 'bg-[#1a1a1a] border-white/[0.1] text-[#999]'
                                : 'bg-white border-[#e2e2e2] text-[#888]',
                        )}
                        style={{ 
                            top: isFirst 
                                ? 'calc(100% - var(--block-margin-bottom) + 8px)' 
                                : 'calc(var(--block-margin-top) - 36px)' 
                        }}
                    >
                        {/* Drag handle */}
                        <div
                            {...attributes}
                            {...listeners}
                            className="p-1.5 rounded-lg cursor-grab active:cursor-grabbing hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <GripVertical size={13} strokeWidth={2.5} />
                        </div>

                        <span className="w-px h-3 bg-white/10 mx-1" />

                        {/* Section background colour picker */}
                        {onBackgroundColorChange && (
                            <div className="relative" ref={paletteRef}>
                                <button
                                    onClick={() => setShowPalette(s => !s)}
                                    title="Section background color"
                                    className={cn(
                                        'p-1.5 rounded-lg transition-all flex items-center gap-1',
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
                                                            ? 'border-[#4dbf39] ring-1 ring-[#4dbf39]'
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

                        <button
                            onClick={() => onDuplicate?.(id)}
                            className={cn(
                                'p-2 rounded-lg transition-all',
                                isDark ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-black/5 text-black/40 hover:text-black',
                            )}
                        >
                            <Copy size={13} />
                        </button>
                        <button
                            onClick={() => onDelete(id)}
                            className={cn(
                                'p-2 rounded-lg transition-all',
                                isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500',
                            )}
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                )}

                {/* Content — dashed border on hover */}
                <div
                    className={cn(
                        'transition-all duration-300 p-3 -m-3',
                        hovered && !isPreview
                            ? isDark
                                ? 'border border-white/[0.15] border-dashed rounded-[var(--block-border-radius)]'
                                : 'border border-black/[0.1] border-dashed rounded-[var(--block-border-radius)]'
                            : 'border border-transparent',
                    )}
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
