"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Types ──────────────────────────────────────────────────────────── */

export interface ContextMenuItem {
    label?: string;
    icon?: React.ReactNode;
    onClick?: (e: React.MouseEvent | MouseEvent) => void;
    danger?: boolean;
    separator?: boolean; // render a divider BEFORE this item
    render?: (onClose: () => void) => React.ReactNode;
}

interface ContextMenuProps {
    items: ContextMenuItem[];
    isDark: boolean;
    /** Position for the floating menu (from right-click or button click) */
    pos: { x: number; y: number } | null;
    onClose: () => void;
}

/* ─── Floating Context Menu ──────────────────────────────────────────── */

export function ContextMenuPopup({ items, isDark, pos, onClose }: ContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [adjustedPos, setAdjustedPos] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (!pos) return;
        // Close on outside click / Escape
        const handleMouseDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        const handleScroll = () => onClose();
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [pos, onClose]);

    // Reposition to avoid overflow
    useEffect(() => {
        if (!pos || !ref.current) return;
        const menuWidth = ref.current.offsetWidth || 180;
        const menuHeight = ref.current.offsetHeight || 200;
        let x = pos.x;
        let y = pos.y;
        if (x + menuWidth > window.innerWidth - 8) x = window.innerWidth - menuWidth - 8;
        if (y + menuHeight > window.innerHeight - 8) y = y - menuHeight;
        setAdjustedPos({ x, y });
    }, [pos]);

    if (!pos) return null;

    const displayPos = adjustedPos || pos;

    return createPortal(
        <div
            ref={ref}
            className={cn(
                "fixed z-[9999] min-w-[168px] rounded-xl border shadow-2xl overflow-hidden",
                "animate-in fade-in zoom-in-95 duration-100",
                isDark
                    ? "bg-[#1c1c1c] border-[#2e2e2e] shadow-black/60"
                    : "bg-white border-[#e0e0e0] shadow-black/10"
            )}
            style={{ top: displayPos.y, left: displayPos.x }}
        >
            <div className="py-1">
                {items.map((item, i) => (
                    <React.Fragment key={i}>
                        {item.separator && (
                            <div className={cn("my-1 h-px mx-3", isDark ? "bg-[#2e2e2e]" : "bg-[#f0f0f0]")} />
                        )}
                        {item.render ? (
                            item.render(onClose)
                        ) : (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    item.onClick?.(e);
                                    onClose();
                                }}
                                className={cn(
                                    "w-full flex items-center gap-2.5 px-3.5 py-[7px] text-[12px] font-medium text-left transition-colors",
                                    item.danger
                                        ? isDark
                                            ? "text-red-400 hover:bg-red-500/10"
                                            : "text-red-500 hover:bg-red-50"
                                        : isDark
                                            ? "text-[#ccc] hover:bg-white/[0.06]"
                                            : "text-[#333] hover:bg-[#f5f5f5]"
                                )}
                            >
                                {item.icon && (
                                    <span className={cn("shrink-0", item.danger ? "" : "opacity-50")}>
                                        {item.icon}
                                    </span>
                                )}
                                {item.label}
                            </button>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>,
        document.body
    );
}

/* ─── Hook: useRowContextMenu ────────────────────────────────────────── */

/**
 * Provides:
 *  - `menuPos` + `openMenu()` + `closeMenu()` for state management
 *  - `onContextMenu` handler to attach to a row (right-click)
 *  - `triggerProps` to attach to the three-dot button
 */
export function useRowContextMenu() {
    const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

    const openMenu = useCallback((x: number, y: number) => {
        setMenuPos({ x, y });
    }, []);

    const closeMenu = useCallback(() => setMenuPos(null), []);

    const onContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuPos({ x: e.clientX, y: e.clientY });
    }, []);

    return { menuPos, openMenu, closeMenu, onContextMenu };
}

/* ─── Three-Dot Button ───────────────────────────────────────────────── */

interface ThreeDotButtonProps {
    isDark: boolean;
    items: ContextMenuItem[];
    className?: string;
}

/**
 * A self-contained three-dot (⋮) button + context menu.
 * Wrap this inside `onClick={e => e.stopPropagation()}` if needed.
 */
export function ThreeDotMenu({ isDark, items, className }: ThreeDotButtonProps) {
    const btnRef = useRef<HTMLButtonElement>(null);
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (pos) { setPos(null); return; }
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({ x: rect.left, y: rect.bottom + 4 });
        }
    };

    return (
        <>
            <button
                ref={btnRef}
                onClick={handleClick}
                className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-md transition-all",
                    pos
                        ? isDark ? "bg-white/10 text-white" : "bg-[#e8e8e8] text-[#333]"
                        : isDark
                            ? "text-[#555] hover:text-[#aaa] hover:bg-white/8"
                            : "text-[#bbb] hover:text-[#555] hover:bg-[#f0f0f0]",
                    className
                )}
            >
                <MoreVertical size={13} />
            </button>
            <ContextMenuPopup items={items} isDark={isDark} pos={pos} onClose={() => setPos(null)} />
        </>
    );
}

/* ─── Context Menu Row (right-click wrapper) ─────────────────────────── */

interface ContextMenuRowProps extends React.HTMLAttributes<HTMLDivElement> {
    items: ContextMenuItem[];
    isDark: boolean;
    onRowClick?: () => void;
    children: React.ReactNode;
    component?: any; // e.g. motion.div
    [key: string]: any; // Allow motion props
}

/**
 * Drop-in div wrapper that adds right-click context menu to any table row.
 * The div forwards all other HTML div props (className, style, etc.).
 */
export function ContextMenuRow({ items, isDark, onRowClick, children, onClick, component: Component = 'div', ...rest }: ContextMenuRowProps) {
    const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuPos({ x: e.clientX, y: e.clientY });
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (onClick) onClick(e);
        if (onRowClick) onRowClick();
    };

    return (
        <>
            <Component
                {...rest}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
            >
                {children}
            </Component>
            {menuPos && (
                <ContextMenuPopup
                    items={items}
                    isDark={isDark}
                    pos={menuPos}
                    onClose={() => setMenuPos(null)}
                />
            )}
        </>
    );
}
