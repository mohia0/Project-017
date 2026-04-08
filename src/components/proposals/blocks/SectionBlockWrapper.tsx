"use client";

import React, { ReactNode, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
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
}

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
}: SectionBlockWrapperProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const [hovered, setHovered] = useState(false);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        paddingTop: 'var(--block-margin-top)',
        paddingBottom: 'var(--block-margin-bottom)',
        borderTopLeftRadius: isFirst ? 'var(--block-border-radius)' : '0',
        borderTopRightRadius: isFirst ? 'var(--block-border-radius)' : '0',
        borderBottomLeftRadius: isLast ? 'var(--block-border-radius)' : '0',
        borderBottomRightRadius: isLast ? 'var(--block-border-radius)' : '0',
        backgroundColor: 'var(--document-bg, #ffffff)',
    };

    if (isPreview) {
        return (
            <div style={{ 
                paddingTop: 'var(--block-margin-top)', 
                paddingBottom: 'var(--block-margin-bottom)',
                borderTopLeftRadius: isFirst ? 'var(--block-border-radius)' : '0',
                borderTopRightRadius: isFirst ? 'var(--block-border-radius)' : '0',
                borderBottomLeftRadius: isLast ? 'var(--block-border-radius)' : '0',
                borderBottomRightRadius: isLast ? 'var(--block-border-radius)' : '0',
                backgroundColor: 'var(--document-bg, #ffffff)',
            }}>
                {children}
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn("relative group overflow-visible", isDragging && "z-50")}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Floating action bar — Shadow-free, fixed relative to content */}
            {hovered && (
                <div className={cn(
                    "absolute right-2 flex items-center gap-0.5 z-[100]",
                    "rounded-xl border px-2 py-1 transition-all animate-in fade-in zoom-in-95 duration-200",
                    isDark
                        ? "bg-[#1f1f1f] border-white/[0.05] text-[#999]"
                        : "bg-white border-[#e2e2e2] text-[#888]"
                )}
                style={{ top: 'calc(var(--block-margin-top) - 36px)' }}
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

                    <button
                        onClick={() => onDuplicate?.(id)}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            isDark ? "hover:bg-white/10 text-white/40 hover:text-white" : "hover:bg-black/5 text-black/40 hover:text-black"
                        )}
                    >
                        <Copy size={13} />
                    </button>
                    <button
                        onClick={() => onDelete(id)}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            isDark ? "hover:bg-red-500/20 text-red-400" : "hover:bg-red-50 text-red-500"
                        )}
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            )}

            {/* Content — dashed border ONLY on hover */}
            <div className={cn(
                "transition-all duration-300 -mx-[60px] px-[60px]",
                hovered && !isPreview
                    ? isDark 
                        ? "border-t border-b border-white/[0.08] border-dashed" 
                        : "border-t border-b border-black/[0.08] border-dashed"
                    : "border-t border-b border-transparent",
                isPreview && "-mx-0 px-0"
            )}>
                {children}
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
