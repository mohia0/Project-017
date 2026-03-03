"use client";

import React, { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Settings, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

interface SectionBlockWrapperProps {
    id: string;
    children: ReactNode;
    type: string;
    onDelete: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onMoveUp?: (id: string) => void;
    onMoveDown?: (id: string) => void;
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
    isPreview = false
}: SectionBlockWrapperProps) {
    const { theme } = useUIStore();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (isPreview) {
        return <div className="py-6">{children}</div>;
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative my-4 rounded-xl border-2 border-transparent transition-all duration-300 outline-none",
                isDragging && "opacity-50 z-50",
                theme === 'dark' ? "hover:border-[#333] hover:bg-[#1a1a1a]" : "hover:border-[#e2e2e2] hover:bg-[#fdfdfd] hover:shadow-sm"
            )}
        >
            {/* Action Bar (Top Right) */}
            <div className={cn(
                "absolute -top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 border rounded-lg shadow-sm px-2 py-1",
                theme === 'dark' ? "bg-[#252525] border-[#333] text-[#ccc]" : "bg-white border-[#e2e2e2] text-[#666]"
            )}>
                <div
                    {...attributes}
                    {...listeners}
                    className={cn("p-1.5 rounded cursor-grab active:cursor-grabbing hover:bg-black/5 dark:hover:bg-white/10")}
                    title="Drag to move"
                >
                    <GripVertical size={14} />
                </div>

                <span className="w-px h-3 bg-current opacity-20 mx-1" />

                <button
                    onClick={() => onMoveUp?.(id)}
                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
                    title="Move Up"
                >
                    <ChevronUp size={14} />
                </button>
                <button
                    onClick={() => onMoveDown?.(id)}
                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
                    title="Move Down"
                >
                    <ChevronDown size={14} />
                </button>

                <span className="w-px h-3 bg-current opacity-20 mx-1" />

                <button
                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
                    title="Settings"
                >
                    <Settings size={14} />
                </button>
                <button
                    onClick={() => onDuplicate?.(id)}
                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
                    title="Duplicate"
                >
                    <Copy size={14} />
                </button>
                <button
                    onClick={() => onDelete(id)}
                    className="p-1.5 rounded text-red-500 hover:bg-red-500/10"
                    title="Delete Section"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Section Tag (Top Left) */}
            <div className={cn(
                "absolute -top-3 left-4 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
                theme === 'dark' ? "bg-[#333] text-[#999]" : "bg-[#f0f0f0] text-[#666]"
            )}>
                {type} SECTION
            </div>

            {/* Content Area */}
            <div className="p-8">
                {children}
            </div>
        </div>
    );
}
