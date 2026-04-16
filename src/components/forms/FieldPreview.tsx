"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Image } from 'lucide-react';
import { CountryPicker } from '@/components/ui/CountryPicker';
import DatePicker from '@/components/ui/DatePicker';
import { FormField } from '@/store/useFormStore';
import { appToast } from '@/lib/toast';

interface FieldPreviewProps {
    field: FormField;
    isDark: boolean;
    primaryColor: string;
    borderRadius: number;
    marginTop?: number;
    marginBottom?: number;
    value?: string;
    onChange?: (val: string) => void;
    isPreview?: boolean;
}

export default function FieldPreview({
    field,
    isDark,
    primaryColor,
    borderRadius,
    marginTop = 0,
    marginBottom = 0,
    value,
    onChange,
    isPreview
}: FieldPreviewProps) {
    const [localValue, setLocalValue] = useState("");
    
    // Use controlled value if provided, else use local state
    const currentValue = value !== undefined ? value : localValue;
    const handleChange = (newVal: string) => {
        if (onChange) onChange(newVal);
        else setLocalValue(newVal);
    };

    const renderInput = () => {
        const inputProps = {
            className: cn(
                "w-full px-3 py-2 text-[13px] border outline-none transition-all duration-200",
                isDark ? "bg-[#181818] border-[#333] text-[#ddd]" : "bg-[#f9f9f9] border-[#e5e5e5] text-[#111]",
                "focus:border-primary/50 hover:border-primary/30 hover:shadow-sm"
            ),
            style: { borderRadius: `${Math.max(0, borderRadius - 4)}px` }
        };

        const onInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            handleChange(e.target.value);
        };

        switch (field.type) {
            case 'short_text':
            case 'full_name':
            case 'address':
            case 'link':
                return <input type="text" placeholder={field.placeholder || 'Type your answer...'} value={currentValue} onChange={onInputChange} {...inputProps} />;
            case 'number':
                return <input type="number" placeholder={field.placeholder || 'Enter number...'} value={currentValue} onChange={onInputChange} {...inputProps} />;
            case 'email':
                return <input type="email" placeholder={field.placeholder || 'hello@example.com'} value={currentValue} onChange={onInputChange} {...inputProps} />;
            case 'phone':
                return <input type="tel" placeholder={field.placeholder || '+1 (555) 000-0000'} value={currentValue} onChange={onInputChange} {...inputProps} />;
            case 'long_text':
                return <textarea rows={3} placeholder={field.placeholder || 'Type your answer...'} value={currentValue} onChange={onInputChange} {...inputProps} className={cn(inputProps.className, "resize-none")} />;
            case 'dropdown':
                return (
                    <div className="relative">
                        <select 
                            {...inputProps}
                            value={currentValue}
                            onChange={onInputChange}
                            className={cn(inputProps.className, "appearance-none cursor-pointer pr-10")}
                        >
                            <option value="" disabled>{field.placeholder || 'Select an option'}</option>
                            {(field.options && field.options.filter(o => o.trim()).length > 0
                                ? field.options.filter(o => o.trim())
                                : ['Option 1', 'Option 2', 'Option 3']
                            ).map((opt, i) => (
                                <option key={i} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                            <ChevronDown size={12} />
                        </div>
                    </div>
                );
            case 'multi_choice':
                return (
                    <div className="space-y-2">
                        {(field.options && field.options.filter(o => o.trim()).length > 0 
                            ? field.options.filter(o => o.trim()) 
                            : ['Option 1', 'Option 2', 'Option 3']
                        ).map((opt, i) => (
                            <label key={i} className="flex items-center gap-2.5 cursor-pointer">
                                <input type="radio" name={field.id} className="hidden peer" value={opt} checked={currentValue === opt} onChange={onInputChange} />
                                <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all peer-checked:bg-primary peer-checked:border-primary", 
                                    isDark ? "border-[#333]" : "border-[#ddd]")}
                                    style={currentValue === opt ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-black scale-0 peer-checked:scale-100 transition-transform" />
                                </div>
                                <span className={cn("text-[13px]", isDark ? "text-[#999]" : "text-[#555]")}>{opt}</span>
                            </label>
                        ))}
                    </div>
                );
            case 'picture_choice':
                return (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        {(field.options && field.options.filter(o => o.trim()).length > 0
                            ? field.options.filter(o => o.trim())
                            : ['Option 1', 'Option 2']
                        ).map((opt, i) => (
                            <div key={i} 
                                onClick={() => handleChange(opt)}
                                className={cn("border-2 p-2 flex flex-col items-center gap-2 transition-all bg-white/5 cursor-pointer",
                                currentValue === opt ? "border-primary" : (isDark ? "border-[#333]" : "border-[#ebebeb]"))}
                                style={{ 
                                    borderRadius: `${Math.max(0, borderRadius - 8)}px`,
                                    borderColor: currentValue === opt ? primaryColor : undefined
                                }}>
                                <div className="w-full aspect-square bg-current/5 rounded-lg flex items-center justify-center opacity-40">
                                    <Image size={24} />
                                </div>
                                <span className={cn("text-[11px] font-semibold", isDark ? "text-[#777]" : "text-[#999]")}>{opt}</span>
                            </div>
                        ))}
                    </div>
                );
            case 'countries':
                return (
                    <div>
                         <CountryPicker 
                            value={currentValue} 
                            onChange={handleChange} 
                            isDark={isDark} 
                            label={field.label} 
                            placeholder={field.placeholder || "Select country"} 
                            className={inputProps.className}
                            style={inputProps.style}
                        />
                    </div>
                );
            case 'datepicker':
            case 'date':
                return (
                    <div>
                        <DatePicker 
                            value={currentValue} 
                            onChange={handleChange} 
                            isDark={isDark} 
                            placeholder={field.placeholder || "Select date"}
                            className={inputProps.className}
                            style={inputProps.style}
                        />
                    </div>
                );
            case 'slider':
                return (
                    <div className="space-y-1">
                        <input type="range" min={field.min || 0} max={field.max || 100} value={currentValue || 50}
                            onChange={onInputChange}
                            className="w-full cursor-pointer accent-primary"
                            style={{ accentColor: primaryColor }} />
                        <div className={cn("flex justify-between text-[10px]", isDark ? "text-[#555]" : "text-[#ccc]")}>
                            <span>{field.min || 0}</span><span>{field.max || 100}</span>
                        </div>
                    </div>
                );
            case 'signature':
                return (
                    <div className={cn("w-full h-20 border-2 border-dashed flex items-center justify-center transition-all cursor-crosshair hover:bg-black/5",
                        isDark ? "border-[#333] text-[#555]" : "border-[#e5e5e5] text-[#ccc]")}
                        style={{ borderRadius: `${Math.max(0, borderRadius - 4)}px` }}
                        onClick={() => appToast.info("Signature functionality requires Canvas API (Demo)")}>
                        <span className="text-[12px]">Sign here</span>
                    </div>
                );
            case 'file_upload':
                return (
                    <div className={cn("w-full py-6 border-2 border-dashed flex flex-col items-center gap-2 transition-all cursor-pointer hover:bg-black/5",
                        isDark ? "border-[#333] text-[#555]" : "border-[#e5e5e5] text-[#ccc]")}
                        style={{ borderRadius: `${Math.max(0, borderRadius - 4)}px` }}
                        onClick={() => appToast.info("File upload triggered")}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                        <span className="text-[12px]">Click to upload or drag & drop</span>
                    </div>
                );
            default:
                // Fallback to text input if unknown
                return <input type="text" placeholder={field.placeholder || 'Type your answer...'} value={currentValue} onChange={onInputChange} {...inputProps} />;
        }
    };

    return (
        <div
            style={{ marginTop: `${marginTop}px`, marginBottom: `${marginBottom}px`, borderRadius: `${borderRadius}px` }}
            className="group relative p-0 py-1.5 transition-all cursor-default"
        >
            <div className="mb-1.5">
                <div className={cn("text-[13px] font-bold mb-0.5", isDark ? "text-[#eee]" : "text-[#111]")}>
                    {field.label}
                </div>
                {field.description && (
                    <div className={cn("text-[11px] opacity-60", isDark ? "text-[#aaa]" : "text-[#555]")}>
                        {field.description}
                    </div>
                )}
            </div>
            {renderInput()}
        </div>
    );
}
