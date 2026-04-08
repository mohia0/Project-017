import React from 'react';
import { Download, ArrowDownToLine, Printer, Check, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { DocumentDesign } from '@/types/design';

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
    design?: Partial<DocumentDesign>;
}

// simple contrast checker to ensure text is readable
const getTextColor = (hexColor: string) => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) || 0;
    const g = parseInt(hex.substr(2, 2), 16) || 0;
    const b = parseInt(hex.substr(4, 2), 16) || 0;
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
};

export function ClientActionBar({
    type = 'proposal',
    status = 'Draft',
    onAccept,
    onDecline,
    onDownloadPDF,
    onPrint,
    onViewReceipt,
    onPay,
    isMobile,
    inline,
    className,
    amountDue,
    paidAt,
    design = {}
}: ClientActionBarProps & { onPay?: () => void }) {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const isAccepted = status === 'Accepted' || status === 'Paid';
    const isPending = status === 'Pending';
    const isInvoice = type === 'invoice';

    // Capitalize type for display labels
    const displayType = type.charAt(0).toUpperCase() + type.slice(1);

    const buttonBgColor = design.actionButtonColor || '#111111';
    const buttonTextColor = getTextColor(buttonBgColor);
    const marginTop = design.actionButtonMarginTop ?? 16;
    const marginBottom = design.actionButtonMarginBottom ?? 16;

    // Dynamic radius calculations
    const radius = design.borderRadius ?? 16;
    const isFullRadius = radius >= 30; // Treat as rounded-full if high value
    const parentRadiusStyle = isFullRadius ? { borderRadius: '9999px' } : { borderRadius: `${radius}px` };
    const innerRadiusStyle = isFullRadius ? { borderRadius: '9999px' } : { borderRadius: `${Math.max(0, radius - 4)}px` };
    const buttonRadiusStyle = isFullRadius ? { borderRadius: '9999px' } : { borderRadius: `${Math.max(0, radius - 6)}px` };

    if (isInvoice) {
        return (
            <div 
                className={cn(
                    "relative w-full max-w-[850px] mx-auto z-10 flex items-center transition-all",
                    inline 
                        ? (isMobile ? "flex-row justify-between px-6 gap-2" : "flex-col md:flex-row md:justify-between items-center gap-3 md:gap-0") 
                        : cn("absolute inset-x-0 w-full z-50 flex pointer-events-none",
                             isMobile ? "top-14 flex-col items-center gap-2 px-6 shadow-xl" : "top-6 max-w-[850px] mx-auto justify-between px-4"),
                    className
                )}
                style={inline ? { marginTop: `${marginTop}px`, marginBottom: `${marginBottom}px` } : undefined}
            >
                {/* Left Status Pill */}
                <div 
                    className={cn(
                        "flex items-center gap-2 shadow-sm border backdrop-blur-md transition-all",
                        isMobile ? "px-3 py-1.5" : "px-4 py-2.5",
                        !inline && "pointer-events-auto",
                        isDark ? "bg-[#111]/80 border-[#333] text-white" : "bg-white text-[#111] border-[#eaeaea]"
                    )}
                    style={parentRadiusStyle}
                >
                    {status === 'Paid' ? (
                        <>
                            <Check size={16} strokeWidth={2.5} className="text-emerald-500" />
                            <span className="text-[13px] font-semibold">Invoice paid on {paidAt || 'today'}</span>
                        </>
                    ) : (
                        <div className="flex flex-row items-baseline gap-2">
                            <span className={cn("font-medium opacity-50 uppercase tracking-wider", isMobile ? "text-[9px]" : "text-[10px]")}>
                                {isMobile ? (isAccepted ? 'Paid' : 'Due') : (isAccepted ? 'Paid' : 'Due')}:
                            </span>
                            <span className={cn("font-bold leading-none", isDark ? "text-white" : "text-[#111]", isMobile ? "text-[14px]" : "text-[16px]")}>
                                {amountDue || (isDark ? '—' : '0.00')}
                            </span>
                            {status === 'Draft' && !isMobile && (
                                <span className={cn("text-[9px] opacity-40 font-medium whitespace-nowrap ml-2 py-0.5 px-1.5 rounded-md border", isDark ? "border-white/10 bg-white/5" : "border-black/5 bg-black/5")}>Draft</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Action Icons Pill */}
                <div 
                    className={cn(
                        "flex items-center shadow-sm border backdrop-blur-md transition-all shrink-0",
                        isMobile ? "gap-1 p-1" : "gap-1.5 p-1.5",
                        !inline && "pointer-events-auto",
                        isDark ? "bg-[#111]/80 border-[#333] text-[#ccc]" : "bg-white border-[#eaeaea] text-[#555]"
                    )}
                    style={parentRadiusStyle}
                >
                    <div className="flex items-center gap-0.5 px-1.5">
                        <button onClick={onDownloadPDF} style={innerRadiusStyle} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <ArrowDownToLine size={15} />
                        </button>
                        <button onClick={onPrint} style={innerRadiusStyle} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <Printer size={15} />
                        </button>
                    </div>

                    {status === 'Paid' ? (
                        <>
                            <div className={cn("w-px h-4 mx-1", isDark ? "bg-white/10" : "bg-black/10")} />
                                <button 
                                    onClick={onViewReceipt}
                                    className={cn(
                                        "font-medium hover:opacity-70 transition-opacity whitespace-nowrap",
                                        isMobile ? "px-2 py-1 text-[10px]" : "px-4 py-1.5 text-[12px]",
                                        isDark ? "text-white" : "text-[#111]"
                                    )}
                                >
                                    View receipt
                                </button>
                        </>
                    ) : status !== 'Draft' && (
                        <button 
                            onClick={onPay}
                            className={cn(
                                "flex items-center font-bold transition-all active:scale-95 whitespace-nowrap",
                                isMobile ? "gap-1 px-3 py-1.5 text-[11px]" : "gap-2 px-4 py-2 text-[13px] ml-1",
                                isDark ? "bg-[#4dbf39] text-black hover:bg-[#59d044]" : "bg-black text-white hover:bg-[#222]"
                            )}
                            style={buttonRadiusStyle}
                        >
                            <ArrowRight size={isMobile ? 12 : 14} strokeWidth={3} />
                            Pay now
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (isAccepted) {
        return (
            <div 
                className={cn(
                    "relative w-full max-w-[850px] mx-auto z-10 flex transition-all",
                    inline 
                        ? (isMobile ? "flex-row justify-between px-6 items-center" : "justify-between")
                        : cn("absolute inset-x-0 w-full z-50 flex pointer-events-none",
                           isMobile ? "top-14 flex-col items-center gap-2 px-6" : "top-6 max-w-[850px] mx-auto justify-between px-4"),
                    className
                )}
                style={inline ? { marginTop: `${marginTop}px`, marginBottom: `${marginBottom}px` } : undefined}
            >
                {/* Left Status Pill */}
                <div 
                    className={cn(
                        "flex items-center gap-2 shadow-sm border backdrop-blur-md",
                        isMobile ? "px-3 py-1.5" : "px-4 py-2.5",
                        !inline && "pointer-events-auto",
                        isDark ? "bg-[#111]/80 border-[#333] text-white" : "bg-white/80 border-[#eaeaea] text-[#111]"
                    )}
                    style={parentRadiusStyle}
                >
                    <Check size={isMobile ? 14 : 16} strokeWidth={2.5} />
                    <span className={cn("font-semibold", isMobile ? "text-[11px]" : "text-[13px]")}>{displayType} manually approved</span>
                </div>

                {/* Right Action Icons Pill */}
                <div 
                    className={cn(
                        "flex items-center shadow-sm border backdrop-blur-md",
                        isMobile ? "gap-1 px-2 py-1" : "gap-1.5 px-3 py-2",
                        !inline && "pointer-events-auto",
                        isDark ? "bg-[#111]/80 border-[#333] text-[#ccc]" : "bg-white/80 border-[#eaeaea] text-[#555]"
                    )}
                    style={parentRadiusStyle}
                >
                    <button onClick={onDownloadPDF} style={innerRadiusStyle} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <ArrowDownToLine size={isMobile ? 13 : 15} />
                    </button>
                    <button onClick={onPrint} style={innerRadiusStyle} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <Printer size={isMobile ? 13 : 15} />
                    </button>
                </div>
            </div>
        );
    }

    // Default Center Layout
    return (
        <div 
            className={cn(
                "relative w-full max-w-[850px] mx-auto z-10 flex justify-center transition-all",
                inline ? (isMobile ? "px-6" : "") :
                cn("absolute inset-x-0 w-full z-50 flex justify-center pointer-events-none",
                   isMobile ? "top-14 px-6" : "top-6 px-4"),
                className
            )}
            style={inline ? { marginTop: `${marginTop}px`, marginBottom: `${marginBottom}px` } : undefined}
        >
            <div 
                className={cn(
                    "flex items-center shadow-lg border backdrop-blur-xl transition-all w-max max-w-full overflow-hidden",
                    isMobile ? "gap-1 p-1" : "gap-2 p-1.5",
                    !inline && "pointer-events-auto",
                    isDark ? "bg-[#1f1f1f]/80 border-[#333]" : "bg-white/90 border-[#eaeaea]"
                )}
                style={parentRadiusStyle}
            >
                {/* Icons */}
                <div className={cn(
                    "flex items-center px-1", 
                    isMobile ? "gap-0" : "gap-0.5 px-2",
                    isDark ? "text-[#ccc]" : "text-[#777]"
                )}>
                    <button onClick={onDownloadPDF} style={innerRadiusStyle} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <ArrowDownToLine size={isMobile ? 16 : 18} strokeWidth={1.75} />
                    </button>
                    <button onClick={onPrint} style={innerRadiusStyle} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <Printer size={isMobile ? 16 : 18} strokeWidth={1.75} />
                    </button>
                </div>

                <div className={cn(isMobile ? "w-px h-5 mx-0.5" : "w-px h-6 mx-1", isDark ? "bg-white/10" : "bg-black/10")} />

                <button 
                    onClick={onDecline}
                    className={cn(
                        "font-medium transition-colors whitespace-nowrap",
                        isMobile ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-[14px]",
                        isDark ? "text-[#aaa] hover:text-white hover:bg-white/5" : "text-[#777] hover:text-black hover:bg-black/5"
                    )}
                    style={buttonRadiusStyle}
                >
                    Decline
                </button>
                <button 
                    onClick={onAccept}
                    className={cn(
                        "font-semibold shadow-sm transition-all active:scale-95 whitespace-nowrap",
                        isMobile ? "px-4 py-2 text-[11px]" : "px-5 py-2.5 text-[14px]",
                        isDark ? "hover:opacity-90" : "hover:shadow-lg hover:-translate-y-0.5"
                    )}
                    style={{ ...buttonRadiusStyle, backgroundColor: buttonBgColor, color: buttonTextColor }}
                >
                    {isMobile ? 'Accept' : `Accept ${displayType}`}
                </button>
            </div>
        </div>
    );
}
