"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, ChevronDown, Link2, MoreHorizontal, Trash2, Copy,
    Check, Settings, Palette, ChevronRight, Plus, Search,
    Type, AlignLeft, ChevronDown as ChevronDownIcon, SquareCheck,
    Image, Upload, Mail, Phone, User, MapPin, Globe, Hash,
    Sliders as SlidersIcon, Calendar, LinkIcon, PenLine, Filter,
    GripVertical, X, Download, Eye, Monitor, Smartphone, LayoutTemplate,
    LayoutGrid, List, ArrowUpDown, ExternalLink,
    Image as ImageIcon, SeparatorHorizontal, FileText,
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { InlineDeleteButton } from '@/components/ui/InlineDeleteButton';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn, getBackgroundImageWithOpacity } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useFormStore, FormStatus, FormField, FormFieldType } from '@/store/useFormStore';
import { useTemplateStore, Template } from '@/store/useTemplateStore';
import { useDebounce } from '@/hooks/useDebounce';
import { DesignSettingsPanel } from '@/components/ui/DesignSettingsPanel';
import { CountryPicker } from '@/components/ui/CountryPicker';
import ImageUploadModal from '@/components/modals/ImageUploadModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { DEFAULT_DOCUMENT_DESIGN, DocumentDesign } from '@/types/design';
import { appToast } from '@/lib/toast';
import { v4 as uuidv4 } from 'uuid';
import DatePicker from '@/components/ui/DatePicker';
import { Tooltip } from '@/components/ui/Tooltip';

/* ══════════════════════════════════════════════════════════
   FIELD TYPE CONFIG
══════════════════════════════════════════════════════════ */
interface FieldTypeDef {
    type: FormFieldType;
    label: string;
    icon: React.ReactNode;
    section: 'input' | 'contact' | 'media';
    defaultLabel: string;
}

const FIELD_TYPES: FieldTypeDef[] = [
    // Input section
    { type: 'short_text',    label: 'Short text',     icon: <Type size={14} />,          section: 'input',   defaultLabel: 'Short answer' },
    { type: 'long_text',     label: 'Long text',      icon: <AlignLeft size={14} />,     section: 'input',   defaultLabel: 'Long answer' },
    { type: 'dropdown',      label: 'Dropdown',       icon: <ChevronDownIcon size={14} />, section: 'input', defaultLabel: 'Select option' },
    { type: 'multi_choice',  label: 'Multi choice',   icon: <SquareCheck size={14} />,   section: 'input',   defaultLabel: 'Multiple choice' },
    { type: 'picture_choice',label: 'Picture choice', icon: <Image size={14} />,         section: 'input',   defaultLabel: 'Picture choice' },
    { type: 'file_upload',   label: 'File upload',    icon: <Upload size={14} />,        section: 'input',   defaultLabel: 'Upload file' },
    { type: 'number',        label: 'Number',         icon: <Hash size={14} />,          section: 'input',   defaultLabel: 'Enter number' },
    { type: 'slider',        label: 'Slider',         icon: <SlidersIcon size={14} />,   section: 'input',   defaultLabel: 'Slide to select' },
    { type: 'date',          label: 'Date',           icon: <Calendar size={14} />,      section: 'input',   defaultLabel: 'Select date' },
    { type: 'link',          label: 'Link',           icon: <LinkIcon size={14} />,      section: 'input',   defaultLabel: 'Enter URL' },
    { type: 'signature',     label: 'Signature',      icon: <PenLine size={14} />,       section: 'input',   defaultLabel: 'Sign here' },
    // Contact section
    { type: 'email',         label: 'Email address',  icon: <Mail size={14} />,          section: 'contact', defaultLabel: 'Email address' },
    { type: 'phone',         label: 'Phone number',   icon: <Phone size={14} />,         section: 'contact', defaultLabel: 'Phone number' },
    { type: 'full_name',     label: 'Full name',      icon: <User size={14} />,          section: 'contact', defaultLabel: 'Full name' },
    { type: 'address',       label: 'Address',        icon: <MapPin size={14} />,        section: 'contact', defaultLabel: 'Address' },
    { type: 'countries',     label: 'Countries',      icon: <Globe size={14} />,         section: 'contact', defaultLabel: 'Select country' },
];

/* ══════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════ */
type EditorTab  = 'editor' | 'responses';
type CanvasStep = 'intro' | 'form' | 'confirmation';
type RightTab   = 'details' | 'design';

interface FormMeta {
    activationDate: string;
    expirationDate: string;
    submissionLimit: number | null;
    project: string;
    confirmationMessage: string;
    logoUrl: string;
    design: DocumentDesign;
    confirmationBlocks?: any[];
    description?: string;
}

const DEFAULT_META: FormMeta = {
    activationDate: '',
    expirationDate: '',
    submissionLimit: null,
    project: '',
    confirmationMessage: "Thank you for your submission! We'll be in touch soon.",
    logoUrl: '',
    design: DEFAULT_DOCUMENT_DESIGN,
};

const STATUS_OPTS: FormStatus[] = ['Draft', 'Active', 'Inactive'];
const STATUS_COLORS: Record<FormStatus, string> = {
    Active: '#22c55e',
    Draft: '#888',
    Inactive: '#f97316',
};

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function SectionAccordion({ label, icon, isDark, children, defaultOpen = true }: {
    label: string; icon: React.ReactNode; isDark: boolean; children: React.ReactNode; defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={cn("border-b last:border-b-0", isDark ? "border-[#252525]" : "border-[#f0f0f0]")}>
            <button onClick={() => setOpen(v => !v)}
                className={cn("w-full flex items-center justify-between px-4 py-3 text-[11.5px] font-semibold transition-colors",
                    isDark ? "text-[#666] hover:text-[#aaa]" : "text-[#aaa] hover:text-[#555]")}>
                <div className="flex items-center gap-2">{icon}{label}</div>
                <ChevronRight size={11} className={cn("transition-transform", open && "rotate-90")} />
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                    {children}
                </div>
            )}
        </div>
    );
}

function PanelInput({ value, onChange, placeholder, type = 'text', isDark }: {
    value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; isDark: boolean;
}) {
    return (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className={cn("w-full px-3 py-2 text-[12px] rounded-lg border outline-none transition-all bg-white text-[#111] placeholder:text-[#ccc]",
                isDark ? "border-[#2a2a2a]" : "border-[#e5e5e5]"
            )} />
    );
}

/* ── HELPERS ── */
const isColorDark = (color: string) => {
    if (!color) return false;
    if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
    }
    return false;
};

/* ── Field preview in canvas ── */
function FieldPreview({ field, isDark, isSelected, onClick, onRemove, primaryColor, isPreview, borderRadius, marginTop, marginBottom, blockBackgroundColor }: {
    field: FormField; isDark: boolean; isSelected: boolean; onClick: (e: React.MouseEvent) => void;
    onRemove: () => void; primaryColor: string; isPreview?: boolean; borderRadius: number;
    marginTop?: number; marginBottom?: number; blockBackgroundColor?: string;
}) {
    const {
        attributes, listeners, setNodeRef,
        transform, transition, isDragging
    } = useSortable({ id: field.id, disabled: !!isPreview });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    const renderInput = () => {
        const inputProps = {
            readOnly: !isPreview,
            disabled: !isPreview,
            className: cn("w-full px-3 py-2 text-[13px] border outline-none transition-all",
                isDark ? "bg-white/[0.03] border-[#333] text-[#ddd]" : "bg-black/[0.02] border-[#e5e5e5] text-[#111]",
                isPreview ? "focus:border-[var(--primary-color)]" : "pointer-events-none"
            ),
            style: { 
                borderRadius: `${Math.max(0, borderRadius - 6)}px`,
                backgroundColor: blockBackgroundColor ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') : undefined
            }
        };

        switch (field.type) {
            case 'long_text':
                return <textarea rows={3} placeholder={field.placeholder || 'Type your answer...'}
                    {...inputProps} className={cn(inputProps.className, "resize-none")} />;
            case 'dropdown':
                return (
                    <div className={cn(inputProps.className, "flex items-center justify-between", isPreview && "cursor-pointer")}>
                        <span className="opacity-60">{field.placeholder || 'Select an option'}</span>
                        <ChevronDown size={12} className="opacity-40" />
                    </div>
                );
            case 'multi_choice':
                return (
                    <div className="space-y-2">
                        {(field.options || ['Option 1', 'Option 2', 'Option 3']).slice(0, 3).map((opt, i) => (
                            <label key={i} className={cn("flex items-center gap-2.5", isPreview ? "cursor-pointer" : "cursor-default")}>
                                <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all", 
                                    isDark ? "border-[#333]" : "border-[#ddd]")} />
                                <span className={cn("text-[13px]", isDark ? "text-[#999]" : "text-[#555]")}>{opt}</span>
                            </label>
                        ))}
                    </div>
                );
            case 'countries':
                return (
                    <div className={cn(!isPreview && "pointer-events-none opacity-80")}>
                         <CountryPicker value="" onChange={() => {}} isDark={isDark} label={field.label} placeholder={field.placeholder || "Select country"} minimal />
                    </div>
                );
            case 'slider':
                return (
                    <div className="space-y-1">
                        <input type="range" min={field.min || 0} max={field.max || 100} defaultValue={50}
                            className={cn("w-full", isPreview ? "cursor-pointer" : "pointer-events-none")}
                            disabled={!isPreview} />
                        <div className={cn("flex justify-between text-[10px]", isDark ? "text-[#555]" : "text-[#ccc]")}>
                            <span>{field.min || 0}</span><span>{field.max || 100}</span>
                        </div>
                    </div>
                );
            case 'signature':
                return (
                    <div className={cn("w-full h-20 border-2 border-dashed flex items-center justify-center transition-all",
                        isPreview ? "cursor-crosshair hover:bg-black/5" : "opacity-60",
                        isDark ? "border-[#333] text-[#555]" : "border-[#e5e5e5] text-[#ccc]")}
                        style={{ borderRadius: `${Math.max(0, borderRadius - 4)}px` }}>
                        <span className="text-[12px]">Sign here</span>
                    </div>
                );
            case 'file_upload':
                return (
                    <div className={cn("w-full py-6 border-2 border-dashed flex flex-col items-center gap-2 transition-all",
                        isPreview ? "cursor-pointer hover:bg-black/5" : "opacity-60",
                        isDark ? "border-[#333] text-[#555]" : "border-[#e5e5e5] text-[#ccc]")}
                        style={{ borderRadius: `${Math.max(0, borderRadius - 4)}px` }}>
                        <Upload size={18} />
                        <span className="text-[12px]">Click to upload or drag & drop</span>
                    </div>
                );
            case 'date':
                return (
                    <DatePicker 
                        value="" 
                        onChange={() => {}} 
                        className="!h-[38px]" 
                        isDark={isDark} 
                        placeholder={field.placeholder || 'Select date'} 
                        disabled={!isPreview} 
                    />
                );
            default:
                return (
                    <input type="text" placeholder={field.placeholder || 'Type your answer...'} 
                        {...inputProps} />
                );
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={{ 
                ...style, 
                borderRadius: `${borderRadius}px`,
                marginTop: `${marginTop}px`,
                marginBottom: `${marginBottom}px`,
                backgroundColor: blockBackgroundColor || (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)')
            }}
            onClick={onClick}
            className={cn(
                "group relative p-4 border-2 transition-all mx-1",
                isPreview ? "cursor-default" : "cursor-pointer",
                isSelected
                    ? "border-primary/50 shadow-[0_0_0_3px_rgba(77,191,57,0.08)]"
                    : (isDark ? "border-transparent hover:border-[#333]" : "border-transparent hover:border-[#ebebeb]"),
                isDragging && "opacity-50"
            )}>
            
            {/* Required badge */}
            {field.required && (
                <span className="absolute top-2 right-12 text-[10px] font-bold text-red-400">Required</span>
            )}

            {/* Remove button */}
            {!isPreview && (
                <button
                    onClick={e => { e.stopPropagation(); onRemove(); }}
                    className={cn("absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                        isDark ? "bg-white/5 text-[#666] hover:text-red-400" : "bg-[#f5f5f5] text-[#bbb] hover:text-red-400")}>
                    <X size={11} />
                </button>
            )}

            {/* Drag handle */}
            {!isPreview && (
                <div 
                    {...attributes}
                    {...listeners}
                    className={cn("absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1",
                        isDark ? "text-[#666]" : "text-[#ccc]")}>
                    <GripVertical size={12} />
                </div>
            )}

            <div className={cn(isPreview ? "pl-0" : "pl-4")}>
                <div className="mb-3">
                    <div className={cn("text-[13px] font-bold mb-1.5 px-2 py-0.5 inline-block", isDark ? "text-[#eee]" : "text-[#111]")}
                         style={{ borderRadius: `${Math.max(0, borderRadius - 8)}px`, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                        {field.label} {field.required && <span className="text-red-500 ml-1 mt-1">*</span>}
                    </div>
                    {field.description && (
                        <div className={cn("text-[11px] opacity-60 px-2 mt-0.5", isDark ? "text-[#aaa]" : "text-[#555]")}>
                            {field.description}
                        </div>
                    )}
                </div>

                {renderInput()}
            </div>
        </div>
    );
}

/* ── Field type pill in picker ── */
function FieldTypePill({ def, onAdd, isDark, borderRadius }: { def: FieldTypeDef; onAdd: () => void; isDark: boolean; borderRadius: number }) {
    return (
        <button
            onClick={onAdd}
            className={cn(
                "flex flex-col items-center gap-1.5 p-3 border transition-all group",
                isDark
                    ? "border-[#2a2a2a] bg-[#111] text-[#666] hover:border-[#333] hover:text-[#ccc] hover:bg-[#1a1a1a]"
                    : "border-[#ebebeb] bg-white text-[#bbb] hover:border-primary/30 hover:text-[#555] hover:shadow-sm"
            )}
            style={{ borderRadius: `${Math.max(0, borderRadius - 2)}px` }}>
            <div className="transition-transform group-hover:scale-110">{def.icon}</div>
            <span className="text-[10px] font-semibold text-center leading-tight">{def.label}</span>
        </button>
    );
}
/* ── Insert Area ── */
function FieldInsertArea({ index, totalFields, openIndex, setOpenIndex, onAdd, isDark, primaryColor, borderRadius, hideLine, centered }: {
    index: number; totalFields: number; openIndex: number | null; setOpenIndex: (i: number | null) => void;
    onAdd: (def: FieldTypeDef, idx: number) => void; isDark: boolean; primaryColor: string;
    borderRadius: number; hideLine?: boolean; centered?: boolean;
}) {
    const isOpen = openIndex === index;
    const [hovered, setHovered] = useState(false);
    const visible = hovered || isOpen;
    const pickerRef = useRef<HTMLDivElement>(null);

    // Open upwards if we are at the bottom or if the form is empty
    const openUp = index === totalFields;

    useEffect(() => {
        if (!isOpen) return;
        const h = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setOpenIndex(null);
            }
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [isOpen, setOpenIndex]);

    return (
        <div 
            className="relative flex items-center group/insert h-[24px]"
            style={{
                marginLeft: '-2rem',
                marginRight: '-2rem',
                paddingLeft: '2rem',
                paddingRight: '2rem',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { if (!isOpen) setHovered(false); }}
        >
            {/* Dashed line */}
            {!hideLine && (
                <div className={cn(
                    "absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center transition-all duration-150",
                    visible ? "opacity-100 translate-y-[-50%]" : "opacity-0 translate-y-[20%] pointer-events-none"
                )}>
                    <div className={cn(
                        "flex-1 border-t border-dashed",
                        isDark ? "border-[#363636]" : "border-[#d8d8d8]"
                    )} />
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpenIndex(isOpen ? null : index); }}
                        className={cn(
                            "mx-2 w-5 h-5 flex items-center justify-center border transition-all shrink-0 shadow-sm",
                            isOpen
                                ? "bg-[var(--primary-color)] border-[var(--primary-color)] text-white"
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
            )}

            {/* Field type picker popup */}
            {isOpen && (
                <div 
                    ref={pickerRef}
                    className={cn(
                        "absolute left-1/2 -translate-x-1/2 w-[540px] p-4 border shadow-2xl z-[100] animate-in zoom-in-95 duration-150", 
                        centered ? "top-1/2 -translate-y-1/2" : (openUp ? "bottom-full mb-2" : "top-full mt-2"),
                        isDark ? "bg-[#181818] border-[#333]" : "bg-white border-[#ebebeb]"
                    )}
                    style={{ borderRadius: `${borderRadius}px` }}
                >
                    <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                        {/* Contacts Section */}
                        <div>
                            <div className={cn(
                                "px-2 pb-2 text-[9px] font-bold uppercase tracking-widest sticky top-0 z-10 py-1 text-left",
                                isDark ? "bg-[#181818] text-[#555]" : "bg-white text-[#bbb]"
                            )}>
                                Contact Info
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {FIELD_TYPES.filter(ft => ft.section === 'contact').map(ft => (
                                    <FieldTypePill key={ft.type} def={ft} onAdd={() => { onAdd(ft, index); setOpenIndex(null); }} isDark={isDark} borderRadius={borderRadius} />
                                ))}
                            </div>
                        </div>

                        {/* Inputs Section */}
                        <div>
                            <div className={cn(
                                "px-2 pb-2 text-[9px] font-bold uppercase tracking-widest sticky top-0 z-10 py-1 text-left",
                                isDark ? "bg-[#181818] text-[#555]" : "bg-white text-[#bbb]"
                            )}>
                                Inputs
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {FIELD_TYPES.filter(ft => ft.section === 'input').map(ft => (
                                    <FieldTypePill key={ft.type} def={ft} onAdd={() => { onAdd(ft, index); setOpenIndex(null); }} isDark={isDark} borderRadius={borderRadius} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   MAIN EDITOR
══════════════════════════════════════════════════════════ */
export default function FormEditor({ id, isTemplate }: { id?: string, isTemplate?: boolean }) {
    const router = useRouter();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { 
        forms, updateForm, deleteForm, fetchForms, 
        responses, fetchResponses, bulkDeleteResponses 
    } = useFormStore();
    const { templates, updateTemplate: updateTemplateInStore, addTemplate, fetchTemplates } = useTemplateStore();

    const [title, setTitle] = useState('New Form');
    const [status, setStatus] = useState<FormStatus>('Draft');
    const [fields, setFields] = useState<FormField[]>([]);
    const [meta, setMeta] = useState<FormMeta>(DEFAULT_META);
    const [isLoaded, setIsLoaded] = useState(false);
    const isFirst = useRef(true);

    useEffect(() => {
        setIsLoaded(false);
        isFirst.current = true;
    }, [id]);

    const [editorTab, setEditorTab] = useState<EditorTab>('editor');
    const [canvasStep, setCanvasStep] = useState<CanvasStep>('form');
    const [rightTab, setRightTab] = useState<RightTab>('details');
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [openInsertMenu, setOpenInsertMenu] = useState<number | null>(null);
    const [responsesView, setResponsesView] = useState<'cards' | 'table'>('cards');
    const [responsesSearch, setResponsesSearch] = useState('');
    const [responsesOrderBy, setResponsesOrderBy] = useState<'recent' | 'oldest' | 'name'>('recent');
    const [orderOpen, setOrderOpen] = useState(false);
    const [selectedConfirmationBlockId, setSelectedConfirmationBlockId] = useState<string | null>(null);
    const [openBlockInsertMenu, setOpenBlockInsertMenu] = useState<number | null>(null);
    const [pickerTab, setPickerTab] = useState<'input' | 'contact'>('input');
    const [pickerSearch, setPickerSearch] = useState('');
    const [showStatus, setShowStatus] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [copied, setCopied] = useState(false);
    const [imageUploadOpen, setImageUploadOpen] = useState(false);
    const [uploadTarget, setUploadTarget] = useState<'logo' | 'background'>('logo');
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isResponsesDeleteOpen, setIsResponsesDeleteOpen] = useState(false);
    const [isPreview, setIsPreview] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [selectedResponseIds, setSelectedResponseIds] = useState<Set<string>>(new Set());


    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setFields((items) => {
                const oldIndex = items.findIndex((f) => f.id === active.id);
                const newIndex = items.findIndex((f) => f.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }, []);

    const statusRef = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);
    const metaRef = useRef(meta);
    useEffect(() => { metaRef.current = meta; }, [meta]);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (statusRef.current && !statusRef.current.contains(e.target as Node)) setShowStatus(false);
            if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setShowActions(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    useEffect(() => { 
        if (isTemplate) fetchTemplates();
        else fetchForms(); 
    }, [fetchForms, fetchTemplates, isTemplate]);

    useEffect(() => {
        if (!id || isLoaded) return;
        
        if (isTemplate) {
            if (templates.length === 0) return;
            const t = templates.find((t: Template) => t.id === id);
            if (!t) return;
            setTitle(t.name);
            setStatus('Draft'); 
            if (t.meta && typeof t.meta === 'object') {
                const m = { ...DEFAULT_META, ...(t.meta as any) };
                if (!m.confirmationBlocks || m.confirmationBlocks.length === 0) {
                    m.confirmationBlocks = [
                        { id: 'b1', type: 'success' },
                        { id: 'b2', type: 'heading', content: 'Thanks!', level: 2 },
                        { id: 'b3', type: 'text', content: m.confirmationMessage || "Thank you for your submission! We'll be in touch soon." }
                    ];
                }
                setMeta(m);
            } else if (t.design) {
                setMeta(prev => ({ ...prev, design: t.design }));
            }
            setIsLoaded(true);
            return;
        }

        if (forms.length === 0) return;
        const f = forms.find(f => f.id === id);
        if (!f) return;
        
        console.log(`[FormEditor] Loading form "${f.title}" (${id}) with ${f.fields?.length || 0} fields`);
        
        setTitle(f.title);
        setStatus(f.status);
        if (Array.isArray(f.fields)) setFields(f.fields);
        if (f.meta) {
            const m = f.meta as any;
            if (!m.confirmationBlocks || m.confirmationBlocks.length === 0) {
                // Initialize defaults if empty
                m.confirmationBlocks = [
                    { id: 'b1', type: 'success' },
                    { id: 'b2', type: 'heading', content: 'Thanks!', level: 2 },
                    { id: 'b3', type: 'text', content: m.confirmationMessage || "Thank you for your submission! We'll be in touch soon." }
                ];
            }
            setMeta(m);
        }
        setIsLoaded(true);
        if (id) fetchResponses(id);
    }, [id, forms, templates, isLoaded, fetchResponses, isTemplate]);

    const debouncedTitle   = useDebounce(title, 1000);
    const debouncedStatus  = useDebounce(status, 500);
    const debouncedFields  = useDebounce(fields, 1000);
    const debouncedMeta    = useDebounce(meta, 1000);

    useEffect(() => {
        if (isFirst.current || !isLoaded || !id) {
            if (isLoaded) isFirst.current = false;
            return;
        }
        // Safety: Don't save if we are in an inconsistent state
        if (!id || !isLoaded) return;

        console.log(`[FormEditor] Auto-saving ${isTemplate ? 'template' : 'form'} "${debouncedTitle}" with ${debouncedFields.length} fields`);

        if (isTemplate) {
            updateTemplateInStore(id, {
                name: debouncedTitle,
                blocks: debouncedFields,
                design: debouncedMeta.design,
                meta: debouncedMeta as any
            })
            .then(() => appToast.success('Template saved', undefined, { id: `save-template-${id}`, duration: 1500 }))
            .catch(() => appToast.error('Save failed', undefined, { id: `save-template-${id}`, duration: 3000 }));
        } else {
            updateForm(id, { title: debouncedTitle, status: debouncedStatus, fields: debouncedFields, meta: debouncedMeta as any })
                .then(() => appToast.success('Changes saved', undefined, { id: `save-form-${id}`, duration: 1500 }))
                .catch(() => appToast.error('Save failed', undefined, { id: `save-form-${id}`, duration: 3000 }));
        }
    }, [debouncedTitle, debouncedStatus, debouncedFields, debouncedMeta, id, isLoaded, updateForm, isTemplate, updateTemplateInStore]);

    const updateMeta = useCallback((patch: Partial<FormMeta>) => {
        setMeta(prev => ({ ...prev, ...patch }));
    }, []);

    const addField = (def: FieldTypeDef, index?: number) => {
        const newField: FormField = {
            id: uuidv4(),
            type: def.type,
            label: def.defaultLabel,
            required: false,
            placeholder: '',
        };
        setFields(prev => {
            if (index !== undefined) {
                const next = [...prev];
                next.splice(index, 0, newField);
                return next;
            }
            return [...prev, newField];
        });
        setSelectedFieldId(newField.id);
        setCanvasStep('form');
    };

    const addConfirmationBlock = (type: string, index: number) => {
        const newBlock = { id: uuidv4(), type, content: type === 'heading' ? 'New Heading' : 'New text block' };
        const next = [...(meta.confirmationBlocks || [])];
        next.splice(index, 0, newBlock);
        updateMeta({ confirmationBlocks: next });
        setSelectedConfirmationBlockId(newBlock.id);
    };

    const removeField = (fieldId: string) => {
        setFields(prev => prev.filter(f => f.id !== fieldId));
        if (selectedFieldId === fieldId) setSelectedFieldId(null);
    };

    const updateField = (fieldId: string, patch: Partial<FormField>) => {
        setFields(prev => prev.map(f => f.id === fieldId ? { ...f, ...patch } : f));
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.origin + '/p/form/' + id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    const handleDelete = async () => {
        if (!id) return;
        if (isTemplate) {
            await useTemplateStore.getState().deleteTemplate(id);
            appToast.success('Template Deleted');
            router.push('/templates');
        } else {
            await deleteForm(id);
            appToast.success('Form Deleted', 'Your form has been permanently removed');
            router.push('/forms');
        }
    };

    const handleSaveAsTemplate = async () => {
        const success = await addTemplate({
            name: `${title} (Copy)`,
            entity_type: 'form',
            blocks: fields,
            design: meta.design,
            meta: meta as any,
            is_default: false
        });
        if (success) {
            appToast.success('Saved as Template', 'You can find it in the Templates vault');
        }
    };

    const selectedField = fields.find(f => f.id === selectedFieldId);
    const design = meta.design || DEFAULT_DOCUMENT_DESIGN;
    const primaryColor = design.primaryColor || '#4dbf39';
    const isFormDark = isColorDark(design.blockBackgroundColor || '#fff');

    const filteredFieldTypes = FIELD_TYPES.filter(ft => {
        if (pickerSearch && !ft.label.toLowerCase().includes(pickerSearch.toLowerCase())) return false;
        if (!pickerSearch && ft.section !== pickerTab) return false;
        return true;
    });

    // --- Shared UI Helpers for Responses Tab ---
    function ResponseCardRow({ label, value, isDark }: { label: string; value?: string | null; isDark: boolean }) {
        if (!value) return null;
        return (
            <div className={cn(
                "flex items-center gap-0 border-t py-1.5 px-4",
                isDark ? "border-white/[0.03]" : "border-dashed border-[#e8e8e8]"
            )}>
                <span className={cn("text-[10px] uppercase font-bold tracking-wider shrink-0 w-[80px]", isDark ? "text-[#555]" : "text-[#aaa]")}>{label}</span>
                <span className={cn("text-[11px] truncate font-medium flex-1", isDark ? "text-[#bbb]" : "text-[#333]")}>{value}</span>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleCopyValue(value); }}
                    className={cn("opacity-0 group-hover/row:opacity-100 transition-all p-1 ml-1", isDark ? "text-white/40" : "text-black/40")}
                >
                    <Copy size={9} />
                </button>
            </div>
        );
    }

    function ResponseTbBtn({ label, icon, active, onClick, isDark, hasArrow }: { label: string; icon?: React.ReactNode; active?: boolean; onClick?: () => void; isDark: boolean; hasArrow?: boolean; }) {
        return (
            <button onClick={onClick} className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded transition-all",
                active
                    ? (isDark ? "bg-white/10 text-white shadow-sm" : "bg-black/5 text-black shadow-sm")
                    : (isDark ? "text-[#666] hover:text-[#aaa] hover:bg-white/5" : "text-[#777] hover:text-black hover:bg-black/5")
            )}>
                {icon}
                <span>{label}</span>
                {hasArrow && <ChevronDown size={11} className={cn("opacity-40 transition-transform", active ? "rotate-180" : "rotate-0")} />}
            </button>
        );
    }

    function ResponseDropdown({ open, onClose, isDark, children }: { open: boolean; onClose: () => void; isDark: boolean; children: React.ReactNode }) {
        const ref = React.useRef<HTMLDivElement>(null);
        React.useEffect(() => {
            if (!open) return;
            const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
            document.addEventListener('mousedown', h);
            return () => document.removeEventListener('mousedown', h);
        }, [open, onClose]);
        if (!open) return null;
        return (
            <div ref={ref} className={cn("absolute top-full left-0 mt-1 z-50 min-w-[160px] rounded-xl border shadow-xl overflow-hidden",
                isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]")}>
                {children}
            </div>
        );
    }

    function ResponseDItem({ label, active, onClick, isDark }: { label: string; active?: boolean; onClick: () => void; isDark: boolean }) {
        return (
            <button onClick={onClick} className={cn("w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] transition-colors text-left",
                active
                    ? isDark ? "bg-white/8 text-white font-medium" : "bg-black/5 text-[#111] font-medium"
                    : isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-black/[0.02]")}>
                <span className="flex-1">{label}</span>
                {active && <Check size={11} className="text-primary" />}
            </button>
        );
    }

    const filteredResponses = useMemo(() => {
        let items = [...responses];

        // Search
        if (responsesSearch) {
            const s = responsesSearch.toLowerCase();
            items = items.filter(r => 
                Object.values(r.data).some(v => String(v).toLowerCase().includes(s))
            );
        }

        // Sort
        items.sort((a, b) => {
            if (responsesOrderBy === 'name') {
                const getIdentity = (r: any) => {
                    const found = Object.entries(r.data).find(([qid]) => {
                        const f = fields.find(field => field.id === qid);
                        return f?.type === 'full_name' || f?.label?.toLowerCase().includes('name');
                    });
                    return String(found?.[1] || '').toLowerCase();
                };
                return getIdentity(a).localeCompare(getIdentity(b));
            }
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            return responsesOrderBy === 'recent' ? timeB - timeA : timeA - timeB;
        });

        return items;
    }, [responses, responsesSearch, responsesOrderBy, fields]);

    const handleCopyValue = (val: string) => {
        navigator.clipboard.writeText(val);
        appToast.success('Copied', 'Response data copied to clipboard');
    };

    const handleCopyAll = (data: Record<string, any>) => {
        const text = Object.entries(data).map(([qid, val]) => {
            const f = fields.find(field => field.id === qid);
            const str = Array.isArray(val) ? val.join(', ') : (typeof val === 'object' ? JSON.stringify(val) : String(val || ''));
            return `${f?.label || qid}: ${str}`;
        }).join('\n');
        navigator.clipboard.writeText(text);
        appToast.success('Copied', 'All response data copied');
    };

    const toggleResponseSelection = (rid: string) => {
        const next = new Set(selectedResponseIds);
        if (next.has(rid)) next.delete(rid);
        else next.add(rid);
        setSelectedResponseIds(next);
    };

    const handleBulkDeleteResponses = () => {
        if (!selectedResponseIds.size) return;
        setIsResponsesDeleteOpen(true);
    };

    const confirmBulkDeleteResponses = async () => {
        const ids = Array.from(selectedResponseIds);
        await bulkDeleteResponses(ids);
        setSelectedResponseIds(new Set());
        setIsResponsesDeleteOpen(false);
        appToast.success('Deleted', `${ids.length} selected responses removed`);
    };

    const handleBulkExportResponses = () => {
        if (selectedResponseIds.size === 0) return;
        const selected = responses.filter(r => selectedResponseIds.has(r.id));
        const header = ["Date", ...fields.map(f => `"${f.label.replace(/"/g, '""')}"`)].join(",");
        const rows = selected.map(r => {
            const date = `"${new Date(r.created_at).toLocaleString()}"`;
            const cols = fields.map(f => {
                const val = r.data?.[f.id];
                const str = Array.isArray(val) ? val.join(', ') : (typeof val === 'object' ? JSON.stringify(val) : String(val || ''));
                return `"${str.replace(/"/g, '""')}"`;
            });
            return [date, ...cols].join(",");
        });
        const csv = [header, ...rows].join("\n");
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `responses-selected-${id}.csv`;
        a.click();
        appToast.success(`Exported ${selected.length} response${selected.length !== 1 ? 's' : ''}`);
    };

    const STEPS: { id: CanvasStep; label: string; disabled?: boolean }[] = [
        { id: 'form', label: 'Form' },
        { id: 'confirmation', label: 'Confirmation' },
    ];

    return (
        <div className={cn("flex flex-col h-full w-full overflow-hidden font-sans text-[13px]",
            isDark ? "bg-[#141414] text-[#e5e5e5]" : "bg-white text-[#111]")}>

            {/* ── TOP BAR ── */}
            <div className={cn(
                "flex items-center justify-between px-3 md:px-6 py-2.5 border-b shrink-0",
                isDark ? "bg-[#141414] border-[#252525]" : "bg-white border-[#e4e4e4]"
            )}>
                <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    <button onClick={() => router.push('/forms')}
                        className={cn("flex items-center justify-center w-8 h-8 shrink-0 rounded-[8px] transition-all",
                            isDark ? "text-[#666] hover:text-[#ccc] bg-[#222]" : "text-[#888] hover:text-[#111] bg-[#f0f0f0] hover:bg-[#e8e8e8]")}>
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className={cn("hidden md:flex items-center gap-2 text-[13px] font-medium shrink-0",
                            isDark ? "text-white/40" : "text-gray-400")}>
                            <span>{isTemplate ? 'Templates' : 'Forms'}</span>
                            <span className="opacity-30">/</span>
                        </div>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                            className={cn("text-[13px] font-semibold bg-transparent outline-none w-full min-w-0",
                                isDark ? "text-white/90 placeholder:text-white/20" : "text-gray-900 placeholder:text-gray-300")}
                            placeholder="Form Name" />
                    </div>
                </div>

                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                    {/* Status */}
                    {!isTemplate && (
                        <div className="relative hidden md:flex" ref={statusRef}>
                            <button onClick={() => setShowStatus(v => !v)}
                                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium border",
                                    isDark ? "bg-white/[0.06] text-[#aaa] border-white/10" : "bg-[#f5f5f5] text-[#555] border-[#e5e5e5]")}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[status] }} />
                                {status}
                                <ChevronDown size={12} className="ml-1 opacity-50" />
                            </button>
                            {showStatus && (
                                <div className={cn("absolute right-0 top-full mt-1.5 w-36 rounded-[10px] shadow-xl py-1 z-50 border",
                                    isDark ? "bg-[#0c0c0c] border-[#222]" : "bg-white border-[#e4e4e4]")}>
                                    {STATUS_OPTS.map(s => (
                                        <button key={s} onClick={() => { setStatus(s); setShowStatus(false); }}
                                            className={cn("w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors",
                                                isDark ? "hover:bg-white/5 text-[#ccc]" : "hover:bg-[#f5f5f5] text-[#333]",
                                                status === s ? "font-semibold" : ""
                                            )}>
                                            {status === s ? <Check size={12} className="text-emerald-500" /> : <div className="w-3" />}
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {!isTemplate && <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-0.5 hidden md:block" />}


                    <button
                        onClick={() => {
                            if (isPreview) setIsPreview(false);
                            else { setIsPreview(true); setPreviewMode('desktop'); }
                        }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 h-[32px] rounded-[8px] text-[12px] font-bold transition-all",
                            isPreview
                                ? "bg-primary text-primary-foreground hover:bg-primary-hover"
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
                                className={cn("p-1.5 rounded-[6px] transition-colors",
                                    previewMode === 'desktop' ? (isDark ? "bg-white/10 text-white" : "bg-black/5 text-black") : (isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60"))}
                            >
                                <Monitor size={14} />
                            </button>
                            <button
                                onClick={() => setPreviewMode('mobile')}
                                className={cn("p-1.5 rounded-[6px] transition-colors",
                                    previewMode === 'mobile' ? (isDark ? "bg-white/10 text-white" : "bg-black/5 text-black") : (isDark ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60"))}
                            >
                                <Smartphone size={14} />
                            </button>
                        </div>
                    )}

                    <button onClick={() => window.open(window.location.origin + '/p/form/' + id, '_blank')}
                        className={cn("hidden md:flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                            isDark ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]")}>
                        <ExternalLink size={14} />
                    </button>

                    <button onClick={copyLink}
                        className={cn("hidden md:flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                            isDark ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]")}>
                        {copied ? <Check size={14} className="text-primary" /> : <Link2 size={14} />}
                    </button>

                    <div className="relative" ref={actionsRef}>
                        <button onClick={() => setShowActions(v => !v)}
                            className={cn("flex items-center justify-center w-[32px] h-[32px] rounded-[8px] transition-all",
                                isDark ? "bg-[#2a2a2a] text-white/60 hover:text-white hover:bg-[#333]" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e8e8e8] hover:text-[#111]")}>
                            <MoreHorizontal size={14} />
                        </button>
                        {showActions && (
                            <div className={cn("absolute right-0 top-full mt-1.5 w-44 rounded-[10px] shadow-xl py-1 z-50 border",
                                isDark ? "bg-[#0c0c0c] border-[#222]" : "bg-white border-[#d2d2eb]")}>
                                {[
                                    { icon: ExternalLink, label: 'Open Link', action: () => !isTemplate && window.open(window.location.origin + '/p/form/' + id, '_blank'), hide: isTemplate },
                                    { icon: Link2, label: 'Copy Link', action: copyLink, hide: isTemplate },
                                    { icon: LayoutTemplate, label: 'Save as Template', action: handleSaveAsTemplate, hide: isTemplate },
                                    { icon: Trash2, label: 'Delete', action: handleDelete },
                                ].filter(i => !i.hide).map(({ icon: Icon, label, action }) => (
                                    <button key={label} onClick={() => { action(); setShowActions(false); }}
                                        className={cn("w-full flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors",
                                            label === 'Delete'
                                                ? "text-red-500 hover:bg-red-50"
                                                : isDark ? "hover:bg-white/5 text-[#ccc]" : "hover:bg-[#f5f5f5] text-[#333]"
                                        )}>
                                        <Icon size={14} className={label === 'Delete' ? "text-red-500" : "opacity-60"} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── SECONDARY TABS ── */}
            <div className={cn("flex items-center gap-0 px-4 md:px-6 border-b shrink-0",
                isDark ? "bg-[#111] border-[#252525]" : "bg-[#fafafa] border-[#ebebeb]")}>
                {([
                    ['editor', 'Editor'],
                    !isTemplate && ['responses', 'Responses'],
                ].filter(Boolean) as [EditorTab, string][]).map(([tab, label]) => (
                    <button key={tab} onClick={() => setEditorTab(tab)}
                        className={cn("px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-all",
                            editorTab === tab
                                ? "border-primary text-primary"
                                : (isDark ? "border-transparent text-[#555] hover:text-[#aaa]" : "border-transparent text-[#aaa] hover:text-[#555]")
                        )}>
                        {label}
                    </button>
                ))}
            </div>

            {/* ── BODY ── */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                {editorTab === 'editor' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Canvas + right panel row */}
                        <div className="flex-1 flex overflow-hidden min-h-0">
                            {/* CANVAS */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div
                                    className="flex-1 overflow-auto relative"
                                    onClick={() => setSelectedFieldId(null)}
                                    style={{
                                        backgroundColor: design.backgroundColor || '#f7f7f7',
                                        backgroundImage: getBackgroundImageWithOpacity(design.backgroundImage, design.backgroundColor || '#f7f7f7', design.backgroundImageOpacity),
                                        backgroundSize: 'cover',
                                        backgroundAttachment: 'fixed',
                                    }}>
                                    {/* Step breadcrumb */}
                                    <div className="z-30 flex justify-center sticky top-0 w-full pt-4 pb-6 pointer-events-none">
                                        <div className="relative z-10 flex items-center gap-1.5 pointer-events-auto">
                                            {STEPS.map((s, i) => (
                                                <React.Fragment key={s.id}>
                                                    {i > 0 && <ChevronRight size={11} className={isDark ? "text-white/20" : "text-black/20"} />}
                                                    <button
                                                        onClick={() => !s.disabled && setCanvasStep(s.id)}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-all border",
                                                            s.disabled && "cursor-not-allowed opacity-50",
                                                            canvasStep === s.id
                                                                ? "text-black border-transparent shadow-sm"
                                                                : (isDark ? "text-[#555] border-[#333] hover:text-[#aaa]" : "text-[#aaa] border-[#e5e5e5] hover:text-[#555]")
                                                        )}
                                                        style={canvasStep === s.id && !s.disabled ? { background: primaryColor } : undefined}
                                                    >
                                                        {s.label}
                                                        {s.disabled && <span className="ml-1 text-[9px] opacity-60">disabled</span>}
                                                    </button>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>

                                    <div 
                                        className={cn("flex flex-col items-center min-h-full", isPreview && previewMode === 'mobile' ? "py-8 px-4" : "pb-4 px-4 pt-2")}
                                        onClick={() => setSelectedFieldId(null)}
                                    >
                                        {isPreview && previewMode === 'mobile' ? (
                                            <div className="flex flex-col items-center">
                                                <div className={cn("relative rounded-[44px] border-[4px] overflow-hidden shrink-0 transition-all duration-300 bg-[#000] w-[390px] h-[844px]", isDark ? "border-[#1a1a1a] shadow-2xl" : "border-[#000] shadow-2xl")}>
                                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] rounded-b-[16px] z-10 bg-white/[0.05]" />
                                                    <div className="flex items-center justify-between px-8 pt-4 pb-2 text-[11px] font-medium z-10 relative opacity-40 text-white">
                                                        <span>9:41</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-4 h-2.5 rounded-[2px] border border-current opacity-50" />
                                                        </div>
                                                    </div>
                                                    <div className="absolute inset-0 top-[52px] pb-[34px] overflow-y-auto overflow-x-hidden scrollbar-none z-0"
                                                        style={{ backgroundColor: design.backgroundColor || (isDark ? '#080808' : '#f7f7f7') }}>
                                                        
                                                        {/* The main form content in mobile shell */}
                                                        <div className="pb-8 overflow-hidden"
                                                            style={{
                                                                backgroundColor: design.blockBackgroundColor || '#fff',
                                                                fontFamily: design.fontFamily || 'Inter',
                                                                borderRadius: `${design.borderRadius ?? 16}px`,
                                                            }}>
                                                            {canvasStep === 'form' && (
                                                                <div className="p-6">
                                                                    <div className="mb-10">
                                                                        {meta.logoUrl && <img src={meta.logoUrl} alt="Logo" className="mb-6 object-contain" style={{ height: `${design.logoSize || 40}px` }} />}
                                                                        <div className="text-[32px] font-bold leading-tight tracking-tight mb-2" style={{ color: isFormDark ? '#fff' : '#111' }}>{title}</div>
                                                                        {meta.description && <div className="text-[13.5px] opacity-60 max-w-[90%]" style={{ color: isFormDark ? '#aaa' : '#555' }}>{meta.description}</div>}
                                                                    </div>
                                                                    <div className="space-y-4">
                                                                        {fields.map(f => (
                                                                            <FieldPreview key={f.id} field={f} isDark={isFormDark} isSelected={false} onClick={() => {}} onRemove={() => {}} primaryColor={primaryColor} isPreview={true} borderRadius={design.borderRadius ?? 16} marginTop={design.marginTop} marginBottom={design.marginBottom} blockBackgroundColor={design.blockBackgroundColor} />
                                                                        ))}
                                                                    </div>
                                                                    {fields.length > 0 && <button 
                                                                        onClick={() => appToast.info("Please use the public link to test submissions")}
                                                                        className="mt-6 w-full py-3 font-bold text-[14px] text-black transition-all" 
                                                                        style={{ background: primaryColor, borderRadius: `${design.borderRadius ?? 16}px` }}>Submit</button>}
                                                                </div>
                                                            )}
                                                            {canvasStep === 'confirmation' && (
                                                                <div className="flex flex-col items-center text-center py-12 px-6 gap-4">
                                                                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-black shadow-lg" style={{ background: primaryColor }}><Check size={24} strokeWidth={2.5} /></div>
                                                                    <div>
                                                                        <div className="font-bold text-[18px] mb-2" style={{ color: isFormDark ? '#fff' : '#111' }}>Thanks!</div>
                                                                        <div className="text-[13px] text-center opacity-60" style={{ color: isFormDark ? '#aaa' : '#555' }}>{meta.confirmationMessage}</div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[100px] h-[4px] rounded-full z-10 bg-white/[0.05]" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full max-w-[620px] shadow-xl transition-all duration-300 relative"
                                                style={{
                                                    backgroundColor: design.blockBackgroundColor || '#fff',
                                                    boxShadow: design.blockShadow || '0 4px 20px -4px rgba(0,0,0,0.08)',
                                                    fontFamily: design.fontFamily || 'Inter',
                                                    borderRadius: `${design.borderRadius ?? 16}px`,
                                                    '--primary-color': primaryColor,
                                                    '--block-button-radius': `${Math.max(0, (design.borderRadius ?? 16) - 4)}px`,
                                                } as React.CSSProperties}>
                                            {canvasStep === 'form' && (
                                                <div className="p-8">
                                                    {/* Form header */}
                                                    <div className="mb-8">
                                                        {meta.logoUrl && (
                                                            <img src={meta.logoUrl} alt="Logo"
                                                                className="mb-4 object-contain"
                                                                style={{ height: `${design.logoSize || 40}px` }} />
                                                        )}
                                                        <div className="text-[28px] font-bold leading-tight tracking-tight mb-2" style={{ color: isFormDark ? '#fff' : '#111' }}>
                                                            {title}
                                                        </div>
                                                        {meta.description && <div className="text-[14px] opacity-60" style={{ color: isFormDark ? '#aaa' : '#555' }}>{meta.description}</div>}
                                                    </div>

                                                    {/* Fields */}
                                                    <DndContext 
                                                        sensors={sensors}
                                                        collisionDetection={closestCenter}
                                                        onDragEnd={handleDragEnd}
                                                    >
                                                        {fields.length === 0 ? (
                                                            <div className="space-y-0">
                                                                <div className={cn("flex flex-col items-center justify-center py-12 gap-3 border-2 border-dashed relative",
                                                                    isFormDark ? "border-[#333] text-[#444]" : "border-[#ebebeb] text-[#ccc]")}
                                                                    style={{ borderRadius: `${design.borderRadius ?? 16}px` }}>
                                                                    <div className="p-3 bg-current/5" style={{ borderRadius: `${Math.max(0, (design.borderRadius ?? 16) - 4)}px` }}>
                                                                        <Plus size={20} className="opacity-40" />
                                                                    </div>
                                                                     <div className="text-center">
                                                                        <div className={cn("text-[13px] font-semibold", isFormDark ? "text-[#555]" : "text-[#bbb]")}>
                                                                            No fields yet
                                                                        </div>
                                                                        <div className="text-[11.5px] mt-0.5 opacity-60">
                                                                            Add a field to get started
                                                                        </div>
                                                                        {!isPreview && (
                                                                            <div className="relative mt-4">
                                                                                <button 
                                                                                    onClick={(e) => { e.stopPropagation(); setOpenInsertMenu(0); }}
                                                                                    className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground transition-all shadow-sm"
                                                                                >
                                                                                    <Plus size={14} strokeWidth={2.5} />
                                                                                    Add first field
                                                                                </button>
                                                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0">
                                                                                    <div className={cn("transition-opacity duration-300", openInsertMenu === 0 ? "opacity-100" : "opacity-0")}>
                                                                                        <FieldInsertArea index={0} totalFields={0} openIndex={openInsertMenu} setOpenIndex={setOpenInsertMenu} onAdd={addField} isDark={isFormDark} primaryColor={primaryColor} borderRadius={design.borderRadius ?? 16} hideLine centered />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-0">
                                                                <SortableContext 
                                                                    items={fields.map(f => f.id)}
                                                                    strategy={verticalListSortingStrategy}
                                                                >
                                                                    {fields.map((f, idx) => (
                                                                        <React.Fragment key={f.id}>
                                                                            {!isPreview && (
                                                                                <FieldInsertArea index={idx} totalFields={fields.length} openIndex={openInsertMenu} setOpenIndex={setOpenInsertMenu} onAdd={addField} isDark={isFormDark} primaryColor={primaryColor} borderRadius={design.borderRadius ?? 16} />
                                                                            )}
                                                                            <FieldPreview
                                                                                field={f}
                                                                                isDark={isFormDark}
                                                                                isSelected={selectedFieldId === f.id && !isPreview}
                                                                                onClick={(e) => { e.stopPropagation(); if (!isPreview) setSelectedFieldId(f.id === selectedFieldId ? null : f.id) }}
                                                                                onRemove={() => removeField(f.id)}
                                                                                primaryColor={primaryColor}
                                                                                isPreview={isPreview}
                                                                                borderRadius={design.borderRadius ?? 16}
                                                                                marginTop={design.marginTop}
                                                                                marginBottom={design.marginBottom}
                                                                                blockBackgroundColor={design.blockBackgroundColor}
                                                                            />
                                                                        </React.Fragment>
                                                                    ))}
                                                                </SortableContext>
                                                                {!isPreview && (
                                                                    <FieldInsertArea index={fields.length} totalFields={fields.length} openIndex={openInsertMenu} setOpenIndex={setOpenInsertMenu} onAdd={addField} isDark={isFormDark} primaryColor={primaryColor} borderRadius={design.borderRadius ?? 16} />
                                                                )}
                                                            </div>
                                                        )}
                                                    </DndContext>

                                                    {/* Submit button */}
                                                    {fields.length > 0 && (
                                                        <button
                                                            onClick={() => appToast.info("Please use the public link to test submissions")}
                                                            className="mt-6 w-full py-3 font-bold text-[14px] text-black transition-all"
                                                            style={{ background: primaryColor, borderRadius: `${design.borderRadius ?? 16}px` }}>
                                                            Submit
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {canvasStep === 'confirmation' && (
                                                <div className="flex flex-col items-center py-12 px-8 min-h-[400px]">
                                                    <DndContext 
                                                        sensors={sensors}
                                                        collisionDetection={closestCenter}
                                                        onDragEnd={(event) => {
                                                            const { active, over } = event;
                                                            if (active.id !== over?.id) {
                                                                const oldIndex = (meta.confirmationBlocks || []).findIndex((item: any) => item.id === active.id);
                                                                const newIndex = (meta.confirmationBlocks || []).findIndex((item: any) => item.id === over?.id);
                                                                const next = arrayMove(meta.confirmationBlocks || [], oldIndex, newIndex);
                                                                updateMeta({ confirmationBlocks: next });
                                                            }
                                                        }}
                                                    >
                                                        <SortableContext 
                                                            items={(meta.confirmationBlocks || []).map((b: any) => b.id)}
                                                            strategy={verticalListSortingStrategy}
                                                        >
                                                            <div className="w-full max-w-[500px] flex flex-col gap-0">
                                                                {(meta.confirmationBlocks || []).map((block: any, idx: number) => (
                                                                    <React.Fragment key={block.id}>
                                                                        <ConfirmationBlockInsertArea index={idx} onAdd={(type: string) => addConfirmationBlock(type, idx)} isDark={isFormDark} primaryColor={primaryColor} />
                                                                        <ConfirmationBlockItem 
                                                                            block={block} 
                                                                            isDark={isFormDark} 
                                                                            isSelected={selectedConfirmationBlockId === block.id}
                                                                            onClick={() => setSelectedConfirmationBlockId(block.id)}
                                                                            onRemove={() => {
                                                                                const next = (meta.confirmationBlocks || []).filter((b: any) => b.id !== block.id);
                                                                                updateMeta({ confirmationBlocks: next });
                                                                            }}
                                                                            updateBlock={(patch: any) => {
                                                                                const next = (meta.confirmationBlocks || []).map((b: any) => b.id === block.id ? { ...b, ...patch } : b);
                                                                                updateMeta({ confirmationBlocks: next });
                                                                            }}
                                                                            primaryColor={primaryColor}
                                                                            isPreview={isPreview}
                                                                        />
                                                                    </React.Fragment>
                                                                ))}
                                                                <ConfirmationBlockInsertArea index={(meta.confirmationBlocks || []).length} onAdd={(type: string) => addConfirmationBlock(type, (meta.confirmationBlocks || []).length)} isDark={isFormDark} primaryColor={primaryColor} />
                                                            </div>
                                                        </SortableContext>
                                                    </DndContext>
                                                </div>
                                            )}
                                        </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── RIGHT PANEL ── */}
                            {!isPreview && (
                                <div className={cn(
                                    "hidden md:flex flex-col overflow-hidden border-l w-[240px] shrink-0",
                                    isDark ? "bg-[#0d0d0d] border-[#252525]" : "bg-[#f5f5f5] border-[#e4e4e4]"
                                )}>
                                    <div className="flex items-center shrink-0 p-1.5 gap-1">
                                    {([['details', Settings, 'Details'], ['design', Palette, 'Design']] as const).map(([tab, Icon, label]) => (
                                        <button key={tab} onClick={() => setRightTab(tab)}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold transition-all rounded-xl",
                                                rightTab === tab
                                                    ? (isDark ? "bg-white/10 text-white" : "bg-[#111]/5 text-[#111]")
                                                    : (isDark ? "text-[#555] hover:bg-white/[0.03] hover:text-[#aaa]" : "text-[#bbb] hover:bg-black/[0.03] hover:text-[#666]")
                                            )}>
                                            <Icon size={14} strokeWidth={rightTab === tab ? 2.5 : 2} />
                                            <span>{label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                    {rightTab === 'details' && (
                                        <>
                                            {selectedField ? (
                                                <div className={cn("border-b pb-3 mb-1", isDark ? "border-[#252525]" : "border-[#f0f0f0]")}>
                                                    <div className={cn("px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider",
                                                        isDark ? "text-[#555]" : "text-[#bbb]")}>
                                                        Field Settings
                                                    </div>
                                                    <div className="px-4 space-y-3">
                                                        <div>
                                                            <label className={cn("block text-[10px] font-semibold mb-1 uppercase tracking-wide",
                                                                isDark ? "text-[#555]" : "text-[#bbb]")}>Label</label>
                                                            <PanelInput value={selectedField.label}
                                                                onChange={v => updateField(selectedField.id, { label: v })} isDark={isDark} />
                                                        </div>
                                                        <div>
                                                            <label className={cn("block text-[10px] font-semibold mb-1 uppercase tracking-wide",
                                                                isDark ? "text-[#555]" : "text-[#bbb]")}>Description</label>
                                                            <PanelInput value={selectedField.description || ''}
                                                                onChange={v => updateField(selectedField.id, { description: v })}
                                                                placeholder="Optional" isDark={isDark} />
                                                        </div>
                                                        <div>
                                                            <label className={cn("block text-[10px] font-semibold mb-1 uppercase tracking-wide",
                                                                isDark ? "text-[#555]" : "text-[#bbb]")}>Placeholder</label>
                                                            <PanelInput value={selectedField.placeholder || ''}
                                                                onChange={v => updateField(selectedField.id, { placeholder: v })} isDark={isDark} />
                                                        </div>
                                                        <label className="flex items-center gap-2.5 cursor-pointer"
                                                            onClick={() => updateField(selectedField.id, { required: !selectedField.required })}>
                                                            <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center transition-all",
                                                                selectedField.required
                                                                    ? "border-primary bg-primary"
                                                                    : (isDark ? "border-[#333] bg-[#151515]" : "border-[#ddd] bg-white"))}>
                                                                {selectedField.required && <Check size={9} className="text-black" />}
                                                            </div>
                                                            <span className={cn("text-[11.5px]", isDark ? "text-[#666]" : "text-[#888]")}>Required field</span>
                                                        </label>
                                                        {(selectedField.type === 'dropdown' || selectedField.type === 'multi_choice') && (
                                                            <div>
                                                                <label className={cn("block text-[10px] font-semibold mb-1 uppercase tracking-wide",
                                                                    isDark ? "text-[#555]" : "text-[#bbb]")}>Options (one per line)</label>
                                                                <textarea
                                                                    rows={4}
                                                                    value={(selectedField.options || []).join('\n')}
                                                                    onChange={e => updateField(selectedField.id, { options: e.target.value.split('\n').filter(Boolean) })}
                                                                    className={cn("w-full px-3 py-2 text-[12px] rounded-lg border outline-none resize-none",
                                                                        isDark ? "bg-[#151515] border-[#2a2a2a] text-[#ddd]" : "bg-white border-[#e5e5e5] text-[#111]")}
                                                                />
                                                            </div>
                                                        )}
                                                        {selectedField.type === 'slider' && (
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className={cn("block text-[10px] font-semibold mb-1 uppercase tracking-wide",
                                                                        isDark ? "text-[#555]" : "text-[#bbb]")}>Min</label>
                                                                    <PanelInput type="number" value={selectedField.min ?? 0}
                                                                        onChange={v => updateField(selectedField.id, { min: Number(v) })} isDark={isDark} />
                                                                </div>
                                                                <div>
                                                                    <label className={cn("block text-[10px] font-semibold mb-1 uppercase tracking-wide",
                                                                        isDark ? "text-[#555]" : "text-[#bbb]")}>Max</label>
                                                                    <PanelInput type="number" value={selectedField.max ?? 100}
                                                                        onChange={v => updateField(selectedField.id, { max: Number(v) })} isDark={isDark} />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={cn("divide-y", isDark ? "divide-[#252525]" : "divide-[#f0f0f0]")}>
                                                    <SectionAccordion label="Activation date" icon={<Calendar size={11} />} isDark={isDark}>
                                                        <div className={cn("px-3 py-1.5 rounded-lg border transition-all",
                                                            isDark ? "bg-[#151515] border-[#2a2a2a]" : "bg-white border-[#e5e5e5] "
                                                        )}>
                                                            <DatePicker 
                                                                value={meta.activationDate} 
                                                                onChange={v => updateMeta({ activationDate: v })} 
                                                                isDark={isDark} 
                                                                placeholder="No activation date"
                                                            />
                                                        </div>
                                                    </SectionAccordion>
                                                    <SectionAccordion label="Expiration date" icon={<Calendar size={11} />} isDark={isDark}>
                                                        <div className={cn("px-3 py-1.5 rounded-lg border transition-all",
                                                            isDark ? "bg-[#151515] border-[#2a2a2a]" : "bg-white border-[#e5e5e5]"
                                                        )}>
                                                            <DatePicker 
                                                                value={meta.expirationDate} 
                                                                onChange={v => updateMeta({ expirationDate: v })} 
                                                                isDark={isDark} 
                                                                placeholder="No expiration date"
                                                            />
                                                        </div>
                                                    </SectionAccordion>
                                                    <SectionAccordion label="General" icon={<Settings size={11} />} isDark={isDark} defaultOpen>
                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className={cn("block text-[10px] font-semibold mb-1 uppercase tracking-wide",
                                                                    isDark ? "text-[#555]" : "text-[#bbb]")}>Submission Limit</label>
                                                                <PanelInput type="number" value={meta.submissionLimit || ''}
                                                                    onChange={v => updateMeta({ submissionLimit: v ? parseInt(v) : null })} isDark={isDark} placeholder="Unlimited" />
                                                            </div>
                                                        </div>
                                                    </SectionAccordion>
                                                    <SectionAccordion label="Project" icon={<SlidersIcon size={11} />} isDark={isDark}>
                                                        <PanelInput value={meta.project}
                                                            onChange={v => updateMeta({ project: v })}
                                                            placeholder="Link to project" isDark={isDark} />
                                                    </SectionAccordion>
                                                </div>
                                            )}
                                            {canvasStep === 'confirmation' && selectedConfirmationBlockId && (
                                                <div className="border-t mt-4 pt-4 px-4 space-y-4">
                                                    <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-2", isDark ? "text-[#555]" : "text-[#bbb]")}>
                                                        Block Settings
                                                    </div>
                                                    {(() => {
                                                        const block = (meta.confirmationBlocks || []).find((b: any) => b.id === selectedConfirmationBlockId);
                                                        if (!block) return null;

                                                        return (
                                                            <div className="space-y-4">
                                                                {block.type === 'heading' && (
                                                                    <div>
                                                                        <label className={cn("block text-[10px] font-semibold mb-1.5 uppercase", isDark ? "text-[#555]" : "text-[#bbb]")}>Size</label>
                                                                        <div className="flex gap-1 p-1 rounded-lg bg-black/5 dark:bg-white/5">
                                                                            {[1, 2, 3].map(level => (
                                                                                <button 
                                                                                    key={level}
                                                                                    onClick={() => {
                                                                                        const next = (meta.confirmationBlocks || []).map((b: any) => b.id === block.id ? { ...b, level } : b);
                                                                                        updateMeta({ confirmationBlocks: next });
                                                                                    }}
                                                                                    className={cn(
                                                                                        "flex-1 py-1 text-[11px] font-bold rounded-md transition-all",
                                                                                        block.level === level ? "bg-white dark:bg-[#333] shadow-sm text-primary" : "opacity-40 hover:opacity-100"
                                                                                    )}
                                                                                >
                                                                                    H{level}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {block.type === 'image' && (
                                                                    <div>
                                                                        <label className={cn("block text-[10px] font-semibold mb-1.5 uppercase", isDark ? "text-[#555]" : "text-[#bbb]")}>Image URL</label>
                                                                        <PanelInput 
                                                                            value={block.url || ''} 
                                                                            onChange={v => {
                                                                                const next = (meta.confirmationBlocks || []).map((b: any) => b.id === block.id ? { ...b, url: v } : b);
                                                                                updateMeta({ confirmationBlocks: next });
                                                                            }} 
                                                                            isDark={isDark} 
                                                                            placeholder="https://..."
                                                                        />
                                                                    </div>
                                                                )}
                                                                <button 
                                                                    onClick={() => {
                                                                        const next = (meta.confirmationBlocks || []).filter((b: any) => b.id !== block.id);
                                                                        updateMeta({ confirmationBlocks: next });
                                                                        setSelectedConfirmationBlockId(null);
                                                                    }}
                                                                    className="w-full py-2.5 flex items-center justify-center gap-2 text-[11px] font-bold text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-xl transition-all"
                                                                >
                                                                    <Trash2 size={13} /> Delete Block
                                                                </button>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {rightTab === 'design' && (
                                        <div className="px-3 py-2">
                                            <DesignSettingsPanel
                                                isDark={isDark}
                                                meta={{ logoUrl: meta.logoUrl, design: meta.design }}
                                                updateMeta={(patch) => {
                                                    if ('logoUrl' in patch) updateMeta({ logoUrl: patch.logoUrl });
                                                    if ('design' in patch) updateMeta({ design: { ...meta.design, ...patch.design } });
                                                }}
                                                onUploadLogo={() => { setUploadTarget('logo'); setImageUploadOpen(true); }}
                                                onUploadBackground={() => { setUploadTarget('background'); setImageUploadOpen(true); }}
                                                hideSignature={true}
                                                hideTable={true}
                                                hideActionBar={true}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                )}

                {editorTab === 'responses' && (
                    <div className="flex-1 flex flex-col min-h-0 relative">
                        {/* Response Content */}
                        <div className={cn("flex-1 overflow-auto relative flex flex-col", isDark ? "bg-[#141414]" : "bg-[#f7f7f7]")}>
                            {/* Toolbar (Inner) - Styled like Clients/Projects */}
                            <div className={cn("flex items-center gap-0 px-4 py-2 border-b shrink-0", isDark ? "bg-[#141414] border-[#252525]" : "bg-white border-[#ebebeb]")}>
                                <div className="relative mr-3">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-30" size={12} />
                                    <input
                                        value={responsesSearch}
                                        onChange={e => setResponsesSearch(e.target.value)}
                                        placeholder="Search responses"
                                        className={cn(
                                            "pl-8 pr-3 py-1.5 text-[11px] rounded-lg border focus:outline-none w-44 transition-all focus:w-64",
                                            isDark
                                                ? "bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-white/20"
                                                : "bg-[#f5f5f5] border-[#e0e0e0] text-[#111] placeholder:text-[#aaa] focus:border-[#ccc]"
                                        )}
                                    />
                                </div>

                                <div className="relative">
                                    <ResponseTbBtn 
                                        label="Order by" 
                                        icon={<ArrowUpDown size={11} />} 
                                        active={orderOpen} 
                                        hasArrow 
                                        onClick={() => setOrderOpen(!orderOpen)} 
                                        isDark={isDark} 
                                    />
                                    <ResponseDropdown open={orderOpen} onClose={() => setOrderOpen(false)} isDark={isDark}>
                                        <div className="py-1">
                                            <ResponseDItem label="Recent Submissions" active={responsesOrderBy === 'recent'} onClick={() => { setResponsesOrderBy('recent'); setOrderOpen(false); }} isDark={isDark} />
                                            <ResponseDItem label="Oldest Submissions" active={responsesOrderBy === 'oldest'} onClick={() => { setResponsesOrderBy('oldest'); setOrderOpen(false); }} isDark={isDark} />
                                            <ResponseDItem label="Alphabetical (Name)" active={responsesOrderBy === 'name'} onClick={() => { setResponsesOrderBy('name'); setOrderOpen(false); }} isDark={isDark} />
                                        </div>
                                    </ResponseDropdown>
                                </div>

                                <div className="flex-1" />

                                <div className="flex items-center gap-1.5">
                                    <AnimatePresence>
                                        {selectedResponseIds.size > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                className={cn('flex items-center gap-1.5 px-3 py-1 rounded-xl border ml-2', isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-[#f8f8f8] border-[#e8e8e8]')}
                                            >
                                                <span className={cn('text-[11px] font-semibold mr-1', isDark ? 'text-[#aaa]' : 'text-[#666]')}>{selectedResponseIds.size} selected</span>
                                                <div className={cn('w-[1px] h-3', isDark ? 'bg-[#333]' : 'bg-[#ddd]')}/>
                                                
                                                <Tooltip content="Export" side="bottom">
                                                    <button onClick={handleBulkExportResponses}
                                                        className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors', isDark ? 'text-[#777] hover:text-white hover:bg-white/5' : 'text-[#888] hover:text-[#333] hover:bg-[#ececec]')}>
                                                        <Upload size={11}/>
                                                    </button>
                                                </Tooltip>
                                                
                                                <Tooltip content="Delete" side="bottom">
                                                    <button onClick={handleBulkDeleteResponses}
                                                        className="px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors text-red-500/70 hover:text-red-500 hover:bg-red-500/10">
                                                        <Trash2 size={11}/>
                                                    </button>
                                                </Tooltip>

                                                {selectedResponseIds.size >= 2 && (
                                                    <Tooltip content={selectedResponseIds.size === filteredResponses.length ? "Deselect All" : "Select All"} side="bottom">
                                                        <button onClick={() => {
                                                            if (selectedResponseIds.size === filteredResponses.length) setSelectedResponseIds(new Set());
                                                            else setSelectedResponseIds(new Set(filteredResponses.map(r => r.id)));
                                                        }}
                                                            className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors', isDark ? 'text-[#777] hover:text-white hover:bg-white/5' : 'text-[#888] hover:text-[#333] hover:bg-[#ececec]')}>
                                                            <SquareCheck size={11}/>
                                                        </button>
                                                    </Tooltip>
                                                )}

                                                <div className={cn('w-[1px] h-3', isDark ? 'bg-[#333]' : 'bg-[#ddd]')}/>
                                                
                                                <Tooltip content="Clear selection" side="bottom">
                                                    <button onClick={() => setSelectedResponseIds(new Set())}
                                                        className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors', isDark ? 'text-[#555] hover:text-white hover:bg-white/5' : 'text-[#bbb] hover:text-[#333] hover:bg-[#ececec]')}>
                                                        <X size={11}/>
                                                    </button>
                                                </Tooltip>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className={cn("w-px h-4 mx-1", isDark ? "bg-[#333]" : "bg-[#eee]")} />

                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => setResponsesView('cards')}
                                            className={cn("p-1.5 rounded-lg transition-colors", 
                                                responsesView === 'cards' 
                                                    ? isDark ? "bg-white/10 text-white" : "bg-black/5 text-[#111] shadow-sm font-bold"
                                                    : "text-[#888] hover:text-primary")}
                                        >
                                            <LayoutGrid size={14} />
                                        </button>
                                        <button 
                                            onClick={() => setResponsesView('table')}
                                            className={cn("p-1.5 rounded-lg transition-colors", 
                                                responsesView === 'table' 
                                                    ? isDark ? "bg-white/10 text-white" : "bg-black/5 text-[#111] shadow-sm font-bold"
                                                    : "text-[#888] hover:text-primary")}
                                        >
                                            <List size={14} />
                                        </button>
                                    </div>

                                    <button 
                                        onClick={() => {
                                            if (!responses?.length) return;
                                            const header = ["Date", ...fields.map(f => `"${f.label.replace(/"/g, '""')}"`)].join(",");
                                            const rows = responses.map(r => {
                                                const date = `"${new Date(r.created_at).toLocaleString()}"`;
                                                const cols = fields.map(f => {
                                                    const val = r.data?.[f.id];
                                                    const str = Array.isArray(val) ? val.join(', ') : (typeof val === 'object' ? JSON.stringify(val) : String(val || ''));
                                                    return `"${str.replace(/"/g, '""')}"`;
                                                });
                                                return [date, ...cols].join(",");
                                            });
                                            const csv = [header, ...rows].join("\n");
                                            const blob = new Blob([csv], { type: 'text/csv' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `responses-${id}.csv`;
                                            a.click();
                                        }}
                                        className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-bold transition-all",
                                            isDark ? "bg-white/5 hover:bg-white/10 text-white border border-white/5" : "bg-white border hover:bg-black/[0.02] text-black shadow-sm")}
                                    >
                                        <Upload size={12} /> Export
                                    </button>
                                </div>
                            </div>

                            {/* Data List */}
                            {filteredResponses.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4", isDark ? "bg-[#1a1a1a]" : "bg-[#f0f0f0]")}>
                                        <MessageSquareIcon size={24} className="opacity-20" />
                                    </div>
                                    <div className={cn("font-bold text-[14px] mb-1", isDark ? "text-white/40" : "text-[#999]")}>No responses found</div>
                                    {responses.length > 0 ? (
                                        <button onClick={() => setResponsesSearch('')} className="text-primary text-[12px] font-medium hover:underline">Clear filters</button>
                                    ) : (
                                        <button onClick={copyLink}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold bg-primary text-primary-foreground mt-2">
                                            <Link2 size={13} /> Copy form link
                                        </button>
                                    )}
                                </div>
                            ) : responsesView === 'cards' ? (
                                <div className="p-5 overflow-y-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 max-w-[1600px] mx-auto">
                                        {filteredResponses.map((r) => {
                                            const isSelected = selectedResponseIds.has(r.id);
                                            const primaryIdentity = Object.entries(r.data).find(([qid]) => {
                                                const f = fields.find(field => field.id === qid);
                                                return f?.type === 'full_name' || f?.type === 'email' || f?.label?.toLowerCase().includes('name');
                                            })?.[1] as string || 'Respondent';

                                            return (
                                                <div 
                                                    key={r.id} 
                                                    onClick={() => toggleResponseSelection(r.id)}
                                                    className={cn(
                                                        "flex flex-col rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden group select-none relative",
                                                        isSelected 
                                                            ? isDark ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "border-primary/30 bg-primary/5 ring-1 ring-primary/10 shadow-sm"
                                                            : isDark ? "bg-[#1a1a1a] border-[#252525] hover:border-[#333]" : "bg-white border-[#ebebeb] hover:border-black/10 hover:shadow-sm"
                                                    )}
                                                >
                                                    {/* Checkbox Overlay */}
                                                    <div className="absolute top-2 right-2 flex items-center gap-0.5 z-20">
                                                        <div className={cn('transition-all cursor-pointer', isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                                                            onClick={e => { e.stopPropagation(); toggleResponseSelection(r.id); }}>
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                                                <div className={cn('w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all',
                                                                    isSelected ? 'bg-primary border-primary' : isDark ? 'border-white/20 bg-black/20 backdrop-blur' : 'border-[#ccc] bg-white/80 backdrop-blur')}>
                                                                    {isSelected && <Check size={10} strokeWidth={3} className="text-black"/>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Card Header (Contact Style) */}
                                                    <div className="flex items-center gap-3 px-4 py-3.5 relative">
                                                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold uppercase",
                                                            isDark ? "bg-white/5 text-white/40" : "bg-black/5 text-black/40")}>
                                                            {primaryIdentity[0]}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={cn("text-[13px] font-bold truncate leading-tight", isDark ? "text-white" : "text-black")}>
                                                                {primaryIdentity}
                                                            </span>
                                                            <span className={cn("text-[10px] opacity-40 mt-0.5", isDark ? "text-[#888]" : "text-[#111]")}>
                                                                {new Date(r.created_at).toLocaleDateString()} at {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>

                                                        {/* Action Buttons (Top Right Overlay) */}
                                                        <div className={cn("absolute top-3.5 right-4 z-10 flex items-center gap-1.5 transition-opacity", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleCopyAll(r.data); }}
                                                                className={cn("p-1 rounded-lg transition-colors shrink-0", isDark ? "hover:bg-white/10 text-white/40 hover:text-white" : "hover:bg-black/5 text-black/40 hover:text-black")}
                                                                title="Copy all responses"
                                                            >
                                                                <Copy size={11} />
                                                            </button>
                                                            
                                                            <InlineDeleteButton 
                                                                onDelete={async () => {
                                                                    await bulkDeleteResponses([r.id]);
                                                                    appToast.success("Response deleted");
                                                                }}
                                                                isDark={isDark}
                                                            />

                                                            <div className={cn("w-[14px] h-[14px] rounded-[3px] border flex items-center justify-center transition-all shrink-0",
                                                                isSelected ? "bg-primary border-primary" : isDark ? "border-white/20" : "border-[#ccc]")}>
                                                                {isSelected && <Check size={10} strokeWidth={4} className="text-black" />}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Rows (CardRow Style) */}
                                                    <div className="flex-1">
                                                        {fields.slice(0, 6).map(f => {
                                                            const val = r.data?.[f.id];
                                                            const displayVal = Array.isArray(val) ? val.join(', ') : String(val || '');
                                                            if (!displayVal) return null;
                                                            return (
                                                                <div key={f.id} className="group/row">
                                                                    <ResponseCardRow label={f.label} value={displayVal} isDark={isDark} />
                                                                </div>
                                                            );
                                                        })}
                                                        {fields.length > 6 && (
                                                            <div className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-wider opacity-40 border-t", isDark ? "border-white/5" : "border-dashed border-[#e8e8e8]")}>
                                                                + {fields.length - 6} more fields
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Card Actions Removed - Moved to Header */}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-x-auto p-5">
                                    <table className="w-full text-left text-[12.5px] border-separate border-spacing-0">
                                        <thead>
                                            <tr>
                                                <th className={cn("px-4 py-2 border-b font-bold tracking-tight uppercase text-[10px] first:rounded-tl-xl", isDark ? "bg-[#1a1a1a] border-[#252525] text-[#555]" : "bg-[#fafafa] border-[#ebebeb] text-[#aaa]")}>
                                                    <div 
                                                        onClick={() => setSelectedResponseIds(selectedResponseIds.size === filteredResponses.length ? new Set() : new Set(filteredResponses.map(r => r.id)))}
                                                        className={cn("w-[14px] h-[14px] rounded-[3px] border flex items-center justify-center cursor-pointer transition-all",
                                                            selectedResponseIds.size === filteredResponses.length && filteredResponses.length > 0 ? "bg-primary border-primary" : isDark ? "border-white/20" : "border-[#ccc]")}
                                                    >
                                                        {selectedResponseIds.size === filteredResponses.length && filteredResponses.length > 0 && <Check size={10} strokeWidth={4} className="text-black" />}
                                                    </div>
                                                </th>
                                                <th className={cn("px-4 py-2 border-b font-bold tracking-tight uppercase text-[10px]", isDark ? "bg-[#1a1a1a] border-[#252525] text-[#555]" : "bg-[#fafafa] border-[#ebebeb] text-[#aaa]")}>Submission Date</th>
                                                {fields.map(f => (
                                                    <th key={f.id} className={cn("px-4 py-2 border-b font-bold tracking-tight uppercase text-[10px] whitespace-nowrap", isDark ? "bg-[#1a1a1a] border-[#252525] text-[#555]" : "bg-[#fafafa] border-[#ebebeb] text-[#aaa]")}>
                                                        {f.label}
                                                    </th>
                                                ))}
                                                <th className={cn("px-4 py-2 border-b rounded-tr-xl", isDark ? "bg-[#1a1a1a] border-[#252525]" : "bg-[#fafafa] border-[#ebebeb]")} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredResponses.map((r, i) => {
                                                const isSelected = selectedResponseIds.has(r.id);
                                                return (
                                                    <tr 
                                                        key={r.id} 
                                                        onClick={() => toggleResponseSelection(r.id)}
                                                        className={cn(
                                                            "transition-colors cursor-pointer group",
                                                            isSelected ? isDark ? "bg-primary/5" : "bg-primary/5" : isDark ? "hover:bg-white/[0.02]" : "hover:bg-black/[0.02]",
                                                            isDark ? "border-[#222]" : "border-[#f5f5f5]",
                                                            i !== filteredResponses.length - 1 && "border-b"
                                                        )}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <div className={cn("w-[14px] h-[14px] rounded-[3px] border flex items-center justify-center transition-all",
                                                                isSelected ? "bg-primary border-primary" : isDark ? "border-white/10 opacity-0 group-hover:opacity-100" : "border-[#ccc] opacity-0 group-hover:opacity-100")}>
                                                                {isSelected && <Check size={10} strokeWidth={4} className="text-black" />}
                                                            </div>
                                                        </td>
                                                        <td className={cn("px-4 py-3 whitespace-nowrap font-medium", isDark ? "text-[#888]" : "text-[#666]")}>
                                                            {new Date(r.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                                        </td>
                                                        {fields.map(f => {
                                                            const val = r.data?.[f.id];
                                                            const displayVal = Array.isArray(val) ? val.join(', ') : String(val || '-');
                                                            return (
                                                                <td key={f.id} className="px-4 py-3 group/td">
                                                                    <div className="flex items-center justify-between gap-2 max-w-[240px]">
                                                                        <span className={cn("truncate", isDark ? "text-[#aaa]" : "text-[#444]")}>{displayVal}</span>
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); handleCopyValue(displayVal); }}
                                                                            className="p-1 opacity-0 group-hover/td:opacity-100 transition-all text-primary"
                                                                        >
                                                                            <Copy size={9} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-4 py-3">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleCopyAll(r.data); }}
                                                                className={cn("p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all", isDark ? "text-[#444] hover:text-white" : "text-[#ccc] hover:text-black")}
                                                                title="Copy all"
                                                            >
                                                                <Copy size={12} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {imageUploadOpen && (
                <ImageUploadModal
                    isOpen={imageUploadOpen}
                    onClose={() => setImageUploadOpen(false)}
                    onUpload={(url: string) => {
                        if (uploadTarget === 'logo') updateMeta({ logoUrl: url });
                        else updateMeta({ design: { ...meta.design, backgroundImage: url } });
                        setImageUploadOpen(false);
                    }}
                />
            )}
            {isDeleteOpen && (
                <DeleteConfirmModal
                    open={isDeleteOpen}
                    title="Delete Form"
                    description="This will permanently delete this form and all its responses."
                    onConfirm={handleDelete}
                    onClose={() => setIsDeleteOpen(false)}
                    isDark={isDark}
                />
            )}
            {isResponsesDeleteOpen && (
                <DeleteConfirmModal
                    open={isResponsesDeleteOpen}
                    title="Delete Responses"
                    description={`Are you sure you want to permanently delete ${selectedResponseIds.size} selected response(s)? This action cannot be undone.`}
                    onConfirm={confirmBulkDeleteResponses}
                    onClose={() => setIsResponsesDeleteOpen(false)}
                    isDark={isDark}
                />
            )}
        </div>
    );
}

// alias for the responses empty state icon
function MessageSquareIcon({ size, className }: { size: number; className?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}

// ── CONFIRMATION BLOCK HELPERS ──────────────────────────────────────

function ConfirmationBlockItem({ block, isDark, isSelected, onClick, onRemove, updateBlock, primaryColor, isPreview }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
        id: block.id,
        disabled: isPreview 
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
    };

    return (
        <div 
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            className={cn(
                "group relative w-full transition-all duration-200 rounded-xl",
                !isSelected && "hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            )}
        >
            {!isPreview && (
                <div className={cn(
                    "absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity",
                    isDragging ? "opacity-100" : ""
                )} {...attributes} {...listeners}>
                    <GripVertical size={16} />
                </div>
            )}

            <div className="py-1 px-2">
                {block.type === 'success' && (
                    <div className="flex flex-col items-center text-center py-4 gap-3">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-black shadow-lg shadow-black/5"
                            style={{ background: primaryColor }}>
                            <Check size={28} strokeWidth={2.5} />
                        </div>
                    </div>
                )}

                {block.type === 'heading' && (
                    <div className="px-4 py-1 text-center">
                        <h2 
                            contentEditable={!isPreview}
                            suppressContentEditableWarning
                            onBlur={e => updateBlock({ content: e.currentTarget.textContent || '' })}
                            className={cn(
                                "font-bold tracking-tight outline-none mb-1",
                                block.level === 1 ? "text-[32px]" : block.level === 3 ? "text-[18px]" : "text-[24px]"
                            )}
                            style={{ color: isDark ? '#fff' : '#111' }}
                        >
                            {block.content || 'Heading'}
                        </h2>
                    </div>
                )}

                {block.type === 'text' && (
                    <div className="px-4 py-0 text-center">
                        <div 
                            contentEditable={!isPreview}
                            suppressContentEditableWarning
                            onBlur={e => updateBlock({ content: e.currentTarget.innerHTML })}
                            className="text-[15px] leading-relaxed opacity-70 outline-none min-h-[1em]"
                            style={{ color: isDark ? '#ccc' : '#444' }}
                            dangerouslySetInnerHTML={{ __html: block.content || 'Start typing...' }}
                        />
                    </div>
                )}

                {block.type === 'divider' && (
                    <div className="px-4 py-4">
                        <div className={cn("w-full h-px", isDark ? "bg-white/10" : "bg-black/10")} />
                    </div>
                )}

                {block.type === 'image' && (
                    <div className="px-4 py-4 flex justify-center">
                        {block.url ? (
                            <img src={block.url} alt="" className="max-w-full h-auto rounded-xl shadow-sm" />
                        ) : (
                            <div className={cn("w-full aspect-[16/9] rounded-xl flex flex-col items-center justify-center gap-3 border-2 border-dashed transition-all",
                                isDark ? "bg-white/[0.03] border-white/10 hover:border-white/20" : "bg-black/[0.03] border-black/10 hover:border-black/20")}>
                                <ImageIcon size={24} className="opacity-20" />
                                <span className="text-[11px] font-bold uppercase tracking-wider opacity-40">No image selected</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {!isPreview && isSelected && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="absolute -right-10 top-1/2 -translate-y-1/2 p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                >
                    <Trash2 size={14} />
                </button>
            )}
        </div>
    );
}

function ConfirmationBlockInsertArea({ index, onAdd, isDark, primaryColor }: any) {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="group relative h-2 flex items-center justify-center w-full z-20">
            <div className={cn(
                "w-full h-px scale-x-0 group-hover:scale-x-100 transition-all duration-300",
                isDark ? "bg-white/10" : "bg-black/5"
            )} />
            
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "absolute opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded-full border shadow-sm transition-all duration-300 scale-75 group-hover:scale-100",
                    isOpen ? "opacity-100 scale-100 rotate-45" : "",
                    isDark ? "bg-[#1a1a1a] border-[#333] text-white/50 hover:text-white" : "bg-white border-[#e0e0e0] text-[#888] hover:text-[#111]"
                )}
            >
                <Plus size={14} />
            </button>

            {isOpen && (
                <div className={cn(
                    "absolute top-8 p-1 rounded-xl border shadow-xl flex gap-1 z-50 animate-in zoom-in-95 duration-200",
                    isDark ? "bg-[#1f1f1f] border-[#333]" : "bg-white border-[#d2d2eb]"
                )}>
                    {[
                        { type: 'heading', icon: AlignLeft, label: 'Heading' },
                        { type: 'text', icon: FileText, label: 'Text' },
                        { type: 'image', icon: ImageIcon, label: 'Image' },
                        { type: 'divider', icon: SeparatorHorizontal, label: 'Divider' },
                        { type: 'success', icon: Check, label: 'Icon' },
                    ].map(b => (
                        <button 
                            key={b.type}
                            onClick={() => { onAdd(b.type); setIsOpen(false); }}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1.5 w-14 h-14 rounded-lg transition-all",
                                isDark ? "hover:bg-white/5 text-white/50 hover:text-white" : "hover:bg-black/5 text-[#888] hover:text-black"
                            )}
                        >
                            <b.icon size={16} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">{b.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────
