"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, RotateCcw, ChevronDown } from 'lucide-react';
import { DocumentDesign, DEFAULT_DOCUMENT_DESIGN } from '@/types/design';
import { ColorisInput } from './ColorisInput';

// ── Utility: dynamically inject a Google Fonts <link> for a given family ──
const LOADED_FONTS = new Set<string>();
function loadGoogleFont(family: string) {
    if (!family || LOADED_FONTS.has(family)) return;
    LOADED_FONTS.add(family);
    const encoded = encodeURIComponent(family);
    const id = `gfont-${encoded}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);
}

interface DesignSettingsPanelProps {
    isDark: boolean;
    meta: {
        logoUrl?: string;
        design?: DocumentDesign;
    };
    updateMeta: (patch: any) => void;
    onUploadLogo: () => void;
    onUploadBackground: () => void;
    hideSignature?: boolean;
    hideTable?: boolean;
    hideActionBar?: boolean;
}

export function MetaField({ label, children, isDark, icon, onReset, valueLabel }: any) {
    return (
        <div className={cn("rounded-lg border px-3 py-2.5 shadow-sm group/field", isDark ? "border-[#252525] bg-[#1f1f1f]" : "border-[#ebebeb] bg-white")}>
            {(label || valueLabel) && (
                <div className="flex items-center justify-between mb-1">
                    <div className={cn("flex items-center gap-1.5 text-[10.5px] font-semibold tracking-wide", isDark ? "text-[#555]" : "text-[#bbb]")}>
                        {icon}
                        {label}
                    </div>
                    <div className="flex items-center gap-2">
                        {valueLabel && (
                            <span className={cn("text-[10px] font-mono", isDark ? "text-[#444]" : "text-[#ccc]")}>
                                {valueLabel}
                            </span>
                        )}
                        {onReset && (
                            <button 
                                onClick={onReset}
                                className={cn(
                                    "opacity-0 group-hover/field:opacity-40 hover:!opacity-100 transition-opacity p-0.5 rounded-sm",
                                    isDark ? "hover:bg-white/10 text-white" : "hover:bg-black/5 text-black"
                                )}
                            >
                                <RotateCcw size={10} />
                            </button>
                        )}
                    </div>
                </div>
            )}
            {children}
        </div>
    );
}

export function ShadowPicker({ value, onChange, isDark }: any) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    const options = [
        { label: 'None',           value: 'none' },
        { label: 'Subtle',         value: '0 2px 10px -2px rgba(0,0,0,0.03)' },
        { label: 'Soft (Default)', value: '0 4px 20px -4px rgba(0,0,0,0.05)' },
        { label: 'Elegant',        value: '0 8px 30px -6px rgba(0,0,0,0.08)' },
        { label: 'Intense',        value: '0 12px 40px -8px rgba(0,0,0,0.12)' },
    ];

    const current = options.find(o => o.value === (value || 'none')) || options[0];

    React.useEffect(() => {
        if (!open) return;
        const clickBus = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', clickBus);
        return () => document.removeEventListener('mousedown', clickBus);
    }, [open]);

    return (
        <div className="relative" ref={ref}>
            <button 
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex items-center justify-between w-full px-0.5 py-0.5 text-[12px] font-medium transition-all group",
                    isDark ? "text-[#ccc] hover:text-white" : "text-[#333] hover:text-black"
                )}
            >
                <span>{current.label}</span>
                <ChevronDown size={12} className={cn("transition-transform duration-200 opacity-30 group-hover:opacity-100", open && "rotate-180")} />
            </button>

            {open && (
                <div className={cn(
                    "absolute left-[-12px] right-[-12px] bottom-full mb-2 z-[100] p-1 shadow-2xl rounded-xl border animate-in fade-in zoom-in-95 duration-200 origin-bottom",
                    isDark ? "bg-[#1a1a1a] border-white/5" : "bg-white border-black/5"
                )}>
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                            className={cn(
                                "w-full text-left px-3 py-2 rounded-lg text-[12px] transition-all",
                                opt.value === value
                                    ? (isDark ? "bg-white/10 text-white font-bold" : "bg-black/5 text-black font-bold")
                                    : (isDark ? "text-[#888] hover:bg-white/5 hover:text-[#ccc]" : "text-[#888] hover:bg-black/5 hover:text-[#333]")
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function DesignSettingsPanel({ isDark, meta, updateMeta, onUploadLogo, onUploadBackground, hideSignature, hideTable, hideActionBar }: DesignSettingsPanelProps) {
    // Always read latest design so we don't get stale closures on rapid changes
    const metaRef = React.useRef(meta);
    React.useEffect(() => { metaRef.current = meta; }, [meta]);

    const design = meta.design || {} as Partial<DocumentDesign>;

    // Always read freshest design to avoid stale spread when sliders fire rapidly
    const updateDesign = React.useCallback((patch: Partial<DocumentDesign>) => {
        const currentDesign = metaRef.current.design || {};
        updateMeta({ design: { ...currentDesign, ...patch } });
    }, [updateMeta]);

    // Preload default font on mount
    React.useEffect(() => {
        loadGoogleFont(design.fontFamily || 'Inter');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load font whenever selection changes
    const handleFontChange = React.useCallback((family: string) => {
        loadGoogleFont(family);
        updateDesign({ fontFamily: family });
    }, [updateDesign]);

    const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
    const toggle = (section: string) => setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));

    const SectionHeader = ({ id, label }: { id: string, label: string }) => (

        <button 
            onClick={() => toggle(id)}
            className={cn(
                "w-full flex items-center justify-between py-1 mb-2 pl-1 transition-all group",
                isDark ? "hover:text-white" : "hover:text-black"
            )}
        >
            <span className={cn("text-[9px] uppercase tracking-widest font-black", isDark ? "text-[#555]" : "text-[#bbb]", !collapsed[id] && "text-[#4dbf39]")}>
                {label}
            </span>
            <div className={cn("transition-transform duration-200", collapsed[id] ? "-rotate-90" : "rotate-0")}>
                <ChevronDown size={11} className={isDark ? "text-white/20 group-hover:text-white/40" : "text-black/20 group-hover:text-black/40"} />
            </div>
        </button>
    );

    return (
        <div className="space-y-4 pt-2">
            {/* ── BRANDING ── */}
            <div>
                <SectionHeader id="branding" label="Branding" />
                {!collapsed['branding'] && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <MetaField 
                            label="Logo" 
                            isDark={isDark}
                            onReset={() => {
                                updateMeta({ logoUrl: '' });
                                updateDesign({ logoSize: DEFAULT_DOCUMENT_DESIGN.logoSize });
                            }}
                        >
                            <div className="flex flex-col gap-3">
                                {meta.logoUrl && (
                                    <div className="relative group/logo w-fit">
                                        <img 
                                            src={meta.logoUrl} 
                                            alt="Logo" 
                                            className="h-12 w-auto rounded border border-white/5 bg-white/5 p-1 transition-all" 
                                        />
                                        <button 
                                            onClick={() => updateMeta({ logoUrl: '' })}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/logo:opacity-100 transition-opacity"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                )}
                                
                                {meta.logoUrl && (
                                    <div className="space-y-1.5 px-0.5">
                                        <div className="flex items-center justify-between mb-1 px-0.5">
                                            <span className={cn("text-[10.5px] font-semibold tracking-wide", isDark ? "text-[#555]" : "text-[#bbb]")}>Size</span>
                                            <span className={cn("text-[10px] font-mono", isDark ? "text-[#444]" : "text-[#ccc]")}>{design.logoSize ?? 48}px</span>
                                        </div>
                                        <input 
                                            type="range" min="20" max="150" step="2" 
                                            value={design.logoSize ?? 48} 
                                            onChange={e => updateDesign({ logoSize: Number(e.target.value) })}
                                            className="w-full cursor-pointer" 
                                        />
                                    </div>
                                )}

                                <button 
                                    onClick={onUploadLogo}
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed transition-all",
                                        isDark ? "border-white/5 hover:border-[#4dbf39]/30 hover:bg-white/5 text-white/40" : "border-gray-200 hover:border-[#4dbf39]/30 hover:bg-gray-50 text-gray-500"
                                    )}
                                >
                                    <Upload size={14} />
                                    <span className="text-[12px] font-medium">
                                        {meta.logoUrl ? "Change Logo" : "Upload Logo"}
                                    </span>
                                </button>
                            </div>
                        </MetaField>
                        
                    </div>
                )}
            </div>

            {/* ── SPACING & CORNERS ── */}
            <div>
                <SectionHeader id="spacing" label="Spacing & Corners" />
                {!collapsed['spacing'] && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <MetaField 
                            label="Block Spacing (Top)"
                            valueLabel={`${design.marginTop ?? 0}px`}
                            isDark={isDark} 
                            onReset={() => updateDesign({ marginTop: DEFAULT_DOCUMENT_DESIGN.marginTop })}
                        >
                            <input 
                                type="range" min="0" max="120" step="4" 
                                value={design.marginTop ?? 0} 
                                onChange={e => updateDesign({ marginTop: Number(e.target.value) })}
                                className="w-full cursor-pointer" 
                            />
                        </MetaField>
                        <MetaField 
                            label="Block Spacing (Bottom)"
                            valueLabel={`${design.marginBottom ?? 0}px`}
                            isDark={isDark}
                            onReset={() => updateDesign({ marginBottom: DEFAULT_DOCUMENT_DESIGN.marginBottom })}
                        >
                            <input 
                                type="range" min="0" max="120" step="4" 
                                value={design.marginBottom ?? 0} 
                                onChange={e => updateDesign({ marginBottom: Number(e.target.value) })}
                                className="w-full cursor-pointer" 
                            />
                        </MetaField>
                        <MetaField 
                            label="Global Roundness"
                            valueLabel={`${design.borderRadius ?? 16}px`}
                            isDark={isDark}
                            onReset={() => updateDesign({ borderRadius: DEFAULT_DOCUMENT_DESIGN.borderRadius })}
                        >
                            <input 
                                type="range" min="0" max="40" step="2" 
                                value={design.borderRadius ?? 16} 
                                onChange={e => updateDesign({ borderRadius: Number(e.target.value) })}
                                className="w-full cursor-pointer" 
                            />
                        </MetaField>

                        <MetaField 
                            label="Shadow"
                            isDark={isDark}
                            onReset={() => updateDesign({ blockShadow: DEFAULT_DOCUMENT_DESIGN.blockShadow })}
                        >
                            <ShadowPicker 
                                value={design.blockShadow}
                                onChange={(val: string) => updateDesign({ blockShadow: val })}
                                isDark={isDark}
                            />
                        </MetaField>
                    </div>
                )}
            </div>

            {/* ── TYPOGRAPHY & COLORS ── */}
            <div>
                <SectionHeader id="typo" label="Typography & Colors" />
                {!collapsed['typo'] && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <MetaField 
                            label="Font" 
                            isDark={isDark}
                            onReset={() => {
                                loadGoogleFont(DEFAULT_DOCUMENT_DESIGN.fontFamily);
                                updateDesign({ fontFamily: DEFAULT_DOCUMENT_DESIGN.fontFamily });
                            }}
                        >
                            <select 
                                value={design.fontFamily || 'Inter'} 
                                onChange={e => handleFontChange(e.target.value)}
                                className={cn("w-full text-[12px] bg-transparent outline-none appearance-none font-medium", isDark ? "text-[#ccc]" : "text-[#333]")}
                                style={{ fontFamily: design.fontFamily || 'Inter' }}
                            >
                                {[
                                    { label: 'Inter',          value: 'Inter' },
                                    { label: 'Outfit',         value: 'Outfit' },
                                    { label: 'Poppins',        value: 'Poppins' },
                                    { label: 'Lato',           value: 'Lato' },
                                    { label: 'Roboto',         value: 'Roboto' },
                                    { label: 'Playfair Display', value: 'Playfair Display' },
                                    { label: 'IBM Plex Mono',  value: 'IBM Plex Mono' },
                                    { label: 'Josefin Sans',   value: 'Josefin Sans' },
                                    { label: 'Raleway',        value: 'Raleway' },
                                    { label: 'DM Sans',        value: 'DM Sans' },
                                ].map(({ label, value }) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </MetaField>

                        <MetaField 
                            label="Brand / Primary Color" 
                            isDark={isDark}
                            onReset={() => updateDesign({ primaryColor: DEFAULT_DOCUMENT_DESIGN.primaryColor })}
                        >
                            <div className="flex flex-col gap-2">
                                <ColorisInput 
                                    value={design.primaryColor || '#4dbf39'} 
                                    onChange={val => updateDesign({ primaryColor: val })}
                                    className="w-full"
                                />
                                <p className={cn("text-[9px] opacity-60 px-1 italic", isDark ? "text-white" : "text-black")}>
                                    Affects insert buttons, active states & toggles.
                                </p>
                            </div>
                        </MetaField>
                        
                        <MetaField 
                            label="Main Canvas Background" 
                            isDark={isDark}
                            onReset={() => updateDesign({ backgroundColor: DEFAULT_DOCUMENT_DESIGN.backgroundColor })}
                        >
                            <div className="flex flex-col gap-2">
                                <ColorisInput 
                                    value={design.backgroundColor || (isDark ? '#080808' : '#f7f7f7')} 
                                    onChange={val => updateDesign({ backgroundColor: val })}
                                    className="w-full"
                                />
                                <p className={cn("text-[9px] opacity-60 px-1 italic", isDark ? "text-white" : "text-black")}>
                                    This affects the base background behind the document blocks.
                                </p>
                            </div>
                        </MetaField>
                        <MetaField 
                            label="Main Blocks Background" 
                            isDark={isDark}
                            onReset={() => updateDesign({ blockBackgroundColor: DEFAULT_DOCUMENT_DESIGN.blockBackgroundColor })}
                        >
                            <div className="flex flex-col gap-2">
                                <ColorisInput 
                                    value={design.blockBackgroundColor || '#ffffff'} 
                                    onChange={val => updateDesign({ blockBackgroundColor: val })}
                                    className="w-full"
                                />
                                <p className={cn("text-[9px] opacity-60 px-1 italic", isDark ? "text-white" : "text-black")}>
                                    This sets the default background color for all blocks.
                                </p>
                            </div>
                        </MetaField>

                        <MetaField 
                            label="Background Image / GIF" 
                            isDark={isDark}
                            onReset={() => updateDesign({ backgroundImage: '' })}
                        >
                            <div className="flex flex-col gap-2">
                                {design.backgroundImage && (
                                    <div className="flex flex-col gap-3">
                                        <div className="relative group/bgimg w-full">
                                            <div 
                                                className="h-20 w-full rounded-xl border border-white/10 bg-cover bg-center" 
                                                style={{ backgroundImage: `url(${design.backgroundImage})` }}
                                            />
                                            <button 
                                                onClick={() => updateDesign({ backgroundImage: '' })}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover/bgimg:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                        <div className="space-y-1.5 px-0.5">
                                            <div className="flex items-center justify-between mb-1 px-0.5">
                                                <span className={cn("text-[10px] font-semibold tracking-wide", isDark ? "text-[#555]" : "text-[#bbb]")}>Image Opacity</span>
                                                <span className={cn("text-[10px] font-mono", isDark ? "text-[#444]" : "text-[#ccc]")}>{Math.round((design.backgroundImageOpacity ?? 1) * 100)}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="1" step="0.05" 
                                                value={design.backgroundImageOpacity ?? 1} 
                                                onChange={e => updateDesign({ backgroundImageOpacity: Number(e.target.value) })}
                                                className="w-full cursor-pointer" 
                                            />
                                        </div>
                                    </div>
                                )}
                                <button 
                                    onClick={onUploadBackground}
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed transition-all",
                                        isDark ? "border-white/5 hover:border-[#4dbf39]/30 hover:bg-white/5 text-white/40" : "border-gray-200 hover:border-[#4dbf39]/30 hover:bg-gray-50 text-gray-500"
                                    )}
                                >
                                    <Upload size={14} />
                                    <span className="text-[12px] font-medium">
                                        {design.backgroundImage ? "Change Background" : "Upload Image/GIF"}
                                    </span>
                                </button>
                            </div>
                        </MetaField>
                    </div>
                )}
            </div>

            {/* ── TABLE STYLING ── */}
            {!hideTable && (
                <div>
                    <SectionHeader id="table" label="Table Styling" />
                    {!collapsed['table'] && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                            <MetaField 
                                label="Border Radius"
                                valueLabel={`${design.tableBorderRadius ?? 8}px`}
                                isDark={isDark}
                                onReset={() => updateDesign({ tableBorderRadius: DEFAULT_DOCUMENT_DESIGN.tableBorderRadius })}
                            >
                                <input 
                                    type="range" min="0" max="32" 
                                    value={design.tableBorderRadius ?? 8} 
                                    onChange={e => updateDesign({ tableBorderRadius: Number(e.target.value) })}
                                    className="w-full cursor-pointer" 
                                />
                            </MetaField>

                            <MetaField 
                                label="Header Background" 
                                isDark={isDark}
                                onReset={() => updateDesign({ tableHeaderBg: DEFAULT_DOCUMENT_DESIGN.tableHeaderBg })}
                            >
                                <ColorisInput 
                                    value={design.tableHeaderBg || (isDark ? '#1f1f1f' : '#fafafa')} 
                                    onChange={val => updateDesign({ tableHeaderBg: val })}
                                    className="w-full"
                                />
                            </MetaField>

                            <MetaField 
                                label="Border Color" 
                                isDark={isDark}
                                onReset={() => updateDesign({ tableBorderColor: DEFAULT_DOCUMENT_DESIGN.tableBorderColor })}
                            >
                                <ColorisInput 
                                    value={design.tableBorderColor || (isDark ? '#2a2a2a' : '#ebebeb')} 
                                    onChange={val => updateDesign({ tableBorderColor: val })}
                                    className="w-full"
                                />
                            </MetaField>

                            <MetaField 
                                label="Border Thickness" 
                                valueLabel={`${design.tableStrokeWidth ?? 1}px`}
                                isDark={isDark}
                                onReset={() => updateDesign({ tableStrokeWidth: DEFAULT_DOCUMENT_DESIGN.tableStrokeWidth })}
                            >
                                <input 
                                    type="range" min="0" max="8" step="1" 
                                    value={design.tableStrokeWidth ?? 1} 
                                    onChange={e => updateDesign({ tableStrokeWidth: Number(e.target.value) })}
                                    className="w-full cursor-pointer" 
                                />
                            </MetaField>

                            <MetaField 
                                label="Font Size"
                                valueLabel={`${design.tableFontSize ?? 12}px`}
                                isDark={isDark}
                                onReset={() => updateDesign({ tableFontSize: DEFAULT_DOCUMENT_DESIGN.tableFontSize })}
                            >
                                <input 
                                    type="range" min="8" max="20" step="1" 
                                    value={design.tableFontSize ?? 12} 
                                    onChange={e => updateDesign({ tableFontSize: Number(e.target.value) })}
                                    className="w-full cursor-pointer" 
                                />
                            </MetaField>

                            <MetaField 
                                label="Row Spacing"
                                valueLabel={`${design.tableCellPadding ?? 12}px`}
                                isDark={isDark}
                                onReset={() => updateDesign({ tableCellPadding: DEFAULT_DOCUMENT_DESIGN.tableCellPadding })}
                            >
                                <input 
                                    type="range" min="4" max="32" step="2" 
                                    value={design.tableCellPadding ?? 12} 
                                    onChange={e => updateDesign({ tableCellPadding: Number(e.target.value) })}
                                    className="w-full cursor-pointer" 
                                />
                            </MetaField>
                        </div>
                    )}
                </div>
            )}

            {/* ── SIGNATURE BLOCK ── */}
            {!hideSignature && (
                <div>
                    <SectionHeader id="signature" label="Signature Block" />
                    {!collapsed['signature'] && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                            <MetaField 
                                label="Line Color" 
                                isDark={isDark}
                                onReset={() => updateDesign({ signBarColor: DEFAULT_DOCUMENT_DESIGN.signBarColor })}
                            >
                                <ColorisInput 
                                    value={design.signBarColor || (isDark ? '#ffffff' : '#000000')} 
                                    onChange={val => updateDesign({ signBarColor: val })}
                                    className="w-full"
                                />
                            </MetaField>

                            <MetaField 
                                label="Line Thickness"
                                valueLabel={`${design.signBarThickness ?? 1}px`}
                                isDark={isDark}
                                onReset={() => updateDesign({ signBarThickness: DEFAULT_DOCUMENT_DESIGN.signBarThickness })}
                            >
                                <input 
                                    type="range" min="1" max="6" step="1" 
                                    value={design.signBarThickness ?? 1} 
                                    onChange={e => updateDesign({ signBarThickness: Number(e.target.value) })}
                                    className="w-full cursor-pointer" 
                                />
                            </MetaField>
                        </div>
                    )}
                </div>
            )}

            {/* ── ACTION BAR ── */}
            {!hideActionBar && (
                <div>
                    <SectionHeader id="actionbar" label="Action Bar" />
                    {!collapsed['actionbar'] && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                            <MetaField 
                                label="Theme (Bar & Modal)" 
                                isDark={isDark}
                                onReset={() => updateDesign({ actionTheme: DEFAULT_DOCUMENT_DESIGN.actionTheme })}
                            >
                                <div className={cn("flex w-full p-0.5 rounded-lg border", isDark ? "bg-[#111] border-[#333]" : "bg-[#f5f5f5] border-[#eaeaea]")}>
                                    <button
                                        onClick={() => updateDesign({ actionTheme: 'light' })}
                                        className={cn(
                                            "flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all",
                                            (design.actionTheme || 'light') === 'light'
                                                ? isDark ? "bg-white text-black shadow-sm" : "bg-white text-black shadow-sm"
                                                : isDark ? "text-[#777] hover:text-[#ccc]" : "text-[#777] hover:text-[#333]"
                                        )}
                                    >
                                        Light
                                    </button>
                                    <button
                                        onClick={() => updateDesign({ actionTheme: 'dark' })}
                                        className={cn(
                                            "flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all",
                                            design.actionTheme === 'dark'
                                                ? isDark ? "bg-[#333] text-white shadow-sm" : "bg-[#333] text-white shadow-sm"
                                                : isDark ? "text-[#777] hover:text-[#ccc]" : "text-[#777] hover:text-[#333]"
                                        )}
                                    >
                                        Dark
                                    </button>
                                </div>
                            </MetaField>

                            <MetaField 
                                label="Top Blur Theme (Base Color)" 
                                isDark={isDark}
                                onReset={() => updateDesign({ topBlurTheme: DEFAULT_DOCUMENT_DESIGN.topBlurTheme })}
                            >
                                <div className={cn("flex w-full p-0.5 rounded-lg border", isDark ? "bg-[#111] border-[#333]" : "bg-[#f5f5f5] border-[#eaeaea]")}>
                                    <button
                                        onClick={() => updateDesign({ topBlurTheme: 'light' })}
                                        className={cn(
                                            "flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all",
                                            (design.topBlurTheme || 'light') === 'light'
                                                ? isDark ? "bg-white text-black shadow-sm" : "bg-white text-black shadow-sm"
                                                : isDark ? "text-[#777] hover:text-[#ccc]" : "text-[#777] hover:text-[#333]"
                                        )}
                                    >
                                        White
                                    </button>
                                    <button
                                        onClick={() => updateDesign({ topBlurTheme: 'dark' })}
                                        className={cn(
                                            "flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all",
                                            design.topBlurTheme === 'dark'
                                                ? isDark ? "bg-[#333] text-white shadow-sm" : "bg-[#333] text-white shadow-sm"
                                                : isDark ? "text-[#777] hover:text-[#ccc]" : "text-[#777] hover:text-[#333]"
                                        )}
                                    >
                                        Black
                                    </button>
                                </div>
                            </MetaField>

                            <MetaField 
                                label="Action Button Color" 
                                isDark={isDark}
                                onReset={() => updateDesign({ actionButtonColor: DEFAULT_DOCUMENT_DESIGN.actionButtonColor })}
                            >
                                <ColorisInput 
                                    value={design.actionButtonColor || '#111111'} 
                                    onChange={val => updateDesign({ actionButtonColor: val })}
                                    className="w-full"
                                />
                            </MetaField>

                            <MetaField 
                                label="Action Bar Spacing (Top)"
                                valueLabel={`${design.actionButtonMarginTop ?? 16}px`}
                                isDark={isDark}
                                onReset={() => updateDesign({ actionButtonMarginTop: DEFAULT_DOCUMENT_DESIGN.actionButtonMarginTop })}
                            >
                                <input 
                                    type="range" min="0" max="64" step="4" 
                                    value={design.actionButtonMarginTop ?? 16} 
                                    onChange={e => updateDesign({ actionButtonMarginTop: Number(e.target.value) })}
                                    className="w-full cursor-pointer" 
                                />
                            </MetaField>

                            <MetaField 
                                label="Action Bar Spacing (Bottom)"
                                valueLabel={`${design.actionButtonMarginBottom ?? 16}px`}
                                isDark={isDark}
                                onReset={() => updateDesign({ actionButtonMarginBottom: DEFAULT_DOCUMENT_DESIGN.actionButtonMarginBottom })}
                            >
                                <input 
                                    type="range" min="0" max="64" step="4" 
                                    value={design.actionButtonMarginBottom ?? 16} 
                                    onChange={e => updateDesign({ actionButtonMarginBottom: Number(e.target.value) })}
                                    className="w-full cursor-pointer" 
                                />
                            </MetaField>

                        </div>
                    )}
                </div>
            )}

            <div className="h-10" />
        </div>
    );
}
