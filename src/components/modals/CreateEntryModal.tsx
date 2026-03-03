"use client";

import React, { useState } from 'react';
import { useUIStore } from '@/store/useUIStore';
import {
    X, CheckCircle, Folder, FileText, CreditCard, RefreshCw, PenTool,
    User, Building, Calendar, CalendarClock, MessageSquare, Clock,
    AlignLeft, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

type EntityType = 'Project' | 'Scheduler' | 'Form' | 'Conversation' | 'Invoice' | 'File' | 'Proposal' | 'Client';

const ENTITIES: { id: EntityType; icon: React.ReactNode; label: string }[] = [
    { id: 'Project', icon: <Folder size={16} />, label: 'Project' },
    { id: 'Scheduler', icon: <CalendarClock size={16} />, label: 'Scheduler' },
    { id: 'Form', icon: <AlignLeft size={16} />, label: 'Form' },
    { id: 'Conversation', icon: <MessageSquare size={16} />, label: 'Inbox' },
    { id: 'Invoice', icon: <FileText size={16} />, label: 'Invoice' },
    { id: 'File', icon: <FileText size={16} />, label: 'File' },
    { id: 'Proposal', icon: <PenTool size={16} />, label: 'Proposal' },
    { id: 'Client', icon: <User size={16} />, label: 'Client' },
];

export default function CreateEntryModal() {
    const { isCreateModalOpen, setCreateModalOpen } = useUIStore();
    const [selectedEntity, setSelectedEntity] = useState<EntityType>('Proposal');

    if (!isCreateModalOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Modal Container */}
            <div className="w-[800px] h-[600px] bg-[#1e1e1e] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans animate-in zoom-in-95 duration-200 border border-[#333]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
                    <h2 className="text-xl font-bold text-white">Create</h2>
                    <button
                        onClick={() => setCreateModalOpen(false)}
                        className="text-[#666] hover:text-white transition-colors bg-[#2a2a2a] p-1.5 rounded-full"
                    >
                        <X size={16} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Left Sidebar - Entities List */}
                    <div className="w-[240px] border-r border-[#333] overflow-y-auto no-scrollbar p-3 space-y-1">
                        {ENTITIES.map((entity) => (
                            <button
                                key={entity.id}
                                onClick={() => setSelectedEntity(entity.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[14px]",
                                    selectedEntity === entity.id
                                        ? "bg-[#2a2a2a] text-white font-semibold"
                                        : "text-[#999] hover:text-white hover:bg-[#2a2a2a]/50 font-medium"
                                )}
                            >
                                {entity.icon}
                                {entity.label}
                            </button>
                        ))}
                    </div>

                    {/* Right Side - Form Area */}
                    <div className="flex-1 flex flex-col relative bg-[#1a1a1a]">
                        <div className="flex-1 overflow-y-auto p-8">
                            {/* Render Form Dynamically Based on Entity Placeholder */}
                            {selectedEntity === 'Proposal' ? <ProposalForm /> : <GenericForm entity={selectedEntity} />}
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-6 flex items-center gap-4 justify-end border-t border-[#333] bg-[#1a1a1a]">
                            <button
                                onClick={() => setCreateModalOpen(false)}
                                className="px-6 py-3 rounded-xl font-bold text-sm text-white hover:bg-[#2a2a2a] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                className="px-6 py-3 rounded-xl font-bold text-sm text-black bg-[#4ade80] hover:bg-[#34d399] transition-all shadow-[0_4px_15px_rgba(74,222,128,0.2)]"
                            >
                                Create {selectedEntity.toLowerCase()} &rarr;
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// ----------------------------------------------------
// FORM COMPONENTS
// ----------------------------------------------------

function ProposalForm() {
    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-white text-lg font-bold mb-4">Proposal Details</h3>

            {/* Title Field */}
            <div className="bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-2 hover:border-[#555] focus-within:border-emerald-500 transition-colors">
                <label className="block text-[11px] font-bold text-[#999] mb-0.5">Proposal title</label>
                <input
                    type="text"
                    defaultValue="0170370"
                    className="w-full bg-transparent border-none p-0 text-[14px] text-white focus:ring-0 placeholder-[#666]"
                />
            </div>

            {/* Client Field */}
            <div className="bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 hover:border-[#555] transition-colors cursor-pointer flex items-center justify-between">
                <span className="text-[14px] font-medium text-[#ccc]">Client</span>
            </div>

            {/* Project Field */}
            <div className="bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 hover:border-[#555] transition-colors cursor-pointer flex items-center justify-between">
                <span className="text-[14px] font-medium text-[#ccc]">Project</span>
                <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-[10px] font-bold">?</span>
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 hover:border-[#555] transition-colors cursor-pointer">
                    <span className="text-[14px] font-medium text-[#ccc]">Issue date</span>
                </div>
                <div className="bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 hover:border-[#555] transition-colors cursor-pointer flex items-center justify-between">
                    <span className="text-[14px] font-medium text-[#ccc]">Expiration date</span>
                    <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-[10px] font-bold">?</span>
                </div>
            </div>

            <div className="pt-4">
                <label className="block text-[12px] font-bold text-white mb-3">More options</label>
                <div className="bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 hover:border-[#555] transition-colors cursor-pointer mb-3">
                    <span className="text-[14px] font-medium text-[#ccc]">Select template</span>
                </div>

                <div className="bg-[#2a2a2a]/50 border border-[#333] rounded-xl px-4 py-3 hover:border-[#555] transition-colors cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#999]">
                        <span className="w-4 h-4 border border-[#999] rounded text-[10px] flex items-center justify-center font-bold">+</span>
                        <span className="text-[13px] font-medium">Add custom field</span>
                    </div>
                    <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-[10px] font-bold">?</span>
                </div>
            </div>
        </div>
    );
}

function GenericForm({ entity }: { entity: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-16 h-16 rounded-full bg-[#2a2a2a] border border-[#333] flex items-center justify-center text-[#666] mb-4">
                <Folder size={24} />
            </div>
            <h3 className="text-white text-lg font-bold mb-2">Create New {entity}</h3>
            <p className="text-[#999] text-sm max-w-xs mx-auto">
                The creation form specifically tailored for adding a new {entity.toLowerCase()} will appear here.
            </p>
        </div>
    );
}
