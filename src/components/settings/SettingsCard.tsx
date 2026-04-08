"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { Check } from 'lucide-react';

interface SettingsCardProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    onSave?: () => Promise<void>;
    isSaving?: boolean;
    unsavedChanges?: boolean;
}

export function SettingsCard({ title, description, children, onSave, isSaving, unsavedChanges }: SettingsCardProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    
    // Simple state to show a momentary "Saved" checkmark
    const [justSaved, setJustSaved] = useState(false);

    const handleSave = async () => {
        if (!onSave) return;
        await onSave();
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
    };

    return (
        <div className={cn(
            "w-full rounded-2xl overflow-hidden mb-8 shadow-sm",
            isDark ? "bg-[#111] border border-white/10" : "bg-white border border-black/10"
        )}>
            <div className="p-6">
                <h2 className="text-base font-bold mb-1">{title}</h2>
                {description && (
                    <p className={cn("text-sm mb-6", isDark ? "text-white/50" : "text-black/50")}>
                        {description}
                    </p>
                )}
                
                <div className="flex flex-col gap-6">
                    {children}
                </div>
            </div>

            {onSave && (
                <div className={cn(
                    "px-6 py-4 flex items-center justify-between border-t",
                    isDark ? "bg-[#1a1a1a] border-white/10" : "bg-[#f8f8f8] border-black/10"
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
                                ? "bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-[0.98]"
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
