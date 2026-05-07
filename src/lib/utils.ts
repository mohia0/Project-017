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

export function getTintedColor(hex: string, step: number): string {
    let s = hex.replace('#', '');
    if (s.length === 3) s = s.split('').map(c => c + c).join('');
    if (s.length < 6) return hex;
    
    let r = parseInt(s.slice(0, 2), 16);
    let g = parseInt(s.slice(2, 4), 16);
    let b = parseInt(s.slice(4, 6), 16);
    
    const difference = step - 3;
    if (difference === 0) return `#${s.toLowerCase()}`;
    
    // Use 25% increments per step (0 = 75% white, 6 = 75% black)
    const weight = Math.abs(difference) * 0.25; 
    
    if (difference < 0) {
        // Tint: Mix with white
        r = Math.round(r + (255 - r) * weight);
        g = Math.round(g + (255 - g) * weight);
        b = Math.round(b + (255 - b) * weight);
    } else {
        // Shade: Mix with black
        r = Math.round(r * (1 - weight));
        g = Math.round(g * (1 - weight));
        b = Math.round(b * (1 - weight));
    }
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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

/**
 * Replaces dynamic variables in a string.
 * Currently supports:
 * - {{year}} : The current year
 */
export function replaceVariables(text: string): string {
    if (!text) return text;
    const currentYear = new Date().getFullYear().toString();
    return text.replace(/{{year}}/g, currentYear);
}

export function calculatePercentageOrFixed(amount: number, value: string | number | undefined): number {
    if (!value) return 0;
    const strVal = String(value).trim();
    if (strVal.endsWith('%')) {
        const pct = parseFloat(strVal.replace('%', ''));
        return isNaN(pct) ? 0 : amount * (pct / 100);
    } else {
        const val = parseFloat(strVal);
        return isNaN(val) ? 0 : val;
    }
}
