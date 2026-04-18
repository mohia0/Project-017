"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { CountryPicker } from '@/components/ui/CountryPicker';
import DatePicker from '@/components/ui/DatePicker';
import { FormField } from '@/store/useFormStore';
import { appToast } from '@/lib/toast';

// New Modular Inputs
import { TextInput } from './inputs/TextInput';
import { SelectInput } from './inputs/SelectInput';
import { SliderInput } from './inputs/SliderInput';
import { FileUploadInput } from './inputs/FileUploadInput';
import { PictureChoiceInput } from './inputs/PictureChoiceInput';
import { RadioInput } from './inputs/RadioInput';

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

        switch (field.type) {
            case 'short_text':
            case 'full_name':
            case 'address':
            case 'link':
            case 'email':
            case 'phone':
                return (
                    <TextInput 
                        value={currentValue} 
                        onChange={handleChange} 
                        placeholder={field.placeholder} 
                        type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                        isDark={isDark} 
                        borderRadius={borderRadius} 
                    />
                );
            case 'number':
                return (
                    <TextInput 
                        value={currentValue} 
                        onChange={handleChange} 
                        placeholder={field.placeholder} 
                        type="number"
                        isDark={isDark} 
                        borderRadius={borderRadius} 
                    />
                );
            case 'long_text':
                return (
                    <TextInput 
                        value={currentValue} 
                        onChange={handleChange} 
                        placeholder={field.placeholder} 
                        isDark={isDark} 
                        borderRadius={borderRadius} 
                        rows={4}
                    />
                );
            case 'dropdown':
                return (
                    <SelectInput 
                        value={currentValue} 
                        onChange={handleChange} 
                        options={field.options?.filter(o => o.trim()) || []} 
                        placeholder={field.placeholder}
                        isDark={isDark} 
                        borderRadius={borderRadius} 
                    />
                );
            case 'multi_choice':
                return (
                    <RadioInput 
                        value={currentValue} 
                        onChange={handleChange} 
                        options={field.options?.filter(o => o.trim()) || []} 
                        name={field.id}
                        isDark={isDark} 
                        primaryColor={primaryColor}
                        borderRadius={borderRadius} 
                    />
                );
            case 'picture_choice':
                return (
                    <PictureChoiceInput 
                        value={currentValue} 
                        onChange={handleChange} 
                        options={field.options?.filter(o => o.trim()) || []} 
                        isDark={isDark} 
                        borderRadius={borderRadius} 
                        primaryColor={primaryColor}
                    />
                );
            case 'countries':
                return (
                    <CountryPicker 
                        value={currentValue} 
                        onChange={handleChange} 
                        isDark={isDark} 
                        label={field.label} 
                        placeholder={field.placeholder || "Select country"} 
                    />
                );
            case 'datepicker':
            case 'date':
                return (
                    <DatePicker 
                        value={currentValue} 
                        onChange={handleChange} 
                        isDark={isDark} 
                        placeholder={field.placeholder || "Select date"}
                        style={{ ...inputProps.style, height: '48px', padding: '0 16px' }}
                    />
                );
            case 'slider':
                return (
                    <SliderInput 
                        value={currentValue} 
                        onChange={handleChange} 
                        min={field.min} 
                        max={field.max} 
                        isDark={isDark} 
                        primaryColor={primaryColor} 
                    />
                );
            case 'file_upload':
                return (
                    <FileUploadInput 
                        value={currentValue} 
                        onChange={handleChange} 
                        isDark={isDark} 
                        borderRadius={borderRadius} 
                    />
                );
            case 'signature':
                return (
                    <div className={cn("w-full h-24 border-2 border-dashed flex items-center justify-center transition-all cursor-crosshair hover:bg-black/5",
                        isDark ? "border-[#333] text-[#555] bg-[#181818]" : "border-[#e5e5e5] text-[#ccc] bg-[#f9f9f9]")}
                        style={{ borderRadius: `${borderRadius}px` }}
                        onClick={() => appToast.info("Signature functionality (Demo)")}>
                        <span className="text-[13px] font-bold uppercase tracking-widest opacity-40">Sign here</span>
                    </div>
                );
            default:
                return (
                    <TextInput 
                        value={currentValue} 
                        onChange={handleChange} 
                        placeholder={field.placeholder} 
                        isDark={isDark} 
                        borderRadius={borderRadius} 
                    />
                );
        }
    };

    return (
        <div
            style={{ marginTop: `${marginTop}px`, marginBottom: `${marginBottom}px`, borderRadius: `${borderRadius}px` }}
            className="group relative p-0 py-1.5 transition-all cursor-default"
        >
            <div className="mb-2">
                <div className={cn("text-[14px] font-bold mb-1", isDark ? "text-[#eee]" : "text-[#111]")}>
                    {field.label} {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </div>
                {field.description && (
                    <div className={cn("text-[12px] opacity-50 font-medium", isDark ? "text-[#aaa]" : "text-[#555]")}>
                        {field.description}
                    </div>
                )}
            </div>
            {renderInput()}
        </div>
    );
}
