import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, LayoutPanelTop, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

interface SaveSectionTemplateModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (name: string, description: string, tags: string[]) => Promise<void>;
    blockType?: string;
    sourceEntity?: string;
}

export function SaveSectionTemplateModal({
    open,
    onClose,
    onSave,
    blockType = 'content',
    sourceEntity = 'proposal',
}: SaveSectionTemplateModalProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (open) {
            setName('');
            setDescription('');
            setTagInput('');
            setTags([]);
            setIsSubmitting(false);
        }
    }, [open]);

    if (!open || !mounted) return null;

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = tagInput.trim().toLowerCase().replace(/,/g, '');
            if (val && !tags.includes(val)) setTags(prev => [...prev, val]);
            setTagInput('');
        }
        if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
            setTags(prev => prev.slice(0, -1));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSubmitting(true);
        await onSave(name.trim(), description.trim(), tags);
        setIsSubmitting(false);
        onClose();
    };

    const inputClass = cn(
        'w-full px-3 py-2 text-[13px] rounded-xl border outline-none transition-all',
        isDark
            ? 'bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-white/20 placeholder:text-white/30'
            : 'bg-[#f5f5f5] border-[#e5e5e5] text-black focus:bg-white focus:border-[#d0d0d0] focus:shadow-sm placeholder:text-black/30'
    );

    const blockTypeColors: Record<string, string> = {
        content:   'bg-blue-500/10 text-blue-500 border-blue-500/20',
        pricing:   'bg-green-500/10 text-green-500 border-green-500/20',
        signature: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        header:    'bg-orange-500/10 text-orange-500 border-orange-500/20',
    };

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm shadow-[0_0_100px_rgba(0,0,0,0.5)]" onClick={onClose} />

            <div className={cn(
                'relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-200',
                isDark ? 'bg-[#111] border border-white/10 text-white' : 'bg-white border border-black/5 text-black'
            )}>
                {/* Header */}
                <div className={cn('flex items-center justify-between px-5 py-4 border-b', isDark ? 'border-white/5' : 'border-black/5')}>
                    <div className="flex items-center gap-2.5">
                        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', isDark ? 'bg-white/5' : 'bg-[#f5f5f5]')}>
                            <LayoutPanelTop size={15} className="opacity-60" />
                        </div>
                        <div>
                            <h2 className="text-[14px] font-bold tracking-tight">Save Section as Template</h2>
                            <p className={cn('text-[11px] flex items-center gap-1.5 mt-0.5', isDark ? 'text-white/40' : 'text-black/40')}>
                                <span className={cn('px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border', blockTypeColors[blockType] || blockTypeColors.content)}>
                                    {blockType}
                                </span>
                                from {sourceEntity}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className={cn('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-white/10' : 'hover:bg-black/5')}>
                        <X size={15} className="opacity-50" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
                    <div>
                        <label className={cn('block text-[11px] font-bold mb-1.5 uppercase tracking-wider', isDark ? 'text-white/40' : 'text-black/40')}>
                            Section Name *
                        </label>
                        <input
                            required
                            autoFocus
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g., Services Overview"
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={cn('block text-[11px] font-bold mb-1.5 uppercase tracking-wider', isDark ? 'text-white/40' : 'text-black/40')}>
                            Description <span className="opacity-50 normal-case font-normal">(optional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Briefly describe when to use this section..."
                            rows={2}
                            className={cn(inputClass, 'resize-none')}
                        />
                    </div>

                    <div>
                        <label className={cn('block text-[11px] font-bold mb-1.5 uppercase tracking-wider', isDark ? 'text-white/40' : 'text-black/40')}>
                            Tags <span className="opacity-50 normal-case font-normal">(press Enter or comma to add)</span>
                        </label>
                        <div className={cn(
                            'flex flex-wrap gap-1.5 min-h-[40px] px-2 py-1.5 rounded-xl border transition-all cursor-text',
                            isDark ? 'bg-white/5 border-white/10 focus-within:border-white/20' : 'bg-[#f5f5f5] border-[#e5e5e5] focus-within:bg-white focus-within:border-[#d0d0d0]'
                        )}
                        onClick={() => (document.getElementById('tag-input-section') as HTMLInputElement)?.focus()}
                        >
                            {tags.map(tag => (
                                <span key={tag} className={cn(
                                    'flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold',
                                    isDark ? 'bg-white/10 text-white/70' : 'bg-black/8 text-black/70'
                                )}>
                                    <Tag size={9} />
                                    {tag}
                                    <button type="button" onClick={() => setTags(t => t.filter(x => x !== tag))} className="opacity-50 hover:opacity-100 ml-0.5">×</button>
                                </span>
                            ))}
                            <input
                                id="tag-input-section"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                placeholder={tags.length === 0 ? 'pricing, services...' : ''}
                                className="flex-1 min-w-[80px] bg-transparent outline-none text-[12px] placeholder:opacity-30"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5 dark:border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className={cn('px-4 py-2 text-[12px] font-semibold rounded-xl transition-colors', isDark ? 'hover:bg-white/5 text-white/50' : 'hover:bg-black/5 text-black/50')}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || isSubmitting}
                            className="px-5 py-2 text-[12px] font-bold rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-primary/20"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Block'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

