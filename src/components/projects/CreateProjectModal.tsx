"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronRight, CircleHelp, Plus, Check, Search, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore, ProjectStatus } from '@/store/useProjectStore';
import { useClientStore } from '@/store/useClientStore';
import DatePicker from '@/components/ui/DatePicker';
import ClientEditor from '@/components/clients/ClientEditor';
import { gooeyToast } from 'goey-toast';
import { Avatar } from '@/components/ui/Avatar';

interface Props {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

const STATUS_OPTIONS: ProjectStatus[] = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];

const COLOR_SWATCHES = [
    '#3d0ebf', '#6366f1', '#10b981', '#f59e0b',
    '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6',
    '#f97316', '#14b8a6',
];

export default function CreateProjectModal({ open, onClose, onCreated }: Props) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { addProject } = useProjectStore();
    const { clients, fetchClients } = useClientStore();

    const [name, setName] = useState('');
    const [description, setDesc] = useState('');
    const [status, setStatus] = useState<ProjectStatus>('Planning');
    const [color, setColor] = useState('#3d0ebf');
    const [clientId, setClientId] = useState<string | null>(null);
    const [clientName, setClientName] = useState('');
    const [deadline, setDeadline] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const [colorOpen, setColorOpen] = useState(false);
    const [clientOpen, setClientOpen] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [isClientEditorOpen, setIsClientEditorOpen] = useState(false);

    const clientRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef<HTMLDivElement>(null);
    const colorRef = useRef<HTMLDivElement>(null);

    useEffect(() => { fetchClients(); }, [fetchClients]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
                setClientOpen(false);
            }
            if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
                setStatusOpen(false);
            }
            if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
                setColorOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filteredClients = clients.filter(c =>
        !clientSearch || 
        (c.contact_person + ' ' + (c.company_name || '')).toLowerCase().includes(clientSearch.toLowerCase())
    );

    const handleCreate = async () => {
        if (!name.trim()) { gooeyToast.error('Project name is required'); return; }
        setLoading(true);
        try {
            const p = await addProject({
                name: name.trim(),
                description: description.trim() || null,
                status,
                color,
                icon: 'Briefcase',
                client_id: clientId,
                client_name: clientName || null,
                deadline: deadline || null,
                members: [],
                is_archived: false,
            });
            if (p) {
                gooeyToast.success(`"${p.name}" created`);
                onCreated();
                onClose();
            } else {
                gooeyToast.error('Failed to create project — check console');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClient = async (data: any) => {
        const client = await useClientStore.getState().addClient(data);
        if (client) {
            setClientName(client.contact_person || client.company_name);
            setClientId(client.id);
            setIsClientEditorOpen(false);
            setClientSearch('');
            setClientOpen(false);
            gooeyToast.success('Contact created and selected');
        }
    };

    if (!open) return null;

    const field = cn(
        "w-full rounded-xl border px-4 py-3 text-[13px] outline-none transition-all focus-within:ring-2",
        isDark
            ? "bg-[#1c1c1c] border-[#2e2e2e] text-white placeholder:text-[#555] focus-within:ring-[#333] focus-within:border-[#444]"
            : "bg-white border-[#e0e0e0] text-[#111] placeholder:text-[#bbb] focus-within:ring-[#e8e8e8] focus-within:border-[#ccc]"
    );

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={cn(
                "w-full max-w-[480px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200",
                isDark ? "bg-[#161616] border border-[#252525]" : "bg-[#f7f7f7] border border-[#e0e0e0]"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                    <h2 className={cn("text-[13.5px] font-bold tracking-tight", isDark ? "text-white" : "text-[#111]")}>
                        Create project
                    </h2>
                    <button
                        onClick={onClose}
                        className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                            isDark ? "bg-[#252525] text-[#666] hover:text-[#ccc]" : "bg-[#e8e8e8] text-[#888] hover:text-[#333]"
                        )}
                    >
                        <X size={14} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 pb-5 flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto">
                    {/* Project Name */}
                    <div className={cn(field, "flex flex-col gap-0.5")}>
                        <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Project Name</span>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="bg-transparent outline-none text-[13px] w-full"
                            autoFocus
                            placeholder="e.g. Brand Redesign 2026"
                        />
                    </div>

                    {/* Description */}
                    <div className={cn(field, "flex flex-col gap-0.5")}>
                        <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Description</span>
                        <textarea
                            value={description}
                            onChange={e => setDesc(e.target.value)}
                            className="bg-transparent outline-none text-[13px] w-full resize-none min-h-[60px]"
                            placeholder="Optional project description…"
                        />
                    </div>

                    {/* Status & Color */}
                    <div className="grid grid-cols-2 gap-2.5">
                        {/* Status Dropdown */}
                        <div className="relative" ref={statusRef}>
                            <div
                                className={cn(field, "flex flex-col gap-0.5 cursor-pointer")}
                                onClick={() => setStatusOpen(v => !v)}
                            >
                                <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Status</span>
                                <div className="flex items-center justify-between">
                                    <span className={isDark ? "text-white" : "text-[#111]"}>{status}</span>
                                    <ChevronRight size={14} className={cn("transition-transform", statusOpen ? "rotate-90" : "")} />
                                </div>
                            </div>
                            {statusOpen && (
                                <div className={cn(
                                    "absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-50 overflow-hidden",
                                    isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                                )}>
                                    {STATUS_OPTIONS.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => { setStatus(s); setStatusOpen(false); }}
                                            className={cn(
                                                "w-full text-left px-4 py-2.5 text-[13px] transition-colors flex items-center justify-between",
                                                isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]"
                                            )}
                                        >
                                            {s}
                                            {s === status && <Check size={13} className="text-primary" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Color selection dropdown */}
                        <div className="relative" ref={colorRef}>
                            <div
                                className={cn(field, "flex flex-col gap-0.5 cursor-pointer")}
                                onClick={() => setColorOpen(v => !v)}
                            >
                                <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Brand Color</span>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-3.5 rounded-full" style={{ background: color }} />
                                        <span className={isDark ? "text-white/60" : "text-[#111]/60"}>{color.toUpperCase()}</span>
                                    </div>
                                    <ChevronRight size={14} className={cn("transition-transform", colorOpen ? "rotate-90" : "")} />
                                </div>
                            </div>
                            {colorOpen && (
                                <div className={cn(
                                    "absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-[60] overflow-hidden",
                                    isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                                )}>
                                    <div className="max-h-48 overflow-y-auto p-1.5 flex flex-col gap-0.5">
                                        {COLOR_SWATCHES.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => { setColor(c); setColorOpen(false); }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 text-[13px] transition-colors flex items-center justify-between rounded-lg group",
                                                    isDark ? "hover:bg-white/5" : "hover:bg-black/5"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-3.5 rounded-full transition-transform group-hover:scale-y-110" style={{ background: c }} />
                                                    <span className={isDark ? "text-[#bbb]" : "text-[#444]"}>{c.toUpperCase()}</span>
                                                </div>
                                                {c === color && <Check size={13} className="text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Client Dropdown */}
                    <div className="relative" ref={clientRef}>
                        <div
                            className={cn(field, "flex flex-col gap-0.5 cursor-pointer")}
                            onClick={() => setClientOpen(v => !v)}
                        >
                            <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Client (optional)</span>
                            <div className="flex items-center justify-between">
                                {clientName
                                    ? <span className={isDark ? "text-white" : "text-[#111]"}>{clientName}</span>
                                    : <span className={isDark ? "text-[#555]" : "text-[#bbb]"}>Select client</span>
                                }
                                <ChevronRight size={14} className={cn("transition-transform", clientOpen ? "rotate-90" : "")} />
                            </div>
                        </div>
                        {clientOpen && (
                            <div className={cn(
                                "absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-50 overflow-hidden",
                                isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                            )}>
                                <div className="p-2 border-b border-inherit">
                                    <div className="relative">
                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-30" />
                                        <input
                                            autoFocus
                                            value={clientSearch}
                                            onChange={e => setClientSearch(e.target.value)}
                                            placeholder="Search clients..."
                                            className={cn(
                                                "w-full text-[12px] pl-8 pr-3 py-1.5 rounded-lg outline-none",
                                                isDark ? "bg-[#252525] text-white placeholder:text-[#555]" : "bg-[#f5f5f5] text-[#111] placeholder:text-[#aaa]"
                                            )}
                                        />
                                    </div>
                                </div>
                                <div className="max-h-40 overflow-auto">
                                    <button
                                        onClick={() => { setClientId(null); setClientName(''); setClientOpen(false); }}
                                        className={cn(
                                            "w-full text-left px-4 py-2.5 text-[13px] transition-colors",
                                            isDark ? "text-[#555] hover:bg-white/5" : "text-[#999] hover:bg-[#fafafa]"
                                        )}
                                    >
                                        No client
                                    </button>
                                    {filteredClients.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => { setClientName(c.contact_person || c.company_name); setClientId(c.id); setClientSearch(''); setClientOpen(false); }}
                                            className={cn(
                                                "w-full text-left px-4 py-2 text-[13px] transition-colors flex items-center gap-2",
                                                isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]"
                                            )}
                                        >
                                            <Avatar name={c.contact_person || c.company_name} src={c.avatar_url} className="w-5 h-5" isDark={isDark} />
                                            <div className="flex flex-col">
                                                <span className="font-medium">{c.contact_person}</span>
                                                {c.company_name && <span className={cn("text-[10px]", isDark ? "text-[#555]" : "text-[#aaa]")}>{c.company_name}</span>}
                                            </div>
                                            {c.id === clientId && <Check size={13} className="ml-auto text-primary" />}
                                        </button>
                                    ))}
                                    <div className={cn("border-t", isDark ? "border-white/5" : "border-black/5")} />
                                    <button
                                        onClick={() => setIsClientEditorOpen(true)}
                                        className={cn(
                                            "w-full text-left px-4 py-2.5 text-[13px] font-bold transition-colors flex items-center gap-2",
                                            isDark ? "text-primary hover:bg-white/5" : "text-primary hover:bg-black/5"
                                        )}
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                        {clientSearch ? `Create "${clientSearch}"` : 'Create new contact'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Deadline */}
                    <div className={cn(field, "flex flex-col gap-0.5")}>
                        <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Deadline</span>
                        <DatePicker
                            value={deadline}
                            onChange={setDeadline}
                            isDark={isDark}
                            placeholder="Set project deadline"
                        />
                    </div>

                    {/* More options divider */}
                    <div className="relative py-1 flex items-center">
                        <div className={cn("absolute inset-x-0 top-1/2 border-t", isDark ? "border-[#252525]" : "border-[#e0e0e0]")} />
                        <span className={cn("relative z-10 px-2 text-[11px] font-semibold uppercase tracking-widest", isDark ? "bg-[#161616] text-[#444]" : "bg-[#f7f7f7] text-[#bbb]")}>Members & Team</span>
                    </div>

                    {/* Select Team Member placeholder */}
                    <div className={cn(field, "flex items-center justify-between cursor-not-allowed opacity-60")}>
                        <div className="flex items-center gap-2">
                            <Plus size={13} className={isDark ? "text-[#555]" : "text-[#bbb]"} />
                            <span className={isDark ? "text-[#555]" : "text-[#bbb]"}>Add team member</span>
                        </div>
                        <CircleHelp size={14} className="text-[#3b82f6] opacity-70" />
                    </div>
                </div>

                {/* Footer */}
                <div className={cn(
                    "flex items-center justify-between px-5 py-4 border-t",
                    isDark ? "border-[#252525] bg-[#111]" : "border-[#e8e8e8] bg-white"
                )}>
                    <button
                        onClick={onClose}
                        className={cn(
                            "px-4 py-2 text-[13px] font-medium rounded-xl transition-colors",
                            isDark ? "text-[#777] hover:text-[#ccc] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f0f0f0]"
                        )}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={loading || !name.trim()}
                        className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl bg-primary hover:bg-primary-hover text-black transition-colors disabled:opacity-60"
                    >
                        {loading ? 'Creating...' : 'Create project'} {!loading && <ChevronRight size={14} />}
                    </button>
                </div>
            </div>

            {isClientEditorOpen && (
                <ClientEditor
                    onClose={() => setIsClientEditorOpen(false)}
                    onSave={handleCreateClient}
                    initialData={{
                        contact_person: clientSearch,
                        company_name: '',
                        email: ''
                    }}
                />
            )}
        </div>
    );
}
