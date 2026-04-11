"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput } from '@/components/settings/SettingsField';
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
                "p-1 rounded transition-colors group",
                isDark ? "hover:bg-white/5 text-white/20 hover:text-white" : "hover:bg-black/5 text-black/20 hover:text-black"
            )}
        >
            <RotateCcw size={10} />
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
        <div className="flex flex-col gap-2 shadow-sm rounded-2xl p-4 border transition-all" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <label className={cn("text-[13px] font-semibold", isDark ? "text-white" : "text-black")}>{label}</label>
                    {description && <p className={cn("text-[11px]", isDark ? "text-white/40" : "text-black/40")}>{description}</p>}
                </div>
                <ResetButton onClick={onReset} isDark={isDark} />
            </div>
            <div 
                onClick={() => setIsModalOpen(true)}
                className={cn(
                    "w-full h-24 rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden relative group mt-2",
                    isDark 
                        ? "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]" 
                        : "bg-black/5 border-black/10 hover:border-black/20 hover:bg-black/[0.07]"
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
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", isDark ? "bg-white/5" : "bg-black/5")}>
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
                        <div 
                            className="w-10 h-10 rounded-xl cursor-pointer border relative overflow-hidden shrink-0"
                            style={{ backgroundColor: formData.primary_color, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                        >
                            <input 
                                type="color" 
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-[2]"
                                value={formData.primary_color}
                                onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                            />
                        </div>
                        <SettingsInput 
                            value={formData.primary_color} 
                            onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                            className="font-mono text-xs uppercase"
                        />
                    </div>
                </SettingsField>

                <div className="mt-8 border-t pt-8" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-6 opacity-20">Logos & Icons</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    </div>

                    <div className="mt-8">
                        <SettingsField 
                            label="Favicon URL" 
                            description="32x32 ICO or PNG format"
                            extra={<ResetButton onClick={() => resetField('favicon_url')} isDark={isDark} />}
                        >
                            <div className="flex gap-3 items-center">
                                <div className={cn("w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border", isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10")}>
                                    {formData.favicon_url ? <img src={formData.favicon_url} className="w-6 h-6 object-contain" /> : <ImageIcon size={16} className="opacity-20" />}
                                </div>
                                <SettingsInput 
                                    value={formData.favicon_url || ''} 
                                    onChange={e => setFormData({ ...formData, favicon_url: e.target.value })}
                                    placeholder="https://example.com/favicon.ico"
                                />
                            </div>
                        </SettingsField>
                    </div>
                </div>

                {/* Main Reset Button at bottom of card content */}
                <div className="mt-10 flex justify-center">
                    <button
                        type="button"
                        onClick={() => {
                            if (!confirmingResetAll) {
                                setConfirmingResetAll(true);
                            } else {
                                resetAll();
                                setConfirmingResetAll(false);
                            }
                        }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all active:scale-95",
                            confirmingResetAll
                                ? isDark ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-red-50 text-red-600 border border-red-100"
                                : isDark ? "text-white/15 hover:text-white/40" : "text-black/15 hover:text-black/40"
                        )}
                    >
                        <RotateCcw size={10} strokeWidth={confirmingResetAll ? 3 : 2.5} />
                        {confirmingResetAll ? "Confirm Reset (No Undo)" : "Reset all branding"}
                    </button>
                </div>
            </SettingsCard>
        </div>
    );
}
