"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { BankTransferModal } from './BankTransferModal';
import { PayPalModal } from './PayPalModal';
import { DocumentDesign } from '@/types/design';

interface PaymentMethodSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any;
    onMarkAsPaid: () => void;
    design?: Partial<DocumentDesign>;
}

// PayPal branded mark — matches official PayPal color scheme
function PayPalIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.067 7.301c.19-1.27-.001-2.134-.657-2.918C18.686 3.474 17.19 3 15.309 3H9.68a.896.896 0 0 0-.888.76L6.656 18.898a.54.54 0 0 0 .533.624h3.88l-.274 1.74a.472.472 0 0 0 .466.546h3.277a.785.785 0 0 0 .776-.665l.032-.167.615-3.899.04-.215a.785.785 0 0 1 .776-.665h.489c3.162 0 5.637-1.285 6.358-5.002.302-1.55.146-2.843-.653-3.754a3.117 3.117 0 0 0-.905-.64z" fill="#009CDE"/>
            <path d="M20.067 7.301c.19-1.27-.001-2.134-.657-2.918C18.686 3.474 17.19 3 15.309 3H9.68a.896.896 0 0 0-.888.76L6.656 18.898a.54.54 0 0 0 .533.624h3.88l.974-6.175-.03.194a.896.896 0 0 1 .887-.76h1.848c3.63 0 6.473-1.476 7.303-5.746.025-.126.046-.25.065-.371a4.416 4.416 0 0 0-.049-.363z" fill="#012169"/>
            <path d="M10.278 7.332a.785.785 0 0 1 .776-.665h4.922c.583 0 1.128.038 1.624.118.142.023.28.05.414.08.134.03.263.064.388.102.063.019.124.039.184.06.24.083.461.183.663.3.19-1.27-.001-2.134-.657-2.918C17.686 3.474 16.19 3 14.309 3H8.68a.896.896 0 0 0-.888.76L5.656 18.898a.54.54 0 0 0 .533.624h3.88l.974-6.175.235-1.493.998-6.343.002-.18z" fill="#003087"/>
        </svg>
    );
}

export function PaymentMethodSelectorModal({ 
    isOpen, 
    onClose, 
    invoice,
    onMarkAsPaid,
    design = {}
}: PaymentMethodSelectorModalProps) {
    const { theme } = useUIStore();
    const { payments, fetchPayments, hasFetched } = useSettingsStore();
    const isDark = design.actionTheme ? design.actionTheme === 'dark' : false;

    React.useEffect(() => {
        if (isOpen && invoice.workspace_id && !hasFetched.payments) {
            fetchPayments(invoice.workspace_id);
        }
    }, [isOpen, invoice.workspace_id, fetchPayments, hasFetched.payments]);

    const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [isPayPalModalOpen, setIsPayPalModalOpen] = useState(false);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => { setMounted(true); }, []);

    const paymentMethods = invoice.meta?.paymentMethods || invoice.paymentMethods || [];
    
    // Build available methods list
    const availableMethods: any[] = [];
    
    if (paymentMethods.includes('paypal') && payments?.paypal_email && (payments?.paypal_enabled !== false) && invoice.currency === 'USD') {
        availableMethods.push({
            id: 'paypal',
            name: 'PayPal',
            subName: payments.paypal_email,
            icon: <PayPalIcon size={20} />,
            bgColor: '#003087',
            type: 'paypal'
        });
    }

    payments?.bank_accounts?.forEach(acc => {
        if (paymentMethods.includes(acc.id) && acc.is_active) {
            availableMethods.push({
                id: acc.id,
                name: acc.bank_name,
                subName: acc.account_name,
                icon: <Landmark size={18} />,
                bgColor: acc.color || '#008ba3',
                type: 'bank'
            });
        }
    });

    // Auto-select if only one method
    React.useEffect(() => {
        if (isOpen && availableMethods.length === 1 && !selectedBankAccountId && !isBankModalOpen && !isPayPalModalOpen) {
            handleSelectMethod(availableMethods[0]);
        }
    }, [isOpen, availableMethods.length, selectedBankAccountId, isBankModalOpen, isPayPalModalOpen]);

    const handleSelectMethod = (method: any) => {
        if (method.type === 'bank') {
            setSelectedBankAccountId(method.id);
            setIsBankModalOpen(true);
        } else if (method.type === 'paypal') {
            setIsPayPalModalOpen(true);
        }
    };

    // Get invoice details for PayPal
    const invoiceMeta = invoice.meta || invoice;
    const invoiceCurrency = invoiceMeta.currency || 'USD';
    const invoiceNumber = invoiceMeta.invoiceNumber || invoice.id || '';

    // Show bank modal
    if (isBankModalOpen && selectedBankAccountId) {
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
                design={design}
            />
        );
    }

    // Show PayPal modal
    if (isPayPalModalOpen) {
        return (
            <PayPalModal
                isOpen={true}
                onClose={() => {
                    setIsPayPalModalOpen(false);
                    onClose();
                }}
                onMarkAsPaid={onMarkAsPaid}
                email={payments?.paypal_email || ''}
                amount={invoice.amount}
                currency={invoiceCurrency}
                invoiceNumber={invoiceNumber}
                design={design}
            />
        );
    }

    const hasOnlyBank = availableMethods.length > 0 && availableMethods.every(m => m.type === 'bank');
    const footerText = hasOnlyBank 
        ? "All bank details are confidential and securely handled."
        : `Secure payment powered by ${payments?.business_name || "AROOOXA"}`;

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
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
                            availableMethods.map((method) => (
                                <button
                                    key={method.id}
                                    onClick={() => handleSelectMethod(method)}
                                    className={cn(
                                        "w-full flex items-center gap-4 px-4 py-4 transition-all group border-b last:border-0",
                                        isDark ? "hover:bg-white/5 border-white/5" : "hover:bg-white border-black/5"
                                    )}
                                >
                                    {/* Icon pill */}
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-active:scale-95"
                                        style={{
                                            backgroundColor: method.type === 'paypal'
                                                ? (isDark ? '#1a2a4a' : '#eef2ff')
                                                : (isDark ? '#2c2c2e' : '#fff'),
                                            color: method.bgColor
                                        }}
                                    >
                                        {method.icon}
                                    </div>

                                    <div className="flex-1 text-left overflow-hidden">
                                        <div className={cn("text-[13px] font-bold truncate", isDark ? "text-white/90" : "text-black/90")}>
                                            {method.name}
                                        </div>
                                        {method.subName && (
                                            <div className={cn("text-[11px] font-medium opacity-40 truncate", isDark ? "text-white" : "text-black")}>
                                                {method.subName}
                                            </div>
                                        )}
                                    </div>

                                    {/* Tag badge for PayPal */}
                                    {method.type === 'paypal' && (
                                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#003087]/10 text-[#003087] shrink-0">
                                            Redirect
                                        </span>
                                    )}

                                    <ChevronRight size={14} className="opacity-20 group-hover:opacity-40 transition-opacity shrink-0" />
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="px-6 pb-6 pt-2">
                    <p className={cn("text-[10.5px] text-center opacity-30 font-medium", isDark ? "text-white" : "text-black")}>
                        {footerText}
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}
