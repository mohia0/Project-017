"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput, SettingsToggle } from '@/components/settings/SettingsField';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { Info, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOOL = 'proposals';

const DEFAULT_SETTINGS = {
    prefix: '',
    counter: '0001',
    suffix: '',
    assign_to_draft: true,
    auto_reminder: true,
    require_signature: false,
    show_logo: true,
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

function HelpTip({ text, isDark }: { text: string; isDark: boolean }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative inline-flex">
            <button
                type="button"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                className={cn('opacity-30 hover:opacity-70 transition-opacity', isDark ? 'text-white' : 'text-black')}
            >
                <HelpCircle size={14} />
            </button>
            {show && (
                <div className={cn(
                    'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-3 py-2 rounded-xl text-xs shadow-xl z-50 pointer-events-none',
                    isDark ? 'bg-[#222] text-white/80 border border-white/10' : 'bg-white text-black/70 border border-black/10'
                )}>
                    {text}
                </div>
            )}
        </div>
    );
}

export default function ProposalsSettingsPage() {
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

    const field = (key: string) => ({
        value: form[key as keyof typeof form],
        onChange: (val: any) => setForm(prev => ({ ...prev, [key]: val })),
    });

    const hasChanges = JSON.stringify(form) !== JSON.stringify({ ...DEFAULT_SETTINGS, ...saved });

    const handleSave = async () => {
        if (!activeWorkspaceId) return;
        setIsSaving(true);
        await updateToolSettings(activeWorkspaceId, TOOL, form);
        setIsSaving(false);
    };

    const previewNumber = `${form.prefix || ''}${form.counter}${form.suffix || ''}`;

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8 px-4">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Proposals</h1>
                <p className={cn('text-sm mt-1', isDark ? 'text-white/50' : 'text-black/50')}>
                    Configure defaults and automation for your proposals workflow.
                </p>
            </div>

            {/* Card 1: Proposal Number */}
            <SettingsCard
                title="Proposal Number (ID)"
                description="Control the format of auto-generated proposal identifiers."
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasChanges}
            >
                <InfoBanner isDark={isDark}>
                    The next proposal number will be&nbsp;
                    <span className={cn(
                        'font-mono font-bold px-1.5 py-0.5 rounded-md',
                        isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700'
                    )}>
                        {previewNumber || '—'}
                    </span>
                </InfoBanner>

                <SettingsField label="Number Format">
                    <div className="flex gap-2">
                        <SettingsInput
                            placeholder="Prefix"
                            value={form.prefix}
                            onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))}
                            className="font-mono"
                        />
                        <SettingsInput
                            placeholder="0001"
                            value={form.counter}
                            onChange={e => setForm(f => ({ ...f, counter: e.target.value }))}
                            className="font-mono text-center flex-[0.6]"
                        />
                        <SettingsInput
                            placeholder="Suffix"
                            value={form.suffix}
                            onChange={e => setForm(f => ({ ...f, suffix: e.target.value }))}
                            className="font-mono"
                        />
                    </div>
                    <p className={cn('text-xs mt-1.5', isDark ? 'text-white/30' : 'text-black/30')}>
                        Use the prefix and suffix to label proposals — e.g. <span className="font-mono">PROP-0001-2025</span>
                    </p>
                </SettingsField>

                <div className={cn(
                    'flex items-center justify-between px-4 py-3 rounded-xl border',
                    isDark ? 'border-white/8 bg-white/[0.02]' : 'border-black/8 bg-black/[0.02]'
                )}>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Assign a number to draft.</span>
                        <HelpTip isDark={isDark} text="When enabled, draft proposals are assigned a sequential number immediately. Disable to assign numbers only when sent." />
                    </div>
                    <SettingsToggle checked={form.assign_to_draft} onChange={v => setForm(f => ({ ...f, assign_to_draft: v }))} />
                </div>
            </SettingsCard>

            {/* Card 2: Preferences */}
            <SettingsCard
                title="Proposal Preferences"
                description="Automate actions and control how proposals behave."
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasChanges}
            >
                <div className="flex flex-col gap-3">
                    {/* Toggle Row */}
                    {[
                        {
                            key: 'auto_reminder',
                            label: 'Auto-send a reminder for overdue proposals.',
                            help: 'Automatically emails the client when a proposal passes its due date without a response.',
                        },
                        {
                            key: 'require_signature',
                            label: 'Require client signature before accepting.',
                            help: 'Client must digitally sign before the proposal status changes to Accepted.',
                        },
                        {
                            key: 'show_logo',
                            label: 'Show company logo on proposals.',
                            help: 'Displays the logo set in Branding on all generated proposal documents.',
                        },
                    ].map(({ key, label, help }) => (
                        <div
                            key={key}
                            className={cn(
                                'flex items-center justify-between px-4 py-3 rounded-xl border',
                                isDark ? 'border-white/8 bg-white/[0.02]' : 'border-black/8 bg-black/[0.02]'
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{label}</span>
                                <HelpTip isDark={isDark} text={help} />
                            </div>
                            <SettingsToggle
                                checked={!!form[key as keyof typeof form]}
                                onChange={v => setForm(f => ({ ...f, [key]: v }))}
                            />
                        </div>
                    ))}
                </div>
            </SettingsCard>
        </div>
    );
}
