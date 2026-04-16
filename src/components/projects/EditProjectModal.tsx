"use client";

import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore, Project } from '@/store/useProjectStore';
import { appToast } from '@/lib/toast';
import DatePicker from '@/components/ui/DatePicker';

interface Props {
    open: boolean;
    onClose: () => void;
    project: Project;
}

export default function EditProjectModal({ open, onClose, project }: Props) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { updateProject } = useProjectStore();

    const [name, setName]         = useState(project.name);
    const [desc, setDesc]         = useState(project.description || '');
    const [deadline, setDeadline] = useState(project.deadline || '');
    const [saving, setSaving]     = useState(false);

    useEffect(() => {
        if (open) {
            setName(project.name);
            setDesc(project.description || '');
            setDeadline(project.deadline || '');
        }
    }, [open, project]);

    const handleSave = async () => {
        if (!name.trim()) { appToast.error("Error", 'Project name is required'); return; }
        setSaving(true);
        try {
            const success = await updateProject(project.id, { 
                name: name.trim(), 
                description: desc.trim() || null, 
                deadline: deadline || null 
            });
            if (success) {
                appToast.success('Project updated successfully');
                onClose();
            } else {
                appToast.error("Error", 'Failed to update project — check console');
            }
        } finally {
            setSaving(false);
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
                <div className="flex items-center justify-between px-5 pt-5 pb-4 text-left">
                    <h2 className={cn("text-[13.5px] font-bold tracking-tight", isDark ? "text-white" : "text-[#111]")}>
                        Edit project
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
                    <div className={cn(field, "flex flex-col gap-0.5 text-left")}>
                        <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Project Name</span>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="bg-transparent outline-none text-[13px] w-full"
                            placeholder="e.g. Brand Redesign 2026"
                        />
                    </div>

                    {/* Description */}
                    <div className={cn(field, "flex flex-col gap-0.5 text-left")}>
                        <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Description</span>
                        <textarea
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            className="bg-transparent outline-none text-[13px] w-full resize-none min-h-[60px]"
                            placeholder="Optional project description…"
                        />
                    </div>

                    {/* Deadline */}
                    <div className={cn(field, "flex flex-col gap-0.5 text-left")}>
                        <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Deadline</span>
                        <DatePicker
                            value={deadline}
                            onChange={setDeadline}
                            isDark={isDark}
                            placeholder="Set project deadline"
                        />
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
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground transition-colors disabled:opacity-60"
                    >
                        {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
