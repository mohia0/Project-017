import { useEffect } from 'react';

/**
 * Draws a notification-count badge on the favicon using an offscreen canvas.
 * Reads --brand-primary from the document root so it always matches the
 * workspace accent color (even after branding changes).
 *
 * @param count      Number of unread notifications. 0 = restore plain favicon.
 * @param faviconSrc Full URL/path to the base favicon. Must be driven from
 *                   the branding store so it reflects custom favicons.
 * @param pathname   Current route pathname to trigger re-evaluation on navigation.
 */
export function useFaviconBadge(count: number, faviconSrc: string, pathname?: string) {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const applyFavicon = (url: string) => {
            let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            if (link.href !== url) link.href = url;

            // Optional: force Next.js head tags to match to prevent hydration/mutation conflicts
            document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']").forEach(el => {
                if (el.href !== url) el.href = url;
            });
        };

        // If no unread notifications, apply the clean favicon (custom or default)
        // directly — do NOT restore from a stale ref that may predate BrandingProvider.
        if (count <= 0) {
            applyFavicon(faviconSrc);
            
            // Set up an observer to fight Next.js router resetting the favicon
            const observer = new MutationObserver(() => {
                applyFavicon(faviconSrc);
            });
            observer.observe(document.head, { childList: true, subtree: true });
            return () => observer.disconnect();
        }

        // Grab the workspace accent color from the CSS variable
        const accentColor =
            getComputedStyle(document.documentElement)
                .getPropertyValue('--brand-primary')
                .trim() || '#f59e0b';

        // 68×68 canvas — 4px wider than the minimum retina size.
        // Icon is drawn at full 68×68 so it NEVER appears smaller.
        // The extra 4px gives the badge room to sit further in the bottom-right
        // corner without any clipping. Badge radius is unchanged at 19.
        const SIZE = 68;
        const BADGE_R = 19;
        const CX = SIZE - BADGE_R; // = 49 — badge fully inside, shifted right vs 64-canvas
        const CY = SIZE - BADGE_R; // = 49 — badge fully inside, shifted down vs 64-canvas

        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            ctx.clearRect(0, 0, SIZE, SIZE);

            // Draw the icon at FULL canvas size — no shrinkage.
            ctx.drawImage(img, 0, 0, SIZE, SIZE);

            // Flat badge circle — no stroke
            ctx.beginPath();
            ctx.arc(CX, CY, BADGE_R, 0, 2 * Math.PI);
            ctx.fillStyle = accentColor;
            ctx.fill();

            // Count text
            const label = count > 99 ? '99+' : String(count);
            const fontSize = count > 9 ? 16 : 21;
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, CX, CY + 1);

            const finalUrl = canvas.toDataURL('image/png');
            applyFavicon(finalUrl);
            
            // Set up an observer to fight Next.js router resetting the favicon
            const observer = new MutationObserver(() => {
                applyFavicon(finalUrl);
            });
            observer.observe(document.head, { childList: true, subtree: true });
            
            // Cleanup observer on unmount/re-render
            (img as any)._observer = observer;
        };

        img.onerror = () => {
            // SVG cross-origin or load failure — skip silently
        };

        // Cache-bust so the browser re-fetches the SVG each time the source changes
        img.src = faviconSrc.startsWith('data:')
            ? faviconSrc                              // already a data URL — use as-is
            : faviconSrc + (faviconSrc.includes('?') ? '&' : '?') + '_badge=' + Date.now();

        return () => {
            if ((img as any)._observer) {
                (img as any)._observer.disconnect();
            }
        };
    }, [count, faviconSrc, pathname]);
}
