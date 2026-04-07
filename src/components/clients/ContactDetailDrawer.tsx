"use client";

import React, { useState, useEffect } from 'react';
import {
    X, Mail, Phone, MapPin, Building2, Hash, FileText,
    Pencil, Save, Trash2, Check, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useClientStore } from '@/store/useClientStore';

interface Client {
    id: string;
    company_name?: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    tax_number?: string;
    notes?: string;
}

interface Props {
    client: Client | null;
    onClose: () => void;
}

/* Tonal avatar palettes */
const AVATAR_COLORS = [
    { light: 'bg-violet-100 text-violet-700', dark: 'bg-violet-500/20 text-violet-300' },
    { light: 'bg-sky-100 text-sky-700',       dark: 'bg-sky-500/20 text-sky-300' },
    { light: 'bg-emerald-100 text-emerald-700', dark: 'bg-emerald-500/20 text-emerald-300' },
    { light: 'bg-amber-100 text-amber-700',    dark: 'bg-amber-500/20 text-amber-300' },
    { light: 'bg-rose-100 text-rose-700',      dark: 'bg-rose-500/20 text-rose-300' },
    { light: 'bg-cyan-100 text-cyan-700',      dark: 'bg-cyan-500/20 text-cyan-300' },
    { light: 'bg-indigo-100 text-indigo-700',  dark: 'bg-indigo-500/20 text-indigo-300' },
    { light: 'bg-orange-100 text-orange-700',  dark: 'bg-orange-500/20 text-orange-300' },
];

function getAvatar(name: string, isDark: boolean) {
    const idx = (name?.charCodeAt(0) || 0) % AVATAR_COLORS.length;
    return isDark ? AVATAR_COLORS[idx].dark : AVATAR_COLORS[idx].light;
}

function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function Field({
    label, icon, value, editing, onChange, type = 'text', placeholder = '', isDark, textarea = false
}: {
    label: string; icon: React.ReactNode; value: string; editing: boolean;
    onChange: (v: string) => void; type?: string; placeholder?: string;
    isDark: boolean; textarea?: boolean;
}) {
    if (!value && !editing) return null;
    return (
        <div className={cn(
            "flex gap-3 px-4 py-3 rounded-lg transition-colors",
            editing
                ? isDark ? "bg-[#1c1c1c] border border-[#2a2a2a]" : "bg-[#fafafa] border border-[#e0e0e0]"
                : isDark ? "hover:bg-white/[0.025]" : "hover:bg-[#f7f7f7]"
        )}>
            <div className={cn("mt-0.5 shrink-0", isDark ? "text-[#555]" : "text-[#bbb]")}>{icon}</div>
            <div className="min-w-0 flex-1">
                <p className={cn("text-[10px] font-semibold mb-0.5 uppercase tracking-wide", isDark ? "text-[#444]" : "text-[#bbb]")}>{label}</p>
                {editing ? (
                    textarea
                        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder}
                            className={cn("bg-transparent outline-none text-[13px] w-full resize-none", isDark ? "text-white placeholder:text-[#444]" : "text-[#111] placeholder:text-[#ccc]")} />
                        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                            className={cn("bg-transparent outline-none text-[13px] w-full", isDark ? "text-white placeholder:text-[#444]" : "text-[#111] placeholder:text-[#ccc]")} />
                ) : (
                    <p className={cn("text-[13px] break-words", isDark ? "text-[#ccc]" : "text-[#222]")}>{value}</p>
                )}
            </div>
        </div>
    );
}

export default function ContactDetailDrawer({ client, onClose }: Props) {
    const { theme } = useUIStore();
    const { updateClient, deleteClient } = useClientStore();
    const isDark = theme === 'dark';

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({ contact_person: '', company_name: '', email: '', phone: '', address: '', tax_number: '', notes: '' });

    const resetForm = (c: Client) => setForm({
        contact_person: c.contact_person || '', company_name: c.company_name || '',
        email: c.email || '', phone: c.phone || '', address: c.address || '',
        tax_number: c.tax_number || '', notes: c.notes || '',
    });

    useEffect(() => {
        if (client) { resetForm(client); setEditing(false); setShowDelete(false); setSaved(false); }
    }, [client]);

    if (!client) return null;

    const u = (key: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [key]: v }));

    const handleSave = async () => {
        setSaving(true);
        try { await updateClient(client.id, form); setSaved(true); setTimeout(() => { setSaved(false); setEditing(false); }, 1200); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => { await deleteClient(client.id); onClose(); };

    const name = form.contact_person || form.company_name || '';
    const avatarCls = getAvatar(name, isDark);
    const border = isDark ? 'border-[#252525]' : 'border-[#ebebeb]';
    const drawerBg = isDark ? 'bg-[#141414]' : 'bg-white';

    return (
        <>
            <div className="fixed inset-0 z-[200] bg-black/20" onClick={onClose} />
            <div className={cn(
                "fixed top-0 right-0 bottom-0 z-[201] w-[360px] flex flex-col shadow-xl border-l",
                "animate-in slide-in-from-right duration-200",
                drawerBg, border
            )}>
                {/* Header */}
                <div className={cn("flex items-center justify-between px-4 py-3 border-b shrink-0", border)}>
                    <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Contact details</span>
                    <div className="flex items-center gap-1">
                        {editing ? (
                            <>
                                <button onClick={() => { setEditing(false); resetForm(client); }}
                                    className={cn("px-3 py-1.5 text-[11px] rounded-[8px] font-medium transition-colors",
                                        isDark ? "text-[#666] hover:text-[#aaa] hover:bg-white/5" : "text-[#999] hover:text-[#333] hover:bg-[#f0f0f0]")}>
                                    Cancel
                                </button>
                                <button onClick={handleSave} disabled={saving}
                                    className={cn("flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-[8px] transition-colors",
                                        saved ? "bg-emerald-500 text-white" : "bg-[#4dbf39] hover:bg-[#59d044] text-black disabled:opacity-60")}>
                                    {saved ? <><Check size={11} /> Saved</> : <><Save size={11} /> {saving ? 'Saving…' : 'Save'}</>}
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setEditing(true)}
                                className={cn("flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-[8px] transition-colors",
                                    isDark ? "text-[#666] hover:text-[#ccc] hover:bg-white/5" : "text-[#888] hover:text-[#333] hover:bg-[#f0f0f0]")}>
                                <Pencil size={11} /> Edit
                            </button>
                        )}
                        <button onClick={onClose}
                            className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors ml-0.5",
                                isDark ? "bg-white/5 text-[#555] hover:text-[#ccc]" : "bg-[#f0f0f0] text-[#888] hover:text-[#333]")}>
                            <X size={13} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Profile hero */}
                <div className={cn("flex items-center gap-4 px-5 py-5 border-b shrink-0", border)}>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-[15px] font-bold shrink-0", avatarCls)}>
                        {getInitials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                        {editing ? (
                            <input value={form.contact_person} onChange={e => u('contact_person')(e.target.value)}
                                placeholder="Full name"
                                className={cn("text-[15px] font-bold bg-transparent outline-none w-full border-b pb-0.5",
                                    isDark ? "text-white border-[#333] placeholder:text-[#444]" : "text-[#111] border-[#e0e0e0] placeholder:text-[#ccc]")} />
                        ) : (
                            <h2 className={cn("text-[15px] font-bold truncate", isDark ? "text-white" : "text-[#111]")}>
                                {form.contact_person || '—'}
                            </h2>
                        )}
                        {form.company_name && !editing && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <Building2 size={10} className={isDark ? "text-[#555]" : "text-[#bbb]"} />
                                <p className={cn("text-[11px]", isDark ? "text-[#666]" : "text-[#888]")}>{form.company_name}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick email CTA */}
                {form.email && !editing && (
                    <div className="px-4 pt-3">
                        <a href={`mailto:${form.email}`}
                            className={cn(
                                "flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium transition-colors group",
                                isDark ? "bg-[#1a1a1a] border border-[#252525] text-[#4dbf39] hover:bg-[#1e1e1e]"
                                    : "bg-[#f0fdf4] border border-[#d1fad4] text-[#299b1a] hover:bg-[#e8fbe8]"
                            )}>
                            <div className="flex items-center gap-2 min-w-0">
                                <Mail size={12} /><span className="truncate">{form.email}</span>
                            </div>
                            <ExternalLink size={10} className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </a>
                    </div>
                )}

                {/* Fields */}
                <div className="flex-1 overflow-y-auto py-2 px-2">
                    {editing && (
                        <Field label="Email" icon={<Mail size={12} />} value={form.email} editing onChange={u('email')} type="email" placeholder="email@example.com" isDark={isDark} />
                    )}
                    <Field label="Phone" icon={<Phone size={12} />} value={form.phone} editing={editing} onChange={u('phone')} placeholder="+1 234 567 890" isDark={isDark} />
                    {editing && (
                        <Field label="Company" icon={<Building2 size={12} />} value={form.company_name} editing onChange={u('company_name')} placeholder="Company name" isDark={isDark} />
                    )}
                    <Field label="Address" icon={<MapPin size={12} />} value={form.address} editing={editing} onChange={u('address')} placeholder="Street, city" isDark={isDark} />
                    <Field label="Tax / VAT" icon={<Hash size={12} />} value={form.tax_number} editing={editing} onChange={u('tax_number')} placeholder="VAT123" isDark={isDark} />
                    <Field label="Notes" icon={<FileText size={12} />} value={form.notes} editing={editing} onChange={u('notes')} placeholder="Internal notes…" isDark={isDark} textarea />
                </div>

                {/* Footer */}
                <div className={cn("px-4 py-3 border-t shrink-0", border)}>
                    {showDelete ? (
                        <div className="flex items-center gap-2">
                            <span className={cn("text-[11px] flex-1", isDark ? "text-[#666]" : "text-[#999]")}>Delete this contact?</span>
                            <button onClick={() => setShowDelete(false)}
                                className={cn("px-3 py-1.5 text-[11px] rounded-lg transition-colors",
                                    isDark ? "text-[#666] hover:bg-white/5" : "text-[#999] hover:bg-[#f0f0f0]")}>
                                Cancel
                            </button>
                            <button onClick={handleDelete}
                                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">
                                <Trash2 size={11} /> Delete
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setShowDelete(true)}
                            className={cn("flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors",
                                isDark ? "text-[#444] hover:text-red-400 hover:bg-red-400/10" : "text-[#ccc] hover:text-red-500 hover:bg-red-50")}>
                            <Trash2 size={11} /> Delete contact
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
