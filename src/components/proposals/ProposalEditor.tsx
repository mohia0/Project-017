"use client";

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import { ContentBlock } from './blocks/ContentBlock';
import { PricingBlock } from './blocks/PricingBlock';
import { SignatureBlock } from './blocks/SignatureBlock';
import { Plus, GripVertical, Settings, Palette, ArrowLeft, Save, Eye, MoreHorizontal, Share2, Download, Send, Copy, FileText, ChevronDown, Rocket, Link2, PanelRight, PenLine, Droplets, Zap, User, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

type BlockType = 'content' | 'pricing' | 'signature';

export interface BlockData {
    id: string;
    type: BlockType;
    data: any;
}

export default function ProposalEditor() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'settings' | 'appearance'>('settings');
    const [isPreview, setIsPreview] = useState(false);
    const [title, setTitle] = useState("Untitled Proposal");

    const [blocks, setBlocks] = useState<BlockData[]>([
        { id: '1', type: 'content', data: { content: '<h1>Proposal for Services</h1><p>We are pleased to submit this proposal for your review.</p>' } },
        { id: '2', type: 'pricing', data: {} }
    ]);

    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
    const [status, setStatus] = useState<'Draft' | 'Sent' | 'Approved' | 'Rejected'>('Draft');
    const { theme } = useUIStore();
    const proposalLink = "https://ijwjhiicxesktwqyfntp.supabase.co/p/7a2b-9c1d";

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = blocks.findIndex((b) => b.id === active.id);
            const newIndex = blocks.findIndex((b) => b.id === over.id);
            setBlocks(arrayMove(blocks, oldIndex, newIndex));
        }
    };

    const addBlock = (type: BlockType) => {
        const newBlock: BlockData = { id: uuidv4(), type, data: {} };
        setBlocks([...blocks, newBlock]);
        setIsAddMenuOpen(false);
    };

    const updateBlockData = (id: string, data: any) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, data } : b));
    };

    const removeBlock = (id: string) => {
        setBlocks(blocks.filter(b => b.id !== id));
    };

    const addBlockAfter = (id: string, type: BlockType = 'content') => {
        const index = blocks.findIndex(b => b.id === id);
        const newBlock: BlockData = { id: uuidv4(), type, data: {} };
        const newBlocks = [...blocks];
        newBlocks.splice(index + 1, 0, newBlock);
        setBlocks(newBlocks);
    };

    const renderBlock = (block: BlockData) => {
        const props = {
            id: block.id,
            type: block.type,
            data: block.data,
            updateData: updateBlockData,
            removeBlock: removeBlock,
            addBlockAfter: addBlockAfter
        };

        switch (block.type) {
            case 'content': return <ContentBlock {...props} />;
            case 'pricing': return <PricingBlock {...props} />;
            case 'signature': return <SignatureBlock {...props} />;
            default: return null;
        }
    };

    return (
        <div className={cn(
            "flex flex-col h-full w-full relative transition-colors duration-300",
            theme === 'dark' ? "bg-[#121212] text-white" : "bg-white text-[#111]"
        )}>
            <div className="flex flex-1 overflow-hidden relative">

                {/* LEFT: MAIN EDITOR CANVAS */}
                <div className={cn("flex-1 flex flex-col h-full min-w-0 transition-colors duration-300", theme === 'dark' ? "border-[#2A2A2A]" : "border-[#e2e2e2]")}>

                    {/* Top Top Bar (Breadcrumbs & Actions) */}
                    <div className={cn(
                        "h-14 flex items-center justify-between px-8 border-b shrink-0 z-10 transition-colors duration-300",
                        theme === 'dark' ? "bg-[#18181A] border-[#18181A]" : "bg-[#fdfdfd] border-[#e2e2e2]/40"
                    )}>
                        <div className={cn("flex items-center gap-2 text-[13px] font-medium tracking-wide", theme === 'dark' ? "text-[#a1a1aa]" : "text-[#666]")}>
                            <span className="cursor-pointer hover:text-white transition-colors">Templates library</span>
                            <span>/</span>
                            <span className="cursor-pointer hover:text-white transition-colors">Proposal templates</span>
                            <span>/</span>
                            <span className={cn("font-bold", theme === 'dark' ? "text-white" : "text-[#111]")}>EN PROPOSAL - Full Deliverables</span>
                        </div>
                        <div>
                            <button className={cn("flex items-center gap-2 px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors border", theme === 'dark' ? "bg-transparent border-[#333] hover:bg-[#222] text-white" : "bg-white border-[#e2e2e2] text-[#111] hover:bg-[#f5f5f5]")}>
                                Actions <ChevronDown size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Editor Content Area */}
                    <div className={cn(
                        "flex-1 overflow-auto relative transition-colors duration-300",
                        theme === 'dark' ? "bg-[#0A0A0A]" : "bg-[#f5f5f5]"
                    )}>
                        <div className="flex justify-center min-h-full py-12 px-8">
                            <div
                                className={cn(
                                    "w-full max-w-[850px] bg-white transition-all px-16 py-20 min-h-full text-[#111]",
                                    !isPreview && 'border border-[#e2e2e2] shadow-soft'
                                )}
                            >
                                {isPreview ? (
                                    <h1 className="text-4xl font-semibold mb-12 text-[#111] pb-6 border-b border-[#e2e2e2]/60">
                                        {title}
                                    </h1>
                                ) : (
                                    <div className="mb-12" />
                                )}

                                <DndContext id="proposal-editor-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <div className="space-y-4 relative">
                                        <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                                            {blocks.map(block => (
                                                <div key={block.id} className={cn("relative", isPreview && 'pointer-events-none')}>
                                                    {renderBlock(block)}
                                                </div>
                                            ))}
                                        </SortableContext>
                                    </div>
                                </DndContext>

                                {!isPreview && (
                                    <div className="mt-8 pt-8 flex justify-center relative border-t border-[#e2e2e2]/40">
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsAddMenuOpen(!isAddMenuOpen);
                                                }}
                                                className="flex items-center gap-2 text-sm font-medium text-[#111] bg-white border border-[#e2e2e2] rounded-lg px-6 py-2.5 hover:bg-[#f9f9f9] shadow-soft transition-all active:scale-95"
                                            >
                                                <Plus size={18} className="text-[#2563eb]" /> Add New Block
                                            </button>

                                            {isAddMenuOpen && (
                                                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 bg-white border border-[#e2e2e2] rounded-xl shadow-float p-1.5 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                    <div className="px-3 py-2 text-[10px] font-bold text-[#999] uppercase tracking-widest">Select Block Type</div>
                                                    <button onClick={() => addBlock('content')} className="w-full flex justify-between items-center px-3 py-2.5 text-sm hover:bg-[#f5f5f5] rounded-lg text-[#111] transition-colors">
                                                        <span>Text & Media</span> <span className="text-[#999] text-[10px] bg-[#f0f0f0] px-1.5 py-0.5 rounded">Rich Text</span>
                                                    </button>
                                                    <button onClick={() => addBlock('pricing')} className="w-full flex justify-between items-center px-3 py-2.5 text-sm hover:bg-[#f5f5f5] rounded-lg text-[#111] transition-colors">
                                                        <span>Pricing Table</span> <span className="text-[#999] text-[10px] bg-[#f0f0f0] px-1.5 py-0.5 rounded">Finance</span>
                                                    </button>
                                                    <button onClick={() => addBlock('signature')} className="w-full flex justify-between items-center px-3 py-2.5 text-sm hover:bg-[#f5f5f5] rounded-lg text-[#111] transition-colors">
                                                        <span>Signature</span> <span className="text-[#999] text-[10px] bg-[#f0f0f0] px-1.5 py-0.5 rounded">Legal</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: CONTEXT PANEL */}
                {!isPreview && (
                    <div className={cn(
                        "w-[280px] h-full flex flex-col shrink-0 z-20 transition-colors duration-300 border-l",
                        theme === 'light' ? "bg-[#fafafa] border-[#e2e2e2] text-[#111]" : "bg-[#18181A] border-[#2A2A2A] text-white"
                    )}>

                        {/* Top Action Bar */}
                        <div className={cn("p-4 flex items-center gap-2 border-b", theme === 'light' ? "border-[#f0f0f0]" : "border-[#333]")}>
                            <div className="relative">
                                <button
                                    onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all",
                                        status === 'Approved' ? "bg-emerald-500 text-white" : (theme === 'light' ? "bg-[#f5f5f5] text-[#111] border border-[#e2e2e2]" : "bg-[#333] text-white"),
                                    )}
                                >
                                    {status === 'Draft' ? 'Draft' : status}
                                    <ChevronDown size={12} />
                                </button>
                                {isStatusMenuOpen && (
                                    <div className={cn(
                                        "absolute left-0 mt-2 w-40 border rounded-xl shadow-2xl p-1.5 z-[100] animate-in fade-in slide-in-from-top-2",
                                        theme === 'light' ? "bg-white border-[#e2e2e2]" : "bg-[#2a2a2a] border-[#444]"
                                    )}>
                                        {['Draft', 'Sent', 'Approved', 'Rejected'].map((s) => (
                                            <button key={s} onClick={() => { setStatus(s as any); setIsStatusMenuOpen(false); }} className={cn("w-full text-left px-3 py-1.5 text-[11px] rounded-lg", theme === 'light' ? "hover:bg-[#f5f5f5] text-[#111]" : "hover:bg-[#383838] text-white")}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button className={cn("p-1.5 rounded-lg transition-all", theme === 'light' ? "text-[#999] hover:bg-[#f5f5f5] hover:text-[#111]" : "text-[#666] hover:bg-[#333] hover:text-white")}>
                                <Rocket size={16} />
                            </button>
                            <button className={cn("p-1.5 rounded-lg transition-all", theme === 'light' ? "text-[#999] hover:bg-[#f5f5f5] hover:text-[#111]" : "text-[#666] hover:bg-[#333] hover:text-white")}>
                                <Link2 size={16} />
                            </button>

                            <div className="relative ml-auto">
                                <button
                                    onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                                    className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all", theme === 'light' ? "bg-[#f5f5f5] text-[#111] border border-[#e2e2e2] hover:bg-[#eee]" : "bg-[#2A2A2A] text-white hover:bg-[#333]")}
                                >
                                    Actions <ChevronDown size={12} />
                                </button>
                                {isActionsMenuOpen && (
                                    <div className={cn(
                                        "absolute right-0 mt-2 w-48 border rounded-xl shadow-2xl p-1.5 z-[100]",
                                        theme === 'light' ? "bg-white border-[#e2e2e2]" : "bg-[#1f1f1f] border-[#333]"
                                    )}>
                                        <button className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-[12px] rounded-lg", theme === 'light' ? "hover:bg-[#f5f5f5] text-[#111]" : "hover:bg-[#383838] text-white")}>
                                            <Download size={14} /> Download PDF
                                        </button>
                                        <button className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-[12px] rounded-lg", theme === 'light' ? "hover:bg-[#f5f5f5] text-[#111]" : "hover:bg-[#383838] text-white")}>
                                            <Send size={14} /> Send to Client
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Icon Tabs */}
                        <div className="p-4">
                            <div className={cn("flex items-center rounded-xl p-1 border", theme === 'light' ? "bg-[#f9f9f9] border-[#e2e2e2]" : "bg-[#111] border-[#333]")}>
                                <button className={cn("p-2 rounded-lg transition-all", theme === 'light' ? "text-[#999] hover:text-[#111] hover:bg-white border-transparent" : "text-[#666] hover:text-white hover:bg-[#222]")}>
                                    <PanelRight size={18} />
                                </button>
                                <div className={cn("w-[1px] h-4 mx-1", theme === 'light' ? "bg-[#e2e2e2]" : "bg-[#333]")} />
                                <button
                                    onClick={() => setActiveTab('settings')}
                                    className={cn("flex-1 flex justify-center py-2 rounded-lg transition-all", activeTab === 'settings' ? (theme === 'light' ? "bg-white shadow-sm border border-[#e2e2e2] text-[#111]" : "bg-[#333] text-white") : "text-[#999] hover:text-[#111]")}
                                >
                                    <PenLine size={18} />
                                </button>
                                <button
                                    onClick={() => setActiveTab('appearance')}
                                    className={cn("flex-1 flex justify-center py-2 rounded-lg transition-all", activeTab === 'appearance' ? (theme === 'light' ? "bg-white shadow-sm border border-[#e2e2e2] text-[#111]" : "bg-[#333] text-white") : "text-[#999] hover:text-[#111]")}
                                >
                                    <Droplets size={18} />
                                </button>
                                <button className="flex-1 flex justify-center py-2 text-[#999] hover:text-[#111]">
                                    <Zap size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Settings Cards/List */}
                        <div className="flex-1 overflow-auto p-4 pt-0 space-y-2">
                            {activeTab === 'settings' ? (
                                <>
                                    <SettingCard label="Client" theme={theme}>
                                        <div className={cn("inline-flex items-center gap-2 border rounded-full px-3 py-1 text-[11px] font-bold", theme === 'light' ? "bg-white border-[#e2e2e2] text-[#111]" : "bg-[#1a1a1a] border-[#333] text-white")}>
                                            <User size={12} className="text-[#999]" /> Omar Kzah
                                        </div>
                                    </SettingCard>

                                    <SettingCard label="Project" theme={theme} hasHelp />

                                    <div className="grid grid-cols-2 gap-2">
                                        <SettingCard label="Issue date" theme={theme}>
                                            <div className={cn("text-[11px] font-bold", theme === 'light' ? "text-[#111]" : "text-[#ccc]")}>1/1/2026</div>
                                        </SettingCard>
                                        <SettingCard label="Expiry" theme={theme} hasHelp>
                                            <div className={cn("text-[11px] font-bold", theme === 'light' ? "text-[#111]" : "text-[#ccc]")}>5/1/2026</div>
                                        </SettingCard>
                                    </div>

                                    <SettingCard label="Currency" theme={theme}>
                                        <div className={cn("text-[11px] font-bold", theme === 'light' ? "text-[#111]" : "text-[#ccc]")}>US Dollar ($)</div>
                                    </SettingCard>

                                    <SettingCard label="Proposal ID" theme={theme} hasHelp>
                                        <div className={cn("text-[11px] font-bold", theme === 'light' ? "text-[#111]" : "text-[#ccc]")}>0170361</div>
                                    </SettingCard>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className={cn("text-[10px] uppercase tracking-widest font-bold mb-3", theme === 'light' ? "text-[#999]" : "text-[#666]")}>Design Options</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Inter', 'Roboto', 'Serif', 'Mono'].map(font => (
                                            <button key={font} className={cn("border p-2.5 rounded-xl text-[11px] font-bold transition-all", theme === 'light' ? "bg-white border-[#e2e2e2] text-[#111] hover:bg-[#f9f9f9]" : "bg-[#2a2a2a] border-[#333] text-white hover:border-[#444]")}>
                                                {font}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SettingCard({ label, children, hasHelp = false, theme = 'light' }: { label: string; children?: React.ReactNode; hasHelp?: boolean; theme?: 'light' | 'dark' }) {
    return (
        <div className={cn(
            "group relative border rounded-xl px-3 py-2.5 transition-all overflow-hidden",
            theme === 'light' ? "bg-white border-[#f0f0f0] hover:border-[#e2e2e2]" : "bg-[#222] border-[#333] hover:bg-[#282828]"
        )}>
            <div className={cn("absolute inset-0 opacity-[0.02] pointer-events-none bg-[repeating-linear-gradient(45deg,#888,#888_8px,transparent_8px,transparent_16px)]")} />
            <div className="relative flex justify-between items-start">
                <div className="space-y-1.5 flex-1">
                    <label className={cn("block text-[10px] font-bold uppercase tracking-wider", theme === 'light' ? "text-[#999]" : "text-[#666]")}>{label}</label>
                    <div className="min-h-[16px]">
                        {children || <div className="text-[11px] text-[#999] font-medium opacity-40 italic">Set {label.toLowerCase()}...</div>}
                    </div>
                </div>
                {hasHelp && (
                    <button className={cn("p-1 rounded-md transition-all", theme === 'light' ? "bg-[#eff6ff] text-[#3b82f6] hover:bg-[#dbeafe]" : "bg-[#172554] text-[#3b82f6] hover:bg-[#1e3a8a]")}>
                        <HelpCircle size={11} />
                    </button>
                )}
            </div>
        </div>
    );
}
