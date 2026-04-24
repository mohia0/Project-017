"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useClientStore } from '@/store/useClientStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useProposalStore } from '@/store/useProposalStore';
import {
    X, ChevronRight, FileSpreadsheet, Upload, Download, AlertCircle, 
    CheckCircle2, ArrowLeft, MoreHorizontal, HelpCircle, 
    Calendar, User, DollarSign, Tag, Info, AlertTriangle, Building2, Mail, Phone, MapPin, Globe, Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { appToast } from '@/lib/toast';
import Papa from 'papaparse';
import { useCompanyStore } from '@/store/useCompanyStore';
import { parse, isValid, format } from 'date-fns';
import { supabase } from '@/lib/supabase';

type Step = 'upload' | 'mapping' | 'preview';

interface Mapping {
    [key: string]: string; // System Field -> CSV Column Header
}

const SYSTEM_FIELDS: { id: string; label: string; icon: React.ReactNode; required?: boolean; aliases?: string[] }[] = [
    { id: 'title',       label: 'Title / Reference', icon: <Tag size={12} />, required: true, aliases: ['name', 'reference', 'ref', 'invoice no', 'proposal no'] },
    { id: 'client_name', label: 'Client Name',       icon: <User size={12} />, required: true, aliases: ['client', 'customer', 'company', 'client name', 'for'] },
    { id: 'amount',      label: 'Amount',            icon: <DollarSign size={12} />, aliases: ['total', 'price', 'cost', 'sum'] },
    { id: 'issue_date',  label: 'Issue Date',        icon: <Calendar size={12} />, aliases: ['date', 'created', 'issued'] },
    { id: 'due_date',    label: 'Due Date',          icon: <Calendar size={12} />, aliases: ['due', 'expiration', 'deadline', 'expiry date'] },
    { id: 'paid_at',     label: 'Paid Date',         icon: <CheckCircle2 size={12} />, aliases: ['paid', 'payment date', 'settled'] },
    { id: 'status',      label: 'Status',            icon: <AlertCircle size={12} />, aliases: ['state'] },
    { id: 'notes',       label: 'Notes',             icon: <MoreHorizontal size={12} />, aliases: ['description', 'memo'] },
];

export default function CSVImportModal() {
    const { isImportModalOpen, setImportModalOpen, importType, theme } = useUIStore();


    const [createUnknownAs, setCreateUnknownAs] = useState<'contact' | 'company'>('contact');
    const [combineNames, setCombineNames] = useState(true);

    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Mapping>({});
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [previewData, setPreviewData] = useState<any[]>([]);

    const getSystemFields = (type: string) => {
        if (type === 'Contact') {
            return [
                { id: 'first_name', label: 'First Name', icon: <User size={12} />, aliases: ['first name', 'first', 'given name', 'fname'] },
                { id: 'last_name', label: 'Last Name', icon: <User size={12} />, aliases: ['last name', 'last', 'surname', 'lname'] },
                { id: 'company_name', label: 'Company Name', icon: <Building2 size={12} />, aliases: ['company', 'organization'] },
                { id: 'email', label: 'Email', icon: <Mail size={12} />, aliases: ['email address', 'email'] },
                { id: 'phone', label: 'Phone', icon: <Phone size={12} />, aliases: ['phone number', 'mobile', 'cell', 'telephone'] },
                { id: 'address', label: 'Address', icon: <MapPin size={12} />, aliases: ['location', 'street', 'city'] },
                { id: 'tax_number', label: 'Tax Number', icon: <FileSpreadsheet size={12} />, aliases: ['vat', 'tax/vat', 'tax id', 'ein'] },
                { id: 'country', label: 'Country', icon: <Globe size={12} />, aliases: ['nation', 'state', 'location'] },
                { id: 'notes', label: 'Notes', icon: <MoreHorizontal size={12} />, aliases: ['description', 'memo', 'comments'] },
            ];
        }
        if (type === 'Company') {
            return [
                { id: 'name', label: 'Company Name', icon: <Building2 size={12} />, required: true, aliases: ['company'] },
                { id: 'industry', label: 'Industry', icon: <Briefcase size={12} />, aliases: ['sector'] },
                { id: 'email', label: 'Email', icon: <Mail size={12} />, aliases: ['email address'] },
                { id: 'phone', label: 'Phone', icon: <Phone size={12} />, aliases: ['phone number'] },
                { id: 'website', label: 'Website', icon: <Globe size={12} />, aliases: ['url', 'site'] },
                { id: 'address', label: 'Address', icon: <MapPin size={12} />, aliases: ['location'] },
                { id: 'country', label: 'Country', icon: <Globe size={12} />, aliases: ['nation', 'state', 'location'] },
            ];
        }
        if (type === 'Invoice') {
            return [
                { id: 'title',       label: 'Title / Reference', icon: <Tag size={12} />, required: true, aliases: ['name', 'reference', 'ref', 'invoice no'] },
                { id: 'client_name', label: 'Client Name',       icon: <User size={12} />, required: true, aliases: ['client', 'customer', 'company', 'client name', 'for'] },
                { id: 'amount',      label: 'Amount',            icon: <DollarSign size={12} />, aliases: ['total', 'price', 'cost', 'sum'] },
                { id: 'issue_date',  label: 'Issue Date',        icon: <Calendar size={12} />, aliases: ['date', 'created', 'issued'] },
                { id: 'due_date',    label: 'Due Date',          icon: <Calendar size={12} />, aliases: ['due', 'expiration', 'deadline', 'expiry date'] },
                { id: 'paid_at',     label: 'Paid Date',         icon: <CheckCircle2 size={12} />, aliases: ['paid', 'payment date', 'settled'] },
                { id: 'status',      label: 'Status',            icon: <AlertCircle size={12} />, aliases: ['state'] },
                { id: 'notes',       label: 'Notes',             icon: <MoreHorizontal size={12} />, aliases: ['description', 'memo'] }
            ];
        }
        if (type === 'Proposal') {
            return [
                { id: 'title',       label: 'Title / Reference', icon: <Tag size={12} />, required: true, aliases: ['name', 'reference', 'ref', 'proposal no'] },
                { id: 'client_name', label: 'Client Name',       icon: <User size={12} />, required: true, aliases: ['client', 'customer', 'company', 'client name', 'for'] },
                { id: 'amount',      label: 'Amount',            icon: <DollarSign size={12} />, aliases: ['total', 'price', 'cost', 'sum'] },
                { id: 'issue_date',  label: 'Issue Date',        icon: <Calendar size={12} />, aliases: ['date', 'created', 'issued'] },
                { id: 'due_date',    label: 'Due Date',          icon: <Calendar size={12} />, aliases: ['due', 'expiration', 'deadline', 'expiry date'] },
                { id: 'accepted_at', label: 'Accepted Date',     icon: <CheckCircle2 size={12} />, aliases: ['accepted', 'approval date', 'signed date', 'approved date'] },
                { id: 'status',      label: 'Status',            icon: <AlertCircle size={12} />, aliases: ['state'] },
                { id: 'notes',       label: 'Notes',             icon: <MoreHorizontal size={12} />, aliases: ['description', 'memo'] }
            ];
        }
        return [];
    };

    const currentSystemFields = getSystemFields(importType);

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
            setCombineNames(true);
        }
    }, [isImportModalOpen]);

    if (!isImportModalOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) processFile(selectedFile);
    };

    const processFile = (selectedFile: File) => {
        if (!selectedFile.name.endsWith('.csv')) {
            appToast.error("Error", "Please upload a CSV file");
            return;
        }

        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data.length === 0) {
                    appToast.error("Error", "The CSV file is empty");
                    return;
                }
                setFile(selectedFile);
                setCsvData(results.data);
                setHeaders(results.meta.fields || []);
                
                // Auto-suggest mapping
                const newMapping: Mapping = {};
                const csvHeaders = results.meta.fields || [];
                const usedHeaders = new Set<string>();
                
                currentSystemFields.forEach(field => {
                    const matchesLower = [
                        field.id.toLowerCase(),
                        field.label.toLowerCase(),
                        ...(field.aliases || [])
                    ].map(s => s.trim());
                    
                    // 1. Try exact match first
                    let match = csvHeaders.find(h => {
                        if (usedHeaders.has(h)) return false;
                        const headerLower = h.toLowerCase().trim();
                        return matchesLower.includes(headerLower);
                    });
                    
                    // 2. Try partial match if no exact match
                    if (!match) {
                        match = csvHeaders.find(h => {
                            if (usedHeaders.has(h)) return false;
                            const headerLower = h.toLowerCase().trim();
                            // Only match if the header contains a significant word from the aliases
                            return matchesLower.some(m => {
                                if (m.length <= 3) return headerLower === m;
                                return headerLower.includes(m) || m.includes(headerLower);
                            });
                        });
                    }
                    
                    if (match) {
                        newMapping[field.id] = match;
                        usedHeaders.add(match);
                    }
                });
                
                setMapping(newMapping);
                setStep('mapping');
            },
            error: (err) => {
                appToast.error("Error", "Failed to parse CSV: " + err.message);
            }
        });
    };

    const handleMappingChange = (fieldId: string, csvHeader: string) => {
        setMapping(prev => ({ ...prev, [fieldId]: csvHeader }));
    };

    const normalizeDate = (dateStr: string) => {
        if (!dateStr || typeof dateStr !== 'string') return null;
        const trimmed = dateStr.trim();
        if (!trimmed) return null;

        // 1. Strict unambiguous formats (YYYY-MM-DD or ISO strings)
        if (/^\d{4}[\/\-.]\d{2}[\/\-.]\d{2}/.test(trimmed)) {
            const d = new Date(trimmed);
            if (!isNaN(d.getTime())) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }
        }

        // 2. Try common European/International (Day First) formats using date-fns BEFORE native fallback
        // We prioritize dd/MM over MM/dd because native JS covers MM/dd natively
        const formats = [
            'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd',
            'dd-MM-yyyy', 'MM-dd-yyyy', 'yyyy-MM-dd',
            'dd.MM.yyyy', 'MM.dd.yyyy', 'yyyy.MM.dd',
            'd/M/yyyy', 'M/d/yyyy', 'd-M-yyyy', 'M-d-yyyy',
            'd/M/yy', 'M/d/yy', 'dd/MM/yy', 'MM/dd/yy'
        ];

        for (const f of formats) {
            try {
                // Must use strict parsing so "12/10/2025" strictly matches the format template
                const parsed = parse(trimmed, f, new Date());
                if (isValid(parsed)) {
                    if (parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
                        return format(parsed, 'yyyy-MM-dd');
                    }
                }
            } catch (e) {
                // Ignore parsing errors for specific patterns
            }
        }

        // 3. Fallback native JS parsing
        const d = new Date(trimmed);
        if (!isNaN(d.getTime()) && trimmed.length >= 8) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }

        return null;
    };

    const proceedToPreview = () => {
        // Validate required mappings
        const missing = currentSystemFields.filter(f => f.required && !mapping[f.id]);
        
        if (importType === 'Contact') {
            const hasFirstOrLastName = !!mapping['first_name'] || !!mapping['last_name'];
            if (!hasFirstOrLastName) {
                appToast.error("Error", "Please map either First Name or Last Name for contacts");
                return;
            }
        } else {
            if (missing.length > 0) {
                appToast.error("Error", `Please map required fields: ${missing.map(f => f.label).join(', ')}`);
                return;
            }
        }

        // Generate preview
        const generated = csvData.map(row => {
            const item: any = {};
            currentSystemFields.forEach(f => {
                const csvKey = mapping[f.id];
                let val = csvKey ? row[csvKey] : '';
                
                // Normalization
                if (f.id === 'amount') {
                    let amountStr = val.toString().trim();
                    const hasComma = amountStr.includes(',');
                    const hasDot = amountStr.includes('.');

                    if (hasComma && hasDot) {
                        const lastComma = amountStr.lastIndexOf(',');
                        const lastDot = amountStr.lastIndexOf('.');
                        if (lastComma > lastDot) {
                            amountStr = amountStr.replace(/\./g, '').replace(/,/g, '.');
                        } else {
                            amountStr = amountStr.replace(/,/g, '');
                        }
                    } else if (hasComma && !hasDot) {
                        const match = amountStr.match(/,/g);
                        if (match && match.length > 1) {
                            amountStr = amountStr.replace(/,/g, '');
                        } else {
                            const parts = amountStr.split(',');
                            if (parts[1] && parts[1].length === 3) {
                                amountStr = amountStr.replace(/,/g, '');
                            } else {
                                amountStr = amountStr.replace(/,/g, '.');
                            }
                        }
                    } else if (hasDot && !hasComma) {
                        const match = amountStr.match(/\./g);
                        if (match && match.length > 1) {
                            amountStr = amountStr.replace(/\./g, '');
                        }
                    }
                    val = parseFloat(amountStr.replace(/[^0-9.-]+/g, "")) || 0;
                }
                
                if (f.id === 'issue_date' || f.id === 'due_date') {
                    val = normalizeDate(val.toString()) || new Date().toISOString().split('T')[0];
                }
                
                if (f.id === 'paid_at' || f.id === 'accepted_at') {
                    val = val ? normalizeDate(val.toString()) : null;
                }
                
                if (f.id === 'status') {
                    const s = val.toString().trim().toLowerCase();
                    
                    if (importType === 'Invoice') {
                        // Invoice Mappings
                        const paidAliases = ['paid', 'success', 'completed', 'received', 'settled', 'done'];
                        const pendingAliases = ['pending', 'unpaid', 'waiting', 'sent', 'partial'];
                        const overdueAliases = ['overdue', 'late', 'expired'];
                        const cancelledAliases = ['cancelled', 'void', 'refunded', 'deleted'];
                        const draftAliases = ['draft', 'new', 'temp'];

                        if (paidAliases.includes(s)) val = 'Paid';
                        else if (pendingAliases.includes(s)) val = 'Pending';
                        else if (overdueAliases.includes(s)) val = 'Overdue';
                        else if (cancelledAliases.includes(s)) val = 'Cancelled';
                        else if (draftAliases.includes(s)) val = 'Draft';
                        else val = 'Draft';
                    } else {
                        // Proposal/Contact Mappings (Draft, Pending, Accepted, Overdue, Declined, Cancelled)
                        const acceptedAliases = ['accepted', 'approved', 'yes', 'signed', 'win', 'won', 'completed', 'active'];
                        const declinedAliases = ['declined', 'rejected', 'no', 'denied', 'lost', 'fail'];
                        const pendingAliases = ['pending', 'sent', 'waiting', 'new'];
                        const overdueAliases = ['overdue', 'late', 'expired'];
                        const cancelledAliases = ['cancelled', 'void', 'archived'];
                        const draftAliases = ['draft', 'temp'];

                        if (acceptedAliases.includes(s)) val = 'Accepted';
                        else if (declinedAliases.includes(s)) val = 'Declined';
                        else if (pendingAliases.includes(s)) val = 'Pending';
                        else if (overdueAliases.includes(s)) val = 'Overdue';
                        else if (cancelledAliases.includes(s)) val = 'Cancelled';
                        else if (draftAliases.includes(s)) val = 'Draft';
                        else val = 'Draft';
                    }
                }

                item[f.id] = val;
            });
            
            if (importType === 'Contact') {
                if (!item.contact_person) {
                    const first = item.first_name || '';
                    const last = item.last_name || '';
                    if (combineNames) {
                        item.contact_person = `${first} ${last}`.trim();
                    } else {
                        item.contact_person = first.trim() || last.trim();
                    }
                }
                if (!item.contact_person) {
                    item.contact_person = item.company_name || item.email || 'Unknown Contact';
                }
            }

            // Post-processing defaults for Invoice/Proposal statuses
            if (importType === 'Invoice' && item.status === 'Paid' && !item.paid_at) {
                item.paid_at = item.issue_date || new Date().toISOString().split('T')[0];
            }
            if (importType === 'Proposal' && item.status === 'Accepted' && !item.accepted_at) {
                item.accepted_at = item.issue_date || new Date().toISOString().split('T')[0];
            }
            
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
            const workspaceId = useUIStore.getState().activeWorkspaceId;
            if (!workspaceId) throw new Error('No active workspace');

            // 1. Pre-create unknown clients/companies first
            const currentClients = useClientStore.getState().clients;
            const currentCompanies = useCompanyStore.getState().companies;

            if (importType === 'Invoice' || importType === 'Proposal') {
                const uniqueClientNames = Array.from(new Set(
                    previewData
                        .map(item => item.client_name?.trim())
                        .filter(Boolean)
                ));

                const clientsToCreate = uniqueClientNames.filter(name => {
                    const nameLower = name.toLowerCase();
                    const exists = currentClients.some(c => 
                        c.contact_person?.toLowerCase() === nameLower || 
                        c.company_name?.toLowerCase() === nameLower
                    ) || currentCompanies.some(c => 
                        c.name?.toLowerCase() === nameLower
                    );
                    return !exists;
                });

                if (clientsToCreate.length > 0) {
                    const entityPayloads = clientsToCreate.map(name => {
                        if (createUnknownAs === 'company') {
                            return {
                                workspace_id: workspaceId,
                                name
                            };
                        } else {
                            return {
                                workspace_id: workspaceId,
                                contact_person: name, 
                                company_name: '',
                                email: ''
                            };
                        }
                    });

                    const table = createUnknownAs === 'company' ? 'companies' : 'clients';
                    const { error } = await supabase.from(table).insert(entityPayloads);
                    if (error) console.error(`Error auto-creating ${table}:`, error.message, error.details, error.hint);

                    // Refresh stores to get the newly created IDs
                    if (createUnknownAs === 'company') {
                        await useCompanyStore.getState().fetchCompanies();
                    } else {
                        await useClientStore.getState().fetchClients();
                    }
                }
            }

            if (importType === 'Contact' && createUnknownAs === 'contact') {
                const uniqueCompanyNames = Array.from(new Set(
                    previewData
                        .map(item => item.company_name?.trim())
                        .filter(Boolean)
                ));

                const companiesToCreate = uniqueCompanyNames.filter(name => {
                    const nameLower = name.toLowerCase();
                    return !currentCompanies.some(c => c.name?.toLowerCase() === nameLower);
                });

                if (companiesToCreate.length > 0) {
                    const companyPayloads = companiesToCreate.map(name => ({
                        workspace_id: workspaceId,
                        name
                    }));

                    const { error } = await supabase.from('companies').insert(companyPayloads);
                    if (error) {
                        console.error('Error auto-creating companies from contact import:', error.message, error.details, error.hint);
                        throw error;
                    }
                    
                    // Refresh companies store
                    await useCompanyStore.getState().fetchCompanies();
                }
            }

            // 2. Prepare payload for all items
            const updatedClients = useClientStore.getState().clients;
            const updatedCompanies = useCompanyStore.getState().companies;

            let tableName = '';
            if (importType === 'Contact') tableName = 'clients';
            else if (importType === 'Company') tableName = 'companies';
            else if (importType === 'Invoice') tableName = 'invoices';
            else if (importType === 'Proposal') tableName = 'proposals';

            const payloads = previewData.map(item => {
                if (importType === 'Contact') {
                    return {
                        workspace_id: workspaceId,
                        contact_person: item.contact_person, 
                        company_name: item.company_name || '', 
                        email: item.email || '', 
                        phone: item.phone || '', 
                        address: item.address || ''
                    };
                } else if (importType === 'Company') {
                    return {
                        workspace_id: workspaceId,
                        name: item.name, email: item.email || '', phone: item.phone || '', website: item.website || '', address: item.address || ''
                    };
                } else {
                    let clientId = null;
                    const nameLower = item.client_name?.toLowerCase()?.trim();
                    const existingClient = updatedClients.find(c => c.contact_person?.toLowerCase()?.trim() === nameLower || c.company_name?.toLowerCase()?.trim() === nameLower);
                    const existingCompany = updatedCompanies.find(c => c.name?.toLowerCase()?.trim() === nameLower);
                    clientId = existingClient ? existingClient.id : existingCompany?.id;

                    const base = {
                        workspace_id: workspaceId,
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
                        return { ...base, paid_at: item.paid_at || null };
                    } else {
                        return { ...base, accepted_at: item.accepted_at || null };
                    }
                }
            });

            // 3. Process bulk insert in batches of 500
            const CHUNK_SIZE = 500;
            for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
                const chunk = payloads.slice(i, i + CHUNK_SIZE);
                const { error } = await supabase.from(tableName).insert(chunk);
                
                if (!error) {
                    successCount += chunk.length;
                } else {
                    errorCount += chunk.length;
                    console.error('Bulk insert error:', error.message, error.details, error.hint);
                }
                
                setProgress(Math.round((Math.min(i + CHUNK_SIZE, payloads.length) / payloads.length) * 100));
            }

            // 4. Refresh store
            if (importType === 'Contact') await useClientStore.getState().fetchClients();
            else if (importType === 'Company') await useCompanyStore.getState().fetchCompanies();
            else if (importType === 'Invoice') await useInvoiceStore.getState().fetchInvoices();
            else if (importType === 'Proposal') await useProposalStore.getState().fetchProposals();

            if (successCount > 0) {
            appToast.success(`Successfully imported ${successCount} ${importType.toLowerCase()}s`);
                if (errorCount > 0) appToast.error("Error", `Failed to import ${errorCount} items`);
                setImportModalOpen(false);
            } else {
                appToast.error("Error", "Failed to import items. Check your CSV data.");
            }
        } catch (err) {
            console.error(err);
            appToast.error("Error", "An unexpected error occurred during import");
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
                                    <Download size={28} className="text-primary" />
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
                                {currentSystemFields.map(field => (
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

                            {importType === 'Contact' && (mapping['first_name'] || mapping['last_name']) && (
                                <div className={cn("mt-6 p-4 rounded-xl border flex items-center justify-between", isDark ? "bg-[#1c1c1c] border-[#252525]" : "bg-white border-[#f0f0f5] shadow-sm")}>
                                    <div className="flex-1">
                                        <p className={cn("text-[13px] font-bold flex items-center gap-2", isDark ? "text-white" : "text-[#111]")}>
                                            Combine First & Last Name
                                        </p>
                                        <p className={cn("text-[11px] opacity-60 mt-0.5", isDark ? "text-white" : "text-[#111]")}>
                                            Merge the mapped first and last names into a single name field. If disabled, only the first name is used.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCombineNames(!combineNames)}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            combineNames ? "bg-primary" : isDark ? "bg-[#333]" : "bg-[#e0e0e0]"
                                        )}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                combineNames ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>
                            )}
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
                                        <div className="flex items-center gap-2 mr-3">
                                            {importType === 'Contact' && (
                                                <>
                                                    <span className={cn("text-[10px] font-semibold opacity-50", isDark ? "text-white" : "text-[#111]")}>
                                                        Missing companies:
                                                    </span>
                                                    <div className={cn("flex items-center p-0.5 rounded-lg border", isDark ? "border-[#333] bg-[#000]" : "border-[#e0e0e0] bg-[#f0f0f0]")}>
                                                        <button 
                                                            onClick={() => setCreateUnknownAs('contact')} 
                                                            className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all", createUnknownAs === 'contact' ? "bg-white text-black shadow-sm" : (isDark ? "text-[#888]" : "text-[#666]"))}
                                                        >
                                                            Auto-create
                                                        </button>
                                                        <button 
                                                            onClick={() => setCreateUnknownAs('company')} 
                                                            className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all", createUnknownAs === 'company' ? "bg-white text-black shadow-sm" : (isDark ? "text-[#888]" : "text-[#666]"))}
                                                        >
                                                            Skip
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
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
                                                    { item.title || item.contact_person || item.name || "Untitled Entry" }
                                                </p>
                                                {!['Contact', 'Company'].includes(importType) && (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                                                        isDark ? "bg-white/5 text-[#666]" : "bg-[#f5f5f7] text-[#aaa]"
                                                    )}>
                                                        {item.status || 'Draft'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-[11px] flex-wrap mt-1">
                                                {currentSystemFields.map(field => {
                                                    const val = item[field.id];
                                                    if (!val || ['title', 'contact_person', 'name', 'amount'].includes(field.id)) return null;
                                                    return (
                                                        <div key={field.id} className="flex items-center gap-1.5 opacity-50 hover:opacity-80 transition-opacity">
                                                            <span className="opacity-80">{field.icon}</span>
                                                            <span className="truncate max-w-[150px]" title={val}>{val}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {!['Contact', 'Company'].includes(importType) && (
                                            <div className="text-right">
                                                <p className={cn("text-[14px] font-black", isDark ? "text-primary" : "text-primary")}>
                                                    ${parseFloat(item.amount || 0).toLocaleString()}
                                                </p>
                                                <p className={cn("text-[10px] opacity-30 font-bold uppercase tracking-widest mt-0.5", isDark ? "text-white" : "text-[#111]")}>
                                                    Amount
                                                </p>
                                            </div>
                                        )}
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
                                    className="flex items-center justify-center gap-2 px-6 py-2 min-w-[160px] text-[13px] font-black rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20"
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
