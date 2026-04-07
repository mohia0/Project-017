"use client";

import React, { useState, useCallback, useRef } from 'react';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from 'uuid';
import {
    ArrowLeft, ChevronDown, Download, Send, Copy, Link2,
    Share2, Eye, EyeOff, Plus, GripVertical, Trash2,
    User, Calendar, DollarSign, Tag, AlignLeft,
    Table, PenLine, Zap, Palette, Info,
    Check, MoreHorizontal, FileText, Image, SeparatorHorizontal,
    Settings, ChevronRight, RotateCcw, Monitor, Smartphone, PanelTop,
    Printer
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useClientStore } from '@/store/useClientStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useDebounce } from '@/hooks/useDebounce';
import { ContentBlock } from '../proposals/blocks/ContentBlock';
import { SectionBlockWrapper } from '../proposals/blocks/SectionBlockWrapper';
import { ClientActionBar } from '@/components/ui/ClientActionBar';

/* ═══════════════════════════════════════════════════════
   TYPES
   (Sync with ProposalEditor but for Invoices)
═══════════════════════════════════════════════════════ */
type BlockType = 'heading' | 'text' | 'pricing' | 'divider' | 'image' | 'header';

interface PricingRow {
    id: string;
    title?: string;
    description: string;
    qty: number;
    rate: number;
}

interface BlockData {
    id: string;
    type: BlockType;
    content?: string;
    level?: 1 | 2 | 3;
    rows?: PricingRow[];
    taxRate?: number;
    discountRate?: number;
    showTax?: boolean;
    showDiscount?: boolean;
    note?: string;
    hideQty?: boolean;
}

interface InvoiceMeta {
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string;
    projectName: string;
    issueDate: string;
    dueDate: string;
    currency: string;
    discountCalc: 'before_tax' | 'after_tax';
    invoiceNumber: string;
    status: 'Draft' | 'Pending' | 'Paid' | 'Overdue';
    logoUrl?: string;
    documentTitle?: string;
}

type RightPanelTab = 'details' | 'appearance' | 'automation';

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
    Draft:    { bg: 'bg-[#eff6ff] border border-[#bfdbfe]', text: 'text-[#1d4ed8]' },
    Pending:  { bg: 'bg-[#fef3c7] border border-[#fde68a]', text: 'text-[#b45309]' },
    Paid:     { bg: 'bg-[#dcfce7] border border-[#bbf7d0]', text: 'text-[#15803d]' },
    Overdue:  { bg: 'bg-[#fff7ed] border border-[#fed7aa]', text: 'text-[#c2410c]' },
};

function fmt(n: number, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
}

const BLOCK_MENU = [
    { type: 'header'    as BlockType, label: 'Header & Meta', icon: PanelTop,            tag: 'Layout' },
    { type: 'text'      as BlockType, label: 'Content',       icon: FileText,            tag: 'Text' },
    { type: 'pricing'   as BlockType, label: 'Items Table',   icon: Table,               tag: 'Finance' },
    { type: 'divider'   as BlockType, label: 'Divider',       icon: SeparatorHorizontal, tag: 'Layout' },
    { type: 'image'     as BlockType, label: 'Image',         icon: Image,               tag: 'Media' },
];

export default function InvoiceEditor({ id }: { id?: string }) {
    const router = useRouter();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { clients, fetchClients } = useClientStore();
    const { updateInvoice, fetchInvoices, invoices } = useInvoiceStore();

    React.useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
    const [isPreview, setIsPreview] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [rightTab, setRightTab] = useState<RightPanelTab>('details');
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [copied, setCopied] = useState(false);
    const [openInsertMenu, setOpenInsertMenu] = useState<number | null>(null);

    const isMobilePreview = isPreview && previewMode === 'mobile';

    const [meta, setMeta] = useState<InvoiceMeta>({
        clientName: '',
        projectName: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        currency: 'USD',
        discountCalc: 'before_tax',
        invoiceNumber: 'INV-0170371',
        status: 'Draft',
        logoUrl: '',
        documentTitle: 'INVOICE',
    });

    const [blocks, setBlocks] = useState<BlockData[]>([
        { id: 'b1', type: 'header' },
        {
            id: 'b2', type: 'text',
            content: "Thank you for your business. Please find the details of the invoice below."
        },
        {
            id: 'b3', type: 'pricing',
            rows: [
                { id: 'r1', title: 'Service Fee', description: 'Design & Development', qty: 1, rate: 1200 },
            ],
            taxRate: 0, discountRate: 0, showTax: true, showDiscount: false,
        }
    ]);

    const [isLoaded, setIsLoaded] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const debouncedMeta = useDebounce(meta, 1000);
    const debouncedBlocks = useDebounce(blocks, 1000);

    // Initial load effect
    React.useEffect(() => {
        if (!id) {
            setIsLoaded(true);
            return;
        }
        fetchInvoices();
    }, [id, fetchInvoices]);

    React.useEffect(() => {
        if (!id) return;
        const invoice = invoices.find(i => i.id === id);
        if (invoice && !isLoaded) {
            setMeta(prev => ({
                ...prev,
                clientName: invoice.client_name || '',
                projectName: invoice.title || '',
                issueDate: invoice.issue_date ? invoice.issue_date.split('T')[0] : prev.issueDate,
                dueDate: invoice.due_date ? invoice.due_date.split('T')[0] : prev.dueDate,
                status: invoice.status as any,
                invoiceNumber: invoice.id.slice(0, 8).toUpperCase()
            }));
            if (invoice.blocks && Array.isArray(invoice.blocks) && invoice.blocks.length > 0) {
                setBlocks(invoice.blocks);
            }
            setIsLoaded(true);
        }
    }, [id, invoices, isLoaded]);

    // Auto-save effect
    const isFirstRender = useRef(true);
    React.useEffect(() => {
        if (isFirstRender.current || !isLoaded || !id) {
            if (isLoaded) isFirstRender.current = false;
            return;
        }

        const totalAmount = debouncedBlocks.reduce((acc, block) => {
            if (block.type === 'pricing' && block.rows) {
                const sub = block.rows.reduce((sum: number, r: any) => sum + (r.qty * r.rate), 0);
                const discount = block.discountRate ? (sub * block.discountRate / 100) : 0;
                const afterDiscount = sub - discount;
                const tax = block.taxRate ? (afterDiscount * block.taxRate / 100) : 0;
                return acc + afterDiscount + tax;
            }
            return acc;
        }, 0);

        setSaveStatus('saving');
        updateInvoice(id, {
            title: debouncedMeta.projectName || 'New Invoice',
            client_name: debouncedMeta.clientName,
            status: debouncedMeta.status,
            issue_date: debouncedMeta.issueDate,
            due_date: debouncedMeta.dueDate,
            amount: totalAmount,
            blocks: debouncedBlocks,
        }).then(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        });
    }, [debouncedMeta, debouncedBlocks, id, isLoaded, updateInvoice]);

    /* ── Block mutations ── */
    const addBlock = (type: BlockType, afterId?: string) => {
        const nb: BlockData = {
            id: uuidv4(), type,
            ...(type === 'heading'   ? { content: 'New Section',  level: 2 } : {}),
            ...(type === 'text'      ? { content: '' } : {}),
            ...(type === 'pricing'   ? { rows: [{ id: uuidv4(), description: '', qty: 1, rate: 0 }], taxRate: 0, discountRate: 0, showTax: false, showDiscount: false } : {}),
        };
        setBlocks(prev => {
            if (!afterId) return [...prev, nb];
            const idx = prev.findIndex(b => b.id === afterId);
            const next = [...prev];
            next.splice(idx + 1, 0, nb);
            return next;
        });
        setOpenInsertMenu(null);
    };

    const updateBlock = useCallback((id: string, patch: Partial<BlockData>) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
    }, []);

    const removeBlock = useCallback((id: string) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
    }, []);

    const updateMeta = (patch: Partial<InvoiceMeta>) => setMeta(m => ({ ...m, ...patch }));

    const totals = React.useMemo(() => {
        const pricingBlocks = blocks.filter(b => b.type === 'pricing');
        let subtotal = 0;
        pricingBlocks.forEach(b => {
            (b.rows || []).forEach(r => { subtotal += r.qty * r.rate; });
        });
        const discount = pricingBlocks.reduce((acc, b) => acc + (b.discountRate || 0), 0) / Math.max(1, pricingBlocks.length);
        const tax      = pricingBlocks.reduce((acc, b) => acc + (b.taxRate || 0), 0)      / Math.max(1, pricingBlocks.length);
        const discAmt  = subtotal * (discount / 100);
        const taxAmt   = (subtotal - discAmt) * (tax / 100);
        return { subtotal, discAmt, taxAmt, total: subtotal - discAmt + taxAmt };
    }, [blocks]);

    const sc = STATUS_STYLE[meta.status] || STATUS_STYLE.Draft;

    return (
        <div className={cn(
            "flex flex-col h-full w-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-white text-[#111]"
        )}>

            {/* ── TOP BAR ── */}
            <div className={cn(
                "flex items-center px-6 py-4 border-b shrink-0 transition-colors",
                isDark ? "bg-[#141414] border-[#252525]" : "bg-white border-[#d2d2eb]"
            )}>
                <div className="flex items-center gap-4 flex-1">
                    <button
                        onClick={() => router.push('/invoices')}
                        className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-[8px] transition-all",
                            isDark ? "text-[#666] hover:text-[#ccc] bg-[#222]" : "text-[#888] hover:text-[#111] bg-[#f1f1f9]"
                        )}
                    >
                        <ArrowLeft size={16} />
                    </button>

                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "flex items-center gap-2 text-[13px] font-medium",
                            isDark ? "text-white/40" : "text-gray-400"
                        )}>
                            <span>Invoice</span>
                            <span className="opacity-30">/</span>
                        </div>
                        <input
                            type="text"
                            value={meta.projectName || ""}
                            onChange={(e) => updateMeta({ projectName: e.target.value })}
                            className={cn(
                                "text-[13px] font-semibold bg-transparent outline-none transition-all min-w-[150px]",
                                isDark ? "text-white/90 placeholder:text-white/20" : "text-gray-900 placeholder:text-gray-300"
                            )}
                            placeholder="Untitled Invoice"
                        />
                    </div>
                    {/* Auto-save Indicator */}
                    <div className="flex items-center ml-2 pt-1">
                        {saveStatus === 'saving' && <span className={cn("text-[11px] font-medium animate-pulse", isDark ? "text-[#888]" : "text-[#aaa]")}>Saving...</span>}
                        {saveStatus === 'saved' && <span className="text-[11px] font-medium text-[#4dbf39]">Saved</span>}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                        <button
                            onClick={() => setShowStatusMenu(s => !s)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all border",
                                sc.bg, sc.text
                            )}
                        >
                            <div className={cn("w-1.5 h-1.5 rounded-full bg-current opacity-70")} />
                            {meta.status}
                            <ChevronDown size={12} className="ml-1 opacity-50" />
                        </button>
                        {showStatusMenu && (
                            <div className={cn(
                                "absolute right-0 top-full mt-1.5 w-40 rounded-[10px] border shadow-xl py-1 z-50",
                                isDark ? "bg-[#1f1f1f] border-[#333]" : "bg-white border-[#d2d2eb]"
                            )}>
                                {Object.keys(STATUS_STYLE).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => { updateMeta({ status: s as any }); setShowStatusMenu(false); }}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors",
                                            isDark ? "hover:bg-white/5 text-[#ccc]" : "hover:bg-[#f5f5f5] text-[#333]",
                                            meta.status === s ? "font-semibold" : ""
                                        )}
                                    >
                                        {meta.status === s ? <Check size={12} className="text-emerald-500" /> : <div className="w-[12px]" />}
                                        <span>{s}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-1" />

                    <button
                        onClick={() => setIsPreview(!isPreview)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all",
                            isPreview ? "bg-[var(--primary)] text-white" : isDark ? "bg-[#222] text-[#ccc]" : "bg-[#f1f1f9] text-[#555]"
                        )}
                    >
                        {isPreview ? <PenLine size={14} /> : <Eye size={14} />}
                        {isPreview ? "Edit" : "Preview"}
                    </button>

                    {isPreview && (
                        <div className={cn(
                            "flex items-center rounded-[8px] border overflow-hidden",
                            isDark ? "border-[#333] bg-[#1c1c1c]" : "border-[#e0e0e0] bg-[#f5f5f5]"
                        )}>
                            <button onClick={() => setPreviewMode('desktop')} className={cn("p-1.5 px-2.5 transition-all", previewMode === 'desktop' ? (isDark ? "bg-[#333] text-white" : "bg-white shadow-sm") : "opacity-40")}>
                                <Monitor size={13} />
                            </button>
                            <button onClick={() => setPreviewMode('mobile')} className={cn("p-1.5 px-2.5 transition-all", previewMode === 'mobile' ? (isDark ? "bg-[#333] text-white" : "bg-white shadow-sm") : "opacity-40")}>
                                <Smartphone size={13} />
                            </button>
                        </div>
                    )}

                    <button className={cn("flex items-center justify-center w-8 h-8 rounded-[8px] bg-[var(--primary)] text-white shadow-sm")}>
                        <Send size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                <div className={cn(
                    "flex-1 overflow-auto relative w-full",
                    isDark ? "bg-[#111]" : "bg-[#f2f2f2]"
                )}>
                    <div className={cn(
                        "flex flex-col items-center min-h-full",
                        isMobilePreview ? "py-8 px-4" : "py-10 px-6"
                    )}>
                        {isPreview && !isMobilePreview && (
                            <ClientActionBar
                                type="invoice"
                                status={meta.status as any}
                                amountDue={fmt(totals.total, meta.currency)}
                                paidAt="July 4, 2026"
                                inline={true}
                                onDownloadPDF={() => console.log('Download PDF')}
                                onPrint={() => window.print()}
                            />
                        )}

                        {isMobilePreview ? (
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    "relative rounded-[44px] border-[8px] shadow-2xl overflow-hidden shrink-0 w-[390px] h-[844px]",
                                    isDark ? "border-[#2a2a2a] bg-[#1c1c1c]" : "border-[#c8c8c8] bg-white"
                                )}>
                                    <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[34px] rounded-b-[20px] z-10", isDark ? "bg-[#1a1a1a]" : "bg-[#b8b8b8]")} />
                                    <div className="absolute inset-x-0 top-[52px] bottom-0 overflow-y-auto scrollbar-none">
                                        <ClientActionBar
                                            type="invoice"
                                            status={meta.status as any}
                                            amountDue={fmt(totals.total, meta.currency)}
                                            paidAt="July 4, 2026"
                                            isMobile={true}
                                            inline={true}
                                            onDownloadPDF={() => console.log('Download PDF')}
                                            onPrint={() => window.print()}
                                            className="pt-4"
                                        />
                                        <InvoiceDocument
                                            meta={meta}
                                            blocks={blocks}
                                            totals={totals}
                                            isDark={isDark}
                                            isPreview={true}
                                            isMobile={true}
                                            updateBlock={updateBlock}
                                            removeBlock={removeBlock}
                                            addBlock={addBlock}
                                            openInsertMenu={null}
                                            setOpenInsertMenu={() => {}}
                                            updateMeta={updateMeta}
                                            setBlocks={setBlocks}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <InvoiceDocument
                                meta={meta}
                                blocks={blocks}
                                totals={totals}
                                isDark={isDark}
                                isPreview={isPreview}
                                isMobile={false}
                                updateBlock={updateBlock}
                                removeBlock={removeBlock}
                                addBlock={addBlock}
                                openInsertMenu={openInsertMenu}
                                setOpenInsertMenu={setOpenInsertMenu}
                                updateMeta={updateMeta}
                                setBlocks={setBlocks}
                            />
                        )}
                    </div>
                </div>

                {!isPreview && (
                    <div className={cn("w-[240px] shrink-0 flex flex-col overflow-hidden", isDark ? "bg-[#1a1a1a]" : "bg-[#fafafa]")}>
                        <div className="flex items-center p-1">
                            <button onClick={() => setRightTab('details')} className={cn("flex-1 py-2 text-[11px] font-medium rounded-lg", rightTab === 'details' ? (isDark ? "bg-white/5 text-white" : "bg-black/5 text-black") : "opacity-40")}>Details</button>
                            <button onClick={() => setRightTab('appearance')} className={cn("flex-1 py-2 text-[11px] font-medium rounded-lg", rightTab === 'appearance' ? (isDark ? "bg-white/5 text-white" : "bg-black/5 text-black") : "opacity-40")}>Design</button>
                        </div>
                        <div className="flex-1 overflow-auto py-3 px-3 space-y-1.5">
                            {rightTab === 'details' && (
                                <>
                                    <MetaField label="Client" isDark={isDark} icon={<User size={11} />}>
                                        <input value={meta.clientName} onChange={e => updateMeta({ clientName: e.target.value })} placeholder="Select client..." className="w-full bg-transparent outline-none text-[12px]" />
                                    </MetaField>
                                    <MetaField label="Project" isDark={isDark} icon={<FileText size={11} />}>
                                        <input value={meta.projectName} onChange={e => updateMeta({ projectName: e.target.value })} placeholder="Set project..." className="w-full bg-transparent outline-none text-[12px]" />
                                    </MetaField>
                                    <MetaField label="Invoice #" isDark={isDark} icon={<Tag size={11} />}>
                                        <input value={meta.invoiceNumber} onChange={e => updateMeta({ invoiceNumber: e.target.value })} className="w-full bg-transparent outline-none text-[12px]" />
                                    </MetaField>
                                    <MetaField label="Issue Date" isDark={isDark} icon={<Calendar size={11} />}>
                                        <input type="date" value={meta.issueDate} onChange={e => updateMeta({ issueDate: e.target.value })} className="w-full bg-transparent outline-none text-[12px]" />
                                    </MetaField>
                                    <MetaField label="Due Date" isDark={isDark} icon={<Calendar size={11} />}>
                                        <input type="date" value={meta.dueDate} onChange={e => updateMeta({ dueDate: e.target.value })} className="w-full bg-transparent outline-none text-[12px]" />
                                    </MetaField>
                                </>
                            )}
                            {rightTab === 'appearance' && (
                                <div className="space-y-3 pt-1">
                                    <div className={cn("text-[10px] uppercase tracking-widest font-bold", isDark ? "text-[#555]" : "text-[#bbb]")}>
                                        Branding
                                    </div>
                                    <MetaField label="Logo URL" isDark={isDark}>
                                        <input 
                                            value={meta.logoUrl || ''} 
                                            onChange={e => updateMeta({ logoUrl: e.target.value })} 
                                            placeholder="https://..." 
                                            className={cn("w-full text-[12px] bg-transparent outline-none", isDark ? "text-[#ccc]" : "text-[#333]")}
                                        />
                                    </MetaField>
                                    <MetaField label="Document Title" isDark={isDark}>
                                        <textarea 
                                            value={meta.documentTitle || ''} 
                                            onChange={e => updateMeta({ documentTitle: e.target.value })} 
                                            placeholder="INVOICE" 
                                            rows={1}
                                            className={cn("w-full text-[12px] bg-transparent outline-none resize-none", isDark ? "text-[#ccc]" : "text-[#333]")}
                                        />
                                    </MetaField>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function InvoiceDocument({
    meta, blocks, totals, isDark, isPreview, isMobile,
    updateBlock, removeBlock, addBlock, openInsertMenu, setOpenInsertMenu,
    updateMeta, setBlocks
}: {
    meta: InvoiceMeta;
    blocks: BlockData[];
    totals: any;
    isDark: boolean;
    isPreview: boolean;
    isMobile: boolean;
    updateBlock: (id: string, patch: Partial<BlockData>) => void;
    removeBlock: (id: string) => void;
    addBlock: (type: BlockType, afterId?: string) => void;
    openInsertMenu: number | null;
    setOpenInsertMenu: (idx: number | null) => void;
    updateMeta: (patch: Partial<InvoiceMeta>) => void;
    setBlocks: React.Dispatch<React.SetStateAction<BlockData[]>>;
}) {
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const from = blocks.findIndex((b: any) => b.id === active.id);
            const to   = blocks.findIndex((b: any) => b.id === over.id);
            setBlocks(arrayMove(blocks, from, to));
        }
    };

    return (
        <div className={cn(
            "w-full transition-all duration-300",
            isMobile ? "max-w-full px-4" : "max-w-[850px] shadow-sm",
            isDark ? "bg-[#1c1c1c] text-white" : "bg-white text-[#111]",
            !isMobile && "min-h-[1000px] py-10 px-12 rounded-[4px]"
        )}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map((b: any) => b.id)} strategy={verticalListSortingStrategy}>
                    {!isPreview && <InsertZone idx={-1} isDark={isDark} isOpen={openInsertMenu === -1} onOpen={() => setOpenInsertMenu(-1)} onClose={() => setOpenInsertMenu(null)} onAdd={addBlock} /> }
                    <div className="space-y-1">
                        {blocks.map((block: any, idx: number) => (
                            <React.Fragment key={block.id}>
                                <SortableBlock block={block} isDark={isDark} isPreview={isPreview} updateBlock={updateBlock} removeBlock={removeBlock} addBlock={addBlock} currency={meta.currency} meta={meta} updateMeta={updateMeta} />
                                {!isPreview && <InsertZone idx={idx} isDark={isDark} isOpen={openInsertMenu === idx} onOpen={() => setOpenInsertMenu(idx)} onClose={() => setOpenInsertMenu(null)} onAdd={(type) => addBlock(type, block.id)} /> }
                            </React.Fragment>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

                <div className="mt-16 pt-8 border-t border-dashed border-opacity-20 flex justify-end">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between text-[13px] opacity-50">
                            <span>Subtotal</span>
                            <span>{fmt(totals.subtotal, meta.currency)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t border-opacity-10 pt-2 mt-2">
                            <span>Total</span>
                            <span>{fmt(totals.total, meta.currency)}</span>
                        </div>
                    </div>
                </div>
        </div>
    );
}

function SortableBlock({ block, isDark, isPreview, updateBlock, removeBlock, addBlock, currency, meta, updateMeta }: {
    block: BlockData;
    isDark: boolean;
    isPreview: boolean;
    updateBlock: (id: string, patch: Partial<BlockData>) => void;
    removeBlock: (id: string) => void;
    addBlock: (type: BlockType, afterId?: string) => void;
    currency: string;
    meta: InvoiceMeta;
    updateMeta: (patch: Partial<InvoiceMeta>) => void;
}) {
    const { setNodeRef, transform, transition } = useSortable({ id: block.id });
    return (
        <SectionBlockWrapper id={block.id} type={block.type} onDelete={removeBlock} isPreview={isPreview}>
            <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
                <BlockRenderer block={block} isDark={isDark} isPreview={isPreview} updateBlock={updateBlock} currency={currency} meta={meta} updateMeta={updateMeta} />
            </div>
        </SectionBlockWrapper>
    );
}

function BlockRenderer({ block, isDark, isPreview, updateBlock, currency, meta, updateMeta }: {
    block: BlockData;
    isDark: boolean;
    isPreview: boolean;
    updateBlock: (id: string, patch: Partial<BlockData>) => void;
    currency: string;
    meta: InvoiceMeta;
    updateMeta: (patch: Partial<InvoiceMeta>) => void;
}) {
    switch (block.type) {
        case 'header':
            return (
                <div className="mb-4">
                    <div className="flex justify-between items-start mb-10">
                        {meta.logoUrl ? (
                            <img src={meta.logoUrl} alt="Logo" className="max-h-16 w-auto" />
                        ) : (
                            <div className={cn(
                                "font-black text-4xl leading-[0.85] tracking-tighter",
                                isDark ? "text-white" : "text-[#4a4a4a]"
                            )}>
                                MOHI<sup className="text-[14px]">®</sup><br/>
                                HASSAN
                            </div>
                        )}
                        <div className="text-right">
                            <div 
                                contentEditable={!isPreview}
                                suppressContentEditableWarning
                                onBlur={e => updateMeta({ documentTitle: e.currentTarget.textContent || '' })}
                                className={cn(
                                    "text-3xl font-black tracking-tighter leading-[0.9] outline-none",
                                    isDark ? "text-[#ccc]" : "text-[#2a2a2a]",
                                    !isPreview && "hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 -mx-1"
                                )}
                            >
                                {meta.documentTitle || 'INVOICE'}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-end pt-8">
                        <div>
                            <div 
                                contentEditable={!isPreview}
                                suppressContentEditableWarning
                                onBlur={e => updateMeta({ clientName: e.currentTarget.textContent || '' })}
                                className="text-[15px] font-bold mb-4 outline-none empty:before:content-['Client_Name'] empty:before:opacity-30"
                            >
                                Bill To: {meta.clientName}
                            </div>
                            <div className="text-[11px] opacity-60 space-y-0.5">
                                <div 
                                    contentEditable={!isPreview}
                                    suppressContentEditableWarning
                                    onBlur={e => updateMeta({ clientEmail: e.currentTarget.textContent || '' })}
                                    className="outline-none empty:before:content-['Email'] empty:before:opacity-30"
                                >
                                    {meta.clientEmail}
                                </div>
                                <div 
                                    contentEditable={!isPreview}
                                    suppressContentEditableWarning
                                    onBlur={e => updateMeta({ clientAddress: e.currentTarget.textContent || '' })}
                                    className="outline-none empty:before:content-['Address'] empty:before:opacity-30"
                                >
                                    {meta.clientAddress}
                                </div>
                            </div>
                        </div>
                        <div className="text-right text-[11px] space-y-1">
                            <div className="flex items-center justify-end gap-1">
                                <span className="font-bold">Invoice #:</span> 
                                <span 
                                    contentEditable={!isPreview}
                                    suppressContentEditableWarning
                                    onBlur={e => updateMeta({ invoiceNumber: e.currentTarget.textContent || '' })}
                                    className="outline-none min-w-[50px] text-right"
                                >
                                    {meta.invoiceNumber}
                                </span>
                            </div>
                            <div className="flex items-center justify-end gap-1">
                                <span className="font-bold">Date:</span> 
                                <span 
                                    contentEditable={!isPreview}
                                    suppressContentEditableWarning
                                    onBlur={e => updateMeta({ issueDate: e.currentTarget.textContent || '' })}
                                    className="outline-none min-w-[50px] text-right"
                                >
                                    {meta.issueDate}
                                </span>
                            </div>
                            <div className="flex items-center justify-end gap-1">
                                <span className="font-bold">Due Date:</span> 
                                <span 
                                    contentEditable={!isPreview}
                                    suppressContentEditableWarning
                                    onBlur={e => updateMeta({ dueDate: e.currentTarget.textContent || '' })}
                                    className="outline-none min-w-[50px] text-right"
                                >
                                    {meta.dueDate}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'pricing':
            return (
                <div className={cn("my-6 rounded-xl border overflow-hidden", isDark ? "border-[#2a2a2a]" : "border-[#ebebeb]")}>
                    <table className="w-full">
                        <thead className={cn("border-b", isDark ? "border-[#2a2a2a] bg-[#1f1f1f]" : "border-[#f0f0f0] bg-[#fafafa]")}>
                            <tr><th className="text-[10px] uppercase font-bold text-left px-4 py-3">Item</th><th className="text-[10px] uppercase font-bold text-right px-4 py-3">Qty</th><th className="text-[10px] uppercase font-bold text-right px-4 py-3">Rate</th><th className="text-[10px] uppercase font-bold text-right px-4 py-3">Total</th></tr>
                        </thead>
                        <tbody>
                            {(block.rows || []).map((row: any) => (
                                <tr key={row.id} className="border-b last:border-0 border-opacity-10">
                                    <td className="px-4 py-3"><div className="font-bold">{row.title || 'Item'}</div><div className="text-[10px] opacity-50">{row.description}</div></td>
                                    <td className="px-4 py-3 text-right">{row.qty}</td>
                                    <td className="px-4 py-3 text-right">{fmt(row.rate, currency)}</td>
                                    <td className="px-4 py-3 text-right font-bold">{fmt(row.qty * row.rate, currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        case 'text':
            return <div className="py-2 text-[13px] opacity-70 leading-relaxed">{block.content}</div>;
        case 'divider':
            return <div className="my-6 border-t opacity-10" />;
        default: return null;
    }
}

function MetaField({ label, children, isDark, icon }: any) {
    return (
        <div className={cn("rounded-lg border px-3 py-2.5", isDark ? "border-[#252525] bg-[#1f1f1f]" : "border-[#ebebeb] bg-white")}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-40 mb-1">{icon}{label}</div>
            {children}
        </div>
    );
}

function InsertZone({ idx, isDark, isOpen, onOpen, onClose, onAdd }: { 
    idx: number; 
    isDark: boolean; 
    isOpen: boolean; 
    onOpen: () => void; 
    onClose: () => void; 
    onAdd: (type: BlockType, afterId?: string) => void;
}) {
    const [hovered, setHovered] = useState(false);
    const visible = hovered || isOpen;

    return (
        <div 
            className="relative flex items-center group/insert h-6" 
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { if (!isOpen) setHovered(false); }}
        >
            <div className={cn(
                "absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center transition-all duration-150",
                visible ? "opacity-100" : "opacity-0 pointer-events-none"
            )}>
                <div className={cn("flex-1 border-t border-dashed", isDark ? "border-[#363636]" : "border-[#d8d8d8]")} />
                <button
                    onClick={(e) => { e.stopPropagation(); onOpen(); }}
                    className={cn(
                        "mx-2 w-5 h-5 flex items-center justify-center rounded-full border transition-all shrink-0 shadow-sm",
                        isOpen
                            ? isDark ? "bg-[var(--primary)] border-[var(--primary)] text-white" : "bg-[var(--primary)] border-[var(--primary)] text-white"
                            : isDark ? "bg-[#252525] border-[#363636] text-[#777] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                                     : "bg-white border-[#d0d0d0] text-[#aaa] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    )}
                >
                    <Plus size={12} strokeWidth={2.5} />
                </button>
                <div className={cn("flex-1 border-t border-dashed", isDark ? "border-[#363636]" : "border-[#d8d8d8]")} />
            </div>

            {isOpen && (
                <div 
                    className={cn(
                        "absolute left-1/2 -translate-x-1/2 top-full mt-1 w-56 rounded-xl border shadow-xl py-1.5 z-50",
                        isDark ? "bg-[#1f1f1f] border-[#333]" : "bg-white border-[#e5e5e5]"
                    )}
                    onMouseLeave={() => { setHovered(false); onClose(); }}
                >
                    <div className={cn(
                        "px-3 pb-1 pt-0.5 text-[9px] font-bold uppercase tracking-widest",
                        isDark ? "text-[#555]" : "text-[#bbb]"
                    )}>
                        Insert block
                    </div>
                    {BLOCK_MENU.map(({ type, label, icon: Icon, tag }) => (
                        <button 
                            key={type} 
                            onClick={() => { onAdd(type); onClose(); setHovered(false); }} 
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 text-[12px] transition-colors",
                                isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <Icon size={13} className="opacity-50" />
                                {label}
                            </div>
                            <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded font-semibold",
                                isDark ? "bg-[#2a2a2a] text-[#666]" : "bg-[#f0f0f0] text-[#999]"
                            )}>
                                {tag}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
