"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutTemplate, Plus, FileText, Trash2, Calendar, FileType2, FileText as ProposalIcon, Receipt as InvoiceIcon, ChevronRight, LayoutGrid, RotateCcw, Pencil, BookmarkCheck, ClipboardList, Clock, Briefcase } from 'lucide-react';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { appToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useTemplateStore, Template } from '@/store/useTemplateStore';
import { useProposalStore } from '@/store/useProposalStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useFormStore } from '@/store/useFormStore';
import { useSchedulerStore } from '@/store/useSchedulerStore';

export default function TemplatesPage() {
    const router = useRouter();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    
    const { templates, fetchTemplates, deleteTemplate, isLoading, setDefaultTemplate } = useTemplateStore();
    const { addProposal } = useProposalStore();
    const { addInvoice } = useInvoiceStore();
    const { addForm } = useFormStore();
    const { addScheduler } = useSchedulerStore();
    
    const [isCreating, setIsCreating] = useState(false);
    const [activeTool, setActiveTool] = useState<'proposal' | 'invoice' | 'form' | 'scheduler' | 'project'>('proposal');
    const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

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
                    <div 
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    >
                        <LayoutGrid size={14} className="opacity-40" />
                    </div>
                    <ChevronRight size={12} className="opacity-20" />
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/5 dark:bg-white/5">
                        <LayoutTemplate size={14} className="opacity-40" />
                        <span className="text-[13px] font-semibold tracking-tight">Templates</span>
                    </div>
                    <>
                        <ChevronRight size={12} className="opacity-20" />
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/5 dark:bg-white/5">
                            {activeTool === 'proposal' ? <ProposalIcon size={14} className="opacity-40" /> 
                            : activeTool === 'invoice' ? <InvoiceIcon size={14} className="opacity-40" /> 
                            : activeTool === 'form' ? <ClipboardList size={14} className="opacity-40" /> 
                            : activeTool === 'project' ? <Briefcase size={14} className="opacity-40" />
                            : <Clock size={14} className="opacity-40" />}
                            <span className="text-[13px] font-semibold capitalize">{activeTool}s</span>
                        </div>
                    </>
                </div>


            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
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
                                                    isDark ? "bg-primary text-primary-foreground hover:bg-primary-hover" : "bg-black text-white hover:bg-black/80"
                                                )}
                                            >
                                                {isCreating ? <RotateCcw size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={2.5} />}
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
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTemplateToDelete(template.id);
                                                }}
                                                className={cn(
                                                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all border shrink-0",
                                                    isDark ? "bg-red-500/10 border-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 border-red-100 text-red-500 hover:bg-red-100"
                                                )}
                                                title="Delete template"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <DeleteConfirmModal 
                open={!!templateToDelete}
                onClose={() => setTemplateToDelete(null)}
                onConfirm={async () => {
                    if (templateToDelete) {
                        await appToast.promise(
                            deleteTemplate(templateToDelete),
                            {
                                loading: 'Deleting template...',
                                success: 'Template deleted',
                                error: 'Failed to delete template'
                            }
                        );
                        setTemplateToDelete(null);
                    }
                }}
                title="Delete Template"
                description="Are you sure you want to delete this template? This will permanently remove it from your library."
                isDark={isDark}
            />
        </div>
    );
}
