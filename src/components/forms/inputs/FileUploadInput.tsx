"use client";

import React from 'react';
import { cn, isDarkColor } from '@/lib/utils';
import { Upload, File, X, CheckCircle2 } from 'lucide-react';
import FileUploadModal from '@/components/modals/ImageUploadModal';

interface FileUploadInputProps {
    value: string;
    onChange: (val: string) => void;
    isDark: boolean;
    borderRadius: number;
    backgroundColor?: string;
}

export const FileUploadInput = ({ 
    value, 
    onChange, 
    isDark, 
    borderRadius,
    backgroundColor
}: FileUploadInputProps) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const isBgDark = backgroundColor ? isDarkColor(backgroundColor) : isDark;

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
    };

    return (
        <>
            <div 
                onClick={() => setIsModalOpen(true)}
                className={cn(
                    "w-full py-8 border-2 border-dashed flex flex-col items-center gap-3 transition-all duration-300 cursor-pointer group",
                    !backgroundColor && (isDark 
                        ? "border-[#333] bg-[#181818]/50 hover:bg-[#222] hover:border-primary/50" 
                        : "border-[#e5e5e5] bg-[#f9f9f9] hover:bg-white hover:border-primary/50 hover:shadow-md"),
                    backgroundColor && (isBgDark 
                        ? "border-white/10 hover:border-white/20" 
                        : "border-black/10 hover:border-black/20")
                )}
                style={{ 
                    borderRadius: `${borderRadius}px`,
                    backgroundColor: backgroundColor || undefined
                }}
            >
                {value ? (
                    <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                        <div 
                            className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary"
                            style={{ borderRadius: `${Math.max(0, borderRadius - 4)}px` }}
                        >
                            <CheckCircle2 size={24} />
                        </div>
                        <div className="text-center px-4">
                            <p className={cn("text-[13px] font-bold truncate max-w-[200px]", isBgDark ? "text-white" : "text-black")}>
                                File Selected
                            </p>
                            <button 
                                onClick={handleRemove}
                                className="text-[11px] font-bold text-red-400 hover:text-red-500 mt-1 uppercase tracking-wider"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={cn(
                            "w-12 h-12 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white",
                            !backgroundColor ? (isDark ? "bg-white/5 text-[#555]" : "bg-white text-[#ccc] shadow-sm") : (isBgDark ? "bg-white/10 text-white/40" : "bg-black/5 text-black/40")
                        )}
                        style={{ borderRadius: `${Math.max(0, borderRadius - 4)}px` }}
                        >
                            <Upload size={22} />
                        </div>
                        <div className="text-center">
                            <p className={cn("text-[13px] font-bold", isBgDark ? "text-white/80" : "text-black/80")}>
                                Click to upload or drag & drop
                            </p>
                            <p className={cn("text-[11px] mt-1", isBgDark ? "text-white/20" : "text-black/20")}>
                                PDF, DOC, Images (Max 10MB)
                            </p>
                        </div>
                    </>
                )}
            </div>

            <FileUploadModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUpload={onChange}
                title="Upload File"
                fileType="all"
            />
        </>
    );
};
