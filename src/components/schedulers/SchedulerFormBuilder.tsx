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
            style={{ marginLeft: '-1rem', marginRight: '-1rem', paddingLeft: '1rem', paddingRight: '1rem' }}
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
                        "absolute left-1/2 -translate-x-1/2 w-[340px] md:w-[460px] p-4 border shadow-2xl z-[100] animate-in zoom-in-95 duration-150", 
                        centered ? "top-1/2 -translate-y-1/2" : (openUp ? "bottom-full mb-2" : "top-full mt-2"),
                        isDark ? "bg-[#181818] border-[#333]" : "bg-white border-[#ebebeb]"
                    )}
                    style={{ borderRadius: `${borderRadius}px` }}
                >
                    <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                        <div>
                            <div className={cn(
                                "px-2 pb-2 text-[9px] font-bold uppercase tracking-widest py-1",
                                isDark ? "text-[#555]" : "text-[#bbb]"
                            )}>
                                Contact Info
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                                {FIELD_TYPES.filter(ft => ft.section === 'contact').map(ft => (
                                    <FieldTypePill key={ft.type} def={ft} onAdd={() => { onAdd(ft, index); setOpenIndex(null); }} isDark={isDark} borderRadius={borderRadius} />
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className={cn(
                                "px-2 pb-2 text-[9px] font-bold uppercase tracking-widest py-1",
                                isDark ? "text-[#555]" : "text-[#bbb]"
                            )}>
                                Inputs
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
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

function FieldPreview({ field, isDark, isSelected, onClick, onRemove, primaryColor, borderRadius }: {
    field: FormField; isDark: boolean; isSelected: boolean; onClick: (e: React.MouseEvent) => void;
    onRemove: () => void; primaryColor: string; borderRadius: number;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    const inputProps = {
        readOnly: true,
        className: cn("w-full px-3 py-2 text-[13px] border outline-none transition-all pointer-events-none",
            isDark ? "bg-white/[0.03] border-[#333] text-[#ddd]" : "bg-black/[0.02] border-[#e5e5e5] text-[#111]"
        ),
        style: { borderRadius: `${Math.max(0, borderRadius - 6)}px` }
    };

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, borderRadius: `${borderRadius}px`, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
            onClick={onClick}
            className={cn(
                "group relative p-4 border-2 transition-all my-2",
                "cursor-pointer",
                isSelected ? "border-primary/50 shadow-[0_0_0_3px_rgba(77,191,57,0.08)]" : (isDark ? "border-transparent hover:border-[#333]" : "border-transparent hover:border-[#ebebeb]"),
                isDragging && "opacity-50"
            )}>
            
            {field.required && <span className="absolute top-2 right-12 text-[10px] font-bold text-red-400">Required</span>}

            <button
                onClick={e => { e.stopPropagation(); onRemove(); }}
                className={cn("absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                    isDark ? "bg-white/5 text-[#666] hover:text-red-400" : "bg-[#f5f5f5] text-[#bbb] hover:text-red-400")}>
                <X size={11} />
            </button>

            <div 
                {...attributes}
                {...listeners}
                className={cn("absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1",
                    isDark ? "text-[#666]" : "text-[#ccc]")}>
                <GripVertical size={12} />
            </div>

            <div className="pl-4">
                <div className="mb-3">
                    <div className={cn("text-[13px] font-bold mb-1.5 px-2 py-0.5 inline-block", isDark ? "text-[#eee]" : "text-[#111]")}
                         style={{ borderRadius: `${Math.max(0, borderRadius - 8)}px`, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                        {field.label} {field.required && <span className="text-red-500 ml-1 mt-1">*</span>}
                    </div>
                </div>
                <input type="text" placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`} {...inputProps} />
            </div>
        </div>
    );
}

export function SchedulerFormBuilder({ isDark, design, fields, updateFields, selectedFieldId, onSelectField }: {
    isDark: boolean; design: any; fields: FormField[]; updateFields: (fields: FormField[]) => void;
    selectedFieldId: string | null; onSelectField: (id: string | null) => void;
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
                <div className="space-y-0 relative w-full">
                    {fields.length === 0 && (
                        <div className="py-12 border-2 border-dashed rounded-xl text-center opacity-50"
                            style={{ borderColor: isDark ? '#444' : '#ccc' }}>
                            No custom form fields added.
                        </div>
                    )}
                    
                    {fields.map((f, i) => (
                        <React.Fragment key={f.id}>
                            {i === 0 && (
                                <FieldInsertArea index={0} totalFields={fields.length} openIndex={openFieldIndex}
                                    setOpenIndex={setOpenFieldIndex} onAdd={addField} isDark={isDark}
                                    primaryColor={design.primaryColor || '#4dbf39'} borderRadius={design.borderRadius || 16} />
                            )}
                            
                            <FieldPreview
                                field={f} isDark={isDark}
                                isSelected={selectedFieldId === f.id}
                                onClick={() => onSelectField(f.id)}
                                onRemove={() => {
                                    updateFields(fields.filter(x => x.id !== f.id));
                                    if (selectedFieldId === f.id) onSelectField(null);
                                }}
                                primaryColor={design.primaryColor || '#4dbf39'}
                                borderRadius={design.borderRadius || 16}
                            />

                            <FieldInsertArea index={i + 1} totalFields={fields.length} openIndex={openFieldIndex}
                                setOpenIndex={setOpenFieldIndex} onAdd={addField} isDark={isDark}
                                primaryColor={design.primaryColor || '#4dbf39'} borderRadius={design.borderRadius || 16} />
                        </React.Fragment>
                    ))}
                    
                    {fields.length === 0 && (
                        <FieldInsertArea index={0} totalFields={0} openIndex={openFieldIndex}
                            setOpenIndex={setOpenFieldIndex} onAdd={addField} isDark={isDark}
                            primaryColor={design.primaryColor || '#4dbf39'} borderRadius={design.borderRadius || 16} centered />
                    )}
                </div>
            </SortableContext>
        </DndContext>
    );
}

