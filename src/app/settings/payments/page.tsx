"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput, SettingsTextarea } from '@/components/settings/SettingsField';
import { useSettingsStore, WorkspacePayments } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';

const DEFAULT_PAYMENTS: Omit<WorkspacePayments, 'workspace_id'> = {
    business_name: '',
    business_address: '',
    tax_number: '',
    bank_name: '',
    iban: '',
    swift: '',
    default_currency: 'USD',
    payment_terms: 'Net 30',
    invoice_prefix: 'INV-',
    invoice_start_number: 1,
};

export default function PaymentsSettingsPage() {
    const { activeWorkspaceId } = useUIStore();
    const { payments, fetchPayments, updatePayments, isLoading } = useSettingsStore();

    const [formData, setFormData] = useState<Omit<WorkspacePayments, 'workspace_id'>>(DEFAULT_PAYMENTS);
    const [isSaving, setIsSaving] = useState(false);

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
                bank_name: payments.bank_name || '',
                iban: payments.iban || '',
                swift: payments.swift || '',
                default_currency: payments.default_currency || DEFAULT_PAYMENTS.default_currency,
                payment_terms: payments.payment_terms || DEFAULT_PAYMENTS.payment_terms,
                invoice_prefix: payments.invoice_prefix || DEFAULT_PAYMENTS.invoice_prefix,
                invoice_start_number: payments.invoice_start_number ?? DEFAULT_PAYMENTS.invoice_start_number,
            });
        } else {
            setFormData(DEFAULT_PAYMENTS);
        }
    }, [payments]);

    const hasUnsavedChanges = () => {
        const compareTo = payments || DEFAULT_PAYMENTS;
        return (
            formData.business_name !== (compareTo.business_name || '') ||
            formData.business_address !== (compareTo.business_address || '') ||
            formData.tax_number !== (compareTo.tax_number || '') ||
            formData.bank_name !== (compareTo.bank_name || '') ||
            formData.iban !== (compareTo.iban || '') ||
            formData.swift !== (compareTo.swift || '') ||
            formData.default_currency !== (compareTo.default_currency || DEFAULT_PAYMENTS.default_currency) ||
            formData.payment_terms !== (compareTo.payment_terms || DEFAULT_PAYMENTS.payment_terms) ||
            formData.invoice_prefix !== (compareTo.invoice_prefix || DEFAULT_PAYMENTS.invoice_prefix) ||
            formData.invoice_start_number !== (compareTo.invoice_start_number ?? DEFAULT_PAYMENTS.invoice_start_number)
        );
    };

    const handleSave = async () => {
        if (!activeWorkspaceId) return;
        setIsSaving(true);
        await updatePayments(activeWorkspaceId, formData);
        setIsSaving(false);
    };

    if (isLoading && !payments) {
        return <div className="animate-pulse">Loading payments data...</div>;
    }

    if (!activeWorkspaceId) {
        return <div>No active workspace selected.</div>;
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8">
            <SettingsCard
                title="Business Details"
                description="Information that appears on your invoices."
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasUnsavedChanges()}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingsField label="Business Name">
                        <SettingsInput 
                            value={formData.business_name || ''} 
                            onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                            placeholder="Acme Studio LLC"
                        />
                    </SettingsField>
                    <SettingsField label="Tax / VAT Number">
                        <SettingsInput 
                            value={formData.tax_number || ''} 
                            onChange={e => setFormData({ ...formData, tax_number: e.target.value })}
                            placeholder="US-123456789"
                        />
                    </SettingsField>
                </div>

                <SettingsField label="Business Address">
                    <SettingsTextarea 
                        value={formData.business_address || ''} 
                        onChange={e => setFormData({ ...formData, business_address: e.target.value })}
                        placeholder="123 Business Rd&#10;San Francisco, CA"
                    />
                </SettingsField>
            </SettingsCard>

            <SettingsCard
                title="Bank Account"
                description="Your bank account details for direct transfers."
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasUnsavedChanges()}
            >
                <SettingsField label="Bank Name">
                    <SettingsInput 
                        value={formData.bank_name || ''} 
                        onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                        placeholder="Chase Bank"
                    />
                </SettingsField>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingsField label="IBAN / Account Number">
                        <SettingsInput 
                            value={formData.iban || ''} 
                            onChange={e => setFormData({ ...formData, iban: e.target.value })}
                            placeholder="US00 CHASE 123..."
                        />
                    </SettingsField>
                    <SettingsField label="SWIFT / Routing">
                        <SettingsInput 
                            value={formData.swift || ''} 
                            onChange={e => setFormData({ ...formData, swift: e.target.value })}
                            placeholder="CHASUS33X"
                        />
                    </SettingsField>
                </div>
            </SettingsCard>

            <SettingsCard
                title="Invoice Defaults"
                description="Default values applied to new invoices."
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasUnsavedChanges()}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingsField label="Currency Code">
                        <SettingsInput 
                            value={formData.default_currency} 
                            onChange={e => setFormData({ ...formData, default_currency: e.target.value })}
                            placeholder="USD"
                        />
                    </SettingsField>
                    <SettingsField label="Payment Terms">
                        <SettingsInput 
                            value={formData.payment_terms} 
                            onChange={e => setFormData({ ...formData, payment_terms: e.target.value })}
                            placeholder="Net 30"
                        />
                    </SettingsField>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 border-t pt-4" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
                    <SettingsField label="Invoice Prefix">
                        <SettingsInput 
                            value={formData.invoice_prefix} 
                            onChange={e => setFormData({ ...formData, invoice_prefix: e.target.value })}
                            placeholder="INV-"
                        />
                    </SettingsField>
                    <SettingsField label="Next Invoice Sequence #">
                        <SettingsInput 
                            type="number"
                            min="1"
                            value={formData.invoice_start_number} 
                            onChange={e => setFormData({ ...formData, invoice_start_number: parseInt(e.target.value) || 1 })}
                        />
                    </SettingsField>
                </div>
            </SettingsCard>
        </div>
    );
}
