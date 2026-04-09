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
    Printer, LayoutTemplate
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getStatusColors, STATUS_COLORS } from '@/lib/statusConfig';
import { useUIStore } from '@/store/useUIStore';
import { useClientStore } from '@/store/useClientStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useDebounce } from '@/hooks/useDebounce';
import { ContentBlock } from '../proposals/blocks/ContentBlock';
import { SectionBlockWrapper } from '../proposals/blocks/SectionBlockWrapper';
import { ClientActionBar } from '@/components/ui/ClientActionBar';
import { DesignSettingsPanel } from '@/components/ui/DesignSettingsPanel';
import DatePicker from '@/components/ui/DatePicker';
import { DocumentDesign, DEFAULT_DOCUMENT_DESIGN } from '@/types/design';
import { useTemplateStore } from '@/store/useTemplateStore';
import { BankTransferModal } from '@/components/modals/BankTransferModal';
import ImageUploadModal from '../modals/ImageUploadModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { SaveTemplateModal } from '@/components/modals/SaveTemplateModal';
import { gooeyToast } from 'goey-toast';

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
    url?: string;
    backgroundColor?: string;
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
    design?: DocumentDesign;
}

type RightPanelTab = 'details' | 'appearance' | 'automation';



function fmt(n: number, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
}

const BLOCK_MENU = [
    { type: 'header'    as BlockType, label: 'Header & Meta', icon: PanelTop,            tag: 'Layout' },
    { type: 'heading'   as BlockType, label: 'Section Title', icon: AlignLeft,           tag: 'Text' },
    { type: 'text'      as BlockType, label: 'Content Block',  icon: FileText,            tag: 'Text' },
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
    const { addTemplate } = useTemplateStore();

    React.useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
    const [isPreview, setIsPreview] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [rightTab, setRightTab] = useState<RightPanelTab>('details');
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
    const [imageUploadOpen, setImageUploadOpen] = useState(false);
    const [uploadTarget, setUploadTarget] = useState<{ type: 'logo' | 'block' | 'background', blockId?: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [openInsertMenu, setOpenInsertMenu] = useState<number | null>(null);
    const [pendingStatusChange, setPendingStatusChange] = useState<InvoiceMeta['status'] | null>(null);

    const statusRef = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
                setShowStatusMenu(false);
            }
            if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
                setShowActionsMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
    const debouncedMeta = useDebounce(meta, 1000);
    const debouncedBlocks = useDebounce(blocks, 1000);

    // Polling effect to keep editor in sync with backend
    React.useEffect(() => {
        if (!id) return;
        const interval = setInterval(() => {
            fetchInvoices();
        }, 10000); // Sync every 10s
        return () => clearInterval(interval);
    }, [id, fetchInvoices]);

    // Enhanced sync effect: allows status to update even after load
    React.useEffect(() => {
        if (!id) return;
        const invoice = invoices.find(i => i.id === id);
        if (!invoice) return;

        if (!isLoaded) {
            // Initial Full Load
            setMeta(prev => ({
                ...prev,
                clientName: invoice.client_name || '',
                projectName: invoice.title || '',
                issueDate: invoice.issue_date ? invoice.issue_date.split('T')[0] : prev.issueDate,
                dueDate: invoice.due_date ? invoice.due_date.split('T')[0] : prev.dueDate,
                status: invoice.status as any,
                invoiceNumber: invoice.title || invoice.id.slice(0, 8).toUpperCase(),
                ...((invoice.meta as any) || {})
            }));
            if (invoice.blocks && Array.isArray(invoice.blocks) && invoice.blocks.length > 0) {
                setBlocks(invoice.blocks);
            }
            setIsLoaded(true);
        } else {
            // Background Sync: Only update specific fields that might change (Status)
            if (invoice.status !== meta.status) {
                setMeta(prev => ({ ...prev, status: invoice.status as any }));
            }
        }
    }, [id, invoices, isLoaded, meta.status]);

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
                const blockDisc = sub * ((block.discountRate || 0) / 100);
                const blockTax = (sub - blockDisc) * ((block.taxRate || 0) / 100);
                return acc + sub - blockDisc + blockTax;
            }
            return acc;
        }, 0);

        // setSaveStatus('saving');
        gooeyToast.promise(
            updateInvoice(id, {
                title: debouncedMeta.projectName || 'New Invoice',
                client_name: debouncedMeta.clientName,
                status: debouncedMeta.status,
                issue_date: debouncedMeta.issueDate,
                due_date: debouncedMeta.dueDate,
                amount: totalAmount,
                blocks: debouncedBlocks,
                meta: debouncedMeta
            }),
            {
                loading: 'Saving changes...',
                success: 'Changes saved',
                error: 'Failed to save changes'
            }
        );
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

    const handleStatusChange = (newStatus: InvoiceMeta['status']) => {
        // Pattern matched from proposals
        if (meta.status === 'Paid') {
            setPendingStatusChange(newStatus);
            return;
        }
        updateMeta({ status: newStatus });
    };

    const confirmStatusChange = () => {
        if (!pendingStatusChange) return;

        updateMeta({ status: pendingStatusChange as any });
        setPendingStatusChange(null);
    };

    /* ── Copy link ── */
    const copyLink = () => {
        navigator.clipboard.writeText(window.location.origin + '/p/invoice/' + id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    const totals = React.useMemo(() => {
        const pricingBlocks = blocks.filter(b => b.type === 'pricing');
        let subtotal = 0;
        let discAmt = 0;
        let taxAmt = 0;

        pricingBlocks.forEach(b => {
            const blockSub = (b.rows || []).reduce((sum, r) => sum + (r.qty * r.rate), 0);
            const blockDisc = blockSub * ((b.discountRate || 0) / 100);
            const blockTax = (blockSub - blockDisc) * ((b.taxRate || 0) / 100);
            
            subtotal += blockSub;
            discAmt += blockDisc;
            taxAmt += blockTax;
        });

        return { subtotal, discAmt, taxAmt, total: subtotal - discAmt + taxAmt };
    }, [blocks]);

    const sc = getStatusColors(meta.status);

    return (
        <div className={cn(
            "flex flex-col h-full w-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-white text-[#111]"
        )}>

            {/* ── TOP BAR ── */}
            <div className={cn(
                "flex items-center justify-between px-6 py-4 border-b shrink-0 transition-colors relative",
                isDark ? "bg-[#141414] border-[#252525]" : "bg-white border-[#d2d2eb]"
            )}>
                <div className="flex items-center gap-4 flex-1">
                    <button
                        onClick={() => router.push('/invoices')}
                        className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-[8px] transition-all",
                            isDark ? "text-[#666] hover:text-[#ccc] bg-[#222]" : "text-[#888] hover:text-[#111] bg-[#f0f0f0] hover:bg-[#e8e8e8]"
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
                            placeholder="Invoice Name"
                        />
                    </div>
                </div>
                


                <div className="flex items-center gap-2">
                    <div className="relative flex items-center" ref={statusRef}>
                        <button
                            onClick={() => setShowStatusMenu(s => !s)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all border",
                                isDark
                                    ? "bg-white/[0.06] text-[#aaa] border-white/10"
                                    : cn(sc.badge, sc.badgeText, sc.badgeBorder)
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
                                {Object.keys(STATUS_COLORS).filter(k => k !== 'All' && k !== 'Accepted' && k !== 'Declined').map(s => (
                                    <button
                                        key={s}
                                        onClick={() => { handleStatusChange(s as any); setShowStatusMenu(false); }}
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
                        onClick={() => {
                            if (isPreview) {
                                setIsPreview(false);
                            } else {
                                setIsPreview(true);
                                setPreviewMode('desktop');
                            }
                        }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 h-[32px] rounded-[8px] text-[12px] font-bold transition-all",
                            isPreview
                                ? "bg-[#4dbf39] text-black hover:bg-[#59d044]"
                                : isDark 
                                    ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" 
                                    : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]"
                        )}
                    >
                        {isPreview ? <PenLine size={14} /> : <Eye size={14} />}
                        {isPreview ? "Edit" : "Preview"}
                    </button>

                    {isPreview && (
                        <div className="flex items-center gap-1 ml-1">
                            <button
                                onClick={() => setPreviewMode('desktop')}
                                className={cn(
                                    "p-1.5 rounded-[6px] transition-colors",
                                    previewMode === 'desktop'
                                        ? (isDark ? "bg-white/10 text-white" : "bg-black/5 text-black")
                                        : (isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60")
                                )}
                            >
                                <Monitor size={14} />
                            </button>
                            <button
                                onClick={() => setPreviewMode('mobile')}
                                className={cn(
                                    "p-1.5 rounded-[6px] transition-colors",
                                    previewMode === 'mobile'
                                        ? (isDark ? "bg-white/10 text-white" : "bg-black/5 text-black")
                                        : (isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60")
                                )}
                            >
                                <Smartphone size={14} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={copyLink}
                        className={cn(
                            "flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                            isDark ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]"
                        )}
                    >
                        {copied ? <Check size={14} className="text-[#4dbf39]" /> : <Link2 size={14} />}
                    </button>

                    <button
                        onClick={() => window.print()}
                        className={cn(
                            "flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                            isDark ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]"
                        )}
                    >
                        <Printer size={14} />
                    </button>

                    <button
                        className={cn(
                            "flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                            isDark ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]"
                        )}
                    >
                        <Send size={14} />
                    </button>

                    <div className="relative ml-1" ref={actionsRef}>
                        <button
                            onClick={() => setShowActionsMenu(s => !s)}
                            className={cn(
                                "flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                                isDark ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]"
                            )}
                        >
                            <MoreHorizontal size={14} />
                        </button>
                        {showActionsMenu && (
                            <div className={cn(
                                "absolute right-0 top-full mt-1.5 w-48 rounded-[10px] shadow-xl py-1 z-50",
                                isDark ? "bg-[#0c0c0c]" : "bg-white border-[#d2d2eb]"
                            )}>
                                {[
                                    { icon: LayoutTemplate, label: 'Save as Template', action: () => setIsSaveTemplateModalOpen(true) },
                                    { icon: Download, label: 'Download PDF', action: () => console.log('Download') },
                                    { icon: Trash2,   label: 'Delete', action: () => console.log('Delete') },
                                ].map(({ icon: Icon, label, action }) => (
                                    <button
                                        key={label}
                                        onClick={() => {
                                            action();
                                            setShowActionsMenu(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors",
                                            label === 'Delete' 
                                                ? "text-red-500 hover:bg-red-50" 
                                                : isDark ? "hover:bg-white/5 text-[#ccc]" : "hover:bg-[#f5f5f5] text-[#333]"
                                        )}
                                    >
                                        <Icon size={14} className={label === 'Delete' ? "text-red-500" : "opacity-60"} />
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                <div 
                    className="flex-1 overflow-auto relative w-full"
                    style={{ 
                        backgroundColor: isMobilePreview 
                            ? (isDark ? '#080808' : '#f7f7f7') 
                            : (meta.design?.backgroundColor) || (isDark ? '#080808' : '#f7f7f7'),
                        backgroundImage: meta.design?.backgroundImage ? `url(${meta.design.backgroundImage})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundAttachment: 'fixed',
                    }}
                >
                    <div className={cn(
                        "flex flex-col items-center min-h-full",
                        isMobilePreview ? "py-8 px-4" : "pt-4 pb-20 px-6"
                    )}>
                        {isMobilePreview ? (
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    "relative rounded-[44px] border-[4px] shadow-2xl overflow-hidden shrink-0 w-[390px] h-[844px] transition-all duration-300 bg-black",
                                    isDark ? "border-[#1a1a1a]" : "border-[#000]"
                                )}>
                                    <div className={cn(
                                        "absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] rounded-b-[16px] z-10 bg-white/[0.05]"
                                    )} />
                                    <div className="absolute inset-x-0 top-[52px] bottom-0 overflow-y-auto scrollbar-none"
                                         style={{ 
                                             backgroundColor: (meta.design?.backgroundColor) || (isDark ? '#080808' : '#f7f7f7'),
                                             backgroundImage: meta.design?.backgroundImage ? `url(${meta.design.backgroundImage})` : 'none',
                                             backgroundSize: 'cover',
                                             backgroundPosition: 'center',
                                         }}
                                    >
                                        <ClientActionBar
                                            type="invoice"
                                            status={meta.status as any}
                                            amountDue={fmt(totals.total, meta.currency)}
                                            paidAt="July 4, 2026"
                                            isMobile={true}
                                            inline={true}
                                            design={meta.design}
                                            onDownloadPDF={() => console.log('Download PDF')}
                                            onPrint={() => window.print()}
                                            onPay={() => setIsPayModalOpen(true)}
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
                            <>
                                {!isMobilePreview && (
                                    <ClientActionBar
                                        type="invoice"
                                        status={meta.status as any}
                                        amountDue={fmt(totals.total, meta.currency)}
                                        paidAt="July 4, 2026"
                                        inline={true}
                                        design={meta.design}
                                        onDownloadPDF={() => console.log('Download PDF')}
                                        onPrint={() => window.print()}
                                        onPay={() => setIsPayModalOpen(true)}
                                    />
                                )}
                                {/* Desktop canvas */}
                                <div 
                                    className="w-full max-w-[850px] overflow-hidden transition-all duration-300"
                                    style={{ 
                                        borderRadius: `${meta.design?.borderRadius ?? 16}px`,
                                        backgroundColor: (meta.design?.blockBackgroundColor) || '#ffffff',
                                        backgroundImage: meta.design?.backgroundImage ? `url(${meta.design.backgroundImage})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        boxShadow: meta.design?.blockShadow || '0 4px 20px -4px rgba(0,0,0,0.05)',
                                    }}
                                >
                                    <InvoiceDocument
                                        meta={meta}
                                        blocks={blocks}
                                        totals={totals}
                                        isDark={false}
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
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {!isPreview && (
                    <div className={cn("w-[240px] shrink-0 flex flex-col overflow-hidden", isDark ? "bg-[#1a1a1a]" : "bg-[#fafafa]")}>
                        <div className="flex items-center p-1.5 gap-1">
                            <button 
                                onClick={() => setRightTab('details')} 
                                className={cn(
                                    "flex-1 py-2.5 text-[11px] font-bold rounded-xl transition-all", 
                                    rightTab === 'details' 
                                        ? (isDark ? "bg-white/10 text-white" : "bg-[#111]/5 text-[#111]") 
                                        : "opacity-40 hover:opacity-100"
                                )}
                            >
                                Details
                            </button>
                            <button 
                                onClick={() => setRightTab('appearance')} 
                                className={cn(
                                    "flex-1 py-2.5 text-[11px] font-bold rounded-xl transition-all", 
                                    rightTab === 'appearance' 
                                        ? (isDark ? "bg-white/10 text-white" : "bg-[#111]/5 text-[#111]") 
                                        : "opacity-40 hover:opacity-100"
                                )}
                            >
                                Design
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto py-3 px-3 space-y-1.5">
                            {rightTab === 'details' && (
                                <>
                                    <MetaField 
                                        label="Client" 
                                        isDark={isDark} 
                                        icon={<User size={11} className="opacity-50" />}
                                        onReset={() => updateMeta({ clientName: '', clientEmail: '', clientPhone: '', clientAddress: '' })}
                                    >
                                        <input 
                                            value={meta.clientName} 
                                            onChange={e => updateMeta({ clientName: e.target.value })} 
                                            placeholder="Select client..." 
                                            className={cn(
                                                "w-full bg-transparent outline-none text-[12px] font-medium",
                                                isDark ? "text-[#ccc] placeholder:text-[#444]" : "text-[#333] placeholder:text-[#ccc]"
                                            )}
                                        />
                                    </MetaField>
                                    <MetaField 
                                        label="Name" 
                                        isDark={isDark} 
                                        icon={<FileText size={11} className="opacity-50" />}
                                        onReset={() => updateMeta({ projectName: '' })}
                                    >
                                        <input 
                                            value={meta.projectName} 
                                            onChange={e => updateMeta({ projectName: e.target.value })} 
                                            placeholder="Set name..." 
                                            className={cn(
                                                "w-full bg-transparent outline-none text-[12px] font-medium",
                                                isDark ? "text-[#ccc] placeholder:text-[#444]" : "text-[#333] placeholder:text-[#ccc]"
                                            )}
                                        />
                                    </MetaField>
                                    <MetaField 
                                        label="Issue Date" 
                                        isDark={isDark} 
                                        icon={<Calendar size={11} className="opacity-50" />}
                                        onReset={() => updateMeta({ issueDate: new Date().toISOString().split('T')[0] })}
                                    >
                                        <DatePicker 
                                            value={meta.issueDate} 
                                            onChange={v => updateMeta({ issueDate: v })} 
                                            isDark={isDark} 
                                            align="right" 
                                        />
                                    </MetaField>
                                    <MetaField 
                                        label="Due Date" 
                                        isDark={isDark} 
                                        icon={<Calendar size={11} className="opacity-50" />}
                                        onReset={() => updateMeta({ dueDate: '' })}
                                    >
                                        <DatePicker 
                                            value={meta.dueDate} 
                                            onChange={v => updateMeta({ dueDate: v })} 
                                            isDark={isDark} 
                                            align="right" 
                                            placeholder="Set due date"
                                        />
                                    </MetaField>

                                    <MetaField
                                        label="Currency"
                                        isDark={isDark}
                                        icon={<DollarSign size={11} className="opacity-50" />}
                                        onReset={() => updateMeta({ currency: 'USD' })}
                                    >
                                        <select
                                            value={meta.currency}
                                            onChange={e => updateMeta({ currency: e.target.value })}
                                            className={cn(
                                                "w-full text-[12px] bg-transparent outline-none font-medium appearance-none",
                                                isDark ? "text-[#ccc]" : "text-[#333]"
                                            )}
                                        >
                                            <option value="USD">US Dollar ($)</option>
                                            <option value="EUR">Euro (€)</option>
                                            <option value="GBP">British Pound (£)</option>
                                            <option value="SAR">Saudi Riyal (﷼)</option>
                                            <option value="AED">UAE Dirham (د.إ)</option>
                                        </select>
                                    </MetaField>

                                    <MetaField
                                        label="Discount Calc."
                                        isDark={isDark}
                                        icon={<Tag size={11} className="opacity-50" />}
                                        onReset={() => updateMeta({ discountCalc: 'before_tax' })}
                                    >
                                        <select
                                            value={meta.discountCalc}
                                            onChange={e => updateMeta({ discountCalc: e.target.value as any })}
                                            className={cn(
                                                "w-full text-[12px] bg-transparent outline-none font-medium appearance-none",
                                                isDark ? "text-[#ccc]" : "text-[#333]"
                                            )}
                                        >
                                            <option value="before_tax">Before tax</option>
                                            <option value="after_tax">After tax</option>
                                        </select>
                                    </MetaField>

                                    <MetaField
                                        label="Status"
                                        isDark={isDark}
                                        icon={<Zap size={11} className="opacity-50" />}
                                        onReset={() => handleStatusChange('Draft')}
                                    >
                                        <select
                                            value={meta.status}
                                            onChange={e => handleStatusChange(e.target.value as any)}
                                            className={cn(
                                                "w-full text-[12px] bg-transparent outline-none font-medium appearance-none",
                                                isDark ? "text-[#ccc]" : "text-[#333]"
                                            )}
                                        >
                                            {['Draft', 'Pending', 'Paid', 'Overdue'].map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </MetaField>
                                </>
                            )}
                            {rightTab === 'appearance' && (
                                <DesignSettingsPanel 
                                    isDark={isDark} 
                                    meta={meta} 
                                    updateMeta={updateMeta} 
                                    hideSignature={true}
                                    onUploadLogo={() => {
                                        setUploadTarget({ type: 'logo' });
                                        setImageUploadOpen(true);
                                    }} 
                                    onUploadBackground={() => {
                                        setUploadTarget({ type: 'background' });
                                        setImageUploadOpen(true);
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            <BankTransferModal 
                isOpen={isPayModalOpen}
                onClose={() => setIsPayModalOpen(false)}
                onMarkAsPaid={() => updateMeta({ status: 'Paid' })}
                amountDue={fmt(totals.total, meta.currency)}
            />

            <DeleteConfirmModal 
                open={!!pendingStatusChange}
                onClose={() => setPendingStatusChange(null)}
                onConfirm={confirmStatusChange}
                title="Change Paid Status?"
                description={`This invoice is currently marked as "Paid". Changing the status to "${pendingStatusChange}" might affect your financial records. Are you sure you want to proceed?`}
                isDark={isDark}
            />

            <ImageUploadModal 
                isOpen={imageUploadOpen}
                onClose={() => {
                    setImageUploadOpen(false);
                    setUploadTarget(null);
                }}
                onUpload={(url) => {
                    if (uploadTarget?.type === 'logo') {
                        updateMeta({ logoUrl: url });
                    } else if (uploadTarget?.type === 'background') {
                        updateMeta({ design: { ...meta.design, backgroundImage: url } as any });
                    } else if (uploadTarget?.type === 'block' && uploadTarget.blockId) {
                        updateBlock(uploadTarget.blockId, { url });
                    }
                    setImageUploadOpen(false);
                    setUploadTarget(null);
                }}
            />

            <SaveTemplateModal 
                open={isSaveTemplateModalOpen} 
                onClose={() => setIsSaveTemplateModalOpen(false)} 
                defaultName={meta.projectName || 'My Invoice Template'}
                entityType="invoice"
                onSave={async (name, description, isDefault) => {
                    await addTemplate({
                        name,
                        description,
                        is_default: isDefault,
                        entity_type: 'invoice',
                        blocks,
                        design: meta.design || DEFAULT_DOCUMENT_DESIGN
                    });
                }}
            />
        </div>
    );
}

export function InvoiceDocument({
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

    const design = meta.design || DEFAULT_DOCUMENT_DESIGN;
    // Documents are always rendered in light mode regardless of app theme
    const documentStyle = React.useMemo(() => ({
        fontFamily: design.fontFamily || 'Inter',
        color: '#111111',
        backgroundColor: 'transparent',
        '--document-bg': design.blockBackgroundColor || '#ffffff',
        paddingTop: 'var(--block-margin-top)',
        paddingBottom: 'var(--block-margin-bottom)',
        '--block-margin-bottom': `${design.marginBottom ?? 24}px`,
        '--block-margin-top': `${design.marginTop ?? 24}px`,
        '--block-border-radius': `${design.borderRadius ?? 16}px`,
        '--block-button-radius': `${Math.max(0, (design.borderRadius ?? 16) - 4)}px`,
        '--table-border-radius': `${design.tableBorderRadius ?? 8}px`,
        '--table-header-bg': design.tableHeaderBg || '#f9f9f9',
        '--table-border-color': design.tableBorderColor || '#ebebeb',
        '--table-stroke-width': `${design.tableStrokeWidth ?? 1}px`,
        '--table-font-size': `${design.tableFontSize ?? 12}px`,
        '--table-cell-padding': `${design.tableCellPadding ?? 12}px`,
        '--primary-color': design.primaryColor || '#4dbf39',
        '--primary': design.primaryColor || '#4dbf39',
        '--sign-bar-color': design.signBarColor || '#000000',
        '--sign-bar-thick': `${design.signBarThickness ?? 1}px`,
    } as React.CSSProperties), [design]);

    return (
        <div style={{ ...documentStyle, borderRadius: `${design.borderRadius ?? 16}px` }} className={cn(
            "w-full transition-all duration-300 relative bg-[var(--document-bg)]",
            isMobile ? "max-w-full px-6 py-6" : "max-w-[850px]",
            !isMobile && (isPreview ? "min-h-0 px-12" : "min-h-[1100px] px-12")
        )}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map((b: any) => b.id)} strategy={verticalListSortingStrategy}>
                    {!isPreview && <InsertZone idx={-1} isDark={false} isOpen={openInsertMenu === -1} onOpen={() => setOpenInsertMenu(-1)} onClose={() => setOpenInsertMenu(null)} onAdd={addBlock} isFirst={true} /> }
                    <div>
                        {blocks.map((block: any, idx: number) => (
                            <React.Fragment key={block.id}>
                                <SortableBlock 
                                    block={block} 
                                    isDark={false}
                                    isPreview={isPreview} 
                                    updateBlock={updateBlock} 
                                    removeBlock={removeBlock} 
                                    addBlock={addBlock} 
                                    currency={meta.currency} 
                                    meta={meta} 
                                    updateMeta={updateMeta}
                                    isFirst={idx === 0}
                                    isLast={idx === blocks.length - 1}
                                />
                                {!isPreview && <InsertZone idx={idx} isDark={false} isOpen={openInsertMenu === idx} onOpen={() => setOpenInsertMenu(idx)} onClose={() => setOpenInsertMenu(null)} onAdd={addBlock} isLast={idx === blocks.length - 1} /> }
                            </React.Fragment>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
            {/* Final global summary removed as it's now part of the table block for cleaner layout */}
        </div>
    );
}

function SortableBlock({ block, isDark, isPreview, updateBlock, removeBlock, addBlock, currency, meta, updateMeta, isFirst, isLast }: {
    block: BlockData;
    isDark: boolean;
    isPreview: boolean;
    updateBlock: (id: string, patch: Partial<BlockData>) => void;
    removeBlock: (id: string) => void;
    addBlock: (type: BlockType, afterId?: string) => void;
    currency: string;
    meta: InvoiceMeta;
    updateMeta: (patch: Partial<InvoiceMeta>) => void;
    isFirst?: boolean;
    isLast?: boolean;
}) {
    const { setNodeRef, transform, transition } = useSortable({ id: block.id });
    return (
        <SectionBlockWrapper 
            id={block.id} 
            type={block.type} 
            onDelete={removeBlock} 
            isPreview={isPreview} 
            isFirst={isFirst} 
            isLast={isLast}
            backgroundColor={block.backgroundColor}
            onBackgroundColorChange={(color) => updateBlock(block.id, { backgroundColor: color })}
        >
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
                            <img 
                                src={meta.logoUrl} 
                                alt="Logo" 
                                className="w-auto transition-all duration-300 ease-out" 
                                style={{ height: `${meta.design?.logoSize ?? 64}px` }} 
                            />
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
                                {meta.clientEmail && (
                                    <div 
                                        contentEditable={!isPreview}
                                        suppressContentEditableWarning
                                        onBlur={e => updateMeta({ clientEmail: e.currentTarget.textContent || '' })}
                                        className="outline-none empty:before:content-['Email'] empty:before:opacity-30"
                                    >
                                        {meta.clientEmail}
                                    </div>
                                )}
                                {meta.clientAddress && (
                                    <div 
                                        contentEditable={!isPreview}
                                        suppressContentEditableWarning
                                        onBlur={e => updateMeta({ clientAddress: e.currentTarget.textContent || '' })}
                                        className="outline-none empty:before:content-['Address'] empty:before:opacity-30"
                                    >
                                        {meta.clientAddress}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-right text-[11px] space-y-1">
                            <div className="flex items-center justify-end gap-1">
                                <span className="font-bold">ID #:</span> 
                                <span className={cn(isDark ? "text-[#aaa]" : "text-[#666]")}>
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
        case 'pricing': {
            const rows = block.rows || [];
            const hideQty = block.hideQty || false;
            
            const updateRow = (rowId: string, updates: Partial<PricingRow>) => {
                const newRows = rows.map((r: PricingRow) => r.id === rowId ? { ...r, ...updates } : r);
                updateBlock(block.id, { rows: newRows });
            };

            const addRow = () => {
                const newRows = [...rows, { id: uuidv4(), title: '', description: '', qty: 1, rate: 0 }];
                updateBlock(block.id, { rows: newRows });
            };

            const removeRow = (rowId: string) => {
                updateBlock(block.id, { rows: rows.filter((r: PricingRow) => r.id !== rowId) });
            };

            const subtotal = rows.reduce((acc: number, r: PricingRow) => acc + (r.qty * r.rate), 0);
            const discAmt = subtotal * ((block.discountRate || 0) / 100);
            const taxAmt = (subtotal - discAmt) * ((block.taxRate || 0) / 100);
            const total = subtotal - discAmt + taxAmt;

            const th = cn("uppercase font-bold px-3 py-2", isDark ? "text-white/40" : "text-black/40");
            const td = cn("border-none", isDark ? "text-white" : "text-black");

            return (
                <React.Fragment>
                <div 
                    className="w-full transition-all duration-300 border-collapse"
                    style={{ 
                        borderRadius: 'var(--table-border-radius)',
                        borderColor: 'var(--table-border-color)',
                        borderWidth: 'var(--table-stroke-width)',
                        borderStyle: 'solid',
                        overflow: 'hidden',
                        backgroundColor: isDark ? '#1a1a1a' : '#ffffff'
                    }}
                >
                    <table className="w-full">
                        <thead style={{ backgroundColor: 'var(--table-header-bg)', borderColor: 'var(--table-border-color)', borderBottomWidth: 'var(--table-stroke-width)', borderBottomStyle: 'solid' }}>
                            <tr style={{ fontSize: 'calc(var(--table-font-size) - 2px)' }}>
                                <th className={cn(th, "px-4 py-2 w-full text-left font-bold opacity-60 uppercase tracking-wider")}>Item</th>
                                {!hideQty && <th className={cn(th, "px-3 py-2 text-right w-16 font-bold opacity-60 uppercase tracking-wider")}>Qty</th>}
                                <th className={cn(th, "px-3 py-2 text-right w-24 font-bold opacity-60 uppercase tracking-wider")}>Amount</th>
                                {!hideQty && <th className={cn(th, "px-4 py-2 text-right w-24 font-bold opacity-60 uppercase tracking-wider")}>Total</th>}
                                {!isPreview && <th className="w-8" />}
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--table-border-color)' }}>
                            <style dangerouslySetInnerHTML={{ __html: `
                                .divide-y > * + * {
                                    border-top-width: var(--table-stroke-width) !important;
                                    border-color: var(--table-border-color) !important;
                                }
                            ` }} />
                            {rows.map((row: PricingRow) => (
                                <tr key={row.id} className="group/row transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                                    <td className={cn(td, "px-4")} style={{ paddingTop: 'var(--table-cell-padding)', paddingBottom: 'var(--table-cell-padding)' }}>
                                        {isPreview
                                            ? (
                                                <div className="flex flex-col">
                                                    <div className={cn("font-bold", isDark ? "text-white" : "text-black")} style={{ fontSize: 'calc(var(--table-font-size) + 2px)' }}>{row.title || row.description || 'Item'}</div>
                                                    {(row.title && row.description) && <div className={cn("mt-0.5 opacity-60")} style={{ fontSize: 'calc(var(--table-font-size) - 1px)' }}>{row.description}</div>}
                                                </div>
                                            )
                                            : (
                                                <div className="flex flex-col gap-1">
                                                    <input
                                                        value={row.title || ''}
                                                        onChange={e => updateRow(row.id, { title: e.target.value })}
                                                        placeholder={row.description ? "Item title..." : "Item Name..."}
                                                        className={cn("w-full bg-transparent outline-none font-bold", isDark ? "text-white placeholder:text-white/20" : "text-black placeholder:text-black/20")}
                                                        style={{ fontSize: 'calc(var(--table-font-size) + 2px)' }}
                                                    />
                                                    <input
                                                        value={row.description}
                                                        onChange={e => updateRow(row.id, { description: e.target.value })}
                                                        placeholder="Description (optional)..."
                                                        className={cn("w-full bg-transparent outline-none opacity-60", isDark ? "text-white placeholder:text-white/10" : "text-black placeholder:text-black/10")}
                                                        style={{ fontSize: 'calc(var(--table-font-size) - 1px)' }}
                                                    />
                                                </div>
                                            )
                                        }
                                    </td>
                            {!hideQty && (
                                <td className={cn(td, "px-3 text-right align-top")} style={{ paddingTop: 'var(--table-cell-padding)' }}>
                                    {isPreview
                                        ? row.qty
                                        : <input
                                            type="number"
                                            value={row.qty}
                                            onChange={e => updateRow(row.id, { qty: Number(e.target.value) })}
                                            className={cn("w-12 text-right bg-transparent outline-none font-medium", isDark ? "text-[#ccc]" : "text-[#333]")}
                                            style={{ fontSize: 'var(--table-font-size)' }}
                                        />
                                    }
                                </td>
                            )}
                            <td className={cn(td, "px-3 text-right align-top")} style={{ paddingTop: 'var(--table-cell-padding)' }}>
                                {isPreview
                                    ? fmt(row.rate, currency)
                                    : <input
                                        type="number"
                                        value={row.rate}
                                        onChange={e => updateRow(row.id, { rate: Number(e.target.value) })}
                                        className={cn("w-20 text-right bg-transparent outline-none font-medium", isDark ? "text-white/80" : "text-black/80")}
                                        style={{ fontSize: 'var(--table-font-size)' }}
                                    />
                                }
                            </td>
                            {!hideQty && <td className={cn(td, "px-4 text-right font-bold align-top")} style={{ paddingTop: 'var(--table-cell-padding)', fontSize: 'calc(var(--table-font-size) + 1px)' }}>{fmt(row.qty * row.rate, currency)}</td>}
                                    {!isPreview && (
                                        <td className="w-0 relative p-0 border-0">
                                            <button
                                                onClick={() => removeRow(row.id)}
                                                className={cn(
                                                    "absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 p-2 rounded-full transition-all hover:bg-red-500/10 hover:text-red-500 animate-in fade-in duration-200",
                                                    isDark ? "text-[#aaa] hover:text-red-500 bg-[#333] shadow-sm border border-white/5" : "text-[#ccc] hover:text-red-500 bg-white shadow-sm border border-black/5"
                                                )}
                                                title="Delete row"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                </div>
                
                {/* Summary Card under the table */}
                <div className="flex justify-end mt-6">
                    <div className={cn("w-full p-5 rounded-xl border transition-all", isPreview ? "max-w-none" : "max-w-[280px]")} style={{ backgroundColor: 'var(--table-header-bg)', borderColor: 'var(--table-border-color)', borderRadius: 'var(--table-border-radius)' }}>
                        {!isPreview && (
                            <div className="flex justify-between items-center mb-4">
                                <button
                                    onClick={addRow}
                                    className={cn("flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 border border-dashed transition-all hover:bg-black/5 dark:hover:bg-white/5", isDark ? "border-white/10 text-white/40" : "border-black/10 text-black/40")}
                                    style={{ borderRadius: 'var(--block-button-radius)' }}
                                >
                                    <Plus size={10} /> ADD ITEM
                                </button>
                                <label className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer opacity-30 hover:opacity-100 transition-opacity")}>
                                    <input 
                                        type="checkbox" 
                                        checked={hideQty} 
                                        onChange={e => updateBlock(block.id, { hideQty: e.target.checked })} 
                                        className="rounded border-gray-300 text-[#4dbf39] focus:ring-[#4dbf39]" 
                                    />
                                    Hide QTY
                                </label>
                            </div>
                        )}
                        
                        <div className="space-y-2.5">
                            <div className={cn("flex justify-between text-[12px] font-medium opacity-50")}>
                                <span>Subtotal</span>
                                <span>{fmt(subtotal, currency)}</span>
                            </div>
                            
                            {(!isPreview || (block.discountRate || 0) > 0) && (
                                <div className={cn("flex justify-between items-center text-[12px] font-medium opacity-50")}>
                                    <div className="flex items-center gap-2">
                                        <span>Discount</span>
                                        {!isPreview && (
                                            <input
                                                type="number"
                                                value={block.discountRate || 0}
                                                onChange={e => updateBlock(block.id, { discountRate: Number(e.target.value) })}
                                                className={cn("w-10 bg-transparent outline-none border-b text-center font-bold", isDark ? "border-white/10" : "border-black/10")}
                                            />
                                        )}
                                        {(!isPreview || (block.discountRate || 0) > 0) && <span>%</span>}
                                    </div>
                                    <span>−{fmt(discAmt, currency)}</span>
                                </div>
                            )}
                            
                            {(!isPreview || (block.taxRate || 0) > 0) && (
                                <div className={cn("flex justify-between items-center text-[12px] font-medium opacity-50")}>
                                    <div className="flex items-center gap-2">
                                        <span>Tax</span>
                                        {!isPreview && (
                                            <input
                                                type="number"
                                                value={block.taxRate || 0}
                                                onChange={e => updateBlock(block.id, { taxRate: Number(e.target.value) })}
                                                className={cn("w-10 bg-transparent outline-none border-b text-center font-bold", isDark ? "border-white/10" : "border-black/10")}
                                            />
                                        )}
                                        {(!isPreview || (block.taxRate || 0) > 0) && <span>%</span>}
                                    </div>
                                    <span>{fmt(taxAmt, currency)}</span>
                                </div>
                            )}
                            
                            <div className={cn("flex justify-between font-black pt-4 mt-2 border-t")} style={{ borderColor: 'var(--table-border-color)', borderTopWidth: 'var(--table-stroke-width)', fontSize: '16px' }}>
                                <span>Total</span>
                                <span style={{ color: 'var(--primary-color)' }}>{fmt(total, currency)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </React.Fragment>
        );
    }
        case 'heading': {
            const sizes: Record<number, string> = { 1: 'text-[22px] font-black', 2: 'text-[17px] font-bold', 3: 'text-[14px] font-semibold' };
            const cls = sizes[block.level || 1] || sizes[1];
            return (
                <div className="group/hb flex items-start gap-2">
                    {!isPreview && (
                        <select
                            value={block.level || 1}
                            onChange={e => updateBlock(block.id, { level: Number(e.target.value) as 1|2|3 })}
                            className={cn(
                                "text-[9px] mt-1.5 bg-transparent border rounded px-1 py-0.5 opacity-0 group-hover/hb:opacity-100 transition-opacity outline-none shrink-0",
                                isDark ? "border-[#333] text-[#666]" : "border-[#e0e0e0] text-[#ccc]"
                            )}
                        >
                            <option value={1}>H1</option>
                            <option value={2}>H2</option>
                            <option value={3}>H3</option>
                        </select>
                    )}
                    <div
                        contentEditable={!isPreview}
                        suppressContentEditableWarning
                        onBlur={e => updateBlock(block.id, { content: e.currentTarget.textContent || '' })}
                        className={cn(
                            "flex-1 outline-none",
                            cls,
                            isDark ? "text-white" : "text-[#111]",
                            !block.content && !isPreview ? "before:content-['Section_Title'] before:text-[#ccc] before:pointer-events-none" : ""
                        )}
                    >
                        {block.content}
                    </div>
                </div>
            );
        }
        case 'text':
            if (isPreview) {
                return (
                    <div
                        className={cn(
                            "py-1 text-[13px] leading-relaxed prose prose-p:my-1 prose-headings:my-2 max-w-none",
                            isDark ? "text-[#aaa] prose-invert" : "text-[#555]"
                        )}
                        dangerouslySetInnerHTML={{ __html: block.content || '' }}
                    />
                );
            }
            return (
                <div className="py-2">
                    <ContentBlock
                        id={block.id}
                        data={block}
                        updateData={updateBlock}
                        backgroundColor={block.backgroundColor || meta.design?.blockBackgroundColor}
                    />
                </div>
            );
        case 'divider':
            return <div className="py-6"><div className={cn("border-t w-full", isDark ? "border-white/10" : "border-black/5")} /></div>;
        default: return null;
    }
}

function MetaField({
    label, children, isDark, icon, onReset
}: {
    label: string;
    children: React.ReactNode;
    isDark: boolean;
    icon?: React.ReactNode;
    onReset?: () => void;
}) {
    return (
        <div className={cn(
            "rounded-lg border px-3 py-2.5 transition-colors",
            isDark ? "border-[#252525] bg-[#1f1f1f] hover:border-[#333]" : "border-[#eeeeee] bg-white hover:border-[#e4e4e4]"
        )}>
            <div className="flex items-center justify-between mb-1">
                <div className={cn("flex items-center gap-1.5 text-[10.5px] font-semibold tracking-wide", isDark ? "text-[#555]" : "text-[#bbb]")}>
                    {icon}
                    {label}
                </div>
                {onReset && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onReset(); }}
                        className={cn("p-1 rounded-md transition-all", isDark ? "hover:bg-white/5 text-[#444] hover:text-[#888]" : "hover:bg-black/5 text-[#ddd] hover:text-[#aaa]")}
                        title="Reset to default"
                    >
                        <RotateCcw size={10} />
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}

function InsertZone({ idx, isDark, isOpen, onOpen, onClose, onAdd, isFirst, isLast }: { 
    idx: number; 
    isDark: boolean; 
    isOpen: boolean; 
    onOpen: () => void; 
    onClose: () => void; 
    onAdd: (type: BlockType, afterId?: string) => void;
    isFirst?: boolean;
    isLast?: boolean;
}) {
    const [hovered, setHovered] = useState(false);
    const visible = hovered || isOpen;

    return (
        <div 
            className="relative flex items-center group/insert h-6" 
            style={{
                backgroundColor: 'var(--document-bg, #ffffff)',
                marginLeft: '-3rem',
                marginRight: '-3rem',
                paddingLeft: '3rem',
                paddingRight: '3rem',
                borderTopLeftRadius: isFirst ? 'var(--block-border-radius)' : undefined,
                borderTopRightRadius: isFirst ? 'var(--block-border-radius)' : undefined,
                borderBottomLeftRadius: isLast ? 'var(--block-border-radius)' : undefined,
                borderBottomRightRadius: isLast ? 'var(--block-border-radius)' : undefined,
            }}
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
                        "mx-2 w-5 h-5 flex items-center justify-center border transition-all shrink-0 shadow-sm",
                        isOpen
                            ? isDark ? "bg-[var(--primary-color)] border-[var(--primary-color)] text-white" : "bg-[var(--primary-color)] border-[var(--primary-color)] text-white"
                            : isDark ? "bg-[#252525] border-[#363636] text-[#777] hover:border-[var(--primary-color)] hover:text-[var(--primary-color)]"
                                     : "bg-white border-[#d0d0d0] text-[#aaa] hover:border-[var(--primary-color)] hover:text-[var(--primary-color)]"
                    )}
                    style={{ borderRadius: 'var(--block-button-radius)' }}
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
