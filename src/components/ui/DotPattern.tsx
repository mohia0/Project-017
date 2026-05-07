"use client";

import React, { useId } from 'react';
import { cn } from '@/lib/utils';

interface DotPatternProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  cr?: number;
  className?: string;
  isDark?: boolean;
  [key: string]: unknown;
}

export function DotPattern({
  width = 16,
  height = 16,
  x = 0,
  y = 0,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
  isDark = false,
  ...props
}: DotPatternProps) {
  const id = useId();

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          patternContentUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <circle
            id="pattern-circle"
            cx={cx}
            cy={cy}
            r={cr}
            fill={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'}
          />
        </pattern>
        {/* Radial gradient mask — fades dots toward edges */}
        <radialGradient id={`${id}-mask-grad`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="60%" stopColor="white" stopOpacity="0.6" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-mask`}>
          <rect width="100%" height="100%" fill={`url(#${id}-mask-grad)`} />
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill={`url(#${id})`}
        mask={`url(#${id}-mask)`}
      />
    </svg>
  );
}

/**
 * Auth page left-side decorative panel with dot pattern + glow effect.
 * Drop this inside a `relative` container on the left half of the screen.
 */
export function AuthDotPanel({ isDark }: { isDark: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Dot pattern */}
      <DotPattern isDark={isDark} width={20} height={20} cx={1} cy={1} cr={1.2} />

      {/* Glow blob — top area */}
      <div
        className={cn(
          "absolute top-[15%] left-[20%] w-[340px] h-[340px] rounded-full blur-[100px] opacity-0 animate-auth-glow",
          isDark
            ? "bg-white/8"
            : "bg-black/5"
        )}
        style={{ animationDelay: '0ms' }}
      />

      {/* Glow blob — bottom area */}
      <div
        className={cn(
          "absolute bottom-[10%] right-[10%] w-[260px] h-[260px] rounded-full blur-[80px] opacity-0 animate-auth-glow",
          isDark
            ? "bg-white/5"
            : "bg-black/4"
        )}
        style={{ animationDelay: '400ms' }}
      />
    </div>
  );
}
