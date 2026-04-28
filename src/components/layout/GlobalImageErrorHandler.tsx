"use client";

import { useEffect } from 'react';

// A super minimal, ultra-clean broken image fallback.
// Uses a thin-stroke rounded square with "IMAGE" and "BROKEN" on separate lines.
// Designed to be practically invisible unless looked for.
const BROKEN_IMAGE_FALLBACK = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'><rect x='3' y='3' width='18' height='18' rx='4' stroke='%23888888' stroke-width='0.8' opacity='0.2'/><text x='12' y='11' text-anchor='middle' fill='%23888888' font-family='system-ui, sans-serif' font-size='2.2' font-weight='800' letter-spacing='0.5' opacity='0.4'>IMAGE</text><text x='12' y='15' text-anchor='middle' fill='%23888888' font-family='system-ui, sans-serif' font-size='2.2' font-weight='800' letter-spacing='0.5' opacity='0.4'>BROKEN</text></svg>";

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
                        img.className = img.className + " bg-black/[0.03] dark:bg-white/[0.03]";
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
