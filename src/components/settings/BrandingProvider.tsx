"use client";

import React, { useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';

function hexToRgb(hex: string) {
    if (!hex || hex.length < 7) return '77, 191, 57';
    try {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r}, ${g}, ${b}`;
    } catch (e) {
        return '77, 191, 57';
    }
}

function darkenColor(hex: string, amount = 0.1) {
    if (!hex || hex.length < 7) return '#3aaa29';
    try {
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        
        r = Math.max(0, Math.floor(r * (1 - amount)));
        g = Math.max(0, Math.floor(g * (1 - amount)));
        b = Math.max(0, Math.floor(b * (1 - amount)));
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (e) {
        return '#3aaa29';
    }
}

function getBrightness(hex: string) {
    if (!hex) return 255;
    let color = hex.replace('#', '');
    if (color.length === 3) color = color.split('').map(c => c + c).join('');
    const r = parseInt(color.slice(0, 2), 16);
    const g = parseInt(color.slice(2, 4), 16);
    const b = parseInt(color.slice(4, 6), 16);
    return Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
    const { activeWorkspaceId } = useUIStore();
    const { branding, fetchBranding } = useSettingsStore();

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchBranding(activeWorkspaceId);
        }
    }, [activeWorkspaceId, fetchBranding]);

    useEffect(() => {
        const root = document.documentElement;
        if (branding) {
            const primary = branding.primary_color || '#4dbf39';
            const isDark = getBrightness(primary) < 128;
            
            root.style.setProperty('--brand-primary', primary);
            root.style.setProperty('--brand-primary-rgb', hexToRgb(primary));
            root.style.setProperty('--brand-primary-hover', darkenColor(primary)); 
            root.style.setProperty('--brand-primary-foreground', isDark ? '#ffffff' : '#000000');
            root.style.setProperty('--brand-secondary', branding.secondary_color || '#1a1a2e');
            root.style.setProperty('--brand-font', branding.font_family || 'Inter, sans-serif');
            root.style.setProperty('--brand-radius', `${branding.border_radius ?? 12}px`);
        } else {
            // Default fallbacks
            const defaultPrimary = '#4dbf39';
            root.style.setProperty('--brand-primary', defaultPrimary);
            root.style.setProperty('--brand-primary-rgb', hexToRgb(defaultPrimary));
            root.style.setProperty('--brand-primary-hover', darkenColor(defaultPrimary));
            root.style.setProperty('--brand-primary-foreground', '#000000');
            root.style.setProperty('--brand-secondary', '#1a1a2e');
            root.style.setProperty('--brand-font', 'Inter, sans-serif');
            root.style.setProperty('--brand-radius', '12px');
        }
    }, [branding]);

    return <>{children}</>;
}
