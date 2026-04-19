"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AppLoaderProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  color?: string;
}

/**
 * AppLoader — A high-end, minimal modern spinner.
 * It uses a single variable-length arc that speeds up and slows down
 * to create a dynamic, premium "pulse-spin" effect.
 */
export function AppLoader({
  className,
  size = "md",
  color = "currentColor",
}: AppLoaderProps) {
  const sizeMap = {
    xs: "w-4 h-4",
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  const strokeWidth = size === "xs" ? 3 : 2.5;

  return (
    <div className={cn("relative flex items-center justify-center", sizeMap[size], className)}>
      <svg
        viewBox="0 0 50 50"
        className="w-full h-full animate-loader-rotate"
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke={color === "currentColor" ? "var(--primary)" : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="animate-loader-dash"
        />
      </svg>

      <style jsx>{`
        .animate-loader-rotate {
          animation: rotate 2s linear infinite;
        }

        .animate-loader-dash {
          stroke-dasharray: 1, 150;
          stroke-dashoffset: 0;
          animation: dash 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes rotate {
          100% { transform: rotate(360deg); }
        }

        @keyframes dash {
          0% {
            stroke-dasharray: 1, 150;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -35;
          }
          100% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -124;
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
  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center backdrop-blur-xl transition-colors duration-500",
        isDark ? "bg-[#000000]/95" : "bg-[#f5f5f5]/95",
        className
      )}
    >
      <AppLoader size="lg" color="var(--primary)" />
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
}
