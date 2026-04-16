import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function hexToRgba(hex: string, alpha: number) {
    if (!hex) return `rgba(255, 255, 255, ${alpha})`;
    let r = 0, g = 0, b = 0;
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getPerceivedBrightness(hex: string): number {
    if (!hex) return 0;
    const r = parseInt(hex.length === 4 ? hex[1] + hex[1] : hex.substring(1, 3), 16);
    const g = parseInt(hex.length === 4 ? hex[2] + hex[2] : hex.substring(3, 5), 16);
    const b = parseInt(hex.length === 4 ? hex[3] + hex[3] : hex.substring(5, 7), 16);
    // HSP color model for perceived brightness
    return Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
}

export function isDarkColor(hex: string): boolean {
    return getPerceivedBrightness(hex) < 128;
}

export function getBackgroundImageWithOpacity(imageUrl?: string, bgColor?: string, opacity?: number) {
    if (!imageUrl) return 'none';
    const op = opacity ?? 1;
    if (op === 1) return `url(${imageUrl})`;
    const bgRgba = hexToRgba(bgColor || '#ffffff', 1 - op);
    return `linear-gradient(${bgRgba}, ${bgRgba}), url(${imageUrl})`;
}

export type CreateModalTab = 'Contact' | 'Company' | 'Project' | 'Proposal' | 'Invoice' | 'Scheduler' | 'Form' | 'Hook';

export function detectCreateModalTab(pathname: string): CreateModalTab {
    if (!pathname) return 'Contact';
    if (pathname.startsWith('/clients')) return 'Contact';
    if (pathname.startsWith('/projects')) return 'Project';
    if (pathname.startsWith('/proposals')) return 'Proposal';
    if (pathname.startsWith('/invoices')) return 'Invoice';
    if (pathname.startsWith('/schedulers')) return 'Scheduler';
    if (pathname.startsWith('/forms')) return 'Form';
    if (pathname.startsWith('/hooks')) return 'Hook';
    return 'Contact';
}
