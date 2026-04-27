"use client";

import { useEffect } from 'react';

// A minimal, ultra-modern SVG that looks like a subtle image placeholder (Notion/Linear style) 
// ensuring it looks sleek in both light and dark modes
const BROKEN_IMAGE_FALLBACK = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='1.2' opacity='0.5'><rect x='5' y='5' width='14' height='14' rx='4'/><line x1='5' y1='5' x2='19' y2='19'/></svg>";

export function GlobalImageErrorHandler() {
    useEffect(() => {
        const handleError = (e: ErrorEvent) => {
            const target = e.target as HTMLElement;
            // Intercept image load errors
            if (target && target.tagName && target.tagName.toLowerCase() === 'img') {
                const img = target as HTMLImageElement;
                if (img.dataset.ignoreGlobalHandler === 'true') return;
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
