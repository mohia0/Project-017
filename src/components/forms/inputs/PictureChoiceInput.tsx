"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Check } from 'lucide-react';

interface PictureChoiceInputProps {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    isDark: boolean;
    borderRadius: number;
    primaryColor: string;
    multiple?: boolean;
}

/** Parses an option string that may contain a label (format: "url|label") */
const parseOption = (opt: string) => {
    if (!opt) return { url: '', label: undefined };
    const parts = opt.split('|');
    if (parts.length > 1) {
        return { 
            url: parts[0], 
            label: parts.slice(1).join('|') // Handle if label contains |
        };
    }
    return { url: opt, label: undefined };
};

/** Extract a user-friendly display name from an image URL/path */
const getDisplayName = (src: string, index: number, customLabel?: string): string => {
    if (customLabel !== undefined) return customLabel;
    
    try {
        // Get the last segment of the path
        const parts = src.split('/');
        const fileName = parts[parts.length - 1];
        if (!fileName) return `Option ${index + 1}`;

        // Strip query params
        const cleanName = fileName.split('?')[0];

        // Strip leading timestamp (e.g. "1776417287168-MyImage.png" → "MyImage.png")
        const withoutTimestamp = cleanName.replace(/^\d{10,}-/, '');

        // Decode URI encoding and strip extension
        const decoded = decodeURIComponent(withoutTimestamp);
        const withoutExt = decoded.replace(/\.[^.]+$/, '');

        return withoutExt || `Option ${index + 1}`;
    } catch {
        return `Option ${index + 1}`;
    }
};

/** Returns true if the string looks like an image src we can render */
const isImageSrc = (s: string) => {
    if (!s) return false;
    return (
        s.startsWith('http') ||
        s.startsWith('/') ||       // relative paths like /api/files/...
        s.startsWith('data:image') ||
        s.startsWith('blob:')
    );
};

export const PictureChoiceInput = ({ 
    value, 
    onChange, 
    options, 
    isDark, 
    borderRadius,
    primaryColor,
    multiple
}: PictureChoiceInputProps) => {
    const values = multiple ? (() => {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [value].filter(Boolean);
        } catch {
            return value ? [value] : [];
        }
    })() : [value];

    const toggleOption = (opt: string) => {
        if (multiple) {
            const next = values.includes(opt) 
                ? values.filter(v => v !== opt)
                : [...values, opt];
            onChange(JSON.stringify(next));
        } else {
            onChange(opt);
        }
    };

    return (
        <div className="grid grid-cols-2 gap-4">
            {options.map((opt, i) => {
                const { url, label } = parseOption(opt);
                const isSelected = values.includes(opt);
                const hasImage = isImageSrc(url);
                const displayName = getDisplayName(url, i, label);

                return (
                    <div 
                        key={i} 
                        onClick={() => toggleOption(opt)}
                        className={cn(
                            "group relative flex flex-col items-center gap-3 p-4 border-2 transition-all duration-300 cursor-pointer overflow-hidden",
                            isSelected 
                                ? "border-primary bg-primary/5 shadow-lg" 
                                : (isDark ? "border-[#333] bg-[#181818] hover:border-[#444]" : "border-[#ebebeb] bg-[#f9f9f9] hover:border-[#ddd] hover:bg-white")
                        )}
                        style={{ 
                            borderRadius: `${borderRadius}px`,
                            borderColor: isSelected ? primaryColor : undefined,
                            backgroundColor: isSelected ? `${primaryColor}10` : undefined
                        }}
                    >
                        {/* Selected Indicator */}
                        {isSelected && (
                            <div 
                                className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full animate-in zoom-in-50 duration-300 z-10 shadow-sm"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <Check size={12} className="text-white" strokeWidth={4} />
                            </div>
                        )}

                        <div className={cn(
                            "w-full aspect-[4/3] rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-105",
                            !hasImage ? (isDark ? "bg-[#222]" : "bg-white shadow-sm") : ""
                        )}>
                            {hasImage ? (
                                <img 
                                    src={url} 
                                    alt={displayName} 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                        // Fallback to placeholder on load error
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-20"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
                                    }}
                                />
                            ) : (
                                <ImageIcon size={32} className={cn("opacity-20", isDark ? "text-white" : "text-black")} />
                            )}
                        </div>

                        {displayName && (
                            <span className={cn(
                                "text-[12px] font-bold tracking-tight text-center w-full leading-tight",
                                isSelected ? "text-primary" : (isDark ? "text-[#777]" : "text-[#555]")
                            )} style={{ color: isSelected ? primaryColor : undefined }}>
                                {displayName}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
