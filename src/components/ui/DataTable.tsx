"use client";

import React, { useMemo, useState, useEffect, ReactNode, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { ContextMenuRow } from './RowContextMenu';
import { useUIStore } from '@/store/useUIStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { AppLoader } from './AppLoader';

export function Chk({ checked, indeterminate, isDark }: { checked: boolean; indeterminate?: boolean; isDark: boolean }) {
    return (
        <div className={cn("w-[13px] h-[13px] rounded-[3px] border flex items-center justify-center transition-all shrink-0 cursor-pointer",
            checked ? "bg-primary border-primary"
                : indeterminate ? "bg-primary/40 border-primary/60"
                    : isDark ? "border-[#3a3a3a] bg-transparent" : "border-[#d0d0d0] bg-white")}>
            {(checked || indeterminate) && (
                <svg width="7" height="5" viewBox="0 0 8 6" fill="none">
                    {indeterminate && !checked
                        ? <line x1="1" y1="3" x2="7" y2="3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        : <polyline points="1,3 3,5 7,1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
                </svg>
            )}
        </div>
    );
}

export function SortableHeader({ id, children, onLeftResizeStart, onRightResizeStart, isDark, width, flexible, noBorder }: { 
    id: string; 
    children: ReactNode; 
    onLeftResizeStart?: (e: React.MouseEvent) => void;
    onRightResizeStart?: (e: React.MouseEvent) => void;
    isDark: boolean;
    width?: number;
    flexible?: boolean;
    noBorder?: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 20 : 1,
    };
    return (
        <div ref={setNodeRef} style={style} data-col-id={id} className={cn(
            "relative px-4 py-2 flex items-center select-none group/header border-x border-transparent",
            isDragging ? "bg-blue-500/10" : "",
            isDark ? "hover:border-[#2e2e2e]" : "hover:border-[#e0e0e0]"
        )}>
            {onLeftResizeStart && (
                <div onMouseDown={onLeftResizeStart} className={cn(
                    "absolute -left-[12px] top-0 bottom-0 w-[24px] flex items-center justify-center cursor-ew-resize z-20 group/resizer transition-colors",
                    "hover:bg-primary/5 active:bg-primary/10"
                )}>
                    <div className="w-[2px] h-5 rounded-full opacity-0 group-hover/resizer:opacity-100 transition-opacity bg-primary" />
                </div>
            )}
            <div {...attributes} {...listeners} className="flex-1 cursor-grab active:cursor-grabbing truncate">
                {children}
            </div>
            {onRightResizeStart && (
                <div onMouseDown={(e) => {
                    e.stopPropagation();
                    onRightResizeStart(e);
                }} className={cn(
                    "absolute -right-[12px] top-0 bottom-0 w-[24px] flex items-center justify-center cursor-ew-resize z-50 group/resizer transition-colors",
                    "hover:bg-primary/5 active:bg-primary/10"
                )}>
                    <div className="w-[2px] h-5 rounded-full opacity-0 group-hover/resizer:opacity-100 transition-opacity bg-primary" />
                </div>
            )}
        </div>
    );
}

export type DataTableColumn<T> = {
    id: string;
    label: string | ReactNode;
    defaultWidth: number;
    flexible?: boolean; // if true, uses minmax(width, 1fr)
    noBorder?: boolean;
    cell: (item: T) => ReactNode;
};

export type DataTableProps<T> = {
    data: T[];
    columns: DataTableColumn<T>[];
    storageKeyPrefix: string;
    selectedIds: Set<string>;
    onToggleAll: () => void;
    onToggleRow: (id: string, e: React.MouseEvent) => void;
    onRowClick?: (item: T) => void;
    rowMenuItems?: (item: T) => any[];
    isDark: boolean;
    rightHeaderSlot?: ReactNode; // e.g. "Total" column
    rightHeaderWidth?: number; // width of the fixed right slot
    rightCellSlot?: (item: T) => ReactNode;
    isLoading?: boolean;
    emptyState?: ReactNode;
    afterRows?: ReactNode; // e.g. "Create New" row at bottom
};

export function DataTable<T extends { id: string }>({
    data, columns, storageKeyPrefix, selectedIds, onToggleAll, onToggleRow, onRowClick,
    rowMenuItems, isDark, rightHeaderSlot, rightHeaderWidth, rightCellSlot, isLoading, emptyState, afterRows
}: DataTableProps<T>) {
    const { activeWorkspaceId } = useUIStore();
    const { toolSettings, fetchToolSettings, updateToolSettings, hasFetched } = useSettingsStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const storageKey = activeWorkspaceId ? `${activeWorkspaceId}_${storageKeyPrefix}` : storageKeyPrefix;

    const currentSettings = toolSettings[storageKeyPrefix] || {};
    
    // Synchronous initialization to prevent skeleton flash on cached navigations
    const [columnOrder, setColumnOrder] = useState<string[]>(() => {
        const fetchKey = `toolSettings_${storageKeyPrefix}`;
        if (hasFetched[fetchKey] && currentSettings.columnOrder) return currentSettings.columnOrder;
        return columns.map(c => c.id);
    });
    
    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const fetchKey = `toolSettings_${storageKeyPrefix}`;
        if (hasFetched[fetchKey] && currentSettings.colWidths) return currentSettings.colWidths;
        const initial: Record<string, number> = { select: 44, right_slot: rightHeaderWidth || 80, ghost: 0 };
        columns.forEach(c => initial[c.id] = c.defaultWidth);
        return initial;
    });

    const [isInitialized, setIsInitialized] = useState(() => {
        const fetchKey = `toolSettings_${storageKeyPrefix}`;
        return !!hasFetched[fetchKey];
    });

    // 1. Initial Fetch
    useEffect(() => {
        if (activeWorkspaceId && !hasFetched[`toolSettings_${storageKeyPrefix}`]) {
            fetchToolSettings(activeWorkspaceId, storageKeyPrefix);
        }
    }, [activeWorkspaceId, storageKeyPrefix, fetchToolSettings, hasFetched]);

    // Reset initialization when workspace or tool changes
    useEffect(() => {
        const fetchKey = `toolSettings_${storageKeyPrefix}`;
        setIsInitialized(!!hasFetched[fetchKey]);
    }, [activeWorkspaceId, storageKeyPrefix, hasFetched]);

    // 2. Sync from Settings Store (Remote ground truth)
    useEffect(() => {
        const fetchKey = `toolSettings_${storageKeyPrefix}`;
        if (hasFetched[fetchKey]) {
            if (currentSettings.columnOrder) setColumnOrder(currentSettings.columnOrder);
            if (currentSettings.colWidths) setColWidths(currentSettings.colWidths);
            setIsInitialized(true);
        }
    }, [hasFetched, storageKeyPrefix, currentSettings.columnOrder, currentSettings.colWidths]);

    // 3. Migration logic (Local -> Remote)
    useEffect(() => {
        if (typeof window === 'undefined' || !activeWorkspaceId) return;
        if (hasFetched[`toolSettings_${storageKeyPrefix}`] && !currentSettings.columnOrder && !currentSettings.colWidths) {
            const savedOrder = localStorage.getItem(`${storageKey}_col_order`);
            const savedWidths = localStorage.getItem(`${storageKey}_col_widths`);
            const legacyOrder = localStorage.getItem(`${storageKeyPrefix}_col_order`);
            const legacyWidths = localStorage.getItem(`${storageKeyPrefix}_col_widths`);

            const order = savedOrder || legacyOrder;
            const widths = savedWidths || legacyWidths;

            if (order || widths) {
                const nextSettings = { ...currentSettings };
                if (order) nextSettings.columnOrder = JSON.parse(order);
                if (widths) nextSettings.colWidths = JSON.parse(widths);
                
                updateToolSettings(activeWorkspaceId, storageKeyPrefix, nextSettings);
                
                // Clear local
                localStorage.removeItem(`${storageKey}_col_order`);
                localStorage.removeItem(`${storageKey}_col_widths`);
                localStorage.removeItem(`${storageKeyPrefix}_col_order`);
                localStorage.removeItem(`${storageKeyPrefix}_col_widths`);
            }
        }
    }, [activeWorkspaceId, storageKey, storageKeyPrefix, hasFetched, currentSettings, updateToolSettings]);

    // 4. Persist changes to Remote (Debounced)
    useEffect(() => {
        if (!activeWorkspaceId || !hasFetched[`toolSettings_${storageKeyPrefix}`]) return;
        
        const timer = setTimeout(() => {
            // Only update if different
            if (JSON.stringify(columnOrder) !== JSON.stringify(currentSettings.columnOrder) || 
                JSON.stringify(colWidths) !== JSON.stringify(currentSettings.colWidths)) {
                updateToolSettings(activeWorkspaceId, storageKeyPrefix, {
                    ...currentSettings,
                    columnOrder,
                    colWidths
                });
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [columnOrder, colWidths, activeWorkspaceId, storageKeyPrefix, updateToolSettings, hasFetched]);

    const handleResizeStart = (leftKey: string, rightKey: string, e: React.MouseEvent, mode: 'adjacent' | 'left-only' | 'right-only' = 'adjacent') => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        
        let actualStartLeft = colWidths[leftKey] || 150;
        let actualStartRight = colWidths[rightKey] || 150;
        
        if (containerRef.current) {
            const headerGrid = containerRef.current.querySelector('.grid') as HTMLElement;
            if (headerGrid) {
                const leftEl = headerGrid.querySelector(`[data-col-id="${leftKey}"]`);
                if (leftEl) actualStartLeft = leftEl.getBoundingClientRect().width;
                
                const rightEl = headerGrid.querySelector(`[data-col-id="${rightKey}"]`);
                if (rightEl) actualStartRight = rightEl.getBoundingClientRect().width;
            }
        }
        
        const startWidthLeft = actualStartLeft;
        const startWidthRight = actualStartRight;
        
        let finalWidthLeft = mode === 'right-only' ? (colWidths[leftKey] || startWidthLeft) : startWidthLeft;
        let finalWidthRight = mode === 'left-only' ? (colWidths[rightKey] || startWidthRight) : startWidthRight;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const delta = moveEvent.clientX - startX;
            
            let newWidthLeft = Math.max(20, startWidthLeft + delta);
            let newWidthRight = startWidthRight;

            if (mode === 'adjacent') {
                let actualDelta = newWidthLeft - startWidthLeft;
                newWidthRight = Math.max(20, startWidthRight - actualDelta);
                
                // Re-adjust if right column hit minimum
                actualDelta = startWidthRight - newWidthRight;
                newWidthLeft = startWidthLeft + actualDelta;
            } else if (mode === 'left-only') {
                newWidthLeft = Math.max(20, startWidthLeft + delta);
            } else if (mode === 'right-only') {
                newWidthRight = Math.max(20, startWidthRight - delta);
            }

            if (mode !== 'right-only') finalWidthLeft = newWidthLeft;
            if (mode !== 'left-only') finalWidthRight = newWidthRight;

            // Direct DOM manipulation for smoothness
            if (containerRef.current) {
                const tempWidths = { ...colWidths };
                if (mode !== 'right-only') tempWidths[leftKey] = newWidthLeft;
                if (mode !== 'left-only') tempWidths[rightKey] = newWidthRight;
                
                const parts = [`${tempWidths.select || 44}px`];
                columnOrder.forEach(id => {
                    const col = columns.find(c => c.id === id);
                    const w = tempWidths[id] || col?.defaultWidth || 150;
                    if (col?.flexible) parts.push(`minmax(${w}px, 1fr)`);
                    else parts.push(`${w}px`);
                });
                const ghostWidth = tempWidths['ghost'] || 0;
                parts.push(`minmax(${ghostWidth}px, 1fr)`);
                
                if (rightHeaderSlot || rightCellSlot) {
                    parts.push(`${tempWidths['right_slot'] || rightHeaderWidth || 80}px`);
                }

                const template = parts.join(' ');
                
                // Apply to all grid containers (Header + Rows)
                const grids = containerRef.current.querySelectorAll('.grid');
                grids.forEach((g: any) => (g as HTMLElement).style.gridTemplateColumns = template);
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            // Commit to state on finish
            setColWidths(prev => {
                const next = { ...prev };
                if (mode !== 'right-only') next[leftKey] = finalWidthLeft;
                if (mode !== 'left-only') next[rightKey] = finalWidthRight;
                return next;
            });
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setColumnOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const gridTemplate = useMemo(() => {
        const parts = [`${colWidths.select || 44}px`];
        columnOrder.forEach(id => {
            const col = columns.find(c => c.id === id);
            if (col?.flexible) parts.push(`minmax(${colWidths[id] || col?.defaultWidth || 150}px, 1fr)`);
            else parts.push(`${colWidths[id] || col?.defaultWidth || 150}px`);
        });
        // Ghost column — place before right_slot to keep right_slot at far right
        parts.push(`minmax(${colWidths['ghost'] || 0}px, 1fr)`);
        
        if (rightHeaderSlot || rightCellSlot) {
            parts.push(`${colWidths['right_slot'] || rightHeaderWidth || 80}px`);
        }
        return parts.join(' ');
    }, [columnOrder, colWidths, columns, rightHeaderSlot, rightCellSlot, rightHeaderWidth]);

    const isAllSelected = selectedIds.size > 0 && selectedIds.size === data.length && data.length > 0;

    // Loading Shimmer Block
    const renderShimmer = () => (
        <div className="flex flex-col">{Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className={cn("grid w-full px-0 border-b items-center h-[45px]", isDark ? "border-[#1f1f1f]" : "border-[#f0f0f0]")} style={{ gridTemplateColumns: gridTemplate }}>
                <div className="flex justify-center"><div className={cn("w-3.5 h-3.5 rounded-[3px] animate-pulse bg-primary/10")} /></div>
                {columnOrder.map(colId => (
                    <div key={colId} className="px-4"><div className={cn("h-3 w-3/4 max-w-[120px] rounded animate-pulse bg-primary/5")} /></div>
                ))}
                {(rightHeaderSlot || rightCellSlot) && <div className="px-4"><div className={cn("h-3 w-8 flex-none rounded animate-pulse bg-primary/5")} /></div>}
            </div>
        ))}</div>
    );

    const isSettingsLoading = !!activeWorkspaceId && (!hasFetched[`toolSettings_${storageKeyPrefix}`] || !isInitialized);

    if (isSettingsLoading) {
        return (
            <div className={cn("overflow-x-auto no-scrollbar rounded-xl border", isDark ? "border-[#222]" : "border-[#ebebeb]")}>
                <div className="min-w-full w-max flex flex-col">
                    <div className={cn("grid w-full border-b text-[10px] font-semibold uppercase tracking-wider sticky top-0 z-30",
                        isDark ? "bg-[#141414] border-[#252525] text-[#555]" : "bg-[#fafafa] border-[#ebebeb] text-[#aaa]")}
                        style={{ gridTemplateColumns: gridTemplate }}>
                        
                        <div className={cn("relative px-0 py-2 flex items-center justify-center shrink-0", isDark ? "border-[#2e2e2e]" : "border-[#e0e0e0]")}>
                            <Chk checked={false} isDark={isDark} />
                        </div>
                        {columnOrder.map(colId => {
                            const col = columns.find(c => c.id === colId);
                            if (!col) return null;
                            return (
                                <div key={col.id} className="relative px-4 py-2 flex items-center select-none">
                                    {col.label}
                                </div>
                            );
                        })}
                        <div className="flex-1 self-stretch" />
                        {(rightHeaderSlot || rightCellSlot) && (
                            <div className={cn("relative px-4 py-2 flex items-center justify-end font-semibold sticky right-0 z-40", isDark ? "bg-[#141414]" : "bg-[#fafafa]")} style={{ width: colWidths.right_slot }}>
                                {rightHeaderSlot || ''}
                            </div>
                        )}
                    </div>
                    {renderShimmer()}
                </div>
            </div>
        );
    }

    if (!isLoading && data.length === 0 && emptyState) {
        return <>{emptyState}</>;
    }

    return (
        <div ref={containerRef} className={cn("overflow-x-auto no-scrollbar rounded-xl border", isDark ? "border-[#222]" : "border-[#ebebeb]")}>
            <div className="min-w-full w-max flex flex-col">
                {/* Header */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <div className={cn("grid w-full border-b text-[10px] font-semibold uppercase tracking-wider sticky top-0 z-30",
                        isDark ? "bg-[#141414] border-[#252525] text-[#555]" : "bg-[#fafafa] border-[#ebebeb] text-[#aaa]")}
                        style={{ gridTemplateColumns: gridTemplate }}>
                        
                        <div data-col-id="select" className={cn("relative px-0 py-2 flex items-center justify-center shrink-0", isDark ? "border-[#2e2e2e]" : "border-[#e0e0e0]")}>
                            <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onToggleAll(); }}>
                                <Chk checked={isAllSelected} indeterminate={selectedIds.size > 0 && !isAllSelected} isDark={isDark} />
                            </div>
                        </div>

                        <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                            {columnOrder.map((colId, index) => {
                                const col = columns.find(c => c.id === colId);
                                if (!col) return null;
                                
                                const prevColId = index > 0 ? columnOrder[index - 1] : null;
                                const nextColId = index < columnOrder.length - 1 ? columnOrder[index + 1] : null;

                                return (
                                    <SortableHeader 
                                        key={col.id} 
                                        id={col.id} 
                                        isDark={isDark} 
                                        width={colWidths[col.id]}
                                        flexible={col.flexible}
                                        noBorder={col.noBorder}
                                        onLeftResizeStart={prevColId 
                                            ? (e) => handleResizeStart(prevColId, col.id, e, prevColId === columnOrder[0] ? 'left-only' : 'adjacent') 
                                            : undefined}
                                        onRightResizeStart={
                                            nextColId 
                                                ? (e) => handleResizeStart(col.id, nextColId, e, index === 0 ? 'left-only' : 'adjacent') 
                                                : (e) => handleResizeStart(col.id, 'ghost', e, index === 0 ? 'left-only' : 'adjacent')
                                        }
                                    >
                                        {col.label}
                                    </SortableHeader>
                                );
                            })}
                        </SortableContext>

                        {/* Ghost column header cell */}
                        <div data-col-id="ghost" className="flex-1 self-stretch" />

                        {(rightHeaderSlot || rightCellSlot) && (
                            <div data-col-id="right_slot" className={cn("relative px-4 py-2 flex items-center justify-end font-semibold sticky right-0 z-40 group/header", 
                                isDark ? "bg-[#141414]" : "bg-[#fafafa]")}
                                style={{ width: colWidths.right_slot }}
                            >
                                {columnOrder.length > 0 && (
                                    <div 
                                        onMouseDown={(e) => handleResizeStart('ghost', 'right_slot', e, 'right-only')} 
                                        className={cn(
                                            "absolute -left-[12px] top-0 bottom-0 w-[24px] flex items-center justify-center cursor-ew-resize z-50 group/resizer transition-colors",
                                            "hover:bg-primary/5 active:bg-primary/10"
                                        )}
                                    >
                                        <div className="w-[2px] h-5 rounded-full opacity-0 group-hover/resizer:opacity-100 transition-opacity bg-primary" />
                                    </div>
                                )}
                                {rightHeaderSlot || ''}
                            </div>
                        )}
                    </div>
                </DndContext>

                {isLoading ? renderShimmer() : (
                    <div className="flex flex-col">
                        <AnimatePresence mode="popLayout">
                            {data.map((item, i) => {
                                const isSelected = selectedIds.has(item.id);
                                const isLastRow = i === data.length - 1 && !afterRows;
                                const renderRow = () => (
                                    <>
                                        <div className={cn("flex items-center justify-center px-0 py-1.5 self-stretch", isDark ? "border-[#1f1f1f]" : "border-[#f0f0f0]") } onClick={(e) => { e.stopPropagation(); onToggleRow(item.id, e); }}>
                                            <Chk checked={isSelected} isDark={isDark} />
                                        </div>
                                        {columnOrder.map((colId, idx) => {
                                            const col = columns.find(c => c.id === colId);
                                            if (!col) return null;
                                            const isLastCol = idx === columnOrder.length - 1 && !rightHeaderSlot && !rightCellSlot;
                                            return (
                                                <div key={colId} className="min-w-0 self-stretch flex items-center h-full">
                                                    {col.cell(item)}
                                                </div>
                                            );
                                            })}
                                            {/* Ghost column cell */}
                                            <div className="flex-1 self-stretch" />
                                            
                                            {(rightHeaderSlot || rightCellSlot) && (
                                            <div className={cn(
                                                "px-3 py-1.5 self-stretch flex items-center justify-end sticky right-0 z-10 transition-colors",
                                                isSelected 
                                                    ? (isDark ? "bg-[#171d2b]" : "bg-[#f0f7ff]")
                                                    : (isDark ? "bg-[#141414] group-hover:bg-[#1a1a1a]" : "bg-white group-hover:bg-[#fafafa]")
                                            )}
                                            style={{ width: colWidths.right_slot }} 
                                            onClick={e => e.stopPropagation()}>
                                                {rightCellSlot ? rightCellSlot(item) : <div />}
                                            </div>
                                        )}
                                    </>
                                );

                                if (rowMenuItems) {
                                    return (
                                        <ContextMenuRow 
                                            key={item.id}
                                            items={rowMenuItems(item)}
                                            isDark={isDark}
                                            onRowClick={onRowClick ? () => onRowClick(item) : undefined}
                                            component={motion.div}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className={cn("grid w-full px-0 text-[12px] cursor-pointer group transition-colors",
                                                !isLastRow && (isDark ? "border-b border-[#1f1f1f]" : "border-b border-[#f0f0f0]"),
                                                isDark ? "hover:bg-white/[0.025]" : "bg-white hover:bg-[#fafafa]",
                                                isSelected && (isDark ? "bg-blue-900/10" : "bg-blue-50/40"))}
                                            style={{ gridTemplateColumns: gridTemplate }}
                                        >
                                            {renderRow()}
                                        </ContextMenuRow>
                                    );
                                }

                                return (
                                    <motion.div
                                        key={item.id}
                                        onClick={onRowClick ? () => onRowClick(item) : undefined}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className={cn("grid w-full px-0 text-[12px] cursor-pointer group transition-colors",
                                            !isLastRow && (isDark ? "border-b border-[#1f1f1f]" : "border-b border-[#f0f0f0]"),
                                            isDark ? "hover:bg-white/[0.025]" : "bg-white hover:bg-[#fafafa]",
                                            isSelected && (isDark ? "bg-blue-900/10" : "bg-blue-50/40"))}
                                        style={{ gridTemplateColumns: gridTemplate }}
                                    >
                                        {renderRow()}
                                    </motion.div>
                                );
                            })}
                            {afterRows}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
