"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput } from '@/components/settings/SettingsField';
import { ColorisInput } from '@/components/ui/ColorisInput';
import { useSettingsStore, WorkspaceBranding } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { RotateCcw, Upload, Image as ImageIcon, Check, Trash2 } from 'lucide-react';
import ImageUploadModal from '@/components/modals/ImageUploadModal';
import { cn } from '@/lib/utils';
import { gooeyToast } from 'goey-toast';

const DEFAULT_BRANDING: Omit<WorkspaceBranding, 'workspace_id'> = {
    primary_color: '#4dbf39',
    secondary_color: '',
    font_family: 'Inter',
    border_radius: 12,
    logo_light_url: '/logo.svg',
    logo_dark_url: '/logo.svg',
    favicon_url: '/favicon.svg'
};

// Visual-only subset we expose in settings (border_radius & font_family are hidden)
type BrandingFormData = Pick<WorkspaceBranding, 'primary_color' | 'secondary_color' | 'logo_light_url' | 'logo_dark_url' | 'favicon_url'>;

function ResetButton({ onClick, isDark }: { onClick: () => void, isDark: boolean }) {
    return (
        <button 
            type="button"
            onClick={(e) => {
                e.preventDefault();
                onClick();
            }}
            title="Reset to default"
            className={cn(
                "flex items-center gap-1 px-1 rounded transition-colors group opacity-20 hover:opacity-100",
                isDark ? "hover:bg-white/10 text-white" : "hover:bg-black/10 text-black"
            )}
        >
            <RotateCcw size={8} strokeWidth={3} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Reset</span>
        </button>
    );
}

function LogoUpload({ 
    label, 
    description,
    value, 
    onChange, 
    isDark, 
    onReset 
}: { 
    label: string; 
    description?: string;
    value: string; 
    onChange: (v: string) => void;
    isDark: boolean;
    onReset: () => void;
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className={cn(
            "flex flex-col gap-0.5 shadow-sm rounded-2xl p-3 border transition-all",
            isDark ? "bg-[#141414] border-[#252525]" : "bg-[#fafafa] border-[#ebebeb]"
        )}>
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <label className={cn("text-[13px] font-semibold", isDark ? "text-white" : "text-black")}>{label}</label>
                    <ResetButton onClick={onReset} isDark={isDark} />
                </div>
                {description && <p className={cn("text-[11px]", isDark ? "text-white/40" : "text-black/40")}>{description}</p>}
            </div>
            <div 
                onClick={() => setIsModalOpen(true)}
                className={cn(
                    "w-full h-24 rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden relative group mt-1",
                    isDark 
                        ? "bg-[#1c1c1c] border-[#252525] hover:border-white/20 hover:bg-[#222]" 
                        : "bg-[#f5f5f5] border-[#ebebeb] hover:border-black/20 hover:bg-[#efeff5]"
                )}
            >
                {value ? (
                    <>
                        <img src={value} className="max-w-[70%] max-h-[70%] object-contain relative z-10" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                            <Upload size={14} className="text-white" />
                            <span className="text-[9px] font-bold text-white uppercase tracking-wider">Change logo</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", isDark ? "bg-[#252525]" : "bg-[#ebebeb]")}>
                            <ImageIcon size={16} className={isDark ? "text-white/20" : "text-black/20"} />
                        </div>
                        <span className={cn("text-[9px] font-bold uppercase tracking-wider", isDark ? "text-white/20" : "text-black/20")}>Upload logo</span>
                    </>
                )}
            </div>
            <ImageUploadModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUpload={onChange}
                title={label}
            />
        </div>
    );
}

export default function BrandingSettingsPage() {
    const { theme, activeWorkspaceId } = useUIStore();
    const isDark = theme === 'dark';
    const { branding, fetchBranding, updateBranding, hasFetched } = useSettingsStore();

    const [formData, setFormData] = useState<BrandingFormData>({
        primary_color: DEFAULT_BRANDING.primary_color,
        secondary_color: DEFAULT_BRANDING.secondary_color,
        logo_light_url: DEFAULT_BRANDING.logo_light_url,
        logo_dark_url: DEFAULT_BRANDING.logo_dark_url,
        favicon_url: DEFAULT_BRANDING.favicon_url,
    });
    const [isSaving, setIsSaving] = useState(false);

    const [confirmingResetAll, setConfirmingResetAll] = useState(false);

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchBranding(activeWorkspaceId);
        }
    }, [activeWorkspaceId, fetchBranding]);

    useEffect(() => {
        if (confirmingResetAll) {
            const timer = setTimeout(() => setConfirmingResetAll(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [confirmingResetAll]);

    useEffect(() => {
        if (branding) {
            setFormData({
                primary_color: branding.primary_color || DEFAULT_BRANDING.primary_color,
                secondary_color: branding.secondary_color || '',
                logo_light_url: branding.logo_light_url || '',
                logo_dark_url: branding.logo_dark_url || '',
                favicon_url: branding.favicon_url || '',
            });
        }
    }, [branding]);

    const resetField = (field: keyof BrandingFormData) => {
        setFormData(prev => ({ ...prev, [field]: DEFAULT_BRANDING[field as keyof typeof DEFAULT_BRANDING] }));
    };

    const resetAll = () => {
        setFormData({
            primary_color: DEFAULT_BRANDING.primary_color,
            secondary_color: DEFAULT_BRANDING.secondary_color,
            logo_light_url: DEFAULT_BRANDING.logo_light_url,
            logo_dark_url: DEFAULT_BRANDING.logo_dark_url,
            favicon_url: DEFAULT_BRANDING.favicon_url,
        });
        gooeyToast.success('Restored all defaults');
    };

    const hasUnsavedChanges = () => {
        const compareTo = branding || DEFAULT_BRANDING;
        return (
            formData.primary_color !== (compareTo.primary_color || DEFAULT_BRANDING.primary_color) ||
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

    if (!hasFetched.branding) {
        return (
            <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8 px-4">
                <div className={cn("h-[400px] w-full rounded-2xl animate-pulse", isDark ? "bg-white/5" : "bg-black/5")} />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8 px-4">
            <SettingsCard
                title="White Label"
                description="These settings apply globally to documents, portals, and PDFs."
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasUnsavedChanges()}
            >
                <SettingsField 
                    label="Primary Color" 
                    extra={<ResetButton onClick={() => resetField('primary_color')} isDark={isDark} />}
                >
                    <div className="flex gap-2 items-center">
                        <ColorisInput 
                            value={formData.primary_color}
                            onChange={val => setFormData({ ...formData, primary_color: val })}
                            className="w-48"
                        />
                    </div>
                </SettingsField>

                <div className="mt-8 border-t pt-8" style={{ borderColor: isDark ? '#252525' : '#ebebeb' }}>
                    <div className="flex items-center gap-2 mb-6">
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-20">Logos & Icons</h3>
                        <button
                            type="button"
                            onClick={() => {
                                if (!confirmingResetAll) setConfirmingResetAll(true);
                                else { resetAll(); setConfirmingResetAll(false); }
                            }}
                            className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold transition-all",
                                confirmingResetAll
                                    ? isDark ? "bg-red-500/20 text-red-500" : "bg-red-50 text-red-600"
                                    : isDark ? "text-white/10 hover:text-white/40" : "text-black/10 hover:text-black/40"
                            )}
                        >
                            <RotateCcw size={8} strokeWidth={3} />
                            {confirmingResetAll ? "Confirm Reset" : "Reset All"}
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <LogoUpload 
                            label="Light Logo"
                            description="For dark backgrounds"
                            value={formData.logo_light_url || ''}
                            onChange={(url) => setFormData({ ...formData, logo_light_url: url })}
                            onReset={() => resetField('logo_light_url')}
                            isDark={isDark}
                        />

                        <LogoUpload 
                            label="Dark Logo"
                            description="For light backgrounds"
                            value={formData.logo_dark_url || ''}
                            onChange={(url) => setFormData({ ...formData, logo_dark_url: url })}
                            onReset={() => resetField('logo_dark_url')}
                            isDark={isDark}
                        />

                        <LogoUpload 
                            label="Favicon"
                            description="Browser tab icon (32x32)"
                            value={formData.favicon_url || ''}
                            onChange={(url) => setFormData({ ...formData, favicon_url: url })}
                            onReset={() => resetField('favicon_url')}
                            isDark={isDark}
                        />
                    </div>


                </div>


            </SettingsCard>
        </div>
    );
}
