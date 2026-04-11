"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useClientStore } from '@/store/useClientStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useProposalStore } from '@/store/useProposalStore';
import {
    X, ChevronRight, FileSpreadsheet, Upload, AlertCircle, 
    CheckCircle2, ArrowLeft, MoreHorizontal, HelpCircle, 
    Calendar, User, DollarSign, Tag, Info, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { gooeyToast } from 'goey-toast';
import Papa from 'papaparse';

type Step = 'upload' | 'mapping' | 'preview';

interface Mapping {
    [key: string]: string; // System Field -> CSV Column Header
}

const SYSTEM_FIELDS: { id: string; label: string; icon: React.ReactNode; required?: boolean; aliases?: string[] }[] = [
    { id: 'title',       label: 'Title / Reference', icon: <Tag size={12} />, required: true, aliases: ['name', 'reference', 'ref', 'invoice no', 'proposal no'] },
    { id: 'client_name', label: 'Client Name',       icon: <User size={12} />, required: true, aliases: ['client', 'customer', 'company', 'client name'] },
    { id: 'amount',      label: 'Amount',            icon: <DollarSign size={12} />, aliases: ['total', 'price', 'cost', 'sum'] },
    { id: 'issue_date',  label: 'Issue Date',        icon: <Calendar size={12} />, aliases: ['date', 'created', 'issued'] },
    { id: 'due_date',    label: 'Due Date',          icon: <Calendar size={12} />, aliases: ['due', 'expiration', 'deadline'] },
    { id: 'paid_at',     label: 'Paid Date',         icon: <CheckCircle2 size={12} />, aliases: ['paid', 'payment date', 'settled'] },
    { id: 'status',      label: 'Status',            icon: <AlertCircle size={12} />, aliases: ['state'] },
    { id: 'notes',       label: 'Notes',             icon: <MoreHorizontal size={12} />, aliases: ['description', 'memo'] },
];

export default function CSVImportModal() {
    const { isImportModalOpen, setImportModalOpen, importType, theme } = useUIStore();
    const { clients, addClient } = useClientStore();
    const { addInvoice } = useInvoiceStore();
    const { addProposal } = useProposalStore();

    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Mapping>({});
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [previewData, setPreviewData] = useState<any[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const isDark = theme === 'dark';

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isImportModalOpen) {
            setStep('upload');
            setFile(null);
            setCsvData([]);
            setHeaders([]);
            setMapping({});
            setPreviewData([]);
            setProgress(0);
        }
    }, [isImportModalOpen]);

    if (!isImportModalOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) processFile(selectedFile);
    };

    const processFile = (selectedFile: File) => {
        if (!selectedFile.name.endsWith('.csv')) {
            gooeyToast.error("Please upload a CSV file");
            return;
        }

        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data.length === 0) {
                    gooeyToast.error("The CSV file is empty");
                    return;
                }
                setFile(selectedFile);
                setCsvData(results.data);
                setHeaders(results.meta.fields || []);
                
                // Auto-suggest mapping
                const newMapping: Mapping = {};
                const csvHeaders = results.meta.fields || [];
                
                SYSTEM_FIELDS.forEach(field => {
                    const match = csvHeaders.find(h => {
                        const headerLower = h.toLowerCase().trim();
                        const matchesLower = [
                            field.id.toLowerCase(),
                            field.label.toLowerCase(),
                            ...(field.aliases || [])
                        ];
                        return matchesLower.some(m => 
                            headerLower === m || 
                            headerLower.includes(m) || 
                            (m.includes(headerLower) && headerLower.length > 3)
                        );
                    });
                    if (match) newMapping[field.id] = match;
                });
                
                setMapping(newMapping);
                setStep('mapping');
            },
            error: (err) => {
                gooeyToast.error("Failed to parse CSV: " + err.message);
            }
        });
    };

    const handleMappingChange = (fieldId: string, csvHeader: string) => {
        setMapping(prev => ({ ...prev, [fieldId]: csvHeader }));
    };

    const normalizeDate = (dateStr: string) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    const proceedToPreview = () => {
        // Validate required mappings
        const missing = SYSTEM_FIELDS.filter(f => f.required && !mapping[f.id]);
        if (missing.length > 0) {
            gooeyToast.error(`Please map required fields: ${missing.map(f => f.label).join(', ')}`);
            return;
        }

        // Generate preview
        const generated = csvData.map(row => {
            const item: any = {};
            SYSTEM_FIELDS.forEach(f => {
                const csvKey = mapping[f.id];
                let val = csvKey ? row[csvKey] : '';
                
                // Normalization
                if (f.id === 'amount') {
                    val = parseFloat(val.toString().replace(/[^0-9.-]+/g, "")) || 0;
                }
                
                if (f.id === 'issue_date' || f.id === 'due_date') {
                    val = normalizeDate(val.toString()) || new Date().toISOString().split('T')[0];
                }
                
                if (f.id === 'paid_at') {
                    val = val ? normalizeDate(val.toString()) : null;
                }
                
                if (f.id === 'status') {
                    const s = val.toString().trim().toLowerCase();
                    if (importType === 'Invoice') {
                        const valid = ['draft', 'pending', 'paid', 'overdue', 'cancelled'];
                        const match = valid.find(v => v === s);
                        val = match ? match.charAt(0).toUpperCase() + match.slice(1) : 'Draft';
                    } else {
                        const valid = ['draft', 'pending', 'accepted', 'overdue', 'declined', 'cancelled'];
                        const match = valid.find(v => v === s);
                        val = match ? match.charAt(0).toUpperCase() + match.slice(1) : 'Draft';
                    }
                }

                item[f.id] = val;
            });
            return item;
        });

        setPreviewData(generated);
        setStep('preview');
    };

    const handleImport = async () => {
        setImporting(true);
        setProgress(0);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (let i = 0; i < previewData.length; i++) {
                const item = previewData[i];
                // 1. Resolve Client
                let clientId = null;
                const existingClient = clients.find(c => 
                    c.contact_person?.toLowerCase() === item.client_name?.toLowerCase() || 
                    c.company_name?.toLowerCase() === item.client_name?.toLowerCase()
                );

                if (existingClient) {
                    clientId = existingClient.id;
                } else {
                    // Auto-create contact
                    const newClient = await addClient({
                        contact_person: item.client_name,
                        company_name: '',
                        email: '',
                        phone: '',
                        address: '',
                        tax_number: '',
                        notes: 'Automatically created during CSV import'
                    });
                    if (newClient) clientId = newClient.id;
                }

                // 2. Add Entry
                const payload: any = {
                    title: item.title,
                    client_id: clientId,
                    client_name: item.client_name,
                    amount: item.amount || 0,
                    issue_date: item.issue_date || new Date().toISOString().split('T')[0],
                    due_date: item.due_date || new Date().toISOString().split('T')[0],
                    status: item.status || 'Draft',
                    notes: item.notes || '',
                    blocks: []
                };
                
                if (importType === 'Invoice') {
                    payload.paid_at = item.paid_at || null;
                }

                const result = importType === 'Invoice' 
                    ? await addInvoice(payload as any)
                    : await addProposal(payload as any);

                if (result) successCount++;
                else errorCount++;
                
                setProgress(Math.round(((i + 1) / previewData.length) * 100));
            }

            if (successCount > 0) {
                gooeyToast.success(`Successfully imported ${successCount} ${importType.toLowerCase()}s`);
                if (errorCount > 0) gooeyToast.error(`Failed to import ${errorCount} items`);
                setImportModalOpen(false);
            } else {
                gooeyToast.error("Failed to import items. Check your CSV data.");
            }
        } catch (err) {
            console.error(err);
            gooeyToast.error("An unexpected error occurred during import");
        } finally {
            setImporting(false);
            setProgress(0);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={e => { if (e.target === e.currentTarget) setImportModalOpen(false); }}
        >
            <div className={cn(
                "w-full max-w-[640px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200",
                isDark ? "bg-[#161616] border border-[#252525]" : "bg-white border border-[#e0e0e0]"
            )}>
                {/* Header */}
                <div className={cn(
                    "flex items-center justify-between px-6 py-5 border-b",
                    isDark ? "border-[#252525]" : "border-[#f0f0f5]"
                )}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <FileSpreadsheet size={18} className="text-primary" />
                        </div>
                        <div>
                            <h2 className={cn("text-[16px] font-bold tracking-tight", isDark ? "text-white" : "text-[#111]")}>
                                Import {importType}s
                            </h2>
                            <p className={cn("text-[11px] font-medium opacity-50", isDark ? "text-white" : "text-[#111]")}>
                                {step === 'upload' ? 'Upload your CSV file' : 
                                 step === 'mapping' ? 'Map columns to system fields' : 
                                 'Review data before finalizing'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setImportModalOpen(false)}
                        className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                            isDark ? "bg-[#252525] text-[#666] hover:text-[#ccc]" : "bg-[#f5f5f7] text-[#888] hover:text-[#333]"
                        )}
                    >
                        <X size={16} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto max-h-[500px] min-h-[360px] no-scrollbar">
                    {/* Phase 1: Upload */}
                    {step === 'upload' && (
                        <div className="p-10 flex flex-col items-center justify-center h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
                                className={cn(
                                    "w-full py-16 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all active:scale-[0.98]",
                                    isDark ? "bg-white/[0.02] border-[#2e2e2e] hover:border-[#444] hover:bg-white/[0.04]" : "bg-[#f9f9fb] border-[#e0e0e8] hover:border-[#ccc] hover:bg-[#f5f5f9]"
                                )}
                            >
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Upload size={28} className="text-primary" />
                                </div>
                                <div className="text-center">
                                    <p className={cn("text-[14px] font-bold mb-1", isDark ? "text-white" : "text-[#111]")}>
                                        Click or drag CSV here
                                    </p>
                                    <p className={cn("text-[12px] opacity-40", isDark ? "text-white" : "text-[#111]")}>
                                        Max file size 10MB
                                    </p>
                                </div>
                                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
                            </div>
                            
                            <div className={cn("mt-8 p-4 rounded-xl border flex gap-3 max-w-[400px]", isDark ? "bg-[#1c1c1c] border-[#252525]" : "bg-[#f9f9fb] border-[#f0f0f5]")}>
                                <Info size={16} className="text-primary shrink-0 mt-0.5" />
                                <div className="text-[11px] leading-relaxed opacity-60">
                                    Ensure your CSV has headers. We'll try to automatically match your columns to our fields.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Phase 2: Mapping */}
                    {step === 'mapping' && (
                        <div className="p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex flex-col gap-4">
                                {SYSTEM_FIELDS.map(field => (
                                    <div key={field.id} className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl border transition-all",
                                        mapping[field.id] 
                                            ? isDark ? "bg-[#1c1c1c] border-primary/20" : "bg-white border-primary/20 shadow-sm"
                                            : isDark ? "bg-[#111] border-[#252525]" : "bg-white border-[#f0f0f5]"
                                    )}>
                                        <div className="flex-1 flex items-center gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                                mapping[field.id] ? "bg-primary/10 text-primary" : "bg-[#252525] text-[#555]"
                                            )}>
                                                {field.icon}
                                            </div>
                                            <div>
                                                <p className={cn("text-[13px] font-bold flex items-center gap-1.5", isDark ? "text-white" : "text-[#111]")}>
                                                    {field.label}
                                                    {field.required && <span className="text-red-500 font-black text-[14px] leading-none mb-1">*</span>}
                                                </p>
                                                <p className={cn("text-[10px] opacity-40 uppercase tracking-wider font-bold", isDark ? "text-white" : "text-[#111]")}>
                                                    System Field
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <ChevronRight size={14} className="opacity-20" />
                                            <select 
                                                value={mapping[field.id] || ''}
                                                onChange={e => handleMappingChange(field.id, e.target.value)}
                                                className={cn(
                                                    "w-[200px] h-10 px-3 rounded-lg text-[13px] font-medium outline-none border transition-all cursor-pointer",
                                                    mapping[field.id]
                                                        ? isDark ? "bg-[#252525] border-primary/10 text-white" : "bg-[#f5faff] border-primary/20 text-primary"
                                                        : isDark ? "bg-[#1c1c1c] border-[#2e2e2e] text-[#555]" : "bg-[#f9f9fb] border-[#eaeaef] text-[#999]"
                                                )}
                                            >
                                                <option value="">Ignore field</option>
                                                {headers.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Phase 3: Preview */}
                    {step === 'preview' && (
                        <div className="p-0 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className={cn("sticky top-0 z-10 px-6 py-3 border-b backdrop-blur-md", isDark ? "bg-[#161616]/80 border-[#252525]" : "bg-white/80 border-[#f0f0f5]")}>
                                <div className="flex items-center justify-between">
                                    <p className={cn("text-[12px] font-bold", isDark ? "text-[#555]" : "text-[#aaa]")}>
                                        {previewData.length} entries found
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-[#555]" : "text-[#aaa]")}>
                                            Ready to import
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="divide-y divide-inherit border-inherit">
                                {previewData.map((item, i) => (
                                    <div key={i} className={cn(
                                        "px-6 py-4 flex items-center justify-between group transition-colors",
                                        isDark ? "hover:bg-white/[0.02]" : "hover:bg-primary/[0.02]"
                                    )}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className={cn("text-[13px] font-bold truncate", isDark ? "text-white" : "text-[#111]")}>
                                                    {item.title || "Untitled Entry"}
                                                </p>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                                                    isDark ? "bg-white/5 text-[#666]" : "bg-[#f5f5f7] text-[#aaa]"
                                                )}>
                                                    {item.status || 'Draft'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-[11px]">
                                                <div className="flex items-center gap-1.5 opacity-40">
                                                    <User size={11} />
                                                    <span className="truncate max-w-[120px]">{item.client_name}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 opacity-40">
                                                    <Calendar size={11} />
                                                    <span>{item.issue_date}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn("text-[14px] font-black", isDark ? "text-primary" : "text-primary")}>
                                                ${parseFloat(item.amount || 0).toLocaleString()}
                                            </p>
                                            <p className={cn("text-[10px] opacity-30 font-bold uppercase tracking-widest mt-0.5", isDark ? "text-white" : "text-[#111]")}>
                                                Amount
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={cn(
                    "px-6 py-4 border-t flex items-center justify-between",
                    isDark ? "bg-[#111] border-[#252525]" : "bg-[#f9f9fb] border-[#f0f0f5]"
                )}>
                    {step === 'upload' ? (
                        <div />
                    ) : (
                        <button 
                            onClick={() => setStep(step === 'preview' ? 'mapping' : 'upload')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 text-[13px] font-bold rounded-xl transition-all active:scale-[0.98]",
                                isDark ? "text-[#777] hover:text-white hover:bg-white/5" : "text-[#888] hover:text-[#333] hover:bg-[#efeff5]"
                            )}
                        >
                            <ArrowLeft size={14} strokeWidth={3} />
                            Back
                        </button>
                    )}

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setImportModalOpen(false)}
                            className={cn(
                                "px-4 py-2 text-[13px] font-bold rounded-xl transition-all active:scale-[0.98]",
                                isDark ? "text-[#555] hover:text-[#ccc]" : "text-[#aaa] hover:text-[#555]"
                            )}
                        >
                            Cancel
                        </button>
                        
                        {step !== 'upload' && (
                            <div className="relative flex flex-col justify-center">
                                {importing && (
                                    <div className="absolute -top-3 left-0 right-0 h-1 bg-black/5 dark:bg-white/5 overflow-hidden rounded-full content-center">
                                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                                    </div>
                                )}
                                <button 
                                    onClick={step === 'mapping' ? proceedToPreview : handleImport}
                                    disabled={importing}
                                    className="flex items-center justify-center gap-2 px-6 py-2 min-w-[160px] text-[13px] font-black rounded-xl bg-primary hover:bg-primary-hover text-black transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20"
                                >
                                    {importing ? `Importing... ${progress}%` : 
                                     step === 'mapping' ? "Preview Data" : 
                                     `Import ${previewData.length} Items`}
                                    {!importing && <ChevronRight size={14} strokeWidth={3} />}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
