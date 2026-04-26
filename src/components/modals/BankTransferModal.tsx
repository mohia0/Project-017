"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { DocumentDesign } from '@/types/design';
import { AppLoader } from '@/components/ui/AppLoader';
import { appToast } from '@/lib/toast';
import { Tooltip } from '@/components/ui/Tooltip';

interface BankTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMarkAsPaid: () => void;
    amountDue: string | number;
    accountId?: string | null;
    design?: Partial<DocumentDesign>;
}

function CopyButton({ value, label, isDark }: { value: string, label: string, isDark: boolean }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        setCopied(true);
        appToast.success(`${label} copied`, `Copied to clipboard`);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Tooltip content={copied ? "Copied!" : `Copy ${label}`} side="top">
            <button
                onClick={handleCopy}
                className={cn(
                    "p-1 rounded-md transition-all flex items-center justify-center shrink-0",
                    isDark 
                        ? "hover:bg-white/10 text-white/40 hover:text-white/80" 
                        : "hover:bg-black/5 text-black/30 hover:text-black/60"
                )}
            >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>
        </Tooltip>
    );
}

export function BankTransferModal({ 
    isOpen, 
    onClose, 
    onMarkAsPaid,
    amountDue,
    accountId,
    design = {}
}: BankTransferModalProps) {
    const { theme, activeWorkspaceId } = useUIStore();
    const { payments, fetchPayments, hasFetched } = useSettingsStore();
    const isDark = design.actionTheme ? design.actionTheme === 'dark' : false; // Use theme override

    React.useEffect(() => {
        if (isOpen && activeWorkspaceId && !hasFetched.payments) {
            fetchPayments(activeWorkspaceId);
        }
    }, [isOpen, activeWorkspaceId, fetchPayments, hasFetched.payments]);

    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => { setMounted(true); }, []);

    if (!isOpen || !mounted) return null;

    // Get the specific bank account or fall back to default
    const targetAccount = accountId 
        ? payments?.bank_accounts?.find(acc => acc.id === accountId)
        : (payments?.bank_accounts?.find(acc => acc.is_default) || payments?.bank_accounts?.[0]);

    const defaultAccount = targetAccount;

    // Fallback data if no payments is set up in settings yet
    const paymentInfo = defaultAccount ? {
        bankName: defaultAccount.bank_name,
        name: defaultAccount.account_name,
        accountNumber: defaultAccount.account_number,
        swiftCode: defaultAccount.swift,
        iban: defaultAccount.iban,
        color: defaultAccount.color
    } : {
        bankName: payments?.bank_name || "BANK OF ALEXANDRIA S A E",
        name: payments?.business_name || "Mohi Eldeen Hassan Mohamed Hassan",
        accountNumber: "311146782001",
        swiftCode: payments?.swift || "ALEXEGCXXXX",
        iban: payments?.iban || "EG980005301100000311146782001",
        color: '#008ba3'
    };

    const isLoading = isOpen && activeWorkspaceId && !hasFetched.payments;

    const handleMarkAsPaid = () => {
        // Fire and forget to make the UI feel instant
        Promise.resolve(onMarkAsPaid()).catch(console.error);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className={cn(
                "relative w-full max-w-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                isDark ? "bg-[#1c1c1e] text-white" : "bg-white text-[#111]"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-2">
                    <h2 className={cn("text-lg font-bold tracking-tight", isDark ? "text-white" : "text-black")}>
                        Pay with {paymentInfo.bankName}
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
                <div className="px-6 py-4 space-y-5">
                    <p className={cn("text-[13px] opacity-60 leading-relaxed font-medium", isDark ? "text-white" : "text-black")}>
                        Please transfer the amount due to the following bank account:
                    </p>

                    {isLoading ? (
                        <div className={cn(
                            "rounded-xl border p-12 flex flex-col items-center justify-center gap-6",
                            isDark ? "bg-[#111] border-[#333]" : "bg-[#f9f9f9] border-[#e2e2e2]"
                        )}>
                            <AppLoader size="sm" color={isDark ? "white" : "black"} />
                            <p className="text-[11px] font-bold uppercase tracking-widest opacity-30">Loading bank details...</p>
                        </div>
                    ) : (
                        <div 
                            className={cn(
                                "rounded-xl border p-4 space-y-3 transition-colors",
                                isDark ? "bg-[#111]" : "bg-[#f9f9f9]"
                            )}
                            style={{ borderColor: paymentInfo.color ? `${paymentInfo.color}30` : (isDark ? '#333' : '#e2e2e2') }}
                        >
                            <div className="space-y-1">
                                <span className={cn("text-[10px] uppercase tracking-widest font-bold opacity-30", isDark ? "text-white" : "text-black")}>Bank Name</span>
                                <div className="flex items-center justify-between gap-2">
                                    <p className={cn("text-[13px] font-semibold", isDark ? "text-white" : "text-black")}>{paymentInfo.bankName}</p>
                                    <CopyButton value={paymentInfo.bankName} label="Bank Name" isDark={isDark} />
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <span className={cn("text-[10px] uppercase tracking-widest font-bold opacity-30", isDark ? "text-white" : "text-black")}>Account Name</span>
                                <div className="flex items-center justify-between gap-2">
                                    <p className={cn("text-[13px] font-semibold", isDark ? "text-white" : "text-black")}>{paymentInfo.name}</p>
                                    <CopyButton value={paymentInfo.name} label="Account Name" isDark={isDark} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className={cn("text-[10px] uppercase tracking-widest font-bold opacity-30", isDark ? "text-white" : "text-black")}>Account Number</span>
                                    <div className="flex items-center justify-between gap-1 overflow-hidden">
                                        <p className={cn("text-[13px] font-mono font-medium truncate", isDark ? "text-white" : "text-black")}>{paymentInfo.accountNumber}</p>
                                        <CopyButton value={paymentInfo.accountNumber} label="Account Number" isDark={isDark} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className={cn("text-[10px] uppercase tracking-widest font-bold opacity-30", isDark ? "text-white" : "text-black")}>Swift Code</span>
                                    <div className="flex items-center justify-between gap-1 overflow-hidden">
                                        <p className={cn("text-[13px] font-mono font-medium truncate", isDark ? "text-white" : "text-black")}>{paymentInfo.swiftCode}</p>
                                        <CopyButton value={paymentInfo.swiftCode} label="Swift Code" isDark={isDark} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className={cn("text-[10px] uppercase tracking-widest font-bold opacity-30", isDark ? "text-white" : "text-black")}>IBAN</span>
                                <div className="flex items-center justify-between gap-2 overflow-hidden">
                                    <p className={cn("text-[13px] font-mono font-medium truncate", isDark ? "text-white" : "text-black")}>{paymentInfo.iban}</p>
                                    <CopyButton value={paymentInfo.iban} label="IBAN" isDark={isDark} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={cn(
                    "flex flex-col gap-3 px-6 py-6 border-t",
                    isDark ? "border-[#333] bg-[#1a1a1c]" : "border-[#ebebf5] bg-[#fafafa]"
                )}>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleMarkAsPaid}
                            className={cn(
                                "flex-1 flex items-center justify-center py-3 rounded-xl text-[14px] font-bold transition-all",
                                isDark ? "bg-white text-black hover:bg-[#ddd]" : "bg-[#1c1c1e] text-white hover:bg-black"
                            )}
                        >
                            I've paid
                        </button>
                        <button 
                            onClick={onClose}
                            className={cn(
                                "flex-1 flex items-center justify-center py-3 rounded-xl text-[14px] font-bold transition-all",
                                isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#333] text-white hover:bg-[#444]"
                            )}
                        >
                            Pay later
                        </button>
                    </div>

                    <p className={cn("text-[10.5px] text-center opacity-30 font-medium mt-1", isDark ? "text-white" : "text-black")}>
                        All bank details are confidential and securely handled.
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}
