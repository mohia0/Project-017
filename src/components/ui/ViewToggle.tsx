"use client";

import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewOption {
    id: string;
    icon: React.ReactNode;
}

interface ViewToggleProps {
    view: string;
    onViewChange: (view: any) => void;
    isDark: boolean;
    className?: string;
    options?: ViewOption[];
}

export function ViewToggle({ view, onViewChange, isDark, className, options }: ViewToggleProps) {
    const defaultOptions: ViewOption[] = [
        { id: 'grid', icon: <LayoutGrid size={12}/> },
        { id: 'list', icon: <List size={12}/> }
    ];

    const activeOptions = options || defaultOptions;

    return (
        <div className={cn('flex items-center rounded-lg p-0.5 gap-0.5', isDark ? 'bg-white/5' : 'bg-[#f0f0f0]', className)}>
            {activeOptions.map(opt => (
                <button 
                    key={opt.id} 
                    onClick={() => onViewChange(opt.id)} 
                    className={cn(
                        'w-7 h-6 flex items-center justify-center rounded-md transition-all',
                        view === opt.id 
                            ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-[#111] shadow-sm') 
                            : (isDark ? 'text-[#666] hover:text-[#aaa]' : 'text-[#aaa] hover:text-[#555]')
                    )}
                >
                    {opt.icon}
                </button>
            ))}
        </div>
    );
}
