"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface AppLoaderProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  color?: string;
}

/**
 * AppLoader — A high-end Leap Frog animation.
 * Ported from the design provided by the user.
 */
export function AppLoader({
  className,
  size = "md",
  color,
}: AppLoaderProps) {
  const resolvedColor = color || (size === "xs" || size === "sm" ? "currentColor" : "var(--brand-loader-color, currentColor)");
  const sizeMap = {
    xs: 16,
    sm: 24,
    md: 40,
    lg: 64,
    xl: 96,
    "2xl": 128,
  };

  const currentSize = sizeMap[size];

  return (
    <div 
      className={cn("relative flex items-center justify-center", className)}
      style={{ 
        width: currentSize, 
        height: currentSize,
        // @ts-ignore
        "--uib-size": `${currentSize}px`,
        "--uib-color": resolvedColor,
        "--uib-speed": "2.5s",
      }}
    >
      <div className="leap-frog-container">
        <div className="dot">
          <svg viewBox="0 0 635 589" className="shape" fill="currentColor">
            <path d="M317.232 589C134.121 589 0 465.085 0 294.5C0 123.915 134.121 0 317.232 0C500.343 0 634.464 123.915 634.464 294.5C634.464 465.085 500.343 589 317.232 589ZM317.232 435.313C387.103 435.313 443.321 382.206 443.321 294.5C443.321 206.794 387.103 153.687 317.232 153.687C247.36 153.687 191.142 206.794 191.142 294.5C191.142 382.206 247.36 435.313 317.232 435.313Z" />
          </svg>
        </div>
        <div className="dot">
          <svg viewBox="0 0 635 589" className="shape" fill="currentColor">
            <path d="M317.232 589C134.121 589 0 465.085 0 294.5C0 123.915 134.121 0 317.232 0C500.343 0 634.464 123.915 634.464 294.5C634.464 465.085 500.343 589 317.232 589ZM317.232 435.313C387.103 435.313 443.321 382.206 443.321 294.5C443.321 206.794 387.103 153.687 317.232 153.687C247.36 153.687 191.142 206.794 191.142 294.5C191.142 382.206 247.36 435.313 317.232 435.313Z" />
          </svg>
        </div>
        <div className="dot">
          <svg viewBox="0 0 635 589" className="shape" fill="currentColor">
            <path d="M317.232 589C134.121 589 0 465.085 0 294.5C0 123.915 134.121 0 317.232 0C500.343 0 634.464 123.915 634.464 294.5C634.464 465.085 500.343 589 317.232 589ZM317.232 435.313C387.103 435.313 443.321 382.206 443.321 294.5C443.321 206.794 387.103 153.687 317.232 153.687C247.36 153.687 191.142 206.794 191.142 294.5C191.142 382.206 247.36 435.313 317.232 435.313Z" />
          </svg>
        </div>
      </div>

      <style jsx>{`
        .leap-frog-container {
          --uib-dot-size: calc(var(--uib-size) * 0.4);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: var(--uib-size);
          height: var(--uib-size);
        }

        .dot {
          position: absolute;
          top: 0;
          left: 0;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          width: 100%;
          height: 100%;
          will-change: transform;
          backface-visibility: hidden;
          transform-style: preserve-3d;
        }

        .shape {
          display: block;
          height: var(--uib-dot-size);
          width: var(--uib-dot-size);
          color: var(--uib-color);
          transition: color 0.3s ease;
          transform: scale(0.65);
        }

        .dot:nth-child(1) {
          animation: leapFrog var(--uib-speed) cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .dot:nth-child(2) {
          transform: translateX(calc(var(--uib-size) * 0.3));
          animation: leapFrog var(--uib-speed) cubic-bezier(0.4, 0, 0.2, 1) calc(var(--uib-speed) / -1.5) infinite;
        }

        .dot:nth-child(3) {
          transform: translateX(calc(var(--uib-size) * 0.6)) rotate(0deg);
          animation: leapFrog var(--uib-speed) cubic-bezier(0.4, 0, 0.2, 1) calc(var(--uib-speed) / -3) infinite;
        }

        @keyframes leapFrog {
          0% {
            transform: translateX(0) rotate(0deg);
          }

          33.333% {
            transform: translateX(0) rotate(180deg);
          }

          66.666% {
            transform: translateX(calc(var(--uib-size) * -0.3)) rotate(180deg);
          }

          99.999% {
            transform: translateX(calc(var(--uib-size) * -0.6)) rotate(180deg);
          }

          100% {
            transform: translateX(0) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
}

/** Full-screen centered wrapper — drop-in replacement for any loading screen. */
export function FullScreenLoader({
  label,
  isDark,
  className,
}: {
  label?: string;
  isDark?: boolean;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // --brand-loader-color is set in globals.css from frame 0 (default: #f59e0b).
  // BrandingProvider overwrites it once real branding loads — the animation
  // transitions smoothly via the CSS variable cascade with no JS polling needed.
  const content = (
    <div
      className={cn(
        "fixed top-0 left-0 w-screen h-screen z-[99999] flex flex-col items-center justify-center transition-colors duration-0",
        className
      )}
      style={{ backgroundColor: 'var(--loader-bg)' }}
    >
      <AppLoader
        size="2xl"
        color="var(--brand-loader-color)"
      />
      {label && (
        <p className={cn(
          "mt-10 text-[10px] font-bold tracking-[0.5em] uppercase opacity-50",
          isDark ? "text-white" : "text-black"
        )}>
          {label}
        </p>
      )}
    </div>
  );

  // Use a portal so the fixed container escapes any transform/overflow-hidden parent containers
  if (!mounted || typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
}
