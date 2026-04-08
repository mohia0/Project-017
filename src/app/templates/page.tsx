"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutTemplate, Plus, FileText, Trash2, Calendar, FileType2, FileText as ProposalIcon, Receipt as InvoiceIcon, ChevronRight, LayoutGrid, RotateCcw, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useTemplateStore, Template } from '@/store/useTemplateStore';
import { useProposalStore } from '@/store/useProposalStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';

export default function TemplatesPage() {
    const router = useRouter();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    
    const { templates, fetchTemplates, deleteTemplate, isLoading } = useTemplateStore();
    const { addProposal } = useProposalStore();
    const { addInvoice } = useInvoiceStore();
    
    const [isCreating, setIsCreating] = useState(false);
    const [activeTool, setActiveTool] = useState<'all' | 'proposal' | 'invoice'>('all');

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
            } else {
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
            }
        } catch (error) {
            console.error("Error creating from template:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const filteredTemplates = templates.filter(t => {
        if (activeTool === 'all') return true;
        return t.entity_type === activeTool;
    });

    const counts = {
        all: templates.length,
        proposal: templates.filter(t => t.entity_type === 'proposal').length,
        invoice: templates.filter(t => t.entity_type === 'invoice').length
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
                    {activeTool !== 'all' && (
                        <>
                            <ChevronRight size={12} className="opacity-20" />
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/5 dark:bg-white/5">
                                {activeTool === 'proposal' ? <ProposalIcon size={14} className="opacity-40" /> : <InvoiceIcon size={14} className="opacity-40" />}
                                <span className="text-[13px] font-semibold capitalize">{activeTool}s</span>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => {/* Open a "New Template" modal or redirect */}}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-[10px] bg-[#4dbf39] hover:bg-[#59d044] text-black transition-colors"
                    >
                        <Plus size={13} strokeWidth={2.5} /> New Template
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* ── Sidebar ── */}
                <div className={cn(
                    "w-56 border-r shrink-0 flex flex-col p-3 gap-1",
                    isDark ? "bg-[#141414] border-[#252525]" : "bg-white border-[#ebebeb]"
                )}>
                    <p className={cn("px-3 py-2 text-[10px] font-bold uppercase tracking-widest opacity-30")}>Tools</p>
                    
                    {[
                        { id: 'all', label: 'All Templates', icon: LayoutTemplate },
                        { id: 'proposal', label: 'Proposals', icon: ProposalIcon },
                        { id: 'invoice', label: 'Invoices', icon: InvoiceIcon }
                    ].map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id as any)}
                            className={cn(
                                "flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-medium transition-all group",
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
                                "text-[10px] tabular-nums px-1.5 py-0.5 rounded-md",
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
                                <p className="text-[14px] font-semibold">No {activeTool === 'all' ? '' : activeTool} templates found</p>
                                <p className="text-[12px] mt-1">Save a document as a template from the editor context menu.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                            {filteredTemplates.map(template => (
                                <div key={template.id} className={cn(
                                    "flex flex-col rounded-2xl border transition-all duration-300 relative group overflow-hidden cursor-default",
                                    isDark ? "bg-[#1a1a1a] border-white/5 hover:border-[#4dbf39]/40" : "bg-white border-black/5 hover:border-[#4dbf39]/40 hover:shadow-xl hover:shadow-black/5"
                                )}>
                                    {/* Template Preview Header/Placeholder */}
                                    <div className={cn(
                                        "h-32 w-full flex items-center justify-center shrink-0 border-b relative transition-transform duration-500 group-hover:scale-[1.02]",
                                        isDark ? "bg-[#1f1f1f] border-white/5" : "bg-[#f5f5f5] border-black/5"
                                    )} style={{
                                        background: template.design?.backgroundColor || (isDark ? '#1a1a1a' : '#ffffff')
                                    }}>
                                        <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/5 dark:to-white/5" />
                                        <div className="z-10 flex flex-col items-center gap-2 opacity-20 group-hover:opacity-40 transition-opacity">
                                            {template.entity_type === 'proposal' ? <ProposalIcon size={32} /> : <InvoiceIcon size={32} />}
                                        </div>
                                        
                                        <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
                                            <span className={cn(
                                                "px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest rounded-md shadow-sm",
                                                template.entity_type === 'proposal' 
                                                    ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                                                    : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                            )}>
                                                {template.entity_type}
                                            </span>
                                            {template.is_default && (
                                                <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest rounded-md shadow-lg bg-[#4dbf39] text-black border border-[#4dbf39]/50">
                                                    Default
                                                </span>
                                            )}
                                        </div>
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
                                            <span>Saved {new Date(template.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>

                                        <div className="mt-5 flex gap-2">
                                            <button 
                                                onClick={() => handleUseTemplate(template)}
                                                disabled={isCreating}
                                                className={cn(
                                                    "flex-1 h-9 rounded-xl text-[12px] font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2",
                                                    isDark ? "bg-[#4dbf39] text-black hover:bg-[#5cd646]" : "bg-black text-white hover:bg-black/80"
                                                )}
                                            >
                                                {isCreating ? <RotateCcw size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={2.5} />}
                                                Use
                                            </button>
                                            <button 
                                                onClick={() => router.push(`/templates/edit/${template.id}`)}
                                                className={cn(
                                                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all border shrink-0",
                                                    isDark ? "bg-white/5 border-white/5 hover:bg-white/10 text-white" : "bg-white border-black/5 hover:bg-black/5 text-black"
                                                )}
                                                title="Edit template"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to delete this template?')) {
                                                        deleteTemplate(template.id);
                                                    }
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
        </div>
    );
}
