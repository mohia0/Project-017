"use client";

import React, { useState } from 'react';
import { X, ChevronRight, ClipboardList, Tag, Check, Search } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useFormStore } from '@/store/useFormStore';
import { useRouter } from 'next/navigation';
import { appToast } from '@/lib/toast';
import { useTemplateStore } from '@/store/useTemplateStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useEffect } from 'react';

interface Props {
    open: boolean;
    onClose: () => void;
}

const STARTER_TEMPLATES = [
    { id: 'blank',    label: 'Blank form',         icon: '📄', fields: [] },
    { id: 'contact',  label: 'Contact us',          icon: '📬', fields: ['full_name', 'email', 'phone', 'long_text'] },
    { id: 'feedback', label: 'Feedback',             icon: '⭐', fields: ['full_name', 'email', 'slider', 'long_text'] },
    { id: 'onboard',  label: 'Client onboarding',   icon: '🤝', fields: ['full_name', 'email', 'phone', 'short_text', 'address'] },
];

export function CreateFormModal({ open, onClose }: Props) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { addForm } = useFormStore();
    const router = useRouter();

    const { templates, fetchTemplates } = useTemplateStore();
    const { projects, fetchProjects } = useProjectStore();
    const formTemplates = templates.filter(t => t.entity_type === 'form');

    const [title, setTitle]         = useState('New Form');
    const [project, setProject]     = useState('');
    const [template, setTemplate]   = useState<string>('blank');
    const [loading, setLoading]     = useState(false);

    useEffect(() => {
        if (open) {
            fetchTemplates();
            fetchProjects();
        }
    }, [open, fetchTemplates, fetchProjects]);

    const handleCreate = async () => {
        if (!title.trim()) return;
        setLoading(true);
        try {
            let fields: any[] = [];
            let design: any = {};

            if (template.startsWith('tpl_')) {
                const tpl = formTemplates.find(t => t.id === template.replace('tpl_', ''));
                if (tpl) {
                    fields = Array.isArray(tpl.blocks) ? tpl.blocks : [];
                    design = tpl.design || {};
                }
            } else {
                const tpl = STARTER_TEMPLATES.find(t => t.id === template);
                fields = (tpl?.fields || []).map((type, i) => ({
                    id: uuidv4(),
                    type,
                    label: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    required: false,
                    placeholder: '',
                }));
            }

            const f = await addForm({
                title: title.trim(),
                status: 'Draft',
                fields,
                meta: { project, design } as any,
            });
            if (f) {
                onClose();
                appToast.success('Form Created', 'Your new form has been successfully created');
                router.push(`/forms/${f.id}`);
            } else {
                appToast.error('Creation Failed', 'Could not create the form. Please try again.');
            }
        } catch (error) {
            console.error('Error creating form:', error);
            appToast.error('Creation Failed', 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
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
                        Create form
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
                    {/* Name */}
                    <div className={cn(field, "flex flex-col gap-0.5")}>
                        <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Name</span>
                        <input
                            autoFocus
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            className="bg-transparent outline-none text-[13px] w-full"
                        />
                    </div>

                    {/* Project */}
                    <div className={cn(field, "flex flex-col gap-0.5 relative group")}>
                        <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>
                            <span className="flex items-center gap-1.5"><Tag size={10} /> Project</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <select
                                value={project}
                                onChange={e => setProject(e.target.value)}
                                className={cn("bg-transparent outline-none text-[13px] w-full appearance-none cursor-pointer", isDark ? "text-white placeholder:text-[#444]" : "text-[#111] placeholder:text-[#bbb]")}
                            >
                                <option value="" className={isDark ? "bg-[#1c1c1c]" : "bg-white"}>No Project Link</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id} className={isDark ? "bg-[#1c1c1c]" : "bg-white"}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity">
                                <Search size={12} />
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative mt-1">
                        <div className={cn("absolute inset-x-0 top-1/2 border-t", isDark ? "border-[#252525]" : "border-[#e0e0e0]")} />
                        <span className={cn(
                            "relative z-10 px-2 text-[11px] font-semibold uppercase tracking-widest",
                            isDark ? "bg-[#161616] text-[#444]" : "bg-[#f7f7f7] text-[#bbb]"
                        )}>Start from</span>
                    </div>

                    {/* Templates */}
                    <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[300px] pr-1">
                        {STARTER_TEMPLATES.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTemplate(t.id)}
                                className={cn(
                                    "flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all",
                                    template === t.id
                                        ? (isDark
                                            ? "border-primary/50 bg-primary/8 ring-1 ring-primary/20"
                                            : "border-primary/40 bg-primary/5 ring-1 ring-primary/15")
                                        : (isDark
                                            ? "border-[#252525] bg-[#1c1c1c] hover:border-[#333]"
                                            : "border-[#e0e0e0] bg-white hover:border-[#bbb]")
                                )}
                            >
                                <span className="text-[18px] leading-none">{t.icon}</span>
                                <div className="min-w-0">
                                    <div className={cn("text-[12px] font-semibold truncate", isDark ? "text-[#ddd]" : "text-[#222]")}>
                                        {t.label}
                                    </div>
                                    <div className={cn("text-[10.5px] mt-0.5", isDark ? "text-[#555]" : "text-[#bbb]")}>
                                        {t.fields.length > 0 ? `${t.fields.length} fields` : 'Blank'}
                                    </div>
                                </div>
                                {template === t.id && (
                                    <div className="ml-auto shrink-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center border-2 border-primary-foreground/20">
                                        <Check size={8} className="text-primary-foreground" strokeWidth={4} />
                                    </div>
                                )}
                            </button>
                        ))}

                        {formTemplates.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTemplate(`tpl_${t.id}`)}
                                className={cn(
                                    "flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all",
                                    template === `tpl_${t.id}`
                                        ? (isDark
                                            ? "border-primary/50 bg-primary/8 ring-1 ring-primary/20"
                                            : "border-primary/40 bg-primary/5 ring-1 ring-primary/15")
                                        : (isDark
                                            ? "border-[#252525] bg-[#1c1c1c] hover:border-[#333]"
                                            : "border-[#e0e0e0] bg-white hover:border-[#bbb]")
                                )}
                            >
                                <span className="text-[18px] leading-none shrink-0 opacity-60">📑</span>
                                <div className="min-w-0 flex-1">
                                    <div className={cn("text-[12px] font-semibold truncate", isDark ? "text-[#ddd]" : "text-[#222]")}>
                                        {t.name}
                                    </div>
                                    <div className={cn("text-[10.5px] mt-0.5", isDark ? "text-[#555]" : "text-[#bbb]")}>
                                        {t.blocks.length} fields
                                    </div>
                                </div>
                                {template === `tpl_${t.id}` && (
                                    <div className="ml-auto shrink-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center border-2 border-primary-foreground/20">
                                        <Check size={8} className="text-primary-foreground" strokeWidth={4} />
                                    </div>
                                )}
                            </button>
                        ))}
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
                        disabled={loading || !title.trim()}
                        className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Creating…' : 'Create form'}
                        {!loading && <ChevronRight size={14} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
