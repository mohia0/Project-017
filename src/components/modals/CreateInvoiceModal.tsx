"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronRight, CircleHelp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useClientStore } from '@/store/useClientStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useRouter } from 'next/navigation';
import DatePicker from '@/components/ui/DatePicker';
import ClientEditor from '@/components/clients/ClientEditor';
import { appToast } from '@/lib/toast';
import { useProjectStore } from '@/store/useProjectStore';
import { useTemplateStore } from '@/store/useTemplateStore';

interface Props {
    open: boolean;
    onClose: () => void;
}

import { useSettingsStore } from '@/store/useSettingsStore';

function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

export function CreateInvoiceModal({ open, onClose }: Props) {
    const { theme, activeWorkspaceId } = useUIStore();
    const isDark = theme === 'dark';
    const { clients, fetchClients } = useClientStore();
    const { addInvoice } = useInvoiceStore();
    const { projects, fetchProjects, addProjectItem } = useProjectStore();
    const { templates, fetchTemplates } = useTemplateStore();
    const { generateNextId, fetchToolSettings, hasFetched } = useSettingsStore();
    const router = useRouter();

    const today = new Date().toISOString().split('T')[0];

    const [title, setTitle] = useState('');
    const [clientQuery, setClientQuery] = useState('');
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [showClientDrop, setShowClientDrop] = useState(false);
    
    // Project state
    const [projectQuery, setProjectQuery] = useState('');
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [showProjectDrop, setShowProjectDrop] = useState(false);
    const projectRef = useRef<HTMLDivElement>(null);

    // Template state
    const [templateQuery, setTemplateQuery] = useState('');
    const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [showTemplateDrop, setShowTemplateDrop] = useState(false);
    const templateRef = useRef<HTMLDivElement>(null);

    const [issueDate, setIssueDate] = useState(today);
    const [dueDate, setDueDate] = useState(() => addDays(new Date(), 7));

    useEffect(() => {
        if (open && activeWorkspaceId) {
            fetchClients();
            fetchProjects();
            fetchTemplates().then(() => {
                const defaultTemplate = useTemplateStore.getState().templates.find(t => t.entity_type === 'invoice' && t.is_default);
                if (defaultTemplate) {
                    setSelectedTemplateId(defaultTemplate.id);
                    setSelectedTemplateName(defaultTemplate.name);
                }
            });
            const initTitle = (settings: any) => {
                const assignToDraft = settings?.assign_to_draft ?? true;
                if (assignToDraft) {
                    setTitle(useSettingsStore.getState().generateNextId('invoices'));
                } else {
                    setTitle('New Invoice');
                }
            };

            if (!hasFetched['toolSettings_invoices']) {
                fetchToolSettings(activeWorkspaceId, 'invoices').then(() => {
                    initTitle(useSettingsStore.getState().toolSettings['invoices']);
                });
            } else {
                initTitle(useSettingsStore.getState().toolSettings['invoices']);
            }
        }
    }, [open, activeWorkspaceId, fetchClients, fetchToolSettings, hasFetched]);
    const [loading, setLoading] = useState(false);
    const [isClientEditorOpen, setIsClientEditorOpen] = useState(false);
    const clientRef = useRef<HTMLDivElement>(null);

    useEffect(() => { fetchClients(); }, [fetchClients]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (clientRef.current && !clientRef.current.contains(e.target as Node)) setShowClientDrop(false);
            if (projectRef.current && !projectRef.current.contains(e.target as Node)) setShowProjectDrop(false);
            if (templateRef.current && !templateRef.current.contains(e.target as Node)) setShowTemplateDrop(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filteredClients = clients.filter(c =>
        (c.contact_person + ' ' + c.company_name).toLowerCase().includes(clientQuery.toLowerCase())
    );

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(projectQuery.toLowerCase())
    );

    const invoiceTemplates = templates.filter(t => t.entity_type === 'invoice');
    const filteredTemplates = invoiceTemplates.filter(t =>
        t.name.toLowerCase().includes(templateQuery.toLowerCase())
    );

    const handleCreate = async () => {
        setLoading(true);
        try {
            const templateToUse = invoiceTemplates.find(t => t.id === selectedTemplateId);
            const blocks = templateToUse?.blocks || [];

            const newInvoice = await addInvoice({
                title: title || useSettingsStore.getState().generateNextId('invoices'),
                client_id: selectedClientId,
                client_name: selectedClient || clientQuery,
                status: 'Draft',
                amount: 0,
                issue_date: issueDate,
                due_date: dueDate,
                notes: '',
                blocks,
            });
            if (newInvoice) {
                if (selectedProjectId) {
                    await addProjectItem({
                        project_id: selectedProjectId,
                        item_type: 'invoice',
                        item_id: newInvoice.id
                    });
                }
                onClose();
                appToast.success('Invoice created');
                router.push(`/invoices/${newInvoice.id}`);
            } else {
                appToast.error("Error", 'Failed to create invoice — check console');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClient = async (data: any) => {
        const client = await useClientStore.getState().addClient(data);
        if (client) {
            setSelectedClient(client.contact_person || client.company_name);
            setSelectedClientId(client.id);
            setIsClientEditorOpen(false);
            setClientQuery('');
            setShowClientDrop(false);
            appToast.success('Contact created and selected');
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
                    <h2 className={cn("text-[17px] font-bold tracking-tight", isDark ? "text-white" : "text-[#111]")}>
                        Create invoice
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
                <div className="px-5 pb-5 flex flex-col gap-2.5">
                    {/* Invoice title */}
                    <div className={cn(field, "flex flex-col gap-0.5")}>
                        <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Name</span>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="bg-transparent outline-none text-[13px] w-full"
                            autoFocus
                        />
                    </div>

                    {/* Client */}
                    <div className="relative" ref={clientRef}>
                        <div
                            className={cn(field, "cursor-pointer")}
                            onClick={() => setShowClientDrop(v => !v)}
                        >
                            {selectedClient
                                ? <span className={isDark ? "text-white" : "text-[#111]"}>{selectedClient}</span>
                                : <span className={isDark ? "text-[#555]" : "text-[#bbb]"}>Client</span>
                            }
                        </div>
                        {showClientDrop && (
                            <div className={cn(
                                "absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-50 overflow-hidden",
                                isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                            )}>
                                <div className="p-2 border-b border-inherit">
                                    <input
                                        autoFocus
                                        value={clientQuery}
                                        onChange={e => { setClientQuery(e.target.value); setSelectedClient(''); setSelectedClientId(null); }}
                                        placeholder="Search clients..."
                                        className={cn(
                                            "w-full text-[12px] px-3 py-1.5 rounded-lg outline-none",
                                            isDark ? "bg-[#252525] text-white placeholder:text-[#555]" : "bg-[#f5f5f5] text-[#111] placeholder:text-[#aaa]"
                                        )}
                                    />
                                </div>
                                <div className="max-h-40 overflow-auto">
                                    {filteredClients.length === 0 && !clientQuery ? (
                                        <div className={cn("px-4 py-3 text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No clients found</div>
                                    ) : (
                                        <>
                                            {filteredClients.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => { setSelectedClient(c.contact_person || c.company_name); setSelectedClientId(c.id); setClientQuery(''); setShowClientDrop(false); }}
                                                    className={cn(
                                                        "w-full text-left px-4 py-2.5 text-[13px] transition-colors",
                                                        isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]"
                                                    )}
                                                >
                                                    <span className="font-medium">{c.contact_person}</span>
                                                    {c.company_name && <span className={cn("ml-2 text-[11px]", isDark ? "text-[#555]" : "text-[#aaa]")}>{c.company_name}</span>}
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
                                                {clientQuery ? `Create "${clientQuery}"` : 'Create new contact'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Project */}
                    <div className="relative" ref={projectRef}>
                        <div
                            className={cn(field, "cursor-pointer")}
                            onClick={() => setShowProjectDrop(v => !v)}
                        >
                            {selectedProject
                                ? <span className={isDark ? "text-white" : "text-[#111]"}>{selectedProject}</span>
                                : <span className={isDark ? "text-[#555]" : "text-[#bbb]"}>Project</span>
                            }
                        </div>
                        {showProjectDrop && (
                            <div className={cn(
                                "absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-50 overflow-hidden",
                                isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                            )}>
                                <div className="p-2 border-b border-inherit">
                                    <input
                                        autoFocus
                                        value={projectQuery}
                                        onChange={e => { setProjectQuery(e.target.value); setSelectedProject(''); setSelectedProjectId(null); }}
                                        placeholder="Search projects..."
                                        className={cn(
                                            "w-full text-[12px] px-3 py-1.5 rounded-lg outline-none",
                                            isDark ? "bg-[#252525] text-white placeholder:text-[#555]" : "bg-[#f5f5f5] text-[#111] placeholder:text-[#aaa]"
                                        )}
                                    />
                                </div>
                                <div className="max-h-40 overflow-auto">
                                    {filteredProjects.length === 0 && !projectQuery ? (
                                        <div className={cn("px-4 py-3 text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No projects found</div>
                                    ) : (
                                        <>
                                            {filteredProjects.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => { setSelectedProject(p.name); setSelectedProjectId(p.id); setProjectQuery(''); setShowProjectDrop(false); }}
                                                    className={cn(
                                                        "w-full text-left px-4 py-2.5 text-[13px] transition-colors flex items-center gap-2",
                                                        isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]"
                                                    )}
                                                >
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                    <span className="font-medium">{p.name}</span>
                                                </button>
                                            ))}
                                            {filteredProjects.length === 0 && projectQuery && (
                                                <div className={cn("px-4 py-3 text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No matching projects</div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className={cn(field, "flex flex-col gap-0.5")}>
                            <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Issue date</span>
                            <DatePicker
                                value={issueDate}
                                onChange={setIssueDate}
                                isDark={isDark}
                            />
                        </div>
                        <div className={cn(field, "flex flex-col gap-0.5")}>
                            <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Due date</span>
                            <DatePicker
                                value={dueDate}
                                onChange={setDueDate}
                                isDark={isDark}
                                align="right"
                            />
                        </div>
                    </div>

                    {/* More options */}
                    <div className="relative py-1 flex items-center">
                        <div className={cn(
                            "absolute inset-x-0 top-1/2 border-t",
                            isDark ? "border-[#252525]" : "border-[#e0e0e0]"
                        )} />
                        <span className={cn(
                            "relative z-10 px-2 text-[11px] font-semibold uppercase tracking-widest",
                            isDark ? "bg-[#161616] text-[#444]" : "bg-[#f7f7f7] text-[#bbb]"
                        )}>More options</span>
                    </div>

                    {/* Select template */}
                    <div className="relative" ref={templateRef}>
                        <div
                            className={cn(field, "cursor-pointer")}
                            onClick={() => setShowTemplateDrop(v => !v)}
                        >
                            {selectedTemplateName
                                ? <span className={isDark ? "text-white" : "text-[#111]"}>{selectedTemplateName}</span>
                                : <span className={isDark ? "text-[#555]" : "text-[#bbb]"}>Select template</span>
                            }
                        </div>
                        {showTemplateDrop && (
                            <div className={cn(
                                "absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-50 overflow-hidden",
                                isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                            )}>
                                <div className="p-2 border-b border-inherit">
                                    <input
                                        autoFocus
                                        value={templateQuery}
                                        onChange={e => { setTemplateQuery(e.target.value); setSelectedTemplateName(''); setSelectedTemplateId(null); }}
                                        placeholder="Search templates..."
                                        className={cn(
                                            "w-full text-[12px] px-3 py-1.5 rounded-lg outline-none",
                                            isDark ? "bg-[#252525] text-white placeholder:text-[#555]" : "bg-[#f5f5f5] text-[#111] placeholder:text-[#aaa]"
                                        )}
                                    />
                                </div>
                                <div className="max-h-40 overflow-auto">
                                    {filteredTemplates.length === 0 && !templateQuery ? (
                                        <div className={cn("px-4 py-3 text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No templates found</div>
                                    ) : (
                                        <>
                                            {filteredTemplates.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => { setSelectedTemplateName(t.name); setSelectedTemplateId(t.id); setTemplateQuery(''); setShowTemplateDrop(false); }}
                                                    className={cn(
                                                        "w-full text-left px-4 py-2.5 text-[13px] transition-colors flex items-center justify-between",
                                                        isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]"
                                                    )}
                                                >
                                                    <span className="font-medium">{t.name}</span>
                                                    {t.is_default && <span className={cn("text-[10px] px-1.5 py-0.5 rounded", isDark ? "bg-[#333] text-[#aaa]" : "bg-[#eee] text-[#666]")}>Default</span>}
                                                </button>
                                            ))}
                                            {filteredTemplates.length === 0 && templateQuery && (
                                                <div className={cn("px-4 py-3 text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No matching templates</div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add custom field */}
                    <div className={cn(field, "flex items-center justify-between cursor-pointer")}>
                        <div className="flex items-center gap-2">
                            <Plus size={13} className={isDark ? "text-[#555]" : "text-[#bbb]"} />
                            <span className={isDark ? "text-[#555]" : "text-[#bbb]"}>Add custom field</span>
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
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground transition-colors disabled:opacity-60"
                    >
                        {loading ? 'Creating...' : 'Create invoice'} {!loading && <ChevronRight size={14} />}
                    </button>
                </div>
            </div>

            {isClientEditorOpen && (
                <ClientEditor
                    onClose={() => setIsClientEditorOpen(false)}
                    onSave={handleCreateClient}
                    initialData={{
                        contact_person: clientQuery,
                        company_name: '',
                        email: ''
                    }}
                />
            )}
        </div>
    );
}
