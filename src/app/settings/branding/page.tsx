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
import { appToast } from '@/lib/toast';
import { useDebounce } from '@/hooks/useDebounce';

const DEFAULT_PALETTE = [
    '#f59e0b', // Amber (Folder)
    '#ef4444', // Red
    '#f97316', // Orange (Doc)
    '#ec4899', // Pink (Image)
    '#8b5cf6', // Violet (Audio)
    '#3b82f6', // Blue (Video)
    '#06b6d4', // Cyan (Link)
    '#10b981', // Emerald (Code)
    '#4dbf39', // App Green (Primary)
    '#6b7280', // Gray (Archive)
    '#FFFFFF', // White
    '#000000'  // Black
];

const DEFAULT_BRANDING: Omit<WorkspaceBranding, 'workspace_id'> = {
    primary_color: '#4dbf39',
    secondary_color: '',
    apply_color_to_sidebar: false,
    font_family: 'Inter',
    border_radius: 12,
    logo_light_url: '',
    logo_dark_url: '',
    favicon_url: '',
    branding_colors: DEFAULT_PALETTE
};

// Visual-only subset we expose in settings (border_radius & font_family are hidden)
type BrandingFormData = Pick<WorkspaceBranding, 'primary_color' | 'secondary_color' | 'apply_color_to_sidebar' | 'logo_light_url' | 'logo_dark_url' | 'favicon_url' | 'branding_colors'>;

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

function Toggle({ checked, onChange, isDark }: { checked: boolean; onChange: (v: boolean) => void; isDark: boolean }) {
    return (
        <div onClick={() => onChange(!checked)} className="flex items-center gap-2.5 cursor-pointer select-none group">
            <div className={cn(
                "w-9 h-[20px] rounded-full relative transition-all duration-300",
                checked ? "bg-primary" : (isDark ? "bg-white/10" : "bg-black/10")
            )}>
                <div className={cn(
                    "absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all duration-300 transform",
                    checked ? "translate-x-[19px]" : "translate-x-[3px]"
                )} />
            </div>
        </div>
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
        secondary_color: '',
        apply_color_to_sidebar: false,
        logo_light_url: '',
        logo_dark_url: '',
        favicon_url: '',
        branding_colors: DEFAULT_BRANDING.branding_colors,
    });
    
    const debouncedFormData = useDebounce(formData, 1000);

    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);



    useEffect(() => {
        if (activeWorkspaceId) {
            fetchBranding(activeWorkspaceId);
        }
    }, [activeWorkspaceId, fetchBranding]);



    useEffect(() => {
        if (branding && !isSaving && !isDirty) {
            setFormData({
                primary_color: branding.primary_color || DEFAULT_BRANDING.primary_color,
                secondary_color: branding.secondary_color || '',
                apply_color_to_sidebar: branding.apply_color_to_sidebar || false,
                logo_light_url: branding.logo_light_url || '',
                logo_dark_url: branding.logo_dark_url || '',
                favicon_url: branding.favicon_url || '',
                branding_colors: (branding.branding_colors && branding.branding_colors.length > 0) 
                    ? branding.branding_colors 
                    : DEFAULT_PALETTE
            });
        }
    }, [branding, isSaving, isDirty]);

    const updateField = (updates: Partial<BrandingFormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
        setIsDirty(true);
    };

    const resetField = (field: keyof BrandingFormData) => {
        updateField({ [field]: DEFAULT_BRANDING[field as keyof typeof DEFAULT_BRANDING] });
    };



    useEffect(() => {
        // 1. Don't save if we haven't fetched yet, if we aren't dirty, or if we are already saving
        if (!activeWorkspaceId || !hasFetched.branding || !isDirty || isSaving) return;

        // 2. Compare against what is CURRENTLY in the server store
        // If there is no record yet (branding is null), we compare against DEFAULT_BRANDING
        const serverState = branding || DEFAULT_BRANDING;
        
        const hasChanges = 
            debouncedFormData.primary_color !== (serverState.primary_color || DEFAULT_BRANDING.primary_color) ||
            debouncedFormData.secondary_color !== (serverState.secondary_color || '') ||
            debouncedFormData.apply_color_to_sidebar !== (serverState.apply_color_to_sidebar || false) ||
            debouncedFormData.logo_light_url !== (serverState.logo_light_url || '') ||
            debouncedFormData.logo_dark_url !== (serverState.logo_dark_url || '') ||
            debouncedFormData.favicon_url !== (serverState.favicon_url || '') ||
            JSON.stringify(debouncedFormData.branding_colors) !== JSON.stringify(serverState.branding_colors || DEFAULT_BRANDING.branding_colors);

        if (!hasChanges) return;

        const saveChanges = async () => {
            setIsSaving(true);
            try {
                await updateBranding(activeWorkspaceId, debouncedFormData);
                setIsDirty(false); // Reset dirty flag after successful save
                appToast.success('Branding Saved');
            } catch (err) {
                console.error("Auto-save failed:", err);
                appToast.error('Save Failed', 'Connection lost. Changes may not be saved.');
            } finally {
                setIsSaving(false);
            }
        };

        saveChanges();
    }, [debouncedFormData, activeWorkspaceId, updateBranding, branding, hasFetched.branding]); // Removed isSaving from deps to avoid loop

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
            >
                <SettingsField 
                    label="Accent Color" 
                    extra={<ResetButton onClick={() => resetField('primary_color')} isDark={isDark} />}
                >
                    <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-500">
                        <ColorisInput 
                            value={formData.primary_color}
                            onChange={val => updateField({ primary_color: val })}
                            className="w-fit min-w-[140px]"
                            large
                        />
                        
                        <div className={cn(
                            "flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all h-[52px]",
                            isDark ? "bg-white/[0.03] border-white/10" : "bg-black/[0.02] border-black/10"
                        )}>
                            <div className="flex flex-col">
                                <span className={cn("text-[9px] font-bold uppercase tracking-wider", isDark ? "text-white/30" : "text-black/30")}>Apply to Sidebar</span>
                                <span className={cn("text-[11px] font-bold", isDark ? "text-white/70" : "text-black/70")}>
                                    {formData.apply_color_to_sidebar ? 'Branded' : 'Default'}
                                </span>
                            </div>
                            <Toggle 
                                checked={formData.apply_color_to_sidebar} 
                                onChange={(v) => updateField({ apply_color_to_sidebar: v })}
                                isDark={isDark} 
                            />
                        </div>
                    </div>
                </SettingsField>

                <div className="mt-8 border-t pt-8" style={{ borderColor: isDark ? '#252525' : '#ebebeb' }}>
                    <div className="flex items-center gap-2 mb-6">
                        <h3 className="font-semibold text-sm">Logos & Icons</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <LogoUpload 
                            label="Light Logo"
                            description="For dark backgrounds"
                            value={formData.logo_light_url || ''}
                            onChange={(url) => updateField({ logo_light_url: url })}
                            onReset={() => resetField('logo_light_url')}
                            isDark={isDark}
                        />

                        <LogoUpload 
                            label="Dark Logo"
                            description="For light backgrounds"
                            value={formData.logo_dark_url || ''}
                            onChange={(url) => updateField({ logo_dark_url: url })}
                            onReset={() => resetField('logo_dark_url')}
                            isDark={isDark}
                        />

                        <LogoUpload 
                            label="Favicon"
                            description="Browser tab icon (32x32)"
                            value={formData.favicon_url || ''}
                            onChange={(url) => updateField({ favicon_url: url })}
                            onReset={() => resetField('favicon_url')}
                            isDark={isDark}
                        />
                    </div>


                </div>


            </SettingsCard>

            <SettingsCard
                title="Branding Swatch"
                description="Customize the default colors available in the color picker."
                extra={<ResetButton onClick={() => resetField('branding_colors')} isDark={isDark} />}
            >
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                        {(formData.branding_colors || []).map((color, index) => (
                            <div key={index} className="relative group">
                                <ColorisInput 
                                    value={color}
                                    onChange={(newColor) => {
                                        const newColors = [...(formData.branding_colors || [])];
                                        newColors[index] = newColor;
                                        updateField({ branding_colors: newColors });
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        const newColors = (formData.branding_colors || []).filter((_, i) => i !== index);
                                        updateField({ branding_colors: newColors });
                                    }}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex shadow-sm z-10"
                                >
                                    <Trash2 size={10} />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => {
                                const newColors = [...(formData.branding_colors || []), '#000000'];
                                updateField({ branding_colors: newColors });
                            }}
                            className={cn(
                                "h-[45px] rounded-xl border border-dashed flex items-center justify-center gap-2 transition-all group",
                                isDark 
                                    ? "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10" 
                                    : "bg-black/5 border-black/10 hover:border-black/20 hover:bg-black/10"
                            )}
                        >
                            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-white/40 group-hover:text-white/60" : "text-black/40 group-hover:text-black/60")}>Add Color</span>
                        </button>
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
}
