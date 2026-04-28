"use client";

import React, { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Individual letter SVGs extracted from aroooxa.svg (root asset).
// Each path is normalised to its own viewBox so height can be set freely.
// ─────────────────────────────────────────────────────────────────────────────
const LETTERS: { vb: string; d: string }[] = [
  // A (first)
  {
    vb: '0 0 500 434',
    d: 'M355.222 423.898L327.396 351.669H169.914L142.089 423.898H0L181.163 9.47256H318.515L499.679 423.898H355.222ZM208.397 251.023H288.914L248.655 146.825L208.397 251.023Z',
  },
  // R
  {
    vb: '0 0 390 434',
    d: 'M248.063 423.898L177.611 319.7H139.721V423.898H0V9.47256H199.516C314.963 9.47256 388.376 69.8602 388.376 165.77C388.376 225.566 359.958 270.561 310.227 296.018L397.256 423.898H248.063ZM247.471 165.77C247.471 135.576 229.118 117.223 190.636 117.223H139.721V214.317H190.636C229.118 214.317 247.471 195.964 247.471 165.77Z',
  },
  // O (1st)
  {
    vb: '0 0 468 434',
    d: 'M234 433.37C99.02 433.37 0 342.197 0 216.685C0 91.1736 99.02 0 234 0C368.98 0 467.708 91.1736 467.708 216.685C467.708 342.197 368.98 433.37 234 433.37ZM234 320.292C285.51 320.292 326.95 281.217 326.95 216.685C326.95 152.153 285.51 113.079 234 113.079C182.49 113.079 141.05 152.153 141.05 216.685C141.05 281.217 182.49 320.292 234 320.292Z',
  },
  // O (2nd)
  {
    vb: '0 0 468 434',
    d: 'M234 433.37C99.02 433.37 0 342.197 0 216.685C0 91.1736 99.02 0 234 0C368.98 0 467.708 91.1736 467.708 216.685C467.708 342.197 368.98 433.37 234 433.37ZM234 320.292C285.51 320.292 326.95 281.217 326.95 216.685C326.95 152.153 285.51 113.079 234 113.079C182.49 113.079 141.05 152.153 141.05 216.685C141.05 281.217 182.49 320.292 234 320.292Z',
  },
  // O (3rd)
  {
    vb: '0 0 468 434',
    d: 'M234 433.37C99.02 433.37 0 342.197 0 216.685C0 91.1736 99.02 0 234 0C368.98 0 467.708 91.1736 467.708 216.685C467.708 342.197 368.98 433.37 234 433.37ZM234 320.292C285.51 320.292 326.95 281.217 326.95 216.685C326.95 152.153 285.51 113.079 234 113.079C182.49 113.079 141.05 152.153 141.05 216.685C141.05 281.217 182.49 320.292 234 320.292Z',
  },
  // X
  {
    vb: '0 0 461 434',
    d: 'M460.603 423.898H300.75L229.117 313.187L159.258 423.898H0L149.786 214.909L5.33 9.47256H162.217L232.666 113.671L301.344 9.47256H451.722L307.862 209.581L460.603 423.898Z',
  },
  // A (second)
  {
    vb: '0 0 500 434',
    d: 'M355.222 423.898L327.396 351.669H169.914L142.089 423.898H0L181.163 9.47256H318.515L499.679 423.898H355.222ZM208.397 251.023H288.914L248.655 146.825L208.397 251.023Z',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Wave config
// ─────────────────────────────────────────────────────────────────────────────
const LIFT_PX    = -16;   // max upward shift (px)
const SPREAD     = 1.4;   // Gaussian sigma in letter-units
const SCALE_PEAK = 1.05;  // scale at hover peak
const LERP       = 0.18;  // spring lerp factor per rAF tick

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
interface AroooXaLogoProps {
  /** Height of the logo in px. Width auto-scales. Default: 32 */
  height?: number;
  /** Fill color of the wordmark. Default: 'currentColor' */
  color?: string;
  /** Whether to enable the per-letter wave hover effect. Default: true */
  wave?: boolean;
  className?: string;
}

export function AroooXaLogo({
  height = 32,
  color = 'currentColor',
  wave = true,
  className,
}: AroooXaLogoProps) {
  // Individual letter refs and animation state
  const letterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animState = useRef(
    LETTERS.map(() => ({ y: 0, targetY: 0, scale: 1, targetScale: 1 }))
  );
  const rafRef = useRef<number | null>(null);

  // ── rAF loop (started once, always running while mounted) ──
  const startLoop = useCallback(() => {
    const loop = () => {
      let dirty = false;
      animState.current.forEach((s, i) => {
        const el = letterRefs.current[i];
        if (!el) return;

        s.y     += (s.targetY     - s.y)     * LERP;
        s.scale += (s.targetScale - s.scale) * LERP;

        if (Math.abs(s.targetY - s.y) > 0.02 || Math.abs(s.targetScale - s.scale) > 0.0002) {
          dirty = true;
        }

        el.style.transform = `translateY(${s.y.toFixed(3)}px) scale(${s.scale.toFixed(5)})`;
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  // ── Mount / unmount ──
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || !wave) return;

      startLoop();

      const handleMove = (e: MouseEvent) => {
        const rect   = node.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const n      = animState.current.length;

        // Letter widths
        const widths = letterRefs.current.map((el) => el?.getBoundingClientRect().width ?? 0);
        let cum = 0;
        let hoveredIdx = n - 1;
        for (let i = 0; i < n; i++) {
          cum += widths[i];
          if (mouseX <= cum) { hoveredIdx = i; break; }
        }

        animState.current.forEach((s, i) => {
          const dist = Math.abs(i - hoveredIdx);
          const t    = Math.exp(-(dist * dist) / (2 * SPREAD * SPREAD));
          s.targetY     = LIFT_PX * t;
          s.targetScale = 1 + (SCALE_PEAK - 1) * t;
        });
      };

      const handleLeave = () => {
        animState.current.forEach((s) => {
          s.targetY     = 0;
          s.targetScale = 1;
        });
      };

      node.addEventListener('mousemove', handleMove as EventListener);
      node.addEventListener('mouseleave', handleLeave);

      return () => {
        node.removeEventListener('mousemove', handleMove as EventListener);
        node.removeEventListener('mouseleave', handleLeave);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    },
    [wave, startLoop]
  );

  return (
    <div
      ref={containerRef}
      className={cn('flex items-center select-none', className)}
      aria-label="AROOOXA"
      role="img"
    >
      {LETTERS.map((ld, i) => (
        <div
          key={i}
          ref={(el) => { letterRefs.current[i] = el; }}
          style={{ display: 'inline-flex', alignItems: 'center' }}
        >
          <svg
            viewBox={ld.vb}
            xmlns="http://www.w3.org/2000/svg"
            style={{ height, width: 'auto', display: 'block', fill: color }}
          >
            <path d={ld.d} />
          </svg>
        </div>
      ))}
    </div>
  );
}
