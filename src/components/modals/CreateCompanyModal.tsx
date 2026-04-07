"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
    X, ChevronRight, Building2, Globe, Mail, Phone,
    MapPin, Hash, FileText, Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useCompanyStore } from '@/store/useCompanyStore';

interface Props {
    open: boolean;
    onClose: () => void;
    /** Called after successful save with the new company name */
    onCreated?: (name: string) => void;
}

const INDUSTRIES = [
    'Technology', 'Design', 'Marketing', 'Finance', 'Healthcare',
    'Education', 'Real Estate', 'Legal', 'Consulting', 'Media',
    'Retail', 'Manufacturing', 'Construction', 'Other'
];

/* ─── Stable FormField — must live outside the modal component ─── */
function FormField({
    label, icon, value, onChange, type = 'text', placeholder = '', isDark
}: {
    label: string;
    icon: React.ReactNode;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
    isDark: boolean;
}) {
    return (
        <div className={cn(
            "w-full rounded-xl border px-4 py-3 text-[13px] transition-all focus-within:ring-2",
            isDark
                ? "bg-[#1c1c1c] border-[#2e2e2e] focus-within:ring-[#333] focus-within:border-[#444]"
                : "bg-white border-[#e0e0e0] focus-within:ring-[#e8e8e8] focus-within:border-[#ccc]"
        )}>
            <div className="flex items-center gap-1.5 mb-0.5">
                <span className={cn("opacity-40", isDark ? "text-white" : "text-[#333]")}>{icon}</span>
                <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>{label}</span>
            </div>
            <input
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

export function CreateCompanyModal({ open, onClose, onCreated }: Props) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { addCompany } = useCompanyStore();

    const [name, setName] = useState('');
    const [industry, setIndustry] = useState('');
    const [showIndustryDrop, setShowIndustryDrop] = useState(false);
    const [website, setWebsite] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [taxNumber, setTaxNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [nameError, setNameError] = useState('');
    const industryRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            setName(''); setIndustry(''); setWebsite(''); setEmail('');
            setPhone(''); setAddress(''); setTaxNumber(''); setNotes('');
            setNameError('');
        }
    }, [open]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (industryRef.current && !industryRef.current.contains(e.target as Node)) {
                setShowIndustryDrop(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleCreate = async () => {
        if (!name.trim()) { setNameError('Company name is required'); return; }
        setSaving(true);
        try {
            const company = await addCompany({
                name: name.trim(),
                industry: industry || undefined,
                website: website || undefined,
                email: email || undefined,
                phone: phone || undefined,
                address: address || undefined,
                tax_number: taxNumber || undefined,
                notes: notes || undefined,
            });
            if (company) {
                onCreated?.(company.name);
                onClose();
            }
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    const field = cn(
        "w-full rounded-xl border px-4 py-3 text-[13px] transition-all focus-within:ring-2",
        isDark
            ? "bg-[#1c1c1c] border-[#2e2e2e] focus-within:ring-[#333] focus-within:border-[#444]"
            : "bg-white border-[#e0e0e0] focus-within:ring-[#e8e8e8] focus-within:border-[#ccc]"
    );

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={cn(
                "w-full max-w-[480px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200",
                isDark ? "bg-[#161616] border border-[#252525]" : "bg-[#f7f7f7] border border-[#e0e0e0]"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                    <div>
                        <h2 className={cn("text-[17px] font-bold tracking-tight", isDark ? "text-white" : "text-[#111]")}>
                            New company
                        </h2>
                        <p className={cn("text-[11px] mt-0.5", isDark ? "text-[#555]" : "text-[#aaa]")}>
                            Add a company to link with contacts
                        </p>
                    </div>
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
                <div className="px-5 pb-5 flex flex-col gap-2.5 max-h-[65vh] overflow-y-auto">
                    {/* Company name */}
                    <div className={cn(field, nameError && "border-red-400 focus-within:ring-red-100")}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <Building2 size={11} className={cn("opacity-40", isDark ? "text-white" : "text-[#333]")} />
                            <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Company name *</span>
                            {nameError && <span className="ml-auto text-[10px] text-red-400">{nameError}</span>}
                        </div>
                        <input
                            value={name}
                            onChange={e => { setName(e.target.value); setNameError(''); }}
                            placeholder="Acme Corp"
                            autoFocus
                            className={cn(
                                "bg-transparent outline-none text-[13px] w-full",
                                isDark ? "text-white placeholder:text-[#555]" : "text-[#111] placeholder:text-[#bbb]"
                            )}
                        />
                    </div>

                    {/* Industry picker */}
                    <div className="relative" ref={industryRef}>
                        <div
                            className={cn(field, "cursor-pointer flex items-center justify-between")}
                            onClick={() => setShowIndustryDrop(v => !v)}
                        >
                            <div>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <Briefcase size={11} className={cn("opacity-40", isDark ? "text-white" : "text-[#333]")} />
                                    <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Industry</span>
                                </div>
                                <span className={cn("text-[13px]", industry ? (isDark ? "text-white" : "text-[#111]") : (isDark ? "text-[#555]" : "text-[#bbb]"))}>
                                    {industry || 'Select industry'}
                                </span>
                            </div>
                            <ChevronRight size={13} className={cn("opacity-30 transition-transform", showIndustryDrop && "rotate-90")} />
                        </div>
                        {showIndustryDrop && (
                            <div className={cn(
                                "absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-50 overflow-hidden",
                                isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                            )}>
                                <div className="max-h-44 overflow-auto py-1">
                                    {INDUSTRIES.map(ind => (
                                        <button
                                            key={ind}
                                            onClick={() => { setIndustry(ind); setShowIndustryDrop(false); }}
                                            className={cn(
                                                "w-full text-left px-4 py-2 text-[13px] transition-colors",
                                                industry === ind
                                                    ? isDark ? "bg-white/10 text-white" : "bg-[#f0f0f0] text-[#111] font-medium"
                                                    : isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]"
                                            )}
                                        >
                                            {ind}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <FormField isDark={isDark} label="Email" icon={<Mail size={11} />} value={email} onChange={setEmail} type="email" placeholder="hello@company.com" />
                        <FormField isDark={isDark} label="Phone" icon={<Phone size={11} />} value={phone} onChange={setPhone} placeholder="+1 234 567 890" />
                    </div>

                    <FormField isDark={isDark} label="Website" icon={<Globe size={11} />} value={website} onChange={setWebsite} placeholder="https://company.com" />
                    <FormField isDark={isDark} label="Address" icon={<MapPin size={11} />} value={address} onChange={setAddress} placeholder="Street, city, country" />
                    <FormField isDark={isDark} label="Tax / VAT number" icon={<Hash size={11} />} value={taxNumber} onChange={setTaxNumber} placeholder="VAT123456" />

                    {/* Notes */}
                    <div className={field}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <FileText size={11} className={cn("opacity-40", isDark ? "text-white" : "text-[#333]")} />
                            <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Notes</span>
                        </div>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
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
                        onClick={handleCreate}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl bg-[#4dbf39] hover:bg-[#59d044] text-black transition-colors disabled:opacity-60"
                    >
                        {saving ? 'Creating...' : 'Create company'}
                        {!saving && <ChevronRight size={14} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
