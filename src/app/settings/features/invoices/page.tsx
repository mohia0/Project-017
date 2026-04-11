"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput, SettingsToggle } from '@/components/settings/SettingsField';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { Info, HelpCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOOL = 'invoices';

const DEFAULT_SETTINGS = {
    prefix: '',
    counter: '0001',
    suffix: '',
    assign_to_draft: true,
    default_due_days: 7,
    auto_reminder: true,
    auto_receipt: true,
    sub_prefix: '',
    sub_counter: '001',
    sub_suffix: '',
    sub_assign_to_draft: false,
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
                    'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 rounded-xl text-xs shadow-xl z-50 pointer-events-none',
                    isDark ? 'bg-[#222] text-white/80 border border-white/10' : 'bg-white text-black/70 border border-black/10'
                )}>
                    {text}
                </div>
            )}
        </div>
    );
}

function ToggleRow({ label, help, checked, onChange, isDark }: {
    label: string;
    help: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    isDark: boolean;
}) {
    return (
        <div className={cn(
            'flex items-center justify-between px-4 py-3.5 rounded-xl border transition-colors',
            isDark ? 'border-white/8 bg-white/[0.02]' : 'border-black/8 bg-black/[0.02]'
        )}>
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{label}</span>
                <HelpTip isDark={isDark} text={help} />
            </div>
            <SettingsToggle checked={checked} onChange={onChange} />
        </div>
    );
}

export default function InvoicesSettingsPage() {
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

    const invoicePreview = `${form.prefix || ''}${form.counter}${form.suffix || ''}`;
    const subPreview = `${form.sub_prefix || ''}${form.sub_counter}${form.sub_suffix || ''}`;

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8 px-4">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
                <p className={cn('text-sm mt-1', isDark ? 'text-white/50' : 'text-black/50')}>
                    Configure invoice numbering, due dates, and automation preferences.
                </p>
            </div>

            {/* Card 1: Invoice Number */}
            <SettingsCard
                title="Invoice Number (ID)"
                description="Define the format used to generate invoice identifiers."
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasChanges}
            >
                <InfoBanner isDark={isDark}>
                    The next invoice number will be&nbsp;
                    <span className={cn(
                        'font-mono font-bold px-1.5 py-0.5 rounded-md',
                        isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700'
                    )}>
                        {invoicePreview || '—'}
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
                        Example result: <span className="font-mono">{invoicePreview || 'INV-0001'}</span>
                    </p>
                </SettingsField>

                <ToggleRow
                    label="Assign a number to draft."
                    help="When enabled, drafts receive a sequential number immediately. Otherwise, numbers are assigned only when the invoice is sent."
                    checked={form.assign_to_draft}
                    onChange={v => setForm(f => ({ ...f, assign_to_draft: v }))}
                    isDark={isDark}
                />
            </SettingsCard>

            {/* Card 2: Invoicing Preferences */}
            <SettingsCard
                title="Invoicing Preferences"
                description="Set default behavior for payment timelines and automated emails."
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasChanges}
            >
                {/* Due Days inline field */}
                <div className={cn(
                    'flex items-center justify-between px-4 py-3.5 rounded-xl border',
                    isDark ? 'border-white/8 bg-white/[0.02]' : 'border-black/8 bg-black/[0.02]'
                )}>
                    <span className="text-sm font-medium">Default due period is within</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={1}
                            max={365}
                            value={form.default_due_days}
                            onChange={e => setForm(f => ({ ...f, default_due_days: parseInt(e.target.value) || 7 }))}
                            className={cn(
                                'w-16 h-9 text-center rounded-lg border text-sm font-bold focus:outline-none focus:ring-2 transition-all',
                                isDark
                                    ? 'bg-white/5 border-white/10 text-white focus:border-white/30 focus:ring-white/10'
                                    : 'bg-black/5 border-black/10 text-black focus:border-black/30 focus:ring-black/5'
                            )}
                        />
                        <span className={cn('text-sm font-medium', isDark ? 'text-white/50' : 'text-black/50')}>days</span>
                    </div>
                </div>

                <div className="flex flex-col gap-3 mt-1">
                    <ToggleRow
                        label="Auto send a reminder email for overdue invoices."
                        help="Sends an automated follow-up to the client when the invoice passes its due date unpaid."
                        checked={form.auto_reminder}
                        onChange={v => setForm(f => ({ ...f, auto_reminder: v }))}
                        isDark={isDark}
                    />
                    <ToggleRow
                        label="Auto send receipts on successful payments."
                        help="Automatically emails a payment confirmation receipt to the client when a payment is recorded."
                        checked={form.auto_receipt}
                        onChange={v => setForm(f => ({ ...f, auto_receipt: v }))}
                        isDark={isDark}
                    />
                </div>
            </SettingsCard>

            {/* Card 3: Subscription Number — Coming Soon */}
            <div className={cn(
                'w-full rounded-2xl overflow-hidden border shadow-sm relative',
                isDark ? 'bg-[#111] border-white/5' : 'bg-white border-black/8'
            )}>
                {/* Locked overlay */}
                <div className={cn(
                    'absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl backdrop-blur-[2px]',
                    isDark ? 'bg-[#111]/80' : 'bg-white/80'
                )}>
                    <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        isDark ? 'bg-white/5' : 'bg-black/5'
                    )}>
                        <Lock size={18} className="opacity-30" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold opacity-40">Coming Soon</p>
                        <p className={cn('text-xs mt-0.5', isDark ? 'text-white/25' : 'text-black/25')}>
                            Subscription invoicing will be available in a future update.
                        </p>
                    </div>
                </div>

                {/* Ghost content beneath */}
                <div className="p-6 pointer-events-none select-none opacity-30">
                    <h2 className="text-base font-bold mb-1">Invoice Subscription Number (ID)</h2>
                    <p className={cn('text-sm mb-6', isDark ? 'text-white/50' : 'text-black/50')}>
                        Control how recurring subscription invoices are numbered.
                    </p>

                    <div className={cn(
                        'flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm border mb-6',
                        isDark ? 'bg-blue-500/5 border-blue-500/15 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-600'
                    )}>
                        <Info size={14} />
                        The next subscription number will be&nbsp;
                        <span className="font-mono font-bold">{subPreview || '001'}</span>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <div className={cn('flex-1 h-10 rounded-xl border', isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5')} />
                        <div className={cn('flex-[0.6] h-10 rounded-xl border', isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5')} />
                        <div className={cn('flex-1 h-10 rounded-xl border', isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5')} />
                    </div>

                    <div className={cn('flex items-center justify-between px-4 py-3 rounded-xl border', isDark ? 'border-white/8' : 'border-black/8')}>
                        <span className="text-sm font-medium">Assign a number to draft.</span>
                        <div className="w-11 h-6 rounded-full bg-black/10" />
                    </div>
                </div>
            </div>
        </div>
    );
}
