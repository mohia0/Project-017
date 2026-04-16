import React, { useState, useRef, useEffect } from 'react';
import { FormField, FormFieldType } from '@/store/useFormStore';
import { v4 as uuidv4 } from 'uuid';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CountryPicker } from '@/components/ui/CountryPicker';
import DatePicker from '@/components/ui/DatePicker';
import {
    Type, AlignLeft, ChevronDown as ChevronDownIcon, SquareCheck,
    Image, Upload, Hash, Sliders as SlidersIcon, LinkIcon,
    Plus, X, GripVertical, Calendar, Mail, Phone, User, MapPin, Globe, PenLine
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldTypeDef {
    type: FormFieldType;
    label: string;
    icon: React.ReactNode;
    section: 'input' | 'contact' | 'media';
    defaultLabel: string;
}

const FIELD_TYPES: FieldTypeDef[] = [
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
    { type: 'email',         label: 'Email address',  icon: <Mail size={14} />,          section: 'contact', defaultLabel: 'Email address' },
    { type: 'phone',         label: 'Phone number',   icon: <Phone size={14} />,         section: 'contact', defaultLabel: 'Phone number' },
    { type: 'full_name',     label: 'Full name',      icon: <User size={14} />,          section: 'contact', defaultLabel: 'Full name' },
    { type: 'address',       label: 'Address',        icon: <MapPin size={14} />,        section: 'contact', defaultLabel: 'Address' },
    { type: 'countries',     label: 'Countries',      icon: <Globe size={14} />,         section: 'contact', defaultLabel: 'Select country' },
];

function FieldTypePill({ def, onAdd, isDark, borderRadius }: { def: FieldTypeDef; onAdd: () => void; isDark: boolean; borderRadius: number }) {
    return (
        <button
            onClick={onAdd}
            className={cn(
                "flex flex-col items-center gap-1.5 p-3 border transition-all group w-full",
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

function FieldInsertArea({ index, totalFields, openIndex, setOpenIndex, onAdd, isDark, primaryColor, borderRadius, hideLine, centered }: {
    index: number; totalFields: number; openIndex: number | null; setOpenIndex: (i: number | null) => void;
    onAdd: (def: FieldTypeDef, idx: number) => void; isDark: boolean; primaryColor: string;
    borderRadius: number; hideLine?: boolean; centered?: boolean;
}) {
    const isOpen = openIndex === index;
    const [hovered, setHovered] = useState(false);
    const visible = hovered || isOpen;
    const pickerRef = useRef<HTMLDivElement>(null);
    const openUp = index === totalFields && totalFields > 2;

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
            style={{ marginLeft: '-2rem', marginRight: '-2rem', paddingLeft: '2rem', paddingRight: '2rem' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { if (!isOpen) setHovered(false); }}
        >
            {!hideLine && (
                <div className={cn(
                    "absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center transition-all duration-150",
                    visible ? "opacity-100 translate-y-[-50%]" : "opacity-0 translate-y-[20%] pointer-events-none"
                )}>
                    <div className={cn("flex-1 border-t border-dashed", isDark ? "border-[#363636]" : "border-[#d8d8d8]")} />
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpenIndex(isOpen ? null : index); }}
                        className={cn(
                            "mx-2 w-5 h-5 flex items-center justify-center border transition-all shrink-0 shadow-sm",
                            isOpen
                                ? "bg-[var(--primary-color)] border-[var(--primary-color)] text-white"
                                : isDark ? "bg-[#252525] border-[#363636] text-[#777] hover:border-[var(--primary-color)] hover:text-[var(--primary-color)]"
                                         : "bg-white border-[#d0d0d0] text-[#aaa] hover:border-[var(--primary-color)] hover:text-[var(--primary-color)]"
                        )}
                        style={{ borderRadius: 'var(--block-button-radius)', '--primary-color': primaryColor } as React.CSSProperties}
                    >
                        <Plus size={12} strokeWidth={2.5} />
                    </button>
                    <div className={cn("flex-1 border-t border-dashed", isDark ? "border-[#363636]" : "border-[#d8d8d8]")} />
                </div>
            )}

            {isOpen && (
                <div 
                    ref={pickerRef}
                    className={cn(
                        "absolute left-1/2 -translate-x-1/2 w-[540px] p-4 border shadow-2xl z-[9999] animate-in zoom-in-95 duration-150", 
                        centered ? "top-1/2 -translate-y-1/2" : (openUp ? "bottom-full mb-2" : "top-full mt-2"),
                        isDark ? "bg-[#181818] border-[#333]" : "bg-white border-[#ebebeb]"
                    )}
                    style={{ borderRadius: `${borderRadius}px` }}
                >
                    <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
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

function FieldPreview({ field, isDark, isSelected, onClick, onRemove, primaryColor, borderRadius, isReadOnly }: {
    field: FormField; isDark: boolean; isSelected: boolean; onClick: (e: React.MouseEvent) => void;
    onRemove: () => void; primaryColor: string; borderRadius: number; isReadOnly?: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    const renderInput = () => {
        const inputProps = {
            readOnly: true,
            className: cn("w-full px-3 py-2 text-[13px] border outline-none transition-all pointer-events-none",
                isDark ? "bg-white/[0.03] border-[#333] text-[#ddd]" : "bg-black/[0.02] border-[#e5e5e5] text-[#111]"
            ),
            style: { borderRadius: `${Math.max(0, borderRadius - 6)}px` }
        };

        switch (field.type) {
            case 'long_text':
                return <textarea rows={3} placeholder={field.placeholder || 'Type your answer...'}
                    {...inputProps} className={cn(inputProps.className, "resize-none")} />;
            case 'dropdown':
                return (
                    <div className={cn(inputProps.className, "flex items-center justify-between")}>
                        <span className="opacity-60">{field.placeholder || 'Select an option'}</span>
                        <ChevronDownIcon size={12} className="opacity-40" />
                    </div>
                );
            case 'multi_choice':
                return (
                    <div className="space-y-2">
                        {(field.options || ['Option 1', 'Option 2', 'Option 3']).slice(0, 3).map((opt, i) => (
                            <label key={i} className="flex items-center gap-2.5">
                                <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all", 
                                    isDark ? "border-[#333]" : "border-[#ddd]")} />
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
                            className="w-full pointer-events-none"
                            disabled={true} />
                        <div className={cn("flex justify-between text-[10px]", isDark ? "text-[#555]" : "text-[#ccc]")}>
                            <span>{field.min || 0}</span><span>{field.max || 100}</span>
                        </div>
                    </div>
                );
            case 'signature':
                return (
                    <div className={cn("w-full h-20 border-2 border-dashed flex items-center justify-center transition-all opacity-60",
                        isDark ? "border-[#333] text-[#555]" : "border-[#e5e5e5] text-[#ccc]")}
                        style={{ borderRadius: `${Math.max(0, borderRadius - 4)}px` }}>
                        <span className="text-[12px]">Sign here</span>
                    </div>
                );
            case 'file_upload':
                return (
                    <div className={cn("w-full py-6 border-2 border-dashed flex flex-col items-center gap-2 transition-all opacity-60",
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
                        disabled={true} 
                    />
                );
            default:
                return (
                    <input type="text" placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`} 
                        {...inputProps} />
                );
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, borderRadius: `${borderRadius}px`, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
            onClick={(e) => {
                e.stopPropagation();
                onClick(e);
            }}
            className={cn(
                "group relative p-4 border-2 transition-all mx-1",
                !isReadOnly ? "cursor-pointer" : "cursor-default",
                isSelected 
                    ? "border-primary/50 shadow-[0_0_0_3px_rgba(77,191,57,0.08)]" 
                    : (!isReadOnly 
                        ? (isDark ? "border-transparent hover:border-[#333]" : "border-transparent hover:border-[#ebebeb]")
                        : "border-transparent"
                    ),
                isDragging && "opacity-50"
            )}>
            
            {!isReadOnly && (
                <button
                    onClick={e => { e.stopPropagation(); onRemove(); }}
                    className={cn("absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                        isDark ? "bg-white/5 text-[#666] hover:text-red-400" : "bg-[#f5f5f5] text-[#bbb] hover:text-red-400")}>
                    <X size={11} />
                </button>
            )}

            {!isReadOnly && (
                <div 
                    {...attributes}
                    {...listeners}
                    className={cn("absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1",
                        isDark ? "text-[#666]" : "text-[#ccc]")}>
                    <GripVertical size={12} />
                </div>
            )}

            <div className="pl-4">
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

export function SchedulerFormBuilder({ isDark, design, fields, updateFields, selectedFieldId, onSelectField, isReadOnly }: {
    isDark: boolean; design: any; fields: FormField[]; updateFields: (fields: FormField[]) => void;
    selectedFieldId: string | null; onSelectField: (id: string | null) => void; isReadOnly?: boolean;
}) {
    const [openFieldIndex, setOpenFieldIndex] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = fields.findIndex(f => f.id === active.id);
            const newIndex = fields.findIndex(f => f.id === over.id);
            updateFields(arrayMove(fields, oldIndex, newIndex));
        }
    };

    const addField = (def: FieldTypeDef, index: number) => {
        const newField: FormField = {
            id: uuidv4(),
            type: def.type,
            label: def.defaultLabel,
            required: false,
            placeholder: '',
            description: ''
        };
        const copy = [...fields];
        copy.splice(index, 0, newField);
        updateFields(copy);
        onSelectField(newField.id);
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                <div className={cn("space-y-0 relative w-full", !isReadOnly && "pb-12")}
                    onClick={() => {
                        if (!isReadOnly) onSelectField(null);
                    }}
                    style={{
                        '--primary-color': design.primaryColor || '#4dbf39',
                        '--block-button-radius': `${Math.max(0, (design.borderRadius || 16) - 4)}px`,
                    } as React.CSSProperties}>
                    {fields.length === 0 ? (
                        <div className="space-y-0">
                            <div className={cn("flex flex-col items-center justify-center py-12 gap-3 border-2 border-dashed relative",
                                isDark ? "border-[#333] text-[#444]" : "border-[#ebebeb] text-[#ccc]")}
                                style={{ borderRadius: `${design.borderRadius ?? 16}px` }}>
                                <div className="p-3 bg-current/5" style={{ borderRadius: `${Math.max(0, (design.borderRadius ?? 16) - 4)}px` }}>
                                    <Plus size={20} className="opacity-40" />
                                </div>
                                <div className="text-center">
                                    <div className={cn("text-[13px] font-semibold", isDark ? "text-[#555]" : "text-[#bbb]")}>
                                        No custom fields
                                    </div>
                                    <div className="text-[11.5px] mt-0.5 opacity-60">
                                        Add a field to get started
                                    </div>
                                    <div className="relative mt-4">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setOpenFieldIndex(0); }}
                                            className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold rounded-lg bg-primary hover:bg-primary-hover text-black transition-all shadow-sm"
                                        >
                                            <Plus size={14} strokeWidth={2.5} />
                                            Add first field
                                        </button>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0">
                                            <div className={cn("transition-opacity duration-300", openFieldIndex === 0 ? "opacity-100" : "opacity-0")}>
                                                <FieldInsertArea index={0} totalFields={0} openIndex={openFieldIndex} setOpenIndex={setOpenFieldIndex} onAdd={addField} isDark={isDark} primaryColor={design.primaryColor || '#4dbf39'} borderRadius={design.borderRadius ?? 16} hideLine centered />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-0">
                            {fields.map((f, i) => (
                                <React.Fragment key={f.id}>
                                    {!isReadOnly && (
                                        <FieldInsertArea index={i} totalFields={fields.length} openIndex={openFieldIndex}
                                            setOpenIndex={setOpenFieldIndex} onAdd={addField} isDark={isDark}
                                            primaryColor={design.primaryColor || '#4dbf39'} borderRadius={design.borderRadius || 16} />
                                    )}
                                    
                                    <FieldPreview
                                        field={f} isDark={isDark}
                                        isSelected={selectedFieldId === f.id}
                                        onClick={() => !isReadOnly && onSelectField(f.id)}
                                        onRemove={() => {
                                            updateFields(fields.filter(x => x.id !== f.id));
                                            if (selectedFieldId === f.id) onSelectField(null);
                                        }}
                                        primaryColor={design.primaryColor || '#4dbf39'}
                                        borderRadius={design.borderRadius || 16}
                                        isReadOnly={isReadOnly}
                                    />
                                </React.Fragment>
                            ))}
                            {!isReadOnly && (
                                <FieldInsertArea index={fields.length} totalFields={fields.length} openIndex={openFieldIndex}
                                    setOpenIndex={setOpenFieldIndex} onAdd={addField} isDark={isDark}
                                    primaryColor={design.primaryColor || '#4dbf39'} borderRadius={design.borderRadius || 16} />
                            )}
                        </div>
                    )}
                </div>
            </SortableContext>
        </DndContext>
    );
}

