"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
    X, ChevronRight, User, Building2, Mail, Phone,
    MapPin, Hash, FileText, Plus, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useCompanyStore } from '@/store/useCompanyStore';
import { CreateCompanyModal } from '@/components/modals/CreateCompanyModal';
import ImageUploadModal from '@/components/modals/ImageUploadModal';
import { Image as ImageIcon } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

interface ClientFormData {
    company_name: string;
    contact_person: string;
    email: string;
    phone?: string;
    address?: string;
    tax_number?: string;
    notes?: string;
    avatar_url?: string;
}

interface ClientEditorProps {
    initialData?: ClientFormData;
    onClose: () => void;
    onSave: (data: ClientFormData) => Promise<void>;
}

/* ─── Stable field — defined OUTSIDE the modal to avoid remount on re-render ─── */
function FormField({
    label, icon, value, onChange, type = 'text', placeholder = '', error, isDark, autoFocus
}: {
    label: string;
    icon: React.ReactNode;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
    error?: string;
    isDark: boolean;
    autoFocus?: boolean;
}) {
    return (
        <div className={cn(
            "w-full rounded-xl border px-4 py-3 text-[13px] transition-all focus-within:ring-2",
            error
                ? "border-red-400 focus-within:ring-red-100"
                : isDark
                    ? "bg-[#1c1c1c] border-[#2e2e2e] focus-within:ring-[#333] focus-within:border-[#444]"
                    : "bg-white border-[#e0e0e0] focus-within:ring-[#e8e8e8] focus-within:border-[#ccc]"
        )}>
            <div className="flex items-center gap-1.5 mb-0.5">
                <span className={cn("opacity-40", isDark ? "text-white" : "text-[#333]")}>{icon}</span>
                <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>{label}</span>
                {error && <span className="ml-auto text-[10px] text-red-400">{error}</span>}
            </div>
            <input
                autoFocus={autoFocus}
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    "bg-transparent outline-none text-[13px] w-full",
                    isDark ? "text-white placeholder:text-[#555]" : "text-[#111] placeholder:text-[#bbb]"
                )}
            />
        </div>
    );
}

/* ─── Company autocomplete field — also stable, outside parent ─── */
function CompanyField({
    value, onChange, isDark
}: {
    value: string;
    onChange: (v: string) => void;
    isDark: boolean;
}) {
    const { companies, fetchCompanies } = useCompanyStore();
    const [query, setQuery] = useState(value);
    const [open, setOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

    // Sync internal query when external value changes (e.g. company just created)
    useEffect(() => { setQuery(value); }, [value]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = companies.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase())
    );

    const handleSelect = (name: string) => {
        setQuery(name);
        onChange(name);
        setOpen(false);
    };

    const handleCompanyCreated = (name: string) => {
        setQuery(name);
        onChange(name);
        fetchCompanies();
    };

    const field = cn(
        "w-full rounded-xl border px-4 py-3 text-[13px] transition-all focus-within:ring-2",
        isDark
            ? "bg-[#1c1c1c] border-[#2e2e2e] focus-within:ring-[#333] focus-within:border-[#444]"
            : "bg-white border-[#e0e0e0] focus-within:ring-[#e8e8e8] focus-within:border-[#ccc]"
    );

    return (
        <>
            <div className="relative" ref={ref}>
                <div className={field}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Building2 size={11} className={cn("opacity-40", isDark ? "text-white" : "text-[#333]")} />
                        <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Company name</span>
                        {companies.length > 0 && (
                            <span className={cn("ml-auto text-[10px]", isDark ? "text-[#444]" : "text-[#ccc]")}>
                                {companies.length} companies
                            </span>
                        )}
                    </div>
                    <input
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            onChange(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        placeholder="Type to search or add"
                        className={cn(
                            "bg-transparent outline-none text-[13px] w-full",
                            isDark ? "text-white placeholder:text-[#555]" : "text-[#111] placeholder:text-[#bbb]"
                        )}
                    />
                </div>

                {/* Dropdown */}
                {open && (
                    <div className={cn(
                        "absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-50 overflow-hidden",
                        isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                    )}>
                        {/* Matching companies */}
                        {filtered.length > 0 && (
                            <div className="max-h-40 overflow-auto">
                                {filtered.map(c => (
                                    <button
                                        key={c.id}
                                        onMouseDown={e => { e.preventDefault(); handleSelect(c.name); }}
                                        className={cn(
                                            "w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-left transition-colors",
                                            isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]"
                                        )}
                                    >
                                        <Avatar 
                                            src={c.avatar_url} 
                                            name={c.name} 
                                            className="w-6 h-6 rounded-md" 
                                            isDark={isDark} 
                                        />
                                        <div className="min-w-0">
                                            <div className="font-medium truncate">{c.name}</div>
                                            {c.industry && (
                                                <div className={cn("text-[10px] truncate", isDark ? "text-[#555]" : "text-[#aaa]")}>{c.industry}</div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {filtered.length === 0 && query && (
                            <div className={cn("px-4 py-2.5 text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>
                                No match for "{query}"
                            </div>
                        )}

                        {/* Divider + Create new */}
                        {(!query || !companies.some(c => c.name.toLowerCase() === query.toLowerCase())) && (
                            <>
                                {filtered.length > 0 && <div className={cn("border-t", isDark ? "border-[#252525]" : "border-[#f0f0f0]")} />}
                                <button
                                    onMouseDown={e => { e.preventDefault(); setOpen(false); setShowCreateModal(true); }}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors",
                                        isDark ? "text-[#4dbf39] hover:bg-white/5" : "text-[#3aaa29] hover:bg-[#f5f5f5]"
                                    )}
                                >
                                    <Plus size={13} />
                                    {query ? `Create "${query}" as new company` : 'Create new company'}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Create Company Modal */}
            <CreateCompanyModal
                open={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={handleCompanyCreated}
            />
        </>
    );
}

/* ─── Main client editor modal ─── */
export default function ClientEditor({ initialData, onClose, onSave }: ClientEditorProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const [form, setForm] = useState<ClientFormData>({
        company_name:   initialData?.company_name   || '',
        contact_person: initialData?.contact_person || '',
        email:          initialData?.email          || '',
        phone:          initialData?.phone          || '',
        address:        initialData?.address        || '',
        tax_number:     initialData?.tax_number     || '',
        notes:          initialData?.notes          || '',
        avatar_url:     initialData?.avatar_url || '',
    });
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});
    const [saving, setSaving] = useState(false);

    const update = (key: keyof ClientFormData) => (v: string) => {
        setForm(f => ({ ...f, [key]: v }));
        if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
    };

    const validate = () => {
        const e: typeof errors = {};
        if (!form.contact_person.trim()) e.contact_person = 'Required';
        if (!form.email.trim()) e.email = 'Required';
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
        return e;
    };

    const handleSubmit = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        setSaving(true);
        try { await onSave(form); }
        finally { setSaving(false); }
    };

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
                        {initialData ? 'Edit contact' : 'New contact'}
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
                    {/* Avatar Upload */}
                    <div 
                        onClick={() => setIsAvatarModalOpen(true)}
                        className={cn(
                            "w-full rounded-xl border px-4 py-3 cursor-pointer transition-all",
                            isDark
                                ? "bg-[#1c1c1c] border-[#2e2e2e] hover:border-[#444]"
                                : "bg-white border-[#e0e0e0] hover:border-[#ccc]"
                        )}
                    >
                        <div className="flex items-center gap-1.5 mb-1.5 grayscale opacity-60">
                            <ImageIcon size={11} className={isDark ? "text-white" : "text-[#333]"} />
                            <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Profile photo</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Avatar 
                                src={form.avatar_url} 
                                name={form.contact_person || form.company_name} 
                                className="w-10 h-10 rounded-lg border border-black/5" 
                                isDark={isDark} 
                                fallbackClassName="border border-dashed border-[#e0e0e0] dark:border-[#333]"
                            />
                            <div className="flex flex-col">
                                <span className={cn("text-[13px] font-medium", isDark ? "text-white/60" : "text-black/60")}>
                                    {form.avatar_url ? 'Update photo' : 'Upload photo'}
                                </span>
                                <span className={cn("text-[10px]", isDark ? "text-[#444]" : "text-[#ccc]")}>
                                    JPG, PNG or SVG. Max 2MB.
                                </span>
                            </div>
                        </div>
                    </div>

                    <FormField
                        isDark={isDark} autoFocus
                        label="Contact person *"
                        icon={<User size={11} />}
                        value={form.contact_person}
                        onChange={update('contact_person')}
                        placeholder="Full name"
                        error={errors.contact_person}
                    />

                    {/* Smart company search */}
                    <CompanyField
                        isDark={isDark}
                        value={form.company_name}
                        onChange={update('company_name')}
                    />

                    <FormField
                        isDark={isDark}
                        label="Email *"
                        icon={<Mail size={11} />}
                        type="email"
                        value={form.email}
                        onChange={update('email')}
                        placeholder="email@example.com"
                        error={errors.email}
                    />

                    <div className="grid grid-cols-2 gap-2.5">
                        <FormField
                            isDark={isDark}
                            label="Phone"
                            icon={<Phone size={11} />}
                            value={form.phone || ''}
                            onChange={update('phone')}
                            placeholder="+1 234 567 890"
                        />
                        <FormField
                            isDark={isDark}
                            label="Tax number"
                            icon={<Hash size={11} />}
                            value={form.tax_number || ''}
                            onChange={update('tax_number')}
                            placeholder="VAT / EIN"
                        />
                    </div>

                    <FormField
                        isDark={isDark}
                        label="Address"
                        icon={<MapPin size={11} />}
                        value={form.address || ''}
                        onChange={update('address')}
                        placeholder="Street, city, country"
                    />

                    {/* Notes — inlined textarea */}
                    <div className={cn(
                        "w-full rounded-xl border px-4 py-3 text-[13px] transition-all focus-within:ring-2",
                        isDark
                            ? "bg-[#1c1c1c] border-[#2e2e2e] focus-within:ring-[#333] focus-within:border-[#444]"
                            : "bg-white border-[#e0e0e0] focus-within:ring-[#e8e8e8] focus-within:border-[#ccc]"
                    )}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <FileText size={11} className={cn("opacity-40", isDark ? "text-white" : "text-[#333]")} />
                            <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Notes</span>
                        </div>
                        <textarea
                            value={form.notes || ''}
                            onChange={e => update('notes')(e.target.value)}
                            rows={2}
                            placeholder="Internal notes..."
                            className={cn(
                                "bg-transparent outline-none text-[13px] w-full resize-none",
                                isDark ? "text-white placeholder:text-[#555]" : "text-[#111] placeholder:text-[#bbb]"
                            )}
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
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl bg-[#4dbf39] hover:bg-[#59d044] text-black transition-colors disabled:opacity-60"
                    >
                        {saving ? 'Saving...' : (initialData ? 'Save changes' : 'Create contact')}
                        {!saving && <ChevronRight size={14} />}
                    </button>
                </div>
            </div>

            {isAvatarModalOpen && (
                <ImageUploadModal
                    isOpen={isAvatarModalOpen}
                    onClose={() => setIsAvatarModalOpen(false)}
                    onUpload={(url) => update('avatar_url')(url)}
                />
            )}
        </div>
    );
}
