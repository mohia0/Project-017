"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Building2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompanyStore } from '@/store/useCompanyStore';
import { CreateCompanyModal } from '@/components/modals/CreateCompanyModal';
import { Avatar } from '@/components/ui/Avatar';

interface CompanyPickerProps {
    value: string;
    onChange: (v: string) => void;
    isDark: boolean;
    label?: string;
    placeholder?: string;
    minimal?: boolean;
}

export function CompanyPicker({
    value,
    onChange,
    isDark,
    label = "Company name",
    placeholder = "Type to search or add",
    minimal = false
}: CompanyPickerProps) {
    const { companies, fetchCompanies } = useCompanyStore();
    const [query, setQuery] = useState(value);
    const [open, setOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

    // Sync internal query when external value changes
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

    const input = (
        <input
            value={query}
            onChange={e => {
                setQuery(e.target.value);
                onChange(e.target.value);
                setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className={cn(
                "bg-transparent outline-none text-[13px] w-full",
                isDark ? "text-white placeholder:text-[#555]" : "text-[#111] placeholder:text-[#bbb]"
            )}
        />
    );

    return (
        <>
            <div className="relative" ref={ref}>
                {minimal ? (
                    <div className="w-full">
                        {input}
                    </div>
                ) : (
                    <div className={field}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <Building2 size={11} className={cn("opacity-40", isDark ? "text-white" : "text-[#333]")} />
                            <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>{label}</span>
                            {companies.length > 0 && (
                                <span className={cn("ml-auto text-[10px]", isDark ? "text-[#444]" : "text-[#ccc]")}>
                                    {companies.length} companies
                                </span>
                            )}
                        </div>
                        {input}
                    </div>
                )}

                {/* Dropdown */}
                {open && (
                    <div className={cn(
                        "absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-[100] overflow-hidden",
                        isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                    )}>
                        {/* Matching companies */}
                        {filtered.length > 0 && (
                            <div className="max-h-40 overflow-auto">
                                {filtered.map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
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
                                    type="button"
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
