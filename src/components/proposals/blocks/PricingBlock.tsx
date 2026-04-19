"use client";

import React, { useState } from 'react';
import { GripVertical, Plus, Trash2, Settings, PlusCircle, X, HelpCircle, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export interface LineItem {
    id: string;
    name: string;
    description: string;
    qty: number;
    rate: number;
    tax: number;
    discount: number;
}

export function PricingBlock({ 
    id, data, updateData, isDark, isPreview 
}: { 
    id: string, data: any, updateData: (id: string, data: any) => void, isDark: boolean, isPreview: boolean 
}) {
    const [hovered, setHovered] = useState<string>('');

    // State for items and specific block settings
    const [items, setItems] = useState<LineItem[]>(data.items || [
        { id: uuidv4(), name: 'Brand Identity Design', description: 'Two concepts with different art directions are presented in 60+ pages.', qty: 1, rate: 1200, tax: 0, discount: 0 },
        { id: uuidv4(), name: 'Brand Identity Guideline & One-page Style Sheet', description: 'The instruction manual and rule book on the best way to communicate your brand.', qty: 1, rate: 250, tax: 0, discount: 0 }
    ]);

    const [currency, setCurrency] = useState(data.currency || 'USD');
    const [showSettings, setShowSettings] = useState(false);

    // Block level settings from screenshot
    const [settings, setSettings] = useState({
        viewMode: data.settings?.viewMode || 'table', // 'table' or 'cards'
        imageSize: data.settings?.imageSize || 'Medium',
        allowSelection: data.settings?.allowSelection ?? false,
        quantityUnit: data.settings?.quantityUnit || 'Qty',
        hideQuantity: data.settings?.hideQuantity ?? false,
        hideAmount: data.settings?.hideAmount ?? false
    });


    const updateItem = (itemId: string, field: keyof LineItem, value: any) => {
        const newItems = items.map(i => i.id === itemId ? { ...i, [field]: value } : i);
        setItems(newItems);
        updateData(id, { ...data, items: newItems });
    };

    const addItem = () => {
        const newItems = [...items, { id: uuidv4(), name: 'New Item', description: 'Description', qty: 1, rate: 0, tax: 0, discount: 0 }];
        setItems(newItems);
        updateData(id, { ...data, items: newItems });
    };

    const removeItem = (itemId: string) => {
        const newItems = items.filter(i => i.id !== itemId);
        setItems(newItems);
        updateData(id, { ...data, items: newItems });
    };

    const calcSubtotal = () => items.reduce((acc, item) => acc + (item.qty * item.rate), 0);
    const calcTaxTotal = () => items.reduce((acc, item) => acc + (item.qty * item.rate * (item.tax / 100)), 0);
    const calcTotal = () => calcSubtotal() + calcTaxTotal();

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(val);
    };

    const handleSaveSettings = (newSettings: typeof settings) => {
        setSettings(newSettings);
        updateData(id, { ...data, settings: newSettings });
        setShowSettings(false);
    };

    return (
        <div className="w-full relative">
            {/* Title Section */}
            {(!isPreview || (data.title !== undefined ? data.title : 'CREATIVE SERVICES PRICING')) && (
                <div className="mb-10 w-full relative">
                    <input
                        value={data.title !== undefined ? data.title : 'CREATIVE SERVICES PRICING'}
                        onChange={(e) => updateData(id, { ...data, title: e.target.value })}
                        className={cn(
                            "w-full text-center font-bold bg-transparent border-none p-0 focus:ring-0 outline-none transition-all",
                            isDark ? "text-white" : "text-[#222222]",
                            isPreview ? "pointer-events-none" : "hover:opacity-80 focus:opacity-100 placeholder:opacity-30"
                        )}
                        style={{ fontSize: 'var(--pricing-title-size, 42px)', fontWeight: '800', letterSpacing: '-0.01em' }}
                        placeholder={isPreview ? "" : "Optional Pricing Title..."}
                        readOnly={isPreview}
                    />
                </div>
            )}

            {/* Main Table Design from Screenshot 2 */}
            <div 
                className={cn(
                    "w-full overflow-hidden transition-all duration-300 border-collapse",
                    isDark ? "bg-[#1a1a1a]" : "bg-white"
                )}
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
                <div 
                    className="flex px-6 py-4 border-b transition-all"
                    style={{ 
                        backgroundColor: 'var(--table-header-bg)',
                        color: 'var(--table-header-text, inherit)',
                        borderColor: 'var(--table-border-color)',
                        borderBottomWidth: 'var(--table-stroke-width)',
                        borderTopLeftRadius: 'calc(var(--table-radius-tl) - 1px)',
                        borderTopRightRadius: 'calc(var(--table-radius-tr) - 1px)'
                    }}
                >
                    <div className="flex-1" />
                    <div className="flex items-center gap-8 text-[11px] font-bold text-[inherit] uppercase tracking-wider" style={{ opacity: 0.9 }}>
                        <div className="w-12 text-center">Tax</div>
                        <div className="w-16 text-center">Discount</div>
                        <div className="w-24 text-right pr-2">Total</div>
                    </div>
                </div>

                <div className="relative" style={{ borderColor: 'var(--table-border-color)' }}>
                    <style dangerouslySetInnerHTML={{ __html: `
                        .pricing-standalone-row {
                            border-top-width: var(--table-row-border-width, var(--table-stroke-width)) !important;
                            border-top-style: solid !important;
                            border-top-color: var(--table-border-color) !important;
                        }
                    ` }} />
                    {items.map((item) => (
                        <div 
                            key={item.id} 
                            className="group/item flex items-center gap-4 px-4 py-5 transition-colors relative pricing-standalone-row"
                            style={{ 
                                paddingTop: 'var(--table-cell-padding)', 
                                paddingBottom: 'var(--table-cell-padding)',
                                backgroundColor: hovered === item.id 
                                    ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)') 
                                    : 'var(--table-row-bg, transparent)'
                            }}
                            onMouseEnter={() => setHovered(item.id)}
                            onMouseLeave={() => setHovered('')}
                        >
                            {/* Row Drag Handle */}
                            <div className={cn("p-1 transition-colors cursor-grab", isDark ? "text-white/10 group-hover/item:text-white/30" : "text-black/5 group-hover/item:text-black/20")}>
                                <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor"><circle cx="2" cy="2" r="1.5" /><circle cx="2" cy="9" r="1.5" /><circle cx="2" cy="16" r="1.5" /><circle cx="10" cy="2" r="1.5" /><circle cx="10" cy="9" r="1.5" /><circle cx="10" cy="16" r="1.5" /></svg>
                            </div>

                            {/* Item Image Placeholder */}
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-all", isDark ? "bg-white/5 border-white/10 text-white/20" : "bg-black/5 border-black/10 text-black/20")} style={{ borderWidth: 'var(--table-stroke-width)', borderStyle: 'solid' }}>
                                <ImageIcon size={20} strokeWidth={1.5} />
                            </div>

                            <div className="flex-1 space-y-1">
                                <input
                                    value={item.name}
                                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                    className={cn("w-full font-bold bg-transparent border-none p-0 focus:ring-0", isDark ? "text-[inherit]" : "text-[inherit]")}
                                    style={{ fontSize: 'calc(var(--table-font-size) + 2px)' }}
                                    placeholder="Item Title"
                                />
                                <input
                                    value={item.description}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                    className={cn("w-full bg-transparent border-none p-0 focus:ring-0", isDark ? "text-[inherit] opacity-70" : "text-[inherit] opacity-70")}
                                    style={{ fontSize: 'calc(var(--table-font-size) - 1px)' }}
                                    placeholder="Add a description..."
                                />
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="w-12 flex items-center justify-center">
                                    <input
                                        type="number"
                                        value={item.tax}
                                        onChange={(e) => updateItem(item.id, 'tax', parseFloat(e.target.value) || 0)}
                                        className={cn("w-full text-center font-medium bg-transparent border-none p-0 focus:ring-0", isDark ? "text-[inherit]" : "text-[inherit]")}
                                    />
                                    <span className="text-[12px] opacity-40">%</span>
                                </div>
                                <div className="w-16 flex items-center justify-center">
                                    <input
                                        type="number"
                                        value={item.discount}
                                        onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                        className={cn("w-full text-center font-medium bg-transparent border-none p-0 focus:ring-0", isDark ? "text-[inherit]" : "text-[inherit]")}
                                    />
                                </div>
                                <div className={cn(
                                    "w-24 text-right pr-2 transition-all font-black",
                                    isDark ? "text-[inherit]" : "text-[inherit]"
                                )} style={{ fontSize: 'calc(var(--table-font-size) + 1px)' }}>
                                    {formatCurrency(item.qty * item.rate)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div 
                    className="p-4 border-t transition-all"
                    style={{ 
                        backgroundColor: 'transparent', 
                        borderColor: 'var(--table-border-color)',
                        borderTopWidth: 'var(--table-stroke-width)'
                    }}
                >
                    <button
                        onClick={addItem}
                        className={cn("flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-all rounded-lg text-[inherit] opacity-40 hover:opacity-90 hover:bg-black/5")}
                    >
                        <div className={cn("w-5 h-5 rounded-md border flex items-center justify-center", isDark ? "border-white/10" : "border-black/10")}>
                            <Plus size={12} />
                        </div>
                        Add item
                    </button>
                </div>
            </div>

            {/* SETTINGS MODAL (Screenshot 1) */}
            {
                showSettings && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-[480px] bg-[#1e1e1e] rounded-3xl overflow-hidden shadow-2xl border border-[#333] animate-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="flex items-center justify-between px-8 py-6">
                                <h2 className="text-xl font-bold text-white">Items settings</h2>
                                <button onClick={() => setShowSettings(false)} className="text-[#666] hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* View Switcher */}
                            <div className="px-8 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setSettings({ ...settings, viewMode: 'table' })}
                                        className={cn(
                                            "relative group flex flex-col rounded-xl overflow-hidden border-2 transition-all h-[120px]",
                                            settings.viewMode === 'table' ? "border-[var(--primary-color)]/50 bg-[#2a2a2a]" : "border-transparent bg-[#2a2a2a]/50 opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        <div className="flex-1 p-4 flex flex-col gap-2">
                                            <div className="w-full h-[1px] bg-[#444]" />
                                            <div className="w-full h-[1px] bg-[#444]" />
                                            <div className="w-full h-[1px] bg-[#444]" />
                                            <div className="w-full h-[1px] bg-[#444]" />
                                        </div>
                                        <div className="py-2 text-[11px] font-bold text-center uppercase tracking-wider text-white bg-black/20">Table view</div>
                                    </button>

                                    <button
                                        onClick={() => setSettings({ ...settings, viewMode: 'cards' })}
                                        className={cn(
                                            "relative group flex flex-col rounded-xl overflow-hidden border-2 transition-all h-[120px]",
                                            settings.viewMode === 'cards' ? "border-[var(--primary-color)]/50 bg-[#2a2a2a]" : "border-transparent bg-[#2a2a2a]/50 opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        <div className="flex-1 p-4 flex gap-2 justify-center items-center">
                                            <div className="w-10 h-14 bg-[#444] rounded" />
                                            <div className="w-10 h-14 bg-[#444] rounded" />
                                            <div className="w-10 h-14 bg-[#444] rounded" />
                                        </div>
                                        <div className="py-2 text-[11px] font-bold text-center uppercase tracking-wider text-white bg-black/20">Cards view</div>
                                    </button>
                                </div>

                                {/* Options List */}
                                <div className="py-2 space-y-4">
                                    <div className="bg-[#2a2a2a] rounded-xl px-4 py-3.5 flex items-center justify-between group hover:bg-[#333] transition-colors cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[14px] text-white font-medium">Item image size</span>
                                            <span className="text-[14px] text-gray-400 font-medium">{settings.imageSize}</span>
                                        </div>
                                        <HelpCircle size={14} className="text-[#444] group-hover:text-blue-500 transition-colors" />
                                    </div>

                                    <div className="pt-4 pb-2 border-t border-dashed border-[#333]">
                                        <div className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-4">Interactivity</div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-10">
                                                <button
                                                    onClick={() => setSettings({ ...settings, allowSelection: !settings.allowSelection })}
                                                    className={cn("w-12 h-6 rounded-full relative transition-all duration-300", settings.allowSelection ? "bg-[var(--primary-color)]" : "bg-[#333]")}
                                                >
                                                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300", settings.allowSelection ? "left-7" : "left-1")}>
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <div className="w-[1.5px] h-2 bg-black/10 rounded-full mx-[1px]" />
                                                            <div className="w-[1.5px] h-2 bg-black/10 rounded-full mx-[1px]" />
                                                        </div>
                                                    </div>
                                                </button>
                                                <span className="text-[14px] font-bold text-white">Allow selecting/unselecting items</span>
                                            </div>
                                            <HelpCircle size={14} className="text-blue-500/40" />
                                        </div>
                                    </div>

                                    <div className="pt-4 pb-6 border-t border-dashed border-[#333] space-y-4">
                                        <div className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">More options</div>
                                        <div className="bg-[#2a2a2a] rounded-xl px-4 py-3.5 flex items-center justify-between group hover:bg-[#333] transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[14px] text-white font-medium">Quantity unit</span>
                                                <span className="text-[14px] text-gray-400 font-medium">{settings.quantityUnit}</span>
                                            </div>
                                            <HelpCircle size={14} className="text-[#444] group-hover:text-blue-500 transition-colors" />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                <button
                                                    onClick={() => setSettings({ ...settings, hideQuantity: !settings.hideQuantity })}
                                                    className={cn("w-12 h-6 rounded-full relative transition-all duration-300", settings.hideQuantity ? "bg-[var(--primary-color)]" : "bg-[#333]")}
                                                >
                                                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300", settings.hideQuantity ? "left-7" : "left-1")}>
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <div className="w-[1.5px] h-2 bg-black/10 rounded-full mx-[1px]" />
                                                            <div className="w-[1.5px] h-2 bg-black/10 rounded-full mx-[1px]" />
                                                        </div>
                                                    </div>
                                                </button>
                                                <span className="text-[14px] font-bold text-white">Hide quantity</span>
                                            </div>
                                            <HelpCircle size={14} className="text-blue-500/40" />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                <button
                                                    onClick={() => setSettings({ ...settings, hideAmount: !settings.hideAmount })}
                                                    className={cn("w-12 h-6 rounded-full relative transition-all duration-300", settings.hideAmount ? "bg-[var(--primary-color)]" : "bg-[#333]")}
                                                >
                                                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300", settings.hideAmount ? "left-7" : "left-1")}>
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <div className="w-[1.5px] h-2 bg-black/10 rounded-full mx-[1px]" />
                                                            <div className="w-[1.5px] h-2 bg-black/10 rounded-full mx-[1px]" />
                                                        </div>
                                                    </div>
                                                </button>
                                                <span className="text-[14px] font-bold text-white">Hide amount</span>
                                            </div>
                                            <HelpCircle size={14} className="text-blue-500/40" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="px-8 pb-8 pt-4 flex gap-4">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="flex-1 py-4 px-6 rounded-2xl bg-[#2a2a2a] text-white font-bold text-[15px] hover:bg-[#333] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleSaveSettings(settings)}
                                    className="flex-1 py-4 px-6 rounded-2xl text-black font-bold text-[15px] hover:opacity-90 transition-all"
                                    style={{ backgroundColor: data.design?.primaryColor || '#4dbf39' }}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
}
