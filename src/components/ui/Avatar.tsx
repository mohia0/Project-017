"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
    src?: string | null;
    name?: string | null;
    className?: string;
    isDark?: boolean;
    fallbackClassName?: string;
}

const loadedImages = new Set<string>();

export function Avatar({ src, name, className, isDark, fallbackClassName }: AvatarProps) {
    const isAlreadyLoaded = src ? loadedImages.has(src) : false;
    const [isLoading, setIsLoading] = useState(!isAlreadyLoaded && !!src);
    const [hasError, setHasError] = useState(false);
    
    useEffect(() => {
        if (!src) {
            setIsLoading(false);
            setHasError(false);
            return;
        }
        if (loadedImages.has(src)) {
            setIsLoading(false);
            setHasError(false);
        } else {
            setIsLoading(true);
            setHasError(false);
        }
    }, [src]);

    const handleLoad = () => {
        if (src) loadedImages.add(src);
        setIsLoading(false);
    };

    const handleError = () => {
        setIsLoading(false);
        setHasError(true);
    };

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
            {(src && !hasError) ? (
                <>
                    {isLoading && <div className={skeletonClasses} />}
                    <img
                        src={src}
                        alt={name || "Avatar"}
                        data-ignore-global-handler="true"
                        className={cn(
                            "w-full h-full object-cover",
                            isLoading ? "opacity-0" : "opacity-100",
                            !isAlreadyLoaded && "transition-opacity duration-300"
                        )}
                        onLoad={handleLoad}
                        onError={handleError}
                    />
                </>
            ) : (
                <div className={cn(
                    "w-full h-full flex items-center justify-center text-[10px] font-bold rounded-inherit",
                    isDark ? "bg-white/8 text-[#888]" : "bg-[#f0f0f0] text-[#777]",
                    fallbackClassName
                )}>
                    {getInitials(name ?? null)}
                </div>
            )}
        </div>
    );
}
