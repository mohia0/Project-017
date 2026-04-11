"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Search, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
    "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
    "Denmark", "Djibouti", "Dominica", "Dominican Republic",
    "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
    "Fiji", "Finland", "France",
    "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
    "Haiti", "Honduras", "Hungary",
    "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
    "Jamaica", "Japan", "Jordan",
    "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
    "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
    "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
    "Oman",
    "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar",
    "Romania", "Russia", "Rwanda",
    "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
    "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
    "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
    "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
    "Yemen",
    "Zambia", "Zimbabwe"
];

interface CountryPickerProps {
    value: string;
    onChange: (v: string) => void;
    isDark: boolean;
    label?: string;
    placeholder?: string;
    minimal?: boolean;
}

export function CountryPicker({
    value,
    onChange,
    isDark,
    label = "Country",
    placeholder = "Select country",
    minimal = false
}: CountryPickerProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = COUNTRIES.filter(c =>
        c.toLowerCase().includes(query.toLowerCase())
    );

    const handleSelect = (name: string) => {
        onChange(name);
        setOpen(false);
        setQuery('');
    };

    const field = cn(
        "w-full rounded-xl border px-4 py-3 text-[13px] transition-all cursor-pointer",
        isDark
            ? "bg-[#1c1c1c] border-[#2e2e2e] hover:border-[#444]"
            : "bg-white border-[#e0e0e0] hover:border-[#ccc]",
        open && (isDark ? "ring-2 ring-[#333] border-[#444]" : "ring-2 ring-[#e8e8e8] border-[#ccc]")
    );

    return (
        <div className="relative w-full" ref={ref}>
            {minimal ? (
                <div 
                    onClick={() => setOpen(!open)}
                    className={cn(
                        "flex items-center justify-between text-[12px] border-b pb-0.5 cursor-pointer",
                        isDark ? "text-white border-[#333]" : "text-[#111] border-[#e0e0e0]"
                    )}
                >
                    <span className={!value ? "opacity-40" : ""}>{value || placeholder}</span>
                    <ChevronDown size={12} className="opacity-30" />
                </div>
            ) : (
                <div className={field} onClick={() => setOpen(!open)}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Globe size={11} className={cn("opacity-40", isDark ? "text-white" : "text-[#333]")} />
                        <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>{label}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className={cn("text-[13px]", value ? (isDark ? "text-white" : "text-[#111]") : (isDark ? "text-[#555]" : "text-[#bbb]"))}>
                            {value || placeholder}
                        </span>
                        <ChevronDown size={14} className="opacity-30" />
                    </div>
                </div>
            )}

            {open && (
                <div className={cn(
                    "absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-2xl z-[1000] overflow-hidden animate-in fade-in zoom-in-95 duration-150",
                    isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                )}>
                    {/* Search */}
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-2 border-b",
                        isDark ? "border-[#252525] bg-black/20" : "border-[#f0f0f0] bg-[#fafafa]"
                    )}>
                        <Search size={12} className="opacity-30" />
                        <input
                            autoFocus
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Type to search..."
                            className={cn(
                                "bg-transparent outline-none text-[12px] w-full",
                                isDark ? "text-white placeholder:text-[#444]" : "text-[#111] placeholder:text-[#ccc]"
                            )}
                            onClick={e => e.stopPropagation()}
                        />
                    </div>

                    {/* Results */}
                    <div className="max-h-52 overflow-auto py-1 custom-scrollbar">
                        {filtered.length > 0 ? (
                            filtered.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => handleSelect(c)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-2 text-[12px] text-left transition-colors",
                                        isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]",
                                        value === c && "text-primary font-medium"
                                    )}
                                >
                                    <span>{c}</span>
                                    {value === c && <Check size={12} className="text-primary" />}
                                </button>
                            ))
                        ) : (
                            <div className={cn("px-4 py-3 text-[12px] text-center", isDark ? "text-[#555]" : "text-[#aaa]")}>
                                No countries found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
