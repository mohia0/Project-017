"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
    Settings, ChevronRight, ChevronLeft, RotateCcw, Monitor, Smartphone, PanelTop,
    X, Upload, LayoutTemplate, ExternalLink, Printer, Hash
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { useRouter } from 'next/navigation';
import { cn, getBackgroundImageWithOpacity, isDarkColor, replaceVariables } from '@/lib/utils';
import { CURRENCIES, getCurrency } from '@/lib/currencies';
import { Dropdown, DItem } from '@/components/ui/Dropdown';
import { getStatusColors, STATUS_COLORS } from '@/lib/statusConfig';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useUIStore } from '@/store/useUIStore';
import { useProposalStore } from '@/store/useProposalStore';
import { useClientStore } from '@/store/useClientStore';
import DatePicker from '@/components/ui/DatePicker';
import { useTemplateStore } from '@/store/useTemplateStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useDebounce } from '@/hooks/useDebounce';
import { ContentBlock } from './blocks/ContentBlock';
import { SectionBlockWrapper } from './blocks/SectionBlockWrapper';
import { ClientActionBar } from '@/components/ui/ClientActionBar';
import { AcceptSignModal } from '@/components/modals/AcceptSignModal';
import ImageUploadModal from '../modals/ImageUploadModal';
import { DesignSettingsPanel } from '@/components/ui/DesignSettingsPanel';
import { DEFAULT_DOCUMENT_DESIGN, DocumentDesign } from '@/types/design';
import { TopBlurOverlay } from '@/components/ui/TopBlurOverlay';
import { SaveTemplateModal } from '@/components/modals/SaveTemplateModal';
import { SaveSectionTemplateModal } from '@/components/modals/SaveSectionTemplateModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { SendEmailModal } from '@/components/modals/SendEmailModal';
import ClientEditor from '@/components/clients/ClientEditor';
import { useSectionTemplateStore } from '@/store/useSectionTemplateStore';
import { appToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { MoneyAmount, convertAmount, formatAmountOnly, getCurrencySymbol } from '@/components/ui/MoneyAmount';
import { AppLoader } from '@/components/ui/AppLoader';
import { RichTextDescription } from '@/components/ui/RichTextDescription';
import { motion, AnimatePresence } from 'framer-motion';

/* ═══════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════ */
type BlockType = 'heading' | 'text' | 'pricing' | 'breakdown' | 'signature' | 'divider' | 'image' | 'header' | 'page_break';

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
    // pricing / breakdown
    rows?: any[];
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
    // section spacing
    paddingTop?: number;
    paddingBottom?: number;
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
    status: 'Draft' | 'Pending' | 'Accepted' | 'Declined' | 'Overdue' | 'Cancelled';
    logoUrl?: string;
    documentTitle?: string;
    design?: DocumentDesign;
    assignedClients?: { id: string; name: string; avatar_url?: string | null }[];
}

type LeftPanelTab = 'details' | 'appearance' | 'automation';



// Removed local fmt to use global MoneyAmount component

const BLOCK_MENU = [
    { type: 'header'    as BlockType, label: 'Header & Meta', icon: PanelTop,            tag: 'Layout' },
    { type: 'text'      as BlockType, label: 'Content',       icon: FileText,            tag: 'Text' },
    { type: 'pricing'   as BlockType, label: 'Pricing Table', icon: Table,               tag: 'Finance' },
    { type: 'breakdown' as BlockType, label: 'Breakdown',     icon: Table,               tag: 'Finance' },
    { type: 'signature' as BlockType, label: 'Signature',     icon: PenLine,             tag: 'Legal' },
    { type: 'divider'   as BlockType, label: 'Divider',       icon: SeparatorHorizontal, tag: 'Layout' },
    { type: 'image'     as BlockType, label: 'Image',         icon: ImageIcon,               tag: 'Media' },
    { type: 'page_break' as BlockType, label: 'Page Break',   icon: SeparatorHorizontal, tag: 'Layout' },
];

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function ProposalEditor({ id }: { id?: string }) {
    const router = useRouter();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { clients, fetchClients } = useClientStore();
    const { updateProposal, deleteProposal, fetchProposals, proposals } = useProposalStore();
    const { addTemplate } = useTemplateStore();
    const { projects, fetchProjects, addProjectItem, itemsByProject, fetchProjectItems, removeProjectItem } = useProjectStore();
    const { emailConfigs, emailTemplates, fetchEmailConfigs, fetchEmailTemplates, statuses, fetchStatuses } = useSettingsStore();

    const activeWorkspaceId = useUIStore(s => s.activeWorkspaceId);

    React.useEffect(() => {
        if (activeWorkspaceId) {
            fetchEmailConfigs(activeWorkspaceId);
            fetchEmailTemplates(activeWorkspaceId);
        }
    }, [activeWorkspaceId, fetchEmailConfigs, fetchEmailTemplates]);


    React.useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
    const [clientSearchQuery, setClientSearchQuery] = useState('');

    const [isPreview, setIsPreview] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

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
        design: DEFAULT_DOCUMENT_DESIGN,
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

    // Broadcast state for instant preview sync
    const broadcastMeta = useDebounce(meta, 50);
    const broadcastBlocks = useDebounce(blocks, 50);
    const [leftTab, setLeftTab] = useState<LeftPanelTab>('details');
    const [mobileBottomPanelOpen, setMobileBottomPanelOpen] = useState(false);
    const [isClientEditorOpen, setIsClientEditorOpen] = useState(false);
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
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
    const [discountDropdownOpen, setDiscountDropdownOpen] = useState(false);

    // Project selection state
    const [projectQuery, setProjectQuery] = useState('');
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [showProjectDrop, setShowProjectDrop] = useState(false);
    const projectRef = useRef<HTMLDivElement>(null);

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
            if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
                setShowProjectDrop(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isMobilePreview = isPreview && previewMode === 'mobile';

    const handlePrint = () => {
        setIsPreview(true);
        setTimeout(() => window.print(), 500);
    };

    const handleDownloadPDF = async () => {
        if (!id) {
            appToast.error('Download Failed', 'Proposal ID is missing.');
            return;
        }

        const fileName = `${meta.projectName || 'Proposal'}-${id.substring(0, 8)}.pdf`;
        
        appToast.promise(
            (async () => {
                const response = await fetch(`/api/download-pdf?type=proposal&id=${id}`);
                if (!response.ok) throw new Error('Failed to generate PDF');
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })(),
            {
                loading: 'Generating your PDF...',
                success: 'PDF downloaded successfully!',
                error: 'Could not generate PDF. Please try again.'
            }
        );
    };




    // Fetch projects and current link
    React.useEffect(() => {
        if (activeWorkspaceId && id) {
            fetchProjects();
            // Find which project this proposal belongs to
            // This is a bit inefficient if we have many projects, but let's see
            const findProject = async () => {
                const { data } = await supabase
                    .from('project_items')
                    .select('project_id, projects(name)')
                    .eq('item_id', id)
                    .eq('item_type', 'proposal')
                    .maybeSingle();
                
                if (data) {
                    setSelectedProjectId(data.project_id);
                    setSelectedProject((data.projects as any)?.name || '');
                }
            };
            findProject();
        }
    }, [activeWorkspaceId, id, fetchProjects]);

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(projectQuery.toLowerCase())
    );

    const handleProjectSelect = async (project: any | null) => {
        if (!id) return;
        
        // Remove existing link if any
        const { data: existing } = await supabase
            .from('project_items')
            .select('id')
            .eq('item_id', id)
            .eq('item_type', 'proposal')
            .maybeSingle();
            
        if (existing) {
            await supabase.from('project_items').delete().eq('id', existing.id);
        }

        if (project) {
            await addProjectItem({
                project_id: project.id,
                item_type: 'proposal',
                item_id: id
            });
            setSelectedProject(project.name);
            setSelectedProjectId(project.id);
            appToast.success('Project Linked');
        } else {
            setSelectedProject('');
            setSelectedProjectId(null);
            appToast.success('Project Unlinked');
        }
        setShowProjectDrop(false);
    };

    const customStatuses = React.useMemo(() => statuses.filter(s => s.tool === 'proposals'), [statuses]);
    const activeStatuses = React.useMemo(() => customStatuses.filter(s => s.is_active || s.name === meta.status).sort((a,b) => a.position - b.position), [customStatuses, meta.status]);

    React.useEffect(() => {
        if (activeWorkspaceId) fetchStatuses(activeWorkspaceId);
    }, [activeWorkspaceId, fetchStatuses]);
    
    const [isLoaded, setIsLoaded] = useState(false);
    const debouncedMeta = useDebounce(meta, 300);
    const debouncedBlocks = useDebounce(blocks, 300);

    // Polling effect to keep editor in sync with backend (e.g. client signing)
    React.useEffect(() => {
        if (!id) return;
        const interval = setInterval(() => {
            fetchProposals();
        }, 10000); // Sync every 10s
        return () => clearInterval(interval);
    }, [id, fetchProposals]);

    const lastSyncedStatusRef = useRef<ProposalMeta['status'] | null>(null);

    // Enhanced sync effect: allows status and signatures to update even after load
    React.useEffect(() => {
        if (!id) return;
        const proposal = proposals.find(p => p.id === id);
        if (!proposal) return;

        if (!isLoaded) {
            // Initial Full Load
            setMeta(prev => {
                const parsedMeta = (proposal.meta as any) || {};
                let assignedClients = parsedMeta.assignedClients;
                if ((!assignedClients || assignedClients.length === 0) && proposal.client_name) {
                    assignedClients = [{ id: proposal.client_id || 'proposal_compat', name: proposal.client_name }];
                }
                return {
                    ...prev,
                    clientName: proposal.client_name || '',
                    projectName: proposal.title || '',
                    issueDate: proposal.issue_date ? proposal.issue_date.split('T')[0] : prev.issueDate,
                    expirationDate: proposal.due_date ? proposal.due_date.split('T')[0] : prev.expirationDate,
                    status: proposal.status as any,
                    proposalNumber: proposal.proposal_number || proposal.id.slice(0, 8).toUpperCase(),
                    ...parsedMeta,
                    assignedClients: assignedClients || []
                };
            });
            if (proposal.blocks && Array.isArray(proposal.blocks) && proposal.blocks.length > 0) {
                setBlocks(proposal.blocks);
            }
            lastSyncedStatusRef.current = proposal.status as any;
            setIsLoaded(true);
        } else {
            // Background Sync: Only update specific fields that the client might change (Status, Signatures)
            if (proposal.status !== lastSyncedStatusRef.current) {
                lastSyncedStatusRef.current = proposal.status as any;
                setMeta(prev => ({ ...prev, status: proposal.status as any }));
            }
            
            // Sync blocks (specifically signatures)
            if (proposal.blocks && Array.isArray(proposal.blocks)) {
                setBlocks(prev => {
                    let changed = false;
                    const next = prev.map(oldBlock => {
                        const newBlock = proposal.blocks.find((nb: any) => nb.id === oldBlock.id);
                        if (newBlock && newBlock.type === 'signature' && newBlock.signed !== oldBlock.signed) {
                            changed = true;
                            return { ...oldBlock, ...newBlock };
                        }
                        return oldBlock;
                    });
                    return changed ? next : prev;
                });
            }
        }
    }, [id, proposals, isLoaded]); // Removed meta.status from dependencies to prevent circular overwrite

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
        const primaryClient = debouncedMeta.assignedClients?.[0];
        updateProposal(id, {
            title: debouncedMeta.projectName || 'New Proposal',
            client_name: primaryClient?.name || debouncedMeta.clientName,
            client_id: primaryClient?.id || null,
            status: debouncedMeta.status,
            issue_date: debouncedMeta.issueDate,
            due_date: debouncedMeta.expirationDate,
            amount: totalAmount,
            blocks: debouncedBlocks,
            meta: debouncedMeta
        }).then(() => {
            appToast.success('Changes saved', undefined, { id: `save-${id}`, duration: 1500 });
        }).catch(() => {
            appToast.error('Save failed', undefined, { id: `save-${id}`, duration: 3000 });
        });
    }, [debouncedMeta, debouncedBlocks, id, isLoaded, updateProposal]);

    // Instant Broadcast Effect
    React.useEffect(() => {
        if (!id || !isLoaded) return;
        
        const channelName = `preview:proposals:${id}`;
        const channel = supabase.channel(channelName);
        
        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                channel.send({
                    type: 'broadcast',
                    event: 'preview_sync',
                    payload: {
                        ...meta,
                        meta: meta,
                        blocks: blocks,
                        title: meta.projectName || 'New Proposal',
                        client_name: meta.clientName,
                    }
                });
            }
        });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [broadcastMeta, broadcastBlocks, id, isLoaded]);

    /* ── Block mutations ── */
    const addBlock = (type: BlockType | 'template', afterId?: string) => {
        if (type === 'template') {
            const idx = afterId ? blocks.findIndex(b => b.id === afterId) : -1;
            useUIStore.getState().openRightPanel({
                type: 'template_browser',
                onInsert: (bd: any) => {
            setBlocks(prev => {
                const newBlocks = [...prev];
                if (afterId === 'top') {
                    newBlocks.unshift(bd);
                } else {
                    const insertIdx = afterId ? prev.findIndex(b => b.id === afterId) : prev.length - 1;
                    newBlocks.splice(insertIdx + 1, 0, bd);
                }
                return newBlocks;
            });
                }
            });
            setOpenInsertMenu(null);
            setShowAddMenu(false);
            return;
        }
        const nb: BlockData = {
            id: uuidv4(), type: type as BlockType,
            ...(type === 'heading'   ? { content: 'New Section',  level: 2 } : {}),
            ...(type === 'text'      ? { content: '' } : {}),
            ...(type === 'pricing'   ? { rows: [{ id: uuidv4(), description: '', qty: 1, rate: 0 }], taxRate: 0, discountRate: 0, showTax: false, showDiscount: false } : {}),
            ...(type === 'breakdown' ? { 
                title: 'PRELIMINARY BUDGET BREAKDOWN',
                rows: [
                    { id: uuidv4(), label: 'Deposit', description: 'A deposit is required to secure the project in my schedule.', percentage: 50 },
                    { id: uuidv4(), label: 'Full Balance Required', description: 'Full balance due before the digital deliverables files can be released.', percentage: 50 }
                ] 
            } : {}),
            ...(type === 'signature' ? { signerName: '', signerRole: 'Client', signed: false } : {}),
        };
        setBlocks(prev => {
            if (afterId === 'top') return [nb, ...prev];
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
            b.type === 'signature' ? { 
                ...b, 
                signed: false, 
                signatureImage: null, 
                signedAt: null,
                signerName: '' 
            } : b
        );
        setBlocks(nb);
        updateMeta({ status: pendingStatusChange as any });
        setPendingStatusChange(null);
    };

    const handleCreateClient = async (data: any) => {
        const client = await useClientStore.getState().addClient(data);
        if (client) {
            const nextClients = [...(meta.assignedClients || []), { id: client.id, name: client.contact_person || client.company_name, avatar_url: client.avatar_url }];
            updateMeta({
                assignedClients: nextClients,
                clientName: '',
                clientEmail: client.email || '',
                clientPhone: client.phone || '',
                clientAddress: client.address || ''
            });
            setIsClientEditorOpen(false);
            setClientDropdownOpen(false);
            appToast.success('Contact Created');
        }
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

        let discAmt = 0;
        let taxAmt = 0;

        if (meta.discountCalc === 'after_tax') {
            taxAmt = subtotal * (tax / 100);
            discAmt = (subtotal + taxAmt) * (discount / 100);
        } else {
            discAmt = subtotal * (discount / 100);
            taxAmt = (subtotal - discAmt) * (tax / 100);
        }

        return { subtotal, discAmt, taxAmt, total: subtotal - discAmt + taxAmt };
    }, [blocks, meta.discountCalc]);

    const sc = getStatusColors(meta.status, customStatuses);

    /* ═══ RENDER ═══ */
    return (
        <div className={cn(
            "flex flex-col h-full w-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-white text-[#111]"
        )}>

            {/* ── TOP BAR ── */}
            <div className={cn(
                "flex items-center justify-between px-3 md:px-6 py-2.5 md:py-4 border-b shrink-0 transition-colors sticky top-0 z-[9999]",
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
                            placeholder="Proposal Name"
                        />
                    </div>
                </div>



                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                    {/* Status badge — hidden on mobile (accessible via bottom panel) */}
                    <div className="relative hidden md:flex items-center" ref={statusRef}>
                        <button
                            onClick={() => setShowStatusMenu(s => !s)}
                            style={sc.dynamic ? { backgroundColor: sc.dynamic.bg, color: sc.dynamic.text, borderColor: sc.dynamic.border } : {}}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-bold transition-all border",
                                !sc.dynamic ? (isDark ? "bg-white/[0.05] border-white/10 text-white/40" : cn(sc.badge, sc.badgeText, sc.badgeBorder)) : "hover:brightness-110"
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
                                {activeStatuses.map(s => {
                                    const sSc = getStatusColors(s.name, customStatuses);
                                    const isActive = s.name === meta.status;
                                    const sDynamic = (sSc as any).dynamic;
                                    return (
                                        <button
                                            key={s.name}
                                            onClick={() => { handleStatusChange(s.name as any); setShowStatusMenu(false); }}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors",
                                                isDark ? "hover:bg-white/5 text-[#ccc]" : "hover:bg-[#f5f5f5] text-[#333]",
                                                isActive ? "font-semibold" : ""
                                            )}
                                        >
                                            <div className="flex items-center gap-2 flex-1">
                                                <div 
                                                    className="w-1.5 h-1.5 rounded-full shrink-0" 
                                                    style={{ backgroundColor: isDark ? sSc.bar : (sDynamic ? sDynamic.text : sSc.bar) }} 
                                                />
                                                <span>{s.name}</span>
                                            </div>
                                            {isActive && <Check size={12} className="text-primary" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className={cn("w-px h-5 mx-0.5 hidden md:block", isDark ? "bg-white/10" : "bg-black/10")} />

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
                                ? "bg-primary text-primary-foreground hover:bg-primary-hover"
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

                    {/* Open link */}
                    <button
                        onClick={() => window.open(window.location.origin + '/p/proposal/' + id, '_blank')}
                        className={cn(
                            "hidden md:flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                            isDark ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]"
                        )}
                    >
                        <ExternalLink size={14} />
                    </button>

                    {/* Copy link — hidden on mobile */}
                    <button
                        onClick={copyLink}
                        className={cn(
                            "hidden md:flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                            isDark ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]"
                        )}
                    >
                        {copied ? <Check size={14} className="text-primary" /> : <Link2 size={14} />}
                    </button>

                    {/* Send button */}
                    <Tooltip content="Send proposal">
                        <button
                            onClick={() => setIsSendModalOpen(true)}
                            className={cn(
                                "flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                                isDark ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]"
                            )}
                        >
                            <Send size={14} />
                        </button>
                    </Tooltip>



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
                                    { icon: ExternalLink,  label: 'Open Link',         action: () => window.open(window.location.origin + '/p/proposal/' + id, '_blank') },
                                    { icon: Link2,          label: 'Copy Link',         action: copyLink },
                                    { icon: Download,       label: 'Download PDF',      action: handleDownloadPDF },
                                    { icon: Copy,           label: 'Duplicate',         action: () => console.log('Duplicate') },
                                    { 
                                        icon: Trash2,         
                                        label: 'Delete',            
                                        action: () => setIsDeleteModalOpen(true) 
                                    },
                                ].filter(item => item.label !== 'Download PDF' || meta.status !== 'Draft').map(({ icon: Icon, label, action }) => (
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

            <div className="flex-1 flex flex-col overflow-hidden relative z-0 isolate">
                <div className="flex-1 flex flex-row-reverse overflow-hidden relative">
                    {/* ── RIGHT: CANVAS ── */}
                    {id && !isLoaded ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4">
                            <AppLoader size="sm" />
                            <span className="text-[13px] font-medium opacity-40">Loading document...</span>
                        </div>
                    ) : (
                    <div 
                        className="flex-1 overflow-auto relative w-full pb-11 md:pb-0"
                        style={{ 
                            backgroundColor: isMobilePreview 
                                ? '#f7f7f7' 
                                : (meta.design?.backgroundColor) || '#f7f7f7',
                            backgroundImage: getBackgroundImageWithOpacity(meta.design?.backgroundImage, (meta.design?.backgroundColor) || '#f7f7f7', meta.design?.backgroundImageOpacity),
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundAttachment: 'fixed',
                        }}
                    >
                        {!isMobilePreview && (
                            <div className="z-30 flex justify-center sticky top-0 transition-all w-full pt-3 pb-0 pointer-events-none">
                                <div 
                                    className="absolute inset-0 pointer-events-none"
                                    style={{
                                    }}
                                >
                                    <TopBlurOverlay design={meta.design} />
                                </div>
                                <div className="relative z-10 w-full pointer-events-auto px-6">
                                    <ClientActionBar
                                        type="proposal"
                                        status={meta.status as any}
                                        inline={true}
                                        design={meta.design}
                                        onAccept={() => setIsSignModalOpen(true)}
                                        onDownloadPDF={handleDownloadPDF}
                                    />
                                </div>
                            </div>
                        )}
                        <div className={cn(
                            "flex flex-col items-center min-h-full transition-colors duration-300",
                            isMobilePreview ? (isDark ? "bg-[#111] py-8 px-4" : "bg-[#f5f5f5] py-8 px-4") : "pt-4 pb-20 px-6"
                        )}>
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
                                             backgroundImage: getBackgroundImageWithOpacity(meta.design?.backgroundImage, (meta.design?.backgroundColor) || (isDark ? '#080808' : '#f7f7f7'), meta.design?.backgroundImageOpacity),
                                             backgroundSize: 'cover',
                                             backgroundPosition: 'center',
                                         }}
                                    >
                                        <div className="sticky top-0 z-30 transition-all w-full pt-1 pb-0 pointer-events-none">
                                            <div 
                                                className="absolute inset-0 pointer-events-none"
                                                style={{
                                                }}
                                            >
                                                <TopBlurOverlay design={meta.design} />
                                            </div>
                                            <div className="relative z-10 w-full pointer-events-auto">
                                                <ClientActionBar
                                                    type="proposal"
                                                    status={meta.status as any}
                                                    isMobile={true}
                                                    inline={true}
                                                    design={meta.design}
                                                    onAccept={() => setIsSignModalOpen(true)}
                                                    onDecline={() => updateMeta({ status: 'Declined' as any })}
                                                    onDownloadPDF={handleDownloadPDF}
                                                    className="!py-3"
                                                />
                                            </div>
                                        </div>
                                        <ProposalDocument
                                            meta={meta}
                                            blocks={blocks}
                                            totals={totals}
                                            isDark={isDark}
                                            isPreview={isPreview}
                                            isMobile={true}
                                            updateBlock={updateBlock}
                                            removeBlock={removeBlock}
                                            addBlock={addBlock}
                                            openInsertMenu={openInsertMenu}
                                            setOpenInsertMenu={setOpenInsertMenu}
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
                                className="w-full max-w-[850px] overflow-visible transition-all duration-300"
                                style={{ 
                                    borderRadius: `${meta.design?.borderRadius ?? DEFAULT_DOCUMENT_DESIGN.borderRadius}px`,
                                    backgroundColor: (meta.design?.blockBackgroundColor) || DEFAULT_DOCUMENT_DESIGN.blockBackgroundColor,
                                    boxShadow: meta.design?.blockShadow || DEFAULT_DOCUMENT_DESIGN.blockShadow,
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
                )}


                {/* ── LEFT: METADATA PANEL (desktop only) ── */}
                {!isPreview && (
                    <div className={cn(
                        "hidden md:flex flex-col overflow-hidden transition-all duration-300 relative w-[240px]",
                        isDark ? "bg-[#0d0d0d] border-[#252525]" : "bg-[#f5f5f5] border-[#e4e4e4]"
                    )}>

                        <div className={cn(
                            "flex mx-3 mt-3 p-1 rounded-xl shrink-0",
                            isDark ? "bg-white/5" : "bg-[#efeff2]"
                        )}>
                            {([ ['details', Settings, 'Details'], ['appearance', Palette, 'Design'] ] as const).map(([tab, Icon, label]) => (
                                <button
                                    key={tab}
                                    onClick={() => setLeftTab(tab)}
                                    className={cn(
                                        "flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg transition-all relative flex items-center justify-center gap-1.5 h-8",
                                        leftTab === tab 
                                            ? (isDark ? "text-white" : "text-black")
                                            : (isDark ? "text-[#555] hover:text-[#777]" : "text-[#aaa] hover:text-[#888]")
                                    )}
                                >
                                    <span className="relative z-10 flex items-center gap-1.5">
                                        <Icon size={12} strokeWidth={2.5} />
                                        {label}
                                    </span>
                                    {leftTab === tab && (
                                        <motion.div 
                                            layoutId="active-left-tab" 
                                            className={cn(
                                                "absolute inset-0 rounded-lg shadow-sm border",
                                                isDark ? "bg-white/10 border-white/10" : "bg-white border-black/5"
                                            )} 
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Panel content */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-1.5">

                            {leftTab === 'details' && (
                                <>
                                    <MetaField
                                        label="Proposal #"
                                        isDark={isDark}
                                        icon={<Hash size={11} className="opacity-50" />}
                                        onReset={() => updateMeta({ proposalNumber: id?.slice(0, 8).toUpperCase() || '017001' })}
                                    >
                                        <input
                                            value={meta.proposalNumber}
                                            onChange={e => updateMeta({ proposalNumber: e.target.value })}
                                            placeholder="Enter proposal number..."
                                            className={cn(
                                                "w-full text-[12px] bg-transparent outline-none font-medium",
                                                isDark ? "text-[#ccc] placeholder:text-[#444]" : "text-[#333] placeholder:text-[#ccc]"
                                            )}
                                        />
                                    </MetaField>

                                    <MetaField
                                        label="Client"
                                        isDark={isDark}
                                        icon={<User size={11} className="opacity-50" />}
                                        onReset={() => updateMeta({ clientName: '', clientEmail: '', clientPhone: '', clientAddress: '', assignedClients: [] })}
                                    >
                                        <div className="flex flex-col gap-1.5 w-full">
                                            {meta.assignedClients && meta.assignedClients.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {meta.assignedClients.map((ac, idx) => (
                                                        <div key={idx} className={cn("flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[11px] font-semibold border", isDark ? "bg-white/[0.05] border-white/10" : "bg-[#f5f5f5] border-[#e5e5e5]")}>
                                                            {ac.avatar_url ? (
                                                                <img src={ac.avatar_url} alt="av" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                                                            ) : (
                                                                <User size={10} className="opacity-50 shrink-0" />
                                                            )}
                                                            <span className={cn("truncate max-w-[120px]", isDark ? "text-white/80" : "text-[#333]")}>{ac.name}</span>
                                                            <button 
                                                                onClick={() => {
                                                                    const next = meta.assignedClients!.filter((_, i) => i !== idx);
                                                                    updateMeta({ assignedClients: next, clientName: next.map(a => a.name).join(', ') });
                                                                }}
                                                                className={cn("p-0.5 rounded-full hover:bg-black/10 shrink-0", isDark ? "hover:bg-white/10" : "")}
                                                            >
                                                                <X size={10} className="opacity-60" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="relative">
                                                <input
                                                    value={meta.assignedClients?.length ? clientSearchQuery : meta.clientName}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setClientSearchQuery(val);
                                                        if (!meta.assignedClients?.length) updateMeta({ clientName: val });
                                                    }}
                                                    onFocus={() => { setClientDropdownOpen(true); setClientSearchQuery(''); }}
                                                    onBlur={() => setTimeout(() => setClientDropdownOpen(false), 200)}
                                                    placeholder={meta.assignedClients?.length ? "Add another..." : "Search client..."}
                                                    className={cn(
                                                        "w-full text-[12px] bg-transparent outline-none font-medium",
                                                        isDark ? "text-[#ccc] placeholder:text-[#444]" : "text-[#333] placeholder:text-[#ccc]"
                                                    )}
                                                />
                                                {clientDropdownOpen && (
                                                    <div className={cn(
                                                        "absolute top-full left-0 w-[calc(100%+24px)] -ml-3 mt-[11px] rounded-b-lg border border-t-0 shadow-xl overflow-hidden z-[100] max-h-[220px] overflow-y-auto",
                                                        isDark ? "bg-[#1f1f1f] border-[#252525]" : "bg-white border-[#ebebeb]"
                                                    )}>
                                                        {clients.filter(c => {
                                                            const query = (meta.assignedClients?.length ? clientSearchQuery : meta.clientName).replace(/.*,\s*/, '').toLowerCase();
                                                            return c.company_name.toLowerCase().includes(query) || c.contact_person.toLowerCase().includes(query) || (c.email && c.email.toLowerCase().includes(query));
                                                        }).length === 0 && !(meta.assignedClients?.length ? clientSearchQuery : meta.clientName) ? (
                                                            <div className={cn("px-4 py-3 text-[11px] opacity-40 text-center", isDark ? "text-white" : "text-black")}>No clients found</div>
                                                        ) : (
                                                            <>
                                                                {clients
                                                                    .filter(c => {
                                                                        const query = (meta.assignedClients?.length ? clientSearchQuery : meta.clientName).replace(/.*,\s*/, '').toLowerCase();
                                                                        return c.company_name.toLowerCase().includes(query) || c.contact_person.toLowerCase().includes(query) || (c.email && c.email.toLowerCase().includes(query));
                                                                    })
                                                                    .map(c => (
                                                                        <button
                                                                            key={c.id}
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                const name = c.contact_person || c.company_name;
                                                                                const isDup = meta.assignedClients?.some(ac => ac.id === c.id);
                                                                                if (!isDup) {
                                                                                    const nextClients = [...(meta.assignedClients || []), { id: c.id, name, avatar_url: c.avatar_url }];
                                                                                    if (nextClients.length === 1) {
                                                                                        updateMeta({ 
                                                                                            assignedClients: nextClients,
                                                                                            clientName: name, 
                                                                                            clientEmail: c.email || '',
                                                                                            clientPhone: c.phone || '',
                                                                                            clientAddress: c.address || ''
                                                                                        });
                                                                                    } else {
                                                                                        updateMeta({ assignedClients: nextClients });
                                                                                    }
                                                                                }
                                                                                setClientSearchQuery('');
                                                                                setClientDropdownOpen(false);
                                                                            }}
                                                                            className={cn(
                                                                                "w-full flex items-center gap-2 text-left px-3 py-2 text-[12px] transition-colors border-b last:border-0",
                                                                                isDark ? "hover:bg-[#2a2a2a] border-[#252525]" : "hover:bg-[#f5f5f5] border-[#f0f0f0]"
                                                                            )}
                                                                        >
                                                                            {c.avatar_url ? (
                                                                                <img src={c.avatar_url} alt="av" className="w-5 h-5 rounded-full object-cover shrink-0" />
                                                                            ) : (
                                                                                <User size={14} className="opacity-40 shrink-0" />
                                                                            )}
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className={cn("font-bold truncate", isDark ? "text-[#ccc]" : "text-[#333]")}>
                                                                                    {c.contact_person || c.company_name}
                                                                                </div>
                                                                                {(c.contact_person && c.company_name) && (
                                                                                    <div className={cn("text-[9.5px] truncate mt-0.5", isDark ? "text-[#666]" : "text-[#aaa]")}>
                                                                                        {c.company_name}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                <div className={cn("border-t", isDark ? "border-white/5" : "border-black/5")} />
                                                                <button
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setIsClientEditorOpen(true);
                                                                    }}
                                                                    className={cn(
                                                                        "w-full text-left px-3 py-2.5 text-[11px] font-bold transition-colors flex items-center gap-2",
                                                                        isDark ? "text-[var(--brand-primary)] hover:bg-white/5" : "text-[var(--brand-primary-hover)] hover:bg-black/5"
                                                                    )}
                                                                >
                                                                    <Plus size={14} strokeWidth={3} />
                                                                    Create new contact
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </MetaField>

                                    <MetaField
                                        label="Project"
                                        isDark={isDark}
                                        icon={<FileText size={11} className="opacity-50" />}
                                        onReset={() => handleProjectSelect(null)}
                                    >
                                        <div className="relative" ref={projectRef}>
                                            <div 
                                                className={cn(
                                                    "w-full flex items-center justify-between text-[12px] cursor-pointer font-medium transition-opacity hover:opacity-80",
                                                    isDark ? "text-[#ccc]" : "text-[#333]",
                                                    !selectedProject && (isDark ? "text-[#444]" : "text-[#ccc]")
                                                )}
                                                onClick={() => setShowProjectDrop(v => !v)}
                                            >
                                                <span className="truncate">{selectedProject || "No project"}</span>
                                                <ChevronDown size={11} className={cn("transition-transform duration-200 opacity-40 shrink-0", showProjectDrop ? "rotate-180" : "")} />
                                            </div>
                                            {showProjectDrop && (
                                                <div className={cn(
                                                    "absolute top-full left-0 w-[calc(100%+24px)] -ml-3 mt-[11px] rounded-b-lg border border-t-0 shadow-xl overflow-hidden z-50 max-h-[220px] overflow-y-auto",
                                                    isDark ? "bg-[#1f1f1f] border-[#252525]" : "bg-white border-[#ebebeb]"
                                                )}>
                                                    <div className="p-2 border-b border-inherit">
                                                        <input
                                                            autoFocus
                                                            value={projectQuery}
                                                            onChange={e => setProjectQuery(e.target.value)}
                                                            placeholder="Search projects..."
                                                            className={cn(
                                                                "w-full text-[11px] px-2.5 py-1.5 rounded-md outline-none",
                                                                isDark ? "bg-white/5 text-white placeholder:text-[#555]" : "bg-[#f5f5f5] text-[#111] placeholder:text-[#aaa]"
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="py-1">
                                                        <button
                                                            onClick={() => handleProjectSelect(null)}
                                                            className={cn(
                                                                "w-full text-left px-3 py-2 text-[12px] transition-colors",
                                                                isDark ? "hover:bg-[#2a2a2a] text-[#888]" : "hover:bg-[#f5f5f5] text-[#777]"
                                                            )}
                                                        >
                                                            None
                                                        </button>
                                                        {filteredProjects.map(p => (
                                                            <button
                                                                key={p.id}
                                                                onClick={() => handleProjectSelect(p)}
                                                                className={cn(
                                                                    "w-full text-left px-3 py-2 text-[12px] transition-colors flex items-center gap-2",
                                                                    isDark ? "hover:bg-[#2a2a2a] text-[#ccc]" : "hover:bg-[#f5f5f5] text-[#333]"
                                                                )}
                                                            >
                                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                                                                <span className="truncate">{p.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </MetaField>

                                    <MetaField
                                        label="Issue date"
                                        isDark={isDark}
                                        icon={<Calendar size={11} className="opacity-50" />}
                                        onReset={() => updateMeta({ issueDate: new Date().toISOString().split('T')[0] })}
                                    >
                                        <div className="relative group/field">
                                            <DatePicker
                                                value={meta.issueDate}
                                                onChange={v => updateMeta({ issueDate: v })}
                                                isDark={isDark}
                                                align="right"
                                            />
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover/field:opacity-60 transition-opacity">
                                                <ChevronDown size={11} />
                                            </div>
                                        </div>
                                    </MetaField>

                                    <MetaField
                                        label="Expiration date"
                                        isDark={isDark}
                                        icon={<Calendar size={11} className="opacity-50" />}
                                        onReset={() => updateMeta({ expirationDate: '' })}
                                    >
                                        <div className="relative group/field">
                                            <DatePicker
                                                value={meta.expirationDate}
                                                onChange={v => updateMeta({ expirationDate: v })}
                                                isDark={isDark}
                                                placeholder="Add expiration"
                                                align="right"
                                            />
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover/field:opacity-60 transition-opacity">
                                                <ChevronDown size={11} />
                                            </div>
                                        </div>
                                    </MetaField>

                                    <MetaField
                                        label="Currency"
                                        isDark={isDark}
                                        icon={<DollarSign size={11} className="opacity-50" />}
                                        onReset={() => updateMeta({ currency: 'USD' })}
                                    >
                                        <div className="relative">
                                            <button
                                                onClick={() => setCurrencyDropdownOpen(prev => !prev)}
                                                className={cn(
                                                    "w-full flex items-center justify-between text-[12px] bg-transparent outline-none font-medium transition-opacity hover:opacity-80",
                                                    isDark ? "text-[#ccc]" : "text-[#333]"
                                                )}
                                            >
                                                <span className="truncate">
                                                    {getCurrency(meta.currency)?.label || meta.currency} ({getCurrency(meta.currency)?.symbol})
                                                </span>
                                                <ChevronDown size={11} className={cn("transition-transform duration-200 opacity-40 shrink-0", currencyDropdownOpen ? "rotate-180" : "")} />
                                            </button>
                                            <Dropdown 
                                                open={currencyDropdownOpen} 
                                                onClose={() => setCurrencyDropdownOpen(false)} 
                                                isDark={isDark}
                                                className="w-[calc(100%+24px)] -ml-3 mt-[11px] rounded-t-none max-h-[220px] overflow-y-auto custom-scrollbar"
                                                align="left"
                                            >
                                                {CURRENCIES.map(c => (
                                                    <DItem
                                                        key={c.code}
                                                        label={`${c.label} (${c.symbol})`}
                                                        active={meta.currency === c.code}
                                                        isDark={isDark}
                                                        onClick={() => {
                                                            updateMeta({ currency: c.code });
                                                            setCurrencyDropdownOpen(false);
                                                        }}
                                                    />
                                                ))}
                                            </Dropdown>
                                        </div>
                                    </MetaField>

                                    <MetaField
                                        label="Discount calc."
                                        isDark={isDark}
                                        icon={<Tag size={11} className="opacity-50" />}
                                        onReset={() => updateMeta({ discountCalc: 'before_tax' })}
                                    >
                                        <div className="relative">
                                            <button
                                                onClick={() => setDiscountDropdownOpen(prev => !prev)}
                                                className={cn(
                                                    "w-full flex items-center justify-between text-[12px] bg-transparent outline-none font-medium transition-opacity hover:opacity-80",
                                                    isDark ? "text-[#ccc]" : "text-[#333]"
                                                )}
                                            >
                                                <span className="truncate">
                                                    {meta.discountCalc === 'before_tax' ? 'Before tax' : 'After tax'}
                                                </span>
                                                <ChevronDown size={11} className={cn("transition-transform duration-200 opacity-40 shrink-0", discountDropdownOpen ? "rotate-180" : "")} />
                                            </button>
                                            <Dropdown 
                                                open={discountDropdownOpen} 
                                                onClose={() => setDiscountDropdownOpen(false)} 
                                                isDark={isDark}
                                                className="w-[calc(100%+24px)] -ml-3 mt-[11px] rounded-t-none"
                                                align="left"
                                            >
                                                <DItem
                                                    label="Before tax"
                                                    active={meta.discountCalc === 'before_tax'}
                                                    isDark={isDark}
                                                    onClick={() => {
                                                        updateMeta({ discountCalc: 'before_tax' });
                                                        setDiscountDropdownOpen(false);
                                                    }}
                                                />
                                                <DItem
                                                    label="After tax"
                                                    active={meta.discountCalc === 'after_tax'}
                                                    isDark={isDark}
                                                    onClick={() => {
                                                        updateMeta({ discountCalc: 'after_tax' });
                                                        setDiscountDropdownOpen(false);
                                                    }}
                                                />
                                            </Dropdown>
                                        </div>
                                    </MetaField>
                                    

                                </>
                            )}

                            {leftTab === 'appearance' && (
                                <DesignSettingsPanel 
                                    isDark={isDark} 
                                    meta={meta} 
                                    updateMeta={updateMeta}
                                    storageKey="proposal_design"
                                    onUploadLogo={() => {
                                        setUploadTarget({ type: 'logo' });
                                        setImageUploadOpen(true);
                                    }} 
                                    onUploadBackground={() => {
                                        setUploadTarget({ type: 'background' });
                                        setImageUploadOpen(true);
                                    }}
                                    hideAccentColor={true}
                                    hideSuccessIcon={true}
                                />
                            )}

                        </div>
                    </div>
                )}
            </div>

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
                                    {leftTab === 'details' && (
                                        <>
                                            <MetaField label="Client" isDark={isDark} icon={<User size={11} className="opacity-50" />} onReset={() => updateMeta({ clientName: '', clientEmail: '', clientPhone: '', clientAddress: '', assignedClients: [] })}>
                                                <div className="flex flex-col gap-1.5 w-full">
                                                    {meta.assignedClients && meta.assignedClients.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {meta.assignedClients.map((ac, idx) => (
                                                                <div key={idx} className={cn("flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[11px] font-semibold border", isDark ? "bg-white/[0.05] border-white/10" : "bg-[#f5f5f5] border-[#e5e5e5]")}>
                                                                    {ac.avatar_url ? (
                                                                        <img src={ac.avatar_url} alt="av" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                                                                    ) : (
                                                                        <User size={10} className="opacity-50 shrink-0" />
                                                                    )}
                                                                    <span className={cn("truncate max-w-[120px]", isDark ? "text-white/80" : "text-[#333]")}>{ac.name}</span>
                                                                    <button 
                                                                        onClick={() => {
                                                                            const next = meta.assignedClients!.filter((_, i) => i !== idx);
                                                                            if (next.length === 0) {
                                                                                updateMeta({ assignedClients: next, clientName: '', clientEmail: '', clientPhone: '', clientAddress: '' });
                                                                            } else if (idx === 0) {
                                                                                updateMeta({ assignedClients: next, clientName: next[0].name });
                                                                            } else {
                                                                                updateMeta({ assignedClients: next });
                                                                            }
                                                                        }}
                                                                        className={cn("p-0.5 rounded-full hover:bg-black/10 shrink-0", isDark ? "hover:bg-white/10" : "")}
                                                                    >
                                                                        <X size={10} className="opacity-60" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <input 
                                                        value={meta.assignedClients?.length ? clientSearchQuery : meta.clientName}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setClientSearchQuery(val);
                                                            if (!meta.assignedClients?.length) updateMeta({ clientName: val });
                                                        }}
                                                        placeholder={meta.assignedClients?.length ? "Add another..." : "Search client..."} 
                                                        className={cn("w-full text-[12px] bg-transparent outline-none font-medium", isDark ? "text-[#ccc] placeholder:text-[#444]" : "text-[#333] placeholder:text-[#ccc]")} 
                                                    />
                                                </div>
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

                                        </>
                                    )}
                                    {leftTab === 'appearance' && (
                                        <DesignSettingsPanel 
                                            isDark={isDark} 
                                            meta={meta} 
                                            updateMeta={updateMeta}
                                            storageKey="proposal_design"
                                            onUploadLogo={() => { setUploadTarget({ type: 'logo' }); setImageUploadOpen(true); }}
                                            onUploadBackground={() => { setUploadTarget({ type: 'background' }); setImageUploadOpen(true); }}
                                            hideAccentColor={true}
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
                                            if (leftTab === tab && mobileBottomPanelOpen) {
                                                setMobileBottomPanelOpen(false);
                                            } else {
                                                setLeftTab(tab);
                                                setMobileBottomPanelOpen(true);
                                            }
                                        }}
                                        className={cn(
                                            "flex items-center gap-1.5 px-4 h-11 text-[12px] font-semibold transition-all shrink-0 border-b-2",
                                            leftTab === tab && mobileBottomPanelOpen
                                                ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
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

                    // Trigger notification
                    useNotificationStore.getState().addNotification({
                        title: 'Proposal Signed 🎉',
                        message: `${signature.name || meta.clientName || 'A client'} just signed the proposal "${meta.projectName || 'Untitled'}"`,
                        link: `/proposals/${id}`,
                        type: 'success'
                    });
                }}
                documentType="proposal"
            />

            <DeleteConfirmModal 
                open={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={async () => {
                    if (id) {
                        await deleteProposal(id);
                        router.push('/proposals');
                    }
                }}
                title="Delete Proposal"
                description="Are you sure you want to delete this proposal? This action cannot be undone."
                isDark={isDark}
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
                    await appToast.promise(
                        addTemplate({
                            name,
                            description,
                            is_default: isDefault,
                            entity_type: 'proposal',
                            blocks,
                            design: { ...(meta.design || DEFAULT_DOCUMENT_DESIGN), documentTitle: meta.documentTitle || meta.projectName || 'PROPOSAL &\nAGREEMENT' } as any
                        }),
                        {
                            loading: 'Saving template...',
                            success: 'Template saved successfully',
                            error: 'Failed to save template'
                        }
                    );
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

            {isClientEditorOpen && (
                <ClientEditor
                    onClose={() => setIsClientEditorOpen(false)}
                    onSave={handleCreateClient}
                    initialData={{
                        contact_person: meta.clientName,
                        company_name: '',
                        email: ''
                    }}
                />
            )}

            <SendEmailModal
                isOpen={isSendModalOpen}
                onClose={() => setIsSendModalOpen(false)}
                templateKey="proposal"
                to={meta.clientEmail || ''}
                variables={{
                    client_name: meta.clientName || '',
                    proposal_number: meta.proposalNumber || '',
                    document_title: meta.projectName || 'Proposal',
                    currency_symbol: getCurrencySymbol(meta.currency || 'USD'),
                    amount: formatAmountOnly(totals.total),
                    document_link: typeof window !== 'undefined' ? `${window.location.origin}/p/proposal/${id}` : '',
                }}
                workspaceId={activeWorkspaceId || ''}
                documentTitle={meta.projectName || 'Proposal'}
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
    const [savingSectionId, setSavingSectionId] = React.useState<string | null>(null);
    const { addSectionTemplate } = useSectionTemplateStore();
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
        color: '#000000',
        backgroundColor: 'var(--document-bg)',
        '--document-bg': design.blockBackgroundColor || '#ffffff',
        '--block-margin-bottom': `${design.marginBottom ?? 24}px`,
        '--block-margin-top': `${design.marginTop ?? 24}px`,
        '--block-border-radius': `${design.borderRadius ?? 16}px`,
        '--block-button-radius': `${Math.max(0, (design.borderRadius ?? 16) - 4)}px`,
        '--sign-bar-color': design.signBarColor || '#000000',
        '--sign-bar-thick': `${design.signBarThickness ?? 1}px`,
        '--table-border-radius': `${design.tableBorderRadius ?? 8}px`,
        '--table-radius-tl': `${design.tableBorderRadiusTL ?? design.tableBorderRadius ?? 8}px`,
        '--table-radius-tr': `${design.tableBorderRadiusTR ?? design.tableBorderRadius ?? 8}px`,
        '--table-radius-br': `${design.tableBorderRadiusBR ?? design.tableBorderRadius ?? 8}px`,
        '--table-radius-bl': `${design.tableBorderRadiusBL ?? design.tableBorderRadius ?? 8}px`,
        '--table-header-bg': design.tableHeaderBg || '#f9f9f9',
        '--table-header-text': isDarkColor(design.tableHeaderBg || '#f9f9f9') ? '#ffffff' : '#000000',
        '--table-border-color': design.tableBorderColor || '#ebebeb',
        '--table-stroke-width': `${design.tableStrokeWidth ?? 1}px`,
        '--table-font-size': `${design.tableFontSize ?? 12}px`,
        '--table-cell-padding': `${design.tableCellPadding ?? 12}px`,
        '--table-row-bg': design.tableRowBg || 'transparent',
        '--table-row-text': isDarkColor(design.tableRowBg && design.tableRowBg !== 'transparent' ? design.tableRowBg : (design.blockBackgroundColor || '#ffffff')) ? '#ffffff' : '#000000',
        '--table-row-border-width': design.tableShowRowBorders === false ? '0px' : `${design.tableStrokeWidth ?? 1}px`,
        '--table-row-border-color': design.tableRowBorderColor || design.tableBorderColor || '#ebebeb',
        '--primary-color': design.primaryColor || 'var(--brand-primary)',
        '--primary': design.primaryColor || 'var(--brand-primary)',
    } as React.CSSProperties), [design]);

    return (
        <div 
            style={{ 
                ...documentStyle, 
                borderRadius: `${design.borderRadius ?? 16}px`,
                backgroundColor: design.blockBackgroundColor || '#ffffff'
            }} 
            className={cn(
                "w-full transition-all duration-300 relative",
                isMobile ? "max-w-full px-6 py-6" : "max-w-[850px]",
                !isMobile && "min-h-0 px-12"
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
                            onAdd={(type) => addBlock(type as any, 'top')}
                            hasHeader={blocks.some((b: any) => b.type === 'header')}
                            isFirst={true}
                        />
                    )}

                    <div>
                        {blocks.map((block: any, idx: number) => (
                            <React.Fragment key={block.id}>
                                <SortableBlock
                                    block={block}
                                    blocks={blocks}
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
                                    isMobile={isMobile}
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
                                    onSaveAsTemplate={(blockId) => setSavingSectionId(blockId)}
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
            <SaveSectionTemplateModal
                open={!!savingSectionId}
                onClose={() => setSavingSectionId(null)}
                blockType={savingSectionId ? blocks.find((b: any) => b.id === savingSectionId)?.type || 'content' : 'content'}
                sourceEntity="proposal"
                onSave={async (name, description, tags) => {
                    const savingBlock = savingSectionId ? blocks.find((b: any) => b.id === savingSectionId) : null;
                    if (!savingBlock) return;
                    await appToast.promise(
                        addSectionTemplate({
                            name,
                            description,
                            tags,
                            block_type: savingBlock.type,
                            source_entity: 'proposal',
                            block_data: savingBlock,
                            background_color: savingBlock.backgroundColor,
                        }),
                        {
                            loading: 'Saving section...',
                            success: 'Section template saved!',
                            error: 'Failed to save section'
                        }
                    );
                    setSavingSectionId(null);
                }}
            />
        </div>
    );
}
/* ═══════════════════════════════════════════════════════
   SORTABLE BLOCK WRAPPER
═══════════════════════════════════════════════════════ */
function SortableBlock({
    block, blocks, isDark, isPreview, updateBlock, removeBlock, addBlock, currency, onMoveUp, onMoveDown, onDuplicate, onSaveAsTemplate, meta, updateMeta,
    setImageUploadOpen, setUploadTarget, isFirst, isLast, isMobile
}: {
    block: BlockData;
    blocks: BlockData[];
    isDark: boolean;
    isPreview: boolean;
    updateBlock: (id: string, patch: Partial<BlockData>) => void;
    removeBlock: (id: string) => void;
    addBlock: (type: BlockType, afterId?: string) => void;
    currency: string;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDuplicate?: () => void;
    onSaveAsTemplate?: (id: string) => void;
    meta?: any;
    updateMeta?: (patch: any) => void;
    setImageUploadOpen: (open: boolean) => void;
    setUploadTarget: (target: any) => void;
    isFirst?: boolean;
    isLast?: boolean;
    isMobile?: boolean;
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
            paddingTop={block.paddingTop}
            paddingBottom={block.paddingBottom}
            globalMarginTop={meta.design?.marginTop ?? 0}
            globalMarginBottom={meta.design?.marginBottom ?? 0}
            onPaddingTopChange={(paddingTop) => updateBlock(block.id, { paddingTop })}
            onPaddingBottomChange={(paddingBottom) => updateBlock(block.id, { paddingBottom })}
            onSaveAsTemplate={onSaveAsTemplate}
        >
            <BlockRenderer
                block={block}
                blocks={blocks} // Pass the blocks array here
                isDark={isDark}
                isPreview={isPreview}
                updateBlock={updateBlock}
                currency={currency}
                meta={meta}
                updateMeta={updateMeta}
                setImageUploadOpen={setImageUploadOpen}
                setUploadTarget={setUploadTarget}
                isMobile={isMobile}
            />
        </SectionBlockWrapper>
    );
}

/* ═══════════════════════════════════════════════════════
   BLOCK RENDERER
═══════════════════════════════════════════════════════ */
function BlockRenderer({
    block, blocks, isDark, isPreview, updateBlock, currency, meta, updateMeta,
    setImageUploadOpen, setUploadTarget, isMobile
}: {
    block: BlockData;
    blocks: BlockData[]; // Added blocks array
    isDark: boolean;
    isPreview: boolean;
    updateBlock: (id: string, patch: Partial<BlockData>) => void;
    currency: string;
    meta?: any;
    updateMeta?: (patch: any) => void;
    setImageUploadOpen: (open: boolean) => void;
    setUploadTarget: (target: any) => void;
    isMobile?: boolean;
}) {
    switch (block.type) {
        case 'header':
            return <HeaderBlock meta={meta} isDark={isDark} isPreview={isPreview} updateMeta={updateMeta} />;
        case 'heading':
            return <HeadingBlock block={block} isDark={isDark} isPreview={isPreview} updateBlock={updateBlock} />;
        case 'text':
            return <TextBlock block={block} isDark={isDark} isPreview={isPreview} updateBlock={updateBlock} meta={meta || {}} />;
        case 'pricing':
            return <PricingBlock block={block} isDark={isDark} isPreview={isPreview} updateBlock={updateBlock} currency={currency} isMobile={isMobile} meta={meta} />;
        case 'breakdown':
            return <BreakdownBlock block={block} blocks={blocks} isDark={isDark} isPreview={isPreview} updateBlock={updateBlock} currency={currency} />;
        case 'signature':
            return <SignatureBlock 
                block={block} 
                isDark={isDark} 
                isPreview={isPreview} 
                updateBlock={updateBlock} 
                design={meta?.design} 
                meta={meta || {}} 
                updateMeta={updateMeta} 
                addNotification={useNotificationStore.getState().addNotification}
            />;
        case 'divider':
            return <div className={cn("my-4 border-t", isDark ? "border-[#2a2a2a]" : "border-[#f0f0f0]")} />;
        case 'page_break':
            return (
                <div className={cn("my-6 page-break-block group flex items-center justify-center relative", isPreview ? "opacity-0 h-0 my-0 overflow-hidden" : "h-6")}>
                    {!isPreview && (
                        <>
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-dashed border-gray-300 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className={cn("px-3 text-[10px] font-medium tracking-widest uppercase", isDark ? "bg-[#111] text-[#666]" : "bg-white text-[#999]")}>
                                    Page Break
                                </span>
                            </div>
                        </>
                    )}
                </div>
            );
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
                                isDark ? "border-white/5 hover:border-[var(--brand-primary)]/30 hover:bg-white/5 text-white/30 hover:text-[var(--brand-primary)]" : "border-gray-200 hover:border-[var(--brand-primary)]/30 hover:bg-gray-50 text-[#999] hover:text-[var(--brand-primary)]"
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
    const { branding } = useSettingsStore();
    const logoToUse = meta.logoUrl || (isDark ? branding?.logo_light_url : branding?.logo_dark_url);

    return (
        <div className="mb-4 pt-[7%]">
            <div className="flex justify-between items-start mb-6">
                <div className="space-y-4">
                    {/* Branding Logo */}
                    {logoToUse ? (
                        <img 
                            src={logoToUse} 
                            alt="Logo" 
                            className="w-auto transition-all duration-300 ease-out" 
                            style={{ height: `${(meta.design?.logoSize ?? 48) * 1.42}px` }} 
                        />
                    ) : (
                        <div className={cn(
                            "font-black text-3xl leading-[0.85] tracking-tighter",
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
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); } }}
                        onInput={e => updateMeta({ documentTitle: e.currentTarget.innerText || '' })}
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

            <div className="flex justify-between items-end pt-4">
                <div>
                    <div className="text-[15px] font-bold mb-4 flex gap-1 items-start">
                        <span>To</span>
                        <span 
                            contentEditable={!isPreview}
                            suppressContentEditableWarning
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); } }}
                            onInput={e => updateMeta({ clientName: e.currentTarget.innerText || '' })}
                            className="outline-none empty:before:content-['Client_Name'] empty:before:opacity-30 whitespace-pre-wrap flex-1"
                        >
                            {meta.clientName}
                        </span>
                    </div>
                    <div className={cn("text-[11px] space-y-1", isDark ? "text-[#aaa]" : "text-[#000]")}>
                        {meta.clientEmail && (
                            <div className="flex items-start gap-1">
                                <span className="font-bold">Email:</span> 
                                <span
                                    contentEditable={!isPreview}
                                    suppressContentEditableWarning
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); } }}
                                    onInput={e => updateMeta({ clientEmail: e.currentTarget.innerText || '' })}
                                    className="outline-none min-w-[50px] whitespace-pre-wrap"
                                >
                                    {meta.clientEmail}
                                </span>
                            </div>
                        )}
                        {meta.clientPhone && (
                            <div className="flex items-start gap-1">
                                <span className="font-bold">Phone:</span> 
                                <span
                                    contentEditable={!isPreview}
                                    suppressContentEditableWarning
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); } }}
                                    onInput={e => updateMeta({ clientPhone: e.currentTarget.innerText || '' })}
                                    className="outline-none min-w-[50px] whitespace-pre-wrap"
                                >
                                    {meta.clientPhone}
                                </span>
                            </div>
                        )}
                        {meta.clientAddress && (
                            <div className="flex items-start gap-1">
                                <span className="font-bold">Address:</span> 
                                <span
                                    contentEditable={!isPreview}
                                    suppressContentEditableWarning
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); } }}
                                    onInput={e => updateMeta({ clientAddress: e.currentTarget.innerText || '' })}
                                    className="outline-none min-w-[50px] whitespace-pre-wrap"
                                >
                                    {meta.clientAddress}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-right text-[11px] space-y-1">
                    <div className="flex items-center justify-end gap-1">
                        <span className={cn("font-bold", isDark ? "text-white" : "text-[#111]")}>Proposal Number:</span> 
                        <span className={cn(isDark ? "text-[#aaa]" : "text-[#000]")}>{meta.proposalNumber || '---'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                        <span className={cn("font-bold", isDark ? "text-white" : "text-[#111]")}>Issue Date:</span> 
                        <span className={cn(isDark ? "text-[#aaa]" : "text-[#000]")}>{meta.issueDate || '---'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                        <span className={cn("font-bold", isDark ? "text-white" : "text-[#111]")}>Due Date:</span> 
                        <span className={cn(isDark ? "text-[#aaa]" : "text-[#000]")}>{meta.expirationDate || '---'}</span>
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
                onInput={e => updateBlock(block.id, { content: e.currentTarget.textContent || '' })}
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
function TextBlock({ block, isDark, isPreview, updateBlock, meta = {} }: any) {
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => { setMounted(true); }, []);

    if (isPreview) {
        return (
            <div
                className={cn(
                    "py-1 text-[13px] leading-relaxed prose prose-p:my-1 prose-headings:my-2 max-w-none prose-h1:text-3xl prose-h2:text-xl prose-h3:text-lg",
                    isDark ? "text-[#aaa] prose-invert" : "text-[#000]"
                )}
                dangerouslySetInnerHTML={{ __html: replaceVariables(block.content || '') }}
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
function PricingBlock({ block, isDark, isPreview, updateBlock, currency, meta = {}, isMobile }: any) {
    const rows: PricingRow[] = block.rows || [];
    const hideQty = block.hideQty || false;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

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
    const addRow = (atIdx?: number) => {
        const newRow = { id: uuidv4(), title: '', description: '', qty: 1, rate: 0 };
        const nextRows = [...rows];
        if (typeof atIdx === 'number') {
            nextRows.splice(atIdx + 1, 0, newRow);
        } else {
            nextRows.push(newRow);
        }
        updateBlock(block.id, { rows: nextRows });
    };
    const duplicateRow = (row: PricingRow) => {
        const nextRows = [...rows];
        const idx = nextRows.findIndex(r => r.id === row.id);
        nextRows.splice(idx + 1, 0, { ...row, id: uuidv4() });
        updateBlock(block.id, { rows: nextRows });
    };
    const removeRow = (rowId: string) => {
        updateBlock(block.id, { rows: rows.filter((r: PricingRow) => r.id !== rowId) });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = rows.findIndex(r => r.id === active.id);
            const newIndex = rows.findIndex(r => r.id === over.id);
            updateBlock(block.id, { rows: arrayMove(rows, oldIndex, newIndex) });
        }
    };

    const th = cn("text-[10px] font-bold uppercase tracking-wider pb-2 text-left", "text-[inherit]");
    const td = cn("py-2", "text-[inherit]");

    return (
        <div className="flex flex-col gap-2">
            {/* Title Section */}
            {(!isPreview || (block.title !== undefined ? block.title : 'CREATIVE SERVICES PRICING')) && (
                <div className={cn("w-full relative", isMobile ? "mb-6" : "mb-8")}>
                    <div
                        contentEditable={!isPreview}
                        suppressContentEditableWarning
                        onInput={e => updateBlock(block.id, { title: e.currentTarget.innerText || '' })}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
                        className={cn(
                            "w-full text-center font-bold bg-transparent outline-none transition-all px-1 whitespace-pre-wrap",
                            isDark ? "text-white" : "text-[#222222]",
                            isPreview ? "pointer-events-none" : "hover:bg-black/5 dark:hover:bg-white/5 rounded min-h-[1.2rem] cursor-text",
                            !(block.title !== undefined ? block.title : 'CREATIVE SERVICES PRICING') && !isPreview ? "before:content-[attr(data-placeholder)] before:opacity-30 before:pointer-events-none" : ""
                        )}
                        style={{ 
                            fontSize: isMobile ? '24px' : 'var(--pricing-title-size, 42px)', 
                            fontWeight: '800', 
                            letterSpacing: '-0.01em',
                            lineHeight: '1.1'
                        }}
                        data-placeholder="Optional Pricing Title..."
                    >
                        {block.title !== undefined ? block.title : 'CREATIVE SERVICES PRICING'}
                    </div>
                </div>
            )}

            <div 
                className={cn("transition-all duration-300 text-[inherit]")} 
                style={{ 
                    borderTopLeftRadius: 'var(--table-radius-tl)',
                    borderTopRightRadius: 'var(--table-radius-tr)',
                    borderBottomRightRadius: 'var(--table-radius-br)',
                    borderBottomLeftRadius: 'var(--table-radius-bl)',
                    borderColor: 'var(--table-border-color)',
                    borderWidth: 'var(--table-stroke-width)',
                    borderStyle: 'solid',
                    fontSize: 'var(--table-font-size)',
                    color: 'inherit'
                }}
            >
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    {isMobile ? (
                        <div className="relative" style={{ borderColor: 'var(--table-border-color)' }}>
                            <style dangerouslySetInnerHTML={{ __html: `
                                .pricing-mobile-row {
                                    border-top-width: var(--table-row-border-width) !important;
                                    border-top-style: solid !important;
                                    border-top-color: var(--table-border-color) !important;
                                }
                                .pricing-mobile-row:first-of-type {
                                    border-top-left-radius: calc(var(--table-radius-tl) - var(--table-stroke-width));
                                    border-top-right-radius: calc(var(--table-radius-tr) - var(--table-stroke-width));
                                    border-top-width: 0 !important;
                                }
                                .pricing-mobile-row:last-of-type {
                                    border-bottom-left-radius: calc(var(--table-radius-bl) - var(--table-stroke-width));
                                    border-bottom-right-radius: calc(var(--table-radius-br) - var(--table-stroke-width));
                                }
                            ` }} />
                            <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                                {rows.map((row: PricingRow) => (
                                    <SortableRow 
                                        key={row.id} 
                                        row={row} 
                                        isDark={isDark} 
                                        isPreview={isPreview} 
                                        hideQty={hideQty} 
                                        currency={currency} 
                                        updateRow={updateRow} 
                                        removeRow={removeRow} 
                                        duplicateRow={duplicateRow}
                                        td={td}
                                        isMobile={true}
                                    />
                                ))}
                            </SortableContext>
                        </div>
                    ) : (
                        <table className="w-full relative pricing-table-root" style={{ borderCollapse: 'separate', borderSpacing: 0, border: 'none' }}>
                            <thead style={{ color: 'var(--table-header-text, inherit)' }}>
                                <tr style={{ fontSize: 'calc(var(--table-font-size) - 2px)' }}>
                                    <th className={cn(th, "w-0 relative pl-5")} style={{ borderTopLeftRadius: 'calc(var(--table-radius-tl) - var(--table-stroke-width))', backgroundColor: 'var(--table-header-bg)' }} />
                                    <th className={cn(th, "pr-2 py-2 w-full")} style={{ backgroundColor: 'var(--table-header-bg)' }}></th>
                                    {!hideQty && <th className={cn(th, "px-3 py-2 text-right w-16")} style={{ backgroundColor: 'var(--table-header-bg)' }}>Qty</th>}
                                    <th className={cn(th, "px-3 py-2 text-right w-24")} style={{ backgroundColor: 'var(--table-header-bg)', borderTopRightRadius: (hideQty && isPreview) ? 'calc(var(--table-radius-tr) - var(--table-stroke-width))' : '0', paddingRight: (hideQty && isPreview) ? '1.25rem' : '0.75rem' }}>Amount</th>
                                    {!hideQty && <th className={cn(th, "pl-3 py-2 text-right w-24")} style={{ backgroundColor: 'var(--table-header-bg)', borderTopRightRadius: isPreview ? 'calc(var(--table-radius-tr) - var(--table-stroke-width))' : '0', paddingRight: isPreview ? '1.25rem' : '0.75rem' }}>Total</th>}
                                    {!isPreview && <th className={cn(th, "w-0 pr-5")} style={{ borderTopRightRadius: 'calc(var(--table-radius-tr) - var(--table-stroke-width))', backgroundColor: 'var(--table-header-bg)' }} />}
                                </tr>
                            </thead>
                            <tbody className="relative" style={{ borderColor: 'var(--table-border-color)' }}>
                                <style dangerouslySetInnerHTML={{ __html: `
                                    .pricing-table-root tbody tr td {
                                        border-top-width: var(--table-row-border-width) !important;
                                        border-top-style: solid !important;
                                        border-top-color: var(--table-row-border-color) !important;
                                    }
                                    .pricing-table-root tbody tr:last-child td:first-child {
                                        border-bottom-left-radius: calc(var(--table-radius-bl) - var(--table-stroke-width));
                                    }
                                    .pricing-table-root tbody tr:last-child td:last-child {
                                        border-bottom-right-radius: calc(var(--table-radius-br) - var(--table-stroke-width));
                                    }
                                ` }} />
                                <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                                    {rows.map((row: PricingRow, idx: number) => (
                                        <SortableRow 
                                            key={row.id} 
                                            row={row} 
                                            isDark={isDark} 
                                            isPreview={isPreview} 
                                            hideQty={hideQty} 
                                            currency={currency} 
                                            updateRow={updateRow} 
                                            removeRow={removeRow} 
                                            duplicateRow={duplicateRow}
                                            td={td}
                                            idx={idx}
                                            onAddRow={() => addRow(idx)}
                                            showRowBorders={meta.design?.tableShowRowBorders !== false}
                                        />
                                    ))}
                                </SortableContext>
                            </tbody>
                        </table>
                    )}
                </DndContext>
            </div>

            {/* Totals Section */}
            <div className={cn("px-5 py-3", isPreview ? "mt-2" : "mt-4")} style={{ 
                backgroundColor: 'transparent', 
                color: 'var(--table-text-color, inherit)' 
            }}>
                {!isPreview && (
                    <div className="flex justify-between items-center mb-4">
                        <button
                            onClick={() => addRow()}
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
                                className="rounded border-gray-300" 
                                style={{ accentColor: meta.design?.primaryColor || 'var(--brand-primary)' }}
                            />
                            Hide QTY
                        </label>
                    </div>
                )}
                
                <div className="flex justify-end">
                    <div className="space-y-1.5" style={{ minWidth: 0 }}>
                        {(() => {
                            const hasSubtotal = rows.length > 1 && (!hideQty || (block.discountRate || 0) > 0 || (block.taxRate || 0) > 0);
                            const hasDiscount = !isPreview || (block.discountRate || 0) > 0;
                            const hasTax      = !isPreview || (block.taxRate || 0) > 0;
                            const showDivider = hasSubtotal || hasDiscount || hasTax;

                            return (
                                <>
                                    {/* Subtotal row */}
                                    {hasSubtotal && (
                                        <div className="grid font-medium opacity-60" style={{ gridTemplateColumns: 'auto auto', gap: '0 2rem', fontSize: 'calc(var(--table-font-size) - 1px)' }}>
                                            <span className="text-left">Subtotal</span>
                                            <span className="text-right whitespace-nowrap"><MoneyAmount amount={subtotal} currency={currency} forceOriginal={isPreview} /></span>
                                        </div>
                                    )}
                                    {/* Discount row */}
                                    {hasDiscount && (
                                        <div className="grid items-center font-medium opacity-60" style={{ gridTemplateColumns: 'auto auto', gap: '0 2rem', fontSize: 'calc(var(--table-font-size) - 1px)' }}>
                                            <div className="flex items-center gap-1.5 justify-start">
                                                <span>Discount</span>
                                                {isPreview
                                                    ? <span className="opacity-70">({block.discountRate}%)</span>
                                                    : <>
                                                        <input
                                                            type="number"
                                                            value={block.discountRate || 0}
                                                            onInput={e => updateBlock(block.id, { discountRate: Number(e.target.value) })}
                                                            className={cn("w-8 bg-transparent outline-none border-b text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", isDark ? "border-white/10" : "border-black/10")}
                                                        />
                                                        <span>%</span>
                                                    </>
                                                }
                                            </div>
                                            <span className="text-right whitespace-nowrap">−<MoneyAmount amount={discAmt} currency={currency} forceOriginal={isPreview} /></span>
                                        </div>
                                    )}
                                    {/* Tax row */}
                                    {hasTax && (
                                        <div className="grid items-center font-medium opacity-60" style={{ gridTemplateColumns: 'auto auto', gap: '0 2rem', fontSize: 'calc(var(--table-font-size) - 1px)' }}>
                                            <div className="flex items-center gap-1.5 justify-start">
                                                <span>Tax</span>
                                                {isPreview
                                                    ? <span className="opacity-70">({block.taxRate}%)</span>
                                                    : <>
                                                        <input
                                                            type="number"
                                                            value={block.taxRate || 0}
                                                            onInput={e => updateBlock(block.id, { taxRate: Number(e.target.value) })}
                                                            className={cn("w-8 bg-transparent outline-none border-b text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", isDark ? "border-white/10" : "border-black/10")}
                                                        />
                                                        <span>%</span>
                                                    </>
                                                }
                                            </div>
                                            <span className="text-right whitespace-nowrap"><MoneyAmount amount={taxAmt} currency={currency} forceOriginal={isPreview} /></span>
                                        </div>
                                    )}
                                    {/* Total row */}
                                    <div
                                        className={cn("grid font-black", showDivider && "border-t pt-2 mt-1")}
                                        style={{ gridTemplateColumns: 'auto auto', gap: '0 2rem', borderColor: 'var(--table-border-color)', borderTopWidth: 'var(--table-stroke-width)', fontSize: 'calc(var(--table-font-size) + 2px)' }}
                                    >
                                        <span className="text-left">Total</span>
                                        <span className="text-right whitespace-nowrap"><MoneyAmount amount={total} currency={currency} forceOriginal={isPreview} /></span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Sortable Row Helpers ─── */
function TableRowInsertZone({ onAdd, isDark }: any) {
    const [hovered, setHovered] = React.useState(false);
    return (
        <div 
            className="absolute inset-x-0 -bottom-[1px] h-[10px] z-50 group/table-insert flex items-center justify-center translate-y-1/2"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className={cn(
                "w-full h-[2px] transition-all duration-200",
                hovered ? "opacity-100" : "opacity-0"
            )} style={{ backgroundColor: 'var(--brand-primary)' }} />
            <button
                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                className={cn(
                    "absolute left-1/2 -translate-x-1/2 w-5 h-5 flex items-center justify-center rounded-full border transition-all duration-200 shadow-sm",
                    hovered 
                        ? (isDark ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white scale-110" : "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white scale-110")
                        : "opacity-0 invisible scale-50"
                )}
            >
                <Plus size={12} strokeWidth={3} />
            </button>
        </div>
    );
}

function SortableRow({ row, isDark, isPreview, hideQty, currency, updateRow, removeRow, duplicateRow, td, isMobile, idx, onAddRow, showRowBorders }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 0 };

    if (isMobile) {
        return (
            <div 
                ref={setNodeRef} 
                className={cn(
                    "flex flex-col p-4 gap-3 relative transition-colors pricing-mobile-row",
                    isDragging ? (isDark ? "bg-[#222]" : "bg-gray-50") : (isDark ? "hover:bg-white/[0.02]" : "hover:bg-black/[0.02]")
                )}
                style={{ ...style, backgroundColor: 'var(--table-row-bg, transparent)', color: 'var(--table-row-text, inherit)' }}
            >
                {!isPreview && (
                    <div className="absolute right-3 top-3 flex gap-1">
                        <button 
                            {...attributes} 
                            {...listeners} 
                            className={cn(
                                "p-1.5 rounded-lg transition-all",
                                isDark ? "text-white/30 hover:text-white" : "text-black/30 hover:text-black"
                            )}
                        >
                            <GripVertical size={14} />
                        </button>
                        <button 
                            onClick={() => removeRow(row.id)} 
                            className="p-1.5 rounded-lg text-red-500/50 hover:text-red-500"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}

                <div className="flex flex-col pr-12">
                    {isPreview ? (
                        <>
                            <div dir="auto" className="font-bold text-[14px] leading-tight">{row.title || 'Item'}</div>
                            {row.description && (
                                <div 
                                    dir="auto"
                                    className="text-[12px] opacity-60 mt-1 leading-relaxed break-words"
                                    dangerouslySetInnerHTML={{ __html: replaceVariables(row.description) }}
                                />
                            )}
                        </>
                    ) : (
                        <>
                            <input
                                dir="auto"
                                value={row.title || ''}
                                onInput={e => updateRow(row.id, { title: e.target.value })}
                                placeholder="Item Name..."
                                className={cn("w-full bg-transparent outline-none font-bold text-[14px] p-0 border-none", isDark ? "text-[inherit] placeholder:opacity-20" : "text-[inherit] placeholder:opacity-20")}
                            />
                            <RichTextDescription
                                value={row.description || ''}
                                onChange={v => updateRow(row.id, { description: v })}
                                placeholder="Description (optional)..."
                                isDark={isDark}
                                className={cn(
                                    "mt-1 text-[12px]",
                                    isDark ? "text-[inherit] opacity-60" : "text-[inherit] opacity-60"
                                )}
                            />
                        </>
                    )}
                </div>

                <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-4">
                        {!hideQty && (
                            <div className="flex flex-col">
                                <span className={cn("text-[9px] font-bold uppercase tracking-wider text-[inherit] opacity-40")}>Qty</span>
                                {isPreview ? (
                                    <span className="text-[13px] font-bold">{row.qty}</span>
                                ) : (
                                    <input
                                        type="number"
                                        value={row.qty}
                                        onInput={e => updateRow(row.id, { qty: Number(e.target.value) })}
                                        className={cn("w-10 bg-transparent outline-none font-bold text-[13px] text-[inherit]")}
                                    />
                                )}
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className={cn("text-[9px] font-bold uppercase tracking-wider text-[inherit] opacity-40")}>Amount</span>
                            {isPreview ? (
                                <span className="text-[13px] font-bold"><MoneyAmount amount={row.rate} currency={currency} forceOriginal={true} /></span>
                            ) : (
                                <input
                                    type="number"
                                    value={row.rate}
                                    onInput={e => updateRow(row.id, { rate: Number(e.target.value) })}
                                    className={cn("w-20 bg-transparent outline-none font-bold text-[13px]", isDark ? "text-[#ccc]" : "text-[#333]")}
                                />
                            )}
                        </div>
                    </div>
                    {!hideQty && (
                        <div className="flex flex-col items-end">
                            <span className={cn("text-[9px] font-bold uppercase tracking-wider", isDark ? "opacity-40" : "text-black")}>Total</span>
                            <span className="text-[16.5px] font-bold text-right"><MoneyAmount amount={row.qty * row.rate} currency={currency} forceOriginal={isPreview} /></span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <tr 
            ref={setNodeRef} 
            className={cn(
                "group/row transition-colors relative", 
                isDragging ? (isDark ? "bg-[#222]" : "bg-gray-50") : (isDark ? "hover:bg-white/[0.01]" : "hover:bg-black/[0.01]")
            )}
            style={{ ...style, backgroundColor: 'var(--table-row-bg, transparent)', color: 'var(--table-row-text, inherit)' }}
        >
            <td className="w-0 relative pl-5">
                {!isPreview && (
                    <div className={cn(
                        "absolute right-full top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-50 transition-all duration-200 pr-3",
                        "opacity-0 invisible pointer-events-none group-hover/row:opacity-100 group-hover/row:visible group-hover/row:pointer-events-auto"
                    )}>
                        <button 
                            {...attributes} 
                            {...listeners} 
                            className={cn(
                                "p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing",
                                isDark ? "text-white/30 hover:text-white hover:bg-white/10" : "text-black/30 hover:text-black hover:bg-black/5"
                            )}
                            title="Drag to reorder"
                        >
                            <GripVertical size={14} />
                        </button>
                    </div>
                )}
            </td>
            <td className={cn(td, "pr-2 align-top")} style={{ paddingTop: 'var(--table-cell-padding)', paddingBottom: 'var(--table-cell-padding)' }}>
                {isPreview ? (
                    <div className="flex flex-col">
                        <div dir="auto" className="font-bold truncate" style={{ fontSize: 'calc(var(--table-font-size) + 2px)' }}>{row.title || 'Item'}</div>
                        {row.description && (
                            <div 
                                dir="auto"
                                className={cn("mt-0.5 opacity-60 break-words")} 
                                style={{ fontSize: 'calc(var(--table-font-size) - 1px)' }}
                                dangerouslySetInnerHTML={{ __html: replaceVariables(row.description) }}
                            />
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <input
                            dir="auto"
                            value={row.title || ''}
                            onInput={e => updateRow(row.id, { title: e.target.value })}
                            placeholder={row.description ? "Item title..." : "Item Name..."}
                            className={cn("w-full bg-transparent outline-none font-bold p-0 border-none font-inherit leading-tight", isDark ? "text-[inherit] placeholder:opacity-20" : "text-[inherit] placeholder:opacity-20")}
                            style={{ fontSize: 'calc(var(--table-font-size) + 2px)', fontWeight: 700 }}
                        />
                        <RichTextDescription
                            dir="auto"
                            value={row.description || ''}
                            onChange={v => updateRow(row.id, { description: v })}
                            placeholder="Description (optional)..."
                            isDark={isDark}
                            className={cn(
                                "opacity-60 mt-0.5 font-inherit leading-tight break-words",
                                "text-[inherit]"
                            )}
                            style={{ fontSize: 'calc(var(--table-font-size) - 1px)' }}
                        />
                    </div>
                )}
            </td>
            {!hideQty && (
                <td className={cn(td, "px-3 text-right align-top")} style={{ paddingTop: 'var(--table-cell-padding)' }}>
                    {isPreview ? row.qty : (
                        <input
                            type="number"
                            value={row.qty}
                            onInput={e => updateRow(row.id, { qty: Number(e.target.value) })}
                            className={cn("w-12 text-right bg-transparent outline-none font-medium", isDark ? "text-[#ccc]" : "text-[#333]")}
                        />
                    )}
                </td>
            )}
            <td className={cn(td, "px-3 text-right align-top")} style={{ paddingTop: 'var(--table-cell-padding)', paddingRight: (hideQty && isPreview) ? '1.25rem' : '0.75rem' }}>
                {isPreview ? <span className={cn(hideQty && "font-bold")}><MoneyAmount amount={row.rate} currency={currency} forceOriginal={isPreview} /></span> : (
                    <input
                        type="number"
                        value={row.rate}
                        onInput={e => updateRow(row.id, { rate: Number(e.target.value) })}
                        className={cn("w-20 text-right bg-transparent outline-none p-0 border-none font-inherit leading-tight", hideQty ? "font-bold" : "font-medium")}
                        style={{ fontWeight: hideQty ? 700 : 500 }}
                    />
                )}
            </td>
            {!hideQty && <td className={cn(td, "pl-3 text-right font-bold align-top")} style={{ paddingTop: 'var(--table-cell-padding)', fontSize: 'calc(var(--table-font-size) + 1px)', paddingRight: isPreview ? '1.25rem' : '0.75rem' }}><MoneyAmount amount={row.qty * row.rate} currency={currency} forceOriginal={isPreview} /></td>}
            {!isPreview && (
                <td className={cn(td, "w-0 relative pr-5")}>
                    <div className={cn(
                        "absolute left-full top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-50 transition-all duration-200 pl-3",
                        "opacity-0 invisible pointer-events-none group-hover/row:opacity-100 group-hover/row:visible group-hover/row:pointer-events-auto"
                    )}>
                        <button 
                            onClick={() => duplicateRow(row)} 
                            className={cn(
                                "p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95", 
                                isDark ? "text-white/30 hover:text-white hover:bg-white/10" : "text-black/30 hover:text-black hover:bg-black/5"
                            )} 
                            title="Duplicate row"
                        >
                            <Copy size={13} />
                        </button>
                        <button 
                            onClick={() => removeRow(row.id)} 
                            className={cn(
                                "p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95", 
                                isDark ? "text-red-400/50 hover:text-red-400 hover:bg-red-500/20" : "text-red-500/50 hover:text-red-500 hover:bg-red-50"
                            )} 
                            title="Delete row"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                    {showRowBorders && (
                        <TableRowInsertZone isDark={isDark} onAdd={onAddRow} />
                    )}
                </td>
            )}
        </tr>
    );
}

function SortableBreakdownRow({ row, idx, isDark, isPreview, totalAbove, currency, updateRow, duplicateRow, removeRow, td, hasError, isLast }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 0 };

    return (
        <tr 
            ref={setNodeRef} 
            style={{ ...style, backgroundColor: 'var(--table-row-bg, transparent)', color: 'var(--table-row-text, inherit)' }} 
            className={cn(
                "group/row transition-colors relative", 
                isDragging ? (isDark ? "bg-[#222]" : "bg-gray-50") : (isDark ? "hover:bg-white/[0.01]" : "hover:bg-black/[0.01]")
            )}
        >
            <td className="w-0 relative pl-5">
                {!isPreview && (
                    <div className={cn(
                        "absolute right-full top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-50 transition-all duration-200 pr-3",
                        "opacity-0 invisible pointer-events-none group-hover/row:opacity-100 group-hover/row:visible group-hover/row:pointer-events-auto"
                    )}>
                        <button 
                            {...attributes} 
                            {...listeners} 
                            className={cn(
                                "p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing",
                                isDark ? "text-white/30 hover:text-white hover:bg-white/10" : "text-black/30 hover:text-black hover:bg-black/5"
                            )}
                            title="Drag to reorder"
                        >
                            <GripVertical size={14} />
                        </button>
                    </div>
                )}
            </td>
            <td className={cn(td, "pr-2")}>
                {isPreview ? (
                    <div className="flex flex-col">
                        <div className="font-bold">{row.label || 'Item'}</div>
                        {row.description && (
                            <div 
                                className={cn("text-[11px] opacity-60 mt-0.5 break-words")}
                                dangerouslySetInnerHTML={{ __html: replaceVariables(row.description) }}
                            />
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <input 
                            value={row.label || ''} 
                            onInput={e => updateRow(row.id, { label: e.target.value })} 
                            placeholder="Label..." 
                            className={cn("w-full bg-transparent outline-none font-bold p-0 border-none font-inherit leading-tight placeholder:opacity-30 text-[inherit]")} 
                            style={{ fontWeight: 700 }}
                        />
                        <RichTextDescription
                            value={row.description || ''}
                            onChange={v => updateRow(row.id, { description: v })}
                            placeholder="Description..."
                            isDark={isDark}
                            className={cn(
                                "text-[11px] opacity-60 mt-0.5 font-inherit leading-tight text-[inherit] break-words"
                            )}
                        />
                    </div>
                )}
            </td>
            <td className={cn(td, "px-3 text-right")}>
                {isPreview ? <span>{row.percentage}%</span> : (
                    <div className="flex items-center justify-end gap-1">
                        <input type="number" value={row.percentage} onInput={e => updateRow(row.id, { percentage: Number(e.target.value) })} className={cn("w-12 text-right bg-transparent outline-none font-medium p-1 rounded-md transition-colors", hasError && isLast ? "bg-amber-500/10 text-amber-500" : "")} />
                        <span>%</span>
                    </div>
                )}
            </td>
            <td className={cn(td, "pl-3 text-right font-bold")} style={{ paddingRight: isPreview ? '1.25rem' : '0.75rem' }}><MoneyAmount amount={totalAbove * (row.percentage / 100)} currency={currency} forceOriginal={isPreview} /></td>
            {!isPreview && (
                <td className={cn(td, "w-0 relative pr-5")}>
                    <div className={cn(
                        "absolute left-full top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-50 transition-all duration-200 pl-3",
                        "opacity-0 invisible pointer-events-none group-hover/row:opacity-100 group-hover/row:visible group-hover/row:pointer-events-auto"
                    )}>
                        <button 
                            onClick={() => duplicateRow(row)} 
                            className={cn(
                                "p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95", 
                                isDark ? "text-white/30 hover:text-white hover:bg-white/10" : "text-black/30 hover:text-black hover:bg-black/5"
                            )} 
                            title="Duplicate row"
                        >
                            <Copy size={13} />
                        </button>
                        <button 
                            onClick={() => removeRow(row.id)} 
                            className={cn(
                                "p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95", 
                                isDark ? "text-red-400/50 hover:text-red-400 hover:bg-red-500/20" : "text-red-500/50 hover:text-red-500 hover:bg-red-50"
                            )} 
                            title="Delete row"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </td>
            )}
        </tr>
    );
}

/* ─── Breakdown Block ─── */
function BreakdownBlock({ block, blocks, isDark, isPreview, updateBlock, currency }: any) {
    const rows = block.rows || [];

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    
    // Calculate total from all pricing tables ABOVE this block
    const thisIdx = blocks.findIndex((b: any) => b.id === block.id);
    const pricingAbove = blocks.slice(0, thisIdx).filter((b: any) => b.type === 'pricing');
    
    let totalAbove = 0;
    pricingAbove.forEach((pb: any) => {
        const pRows = pb.rows || [];
        const sub = pRows.reduce((s: number, r: any) => s + (pb.hideQty ? 1 : r.qty) * r.rate, 0);
        const disc = sub * ((pb.discountRate || 0) / 100);
        const tax = (sub - disc) * ((pb.taxRate || 0) / 100);
        totalAbove += (sub - disc + tax);
    });

    const totalPercentage = rows.reduce((acc: number, r: any) => acc + (r.percentage || 0), 0);
    const diff = 100 - totalPercentage;
    const hasError = Math.abs(diff) > 0.01;

    const updateRow = (rowId: string, patch: Partial<any>) => {
        updateBlock(block.id, {
            rows: rows.map((r: any) => r.id === rowId ? { ...r, ...patch } : r)
        });
    };

    const duplicateRow = (row: any) => {
        const nextRows = [...rows];
        const idx = nextRows.findIndex(r => r.id === row.id);
        nextRows.splice(idx + 1, 0, { ...row, id: uuidv4() });
        updateBlock(block.id, { rows: nextRows });
    };

    const fixPercentages = () => {
        if (rows.length === 0) return;
        const nextRows = [...rows];
        const lastRow = nextRows[nextRows.length - 1];
        lastRow.percentage = Math.round((lastRow.percentage + diff) * 100) / 100;
        updateBlock(block.id, { rows: nextRows });
    };

    const addRow = (atIdx?: number) => {
        const isMiddle = typeof atIdx === 'number';
        const newRow = { 
            id: uuidv4(), 
            label: isMiddle ? 'Milestone' : 'Full Balance Required', 
            description: isMiddle ? '' : 'Full balance due before the digital deliverables files can be released.', 
            percentage: isMiddle ? 0 : Math.max(0, diff) 
        };
        const nextRows = [...rows];
        if (isMiddle) {
            nextRows.splice(atIdx + 1, 0, newRow);
        } else {
            nextRows.push(newRow);
        }
        updateBlock(block.id, { rows: nextRows });
    };

    const removeRow = (rowId: string) => {
        const remainingRows = rows.filter((r: any) => r.id !== rowId);
        updateBlock(block.id, { rows: remainingRows });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = rows.findIndex((r: any) => r.id === active.id);
            const newIndex = rows.findIndex((r: any) => r.id === over.id);
            updateBlock(block.id, { rows: arrayMove(rows, oldIndex, newIndex) });
        }
    };

    const th = cn("text-[10px] font-bold uppercase tracking-wider pb-2 text-left", "text-[inherit]");
    const td = cn("py-1.5", "text-[inherit]");

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4 px-1">
                <div 
                    contentEditable={!isPreview}
                    suppressContentEditableWarning
                    onInput={e => updateBlock(block.id, { title: e.currentTarget.textContent || '' })}
                    className={cn(
                        "font-bold text-[14px] outline-none",
                        !isPreview && "hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 -mx-1"
                    )}
                >
                    {block.title || 'PRELIMINARY BUDGET BREAKDOWN'}
                </div>
                {!isPreview && hasError && (
                    <div className="flex items-center gap-3">
                        <span className={cn("text-[10px] font-bold whitespace-nowrap", diff > 0 ? "text-amber-500" : "text-red-500")}>
                            {totalPercentage}% ({diff > 0 ? `+${diff.toFixed(0)}%` : `${diff.toFixed(0)}%`})
                        </span>
                        <button
                            onClick={fixPercentages}
                            className={cn(
                                "flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 border border-dashed transition-all",
                                isDark ? "border-white/20 text-white/50 hover:text-white/80" : "border-black/20 text-black/50 hover:text-black/80"
                            )}
                            style={{ borderRadius: 'var(--block-button-radius)' }}
                            title="Click to fix and balance to 100%"
                        >
                            <Zap size={10} className="fill-current" />
                            FIX
                        </button>
                    </div>
                )}
            </div>
            <div 
                className={cn("transition-all duration-300 text-[inherit]")} 
                style={{ 
                    borderTopLeftRadius: 'var(--table-radius-tl)',
                    borderTopRightRadius: 'var(--table-radius-tr)',
                    borderBottomRightRadius: 'var(--table-radius-br)',
                    borderBottomLeftRadius: 'var(--table-radius-bl)',
                    borderColor: 'var(--table-border-color)',
                    borderWidth: 'var(--table-stroke-width)',
                    borderStyle: 'solid',
                    fontSize: 'var(--table-font-size)',
                    color: 'inherit'
                }}
            >
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <table className="w-full relative pricing-breakdown-table" style={{ borderCollapse: 'separate', borderSpacing: 0, border: 'none' }}>

                        <thead style={{ color: 'var(--table-header-text, inherit)' }}>
                            <tr style={{ fontSize: 'calc(var(--table-font-size) - 2px)' }}>
                                <th className={cn(th, "w-0 relative pl-5")} style={{ borderTopLeftRadius: 'calc(var(--table-radius-tl) - var(--table-stroke-width))', backgroundColor: 'var(--table-header-bg)' }} />
                                <th className={cn(th, "pr-2 py-2 w-full")} style={{ backgroundColor: 'var(--table-header-bg)' }}></th>
                                <th className={cn(th, "px-3 py-2 text-right w-24")} style={{ backgroundColor: 'var(--table-header-bg)' }}>Percentage</th>
                                <th className={cn(th, "pl-3 py-2 text-right w-32")} style={{ backgroundColor: 'var(--table-header-bg)', borderTopRightRadius: isPreview ? 'calc(var(--table-radius-tr) - var(--table-stroke-width))' : '0', paddingRight: isPreview ? '1.25rem' : '0.75rem' }}>Amount</th>
                                {!isPreview && <th className={cn(th, "w-0 pr-5")} style={{ borderTopRightRadius: 'calc(var(--table-radius-tr) - var(--table-stroke-width))', backgroundColor: 'var(--table-header-bg)' }} />}
                            </tr>
                        </thead>
                        <tbody className="relative" style={{ borderColor: 'var(--table-border-color)' }}>
                            <style dangerouslySetInnerHTML={{ __html: `
                                .pricing-breakdown-table tbody tr td {
                                    border-top-width: var(--table-row-border-width) !important;
                                    border-top-style: solid !important;
                                    border-top-color: var(--table-row-border-color) !important;
                                }
                                .pricing-breakdown-table tbody tr:last-child td:first-child {
                                    border-bottom-left-radius: calc(var(--table-radius-bl) - var(--table-stroke-width));
                                }
                                .pricing-breakdown-table tbody tr:last-child td:last-child {
                                    border-bottom-right-radius: calc(var(--table-radius-br) - var(--table-stroke-width));
                                }
                            ` }} />
                            <SortableContext items={rows.map((r: any) => r.id)} strategy={verticalListSortingStrategy}>
                                {rows.map((row: any, idx: number) => (
                                    <SortableBreakdownRow 
                                        key={row.id} 
                                        row={row} 
                                        idx={idx}
                                        isDark={isDark}
                                        isPreview={isPreview}
                                        totalAbove={totalAbove}
                                        currency={currency}
                                        updateRow={updateRow}
                                        duplicateRow={duplicateRow}
                                        removeRow={removeRow}
                                        td={td}
                                        hasError={hasError}
                                        isLast={idx === rows.length - 1}
                                    />
                                ))}
                            </SortableContext>
                        </tbody>
                    </table>
                </DndContext>
            </div>

            {/* Actions Footer Section (Outside Border) */}
            {!isPreview && (
                <div className="px-1 py-1">
                    <button
                        onClick={() => addRow()}
                        className={cn("flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 border border-dashed transition-all", isDark ? "border-white/10 text-white/40 hover:border-white/60" : "border-black/10 text-black/40 hover:border-black/20 hover:text-black/60")}
                        style={{ borderRadius: 'var(--block-button-radius)' }}
                    >
                        <Plus size={10} /> ADD BREAKDOWN ROW
                    </button>
                </div>
            )}
        </div>
    );
}

/* ─── Signature Block ─── */
function SignatureBlock({ block, isDark, isPreview, updateBlock, design, meta = {}, updateMeta, addNotification }: any) {
    const sigTheme = design?.signTheme || 'light';
    const isSigDark = sigTheme === 'dark';

    return (
        <div className={cn(
            "my-4 border p-5 transition-all w-full max-w-[320px]",
            isSigDark 
                ? "border-white/10 bg-[#0c0c0c] text-white shadow-2xl" 
                : "border-black/5 bg-white text-black shadow-sm"
        )}
        style={{ borderRadius: 'var(--block-border-radius)' }}
        >
            <div className={cn("text-[8px] font-black uppercase tracking-[0.25em] mb-4 opacity-40", isSigDark ? "text-white" : "text-black")}>
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
                                        className={cn("text-4xl w-full truncate leading-none pb-2", isSigDark ? "text-white" : "text-black")}
                                        style={{ fontFamily: 'var(--font-mr-dafoe), cursive' }}
                                    >
                                        {block.signerName || 'Signature'}
                                    </span>
                                )}
                                    <span className={cn("absolute -bottom-[22px] right-0 text-[8px] opacity-30 uppercase tracking-tighter italic shrink-0", isSigDark ? "text-white" : "text-black")}>
                                        Electronically Signed
                                    </span>
                                </div>
                            ) : (
                                <span className={cn("text-[11px] opacity-20 italic pb-1", isSigDark ? "text-white" : "text-black")}>Awaiting signature...</span>
                            )}
                        </div>
                        
                        {!isPreview && (
                            <div className="space-y-3 mt-4">
                                <input
                                    value={block.signerName || ''}
                                    onChange={e => updateBlock(block.id, { signerName: e.target.value })}
                                    placeholder="Full Name"
                                    className={cn("w-full bg-transparent outline-none text-[13px] font-semibold border-b pb-1 transition-colors", 
                                        isSigDark ? "border-white/10 text-white placeholder:text-white/20 focus:border-[var(--brand-primary)]" : "border-black/10 text-black placeholder:text-black/20 focus:border-[var(--brand-primary)]")}
                                />
                                <input
                                    value={block.signerRole || ''}
                                    onChange={e => updateBlock(block.id, { signerRole: e.target.value })}
                                    placeholder="Role / Title"
                                    className={cn("w-full bg-transparent outline-none text-[11px] opacity-40 border-b pb-1 transition-colors", 
                                        isSigDark ? "border-white/10 text-white focus:border-[var(--brand-primary)]" : "border-black/10 text-black focus:border-[var(--brand-primary)]")}
                                />
                            </div>
                        )}
                    
                    {isPreview && (
                        <div className="flex flex-col mt-3">
                            <span className={cn("text-[13px] font-bold", isSigDark ? "text-white" : "text-black")}>
                                {block.signerName || 'Pending'}
                            </span>
                            <span className={cn("text-[11px] opacity-40 mt-0.5", isSigDark ? "text-white" : "text-black")}>
                                {block.signerRole || 'Client'}
                            </span>
                        </div>
                    )}
                </div>
                
                {!isPreview && (
                    <button
                        onClick={() => {
                            const isNowSigned = !block.signed;
                            const patch: any = { signed: isNowSigned };
                            
                            // If marking as signed and name is empty, pre-fill with client name
                            if (isNowSigned && !block.signerName) {
                                patch.signerName = meta?.clientName || 'Client';
                            }
                            
                            updateBlock(block.id, patch);
                            
                            // If marking as signed, also update global status to Accepted
                            if (isNowSigned) {
                                if (meta?.status !== 'Accepted') {
                                    updateMeta?.({ status: 'Accepted' as any });
                                }

                                // Trigger notification as if it was signed by client
                                addNotification?.({
                                    title: 'Proposal Signed 🎉',
                                    message: `${patch.signerName || meta?.clientName || 'A client'} just signed the proposal "${meta?.projectName || 'Untitled'}"`,
                                    link: `/proposals/${block.proposalId || ''}`,
                                    type: 'success'
                                });
                            }
                        }}
                        className={cn(
                            "px-4 py-2 w-full text-[12px] font-bold transition-all active:scale-95 shadow-sm border",
                            block.signed
                                ? "bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-600"
                                : isSigDark ? "bg-white/5 text-white/60 border-white/5 hover:bg-white/10" : "bg-white text-black/60 border-black/5 hover:bg-black/5"
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
            <div className="flex items-center justify-between mb-1.5 ">
                <div className={cn("flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest", isDark ? "text-[#555]" : "text-[#bbb]")}>
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
    const menuRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close the menu
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
                setHovered(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    return (
        <div className={cn("relative h-0 w-full", (hovered || isOpen) ? "z-[1000]" : "z-20")} ref={menuRef}>
            <div 
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center group/insert h-8" 
                style={{
                    marginLeft: '-3rem',
                    marginRight: '-3rem',
                    paddingLeft: '3rem',
                    paddingRight: '3rem',
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
                            "absolute left-1/2 -translate-x-1/2 w-56 rounded-xl border shadow-xl py-1.5 z-[1001] animate-in fade-in zoom-in-95 duration-100",
                            isLast ? "bottom-full mb-1" : "top-full mt-1",
                            isDark ? "bg-[#1f1f1f] border-[#333]" : "bg-white border-[#e5e5e5]"
                        )}
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
                        <div className={cn("my-1 border-t", isDark ? "border-[#333]" : "border-[#f0f0f0]")} />
                        <button
                            onClick={() => { onAdd('template' as any); onClose(); setHovered(false); }}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 text-[12px] transition-colors font-semibold group",
                                isDark ? "text-[var(--primary-color)] hover:bg-white/5" : "text-[var(--primary-color)] hover:bg-[#f5f5f5]"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <LayoutTemplate size={13} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                                Browse Templates
                            </div>
                            <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded font-semibold",
                                isDark ? "bg-[var(--primary-color)]/20 text-[var(--primary-color)]" : "bg-[var(--primary-color)]/10 text-[var(--primary-color)]"
                            )}>
                                Saved
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

