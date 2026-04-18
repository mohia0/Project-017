"use client";

import React, { useState } from 'react';
import { X, LayoutPanelTop, Search, Plus, Calendar, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

import { useSectionTemplateStore, SectionTemplate } from '@/store/useSectionTemplateStore';
import { v4 as uuidv4 } from 'uuid';
import { appToast } from '@/lib/toast';

interface SectionTemplateBrowserProps {
    open: boolean;
    onClose: () => void;
    onInsert: (blockData: any) => void;
}

const BLOCK_TYPE_COLORS: Record<string, string> = {
    content:   'bg-blue-500/10 text-blue-500 border-blue-500/15',
    pricing:   'bg-green-500/10 text-green-500 border-green-500/15',
    signature: 'bg-purple-500/10 text-purple-500 border-purple-500/15',
    header:    'bg-orange-500/10 text-orange-500 border-orange-500/15',
};

const BLOCK_TYPE_ICONS: Record<string, string> = {
    content:   '≡',
    pricing:   '$',
    signature: '✍',
    header:    '◈',
};

const regenerateIds = (blockData: any) => {
    // We deep clone and ensure top level has a new UUID
    const deepClone = JSON.parse(JSON.stringify(blockData));
    deepClone.id = uuidv4();

    // If it's a pricing block or breakdown block, rows need new IDs
    if (deepClone.rows && Array.isArray(deepClone.rows)) {
        deepClone.rows = deepClone.rows.map((r: any) => ({ ...r, id: uuidv4() }));
    }

    // Since BlockNote relies on `id` in `content`, let's delete those so BlockNote regenerates them upon render
    if (deepClone.type === 'text' && deepClone.content && Array.isArray(deepClone.content)) {
        const stripContentIds = (arr: any[]) => {
            for (const item of arr) {
                if (item.id) delete item.id;
                if (item.children && Array.isArray(item.children)) {
                    stripContentIds(item.children);
                }
            }
        };
        stripContentIds(deepClone.content);
    }

    return deepClone;
};

export function SectionTemplateBrowser({ onInsert }: { onInsert: (blockData: any) => void }) {
    const { theme, closeRightPanel } = useUIStore();
    const isDark = theme === 'dark';
    const { sectionTemplates: templates, isLoading, fetchSectionTemplates } = useSectionTemplateStore();

    React.useEffect(() => {
        fetchSectionTemplates();
    }, [fetchSectionTemplates]);

    const browserRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (browserRef.current && !browserRef.current.contains(e.target as Node)) {
                // Ensure we don't instantly close if they click something that triggers the opening logic,
                // but the 100ms timeout below handles that. We also might want to check for data-ignore-click-outside if needed
                // but this works for most cases.
                closeRightPanel();
            }
        };
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [closeRightPanel]);

    const [search, setSearch] = useState('');
    const [activeType, setActiveType] = useState('all');

    const blockTypes = ['all', ...Array.from(new Set(templates.map(t => t.block_type)))];

    const filtered = templates.filter(t => {
        const matchesType = activeType === 'all' || t.block_type === activeType;
        const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.description?.toLowerCase().includes(search.toLowerCase()));
        return matchesType && matchesSearch;
    });

    return (
        <div ref={browserRef} className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            {/* Note: In RightPanel, we usually have a global PanelHeader, but since SectionTemplateBrowser has a custom one, we can either keep it or replace it. I will keep it for now but remove the absolute/fixed styles. */}
            <div className={cn('flex items-center justify-between px-4 py-4 border-b shrink-0', isDark ? 'border-[#252525]' : 'border-[#ebebeb]')}>
                <div className="flex items-center gap-2.5">
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', isDark ? 'bg-white/5' : 'bg-[#f5f5f5]')}>
                        <LayoutPanelTop size={15} className="opacity-60" />
                    </div>
                    <div>
                        <h2 className="text-[14px] font-bold tracking-tight">Section Templates</h2>
                        <p className={cn('text-[11px]', isDark ? 'text-white/30' : 'text-black/30')}>
                            {templates.length} saved {templates.length === 1 ? 'section' : 'sections'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={closeRightPanel}
                    className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        isDark ? "hover:bg-[#252525] text-[#888] hover:text-[#ccc]" : "hover:bg-[#f5f5f5] text-[#777] hover:text-[#333]"
                    )}
                >
                    <X size={15} />
                </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2.5 shrink-0">
                <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border', isDark ? 'bg-white/5 border-white/10' : 'bg-[#f7f7f7] border-[#e8e8e8]')}>
                    <Search size={13} className="opacity-30 shrink-0" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search sections..."
                        className="flex-1 bg-transparent outline-none text-[13px] placeholder:opacity-30"
                    />
                </div>
            </div>

            {/* Type filter pills */}
            <div className="px-3 pb-2.5 flex items-center gap-1.5 flex-wrap shrink-0">
                {blockTypes.map(type => (
                    <button
                        key={type}
                        onClick={() => setActiveType(type)}
                        className={cn(
                            'px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all border',
                            activeType === type
                                ? isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-black text-white border-black'
                                : isDark ? 'border-white/5 text-white/40 hover:border-white/15 hover:text-white/70' : 'border-[#e8e8e8] text-black/40 hover:border-[#ccc] hover:text-black/70'
                        )}
                    >
                        {type === 'all' ? 'All' : `${BLOCK_TYPE_ICONS[type] || ''} ${type}`}
                    </button>
                ))}
            </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-3 pb-4 no-scrollbar">
                    {isLoading ? (
                        <div className="grid grid-cols-2 gap-2.5 mt-1">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className={cn('h-40 rounded-2xl animate-pulse', isDark ? 'bg-white/[0.03]' : 'bg-black/[0.03]')} />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-40">
                            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', isDark ? 'bg-white/5' : 'bg-black/5')}>
                                <LayoutPanelTop size={24} strokeWidth={1.5} />
                            </div>
                            <div className="text-center">
                                <p className="text-[13px] font-semibold">{search ? 'No matches found' : 'No section templates'}</p>
                                <p className="text-[11px] mt-1 opacity-70">
                                    {search ? 'Try a different search term' : 'Hover a block in any editor and click the save icon'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2.5 mt-1">
                            {filtered.map(template => (
                                <SectionTemplateCard
                                    key={template.id}
                                    template={template}
                                    isDark={isDark}
                                    onInsert={() => {
                                        const bd = regenerateIds(template.block_data);
                                        if (template.background_color) bd.backgroundColor = template.background_color;
                                        onInsert(bd);
                                        closeRightPanel();
                                        appToast.success('Section template inserted');
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
        </div>
    );
}

function SectionTemplateCard({ template, isDark, onInsert }: {
    template: SectionTemplate;
    isDark: boolean;
    onInsert: () => void;
}) {
    const typeColor = BLOCK_TYPE_COLORS[template.block_type] || BLOCK_TYPE_COLORS.content;
    const date = new Date(template.created_at);
    const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

    return (
        <div className={cn(
            'flex flex-col rounded-2xl border overflow-hidden group transition-all duration-200 cursor-pointer',
            isDark
                ? 'bg-[#1a1a1a] border-white/5 hover:border-white/15 hover:shadow-xl'
                : 'bg-white border-black/5 hover:border-black/15 hover:shadow-xl hover:shadow-black/5'
        )}>
            {/* Mini preview area */}
            <div
                className={cn('h-24 w-full flex flex-col gap-1.5 p-3 border-b relative overflow-hidden', isDark ? 'bg-[#111] border-white/5' : 'bg-[#fafafa] border-black/5')}
                style={{ backgroundColor: template.background_color || undefined }}
            >
                {/* Block type indicator */}
                <span className={cn('self-start px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border', typeColor)}>
                    {template.block_type}
                </span>

                {/* Content skeleton lines */}
                {template.block_type === 'pricing' ? (
                    <div className="flex flex-col gap-1 mt-0.5">
                        <div className="flex justify-between">
                            <div className={cn('h-1 w-16 rounded-full', isDark ? 'bg-white/15' : 'bg-black/10')} />
                            <div className={cn('h-1 w-8 rounded-full', isDark ? 'bg-white/15' : 'bg-black/10')} />
                        </div>
                        {[1, 2].map(i => (
                            <div key={i} className={cn('flex justify-between py-1 border-t', isDark ? 'border-white/5' : 'border-black/5')}>
                                <div className={cn('h-1 w-12 rounded-full', isDark ? 'bg-white/10' : 'bg-black/5')} />
                                <div className={cn('h-1 w-6 rounded-full', isDark ? 'bg-white/10' : 'bg-black/5')} />
                            </div>
                        ))}
                    </div>
                ) : template.block_type === 'signature' ? (
                    <div className="flex flex-col gap-1.5 mt-0.5">
                        <div className={cn('h-6 w-20 rounded-md border-b-2', isDark ? 'border-white/20' : 'border-black/20')} />
                        <div className={cn('h-1 w-10 rounded-full', isDark ? 'bg-white/10' : 'bg-black/8')} />
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 mt-0.5">
                        <div className={cn('h-2 w-3/4 rounded-sm', isDark ? 'bg-white/15' : 'bg-black/12')} />
                        <div className={cn('h-1 w-full rounded-full', isDark ? 'bg-white/8' : 'bg-black/6')} />
                        <div className={cn('h-1 w-5/6 rounded-full', isDark ? 'bg-white/8' : 'bg-black/6')} />
                        <div className={cn('h-1 w-2/3 rounded-full', isDark ? 'bg-white/5' : 'bg-black/4')} />
                    </div>
                )}

                {/* Insert button on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/40 backdrop-blur-sm">
                    <button
                        onClick={e => { e.stopPropagation(); onInsert(); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-black text-[11px] font-bold shadow-lg hover:bg-white/90 transition-all active:scale-95"
                    >
                        <Plus size={12} strokeWidth={2.5} />
                        Insert
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="px-3 py-2.5">
                <p className={cn('text-[12px] font-bold truncate', isDark ? 'text-white' : 'text-black')}>
                    {template.name}
                </p>
                <div className={cn('flex items-center gap-1 mt-0.5', isDark ? 'text-white/30' : 'text-black/30')}>
                    <Calendar size={9} />
                    <span className="text-[10px]">{dateStr}</span>
                </div>
            </div>
        </div>
    );
}
