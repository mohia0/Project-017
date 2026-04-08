"use client";

import React, { useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';

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
            root.style.setProperty('--brand-primary', branding.primary_color || '#4dbf39');
            root.style.setProperty('--brand-secondary', branding.secondary_color || '#1a1a2e');
            root.style.setProperty('--brand-font', branding.font_family || 'Inter, sans-serif');
            root.style.setProperty('--brand-radius', `${branding.border_radius ?? 12}px`);
        } else {
            // Default fallbacks
            root.style.setProperty('--brand-primary', '#4dbf39');
            root.style.setProperty('--brand-secondary', '#1a1a2e');
            root.style.setProperty('--brand-font', 'Inter, sans-serif');
            root.style.setProperty('--brand-radius', '12px');
        }
    }, [branding]);

    return <>{children}</>;
}
