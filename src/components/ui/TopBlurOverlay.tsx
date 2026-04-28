'use client';

import React from 'react';
import { DocumentDesign } from '@/types/design';

interface TopBlurOverlayProps {
    design?: Partial<DocumentDesign>;
}

/**
 * TopBlurOverlay
 * Renders the full-width backdrop that sits behind the floating action bar.
 * Three style variants, controlled by design.topBlurStyle:
 *
 *  gradient — simple top-to-bottom fade (default, existing look)
 *  prism    — aurora / iridescent multi-stop shimmer with animated hue shift
 *  glow     — radial soft glow pulse from top-centre using the brand accent colour
 */
export function TopBlurOverlay({ design }: TopBlurOverlayProps) {
    const isDark = design?.topBlurTheme === 'dark';
    const style  = design?.topBlurStyle || 'gradient';
    const primary = design?.primaryColor || '#4dbf39';
    const actionAccent = design?.actionButtonColor || '#111111';

    // ── GRADIENT (default) ─────────────────────────────────────────────────
    if (style === 'gradient') {
        return (
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: isDark
                        ? 'linear-gradient(to bottom, rgba(0,0,0,0.80) 0%, transparent 100%)'
                        : 'linear-gradient(to bottom, rgba(255,255,255,0.82) 0%, transparent 100%)',
                }}
            />
        );
    }

    // ── BLUR FADE (smooth frosted glass) ───────────────────────────────────
    if (style === 'blur') {
        // Shorter fade map for a more contained bleed off
        const maskGradient = 'linear-gradient(to bottom, black 0%, rgba(0,0,0,0.95) 20%, rgba(0,0,0,0.5) 60%, transparent 100%)';
        return (
            <>
                <div
                    className="absolute inset-x-0 -top-8 h-[200px] pointer-events-none"
                    style={{
                        background: isDark
                            ? 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)'
                            : 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, transparent 100%)',
                        backdropFilter: isDark ? 'blur(64px) saturate(200%) brightness(1.15)' : 'blur(64px) saturate(200%) brightness(1.05)',
                        WebkitBackdropFilter: isDark ? 'blur(64px) saturate(200%) brightness(1.15)' : 'blur(64px) saturate(200%) brightness(1.05)',
                        maskImage: maskGradient,
                        WebkitMaskImage: maskGradient,
                    }}
                />
                
                {/* Heavy Digital Noise Layer */}
                <div
                    className="absolute inset-x-0 -top-8 h-[200px] pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                        backgroundSize: '100px 100px',
                        opacity: isDark ? 0.20 : 0.15,
                        mixBlendMode: isDark ? 'lighten' : 'multiply',
                        maskImage: maskGradient,
                        WebkitMaskImage: maskGradient,
                    }}
                />
            </>
        );
    }

    // ── GLOW (radial accent pulse) ─────────────────────────────────────────
    if (style === 'glow') {
        // Parse hex to rgb for rgba usage
        const hexToRgb = (hex: string) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `${r},${g},${b}`;
        };
        const rgb = actionAccent.startsWith('#') && actionAccent.length === 7 ? hexToRgb(actionAccent) : '17,17,17';

        return (
            <>
                {/* Soft base fade */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: isDark
                            ? 'linear-gradient(to bottom, rgba(0,0,0,0.60) 0%, transparent 100%)'
                            : 'linear-gradient(to bottom, rgba(255,255,255,0.50) 0%, transparent 100%)',
                    }}
                />
                {/* Radial accent glow from top-centre */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: isDark
                                ? `radial-gradient(ellipse 100% 120% at 50% -10%, rgba(${rgb},0.30) 0%, rgba(${rgb},0.10) 35%, transparent 70%)`
                                : `radial-gradient(ellipse 100% 120% at 50% -10%, rgba(${rgb},0.22) 0%, rgba(${rgb},0.06) 35%, transparent 70%)`,
                            animation: 'glowPulse 4s ease-in-out infinite',
                        }}
                    />
                </div>
                <style>{`
                    @keyframes glowPulse {
                        0%, 100% { opacity: 1;    transform: scaleX(1);    }
                        50%      { opacity: 0.80; transform: scaleX(1.08); }
                    }
                `}</style>
            </>
        );
    }

    return null;
}
