import React, { useState } from 'react';
import { X, LayoutTemplate } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

interface SaveTemplateModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (name: string, description: string, isDefault: boolean) => Promise<void>;
    defaultName?: string;
    entityType: 'proposal' | 'invoice';
}

export function SaveTemplateModal({ open, onClose, onSave, defaultName, entityType }: SaveTemplateModalProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    
    const [name, setName] = useState(defaultName || '');
    const [description, setDescription] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset when opened
    React.useEffect(() => {
        if (open) {
            setName(defaultName || '');
            setDescription('');
            setIsDefault(false);
            setIsSubmitting(false);
        }
    }, [open, defaultName]);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSubmitting(true);
        await onSave(name, description, isDefault);
        setIsSubmitting(false);
        onClose();
    };

    const inputClass = cn(
        "w-full px-3 py-2 text-[13px] rounded-xl border outline-none transition-all",
        isDark 
            ? "bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-white/20 placeholder:text-white/30" 
            : "bg-[#f5f5f5] border-[#e5e5e5] text-black focus:bg-white focus:border-[#d0d0d0] focus:shadow-sm placeholder:text-black/30"
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                onClick={onClose} 
            />
            
            <div className={cn(
                "relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col",
                isDark ? "bg-[#111] border border-white/10 text-white" : "bg-white border text-black"
            )}>
                {/* Header */}
                <div className={cn("flex items-center justify-between px-5 py-4 border-b", isDark ? "border-white/5" : "border-black/5")}>
                    <div className="flex items-center gap-2">
                        <LayoutTemplate size={16} className={isDark ? "opacity-70" : "opacity-60"} />
                        <h2 className="text-[14px] font-semibold tracking-tight">Save as Template</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className={cn("p-1 rounded-lg transition-colors", isDark ? "hover:bg-white/10" : "hover:bg-black/5")}
                    >
                        <X size={16} className="opacity-50" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
                    <div>
                        <label className={cn("block text-[11px] font-semibold mb-1.5 uppercase tracking-wider", isDark ? "text-white/50" : "text-black/50")}>
                            Template Name
                        </label>
                        <input
                            required
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={`e.g., Standard ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={cn("block text-[11px] font-semibold mb-1.5 uppercase tracking-wider", isDark ? "text-white/50" : "text-black/50")}>
                            Description (Optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Briefly describe when to use this template..."
                            rows={3}
                            className={cn(inputClass, "resize-none")}
                        />
                    </div>

                    <label className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors", 
                        isDark 
                            ? isDefault ? "bg-white/5 border-white/20" : "border-white/5 hover:border-white/10" 
                            : isDefault ? "bg-black/5 border-black/20" : "border-black/5 hover:border-black/10"
                    )}>
                        <div className={cn(
                            "w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0 transition-colors border",
                            isDefault 
                                ? "bg-[#4dbf39] border-[#4dbf39] text-white" 
                                : isDark ? "border-white/20" : "border-black/20"
                        )}>
                            {isDefault && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <input type="checkbox" className="hidden" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                        <div className="flex flex-col">
                            <span className="text-[13px] font-semibold">Set as Default Template</span>
                            <span className={cn("text-[11px]", isDark ? "text-white/40" : "text-black/40")}>
                                Automatically use this when creating a new {entityType}.
                            </span>
                        </div>
                    </label>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2 mt-2 pt-4 border-t border-black/5 dark:border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className={cn(
                                "px-4 py-2 text-[12px] font-semibold rounded-xl transition-colors",
                                isDark ? "hover:bg-white/5" : "hover:bg-black/5 text-[#555]"
                            )}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || isSubmitting}
                            className="px-4 py-2 text-[12px] font-semibold rounded-xl bg-[#4dbf39] text-black hover:bg-[#59d044] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Template'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
