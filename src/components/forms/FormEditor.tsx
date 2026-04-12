"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, ChevronDown, Link2, MoreHorizontal, Trash2, Copy,
    Check, Settings, Palette, ChevronRight, Plus, Search,
    Type, AlignLeft, ChevronDown as ChevronDownIcon, CheckSquare,
    Image, Upload, Mail, Phone, User, MapPin, Globe, Hash,
    Sliders as SlidersIcon, Calendar, LinkIcon, PenLine, Filter,
    GripVertical, X, Download, Eye, Monitor, Smartphone, LayoutTemplate,
} from 'lucide-react';
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
import { useDebounce } from '@/hooks/useDebounce';
import { DesignSettingsPanel } from '@/components/ui/DesignSettingsPanel';
import { CountryPicker } from '@/components/ui/CountryPicker';
import ImageUploadModal from '@/components/modals/ImageUploadModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { DEFAULT_DOCUMENT_DESIGN, DocumentDesign } from '@/types/design';
import { gooeyToast } from 'goey-toast';
import { v4 as uuidv4 } from 'uuid';
import DatePicker from '@/components/ui/DatePicker';

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
    { type: 'multi_choice',  label: 'Multi choice',   icon: <CheckSquare size={14} />,   section: 'input',   defaultLabel: 'Multiple choice' },
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
    submissionsLimit: number | null;
    project: string;
    confirmationMessage: string;
    logoUrl: string;
    design: DocumentDesign;
}

const DEFAULT_META: FormMeta = {
    activationDate: '',
    expirationDate: '',
    submissionsLimit: null,
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
function SectionAccordion({ label, icon, isDark, children }: {
    label: string; icon: React.ReactNode; isDark: boolean; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(true);
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

/* ── Field preview in canvas ── */
function FieldPreview({ field, isDark, isSelected, onClick, onRemove, primaryColor }: {
    field: FormField; isDark: boolean; isSelected: boolean; onClick: () => void;
    onRemove: () => void; primaryColor: string;
}) {
    const {
        attributes, listeners, setNodeRef,
        transform, transition, isDragging
    } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    const renderInput = () => {
        switch (field.type) {
            case 'long_text':
                return <textarea rows={3} placeholder={field.placeholder || 'Type your answer...'}
                    readOnly
                    className={cn("w-full px-3 py-2 text-[13px] rounded-lg border outline-none resize-none",
                        isDark ? "bg-[#181818] border-[#333] text-[#999]" : "bg-[#f9f9f9] border-[#e5e5e5] text-[#999]")} />;
            case 'dropdown':
                return (
                    <div className={cn("w-full px-3 py-2 text-[13px] rounded-lg border flex items-center justify-between",
                        isDark ? "bg-[#181818] border-[#333] text-[#999]" : "bg-[#f9f9f9] border-[#e5e5e5] text-[#999]")}>
                        <span>{field.placeholder || 'Select an option'}</span>
                        <ChevronDown size={12} className="opacity-40" />
                    </div>
                );
            case 'multi_choice':
                return (
                    <div className="space-y-2">
                        {(field.options || ['Option 1', 'Option 2', 'Option 3']).slice(0, 3).map((opt, i) => (
                            <label key={i} className="flex items-center gap-2.5 cursor-pointer">
                                <div className={cn("w-4 h-4 rounded border", isDark ? "border-[#333]" : "border-[#ddd]")} />
                                <span className={cn("text-[13px]", isDark ? "text-[#999]" : "text-[#555]")}>{opt}</span>
                            </label>
                        ))}
                    </div>
                );
            case 'countries':
                return (
                    <div className="pointer-events-none opacity-80">
                         <CountryPicker value="" onChange={() => {}} isDark={isDark} label={field.label} placeholder={field.placeholder || "Select country"} minimal />
                    </div>
                );
            case 'slider':
                return (
                    <div className="space-y-1">
                        <input type="range" min={field.min || 0} max={field.max || 100} defaultValue={50}
                            className="w-full cursor-pointer"
                            readOnly />
                        <div className={cn("flex justify-between text-[10px]", isDark ? "text-[#555]" : "text-[#ccc]")}>
                            <span>{field.min || 0}</span><span>{field.max || 100}</span>
                        </div>
                    </div>
                );
            case 'signature':
                return (
                    <div className={cn("w-full h-20 rounded-lg border-2 border-dashed flex items-center justify-center",
                        isDark ? "border-[#333] text-[#555]" : "border-[#e5e5e5] text-[#ccc]")}>
                        <span className="text-[12px]">Sign here</span>
                    </div>
                );
            case 'file_upload':
                return (
                    <div className={cn("w-full py-6 rounded-lg border-2 border-dashed flex flex-col items-center gap-2",
                        isDark ? "border-[#333] text-[#555]" : "border-[#e5e5e5] text-[#ccc]")}>
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
                        disabled 
                    />
                );
            default:
                return (
                    <input type="text" placeholder={field.placeholder || 'Type your answer...'} readOnly
                        className={cn("w-full px-3 py-2.5 text-[13px] rounded-lg border outline-none",
                            isDark ? "bg-[#181818] border-[#333] text-[#999]" : "bg-[#f9f9f9] border-[#e5e5e5] text-[#999]")} />
                );
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            className={cn(
                "group relative rounded-xl p-4 border-2 cursor-pointer transition-all",
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
            <button
                onClick={e => { e.stopPropagation(); onRemove(); }}
                className={cn("absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                    isDark ? "bg-white/5 text-[#666] hover:text-red-400" : "bg-[#f5f5f5] text-[#bbb] hover:text-red-400")}>
                <X size={11} />
            </button>

            {/* Drag handle */}
            <div 
                {...attributes}
                {...listeners}
                className={cn("absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1",
                    isDark ? "text-[#666]" : "text-[#ccc]")}>
                <GripVertical size={12} />
            </div>

            <div className="pl-4">
                {/* Label */}
                <div className={cn("font-semibold text-[13px] mb-1", isDark ? "text-[#e0e0e0]" : "text-[#111]")}>
                    {field.label}
                    {field.required && <span className="text-red-400 ml-0.5">*</span>}
                </div>
                {field.description && (
                    <div className={cn("text-[11.5px] mb-2", isDark ? "text-[#666]" : "text-[#aaa]")}>{field.description}</div>
                )}
                {renderInput()}
            </div>
        </div>
    );
}

/* ── Field type pill in picker ── */
function FieldTypePill({ def, onAdd, isDark }: { def: FieldTypeDef; onAdd: () => void; isDark: boolean }) {
    return (
        <button
            onClick={onAdd}
            className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all group",
                isDark
                    ? "border-[#2a2a2a] bg-[#111] text-[#666] hover:border-[#333] hover:text-[#ccc] hover:bg-[#1a1a1a]"
                    : "border-[#ebebeb] bg-white text-[#bbb] hover:border-primary/30 hover:text-[#555] hover:shadow-sm"
            )}>
            <div className="transition-transform group-hover:scale-110">{def.icon}</div>
            <span className="text-[10px] font-semibold text-center leading-tight">{def.label}</span>
        </button>
    );
}

/* ── Insert Area ── */
function FieldInsertArea({ index, openIndex, setOpenIndex, onAdd, isDark, primaryColor }: {
    index: number; openIndex: number | null; setOpenIndex: (i: number | null) => void;
    onAdd: (def: FieldTypeDef, idx: number) => void; isDark: boolean; primaryColor: string;
}) {
    const isOpen = openIndex === index;
    const [hovered, setHovered] = useState(false);
    const visible = hovered || isOpen;

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

            {/* Field type picker popup */}
            {isOpen && (
                <div className={cn(
                    "absolute left-1/2 -translate-x-1/2 top-full mt-1 w-[380px] p-4 rounded-2xl border shadow-xl z-50 animate-in zoom-in-95 duration-150", 
                    isDark ? "bg-[#181818] border-[#333]" : "bg-white border-[#ebebeb]"
                )}
                onMouseLeave={() => { setHovered(false); setOpenIndex(null); }}
                >
                    <div className="space-y-4">
                        {/* Contacts Section */}
                        <div>
                            <div className={cn(
                                "px-1 pb-2 text-[9px] font-bold uppercase tracking-widest",
                                isDark ? "text-[#555]" : "text-[#bbb]"
                            )}>
                                Contact Info
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {FIELD_TYPES.filter(ft => ft.section === 'contact').map(ft => (
                                    <FieldTypePill key={ft.type} def={ft} onAdd={() => { onAdd(ft, index); setOpenIndex(null); }} isDark={isDark} />
                                ))}
                            </div>
                        </div>

                        {/* Inputs Section */}
                        <div>
                            <div className={cn(
                                "px-1 pb-2 text-[9px] font-bold uppercase tracking-widest",
                                isDark ? "text-[#555]" : "text-[#bbb]"
                            )}>
                                Inputs
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {FIELD_TYPES.filter(ft => ft.section === 'input').map(ft => (
                                    <FieldTypePill key={ft.type} def={ft} onAdd={() => { onAdd(ft, index); setOpenIndex(null); }} isDark={isDark} />
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
export default function FormEditor({ id }: { id?: string }) {
    const router = useRouter();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { forms, updateForm, deleteForm, fetchForms } = useFormStore();

    const [title, setTitle] = useState('New Form');
    const [status, setStatus] = useState<FormStatus>('Draft');
    const [fields, setFields] = useState<FormField[]>([]);
    const [meta, setMeta] = useState<FormMeta>(DEFAULT_META);
    const [isLoaded, setIsLoaded] = useState(false);

    const [editorTab, setEditorTab] = useState<EditorTab>('editor');
    const [canvasStep, setCanvasStep] = useState<CanvasStep>('form');
    const [rightTab, setRightTab] = useState<RightTab>('details');
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [pickerTab, setPickerTab] = useState<'input' | 'contact'>('input');
    const [pickerSearch, setPickerSearch] = useState('');
    const [showStatus, setShowStatus] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [copied, setCopied] = useState(false);
    const [imageUploadOpen, setImageUploadOpen] = useState(false);
    const [uploadTarget, setUploadTarget] = useState<'logo' | 'background'>('logo');
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isPreview, setIsPreview] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [openInsertMenu, setOpenInsertMenu] = useState<number | null>(null);

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

    useEffect(() => { fetchForms(); }, [fetchForms]);

    useEffect(() => {
        if (!id || isLoaded || forms.length === 0) return;
        const f = forms.find(f => f.id === id);
        if (!f) return;
        setTitle(f.title);
        setStatus(f.status);
        if (Array.isArray(f.fields)) setFields(f.fields);
        if (f.meta && typeof f.meta === 'object') {
            setMeta(prev => ({ ...prev, ...(f.meta as any) }));
        }
        setIsLoaded(true);
    }, [id, forms, isLoaded]);

    const debouncedTitle   = useDebounce(title, 1000);
    const debouncedStatus  = useDebounce(status, 500);
    const debouncedFields  = useDebounce(fields, 1000);
    const debouncedMeta    = useDebounce(meta, 1000);
    const isFirst = useRef(true);

    useEffect(() => {
        if (isFirst.current || !isLoaded || !id) {
            if (isLoaded) isFirst.current = false;
            return;
        }
        gooeyToast.promise(
            updateForm(id, { title: debouncedTitle, status: debouncedStatus, fields: debouncedFields, meta: debouncedMeta as any }),
            { loading: 'Saving...', success: 'Saved', error: 'Failed to save' }
        );
    }, [debouncedTitle, debouncedStatus, debouncedFields, debouncedMeta, id, isLoaded, updateForm]);

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

    const removeField = (fieldId: string) => {
        setFields(prev => prev.filter(f => f.id !== fieldId));
        if (selectedFieldId === fieldId) setSelectedFieldId(null);
    };

    const updateField = (fieldId: string, patch: Partial<FormField>) => {
        setFields(prev => prev.map(f => f.id === fieldId ? { ...f, ...patch } : f));
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.origin + '/form/' + id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    const handleDelete = async () => {
        if (!id) return;
        await deleteForm(id);
        gooeyToast.success('Form deleted');
        router.push('/forms');
    };

    const selectedField = fields.find(f => f.id === selectedFieldId);
    const design = meta.design || DEFAULT_DOCUMENT_DESIGN;
    const primaryColor = design.primaryColor || '#4dbf39';

    const filteredFieldTypes = FIELD_TYPES.filter(ft => {
        if (pickerSearch && !ft.label.toLowerCase().includes(pickerSearch.toLowerCase())) return false;
        if (!pickerSearch && ft.section !== pickerTab) return false;
        return true;
    });

    const STEPS: { id: CanvasStep; label: string; disabled?: boolean }[] = [
        { id: 'intro', label: 'Intro', disabled: true },
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
                            <span>Forms</span>
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

                    <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-0.5 hidden md:block" />

                    <button
                        onClick={() => {
                            if (isPreview) setIsPreview(false);
                            else { setIsPreview(true); setPreviewMode('desktop'); }
                        }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 h-[32px] rounded-[8px] text-[12px] font-bold transition-all",
                            isPreview
                                ? "bg-primary text-black hover:bg-primary-hover"
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
                                    { icon: Link2, label: 'Copy Link', action: copyLink },
                                    { icon: Download, label: 'Export CSV', action: () => gooeyToast('No responses yet') },
                                    { icon: Copy, label: 'Duplicate', action: () => gooeyToast('Coming soon') },
                                    { icon: Trash2, label: 'Delete', action: () => setIsDeleteOpen(true) },
                                ].map(({ icon: Icon, label, action }) => (
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
                {([['editor', 'Editor'], ['responses', `Responses`]] as const).map(([tab, label]) => (
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
                                    style={{
                                        backgroundColor: design.backgroundColor || '#f7f7f7',
                                        backgroundImage: getBackgroundImageWithOpacity(design.backgroundImage, design.backgroundColor || '#f7f7f7', design.backgroundImageOpacity),
                                        backgroundSize: 'cover',
                                        backgroundAttachment: 'fixed',
                                    }}>
                                    {/* Top blur + step breadcrumb */}
                                    <div className="z-30 flex justify-center sticky top-0 w-full pt-4 pb-6 pointer-events-none">
                                        <div className="absolute inset-0 pointer-events-none"
                                            style={{
                                                backdropFilter: 'blur(12px)',
                                                WebkitBackdropFilter: 'blur(12px)',
                                                maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                                                WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                                            }}>
                                            <div className={cn("absolute inset-0",
                                                design.topBlurTheme === 'dark'
                                                    ? "bg-gradient-to-b from-[#080808]/80 to-transparent"
                                                    : "bg-gradient-to-b from-[#f7f7f7]/80 to-transparent"
                                            )} />
                                        </div>
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

                                    <div className={cn("flex flex-col items-center min-h-full", isPreview && previewMode === 'mobile' ? "py-8 px-4" : "pb-4 px-4 pt-2")}>
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
                                                            }}>
                                                            {canvasStep === 'form' && (
                                                                <div className="p-6">
                                                                    <div className="mb-6">
                                                                        {meta.logoUrl && <img src={meta.logoUrl} alt="Logo" className="mb-4 object-contain" style={{ height: `${design.logoSize || 40}px` }} />}
                                                                        <div className="text-[18px] font-bold mb-1" style={{ color: isDark ? '#fff' : '#111' }}>{title}</div>
                                                                    </div>
                                                                    <div className="space-y-4">
                                                                        {fields.map(f => (
                                                                            <FieldPreview key={f.id} field={f} isDark={isDark} isSelected={false} onClick={() => {}} onRemove={() => {}} primaryColor={primaryColor} />
                                                                        ))}
                                                                    </div>
                                                                    {fields.length > 0 && <button className="mt-6 w-full py-3 rounded-xl font-bold text-[14px] text-black transition-all" style={{ background: primaryColor }}>Submit</button>}
                                                                </div>
                                                            )}
                                                            {canvasStep === 'confirmation' && (
                                                                <div className="flex flex-col items-center text-center py-12 px-6 gap-4">
                                                                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-black shadow-lg" style={{ background: primaryColor }}><Check size={24} strokeWidth={2.5} /></div>
                                                                    <div>
                                                                        <div className="font-bold text-[18px] mb-2" style={{ color: isDark ? '#fff' : '#111' }}>Thanks!</div>
                                                                        <div className="text-[13px] text-center opacity-60" style={{ color: isDark ? '#aaa' : '#555' }}>{meta.confirmationMessage}</div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[100px] h-[4px] rounded-full z-10 bg-white/[0.05]" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full max-w-[620px] rounded-2xl overflow-hidden shadow-xl transition-all duration-300 relative"
                                                style={{
                                                    backgroundColor: design.blockBackgroundColor || '#fff',
                                                    boxShadow: design.blockShadow || '0 4px 20px -4px rgba(0,0,0,0.08)',
                                                    fontFamily: design.fontFamily || 'Inter',
                                                    '--primary-color': primaryColor,
                                                    '--block-button-radius': `${Math.max(0, (design.borderRadius ?? 16) - 4)}px`,
                                                } as React.CSSProperties}>
                                            {canvasStep === 'form' && (
                                                <div className="p-8">
                                                    {/* Form header */}
                                                    <div className="mb-6">
                                                        {meta.logoUrl && (
                                                            <img src={meta.logoUrl} alt="Logo"
                                                                className="mb-4 object-contain"
                                                                style={{ height: `${design.logoSize || 40}px` }} />
                                                        )}
                                                        <div className="text-[20px] font-bold mb-1" style={{ color: isDark ? '#fff' : '#111' }}>
                                                            {title}
                                                        </div>
                                                    </div>

                                                    {/* Fields */}
                                                    <DndContext 
                                                        sensors={sensors}
                                                        collisionDetection={closestCenter}
                                                        onDragEnd={handleDragEnd}
                                                    >
                                                        {fields.length === 0 ? (
                                                            <div className="space-y-0">
                                                                <div className={cn("flex flex-col items-center justify-center py-12 gap-3 rounded-xl border-2 border-dashed relative",
                                                                    isDark ? "border-[#333] text-[#444]" : "border-[#ebebeb] text-[#ccc]")}>
                                                                    <div className="p-3 rounded-xl bg-current/5">
                                                                        <Plus size={20} className="opacity-40" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <div className={cn("text-[13px] font-semibold", isDark ? "text-[#555]" : "text-[#bbb]")}>
                                                                            No fields yet
                                                                        </div>
                                                                        <div className="text-[11.5px] mt-0.5 opacity-60">
                                                                            Hover below to insert your first field
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {!isPreview && (
                                                                    <FieldInsertArea index={0} openIndex={openInsertMenu} setOpenIndex={setOpenInsertMenu} onAdd={addField} isDark={isDark} primaryColor={primaryColor} />
                                                                )}
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
                                                                                <FieldInsertArea index={idx} openIndex={openInsertMenu} setOpenIndex={setOpenInsertMenu} onAdd={addField} isDark={isDark} primaryColor={primaryColor} />
                                                                            )}
                                                                            <div className={cn(!isPreview && "px-2")}>
                                                                                <FieldPreview
                                                                                    field={f}
                                                                                    isDark={isDark}
                                                                                    isSelected={selectedFieldId === f.id && !isPreview}
                                                                                    onClick={() => { if (!isPreview) setSelectedFieldId(f.id === selectedFieldId ? null : f.id) }}
                                                                                    onRemove={() => removeField(f.id)}
                                                                                    primaryColor={primaryColor}
                                                                                />
                                                                            </div>
                                                                        </React.Fragment>
                                                                    ))}
                                                                </SortableContext>
                                                                {!isPreview && (
                                                                    <FieldInsertArea index={fields.length} openIndex={openInsertMenu} setOpenIndex={setOpenInsertMenu} onAdd={addField} isDark={isDark} primaryColor={primaryColor} />
                                                                )}
                                                            </div>
                                                        )}
                                                    </DndContext>

                                                    {/* Submit button */}
                                                    {fields.length > 0 && (
                                                        <button
                                                            className="mt-6 w-full py-3 rounded-xl font-bold text-[14px] text-black transition-all"
                                                            style={{ background: primaryColor }}>
                                                            Submit
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {canvasStep === 'confirmation' && (
                                                <div className="flex flex-col items-center text-center py-16 px-8 gap-4">
                                                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-black shadow-lg"
                                                        style={{ background: primaryColor }}>
                                                        <Check size={28} strokeWidth={2.5} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-[20px] mb-2" style={{ color: isDark ? '#fff' : '#111' }}>
                                                            Thanks!
                                                        </div>
                                                        <textarea
                                                            value={meta.confirmationMessage}
                                                            onChange={e => updateMeta({ confirmationMessage: e.target.value })}
                                                            className="text-[13px] text-center bg-transparent outline-none resize-none w-full opacity-60"
                                                            style={{ color: isDark ? '#aaa' : '#555' }}
                                                            rows={3}
                                                        />
                                                    </div>
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
                                                            isDark ? "bg-[#151515] border-[#2a2a2a]" : "bg-white border-[#e5e5e5]"
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
                                                    <SectionAccordion label="Submissions limit" icon={<Hash size={11} />} isDark={isDark}>
                                                        <PanelInput type="number" value={meta.submissionsLimit ?? ''}
                                                            onChange={v => updateMeta({ submissionsLimit: v ? Number(v) : null })}
                                                            placeholder="Unlimited" isDark={isDark} />
                                                    </SectionAccordion>
                                                    <SectionAccordion label="Project" icon={<SlidersIcon size={11} />} isDark={isDark}>
                                                        <PanelInput value={meta.project}
                                                            onChange={v => updateMeta({ project: v })}
                                                            placeholder="Link to project" isDark={isDark} />
                                                    </SectionAccordion>
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
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center",
                            isDark ? "bg-white/5" : "bg-[#f0f0f0]")}>
                            <MessageSquareIcon size={24} className={isDark ? "text-[#444]" : "text-[#ccc]"} />
                        </div>
                        <div className="text-center">
                            <div className={cn("font-semibold text-[14px] mb-1", isDark ? "text-[#444]" : "text-[#bbb]")}>No responses yet</div>
                            <div className={cn("text-[12px]", isDark ? "text-[#333]" : "text-[#ccc]")}>
                                Share your form to start collecting responses
                            </div>
                        </div>
                        <button onClick={copyLink}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold bg-primary text-black">
                            <Link2 size={13} /> Copy form link
                        </button>
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
