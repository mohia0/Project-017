"use client";

import React from 'react';
import { X, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

interface BankTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMarkAsPaid: () => void;
    amountDue: string | number;
}

export function BankTransferModal({ 
    isOpen, 
    onClose, 
    onMarkAsPaid,
    amountDue 
}: BankTransferModalProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    if (!isOpen) return null;

    // Dummy payment data as requested by user
    const paymentInfo = {
        bankName: "BANK OF ALEXANDRIA S A E",
        name: "Mohi Eldeen Hassan Mohamed Hassan",
        accountNumber: "311146782001",
        swiftCode: "ALEXEGCXXXX",
        iban: "EG980005301100000311146782001"
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
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

                    <div className={cn(
                        "rounded-xl border p-4 space-y-3",
                        isDark ? "bg-[#111] border-[#333]" : "bg-[#f9f9f9] border-[#e2e2e2]"
                    )}>
                        <div className="space-y-1">
                            <span className={cn("text-[10px] uppercase tracking-widest font-bold opacity-30", isDark ? "text-white" : "text-black")}>Bank Name</span>
                            <p className={cn("text-[13px] font-semibold", isDark ? "text-white" : "text-black")}>{paymentInfo.bankName}</p>
                        </div>
                        
                        <div className="space-y-1">
                            <span className={cn("text-[10px] uppercase tracking-widest font-bold opacity-30", isDark ? "text-white" : "text-black")}>Account Name</span>
                            <p className={cn("text-[13px] font-semibold", isDark ? "text-white" : "text-black")}>{paymentInfo.name}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className={cn("text-[10px] uppercase tracking-widest font-bold opacity-30", isDark ? "text-white" : "text-black")}>Account Number</span>
                                <p className={cn("text-[13px] font-mono font-medium", isDark ? "text-white" : "text-black")}>{paymentInfo.accountNumber}</p>
                            </div>
                            <div className="space-y-1">
                                <span className={cn("text-[10px] uppercase tracking-widest font-bold opacity-30", isDark ? "text-white" : "text-black")}>Swift Code</span>
                                <p className={cn("text-[13px] font-mono font-medium", isDark ? "text-white" : "text-black")}>{paymentInfo.swiftCode}</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className={cn("text-[10px] uppercase tracking-widest font-bold opacity-30", isDark ? "text-white" : "text-black")}>IBAN</span>
                            <div className="flex items-center justify-between">
                                <p className={cn("text-[13px] font-mono font-medium truncate pr-2", isDark ? "text-white" : "text-black")}>{paymentInfo.iban}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={cn(
                    "flex flex-col gap-3 px-6 py-6 border-t",
                    isDark ? "border-[#333] bg-[#1a1a1c]" : "border-[#ebebf5] bg-[#fafafa]"
                )}>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => {
                                onMarkAsPaid();
                                onClose();
                            }}
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
                </div>
            </div>
        </div>
    );
}
