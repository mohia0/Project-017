"use client";

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Circle, CheckCircle2 } from 'lucide-react';

export interface ColumnDef<T> {
    id: string;
    header: ReactNode | string;
    cell: (item: T) => ReactNode;
    width?: number;    // default width in px
    minWidth?: number; // min width in px
}

interface DataTableProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    keyExtractor: (item: T) => string;
    onRowClick?: (item: T) => void;
    getRowColor?: (item: T, theme: 'light' | 'dark') => string;
    theme: 'light' | 'dark';

    // Empty state
    emptyState?: ReactNode;
    isLoading?: boolean;
    loadingState?: ReactNode;

    // Selection
    enableSelection?: boolean;
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;

    // Bottom Action
    bottomAction?: ReactNode;
}

export function DataTable<T>({
    data,
    columns,
    keyExtractor,
    onRowClick,
    getRowColor,
    theme,
    emptyState,
    isLoading,
    loadingState,
    enableSelection,
    selectedIds,
    onSelectionChange,
    bottomAction,
}: DataTableProps<T>) {
    // Column widths state
    const [colWidths, setColWidths] = useState<Record<string, number>>({});

    // Initialize default widths
    useEffect(() => {
        const initial: Record<string, number> = {};
        columns.forEach(col => {
            initial[col.id] = col.width || 120;
        });
        // We do not overwrite user-adjusted widths if data changes, only on mount
        setColWidths(prev => Object.keys(prev).length ? prev : initial);
    }, [columns]);

    // Resizing Logic
    const [isResizing, setIsResizing] = useState(false);
    const resizingCol = useRef<string | null>(null);
    const startX = useRef<number>(0);
    const startWidth = useRef<number>(0);

    const handleMouseDown = (e: React.MouseEvent, colId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        resizingCol.current = colId;
        startX.current = e.clientX;
        startWidth.current = colWidths[colId] || 120;

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!resizingCol.current) return;
        const diff = e.clientX - startX.current;
        const colDef = columns.find(c => c.id === resizingCol.current);
        const minW = colDef?.minWidth || 60;

        const newW = Math.max(minW, startWidth.current + diff);
        setColWidths(prev => ({ ...prev, [resizingCol.current!]: newW }));
    };

    const handleMouseUp = () => {
        setIsResizing(false);
        resizingCol.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    // Selection Logic
    const toggleSelection = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!enableSelection || !onSelectionChange || !selectedIds) return;

        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        onSelectionChange(next);
    };

    const toggleAll = () => {
        if (!enableSelection || !onSelectionChange || !selectedIds) return;
        if (selectedIds.size === data.length && data.length > 0) {
            onSelectionChange(new Set()); // deselect all
        } else {
            onSelectionChange(new Set(data.map(keyExtractor))); // select all
        }
    };

    const isAllSelected = data.length > 0 && selectedIds?.size === data.length;

    // We build a template string for columns: e.g. "40px 100px 120px ..."
    const selectionWidth = enableSelection ? 40 : 0;
    const gridTemplateColumns = [
        ...(enableSelection ? [`${selectionWidth}px`] : []),
        ...columns.map(c => `${colWidths[c.id] || 120}px`)
    ].join(' ');

    return (
        <div className={cn(
            "flex-1 flex flex-col relative transition-all duration-700",
            theme === 'dark' ? "bg-transparent" : "bg-transparent"
        )}>
            {/* Header Row */}
            <div
                className={cn(
                    "grid items-center px-8 py-4 border-b text-[9px] font-bold uppercase shrink-0 sticky top-0 z-30 transition-colors tracking-[0.25em]",
                    theme === 'dark' ? "border-white/[0.03] text-white/20 bg-[#252525]" : "border-black/[0.03] text-black/30 bg-[#f5f5f5]",
                    isResizing && "pointer-events-none"
                )}
                style={{ gridTemplateColumns }}
            >
                {enableSelection && (
                    <div className="flex justify-start pr-6" onClick={toggleAll}>
                        <div className="cursor-pointer group flex items-center justify-center">
                            {isAllSelected ? (
                                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                                    <CheckCircle2 size={8} className="text-black stroke-[4px]" />
                                </div>
                            ) : (
                                <div className={cn("w-3.5 h-3.5 rounded-full border-[1.5px] transition-all group-hover:border-emerald-500/30", theme === 'dark' ? "border-[#2a2a2a]" : "border-[#e0e0e0]")} />
                            )}
                        </div>
                    </div>
                )}
                {columns.map((col, idx) => (
                    <div key={col.id} className="relative flex items-center pr-6 h-full group/col">
                        <div className="flex-1 truncate select-none opacity-80 group-hover/col:opacity-100 transition-opacity uppercase">{col.header}</div>

                        {/* Minimalist Resizer */}
                        {idx < columns.length - 1 && (
                            <div
                                className={cn(
                                    "absolute -right-3 top-1/2 -translate-y-1/2 w-[1px] h-[8px] rounded-full transition-all cursor-col-resize z-40",
                                    theme === 'dark' ? "bg-white/10 opacity-0 group-hover/col:opacity-100" : "bg-black/5 opacity-0 group-hover/col:opacity-100"
                                )}
                                onMouseDown={(e) => handleMouseDown(e, col.id)}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto no-scrollbar pb-10 min-w-max">
                {isLoading ? (
                    loadingState || <div className="p-8 text-center text-sm text-[#999]">Loading...</div>
                ) : data.length === 0 ? (
                    emptyState || <div className="p-16 text-center text-[#666]">No records found.</div>
                ) : (
                    data.map((item) => {
                        const id = keyExtractor(item);
                        const isSelected = selectedIds?.has(id);
                        const rowColor = getRowColor ? getRowColor(item, theme) : "";

                        return (
                            <div
                                key={id}
                                onClick={() => onRowClick && onRowClick(item)}
                                className={cn(
                                    "grid items-center px-8 py-5 border-b text-[13px] group/row transition-all duration-500",
                                    onRowClick ? "cursor-pointer" : "",
                                    theme === 'dark' ? "border-white/[0.02] hover:bg-white/[0.01]" : "border-black/[0.01] hover:bg-black/[0.005]",
                                    isSelected ? (theme === 'dark' ? "bg-white/[0.02]" : "bg-black/[0.01]") : "",
                                    rowColor
                                )}
                                style={{ gridTemplateColumns }}
                            >
                                {enableSelection && (
                                    <div className="flex justify-start pr-6" onClick={(e) => toggleSelection(id, e)}>
                                        <div className="cursor-pointer transition-all active:scale-90">
                                            {isSelected ? (
                                                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-in zoom-in-75 duration-300">
                                                    <CheckCircle2 size={8} className="text-black stroke-[4px]" />
                                                </div>
                                            ) : (
                                                <div className={cn("w-3.5 h-3.5 rounded-full border-[1.5px] transition-all opacity-10 group-hover/row:opacity-40", theme === 'dark' ? "border-white" : "border-black")} />
                                            )}
                                        </div>
                                    </div>
                                )}

                                {columns.map((col) => (
                                    <div key={col.id} className="truncate pr-6 font-medium text-inherit tracking-tight">
                                        {col.cell(item)}
                                    </div>
                                ))}
                            </div>
                        );
                    })
                )}

                {/* Bottom Action (e.g. Create new row) */}
                {!isLoading && bottomAction}
            </div>
        </div>
    );
}
