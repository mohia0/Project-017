"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface AppLoaderProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  color?: string;
}

/**
 * AppLoader — A high-end Leap Frog animation.
 * Ported from the design provided by the user.
 */
export function AppLoader({
  className,
  size = "md",
  color = "var(--brand-loader-color, currentColor)",
}: AppLoaderProps) {
  const sizeMap = {
    xs: 16,
    sm: 24,
    md: 40,
    lg: 64,
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
        "--uib-color": color,
        "--uib-speed": "2.5s",
      }}
    >
      <div className="leap-frog-container">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>

      <style jsx>{`
        .leap-frog-container {
          --uib-dot-size: calc(var(--uib-size) * 0.25);
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

        .dot::before {
          content: '';
          display: block;
          height: var(--uib-dot-size);
          width: var(--uib-dot-size);
          border-radius: 50%;
          background-color: var(--uib-color);
          transition: background-color 0.3s ease;
          box-shadow: 0 0 0 0.5px var(--uib-color); /* Subtle anti-aliasing fix */
        }

        .dot:nth-child(1) {
          animation: leapFrog var(--uib-speed) ease infinite;
        }

        .dot:nth-child(2) {
          transform: translateX(calc(var(--uib-size) * 0.375));
          animation: leapFrog var(--uib-speed) ease calc(var(--uib-speed) / -1.5)
            infinite;
        }

        .dot:nth-child(3) {
          transform: translateX(calc(var(--uib-size) * 0.75)) rotate(0deg);
          animation: leapFrog var(--uib-speed) ease calc(var(--uib-speed) / -3) infinite;
        }

        @keyframes leapFrog {
          0% {
            transform: translateX(0) rotate(0deg);
          }

          33.333% {
            transform: translateX(0) rotate(180deg);
          }

          66.666% {
            transform: translateX(calc(var(--uib-size) * -0.375)) rotate(180deg);
          }

          99.999% {
            transform: translateX(calc(var(--uib-size) * -0.75)) rotate(180deg);
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

  const content = (
    <div
      className={cn(
        "fixed top-0 left-0 w-screen h-screen z-[99999] flex flex-col items-center justify-center backdrop-blur-xl transition-colors duration-500",
        isDark ? "bg-[#000000]/95" : "bg-[#f5f5f5]/95",
        className
      )}
    >
      <AppLoader size="lg" />
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
