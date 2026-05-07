"use client";

import React, { useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';

type TransitionVariant =
    | 'circle'
    | 'square'
    | 'triangle'
    | 'diamond'
    | 'rectangle'
    | 'hexagon'
    | 'star';

interface AnimatedThemeTogglerProps {
    className?: string;
    /** Duration of the clip-path transition in ms. Default: 400 */
    duration?: number;
    /** Shape used for the clip-path reveal. Default: "circle" */
    variant?: TransitionVariant;
    /** Expand from the viewport center instead of the button origin. Default: false */
    fromCenter?: boolean;
}

/** Returns a CSS clip-path polygon/circle string for the given variant at 100% expansion */
function getExpandedClipPath(variant: TransitionVariant, cx: number, cy: number): string {
    const maxDim = Math.hypot(window.innerWidth, window.innerHeight);
    const r = maxDim;
    switch (variant) {
        case 'circle':
            return `circle(${r}px at ${cx}px ${cy}px)`;
        case 'square': {
            const half = r;
            return `polygon(${cx - half}px ${cy - half}px, ${cx + half}px ${cy - half}px, ${cx + half}px ${cy + half}px, ${cx - half}px ${cy + half}px)`;
        }
        case 'rectangle': {
            const hw = r * 1.6;
            const hh = r;
            return `polygon(${cx - hw}px ${cy - hh}px, ${cx + hw}px ${cy - hh}px, ${cx + hw}px ${cy + hh}px, ${cx - hw}px ${cy + hh}px)`;
        }
        case 'diamond': {
            return `polygon(${cx}px ${cy - r}px, ${cx + r}px ${cy}px, ${cx}px ${cy + r}px, ${cx - r}px ${cy}px)`;
        }
        case 'triangle': {
            return `polygon(${cx}px ${cy - r}px, ${cx + r}px ${cy + r}px, ${cx - r}px ${cy + r}px)`;
        }
        case 'hexagon': {
            const s = r;
            const pts = Array.from({ length: 6 }, (_, i) => {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                return `${cx + s * Math.cos(angle)}px ${cy + s * Math.sin(angle)}px`;
            });
            return `polygon(${pts.join(', ')})`;
        }
        case 'star': {
            const outerR = r;
            const innerR = r * 0.4;
            const pts = Array.from({ length: 10 }, (_, i) => {
                const angle = (Math.PI / 5) * i - Math.PI / 2;
                const radius = i % 2 === 0 ? outerR : innerR;
                return `${cx + radius * Math.cos(angle)}px ${cy + radius * Math.sin(angle)}px`;
            });
            return `polygon(${pts.join(', ')})`;
        }
        default:
            return `circle(${r}px at ${cx}px ${cy}px)`;
    }
}

function getStartClipPath(variant: TransitionVariant, cx: number, cy: number): string {
    switch (variant) {
        case 'circle':
            return `circle(0px at ${cx}px ${cy}px)`;
        case 'square':
            return `polygon(${cx}px ${cy}px, ${cx}px ${cy}px, ${cx}px ${cy}px, ${cx}px ${cy}px)`;
        case 'rectangle':
            return `polygon(${cx}px ${cy}px, ${cx}px ${cy}px, ${cx}px ${cy}px, ${cx}px ${cy}px)`;
        case 'diamond':
            return `polygon(${cx}px ${cy}px, ${cx}px ${cy}px, ${cx}px ${cy}px, ${cx}px ${cy}px)`;
        case 'triangle':
            return `polygon(${cx}px ${cy}px, ${cx}px ${cy}px, ${cx}px ${cy}px)`;
        case 'hexagon':
            return `polygon(${cx}px ${cy}px, ${cx}px ${cy}px, ${cx}px ${cy}px, ${cx}px ${cy}px, ${cx}px ${cy}px, ${cx}px ${cy}px)`;
        case 'star':
            return `polygon(${Array(10).fill(`${cx}px ${cy}px`).join(', ')})`;
        default:
            return `circle(0px at ${cx}px ${cy}px)`;
    }
}

export function AnimatedThemeToggler({
    className,
    duration = 400,
    variant = 'circle',
    fromCenter = false,
}: AnimatedThemeTogglerProps) {
    const { theme, toggleTheme } = useUIStore();
    const isDark = theme === 'dark';
    const btnRef = useRef<HTMLButtonElement>(null);

    const handleToggle = () => {
        // Determine origin point
        let cx: number;
        let cy: number;

        if (fromCenter) {
            cx = window.innerWidth / 2;
            cy = window.innerHeight / 2;
        } else if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            cx = rect.left + rect.width / 2;
            cy = rect.top + rect.height / 2;
        } else {
            cx = window.innerWidth / 2;
            cy = window.innerHeight / 2;
        }

        // If View Transitions API is not supported, just toggle
        if (!('startViewTransition' in document)) {
            toggleTheme();
            return;
        }

        const startClip = getStartClipPath(variant, cx, cy);
        const endClip = getExpandedClipPath(variant, cx, cy);

        const transition = (document as Document & { startViewTransition: (cb: () => void) => { ready: Promise<void> } })
            .startViewTransition(() => {
                toggleTheme();
            });

        transition.ready.then(() => {
            document.documentElement.animate(
                [
                    { clipPath: startClip },
                    { clipPath: endClip },
                ],
                {
                    duration,
                    easing: 'ease-in-out',
                    pseudoElement: '::view-transition-new(root)',
                }
            );
        });
    };

    return (
        <button
            ref={btnRef}
            onClick={handleToggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={cn(
                "w-9 h-9 rounded-[12px] flex items-center justify-center transition-all group",
                isDark
                    ? "bg-white/5 text-[#6b6b6b] hover:bg-white/10"
                    : "bg-[#f0f0f0] text-[#fa6e34] hover:bg-[#e8e8e8]",
                className
            )}
        >
            {isDark
                ? <Moon size={14} strokeWidth={1.75} className="transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:text-[#efca00]" />
                : <Sun size={14} strokeWidth={1.75} className="transition-all duration-300 group-hover:scale-110 group-hover:rotate-45 group-hover:text-[#ff804b]" />
            }
        </button>
    );
}
