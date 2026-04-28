"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput } from '@/components/settings/SettingsField';
import { ColorisInput } from '@/components/ui/ColorisInput';
import { useSettingsStore, WorkspaceBranding } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { RotateCcw, Upload, Image as ImageIcon, Check, Trash2, HelpCircle } from 'lucide-react';
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
    '#000000', // Primary Black
    '#6b7280', // Gray (Archive)
    '#FFFFFF', // White
    '#333333'  // Dark Gray
];

const DEFAULT_BRANDING: Omit<WorkspaceBranding, 'workspace_id'> = {
    primary_color: '#000000',
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
    const [imgError, setImgError] = useState(false);

    // Reset error state when value changes
    useEffect(() => {
        setImgError(false);
    }, [value]);

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
                {value && !imgError ? (
                    <>
                        <img 
                            src={value} 
                            className="max-w-[70%] max-h-[70%] object-contain relative z-10" 
                            onError={() => setImgError(true)}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                            <Upload size={14} className="text-white" />
                            <span className="text-[9px] font-bold text-white uppercase tracking-wider">Change logo</span>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Subtle dot-grid texture */}
                        <div
                            className="absolute inset-0 opacity-[0.35] pointer-events-none"
                            style={{
                                backgroundImage: isDark
                                    ? 'radial-gradient(circle, #3a3a3a 1px, transparent 1px)'
                                    : 'radial-gradient(circle, #d0d0d0 1px, transparent 1px)',
                                backgroundSize: '12px 12px',
                            }}
                        />
                        {/* Gradient icon blob */}
                        <div className={cn(
                            "relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                            isDark
                                ? "bg-gradient-to-br from-white/8 to-white/3 border border-white/8 shadow-inner"
                                : "bg-gradient-to-br from-black/6 to-black/2 border border-black/8 shadow-inner"
                        )}>
                            {imgError ? (
                                <ImageIcon
                                    size={16}
                                    className={cn(
                                        "transition-colors duration-200",
                                        isDark ? "text-yellow-500/50 group-hover:text-yellow-500/70" : "text-yellow-600/50 group-hover:text-yellow-600/70"
                                    )}
                                />
                            ) : (
                                <Upload
                                    size={16}
                                    className={cn(
                                        "transition-colors duration-200",
                                        isDark ? "text-white/25 group-hover:text-white/60" : "text-black/25 group-hover:text-black/50"
                                    )}
                                />
                            )}
                        </div>
                        <div className="relative z-10 flex flex-col items-center gap-0.5">
                            <span className={cn(
                                "text-[11px] font-semibold transition-colors duration-200",
                                imgError
                                    ? (isDark ? "text-yellow-500/50 group-hover:text-yellow-500/80" : "text-yellow-600/60 group-hover:text-yellow-600/80")
                                    : (isDark ? "text-white/25 group-hover:text-white/55" : "text-black/30 group-hover:text-black/55")
                            )}>
                                {imgError ? "Image unavailable" : "Click to upload"}
                            </span>
                            <span className={cn("text-[9px] font-medium", isDark ? "text-white/12" : "text-black/18")}>
                                {imgError ? "Upload new image" : "PNG · SVG · WEBP"}
                            </span>
                        </div>
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

function HelpTip({ text, isDark }: { text: string; isDark: boolean }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative inline-flex">
            <button
                type="button"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                className={cn('opacity-30 hover:opacity-100 transition-all p-1.5 rounded-lg', isDark ? 'text-white hover:bg-white/10' : 'text-black hover:bg-black/10')}
            >
                <HelpCircle size={15} strokeWidth={2.5} />
            </button>
            {show && (
                <div className={cn(
                    'absolute top-full right-0 mt-2 w-64 px-3 py-2.5 rounded-xl text-[11px] shadow-2xl z-[100] pointer-events-none leading-relaxed animate-in fade-in zoom-in-95 duration-200',
                    isDark ? 'bg-[#222] text-white/80 border border-white/10' : 'bg-white text-black/70 border border-black/10'
                )}>
                    {text}
                </div>
            )}
        </div>
    );
}

export default function BrandingSettingsPage() {
    const { theme, activeWorkspaceId } = useUIStore();
    const isDark = theme === 'dark';
    const { branding, fetchBranding, updateBranding, hasFetched } = useSettingsStore();
    const [mounted, setMounted] = useState(false);

    // Consolidated State
    const [formData, setFormData] = useState<BrandingFormData>({
        primary_color: DEFAULT_BRANDING.primary_color,
        secondary_color: '',
        apply_color_to_sidebar: false,
        logo_light_url: '',
        logo_dark_url: '',
        favicon_url: '',
        branding_colors: DEFAULT_PALETTE
    });

    const [hasSynced, setHasSynced] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (activeWorkspaceId) {
            setHasSynced(false);
            fetchBranding(activeWorkspaceId);
        }
    }, [activeWorkspaceId, fetchBranding]);

    useEffect(() => {
        if (branding && !hasSynced) {
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
            setHasSynced(true);
        }
    }, [branding, hasSynced]);

    // Debounced Auto-save
    const debouncedBranding = useDebounce(formData, 400);

    useEffect(() => {
        if (!activeWorkspaceId || !hasSynced) return;
        
        // Only save if different from what's in the store
        const isDifferent = JSON.stringify(debouncedBranding) !== JSON.stringify(branding);
        if (isDifferent) {
            updateBranding(activeWorkspaceId, debouncedBranding);
        }
    }, [debouncedBranding, activeWorkspaceId, branding, hasSynced, updateBranding]);

    // Instant Visual Updates for Accent Color
    useEffect(() => {
        if (!mounted) return;
        const root = document.documentElement;
        root.style.setProperty('--brand-primary', formData.primary_color);
        // We don't bother calculating RGB/Hover here as the real save will trigger BrandingProvider
        // which handles all the derived colors. This is just for immediate feedback.
    }, [formData.primary_color, mounted]);

    const resetField = (field: keyof BrandingFormData) => {
        const val = DEFAULT_BRANDING[field as keyof typeof DEFAULT_BRANDING];
        setFormData(prev => ({ ...prev, [field]: val }));
    };

    const resetSwatch = () => {
        setFormData(prev => ({ ...prev, branding_colors: DEFAULT_PALETTE }));
    };

    if (!hasFetched.branding || !mounted) {
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
                extra={<HelpTip isDark={isDark} text="Editing these settings will update your workspace's visual identity across all public portals, invoices, proposals, and system emails in real-time." />}
            >
                <SettingsField 
                    label="Accent Color" 
                    extra={<ResetButton onClick={() => resetField('primary_color')} isDark={isDark} />}
                >
                    <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-500">
                        <ColorisInput 
                            value={formData.primary_color}
                            onChange={val => setFormData(p => ({ ...p, primary_color: val }))}
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
                                onChange={(v) => setFormData(p => ({ ...p, apply_color_to_sidebar: v }))}
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
                            onChange={(url) => setFormData(p => ({ ...p, logo_light_url: url }))}
                            onReset={() => resetField('logo_light_url')}
                            isDark={isDark}
                        />

                        <LogoUpload 
                            label="Dark Logo"
                            description="For light backgrounds"
                            value={formData.logo_dark_url || ''}
                            onChange={(url) => setFormData(p => ({ ...p, logo_dark_url: url }))}
                            onReset={() => resetField('logo_dark_url')}
                            isDark={isDark}
                        />

                        <LogoUpload 
                            label="Favicon"
                            description="Browser tab icon (32x32)"
                            value={formData.favicon_url || ''}
                            onChange={(url) => setFormData(p => ({ ...p, favicon_url: url }))}
                            onReset={() => resetField('favicon_url')}
                            isDark={isDark}
                        />
                    </div>
                </div>
            </SettingsCard>

            <SettingsCard
                title="Branding Swatch"
                description="Customize the default colors available in the color picker."
                extra={<ResetButton onClick={resetSwatch} isDark={isDark} />}
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
                                        setFormData(p => ({ ...p, branding_colors: newColors }));
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        const newColors = (formData.branding_colors || []).filter((_, i) => i !== index);
                                        setFormData(p => ({ ...p, branding_colors: newColors }));
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
                                setFormData(p => ({ ...p, branding_colors: newColors }));
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
