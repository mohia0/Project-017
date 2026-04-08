import React from 'react';
import { Download, ArrowDownToLine, Printer, Check, AlertTriangle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { Tooltip } from '@/components/ui/Tooltip';

export type DocumentType = 'proposal' | 'invoice' | 'document';
export type DocumentStatus = 'Draft' | 'Pending' | 'Accepted' | 'Declined' | 'Paid';

interface ClientActionBarProps {
    type?: DocumentType;
    status?: DocumentStatus;
    onAccept?: () => void;
    onDecline?: () => void;
    onDownloadPDF?: () => void;
    onPrint?: () => void;
    onViewReceipt?: () => void;
    isMobile?: boolean;
    inline?: boolean;
    className?: string;
    amountDue?: string | number;
    paidAt?: string;
}

export function ClientActionBar({
    type = 'proposal',
    status = 'Draft',
    onAccept,
    onDecline,
    onDownloadPDF,
    onPrint,
    onViewReceipt,
    isMobile,
    inline,
    className,
    amountDue,
    paidAt
}: ClientActionBarProps) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const isAccepted = status === 'Accepted' || status === 'Paid';
    const isInvoice = type === 'invoice';

    // Capitalize type for display labels
    const displayType = type.charAt(0).toUpperCase() + type.slice(1);

    if (isInvoice) {
        return (
            <div className={cn(
                inline ? "relative w-full max-w-[850px] mx-auto z-10 flex flex-col md:flex-row md:justify-between items-center py-4 mb-4 gap-3 md:gap-0" :
                cn("absolute inset-x-0 w-full z-50 flex pointer-events-none",
                   isMobile ? "top-14 flex-col items-center gap-2 px-4" : "top-6 max-w-[850px] mx-auto justify-between px-4"),
                className
            )}>
                {/* Left Status Pill */}
                <div className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-full shadow-sm border backdrop-blur-md",
                    !inline && "pointer-events-auto",
                    isDark ? "bg-[#111]/80 border-[#333] text-white" : "bg-white/80 border-[#eaeaea] text-[#111]"
                )}>
                    {status === 'Paid' ? (
                        <>
                            <Check size={16} strokeWidth={2.5} className="text-emerald-500" />
                            <span className="text-[13px] font-semibold">Invoice paid on {paidAt || 'today'}</span>
                        </>
                    ) : status === 'Draft' ? (
                        <>
                            <AlertTriangle size={16} className="text-amber-500" />
                            <span className="text-[13px] font-semibold">This is a draft invoice and can't be paid yet</span>
                        </>
                    ) : (
                        <span className="text-[13px] font-medium opacity-80">
                            Amount due: <span className="font-bold ml-1">${amountDue || '0.00'}</span>
                        </span>
                    )}
                </div>

                {/* Right Action Icons Pill */}
                <div className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-full shadow-sm border backdrop-blur-md",
                    !inline && "pointer-events-auto",
                    isDark ? "bg-[#111]/80 border-[#333] text-[#ccc]" : "bg-white/80 border-[#eaeaea] text-[#555]"
                )}>
                    <Tooltip content="Download PDF" side="top" delay={0.1}>
                        <button onClick={onDownloadPDF} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <ArrowDownToLine size={15} />
                        </button>
                    </Tooltip>
                    <Tooltip content="Print" side="top" delay={0.1}>
                        <button onClick={onPrint} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <Printer size={15} />
                        </button>
                    </Tooltip>
                    {status === 'Paid' && (
                        <>
                            <div className={cn("w-px h-4 mx-1", isDark ? "bg-white/10" : "bg-black/10")} />
                            <button 
                                onClick={onViewReceipt}
                                className={cn(
                                    "px-2 py-1 text-[12px] font-medium hover:opacity-70 transition-opacity",
                                    isDark ? "text-white" : "text-[#111]"
                                )}
                            >
                                View receipt
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (isAccepted) {
        return (
            <div className={cn(
                inline ? "relative w-full max-w-[850px] mx-auto z-10 flex justify-between py-4 mb-4" :
                cn("absolute inset-x-0 w-full z-50 flex pointer-events-none",
                   isMobile ? "top-14 flex-col items-center gap-2 px-4" : "top-6 max-w-[850px] mx-auto justify-between px-4"),
                className
            )}>
                {/* Left Status Pill */}
                <div className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-full shadow-sm border backdrop-blur-md",
                    !inline && "pointer-events-auto",
                    isDark ? "bg-[#111]/80 border-[#333] text-white" : "bg-white/80 border-[#eaeaea] text-[#111]"
                )}>
                    <Check size={16} strokeWidth={2.5} />
                    <span className="text-[13px] font-semibold">{displayType} manually approved</span>
                </div>

                {/* Right Action Icons Pill */}
                <div className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-full shadow-sm border backdrop-blur-md",
                    !inline && "pointer-events-auto",
                    isDark ? "bg-[#111]/80 border-[#333] text-[#ccc]" : "bg-white/80 border-[#eaeaea] text-[#555]"
                )}>
                    <Tooltip content="Download PDF" side="top" delay={0.1}>
                        <button onClick={onDownloadPDF} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <ArrowDownToLine size={15} />
                        </button>
                    </Tooltip>
                    <Tooltip content="Print" side="top" delay={0.1}>
                        <button onClick={onPrint} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <Printer size={15} />
                        </button>
                    </Tooltip>
                </div>
            </div>
        );
    }

    // Default Center Layout
    return (
        <div className={cn(
            inline ? "relative w-full max-w-[850px] mx-auto z-10 flex justify-center py-4 mb-4" :
            cn("absolute inset-x-0 w-full z-50 flex justify-center pointer-events-none",
               isMobile ? "top-14 px-2" : "top-6 px-4"),
            className
        )}>
            <div className={cn(
                "flex items-center gap-2 p-1.5 rounded-full shadow-lg border backdrop-blur-xl transition-all w-max max-w-full overflow-hidden",
                !inline && "pointer-events-auto",
                isDark ? "bg-[#1f1f1f]/80 border-[#333]" : "bg-white/90 border-[#eaeaea]",
                isMobile && "scale-[0.85] origin-top"
            )}>
                {/* Icons */}
                <div className={cn(
                    "flex items-center gap-0.5 px-2", 
                    isDark ? "text-[#ccc]" : "text-[#777]"
                )}>
                    <Tooltip content="Download PDF" side="top" delay={0.1}>
                        <button onClick={onDownloadPDF} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <ArrowDownToLine size={18} strokeWidth={1.75} />
                        </button>
                    </Tooltip>
                    <Tooltip content="Print" side="top" delay={0.1}>
                        <button onClick={onPrint} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <Printer size={18} strokeWidth={1.75} />
                        </button>
                    </Tooltip>
                </div>

                <div className={cn("w-px h-6 mx-1", isDark ? "bg-white/10" : "bg-black/10")} />

                <button 
                    onClick={onDecline}
                    className={cn(
                        "px-4 py-2 text-[14px] font-medium rounded-full transition-colors",
                        isDark ? "text-[#aaa] hover:text-white hover:bg-white/5" : "text-[#777] hover:text-black hover:bg-black/5"
                    )}
                >
                    Decline
                </button>
                <button 
                    onClick={onAccept}
                    className={cn(
                        "px-5 py-2.5 text-[14px] font-semibold rounded-full shadow-sm transition-all active:scale-95 text-white",
                        isDark ? "hover:opacity-90" : "hover:shadow-lg hover:-translate-y-0.5"
                    )}
                    style={{ backgroundColor: 'var(--primary-color)' }}
                >
                    Accept {displayType}
                </button>
            </div>
        </div>
    );
}
