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
    Settings, ChevronRight, RotateCcw, Monitor, Smartphone
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useProposalStore } from '@/store/useProposalStore';
import { ContentBlock } from './blocks/ContentBlock';
import { SectionBlockWrapper } from './blocks/SectionBlockWrapper';

/* ═══════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════ */
type BlockType = 'heading' | 'text' | 'pricing' | 'signature' | 'divider' | 'image';

interface PricingRow {
    id: string;
    description: string;
    qty: number;
    rate: number;
}

interface BlockData {
    id: string;
    type: BlockType;
    // heading / text
    content?: string;
    level?: 1 | 2 | 3;
    // pricing
    rows?: PricingRow[];
    taxRate?: number;
    discountRate?: number;
    showTax?: boolean;
    showDiscount?: boolean;
    note?: string;
    // signature
    signerName?: string;
    signerRole?: string;
    signed?: boolean;
}

interface ProposalMeta {
    clientName: string;
    projectName: string;
    issueDate: string;
    expirationDate: string;
    currency: string;
    discountCalc: 'before_tax' | 'after_tax';
    proposalNumber: string;
    status: 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Overdue';
}

type RightPanelTab = 'details' | 'appearance' | 'automation';

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
    Draft:    { bg: 'bg-[#eff6ff] border border-[#bfdbfe]', text: 'text-[#1d4ed8]' },
    Sent:     { bg: 'bg-[#fef3c7] border border-[#fde68a]', text: 'text-[#b45309]' },
    Accepted: { bg: 'bg-[#dcfce7] border border-[#bbf7d0]', text: 'text-[#15803d]' },
    Declined: { bg: 'bg-[#fee2e2] border border-[#fecaca]', text: 'text-[#dc2626]' },
    Overdue:  { bg: 'bg-[#fff7ed] border border-[#fed7aa]', text: 'text-[#c2410c]' },
};

function fmt(n: number, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
}

const BLOCK_MENU = [
    { type: 'heading'   as BlockType, label: 'Heading',       icon: AlignLeft,          tag: 'Text' },
    { type: 'text'      as BlockType, label: 'Paragraph',     icon: FileText,            tag: 'Text' },
    { type: 'pricing'   as BlockType, label: 'Pricing Table', icon: Table,               tag: 'Finance' },
    { type: 'signature' as BlockType, label: 'Signature',     icon: PenLine,             tag: 'Legal' },
    { type: 'divider'   as BlockType, label: 'Divider',       icon: SeparatorHorizontal, tag: 'Layout' },
    { type: 'image'     as BlockType, label: 'Image',         icon: Image,               tag: 'Media' },
];

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function ProposalEditor() {
    const router = useRouter();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const [isPreview, setIsPreview] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [rightTab, setRightTab] = useState<RightPanelTab>('details');
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [copied, setCopied] = useState(false);
    // insertAfterIdx: -1 = before first block, 0..n-1 = after block at that index, null = no active insert zone
    const [insertAfterIdx, setInsertAfterIdx] = useState<number | null>(null);
    const [openInsertMenu, setOpenInsertMenu] = useState<number | null>(null); // same index scheme

    const isMobilePreview = isPreview && previewMode === 'mobile';

    const [meta, setMeta] = useState<ProposalMeta>({
        clientName: '',
        projectName: '',
        issueDate: new Date().toISOString().split('T')[0],
        expirationDate: '',
        currency: 'USD',
        discountCalc: 'before_tax',
        proposalNumber: '0170371',
        status: 'Draft',
    });

    const [blocks, setBlocks] = useState<BlockData[]>([
        {
            id: 'b1', type: 'heading', content: 'Thank you for choosing us', level: 1
        },
        {
            id: 'b2', type: 'text',
            content: "We're focused on understanding your needs and creating solutions that align with your goals.\nHere's the proposal — we're happy to discuss any details."
        },
        {
            id: 'b3', type: 'pricing',
            rows: [
                { id: 'r1', description: 'Brand Strategy & Identity', qty: 1, rate: 2500 },
                { id: 'r2', description: 'Website Design',            qty: 1, rate: 1800 },
                { id: 'r3', description: 'Content Creation',          qty: 3, rate: 400  },
            ],
            taxRate: 15, discountRate: 0, showTax: true, showDiscount: false,
            note: ''
        },
        {
            id: 'b4', type: 'signature',
            signerName: '', signerRole: 'Client', signed: false
        }
    ]);

    /* ── DnD ── */
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const from = blocks.findIndex(b => b.id === active.id);
            const to   = blocks.findIndex(b => b.id === over.id);
            setBlocks(arrayMove(blocks, from, to));
        }
    };

    /* ── Block mutations ── */
    const addBlock = (type: BlockType, afterId?: string) => {
        const nb: BlockData = {
            id: uuidv4(), type,
            ...(type === 'heading'   ? { content: 'New Section',  level: 2 } : {}),
            ...(type === 'text'      ? { content: '' } : {}),
            ...(type === 'pricing'   ? { rows: [{ id: uuidv4(), description: '', qty: 1, rate: 0 }], taxRate: 0, discountRate: 0, showTax: false, showDiscount: false } : {}),
            ...(type === 'signature' ? { signerName: '', signerRole: 'Client', signed: false } : {}),
        };
        setBlocks(prev => {
            if (!afterId) return [...prev, nb];
            const idx = prev.findIndex(b => b.id === afterId);
            const next = [...prev];
            next.splice(idx + 1, 0, nb);
            return next;
        });
        setShowAddMenu(false);
        setOpenInsertMenu(null);
    };

    const updateBlock = useCallback((id: string, patch: Partial<BlockData>) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
    }, []);

    const removeBlock = useCallback((id: string) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
    }, []);

    const updateMeta = (patch: Partial<ProposalMeta>) => setMeta(m => ({ ...m, ...patch }));

    /* ── Copy link ── */
    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    /* ── Totals ── */
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

    /* ═══ RENDER ═══ */
    return (
        <div className={cn(
            "flex flex-col h-full w-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-white text-[#111]"
        )}>

            {/* ── TOP BAR (SaaS PageHeader Match) ── */}
            <div className={cn(
                "flex items-center px-6 py-4 border-b shrink-0 transition-colors",
                isDark ? "bg-[#141414] border-[#252525]" : "bg-white border-[#d2d2eb]"
            )}>
                {/* Left: Editable Title & Status Indicator */}
                <div className="flex items-center gap-4 flex-1">
                    <button
                        onClick={() => router.push('/proposals')}
                        className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-[8px] transition-all",
                            isDark ? "text-[#666] hover:text-[#ccc] bg-[#222]" : "text-[#888] hover:text-[#111] bg-[#f1f1f9]"
                        )}
                    >
                        <ArrowLeft size={16} />
                    </button>

                    <div className="flex flex-col">
                        <input
                            type="text"
                            value={meta.projectName || "New Proposal"}
                            onChange={(e) => updateMeta({ projectName: e.target.value })}
                            className={cn(
                                "text-[18px] font-bold bg-transparent outline-none border-b border-transparent focus:border-[var(--primary)] transition-all max-w-[300px]",
                                isDark ? "text-white" : "text-[#111]"
                            )}
                            placeholder="Proposal Title"
                        />
                    </div>

                    {/* Status badge (StatusIndicator equivalent) */}
                    <div className="relative ml-2">
                        <button
                            onClick={() => setShowStatusMenu(s => !s)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-[12px] font-semibold transition-all border",
                                sc.bg, sc.text
                            )}
                        >
                            <div className={cn("w-1.5 h-1.5 rounded-full bg-current opacity-70")} />
                            {meta.status}
                            <ChevronDown size={12} className="ml-1 opacity-50" />
                        </button>
                        {showStatusMenu && (
                            <div className={cn(
                                "absolute left-0 top-full mt-1.5 w-40 rounded-[10px] border shadow-xl py-1 z-50",
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
                </div>

                {/* Right: Actions (CopyLink, SendEmail, DropDown) */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (isPreview) {
                                setIsPreview(false);
                            } else {
                                setIsPreview(true);
                                setPreviewMode('desktop');
                            }
                        }}
                        title={isPreview ? "Exit preview" : "Preview"}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all",
                            isPreview
                                ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-light)]"
                                : isDark 
                                    ? "bg-[#222] text-[#ccc] hover:bg-[#333]" 
                                    : "bg-[#f1f1f9] text-[#555] hover:bg-[#e2e2ef] hover:text-[#111]"
                        )}
                    >
                        {isPreview ? <PenLine size={14} /> : <Eye size={14} />}
                        {isPreview ? "Edit" : "Preview"}
                    </button>

                    {/* Desktop / Mobile toggle — only in preview mode */}
                    {isPreview && (
                        <div className={cn(
                            "flex items-center rounded-[8px] border overflow-hidden",
                            isDark ? "border-[#333] bg-[#1c1c1c]" : "border-[#e0e0e0] bg-[#f5f5f5]"
                        )}>
                            <button
                                onClick={() => setPreviewMode('desktop')}
                                title="Desktop preview"
                                className={cn(
                                    "flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium transition-all",
                                    previewMode === 'desktop'
                                        ? isDark ? "bg-[#333] text-white" : "bg-white text-[#111] shadow-sm"
                                        : isDark ? "text-[#666] hover:text-[#aaa]" : "text-[#aaa] hover:text-[#555]"
                                )}
                            >
                                <Monitor size={13} />
                            </button>
                            <button
                                onClick={() => setPreviewMode('mobile')}
                                title="Mobile preview"
                                className={cn(
                                    "flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium transition-all",
                                    previewMode === 'mobile'
                                        ? isDark ? "bg-[#333] text-white" : "bg-white text-[#111] shadow-sm"
                                        : isDark ? "text-[#666] hover:text-[#aaa]" : "text-[#aaa] hover:text-[#555]"
                                )}
                            >
                                <Smartphone size={13} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={copyLink}
                        title={copied ? "Copied!" : "Copy link"}
                        className={cn(
                            "flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                            isDark ? "bg-[#222] text-[#ccc] hover:bg-[#333]" : "bg-[#f1f1f9] text-[#555] hover:bg-[#e2e2ef] hover:text-[#111]"
                        )}
                    >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Link2 size={14} />}
                    </button>

                    {/* Send Email equivalent */}
                    <button
                        title="Send via Email"
                        className="flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white shadow-sm"
                    >
                        <Send size={14} />
                    </button>

                    {/* Actions dropdown (ProposalDropDown equivalent) */}
                    <div className="relative ml-1">
                        <button
                            onClick={() => setShowActionsMenu(s => !s)}
                            className={cn(
                                "flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                                isDark ? "bg-[#222] text-[#ccc] hover:bg-[#333]" : "bg-[#f1f1f9] text-[#555] hover:bg-[#e2e2ef] hover:text-[#111]"
                            )}
                        >
                            <MoreHorizontal size={16} />
                        </button>
                        {showActionsMenu && (
                            <div className={cn(
                                "absolute right-0 top-full mt-1.5 w-48 rounded-[10px] border shadow-xl py-1 z-50",
                                isDark ? "bg-[#1f1f1f] border-[#333]" : "bg-white border-[#d2d2eb]"
                            )}>
                                {[
                                    { icon: Download, label: 'Download PDF' },
                                    { icon: Copy,     label: 'Duplicate Proposal' },
                                    { icon: Trash2,   label: 'Delete' },
                                ].map(({ icon: Icon, label }) => (
                                    <button
                                        key={label}
                                        onClick={() => setShowActionsMenu(false)}
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

                {/* ── LEFT: CANVAS ── */}
                <div className={cn(
                    "flex-1 overflow-auto relative",
                    isDark ? "bg-[#111]" : "bg-[#f2f2f2]"
                )}>
                    <div className={cn(
                        "flex justify-center min-h-full",
                        isMobilePreview ? "py-8 px-4" : "py-10 px-6"
                    )}>
                        {/* Mobile phone frame wrapper */}
                        {isMobilePreview ? (
                            <div className="flex flex-col items-center">
                                {/* Phone shell */}
                                <div className={cn(
                                    "relative rounded-[44px] border-[8px] shadow-2xl overflow-hidden shrink-0",
                                    "w-[390px] h-[844px]",
                                    isDark ? "border-[#2a2a2a] bg-[#1c1c1c]" : "border-[#c8c8c8] bg-white"
                                )} style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.1)' }}>
                                    {/* Phone notch */}
                                    <div className={cn(
                                        "absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[34px] rounded-b-[20px] z-10",
                                        isDark ? "bg-[#1a1a1a]" : "bg-[#b8b8b8]"
                                    )} />
                                    {/* Status bar */}
                                    <div className={cn(
                                        "flex items-center justify-between px-6 pt-[14px] pb-2 text-[10px] font-semibold",
                                        isDark ? "text-[#ccc]" : "text-[#333]"
                                    )}>
                                        <span>9:41</span>
                                        <div className="flex items-center gap-1 text-[8px]">
                                            <span>●●●●</span>
                                            <span>WiFi</span>
                                            <span>🔋</span>
                                        </div>
                                    </div>
                                    {/* Scrollable content */}
                                    <div className="absolute inset-0 top-[52px] overflow-y-auto overflow-x-hidden scrollbar-none">
                                        <ProposalDocument
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
                                            setBlocks={setBlocks}
                                            currency={meta.currency}
                                        />
                                    </div>
                                    {/* Home bar */}
                                    <div className={cn(
                                        "absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[120px] h-[5px] rounded-full",
                                        isDark ? "bg-[#444]" : "bg-[#bbb]"
                                    )} />
                                </div>
                            </div>
                        ) : (
                            /* Desktop canvas */
                            <ProposalDocument
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
                                setBlocks={setBlocks}
                                currency={meta.currency}
                            />
                        )}
                    </div>
                </div>

                {/* ── RIGHT: METADATA PANEL ── */}
                {!isPreview && (
                    <div className={cn(
                        "w-[240px] shrink-0 flex flex-col border-l overflow-hidden",
                        isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-[#fafafa] border-[#ebebeb]"
                    )}>
                        {/* Tab bar */}
                        <div className={cn(
                            "flex items-center border-b shrink-0",
                            isDark ? "border-[#252525]" : "border-[#ebebeb]"
                        )}>
                            {([ ['details', Settings, 'Details'], ['appearance', Palette, 'Design'], ['automation', Zap, 'Auto'] ] as const).map(([tab, Icon, label]) => (
                                <button
                                    key={tab}
                                    onClick={() => setRightTab(tab)}
                                    title={label}
                                    className={cn(
                                        "flex-1 flex items-center justify-center py-2.5 text-[11px] font-medium transition-all border-b-2",
                                        rightTab === tab
                                            ? isDark
                                                ? "border-white text-white"
                                                : "border-[#111] text-[#111]"
                                            : isDark
                                                ? "border-transparent text-[#555] hover:text-[#aaa]"
                                                : "border-transparent text-[#bbb] hover:text-[#666]"
                                    )}
                                >
                                    <Icon size={13} />
                                </button>
                            ))}
                        </div>

                        {/* Panel content */}
                        <div className="flex-1 overflow-auto py-3 px-3 space-y-1.5">

                            {rightTab === 'details' && (
                                <>
                                    <MetaField
                                        label="Client"
                                        isDark={isDark}
                                        icon={<User size={11} className="opacity-50" />}
                                    >
                                        <input
                                            value={meta.clientName}
                                            onChange={e => updateMeta({ clientName: e.target.value })}
                                            placeholder="Select client..."
                                            className={cn(
                                                "w-full text-[12px] bg-transparent outline-none font-medium",
                                                isDark ? "text-[#ccc] placeholder:text-[#444]" : "text-[#333] placeholder:text-[#ccc]"
                                            )}
                                        />
                                    </MetaField>

                                    <MetaField
                                        label="Project"
                                        isDark={isDark}
                                        icon={<FileText size={11} className="opacity-50" />}
                                        hasInfo
                                    >
                                        <input
                                            value={meta.projectName}
                                            onChange={e => updateMeta({ projectName: e.target.value })}
                                            placeholder="Set project..."
                                            className={cn(
                                                "w-full text-[12px] bg-transparent outline-none font-medium",
                                                isDark ? "text-[#ccc] placeholder:text-[#444]" : "text-[#333] placeholder:text-[#ccc]"
                                            )}
                                        />
                                    </MetaField>

                                    <MetaField
                                        label="Issue date"
                                        isDark={isDark}
                                        icon={<Calendar size={11} className="opacity-50" />}
                                        hasInfo
                                    >
                                        <input
                                            type="date"
                                            value={meta.issueDate}
                                            onChange={e => updateMeta({ issueDate: e.target.value })}
                                            className={cn(
                                                "w-full text-[12px] bg-transparent outline-none font-medium",
                                                isDark ? "text-[#ccc]" : "text-[#333]"
                                            )}
                                        />
                                    </MetaField>

                                    <MetaField
                                        label="Expiration date"
                                        isDark={isDark}
                                        icon={<Calendar size={11} className="opacity-50" />}
                                        hasInfo
                                    >
                                        <input
                                            type="date"
                                            value={meta.expirationDate}
                                            onChange={e => updateMeta({ expirationDate: e.target.value })}
                                            className={cn(
                                                "w-full text-[12px] bg-transparent outline-none font-medium",
                                                isDark ? "text-[#ccc]" : "text-[#333]"
                                            )}
                                        />
                                    </MetaField>

                                    <MetaField
                                        label="Currency"
                                        isDark={isDark}
                                        icon={<DollarSign size={11} className="opacity-50" />}
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
                                        label="Discount calc."
                                        isDark={isDark}
                                        icon={<Tag size={11} className="opacity-50" />}
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
                                        label="Proposal number (ID)"
                                        isDark={isDark}
                                        icon={<Tag size={11} className="opacity-50" />}
                                        hasInfo
                                    >
                                        <input
                                            value={meta.proposalNumber}
                                            onChange={e => updateMeta({ proposalNumber: e.target.value })}
                                            className={cn(
                                                "w-full text-[12px] bg-transparent outline-none font-medium font-mono",
                                                isDark ? "text-[#ccc]" : "text-[#333]"
                                            )}
                                        />
                                    </MetaField>

                                    {/* Collapsible sections */}
                                    {['Automation', 'Custom fields', 'Localisation'].map(section => (
                                        <CollapsibleSection key={section} label={section} isDark={isDark} />
                                    ))}
                                </>
                            )}

                            {rightTab === 'appearance' && (
                                <div className="space-y-3 pt-1">
                                    <div className={cn("text-[10px] uppercase tracking-widest font-bold", isDark ? "text-[#555]" : "text-[#bbb]")}>
                                        Font
                                    </div>
                                    {['Inter', 'Outfit', 'Playfair', 'IBM Plex Mono'].map(font => (
                                        <button
                                            key={font}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-lg text-[12px] border transition-all",
                                                isDark ? "border-[#2a2a2a] text-[#aaa] hover:border-[#3a3a3a] hover:bg-white/5" : "border-[#ebebeb] text-[#555] hover:border-[#ccc] hover:bg-white"
                                            )}
                                        >
                                            {font}
                                        </button>
                                    ))}
                                    <div className={cn("text-[10px] uppercase tracking-widest font-bold pt-2", isDark ? "text-[#555]" : "text-[#bbb]")}>
                                        Accent Color
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {['#111111', '#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c'].map(color => (
                                            <button
                                                key={color}
                                                title={color}
                                                style={{ background: color }}
                                                className="w-7 h-7 rounded-full border-2 border-white/30 hover:scale-110 transition-transform shadow-sm"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {rightTab === 'automation' && (
                                <div className={cn("text-[12px] py-4 text-center", isDark ? "text-[#555]" : "text-[#bbb]")}>
                                    Automation rules coming soon
                                </div>
                            )}
                        </div>

                        {/* Footer totals */}
                        <div className={cn(
                            "border-t px-3 py-3 space-y-1 shrink-0 text-[11px]",
                            isDark ? "border-[#252525]" : "border-[#ebebeb]"
                        )}>
                            <div className={cn("flex justify-between", isDark ? "text-[#666]" : "text-[#aaa]")}>
                                <span>Subtotal</span>
                                <span className="font-medium">{fmt(totals.subtotal, meta.currency)}</span>
                            </div>
                            {totals.discAmt > 0 && (
                                <div className={cn("flex justify-between", isDark ? "text-[#666]" : "text-[#aaa]")}>
                                    <span>Discount</span>
                                    <span className="font-medium text-red-500">−{fmt(totals.discAmt, meta.currency)}</span>
                                </div>
                            )}
                            {totals.taxAmt > 0 && (
                                <div className={cn("flex justify-between", isDark ? "text-[#666]" : "text-[#aaa]")}>
                                    <span>Tax</span>
                                    <span className="font-medium">{fmt(totals.taxAmt, meta.currency)}</span>
                                </div>
                            )}
                            <div className={cn(
                                "flex justify-between font-bold text-[13px] pt-1 border-t",
                                isDark ? "border-[#2a2a2a] text-white" : "border-[#ebebeb] text-[#111]"
                            )}>
                                <span>Total</span>
                                <span>{fmt(totals.total, meta.currency)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SORTABLE BLOCK WRAPPER
═══════════════════════════════════════════════════════ */
function SortableBlock({
    block, isDark, isPreview, updateBlock, removeBlock, addBlock, currency, onMoveUp, onMoveDown, onDuplicate
}: {
    block: BlockData;
    isDark: boolean;
    isPreview: boolean;
    updateBlock: (id: string, patch: Partial<BlockData>) => void;
    removeBlock: (id: string) => void;
    addBlock: (type: BlockType, afterId?: string) => void;
    currency: string;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDuplicate?: () => void;
}) {
    const {
        attributes, listeners, setNodeRef,
        transform, transition, isDragging
    } = useSortable({ id: block.id });

    return (
        <SectionBlockWrapper
            id={block.id}
            type={block.type}
            onDelete={removeBlock}
            onDuplicate={onDuplicate}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            isPreview={isPreview}
        >
            <BlockRenderer
                block={block}
                isDark={isDark}
                isPreview={isPreview}
                updateBlock={updateBlock}
                currency={currency}
            />
        </SectionBlockWrapper>
    );
}

/* ═══════════════════════════════════════════════════════
   BLOCK RENDERER
═══════════════════════════════════════════════════════ */
function BlockRenderer({
    block, isDark, isPreview, updateBlock, currency
}: {
    block: BlockData;
    isDark: boolean;
    isPreview: boolean;
    updateBlock: (id: string, patch: Partial<BlockData>) => void;
    currency: string;
}) {
    switch (block.type) {
        case 'heading':
            return <HeadingBlock block={block} isDark={isDark} isPreview={isPreview} updateBlock={updateBlock} />;
        case 'text':
            return <TextBlock block={block} isDark={isDark} isPreview={isPreview} updateBlock={updateBlock} />;
        case 'pricing':
            return <PricingBlock block={block} isDark={isDark} isPreview={isPreview} updateBlock={updateBlock} currency={currency} />;
        case 'signature':
            return <SignatureBlock block={block} isDark={isDark} isPreview={isPreview} updateBlock={updateBlock} />;
        case 'divider':
            return <div className={cn("my-4 border-t", isDark ? "border-[#2a2a2a]" : "border-[#f0f0f0]")} />;
        case 'image':
            return (
                <div className={cn(
                    "flex items-center justify-center h-32 rounded-lg border-2 border-dashed text-[12px] my-2",
                    isDark ? "border-[#333] text-[#555]" : "border-[#e0e0e0] text-[#ccc]"
                )}>
                    <Image size={20} className="mr-2 opacity-40" />
                    Click to add image
                </div>
            );
        default:
            return null;
    }
}

/* ─── Heading Block ─── */
function HeadingBlock({ block, isDark, isPreview, updateBlock }: any) {
    const sizes: Record<number, string> = { 1: 'text-[22px] font-black', 2: 'text-[17px] font-bold', 3: 'text-[14px] font-semibold' };
    const cls = sizes[block.level || 1] || sizes[1];
    return (
        <div className="py-1 group/hb flex items-start gap-2">
            {!isPreview && (
                <select
                    value={block.level || 1}
                    onChange={e => updateBlock(block.id, { level: Number(e.target.value) })}
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
                    !block.content && !isPreview ? "before:content-['New_Heading'] before:text-[#ccc] before:pointer-events-none" : ""
                )}
            >
                {block.content}
            </div>
        </div>
    );
}

/* ─── Text Block ─── */
function TextBlock({ block, isDark, isPreview, updateBlock }: any) {
    if (isPreview) {
        return (
            <div
                className={cn(
                    "py-1 text-[13px] leading-relaxed prose prose-p:my-1 prose-headings:my-2 max-w-none prose-h1:text-3xl prose-h2:text-xl prose-h3:text-lg",
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
            />
        </div>
    );
}

/* ─── Pricing Block ─── */
function PricingBlock({ block, isDark, isPreview, updateBlock, currency }: any) {
    const rows: PricingRow[] = block.rows || [];
    const subtotal = rows.reduce((s: number, r: PricingRow) => s + r.qty * r.rate, 0);
    const discAmt  = subtotal * ((block.discountRate || 0) / 100);
    const taxBase  = subtotal - discAmt;
    const taxAmt   = taxBase * ((block.taxRate || 0) / 100);
    const total    = taxBase + taxAmt;

    const updateRow = (rowId: string, patch: Partial<PricingRow>) => {
        updateBlock(block.id, {
            rows: rows.map((r: PricingRow) => r.id === rowId ? { ...r, ...patch } : r)
        });
    };
    const addRow = () => {
        updateBlock(block.id, {
            rows: [...rows, { id: uuidv4(), description: '', qty: 1, rate: 0 }]
        });
    };
    const removeRow = (rowId: string) => {
        updateBlock(block.id, { rows: rows.filter((r: PricingRow) => r.id !== rowId) });
    };

    const th = cn("text-[10px] font-bold uppercase tracking-wider pb-2 text-left", isDark ? "text-[#555]" : "text-[#aaa]");
    const td = cn("py-2 text-[12px]", isDark ? "text-[#ccc]" : "text-[#333]");

    return (
        <div className={cn(
            "my-4 rounded-xl border overflow-hidden",
            isDark ? "border-[#2a2a2a]" : "border-[#ebebeb]"
        )}>
            <table className="w-full">
                <thead className={cn("border-b", isDark ? "border-[#2a2a2a] bg-[#1f1f1f]" : "border-[#f0f0f0] bg-[#fafafa]")}>
                    <tr>
                        <th className={cn(th, "px-4 py-2 w-full")}>Description</th>
                        <th className={cn(th, "px-3 py-2 text-right w-16")}>Qty</th>
                        <th className={cn(th, "px-3 py-2 text-right w-24")}>Rate</th>
                        <th className={cn(th, "px-4 py-2 text-right w-24")}>Total</th>
                        {!isPreview && <th className="w-8" />}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row: PricingRow) => (
                        <tr key={row.id} className={cn("border-b group/row", isDark ? "border-[#1f1f1f]" : "border-[#f8f8f8]")}>
                            <td className={cn(td, "px-4")}>
                                {isPreview
                                    ? row.description || '—'
                                    : <input
                                        value={row.description}
                                        onChange={e => updateRow(row.id, { description: e.target.value })}
                                        placeholder="Item description..."
                                        className={cn("w-full bg-transparent outline-none text-[12px]", isDark ? "text-[#ccc] placeholder:text-[#444]" : "text-[#333] placeholder:text-[#ccc]")}
                                    />
                                }
                            </td>
                            <td className={cn(td, "px-3 text-right")}>
                                {isPreview
                                    ? row.qty
                                    : <input
                                        type="number"
                                        value={row.qty}
                                        onChange={e => updateRow(row.id, { qty: Number(e.target.value) })}
                                        className={cn("w-12 text-right bg-transparent outline-none text-[12px]", isDark ? "text-[#ccc]" : "text-[#333]")}
                                    />
                                }
                            </td>
                            <td className={cn(td, "px-3 text-right")}>
                                {isPreview
                                    ? fmt(row.rate, currency)
                                    : <input
                                        type="number"
                                        value={row.rate}
                                        onChange={e => updateRow(row.id, { rate: Number(e.target.value) })}
                                        className={cn("w-20 text-right bg-transparent outline-none text-[12px]", isDark ? "text-[#ccc]" : "text-[#333]")}
                                    />
                                }
                            </td>
                            <td className={cn(td, "px-4 text-right font-semibold")}>{fmt(row.qty * row.rate, currency)}</td>
                            {!isPreview && (
                                <td className="pr-2">
                                    <button
                                        onClick={() => removeRow(row.id)}
                                        className={cn("opacity-0 group-hover/row:opacity-100 p-1 rounded transition-all", isDark ? "text-[#555] hover:text-red-400" : "text-[#ddd] hover:text-red-400")}
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className={cn("px-4 py-3 space-y-1 border-t", isDark ? "border-[#2a2a2a] bg-[#1a1a1a]" : "border-[#f0f0f0] bg-[#fafafa]")}>
                {!isPreview && (
                    <button
                        onClick={addRow}
                        className={cn("flex items-center gap-1.5 text-[11px] font-medium mb-2 transition-colors", isDark ? "text-[#555] hover:text-[#888]" : "text-[#bbb] hover:text-[#888]")}
                    >
                        <Plus size={11} /> Add line
                    </button>
                )}
                <div className={cn("flex justify-between text-[11px]", isDark ? "text-[#666]" : "text-[#aaa]")}>
                    <span>Subtotal</span>
                    <span>{fmt(subtotal, currency)}</span>
                </div>
                {/* Discount row */}
                <div className={cn("flex justify-between items-center text-[11px]", isDark ? "text-[#666]" : "text-[#aaa]")}>
                    <div className="flex items-center gap-2">
                        <span>Discount</span>
                        {!isPreview && (
                            <input
                                type="number"
                                value={block.discountRate || 0}
                                onChange={e => updateBlock(block.id, { discountRate: Number(e.target.value) })}
                                className={cn("w-10 text-[11px] bg-transparent outline-none border-b", isDark ? "border-[#333] text-[#888]" : "border-[#e0e0e0] text-[#888]")}
                            />
                        )}
                        <span>%</span>
                    </div>
                    <span>−{fmt(discAmt, currency)}</span>
                </div>
                {/* Tax row */}
                <div className={cn("flex justify-between items-center text-[11px]", isDark ? "text-[#666]" : "text-[#aaa]")}>
                    <div className="flex items-center gap-2">
                        <span>Tax</span>
                        {!isPreview && (
                            <input
                                type="number"
                                value={block.taxRate || 0}
                                onChange={e => updateBlock(block.id, { taxRate: Number(e.target.value) })}
                                className={cn("w-10 text-[11px] bg-transparent outline-none border-b", isDark ? "border-[#333] text-[#888]" : "border-[#e0e0e0] text-[#888]")}
                            />
                        )}
                        <span>%</span>
                    </div>
                    <span>{fmt(taxAmt, currency)}</span>
                </div>
                <div className={cn("flex justify-between font-bold text-[13px] pt-1.5 border-t", isDark ? "border-[#2a2a2a] text-white" : "border-[#e8e8e8] text-[#111]")}>
                    <span>Total</span>
                    <span>{fmt(total, currency)}</span>
                </div>
            </div>
        </div>
    );
}

/* ─── Signature Block ─── */
function SignatureBlock({ block, isDark, isPreview, updateBlock }: any) {
    return (
        <div className={cn(
            "my-4 rounded-xl border p-5",
            isDark ? "border-[#2a2a2a] bg-[#1a1a1a]" : "border-[#ebebeb] bg-[#fafafa]"
        )}>
            <div className={cn("text-[10px] font-bold uppercase tracking-widest mb-3", isDark ? "text-[#555]" : "text-[#bbb]")}>
                Signature
            </div>
            <div className="flex items-end gap-6">
                <div className="flex-1">
                    <div className={cn(
                        "h-14 rounded-lg border-2 border-dashed flex items-center justify-center text-[11px] mb-2",
                        isDark ? "border-[#333] text-[#555]" : "border-[#e0e0e0] text-[#ccc]"
                    )}>
                        {block.signed ? '✓ Signed' : 'Signature here'}
                    </div>
                    {!isPreview && (
                        <input
                            value={block.signerName || ''}
                            onChange={e => updateBlock(block.id, { signerName: e.target.value })}
                            placeholder="Signer name"
                            className={cn("w-full bg-transparent outline-none text-[12px] border-b pb-0.5", isDark ? "border-[#333] text-[#ccc] placeholder:text-[#444]" : "border-[#e0e0e0] text-[#333] placeholder:text-[#ccc]")}
                        />
                    )}
                    {block.signerName && isPreview && (
                        <div className={cn("text-[12px] font-medium border-t pt-1", isDark ? "text-[#aaa] border-[#333]" : "text-[#555] border-[#e0e0e0]")}>
                            {block.signerName}
                        </div>
                    )}
                    <div className={cn("text-[10px] mt-0.5", isDark ? "text-[#555]" : "text-[#bbb]")}>{block.signerRole}</div>
                </div>
                {!isPreview && (
                    <button
                        onClick={() => updateBlock(block.id, { signed: !block.signed })}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                            block.signed
                                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                : isDark ? "bg-[#2a2a2a] text-[#888] hover:bg-[#333]" : "bg-white border border-[#e0e0e0] text-[#888] hover:border-[#ccc]"
                        )}
                    >
                        {block.signed ? '✓ Signed' : 'Mark signed'}
                    </button>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   PANEL SUB-COMPONENTS
═══════════════════════════════════════════════════════ */
function MetaField({
    label, children, isDark, icon, hasInfo
}: {
    label: string;
    children: React.ReactNode;
    isDark: boolean;
    icon?: React.ReactNode;
    hasInfo?: boolean;
}) {
    return (
        <div className={cn(
            "rounded-lg border px-3 py-2.5 transition-colors",
            isDark ? "border-[#252525] bg-[#1f1f1f] hover:border-[#333]" : "border-[#ebebeb] bg-white hover:border-[#ddd]"
        )}>
            <div className="flex items-center justify-between mb-1">
                <div className={cn("flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider", isDark ? "text-[#555]" : "text-[#bbb]")}>
                    {icon}
                    {label}
                </div>
                {hasInfo && (
                    <button className={cn("transition-colors", isDark ? "text-[#444] hover:text-[#888]" : "text-[#ddd] hover:text-[#aaa]")}>
                        <ChevronRight size={11} />
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}

function CollapsibleSection({ label, isDark }: { label: string; isDark: boolean }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={cn(
            "rounded-lg border overflow-hidden",
            isDark ? "border-[#252525]" : "border-[#ebebeb]"
        )}>
            <button
                onClick={() => setOpen(v => !v)}
                className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 text-[12px] font-medium transition-colors",
                    isDark ? "text-[#888] hover:text-[#ccc] bg-[#1f1f1f]" : "text-[#777] hover:text-[#333] bg-white"
                )}
            >
                {label}
                <ChevronRight size={12} className={cn("transition-transform", open ? "rotate-90" : "")} />
            </button>
            {open && (
                <div className={cn(
                    "px-3 py-2 text-[11px] border-t",
                    isDark ? "border-[#252525] text-[#555] bg-[#1a1a1a]" : "border-[#f5f5f5] text-[#bbb] bg-[#fafafa]"
                )}>
                    No {label.toLowerCase()} configured
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   INSERT ZONE — smart dashed line between blocks
═══════════════════════════════════════════════════════ */
function InsertZone({
    idx, isDark, isOpen, onOpen, onClose, onAdd
}: {
    idx: number;
    isDark: boolean;
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    onAdd: (type: BlockType) => void;
}) {
    const [hovered, setHovered] = useState(false);
    const visible = hovered || isOpen;

    return (
        <div
            className="relative flex items-center group/insert"
            style={{ height: visible ? 28 : 8, transition: 'height 0.15s ease' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { if (!isOpen) setHovered(false); }}
        >
            {/* Dashed line */}
            <div className={cn(
                "absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center transition-opacity duration-150",
                visible ? "opacity-100" : "opacity-0"
            )}>
                <div className={cn(
                    "flex-1 border-t border-dashed",
                    isDark ? "border-[#363636]" : "border-[#d8d8d8]"
                )} />
                <button
                    onClick={(e) => { e.stopPropagation(); onOpen(); }}
                    className={cn(
                        "mx-2 w-5 h-5 flex items-center justify-center rounded-full border transition-all text-[11px] font-bold shrink-0 shadow-sm",
                        isOpen
                            ? isDark ? "bg-[var(--primary)] border-[var(--primary)] text-white" : "bg-[var(--primary)] border-[var(--primary)] text-white"
                            : isDark ? "bg-[#252525] border-[#363636] text-[#777] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                                     : "bg-white border-[#d0d0d0] text-[#aaa] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    )}
                >
                    +
                </button>
                <div className={cn(
                    "flex-1 border-t border-dashed",
                    isDark ? "border-[#363636]" : "border-[#d8d8d8]"
                )} />
            </div>

            {/* Block type picker popup */}
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
