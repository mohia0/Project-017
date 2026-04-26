"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput } from '@/components/settings/SettingsField';
import { useSettingsStore, WorkspacePayments } from '@/store/useSettingsStore';
import { ColorisInput } from '@/components/ui/ColorisInput';
import { useUIStore } from '@/store/useUIStore';
import { Plus, Trash2, Check, Star, AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { appToast } from '@/lib/toast';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_PAYMENTS: Omit<WorkspacePayments, 'workspace_id'> = {
    business_name: '',
    business_address: '',
    tax_number: '',
    paypal_email: '',
    bank_name: '',
    iban: '',
    swift: '',
    bank_accounts: [],
    default_currency: 'USD',
    payment_terms: 'Net 30',
    invoice_prefix: 'INV-',
    invoice_start_number: 1,
};

export default function PaymentsSettingsPage() {
    const { activeWorkspaceId, theme } = useUIStore();
    const isDark = theme === 'dark';
    const { payments, fetchPayments, updatePayments, isLoading, hasFetched } = useSettingsStore();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const [formData, setFormData] = useState<Omit<WorkspacePayments, 'workspace_id'>>(DEFAULT_PAYMENTS);
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchPayments(activeWorkspaceId);
        }
    }, [activeWorkspaceId, fetchPayments]);

    useEffect(() => {
        if (payments) {
            setFormData({
                business_name: payments.business_name || '',
                business_address: payments.business_address || '',
                tax_number: payments.tax_number || '',
                paypal_email: payments.paypal_email || '',
                bank_name: payments.bank_name || '',
                iban: payments.iban || '',
                swift: payments.swift || '',
                bank_accounts: payments.bank_accounts || [],
                default_currency: payments.default_currency || DEFAULT_PAYMENTS.default_currency,
                payment_terms: payments.payment_terms || DEFAULT_PAYMENTS.payment_terms,
                invoice_prefix: payments.invoice_prefix || DEFAULT_PAYMENTS.invoice_prefix,
                invoice_start_number: payments.invoice_start_number ?? DEFAULT_PAYMENTS.invoice_start_number,
            });
        } else {
            setFormData(DEFAULT_PAYMENTS);
        }
    }, [payments]);

    const hasBankChanges = () => {
        const compareTo = payments || DEFAULT_PAYMENTS;
        return JSON.stringify(formData.bank_accounts) !== JSON.stringify(compareTo.bank_accounts || []);
    };

    const hasPayPalChanges = () => {
        const compareTo = payments || DEFAULT_PAYMENTS;
        return formData.paypal_email !== (compareTo.paypal_email || '');
    };

    const handleSaveSection = async (section: string, updates: Partial<WorkspacePayments>) => {
        if (!activeWorkspaceId) return;
        setIsSaving(prev => ({ ...prev, [section]: true }));
        try {
            await appToast.promise(
                updatePayments(activeWorkspaceId, updates),
                {
                    loading: `Saving ${section} settings...`,
                    success: 'Settings saved successfully',
                    error: `Failed to save ${section} settings`
                }
            );
        } catch (error: any) {
            console.error('Save error:', error);
        } finally {
            setIsSaving(prev => ({ ...prev, [section]: false }));
        }
    };

    if (!hasFetched.payments) {
        return <div className="animate-pulse">Loading payments data...</div>;
    }

    if (!activeWorkspaceId) {
        return <div>No active workspace selected.</div>;
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8">


            <SettingsCard
                title="Bank Accounts"
                description="Your bank account details for direct transfers. One account must be set as default."
                onSave={() => handleSaveSection('Bank Accounts', { bank_accounts: formData.bank_accounts })}
                isSaving={isSaving['Bank Accounts']}
                unsavedChanges={hasBankChanges()}
                extra={
                    <button
                        onClick={() => {
                            const newId = uuidv4();
                            const newAccount = {
                                id: newId,
                                bank_name: '',
                                account_name: '',
                                account_number: '',
                                swift: '',
                                iban: '',
                                is_default: (formData.bank_accounts?.length === 0),
                                is_active: true,
                                color: '#008ba3'
                            };
                            setFormData({
                                ...formData,
                                bank_accounts: [...(formData.bank_accounts || []), newAccount]
                            });
                            // Automatically expand the new account
                            setExpandedIds(prev => new Set(prev).add(newId));
                        }}
                        className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all",
                            activeWorkspaceId 
                                ? (isDark ? "hover:bg-white/5 text-white/50 hover:text-white" : "hover:bg-black/5 text-black/50 hover:text-black")
                                : "opacity-30 cursor-not-allowed"
                        )}
                        title="Add bank account"
                    >
                        <Plus size={14} strokeWidth={2.5} />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Add</span>
                    </button>
                }
            >
                <div className="space-y-6">
                    {(!formData.bank_accounts || formData.bank_accounts.length === 0) ? (
                        <div className={cn(
                            "flex flex-col items-center justify-center py-8 px-4 rounded-2xl border border-dashed",
                            isDark ? "border-white/10 bg-white/[0.02]" : "border-black/10 bg-black/[0.02]"
                        )}>
                            <AlertCircle size={20} className="mb-2 opacity-20" />
                            <p className="text-xs opacity-40 font-medium">No bank accounts added yet.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {formData.bank_accounts.map((acc, index) => {
                                const isExpanded = expandedIds.has(acc.id);
                                return (
                                    <div 
                                        key={acc.id} 
                                        className={cn(
                                            "rounded-xl border transition-all duration-200",
                                            isDark ? "bg-white/[0.02] border-white/5" : "bg-black/[0.02] border-black/5",
                                            isExpanded ? (isDark ? "border-white/10 ring-1 ring-white/5" : "border-black/10 ring-1 ring-black/5 shadow-sm") : "hover:border-primary/20"
                                        )}
                                    >
                                        {/* Compact Header */}
                                        <div 
                                            className={cn(
                                                "px-4 py-3 flex items-center justify-between cursor-pointer group",
                                                isExpanded && "border-b border-dashed",
                                                isDark ? "border-white/10" : "border-black/10"
                                            )}
                                            onClick={() => {
                                                const next = new Set(expandedIds);
                                                if (isExpanded) next.delete(acc.id);
                                                else next.add(acc.id);
                                                setExpandedIds(next);
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                                    !isExpanded && (isDark ? "bg-white/5 text-white/20" : "bg-black/5 text-black/20")
                                                )} style={!isExpanded && acc.color ? { backgroundColor: `${acc.color}20`, color: acc.color } : {}}>
                                                    <ChevronDown size={16} className={cn("transition-transform duration-300", !isExpanded && "-rotate-90")} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={cn("text-[13px] font-bold leading-none mb-1", isDark ? "text-white" : "text-black")}>
                                                        {acc.bank_name || 'Unnamed Bank'}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("text-[10px] font-medium opacity-40 uppercase tracking-wider", isDark ? "text-white" : "text-black")}>
                                                            {acc.account_name || 'No account name'}
                                                        </span>
                                                        {acc.is_default && (
                                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest leading-none">
                                                                Default
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                <button 
                                                    onClick={() => {
                                                        const next = formData.bank_accounts?.map(a => 
                                                            a.id === acc.id ? { ...a, is_active: !a.is_active } : a
                                                        );
                                                        setFormData({ ...formData, bank_accounts: next || [] });
                                                    }}
                                                    className={cn(
                                                        "relative w-7 h-4 rounded-full transition-all duration-300",
                                                        acc.is_active 
                                                            ? "bg-primary" 
                                                            : (isDark ? "bg-white/10" : "bg-black/10")
                                                    )}
                                                    title={acc.is_active ? "Account is active" : "Account is hidden"}
                                                >
                                                    <div className={cn(
                                                        "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300",
                                                        acc.is_active ? "left-[13px]" : "left-0.5",
                                                        !acc.is_active && !isDark && "bg-black/20"
                                                    )} />
                                                </button>
                                                {!acc.is_default && (
                                                    <button 
                                                        onClick={() => {
                                                            const next = formData.bank_accounts?.map(a => ({
                                                                ...a,
                                                                is_default: a.id === acc.id
                                                            }));
                                                            setFormData({ ...formData, bank_accounts: next || [] });
                                                        }}
                                                        className={cn(
                                                            "p-2 rounded-lg transition-all",
                                                            isDark ? "hover:bg-white/5 text-white/20 hover:text-white" : "hover:bg-black/5 text-black/20 hover:text-black"
                                                        )}
                                                        title="Set as default"
                                                    >
                                                        <Star size={12} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => {
                                                        const next = formData.bank_accounts?.filter(a => a.id !== acc.id);
                                                        if (acc.is_default && next && next.length > 0) {
                                                            next[0].is_default = true;
                                                        }
                                                        setFormData({ ...formData, bank_accounts: next || [] });
                                                        // Remove from expanded if expanded
                                                        const nextExpanded = new Set(expandedIds);
                                                        nextExpanded.delete(acc.id);
                                                        setExpandedIds(nextExpanded);
                                                    }}
                                                    className={cn(
                                                        "p-2 rounded-lg transition-all",
                                                        isDark ? "hover:bg-red-500/10 text-white/20 hover:text-red-500" : "hover:bg-red-500/10 text-black/20 hover:text-red-500"
                                                    )}
                                                    title="Delete account"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Form */}
                                        {isExpanded && (
                                            <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <SettingsField label="Bank Name">
                                                        <SettingsInput 
                                                            value={acc.bank_name} 
                                                            onChange={e => {
                                                                const next = [...(formData.bank_accounts || [])];
                                                                next[index] = { ...next[index], bank_name: e.target.value };
                                                                setFormData({ ...formData, bank_accounts: next });
                                                            }}
                                                            placeholder="Chase Bank"
                                                        />
                                                    </SettingsField>
                                                    <SettingsField label="Account Name">
                                                        <SettingsInput 
                                                            value={acc.account_name} 
                                                            onChange={e => {
                                                                const next = [...(formData.bank_accounts || [])];
                                                                next[index] = { ...next[index], account_name: e.target.value };
                                                                setFormData({ ...formData, bank_accounts: next });
                                                            }}
                                                            placeholder="John Doe"
                                                        />
                                                    </SettingsField>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <SettingsField label="Account Number">
                                                        <SettingsInput 
                                                            value={acc.account_number} 
                                                            onChange={e => {
                                                                const next = [...(formData.bank_accounts || [])];
                                                                next[index] = { ...next[index], account_number: e.target.value };
                                                                setFormData({ ...formData, bank_accounts: next });
                                                            }}
                                                            placeholder="12345678"
                                                        />
                                                    </SettingsField>
                                                    <SettingsField label="SWIFT Code">
                                                        <SettingsInput 
                                                            value={acc.swift} 
                                                            onChange={e => {
                                                                const next = [...(formData.bank_accounts || [])];
                                                                next[index] = { ...next[index], swift: e.target.value };
                                                                setFormData({ ...formData, bank_accounts: next });
                                                            }}
                                                            placeholder="CHASUS33"
                                                        />
                                                    </SettingsField>
                                                </div>

                                                <SettingsField label="IBAN">
                                                    <SettingsInput 
                                                        value={acc.iban} 
                                                        onChange={e => {
                                                            const next = [...(formData.bank_accounts || [])];
                                                            next[index] = { ...next[index], iban: e.target.value };
                                                            setFormData({ ...formData, bank_accounts: next });
                                                        }}
                                                        placeholder="US00 CHASE 000..."
                                                    />
                                                </SettingsField>

                                                <SettingsField label="Display Color">
                                                    <div className="flex items-center gap-3">
                                                        <ColorisInput 
                                                            value={acc.color || '#008ba3'} 
                                                            onChange={val => {
                                                                const next = [...(formData.bank_accounts || [])];
                                                                next[index] = { ...next[index], color: val };
                                                                setFormData({ ...formData, bank_accounts: next });
                                                            }}
                                                        />
                                                        <span className={cn("text-[11px] font-medium opacity-40", isDark ? "text-white" : "text-black")}>
                                                            This color will be used for the bank icon in the payment modal.
                                                        </span>
                                                    </div>
                                                </SettingsField>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </SettingsCard>

            <SettingsCard
                title="PayPal"
                description="Accept payments via PayPal. Enter your PayPal email address."
                onSave={() => handleSaveSection('PayPal', { paypal_email: formData.paypal_email })}
                isSaving={isSaving['PayPal']}
                unsavedChanges={hasPayPalChanges()}
            >
                <SettingsField label="PayPal Email">
                    <SettingsInput 
                        value={formData.paypal_email || ''} 
                        onChange={e => setFormData({ ...formData, paypal_email: e.target.value })}
                        placeholder="your@email.com"
                    />
                </SettingsField>
            </SettingsCard>


        </div>
    );
}
