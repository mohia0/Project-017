"use client";

import React from 'react';
import { ChevronLeft, ChevronRight, Settings, LayoutGrid, GripVertical, RotateCcw, Check, X, Eye, EyeOff } from 'lucide-react';
import { cn, isDarkColor } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Tooltip } from '@/components/ui/Tooltip';
import { useUIStore } from '@/store/useUIStore';
import { useMenuStore, ICON_MAP, NavItem } from '@/store/useMenuStore';
import { useSettingsStore } from '@/store/useSettingsStore';
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

function SortableNavItem({ item, isExpanded, isActive, isEditing, onUpdate, onToggleVisibility, isLightBg }: { 
    item: NavItem; 
    isExpanded: boolean; 
    isActive: boolean;
    isEditing: boolean;
    onUpdate: (id: string, label: string) => void;
    onToggleVisibility: (id: string) => void;
    isLightBg?: boolean;
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
                        <div {...attributes} {...listeners} className={cn(
                            "cursor-grab active:cursor-grabbing w-5 h-5 flex items-center justify-center shrink-0 rounded-[6px] transition-colors",
                            isLightBg 
                                ? "text-black/20 hover:text-black/60 bg-black/5 hover:bg-black/10" 
                                : "text-white/20 hover:text-white/60 bg-white/5 hover:bg-white/10"
                        )}>
                            <GripVertical size={10} />
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleVisibility(item.id); }}
                            className={cn(
                                "w-5 h-5 flex items-center justify-center transition-colors rounded-[6px]",
                                isLightBg 
                                    ? (item.isHidden ? "text-orange-600/60 bg-black/5 hover:bg-black/10" : "text-black/20 bg-black/5 hover:bg-black/10")
                                    : (item.isHidden ? "text-orange-400/60 bg-white/5 hover:bg-white/10" : "text-white/20 bg-white/5 hover:bg-white/10")
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
                        className={cn(
                            "flex-1 bg-transparent border-none text-[12px] font-medium focus:outline-none min-w-0",
                            isLightBg 
                                ? "text-black/80 focus:text-black" 
                                : "text-white/80 focus:text-white"
                        )}
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
                    ? (isLightBg ? "text-black" : "text-white")
                    : (isLightBg ? "text-black/30 hover:text-black" : "text-white/30 hover:text-white"),
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

const NavIconButton = ({ children, onClick, title, className, isLightBg }: { children: React.ReactNode, onClick?: () => void, title?: string, className?: string, isLightBg?: boolean }) => (
    <button
        onClick={onClick}
        title={title}
        className={cn(
            "w-9 h-8 rounded-xl flex items-center justify-center transition-colors",
            isLightBg ? "text-black/30 hover:text-black hover:bg-black/5" : "text-white/30 hover:text-white hover:bg-white/5",
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
    const { branding } = useSettingsStore();
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

    const applyBrandColor = branding?.apply_color_to_sidebar;
    const isLightBg = applyBrandColor && branding?.primary_color ? !isDarkColor(branding.primary_color) : false;

    return (
        <nav 
            style={applyBrandColor ? { backgroundColor: 'var(--brand-primary)' } : undefined}
            className={cn(
            "h-full flex flex-col items-center shrink-0 transition-all duration-300 rounded-2xl z-10 overflow-hidden border",
            applyBrandColor ? "border-black/5" : "border-white/5",
            !applyBrandColor && (isDark ? "bg-[#141414]" : "bg-[#1c1c1e]"),
            isLightBg ? "text-black" : "text-white",
            isLeftMenuExpanded ? (isEditing ? "w-[200px] shadow-xl shadow-black/10" : "w-[160px] shadow-xl shadow-black/10") : "w-[44px]"
        )}>

            {/* Workspace logo & Switcher */}
            <div className="flex w-full shrink-0">
                <WorkspaceSwitcher isLightSidebar={isLightBg} />
            </div>

            {/* Nav icons */}
            <div className={cn(
                "flex flex-col items-center gap-1.5 pt-4 flex-1 w-full overflow-hidden border-t",
                isLightBg ? "border-black/5" : "border-white/5",
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
                                    isLightBg={isLightBg}
                                />
                            );
                        })}
                    </SortableContext>
                </DndContext>
            </div>

            {/* Bottom Actions */}
            <div className={cn(
                "flex flex-col items-center pb-2.5 pt-4 w-full gap-2 mt-auto border-t",
                isLightBg ? "border-black/5" : "border-white/5",
                isLeftMenuExpanded ? (isEditing ? "px-3" : "px-2") : ""
            )}>
                {isEditing ? (
                    <div className={cn("flex flex-col w-full gap-1.5 items-center px-1.5", !isLeftMenuExpanded && "hidden")}>
                        <button 
                            onClick={handleSave} 
                            className={cn(
                                "w-full h-8 flex items-center justify-center gap-2 rounded-xl text-[11px] font-bold active:scale-[0.98] transition-all",
                                isLightBg ? "bg-black text-white hover:bg-black/90" : "bg-white text-black hover:bg-white/90"
                            )}
                        >
                            <Check size={14} strokeWidth={3} /> Done
                        </button>
                        <div className="flex w-full gap-1.5">
                            <button 
                                onClick={handleReset} 
                                title="Reset to default"
                                className={cn(
                                    "flex-1 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95",
                                    isLightBg ? "bg-black/5 text-black/30 hover:text-black hover:bg-black/10" : "bg-white/5 text-white/30 hover:text-white hover:bg-white/10"
                                )}
                            >
                                <RotateCcw size={13} />
                            </button>
                            <button 
                                onClick={() => setIsEditing(false)} 
                                title="Cancel"
                                className={cn(
                                    "flex-1 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95",
                                    isLightBg ? "bg-black/5 text-black/30 hover:text-black hover:bg-black/10" : "bg-white/5 text-white/30 hover:text-white hover:bg-white/10"
                                )}
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
                            isLightBg={isLightBg}
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

                        <NavIconButton onClick={toggleLeftMenu} isLightBg={isLightBg}>
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
