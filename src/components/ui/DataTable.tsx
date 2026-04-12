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
    maxWidth?: number; // max width in px
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
        const maxW = colDef?.maxWidth || 800; // Adding max limit safely

        const newW = Math.max(minW, Math.min(maxW, startWidth.current + diff));
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
            "flex-1 flex flex-col relative transition-all duration-700 container-styled max-w-full overflow-hidden",
            "border rounded-xl",
            theme === 'dark' ? "border-[#252525] bg-[#1a1a1a]" : "border-[#ebebeb] bg-[#fbfbfc]"
        )}>
            {/* Header Row */}
            <div
                className={cn(
                    "grid items-stretch border-b text-[12px] font-semibold sticky top-0 z-30 transition-colors",
                    theme === 'dark' ? "border-[#252525] text-[#ccc] bg-[#222]" : "border-[#ebebeb] text-[#111] bg-[#f4f5f8]",
                    isResizing && "pointer-events-none"
                )}
                style={{ gridTemplateColumns }}
            >
                {enableSelection && (
                    <div className={cn(
                        "flex justify-center items-center py-3",
                        theme === 'dark' ? "border-r border-[#333]" : "border-r border-[#ebebeb]"
                    )} onClick={toggleAll}>
                        <div className="cursor-pointer group flex items-center justify-center">
                            {isAllSelected ? (
                                <div className="w-[14px] h-[14px] rounded-full bg-[var(--primary)] flex items-center justify-center">
                                    <CheckCircle2 size={10} className="text-white stroke-[3px]" />
                                </div>
                            ) : (
                                <Circle size={14} className={cn("transition-all opacity-20 group-hover:opacity-60", theme === 'dark' ? "text-white" : "text-[#111]")} />
                            )}
                        </div>
                    </div>
                )}
                {columns.map((col, idx) => (
                    <div key={col.id} className={cn(
                        "relative flex items-center h-full px-4 group/col",
                        idx < columns.length - 1 && (theme === 'dark' ? "border-r border-[#333]" : "border-r border-[#ececec]")
                    )}>
                        <div className="flex-1 truncate select-none py-3">{col.header}</div>

                        {/* Minimalist Resizer */}
                        {idx < columns.length - 1 && (
                            <div
                                className={cn(
                                    "absolute -right-3 top-0 bottom-0 w-[24px] flex items-center justify-center cursor-col-resize z-40 group/resizer transition-colors hover:bg-primary/10"
                                )}
                                onMouseDown={(e) => handleMouseDown(e, col.id)}
                            >
                                <div className={cn(
                                    "w-[2px] h-[50%] rounded-full opacity-0 group-hover/resizer:opacity-100 transition-opacity",
                                    "bg-primary"
                                )} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto no-scrollbar pb-0 min-w-max">
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
                                    "grid items-stretch border-b text-[13px] group/row transition-all duration-300",
                                    onRowClick ? "cursor-pointer" : "",
                                    theme === 'dark' ? "border-[#252525] bg-[#1a1a1a] hover:bg-[#222]" : "border-[#ebebeb] bg-white hover:bg-[#fcfcd0]/10",
                                    isSelected ? (theme === 'dark' ? "bg-[#2a2a2a]" : "bg-[#f5f7fa]") : "",
                                    rowColor
                                )}
                                style={{ gridTemplateColumns }}
                            >
                                {enableSelection && (
                                    <div className={cn(
                                        "flex justify-center items-center py-4",
                                        theme === 'dark' ? "border-r border-[#252525]" : "border-r border-[#f5f5f5]"
                                    )} onClick={(e) => toggleSelection(id, e)}>
                                        <div className="cursor-pointer transition-all active:scale-90">
                                            {isSelected ? (
                                                <div className="w-[14px] h-[14px] rounded-full bg-[var(--primary)] flex items-center justify-center animate-in zoom-in-75 duration-300">
                                                    <CheckCircle2 size={10} className="text-white stroke-[3px]" />
                                                </div>
                                            ) : (
                                                <Circle size={14} className={cn("transition-all opacity-10 group-hover/row:opacity-40", theme === 'dark' ? "text-white" : "text-[#111]")} />
                                            )}
                                        </div>
                                    </div>
                                )}

                                {columns.map((col, colIdx) => (
                                    <div key={col.id} className={cn(
                                        "truncate px-4 py-4 font-medium text-inherit tracking-tight flex items-center",
                                        colIdx < columns.length - 1 && (theme === 'dark' ? "border-r border-[#252525]" : "border-r border-[#f5f5f5]")
                                    )}>
                                        {col.cell(item)}
                                    </div>
                                ))}
                            </div>
                        );
                    })
                )}

                {/* Bottom Action (e.g. Create new row) */}
                {!isLoading && bottomAction && (
                    <div className={cn(
                        "p-2", 
                        theme === 'dark' ? "bg-[#1a1a1a]" : "bg-white"
                    )}>
                        {bottomAction}
                    </div>
                )}
            </div>
        </div>
    );
}

