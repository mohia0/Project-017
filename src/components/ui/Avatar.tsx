"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
    src?: string | null;
    name?: string | null;
    className?: string;
    isDark?: boolean;
    fallbackClassName?: string;
    disableBlinking?: boolean;
}

export function Avatar({ src, name, className, isDark, fallbackClassName, disableBlinking }: AvatarProps) {
    const [isLoading, setIsLoading] = useState(!!src && !disableBlinking);

    const getInitials = (name: string | null) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const skeletonClasses = cn(
        "absolute inset-0 rounded-inherit animate-pulse",
        isDark ? "bg-white/[0.08]" : "bg-black/[0.05]"
    );

    return (
        <div className={cn("relative overflow-hidden shrink-0 rounded-lg", className)}>
            {src ? (
                <>
                    {isLoading && <div className={skeletonClasses} />}
                    <img
                        src={src}
                        alt={name || "Avatar"}
                        className={cn(
                            "w-full h-full object-cover transition-opacity duration-300",
                            isLoading ? "opacity-0" : "opacity-100"
                        )}
                        onLoad={() => setIsLoading(false)}
                        onError={() => setIsLoading(false)}
                    />
                </>
            ) : (
                <div className={cn(
                    "w-full h-full flex items-center justify-center text-[10px] font-bold",
                    isDark ? "bg-white/8 text-[#888]" : "bg-[#f0f0f0] text-[#777]",
                    fallbackClassName
                )}>
                    {getInitials(name)}
                </div>
            )}
        </div>
    );
}
