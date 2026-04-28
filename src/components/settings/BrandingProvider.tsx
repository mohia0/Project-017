"use client";

import React, { useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { getTintedColor } from '@/lib/utils';

function hexToRgb(hex: string) {
    if (!hex) return '0, 0, 0';
    let s = hex.replace('#', '');
    if (s.length === 3) s = s.split('').map(c => c + c).join('');
    if (s.length < 6) return '0, 0, 0';
    
    try {
        const r = parseInt(s.slice(0, 2), 16);
        const g = parseInt(s.slice(2, 4), 16);
        const b = parseInt(s.slice(4, 6), 16);
        return `${r}, ${g}, ${b}`;
    } catch (e) {
        return '0, 0, 0';
    }
}

function darkenColor(hex: string, amount = 0.1) {
    if (!hex) return '#000000';
    let s = hex.replace('#', '');
    if (s.length === 3) s = s.split('').map(c => c + c).join('');
    if (s.length < 6) return '#000000';
    
    try {
        let r = parseInt(s.slice(0, 2), 16);
        let g = parseInt(s.slice(2, 4), 16);
        let b = parseInt(s.slice(4, 6), 16);
        
        r = Math.min(255, Math.max(0, Math.floor(r * (1 - amount))));
        g = Math.min(255, Math.max(0, Math.floor(g * (1 - amount))));
        b = Math.min(255, Math.max(0, Math.floor(b * (1 - amount))));
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (e) {
        return '#000000';
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
    const { activeWorkspaceId, theme } = useUIStore();
    const { branding, fetchBranding, hasFetched } = useSettingsStore();

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchBranding(activeWorkspaceId);
        }
    }, [activeWorkspaceId, fetchBranding]);

    useEffect(() => {
        // Do not apply branding while it's still loading from Supabase
        if (activeWorkspaceId && !hasFetched.branding) return;

        // Apply CSS variables whenever branding OR theme changes
        const isDarkMode = theme === 'dark';

        const root = document.documentElement;
        if (branding) {
            const primary = branding.primary_color || '#f59e0b';
            const isDarkAccent = getBrightness(primary) < 128;
            
            root.style.setProperty('--brand-primary', primary);
            root.style.setProperty('--brand-primary-rgb', hexToRgb(primary));
            root.style.setProperty('--brand-primary-hover', darkenColor(primary)); 
            root.style.setProperty('--brand-primary-foreground', isDarkAccent ? '#ffffff' : '#000000');
            
            // Loader color: use custom primary when explicitly set; otherwise use white/black based on theme
            const loaderColor = branding.primary_color ? primary : (isDarkMode ? '#ffffff' : '#000000');
            root.style.setProperty('--brand-loader-color', loaderColor);
            
            // Sidebar Tint Logic
            const sidebarTint = branding.sidebar_tint ?? 3;
            const sidebarColor = branding.apply_color_to_sidebar 
                ? getTintedColor(primary, sidebarTint)
                : (branding.secondary_color || '#1a1a2e');
            
            root.style.setProperty('--brand-secondary', sidebarColor);
            root.style.setProperty('--brand-font', branding.font_family || 'Inter, sans-serif');
            root.style.setProperty('--brand-radius', `${branding.border_radius ?? 12}px`);
            
            // Map to legacy accent color variables
            root.style.setProperty('--primary', primary);
            root.style.setProperty('--primary-dark', darkenColor(primary, 0.2));
            root.style.setProperty('--primary-light', darkenColor(primary, -0.2));
        } else {
            const defaultPrimary = '#f59e0b';
            root.style.setProperty('--brand-primary', defaultPrimary);
            root.style.setProperty('--brand-primary-rgb', hexToRgb(defaultPrimary));
            root.style.setProperty('--brand-primary-hover', darkenColor(defaultPrimary));
            root.style.setProperty('--brand-primary-foreground', '#000000');
            root.style.setProperty('--brand-secondary', '#1a1a2e');
            root.style.setProperty('--brand-font', 'Inter, sans-serif');
            root.style.setProperty('--brand-radius', '12px');
            // No custom accent — use white in dark mode, black in light mode
            root.style.setProperty('--brand-loader-color', isDarkMode ? '#ffffff' : '#000000');

            root.style.setProperty('--primary', defaultPrimary);
            root.style.setProperty('--primary-dark', darkenColor(defaultPrimary, 0.2));
            root.style.setProperty('--primary-light', darkenColor(defaultPrimary, -0.2));
        }
    }, [branding, hasFetched.branding, activeWorkspaceId, theme]);
    
    // Update favicon dynamically — only override when a custom favicon_url is set.
    // We intentionally do NOT fall back to /favicon.svg here; the SSR <head> tag
    // already points to the right default. Overwriting it from JS before branding
    // loads causes the flicker. We only touch the DOM when we have a real custom URL.
    useEffect(() => {
        const customFavicon = branding?.favicon_url;
        if (!customFavicon) return; // Let SSR <head> handle the default; nothing to do.

        const setFavicon = (url: string) => {
            // Update all existing icon links in the document head
            const icons = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
            if (icons.length === 0) {
                // Create one if none exists (edge case)
                const icon = document.createElement('link');
                icon.rel = 'shortcut icon';
                document.head.appendChild(icon);
            }

            document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']").forEach(link => {
                if (url.endsWith('.svg')) link.type = 'image/svg+xml';
                else if (url.endsWith('.png')) link.type = 'image/png';
                else if (url.endsWith('.ico')) link.type = 'image/x-icon';
                link.href = url;
            });
        };

        setFavicon(customFavicon);
    }, [branding?.favicon_url]);

    return <>{children}</>;
}
