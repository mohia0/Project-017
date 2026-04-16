"use client";

import React, { useState } from 'react';
import {
    X, ChevronRight, Building2, Mail, Phone,
    MapPin, Hash, FileText, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import ImageUploadModal from '@/components/modals/ImageUploadModal';
import { Image as ImageIcon } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { CountryPicker } from '@/components/ui/CountryPicker';

interface CompanyFormData {
    name: string;
    industry?: string;
    website?: string;
    email?: string;
    phone?: string;
    address?: string;
    country?: string;
    tax_number?: string;
    notes?: string;
    avatar_url?: string;
}

interface CompanyEditorProps {
    initialData?: CompanyFormData;
    onClose: () => void;
    onSave: (data: CompanyFormData) => Promise<void>;
}

const INDUSTRIES = [
    'Technology', 'Design', 'Marketing', 'Finance', 'Healthcare',
    'Education', 'Real Estate', 'Legal', 'Consulting', 'Media',
    'Retail', 'Manufacturing', 'Construction', 'Other'
];

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

export default function CompanyEditor({ initialData, onClose, onSave }: CompanyEditorProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const [form, setForm] = useState<CompanyFormData>({
        name:       initialData?.name       || '',
        industry:   initialData?.industry   || '',
        website:    initialData?.website    || '',
        email:      initialData?.email      || '',
        phone:      initialData?.phone      || '',
        address:    initialData?.address    || '',
        country:    initialData?.country    || '',
        tax_number: initialData?.tax_number || '',
        notes:      initialData?.notes      || '',
        avatar_url: initialData?.avatar_url || '',
    });
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof CompanyFormData, string>>>({});
    const [saving, setSaving] = useState(false);
    const [showIndustryDrop, setShowIndustryDrop] = useState(false);
    const industryRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (industryRef.current && !industryRef.current.contains(e.target as Node)) setShowIndustryDrop(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const update = (key: keyof CompanyFormData) => (v: string) => {
        setForm(f => ({ ...f, [key]: v }));
        if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
    };

    const validate = () => {
        const e: typeof errors = {};
        if (!form.name.trim()) e.name = 'Required';
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
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
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
                        {initialData ? 'Edit company' : 'New company'}
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
                            <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Company logo</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Avatar 
                                src={form.avatar_url} 
                                name={form.name} 
                                className="w-10 h-10 rounded-xl border border-black/5" 
                                isDark={isDark} 
                                fallbackClassName="border border-dashed border-black/10 dark:border-white/10 rounded-xl"
                            />
                            <div className="flex flex-col">
                                <span className={cn("text-[13px] font-medium", isDark ? "text-white/60" : "text-black/60")}>
                                    {form.avatar_url ? 'Update logo' : 'Upload logo'}
                                </span>
                                <span className={cn("text-[10px]", isDark ? "text-[#444]" : "text-[#ccc]")}>
                                    JPG, PNG or SVG. Max 2MB.
                                </span>
                            </div>
                        </div>
                    </div>

                    <FormField
                        isDark={isDark} autoFocus
                        label="Company name *"
                        icon={<Building2 size={11} />}
                        value={form.name}
                        onChange={update('name')}
                        placeholder="e.g. Acme Corp"
                        error={errors.name}
                    />

                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="relative" ref={industryRef}>
                            <div 
                                onClick={() => setShowIndustryDrop(!showIndustryDrop)}
                                className={cn(
                                    "w-full rounded-xl border px-4 py-3 text-[13px] cursor-pointer transition-all",
                                    isDark ? "bg-[#1c1c1c] border-[#2e2e2e] hover:bg-white/[0.02]" : "bg-white border-[#e0e0e0] hover:bg-black/[0.02]"
                                )}
                            >
                                <div className="flex items-center gap-1.5 mb-0.5 opacity-40">
                                    <FileText size={11} className={isDark ? "text-white" : "text-[#333]"} />
                                    <span className="text-[11px] font-semibold text-inherit">Industry</span>
                                </div>
                                <div className={cn("text-[13px]", !form.industry ? "text-[#777]" : (isDark ? "text-white" : "text-[#111]"))}>
                                    {form.industry || 'Select industry'}
                                </div>
                            </div>
                            {showIndustryDrop && (
                                <div className={cn(
                                    "absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-50 overflow-hidden",
                                    isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                                )}>
                                    <div className="max-h-40 overflow-auto py-1">
                                        {INDUSTRIES.map(ind => (
                                            <button 
                                                key={ind} 
                                                onClick={() => { update('industry')(ind); setShowIndustryDrop(false); }}
                                                className={cn(
                                                    "w-full text-left px-4 py-2 text-[13px] transition-colors",
                                                    isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]"
                                                )}
                                            >
                                                {ind}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <FormField
                            isDark={isDark}
                            label="Website"
                            icon={<Globe size={11} />}
                            value={form.website || ''}
                            onChange={update('website')}
                            placeholder="https://..."
                        />
                    </div>

                    <FormField
                        isDark={isDark}
                        label="Email"
                        icon={<Mail size={11} />}
                        type="email"
                        value={form.email || ''}
                        onChange={update('email')}
                        placeholder="contact@company.com"
                    />

                    <div className="grid grid-cols-2 gap-2.5">
                        <FormField
                            isDark={isDark}
                            label="Phone"
                            icon={<Phone size={11} />}
                            value={form.phone || ''}
                            onChange={update('phone')}
                            placeholder="+1 234..."
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

                    <div className="grid grid-cols-2 gap-2.5">
                        <FormField
                            isDark={isDark}
                            label="Address"
                            icon={<MapPin size={11} />}
                            value={form.address || ''}
                            onChange={update('address')}
                            placeholder="Street, city"
                        />
                        <CountryPicker
                            isDark={isDark}
                            value={form.country || ''}
                            onChange={update('country')}
                        />
                    </div>

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
                        className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground transition-colors disabled:opacity-60"
                    >
                        {saving ? 'Saving...' : (initialData ? 'Save changes' : 'Create company')}
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
