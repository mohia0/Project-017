"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/store/useUIStore';
import {
    X, ChevronRight, User, PenTool, FileText,
    Mail, Phone, Building2, Calendar, Plus, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { gooeyToast } from 'goey-toast';
import { useClientStore } from '@/store/useClientStore';
import { useProposalStore } from '@/store/useProposalStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useRouter } from 'next/navigation';
import DatePicker from '@/components/ui/DatePicker';
import ClientEditor from '@/components/clients/ClientEditor';
import { CompanyPicker } from '@/components/companies/CompanyPicker';

type EntityType = 'Client' | 'Proposal' | 'Invoice';

function generateProposalId() { return `P${Math.floor(Math.random() * 9000000 + 1000000)}`; }
function generateInvoiceId() { return `INV-${Math.floor(Math.random() * 9000000 + 1000000)}`; }
function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

const TABS: { id: EntityType; icon: React.ReactNode; label: string }[] = [
    { id: 'Client',   icon: <User size={14} />,     label: 'Contact'  },
    { id: 'Proposal', icon: <PenTool size={14} />,  label: 'Proposal' },
    { id: 'Invoice',  icon: <FileText size={14} />, label: 'Invoice'  },
];

// ─── Shared Field ────────────────────────────────────────────────────────────
function Field({ label, icon, children, isDark }: {
    label: string; icon: React.ReactNode; children: React.ReactNode; isDark: boolean;
}) {
    return (
        <div className={cn(
            "w-full rounded-xl border px-4 py-3 text-[13px] transition-all focus-within:ring-2",
            isDark
                ? "bg-[#1c1c1c] border-[#2e2e2e] focus-within:ring-[#333] focus-within:border-[#444]"
                : "bg-white border-[#e0e0e0] focus-within:ring-[#e8e8e8] focus-within:border-[#ccc]"
        )}>
            <div className="flex items-center gap-1.5 mb-0.5">
                <span className={cn("opacity-40", isDark ? "text-white" : "text-[#333]")}>{icon}</span>
                <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>{label}</span>
            </div>
            {children}
        </div>
    );
}

function TextInput({ value, onChange, placeholder, type = 'text', isDark, autoFocus }: {
    value: string; onChange: (v: string) => void; placeholder?: string; type?: string; isDark: boolean; autoFocus?: boolean;
}) {
    return (
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
                "bg-transparent outline-none text-[13px] w-full",
                isDark ? "text-white placeholder:text-[#555]" : "text-[#111] placeholder:text-[#bbb]"
            )}
        />
    );
}

// ─── Client Search Dropdown ───────────────────────────────────────────────────
function ClientPicker({ isDark, selectedClient, selectedClientId, onSelect }: {
    isDark: boolean;
    selectedClient: string;
    selectedClientId: string | null;
    onSelect: (name: string, id: string) => void;
}) {
    const { clients } = useClientStore();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [isClientEditorOpen, setIsClientEditorOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = clients.filter(c =>
        (c.contact_person + ' ' + c.company_name).toLowerCase().includes(query.toLowerCase())
    );

    const handleCreateClient = async (data: any) => {
        const client = await useClientStore.getState().addClient(data);
        if (client) {
            onSelect(client.contact_person || client.company_name, client.id);
            setIsClientEditorOpen(false);
            setQuery('');
            setOpen(false);
            gooeyToast.success('Contact created and selected');
        }
    };

    return (
        <div className="relative" ref={ref}>
            <Field label="Client" icon={<User size={11} />} isDark={isDark}>
                <button
                    type="button"
                    onClick={() => setOpen(v => !v)}
                    className={cn(
                        "w-full text-left text-[13px]",
                        selectedClient
                            ? isDark ? "text-white" : "text-[#111]"
                            : isDark ? "text-[#555]" : "text-[#bbb]"
                    )}
                >
                    {selectedClient || "Choose from contacts..."}
                </button>
            </Field>

            {open && (
                <div className={cn(
                    "absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-50 overflow-hidden",
                    isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]"
                )}>
                    <div className="p-2 border-b border-inherit">
                        <input
                            autoFocus
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search contacts..."
                            className={cn(
                                "w-full text-[12px] px-3 py-1.5 rounded-lg outline-none",
                                isDark ? "bg-[#252525] text-white placeholder:text-[#555]" : "bg-[#f5f5f5] text-[#111] placeholder:text-[#aaa]"
                            )}
                        />
                    </div>
                    <div className="max-h-44 overflow-auto">
                        {filtered.length === 0 && !query ? (
                            <div className={cn("px-4 py-3 text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No contacts found</div>
                        ) : (
                            <>
                                {filtered.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => { onSelect(c.contact_person || c.company_name, c.id); setQuery(''); setOpen(false); }}
                                        className={cn(
                                            "w-full text-left px-4 py-2.5 text-[13px] transition-colors",
                                            isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]"
                                        )}
                                    >
                                        <span className="font-medium">{c.contact_person}</span>
                                        {c.company_name && <span className={cn("ml-2 text-[11px]", isDark ? "text-[#555]" : "text-[#aaa]")}>{c.company_name}</span>}
                                    </button>
                                ))}
                                <div className={cn("border-t", isDark ? "border-white/5" : "border-black/5")} />
                                <button
                                    onClick={() => setIsClientEditorOpen(true)}
                                    className={cn(
                                        "w-full text-left px-4 py-2.5 text-[13px] font-bold transition-colors flex items-center gap-2",
                                        isDark ? "text-primary hover:bg-white/5" : "text-primary hover:bg-black/5"
                                    )}
                                >
                                    <Plus size={14} strokeWidth={3} />
                                    {query ? `Create "${query}"` : 'Create new contact'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {isClientEditorOpen && (
                <ClientEditor
                    onClose={() => setIsClientEditorOpen(false)}
                    onSave={handleCreateClient}
                    initialData={{
                        contact_person: query,
                        company_name: '',
                        email: ''
                    }}
                />
            )}
        </div>
    );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function CreateEntryModal() {
    const { isCreateModalOpen, setCreateModalOpen, theme } = useUIStore();
    const isDark = theme === 'dark';
    const router = useRouter();

    const [tab, setTab] = useState<EntityType>('Proposal');
    const [tabSearch, setTabSearch] = useState('');
    const [loading, setLoading] = useState(false);

    // Contact state
    const [cName, setCName] = useState('');
    const [cEmail, setCEmail] = useState('');
    const [cPhone, setCPhone] = useState('');
    const [cCompany, setCCompany] = useState('');

    // Proposal state
    const [pTitle, setPTitle] = useState(generateProposalId);
    const [pClient, setPClient] = useState('');
    const [pClientId, setPClientId] = useState<string | null>(null);
    const [pIssueDate, setPIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [pExpiry, setPExpiry] = useState(() => new Date().toISOString().split('T')[0]);

    // Invoice state
    const [iTitle, setITitle] = useState(generateInvoiceId);
    const [iClient, setIClient] = useState('');
    const [iClientId, setIClientId] = useState<string | null>(null);
    const [iIssueDate, setIIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [iDueDate, setIDueDate] = useState(() => addDays(new Date(), 7));

    const { addClient, fetchClients } = useClientStore();
    const { addProposal } = useProposalStore();
    const { addInvoice } = useInvoiceStore();

    useEffect(() => { fetchClients(); }, [fetchClients]);

    if (!isCreateModalOpen) return null;

    const filteredTabs = TABS.filter(t => t.label.toLowerCase().includes(tabSearch.toLowerCase()));

    const ctaLabel = tab === 'Client' ? 'Create contact' : tab === 'Proposal' ? 'Create proposal' : 'Create invoice';

    const handleCreate = async () => {
        setLoading(true);
        try {
            if (tab === 'Client') {
                const client = await addClient({
                    contact_person: cName,
                    email: cEmail,
                    phone: cPhone,
                    company_name: cCompany,
                    address: '', tax_number: '', notes: ''
                });
                if (!client) {
                    gooeyToast.error("Failed to create contact.");
                    return;
                }
                setCreateModalOpen(false);
            } else if (tab === 'Proposal') {
                const p = await addProposal({
                    title: pTitle,
                    client_id: pClientId,
                    client_name: pClient,
                    status: 'Draft',
                    amount: 0,
                    issue_date: pIssueDate,
                    due_date: pExpiry,
                    notes: '',
                    blocks: []
                });
                if (!p) {
                    gooeyToast.error("Failed to create proposal.");
                    return;
                }
                setCreateModalOpen(false);
                router.push(`/proposals/${p.id}`);
            } else {
                const inv = await addInvoice({
                    title: iTitle,
                    client_id: iClientId,
                    client_name: iClient,
                    status: 'Draft',
                    amount: 0,
                    issue_date: iIssueDate,
                    due_date: iDueDate,
                    notes: '',
                    blocks: []
                });
                if (!inv) {
                    gooeyToast.error("Failed to create invoice.");
                    return;
                }
                setCreateModalOpen(false);
                router.push(`/invoices/${inv.id}`);
            }
        } catch (err: any) {
            console.error(err);
            gooeyToast.error(err?.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) setCreateModalOpen(false); }}
        >
            <div className={cn(
                "w-full max-w-[580px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200",
                isDark ? "bg-[#161616] border border-[#252525]" : "bg-[#f7f7f7] border border-[#e0e0e0]"
            )}>

                {/* Header */}
                <div className={cn(
                    "flex items-center justify-between px-5 pt-5 pb-4 border-b",
                    isDark ? "border-[#252525]" : "border-[#eaeaef]"
                )}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Plus size={14} className="text-primary" strokeWidth={3} />
                        </div>
                        <h2 className={cn("text-[15px] font-bold tracking-tight", isDark ? "text-white" : "text-[#111]")}>
                            Create New
                        </h2>
                    </div>
                    <button
                        onClick={() => setCreateModalOpen(false)}
                        className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                            isDark ? "bg-[#252525] text-[#666] hover:text-[#ccc]" : "bg-[#e8e8e8] text-[#888] hover:text-[#333]"
                        )}
                    >
                        <X size={14} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden min-h-[440px]">
                    {/* Sidebar Tabs */}
                    <div className={cn(
                        "w-[170px] flex flex-col p-2 border-r",
                        isDark ? "bg-[#111] border-[#252525]" : "bg-[#f9f9fb] border-[#eaeaef]"
                    )}>
                        {/* Tab Search Placeholder for future usage */}
                        <div className={cn(
                            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-2",
                            isDark ? "bg-white/[0.03]" : "bg-white border border-[#eaeaef]"
                        )}>
                            <Search size={12} className="opacity-20" />
                            <input 
                                value={tabSearch}
                                onChange={e => setTabSearch(e.target.value)}
                                placeholder="Search tools..."
                                className="bg-transparent border-none outline-none text-[11px] w-full font-medium"
                            />
                        </div>

                        <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
                            {filteredTabs.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all group shrink-0",
                                        tab === t.id
                                            ? isDark
                                                ? "bg-[#2a2a2a] text-white shadow-sm"
                                                : "bg-white text-primary shadow-sm border border-[#e0e0eb]"
                                            : isDark
                                                ? "text-[#555] hover:text-[#888] hover:bg-white/[0.02]"
                                                : "text-[#999] hover:text-[#555] hover:bg-[#efeff5]"
                                    )}
                                >
                                    <span className={cn(
                                        "transition-colors",
                                        tab === t.id ? "text-primary" : "opacity-40 group-hover:opacity-60"
                                    )}>
                                        {t.icon}
                                    </span>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 px-6 py-6 overflow-y-auto no-scrollbar">
                            <h3 className={cn("text-[14px] font-bold mb-5 flex items-center gap-2", isDark ? "text-white" : "text-[#111]")}>
                                New {tab === 'Client' ? 'Contact' : tab}
                            </h3>
                            
                            <div className="flex flex-col gap-3">
                                {/* ── Contact Form ── */}
                                {tab === 'Client' && (
                                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <Field label="Full name" icon={<User size={11} />} isDark={isDark}>
                                            <TextInput value={cName} onChange={setCName} placeholder="John Doe" isDark={isDark} autoFocus />
                                        </Field>
                                        <Field label="Email address" icon={<Mail size={11} />} isDark={isDark}>
                                            <TextInput value={cEmail} onChange={setCEmail} placeholder="john@example.com" type="email" isDark={isDark} />
                                        </Field>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label="Phone" icon={<Phone size={11} />} isDark={isDark}>
                                                <TextInput value={cPhone} onChange={setCPhone} placeholder="+1 234 567 890" isDark={isDark} />
                                            </Field>
                                            <Field label="Company" icon={<Building2 size={11} />} isDark={isDark}>
                                                <CompanyPicker
                                                    minimal
                                                    isDark={isDark}
                                                    value={cCompany}
                                                    onChange={setCCompany}
                                                    placeholder="Search or add company"
                                                />
                                            </Field>
                                        </div>
                                    </div>
                                )}

                                {/* ── Proposal Form ── */}
                                {tab === 'Proposal' && (
                                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <Field label="Proposal title" icon={<PenTool size={11} />} isDark={isDark}>
                                            <TextInput value={pTitle} onChange={setPTitle} placeholder="Untitled proposal" isDark={isDark} autoFocus />
                                        </Field>
                                        <ClientPicker
                                            isDark={isDark}
                                            selectedClient={pClient}
                                            selectedClientId={pClientId}
                                            onSelect={(name, id) => { setPClient(name); setPClientId(id); }}
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label="Issue date" icon={<Calendar size={11} />} isDark={isDark}>
                                                <DatePicker value={pIssueDate} onChange={setPIssueDate} isDark={isDark} />
                                            </Field>
                                            <Field label="Expiration date" icon={<Calendar size={11} />} isDark={isDark}>
                                                <DatePicker value={pExpiry} onChange={setPExpiry} isDark={isDark} placeholder="Add expiration" align="right" />
                                            </Field>
                                        </div>
                                    </div>
                                )}

                                {/* ── Invoice Form ── */}
                                {tab === 'Invoice' && (
                                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <Field label="Invoice title" icon={<FileText size={11} />} isDark={isDark}>
                                            <TextInput value={iTitle} onChange={setITitle} placeholder="INV-000" isDark={isDark} autoFocus />
                                        </Field>
                                        <ClientPicker
                                            isDark={isDark}
                                            selectedClient={iClient}
                                            selectedClientId={iClientId}
                                            onSelect={(name, id) => { setIClient(name); setIClientId(id); }}
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label="Issue date" icon={<Calendar size={11} />} isDark={isDark}>
                                                <DatePicker value={iIssueDate} onChange={setIIssueDate} isDark={isDark} />
                                            </Field>
                                            <Field label="Due date" icon={<Calendar size={11} />} isDark={isDark}>
                                                <DatePicker value={iDueDate} onChange={setIDueDate} isDark={isDark} align="right" />
                                            </Field>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={cn(
                            "flex items-center justify-between px-6 py-4 border-t mt-auto",
                            isDark ? "border-[#252525] bg-[#111]" : "border-[#e8e8e8] bg-white"
                        )}>
                            <button
                                onClick={() => setCreateModalOpen(false)}
                                className={cn(
                                    "px-4 py-2 text-[13px] font-medium rounded-xl transition-colors",
                                    isDark ? "text-[#777] hover:text-[#ccc] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f5f5f5]"
                                )}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-2 text-[13px] font-bold rounded-xl bg-primary hover:bg-primary-hover text-black transition-all active:scale-[0.98] disabled:opacity-60 shadow-[0_4px_14px_-4px_rgba(var(--brand-primary-rgb),0.4)]"
                            >
                                {loading ? 'Creating...' : ctaLabel}
                                {!loading && <ChevronRight size={14} strokeWidth={2.5} />}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
