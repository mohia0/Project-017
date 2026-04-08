"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput } from '@/components/settings/SettingsField';
import { useSettingsStore, WorkspaceBranding } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';

const DEFAULT_BRANDING: Omit<WorkspaceBranding, 'workspace_id'> = {
    primary_color: '#4dbf39',
    secondary_color: '',
    font_family: 'Inter',
    border_radius: 12,
    logo_light_url: '/logo.svg',
    logo_dark_url: '/logo.svg',
    favicon_url: '/favicon.svg'
};

export default function BrandingSettingsPage() {
    const { activeWorkspaceId } = useUIStore();
    const { branding, fetchBranding, updateBranding, isLoading } = useSettingsStore();

    const [formData, setFormData] = useState<Omit<WorkspaceBranding, 'workspace_id'>>(DEFAULT_BRANDING);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchBranding(activeWorkspaceId);
        }
    }, [activeWorkspaceId, fetchBranding]);

    useEffect(() => {
        if (branding) {
            setFormData({
                primary_color: branding.primary_color || DEFAULT_BRANDING.primary_color,
                secondary_color: branding.secondary_color || '',
                font_family: branding.font_family || DEFAULT_BRANDING.font_family,
                border_radius: branding.border_radius ?? DEFAULT_BRANDING.border_radius,
                logo_light_url: branding.logo_light_url || '',
                logo_dark_url: branding.logo_dark_url || '',
                favicon_url: branding.favicon_url || '',
            });
        } else {
            setFormData(DEFAULT_BRANDING);
        }
    }, [branding]);

    const hasUnsavedChanges = () => {
        const compareTo = branding || DEFAULT_BRANDING;
        return (
            formData.primary_color !== (compareTo.primary_color || DEFAULT_BRANDING.primary_color) ||
            formData.secondary_color !== (compareTo.secondary_color || '') ||
            formData.font_family !== (compareTo.font_family || DEFAULT_BRANDING.font_family) ||
            formData.border_radius !== (compareTo.border_radius ?? DEFAULT_BRANDING.border_radius) ||
            formData.logo_light_url !== (compareTo.logo_light_url || '') ||
            formData.logo_dark_url !== (compareTo.logo_dark_url || '') ||
            formData.favicon_url !== (compareTo.favicon_url || '')
        );
    };

    const handleSave = async () => {
        if (!activeWorkspaceId) return;
        setIsSaving(true);
        await updateBranding(activeWorkspaceId, formData);
        setIsSaving(false);
    };

    if (isLoading && !branding) {
        return <div className="animate-pulse">Loading branding data...</div>;
    }

    if (!activeWorkspaceId) {
        return <div>No active workspace selected.</div>;
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8">
            <SettingsCard
                title="White Label"
                description="These settings apply globally to documents, portals, and PDFs."
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasUnsavedChanges()}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingsField label="Primary Color">
                        <div className="flex gap-2 items-center">
                            <input 
                                type="color" 
                                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
                                value={formData.primary_color}
                                onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                            />
                            <SettingsInput 
                                value={formData.primary_color} 
                                onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                                className="font-mono text-xs uppercase"
                            />
                        </div>
                    </SettingsField>

                    <SettingsField label="Border Radius" description={`${formData.border_radius}px`}>
                        <div className="flex gap-2 items-center h-10">
                            <input 
                                type="range" min="0" max="24" step="2"
                                value={formData.border_radius}
                                onChange={e => setFormData({ ...formData, border_radius: parseInt(e.target.value) })}
                                className="w-full accent-[#4dbf39]"
                            />
                        </div>
                    </SettingsField>
                </div>

                <SettingsField label="Font Family">
                    {/* Simplified for now without dropdown */}
                    <SettingsInput 
                        value={formData.font_family} 
                        onChange={e => setFormData({ ...formData, font_family: e.target.value })}
                        placeholder="Inter, Helvetica, sans-serif"
                    />
                </SettingsField>

                <div className="mt-4 border-t pt-6" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
                    <h3 className="text-sm font-semibold mb-4">Logos & Icons</h3>
                    
                    <div className="flex flex-col gap-4">
                        <SettingsField label="Light Logo URL" description="Used on dark backgrounds (e.g., dark mode portals).">
                            <SettingsInput 
                                value={formData.logo_light_url || ''} 
                                onChange={e => setFormData({ ...formData, logo_light_url: e.target.value })}
                            />
                        </SettingsField>
                        
                        <SettingsField label="Dark Logo URL" description="Used on light backgrounds (e.g., printed PDFs).">
                            <SettingsInput 
                                value={formData.logo_dark_url || ''} 
                                onChange={e => setFormData({ ...formData, logo_dark_url: e.target.value })}
                            />
                        </SettingsField>

                        <SettingsField layout="horizontal" label="Favicon URL" description="32x32 ICO or PNG format">
                            <SettingsInput 
                                value={formData.favicon_url || ''} 
                                onChange={e => setFormData({ ...formData, favicon_url: e.target.value })}
                            />
                        </SettingsField>
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
}
