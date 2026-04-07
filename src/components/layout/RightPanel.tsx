"use client";

import React, { useState, useEffect } from 'react';
import {
    X, Bell, Mail, Phone, MapPin, Building2, Hash,
    FileText, Pencil, Save, Trash2, Check, ExternalLink,
    Globe, Briefcase, Users, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useClientStore } from '@/store/useClientStore';
import { useCompanyStore } from '@/store/useCompanyStore';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Shared helpers ─── */
function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function PanelHeader({ title, isDark, onClose }: { title: string; isDark: boolean; onClose: () => void }) {
    return (
        <div className={cn(
            "flex items-center justify-between px-4 py-3 border-b shrink-0",
            isDark ? "border-[#222]" : "border-[#ebebeb]"
        )}>
            <span className={cn("text-[13px] font-semibold", isDark ? "text-[#e5e5e5]" : "text-[#111]")}>{title}</span>
            <button
                onClick={onClose}
                className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                    isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#aaa] hover:text-[#555] hover:bg-[#f0f0f0]"
                )}
            >
                <X size={13} strokeWidth={2.5} />
            </button>
        </div>
    );
}

/* ─── Notifications Panel ─── */
function NotificationsPanel({ isDark }: { isDark: boolean }) {
    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    isDark ? "bg-white/5" : "bg-[#f0f0f0]"
                )}>
                    <Bell size={18} strokeWidth={1.5} className={isDark ? "text-[#555]" : "text-[#bbb]"} />
                </div>
                <p className={cn("text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No notifications yet</p>
            </div>
            {/* Footer */}
            <div className={cn(
                "flex items-center gap-3 px-4 py-3 border-t shrink-0",
                isDark ? "border-white/[0.01]" : "border-[#ebebeb]"
            )}>
                <div className={cn(
                    "flex items-center gap-1.5 flex-1 rounded-lg px-3 py-1.5",
                    isDark ? "bg-white/5" : "bg-[#f5f5f5]"
                )}>
                    <X size={10} className={isDark ? "text-[#555]" : "text-[#ccc]"} />
                    <span className={cn("text-[11px]", isDark ? "text-[#555]" : "text-[#aaa]")}>Search</span>
                </div>
                <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer",
                    isDark ? "text-[#666] hover:text-[#aaa] hover:bg-white/5" : "text-[#aaa] hover:text-[#555] hover:bg-[#f0f0f0]"
                )}>
                    <span className={cn(
                        "w-4 h-4 rounded-sm border flex items-center justify-center text-[9px]",
                        isDark ? "border-[#444]" : "border-[#ddd]"
                    )}>•</span>
                    Unread
                </div>
            </div>
        </div>
    );
}

/* ─── Editable field row ─── */
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
            "flex gap-3 px-4 py-2.5 transition-colors",
            !editing && (isDark ? "hover:bg-white/[0.02]" : "hover:bg-[#f9f9f9]")
        )}>
            <div className={cn("mt-0.5 shrink-0", isDark ? "text-[#555]" : "text-[#ccc]")}>{icon}</div>
            <div className="min-w-0 flex-1">
                <p className={cn("text-[10px] font-semibold uppercase tracking-wide mb-0.5", isDark ? "text-[#444]" : "text-[#bbb]")}>{label}</p>
                {editing ? (
                    textarea
                        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder}
                            className={cn("bg-transparent outline-none text-[12px] w-full resize-none border-b pb-0.5",
                                isDark ? "text-white placeholder:text-[#444] border-[#333]" : "text-[#111] placeholder:text-[#ccc] border-[#e0e0e0]")} />
                        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                            className={cn("bg-transparent outline-none text-[12px] w-full border-b pb-0.5",
                                isDark ? "text-white placeholder:text-[#444] border-[#333]" : "text-[#111] placeholder:text-[#ccc] border-[#e0e0e0]")} />
                ) : isLink && value ? (
                    <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
                        className="text-[12px] text-[#3b82f6] hover:underline flex items-center gap-1 group">
                        {value}<ExternalLink size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                ) : (
                    <p className={cn("text-[12px] break-words", isDark ? "text-[#ccc]" : "text-[#222]")}>{value}</p>
                )}
            </div>
        </div>
    );
}

/* ─── Contact Detail Panel ─── */
function ContactPanel({ id, isDark }: { id: string; isDark: boolean }) {
    const { clients, updateClient, deleteClient } = useClientStore();
    const { closeRightPanel } = useUIStore();
    const client = clients.find(c => c.id === id);

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [form, setForm] = useState({ contact_person: '', company_name: '', email: '', phone: '', address: '', tax_number: '', notes: '' });

    useEffect(() => {
        if (client) setForm({ contact_person: client.contact_person || '', company_name: client.company_name || '', email: client.email || '', phone: client.phone || '', address: client.address || '', tax_number: client.tax_number || '', notes: client.notes || '' });
    }, [client]);

    const u = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        if (!client) return;
        setSaving(true);
        try { await updateClient(client.id, form); setSaved(true); setTimeout(() => { setSaved(false); setEditing(false); }, 1200); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!client) return;
        await deleteClient(client.id);
        closeRightPanel();
    };

    if (!client) return (
        <div className={cn("flex-1 flex items-center justify-center text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>
            Contact not found
        </div>
    );

    const name = form.contact_person || form.company_name || '';
    const border = isDark ? "border-[#252525]" : "border-[#ebebeb]";

    return (
        <>
            {/* Hero */}
            <div className={cn("flex items-center gap-3 px-4 py-4 border-b shrink-0", border)}>
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0",
                    isDark ? "bg-white/8 text-[#888]" : "bg-[#f0f0f0] text-[#777]"
                )}>
                    {getInitials(name)}
                </div>
                <div className="min-w-0 flex-1">
                    {editing ? (
                        <input value={form.contact_person} onChange={e => u('contact_person')(e.target.value)} placeholder="Full name"
                            className={cn("text-[14px] font-bold bg-transparent outline-none w-full border-b pb-0.5",
                                isDark ? "text-white border-[#333] placeholder:text-[#444]" : "text-[#111] border-[#e0e0e0] placeholder:text-[#ccc]")} />
                    ) : (
                        <h2 className={cn("text-[14px] font-bold truncate", isDark ? "text-white" : "text-[#111]")}>{form.contact_person || '—'}</h2>
                    )}
                    {form.company_name && !editing && (
                        <p className={cn("text-[11px] mt-0.5", isDark ? "text-[#555]" : "text-[#aaa]")}>{form.company_name}</p>
                    )}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                    {editing ? (
                        <>
                            <button onClick={() => { setEditing(false); if (client) setForm({ contact_person: client.contact_person || '', company_name: client.company_name || '', email: client.email || '', phone: client.phone || '', address: client.address || '', tax_number: client.tax_number || '', notes: client.notes || '' }); }}
                                className={cn("text-[10px] px-2 py-1 rounded-lg font-medium transition-colors",
                                    isDark ? "text-[#666] hover:bg-white/5" : "text-[#999] hover:bg-[#f0f0f0]")}>
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className={cn("flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-colors",
                                    saved ? "bg-emerald-500 text-white" : "bg-[#4dbf39] hover:bg-[#59d044] text-black disabled:opacity-60")}>
                                {saved ? <><Check size={10} />Saved</> : <><Save size={10} />{saving ? '...' : 'Save'}</>}
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setEditing(true)}
                            className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                                isDark ? "text-[#555] hover:text-[#ccc] hover:bg-white/5" : "text-[#bbb] hover:text-[#555] hover:bg-[#f0f0f0]")}>
                            <Pencil size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Quick email */}
            {form.email && !editing && (
                <div className="px-4 pt-3">
                    <a href={`mailto:${form.email}`}
                        className={cn("flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors group",
                            isDark ? "bg-[#1a1a1a] border border-[#252525] text-[#4dbf39] hover:bg-[#1e1e1e]"
                                : "bg-[#f0fdf4] border border-[#d1fad4] text-[#299b1a] hover:bg-[#e8fbe8]")}>
                        <div className="flex items-center gap-1.5 min-w-0"><Mail size={11} /><span className="truncate">{form.email}</span></div>
                        <ExternalLink size={9} className="shrink-0 opacity-40 group-hover:opacity-100" />
                    </a>
                </div>
            )}

            {/* Fields */}
            <div className="flex-1 overflow-y-auto py-1">
                {editing && <Field label="Email" icon={<Mail size={11} />} value={form.email} editing onChange={u('email')} type="email" placeholder="email@example.com" isDark={isDark} />}
                <Field label="Phone"   icon={<Phone size={11} />}    value={form.phone}      editing={editing} onChange={u('phone')}      placeholder="+1 234 567 890" isDark={isDark} />
                {editing && <Field label="Company" icon={<Building2 size={11} />} value={form.company_name} editing onChange={u('company_name')} placeholder="Company name" isDark={isDark} />}
                <Field label="Address" icon={<MapPin size={11} />}   value={form.address}    editing={editing} onChange={u('address')}    placeholder="Street, city"   isDark={isDark} />
                <Field label="Tax/VAT" icon={<Hash size={11} />}     value={form.tax_number} editing={editing} onChange={u('tax_number')} placeholder="VAT123"         isDark={isDark} />
                <Field label="Notes"   icon={<FileText size={11} />} value={form.notes}      editing={editing} onChange={u('notes')}      placeholder="Notes…"         isDark={isDark} textarea />
            </div>

            {/* Footer delete */}
            <div className={cn("px-4 py-3 border-t shrink-0", isDark ? "border-[#252525]" : "border-[#ebebeb]")}>
                {showDelete ? (
                    <div className="flex items-center gap-2">
                        <span className={cn("text-[11px] flex-1", isDark ? "text-[#666]" : "text-[#999]")}>Delete this contact?</span>
                        <button onClick={() => setShowDelete(false)} className={cn("px-2 py-1 text-[11px] rounded-lg", isDark ? "text-[#666] hover:bg-white/5" : "text-[#999] hover:bg-[#f0f0f0]")}>Cancel</button>
                        <button onClick={handleDelete} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white">
                            <Trash2 size={10} />Delete
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setShowDelete(true)} className={cn("flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg transition-colors",
                        isDark ? "text-[#444] hover:text-red-400 hover:bg-red-400/10" : "text-[#ccc] hover:text-red-500 hover:bg-red-50")}>
                        <Trash2 size={11} />Delete contact
                    </button>
                )}
            </div>
        </>
    );
}

/* ─── Company Detail Panel ─── */
const INDUSTRIES = ['Technology','Design','Marketing','Finance','Healthcare','Education','Real Estate','Legal','Consulting','Media','Retail','Manufacturing','Construction','Other'];

function CompanyPanel({ id, isDark }: { id: string; isDark: boolean }) {
    const { companies, updateCompany, deleteCompany } = useCompanyStore();
    const { clients } = useClientStore();
    const { closeRightPanel } = useUIStore();
    const company = companies.find(c => c.id === id);

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [showIndustry, setShowIndustry] = useState(false);
    const [form, setForm] = useState({ name: '', industry: '', website: '', email: '', phone: '', address: '', tax_number: '', notes: '' });

    useEffect(() => {
        if (company) setForm({ name: company.name || '', industry: company.industry || '', website: company.website || '', email: company.email || '', phone: company.phone || '', address: company.address || '', tax_number: company.tax_number || '', notes: company.notes || '' });
    }, [company]);

    const u = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        if (!company) return;
        setSaving(true);
        try { await updateCompany(company.id, form); setSaved(true); setTimeout(() => { setSaved(false); setEditing(false); }, 1200); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!company) return;
        await deleteCompany(company.id);
        closeRightPanel();
    };

    if (!company) return (
        <div className={cn("flex-1 flex items-center justify-center text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>
            Company not found
        </div>
    );

    const linkedContacts = clients.filter(c => c.company_name === company.name);
    const border = isDark ? "border-[#252525]" : "border-[#ebebeb]";

    return (
        <>
            {/* Hero */}
            <div className={cn("flex items-center gap-3 px-4 py-4 border-b shrink-0", border)}>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0",
                    isDark ? "bg-white/8 text-[#888]" : "bg-[#f0f0f0] text-[#777]")}>
                    {form.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    {editing ? (
                        <input value={form.name} onChange={e => u('name')(e.target.value)} placeholder="Company name"
                            className={cn("text-[14px] font-bold bg-transparent outline-none w-full border-b pb-0.5",
                                isDark ? "text-white border-[#333] placeholder:text-[#444]" : "text-[#111] border-[#e0e0e0] placeholder:text-[#ccc]")} />
                    ) : (
                        <h2 className={cn("text-[14px] font-bold truncate", isDark ? "text-white" : "text-[#111]")}>{form.name}</h2>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                        {editing ? (
                            <div className="relative">
                                <button onClick={() => setShowIndustry(v => !v)}
                                    className={cn("flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md transition-colors",
                                        isDark ? "bg-white/5 text-[#777] hover:bg-white/8" : "bg-[#f0f0f0] text-[#888] hover:bg-[#e8e8e8]")}>
                                    <Briefcase size={8} />{form.industry || 'Industry'}<ChevronRight size={8} className={cn("transition-transform", showIndustry && "rotate-90")} />
                                </button>
                                {showIndustry && (
                                    <div className={cn("absolute left-0 top-full mt-1 w-44 rounded-xl border shadow-xl z-50 overflow-hidden",
                                        isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]")}>
                                        <div className="max-h-48 overflow-auto py-1">
                                            {INDUSTRIES.map(ind => (
                                                <button key={ind} onClick={() => { u('industry')(ind); setShowIndustry(false); }}
                                                    className={cn("w-full text-left px-3 py-1.5 text-[11px] transition-colors",
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
                            <span className={cn("text-[11px]", isDark ? "text-[#555]" : "text-[#aaa]")}>{form.industry}</span>
                        ) : null}
                        <span className={cn("text-[10px]", isDark ? "text-[#444]" : "text-[#ccc]")}>{linkedContacts.length} contact{linkedContacts.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {editing ? (
                        <>
                            <button onClick={() => { setEditing(false); if (company) setForm({ name: company.name || '', industry: company.industry || '', website: company.website || '', email: company.email || '', phone: company.phone || '', address: company.address || '', tax_number: company.tax_number || '', notes: company.notes || '' }); }}
                                className={cn("text-[10px] px-2 py-1 rounded-lg font-medium transition-colors",
                                    isDark ? "text-[#666] hover:bg-white/5" : "text-[#999] hover:bg-[#f0f0f0]")}>
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className={cn("flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-colors",
                                    saved ? "bg-emerald-500 text-white" : "bg-[#4dbf39] hover:bg-[#59d044] text-black disabled:opacity-60")}>
                                {saved ? <><Check size={10} />Saved</> : <><Save size={10} />{saving ? '...' : 'Save'}</>}
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setEditing(true)}
                            className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                                isDark ? "text-[#555] hover:text-[#ccc] hover:bg-white/5" : "text-[#bbb] hover:text-[#555] hover:bg-[#f0f0f0]")}>
                            <Pencil size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Quick email */}
            {form.email && !editing && (
                <div className="px-4 pt-3">
                    <a href={`mailto:${form.email}`}
                        className={cn("flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors group",
                            isDark ? "bg-[#1a1a1a] border border-[#252525] text-[#4dbf39] hover:bg-[#1e1e1e]"
                                : "bg-[#f0fdf4] border border-[#d1fad4] text-[#299b1a] hover:bg-[#e8fbe8]")}>
                        <div className="flex items-center gap-1.5 min-w-0"><Mail size={11} /><span className="truncate">{form.email}</span></div>
                        <ExternalLink size={9} className="shrink-0 opacity-40 group-hover:opacity-100" />
                    </a>
                </div>
            )}

            {/* Fields */}
            <div className="flex-1 overflow-y-auto py-1">
                {editing && <Field label="Email"   icon={<Mail size={11} />}    value={form.email}    editing onChange={u('email')}    type="email" placeholder="hello@company.com" isDark={isDark} />}
                <Field label="Phone"   icon={<Phone size={11} />}   value={form.phone}    editing={editing} onChange={u('phone')}    placeholder="+1 234 567 890" isDark={isDark} />
                <Field label="Website" icon={<Globe size={11} />}   value={form.website}  editing={editing} onChange={u('website')}  placeholder="https://company.com" isDark={isDark} isLink />
                <Field label="Address" icon={<MapPin size={11} />}  value={form.address}  editing={editing} onChange={u('address')}  placeholder="Street, city"   isDark={isDark} />
                <Field label="Tax/VAT" icon={<Hash size={11} />}    value={form.tax_number} editing={editing} onChange={u('tax_number')} placeholder="VAT123"     isDark={isDark} />
                <Field label="Notes"   icon={<FileText size={11} />} value={form.notes}   editing={editing} onChange={u('notes')}    placeholder="Notes…"         isDark={isDark} textarea />

                {/* Linked contacts */}
                {linkedContacts.length > 0 && (
                    <div className="mt-2 px-4">
                        <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-[#444]" : "text-[#bbb]")}>Linked contacts</p>
                        {linkedContacts.map(c => (
                            <div key={c.id} className={cn("flex items-center gap-2.5 py-2 rounded-lg transition-colors",
                                isDark ? "hover:bg-white/[0.02]" : "hover:bg-[#f9f9f9]")}>
                                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0",
                                    isDark ? "bg-white/8 text-[#888]" : "bg-[#f0f0f0] text-[#777]")}>
                                    {getInitials(c.contact_person || c.company_name || '?')}
                                </div>
                                <div className="min-w-0">
                                    <p className={cn("text-[11px] font-medium truncate", isDark ? "text-[#ccc]" : "text-[#222]")}>{c.contact_person || '—'}</p>
                                    {c.email && <p className={cn("text-[10px] truncate", isDark ? "text-[#555]" : "text-[#aaa]")}>{c.email}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer delete */}
            <div className={cn("px-4 py-3 border-t shrink-0", isDark ? "border-[#252525]" : "border-[#ebebeb]")}>
                {showDelete ? (
                    <div className="flex items-center gap-2">
                        <span className={cn("text-[11px] flex-1", isDark ? "text-[#666]" : "text-[#999]")}>Delete this company?</span>
                        <button onClick={() => setShowDelete(false)} className={cn("px-2 py-1 text-[11px] rounded-lg", isDark ? "text-[#666] hover:bg-white/5" : "text-[#999] hover:bg-[#f0f0f0]")}>Cancel</button>
                        <button onClick={handleDelete} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white">
                            <Trash2 size={10} />Delete
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setShowDelete(true)} className={cn("flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg transition-colors",
                        isDark ? "text-[#444] hover:text-red-400 hover:bg-red-400/10" : "text-[#ccc] hover:text-red-500 hover:bg-red-50")}>
                        <Trash2 size={11} />Delete company
                    </button>
                )}
            </div>
        </>
    );
}

/* ─── Main RightPanel export ─── */
export default function RightPanel() {
    const { rightPanel, closeRightPanel, theme } = useUIStore();
    const isDark = theme === 'dark';

    const titles: Record<string, string> = {
        notifications: 'Notifications',
        contact: 'Contact',
        company: 'Company',
    };

    return (
        <AnimatePresence mode="wait">
            {rightPanel && (
                <motion.div
                    key="right-panel"
                    initial={{ width: 0, opacity: 0, x: 20 }}
                    animate={{ width: 280, opacity: 1, x: 0 }}
                    exit={{ width: 0, opacity: 0, x: 20 }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        opacity: { duration: 0.15 }
                    }}
                    className={cn(
                        "h-full shrink-0 flex flex-col rounded-l-2xl rounded-r-none overflow-hidden transition-colors shadow-2xl",
                        isDark ? "bg-[#141414]" : "bg-white border-[#d2d2eb]"
                    )}
                >
                    <div className="w-[280px] h-full flex flex-col overflow-hidden">
                        <PanelHeader
                            title={titles[rightPanel.type] || 'Details'}
                            isDark={isDark}
                            onClose={closeRightPanel}
                        />

                        {rightPanel.type === 'notifications' && <NotificationsPanel isDark={isDark} />}
                        {rightPanel.type === 'contact' && <ContactPanel id={rightPanel.id} isDark={isDark} />}
                        {rightPanel.type === 'company' && <CompanyPanel id={rightPanel.id} isDark={isDark} />}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
