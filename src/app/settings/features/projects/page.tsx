"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsToggle, SettingsSelect } from '@/components/settings/SettingsField';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { Info, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOOL = 'projects';

const DEFAULT_SETTINGS = {
    ws_task_position: 'bottom',
    personal_task_position: 'bottom',
    default_task_view: 'board',
    show_archived: false,
    default_reminder: '10_min',
};

function InfoBanner({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
    return (
        <div className={cn(
            'flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm border',
            isDark
                ? 'bg-blue-500/5 border-blue-500/15 text-blue-300'
                : 'bg-blue-50 border-blue-100 text-blue-600'
        )}>
            <Info size={14} className="shrink-0 opacity-70" />
            {children}
        </div>
    );
}

function SelectField({
    label,
    description,
    value,
    onChange,
    options,
    isDark,
}: {
    label: string;
    description?: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    isDark: boolean;
}) {
    return (
        <div className={cn(
            'flex items-center justify-between px-4 py-4 rounded-xl border transition-colors',
            isDark ? 'border-white/8 bg-white/[0.02]' : 'border-black/8 bg-black/[0.02]'
        )}>
            <div className="flex-1 pr-4">
                <p className="text-sm font-semibold">{label}</p>
                {description && (
                    <p className={cn('text-xs mt-0.5', isDark ? 'text-white/40' : 'text-black/40')}>
                        {description}
                    </p>
                )}
            </div>
            <div className="w-[180px] shrink-0">
                <SettingsSelect
                    isDark={isDark}
                    value={value}
                    onChange={onChange}
                    options={options}
                />
            </div>
        </div>
    );
}

export default function ProjectsSettingsPage() {
    const { theme, activeWorkspaceId } = useUIStore();
    const isDark = theme === 'dark';
    const { toolSettings, fetchToolSettings, updateToolSettings, hasFetched } = useSettingsStore();

    const saved = toolSettings[TOOL] || DEFAULT_SETTINGS;
    const [form, setForm] = useState({ ...DEFAULT_SETTINGS, ...saved });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (activeWorkspaceId && !hasFetched[`toolSettings_${TOOL}`]) {
            fetchToolSettings(activeWorkspaceId, TOOL);
        }
    }, [activeWorkspaceId]);

    useEffect(() => {
        setForm({ ...DEFAULT_SETTINGS, ...saved });
    }, [toolSettings]);

    const hasChanges = JSON.stringify(form) !== JSON.stringify({ ...DEFAULT_SETTINGS, ...saved });

    const handleSave = async () => {
        if (!activeWorkspaceId) return;
        setIsSaving(true);
        await updateToolSettings(activeWorkspaceId, TOOL, form);
        setIsSaving(false);
    };

    const taskPositionOptions = [
        { value: 'bottom', label: 'Bottom of the list' },
        { value: 'top', label: 'Top of the list' },
    ];

    const taskViewOptions = [
        { value: 'board', label: 'Board (Kanban)' },
        { value: 'list', label: 'List' },
        { value: 'timeline', label: 'Timeline' },
    ];

    const reminderOptions = [
        { value: 'none', label: 'No reminder' },
        { value: '5_min', label: '5 minutes before' },
        { value: '10_min', label: '10 minutes before' },
        { value: '30_min', label: '30 minutes before' },
        { value: '1_hour', label: '1 hour before' },
        { value: '1_day', label: '1 day before' },
    ];

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8 px-4">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                <p className={cn('text-sm mt-1', isDark ? 'text-white/50' : 'text-black/50')}>
                    Customize default behavior for project tasks and views.
                </p>
            </div>

            {/* Card 1: Workspace Preferences */}
            <SettingsCard
                title="Workspace Preferences"
                description="These settings apply for all members in this workspace."
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasChanges}
            >
                <SelectField
                    label="Position of newly created tasks"
                    description="Where new tasks are inserted in task lists by default."
                    value={form.ws_task_position}
                    onChange={v => setForm(f => ({ ...f, ws_task_position: v }))}
                    options={taskPositionOptions}
                    isDark={isDark}
                />
            </SettingsCard>

            {/* Card 2: Personal Preferences */}
            <SettingsCard
                title="Personal Preferences"
                description="These settings apply only to your account."
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasChanges}
            >
                <InfoBanner isDark={isDark}>
                    These preferences only affect your account — other workspace members are unaffected.
                </InfoBanner>

                <div className="flex flex-col gap-3">
                    <SelectField
                        label="Position of newly created tasks"
                        value={form.personal_task_position}
                        onChange={v => setForm(f => ({ ...f, personal_task_position: v }))}
                        options={taskPositionOptions}
                        isDark={isDark}
                    />

                    <SelectField
                        label="Default task view"
                        description="The view shown when you open a project."
                        value={form.default_task_view}
                        onChange={v => setForm(f => ({ ...f, default_task_view: v }))}
                        options={taskViewOptions}
                        isDark={isDark}
                    />

                    <div className={cn(
                        'flex items-center justify-between px-4 py-4 rounded-xl border',
                        isDark ? 'border-white/8 bg-white/[0.02]' : 'border-black/8 bg-black/[0.02]'
                    )}>
                        <div>
                            <p className="text-sm font-semibold">Show archived tasks by default</p>
                            <p className={cn('text-xs mt-0.5', isDark ? 'text-white/40' : 'text-black/40')}>
                                Include archived tasks in project views.
                            </p>
                        </div>
                        <SettingsToggle
                            checked={form.show_archived}
                            onChange={v => setForm(f => ({ ...f, show_archived: v }))}
                        />
                    </div>

                    <SelectField
                        label="Default reminder"
                        description="When should you be reminded about a task due date?"
                        value={form.default_reminder}
                        onChange={v => setForm(f => ({ ...f, default_reminder: v }))}
                        options={reminderOptions}
                        isDark={isDark}
                    />
                </div>
            </SettingsCard>
        </div>
    );
}
