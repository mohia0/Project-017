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
}: SectionBlockWrapperProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const [hovered, setHovered] = useState(false);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    if (isPreview) {
        return <div className="py-6">{children}</div>;
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn("relative group", isDragging && "z-50")}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Floating action bar — only when hovered, no border on block */}
            {hovered && (
                <div className={cn(
                    "absolute -top-3 right-0 flex items-center gap-0.5 z-30",
                    "rounded-lg border shadow-lg px-1.5 py-1 transition-all",
                    isDark
                        ? "bg-[#1f1f1f] border-[#333] text-[#999]"
                        : "bg-white border-[#e2e2e2] text-[#888]"
                )}>
                    {/* Drag handle */}
                    <div
                        {...attributes}
                        {...listeners}
                        className="p-1 rounded cursor-grab active:cursor-grabbing hover:text-[#444] hover:bg-black/5"
                        title="Drag to reorder"
                    >
                        <GripVertical size={13} />
                    </div>

                    <span className="w-px h-3 bg-current opacity-15 mx-0.5" />

                    <button
                        onClick={() => onMoveUp?.()}
                        className="p-1 rounded hover:bg-black/5 hover:text-[#444]"
                        title="Move Up"
                    >
                        <ChevronUp size={13} />
                    </button>
                    <button
                        onClick={() => onMoveDown?.()}
                        className="p-1 rounded hover:bg-black/5 hover:text-[#444]"
                        title="Move Down"
                    >
                        <ChevronDown size={13} />
                    </button>

                    <span className="w-px h-3 bg-current opacity-15 mx-0.5" />

                    <button
                        onClick={() => onDuplicate?.(id)}
                        className="p-1 rounded hover:bg-black/5 hover:text-[#444]"
                        title="Duplicate"
                    >
                        <Copy size={13} />
                    </button>
                    <button
                        onClick={() => onDelete(id)}
                        className="p-1 rounded hover:bg-red-500/10 hover:text-red-500"
                        title="Delete"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            )}

            {/* Content — no borders, no background */}
            <div className={cn(
                "transition-colors duration-150 rounded-sm",
                hovered && !isDark && "bg-[#fafafa]",
                hovered && isDark && "bg-white/[0.02]",
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
