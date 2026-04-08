"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, RotateCcw, ChevronDown } from 'lucide-react';
import { DocumentDesign, DEFAULT_DOCUMENT_DESIGN } from '@/types/design';
import { ColorisInput } from './ColorisInput';

interface DesignSettingsPanelProps {
    isDark: boolean;
    meta: {
        logoUrl?: string;
        documentTitle?: string;
        design?: DocumentDesign;
    };
    updateMeta: (patch: any) => void;
    onUploadLogo: () => void;
    onUploadBackground: () => void;
}

export function MetaField({ label, children, isDark, icon, onReset }: any) {
    return (
        <div className={cn("rounded-lg border px-3 py-2.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.02)] group/field", isDark ? "border-[#252525] bg-[#1f1f1f]" : "border-[#ebebeb] bg-white")}>
            {label && (
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-40">
                        {icon}
                        {label}
                    </div>
                    {onReset && (
                        <button 
                            onClick={onReset}
                            className={cn(
                                "opacity-0 group-hover/field:opacity-40 hover:!opacity-100 transition-opacity p-0.5 rounded-sm",
                                isDark ? "hover:bg-white/10 text-white" : "hover:bg-black/5 text-black"
                            )}
                            title="Reset to default"
                        >
                            <RotateCcw size={10} />
                        </button>
                    )}
                </div>
            )}
            {children}
        </div>
    );
}

export function DesignSettingsPanel({ isDark, meta, updateMeta, onUploadLogo, onUploadBackground }: DesignSettingsPanelProps) {
    const design = meta.design || {} as Partial<DocumentDesign>;

    const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
    const toggle = (section: string) => setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));

    const updateDesign = (patch: Partial<DocumentDesign>) => {
        updateMeta({ design: { ...design, ...patch } });
    };

    const SectionHeader = ({ id, label }: { id: string, label: string }) => (
        <button 
            onClick={() => toggle(id)}
            className={cn(
                "w-full flex items-center justify-between py-1 mb-2 pl-1 transition-all group",
                isDark ? "hover:text-white" : "hover:text-black"
            )}
        >
            <span className={cn("text-[10px] uppercase tracking-widest font-bold", isDark ? "text-[#555]" : "text-[#bbb]", !collapsed[id] && "text-[#4dbf39]")}>
                {label}
            </span>
            <div className={cn("transition-transform duration-200", collapsed[id] ? "-rotate-90" : "rotate-0")}>
                <ChevronDown size={11} className={isDark ? "text-white/20 group-hover:text-white/40" : "text-black/20 group-hover:text-black/40"} />
            </div>
        </button>
    );

    return (
        <div className="space-y-4 pt-2">
            <div>
                <SectionHeader id="branding" label="Branding" />
                {!collapsed['branding'] && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <MetaField 
                            label="Logo" 
                            isDark={isDark}
                            onReset={() => updateMeta({ logoUrl: '' })}
                        >
                            <div className="flex flex-col gap-2">
                                {meta.logoUrl && (
                                    <div className="relative group/logo w-fit">
                                        <img src={meta.logoUrl} alt="Logo" className="h-12 w-auto rounded border border-white/5 bg-white/5 p-1" />
                                        <button 
                                            onClick={() => updateMeta({ logoUrl: '' })}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/logo:opacity-100 transition-opacity"
                                        >
                                            <X size={10} />
                                        </button>
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
                        
                        <MetaField 
                            label="Document Title" 
                            isDark={isDark}
                            onReset={() => updateMeta({ documentTitle: '' })}
                        >
                            <textarea 
                                value={meta.documentTitle || ''} 
                                onChange={e => updateMeta({ documentTitle: e.target.value })} 
                                placeholder="DOCUMENT TITLE" 
                                rows={1}
                                className={cn("w-full text-[12px] bg-transparent outline-none resize-none px-1 overflow-hidden", isDark ? "text-[#ccc]" : "text-[#333]")}
                                style={{ minHeight: '36px' }}
                            />
                        </MetaField>
                    </div>
                )}
            </div>

            <div>
                <SectionHeader id="spacing" label="Spacing & Corners" />
                {!collapsed['spacing'] && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <MetaField 
                            isDark={isDark} 
                            onReset={() => updateDesign({ marginTop: DEFAULT_DOCUMENT_DESIGN.marginTop })}
                        >
                            <div className="flex items-center justify-between mb-1.5 px-0.5">
                                <span className={cn("text-[10.5px] font-medium", isDark ? "text-[#aaa]" : "text-[#666]")}>Margin Top</span>
                                <span className={cn("text-[10px] font-mono", isDark ? "text-[#555]" : "text-[#aaa]")}>{design.marginTop ?? 24}px</span>
                            </div>
                            <input 
                                type="range" min="0" max="64" step="4" 
                                value={design.marginTop ?? 24} 
                                onChange={e => updateDesign({ marginTop: Number(e.target.value) })}
                                className="w-full accent-[#4dbf39] h-1 bg-black/10 rounded-lg appearance-none cursor-pointer" 
                            />
                        </MetaField>
                        <MetaField 
                            isDark={isDark}
                            onReset={() => updateDesign({ marginBottom: DEFAULT_DOCUMENT_DESIGN.marginBottom })}
                        >
                            <div className="flex items-center justify-between mb-1.5 px-0.5">
                                <span className={cn("text-[10.5px] font-medium", isDark ? "text-[#aaa]" : "text-[#666]")}>Margin Bottom</span>
                                <span className={cn("text-[10px] font-mono", isDark ? "text-[#555]" : "text-[#aaa]")}>{design.marginBottom ?? 24}px</span>
                            </div>
                            <input 
                                type="range" min="0" max="64" step="4" 
                                value={design.marginBottom ?? 24} 
                                onChange={e => updateDesign({ marginBottom: Number(e.target.value) })}
                                className="w-full accent-[#4dbf39] h-1 bg-black/10 rounded-lg appearance-none cursor-pointer" 
                            />
                        </MetaField>
                        <MetaField 
                            isDark={isDark}
                            onReset={() => updateDesign({ borderRadius: DEFAULT_DOCUMENT_DESIGN.borderRadius })}
                        >
                            <div className="flex items-center justify-between mb-1.5 px-0.5">
                                <span className={cn("text-[10.5px] font-medium", isDark ? "text-[#aaa]" : "text-[#666]")}>Block Corners</span>
                                <span className={cn("text-[10px] font-mono", isDark ? "text-[#555]" : "text-[#aaa]")}>{design.borderRadius ?? 16}px</span>
                            </div>
                            <input 
                                type="range" min="0" max="32" step="2" 
                                value={design.borderRadius ?? 16} 
                                onChange={e => updateDesign({ borderRadius: Number(e.target.value) })}
                                className="w-full accent-[#4dbf39] h-1 bg-black/10 rounded-lg appearance-none cursor-pointer" 
                            />
                        </MetaField>
                    </div>
                )}
            </div>

            <div>
                <SectionHeader id="typo" label="Typography & Colors" />
                {!collapsed['typo'] && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <MetaField 
                            label="Font" 
                            isDark={isDark}
                            onReset={() => updateDesign({ fontFamily: DEFAULT_DOCUMENT_DESIGN.fontFamily })}
                        >
                            <select 
                                value={design.fontFamily || 'Inter'} 
                                onChange={e => updateDesign({ fontFamily: e.target.value })}
                                className={cn("w-full text-[12px] bg-transparent outline-none appearance-none font-medium", isDark ? "text-[#ccc]" : "text-[#333]")}
                            >
                                {['Inter', 'Outfit', 'Playfair', 'IBM Plex Mono'].map(font => (
                                    <option key={font} value={font}>{font}</option>
                                ))}
                            </select>
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
                            label="Background Image / GIF" 
                            isDark={isDark}
                            onReset={() => updateDesign({ backgroundImage: '' })}
                        >
                            <div className="flex flex-col gap-2">
                                {design.backgroundImage && (
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

            <div>
                <SectionHeader id="table" label="Table Styling" />
                {!collapsed['table'] && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <MetaField 
                            isDark={isDark}
                            onReset={() => updateDesign({ tableBorderRadius: DEFAULT_DOCUMENT_DESIGN.tableBorderRadius })}
                        >
                            <div className="flex items-center justify-between mb-1.5 px-0.5">
                                <span className={cn("text-[10.5px] font-medium", isDark ? "text-[#aaa]" : "text-[#666]")}>Border Radius</span>
                                <span className={cn("text-[10px] font-mono", isDark ? "text-[#555]" : "text-[#aaa]")}>{design.tableBorderRadius ?? 8}px</span>
                            </div>
                            <input 
                                type="range" min="0" max="32" 
                                value={design.tableBorderRadius ?? 8} 
                                onChange={e => updateDesign({ tableBorderRadius: Number(e.target.value) })}
                                className={cn("w-full h-1.5 rounded-full appearance-none outline-none", isDark ? "bg-[#1f1f1f] accent-[#aaa]" : "bg-[#f0f0f0] accent-[#666]")}
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
                            isDark={isDark}
                            onReset={() => updateDesign({ tableStrokeWidth: DEFAULT_DOCUMENT_DESIGN.tableStrokeWidth })}
                        >
                            <div className="flex items-center justify-between mb-1.5 px-0.5">
                                <span className={cn("text-[10px] font-mono", isDark ? "text-[#555]" : "text-[#aaa]")}>{design.tableStrokeWidth ?? 1}px</span>
                            </div>
                            <input 
                                type="range" min="0" max="8" step="1" 
                                value={design.tableStrokeWidth ?? 1} 
                                onChange={e => updateDesign({ tableStrokeWidth: Number(e.target.value) })}
                                className="w-full accent-[#4dbf39] h-1 bg-black/10 rounded-lg appearance-none cursor-pointer" 
                            />
                        </MetaField>
                    </div>
                )}
            </div>

            <div>
                <SectionHeader id="sign" label="Signature Bar" />
                {!collapsed['sign'] && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <MetaField 
                            isDark={isDark}
                            onReset={() => updateDesign({ signBarThickness: DEFAULT_DOCUMENT_DESIGN.signBarThickness })}
                        >
                            <div className="flex items-center justify-between mb-1.5 px-0.5">
                                <span className={cn("text-[10.5px] font-medium", isDark ? "text-[#aaa]" : "text-[#666]")}>Thickness</span>
                                <span className={cn("text-[10px] font-mono", isDark ? "text-[#555]" : "text-[#aaa]")}>{design.signBarThickness ?? 1}px</span>
                            </div>
                            <input 
                                type="range" min="1" max="8" step="1" 
                                value={design.signBarThickness ?? 1} 
                                onChange={e => updateDesign({ signBarThickness: Number(e.target.value) })}
                                className="w-full accent-[#4dbf39] h-1 bg-black/10 rounded-lg appearance-none cursor-pointer" 
                            />
                        </MetaField>
                        
                        <MetaField 
                            label="Bar Color" 
                            isDark={isDark}
                            onReset={() => updateDesign({ signBarColor: DEFAULT_DOCUMENT_DESIGN.signBarColor })}
                        >
                            <div className="flex items-center gap-3 pt-1">
                                {['#111111', '#2563eb', '#16a34a', '#dc2626', '#d97706', '#9333ea'].map(color => (
                                    <button
                                        key={color}
                                        onClick={() => updateDesign({ signBarColor: color })}
                                        style={{ background: color }}
                                        className={cn(
                                            "w-6 h-6 rounded-full border-2 transition-transform shadow-sm",
                                            (design.signBarColor || '#111111') === color ? "border-[#4dbf39] scale-110" : "border-transparent"
                                        )}
                                    />
                                ))}
                            </div>
                        </MetaField>
                    </div>
                )}
            </div>

            <div className="h-10" />
        </div>
    );
}
