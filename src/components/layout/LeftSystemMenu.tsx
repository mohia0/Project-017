"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Settings, LayoutGrid, GripVertical, RotateCcw, Check, X, Eye, EyeOff, Plus, Trash } from 'lucide-react';
import { IconPicker } from '@/components/ui/IconPicker';
import { cn, isDarkColor } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Tooltip } from '@/components/ui/Tooltip';
import { useUIStore } from '@/store/useUIStore';
import { useMenuStore, ICON_MAP, NavItem, DEFAULT_NAV } from '@/store/useMenuStore';
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

function SortableNavItem({ item, isExpanded, isActive, isEditing, onUpdate, onToggleVisibility, onChangeIcon, onUpdateHref, onDelete, isLightBg, isBranded }: { 
    item: NavItem; 
    isExpanded: boolean; 
    isActive: boolean;
    isEditing: boolean;
    onUpdate: (id: string, label: string) => void;
    onToggleVisibility: (id: string) => void;
    onChangeIcon: (id: string, icon: string) => void;
    onUpdateHref?: (id: string, href: string) => void;
    onDelete?: (id: string) => void;
    isLightBg?: boolean;
    isBranded?: boolean;
}) {
    const [isHovered, setIsHovered] = React.useState(false);
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [pickerAnchor, setPickerAnchor] = React.useState<DOMRect | null>(null);
    const iconBtnRef = React.useRef<HTMLDivElement>(null);
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

    const openPicker = (e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = iconBtnRef.current?.getBoundingClientRect() ?? null;
        setPickerAnchor(rect);
        setPickerOpen(true);
    };

    if (isEditing) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={cn(
                    "w-full flex transition-all relative group rounded-lg",
                    item.isCustomLink ? "flex-col pt-1 pb-1.5 gap-0" : "flex-row items-center h-8",
                    isDragging ? "bg-white/[0.05] z-50" : "",
                    isExpanded ? "pl-1 pr-1.5" : "justify-center"
                )}
            >
                {/* ── Top row: drag + visibility + icon + label ── */}
                <div className="flex items-center w-full">
                    {isExpanded && (
                        <div className="flex items-center gap-1 shrink-0 -ml-1.5">
                            <div {...attributes} {...listeners} className={cn(
                                "cursor-grab active:cursor-grabbing w-5 h-5 flex items-center justify-center shrink-0 rounded-[6px] transition-colors",
                                isBranded
                                    ? (isLightBg ? "text-black/40 hover:text-black bg-black/5 hover:bg-black/10" : "text-white/40 hover:text-white bg-white/5 hover:bg-white/10")
                                    : (isLightBg ? "text-black/20 hover:text-black/60 bg-black/5 hover:bg-black/10" : "text-white/20 hover:text-white/60 bg-white/5 hover:bg-white/10")
                            )}>
                                <GripVertical size={10} />
                            </div>
                            
                            {/* Hide toggle – only show for nav items / custom links */}
                            {!item.isCustomLink ? (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(item.id); }}
                                    className={cn(
                                        "w-5 h-5 flex items-center justify-center transition-colors rounded-[6px]",
                                        isBranded
                                            ? (item.isHidden 
                                                ? (isLightBg ? "text-orange-600 bg-black/5 hover:bg-black/10" : "text-orange-400 bg-white/5 hover:bg-white/10")
                                                : (isLightBg ? "text-black/40 hover:text-black bg-black/5 hover:bg-black/10" : "text-white/40 hover:text-white bg-white/5 hover:bg-white/10"))
                                            : (isLightBg 
                                                ? (item.isHidden ? "text-orange-600/60 bg-black/5 hover:bg-black/10" : "text-black/20 bg-black/5 hover:bg-black/10")
                                                : (item.isHidden ? "text-orange-400/60 bg-white/5 hover:bg-white/10" : "text-white/20 bg-white/5 hover:bg-white/10"))
                                    )}
                                    title={item.isHidden ? "Show in Menu" : "Hide in Menu"}
                                >
                                    {item.isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
                                </button>
                            ) : (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(item.id); }}
                                    className={cn(
                                        "w-5 h-5 flex items-center justify-center transition-colors rounded-[6px]",
                                        item.isHidden 
                                            ? (isLightBg ? "text-orange-600/60 bg-black/5 hover:bg-black/10" : "text-orange-400/60 bg-white/5 hover:bg-white/10")
                                            : (isLightBg ? "text-black/20 bg-black/5 hover:bg-black/10" : "text-white/20 bg-white/5 hover:bg-white/10")
                                    )}
                                    title={item.isHidden ? "Show" : "Hide"}
                                >
                                    {item.isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Icon – click to open picker */}
                    <div 
                        ref={iconBtnRef}
                        onClick={openPicker}
                        className="cursor-pointer ml-4 shrink-0"
                        title="Change icon"
                    >
                        <Icon size={14} className={cn(
                            "shrink-0 transition-opacity hover:opacity-80", 
                            isBranded ? "opacity-100" : "opacity-40 group-hover:opacity-100",
                        )} />
                    </div>

                    {/* Icon picker portal */}
                    {pickerOpen && typeof document !== 'undefined' && createPortal(
                        <IconPicker
                            value={item.icon}
                            onChange={(iconName) => onChangeIcon(item.id, iconName)}
                            onClose={() => setPickerOpen(false)}
                            anchorRect={pickerAnchor}
                        />,
                        document.body
                    )}

                    {isExpanded && (
                        <input 
                            type="text"
                            value={item.label}
                            onChange={(e) => onUpdate(item.id, e.target.value)}
                            className={cn(
                                "flex-1 bg-transparent border-none text-[12px] font-medium focus:outline-none min-w-0 ml-2",
                                isLightBg 
                                    ? "text-black/80 focus:text-black" 
                                    : "text-white/80 focus:text-white"
                            )}
                            onClick={e => e.stopPropagation()}
                        />
                    )}
                </div>

                {/* ── URL row for custom links only ── */}
                {isExpanded && item.isCustomLink && (
                    <div className="flex items-center w-full mt-0.5">
                        <div className="flex items-center gap-1 shrink-0 -ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            {/* Deleted button moved here under the grip/hide buttons */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete?.(item.id); }}
                                className={cn(
                                    "w-5 h-5 flex items-center justify-center shrink-0 rounded-[6px] transition-colors",
                                    isLightBg ? "text-red-500/60 hover:text-red-600 hover:bg-black/10" : "text-red-400/60 hover:text-red-400 hover:bg-white/10"
                                )}
                                title="Delete Link"
                            >
                                <Trash size={10} />
                            </button>
                        </div>
                        <div className="flex items-center ml-[22px] mr-1 flex-1">
                            <input 
                                type="text"
                                placeholder="https://"
                                value={item.href}
                                onChange={(e) => onUpdateHref?.(item.id, e.target.value)}
                                className={cn(
                                    "flex-1 bg-transparent border-none text-[10px] focus:outline-none min-w-0 font-medium",
                                    isLightBg 
                                        ? "text-black/40 placeholder:text-black/25 focus:text-black/70" 
                                        : "text-white/35 placeholder:text-white/20 focus:text-white/60"
                                )}
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    </div>
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

    const isExternal = item.href.startsWith('http');
    const content = isExternal ? (
        <a
            ref={setNodeRef as any}
            style={style}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "w-full h-9 rounded-xl flex items-center transition-colors relative",
                isExpanded ? (isEditing ? "justify-start gap-3 px-3" : "justify-start gap-3 px-3") : "justify-center px-1.5",
                isActive
                    ? (isLightBg ? "text-black" : "text-white")
                    : isBranded 
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
                    "flex items-center transition-all duration-300 overflow-hidden whitespace-nowrap",
                    isExpanded ? (isEditing ? "max-w-[150px] opacity-100" : "max-w-[120px] opacity-100") : "max-w-0 opacity-0"
                )}
            >
                <span className="text-[13px] font-medium tracking-tight">
                    {item.label}
                </span>
            </motion.div>
        </a>
    ) : (
        <Link
            ref={setNodeRef}
            style={style}
            href={item.href}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "w-full h-9 rounded-xl flex items-center transition-colors relative",
                isExpanded ? (isEditing ? "justify-start gap-3 px-3" : "justify-start gap-3 px-3") : "justify-center px-1.5",
                isActive
                    ? (isLightBg ? "text-black" : "text-white")
                    : isBranded 
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
                    "flex items-center transition-all duration-300 overflow-hidden whitespace-nowrap",
                    isExpanded ? (isEditing ? "max-w-[150px] opacity-100" : "max-w-[120px] opacity-100") : "max-w-0 opacity-0"
                )}
            >
                <span className="text-[13px] font-medium tracking-tight">
                    {item.label}
                </span>
            </motion.div>
        </Link>
    );

    return content;
}

const NavIconButton = ({ children, onClick, title, className, isLightBg, isBranded }: { 
    children: React.ReactNode, 
    onClick?: () => void, 
    title?: string, 
    className?: string, 
    isLightBg?: boolean,
    isBranded?: boolean
}) => (
    <button
        onClick={onClick}
        title={title}
        className={cn(
            "w-9 h-8 rounded-xl flex items-center justify-center transition-colors",
            isBranded
                ? (isLightBg ? "text-black hover:bg-black/5" : "text-white hover:bg-white/5")
                : (isLightBg ? "text-black/30 hover:text-black hover:bg-black/5" : "text-white/30 hover:text-white hover:bg-white/5"),
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
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
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

    const handleUpdateHref = (id: string, href: string) => {
        setTempItems(prev => prev.map(i => i.id === id ? { ...i, href } : i));
    };

    const handleChangeIcon = (id: string, icon: string) => {
        setTempItems(prev => prev.map(i => i.id === id ? { ...i, icon } : i));
    };
    
    const handleToggleVisibility = (id: string) => {
        setTempItems(prev => prev.map(i => i.id === id ? { ...i, isHidden: !i.isHidden } : i));
    };

    const handleDeleteLink = (id: string) => {
        setTempItems(prev => prev.filter(i => i.id !== id));
    };

    const handleAddLink = () => {
        const newId = `custom_${Date.now()}`;
        setTempItems(prev => [
            ...prev,
            {
                id: newId,
                href: '',
                icon: 'Link',
                label: 'New Link',
                isCustomLink: true
            }
        ]);
    };

    const handleSave = async () => {
        await updateMenu(tempItems);
        setIsEditing(false);
    };

    const handleReset = () => {
        setTempItems(prev => prev.map(item => {
            const def = DEFAULT_NAV.find(d => d.id === item.id);
            if (def) {
                return { 
                    ...item, 
                    label: def.label, 
                    icon: def.icon,
                    isHidden: false
                };
            }
            return item;
        }));
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
                <WorkspaceSwitcher isLightSidebar={isLightBg} isBranded={applyBrandColor} />
            </div>

            {/* Nav icons */}
            <div className={cn(
                "flex flex-col items-center gap-1.5 pt-4 flex-1 w-full overflow-y-auto scrollbar-none border-t pb-2",
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
                                    onChangeIcon={handleChangeIcon}
                                    onUpdateHref={handleUpdateHref}
                                    onDelete={handleDeleteLink}
                                    isLightBg={isLightBg}
                                    isBranded={applyBrandColor}
                                />
                            );
                        })}
                    </SortableContext>
                </DndContext>
                
                {/* Add Link Button */}
                {isEditing && isLeftMenuExpanded && (
                    <button 
                        onClick={handleAddLink}
                        className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all group shrink-0 mt-1",
                            applyBrandColor
                                ? (isLightBg ? "text-black/30 hover:text-black hover:bg-black/5" : "text-white/25 hover:text-white hover:bg-white/5")
                                : (isLightBg ? "text-black/30 hover:text-black hover:bg-black/5" : "text-white/25 hover:text-white hover:bg-white/5")
                        )}
                    >
                        <Plus size={11} className="shrink-0" />
                        <span className="text-[11px] font-medium">Add link</span>
                    </button>
                )}
            </div>

            {/* Bottom Actions */}
            <div className={cn(
                "flex flex-col items-center pb-2.5 pt-4 w-full gap-2 mt-auto border-t",
                isLightBg ? "border-black/5" : "border-white/5",
                isLeftMenuExpanded ? (isEditing ? "px-3" : "px-2") : ""
            )}>
                {isEditing ? (
                    <div className={cn("flex w-full items-center gap-1 px-1", !isLeftMenuExpanded && "hidden")}>
                        {/* Done – filled */}
                        <button 
                            onClick={handleSave} 
                            className={cn(
                                "flex-1 h-7 flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold active:scale-[0.97] transition-all",
                                isLightBg ? "bg-black/90 text-white hover:bg-black" : "bg-white/90 text-black hover:bg-white"
                            )}
                        >
                            <Check size={11} strokeWidth={2.5} /> Done
                        </button>
                        {/* Reset */}
                        <button 
                            onClick={handleReset} 
                            title="Reset"
                            className={cn(
                                "w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-95",
                                isLightBg ? "text-black/30 hover:text-black hover:bg-black/8" : "text-white/30 hover:text-white hover:bg-white/8"
                            )}
                        >
                            <RotateCcw size={11} />
                        </button>
                        {/* Cancel */}
                        <button 
                            onClick={() => setIsEditing(false)} 
                            title="Cancel"
                            className={cn(
                                "w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-95",
                                isLightBg ? "text-black/30 hover:text-black hover:bg-black/8" : "text-white/30 hover:text-white hover:bg-white/8"
                            )}
                        >
                            <X size={11} />
                        </button>
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
                            isBranded={applyBrandColor}
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
    
                            <NavIconButton 
                                onClick={toggleLeftMenu} 
                                isLightBg={isLightBg}
                                isBranded={applyBrandColor}
                            >
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
