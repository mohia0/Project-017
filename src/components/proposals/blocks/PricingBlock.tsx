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

export function PricingBlock({ id, data, updateData }: { id: string, data: any, updateData: (id: string, data: any) => void }) {

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
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val);
    };

    const handleSaveSettings = (newSettings: typeof settings) => {
        setSettings(newSettings);
        updateData(id, { ...data, settings: newSettings });
        setShowSettings(false);
    };

    return (
        <div className="w-full relative">


            {/* Main Table Design from Screenshot 2 */}
            <div className="w-full bg-white border border-[#e2e2e2] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
                <div className="flex px-6 py-4 border-b border-[#f0f0f0]">
                    <div className="flex-1" />
                    <div className="flex items-center gap-8 text-[11px] font-bold text-[#999] uppercase tracking-wider">
                        <div className="w-12 text-center">Tax</div>
                        <div className="w-16 text-center">Discount</div>
                        <div className="w-24 text-right pr-2">Total</div>
                    </div>
                </div>

                <div className="divide-y divide-[#f0f0f0]">
                    {items.map((item) => (
                        <div key={item.id} className="group/item flex items-center gap-4 px-4 py-5 hover:bg-[#fafafa] transition-colors relative">
                            {/* Row Drag Handle (Visual only for now) */}
                            <div className="p-1 text-[#eee] group-hover/item:text-[#ccc] transition-colors cursor-grab">
                                <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor"><circle cx="2" cy="2" r="1.5" /><circle cx="2" cy="9" r="1.5" /><circle cx="2" cy="16" r="1.5" /><circle cx="10" cy="2" r="1.5" /><circle cx="10" cy="9" r="1.5" /><circle cx="10" cy="16" r="1.5" /></svg>
                            </div>

                            {/* Item Image Placeholder */}
                            <div className="w-10 h-10 rounded-lg bg-[#f9f9f9] border border-[#e2e2e2] flex items-center justify-center text-[#ccc]">
                                <ImageIcon size={20} strokeWidth={1.5} />
                            </div>

                            <div className="flex-1 space-y-1">
                                <input
                                    value={item.name}
                                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                    className="w-full font-bold text-[#111] bg-transparent border-none p-0 focus:ring-0 text-[14px]"
                                    placeholder="Item Title"
                                />
                                <input
                                    value={item.description}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                    className="w-full text-[13px] text-[#666] bg-transparent border-none p-0 focus:ring-0"
                                    placeholder="Add a description..."
                                />
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="w-12 flex items-center justify-center">
                                    <input
                                        type="number"
                                        value={item.tax}
                                        onChange={(e) => updateItem(item.id, 'tax', parseFloat(e.target.value) || 0)}
                                        className="w-full text-center text-sm font-medium bg-transparent border-none p-0 focus:ring-0 text-[#111]"
                                    />
                                    <span className="text-sm text-[#999]">%</span>
                                </div>
                                <div className="w-16 flex items-center justify-center">
                                    <input
                                        type="number"
                                        value={item.discount}
                                        onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                        className="w-full text-center text-sm font-medium bg-transparent border-none p-0 focus:ring-0 text-[#111]"
                                    />
                                </div>
                                <div className="w-24 text-right font-bold text-[#111] pr-2">
                                    {formatCurrency(item.qty * item.rate)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-[#fcfcfc] border-t border-[#f0f0f0]">
                    <button
                        onClick={addItem}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#999] hover:text-[#111] hover:bg-[#f0f0f0] rounded-lg transition-all"
                    >
                        <div className="w-5 h-5 rounded-md border border-[#ddd] flex items-center justify-center">
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
                                            settings.viewMode === 'table' ? "border-[#4dbf39]/50 bg-[#2a2a2a]" : "border-transparent bg-[#2a2a2a]/50 opacity-60 hover:opacity-100"
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
                                            settings.viewMode === 'cards' ? "border-[#4dbf39]/50 bg-[#2a2a2a]" : "border-transparent bg-[#2a2a2a]/50 opacity-60 hover:opacity-100"
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
                                                    className={cn("w-12 h-6 rounded-full relative transition-all duration-300", settings.allowSelection ? "bg-[#4ade80]" : "bg-[#333]")}
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
                                                    className={cn("w-12 h-6 rounded-full relative transition-all duration-300", settings.hideQuantity ? "bg-[#4ade80]" : "bg-[#333]")}
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
                                                    className={cn("w-12 h-6 rounded-full relative transition-all duration-300", settings.hideAmount ? "bg-[#4ade80]" : "bg-[#333]")}
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
                                    className="flex-1 py-4 px-6 rounded-2xl bg-[#4ade80] text-black font-bold text-[15px] hover:bg-[#34d399] transition-all shadow-[0_4px_20px_rgba(74,222,128,0.2)]"
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
