"use client";

import React, { useState, useEffect } from 'react';
import {
    X, Bell, Mail, Phone, MapPin, Building2, Hash,
    FileText, Pencil, Save, Trash2, Check, ExternalLink, FileSignature,
    Globe, Briefcase, Users, ChevronRight, Eye, Search, Receipt, Image as ImageIcon, Zap, ClipboardList, AlertCircle, Info, Calendar as CalendarIcon, Palette, HelpCircle, ShieldCheck, UserPlus
} from 'lucide-react';
import ImageUploadModal from '@/components/modals/ImageUploadModal';
import { cn } from '@/lib/utils';
import { AppLoader } from '@/components/ui/AppLoader';
import { SectionTemplateBrowser } from '@/components/templates/SectionTemplateBrowser';
import { useUIStore } from '@/store/useUIStore';
import { useClientStore } from '@/store/useClientStore';
import { useCompanyStore } from '@/store/useCompanyStore';
import { useProposalStore } from '@/store/useProposalStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { CompanyPicker } from '@/components/companies/CompanyPicker';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { CountryPicker } from '@/components/ui/CountryPicker';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useHookStore, Hook } from '@/store/useHookStore';
import { useFormStore } from '@/store/useFormStore';
import { formatDistanceToNow, format } from 'date-fns';
import { useRouter, usePathname } from 'next/navigation';
import { Copy } from 'lucide-react';
import { appToast } from '@/lib/toast';
import { SendEmailModal } from '@/components/modals/SendEmailModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { useRolesStore } from '@/store/useRolesStore';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { usePermissions } from '@/hooks/usePermissions';

const COLORS = [
    '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9',
    '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316',
];

function HelpTip({ content, isDark }: { content: React.ReactNode; isDark: boolean }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative flex items-center justify-center">
            <button
                type="button"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                className={cn('opacity-30 hover:opacity-70 transition-opacity cursor-help', isDark ? 'text-white' : 'text-black')}
            >
                <HelpCircle size={14} />
            </button>
            {show && (
                <div className={cn(
                    'absolute bottom-full right-0 mb-2 w-56 px-3 py-2 rounded-xl text-xs font-normal shadow-xl z-50 pointer-events-none whitespace-normal text-left tracking-normal',
                    isDark ? 'bg-[#222] text-white/80 border border-white/10' : 'bg-white text-black/70 border border-black/10'
                )}>
                    {content}
                </div>
            )}
        </div>
    );
}

/* ─── Shared helpers ─── */
function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function PanelHeader({ title, icon: Icon, isDark, onClose, onAction, actionIcon: ActionIcon }: { 
    title: string; 
    icon?: any;
    isDark: boolean; 
    onClose: () => void;
    onAction?: () => void;
    actionIcon?: any;
}) {

    return (
        <div className={cn(
            "flex items-center justify-between px-4 py-3 border-b shrink-0",
            isDark ? "border-[#222]" : "border-[#e4e4e4]"
        )}>
            <div className="flex items-center gap-2">
                {Icon && (
                    <Icon 
                        size={14} 
                        className="text-primary" 
                        fill={Icon === Zap || Icon === Bell || Icon === Users ? "currentColor" : "none"} 
                    />
                )}
                <span className={cn("text-[13px] font-semibold", isDark ? "text-[#e5e5e5]" : "text-[#111]")}>{title}</span>
            </div>
            <div className="flex items-center gap-1">
                {onAction && ActionIcon && (
                    <button
                        onClick={onAction}
                        className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center transition-colors",
                            isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#aaa] hover:text-[#555] hover:bg-[#f0f0f0]"
                        )}
                    >
                        <ActionIcon size={13} strokeWidth={2} />
                    </button>
                )}
                

                <button
                    onClick={onClose}
                    className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center transition-colors",
                        isDark ? "text-[#555] hover:text-[#aaa] hover:bg-white/5" : "text-[#aaa] hover:text-[#555] hover:bg-[#f0f0f0]"
                    )}
                >
                    <X size={13} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}

/* ─── Notifications Panel ─── */
function NotificationsPanel({ isDark }: { isDark: boolean }) {
    const router = useRouter();
    const { toggleNotifications } = useUIStore();
    const { notifications, fetchNotifications, subscribe, unsubscribe, markAsRead, markAllAsRead, updateNotification, deleteNotification } = useNotificationStore();
    const [filterUnread, setFilterUnread] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [receiptModal, setReceiptModal] = useState<{ isOpen: boolean; metadata?: Record<string, any>; notificationId?: string }>({ isOpen: false });
    const [verifyLoading, setVerifyLoading] = useState<Record<string, boolean>>({});

    const handleVerifyPayment = (notif: any, action: 'Paid' | 'Pending') => {
        const invoiceId = notif.metadata?.invoice_id;
        if (!invoiceId) return;

        // Optimistically update the notification to dismiss it and provide instant feedback
        updateNotification(notif.id, {
            title: action === 'Paid' ? 'Payment Confirmed ✓' : 'Reverted to Pending',
            message: action === 'Paid'
                ? 'Invoice marked as Paid. Receipt is being sent.'
                : 'Invoice status has been reverted to Pending.',
            read: true,
            type: action === 'Paid' ? 'success' : 'info',
            metadata: undefined,
        });

        // Process background actions (DB update & Email) without keeping the UI waiting
        (async () => {
            try {
                const { useInvoiceStore } = await import('@/store/useInvoiceStore');
                await useInvoiceStore.getState().updateInvoice(invoiceId, { status: action }, { forceReceipt: action === 'Paid' });
            } catch (err) {
                console.error('Verify payment background failed:', err);
            }
        })();
    };

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const displayNotifications = filterUnread ? notifications.filter(n => !n.read) : notifications;
    
    const filteredNotifications = displayNotifications.filter(n => 
        (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (n.message || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header Actions */}
            <div className={cn("px-4 py-2.5 flex items-center justify-between border-b shrink-0", isDark ? "border-[#252525]" : "border-[#f0f0f0]")}>
                <div className="flex items-center gap-2">
                    <span className={cn("text-[11px] font-bold tracking-tight uppercase", isDark ? "text-[#555]" : "text-[#bbb]")}>
                        {notifications.filter(n => !n.read).length} Unread
                    </span>
                </div>
                {notifications.some(n => !n.read) && (
                    <button 
                        onClick={markAllAsRead}
                        className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all active:scale-95 group",
                            isDark 
                                ? "hover:bg-white/[0.03] text-[#666] hover:text-white" 
                                : "hover:bg-black/[0.03] text-[#999] hover:text-black"
                        )}
                    >
                        <Check size={11} strokeWidth={3} className={cn(
                            "transition-colors",
                            isDark ? "text-[#444] group-hover:text-primary" : "text-[#ccc] group-hover:text-primary"
                        )} />
                        <span className="text-[10px] font-semibold">Mark all as read</span>
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto w-full">
                {filteredNotifications.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            isDark ? "bg-white/5" : "bg-[#f0f0f0]"
                        )}>
                            <Bell size={18} strokeWidth={1.5} className={isDark ? "text-[#555]" : "text-[#bbb]"} />
                        </div>
                        <p className={cn("text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>
                            {searchQuery ? 'No matching notifications' : 'No notifications yet'}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <AnimatePresence initial={false} mode="popLayout">
                            {filteredNotifications.map((notif, index) => (
                                <motion.div 
                                    key={notif.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                                    transition={{
                                        layout: { type: "spring", stiffness: 500, damping: 40 },
                                        opacity: { duration: 0.2 }
                                    }}
                                    className={cn(
                                        "flex flex-col gap-0 border-b last:border-0 transition-colors relative group/row",
                                        isDark ? "border-[#252525]" : "border-[#f0f0f0]",
                                        !notif.read && notif.type === 'receipt_pending' && "animate-soft-blink",
                                        !notif.read && notif.type !== 'receipt_pending' && (isDark ? "bg-white/[0.08]" : "bg-blue-500/[0.05]")
                                    )}
                                >
                                        <div
                                            onClick={() => {
                                                if (notif.link && notif.type !== 'receipt_pending') {
                                                    router.push(notif.link);
                                                    toggleNotifications();
                                                    if (!notif.read) markAsRead(notif.id);
                                                } else if (notif.type === 'receipt_pending' && notif.read === false) {
                                                    // Do not toggle notifications for receipt pending action unless it's read
                                                } else {
                                                    if (!notif.read) markAsRead(notif.id);
                                                }
                                            }}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                if (!notif.read) markAsRead(notif.id);
                                            }}
                                            className={cn(
                                                "flex items-start gap-1.5 pl-2 pr-1.5 py-2.5 cursor-pointer relative",
                                                notif.type !== 'receipt_pending' && (isDark ? "hover:bg-white/[0.02]" : "hover:bg-[#f9f9f9]")
                                            )}
                                        >
                                            <div 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!notif.read) markAsRead(notif.id);
                                                }}
                                                className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity", 
                                                isDark ? "bg-[#222]" : "bg-[#f0f0f0]"
                                            )}>
                                                {(() => {
                                                    const titleLower = notif.title?.toLowerCase() || '';
                                                    const messageLower = notif.message?.toLowerCase() || '';
                                                    
                                                    const isLimitReached = notif.type === 'limit_reached' || titleLower.includes('limit');
                                                    const isView = notif.type === 'view' || titleLower.includes('opened') || titleLower.includes('viewed');
                                                    const isReceiptPending = notif.type === 'receipt_pending';
                                                    
                                                    const isFormResponse = !isView && !isLimitReached && !isReceiptPending && (
                                                        notif.link?.includes('/forms') || 
                                                        titleLower.includes('form') || 
                                                        messageLower.includes('form')
                                                    );
                                                    const isScheduler = !isView && !isLimitReached && !isFormResponse && !isReceiptPending && (
                                                        notif.link?.includes('/schedulers') || 
                                                        titleLower.includes('scheduler') || 
                                                        titleLower.includes('booking') ||
                                                        titleLower.includes('meeting')
                                                    );
                                                    const isProposal = !isView && !isLimitReached && !isFormResponse && !isScheduler && !isReceiptPending && (
                                                        notif.link?.includes('proposal') || 
                                                        titleLower.includes('proposal') || 
                                                        messageLower.includes('proposal')
                                                    );
                                                    const isInvoice = !isView && !isLimitReached && !isFormResponse && !isScheduler && !isProposal && !isReceiptPending && (
                                                        notif.link?.includes('invoice') || 
                                                        titleLower.includes('invoice') || 
                                                        messageLower.includes('invoice')
                                                    );
                                                    const isHook = !isView && !isLimitReached && !isFormResponse && !isScheduler && !isProposal && !isInvoice && !isReceiptPending && (
                                                        notif.type === 'hook' ||
                                                        notif.link?.includes('/hooks') ||
                                                        titleLower.includes('hook')
                                                    );



                                                    const isSuccess = notif.type === 'success' || 
                                                        titleLower.includes('signed') || 
                                                        titleLower.includes('accepted') || 
                                                        titleLower.includes('paid');

                                                    const iconClass = isDark ? "text-[#888]" : "text-[#999]";


                                                    if (isHook) return (
                                                        <Zap 
                                                            size={12} 
                                                            style={{ color: notif.metadata?.color || 'var(--primary)' }} 
                                                            fill="currentColor" 
                                                        />
                                                    );
                                                    if (isLimitReached) return <AlertCircle size={12} className="text-amber-500" />;
                                                    if (isReceiptPending) return <Receipt size={12} className="text-emerald-500" />;
                                                    if (isSuccess) {
                                                    if (isProposal) return <FileSignature size={12} className="text-emerald-500" />;
                                                        if (isInvoice) return <Receipt size={12} className="text-emerald-500" />;
                                                        return <Check size={12} className="text-emerald-500" />;
                                                    }
                                                    if (isFormResponse) return <ClipboardList size={12} className={iconClass} />;
                                                    if (isScheduler) return <CalendarIcon size={12} className={iconClass} />;
                                                    if (isProposal) return <FileSignature size={12} className={iconClass} />;
                                                    if (isInvoice) return <Receipt size={12} className={iconClass} />;
                                                    return <Eye size={12} className={iconClass} />;
                                                })()}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <p className={cn("text-[12px] font-medium leading-tight mb-0.5 truncate", isDark ? "text-[#eee]" : "text-[#222]")}>
                                                    {notif.title}
                                                </p>
                                                {notif.message && (
                                                    <p className={cn("text-[10px] leading-tight opacity-70 truncate", isDark ? "text-[#888]" : "text-[#666]")}>
                                                        {notif.message}
                                                    </p>
                                                )}
                                                <div className="flex items-center justify-between mt-1">
                                                    <p className={cn("text-[9px] font-medium", isDark ? "text-[#444]" : "text-[#aaa]")}>
                                                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                                    </p>
                                                </div>
                                            </div>

                                        {/* Actions Column */}
                                        <div className="flex flex-col items-center gap-1.5 shrink-0 w-3.5">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notif.id);
                                                }}
                                                className="flex items-center justify-center w-3.5 h-3.5 opacity-0 group-hover/row:opacity-100 transition-all active:scale-95"
                                            >
                                                <X 
                                                    size={10} 
                                                    className={cn(
                                                        "transition-colors",
                                                        isDark ? "text-[#444] hover:text-[#888]" : "text-[#ccc] hover:text-[#888]"
                                                    )} 
                                                />
                                            </button>

                                            {notif.metadata?.visitor && (
                                                <Tooltip 
                                                    className="whitespace-normal font-sans"
                                                    content={
                                                        <div className="flex flex-col gap-1 w-[160px]">
                                                            <div className="flex items-center gap-2 border-b border-inherit pb-1.5 mb-0.5">
                                                                {!notif.metadata.visitor.countryCode || notif.metadata.visitor.countryCode === 'local' || notif.metadata.visitor.countryCode === 'unknown' ? (
                                                                    <span className="text-[13px] leading-none">{notif.metadata.visitor.flag}</span>
                                                                ) : (
                                                                    <img 
                                                                        src={`https://flagcdn.com/w20/${notif.metadata.visitor.countryCode.toLowerCase()}.png`} 
                                                                        alt={notif.metadata.visitor.country}
                                                                        className="w-4 h-3 object-cover rounded-[1px] shadow-sm"
                                                                        onError={(e) => {
                                                                            // Fallback to emoji if image fails
                                                                            e.currentTarget.style.display = 'none';
                                                                            const span = e.currentTarget.parentElement?.querySelector('.flag-emoji-fallback') as HTMLElement;
                                                                            if (span) span.style.display = 'inline';
                                                                        }}
                                                                    />
                                                                )}
                                                                {notif.metadata.visitor.countryCode && notif.metadata.visitor.countryCode !== 'local' && notif.metadata.visitor.countryCode !== 'unknown' && (
                                                                    <span className="flag-emoji-fallback text-[13px] leading-none" style={{ display: 'none' }}>
                                                                        {notif.metadata.visitor.flag}
                                                                    </span>
                                                                )}
                                                                <span className="text-[10px] uppercase tracking-wider font-bold truncate leading-none">
                                                                    {notif.metadata.visitor.country}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[9px] leading-tight">
                                                                <span className="opacity-50 font-medium">IP</span>
                                                                <span className="font-mono">{notif.metadata.visitor.ip}</span>
                                                            </div>
                                                            {notif.metadata.visitor.isp && (
                                                                <div className="flex items-center justify-between text-[9px] leading-tight mt-0.5">
                                                                    <span className="opacity-50 font-medium mr-2">ISP</span>
                                                                    <span className="font-semibold text-right truncate flex-1">{notif.metadata.visitor.isp}</span>
                                                                </div>
                                                            )}
                                                            {(notif.metadata?.visitor?.deviceType || notif.metadata?.visitor?.os) && (
                                                                <div className="flex items-center justify-between text-[9px] leading-tight mt-0.5">
                                                                    <span className="opacity-50 font-medium mr-2">System</span>
                                                                    <span className="font-semibold text-right">
                                                                        {notif.metadata.visitor.deviceType === 'Bot' ? '🤖' : 
                                                                         notif.metadata.visitor.deviceType === 'Mobile' ? '📱' : 
                                                                         notif.metadata.visitor.deviceType === 'Tablet' ? '📟' : '🖥️'}
                                                                        {' '}
                                                                        {notif.metadata.visitor.os && notif.metadata.visitor.os !== 'Unknown OS' 
                                                                            ? `${notif.metadata.visitor.os} ${notif.metadata.visitor.deviceType !== 'Desktop' && notif.metadata.visitor.deviceType !== 'Bot' ? `(${notif.metadata.visitor.deviceType})` : ''}`
                                                                            : notif.metadata.visitor.deviceType}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-end justify-between mt-0.5 pt-1.5 border-t border-inherit text-[8px] opacity-70 font-medium whitespace-nowrap">
                                                                <div className="flex flex-col gap-0.5">
                                                                    {notif.metadata.visitor.region && <div>{notif.metadata.visitor.city}, {notif.metadata.visitor.region}</div>}
                                                                    {notif.metadata.visitor.timezone && <div>{notif.metadata.visitor.timezone}</div>}
                                                                </div>
                                                                <div className="flex flex-col text-right pl-3 opacity-90 tracking-tight leading-[1.1]">
                                                                    <div>{format(new Date(notif.created_at), "h:mm a")}</div>
                                                                    <div>{format(new Date(notif.created_at), "MMM d, yyyy")}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    } 
                                                    side="left"
                                                >
                                                    <div className="flex items-center justify-center w-3.5 h-3.5 cursor-help">
                                                        <AlertCircle size={10} className="text-primary/70 hover:text-primary transition-colors" />
                                                    </div>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment verification CTA */}
                                    {notif.type === 'payment_verification' && !notif.read && (
                                        <div className="flex items-center justify-center gap-1 px-3 pb-2.5">
                                            <button
                                                disabled={verifyLoading[notif.id]}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleVerifyPayment(notif, 'Pending');
                                                }}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-[5px] text-[10px] font-semibold transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap",
                                                    isDark
                                                        ? "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 border border-white/5"
                                                        : "bg-black/5 hover:bg-black/10 text-black/50 hover:text-black/80 border border-black/5"
                                                )}
                                            >
                                                Not Yet
                                            </button>
                                            <button
                                                disabled={verifyLoading[notif.id]}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleVerifyPayment(notif, 'Paid');
                                                }}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-3 py-1 rounded-[5px] text-[10px] font-bold transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap",
                                                    isDark
                                                        ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                                )}
                                            >
                                                <Check size={10} strokeWidth={3} className="text-emerald-500" />
                                                {verifyLoading[notif.id] ? 'Verifying…' : 'Collected'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Receipt pending CTA */}
                                    {notif.type === 'receipt_pending' && !notif.read && (
                                        <div className="flex items-center gap-1 px-3 pb-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notif.id);
                                                }}
                                                className={cn(
                                                    "flex-1 flex items-center justify-center py-1 rounded-md text-[9px] font-extrabold transition-all active:scale-95",
                                                    isDark
                                                        ? "bg-white/5 hover:bg-white/10 text-[#555] border border-white/5"
                                                        : "bg-black/5 hover:bg-black/10 text-[#999] border border-black/5"
                                                )}
                                            >
                                                Dismiss
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notif.id);
                                                    setReceiptModal({ isOpen: true, metadata: notif.metadata, notificationId: notif.id });
                                                }}
                                                className={cn(
                                                    "flex-[1.8] flex items-center justify-center gap-1 py-1 rounded-md text-[9px] font-extrabold transition-all active:scale-95",
                                                    isDark
                                                        ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20"
                                                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                                )}
                                            >
                                                <Mail size={9} />
                                                Send Receipt
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className={cn(
                "flex items-center justify-between px-4 py-2 border-t shrink-0 gap-4",
                isDark ? "border-[#252525]" : "border-[#f0f0f0]"
            )}>
                <div className={cn(
                    "flex items-center gap-1.5 flex-1 rounded-full px-2.5 py-1 transition-colors relative group",
                    isDark ? "bg-white/5" : "bg-[#f5f5f5]"
                )}>
                    <Search size={10} className={isDark ? "text-[#555]" : "text-[#aaa]"} />
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search"
                        className={cn(
                            "text-[9px] font-semibold tracking-wide bg-transparent outline-none w-full p-0 leading-normal",
                            isDark ? "text-[#ccc] placeholder:text-[#555]" : "text-[#111] placeholder:text-[#aaa]"
                        )}
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className={cn(
                                "flex items-center justify-center w-3.5 h-3.5 rounded-full transition-colors",
                                isDark ? "hover:bg-white/10 text-[#555] hover:text-[#888]" : "hover:bg-black/5 text-[#ccc] hover:text-[#666]"
                            )}
                        >
                            <X size={8} strokeWidth={3} />
                        </button>
                    )}
                </div>
                
                <div 
                    onClick={() => setFilterUnread(!filterUnread)}
                    className="flex items-center gap-2 cursor-pointer group select-none"
                >
                    <div className={cn(
                        "w-[26px] h-[14px] rounded-full relative transition-all duration-300",
                        filterUnread 
                            ? "bg-primary" 
                            : (isDark ? "bg-white/10" : "bg-[#e5e5e5]")
                    )}>
                        <div className={cn(
                            "absolute top-[2px] w-[10px] h-[10px] rounded-full bg-white shadow-sm transition-all duration-300",
                            filterUnread ? "translate-x-[14px]" : "translate-x-[2px]"
                        )} />
                    </div>
                    <span className={cn(
                        "text-[11px] font-bold transition-colors",
                        filterUnread 
                            ? (isDark ? "text-white" : "text-black")
                            : (isDark ? "text-[#555] group-hover:text-[#888]" : "text-[#ccc] group-hover:text-[#777]")
                    )}>
                        Unread
                    </span>
                </div>
            </div>

            {/* Receipt send modal */}
            {receiptModal.isOpen && receiptModal.metadata && (
                <SendEmailModal
                    isOpen={receiptModal.isOpen}
                    onClose={() => setReceiptModal({ isOpen: false })}
                    templateKey="receipt"
                    to={receiptModal.metadata.to || ''}
                    variables={receiptModal.metadata.variables || {}}
                    workspaceId={receiptModal.metadata.workspace_id || ''}
                    documentTitle="Receipt"
                    onSuccess={() => {
                        if (receiptModal.notificationId) {
                            updateNotification(receiptModal.notificationId, {
                                title: 'Receipt Sent',
                                message: 'The receipt has been successfully sent to the client.',
                                read: true
                            });
                        }
                    }}
                />
            )}
        </div>
    );
}

/* ─── Editable field row ─── */
function Field({
    label, icon, value, editing, onChange, type = 'text', placeholder = '', isDark, textarea = false, isLink = false, children
}: {
    label: string; icon: React.ReactNode; value: string; editing: boolean;
    onChange: (v: string) => void; type?: string; placeholder?: string;
    isDark: boolean; textarea?: boolean; isLink?: boolean; children?: React.ReactNode;
}) {
    if (!value && !editing) return null;
    return (
        <div className={cn(
            "flex gap-3 px-4 py-2.5 transition-colors",
            !editing && (isDark ? "hover:bg-white/[0.02]" : "hover:bg-[#f9f9f9]")
        )}>
            <div className={cn("mt-0.5 shrink-0", isDark ? "text-[#555]" : "text-[#ccc]")}>{icon}</div>
            <div className="min-w-0 flex-1">
                <p className={cn("text-[10px] font-semibold uppercase tracking-wide mb-0.5", isDark ? "text-[#444]" : "text-[#bbb]")}>{label}</p>
                {editing ? (
                    children ? children : (
                        textarea
                            ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder}
                                className={cn("bg-transparent outline-none text-[12px] w-full resize-none border-b pb-0.5",
                                    isDark ? "text-white placeholder:text-[#444] border-[#333]" : "text-[#111] placeholder:text-[#ccc] border-[#e0e0e0]")} />
                            : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                                className={cn("bg-transparent outline-none text-[12px] w-full border-b pb-0.5",
                                    isDark ? "text-white placeholder:text-[#444] border-[#333]" : "text-[#111] placeholder:text-[#ccc] border-[#e0e0e0]")} />
                    )
                ) : isLink && value ? (
                    <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
                        className="text-[12px] text-primary hover:underline flex items-center gap-1 group">
                        {value}<ExternalLink size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                ) : (
                    <p className={cn("text-[12px] break-words", isDark ? "text-[#ccc]" : "text-[#222]")}>{value}</p>
                )}
            </div>
        </div>
    );
}

/* ─── Contact Detail Panel ─── */
function ContactPanel({ id, isDark }: { id: string; isDark: boolean }) {
    const router = useRouter();
    const { clients, updateClient, deleteClient } = useClientStore();
    const { closeRightPanel } = useUIStore();
    const client = clients.find(c => c.id === id);

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');
    const [form, setForm] = useState({ contact_person: '', company_name: '', email: '', phone: '', address: '', country: '', tax_number: '', notes: '', avatar_url: '' });
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [invitationPending, setInvitationPending] = useState(false);

    const { proposals } = useProposalStore();
    const { invoices } = useInvoiceStore();

    // -- Role Assignment State --
    const { activeWorkspaceId } = useUIStore();
    const { can, role: currentUserRole, isOwner } = usePermissions();
    const isOwnerOrCoOwner = isOwner || currentUserRole?.name === 'Co-Owner';

    const { roles, fetchRoles } = useRolesStore();
    const [memberRole, setMemberRole] = useState<string | null>(null);
    const [memberId, setMemberId] = useState<string | null>(null);
    const [memberUserId, setMemberUserId] = useState<string | null>(null);
    const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

    useEffect(() => {
        if (activeWorkspaceId && roles.length === 0) {
            fetchRoles(activeWorkspaceId);
        }
    }, [activeWorkspaceId, roles.length, fetchRoles]);

    useEffect(() => {
        if (client?.email && activeWorkspaceId) {
            supabase.from('workspace_members')
                .select('id, role_id, user_id')
                .eq('workspace_id', activeWorkspaceId)
                .eq('invited_email', client.email)
                .maybeSingle()
                .then(({ data }) => {
                    if (data) {
                        setMemberRole(data.role_id);
                        setMemberId(data.id);
                        setMemberUserId(data.user_id);
                        // Pending = row exists but user_id not yet set (invite sent, not accepted)
                        setInvitationPending(!data.user_id);
                    } else {
                        setMemberRole(null);
                        setMemberId(null);
                        setMemberUserId(null);
                        setInvitationPending(false);
                    }
                });
        } else {
            setMemberRole(null);
            setMemberId(null);
            setMemberUserId(null);
            setInvitationPending(false);
        }
    }, [client?.email, activeWorkspaceId]);

    // Real-time: watch for invite acceptance or changes
    useEffect(() => {
        if (!client?.email || !activeWorkspaceId) return;

        const channel = supabase
            .channel(`member_accept:${activeWorkspaceId}:${client.email}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'workspace_members',
                filter: `workspace_id=eq.${activeWorkspaceId}`,
            }, (payload) => {
                const row = (payload.new || payload.old) as any;
                if (row && row.invited_email && row.invited_email.toLowerCase() === client.email.toLowerCase()) {
                    if (payload.eventType === 'DELETE') {
                        setMemberRole(null);
                        setMemberId(null);
                        setMemberUserId(null);
                        setInvitationPending(false);
                    } else {
                        setMemberRole(row.role_id);
                        setMemberId(row.id);
                        if (row.user_id) {
                            setMemberUserId(row.user_id);
                            setInvitationPending(false);
                        } else {
                            setInvitationPending(true);
                        }
                    }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [client?.email, activeWorkspaceId]);

    const handleRoleChange = async (roleId: string) => {
        if (!activeWorkspaceId || !client?.email) return;
        setMemberRole(roleId);
        setRoleDropdownOpen(false);

        if (memberId) {
            await supabase.from('workspace_members').update({ role_id: roleId }).eq('id', memberId);
        } else {
            const { data } = await supabase.from('workspace_members').insert({
                workspace_id: activeWorkspaceId,
                invited_email: client.email,
                role_id: roleId
            }).select().single();
            
            if (data) setMemberId(data.id);
        }
    };

    useEffect(() => {
        if (client) setForm({ contact_person: client.contact_person || '', company_name: client.company_name || '', email: client.email || '', phone: client.phone || '', address: client.address || '', country: client.country || '', tax_number: client.tax_number || '', notes: client.notes || '', avatar_url: client.avatar_url || '' });
    }, [client]);

    const u = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        if (!client) return;
        setSaving(true);
        try { await updateClient(client.id, form); setSaved(true); setTimeout(() => { setSaved(false); setEditing(false); }, 1200); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!client) return;
        await deleteClient(client.id);
        closeRightPanel();
    };

    if (!client) return (
        <div className={cn("flex-1 flex items-center justify-center text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>
            Contact not found
        </div>
    );

    const isLinked = (doc: any, c: any) => doc.client_id === c.id || doc.client_name === c.contact_person || (Array.isArray(doc.meta?.assignedClients) && doc.meta.assignedClients.some((ac: any) => ac.id === c.id));
    const linkedProposals = proposals.filter(p => isLinked(p, client));
    const linkedInvoices = invoices.filter(i => isLinked(i, client));

    const name = form.contact_person || form.company_name || '';
    const border = isDark ? "border-[#252525]" : "border-[#e4e4e4]";

    return (
        <>
            {/* Hero */}
            <div className={cn("flex items-center gap-3 px-4 py-4 border-b shrink-0", border)}>
                <div 
                    onClick={() => setIsAvatarModalOpen(true)}
                    className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0 cursor-pointer overflow-hidden transition-all group relative",
                        isDark ? "bg-white/8 text-[#888] hover:bg-white/12" : "bg-[#f0f0f0] text-[#777] hover:bg-[#e8e8e8]"
                    )}
                >
                    <Avatar 
                        src={form.avatar_url} 
                        name={name} 
                        className="w-full h-full rounded-inherit" 
                        isDark={isDark} 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon size={14} className="text-white" />
                    </div>
                </div>
                <div className="min-w-0 flex-1">
                    {editing ? (
                        <input value={form.contact_person} onChange={e => u('contact_person')(e.target.value)} placeholder="Full name"
                            className={cn("text-[14px] font-bold bg-transparent outline-none w-full border-b pb-0.5",
                                isDark ? "text-white border-[#333] placeholder:text-[#444]" : "text-[#111] border-[#e0e0e0] placeholder:text-[#ccc]")} />
                    ) : (
                        <div className="flex items-center gap-2">
                            <h2 className={cn("text-[14px] font-bold truncate", isDark ? "text-white" : "text-[#111]")}>{form.contact_person || '—'}</h2>
                            {memberUserId && (
                                <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider", isDark ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" : "bg-emerald-100 text-emerald-600 border border-emerald-200")}>
                                    Active User
                                </span>
                            )}
                            {!memberUserId && invitationPending && (
                                <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider", isDark ? "bg-amber-500/20 text-amber-400 border border-amber-500/20" : "bg-amber-100 text-amber-600 border border-amber-200")}>
                                    Pending
                                </span>
                            )}
                        </div>
                    )}

                    {form.company_name && !editing && (
                        <p className={cn("text-[11px] mt-0.5", isDark ? "text-[#555]" : "text-[#aaa]")}>{form.company_name}</p>
                    )}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                    {!editing && (
                        <button onClick={() => setEditing(true)}
                            className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                                isDark ? "text-[#555] hover:text-[#ccc] hover:bg-white/5" : "text-[#bbb] hover:text-[#555] hover:bg-[#f0f0f0]")}>
                            <Pencil size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs Toggle */}
            {!editing && (
                <div className={cn(
                    "flex mx-4 mt-2 p-1 rounded-xl shrink-0",
                    isDark ? "bg-white/5" : "bg-[#efeff2]"
                )}>
                    <button 
                        onClick={() => setActiveTab('details')}
                        className={cn(
                            "flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg transition-all relative",
                            activeTab === 'details' 
                                ? (isDark ? "text-white" : "text-black")
                                : (isDark ? "text-[#555] hover:text-[#777]" : "text-[#aaa] hover:text-[#888]")
                        )}
                    >
                        <span className="relative z-10">Details</span>
                        {activeTab === 'details' && (
                            <motion.div 
                                layoutId="active-contact-tab" 
                                className={cn(
                                    "absolute inset-0 rounded-lg shadow-sm border",
                                    isDark ? "bg-white/10 border-white/10" : "bg-white border-black/5"
                                )} 
                            />
                        )}
                    </button>
                    <button 
                        onClick={() => setActiveTab('documents')}
                        className={cn(
                            "flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg transition-all relative",
                            activeTab === 'documents' 
                                ? (isDark ? "text-white" : "text-black")
                                : (isDark ? "text-[#555] hover:text-[#777]" : "text-[#aaa] hover:text-[#888]")
                        )}
                    >
                        <span className="relative z-10">Documents</span>
                        {activeTab === 'documents' && (
                            <motion.div 
                                layoutId="active-contact-tab" 
                                className={cn(
                                    "absolute inset-0 rounded-lg shadow-sm border",
                                    isDark ? "bg-white/10 border-white/10" : "bg-white border-black/5"
                                )} 
                            />
                        )}
                    </button>
                </div>
            )}

            {/* Fields / Documents switching */}
            <div className="flex-1 overflow-y-auto py-1">
                {activeTab === 'details' || editing ? (
                    <>
                        {/* Role Assignment */}
                        {isOwnerOrCoOwner && (
                            <Field 
                                label="Workspace Role" 
                                icon={<ShieldCheck size={11} />} 
                                value={memberRole ? roles.find(r => r.id === memberRole)?.name || 'Unknown' : 'No Role'}
                                editing={editing}
                                onChange={() => {}}
                                isDark={isDark}
                            >
                            <div className="relative">
                                {form.email ? (
                                    <button 
                                        onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                                        className={cn(
                                            "flex items-center justify-between w-full text-[12px] pb-0.5 border-b transition-colors outline-none",
                                            isDark 
                                                ? "border-[#333] hover:border-[#555] text-white" 
                                                : "border-[#e0e0e0] hover:border-[#ccc] text-[#111]"
                                        )}
                                    >
                                        <span>
                                            {memberRole 
                                                ? roles.find(r => r.id === memberRole)?.name 
                                                : <span className={isDark ? "text-[#444]" : "text-[#ccc]"}>Select role...</span>}
                                        </span>
                                        <ChevronRight size={12} className={cn("transition-transform opacity-50", roleDropdownOpen && "rotate-90")} />
                                    </button>
                                ) : (
                                    <div className={cn("text-[12px] border-b pb-0.5", isDark ? "text-[#444] border-[#333]" : "text-[#ccc] border-[#e0e0e0]")}>
                                        Email required to assign role
                                    </div>
                                )}
                                
                                {roleDropdownOpen && form.email && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
                                        <div className={cn(
                                            "absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-xl z-50 overflow-hidden py-1",
                                            isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                                        )}>
                                            {roles.filter(r => r.name !== 'Owner').map(role => (
                                                <button
                                                    key={role.id}
                                                    onClick={() => handleRoleChange(role.id)}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 text-[12px] font-medium transition-colors flex items-center justify-between",
                                                        memberRole === role.id 
                                                            ? (isDark ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary")
                                                            : (isDark ? "hover:bg-white/5 text-white/70" : "hover:bg-black/5 text-black/70")
                                                    )}
                                                >
                                                    {role.name}
                                                    {memberRole === role.id && <Check size={12} />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </Field>
                        )}

                        {/* Actions */}
                        {form.email && !editing && (
                            <div className="px-3 pt-1 mb-2 flex flex-col gap-1.5">
                                <a href={`mailto:${form.email}`}
                                    className={cn("flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors group",
                                        isDark ? "bg-[#1a1a1a] border border-[#252525] text-[#ccc] hover:bg-[#1e1e1e]"
                                            : "bg-[#f5f5f5] border border-[#e0e0e0] text-[#333] hover:bg-[#f0f0f0]")}>
                                    <div className="flex items-center gap-1.5 min-w-0"><Mail size={11} /><span className="truncate">{form.email}</span></div>
                                    <ExternalLink size={9} className="shrink-0 opacity-40 group-hover:opacity-100" />
                                </a>
                            </div>
                        )}
                        {editing && <Field label="Email" icon={<Mail size={11} />} value={form.email} editing onChange={u('email')} type="email" placeholder="email@example.com" isDark={isDark} />}
                        <Field label="Phone"   icon={<Phone size={11} />}    value={form.phone}      editing={editing} onChange={u('phone')}      placeholder="+1 234 567 890" isDark={isDark} />
                        <Field label="Company" icon={<Building2 size={11} />} value={form.company_name} editing={editing} onChange={u('company_name')} placeholder="Company name" isDark={isDark}>
                            <CompanyPicker
                                minimal
                                isDark={isDark}
                                value={form.company_name}
                                onChange={u('company_name')}
                                placeholder="Company name"
                            />
                        </Field>
                        <Field label="Address" icon={<MapPin size={11} />}   value={form.address}    editing={editing} onChange={u('address')}    placeholder="Street, city"   isDark={isDark} />
                        <Field label="Country" icon={<Globe size={11} />}    value={form.country}    editing={editing} onChange={u('country')}    placeholder="Country"        isDark={isDark}>
                            <CountryPicker 
                                minimal
                                isDark={isDark}
                                value={form.country}
                                onChange={u('country')}
                            />
                        </Field>
                        <Field label="Tax/VAT" icon={<Hash size={11} />}     value={form.tax_number} editing={editing} onChange={u('tax_number')} placeholder="VAT123"         isDark={isDark} />
                        <Field label="Notes"   icon={<FileText size={11} />} value={form.notes}      editing={editing} onChange={u('notes')}      placeholder="Notes…"         isDark={isDark} textarea />
                    </>
                ) : (
                    <div className="px-4 py-4 space-y-4">
                        {/* Related Proposals */}
                        <div>
                            <h3 className={cn("text-[10px] font-bold uppercase tracking-wider mb-3", isDark ? "text-white/20" : "text-gray-400")}>Proposals</h3>
                            <div className="space-y-1">
                                {linkedProposals.length > 0 ? (
                                    linkedProposals.map(p => (
                                        <button 
                                            key={p.id} 
                                            onClick={() => { router.push(`/proposals/${p.id}`); closeRightPanel(); }}
                                            className={cn("w-full flex items-center justify-between p-2 rounded-lg text-[11px] text-left transition-colors", isDark ? "hover:bg-white/5 text-white/70" : "hover:bg-gray-50 text-gray-700")}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText size={12} className="text-primary" />
                                                <span className="truncate font-medium">{p.title}</span>
                                            </div>
                                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded uppercase font-bold", 
                                                p.status === 'Accepted' ? "bg-primary/20 text-primary" : isDark ? "bg-white/5 text-white/30" : "bg-gray-100 text-gray-400")}>
                                                {p.status}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <p className={cn("text-[11px] italic", isDark ? "text-white/10" : "text-gray-300")}>No proposals found.</p>
                                )}
                            </div>
                        </div>

                        {/* Related Invoices */}
                        <div>
                            <h3 className={cn("text-[10px] font-bold uppercase tracking-wider mb-3", isDark ? "text-white/20" : "text-gray-400")}>Invoices</h3>
                            <div className="space-y-1">
                                {linkedInvoices.length > 0 ? (
                                    linkedInvoices.map(i => (
                                        <button 
                                            key={i.id} 
                                            onClick={() => { router.push(`/invoices/${i.id}`); closeRightPanel(); }}
                                            className={cn("w-full flex items-center justify-between p-2 rounded-lg text-[11px] text-left transition-colors", isDark ? "hover:bg-white/5 text-white/70" : "hover:bg-gray-50 text-gray-700")}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Hash size={12} className="text-primary" />
                                                <span className="truncate font-medium">{i.title}</span>
                                            </div>
                                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded uppercase font-bold", 
                                                i.status === 'Paid' ? "bg-primary/20 text-primary" : isDark ? "bg-white/5 text-white/30" : "bg-gray-100 text-gray-400")}>
                                                {i.status}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <p className={cn("text-[11px] italic", isDark ? "text-white/10" : "text-gray-300")}>No invoices found.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Invite Button: only show if no active user AND no pending invite */}
            {!memberUserId && !invitationPending && isOwnerOrCoOwner && !editing && (
                <div className={cn("px-4 py-3 border-t shrink-0", isDark ? "border-[#252525]" : "border-[#e4e4e4]")}>
                    <button
                        onClick={() => setInviteModalOpen(true)}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 h-9 rounded-lg text-[12px] font-bold transition-all",
                            isDark ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                    >
                        <UserPlus size={14} /> Send Invite to Workspace
                    </button>
                </div>
            )}

            {/* Pending invite indicator */}
            {!memberUserId && invitationPending && isOwnerOrCoOwner && !editing && (
                <div className={cn("px-4 py-3 border-t shrink-0", isDark ? "border-[#252525]" : "border-[#e4e4e4]")}>
                    <div className={cn(
                        "w-full flex items-center justify-center gap-2 h-9 rounded-lg text-[12px] font-semibold",
                        isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-600 border border-amber-200"
                    )}>
                        <Mail size={13} /> Invitation sent — awaiting acceptance
                    </div>
                </div>
            )}

            {/* Footer delete */}
            <div className={cn("px-4 py-3 border-t shrink-0", isDark ? "border-[#252525]" : "border-[#e4e4e4]")}>
                {editing ? (
                    <div className="flex items-center justify-between gap-4">
                        <button onClick={() => setShowDelete(true)}
                            className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                isDark ? "text-[#444] hover:text-red-400 hover:bg-red-400/10" : "text-[#ccc] hover:text-red-500 hover:bg-red-50")}>
                            <Trash2 size={13} />
                        </button>
                        <div className="flex items-center gap-2">
                            <button onClick={() => { setEditing(false); if (client) setForm({ contact_person: client.contact_person || '', company_name: client.company_name || '', email: client.email || '', phone: client.phone || '', address: client.address || '', country: client.country || '', tax_number: client.tax_number || '', notes: client.notes || '', avatar_url: client.avatar_url || '' }); }}
                                className={cn("text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors",
                                    isDark ? "text-[#666] hover:bg-white/5" : "text-[#999] hover:bg-[#f0f0f0]")}>
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className={cn("flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold rounded-lg transition-colors min-w-[80px] justify-center",
                                    saved ? "bg-primary text-primary-foreground" : "bg-primary hover:bg-primary-hover text-primary-foreground disabled:opacity-60")}>
                                {saved ? <><Check size={12} />Saved</> : <><Save size={12} />{saving ? '...' : 'Save'}</>}
                            </button>
                        </div>
                    </div>
                ) : showDelete ? (
                    <div className="flex items-center gap-2">
                        <span className={cn("text-[11px] flex-1", isDark ? "text-[#666]" : "text-[#999]")}>Delete this contact?</span>
                        <button onClick={() => setShowDelete(false)} className={cn("px-2 py-1 text-[11px] rounded-lg", isDark ? "text-[#666] hover:bg-white/5" : "text-[#999] hover:bg-[#f0f0f0]")}>Cancel</button>
                        <button onClick={handleDelete} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white">
                            <Trash2 size={10} />Delete
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between w-full">
                        <button onClick={() => setShowDelete(true)} className={cn("flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg transition-colors",
                            isDark ? "text-[#444] hover:text-red-400 hover:bg-red-400/10" : "text-[#ccc] hover:text-red-500 hover:bg-red-50")}>
                            <Trash2 size={11} />Delete contact
                        </button>
                        {memberUserId && isOwnerOrCoOwner && (
                            <button 
                                onClick={async () => {
                                    if (memberId) {
                                        const { removeMember } = useRolesStore.getState();
                                        await removeMember(memberId);
                                        appToast.success('Workspace access removed');
                                    }
                                }} 
                                className={cn("flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg transition-colors",
                                    isDark ? "text-amber-500/70 hover:text-amber-400 hover:bg-amber-500/10" : "text-amber-600/70 hover:text-amber-600 hover:bg-amber-50")}
                            >
                                <X size={11} />Remove Access
                            </button>
                        )}
                    </div>
                )}
            </div>
            <ImageUploadModal
                isOpen={isAvatarModalOpen}
                onClose={() => setIsAvatarModalOpen(false)}
                onUpload={(url) => {
                    u('avatar_url')(url);
                    if (client) updateClient(client.id, { avatar_url: url });
                }}
                title="Contact Photo"
            />
            {inviteModalOpen && (
                <SendEmailModal
                    isOpen={inviteModalOpen}
                    onClose={() => setInviteModalOpen(false)}
                    templateKey="workspace_invitation"
                    to={form.email}
                    variables={{}}
                    workspaceId={activeWorkspaceId || ''}
                    documentTitle="Workspace Invitation"
                    onSuccess={() => setInvitationPending(true)}
                />
            )}
        </>
    );
}

/* ─── Company Detail Panel ─── */
const INDUSTRIES = ['Technology','Design','Marketing','Finance','Healthcare','Education','Real Estate','Legal','Consulting','Media','Retail','Manufacturing','Construction','Other'];

function CompanyPanel({ id, isDark }: { id: string; isDark: boolean }) {
    const { companies, updateCompany, deleteCompany } = useCompanyStore();
    const { clients } = useClientStore();
    const { closeRightPanel } = useUIStore();
    const company = companies.find(c => c.id === id);

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [showIndustry, setShowIndustry] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [form, setForm] = useState({ name: '', industry: '', website: '', email: '', phone: '', address: '', country: '', tax_number: '', notes: '', avatar_url: '' });

    useEffect(() => {
        if (company) setForm({ 
            name: company.name || '', 
            industry: company.industry || '', 
            website: company.website || '', 
            email: company.email || '', 
            phone: company.phone || '', 
            address: company.address || '', 
            country: company.country || '',
            tax_number: company.tax_number || '', 
            notes: company.notes || '',
            avatar_url: company.avatar_url || ''
        });
    }, [company]);

    const u = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        if (!company) return;
        setSaving(true);
        try { await updateCompany(company.id, form); setSaved(true); setTimeout(() => { setSaved(false); setEditing(false); }, 1200); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!company) return;
        await deleteCompany(company.id);
        closeRightPanel();
    };

    if (!company) return (
        <div className={cn("flex-1 flex items-center justify-center text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>
            Company not found
        </div>
    );

    const linkedContacts = clients.filter(c => c.company_name === company.name);
    const border = isDark ? "border-[#252525]" : "border-[#ebebeb]";

    return (
        <>
            {/* Hero */}
            <div className={cn("flex items-center gap-3 px-4 py-4 border-b shrink-0", border)}>
                <div 
                    onClick={() => setIsAvatarModalOpen(true)}
                    className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0 cursor-pointer overflow-hidden transition-all group relative",
                        isDark ? "bg-white/8 text-[#888] hover:bg-white/12" : "bg-[#f0f0f0] text-[#777] hover:bg-[#e8e8e8]"
                    )}
                >
                    <Avatar 
                        src={form.avatar_url} 
                        name={form.name} 
                        className="w-full h-full rounded-inherit" 
                        isDark={isDark} 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon size={14} className="text-white" />
                    </div>
                </div>
                <div className="min-w-0 flex-1">
                    {editing ? (
                        <input value={form.name} onChange={e => u('name')(e.target.value)} placeholder="Company name"
                            className={cn("text-[14px] font-bold bg-transparent outline-none w-full border-b pb-0.5",
                                isDark ? "text-white border-[#333] placeholder:text-[#444]" : "text-[#111] border-[#e0e0e0] placeholder:text-[#ccc]")} />
                    ) : (
                        <h2 className={cn("text-[14px] font-bold truncate", isDark ? "text-white" : "text-[#111]")}>{form.name}</h2>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                        {editing ? (
                            <div className="relative">
                                <button onClick={() => setShowIndustry(v => !v)}
                                    className={cn("flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md transition-colors",
                                        isDark ? "bg-white/5 text-[#777] hover:bg-white/8" : "bg-[#f0f0f0] text-[#888] hover:bg-[#e8e8e8]")}>
                                    <Briefcase size={8} />{form.industry || 'Industry'}<ChevronRight size={8} className={cn("transition-transform", showIndustry && "rotate-90")} />
                                </button>
                                {showIndustry && (
                                    <div className={cn("absolute left-0 top-full mt-1 w-44 rounded-xl border shadow-xl z-50 overflow-hidden",
                                        isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]")}>
                                        <div className="max-h-48 overflow-auto py-1">
                                            {INDUSTRIES.map(ind => (
                                                <button key={ind} onClick={() => { u('industry')(ind); setShowIndustry(false); }}
                                                    className={cn("w-full text-left px-3 py-1.5 text-[11px] transition-colors",
                                                        form.industry === ind
                                                            ? isDark ? "bg-white/10 text-white" : "bg-[#f0f0f0] text-[#111] font-medium"
                                                            : isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]")}>
                                                    {ind}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : form.industry ? (
                            <span className={cn("text-[11px]", isDark ? "text-[#555]" : "text-[#aaa]")}>{form.industry}</span>
                        ) : null}
                        <span className={cn("text-[10px]", isDark ? "text-[#444]" : "text-[#ccc]")}>{linkedContacts.length} contact{linkedContacts.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {!editing && (
                        <button onClick={() => setEditing(true)}
                            className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                                isDark ? "text-[#555] hover:text-[#ccc] hover:bg-white/5" : "text-[#bbb] hover:text-[#555] hover:bg-[#f0f0f0]")}>
                            <Pencil size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Quick email */}
            {form.email && !editing && (
                <div className="px-4 pt-3">
                    <a href={`mailto:${form.email}`}
                        className={cn("flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors group",
                            isDark ? "bg-[#1a1a1a] border border-[#252525] text-[#4dbf39] hover:bg-[#1e1e1e]"
                                : "bg-[#f0fdf4] border border-[#d1fad4] text-[#299b1a] hover:bg-[#e8fbe8]")}>
                        <div className="flex items-center gap-1.5 min-w-0"><Mail size={11} /><span className="truncate">{form.email}</span></div>
                        <ExternalLink size={9} className="shrink-0 opacity-40 group-hover:opacity-100" />
                    </a>
                </div>
            )}

            {/* Fields */}
            <div className="flex-1 overflow-y-auto py-1">
                {editing && <Field label="Email"   icon={<Mail size={11} />}    value={form.email}    editing onChange={u('email')}    type="email" placeholder="hello@company.com" isDark={isDark} />}
                <Field label="Phone"   icon={<Phone size={11} />}   value={form.phone}    editing={editing} onChange={u('phone')}    placeholder="+1 234 567 890" isDark={isDark} />
                <Field label="Website" icon={<Globe size={11} />}   value={form.website}  editing={editing} onChange={u('website')}  placeholder="https://company.com" isDark={isDark} isLink />
                <Field label="Address" icon={<MapPin size={11} />}  value={form.address}  editing={editing} onChange={u('address')}  placeholder="Street, city"   isDark={isDark} />
                <Field label="Country" icon={<Globe size={11} />}   value={form.country}  editing={editing} onChange={u('country')}  placeholder="Country"        isDark={isDark}>
                    <CountryPicker 
                        minimal
                        isDark={isDark}
                        value={form.country}
                        onChange={u('country')}
                    />
                </Field>
                <Field label="Tax/VAT" icon={<Hash size={11} />}    value={form.tax_number} editing={editing} onChange={u('tax_number')} placeholder="VAT123"     isDark={isDark} />
                <Field label="Notes"   icon={<FileText size={11} />} value={form.notes}   editing={editing} onChange={u('notes')}    placeholder="Notes…"         isDark={isDark} textarea />

                {/* Linked contacts */}
                {linkedContacts.length > 0 && (
                    <div className="mt-2 px-4">
                        <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-[#444]" : "text-[#bbb]")}>Linked contacts</p>
                        {linkedContacts.map(c => (
                            <div key={c.id} className={cn("flex items-center gap-2.5 py-2 rounded-lg transition-colors",
                                isDark ? "hover:bg-white/[0.02]" : "hover:bg-[#f9f9f9]")}>
                                <Avatar 
                                    src={c.avatar_url} 
                                    name={c.contact_person || c.company_name} 
                                    className="w-6 h-6" 
                                    isDark={isDark} 
                                />
                                <div className="min-w-0">
                                    <p className={cn("text-[11px] font-medium truncate", isDark ? "text-[#ccc]" : "text-[#222]")}>{c.contact_person || '—'}</p>
                                    {c.email && <p className={cn("text-[10px] truncate", isDark ? "text-[#555]" : "text-[#aaa]")}>{c.email}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer delete */}
            <div className={cn("px-4 py-3 border-t shrink-0", isDark ? "border-[#252525]" : "border-[#ebebeb]")}>
                {editing ? (
                    <div className="flex items-center justify-between gap-4">
                        <button onClick={() => setShowDelete(true)}
                            className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                isDark ? "text-[#444] hover:text-red-400 hover:bg-red-400/10" : "text-[#ccc] hover:text-red-500 hover:bg-red-50")}>
                            <Trash2 size={13} />
                        </button>
                        <div className="flex items-center gap-2">
                            <button onClick={() => { setEditing(false); if (company) setForm({ name: company.name || '', industry: company.industry || '', website: company.website || '', email: company.email || '', phone: company.phone || '', address: company.address || '', country: company.country || '', tax_number: company.tax_number || '', notes: company.notes || '', avatar_url: company.avatar_url || '' }); }}
                                className={cn("text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors",
                                    isDark ? "text-[#666] hover:bg-white/5" : "text-[#999] hover:bg-[#f0f0f0]")}>
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className={cn("flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold rounded-lg transition-colors min-w-[80px] justify-center",
                                    saved ? "bg-primary text-primary-foreground" : "bg-primary hover:bg-primary-hover text-primary-foreground disabled:opacity-60")}>
                                {saved ? <><Check size={12} />Saved</> : <><Save size={12} />{saving ? '...' : 'Save'}</>}
                            </button>
                        </div>
                    </div>
                ) : showDelete ? (
                    <div className="flex items-center gap-2">
                        <span className={cn("text-[11px] flex-1", isDark ? "text-[#666]" : "text-[#999]")}>Delete this company?</span>
                        <button onClick={() => setShowDelete(false)} className={cn("px-2 py-1 text-[11px] rounded-lg", isDark ? "text-[#666] hover:bg-white/5" : "text-[#999] hover:bg-[#f0f0f0]")}>Cancel</button>
                        <button onClick={handleDelete} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white">
                            <Trash2 size={10} />Delete
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setShowDelete(true)} className={cn("flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg transition-colors",
                        isDark ? "text-[#444] hover:text-red-400 hover:bg-red-400/10" : "text-[#ccc] hover:text-red-500 hover:bg-red-50")}>
                        <Trash2 size={11} />Delete company
                    </button>
                )}
            </div>
            <ImageUploadModal
                isOpen={isAvatarModalOpen}
                onClose={() => setIsAvatarModalOpen(false)}
                onUpload={(url) => {
                    u('avatar_url')(url);
                    if (company) updateCompany(company.id, { avatar_url: url });
                }}
                title="Company Logo"
            />
        </>
    );
}

/* ─── Hook Detail Panel ─── */
function HookPanel({ id, initialEditing = false, isDark }: { id: string; initialEditing?: boolean; isDark: boolean }) {
    const { hooks, updateHook, refreshHookEventCount } = useHookStore();
    const { notifications, fetchNotifications } = useNotificationStore();
    const hook = hooks.find(h => h.id === id);
    
    const [editing, setEditing] = useState(initialEditing);

    useEffect(() => {
        setEditing(initialEditing);
    }, [id, initialEditing]);

    // Refresh event count + last_fired_at when the panel opens
    useEffect(() => {
        refreshHookEventCount(id);
        fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({ name: '', title: '', link: '', color: '' });
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (hook) setForm({ 
            name: hook.name || '', 
            title: hook.title || '', 
            link: hook.link || '',
            color: hook.color || COLORS[6] 
        });
    }, [hook]);

    if (!hook) return (
        <div className={cn("flex-1 flex items-center justify-center text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>
            Hook not found
        </div>
    );

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateHook(hook.id, form);
            setSaved(true);
            setTimeout(() => { setSaved(false); setEditing(false); }, 1200);
        } finally {
            setSaving(false);
        }
    };

    const getBaseUrl = () => typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || '');
    const pixelUrl = `${getBaseUrl()}/api/h/${hook.id}`;
    const embedCode = `<img src="${pixelUrl}" width="1" height="1" style="display:none;width:1px;height:1px;border:0;" alt="" />`;

    const copy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        appToast.success('Copied to clipboard');
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Hero / Header info */}
            <div className={cn("flex items-center gap-3 px-4 py-4 border-b shrink-0", isDark ? "border-[#252525]" : "border-[#ebebeb]")}>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isDark ? "bg-white/5" : "bg-[#f5f5f5]")}>
                    <Zap size={18} style={{ color: editing ? form.color : hook.color }} fill="currentColor" />
                </div>
                <div className="min-w-0 flex-1">
                    {editing ? (
                        <input 
                            value={form.name} 
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className={cn("text-[14px] font-bold bg-transparent outline-none w-full border-b pb-0.5",
                                isDark ? "text-white border-[#333]" : "text-[#111] border-[#e0e0e0]")}
                        />
                    ) : (
                        <h2 className={cn("text-[14px] font-bold truncate", isDark ? "text-white" : "text-[#111]")}>{hook.name}</h2>
                    )}
                    <p className={cn("text-[11px] mt-0.5 truncate", isDark ? "text-[#555]" : "text-[#aaa]")}>
                        {editing ? 'Editing configuration' : 'Tracking Pixel Hook'}
                    </p>
                </div>
                {!editing && (
                    <button onClick={() => setEditing(true)}
                        className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                            isDark ? "text-[#555] hover:text-[#ccc] hover:bg-white/5" : "text-[#bbb] hover:text-[#555] hover:bg-[#f0f0f0]")}>
                        <Pencil size={12} />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto py-1">
                {editing ? (
                    <div className="p-4 flex flex-col gap-5">
                        <Field label="Description" icon={<FileText size={11} />} value={form.title} editing onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="What is this hook for?" isDark={isDark} />
                        <Field label="Placement URL" icon={<Globe size={11} />} value={form.link} editing onChange={v => setForm(f => ({ ...f, link: v }))} placeholder="e.g. project-website.com" isDark={isDark} />
                        
                        {/* Color Picker */}
                        <div className="px-4">
                            <p className={cn("text-[10px] font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5", isDark ? "text-[#444]" : "text-[#bbb]")}>
                                <Palette size={10} /> Brand Color
                            </p>
                            <div className="grid grid-cols-8 gap-2">
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setForm(f => ({ ...f, color: c }))}
                                        className={cn(
                                            "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                                            form.color === c ? (isDark ? "border-white" : "border-[#111]") : "border-transparent"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="px-4 py-5 flex flex-col gap-6">
                        {/* Stats row */}
                        <div className={cn('flex items-center gap-4 rounded-xl border px-4 py-3', isDark ? 'bg-[#1a1a1a] border-[#252525]' : 'bg-[#f7f7f9] border-[#ebebf0]')}>
                            <div className="flex flex-col items-center gap-0.5 flex-1">
                                <span className={cn('text-[20px] font-black tabular-nums tracking-tight', isDark ? 'text-white' : 'text-[#111]')}>
                                    {hook.event_count ?? 0}
                                </span>
                                <span className={cn('text-[9px] font-bold uppercase tracking-wider', isDark ? 'text-[#444]' : 'text-[#bbb]')}>Triggers</span>
                            </div>
                            <div className={cn('w-px self-stretch', isDark ? 'bg-[#2e2e2e]' : 'bg-[#e8e8e8]')} />
                            <div className="flex flex-col items-center gap-0.5 flex-1">
                                <span className={cn('text-[11px] font-bold text-center leading-tight', isDark ? 'text-[#aaa]' : 'text-[#555]')}>
                                    {hook.last_fired_at
                                        ? formatDistanceToNow(new Date(hook.last_fired_at), { addSuffix: true })
                                        : '—'
                                    }
                                </span>
                                <span className={cn('text-[9px] font-bold uppercase tracking-wider', isDark ? 'text-[#444]' : 'text-[#bbb]')}>Last fired</span>
                            </div>
                        </div>

                        {/* Placement link */}
                        {hook.link && (
                            <div>
                                <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-2', isDark ? 'text-[#444]' : 'text-[#bbb]')}>Currently tracking</p>
                                <div className="relative group/link overflow-hidden flex items-center">
                                    <div 
                                        className="w-full overflow-hidden" 
                                        style={{ 
                                            WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 40px), transparent 100%)',
                                            maskImage: 'linear-gradient(to right, black calc(100% - 40px), transparent 100%)'
                                        }}
                                    >
                                        <motion.a
                                            href={hook.link.startsWith('http') ? hook.link : `https://${hook.link}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cn('inline-block whitespace-nowrap gap-2 text-[11px] hover:underline transition-colors', isDark ? 'text-primary' : 'text-primary')}
                                            whileHover={{ x: [0, -20, 0] }} // Subtle wiggle or we could do a full scroll if we had widths
                                            // Since we don't have widths, let's just make it auto-scroll on hover if it overflows
                                            onMouseEnter={(e) => {
                                                const target = e.currentTarget;
                                                const parent = target.parentElement;
                                                if (parent && target.scrollWidth > parent.clientWidth) {
                                                    const diff = target.scrollWidth - parent.clientWidth + 40;
                                                    target.style.transition = `transform ${diff / 30}s linear`;
                                                    target.style.transform = `translateX(-${diff}px)`;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                const target = e.currentTarget;
                                                target.style.transition = 'transform 0.3s ease-out';
                                                target.style.transform = 'translateX(0)';
                                            }}
                                        >
                                            <span className="flex items-center gap-2">
                                                <ExternalLink size={10} className="shrink-0" />
                                                {hook.link}
                                            </span>
                                        </motion.a>
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* Pixel URL */}
                        <div>
                            <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-2', isDark ? 'text-[#444]' : 'text-[#bbb]')}>Pixel URL</p>
                            <div className={cn('flex items-center gap-2 rounded-xl border px-3 py-2', isDark ? 'bg-[#1a1a1a] border-[#2e2e2e]' : 'bg-[#f7f7f7] border-[#e8e8e8]')}>
                                <span className={cn('text-[11px] font-mono flex-1 truncate', isDark ? 'text-[#888]' : 'text-[#666]')}>
                                    {pixelUrl}
                                </span>
                                <button onClick={() => copy(pixelUrl)} className={cn('p-1 rounded-lg transition-colors shrink-0', isDark ? 'text-[#555] hover:text-white hover:bg-white/5' : 'text-[#bbb] hover:text-[#333] hover:bg-black/5')}>
                                    {copied ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
                                </button>
                            </div>
                        </div>

                        {/* Embed Code */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className={cn('text-[10px] font-bold uppercase tracking-wider', isDark ? 'text-[#444]' : 'text-[#bbb]')}>HTML embed code</p>
                                <HelpTip 
                                    isDark={isDark} 
                                    content={
                                        <div className="flex flex-col gap-1">
                                            <p className={cn('text-[11px] font-bold mb-1', isDark ? 'text-[#aaa]' : 'text-[#555]')}>How to use</p>
                                            {[
                                                'Copy the HTML embed code.',
                                                'Paste it inside the <body> of a page.',
                                                'When the page loads, the hook fires silently.',
                                            ].map((step, i) => (
                                                <div key={i} className="flex items-start gap-2">
                                                    <span className={cn('w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold mt-0.5', isDark ? 'bg-white/8 text-[#666]' : 'bg-[#eaeaef] text-[#999]')}>
                                                        {i + 1}
                                                    </span>
                                                    <p className={cn('text-[10px] leading-relaxed', isDark ? 'text-[#888]' : 'text-[#666]')}>{step}</p>
                                                </div>
                                            ))}
                                        </div>
                                    } 
                                />
                            </div>
                            <div className={cn('rounded-xl border overflow-hidden', isDark ? 'bg-[#1a1a1a] border-[#2e2e2e]' : 'bg-[#f7f7f7] border-[#e8e8e8]')}>
                                <div className={cn('flex items-center justify-between px-3 py-1.5 border-b', isDark ? 'border-[#252525]' : 'border-[#e8e8e8]')}>
                                    <span className={cn('text-[9px] font-bold uppercase tracking-wider', isDark ? 'text-[#444]' : 'text-[#ccc]')}>HTML</span>
                                    <button onClick={() => copy(embedCode)} className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-bold transition-colors', isDark ? 'text-[#555] hover:text-white hover:bg-white/5' : 'text-[#aaa] hover:text-[#333] hover:bg-black/5')}>
                                        {copied ? <Check size={8} className="text-primary" /> : <Copy size={8} />}
                                        Copy
                                    </button>
                                </div>
                                <pre className={cn('px-3 py-3 text-[10px] font-mono leading-relaxed whitespace-pre-wrap break-all select-all', isDark ? 'text-[#8ec07c]' : 'text-[#555]')}>
                                    {embedCode}
                                </pre>
                            </div>
                        </div>

                        {/* Triggers History */}
                        {(() => {
                            const hookTriggers = notifications.filter(n => n.type === 'hook' && (n.metadata?.hook_id === hook.id || n.title === `Someone opened "${hook.name}"`));
                            if (hookTriggers.length === 0) return null;
                            return (
                                <div>
                                    <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-2', isDark ? 'text-[#444]' : 'text-[#bbb]')}>Recent Triggers</p>
                                    <div className="flex flex-col gap-1">
                                        {hookTriggers.slice(0, 10).map((trigger) => (
                                            <div key={trigger.id} className={cn("flex items-center justify-between px-3 py-2 rounded-xl border", isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-[#f7f7f9] border-[#e8e8f0]")}>
                                                <div className="flex items-center gap-2">
                                                    <Zap size={12} style={{ color: hook.color || 'var(--primary)' }} />
                                                    <div className="flex flex-col">
                                                        <span className={cn("text-[11px] font-medium", isDark ? "text-[#eee]" : "text-[#222]")}>
                                                            {trigger.title}
                                                        </span>
                                                        <span className={cn("text-[9px]", isDark ? "text-[#888]" : "text-[#666]")}>
                                                            {formatDistanceToNow(new Date(trigger.created_at), { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                </div>
                                                {trigger.metadata?.visitor && (
                                                    <Tooltip 
                                                        className="whitespace-normal font-sans"
                                                        content={
                                                            <div className="flex flex-col gap-1 w-[160px]">
                                                                <div className="flex items-center gap-2 border-b border-inherit pb-1.5 mb-0.5">
                                                                    {!trigger.metadata.visitor.countryCode || trigger.metadata.visitor.countryCode === 'local' || trigger.metadata.visitor.countryCode === 'unknown' ? (
                                                                        <span className="text-[13px] leading-none">{trigger.metadata.visitor.flag}</span>
                                                                    ) : (
                                                                        <img 
                                                                            src={`https://flagcdn.com/w20/${trigger.metadata.visitor.countryCode.toLowerCase()}.png`} 
                                                                            alt={trigger.metadata.visitor.country}
                                                                            className="w-4 h-3 object-cover rounded-[1px] shadow-sm"
                                                                            onError={(e) => {
                                                                                e.currentTarget.style.display = 'none';
                                                                                const span = e.currentTarget.parentElement?.querySelector('.flag-emoji-fallback') as HTMLElement;
                                                                                if (span) span.style.display = 'inline';
                                                                            }}
                                                                        />
                                                                    )}
                                                                    {trigger.metadata.visitor.countryCode && trigger.metadata.visitor.countryCode !== 'local' && trigger.metadata.visitor.countryCode !== 'unknown' && (
                                                                        <span className="flag-emoji-fallback text-[13px] leading-none" style={{ display: 'none' }}>
                                                                            {trigger.metadata.visitor.flag}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[10px] uppercase tracking-wider font-bold truncate leading-none">
                                                                        {trigger.metadata.visitor.country}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-[9px] leading-tight">
                                                                    <span className="opacity-50 font-medium">IP</span>
                                                                    <span className="font-mono">{trigger.metadata.visitor.ip}</span>
                                                                </div>
                                                                {trigger.metadata.visitor.isp && (
                                                                    <div className="flex items-center justify-between text-[9px] leading-tight mt-0.5">
                                                                        <span className="opacity-50 font-medium mr-2">ISP</span>
                                                                        <span className="font-semibold text-right truncate flex-1">{trigger.metadata.visitor.isp}</span>
                                                                    </div>
                                                                )}
                                                                {(trigger.metadata?.visitor?.deviceType || trigger.metadata?.visitor?.os) && (
                                                                    <div className="flex items-center justify-between text-[9px] leading-tight mt-0.5">
                                                                        <span className="opacity-50 font-medium mr-2">System</span>
                                                                        <span className="font-semibold text-right">
                                                                            {trigger.metadata.visitor.deviceType === 'Bot' ? '🤖' : 
                                                                             trigger.metadata.visitor.deviceType === 'Mobile' ? '📱' : 
                                                                             trigger.metadata.visitor.deviceType === 'Tablet' ? '📟' : '🖥️'}
                                                                            {' '}
                                                                            {trigger.metadata.visitor.os && trigger.metadata.visitor.os !== 'Unknown OS' 
                                                                                ? `${trigger.metadata.visitor.os} ${trigger.metadata.visitor.deviceType !== 'Desktop' && trigger.metadata.visitor.deviceType !== 'Bot' ? `(${trigger.metadata.visitor.deviceType})` : ''}`
                                                                                : trigger.metadata.visitor.deviceType}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-end justify-between mt-0.5 pt-1.5 border-t border-inherit text-[8px] opacity-70 font-medium whitespace-nowrap">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        {trigger.metadata.visitor.region && <div>{trigger.metadata.visitor.city}, {trigger.metadata.visitor.region}</div>}
                                                                        {trigger.metadata.visitor.timezone && <div>{trigger.metadata.visitor.timezone}</div>}
                                                                    </div>
                                                                    <div className="flex flex-col text-right pl-3 opacity-90 tracking-tight leading-[1.1]">
                                                                        <div>{format(new Date(trigger.created_at), "h:mm a")}</div>
                                                                        <div>{format(new Date(trigger.created_at), "MMM d, yyyy")}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        } 
                                                        side="left"
                                                    >
                                                        <div className="flex items-center justify-center w-5 h-5 cursor-help opacity-60 hover:opacity-100 transition-opacity">
                                                            <AlertCircle size={12} className={cn(isDark ? "text-white" : "text-[#111]")} />
                                                        </div>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Footer actions when editing */}
            {editing && (
                <div className={cn("px-4 py-3 border-t shrink-0 flex items-center justify-end gap-2", isDark ? "border-[#252525]" : "border-[#e4e4e4]")}>
                    <button 
                        onClick={() => setEditing(false)}
                        className={cn("text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors",
                            isDark ? "text-[#666] hover:bg-white/5" : "text-[#999] hover:bg-[#f0f0f0]")}>
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving || !form.name.trim()}
                        className={cn("flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold rounded-lg transition-colors min-w-[80px] justify-center",
                            saved ? "bg-primary text-primary-foreground" : "bg-primary hover:bg-primary-hover text-primary-foreground disabled:opacity-60")}>
                        {saved ? <><Check size={12} />Saved</> : <><Save size={12} />{saving ? '...' : 'Save'}</>}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ─── Form Response Detail Panel ─── */
function FormResponsePanel({ id, formId, isDark }: { id: string; formId: string; isDark: boolean }) {
    const { forms, responses, fetchResponses } = useFormStore();
    const form = forms.find(f => f.id === formId);
    const response = responses.find(r => r.id === id);

    useEffect(() => {
        if (!response) {
            fetchResponses(formId);
        }
    }, [formId, response, fetchResponses]);

    if (!form || !response) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <AppLoader size="md" />
                <div className={cn("text-[12px] font-medium mt-4", isDark ? "text-white/20" : "text-black/20")}>Loading response...</div>
            </div>
        );
    }

    const primaryIdentity = (() => {
        if (!response?.data) return 'Respondent';
        const fds = form.fields || [];
        
        let match = fds.find(f => f.type === 'full_name' && response.data[f.id]);
        if (match) return String(response.data[match.id]);
        
        match = fds.find(f => (f.label?.toLowerCase().includes('name') || f.label?.toLowerCase().includes('identity')) && response.data[f.id]);
        if (match) return String(response.data[match.id]);
        
        match = fds.find(f => f.type === 'email' && response.data[f.id]);
        if (match) return String(response.data[match.id]);

        match = fds.find(f => f.type === 'short_text' && response.data[f.id]);
        if (match) return String(response.data[match.id]);
        
        // Fallback to first non-empty field
        const firstVal = Object.values(response.data).find(v => v && typeof v === 'string' && v.length < 50);
        if (firstVal) return String(firstVal);

        return 'Respondent';
    })();

    const isImageUrl = (url: any) => {
        if (typeof url !== 'string') return false;
        return url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) != null || url.includes('supabase.co/storage/v1/object/public/');
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-8">
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold uppercase",
                            isDark ? "bg-white/5 text-white/40" : "bg-black/5 text-black/40")}>
                            {primaryIdentity[0]}
                        </div>
                        <div className="flex flex-col">
                            <h2 className={cn("text-[18px] font-bold tracking-tight leading-none", isDark ? "text-white" : "text-black")}>
                                {primaryIdentity}
                            </h2>
                            <div className={cn("text-[11px] font-medium mt-1 opacity-40", isDark ? "text-white" : "text-black")}>
                                Form Respondent
                            </div>
                        </div>
                    </div>

                    <div className={cn("text-[9px] font-bold uppercase tracking-widest opacity-30 mb-1.5", isDark ? "text-white" : "text-black")}>
                        Submitted on
                    </div>
                    <div className={cn("text-[13px] font-bold tracking-tight opacity-60", isDark ? "text-white" : "text-black")}>
                        {new Date(response.created_at).toLocaleString(undefined, { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit'
                        })}
                    </div>
                </div>

                <div className="space-y-8">
                    {form.fields.map(field => {
                        let rawValue = response.data?.[field.id];
                        
                        // Parse JSON if it looks like an array (from multi-select)
                        let value = rawValue;
                        if (typeof rawValue === 'string' && rawValue.startsWith('[') && rawValue.endsWith(']')) {
                            try {
                                const parsed = JSON.parse(rawValue);
                                if (Array.isArray(parsed)) value = parsed;
                            } catch (e) {
                                // Not a valid JSON array, keep as string
                            }
                        }

                        const isEmpty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
                        
                        return (
                            <div key={field.id} className="group flex flex-col gap-1.5 relative">
                                <div className="flex items-center justify-between">
                                    <div className={cn("text-[9px] font-bold uppercase tracking-widest opacity-30 transition-opacity group-hover:opacity-100", isDark ? "text-white" : "text-black")}>
                                        {field.label}
                                    </div>
                                    {!isEmpty && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const text = Array.isArray(value) ? value.join(', ') : String(value);
                                                navigator.clipboard.writeText(text);
                                                appToast.success("Copied to clipboard");
                                            }}
                                            className={cn("p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all", isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-black/5 hover:bg-black/10 text-black")}
                                            title="Copy value"
                                        >
                                            <Copy size={10} />
                                        </button>
                                    )}
                                </div>
                                <div className={cn("text-[14px] leading-relaxed break-words font-medium", 
                                    isEmpty ? "italic opacity-20" : (isDark ? "text-[#eee]" : "text-[#222]")
                                )}>
                                    {isEmpty ? 'No answer' : (() => {
                                        const renderValue = (v: any, key?: any) => {
                                            let displayValue = String(v);
                                            let imageUrl = '';
                                            
                                            if (field.type === 'picture_choice' && typeof v === 'string') {
                                                const parts = v.split('|');
                                                imageUrl = parts[0];
                                                displayValue = parts.slice(1).join('|') || (imageUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) ? '' : imageUrl);
                                            } else if (isImageUrl(v)) {
                                                imageUrl = v;
                                                displayValue = '';
                                            }

                                            if (imageUrl) {
                                                return (
                                                    <div key={key} className="flex flex-col gap-1.5">
                                                        <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="block mt-1">
                                                            <img src={imageUrl} alt={displayValue} className="max-w-full h-auto rounded-lg border border-black/5 dark:border-white/5 max-h-[160px] object-contain bg-black/5" />
                                                        </a>
                                                        {displayValue && <span className="text-[12px] opacity-60 ml-1">{displayValue}</span>}
                                                    </div>
                                                );
                                            }

                                            return (
                                                <span key={key} className={cn(Array.isArray(value) ? "px-2 py-1 rounded bg-black/5 dark:bg-white/5 text-[12px]" : "")}>
                                                    {displayValue}
                                                </span>
                                            );
                                        };

                                        if (Array.isArray(value)) {
                                            return (
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {value.map((v, i) => renderValue(v, i))}
                                                </div>
                                            );
                                        }
                                        
                                        return renderValue(value);
                                    })()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Response Footer */}
            <div className={cn("px-6 py-4 border-t shrink-0 flex items-center justify-between", isDark ? "border-[#222]" : "border-[#f0f0f0]")}>
                 <button 
                    onClick={() => {
                        const text = form.fields.map(f => `${f.label}: ${response.data?.[f.id] || 'N/A'}`).join('\n');
                        navigator.clipboard.writeText(text);
                        appToast.success("Copied", "Response details copied to clipboard");
                    }}
                    className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all",
                        isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-black/5 hover:bg-black/10 text-black")}
                >
                    <Copy size={12} />
                    Copy Details
                </button>
            </div>
        </div>
    );
}

/* ─── Main RightPanel export ─── */
export default function RightPanel({ mobileMode = false }: { mobileMode?: boolean }) {
    const { rightPanel, closeRightPanel, theme, rightPanelWidth, setRightPanelWidth } = useUIStore();
    const isDark = theme === 'dark';
    const pathname = usePathname();

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!rightPanel || rightPanel.type === 'notifications') return;
        
        const startX = e.pageX;
        const startWidth = rightPanelWidth;
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
            const delta = startX - moveEvent.pageX;
            const newWidth = Math.max(280, Math.min(600, startWidth + delta));
            setRightPanelWidth(newWidth);
        };
        
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
    };

    // Close any active right panel when navigating to a new page
    const prevPathname = React.useRef(pathname);
    useEffect(() => {
        if (prevPathname.current !== pathname) {
            if (rightPanel) {
                closeRightPanel();
            }
            prevPathname.current = pathname;
        }
    }, [pathname, rightPanel, closeRightPanel]);

    const titles: Record<string, string> = {
        notifications: 'Notifications',
        contact: 'Contact',
        company: 'Company',
        hook: 'Hook Details',
        form_response: 'Response Details',
    };

    const panelIcons: Record<string, any> = {
        notifications: Bell,
        contact: Users,
        company: Building2,
        hook: Zap,
        form_response: ClipboardList,
    };

    /* Mobile: render panel content directly (drawer handles the container) */
    if (mobileMode) {
        if (!rightPanel) return null;
        return (
            <div className="flex flex-col h-full overflow-hidden">
                {rightPanel.type !== 'template_browser' && (
                    <PanelHeader
                        title={titles[rightPanel.type] || 'Details'}
                        icon={panelIcons[rightPanel.type]}
                        isDark={isDark}
                        onClose={closeRightPanel}
                        onAction={rightPanel.type === 'notifications' ? useNotificationStore.getState().clearAll : undefined}
                        actionIcon={rightPanel.type === 'notifications' ? Trash2 : undefined}
                    />
                )}
                {rightPanel.type === 'notifications' && <NotificationsPanel isDark={isDark} />}
                {rightPanel.type === 'contact' && <ContactPanel id={rightPanel.id} isDark={isDark} />}
                {rightPanel.type === 'company' && <CompanyPanel id={rightPanel.id} isDark={isDark} />}
                {rightPanel.type === 'hook' && <HookPanel id={rightPanel.id} initialEditing={rightPanel.editing} isDark={isDark} />}
                {rightPanel.type === 'form_response' && <FormResponsePanel id={rightPanel.id} formId={rightPanel.formId} isDark={isDark} />}
                {rightPanel.type === 'template_browser' && <SectionTemplateBrowser onInsert={rightPanel.onInsert} />}
            </div>
        );
    }

    /* Desktop: animated width slide-in */
    return (
        <AnimatePresence mode="wait">
            {rightPanel && (
                <motion.div
                    key="right-panel"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ 
                        width: rightPanel.type === 'notifications' ? 280 : rightPanelWidth,
                        opacity: 1 
                    }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{
                        type: "tween",
                        duration: 0.2
                    }}
                    className={cn(
                        "h-full shrink-0 flex flex-row overflow-hidden relative",
                        isDark ? "border-r border-[#222]" : "border-r border-[#e4e4e4]"
                    )}
                >
                    {/* Resize handle */}
                    {rightPanel.type !== 'notifications' && (
                        <div 
                            onMouseDown={handleMouseDown}
                            className={cn(
                                "absolute -left-3 top-0 bottom-0 w-[24px] cursor-col-resize z-[100] transition-colors group flex items-center justify-center",
                                "hover:bg-primary/5 active:bg-primary/10"
                            )}
                        >
                            <div className={cn(
                                "w-[2px] h-8 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100",
                                isDark ? "bg-primary" : "bg-primary"
                            )} />
                        </div>
                    )}

                    <div 
                        className="h-full flex flex-col overflow-hidden"
                        style={{ width: rightPanel.type === 'notifications' ? 280 : rightPanelWidth }}
                    >
                        {rightPanel.type !== 'template_browser' && (
                            <PanelHeader
                                title={titles[rightPanel.type] || 'Details'}
                                icon={panelIcons[rightPanel.type]}
                                isDark={isDark}
                                onClose={closeRightPanel}
                                onAction={rightPanel.type === 'notifications' ? useNotificationStore.getState().clearAll : undefined}
                                actionIcon={rightPanel.type === 'notifications' ? Trash2 : undefined}
                            />
                        )}

                        {rightPanel.type === 'notifications' && <NotificationsPanel isDark={isDark} />}
                        {rightPanel.type === 'contact' && <ContactPanel id={rightPanel.id} isDark={isDark} />}
                        {rightPanel.type === 'company' && <CompanyPanel id={rightPanel.id} isDark={isDark} />}
                        {rightPanel.type === 'hook' && <HookPanel id={rightPanel.id} initialEditing={rightPanel.editing} isDark={isDark} />}
                        {rightPanel.type === 'form_response' && <FormResponsePanel id={rightPanel.id} formId={rightPanel.formId} isDark={isDark} />}
                        {rightPanel.type === 'template_browser' && <SectionTemplateBrowser onInsert={rightPanel.onInsert} />}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
