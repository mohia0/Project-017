"use client";

import React, { useState } from 'react';
import { useUIStore } from '@/store/useUIStore';
import {
    X, CheckCircle, Folder, FileText, CreditCard, RefreshCw, PenTool,
    User, Building, Calendar, CalendarClock, MessageSquare, Clock,
    AlignLeft, Zap, Plus, Mail, Phone, Hash, ChevronDown, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientStore } from '@/store/useClientStore';
import { useProposalStore } from '@/store/useProposalStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useRouter } from 'next/navigation';

type EntityType = 'Project' | 'Scheduler' | 'Form' | 'Conversation' | 'Invoice' | 'File' | 'Proposal' | 'Client';

const ENTITIES: { id: EntityType; icon: React.ReactNode; label: string }[] = [
    { id: 'Client', icon: <User size={14} />, label: 'Contact' },
    { id: 'Proposal', icon: <PenTool size={14} />, label: 'Proposal' },
    { id: 'Invoice', icon: <FileText size={14} />, label: 'Invoice' },
];

export default function CreateEntryModal() {
    const { isCreateModalOpen, setCreateModalOpen, theme } = useUIStore();
    const isDark = theme === 'dark';
    const [selectedEntity, setSelectedEntity] = useState<EntityType>('Proposal');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Stores
    const { addClient } = useClientStore();
    const { addProposal } = useProposalStore();
    const { addInvoice } = useInvoiceStore();

    // Common State for forms
    const [formStates, setFormStates] = useState<any>({
        Client: { name: '', email: '', phone: '', company: '' },
        Proposal: { title: `P${Math.floor(Math.random() * 900000 + 100000)}`, clientId: null, clientName: '', date: new Date().toISOString().split('T')[0] },
        Invoice: { title: `INV-${Math.floor(Math.random() * 900000 + 100000)}`, clientId: null, clientName: '', date: new Date().toISOString().split('T')[0] },
    });

    if (!isCreateModalOpen) return null;

    const handleUpdateField = (entity: EntityType, field: string, value: any) => {
        setFormStates((prev: any) => ({
            ...prev,
            [entity]: { ...prev[entity], [field]: value }
        }));
    };

    const handleCreate = async () => {
        setLoading(true);
        try {
            if (selectedEntity === 'Client') {
                const data = formStates.Client;
                await addClient({
                    contact_person: data.name,
                    email: data.email,
                    phone: data.phone,
                    company_name: data.company,
                    address: '',
                    tax_number: '',
                    notes: ''
                });
            } else if (selectedEntity === 'Proposal') {
                const data = formStates.Proposal;
                const p = await addProposal({
                    title: data.title,
                    client_id: data.clientId,
                    client_name: data.clientName,
                    amount: 0,
                    status: 'Draft',
                    issue_date: data.date,
                    due_date: '',
                    notes: '',
                    blocks: []
                });
                if (p) router.push(`/proposals/${p.id}`);
            } else if (selectedEntity === 'Invoice') {
                const data = formStates.Invoice;
                const inv = await addInvoice({
                    title: data.title,
                    client_id: data.clientId,
                    client_name: data.clientName,
                    amount: 0,
                    status: 'Draft',
                    issue_date: data.date,
                    due_date: data.date,
                    notes: '',
                    blocks: []
                });
                if (inv) router.push(`/invoices/${inv.id}`);
            }
            setCreateModalOpen(false);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Modal Container */}
            <div className={cn(
                "w-full max-w-[580px] h-auto max-h-[90vh] rounded-[16px] overflow-hidden flex flex-col font-sans transition-all duration-300",
                isDark 
                    ? "bg-[#161616] border border-[#222] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]" 
                    : "bg-white border border-[#d2d2eb] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)] text-[#111]"
            )}>

                {/* Header */}
                <div className={cn(
                    "flex items-center justify-between px-5 py-4 border-b",
                    isDark ? "border-[#222] bg-[#161616]" : "border-[#eaeaef] bg-[#f9f9fb]"
                )}>
                    <div className="flex items-center gap-2.5">
                        <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center",
                            isDark ? "bg-[#4dbf39]/10" : "bg-[#4dbf39]/10"
                        )}>
                            <Plus size={14} className="text-[#4dbf39]" strokeWidth={3} />
                        </div>
                        <h2 className={cn("text-[14px] font-bold tracking-tight", isDark ? "text-white" : "text-[#111]")}>Create New</h2>
                    </div>
                    <button
                        onClick={() => setCreateModalOpen(false)}
                        className={cn(
                            "transition-all p-1.5 rounded-full",
                            isDark ? "text-[#444] hover:text-white hover:bg-white/5" : "text-[#999] hover:text-[#111] hover:bg-[#f1f1f9]"
                        )}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex flex-1 overflow-hidden h-[420px]">

                    {/* Left Sidebar - Entities List */}
                    <div className={cn(
                        "w-[160px] border-r overflow-y-auto no-scrollbar p-2 flex flex-col gap-0.5",
                        isDark ? "border-[#222] bg-[#0f0f0f]" : "border-[#eaeaef] bg-[#f9f9fb]"
                    )}>
                        {ENTITIES.map((entity) => (
                            <button
                                key={entity.id}
                                onClick={() => setSelectedEntity(entity.id)}
                                className={cn(
                                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-[12px] font-bold",
                                    selectedEntity === entity.id
                                        ? isDark 
                                            ? "bg-white/[0.03] text-white" 
                                            : "bg-white border border-[#d2d2eb] text-[#4dbf39]"
                                        : isDark 
                                            ? "text-[#444] hover:text-white" 
                                            : "text-[#888] hover:text-[#111]"
                                )}
                            >
                                <span className={cn(
                                    "transition-colors",
                                    selectedEntity === entity.id 
                                        ? "text-[#4dbf39]"
                                        : "opacity-30"
                                )}>
                                    {entity.icon}
                                </span>
                                {entity.label}
                            </button>
                        ))}
                    </div>

                    {/* Right Side - Form Area */}
                    <div className="flex-1 flex flex-col relative overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {selectedEntity === 'Client' && (
                                <ContactForm 
                                    isDark={isDark} 
                                    data={formStates.Client} 
                                    onChange={(f: string, v: string) => handleUpdateField('Client', f, v)} 
                                />
                            )}
                            {selectedEntity === 'Proposal' && (
                                <ProposalForm 
                                    isDark={isDark} 
                                    data={formStates.Proposal} 
                                    onChange={(f: string, v: string) => handleUpdateField('Proposal', f, v)} 
                                />
                            )}
                            {selectedEntity === 'Invoice' && (
                                <InvoiceForm 
                                    isDark={isDark} 
                                    data={formStates.Invoice} 
                                    onChange={(f: string, v: string) => handleUpdateField('Invoice', f, v)} 
                                />
                            )}
                        </div>

                        {/* Footer Buttons */}
                        <div className={cn(
                            "px-6 py-4 flex items-center gap-3 justify-end border-t mt-auto",
                            isDark ? "border-[#222] bg-[#161616]" : "border-[#eaeaef] bg-white"
                        )}>
                            <button
                                onClick={() => setCreateModalOpen(false)}
                                className={cn(
                                    "px-4 py-2 rounded-[10px] text-[12px] font-bold transition-all",
                                    isDark ? "text-[#444] hover:text-white" : "text-[#888] hover:text-[#111]"
                                )}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={loading}
                                className={cn(
                                    "px-6 py-2 rounded-[10px] text-[12px] font-bold transition-all active:scale-[0.98] disabled:opacity-50",
                                    "bg-[#4dbf39] text-black hover:bg-[#59d044] shadow-[0_8px_20px_-4px_rgba(77,191,57,0.3)]"
                                )}
                            >
                                {loading ? 'Creating...' : `Create ${selectedEntity}`}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// ----------------------------------------------------
// FORM COMPONENTS
// ----------------------------------------------------

function QuickInput({ label, icon: Icon, value, onChange, placeholder, isDark, type = 'text' }: any) {
    return (
        <div className={cn(
            "rounded-[12px] border px-4 py-3 transition-all group focus-within:border-[#4dbf39]/30",
            isDark ? "bg-[#1c1c1c] border-[#222]" : "bg-[#f9f9fb] border-[#eaeaef]"
        )}>
            <div className="flex items-center gap-2 mb-1.5">
                {Icon && <Icon size={10} className="opacity-20" />}
                <label className={cn("text-[9px] font-black uppercase tracking-[0.15em] opacity-30", isDark ? "text-white" : "text-[#111]")}>{label}</label>
            </div>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    "w-full bg-transparent border-none p-0 text-[13px] font-bold focus:ring-0 leading-tight",
                    isDark ? "text-white placeholder-white/[0.05]" : "text-[#111] placeholder-black/10"
                )}
            />
        </div>
    );
}

function ContactForm({ isDark, data, onChange }: any) {
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className={cn("text-[14px] font-black tracking-tight mb-2", isDark ? "text-white" : "text-[#111]")}>Create New Contact</h3>
            <div className="space-y-3">
                <QuickInput label="Full Name" icon={User} value={data.name} onChange={(v: string) => onChange('name', v)} placeholder="John Doe" isDark={isDark} />
                <QuickInput label="Email Address" icon={Mail} value={data.email} onChange={(v: string) => onChange('email', v)} placeholder="john@example.com" isDark={isDark} />
                <div className="grid grid-cols-2 gap-3">
                    <QuickInput label="Phone" icon={Phone} value={data.phone} onChange={(v: string) => onChange('phone', v)} placeholder="+1..." isDark={isDark} />
                    <QuickInput label="Company" icon={Building} value={data.company} onChange={(v: string) => onChange('company', v)} placeholder="Acme Inc." isDark={isDark} />
                </div>
            </div>
        </div>
    );
}

function ProposalForm({ isDark, data, onChange }: any) {
    const { clients } = useClientStore();
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className={cn("text-[14px] font-black tracking-tight mb-2", isDark ? "text-white" : "text-[#111]")}>Create New Proposal</h3>
            <div className="space-y-3">
                <QuickInput label="Proposal Title" icon={PenTool} value={data.title} onChange={(v: string) => onChange('title', v)} placeholder="Untitled Proposal" isDark={isDark} />
                
                <div className={cn(
                    "rounded-[12px] border px-4 py-3 transition-all group",
                    isDark ? "bg-[#1c1c1c] border-[#222]" : "bg-[#f9f9fb] border-[#eaeaef]"
                )}>
                    <div className="flex items-center gap-2 mb-1.5">
                        <User size={10} className="opacity-20" />
                        <label className={cn("text-[9px] font-black uppercase tracking-[0.15em] opacity-30", isDark ? "text-white" : "text-[#111]")}>Client</label>
                    </div>
                    <select 
                        value={data.clientId || ''} 
                        onChange={e => {
                            const c = clients.find(cl => cl.id === e.target.value);
                            onChange('clientId', e.target.value);
                            onChange('clientName', c ? c.contact_person : '');
                        }}
                        className={cn(
                            "w-full bg-transparent border-none p-0 text-[13px] font-bold focus:ring-0 appearance-none cursor-pointer",
                            isDark ? "text-white" : "text-[#111]"
                        )}
                    >
                        <option value="" disabled className={isDark ? "bg-[#141414]" : "bg-white"}>Choose from contacts...</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id} className={isDark ? "bg-[#141414]" : "bg-white"}>{c.contact_person}</option>
                        ))}
                    </select>
                </div>

                <QuickInput label="Issue Date" icon={Calendar} value={data.date} onChange={(v: string) => onChange('date', v)} type="date" isDark={isDark} />
            </div>
        </div>
    );
}

function InvoiceForm({ isDark, data, onChange }: any) {
    const { clients } = useClientStore();
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className={cn("text-[14px] font-black tracking-tight mb-2", isDark ? "text-white" : "text-[#111]")}>Create New Invoice</h3>
            <div className="space-y-3">
                <QuickInput label="Invoice Identifier" icon={FileText} value={data.title} onChange={(v: string) => onChange('title', v)} placeholder="INV-000" isDark={isDark} />
                
                <div className={cn(
                    "rounded-[12px] border px-4 py-3 transition-all group",
                    isDark ? "bg-[#1c1c1c] border-[#222]" : "bg-[#f9f9fb] border-[#eaeaef]"
                )}>
                    <div className="flex items-center gap-2 mb-1.5">
                        <User size={10} className="opacity-20" />
                        <label className={cn("text-[9px] font-black uppercase tracking-[0.15em] opacity-30", isDark ? "text-white" : "text-[#111]")}>Client</label>
                    </div>
                    <select 
                        value={data.clientId || ''} 
                        onChange={e => {
                            const c = clients.find(cl => cl.id === e.target.value);
                            onChange('clientId', e.target.value);
                            onChange('clientName', c ? c.contact_person : '');
                        }}
                        className={cn(
                            "w-full bg-transparent border-none p-0 text-[13px] font-bold focus:ring-0 appearance-none cursor-pointer",
                            isDark ? "text-white" : "text-[#111]"
                        )}
                    >
                        <option value="" disabled className={isDark ? "bg-[#141414]" : "bg-white"}>Choose from contacts...</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id} className={isDark ? "bg-[#141414]" : "bg-white"}>{c.contact_person}</option>
                        ))}
                    </select>
                </div>

                <QuickInput label="Due Date" icon={Calendar} value={data.date} onChange={(v: string) => onChange('date', v)} type="date" isDark={isDark} />
            </div>
        </div>
    );
}
