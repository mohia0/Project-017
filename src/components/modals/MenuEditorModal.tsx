"use client";

import React, { useState, useEffect } from 'react';
import { 
    X, GripVertical, Check, Save, RotateCcw,
    LayoutGrid, Users, FileText, Receipt, Folder
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMenuStore, NavItem, ICON_MAP } from '@/store/useMenuStore';
import {
    DndContext, 
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

function SortableItem({ item, onUpdate }: { item: NavItem; onUpdate: (id: string, label: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const Icon = ICON_MAP[item.icon] || LayoutGrid;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-3 p-2 rounded-lg border transition-all",
                isDragging 
                    ? "z-50 bg-[#2c2c2e] border-blue-500/50 shadow-xl opacity-80" 
                    : "bg-[#1c1c1e] border-white/5 hover:border-white/10"
            )}
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 opacity-30 hover:opacity-100">
                <GripVertical size={14} />
            </div>
            
            <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-white/60" />
            </div>

            <input 
                type="text"
                value={item.label}
                onChange={(e) => onUpdate(item.id, e.target.value)}
                className="flex-1 bg-transparent border-none text-[13px] font-medium text-white focus:outline-none"
            />
        </div>
    );
}

export function MenuEditorModal({ isOpen, onClose }: Props) {
    const { navItems, updateMenu } = useMenuStore();
    const [items, setItems] = useState<NavItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setItems([...navItems]);
        }
    }, [isOpen, navItems]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setItems((prev) => {
                const oldIndex = prev.findIndex((i) => i.id === active.id);
                const newIndex = prev.findIndex((i) => i.id === over.id);
                return arrayMove(prev, oldIndex, newIndex);
            });
        }
    };

    const handleUpdateLabel = (id: string, label: string) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, label } : i));
    };

    const handleSave = async () => {
        setIsSaving(true);
        await updateMenu(items);
        setIsSaving(false);
        onClose();
    };

    const handleReset = () => {
        setItems([...navItems]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-md bg-[#141414] border border-[#2e2e2e] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#2e2e2e]">
                    <div>
                        <h3 className="text-[15px] font-semibold text-white">Edit Menu</h3>
                        <p className="text-[11px] text-[#6b6b6b] mt-0.5">Reorder and rename sidebar tools</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors opacity-50 hover:opacity-100">
                        <X size={16} className="text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext 
                            items={items.map(i => i.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="flex flex-col gap-2">
                                {items.map((item) => (
                                    <SortableItem key={item.id} item={item} onUpdate={handleUpdateLabel} />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-[#1a1a1a] border-t border-[#2e2e2e] flex items-center justify-between gap-3">
                    <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[#6b6b6b] hover:text-white transition-colors"
                    >
                        <RotateCcw size={14} />
                        Reset
                    </button>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onClose}
                            className="px-4 py-1.5 text-[12px] font-medium text-[#6b6b6b] hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 text-[12px] font-semibold rounded-lg transition-all",
                                "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 disabled:opacity-50"
                            )}
                        >
                            {isSaving ? <span className="animate-spin text-sm">...</span> : <Save size={14} />}
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
