"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentDesign } from '@/types/design';

interface PayPalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMarkAsPaid: () => void;
    email: string;
    amount: number | string;
    currency?: string;
    invoiceNumber?: string;
    design?: Partial<DocumentDesign>;
}

// Official PayPal SVG logo mark
function PayPalLogo({ size = 24 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.067 7.301c.19-1.27-.001-2.134-.657-2.918C18.686 3.474 17.19 3 15.309 3H9.68a.896.896 0 0 0-.888.76L6.656 18.898a.54.54 0 0 0 .533.624h3.88l-.274 1.74a.472.472 0 0 0 .466.546h3.277a.785.785 0 0 0 .776-.665l.032-.167.615-3.899.04-.215a.785.785 0 0 1 .776-.665h.489c3.162 0 5.637-1.285 6.358-5.002.302-1.55.146-2.843-.653-3.754a3.117 3.117 0 0 0-.905-.64z" fill="#009CDE"/>
            <path d="M20.067 7.301c.19-1.27-.001-2.134-.657-2.918C18.686 3.474 17.19 3 15.309 3H9.68a.896.896 0 0 0-.888.76L6.656 18.898a.54.54 0 0 0 .533.624h3.88l.974-6.175-.03.194a.896.896 0 0 1 .887-.76h1.848c3.63 0 6.473-1.476 7.303-5.746.025-.126.046-.25.065-.371a4.416 4.416 0 0 0-.049-.363z" fill="#012169"/>
            <path d="M10.278 7.332a.785.785 0 0 1 .776-.665h4.922c.583 0 1.128.038 1.624.118.142.023.28.05.414.08.134.03.263.064.388.102.063.019.124.039.184.06.24.083.461.183.663.3.19-1.27-.001-2.134-.657-2.918C17.686 3.474 16.19 3 14.309 3H8.68a.896.896 0 0 0-.888.76L5.656 18.898a.54.54 0 0 0 .533.624h3.88l.974-6.175.235-1.493.998-6.343.002-.18z" fill="#003087"/>
        </svg>
    );
}

export function PayPalModal({
    isOpen,
    onClose,
    onMarkAsPaid,
    email,
    amount,
    currency = 'USD',
    invoiceNumber = '',
    design = {}
}: PayPalModalProps) {
    const isDark = design.actionTheme ? design.actionTheme === 'dark' : false;
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => { setMounted(true); }, []);

    if (!isOpen || !mounted) return null;

    // Ensure amount has no commas and is strictly a decimal string
    const safeAmount = Number(amount).toFixed(2);
    const safeEmail = encodeURIComponent(email.trim());
    const itemName = encodeURIComponent(`Invoice ${invoiceNumber || ''}`.trim());
    
    const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${safeEmail}&amount=${safeAmount}&currency_code=${currency}&item_name=${itemName}&charset=utf-8&no_shipping=1`;

    const handlePay = () => {
        window.open(paypalUrl, '_blank');
    };

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className={cn(
                "relative w-full max-w-[460px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                isDark ? "bg-[#1c1c1e] text-white" : "bg-white text-[#111]"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-2">
                    <h2 className={cn("text-[17px] font-bold tracking-tight", isDark ? "text-white" : "text-black")}>
                        Pay with PayPal
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
                <div className="px-6 py-4 space-y-4">
                    <p className={cn("text-[13px] opacity-60 leading-relaxed font-medium", isDark ? "text-white" : "text-black")}>
                        You'll be redirected to PayPal to complete your payment securely.
                    </p>

                    {/* PayPal Info Card */}
                    <div className={cn(
                        "rounded-xl border p-4 space-y-4",
                        isDark ? "bg-[#111] border-[#003087]/40" : "bg-[#f0f4ff] border-[#003087]/20"
                    )}>
                        {/* Brand row */}
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0",
                                isDark ? "bg-[#1a2a4a]" : "bg-white"
                            )}>
                                <PayPalLogo size={22} />
                            </div>
                            <div>
                                <div className={cn("text-[12px] font-bold uppercase tracking-widest opacity-40", isDark ? "text-white" : "text-black")}>
                                    PayPal
                                </div>
                                <div className={cn("text-[13px] font-semibold", isDark ? "text-white" : "text-black")}>
                                    {email}
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className={cn("w-full h-px", isDark ? "bg-white/5" : "bg-black/5")} />

                        {/* Amount */}
                        <div className="flex items-center justify-between">
                            <span className={cn("text-[11px] uppercase tracking-widest font-bold opacity-30", isDark ? "text-white" : "text-black")}>
                                Amount Due
                            </span>
                            <span className={cn("text-[18px] font-black tabular-nums", isDark ? "text-white" : "text-black")}>
                                {currency} {safeAmount}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={cn(
                    "flex flex-col gap-3 px-6 py-6 border-t",
                    isDark ? "border-[#333] bg-[#1a1a1c]" : "border-[#ebebf5] bg-[#fafafa]"
                )}>
                    <button
                        onClick={handlePay}
                        className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-[14px] font-bold transition-all bg-[#003087] hover:bg-[#002070] text-white shadow-lg shadow-[#003087]/20 hover:shadow-[#003087]/30 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <PayPalLogo size={18} />
                        Pay with PayPal
                        <ExternalLink size={14} className="opacity-60" />
                    </button>

                    <button
                        onClick={onClose}
                        className={cn(
                            "w-full flex items-center justify-center py-3 rounded-xl text-[13px] font-bold transition-all",
                            isDark ? "bg-white/5 hover:bg-white/10 text-white/60" : "bg-black/5 hover:bg-black/10 text-black/60"
                        )}
                    >
                        Pay later
                    </button>

                    <p className={cn("text-[10.5px] text-center opacity-30 font-medium", isDark ? "text-white" : "text-black")}>
                        You'll be redirected to PayPal's secure checkout.
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}
