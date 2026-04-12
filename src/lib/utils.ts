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

export function getBackgroundImageWithOpacity(imageUrl?: string, bgColor?: string, opacity?: number) {
    if (!imageUrl) return 'none';
    const op = opacity ?? 1;
    if (op === 1) return `url(${imageUrl})`;
    const bgRgba = hexToRgba(bgColor || '#ffffff', 1 - op);
    return `linear-gradient(${bgRgba}, ${bgRgba}), url(${imageUrl})`;
}
