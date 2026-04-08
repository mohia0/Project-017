"use client";

import React, { ReactNode, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

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
        borderRadius: isFirst ? 'var(--block-border-radius) var(--block-border-radius) 0 0' : 
                      isLast ? '0 0 var(--block-border-radius) var(--block-border-radius)' : '0',
        backgroundColor: '#ffffff',
    };

    if (isPreview) {
        return (
            <div style={{ 
                paddingTop: 'var(--block-margin-top)', 
                paddingBottom: 'var(--block-margin-bottom)',
                borderRadius: isFirst ? 'var(--block-border-radius) var(--block-border-radius) 0 0' : 
                              isLast ? '0 0 var(--block-border-radius) var(--block-border-radius)' : '0',
                backgroundColor: '#ffffff',
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
            {/* Floating action bar — only when hovered, minimal and smart */}
            {hovered && (
                <div className={cn(
                    "absolute -top-10 right-2 flex items-center gap-0.5 z-[100]",
                    "rounded-xl border px-2 py-1 transition-all shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-200",
                    isDark
                        ? "bg-[#1f1f1f] border-white/[0.05] text-[#999]"
                        : "bg-white border-[#e2e2e2] text-[#888]"
                )}>
                    {/* Drag handle */}
                    <div
                        {...attributes}
                        {...listeners}
                        className="p-1.5 rounded-lg cursor-grab active:cursor-grabbing hover:text-white hover:bg-white/5 transition-colors"
                        title="Drag to reorder"
                    >
                        <GripVertical size={13} strokeWidth={2.5} />
                    </div>

                    <span className="w-px h-3 bg-white/10 mx-1" />

                    <button
                        onClick={() => onMoveUp?.()}
                        className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-colors"
                        title="Move Up"
                    >
                        <ChevronUp size={13} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => onMoveDown?.()}
                        className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-colors"
                        title="Move Down"
                    >
                        <ChevronDown size={13} strokeWidth={2.5} />
                    </button>

                    <span className="w-px h-3 bg-white/10 mx-1" />

                    <button
                        onClick={() => onDuplicate?.(id)}
                        className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-colors"
                        title="Duplicate"
                    >
                        <Copy size={13} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => onDelete(id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={13} strokeWidth={2.5} />
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
}
