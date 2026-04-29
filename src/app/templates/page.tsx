"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutTemplate, Plus, Trash2, Calendar, FileText as ProposalIcon, Receipt as InvoiceIcon, RotateCcw, BookmarkCheck, ClipboardList, Clock, Briefcase, LayoutPanelTop, Zap, Search, PanelTop, Table, PenLine, FileText, Tag, Eye, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLoader } from '@/components/ui/AppLoader';
import { usePersistentState } from '@/hooks/usePersistentState';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { appToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useTemplateStore, Template } from '@/store/useTemplateStore';
import { useProposalStore } from '@/store/useProposalStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useFormStore } from '@/store/useFormStore';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { useSectionTemplateStore, SectionTemplate } from '@/store/useSectionTemplateStore';
import { useSnippetStore, Snippet } from '@/store/useSnippetStore';
import { SnippetPreview } from '@/components/proposals/blocks/SnippetPreview';
import { useMenuStore } from '@/store/useMenuStore';
import { InlineDeleteButton } from '@/components/ui/InlineDeleteButton';

function SnippetItem({ 
    snippet, 
    isDark, 
    onDelete, 
    onUpdate,
    onDuplicate,
    isSelected,
    onSelect
}: { 
    snippet: Snippet, 
    isDark: boolean, 
    onDelete: (id: string) => void,
    onUpdate: (id: string, patch: any) => Promise<boolean>,
    onDuplicate: (s: Snippet) => void,
    isSelected: boolean,
    onSelect: (selected: boolean) => void
}) {
    const [editingName, setEditingName] = useState(false);
    const [name, setName] = useState(snippet.name);
    const [blocks, setBlocks] = useState(snippet.content_blocks);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditingContent, setIsEditingContent] = useState(false);
    const saveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleContentChange = (newBlocks: any[]) => {
        setBlocks(newBlocks);
        
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        
        saveTimerRef.current = setTimeout(async () => {
            setIsSaving(true);
            await onUpdate(snippet.id, { 
                content_blocks: newBlocks,
                content_text: JSON.stringify(newBlocks) 
            });
            setIsSaving(false);
        }, 1000);
    };

    const handleNameSave = async () => {
        if (name.trim() && name !== snippet.name) {
            await onUpdate(snippet.id, { name: name.trim() });
        }
        setEditingName(false);
    };

    return (
        <div className={cn(
            "flex items-start gap-4 py-2 px-4 transition-all hover:bg-black/[0.01] dark:hover:bg-white/[0.01] group border-b last:border-b-0 relative",
            isSelected ? (isDark ? "bg-white/[0.03]" : "bg-black/[0.03]") : "",
            isDark ? "border-white/5" : "border-black/5"
        )}>
            <div className="shrink-0 mt-1 flex flex-col items-center">
                <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                    isDark ? "bg-white/5 text-white/20" : "bg-black/5 text-black/20"
                )}>
                    <Zap size={14} className={isSaving ? "text-yellow-500 animate-pulse" : ""} />
                </div>
            </div>

            <div className="flex-1 min-w-0 pt-1.5">
                <div className="flex items-start justify-between group/name mb-1">
                    <div className="flex-1">
                        {editingName ? (
                            <input
                                autoFocus
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onBlur={handleNameSave}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleNameSave();
                                    if (e.key === 'Escape') {
                                        setName(snippet.name);
                                        setEditingName(false);
                                    }
                                }}
                                className={cn(
                                    "bg-transparent border-none outline-none font-bold text-[14px] w-full py-0 leading-tight transition-opacity",
                                    isDark ? "text-white" : "text-black"
                                )}
                            />
                        ) : (
                            <h3 
                                onClick={() => setEditingName(true)}
                                className="font-bold text-[14px] cursor-text truncate transition-opacity py-0 leading-tight"
                            >
                                {snippet.name}
                            </h3>
                        )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                        <button 
                            onClick={() => setIsEditingContent(!isEditingContent)}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all",
                                isEditingContent 
                                    ? "bg-[var(--brand-primary)] text-black" 
                                    : (isDark ? "bg-white/5 text-white/40 hover:text-white" : "bg-black/5 text-black/40 hover:text-black")
                            )}
                            title={isEditingContent ? "Save changes" : "Edit snippet"}
                        >
                            {isEditingContent ? (
                                <>
                                    <Check size={11} strokeWidth={3} />
                                    <span className="text-[11px] font-bold">Save</span>
                                    {isSaving && <Zap size={10} className="text-yellow-500 animate-pulse ml-0.5" />}
                                </>
                            ) : (
                                <PenLine size={11} />
                            )}
                        </button>
                        <button 
                            onClick={() => onDuplicate(snippet)}
                            className={cn(
                                "p-1.5 rounded-md transition-all hover:bg-black/5 dark:hover:bg-white/5",
                                isDark ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black"
                            )}
                            title="Duplicate"
                        >
                            <Copy size={11} />
                        </button>
                        <InlineDeleteButton 
                            onDelete={() => onDelete(snippet.id)}
                            isDark={isDark}
                            className="!p-1.5 !h-auto !w-auto"
                        />
                    </div>
                </div>

                <div className={cn(
                    "transition-all duration-200",
                    isEditingContent ? "opacity-100 ring-1 ring-[var(--brand-primary)]/20 rounded-lg p-2 bg-black/[0.02] dark:bg-white/[0.02]" : "opacity-90"
                )}>
                    <SnippetPreview 
                        blocks={blocks} 
                        isDark={isDark} 
                        editable={isEditingContent}
                        onChange={handleContentChange}
                    />
                </div>
                
                <div className="flex items-center justify-between mt-2 pb-1">
                    <div className="flex flex-wrap gap-1">
                        {snippet.tags && snippet.tags.length > 0 && snippet.tags.map(tag => (
                            <span key={tag} className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center",
                                isDark ? "bg-white/5 text-white/40" : "bg-black/5 text-black/40"
                            )}>
                                <Tag size={8} className="mr-1 opacity-50" />{tag}
                            </span>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                        <button 
                            onClick={() => onSelect(!isSelected)}
                            className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                isSelected 
                                    ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-black shadow-sm" 
                                    : isDark ? "border-white/10 text-white/10 hover:border-white/30" : "border-black/10 text-black/10 hover:border-black/30"
                            )}
                        >
                            {isSelected ? <Check size={10} strokeWidth={3} /> : <div className="w-1 h-1 rounded-full bg-current opacity-50" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TemplatesPage() {
    const router = useRouter();
    const { navItems } = useMenuStore();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    
    const { templates, fetchTemplates, deleteTemplate, isLoading, setDefaultTemplate } = useTemplateStore();
    const { addProposal } = useProposalStore();
    const { addInvoice } = useInvoiceStore();
    const { addForm } = useFormStore();
    const { addScheduler } = useSchedulerStore();
    
    const [isCreating, setIsCreating] = useState(false);
    const [activeTool, setActiveTool] = usePersistentState<'proposal' | 'invoice' | 'form' | 'scheduler' | 'project'>('templates_filter_active_tool', 'proposal');
    const [activeCategory, setActiveCategory] = usePersistentState<'document' | 'snippet' | 'section'>('templates_filter_active_category', 'document');
    const [sectionSearch, setSectionSearch] = usePersistentState('templates_filter_section_search', '');
    const [sectionTypeFilter, setSectionTypeFilter] = usePersistentState('templates_filter_section_type_filter', 'all');
    const [snippetSearch, setSnippetSearch] = usePersistentState('templates_filter_snippet_search', '');
    const [selectedSnippetIds, setSelectedSnippetIds] = useState<string[]>([]);
    const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);

    const { sectionTemplates, fetchSectionTemplates, deleteSectionTemplate, isLoading: isSectionsLoading } = useSectionTemplateStore();
    const { snippets, fetchSnippets, deleteSnippet, updateSnippet, addSnippet, isLoading: isSnippetsLoading } = useSnippetStore();

    useEffect(() => {
        fetchTemplates();
        fetchSectionTemplates();
        fetchSnippets();
    }, [fetchTemplates, fetchSectionTemplates, fetchSnippets]);

    const handleDuplicateSnippet = async (s: Snippet, silent = false) => {
        const { id, created_at, updated_at, ...payload } = s;
        await addSnippet({
            ...payload,
            name: `${s.name} (Copy)`
        });
        if (!silent) appToast.success('Snippet duplicated');
    };

    const handleBulkDeleteSnippets = async () => {
        for (const id of selectedSnippetIds) {
            await deleteSnippet(id);
        }
        setSelectedSnippetIds([]);
        appToast.success('Snippets deleted');
    };



    const handleDuplicateSection = async (t: SectionTemplate, silent = false) => {
        const { id, created_at, ...payload } = t;
        await addSectionTemplate({
            ...payload,
            name: `${t.name} (Copy)`
        });
        if (!silent) appToast.success('Section duplicated');
    };

    const handleBulkDeleteSections = async () => {
        for (const id of selectedSectionIds) {
            await deleteSectionTemplate(id);
        }
        setSelectedSectionIds([]);
        appToast.success('Sections deleted');
    };

    const handleBulkDuplicateSections = async () => {
        for (const id of selectedSectionIds) {
            const t = sectionTemplates.find(section => section.id === id);
            if (t) await handleDuplicateSection(t, true);
        }
        appToast.success(`${selectedSectionIds.length} sections duplicated`);
        setSelectedSectionIds([]);
    };

    const handleUseTemplate = async (template: Template) => {
        setIsCreating(true);
        try {
            if (template.entity_type === 'proposal') {
                const newProps = await addProposal({
                    title: `Copy of ${template.name}`,
                    client_name: '',
                    status: 'Draft',
                    amount: 0,
                    issue_date: new Date().toISOString(),
                    due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
                    notes: '',
                    blocks: template.blocks,
                    meta: { design: template.design } // Inject the template design
                });
                if (newProps) router.push(`/proposals/${newProps.id}`);
            } else if (template.entity_type === 'invoice') {
                const newInv = await addInvoice({
                    title: `Copy of ${template.name}`,
                    client_name: '',
                    status: 'Draft',
                    amount: 0,
                    issue_date: new Date().toISOString(),
                    due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
                    notes: '',
                    blocks: template.blocks,
                    meta: { design: template.design, currency: 'USD', discountCalc: 'before_tax' } // Inject template design
                });
                if (newInv) router.push(`/invoices/${newInv.id}`);
            } else if (template.entity_type === 'form') {
                const f = await addForm({
                    title: `Copy of ${template.name}`,
                    status: 'Draft',
                    fields: template.blocks,
                    meta: { design: template.design } as any,
                });
                if (f) router.push(`/forms/${f.id}`);
            } else if (template.entity_type === 'scheduler') {
                const s = await addScheduler({
                    title: `Copy of ${template.name}`,
                    status: 'Draft',
                    meta: { ...template.meta, title: `Copy of ${template.name}` } as any,
                });
                if (s) router.push(`/schedulers/${s.id}`);
            } else if (template.entity_type === 'project') {
                // The actual apply logic happens in CreateProjectModal, just route to projects for now
                router.push(`/projects?templateId=${template.id}`);
            }
        } catch (error) {
            console.error("Error creating from template:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleBulkDuplicateSnippets = async () => {
        const snippetsToDup = snippets.filter(s => selectedSnippetIds.includes(s.id));
        for (const s of snippetsToDup) {
            await handleDuplicateSnippet(s, true);
        }
        appToast.success(`${selectedSnippetIds.length} snippets duplicated`);
        setSelectedSnippetIds([]);
    };

    const filteredTemplates = templates.filter(t => {
        return t.entity_type === activeTool;
    });

    const counts = {
        proposal: templates.filter(t => t.entity_type === 'proposal').length,
        invoice: templates.filter(t => t.entity_type === 'invoice').length,
        form: templates.filter(t => t.entity_type === 'form').length,
        scheduler: templates.filter(t => t.entity_type === 'scheduler').length,
        project: templates.filter(t => t.entity_type === 'project').length,
    };

    return (
        <div className={cn(
            "flex flex-col h-full font-sans overflow-hidden",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-[#f7f7f7] text-[#111]"
        )}>
            {/* ── Page Header ── */}
            <div className={cn(
                "flex items-center justify-between px-5 py-3 shrink-0",
                isDark ? "bg-[#141414] border-b border-[#252525]" : "bg-white border-b border-[#ebebeb]"
            )}>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 font-sans">
                        <LayoutTemplate size={14} className="opacity-40" />
                        <span className="text-[13px] font-semibold tracking-tight">{navItems.find(item => item.href === '/templates')?.label || 'Templates'}</span>
                    </div>
                </div>

                {/* ── Category Tabs ── */}
                <div className={cn('flex items-center gap-0.5 p-1 rounded-2xl border', isDark ? 'bg-[#0f0f0f] border-[#252525]' : 'bg-[#f3f3f3] border-[#e8e8e8]')}>
                    {[
                        { id: 'document', label: 'Document Templates', icon: LayoutTemplate },
                        { id: 'section',  label: 'Section Templates',  icon: LayoutPanelTop },
                        { id: 'snippet',  label: 'Snippets',           icon: Zap },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveCategory(tab.id as any)}
                            className={cn(
                                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all',
                                activeCategory === tab.id
                                    ? isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-black shadow-sm'
                                    : isDark ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70'
                            )}
                        >
                            <tab.icon size={13} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Section Templates Tab ── */}
            {activeCategory === 'section' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className={cn('px-5 py-3 border-b flex items-center justify-between min-h-[56px]', isDark ? 'border-[#252525]' : 'border-[#ebebeb]')}>
                        <div className="flex items-center gap-3 flex-1">
                            <div className={cn('relative group/search max-w-[200px] w-full transition-all focus-within:max-w-[300px] flex items-center gap-2 px-3 py-2 rounded-xl border', isDark ? 'bg-white/5 border-white/10' : 'bg-[#f7f7f7] border-[#e8e8e8]')}>
                                <Search size={13} className="opacity-30 shrink-0" />
                                <input
                                    value={sectionSearch}
                                    onChange={e => setSectionSearch(e.target.value)}
                                    placeholder="Search sections..."
                                    className="flex-1 bg-transparent outline-none text-[13px] placeholder:opacity-30"
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                {['all', 'content', 'pricing', 'signature', 'header'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setSectionTypeFilter(type)}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-xl text-[11px] font-semibold capitalize transition-all border',
                                            sectionTypeFilter === type
                                                ? isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-black text-white border-black'
                                                : isDark ? 'border-white/5 text-white/40 hover:border-white/15 hover:text-white/70' : 'border-[#e8e8e8] text-black/40 hover:border-[#ccc] hover:text-black/70'
                                        )}
                                    >
                                        {type === 'all' ? 'All' : type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedSectionIds.length > 0 && (
                            <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-xl border ml-2', isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-[#f8f8f8] border-[#e8e8e8]')}>
                                <span className={cn('text-[11px] font-semibold mr-1', isDark ? 'text-[#aaa]' : 'text-[#666]')}>{selectedSectionIds.length} selected</span>
                                <div className={cn('w-[1px] h-3', isDark ? 'bg-[#333]' : 'bg-[#ddd]')}/>
                                
                                <button onClick={handleBulkDuplicateSections}
                                    className={cn('p-1.5 rounded-md transition-all', isDark ? 'text-[#777] hover:text-white hover:bg-white/5' : 'text-[#888] hover:text-[#333] hover:bg-[#ececec]')}>
                                    <Copy size={12}/>
                                </button>
                                
                                <InlineDeleteButton 
                                    onDelete={handleBulkDeleteSections}
                                    isDark={isDark}
                                    confirmText={`Delete ${selectedSectionIds.length}?`}
                                    className="!p-1.5 !h-auto !w-auto"
                                />

                                <div className={cn('w-[1px] h-3', isDark ? 'bg-[#333]' : 'bg-[#ddd]')}/>
                                <button onClick={() => setSelectedSectionIds([])}
                                    className={cn('p-1.5 rounded-md transition-all', isDark ? 'text-[#555] hover:text-white hover:bg-white/5' : 'text-[#bbb] hover:text-[#333] hover:bg-[#ececec]')}>
                                    <Check size={12}/>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={cn('flex-1 overflow-auto p-6', isDark ? 'bg-[#0f0f0f]' : 'bg-[#f9f9fb]')}>
                        {sectionTemplates.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-40 gap-4">
                                <div className={cn('w-20 h-20 rounded-3xl flex items-center justify-center', isDark ? 'bg-white/5' : 'bg-black/5')}>
                                    <LayoutPanelTop size={36} strokeWidth={1.5} />
                                </div>
                                <div className="text-center max-w-[280px]">
                                    <p className="text-[15px] font-bold">No section templates yet</p>
                                    <p className="text-[12px] mt-1.5 leading-relaxed">
                                        Hover over any block in a Proposal or Invoice editor, then click the
                                        <span className={cn('mx-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center', isDark ? 'bg-white/10' : 'bg-black/8')}>
                                            <LayoutPanelTop size={9} className="mr-0.5" /> save
                                        </span>
                                        icon to save a section here.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                {sectionTemplates
                                    .filter(t => 
                                        t.name.toLowerCase().includes(sectionSearch.toLowerCase()) && 
                                        (sectionTypeFilter === 'all' || t.block_type === sectionTypeFilter)
                                    )
                                    .map(t => (
                                    <div key={t.id} className={cn(
                                        "group flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl relative",
                                        isDark 
                                            ? "bg-[#181818] border-[#252525] hover:border-primary/30" 
                                            : "bg-white border-[#ebebeb] hover:border-primary/30",
                                        selectedSectionIds.includes(t.id) && (isDark ? "border-primary/50 bg-primary/5" : "border-primary/50 bg-primary/5")
                                    )}>
                                        <div 
                                            className="h-28 relative p-4 flex flex-col items-center justify-center border-b border-inherit opacity-80"
                                            style={{ backgroundColor: t.background_color || (isDark ? '#222' : '#f5f5f5') }}
                                        >
                                            {t.block_type === 'header' ? <PanelTop size={32} className="opacity-30" /> :
                                             t.block_type === 'pricing' ? <Table size={32} className="opacity-30" /> :
                                             t.block_type === 'signature' ? <PenLine size={32} className="opacity-30" /> :
                                             <FileText size={32} className="opacity-30" />}
                                             
                                             <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                                 <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDuplicateSection(t);
                                                    }}
                                                    className={cn("p-1.5 rounded-lg transition-all", isDark ? "bg-white/10 text-white/40 hover:text-white" : "bg-black/5 text-black/40 hover:text-black")}
                                                >
                                                    <Copy size={13} />
                                                </button>
                                                <InlineDeleteButton 
                                                    onDelete={() => deleteSectionTemplate(t.id)}
                                                    isDark={isDark}
                                                    className="!p-1.5 !h-auto !w-auto"
                                                />
                                             </div>
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col min-h-0">
                                            <h3 className="font-bold text-[14px] truncate" title={t.name}>{t.name}</h3>
                                            <p className="text-[12px] opacity-60 mt-1 line-clamp-2 min-h-[36px]">
                                                {t.description || 'No description provided.'}
                                            </p>
                                            
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-inherit">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
                                                        isDark ? "bg-white/10 text-white/70" : "bg-black/5 text-black/60"
                                                    )}>
                                                        {t.block_type}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        if (selectedSectionIds.includes(t.id)) setSelectedSectionIds(prev => prev.filter(id => id !== t.id));
                                                        else setSelectedSectionIds(prev => [...prev, t.id]);
                                                    }}
                                                    className={cn(
                                                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                        selectedSectionIds.includes(t.id)
                                                            ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-black shadow-sm" 
                                                            : isDark ? "border-white/10 text-white/10 hover:border-white/30" : "border-black/10 text-black/10 hover:border-black/30"
                                                    )}
                                                >
                                                    {selectedSectionIds.includes(t.id) ? <Check size={10} strokeWidth={3} /> : <div className="w-1 h-1 rounded-full bg-current opacity-50" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Snippets Tab ── */}
            {activeCategory === 'snippet' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className={cn('px-5 py-3 border-b flex items-center justify-between min-h-[56px]', isDark ? 'border-[#252525]' : 'border-[#ebebeb]')}>
                        <div className={cn('relative group/search max-w-[200px] w-full transition-all focus-within:max-w-[300px] flex items-center gap-2 px-3 py-2 rounded-xl border', isDark ? 'bg-white/5 border-white/10' : 'bg-[#f7f7f7] border-[#e8e8e8]')}>
                            <Search size={13} className="opacity-30 shrink-0" />
                            <input
                                value={snippetSearch}
                                onChange={e => setSnippetSearch(e.target.value)}
                                placeholder="Search snippets..."
                                className="flex-1 bg-transparent outline-none text-[13px] placeholder:opacity-30"
                            />
                        </div>

                        {selectedSnippetIds.length > 0 && (
                            <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-xl border ml-2', isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-[#f8f8f8] border-[#e8e8e8]')}>
                                <span className={cn('text-[11px] font-semibold mr-1', isDark ? 'text-[#aaa]' : 'text-[#666]')}>{selectedSnippetIds.length} selected</span>
                                <div className={cn('w-[1px] h-3', isDark ? 'bg-[#333]' : 'bg-[#ddd]')}/>
                                
                                <button onClick={handleBulkDuplicateSnippets}
                                    className={cn('p-1.5 rounded-md transition-all', isDark ? 'text-[#777] hover:text-white hover:bg-white/5' : 'text-[#888] hover:text-[#333] hover:bg-[#ececec]')}>
                                    <Copy size={12}/>
                                </button>
                                
                                <InlineDeleteButton 
                                    onDelete={handleBulkDeleteSnippets}
                                    isDark={isDark}
                                    confirmText={`Delete ${selectedSnippetIds.length}?`}
                                    className="!p-1.5 !h-auto !w-auto"
                                />

                                <div className={cn('w-[1px] h-3', isDark ? 'bg-[#333]' : 'bg-[#ddd]')}/>
                                <button onClick={() => setSelectedSnippetIds([])}
                                    className={cn('p-1.5 rounded-md transition-all', isDark ? 'text-[#555] hover:text-white hover:bg-white/5' : 'text-[#bbb] hover:text-[#333] hover:bg-[#ececec]')}>
                                    <Check size={12}/>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={cn('flex-1 overflow-auto', isDark ? 'bg-[#0f0f0f]' : 'bg-[#f9f9fb]')}>

                        {snippets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-40 gap-4 p-8">
                                <div className={cn('w-20 h-20 rounded-3xl flex items-center justify-center bg-yellow-500/10')}>
                                    <Zap size={36} className="text-yellow-500" strokeWidth={1.5} />
                                </div>
                                <div className="text-center max-w-[300px]">
                                    <p className="text-[15px] font-bold">No snippets yet</p>
                                    <p className="text-[12px] mt-1.5 leading-relaxed">
                                        Select text inside any content block, click the
                                        <span className="mx-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-yellow-500/15 text-yellow-500 inline-flex items-center">
                                            <Zap size={9} className="mr-0.5" /> Save
                                        </span>
                                        button in the formatting bar, and it will appear here.
                                    </p>
                                    <p className="text-[11px] mt-2 opacity-70">
                                        Type <span className={cn('font-black px-1.5 rounded-md', isDark ? 'bg-white/10' : 'bg-black/8')}>::</span> in any editor to instantly insert a snippet.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col pt-6">
                                {snippets
                                    .filter(s => s.name.toLowerCase().includes(snippetSearch.toLowerCase()))
                                    .map(s => (
                                    <SnippetItem 
                                        key={s.id} 
                                        snippet={s} 
                                        isDark={isDark} 
                                        isSelected={selectedSnippetIds.includes(s.id)}
                                        onSelect={(selected) => {
                                            if (selected) setSelectedSnippetIds(prev => [...prev, s.id]);
                                            else setSelectedSnippetIds(prev => prev.filter(id => id !== s.id));
                                        }}
                                        onDuplicate={handleDuplicateSnippet}
                                        onDelete={(id) => deleteSnippet(id)}
                                        onUpdate={updateSnippet}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Document Templates Tab (existing) ── */}
            {activeCategory === 'document' && <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* ── Sidebar ── */}
                <div className={cn(
                    "w-full md:w-56 border-b md:border-b-0 md:border-r shrink-0 flex flex-row md:flex-col p-2 md:p-3 gap-2 overflow-x-auto no-scrollbar",
                    isDark ? "bg-[#141414] border-[#252525]" : "bg-white border-[#ebebeb]"
                )}>
                    <p className={cn("hidden md:block px-3 py-2 text-[10px] font-bold uppercase tracking-widest opacity-30")}>Tools</p>
                    
                    {[
                        { id: 'proposal', label: 'Proposals', icon: ProposalIcon },
                        { id: 'invoice', label: 'Invoices', icon: InvoiceIcon },
                        { id: 'form', label: 'Forms', icon: ClipboardList },
                        { id: 'scheduler', label: 'Schedulers', icon: Clock },
                        { id: 'project', label: 'Projects', icon: Briefcase }
                    ].map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id as any)}
                            className={cn(
                                "flex items-center justify-center md:justify-between px-3 md:px-3 py-2 rounded-xl text-[12px] font-medium transition-all group shrink-0",
                                activeTool === tool.id 
                                    ? isDark ? "bg-white/10 text-white shadow-sm" : "bg-[#f5f5f5] text-black shadow-sm"
                                    : isDark ? "text-[#6b6b6b] hover:text-white hover:bg-white/5" : "text-[#888] hover:text-black hover:bg-[#fafafa]"
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <tool.icon size={15} className={cn("transition-transform", activeTool === tool.id && "scale-110")} />
                                <span>{tool.label}</span>
                            </div>
                            <span className={cn(
                                "hidden md:flex text-[10px] tabular-nums px-1.5 py-0.5 rounded-md",
                                activeTool === tool.id 
                                    ? isDark ? "bg-white/10 text-white/60" : "bg-black/5 text-[#666]"
                                    : "opacity-40 group-hover:opacity-100 transition-opacity"
                            )}>
                                {counts[tool.id as keyof typeof counts]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ── Grid ── */}
                <div className={cn("flex-1 overflow-auto p-6", isDark ? "bg-[#0f0f0f]" : "bg-[#f9f9fb]")}>
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className={cn("h-64 rounded-2xl animate-pulse", isDark ? "bg-white/[0.02]" : "bg-black/[0.02]")} />
                            ))}
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-50 gap-4">
                            <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center", isDark ? "bg-white/5" : "bg-black/5")}>
                                <LayoutTemplate size={32} strokeWidth={1.5} />
                            </div>
                            <div className="text-center">
                                <p className="text-[14px] font-semibold">No {activeTool} templates found</p>
                                <p className="text-[12px] mt-1">Save a document as a template from the editor context menu.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                            {filteredTemplates.map(template => (
                                <div key={template.id} 
                                    onClick={() => router.push(`/templates/edit/${template.id}`)}
                                    className={cn(
                                    "flex flex-col rounded-2xl border transition-all duration-300 relative group overflow-hidden cursor-pointer",
                                    isDark ? "bg-[#1a1a1a] border-white/5 hover:border-primary/40" : "bg-white border-black/5 hover:border-primary/40 hover:shadow-xl hover:shadow-black/5"
                                )}>
                                    {/* Template Preview Header/Placeholder */}
                                    <div className={cn(
                                        "h-32 w-full flex items-center justify-center shrink-0 border-b relative transition-transform duration-500 group-hover:scale-[1.02]",
                                        isDark ? "bg-[#1f1f1f] border-white/5" : "bg-[#f5f5f5] border-black/5"
                                    )} style={{
                                        backgroundColor: template.design?.backgroundColor || (isDark ? '#1a1a1a' : '#ffffff'),
                                        backgroundImage: template.design?.backgroundImage ? `url(${template.design.backgroundImage})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}>
                                        <div className="absolute inset-0 flex items-start justify-center pt-3 overflow-hidden pointer-events-none">
                                            <div className={cn(
                                                "w-[200px] min-h-[300px] mb-[-100px] rounded-md shadow-2xl flex flex-col p-4 gap-2.5 transition-all duration-500 group-hover:scale-[1.05] group-hover:translate-y-1",
                                                isDark ? "bg-[#111] ring-1 ring-white/10" : "bg-white ring-1 ring-black/5"
                                            )} style={{ 
                                                backgroundColor: template.design?.blockBackgroundColor || (isDark ? '#111' : '#fff'),
                                                transform: 'scale(0.55)',
                                                transformOrigin: 'top center'
                                            }}>
                                                {/* Mini Paper Header */}
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-black leading-tight tracking-tight max-w-[120px]" style={{ color: template.design?.primaryColor || (isDark ? '#fff' : '#000') }}>
                                                            {template.design?.documentTitle || (
                                                                template.entity_type === 'invoice' ? 'INVOICE' : 
                                                                template.entity_type === 'form' ? 'FORM' :
                                                                template.entity_type === 'scheduler' ? 'BOOKING' :
                                                                template.entity_type === 'project' ? 'PROJECT BOARD' :
                                                                'PROPOSAL'
                                                            )}
                                                        </div>
                                                        <div className="h-1 w-12 bg-current opacity-10 rounded-full" />
                                                    </div>
                                                    <div className="w-6 h-6 rounded-md bg-current opacity-5" />
                                                </div>

                                                {/* Mini Content Blocks */}
                                                {template.entity_type === 'project' ? (
                                                    <div className="flex gap-2 mt-4 overflow-hidden h-full">
                                                        {[1, 2, 3].map(i => (
                                                            <div key={i} className="flex-1 rounded-md border border-current opacity-20 p-2 flex flex-col gap-2">
                                                                <div className="w-1/2 h-2 rounded-full bg-current opacity-40 mb-1" />
                                                                {[1, 2].map(j => (
                                                                    <div key={j} className="w-full h-8 rounded-md bg-current opacity-10" />
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : template.entity_type === 'scheduler' ? (
                                                    <div className="space-y-3 mt-2">
                                                        <div className="flex gap-1.5 overflow-hidden">
                                                            {[1, 2, 3, 4].map(i => (
                                                                <div key={i} className="w-8 h-8 rounded-md bg-current opacity-5 shrink-0" />
                                                            ))}
                                                        </div>
                                                        <div className="space-y-2">
                                                            {[1, 2, 3].map(i => (
                                                                <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg border border-current opacity-10">
                                                                    <div className="w-2 h-2 rounded-full bg-current opacity-40" />
                                                                    <div className="h-1.5 w-16 bg-current opacity-20 rounded-full" />
                                                                    <div className="ml-auto w-4 h-2 rounded-sm bg-current opacity-10" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (template.blocks || []).slice(0, 8).map((block: any, i: number) => (
                                                    <div key={i} className="w-full shrink-0">
                                                        {template.entity_type === 'form' ? (
                                                            <div className="space-y-1 mt-1">
                                                                <div className="h-1 w-1/3 rounded-sm bg-current opacity-20" />
                                                                <div className="h-3 w-full rounded-md border border-current opacity-10" />
                                                            </div>
                                                        ) : (block.type === 'header' || block.type === 'heading') ? (
                                                            <div className="space-y-1 mt-1">
                                                                <div className="h-2 w-3/4 rounded-sm bg-current opacity-20" />
                                                                <div className="h-1 w-1/4 rounded-sm bg-current opacity-10" />
                                                            </div>
                                                        ) : block.type === 'pricing' ? (
                                                            <div className="mt-1 space-y-1.5 p-2 rounded-lg border border-current opacity-10">
                                                                <div className="flex justify-between">
                                                                    <div className="h-1.5 w-1/2 bg-current opacity-20 rounded-full" />
                                                                    <div className="h-1.5 w-6 bg-current opacity-20 rounded-full" />
                                                                </div>
                                                                <div className="h-1 w-full bg-current opacity-10 rounded-full" />
                                                                <div className="h-1 w-full bg-current opacity-10 rounded-full" />
                                                            </div>
                                                        ) : block.type === 'image' ? (
                                                            <div className="h-12 w-full rounded-lg bg-current opacity-5 flex items-center justify-center">
                                                                <LayoutTemplate size={12} className="opacity-10" />
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1.5">
                                                                <div className="h-1 w-full rounded-full bg-current opacity-10" />
                                                                <div className="h-1 w-full rounded-full bg-current opacity-10" />
                                                                <div className="h-1 w-5/6 rounded-full bg-current opacity-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                
                                                {/* Mini Footer / Sign Area */}
                                                <div className="mt-4 pt-4 border-t border-current opacity-10 flex justify-between items-end">
                                                    <div className="space-y-1">
                                                        <div className="h-1 w-16 bg-current opacity-20 rounded-full" />
                                                        <div className="h-1 w-10 bg-current opacity-10 rounded-full" />
                                                    </div>
                                                    <div className="w-8 h-4 rounded-sm bg-current opacity-5" />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
                                            <span className={cn(
                                                "px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest rounded-md shadow-sm",
                                                template.entity_type === 'proposal' ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                                                : template.entity_type === 'invoice' ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                                : template.entity_type === 'form' ? "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                                                : template.entity_type === 'project' ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                                                : "bg-green-500/10 text-green-500 border border-green-500/20"
                                            )}>
                                                {template.entity_type === 'scheduler' ? 'booking' : template.entity_type}
                                            </span>
                                        </div>
                                        
                                        {template.is_default && (
                                            <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                                                <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest rounded-md shadow-lg bg-primary text-primary-foreground border border-primary/50">
                                                    Default
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Body */}
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className={cn("text-[13px] font-bold truncate flex-1", isDark ? "text-white" : "text-black")}>
                                                {template.name}
                                            </h3>
                                        </div>
                                        
                                        <div className={cn("text-[11px] mt-2 flex items-center gap-1.5", isDark ? "text-[#555]" : "text-[#aaa]")}>
                                            <Calendar size={11} className="opacity-50" />
                                            {(() => {
                                                const date = new Date(template.created_at);
                                                const day = String(date.getDate()).padStart(2, '0');
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const year = date.getFullYear();
                                                return <span>Saved {day}/{month}/{year}</span>;
                                            })()}
                                        </div>

                                        <div className="mt-5 flex gap-2">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUseTemplate(template);
                                                }}
                                                disabled={isCreating}
                                                className={cn(
                                                    "flex-1 h-9 rounded-xl text-[12px] font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2",
                                                    "bg-primary text-primary-foreground hover:opacity-90"
                                                )}
                                            >
                                                {isCreating ? <AppLoader size="xs" /> : <Plus size={13} strokeWidth={2.5} />}
                                                Use
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDefaultTemplate(template.id, template.entity_type);
                                                }}
                                                className={cn(
                                                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all border shrink-0",
                                                    template.is_default 
                                                        ? (isDark ? "bg-primary/20 border-primary/20 text-primary-hover shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]" : "bg-primary/10 border-primary/20 text-primary shadow-sm")
                                                        : (isDark ? "bg-white/5 border-white/5 hover:bg-white/10 text-[#666] hover:text-white" : "bg-white border-black/5 hover:bg-black/5 text-[#888] hover:text-black")
                                                )}
                                                title="Set as Default"
                                            >
                                                <BookmarkCheck size={14} fill={template.is_default ? "currentColor" : "none"} strokeWidth={template.is_default ? 2.5 : 2} />
                                            </button>
                                                <InlineDeleteButton 
                                                    onDelete={() => deleteTemplate(template.id)}
                                                    isDark={isDark}
                                                    className="!w-9 !h-9 !rounded-xl"
                                                />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>}

        </div>
    );
}
