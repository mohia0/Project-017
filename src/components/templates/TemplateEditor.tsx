"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, Save, LayoutTemplate, 
    Monitor, Smartphone, Eye, EyeOff,
    PanelTop, FileText, Table, PenLine, 
    SeparatorHorizontal, Image as ImageIcon,
    Plus, Settings, RotateCcw, ChevronRight, LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useTemplateStore, Template } from '@/store/useTemplateStore';
import { ProposalDocument } from '@/components/proposals/ProposalEditor';
import { InvoiceDocument } from '@/components/invoices/InvoiceEditor';
import { DesignSettingsPanel } from '@/components/ui/DesignSettingsPanel';
import { DEFAULT_DOCUMENT_DESIGN } from '@/types/design';

interface TemplateEditorProps {
    id: string;
}

export default function TemplateEditor({ id }: TemplateEditorProps) {
    const router = useRouter();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { templates, updateTemplate, fetchTemplates } = useTemplateStore();
    
    const [template, setTemplate] = useState<Template | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isPreview, setIsPreview] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    useEffect(() => {
        const found = templates.find(t => t.id === id);
        if (found && !isLoaded) {
            setTemplate(found);
            setIsLoaded(true);
        }
    }, [id, templates, isLoaded]);

    const design = template?.design || DEFAULT_DOCUMENT_DESIGN;

    const designVars = useMemo(() => ({
        // Block layout
        '--block-margin-top': `${design.marginTop ?? 24}px`,
        '--block-margin-bottom': `${design.marginBottom ?? 24}px`,
        '--block-border-radius': `${design.borderRadius ?? 16}px`,
        // Table
        '--table-border-radius': `${design.tableBorderRadius ?? 8}px`,
        '--table-header-bg': design.tableHeaderBg || (isDark ? '#1a1a1a' : '#fcfcfc'),
        '--table-border-color': design.tableBorderColor || (isDark ? '#2a2a2a' : '#ebebeb'),
        '--table-stroke-width': `${design.tableStrokeWidth ?? 1}px`,
        '--table-font-size': `${design.tableFontSize ?? 12}px`,
        '--table-cell-padding': `${design.tableCellPadding ?? 12}px`,
        // Colors
        '--primary-color': design.primaryColor || '#4dbf39',
        '--primary': design.primaryColor || '#4dbf39',
        // Signature
        '--sign-bar-color': design.signBarColor || (isDark ? '#ffffff' : '#000000'),
        '--sign-bar-thick': `${design.signBarThickness ?? 1}px`,
        // Font
        fontFamily: design.fontFamily || 'Inter',
    } as React.CSSProperties), [design, isDark]);

    const handleSave = async () => {
        if (!template) return;
        setIsSaving(true);
        setSaveStatus('saving');
        
        const success = await updateTemplate(id, {
            blocks: template.blocks,
            design: template.design,
            name: template.name,
            description: template.description
        });
        
        if (success) {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }
        setIsSaving(false);
    };

    if (!isLoaded || !template) {
        return (
            <div className="flex items-center justify-center h-full opacity-50 text-[12px]">
                Loading template editor...
            </div>
        );
    }

    return (
        <div className={cn(
            "flex flex-col h-full font-sans overflow-hidden",
            isDark ? "bg-[#0a0a0a] text-white" : "bg-[#f4f4f7] text-[#111]"
        )}>
            {/* ── Page Header ── */}
            <header className={cn(
                "h-14 border-b flex items-center justify-between px-5 shrink-0 transition-all z-50 relative",
                isDark ? "bg-[#141414] border-white/5" : "bg-white border-black/5"
            )}>
                <div className="flex items-center gap-2">
                    <div 
                        onClick={() => router.push('/templates')}
                        className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    >
                        <LayoutTemplate size={14} className="opacity-40" />
                        <span className="text-[13px] font-medium opacity-40">Templates</span>
                    </div>
                    <ChevronRight size={12} className="opacity-20" />
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/5 dark:bg-white/5">
                        {template.entity_type === 'proposal' ? <FileText size={14} className="opacity-40" /> : <Table size={14} className="opacity-40" />}
                        <input 
                            value={template.name}
                            onChange={e => setTemplate({...template, name: e.target.value})}
                            className="bg-transparent font-bold text-[13px] outline-none border-none min-w-[120px]"
                            placeholder="Template Name..."
                        />
                    </div>
                </div>
                
                {/* Middle: Auto-save Indicator (Unified with other editors) */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-none">
                    {saveStatus === 'saving' && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 animate-in fade-in zoom-in-95 duration-200">
                            <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            <span className={cn("text-[10px] font-bold tracking-widest uppercase opacity-60", isDark ? "text-white" : "text-black")}>Saving...</span>
                        </div>
                    )}
                    {saveStatus === 'saved' && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#4dbf39]/5 border border-[#4dbf39]/10 animate-in fade-in zoom-in-95 duration-200">
                            <div className="w-1 h-1 rounded-full bg-[#4dbf39]" />
                            <span className="text-[10px] font-bold tracking-widest uppercase text-[#4dbf39]">Saved</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Preview Switcher */}
                    <div className={cn(
                        "flex items-center p-1 rounded-[12px] border",
                        isDark ? "bg-black/20 border-white/5" : "bg-black/5 border-black/5"
                    )}>
                        <button 
                            onClick={() => setIsPreview(false)}
                            className={cn(
                                "h-8 px-3 rounded-[9px] text-[11px] font-bold transition-all flex items-center gap-2", 
                                !isPreview 
                                    ? (isDark ? "bg-[#4dbf39] text-black shadow-lg" : "bg-white text-black shadow-sm") 
                                    : "opacity-40 hover:opacity-100"
                            )}
                        >
                            <Settings size={13} /> Edit Mode
                        </button>
                        <button 
                            onClick={() => setIsPreview(true)}
                            className={cn(
                                "h-8 px-3 rounded-[9px] text-[11px] font-bold transition-all flex items-center gap-2", 
                                isPreview 
                                    ? (isDark ? "bg-[#4dbf39] text-black shadow-lg" : "bg-white text-black shadow-sm") 
                                    : "opacity-40 hover:opacity-100"
                            )}
                        >
                            <Eye size={13} /> Preview
                        </button>
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className={cn(
                            "h-9 px-5 rounded-[12px] text-[12px] font-bold flex items-center gap-2 transition-all shadow-xl active:scale-95",
                            isDark ? "bg-[#4dbf39] hover:bg-[#5cd646] text-[#0a0a0a]" : "bg-black hover:bg-black/80 text-white"
                        )}
                    >
                        <Save size={14} />
                        Save Changes
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Design Panel */}
                {!isPreview && (
                    <div className={cn(
                        "w-80 border-r overflow-y-auto p-4 shrink-0 transition-all",
                        isDark ? "bg-[#141414] border-white/5" : "bg-white border-black/5"
                    )}>
                         <DesignSettingsPanel 
                            isDark={isDark}
                            meta={{ 
                                design: template.design,
                                logoUrl: (template as any).logo_url || '',
                                documentTitle: template.name
                            } as any}
                            updateMeta={(patch) => {
                                setTemplate(prev => {
                                    if (!prev) return prev;
                                    const next = { ...prev };
                                    if (patch.design) next.design = { ...(prev.design || {}), ...patch.design };
                                    if (patch.logoUrl !== undefined) (next as any).logo_url = patch.logoUrl;
                                    if (patch.documentTitle !== undefined) next.name = patch.documentTitle;
                                    return next;
                                });
                            }}
                            onUploadLogo={() => alert('Logo upload in templates coming soon')}
                            onUploadBackground={() => alert('Background upload in templates coming soon')}
                        />
                    </div>
                )}

                {/* Main: Canvas */}
                <div 
                    className="flex-1 overflow-y-auto flex flex-col items-center py-12 px-6 transition-all duration-300"
                    style={{ 
                        backgroundColor: (template.design?.backgroundColor) || (isDark ? '#080808' : '#f7f7f7'),
                        backgroundImage: template.design?.backgroundImage ? `url(${template.design.backgroundImage})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundAttachment: 'fixed',
                    }}
                >
                    {/* Mobile/Desktop Toggle */}
                    {isPreview && (
                        <div className={cn(
                            "mb-8 flex h-[32px] p-0.5 gap-0.5 rounded-[8px] shrink-0 transition-all",
                            isDark ? "bg-[#2a2a2a]" : "bg-[#f0f0f0]"
                        )}>
                            <button 
                                onClick={() => setPreviewMode('desktop')} 
                                className={cn(
                                    "px-3 h-full rounded-[6px] transition-all flex items-center justify-center", 
                                    previewMode === 'desktop' 
                                        ? isDark ? "bg-[#4dbf39] text-black" : "bg-white text-black shadow-sm"
                                        : isDark ? "text-white/20 hover:text-white/40" : "text-black/20 hover:text-black/40"
                                )}
                            >
                                <Monitor size={14} strokeWidth={2.5} />
                            </button>
                            <button 
                                onClick={() => setPreviewMode('mobile')} 
                                className={cn(
                                    "px-3 h-full rounded-[6px] transition-all flex items-center justify-center", 
                                    previewMode === 'mobile' 
                                        ? isDark ? "bg-[#4dbf39] text-black" : "bg-white text-black shadow-sm"
                                        : isDark ? "text-white/20 hover:text-white/40" : "text-black/20 hover:text-black/40"
                                )}
                            >
                                <Smartphone size={14} strokeWidth={2.5} />
                            </button>
                        </div>
                    )}

                    <div 
                        className={cn(
                            "transition-all duration-500 ease-in-out",
                            isPreview && previewMode === 'mobile' ? "w-[375px] h-[812px] overflow-y-auto border-[8px] border-[#1a1a1a] rounded-[3rem] shadow-2xl bg-white" : "w-full max-w-[850px]"
                        )}
                        style={designVars}
                    >
                        {template.entity_type === 'proposal' ? (
                            <ProposalDocument 
                                meta={{ design: template.design } as any}
                                blocks={template.blocks}
                                totals={{ subtotal: 0, discAmt: 0, taxAmt: 0, total: 0 }}
                                isPreview={isPreview} 
                                isDark={isDark}
                                isMobile={isPreview && previewMode === 'mobile'}
                                updateBlock={(blockId: string, patch: any) => {
                                    setTemplate(prev => prev ? {
                                        ...prev,
                                        blocks: prev.blocks.map(b => b.id === blockId ? { ...b, ...patch } : b)
                                    } : prev);
                                }}
                                removeBlock={(blockId: string) => {
                                    setTemplate(prev => prev ? {
                                        ...prev,
                                        blocks: prev.blocks.filter(b => b.id !== blockId)
                                    } : prev);
                                }}
                                addBlock={(type: any, afterId?: string) => {
                                    setTemplate(prev => {
                                        if (!prev) return prev;
                                        const newBlock = { id: `tb-${Math.random()}`, type };
                                        const idx = afterId ? prev.blocks.findIndex((b: any) => b.id === afterId) : -1;
                                        const newBlocks = [...prev.blocks];
                                        newBlocks.splice(idx + 1, 0, newBlock);
                                        return { ...prev, blocks: newBlocks };
                                    });
                                }}
                                openInsertMenu={null}
                                setOpenInsertMenu={() => {}}
                                setBlocks={(blocks: any) => setTemplate(prev => prev ? { ...prev, blocks } : prev)}
                                updateMeta={() => {}}
                                currency="USD"
                                setImageUploadOpen={() => {}}
                                setUploadTarget={() => {}}
                                isSaveTemplateModalOpen={false}
                                setIsSaveTemplateModalOpen={() => {}}
                                addTemplate={() => Promise.resolve(null)}
                            />
                        ) : (
                            <InvoiceDocument 
                                meta={{ design: template.design } as any}
                                blocks={template.blocks}
                                totals={{ subtotal: 0, discAmt: 0, taxAmt: 0, total: 0 }}
                                isPreview={isPreview}
                                isDark={isDark}
                                isMobile={isPreview && previewMode === 'mobile'}
                                updateBlock={(blockId: string, patch: any) => {
                                    setTemplate(prev => prev ? {
                                        ...prev,
                                        blocks: prev.blocks.map(b => b.id === blockId ? { ...b, ...patch } : b)
                                    } : prev);
                                }}
                                removeBlock={(blockId: string) => {
                                    setTemplate(prev => prev ? {
                                        ...prev,
                                        blocks: prev.blocks.filter(b => b.id !== blockId)
                                    } : prev);
                                }}
                                addBlock={(type: any, afterId?: string) => {
                                    setTemplate(prev => {
                                        if (!prev) return prev;
                                        const newBlock = { id: `tb-${Math.random()}`, type };
                                        const idx = afterId ? prev.blocks.findIndex((b: any) => b.id === afterId) : -1;
                                        const newBlocks = [...prev.blocks];
                                        newBlocks.splice(idx + 1, 0, newBlock);
                                        return { ...prev, blocks: newBlocks };
                                    });
                                }}
                                openInsertMenu={null}
                                setOpenInsertMenu={() => {}}
                                setBlocks={(blocks: any) => setTemplate(prev => prev ? { ...prev, blocks } : prev)}
                                updateMeta={() => {}}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
