"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { Check, ChevronDown } from 'lucide-react';
import { gooeyToast } from 'goey-toast';

interface SettingsCardProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    onSave?: () => Promise<void>;
    isSaving?: boolean;
    unsavedChanges?: boolean;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    extra?: React.ReactNode;
}

export function SettingsCard({ 
    title, 
    description, 
    children, 
    onSave, 
    isSaving, 
    unsavedChanges,
    collapsible = false,
    defaultCollapsed = false,
    extra
}: SettingsCardProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    
    const [isCollapsed, setIsCollapsed] = useState(collapsible ? defaultCollapsed : false);
    const [justSaved, setJustSaved] = useState(false);

    // Auto-expand if there are unsaved changes
    useEffect(() => {
        if (unsavedChanges && isCollapsed) {
            setIsCollapsed(false);
        }
    }, [unsavedChanges]);

    const handleSave = async () => {
        if (!onSave) return;
        await onSave();
        setJustSaved(true);
        gooeyToast.success('Changes saved', { duration: 1800 });
        setTimeout(() => setJustSaved(false), 2000);
    };

    return (
        <div className={cn(
            "w-full rounded-2xl mb-8 shadow-sm transition-all duration-300",
            isDark ? "bg-[#1a1a1a] border border-[#252525]" : "bg-white border border-[#ebebeb]",
            isCollapsed && "mb-4 overflow-hidden"
        )}>
            <div 
                className={cn(
                    "p-6 rounded-t-2xl",
                    collapsible && "cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                )}
                onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold mb-1 flex items-center gap-2">
                            {title}
                            {unsavedChanges && !isCollapsed && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            )}
                        </h2>
                        {description && !isCollapsed && (
                            <p className={cn("text-sm transition-all", isDark ? "text-white/50" : "text-black/50")}>
                                {description}
                            </p>
                        )}
                        {isCollapsed && description && (
                             <p className={cn("text-xs opacity-40 truncate max-w-[400px]", isDark ? "text-white" : "text-black")}>
                                {description}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {extra}
                        {collapsible && (
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                isDark ? "bg-white/5" : "bg-black/5",
                                isCollapsed ? "" : "rotate-180"
                            )}>
                                <ChevronDown size={18} className="opacity-50" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className={cn(
                "grid transition-all duration-300 ease-in-out px-6",
                isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100 pb-6"
            )}>
                <div className={cn(isCollapsed && "overflow-hidden")}>
                    <div className="flex flex-col gap-6">
                        {children}
                    </div>
                </div>
            </div>

            {onSave && !isCollapsed && (
                <div className={cn(
                    "px-6 py-4 flex items-center justify-between border-t rounded-b-2xl",
                    isDark ? "bg-[#141414] border-[#252525]" : "bg-[#fafafa] border-[#ebebeb]"
                )}>
                    <div className={cn("text-sm font-medium", isDark ? "text-white/40" : "text-black/40")}>
                        {unsavedChanges ? 'You have unsaved changes' : 'All changes saved.'}
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !unsavedChanges}
                        className={cn(
                            "h-9 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all",
                            unsavedChanges && !isSaving
                                ? "bg-primary text-[var(--brand-primary-foreground)] hover:bg-primary-hover active:scale-[0.98] shadow-sm"
                                : (isDark ? "bg-white/10 text-white/40 cursor-not-allowed" : "bg-black/5 text-black/40 cursor-not-allowed")
                        )}
                    >
                        {isSaving ? (
                            <span className="opacity-70 animate-pulse">Saving...</span>
                        ) : justSaved ? (
                            <><Check size={16} strokeWidth={3} /> Saved</>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
