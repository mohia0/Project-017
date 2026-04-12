"use client";

import React from 'react';
import { ChevronLeft, ChevronRight, Settings, LayoutGrid, GripVertical, RotateCcw, Check, X, Eye, EyeOff } from 'lucide-react';
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
import { motion, AnimatePresence } from 'framer-motion';

function SortableNavItem({ item, isExpanded, isActive, isEditing, onUpdate, onToggleVisibility }: { 
    item: NavItem; 
    isExpanded: boolean; 
    isActive: boolean;
    isEditing: boolean;
    onUpdate: (id: string, label: string) => void;
    onToggleVisibility: (id: string) => void;
}) {
    const [isHovered, setIsHovered] = React.useState(false);
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
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={cn(
                    "w-full h-8 flex items-center transition-all relative group",
                    isDragging ? "bg-white/[0.05] z-50 rounded-lg" : "rounded-lg",
                    isExpanded ? "pl-1 pr-1.5" : "justify-center"
                )}
            >
                {isExpanded && (
                    <div className="flex items-center gap-1.5 shrink-0 -ml-1.5">
                        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing w-5 h-5 flex items-center justify-center text-white/20 hover:text-white/60 shrink-0 bg-white/5 rounded-[6px] hover:bg-white/10 transition-colors">
                            <GripVertical size={10} />
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleVisibility(item.id); }}
                            className={cn(
                                "w-5 h-5 flex items-center justify-center transition-colors bg-white/5 rounded-[6px] hover:bg-white/10",
                                item.isHidden ? "text-orange-400/60" : "text-white/20"
                            )}
                            title={item.isHidden ? "Show in Menu" : "Hide in Menu"}
                        >
                            {item.isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
                        </button>
                    </div>
                )}
                <div className={cn(isExpanded && "ml-4")}>
                    <motion.div
                        animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
                        transition={{ 
                            type: "spring", 
                            stiffness: 400, 
                            damping: 15,
                        }}
                        className={cn(item.isHidden && "opacity-30")}
                    >
                        <Icon size={14} className={cn("shrink-0 opacity-40 group-hover:opacity-100 transition-opacity", isExpanded ? "mr-2.5" : "")} />
                    </motion.div>
                </div>
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

    const getIconAnimation = () => {
        return { 
            scale: isActive ? 1.1 : isHovered ? 1.1 : 1, 
            opacity: isHovered ? [1, 0.85, 1] : 1 
        };
    };

    const content = (
        <Link
            ref={setNodeRef}
            style={style}
            href={item.href}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "w-full h-9 rounded-xl flex items-center transition-colors relative",
                isExpanded ? (isEditing ? "justify-start gap-4 px-4" : "justify-start gap-3 px-3") : "justify-center px-1.5",
                isActive
                    ? "text-white"
                    : "text-white/30 hover:text-white",
                item.isHidden && "hidden"
            )}
        >
            <motion.div
                animate={getIconAnimation()}
                transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 15,
                    // Use keyframes for properties that use array sequences
                    rotate: { type: "keyframes", duration: 0.3 },
                    x: { type: "keyframes", duration: 0.3 },
                    y: { type: "keyframes", duration: 0.3 },
                    opacity: { type: "keyframes", duration: 0.4 }
                }}
                className="shrink-0 flex items-center justify-center"
            >
                <Icon size={16} strokeWidth={1.75} className="shrink-0" />
            </motion.div>
            <motion.div 
                animate={isHovered && isExpanded ? { x: 2 } : { x: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={cn(
                    "transition-all duration-300 overflow-hidden whitespace-nowrap",
                    isExpanded ? (isEditing ? "max-w-[150px] opacity-100" : "max-w-[120px] opacity-100") : "max-w-0 opacity-0"
                )}
            >
                <span className="text-[13px] font-medium">
                    {item.label}
                </span>
            </motion.div>
        </Link>
    );

    return content;
}

const NavIconButton = ({ children, onClick, title, className }: { children: React.ReactNode, onClick?: () => void, title?: string, className?: string }) => (
    <button
        onClick={onClick}
        title={title}
        className={cn(
            "w-9 h-8 rounded-xl flex items-center justify-center transition-colors text-white/30 hover:text-white",
            className
        )}
    >
        {children}
    </button>
);

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
    
    const handleToggleVisibility = (id: string) => {
        setTempItems(prev => prev.map(i => i.id === id ? { ...i, isHidden: !i.isHidden } : i));
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
            isLeftMenuExpanded ? (isEditing ? "w-[200px] shadow-xl shadow-black/10" : "w-[160px] shadow-xl shadow-black/10") : "w-[44px]"
        )}>

            {/* Workspace logo & Switcher */}
            <div className="flex w-full shrink-0">
                <WorkspaceSwitcher />
            </div>

            {/* Nav icons */}
            <div className={cn(
                "flex flex-col items-center gap-1.5 pt-4 flex-1 w-full overflow-hidden border-t border-white/5",
                isLeftMenuExpanded ? (isEditing ? "px-3" : "px-2") : ""
            )}>
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
                                    onToggleVisibility={handleToggleVisibility}
                                />
                            );
                        })}
                    </SortableContext>
                </DndContext>
            </div>

            {/* Bottom Actions */}
            <div className={cn(
                "flex flex-col items-center pb-2.5 pt-4 w-full gap-2 mt-auto border-t border-white/5",
                isLeftMenuExpanded ? (isEditing ? "px-3" : "px-2") : ""
            )}>
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
                        <NavIconButton
                            onClick={() => {
                                setIsEditing(true);
                                if (!isLeftMenuExpanded) toggleLeftMenu();
                            }}
                            title="Edit Navigation"
                        >
                            <motion.div 
                                whileHover={{ scale: 1.1, opacity: [1, 0.85, 1] }} 
                                transition={{ 
                                    scale: { type: "spring", stiffness: 400, damping: 15 },
                                    opacity: { type: "keyframes", duration: 0.4 }
                                }}
                            >
                                <Settings size={14} strokeWidth={2} />
                            </motion.div>
                        </NavIconButton>

                        <NavIconButton onClick={toggleLeftMenu}>
                            <motion.div 
                                whileHover={{ scale: 1.1, opacity: [1, 0.85, 1] }}
                                transition={{ 
                                    scale: { type: "spring", stiffness: 400, damping: 15 },
                                    opacity: { type: "keyframes", duration: 0.4 }
                                }}
                            >
                                {isLeftMenuExpanded
                                    ? <ChevronLeft size={14} strokeWidth={2} />
                                    : <ChevronRight size={14} strokeWidth={2} />}
                            </motion.div>
                        </NavIconButton>
                    </>
                )}
            </div>
        </nav>
    );
}
