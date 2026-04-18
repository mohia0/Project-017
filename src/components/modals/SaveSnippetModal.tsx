import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

import { SnippetPreview } from '@/components/proposals/blocks/SnippetPreview';

interface SaveSnippetModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (name: string, tags: string[]) => Promise<void>;
    contentPreview?: any[]; // BlockNote blocks
}

export function SaveSnippetModal({ open, onClose, onSave, contentPreview }: SaveSnippetModalProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const [name, setName] = useState('');
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
        await onSave(name.trim(), tags);
        setIsSubmitting(false);
        onClose();
    };

    const inputClass = cn(
        'w-full px-3 py-2 text-[13px] rounded-xl border outline-none transition-all',
        isDark
            ? 'bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-white/20 placeholder:text-white/30'
            : 'bg-[#f5f5f5] border-[#e5e5e5] text-black focus:bg-white focus:border-[#d0d0d0] focus:shadow-sm placeholder:text-black/30'
    );



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
                        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', 'bg-yellow-500/10')}>
                            <Zap size={15} className="text-yellow-500" />
                        </div>
                        <div>
                            <h2 className="text-[14px] font-bold tracking-tight">Save as Snippet</h2>
                            <p className={cn('text-[11px] mt-0.5', isDark ? 'text-white/40' : 'text-black/40')}>
                                Reusable text block
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className={cn('p-1.5 rounded-lg transition-colors', isDark ? 'hover:bg-white/10' : 'hover:bg-black/5')}>
                        <X size={15} className="opacity-50" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
                    {/* Content Preview */}
                    {contentPreview && contentPreview.length > 0 && (
                        <div>
                            <label className={cn('block text-[11px] font-bold mb-1.5 uppercase tracking-wider', isDark ? 'text-white/40' : 'text-black/40')}>
                                Preview
                            </label>
                            <div className={cn(
                                'px-4 py-3 rounded-2xl border overflow-y-auto relative h-[180px] custom-scrollbar',
                                isDark ? 'bg-[#0a0a0a] border-white/5' : 'bg-[#fcfcfc] border-[#eee]'
                            )}>
                                <div className="scale-[0.9] origin-top-left -mb-[10%]">
                                    <SnippetPreview 
                                        blocks={contentPreview} 
                                        isDark={isDark} 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className={cn('block text-[11px] font-bold mb-1.5 uppercase tracking-wider', isDark ? 'text-white/40' : 'text-black/40')}>
                            Snippet Name *
                        </label>
                        <input
                            required
                            autoFocus
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g., About Us paragraph"
                            className={inputClass}
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
                        onClick={() => (document.getElementById('tag-input-snippet') as HTMLInputElement)?.focus()}
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
                                id="tag-input-snippet"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                placeholder={tags.length === 0 ? 'intro, about...' : ''}
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
                            className="px-5 py-2 text-[12px] font-bold rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-yellow-500/20"
                        >
                            <Zap size={12} />
                            {isSubmitting ? 'Saving...' : 'Save Snippet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

