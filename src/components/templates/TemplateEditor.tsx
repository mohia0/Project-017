"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, Save, LayoutTemplate, 
    Monitor, Smartphone, Eye, EyeOff,
    PanelTop, FileText, Table, PenLine, 
    SeparatorHorizontal, Image as ImageIcon,
    Plus, Settings, RotateCcw, ChevronRight, LayoutGrid,
    User, Calendar, DollarSign, Tag, Zap, Trash2, MoreHorizontal,
    PanelRight, Palette, PlusCircle, Check, Info, Upload,
    AlignLeft, ChevronDown
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn, getBackgroundImageWithOpacity } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useTemplateStore, Template } from '@/store/useTemplateStore';
import { ProposalDocument } from '@/components/proposals/ProposalEditor';
import { InvoiceDocument } from '@/components/invoices/InvoiceEditor';
import FormEditor from '@/components/forms/FormEditor';
import SchedulerEditor from '@/components/schedulers/SchedulerEditor';
import KanbanBoard from '@/components/projects/KanbanBoard';
import { DesignSettingsPanel } from '@/components/ui/DesignSettingsPanel';
import { DEFAULT_DOCUMENT_DESIGN } from '@/types/design';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import ImageUploadModal from '@/components/modals/ImageUploadModal';
import DatePicker from '@/components/ui/DatePicker';
import { STATUS_COLORS } from '@/lib/statusConfig';
import { appToast } from '@/lib/toast';
import { ClientActionBar } from '@/components/ui/ClientActionBar';
import { MoneyAmount, convertAmount } from '@/components/ui/MoneyAmount';

// Removed local fmt to use global MoneyAmount component

interface TemplateEditorProps {
    id: string;
}

type RightPanelTab = 'details' | 'appearance';

export default function TemplateEditor({ id }: TemplateEditorProps) {
    const router = useRouter();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { templates, updateTemplate, deleteTemplate, fetchTemplates } = useTemplateStore();
    
    const [template, setTemplate] = useState<Template | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isPreview, setIsPreview] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [isSaving, setIsSaving] = useState(false);
    const [rightTab, setRightTab] = useState<RightPanelTab>('details');
    const [openInsertMenu, setOpenInsertMenu] = useState<number | null>(null);
    const [imageUploadOpen, setImageUploadOpen] = useState(false);
    const [uploadTarget, setUploadTarget] = useState<{ type: 'logo' | 'block' | 'background', blockId?: string } | null>(null);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [insertAfterIdx, setInsertAfterIdx] = useState<number | null>(null);

    const actionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
                setShowActionsMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    useEffect(() => {
        const found = templates.find(t => t.id === id);
        if (found && !isLoaded) {
            const initialTemplate = { ...found };
            
            // If no documentTitle exists in design yet, initialize it appropriately
            if (!(initialTemplate.design as any).documentTitle) {
                initialTemplate.design = { 
                    ...initialTemplate.design, 
                    documentTitle: initialTemplate.entity_type === 'invoice' ? 'INVOICE' : 'PROPOSAL &\nAGREEMENT' 
                } as any;
            }
            
            setTemplate(initialTemplate);
            setIsLoaded(true);
        }
    }, [id, templates, isLoaded]);

    const handleSave = async () => {
        if (!template) return;
        setIsSaving(true);
        try {
            await appToast.promise(
                updateTemplate(id, {
                    blocks: template.blocks,
                    design: template.design,
                    name: template.name,
                    description: template.description
                }),
                {
                    loading: 'Saving template...',
                    success: 'Changes saved successfully',
                    error: 'Failed to save changes'
                }
            );
        } finally {
            setIsSaving(false);
        }
    };

    const updateBlock = useCallback((blockId: string, patch: any) => {
        setTemplate(prev => prev ? {
            ...prev,
            blocks: prev.blocks.map(b => b.id === blockId ? { ...b, ...patch } : b)
        } : prev);
    }, []);

    const removeBlock = useCallback((blockId: string) => {
        setTemplate(prev => prev ? {
            ...prev,
            blocks: prev.blocks.filter(b => b.id !== blockId)
        } : prev);
    }, []);

    const addBlock = (type: any, afterId?: string) => {
        if (type === 'template') {
            const idx = afterId && template?.blocks ? template.blocks.findIndex((b: any) => b.id === afterId) : -1;
            useUIStore.getState().openRightPanel({
                type: 'template_browser',
                onInsert: (blockData: any) => {
                    const nb = { ...blockData, id: uuidv4() };
                    setTemplate(prev => {
                        if (!prev) return prev;
                        const next = [...(prev.blocks || [])];
                        next.splice(idx + 1, 0, nb);
                        return { ...prev, blocks: next };
                    });
                }
            });
            setOpenInsertMenu(null);
            return;
        }
        const nb = { 
            id: uuidv4(), 
            type,
            ...(type === 'text' ? { content: '' } : {}),
            ...(type === 'pricing' ? { rows: [{ id: uuidv4(), title: '', description: '', qty: 1, rate: 0 }], taxRate: 0, discountRate: 0 } : {})
        };
        setTemplate(prev => {
            if (!prev) return prev;
            const idx = afterId ? prev.blocks.findIndex((b: any) => b.id === afterId) : -1;
            const newBlocks = [...prev.blocks];
            newBlocks.splice(idx + 1, 0, nb);
            return { ...prev, blocks: newBlocks };
        });
        setOpenInsertMenu(null);
    };

    const totals = useMemo(() => {
        if (!template) return { subtotal: 0, discAmt: 0, taxAmt: 0, total: 0 };
        const pricingBlocks = template.blocks.filter(b => b.type === 'pricing');
        let subtotal = 0;
        let discAmt = 0;
        let taxAmt = 0;

        pricingBlocks.forEach(b => {
            const blockSub = (b.rows || []).reduce((sum: number, r: any) => sum + (r.qty * (r.rate || 0)), 0);
            const blockDisc = blockSub * ((b.discountRate || 0) / 100);
            const blockTax = (blockSub - blockDisc) * ((b.taxRate || 0) / 100);
            
            subtotal += blockSub;
            discAmt += blockDisc;
            taxAmt += blockTax;
        });

        return { subtotal, discAmt, taxAmt, total: subtotal - discAmt + taxAmt };
    }, [template?.blocks]);

    const updateMeta = (patch: any) => {
        setTemplate(prev => {
            if (!prev) return prev;
            const next = { ...prev };
            
            // Sync specific fields to design or top level
            if (patch.design) next.design = { ...(prev.design || {}), ...patch.design };
            if (patch.logoUrl !== undefined) (next as any).logo_url = patch.logoUrl;
            
            // Store documentTitle in the design object to persist in DB
            if (patch.documentTitle !== undefined) {
                next.design = { ...(next.design || {}), documentTitle: patch.documentTitle } as any;
            }
            
            // maintain a local meta object for sub-component compatibility
            const currentMeta = (prev as any).meta || {};
            (next as any).meta = { ...currentMeta, ...patch };
            
            return next;
        });
    };

    if (!isLoaded || !template) {
        return (
            <div className="flex items-center justify-center h-full opacity-50 text-[12px]">
                Loading template editor...
            </div>
        );
    }

    if (template.entity_type === 'form') {
        return <FormEditor id={id} isTemplate={true} />;
    }

    if (template.entity_type === 'scheduler') {
        return <SchedulerEditor id={id} isTemplate={true} />;
    }

    if (template.entity_type === 'project') {
        return (
            <div className={cn(
                "flex flex-col h-full w-full overflow-hidden font-sans text-[13px]",
                isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-[#f5f5f5] text-[#111]"
            )}>
                {/* ── TOP BAR ── */}
                <div className={cn(
                    "flex items-center justify-between px-6 py-4 border-b shrink-0 transition-colors sticky top-0 z-[9999]",
                    isDark ? "bg-[#141414] border-[#252525]" : "bg-white border-[#e4e4e4]"
                )}>
                    <div className="flex items-center gap-4 flex-1">
                        <button
                            onClick={() => router.push('/templates')}
                            className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-[8px] transition-all",
                                isDark ? "text-[#666] hover:text-[#ccc] bg-[#222]" : "text-[#888] hover:text-[#111] bg-[#f0f0f0] hover:bg-[#e8e8e8]"
                            )}
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "flex items-center gap-2 text-[13px] font-medium",
                                isDark ? "text-white/40" : "text-gray-400"
                            )}>
                                <LayoutTemplate size={14} className="opacity-40" />
                                <span>Project Template</span>
                                <span className="opacity-30">/</span>
                            </div>
                            <input
                                type="text"
                                value={template.name || ""}
                                onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                                className={cn(
                                    "text-[13px] font-semibold bg-transparent outline-none transition-all min-w-[150px]",
                                    isDark ? "text-white/90 placeholder:text-white/20" : "text-gray-900 placeholder:text-gray-300"
                                )}
                                placeholder="Untitled Template"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center justify-center h-[32px] px-4 gap-2 rounded-[8px] transition-all bg-[#4dbf39] hover:bg-[#59d044] text-black font-bold text-[12px] shadow-[0_4px_12px_-4px_rgba(77,191,57,0.3)] disabled:opacity-50"
                        >
                            <Save size={14} />
                            Save
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    <KanbanBoard
                        projectId="template"
                        projectColor={template.design?.primaryColor || '#3d0ebf'}
                        isDark={isDark}
                        searchQuery=""
                        showArchived={false}
                        onTaskClick={() => {}}
                        externalTasks={[]}
                        externalGroups={template.blocks || []}
                        onAddGroupOverride={(name, color) => {
                            const newGroup = { id: uuidv4(), name, color, position: (template.blocks || []).length, project_id: 'template' };
                            setTemplate({ ...template, blocks: [...(template.blocks || []), newGroup] });
                        }}
                        onRenameGroupOverride={(id, name) => {
                            setTemplate({
                                ...template,
                                blocks: (template.blocks || []).map(g => g.id === id ? { ...g, name } : g)
                            });
                        }}
                        onDeleteGroupOverride={(id) => {
                            setTemplate({
                                ...template,
                                blocks: (template.blocks || []).filter(g => g.id !== id)
                            });
                        }}
                        onReorderGroupOverride={(id, newIndex) => {
                            const groups = [...(template.blocks || [])].sort((a, b) => a.position - b.position);
                            const oldIndex = groups.findIndex(g => g.id === id);
                            if (oldIndex === -1) return;
                            const [moved] = groups.splice(oldIndex, 1);
                            groups.splice(newIndex, 0, moved);
                            const newBlocks = groups.map((g, i) => ({ ...g, position: i }));
                            setTemplate({ ...template, blocks: newBlocks });
                        }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "flex flex-col h-full w-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-white text-[#111]"
        )}>

            {/* ── TOP BAR ── */}
            <div className={cn(
                "flex items-center justify-between px-6 py-4 border-b shrink-0 transition-colors sticky top-0 z-[9999]",
                isDark ? "bg-[#141414] border-[#252525]" : "bg-white border-[#e4e4e4]"
            )}>
                <div className="flex items-center gap-4 flex-1">
                    <button
                        onClick={() => router.push('/templates')}
                        className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-[8px] transition-all",
                            isDark ? "text-[#666] hover:text-[#ccc] bg-[#222]" : "text-[#888] hover:text-[#111] bg-[#f0f0f0] hover:bg-[#e8e8e8]"
                        )}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "flex items-center gap-2 text-[13px] font-medium",
                            isDark ? "text-white/40" : "text-gray-400"
                        )}>
                            <LayoutTemplate size={14} className="opacity-40" />
                            <span>Template</span>
                            <span className="opacity-30">/</span>
                        </div>
                        <input
                            type="text"
                            value={template.name || ""}
                            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                            className={cn(
                                "text-[13px] font-semibold bg-transparent outline-none transition-all min-w-[150px]",
                                isDark ? "text-white/90 placeholder:text-white/20" : "text-gray-900 placeholder:text-gray-300"
                            )}
                            placeholder="Untitled Template"
                        />
                    </div>
                </div>



                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (isPreview) {
                                setIsPreview(false);
                            } else {
                                setIsPreview(true);
                                setPreviewMode('desktop');
                            }
                        }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 h-[32px] rounded-[8px] text-[12px] font-bold transition-all",
                            isPreview
                                ? "bg-[#4dbf39] text-black hover:bg-[#59d044]"
                                : isDark 
                                    ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" 
                                    : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]"
                        )}
                    >
                        {isPreview ? <PenLine size={14} /> : <Eye size={14} />}
                        {isPreview ? "Edit" : "Preview"}
                    </button>

                    {isPreview && (
                        <div className="flex items-center gap-1 ml-1">
                            <button
                                onClick={() => setPreviewMode('desktop')}
                                className={cn(
                                    "p-1.5 rounded-[6px] transition-colors",
                                    previewMode === 'desktop'
                                        ? (isDark ? "bg-white/10 text-white" : "bg-black/5 text-black")
                                        : (isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60")
                                )}
                            >
                                <Monitor size={14} />
                            </button>
                            <button
                                onClick={() => setPreviewMode('mobile')}
                                className={cn(
                                    "p-1.5 rounded-[6px] transition-colors",
                                    previewMode === 'mobile'
                                        ? (isDark ? "bg-white/10 text-white" : "bg-black/5 text-black")
                                        : (isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60")
                                )}
                            >
                                <Smartphone size={14} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center justify-center h-[32px] px-4 gap-2 rounded-[8px] transition-all bg-[#4dbf39] hover:bg-[#59d044] text-black font-bold text-[12px] shadow-[0_4px_12px_-4px_rgba(77,191,57,0.3)] disabled:opacity-50"
                    >
                        <Save size={14} />
                        Save Changes
                    </button>

                    <div className="relative ml-1" ref={actionsRef}>
                        <button
                            onClick={() => setShowActionsMenu(s => !s)}
                            className={cn(
                                "flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                                isDark ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]"
                            )}
                        >
                            <MoreHorizontal size={14} />
                        </button>
                        {showActionsMenu && (
                            <div className={cn(
                                "absolute right-0 top-full mt-1.5 w-48 rounded-[10px] shadow-xl py-1 z-50 border",
                                isDark ? "bg-[#0c0c0c] border-[#222]" : "bg-white border-[#e4e4e4]"
                            )}>
                                <button
                                    onClick={() => {
                                        setShowActionsMenu(false);
                                        setIsDeleteModalOpen(true);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={14} className="text-red-500" />
                                    <span>Delete Template</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative z-0 isolate">
                <div 
                    className="flex-1 overflow-auto relative w-full"
                    style={{ 
                        backgroundColor: (isPreview && previewMode === 'mobile') 
                            ? (isDark ? '#080808' : '#f7f7f7') 
                            : (template.design?.backgroundColor) || (isDark ? '#080808' : '#f7f7f7'),
                        backgroundImage: getBackgroundImageWithOpacity(template.design?.backgroundImage, (template.design?.backgroundColor) || (isDark ? '#080808' : '#f7f7f7'), template.design?.backgroundImageOpacity),
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundAttachment: 'fixed',
                    }}
                >
                    {isPreview && previewMode !== 'mobile' && (
                            <div className="z-30 flex justify-center sticky top-0 transition-all w-full pt-1 pb-0 pointer-events-none">
                                <div 
                                    className="absolute inset-0 pointer-events-none"
                                    style={{
                                    }}
                                >
                                    <div className={cn(
                                        "absolute inset-0 pointer-events-none",
                                        template.design?.topBlurTheme === 'dark'
                                            ? "bg-gradient-to-b from-[#000]/80 to-transparent" 
                                            : "bg-gradient-to-b from-white/80 to-transparent"
                                    )} />
                                </div>
                                <div className="relative z-10 w-full pointer-events-auto">
                                    <ClientActionBar
                                        type={template.entity_type}
                                        status="Pending"
                                        design={template.design}
                                        inline={true}
                                        amountDue={convertAmount(totals.total, (template as any).meta?.currency || 'USD', true)}
                                        onDownloadPDF={() => {}}
                                        onPrint={() => {}}
                                        onAccept={() => {}}
                                        onPay={() => {}}
                                        className="w-full max-w-[850px] mx-auto"
                                    />
                                </div>
                            </div>
                        )}
                    <div className={cn(
                        "flex flex-col items-center min-h-full",
                        (isPreview && previewMode === 'mobile') ? "py-8 px-4" : "pt-4 pb-20 px-6"
                    )}>
                        {(isPreview && previewMode === 'mobile') ? (
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    "relative rounded-[44px] border-[4px] shadow-2xl overflow-hidden shrink-0 transition-all duration-300 bg-black",
                                    "w-[390px] h-[844px]",
                                    isDark ? "border-[#1a1a1a]" : "border-[#000]"
                                )}>
                                    <div className={cn(
                                        "absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] rounded-b-[16px] z-10 bg-white/[0.05]"
                                    )} />
                                    <div className="absolute inset-x-0 top-[52px] bottom-0 overflow-y-auto scrollbar-none z-0"
                                         style={{ 
                                             backgroundColor: (template.design?.backgroundColor) || (isDark ? '#080808' : '#f7f7f7'),
                                             backgroundImage: getBackgroundImageWithOpacity(template.design?.backgroundImage, (template.design?.backgroundColor) || (isDark ? '#080808' : '#f7f7f7'), template.design?.backgroundImageOpacity),
                                             backgroundSize: 'cover',
                                             backgroundPosition: 'center',
                                         }}
                                    >
                                        <div className="w-full">
                                            <div className="z-30 flex justify-center sticky top-0 transition-all w-full pt-1 pb-0 pointer-events-none">
                                                <div 
                                                    className="absolute inset-0 pointer-events-none"
                                                    style={{
                                                    }}
                                                >
                                                    <div className={cn(
                                                        "absolute inset-0 pointer-events-none",
                                                        template.design?.topBlurTheme === 'dark'
                                                            ? "bg-gradient-to-b from-[#000]/80 to-transparent" 
                                                            : "bg-gradient-to-b from-white/80 to-transparent"
                                                    )} />
                                                </div>
                                                <div className="relative z-10 w-full pointer-events-auto">
                                                    <ClientActionBar
                                                        type={template.entity_type}
                                                        status="Pending"
                                                        design={template.design}
                                                        inline={true}
                                                        isMobile={true}
                                                        amountDue={convertAmount(totals.total, (template as any).meta?.currency || 'USD', true)}
                                                        onDownloadPDF={() => {}}
                                                        onPrint={() => {}}
                                                        onAccept={() => {}}
                                                        onPay={() => {}}
                                                        className=""
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        {template.entity_type === 'proposal' ? (
                                            <ProposalDocument
                                                meta={{ ...template, documentTitle: (template.design as any).documentTitle, logoUrl: (template as any).logo_url, design: template.design } as any}
                                                blocks={template.blocks}
                                                totals={totals}
                                                isDark={false}
                                                isPreview={true}
                                                isMobile={true}
                                                updateBlock={updateBlock}
                                                removeBlock={removeBlock}
                                                addBlock={addBlock}
                                                openInsertMenu={null}
                                                setOpenInsertMenu={() => {}}
                                                updateMeta={updateMeta}
                                                setBlocks={(blocks: any) => setTemplate(prev => prev ? { ...prev, blocks } : prev)}
                                                currency={(template as any).meta?.currency || 'USD'}
                                                setImageUploadOpen={setImageUploadOpen}
                                                setUploadTarget={setUploadTarget}
                                                isSaveTemplateModalOpen={false}
                                                setIsSaveTemplateModalOpen={() => {}}
                                                addTemplate={() => Promise.resolve(null)}
                                            />
                                        ) : (
                                            <InvoiceDocument
                                                meta={{ ...template, documentTitle: (template.design as any).documentTitle, logoUrl: (template as any).logo_url, design: template.design } as any}
                                                blocks={template.blocks}
                                                totals={totals}
                                                isDark={false}
                                                isPreview={true}
                                                isMobile={true}
                                                updateBlock={updateBlock}
                                                removeBlock={removeBlock}
                                                addBlock={addBlock}
                                                openInsertMenu={null}
                                                setOpenInsertMenu={() => {}}
                                                updateMeta={updateMeta}
                                                setBlocks={(blocks: any) => setTemplate(prev => prev ? { ...prev, blocks } : prev)}
                                            />
                                        )}
                                    </div>
                                    <div className={cn(
                                        "absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[100px] h-[4px] rounded-full z-10",
                                        isDark ? "bg-white/[0.05]" : "bg-black/[0.05]"
                                    )} />
                                </div>
                            </div>
                        ) : (
                            <div 
                                className="w-full max-w-[850px] overflow-hidden transition-all duration-300"
                                style={{ 
                                    borderRadius: `${template.design?.borderRadius ?? 16}px`,
                                    backgroundColor: (template.design?.blockBackgroundColor) || '#ffffff',
                                    backgroundImage: getBackgroundImageWithOpacity(template.design?.backgroundImage, (template.design?.blockBackgroundColor) || '#ffffff', template.design?.backgroundImageOpacity),
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    boxShadow: template.design?.blockShadow || '0 4px 20px -4px rgba(0,0,0,0.05)',
                                }}
                            >
                                {/* ClientActionBar is moved to the sticky header above */}
                                {template.entity_type === 'proposal' ? (
                                    <ProposalDocument
                                        meta={{ ...template, documentTitle: (template.design as any).documentTitle, logoUrl: (template as any).logo_url, design: template.design } as any}
                                        blocks={template.blocks}
                                        totals={totals}
                                        isDark={false}
                                        isPreview={isPreview}
                                        isMobile={false}
                                        updateBlock={updateBlock}
                                        removeBlock={removeBlock}
                                        addBlock={addBlock}
                                        openInsertMenu={openInsertMenu}
                                        setOpenInsertMenu={setOpenInsertMenu}
                                        updateMeta={updateMeta}
                                        setBlocks={(blocks: any) => setTemplate(prev => prev ? { ...prev, blocks } : prev)}
                                        currency={(template as any).meta?.currency || 'USD'}
                                        setImageUploadOpen={setImageUploadOpen}
                                        setUploadTarget={setUploadTarget}
                                        isSaveTemplateModalOpen={false}
                                        setIsSaveTemplateModalOpen={() => {}}
                                        addTemplate={() => Promise.resolve(null)}
                                    />
                                ) : (
                                    <InvoiceDocument
                                        meta={{ ...template, documentTitle: (template.design as any).documentTitle, logoUrl: (template as any).logo_url, design: template.design } as any}
                                        blocks={template.blocks}
                                        totals={totals}
                                        isDark={false}
                                        isPreview={isPreview}
                                        isMobile={false}
                                        updateBlock={updateBlock}
                                        removeBlock={removeBlock}
                                        addBlock={addBlock}
                                        openInsertMenu={openInsertMenu}
                                        setOpenInsertMenu={setOpenInsertMenu}
                                        updateMeta={updateMeta}
                                        setBlocks={(blocks: any) => setTemplate(prev => prev ? { ...prev, blocks } : prev)}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {!isPreview && (
                    <div className={cn(
                        "w-[240px] shrink-0 flex flex-col overflow-hidden border-l",
                        isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-[#f7f7f7] border-[#e4e4e4]"
                    )}>
                        <div className="flex items-center shrink-0 p-1.5 gap-1">
                            {([ ['details', Settings, 'Details'], ['appearance', Palette, 'Design'] ] as const).map(([tab, Icon, label]) => (
                                <button
                                    key={tab}
                                    onClick={() => setRightTab(tab)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold transition-all rounded-xl",
                                        rightTab === tab
                                            ? isDark
                                                ? "bg-white/10 text-white"
                                                : "bg-[#111]/5 text-[#111]"
                                            : isDark
                                                ? "text-[#555] hover:bg-white/[0.03] hover:text-[#aaa]"
                                                : "text-[#bbb] hover:bg-black/[0.03] hover:text-[#666]"
                                    )}
                                >
                                    <Icon size={14} strokeWidth={rightTab === tab ? 2.5 : 2} />
                                    <span className={cn("transition-all", rightTab === tab ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1 absolute")}>
                                        {label}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-auto py-3 px-3 space-y-1.5">
                            {rightTab === 'details' && (
                                <>
                                    <MetaField
                                        label="Template Name"
                                        isDark={isDark}
                                        icon={<Tag size={11} className="opacity-50" />}
                                        onReset={() => setTemplate({ ...template, name: 'Untitled Template' })}
                                    >
                                        <input
                                            value={template.name}
                                            onChange={e => setTemplate({ ...template, name: e.target.value })}
                                            placeholder="Set name..."
                                            className={cn(
                                                "w-full text-[12px] bg-transparent outline-none font-medium",
                                                isDark ? "text-[#ccc] placeholder:text-[#444]" : "text-[#333] placeholder:text-[#ccc]"
                                            )}
                                        />
                                    </MetaField>

                                    <MetaField
                                        label="Description"
                                        isDark={isDark}
                                        icon={<AlignLeft size={11} className="opacity-50" />}
                                        onReset={() => setTemplate({ ...template, description: '' })}
                                    >
                                        <textarea
                                            value={template.description || ""}
                                            onChange={e => setTemplate({ ...template, description: e.target.value })}
                                            placeholder="Internal description..."
                                            className={cn(
                                                "w-full text-[11px] bg-transparent outline-none font-medium resize-none min-h-[60px]",
                                                isDark ? "text-[#ccc] placeholder:text-[#444]" : "text-[#333] placeholder:text-[#ccc]"
                                            )}
                                        />
                                    </MetaField>

                                    <MetaField
                                        label="Currency"
                                        isDark={isDark}
                                        icon={<DollarSign size={11} className="opacity-50" />}
                                        onReset={() => updateMeta({ currency: 'USD' })}
                                    >
                                        <div className="relative flex items-center">
                                            <select
                                                value={(template as any).meta?.currency || 'USD'}
                                                onChange={e => updateMeta({ currency: e.target.value })}
                                                className={cn(
                                                    "w-full text-[12px] bg-transparent outline-none font-medium appearance-none pr-6 cursor-pointer",
                                                    isDark ? "text-[#ccc]" : "text-[#333]"
                                                )}
                                            >
                                                <option value="USD">US Dollar ($)</option>
                                                <option value="EUR">Euro (€)</option>
                                                <option value="GBP">British Pound (£)</option>
                                                <option value="SAR">Saudi Riyal (﷼)</option>
                                                <option value="AED">UAE Dirham (د.إ)</option>
                                            </select>
                                            <ChevronDown size={11} className="absolute right-0 pointer-events-none opacity-40" />
                                        </div>
                                    </MetaField>
                                </>
                            )}

                            {rightTab === 'appearance' && (
                                <DesignSettingsPanel 
                                    isDark={isDark}
                                    meta={{ 
                                        design: template.design,
                                        logoUrl: (template as any).logo_url || ''
                                    } as any}
                                    updateMeta={updateMeta}
                                    onUploadLogo={() => {
                                        setUploadTarget({ type: 'logo' });
                                        setImageUploadOpen(true);
                                    }}
                                    onUploadBackground={() => {
                                        setUploadTarget({ type: 'background' });
                                        setImageUploadOpen(true);
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ImageUploadModal 
                isOpen={imageUploadOpen}
                onClose={() => setImageUploadOpen(false)}
                onUpload={(url: string) => {
                    if (uploadTarget?.type === 'logo') {
                        updateMeta({ logoUrl: url });
                    } else if (uploadTarget?.type === 'background') {
                        updateMeta({ design: { ...(template.design || DEFAULT_DOCUMENT_DESIGN), backgroundImage: url } });
                    } else if (uploadTarget?.type === 'block' && uploadTarget.blockId) {
                        updateBlock(uploadTarget.blockId, { url });
                    }
                    setImageUploadOpen(false);
                }}
                title={uploadTarget?.type === 'logo' ? "Upload Logo" : "Upload Image"}
            />

            <DeleteConfirmModal 
                open={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={async () => {
                    await deleteTemplate(id);
                    router.push('/templates');
                }}
                title="Delete Template"
                description="Are you sure you want to delete this template? This action cannot be undone."
                isDark={isDark}
            />


        </div>
    );
}

function MetaField({ label, children, isDark, icon, onReset }: any) {
    return (
        <div className={cn(
            "rounded-lg border px-3 py-2.5 transition-colors",
            isDark ? "border-[#252525] bg-[#1f1f1f] hover:border-[#333]" : "border-[#eeeeee] bg-white hover:border-[#e4e4e4]"
        )}>
            <div className="flex items-center justify-between mb-1.5 ">
                <div className={cn("flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest", isDark ? "text-[#555]" : "text-[#bbb]")}>
                    {icon}
                    {label}
                </div>
                {onReset && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onReset(); }}
                        className={cn("p-1 rounded-md transition-all", isDark ? "hover:bg-white/5 text-[#444] hover:text-[#888]" : "hover:bg-black/5 text-[#ddd] hover:text-[#aaa]")}
                        title="Reset to default"
                    >
                        <RotateCcw size={10} />
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}
