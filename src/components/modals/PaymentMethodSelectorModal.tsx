"use client";

import React, { useState } from 'react';
import { X, ChevronRight, CreditCard, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { BankTransferModal } from './BankTransferModal';

interface PaymentMethodSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any;
    onMarkAsPaid: () => void;
}

export function PaymentMethodSelectorModal({ 
    isOpen, 
    onClose, 
    invoice,
    onMarkAsPaid 
}: PaymentMethodSelectorModalProps) {
    const { theme } = useUIStore();
    const { payments, fetchPayments, hasFetched } = useSettingsStore();
    const isDark = theme === 'dark';

    React.useEffect(() => {
        if (isOpen && invoice.workspace_id && !hasFetched.payments) {
            fetchPayments(invoice.workspace_id);
        }
    }, [isOpen, invoice.workspace_id, fetchPayments, hasFetched.payments]);

    const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);



    const paymentMethods = invoice.meta?.paymentMethods || invoice.paymentMethods || [];
    
    // Filter methods based on what's configured in settings
    const availableMethods: any[] = [];
    
    if (paymentMethods.includes('paypal') && payments?.paypal_email) {
        availableMethods.push({
            id: 'paypal',
            name: 'PayPal',
            icon: <CreditCard size={18} />,
            color: '#003087',
            type: 'paypal'
        });
    }

    payments?.bank_accounts?.forEach(acc => {
        if (paymentMethods.includes(acc.id) && acc.is_active) {
            availableMethods.push({
                id: acc.id,
                name: `${acc.bank_name}`,
                subName: acc.account_name,
                icon: <Landmark size={18} />,
                color: '#008ba3',
                type: 'bank'
            });
        }
    });

    // Auto-select if only one method and we haven't already selected something
    React.useEffect(() => {
        if (isOpen && availableMethods.length === 1 && !selectedBankAccountId && !isBankModalOpen) {
            handleSelectMethod(availableMethods[0]);
        }
    }, [isOpen, availableMethods.length, selectedBankAccountId, isBankModalOpen]);

    const handleSelectMethod = (method: any) => {
        if (method.type === 'bank') {
            setSelectedBankAccountId(method.id);
            setIsBankModalOpen(true);
        } else if (method.type === 'paypal') {
            const email = payments?.paypal_email;
            const amount = invoice.amount;
            
            // Handle both InvoiceEditor (passed meta) and PreviewClient (passed liveData) structures
            const meta = invoice.meta || invoice;
            const currency = meta.currency || 'USD';
            const number = meta.invoiceNumber || invoice.id || '';
            const itemName = encodeURIComponent(`Invoice ${number}`);
            
            window.open(`https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${email}&amount=${amount}&currency_code=${currency}&item_name=${itemName}`, '_blank');
        }
    };

    if (isBankModalOpen && selectedBankAccountId) {
        // Find the specific account
        const account = payments?.bank_accounts?.find(a => a.id === selectedBankAccountId);
        return (
            <BankTransferModal 
                isOpen={true}
                onClose={() => {
                    setIsBankModalOpen(false);
                    onClose();
                }}
                onMarkAsPaid={onMarkAsPaid}
                amountDue={invoice.amount}
                accountId={selectedBankAccountId}
            />
        );
    }

    // If there's only 1 method, maybe we should have auto-triggered it.
    // However, it's safer to show the selection if we need multiple steps.
    // The requirement says: "if we have only one it should show in the modal of pay now this one"
    // I'll interpret this as: if there's only one, immediately "act" on it.
    
    if (isOpen && availableMethods.length === 1 && !isBankModalOpen) {
        // We could auto-call handleSelectMethod, but that might cause loops or issues with React state.
        // I'll show it for now, but I can optimize it.
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className={cn(
                "relative w-full max-w-[440px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                isDark ? "bg-[#1c1c1e] text-white" : "bg-white text-[#111]"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-2">
                    <h2 className={cn("text-[17px] font-bold tracking-tight", isDark ? "text-white" : "text-black")}>
                        How would you like to pay?
                    </h2>
                    <button 
                        onClick={onClose}
                        className={cn(
                            "p-1.5 rounded-full transition-colors",
                            isDark ? "hover:bg-white/10 text-white/40" : "hover:bg-black/5 text-black/40"
                        )}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-2">
                    <div className={cn(
                        "rounded-xl border overflow-hidden",
                        isDark ? "border-white/10 bg-white/5" : "border-black/5 bg-[#f9f9f9]"
                    )}>
                        {availableMethods.length === 0 ? (
                            <div className="p-8 text-center opacity-40 text-[13px] italic">
                                No payment methods available for this invoice.
                            </div>
                        ) : (
                            availableMethods.map((method, idx) => (
                                <button
                                    key={method.id}
                                    onClick={() => handleSelectMethod(method)}
                                    className={cn(
                                        "w-full flex items-center gap-4 px-4 py-4 transition-all group border-b last:border-0",
                                        isDark ? "hover:bg-white/5 border-white/5" : "hover:bg-white border-black/5"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-active:scale-95",
                                        isDark ? "bg-[#2c2c2e]" : "bg-white shadow-sm"
                                    )} style={{ color: method.color }}>
                                        {method.icon}
                                    </div>
                                    <div className="flex-1 text-left overflow-hidden">
                                        <div className={cn("text-[13px] font-bold truncate Uppercase", isDark ? "text-white/90" : "text-black/90")}>
                                            {method.name}
                                        </div>
                                        {method.subName && (
                                            <div className={cn("text-[10px] font-medium opacity-50 truncate", isDark ? "text-white" : "text-black")}>
                                                {method.subName}
                                            </div>
                                        )}
                                    </div>
                                    <ChevronRight size={14} className="opacity-20 group-hover:opacity-40 transition-opacity" />
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="px-6 pb-6 pt-2">
                    <p className={cn("text-[10.5px] text-center opacity-30 font-medium", isDark ? "text-white" : "text-black")}>
                        Secure encrypted payment powered by Project 017
                    </p>
                </div>
            </div>
        </div>
    );
}
