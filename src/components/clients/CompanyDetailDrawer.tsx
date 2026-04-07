"use client";

import React, { useState, useEffect } from 'react';
import {
    X, Mail, Phone, MapPin, Globe, Building2, Hash,
    FileText, Pencil, Save, Trash2, Users, Briefcase,
    Check, ExternalLink, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useCompanyStore, Company } from '@/store/useCompanyStore';
import { useClientStore } from '@/store/useClientStore';

const INDUSTRIES = [
    'Technology', 'Design', 'Marketing', 'Finance', 'Healthcare',
    'Education', 'Real Estate', 'Legal', 'Consulting', 'Media',
    'Retail', 'Manufacturing', 'Construction', 'Other'
];

function Field({
    label, icon, value, editing, onChange, type = 'text', placeholder = '', isDark, textarea = false, isLink = false
}: {
    label: string; icon: React.ReactNode; value: string; editing: boolean;
    onChange: (v: string) => void; type?: string; placeholder?: string;
    isDark: boolean; textarea?: boolean; isLink?: boolean;
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
                ) : isLink && value ? (
                    <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
                        className="text-[13px] text-[#3b82f6] hover:underline flex items-center gap-1 group">
                        {value}
                        <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                ) : (
                    <p className={cn("text-[13px] break-words", isDark ? "text-[#ccc]" : "text-[#222]")}>{value}</p>
                )}
            </div>
        </div>
    );
}

interface Props {
    company: Company | null;
    onClose: () => void;
}

export default function CompanyDetailDrawer({ company, onClose }: Props) {
    const { theme } = useUIStore();
    const { updateCompany, deleteCompany } = useCompanyStore();
    const { clients } = useClientStore();
    const isDark = theme === 'dark';

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showIndustryDrop, setShowIndustryDrop] = useState(false);
    const [form, setForm] = useState({ name: '', industry: '', website: '', email: '', phone: '', address: '', tax_number: '', notes: '' });

    const resetForm = (c: Company) => setForm({
        name: c.name || '', industry: c.industry || '', website: c.website || '',
        email: c.email || '', phone: c.phone || '', address: c.address || '',
        tax_number: c.tax_number || '', notes: c.notes || '',
    });

    useEffect(() => {
        if (company) { resetForm(company); setEditing(false); setShowDelete(false); setSaved(false); }
    }, [company]);

    if (!company) return null;

    const u = (key: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [key]: v }));

    const handleSave = async () => {
        setSaving(true);
        try { await updateCompany(company.id, form); setSaved(true); setTimeout(() => { setSaved(false); setEditing(false); }, 1200); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => { await deleteCompany(company.id); onClose(); };

    const linkedContacts = clients.filter(c => c.company_name === company.name);
    const border = isDark ? 'border-[#252525]' : 'border-[#ebebeb]';
    const drawerBg = isDark ? 'bg-[#141414]' : 'bg-white';

    return (
        <>
            <div className="fixed inset-0 z-[200] bg-black/20" onClick={onClose} />
            <div className={cn(
                "fixed top-0 right-0 bottom-0 z-[201] w-[380px] flex flex-col shadow-xl border-l",
                "animate-in slide-in-from-right duration-200",
                drawerBg, border
            )}>
                {/* Header */}
                <div className={cn("flex items-center justify-between px-4 py-3 border-b shrink-0", border)}>
                    <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Company details</span>
                    <div className="flex items-center gap-1">
                        {editing ? (
                            <>
                                <button onClick={() => { setEditing(false); resetForm(company); }}
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
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-[15px] font-bold shrink-0",
                        isDark ? "bg-white/8 text-[#888]" : "bg-[#f0f0f0] text-[#777]")}>
                        {form.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        {editing ? (
                            <input value={form.name} onChange={e => u('name')(e.target.value)} placeholder="Company name"
                                className={cn("text-[15px] font-bold bg-transparent outline-none w-full border-b pb-0.5",
                                    isDark ? "text-white border-[#333] placeholder:text-[#444]" : "text-[#111] border-[#e0e0e0] placeholder:text-[#ccc]")} />
                        ) : (
                            <h2 className={cn("text-[15px] font-bold truncate", isDark ? "text-white" : "text-[#111]")}>{form.name}</h2>
                        )}

                        {/* Industry picker / badge */}
                        {editing ? (
                            <div className="relative mt-1.5">
                                <button onClick={() => setShowIndustryDrop(v => !v)}
                                    className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
                                        isDark ? "bg-white/5 text-[#777] hover:bg-white/8" : "bg-[#f0f0f0] text-[#888] hover:bg-[#e8e8e8]")}>
                                    <Briefcase size={9} />
                                    {form.industry || 'Select industry'}
                                    <ChevronRight size={9} className={cn("transition-transform", showIndustryDrop && "rotate-90")} />
                                </button>
                                {showIndustryDrop && (
                                    <div className={cn("absolute left-0 top-full mt-1 w-48 rounded-xl border shadow-xl z-50 overflow-hidden",
                                        isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]")}>
                                        <div className="max-h-52 overflow-auto py-1">
                                            {INDUSTRIES.map(ind => (
                                                <button key={ind} onClick={() => { u('industry')(ind); setShowIndustryDrop(false); }}
                                                    className={cn("w-full text-left px-4 py-2 text-[12px] transition-colors",
                                                        form.industry === ind
                                                            ? isDark ? "bg-white/10 text-white" : "bg-[#f0f0f0] text-[#111] font-medium"
                                                            : isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]")}>
                                                    {ind}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : form.industry ? (
                            <div className="flex items-center gap-1 mt-0.5">
                                <Briefcase size={10} className={isDark ? "text-[#555]" : "text-[#bbb]"} />
                                <p className={cn("text-[11px]", isDark ? "text-[#666]" : "text-[#888]")}>{form.industry}</p>
                            </div>
                        ) : null}

                        {/* Contact count */}
                        <div className={cn("flex items-center gap-1 mt-0.5", isDark ? "text-[#444]" : "text-[#ccc]")}>
                            <Users size={10} />
                            <span className="text-[10px]">{linkedContacts.length} contact{linkedContacts.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>

                {/* Quick email CTA */}
                {form.email && !editing && (
                    <div className="px-4 pt-3">
                        <a href={`mailto:${form.email}`}
                            className={cn("flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium transition-colors group",
                                isDark ? "bg-[#1a1a1a] border border-[#252525] text-[#4dbf39] hover:bg-[#1e1e1e]"
                                    : "bg-[#f0fdf4] border border-[#d1fad4] text-[#299b1a] hover:bg-[#e8fbe8]")}>
                            <div className="flex items-center gap-2 min-w-0">
                                <Mail size={12} /><span className="truncate">{form.email}</span>
                            </div>
                            <ExternalLink size={10} className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </a>
                    </div>
                )}

                {/* Fields */}
                <div className="flex-1 overflow-y-auto py-2 px-2">
                    {editing && <Field label="Email"       icon={<Mail size={12} />}      value={form.email}    editing onChange={u('email')}    type="email" placeholder="hello@company.com" isDark={isDark} />}
                    <Field label="Phone"       icon={<Phone size={12} />}     value={form.phone}    editing={editing} onChange={u('phone')}    placeholder="+1 234 567 890"       isDark={isDark} />
                    <Field label="Website"     icon={<Globe size={12} />}     value={form.website}  editing={editing} onChange={u('website')}  placeholder="https://company.com"  isDark={isDark} isLink />
                    <Field label="Address"     icon={<MapPin size={12} />}    value={form.address}  editing={editing} onChange={u('address')}  placeholder="Street, city"         isDark={isDark} />
                    <Field label="Tax / VAT"   icon={<Hash size={12} />}      value={form.tax_number} editing={editing} onChange={u('tax_number')} placeholder="VAT123"          isDark={isDark} />
                    <Field label="Notes"       icon={<FileText size={12} />}  value={form.notes}    editing={editing} onChange={u('notes')}    placeholder="Internal notes…"      isDark={isDark} textarea />

                    {/* Linked contacts */}
                    {linkedContacts.length > 0 && (
                        <div className="mt-3">
                            <p className={cn("text-[10px] font-semibold uppercase tracking-wider px-4 mb-1", isDark ? "text-[#444]" : "text-[#bbb]")}>
                                Linked contacts
                            </p>
                            {linkedContacts.map(c => (
                                <div key={c.id} className={cn(
                                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
                                    isDark ? "hover:bg-white/[0.025]" : "hover:bg-[#f7f7f7]"
                                )}>
                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0",
                                        isDark ? "bg-white/8 text-[#888]" : "bg-[#f0f0f0] text-[#777]")}>
                                        {(c.contact_person || c.company_name || '?').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={cn("text-[12px] font-medium truncate", isDark ? "text-[#ccc]" : "text-[#222]")}>{c.contact_person || '—'}</p>
                                        {c.email && <p className={cn("text-[10px] truncate", isDark ? "text-[#555]" : "text-[#aaa]")}>{c.email}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={cn("px-4 py-3 border-t shrink-0", border)}>
                    {showDelete ? (
                        <div className="flex items-center gap-2">
                            <span className={cn("text-[11px] flex-1", isDark ? "text-[#666]" : "text-[#999]")}>Delete this company?</span>
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
                            <Trash2 size={11} /> Delete company
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
