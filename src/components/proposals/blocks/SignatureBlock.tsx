"use client";

import React, { useState } from 'react';
import { GripVertical, Plus, Trash2, PenBox } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { BlockProps } from './SectionBlockWrapper';
import DatePicker from '@/components/ui/DatePicker';

export function SignatureBlock({ id, data, updateData, removeBlock, addBlockAfter }: BlockProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const [signedName, setSignedName] = useState(data.signedName || '');
    const [signedDate, setSignedDate] = useState(data.signedDate || '');

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const isSigned = signedName.length > 0 || data.signatureImage;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative flex items-start -ml-12 pl-12 py-4 mt-12 transition-colors rounded-xl overflow-hidden",
                isDragging && "opacity-50 z-50",
            )}
        >
            {/* Block Handles */}
            <div className="absolute left-2 top-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                    onClick={() => addBlockAfter?.(id)}
                    className="p-1 text-[#ccc] hover:text-[var(--primary-color)] hover:bg-[var(--primary-color)]/5 rounded cursor-pointer transition-colors"
                    title="Add block below"
                >
                    <Plus size={16} />
                </button>
                <div
                    {...attributes}
                    {...listeners}
                    className="p-1 text-[#ccc] hover:text-[#111] hover:bg-[#eaeaea] rounded cursor-grab active:cursor-grabbing transition-colors"
                >
                    <GripVertical size={16} />
                </div>
            </div>

            <div className="flex-1 w-full max-w-[500px] border border-[#e2e2e2] rounded-xl p-6 bg-[#fdfdfd] shadow-soft relative">
                <button
                    onClick={() => removeBlock(id)}
                    className="absolute right-4 top-4 p-1.5 text-[#999] opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                    <Trash2 size={16} />
                </button>

                <h3 className="text-sm font-semibold tracking-wide text-[#111] mb-6 flex items-center gap-2">
                    <PenBox size={16} /> Digital Signature
                </h3>

                <div className="space-y-6">
                    <div className="border-b border-dashed border-[#ccc] pb-2 relative">
                        {data.signatureImage ? (
                            <div className="h-12 flex items-end px-2 pt-1 pb-1">
                                <img src={data.signatureImage} className="max-h-full invert-0 grayscale" alt="Signature" />
                            </div>
                        ) : isSigned ? (
                            <div className="text-5xl text-[#111] h-12 flex items-end px-2 leading-none" style={{ fontFamily: 'var(--font-mr-dafoe), cursive' }}>
                                {signedName}
                            </div>
                        ) : (
                            <div className="h-12 flex items-end px-2 text-[#999] text-sm italic">
                                Awaiting signature...
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-semibold text-[#666] uppercase tracking-wider mb-2">Signed By (Name)</label>
                            <input
                                type="text"
                                value={signedName}
                                onChange={(e) => {
                                    setSignedName(e.target.value);
                                    updateData(id, { ...data, signedName: e.target.value });
                                }}
                                placeholder="Type name here"
                                className="w-full text-sm bg-white border border-[#e2e2e2] rounded-lg px-3 py-2 outline-none focus:border-[#111] transition-colors placeholder:text-[#ccc]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[#666] uppercase tracking-wider mb-2">Date</label>
                            <div className="border border-[#e2e2e2] rounded-lg px-3 py-2 bg-white">
                                <DatePicker
                                    value={signedDate}
                                    onChange={(v) => {
                                        setSignedDate(v);
                                        updateData(id, { ...data, signedDate: v });
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-[#e2e2e2] pt-4">
                    <div 
                        className={cn("text-xs font-semibold px-2 py-1 rounded-md")}
                        style={isSigned ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-foreground)' } : { backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}
                    >
                        {isSigned ? 'Signed' : 'Pending Signature'}
                    </div>
                    {isSigned && (
                        <div className="text-xs text-[#999]">
                            Legally binding signature via AROOOXA
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
