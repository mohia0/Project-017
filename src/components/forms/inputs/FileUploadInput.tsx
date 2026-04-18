"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Upload, File, X, CheckCircle2 } from 'lucide-react';
import FileUploadModal from '@/components/modals/ImageUploadModal';

interface FileUploadInputProps {
    value: string;
    onChange: (val: string) => void;
    isDark: boolean;
    borderRadius: number;
}

export const FileUploadInput = ({ 
    value, 
    onChange, 
    isDark, 
    borderRadius 
}: FileUploadInputProps) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);

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
                    isDark 
                        ? "border-[#333] bg-[#181818]/50 hover:bg-[#222] hover:border-primary/50" 
                        : "border-[#e5e5e5] bg-[#f9f9f9] hover:bg-white hover:border-primary/50 hover:shadow-md"
                )}
                style={{ borderRadius: `${borderRadius}px` }}
            >
                {value ? (
                    <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <CheckCircle2 size={24} />
                        </div>
                        <div className="text-center px-4">
                            <p className={cn("text-[13px] font-bold truncate max-w-[200px]", isDark ? "text-white" : "text-black")}>
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
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white",
                            isDark ? "bg-white/5 text-[#555]" : "bg-white text-[#ccc] shadow-sm"
                        )}>
                            <Upload size={22} />
                        </div>
                        <div className="text-center">
                            <p className={cn("text-[13px] font-bold", isDark ? "text-white/80" : "text-black/80")}>
                                Click to upload or drag & drop
                            </p>
                            <p className={cn("text-[11px] mt-1", isDark ? "text-white/20" : "text-gray-400")}>
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
