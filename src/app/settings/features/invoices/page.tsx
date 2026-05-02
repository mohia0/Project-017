"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput, SettingsToggle } from '@/components/settings/SettingsField';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { Info, HelpCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SkeletonBox } from '@/components/ui/ListViewSkeleton';

const TOOL = 'invoices';

const DEFAULT_SETTINGS = {
    prefix: '',
    counter: '0001',
    suffix: '',
    assign_to_draft: true,
    default_due_days: 7,
    auto_reminder: true,
    auto_receipt: true,
    auto_receipt_on_client_pay: false,
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
    
    // Section 1: Numbering
    const [numberingForm, setNumberingForm] = useState({
        prefix: saved.prefix ?? DEFAULT_SETTINGS.prefix,
        counter: saved.counter ?? DEFAULT_SETTINGS.counter,
        suffix: saved.suffix ?? DEFAULT_SETTINGS.suffix,
        assign_to_draft: saved.assign_to_draft ?? DEFAULT_SETTINGS.assign_to_draft,
    });
    const [isSavingNumbering, setIsSavingNumbering] = useState(false);

    // Section 2: Preferences
    const [prefForm, setPrefForm] = useState({
        default_due_days: saved.default_due_days ?? DEFAULT_SETTINGS.default_due_days,
        auto_reminder: saved.auto_reminder ?? DEFAULT_SETTINGS.auto_reminder,
        auto_receipt: saved.auto_receipt ?? DEFAULT_SETTINGS.auto_receipt,
        auto_receipt_on_client_pay: saved.auto_receipt_on_client_pay ?? DEFAULT_SETTINGS.auto_receipt_on_client_pay,
    });
    const [isSavingPref, setIsSavingPref] = useState(false);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (activeWorkspaceId && !hasFetched[`toolSettings_${TOOL}`]) {
            fetchToolSettings(activeWorkspaceId, TOOL);
        }
    }, [activeWorkspaceId]);

    const hasFetchedInvoices = hasFetched[`toolSettings_${TOOL}`];

    useEffect(() => {
        const current = toolSettings[TOOL] || DEFAULT_SETTINGS;
        setNumberingForm({
            prefix: current.prefix ?? DEFAULT_SETTINGS.prefix,
            counter: current.counter ?? DEFAULT_SETTINGS.counter,
            suffix: current.suffix ?? DEFAULT_SETTINGS.suffix,
            assign_to_draft: current.assign_to_draft ?? DEFAULT_SETTINGS.assign_to_draft,
        });
        setPrefForm({
            default_due_days: current.default_due_days ?? DEFAULT_SETTINGS.default_due_days,
            auto_reminder: current.auto_reminder ?? DEFAULT_SETTINGS.auto_reminder,
            auto_receipt: current.auto_receipt ?? DEFAULT_SETTINGS.auto_receipt,
            auto_receipt_on_client_pay: current.auto_receipt_on_client_pay ?? DEFAULT_SETTINGS.auto_receipt_on_client_pay,
        });
    }, [toolSettings]);

    if (!activeWorkspaceId || !mounted || !hasFetchedInvoices) {
        return (
            <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8 px-4">
                <SkeletonBox isDark={isDark} className="h-64 rounded-2xl w-full" />
                <SkeletonBox isDark={isDark} className="h-64 rounded-2xl w-full" />
            </div>
        );
    }

    const numberingHasChanges = JSON.stringify(numberingForm) !== JSON.stringify({
        prefix: saved.prefix ?? DEFAULT_SETTINGS.prefix,
        counter: saved.counter ?? DEFAULT_SETTINGS.counter,
        suffix: saved.suffix ?? DEFAULT_SETTINGS.suffix,
        assign_to_draft: saved.assign_to_draft ?? DEFAULT_SETTINGS.assign_to_draft,
    });

    const prefHasChanges = JSON.stringify(prefForm) !== JSON.stringify({
        default_due_days: saved.default_due_days ?? DEFAULT_SETTINGS.default_due_days,
        auto_reminder: saved.auto_reminder ?? DEFAULT_SETTINGS.auto_reminder,
        auto_receipt: saved.auto_receipt ?? DEFAULT_SETTINGS.auto_receipt,
        auto_receipt_on_client_pay: saved.auto_receipt_on_client_pay ?? DEFAULT_SETTINGS.auto_receipt_on_client_pay,
    });

    const handleSaveNumbering = async () => {
        if (!activeWorkspaceId) return;
        setIsSavingNumbering(true);
        await updateToolSettings(activeWorkspaceId, TOOL, { ...saved, ...numberingForm });
        setIsSavingNumbering(false);
    };

    const handleSavePref = async () => {
        if (!activeWorkspaceId) return;
        setIsSavingPref(true);
        await updateToolSettings(activeWorkspaceId, TOOL, { ...saved, ...prefForm });
        setIsSavingPref(false);
    };

    const invoicePreview = `${numberingForm.prefix || ''}${numberingForm.counter}${numberingForm.suffix || ''}`;

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
                onSave={handleSaveNumbering}
                isSaving={isSavingNumbering}
                unsavedChanges={numberingHasChanges}
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
                            value={numberingForm.prefix}
                            onChange={e => setNumberingForm(f => ({ ...f, prefix: e.target.value }))}
                            className="font-mono flex-1"
                        />
                        <SettingsInput
                            placeholder="0001"
                            value={numberingForm.counter}
                            onChange={e => setNumberingForm(f => ({ ...f, counter: e.target.value }))}
                            className="font-mono text-center flex-1"
                        />
                        <SettingsInput
                            placeholder="Suffix"
                            value={numberingForm.suffix}
                            onChange={e => setNumberingForm(f => ({ ...f, suffix: e.target.value }))}
                            className="font-mono flex-1"
                        />
                    </div>
                    <p className={cn('text-xs mt-1.5', isDark ? 'text-white/30' : 'text-black/30')}>
                        Example result: <span className="font-mono">{invoicePreview || 'INV-0001'}</span>
                    </p>
                </SettingsField>

                <ToggleRow
                    label="Assign a number to draft."
                    help="When enabled, drafts receive a sequential number immediately. Otherwise, numbers are assigned only when the invoice is sent."
                    checked={numberingForm.assign_to_draft}
                    onChange={v => setNumberingForm(f => ({ ...f, assign_to_draft: v }))}
                    isDark={isDark}
                />
            </SettingsCard>

            {/* Card 2: Invoicing Preferences */}
            <SettingsCard
                title="Invoicing Preferences"
                description="Set default behavior for payment timelines and automated emails."
                onSave={handleSavePref}
                isSaving={isSavingPref}
                unsavedChanges={prefHasChanges}
            >
                {/* Due Days inline field */}
                <div className={cn(
                    'flex items-center justify-between px-4 py-3.5 rounded-xl border',
                    isDark ? 'border-white/8 bg-white/[0.02]' : 'border-black/8 bg-black/[0.02]'
                )}>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Default due period is within</span>
                        <HelpTip isDark={isDark} text="Sets the automatic due date for new invoices. If set to 7, a new invoice created today will have a due date 7 days from now. You can always change this manually for individual invoices." />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={1}
                            max={365}
                            value={prefForm.default_due_days}
                            onChange={e => setPrefForm(f => ({ ...f, default_due_days: parseInt(e.target.value) || 7 }))}
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
                        checked={prefForm.auto_reminder}
                        onChange={v => setPrefForm(f => ({ ...f, auto_reminder: v }))}
                        isDark={isDark}
                    />
                    <ToggleRow
                        label="Auto send receipts on successful payments."
                        help="Automatically emails a payment confirmation receipt to the client when a payment is recorded by you."
                        checked={prefForm.auto_receipt}
                        onChange={v => setPrefForm(f => ({ ...f, auto_receipt: v }))}
                        isDark={isDark}
                    />
                    <ToggleRow
                        label="Auto send receipt when client marks as paid."
                        help="When enabled, the system automatically sends a receipt email the moment a client marks the invoice as paid on the public page — no manual verification step required."
                        checked={prefForm.auto_receipt_on_client_pay}
                        onChange={v => setPrefForm(f => ({ ...f, auto_receipt_on_client_pay: v }))}
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
                        <span className="font-mono font-bold">{'001'}</span>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <div className={cn('flex-1 h-10 rounded-xl border', isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5')} />
                        <div className={cn('flex-1 h-10 rounded-xl border', isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5')} />
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
