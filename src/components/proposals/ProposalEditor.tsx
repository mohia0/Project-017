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
    Check, MoreHorizontal, FileText, Image as ImageIcon, SeparatorHorizontal,
    Settings, ChevronRight, RotateCcw, Monitor, Smartphone, PanelTop,
    X, Upload, LayoutTemplate
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getStatusColors, STATUS_COLORS } from '@/lib/statusConfig';
import { useUIStore } from '@/store/useUIStore';
import { useProposalStore } from '@/store/useProposalStore';
import { useClientStore } from '@/store/useClientStore';
import DatePicker from '@/components/ui/DatePicker';
import { useTemplateStore } from '@/store/useTemplateStore';
import { useDebounce } from '@/hooks/useDebounce';
import { ContentBlock } from './blocks/ContentBlock';
import { SectionBlockWrapper } from './blocks/SectionBlockWrapper';
import { ClientActionBar } from '@/components/ui/ClientActionBar';
import { AcceptSignModal } from '@/components/modals/AcceptSignModal';
import ImageUploadModal from '../modals/ImageUploadModal';
import { DesignSettingsPanel } from '@/components/ui/DesignSettingsPanel';
import { DEFAULT_DOCUMENT_DESIGN, DocumentDesign } from '@/types/design';
import { SaveTemplateModal } from '@/components/modals/SaveTemplateModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { gooeyToast } from 'goey-toast';

/* ═══════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════ */
type BlockType = 'heading' | 'text' | 'pricing' | 'signature' | 'divider' | 'image' | 'header';

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
    // heading / text
    content?: string;
    level?: 1 | 2 | 3;
    // image
    url?: string;
    // pricing
    rows?: PricingRow[];
    taxRate?: number;
    discountRate?: number;
    showTax?: boolean;
    showDiscount?: boolean;
    note?: string;
    hideQty?: boolean;
    // signature
    signerName?: string;
    signerRole?: string;
    signed?: boolean;
    signatureImage?: string;
    // section background
    backgroundColor?: string;
}

interface ProposalMeta {
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string;
    projectName: string;
    issueDate: string;
    expirationDate: string;
    currency: string;
    discountCalc: 'before_tax' | 'after_tax';
    proposalNumber: string;
    status: 'Draft' | 'Pending' | 'Accepted' | 'Declined' | 'Overdue';
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
    { type: 'text'      as BlockType, label: 'Content',       icon: FileText,            tag: 'Text' },
    { type: 'pricing'   as BlockType, label: 'Pricing Table', icon: Table,               tag: 'Finance' },
    { type: 'signature' as BlockType, label: 'Signature',     icon: PenLine,             tag: 'Legal' },
    { type: 'divider'   as BlockType, label: 'Divider',       icon: SeparatorHorizontal, tag: 'Layout' },
    { type: 'image'     as BlockType, label: 'Image',         icon: ImageIcon,               tag: 'Media' },
];

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function ProposalEditor({ id }: { id?: string }) {
    const router = useRouter();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { clients, fetchClients } = useClientStore();
    const { updateProposal, fetchProposals, proposals } = useProposalStore();
    const { addTemplate } = useTemplateStore();


    React.useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

    const [isPreview, setIsPreview] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [rightTab, setRightTab] = useState<RightPanelTab>('details');
    const [mobileBottomPanelOpen, setMobileBottomPanelOpen] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    // insertAfterIdx: -1 = before first block, 0..n-1 = after block at that index, null = no active insert zone
    const [insertAfterIdx, setInsertAfterIdx] = useState<number | null>(null);
    const [openInsertMenu, setOpenInsertMenu] = useState<number | null>(null); // same index scheme
    const [pendingStatusChange, setPendingStatusChange] = useState<ProposalMeta['status'] | null>(null);
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [imageUploadOpen, setImageUploadOpen] = useState(false);
    const [uploadTarget, setUploadTarget] = useState<{ type: 'logo' | 'block' | 'background', blockId?: string } | null>(null);

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

    const [meta, setMeta] = useState<ProposalMeta>({
        clientName: '',
        projectName: '',
        issueDate: new Date().toISOString().split('T')[0],
        expirationDate: '',
        currency: 'USD',
        discountCalc: 'before_tax',
        proposalNumber: '0170371',
        status: 'Draft',
        logoUrl: '',
        documentTitle: 'PROPOSAL &\nAGREEMENT',
    });

    const [blocks, setBlocks] = useState<BlockData[]>([
        { id: 'b1', type: 'header' },
        {
            id: 'b2', type: 'text',
            content: "We're focused on understanding your needs and creating solutions that align with your goals.\nHere's the proposal — we're happy to discuss any details."
        },
        {
            id: 'b3', type: 'pricing',
            rows: [
                { id: 'r1', title: 'Brand Strategy & Identity', description: '', qty: 1, rate: 2500 },
                { id: 'r2', title: 'Website Design',            description: '', qty: 1, rate: 1800 },
                { id: 'r3', title: 'Content Creation',          description: '', qty: 3, rate: 400  },
            ],
            taxRate: 15, discountRate: 0, showTax: true, showDiscount: false,
            note: ''
        },
        {
            id: 'b4', type: 'signature',
            signerName: '', signerRole: 'Client', signed: false
        }
    ]);
    
    const [isLoaded, setIsLoaded] = useState(false);
    const debouncedMeta = useDebounce(meta, 1000);
    const debouncedBlocks = useDebounce(blocks, 1000);

    // Initial load effect
    React.useEffect(() => {
        if (!id) {
            setIsLoaded(true);
            return;
        }
        fetchProposals();
    }, [id, fetchProposals]);

    React.useEffect(() => {
        if (!id) return;
        const proposal = proposals.find(p => p.id === id);
        if (proposal && !isLoaded) {
            setMeta(prev => ({
                ...prev,
                clientName: proposal.client_name || '',
                projectName: proposal.title || '',
                issueDate: proposal.issue_date ? proposal.issue_date.split('T')[0] : prev.issueDate,
                expirationDate: proposal.due_date ? proposal.due_date.split('T')[0] : prev.expirationDate,
                status: proposal.status as any,
                proposalNumber: proposal.id.slice(0, 8).toUpperCase(),
                ...((proposal.meta as any) || {})
            }));
            if (proposal.blocks && Array.isArray(proposal.blocks) && proposal.blocks.length > 0) {
                setBlocks(proposal.blocks);
            }
            setIsLoaded(true);
        }
    }, [id, proposals, isLoaded]);

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

        // setSaveStatus('saving');
        gooeyToast.promise(
            updateProposal(id, {
                title: debouncedMeta.projectName || 'New Proposal',
                client_name: debouncedMeta.clientName,
                status: debouncedMeta.status,
                issue_date: debouncedMeta.issueDate,
                due_date: debouncedMeta.expirationDate,
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
    }, [debouncedMeta, debouncedBlocks, id, isLoaded, updateProposal]);

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

    const handleStatusChange = (newStatus: ProposalMeta['status']) => {
        // If we have an accepted/declined status (likely with signature), ask for confirmation
        if (meta.status === 'Accepted' || meta.status === 'Declined') {
            setPendingStatusChange(newStatus);
            return;
        }
        updateMeta({ status: newStatus });
    };

    const confirmStatusChange = () => {
        if (!pendingStatusChange) return;
        
        // Remove signatures if we are invalidating them
        const nb = blocks.map((b: any) => 
            b.type === 'signature' ? { ...b, signed: false, signatureImage: undefined } : b
        );
        setBlocks(nb);
        updateMeta({ status: pendingStatusChange as any });
        setPendingStatusChange(null);
    };

    /* ── Copy link ── */
    const copyLink = () => {
        navigator.clipboard.writeText(window.location.origin + '/p/proposal/' + id);
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

    const sc = getStatusColors(meta.status);

    /* ═══ RENDER ═══ */
    return (
        <div className={cn(
            "flex flex-col h-full w-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-white text-[#111]"
        )}>

            {/* ── TOP BAR ── */}
            <div className={cn(
                "flex items-center justify-between px-3 md:px-6 py-2.5 md:py-4 border-b shrink-0 transition-colors relative",
                isDark ? "bg-[#141414] border-[#252525]" : "bg-white border-[#e4e4e4]"
            )}>
                {/* Left: Back + Title */}
                <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    <button
                        onClick={() => router.push('/proposals')}
                        className={cn(
                            "flex items-center justify-center w-8 h-8 shrink-0 rounded-[8px] transition-all",
                            isDark ? "text-[#666] hover:text-[#ccc] bg-[#222]" : "text-[#888] hover:text-[#111] bg-[#f0f0f0] hover:bg-[#e8e8e8]"
                        )}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1.5 min-w-0">
                        {/* Breadcrumb hidden on mobile */}
                        <div className={cn(
                            "hidden md:flex items-center gap-2 text-[13px] font-medium shrink-0",
                            isDark ? "text-white/40" : "text-gray-400"
                        )}>
                            <span>Proposal</span>
                            <span className="opacity-30">/</span>
                        </div>
                        <input
                            type="text"
                            value={meta.projectName || ""}
                            onChange={(e) => updateMeta({ projectName: e.target.value })}
                            className={cn(
                                "text-[13px] font-semibold bg-transparent outline-none transition-all w-full min-w-0",
                                isDark ? "text-white/90 placeholder:text-white/20" : "text-gray-900 placeholder:text-gray-300"
                            )}
                            placeholder="Untitled Proposal"
                        />
                    </div>
                </div>



                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                    {/* Status badge — hidden on mobile (accessible via bottom panel) */}
                    <div className="relative hidden md:flex items-center" ref={statusRef}>
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
                                "absolute right-0 top-full mt-1.5 w-40 rounded-[10px] shadow-xl py-1 z-50 border",
                                isDark ? "bg-[#0c0c0c] border-[#222]" : "bg-white border-[#e4e4e4]"
                            )}>
                                {Object.keys(STATUS_COLORS).filter(k => k !== 'All' && k !== 'Paid').map(s => (
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

                    <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-0.5 hidden md:block" />

                    {/* Preview toggle */}
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
                            "flex items-center gap-1.5 px-2.5 md:px-3 h-[32px] rounded-[8px] text-[12px] font-bold transition-all",
                            isPreview
                                ? "bg-[#4dbf39] text-black hover:bg-[#59d044]"
                                : isDark 
                                    ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" 
                                    : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]"
                        )}
                    >
                        {isPreview ? <PenLine size={14} /> : <Eye size={14} />}
                        <span className="hidden sm:inline">{isPreview ? "Edit" : "Preview"}</span>
                    </button>

                    {/* Desktop/mobile preview toggles (only when in preview) */}
                    {isPreview && (
                        <div className="flex items-center gap-1 ml-0.5">
                            <button
                                onClick={() => setPreviewMode('desktop')}
                                className={cn(
                                    "p-1.5 rounded-[6px] transition-colors hidden md:flex",
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
                                    "p-1.5 rounded-[6px] transition-colors hidden md:flex",
                                    previewMode === 'mobile'
                                        ? (isDark ? "bg-white/10 text-white" : "bg-black/5 text-black")
                                        : (isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60")
                                )}
                            >
                                <Smartphone size={14} />
                            </button>
                        </div>
                    )}

                    {/* Copy link — hidden on mobile */}
                    <button
                        onClick={copyLink}
                        className={cn(
                            "hidden md:flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                            isDark ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]"
                        )}
                    >
                        {copied ? <Check size={14} className="text-[#4dbf39]" /> : <Link2 size={14} />}
                    </button>

                    {/* Send — always visible */}
                    <button
                        className="flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all bg-[#4dbf39] hover:bg-[#59d044] text-black shadow-[0_4px_12px_-4px_rgba(77,191,57,0.3)]"
                    >
                        <Send size={14} />
                    </button>

                    {/* Actions dropdown */}
                    <div className="relative" ref={actionsRef}>
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
                                isDark ? "bg-[#0c0c0c] border border-[#222]" : "bg-white border border-[#d2d2eb]"
                            )}>
                                {[
                                    { icon: LayoutTemplate, label: 'Save as Template', action: () => setIsSaveTemplateModalOpen(true) },
                                    { icon: Link2,          label: 'Copy Link',         action: copyLink },
                                    { icon: Download,       label: 'Download PDF',      action: () => console.log('Download') },
                                    { icon: Copy,           label: 'Duplicate',         action: () => console.log('Duplicate') },
                                    { icon: Trash2,         label: 'Delete',            action: () => console.log('Delete') },
                                ].map(({ icon: Icon, label, action }) => (
                                    <button
                                        key={label}
                                        onClick={() => { action(); setShowActionsMenu(false); }}
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
                {/* ── LEFT: CANVAS ── */}
                <div 
                    className="flex-1 overflow-auto relative w-full pb-11 md:pb-0"
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
                        {!isMobilePreview && (
                            <ClientActionBar
                                type="proposal"
                                status={meta.status as any}
                                inline={true}
                                design={meta.design}
                                onAccept={() => setIsSignModalOpen(true)}
                                onDecline={() => updateMeta({ status: 'Declined' as any })}
                                onDownloadPDF={() => console.log('Download PDF pressed')}
                                onPrint={() => window.print()}
                            />
                        )}
                        {/* Mobile phone frame wrapper */}
                        {isMobilePreview ? (
                            <div className="flex flex-col items-center">
                                {/* Phone shell */}
                                <div className={cn(
                                    "relative rounded-[44px] border-[4px] overflow-hidden shrink-0 transition-all duration-300 bg-[#000]",
                                    "w-[390px] h-[844px]",
                                    isDark ? "border-[#1a1a1a] shadow-2xl" : "border-[#000] shadow-2xl"
                                )}>
                                    {/* Minimalist Notch */}
                                    <div className={cn(
                                        "absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] rounded-b-[16px] z-10 bg-white/[0.05]"
                                    )} />
                                    <div className={cn(
                                        "flex items-center justify-between px-8 pt-4 pb-2 text-[11px] font-medium z-10 relative opacity-40 text-white"
                                    )}>
                                        <span>9:41</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-4 h-2.5 rounded-[2px] border border-current opacity-50" />
                                        </div>
                                    </div>

                                    {/* Scrollable content */}
                                    <div className="absolute inset-0 top-[52px] pb-[34px] overflow-y-auto overflow-x-hidden scrollbar-none z-0"
                                         style={{ 
                                             backgroundColor: (meta.design?.backgroundColor) || (isDark ? '#080808' : '#f7f7f7'),
                                             backgroundImage: meta.design?.backgroundImage ? `url(${meta.design.backgroundImage})` : 'none',
                                             backgroundSize: 'cover',
                                             backgroundPosition: 'center',
                                         }}
                                    >
                                        <ClientActionBar
                                            type="proposal"
                                            status={meta.status as any}
                                            isMobile={true}
                                            inline={true}
                                            design={meta.design}
                                            onAccept={() => setIsSignModalOpen(true)}
                                            onDecline={() => updateMeta({ status: 'Declined' as any })}
                                            onDownloadPDF={() => console.log('Download PDF pressed')}
                                            onPrint={() => window.print()}
                                            className="pt-4"
                                        />
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
                                            updateMeta={updateMeta}
                                            setBlocks={setBlocks}
                                            currency={meta.currency}
                                            setImageUploadOpen={setImageUploadOpen as any}
                                            setUploadTarget={setUploadTarget as any}
                                            isSaveTemplateModalOpen={isSaveTemplateModalOpen}
                                            setIsSaveTemplateModalOpen={setIsSaveTemplateModalOpen}
                                            addTemplate={addTemplate}
                                            isFirst={true}
                                            isLast={true}
                                        />
                                    </div>
                                    {/* Home bar */}
                                    <div className={cn(
                                        "absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[100px] h-[4px] rounded-full z-10",
                                        isDark ? "bg-white/[0.05]" : "bg-black/[0.05]"
                                    )} />
                                </div>
                            </div>
                        ) : (
                            /* Desktop canvas */
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
                                    updateMeta={updateMeta}
                                    setBlocks={setBlocks}
                                    currency={meta.currency}
                                    setImageUploadOpen={setImageUploadOpen}
                                    setUploadTarget={setUploadTarget}
                                    isSaveTemplateModalOpen={isSaveTemplateModalOpen}
                                    setIsSaveTemplateModalOpen={setIsSaveTemplateModalOpen}
                                    addTemplate={addTemplate}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: METADATA PANEL (desktop only) ── */}
                {!isPreview && (
                    <div className={cn(
                        "hidden md:flex w-[240px] shrink-0 flex-col overflow-hidden border-l",
                        isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-[#f7f7f7] border-[#e4e4e4]"
                    )}>
                        <div className="flex items-center shrink-0 p-1.5 gap-1">
                            {([ ['details', Settings, 'Details'], ['appearance', Palette, 'Design'] ] as const).map(([tab, Icon, label]) => (
                                <button
                                    key={tab}
                                    onClick={() => setRightTab(tab)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold transition-all rounded-xl",
                                        rightTab === tab
                                            ? isDark
                                                ? "bg-white/10 text-white"
                                                : "bg-[#111]/5 text-[#111]"
                                            : isDark
                                                ? "text-[#555] hover:bg-white/[0.03] hover:text-[#aaa]"
                                                : "text-[#bbb] hover:bg-black/[0.03] hover:text-[#666]"
                                    )}
                                >
                                    <Icon size={14} strokeWidth={rightTab === tab ? 2.5 : 2} />
                                    <span className={cn("transition-all", rightTab === tab ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1 absolute")}>
                                        {label}
                                    </span>
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
                                        onReset={() => updateMeta({ clientName: '', clientEmail: '', clientPhone: '', clientAddress: '' })}
                                    >
                                        <div className="relative">
                                            <input
                                                value={meta.clientName}
                                                onChange={e => updateMeta({ clientName: e.target.value })}
                                                onFocus={() => setClientDropdownOpen(true)}
                                                onBlur={() => setTimeout(() => setClientDropdownOpen(false), 200)}
                                                placeholder="Select client..."
                                                className={cn(
                                                    "w-full text-[12px] bg-transparent outline-none font-medium",
                                                    isDark ? "text-[#ccc] placeholder:text-[#444]" : "text-[#333] placeholder:text-[#ccc]"
                                                )}
                                            />
                                            {clientDropdownOpen && clients.filter(c => c.company_name.toLowerCase().includes(meta.clientName.toLowerCase()) || c.contact_person.toLowerCase().includes(meta.clientName.toLowerCase()) || (c.email && c.email.toLowerCase().includes(meta.clientName.toLowerCase()))).length > 0 && (
                                                <div className={cn(
                                                    "absolute top-full left-0 w-[calc(100%+24px)] -ml-3 mt-[11px] rounded-b-lg border border-t-0 shadow-xl overflow-hidden z-50 max-h-[220px] overflow-y-auto",
                                                    isDark ? "bg-[#1f1f1f] border-[#252525]" : "bg-white border-[#ebebeb]"
                                                )}>
                                                    {clients
                                                        .filter(c => c.company_name.toLowerCase().includes(meta.clientName.toLowerCase()) || c.contact_person.toLowerCase().includes(meta.clientName.toLowerCase()) || (c.email && c.email.toLowerCase().includes(meta.clientName.toLowerCase())))
                                                        .map(c => (
                                                            <button
                                                                key={c.id}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    updateMeta({ 
                                                                        clientName: c.company_name || c.contact_person,
                                                                        clientEmail: c.email || '',
                                                                        clientPhone: c.phone || '',
                                                                        clientAddress: c.address || ''
                                                                    });
                                                                    setClientDropdownOpen(false);
                                                                }}
                                                                className={cn(
                                                                    "w-full text-left px-3 py-2 text-[12px] transition-colors border-b last:border-0",
                                                                    isDark ? "hover:bg-[#2a2a2a] border-[#252525]" : "hover:bg-[#f5f5f5] border-[#f0f0f0]"
                                                                )}
                                                            >
                                                                <div className={cn("font-bold truncate", isDark ? "text-[#ccc]" : "text-[#333]")}>
                                                                    {c.company_name}
                                                                </div>
                                                                {c.contact_person && (
                                                                    <div className={cn("text-[10.5px] truncate mt-0.5", isDark ? "text-[#888]" : "text-[#777]")}>
                                                                        {c.contact_person}
                                                                    </div>
                                                                )}
                                                            </button>
                                                        ))
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    </MetaField>

                                    <MetaField
                                        label="Project"
                                        isDark={isDark}
                                        icon={<FileText size={11} className="opacity-50" />}
                                        hasInfo
                                        onReset={() => updateMeta({ projectName: '' })}
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
                                        label="Expiration date"
                                        isDark={isDark}
                                        icon={<Calendar size={11} className="opacity-50" />}
                                        hasInfo
                                        onReset={() => updateMeta({ expirationDate: '' })}
                                    >
                                        <DatePicker
                                            value={meta.expirationDate}
                                            onChange={v => updateMeta({ expirationDate: v })}
                                            isDark={isDark}
                                            placeholder="Add expiration"
                                            align="right"
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
                                        label="Discount calc."
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
                                            {Object.keys(STATUS_COLORS).filter(k => k !== 'All').map(s => (
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

                {/* ── MOBILE BOTTOM PANEL (mobile only, hidden on md+) ── */}
                {!isPreview && (
                    <div className={cn(
                        "md:hidden absolute bottom-0 left-0 right-0 z-40 transition-all duration-300 ease-out",
                        isDark ? "" : ""
                    )}>
                        {/* Expanded content panel (slides up) */}
                        {mobileBottomPanelOpen && (
                            <>
                                {/* Tap outside to close */}
                                <div
                                    className="fixed inset-0 z-[-1]"
                                    onClick={() => setMobileBottomPanelOpen(false)}
                                />
                                <div className={cn(
                                    "max-h-[55vh] overflow-y-auto py-3 px-4 space-y-1.5",
                                    "border-t border-l border-r rounded-t-2xl shadow-2xl",
                                    isDark
                                        ? "bg-[#1a1a1a] border-[#303030]"
                                        : "bg-white border-[#e4e4e4]"
                                )}>
                                    {rightTab === 'details' && (
                                        <>
                                            <MetaField label="Client" isDark={isDark} icon={<User size={11} className="opacity-50" />} onReset={() => updateMeta({ clientName: '', clientEmail: '', clientPhone: '', clientAddress: '' })}>
                                                <input value={meta.clientName} onChange={e => updateMeta({ clientName: e.target.value })} placeholder="Select client..." className={cn("w-full text-[12px] bg-transparent outline-none font-medium", isDark ? "text-[#ccc] placeholder:text-[#444]" : "text-[#333] placeholder:text-[#ccc]")} />
                                            </MetaField>
                                            <MetaField label="Project" isDark={isDark} icon={<FileText size={11} className="opacity-50" />} onReset={() => updateMeta({ projectName: '' })}>
                                                <input value={meta.projectName} onChange={e => updateMeta({ projectName: e.target.value })} placeholder="Set project..." className={cn("w-full text-[12px] bg-transparent outline-none font-medium", isDark ? "text-[#ccc] placeholder:text-[#444]" : "text-[#333] placeholder:text-[#ccc]")} />
                                            </MetaField>
                                            <MetaField label="Issue date" isDark={isDark} icon={<Calendar size={11} className="opacity-50" />} onReset={() => updateMeta({ issueDate: new Date().toISOString().split('T')[0] })}>
                                                <DatePicker value={meta.issueDate} onChange={v => updateMeta({ issueDate: v })} isDark={isDark} align="right" />
                                            </MetaField>
                                            <MetaField label="Expiration" isDark={isDark} icon={<Calendar size={11} className="opacity-50" />} onReset={() => updateMeta({ expirationDate: '' })}>
                                                <DatePicker value={meta.expirationDate} onChange={v => updateMeta({ expirationDate: v })} isDark={isDark} placeholder="Add expiration" align="right" />
                                            </MetaField>
                                            <MetaField label="Currency" isDark={isDark} icon={<DollarSign size={11} className="opacity-50" />} onReset={() => updateMeta({ currency: 'USD' })}>
                                                <select value={meta.currency} onChange={e => updateMeta({ currency: e.target.value })} className={cn("w-full text-[12px] bg-transparent outline-none font-medium appearance-none", isDark ? "text-[#ccc]" : "text-[#333]")}>
                                                    <option value="USD">USD ($)</option>
                                                    <option value="EUR">EUR (€)</option>
                                                    <option value="GBP">GBP (£)</option>
                                                    <option value="SAR">SAR (﷼)</option>
                                                    <option value="AED">AED (د.إ)</option>
                                                </select>
                                            </MetaField>
                                            <MetaField label="Status" isDark={isDark} icon={<Zap size={11} className="opacity-50" />} onReset={() => handleStatusChange('Draft')}>
                                                <select value={meta.status} onChange={e => handleStatusChange(e.target.value as any)} className={cn("w-full text-[12px] bg-transparent outline-none font-medium appearance-none", isDark ? "text-[#ccc]" : "text-[#333]")}>
                                                    {Object.keys(STATUS_COLORS).filter(k => k !== 'All').map(s => (<option key={s} value={s}>{s}</option>))}
                                                </select>
                                            </MetaField>
                                        </>
                                    )}
                                    {rightTab === 'appearance' && (
                                        <DesignSettingsPanel isDark={isDark} meta={meta} updateMeta={updateMeta}
                                            onUploadLogo={() => { setUploadTarget({ type: 'logo' }); setImageUploadOpen(true); }}
                                            onUploadBackground={() => { setUploadTarget({ type: 'background' }); setImageUploadOpen(true); }}
                                        />
                                    )}
                                </div>
                            </>
                        )}

                        {/* Always-visible tab strip handle */}
                        <div className={cn(
                            "flex items-center border-t",
                            isDark ? "bg-[#1a1a1a] border-[#303030]" : "bg-white border-[#e4e4e4]"
                        )}>
                            {/* Drag handle / collapse indicator */}
                            <button
                                onClick={() => setMobileBottomPanelOpen(o => !o)}
                                className={cn(
                                    "flex items-center justify-center w-10 h-10 shrink-0",
                                    isDark ? "text-[#444]" : "text-[#ccc]"
                                )}
                            >
                                <ChevronDown
                                    size={16}
                                    strokeWidth={2}
                                    className={cn(
                                        "transition-transform duration-200",
                                        mobileBottomPanelOpen ? "rotate-0" : "rotate-180"
                                    )}
                                />
                            </button>

                            {/* Tab buttons */}
                            <div className="flex flex-1 overflow-x-auto no-scrollbar">
                                {([ ['details', Settings, 'Details'], ['appearance', Palette, 'Design'] ] as const).map(([tab, Icon, label]) => (
                                    <button
                                        key={tab}
                                        onClick={() => {
                                            if (rightTab === tab && mobileBottomPanelOpen) {
                                                setMobileBottomPanelOpen(false);
                                            } else {
                                                setRightTab(tab);
                                                setMobileBottomPanelOpen(true);
                                            }
                                        }}
                                        className={cn(
                                            "flex items-center gap-1.5 px-4 h-11 text-[12px] font-semibold transition-all shrink-0 border-b-2",
                                            rightTab === tab && mobileBottomPanelOpen
                                                ? "border-[#4dbf39] text-[#4dbf39]"
                                                : isDark
                                                    ? "border-transparent text-[#555] hover:text-[#aaa]"
                                                    : "border-transparent text-[#bbb] hover:text-[#666]"
                                        )}
                                    >
                                        <Icon size={13} strokeWidth={2} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <AcceptSignModal
                isOpen={isSignModalOpen}
                onClose={() => setIsSignModalOpen(false)}
                onAccept={(signature: any) => {
                    console.log('Document signed:', signature);
                    updateMeta({ status: 'Accepted' as any });
                    
                    // Update signature blocks if any
                    blocks.forEach((b: any) => {
                        if (b.type === 'signature') {
                            updateBlock(b.id, { 
                                signerName: signature.name, 
                                signatureImage: signature.image,
                                signed: true 
                            });
                        }
                    });
                }}
                documentType="proposal"
            />
            <ImageUploadModal 
                isOpen={imageUploadOpen}
                onClose={() => setImageUploadOpen(false)}
                onUpload={(url: string) => {
                    if (uploadTarget?.type === 'logo') {
                        updateMeta({ logoUrl: url });
                    } else if (uploadTarget?.type === 'background') {
                        updateMeta({ design: { ...(meta.design || DEFAULT_DOCUMENT_DESIGN), backgroundImage: url } });
                    } else if (uploadTarget?.type === 'block' && uploadTarget.blockId) {
                        updateBlock(uploadTarget.blockId, { url });
                    }
                }}
                title={uploadTarget?.type === 'logo' ? "Upload Logo" : "Upload Image"}
            />

            <SaveTemplateModal 
                open={isSaveTemplateModalOpen} 
                onClose={() => setIsSaveTemplateModalOpen(false)} 
                defaultName={meta.projectName || 'My Proposal Template'}
                entityType="proposal"
                onSave={async (name, description, isDefault) => {
                    await addTemplate({
                        name,
                        description,
                        is_default: isDefault,
                        entity_type: 'proposal',
                        blocks,
                        design: meta.design || DEFAULT_DOCUMENT_DESIGN
                    });
                }}
            />

            <DeleteConfirmModal 
                open={!!pendingStatusChange}
                onClose={() => setPendingStatusChange(null)}
                onConfirm={confirmStatusChange}
                title="Invalidate Signature?"
                description={`Changing the status to "${pendingStatusChange}" will invalidate and remove the client's existing signature. Are you sure you want to proceed?`}
                isDark={isDark}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   PROPOSAL DOCUMENT — The Paper / Content Area
═══════════════════════════════════════════════════════ */
export function ProposalDocument({
    meta, blocks, totals, isDark, isPreview, isMobile,
    updateBlock, removeBlock, addBlock, openInsertMenu, setOpenInsertMenu,
    updateMeta, setBlocks, currency, setImageUploadOpen, setUploadTarget,
    isSaveTemplateModalOpen, setIsSaveTemplateModalOpen, addTemplate
}: any) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

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
        paddingTop: 'var(--block-margin-top)',
        paddingBottom: 'var(--block-margin-bottom)',
        '--document-bg': design.blockBackgroundColor || '#ffffff',
        '--block-margin-bottom': `${design.marginBottom ?? 24}px`,
        '--block-margin-top': `${design.marginTop ?? 24}px`,
        '--block-border-radius': `${design.borderRadius ?? 16}px`,
        '--block-button-radius': `${Math.max(0, (design.borderRadius ?? 16) - 4)}px`,
        '--sign-bar-color': design.signBarColor || '#000000',
        '--sign-bar-thick': `${design.signBarThickness ?? 1}px`,
        '--table-border-radius': `${design.tableBorderRadius ?? 8}px`,
        '--table-header-bg': design.tableHeaderBg || '#f9f9f9',
        '--table-border-color': design.tableBorderColor || '#ebebeb',
        '--table-stroke-width': `${design.tableStrokeWidth ?? 1}px`,
        '--table-font-size': `${design.tableFontSize ?? 12}px`,
        '--table-cell-padding': `${design.tableCellPadding ?? 12}px`,
        '--primary-color': design.primaryColor || '#4dbf39',
        '--primary': design.primaryColor || '#4dbf39',
    } as React.CSSProperties), [design]);

    return (
        <div 
            style={{ ...documentStyle, borderRadius: `${design.borderRadius ?? 16}px` }} 
            className={cn(
                "w-full transition-all duration-300 relative bg-[var(--document-bg)]",
                isMobile ? "max-w-full px-6 py-6" : "max-w-[850px]",
                !isMobile && "min-h-[1100px] px-12"
            )}
        >
            {/* Blocks */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map((b: any) => b.id)} strategy={verticalListSortingStrategy}>
                    {!isPreview && (
                        <InsertZone
                            idx={-1}
                            isDark={false}
                            isOpen={openInsertMenu === -1}
                            onOpen={() => setOpenInsertMenu(-1)}
                            onClose={() => setOpenInsertMenu(null)}
                            onAdd={(type) => addBlock(type)}
                            hasHeader={blocks.some((b: any) => b.type === 'header')}
                            isFirst={true}
                        />
                    )}

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
                                    currency={currency}
                                    meta={meta}
                                    updateMeta={updateMeta}
                                    setImageUploadOpen={setImageUploadOpen}
                                    setUploadTarget={setUploadTarget}
                                    isFirst={idx === 0}
                                    isLast={idx === blocks.length - 1}
                                    onDuplicate={() => {
                                        const nb = { ...block, id: uuidv4() };
                                        const nbx = [...blocks];
                                        nbx.splice(idx + 1, 0, nb);
                                        setBlocks(nbx);
                                    }}
                                    onMoveUp={() => {
                                        if (idx === 0) return;
                                        setBlocks(arrayMove(blocks, idx, idx - 1));
                                    }}
                                    onMoveDown={() => {
                                        if (idx === blocks.length - 1) return;
                                        setBlocks(arrayMove(blocks, idx, idx + 1));
                                    }}
                                />
                                {!isPreview && (
                                    <InsertZone
                                        idx={idx}
                                        isDark={false}
                                        isOpen={openInsertMenu === idx}
                                        onOpen={() => setOpenInsertMenu(idx)}
                                        onClose={() => setOpenInsertMenu(null)}
                                        onAdd={(type) => addBlock(type, block.id)}
                                        hasHeader={blocks.some((b: any) => b.type === 'header')}
                                        isLast={idx === blocks.length - 1}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SORTABLE BLOCK WRAPPER
═══════════════════════════════════════════════════════ */
function SortableBlock({
    block, isDark, isPreview, updateBlock, removeBlock, addBlock, currency, onMoveUp, onMoveDown, onDuplicate, meta, updateMeta,
    setImageUploadOpen, setUploadTarget, isFirst, isLast
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
    meta?: any;
    updateMeta?: (patch: any) => void;
    setImageUploadOpen: (open: boolean) => void;
    setUploadTarget: (target: any) => void;
    isFirst?: boolean;
    isLast?: boolean;
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
            isFirst={isFirst}
            isLast={isLast}
            backgroundColor={block.backgroundColor}
            onBackgroundColorChange={(color) => updateBlock(block.id, { backgroundColor: color })}
        >
            <BlockRenderer
                block={block}
                isDark={isDark}
                isPreview={isPreview}
                updateBlock={updateBlock}
                currency={currency}
                meta={meta}
                updateMeta={updateMeta}
                setImageUploadOpen={setImageUploadOpen}
                setUploadTarget={setUploadTarget}
            />
        </SectionBlockWrapper>
    );
}

/* ═══════════════════════════════════════════════════════
   BLOCK RENDERER
═══════════════════════════════════════════════════════ */
function BlockRenderer({
    block, isDark, isPreview, updateBlock, currency, meta, updateMeta,
    setImageUploadOpen, setUploadTarget
}: {
    block: BlockData;
    isDark: boolean;
    isPreview: boolean;
    updateBlock: (id: string, patch: Partial<BlockData>) => void;
    currency: string;
    meta?: any;
    updateMeta?: (patch: any) => void;
    setImageUploadOpen: (open: boolean) => void;
    setUploadTarget: (target: any) => void;
}) {
    switch (block.type) {
        case 'header':
            return <HeaderBlock meta={meta} isDark={isDark} isPreview={isPreview} updateMeta={updateMeta} />;
        case 'heading':
            return <HeadingBlock block={block} isDark={isDark} isPreview={isPreview} updateBlock={updateBlock} />;
        case 'text':
            return <TextBlock block={block} isDark={isDark} isPreview={isPreview} updateBlock={updateBlock} meta={meta} />;
        case 'pricing':
            return <PricingBlock block={block} isDark={isDark} isPreview={isPreview} updateBlock={updateBlock} currency={currency} />;
        case 'signature':
            return <SignatureBlock block={block} isDark={isDark} isPreview={isPreview} updateBlock={updateBlock} />;
        case 'divider':
            return <div className={cn("my-4 border-t", isDark ? "border-[#2a2a2a]" : "border-[#f0f0f0]")} />;
        case 'image':
            return (
                <div className="my-2">
                    {block.url ? (
                        <div className="relative group/img-block overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1 w-fit mx-auto">
                            <img src={block.url} alt="Block" className="max-h-[400px] w-auto rounded-lg" />
                            {!isPreview && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img-block:opacity-100 transition-all flex items-center justify-center gap-2">
                                    <button 
                                        onClick={() => {
                                            setUploadTarget({ type: 'block', blockId: block.id });
                                            setImageUploadOpen(true);
                                        }}
                                        className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                                    >
                                        <Upload size={14} />
                                    </button>
                                    <button 
                                        onClick={() => updateBlock(block.id, { url: '' })}
                                        className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                setUploadTarget({ type: 'block', blockId: block.id });
                                setImageUploadOpen(true);
                            }}
                            className={cn(
                                "flex flex-col items-center justify-center w-full min-h-32 rounded-xl border-2 border-dashed transition-all p-8 gap-3",
                                isDark ? "border-white/5 hover:border-[#4dbf39]/30 hover:bg-white/5 text-white/30 hover:text-[#4dbf39]" : "border-gray-200 hover:border-[#4dbf39]/30 hover:bg-gray-50 text-[#999] hover:text-[#4dbf39]"
                            )}
                        >
                            <ImageIcon size={24} className="opacity-50" />
                            <div className="text-center">
                                <span className="text-[13px] font-bold block mb-1">Click to upload image</span>
                                <span className="text-[11px] opacity-60">Supports Drag & Drop and Paste</span>
                            </div>
                        </button>
                    )}
                </div>
            );
        default:
            return null;
    }
}

/* ─── Header Block ─── */
function HeaderBlock({ meta = {}, isDark, isPreview, updateMeta }: any) {
    return (
        <div className="mb-4">
            <div className="flex justify-between items-start mb-10">
                <div className="space-y-4">
                    {/* Branding Logo */}
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
                </div>
                <div className="text-right">
                    <div 
                        contentEditable={!isPreview}
                        suppressContentEditableWarning
                        onBlur={e => updateMeta({ documentTitle: e.currentTarget.textContent || '' })}
                        className={cn(
                            "text-3xl font-black tracking-tighter leading-[0.9] whitespace-pre-line outline-none",
                            isDark ? "text-[#ccc]" : "text-[#2a2a2a]",
                            !isPreview && "hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 -mx-1"
                        )}
                    >
                        {meta.documentTitle || 'PROPOSAL &\nAGREEMENT'}
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
                        To {meta.clientName}
                    </div>
                    <div className={cn("text-[11px] space-y-1", isDark ? "text-[#aaa]" : "text-[#555]")}>
                        <div className="flex items-center gap-1">
                            <span className="font-bold">Email:</span> 
                            <span
                                contentEditable={!isPreview}
                                suppressContentEditableWarning
                                onBlur={e => updateMeta({ clientEmail: e.currentTarget.textContent || '' })}
                                className="outline-none min-w-[50px]"
                            >
                                {meta.clientEmail}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="font-bold">Phone:</span> 
                            <span
                                contentEditable={!isPreview}
                                suppressContentEditableWarning
                                onBlur={e => updateMeta({ clientPhone: e.currentTarget.textContent || '' })}
                                className="outline-none min-w-[50px]"
                            >
                                {meta.clientPhone}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="font-bold">Address:</span> 
                            <span
                                contentEditable={!isPreview}
                                suppressContentEditableWarning
                                onBlur={e => updateMeta({ clientAddress: e.currentTarget.textContent || '' })}
                                className="outline-none min-w-[50px]"
                            >
                                {meta.clientAddress}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="text-right text-[11px] space-y-1">
                    <div className="flex items-center justify-end gap-1">
                        <span className={cn("font-bold", isDark ? "text-white" : "text-[#111]")}>Proposal Number:</span> 
                        <span className={cn(isDark ? "text-[#aaa]" : "text-[#666]")}>{meta.proposalNumber || '---'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                        <span className={cn("font-bold", isDark ? "text-white" : "text-[#111]")}>Issue Date:</span> 
                        <span className={cn(isDark ? "text-[#aaa]" : "text-[#666]")}>{meta.issueDate || '---'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                        <span className={cn("font-bold", isDark ? "text-white" : "text-[#111]")}>Due Date:</span> 
                        <span className={cn(isDark ? "text-[#aaa]" : "text-[#666]")}>{meta.expirationDate || '---'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Heading Block ─── */
function HeadingBlock({ block, isDark, isPreview, updateBlock }: any) {
    const sizes: Record<number, string> = { 1: 'text-[22px] font-black', 2: 'text-[17px] font-bold', 3: 'text-[14px] font-semibold' };
    const cls = sizes[block.level || 1] || sizes[1];
    return (
        <div className="group/hb flex items-start gap-2">
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
function TextBlock({ block, isDark, isPreview, updateBlock, meta }: any) {
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => { setMounted(true); }, []);

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
    
    if (!mounted) return <div className="py-2 min-h-[50px]" />;

    return (
        <div>
            <ContentBlock
                id={block.id}
                data={block}
                updateData={updateBlock}
                backgroundColor={block.backgroundColor || meta.design?.blockBackgroundColor}
            />
        </div>
    );
}

/* ─── Pricing Block ─── */
function PricingBlock({ block, isDark, isPreview, updateBlock, currency, meta }: any) {
    const rows: PricingRow[] = block.rows || [];
    const hideQty = block.hideQty || false;
    const subtotal = rows.reduce((s: number, r: PricingRow) => s + (hideQty ? 1 : r.qty) * r.rate, 0);
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
            rows: [...rows, { id: uuidv4(), title: '', description: '', qty: 1, rate: 0 }]
        });
    };
    const removeRow = (rowId: string) => {
        updateBlock(block.id, { rows: rows.filter((r: PricingRow) => r.id !== rowId) });
    };

    const th = cn("text-[10px] font-bold uppercase tracking-wider pb-2 text-left", isDark ? "text-white/40" : "text-black/40");
    const td = cn("py-2", isDark ? "text-white/80" : "text-black/80");

    return (
        <div 
            className={cn("overflow-hidden transition-all duration-300", isDark ? "bg-transparent text-white/90" : "bg-white text-black")} 
            style={{ 
                borderRadius: 'var(--table-border-radius)', 
                borderColor: 'var(--table-border-color)',
                borderWidth: 'var(--table-stroke-width)',
                borderStyle: 'solid',
                fontSize: 'var(--table-font-size)'
            }}
        >
            <table className="w-full">
                <thead style={{ backgroundColor: 'var(--table-header-bg)', borderColor: 'var(--table-border-color)', borderBottomWidth: 'var(--table-stroke-width)', borderBottomStyle: 'solid' }}>
                    <tr style={{ fontSize: 'calc(var(--table-font-size) - 2px)' }}>
                        <th className={cn(th, "px-4 py-2 w-full")}>Item</th>
                        {!hideQty && <th className={cn(th, "px-3 py-2 text-right w-16")}>Qty</th>}
                        <th className={cn(th, "px-3 py-2 text-right w-24")}>Amount</th>
                        {!hideQty && <th className={cn(th, "px-4 py-2 text-right w-24")}>Total</th>}
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
                                            <div className="font-bold" style={{ fontSize: 'calc(var(--table-font-size) + 2px)' }}>{row.title || row.description || 'Item'}</div>
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

            {/* Totals Section */}
            <div className="px-4 py-3 space-y-1 border-t" style={{ backgroundColor: 'var(--table-header-bg)', borderColor: 'var(--table-border-color)', borderTopWidth: 'var(--table-stroke-width)' }}>
                {!isPreview && (
                    <div className="flex justify-between items-center mb-2">
                        <button
                            onClick={addRow}
                            className={cn("flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 border border-dashed transition-all", isDark ? "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60" : "border-black/10 text-black/40 hover:border-black/20 hover:text-black/60")}
                            style={{ borderRadius: 'var(--block-button-radius)' }}
                        >
                            <Plus size={11} /> ADD ITEM
                        </button>
                        <label className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer opacity-40 hover:opacity-100 transition-opacity")}>
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
                {(!isPreview || (block.discountRate || 0) > 0 || (block.taxRate || 0) > 0) && (
                    <div className={cn("flex justify-between font-medium opacity-50")} style={{ fontSize: 'calc(var(--table-font-size) - 1px)' }}>
                        <span>Subtotal</span>
                        <span>{fmt(subtotal, currency)}</span>
                    </div>
                )}
                {/* Discount row */}
                {(!isPreview || (block.discountRate || 0) > 0) && (
                    <div className={cn("flex justify-between items-center font-medium opacity-50")} style={{ fontSize: 'calc(var(--table-font-size) - 1px)' }}>
                        <div className="flex items-center gap-2">
                            <span>Discount</span>
                            {!isPreview && (
                                <input
                                    type="number"
                                    value={block.discountRate || 0}
                                    onChange={e => updateBlock(block.id, { discountRate: Number(e.target.value) })}
                                    className={cn("w-10 bg-transparent outline-none border-b text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", isDark ? "border-white/10" : "border-black/10")}
                                />
                            )}
                            {(!isPreview || (block.discountRate || 0) > 0) && <span>%</span>}
                        </div>
                        <span>−{fmt(discAmt, currency)}</span>
                    </div>
                )}

                {/* Tax row */}
                {(!isPreview || (block.taxRate || 0) > 0) && (
                    <div className={cn("flex justify-between items-center font-medium opacity-50")} style={{ fontSize: 'calc(var(--table-font-size) - 1px)' }}>
                        <div className="flex items-center gap-2">
                            <span>Tax</span>
                            {!isPreview && (
                                <input
                                    type="number"
                                    value={block.taxRate || 0}
                                    onChange={e => updateBlock(block.id, { taxRate: Number(e.target.value) })}
                                    className={cn("w-10 bg-transparent outline-none border-b text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", isDark ? "border-white/10" : "border-black/10")}
                                />
                            )}
                            {(!isPreview || (block.taxRate || 0) > 0) && <span>%</span>}
                        </div>
                        <span>{fmt(taxAmt, currency)}</span>
                    </div>
                )}
                <div className={cn("flex justify-between font-black pt-2 border-t mt-1")} style={{ borderColor: 'var(--table-border-color)', borderTopWidth: 'var(--table-stroke-width)', fontSize: 'calc(var(--table-font-size) + 2px)' }}>
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
            "my-4 border p-5 transition-all w-full max-w-[320px]",
            isDark ? "border-white/5 bg-white/[0.02]" : "border-black/5 bg-black/[0.01]"
        )}
        style={{ borderRadius: 'var(--block-border-radius)' }}
        >
            <div className={cn("text-[9px] font-bold uppercase tracking-[0.2em] mb-4 opacity-40", isDark ? "text-white" : "text-black")}>
                Authorized Signature
            </div>
            <div className="flex flex-col gap-4">
                <div className="flex-1">
                    <div 
                        className="h-14 flex items-end justify-start relative mb-2 pb-1"
                        style={{ borderBottom: `var(--sign-bar-thick) solid var(--sign-bar-color)` }}
                    >
                        {block.signed ? (
                            <div className="flex flex-col items-start animate-in zoom-in duration-300 w-full justify-end relative">
                                {block.signatureImage ? (
                                    <img 
                                        src={block.signatureImage} 
                                        className={cn("max-h-12 w-auto object-contain", isDark ? "invert brightness-200" : "")} 
                                        alt="Signature" 
                                    />
                                ) : (
                                    <span 
                                        className={cn("text-3xl w-full truncate leading-none pb-1", isDark ? "text-white" : "text-black")}
                                        style={{ fontFamily: '"Brush Script MT", cursive, serif' }}
                                    >
                                        {block.signerName || 'Signature'}
                                    </span>
                                )}
                                <span className={cn("absolute -bottom-[22px] right-0 text-[8px] opacity-30 uppercase tracking-tighter italic shrink-0", isDark ? "text-white" : "text-black")}>
                                    Electronically Signed
                                </span>
                            </div>
                        ) : (
                            <span className="text-[11px] opacity-20 italic pb-1">Awaiting signature...</span>
                        )}
                    </div>
                    
                    {!isPreview && (
                        <div className="space-y-3 mt-4">
                            <input
                                value={block.signerName || ''}
                                onChange={e => updateBlock(block.id, { signerName: e.target.value })}
                                placeholder="Full Name"
                                className={cn("w-full bg-transparent outline-none text-[13px] font-semibold border-b pb-1 transition-colors", 
                                    isDark ? "border-white/10 text-white placeholder:text-white/20 focus:border-[#4dbf39]" : "border-black/10 text-black placeholder:text-black/20 focus:border-[#4dbf39]")}
                            />
                            <input
                                value={block.signerRole || ''}
                                onChange={e => updateBlock(block.id, { signerRole: e.target.value })}
                                placeholder="Role / Title"
                                className={cn("w-full bg-transparent outline-none text-[11px] opacity-40 border-b pb-1 transition-colors", 
                                    isDark ? "border-white/10 text-white focus:border-[#4dbf39]" : "border-black/10 text-black focus:border-[#4dbf39]")}
                            />
                        </div>
                    )}
                    
                    {isPreview && (
                        <div className="flex flex-col mt-3">
                            <span className={cn("text-[13px] font-bold", isDark ? "text-white" : "text-black")}>
                                {block.signerName || 'Pending'}
                            </span>
                            <span className={cn("text-[11px] opacity-40 mt-0.5", isDark ? "text-white" : "text-black")}>
                                {block.signerRole || 'Client'}
                            </span>
                        </div>
                    )}
                </div>
                
                {!isPreview && (
                    <button
                        onClick={() => updateBlock(block.id, { signed: !block.signed })}
                        className={cn(
                            "px-4 py-2 w-full text-[12px] font-bold transition-all active:scale-95 shadow-sm border",
                            block.signed
                                ? "bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-600"
                                : isDark ? "bg-white/5 text-white/60 border-white/5 hover:bg-white/10" : "bg-white text-black/60 border-black/5 hover:bg-black/5"
                        )}
                        style={{ borderRadius: 'var(--block-button-radius)' }}
                    >
                        {block.signed ? '✓ SIGNED' : 'MARK SIGNED'}
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
    label, children, isDark, icon, hasInfo, onReset
}: {
    label: string;
    children: React.ReactNode;
    isDark: boolean;
    icon?: React.ReactNode;
    hasInfo?: boolean;
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
                <div className="flex items-center gap-2">
                    {onReset && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onReset(); }}
                            className={cn("p-1 rounded-md transition-all", isDark ? "hover:bg-white/5 text-[#444] hover:text-[#888]" : "hover:bg-black/5 text-[#ddd] hover:text-[#aaa]")}
                            title="Reset to default"
                        >
                            <RotateCcw size={10} />
                        </button>
                    )}
                    {hasInfo && (
                        <button className={cn("transition-colors", isDark ? "text-[#444] hover:text-[#888]" : "text-[#ddd] hover:text-[#aaa]")}>
                            <ChevronRight size={11} />
                        </button>
                    )}
                </div>
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
            isDark ? "border-[#252525]" : "border-[#eeeeee]"
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
    idx, isDark, isOpen, onOpen, onClose, onAdd, hasHeader, isFirst, isLast
}: {
    idx: number;
    isDark: boolean;
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    onAdd: (type: BlockType) => void;
    hasHeader?: boolean;
    isFirst?: boolean;
    isLast?: boolean;
}) {
    const [hovered, setHovered] = useState(false);
    const visible = hovered || isOpen;

    return (
        <div
            className="relative flex items-center group/insert h-[24px]"
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
            {/* Dashed line */}
            <div className={cn(
                "absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center transition-all duration-150",
                visible ? "opacity-100 translate-y-[-50%]" : "opacity-0 translate-y-[20%] pointer-events-none"
            )}>
                <div className={cn(
                    "flex-1 border-t border-dashed",
                    isDark ? "border-[#363636]" : "border-[#d8d8d8]"
                )} />
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
                    {BLOCK_MENU.filter(b => !(b.type === 'header' && hasHeader)).map(({ type, label, icon: Icon, tag }) => (
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
