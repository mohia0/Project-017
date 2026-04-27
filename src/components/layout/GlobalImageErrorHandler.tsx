"use client";

import { useEffect } from 'react';

// A minimal, neutral SVG that looks like a subtle image placeholder with a slash 
// ensuring it looks good in both light and dark modes
const BROKEN_IMAGE_FALLBACK = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='3' ry='3'></rect><circle cx='8.5' cy='8.5' r='1.5'></circle><polyline points='21 15 16 10 5 21'></polyline><line x1='3' y1='3' x2='21' y2='21' stroke='%23ef4444' stroke-width='1' stroke-opacity='0.5'></line></svg>";

export function GlobalImageErrorHandler() {
    useEffect(() => {
        const handleError = (e: ErrorEvent) => {
            const target = e.target as HTMLElement;
            // Intercept image load errors
            if (target && target.tagName && target.tagName.toLowerCase() === 'img') {
                const img = target as HTMLImageElement;
                if (img.src !== BROKEN_IMAGE_FALLBACK && !img.dataset.fallbackApplied) {
                    img.dataset.fallbackApplied = 'true';
                    img.src = BROKEN_IMAGE_FALLBACK;
                    
                    // Add a tiny bit of styling so the generic fallback doesn't look stretched or ugly
                    if (!img.style.objectFit) {
                        img.style.objectFit = 'contain';
                    }
                    if (!img.style.backgroundColor) {
                        img.className = img.className + " bg-black/5 dark:bg-white/5";
                    }
                }
            }
        };

        // Capture phase is CRITICAL because the 'error' event on elements does not bubble up
        window.addEventListener('error', handleError, true);

        return () => {
            window.removeEventListener('error', handleError, true);
        };
    }, []);

    return null;
}
