"use client";

import React from 'react';
import { ChevronLeft, ChevronRight, Settings, LayoutGrid, GripVertical, RotateCcw, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Tooltip } from '@/components/ui/Tooltip';
import { useUIStore } from '@/store/useUIStore';
import { useMenuStore, ICON_MAP, NavItem } from '@/store/useMenuStore';
import WorkspaceSwitcher from '@/components/settings/WorkspaceSwitcher';
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

function SortableNavItem({ item, isExpanded, isActive, isEditing, onUpdate }: { 
    item: NavItem; 
    isExpanded: boolean; 
    isActive: boolean;
    isEditing: boolean;
    onUpdate: (id: string, label: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id, disabled: !isEditing });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const Icon = ICON_MAP[item.icon] || LayoutGrid;

    if (isEditing) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className={cn(
                    "w-full h-8 flex items-center transition-all relative group",
                    isDragging ? "bg-white/[0.05] z-50 rounded-lg" : "hover:bg-white/[0.02] rounded-lg",
                    isExpanded ? "px-1.5" : "justify-center"
                )}
            >
                {isExpanded && (
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-white/20 hover:text-white/60 shrink-0">
                        <GripVertical size={10} />
                    </div>
                )}
                <Icon size={14} className={cn("shrink-0 opacity-40 group-hover:opacity-100 transition-opacity", isExpanded ? "mr-2.5" : "")} />
                {isExpanded && (
                    <input 
                        autoFocus
                        type="text"
                        value={item.label}
                        onChange={(e) => onUpdate(item.id, e.target.value)}
                        className="flex-1 bg-transparent border-none text-[12px] font-medium text-white/80 focus:text-white focus:outline-none min-w-0"
                        onClick={e => e.stopPropagation()}
                    />
                )}
            </div>
        );
    }

    const content = (
        <Link
            ref={setNodeRef}
            style={style}
            href={item.href}
            className={cn(
                "w-full h-9 rounded-xl flex items-center transition-colors relative",
                isExpanded ? "justify-start gap-3 px-3" : "justify-center px-1.5",
                isActive
                    ? "text-white"
                    : "text-white/30 hover:text-white hover:bg-white/[0.03]"
            )}
        >
            <Icon size={16} strokeWidth={1.75} className={cn("shrink-0 transition-transform", isActive && "scale-110")} />
            <div className={cn(
                "transition-all duration-300 overflow-hidden whitespace-nowrap",
                isExpanded ? "max-w-[120px] opacity-100" : "max-w-0 opacity-0"
            )}>
                <span className="text-[13px] font-medium">
                    {item.label}
                </span>
            </div>
        </Link>
    );

    return content;
}

export default function LeftSystemMenu() {
    const pathname = usePathname();
    const { isLeftMenuExpanded, toggleLeftMenu, theme } = useUIStore();
    const isDark = theme === 'dark';
    const { navItems, fetchMenu, updateMenu } = useMenuStore();
    const [isEditing, setIsEditing] = React.useState(false);
    const [tempItems, setTempItems] = React.useState<NavItem[]>([]);

    React.useEffect(() => {
        fetchMenu();
    }, [fetchMenu]);

    React.useEffect(() => {
        if (isEditing) setTempItems([...navItems]);
    }, [isEditing, navItems]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setTempItems((prev) => {
                const oldIndex = prev.findIndex((i) => i.id === active.id);
                const newIndex = prev.findIndex((i) => i.id === over.id);
                return arrayMove(prev, oldIndex, newIndex);
            });
        }
    };

    const handleUpdateLabel = (id: string, label: string) => {
        setTempItems(prev => prev.map(i => i.id === id ? { ...i, label } : i));
    };

    const handleSave = async () => {
        await updateMenu(tempItems);
        setIsEditing(false);
    };

    const handleReset = () => {
        setTempItems([...navItems]);
    };

    return (
        <nav className={cn(
            "h-full flex flex-col items-center shrink-0 transition-all duration-300 rounded-2xl z-10 overflow-hidden border border-white/5",
            isDark ? "bg-[#141414] text-white" : "bg-[#1c1c1e] text-white",
            isLeftMenuExpanded ? "w-[160px] px-2 shadow-xl shadow-black/10" : "w-[44px]"
        )}>

            {/* Workspace logo & Switcher */}
            <div className="flex w-full shrink-0">
                <WorkspaceSwitcher />
            </div>

            {/* Nav icons */}
            <div className="flex flex-col items-center gap-1.5 pt-2 flex-1 w-full overflow-hidden">
                <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext 
                        items={(isEditing ? tempItems : navItems).map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {(isEditing ? tempItems : navItems).map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                                <SortableNavItem 
                                    key={item.id} 
                                    item={item} 
                                    isExpanded={isLeftMenuExpanded} 
                                    isActive={isActive}
                                    isEditing={isEditing}
                                    onUpdate={handleUpdateLabel}
                                />
                            );
                        })}
                    </SortableContext>
                </DndContext>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col items-center pb-2.5 w-full gap-2 mt-auto">
                {isEditing ? (
                    <div className={cn("flex flex-col w-full gap-1.5 items-center px-1.5", !isLeftMenuExpanded && "hidden")}>
                        <button 
                            onClick={handleSave} 
                            className="w-full h-8 flex items-center justify-center gap-2 rounded-xl bg-white text-black text-[11px] font-bold hover:bg-white/90 active:scale-[0.98] transition-all"
                        >
                            <Check size={14} strokeWidth={3} /> Done
                        </button>
                        <div className="flex w-full gap-1.5">
                            <button 
                                onClick={handleReset} 
                                title="Reset to default"
                                className="flex-1 h-8 flex items-center justify-center rounded-xl bg-white/5 text-[#6b6b6b] hover:text-white hover:bg-white/10 transition-all active:scale-95"
                            >
                                <RotateCcw size={13} />
                            </button>
                            <button 
                                onClick={() => setIsEditing(false)} 
                                title="Cancel"
                                className="flex-1 h-8 flex items-center justify-center rounded-xl bg-white/5 text-[#6b6b6b] hover:text-white hover:bg-white/10 transition-all active:scale-95"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={() => {
                                setIsEditing(true);
                                if (!isLeftMenuExpanded) toggleLeftMenu();
                            }}
                            className="w-9 h-8 rounded-xl flex items-center justify-center transition-colors text-white/30 hover:text-white hover:bg-white/[0.03]"
                            title="Edit Navigation"
                        >
                            <Settings size={14} strokeWidth={2} />
                        </button>

                        <button
                            onClick={toggleLeftMenu}
                            className="w-9 h-8 rounded-xl flex items-center justify-center transition-colors text-white/30 hover:text-white hover:bg-white/[0.03]"
                        >
                            {isLeftMenuExpanded
                                ? <ChevronLeft size={14} strokeWidth={2} />
                                : <ChevronRight size={14} strokeWidth={2} />}
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}
