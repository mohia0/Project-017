"use client";

import React, { useState, useEffect } from 'react';
import {
    X, Bell, Mail, Phone, MapPin, Building2, Hash,
    FileText, Pencil, Save, Trash2, Check, ExternalLink,
    Globe, Briefcase, Users, ChevronRight, Eye, Search, Receipt, Image as ImageIcon, Zap, ClipboardList, AlertCircle, Calendar as CalendarIcon, Palette
} from 'lucide-react';
import ImageUploadModal from '@/components/modals/ImageUploadModal';
import { cn } from '@/lib/utils';
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
import { formatDistanceToNow } from 'date-fns';
import { useRouter, usePathname } from 'next/navigation';
import { Radio, Copy } from 'lucide-react';
import { gooeyToast } from 'goey-toast';

const COLORS = [
    '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9',
    '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316',
];

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
    const { notifications, fetchNotifications, subscribe, unsubscribe, markAsRead, markAllAsRead } = useNotificationStore();
    const [filterUnread, setFilterUnread] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
                        {filteredNotifications.map((notif) => (
                            <div 
                                key={notif.id}
                                onClick={() => {
                                    if (!notif.read) markAsRead(notif.id);
                                    if (notif.link) {
                                        router.push(notif.link);
                                        toggleNotifications();
                                    }
                                }}
                                className={cn(
                                    "flex items-start gap-2.5 px-4 py-2 border-b last:border-0 transition-colors cursor-pointer relative",
                                    isDark ? "border-[#252525] hover:bg-white/[0.02]" : "border-[#f0f0f0] hover:bg-[#f9f9f9]",
                                    !notif.read && (isDark ? "bg-white/[0.08]" : "bg-blue-500/[0.05]")
                                )}
                            >
                                {!notif.read && (
                                    <div className="absolute left-2.5 top-5 w-1 h-1 rounded-full bg-primary" />
                                )}
                                <div className={cn("w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0 mt-0.5", 
                                    isDark ? "bg-[#222]" : "bg-[#f0f0f0]"
                                )}>
                                    {(() => {
                                        const isLimitReached = notif.type === 'limit_reached' || notif.title?.toLowerCase().includes('limit');
                                        const isView = notif.type === 'view' || notif.title?.toLowerCase().includes('opened');
                                        
                                        const isFormResponse = !isView && !isLimitReached && (
                                            notif.link?.includes('/forms') || 
                                            notif.title?.toLowerCase().includes('form') || 
                                            notif.message?.toLowerCase().includes('form')
                                        );
                                        const isScheduler = !isView && !isLimitReached && !isFormResponse && (
                                            notif.link?.includes('/schedulers') || 
                                            notif.title?.toLowerCase().includes('scheduler') || 
                                            notif.message?.toLowerCase().includes('booking') ||
                                            notif.message?.toLowerCase().includes('meeting')
                                        );
                                        const isProposal = !isView && !isLimitReached && !isFormResponse && !isScheduler && (
                                            notif.link?.includes('proposal') || 
                                            notif.title?.toLowerCase().includes('proposal') || 
                                            notif.message?.toLowerCase().includes('proposal')
                                        );
                                        const isInvoice = !isView && !isLimitReached && !isFormResponse && !isScheduler && !isProposal && (
                                            notif.link?.includes('invoice') || 
                                            notif.title?.toLowerCase().includes('invoice') || 
                                            notif.message?.toLowerCase().includes('invoice')
                                        );

                                        const iconClass = isDark ? "text-[#888]" : "text-[#999]";

                                        if (isLimitReached) return <AlertCircle size={12} className="text-amber-500" />;
                                        if (isFormResponse) return <ClipboardList size={12} className={iconClass} />;
                                        if (isScheduler) return <CalendarIcon size={12} className={iconClass} />;
                                        if (isProposal) return <FileText size={12} className={iconClass} />;
                                        if (isInvoice) return <Receipt size={12} className={iconClass} />;
                                        return <Eye size={12} className={iconClass} />;
                                    })()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn("text-[12px] font-medium leading-tight", isDark ? "text-[#eee]" : "text-[#222]")}>
                                        {notif.title}
                                    </p>
                                    <p className={cn("text-[10px] mt-0.5 leading-tight opacity-70", isDark ? "text-[#888]" : "text-[#666]")}>
                                        {notif.message}
                                    </p>
                                    <p className={cn("text-[9px] mt-1 font-medium", isDark ? "text-[#444]" : "text-[#aaa]")}>
                                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        ))}
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

    const { proposals } = useProposalStore();
    const { invoices } = useInvoiceStore();

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
                        <h2 className={cn("text-[14px] font-bold truncate", isDark ? "text-white" : "text-[#111]")}>{form.contact_person || '—'}</h2>
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
                        {/* Quick email */}
                        {form.email && !editing && (
                            <div className="px-3 pt-3 mb-2">
                                <a href={`mailto:${form.email}`}
                                    className={cn("flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors group",
                                        isDark ? "bg-[#1a1a1a] border border-[#252525] text-primary hover:bg-[#1e1e1e]"
                                            : "bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15")}>
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
                                {proposals.filter(p => p.client_id === client.id || p.client_name === client.contact_person).length > 0 ? (
                                    proposals.filter(p => p.client_id === client.id || p.client_name === client.contact_person).map(p => (
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
                                {invoices.filter(i => i.client_id === client.id || i.client_name === client.contact_person).length > 0 ? (
                                    invoices.filter(i => i.client_id === client.id || i.client_name === client.contact_person).map(i => (
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
                                    saved ? "bg-primary text-black" : "bg-primary hover:bg-primary-hover text-black disabled:opacity-60")}>
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
                    <button onClick={() => setShowDelete(true)} className={cn("flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg transition-colors",
                        isDark ? "text-[#444] hover:text-red-400 hover:bg-red-400/10" : "text-[#ccc] hover:text-red-500 hover:bg-red-50")}>
                        <Trash2 size={11} />Delete contact
                    </button>
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
                                    saved ? "bg-primary text-black" : "bg-primary hover:bg-primary-hover text-black disabled:opacity-60")}>
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
    const { hooks, updateHook } = useHookStore();
    const hook = hooks.find(h => h.id === id);
    
    const [editing, setEditing] = useState(initialEditing);

    useEffect(() => {
        setEditing(initialEditing);
    }, [id, initialEditing]);
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
        gooeyToast.success('Copied to clipboard');
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
                        {/* Placement link */}
                        {hook.link && (
                            <div>
                                <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-2', isDark ? 'text-[#444]' : 'text-[#bbb]')}>Currently tracking</p>
                                <a
                                    href={hook.link.startsWith('http') ? hook.link : `https://${hook.link}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn('flex items-center gap-2 text-[11px] hover:underline', isDark ? 'text-primary' : 'text-primary')}
                                >
                                    <ExternalLink size={10} />
                                    {hook.link}
                                </a>
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
                            <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-2', isDark ? 'text-[#444]' : 'text-[#bbb]')}>HTML embed code</p>
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

                        {/* Instructions */}
                        <div className={cn('rounded-xl border p-4', isDark ? 'bg-[#1a1a1a] border-[#252525]' : 'bg-[#f7f7f9] border-[#e8e8f0]')}>
                            <p className={cn('text-[11px] font-bold mb-3', isDark ? 'text-[#aaa]' : 'text-[#555]')}>How to use</p>
                            {[
                                'Copy the HTML embed code above.',
                                'Paste it anywhere inside the <body> of a page.',
                                'When the page loads, the hook fires silently.',
                            ].map((step, i) => (
                                <div key={i} className="flex items-start gap-3 mb-2 last:mb-0">
                                    <span className={cn('w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5', isDark ? 'bg-white/8 text-[#666]' : 'bg-[#eaeaef] text-[#999]')}>
                                        {i + 1}
                                    </span>
                                    <p className={cn('text-[11px] leading-relaxed', isDark ? 'text-[#666]' : 'text-[#888]')}>{step}</p>
                                </div>
                            ))}
                        </div>
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
                            saved ? "bg-primary text-black" : "bg-primary hover:bg-primary-hover text-black disabled:opacity-60")}>
                        {saved ? <><Check size={12} />Saved</> : <><Save size={12} />{saving ? '...' : 'Save'}</>}
                    </button>
                </div>
            )}
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
            const newWidth = Math.max(280, Math.min(800, startWidth + delta));
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
    useEffect(() => {
        if (rightPanel) {
            closeRightPanel();
        }
    }, [pathname]);

    const titles: Record<string, string> = {
        notifications: 'Notifications',
        contact: 'Contact',
        company: 'Company',
        hook: 'Hook Details',
    };

    const panelIcons: Record<string, any> = {
        notifications: Bell,
        contact: Users,
        company: Building2,
        hook: Zap,
    };

    /* Mobile: render panel content directly (drawer handles the container) */
    if (mobileMode) {
        if (!rightPanel) return null;
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <PanelHeader
                    title={titles[rightPanel.type] || 'Details'}
                    icon={panelIcons[rightPanel.type]}
                    isDark={isDark}
                    onClose={closeRightPanel}
                    onAction={rightPanel.type === 'notifications' ? useNotificationStore.getState().clearAll : undefined}
                    actionIcon={rightPanel.type === 'notifications' ? Trash2 : undefined}
                />
                {rightPanel.type === 'notifications' && <NotificationsPanel isDark={isDark} />}
                {rightPanel.type === 'contact' && <ContactPanel id={rightPanel.id} isDark={isDark} />}
                {rightPanel.type === 'company' && <CompanyPanel id={rightPanel.id} isDark={isDark} />}
                {rightPanel.type === 'hook' && <HookPanel id={rightPanel.id} initialEditing={rightPanel.editing} isDark={isDark} />}
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
                    className="h-full shrink-0 flex flex-row overflow-hidden relative"
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
                        <PanelHeader
                            title={titles[rightPanel.type] || 'Details'}
                            icon={panelIcons[rightPanel.type]}
                            isDark={isDark}
                            onClose={closeRightPanel}
                            onAction={rightPanel.type === 'notifications' ? useNotificationStore.getState().clearAll : undefined}
                            actionIcon={rightPanel.type === 'notifications' ? Trash2 : undefined}
                        />

                        {rightPanel.type === 'notifications' && <NotificationsPanel isDark={isDark} />}
                        {rightPanel.type === 'contact' && <ContactPanel id={rightPanel.id} isDark={isDark} />}
                        {rightPanel.type === 'company' && <CompanyPanel id={rightPanel.id} isDark={isDark} />}
                        {rightPanel.type === 'hook' && <HookPanel id={rightPanel.id} initialEditing={rightPanel.editing} isDark={isDark} />}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
