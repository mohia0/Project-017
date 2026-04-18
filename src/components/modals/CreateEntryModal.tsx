"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
    X, ChevronRight, User, PenTool, FileText,
    Building2, Calendar, Plus, Search, Zap,
    Briefcase, Clock, MapPin, ClipboardList, Tag, Palette,
    Image as ImageIcon, Globe, Check, Briefcase as BriefcaseIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { appToast } from '@/lib/toast';
import { useClientStore } from '@/store/useClientStore';
import { useCompanyStore } from '@/store/useCompanyStore';
import { useProposalStore } from '@/store/useProposalStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useProjectStore, ProjectStatus } from '@/store/useProjectStore';
import { useHookStore } from '@/store/useHookStore';
import { useSchedulerStore } from '@/store/useSchedulerStore';
import { useFormStore } from '@/store/useFormStore';
import { useTemplateStore } from '@/store/useTemplateStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useRouter } from 'next/navigation';
import DatePicker from '@/components/ui/DatePicker';
import ClientEditor from '@/components/clients/ClientEditor';
import CompanyEditor from '@/components/companies/CompanyEditor';
import ImageUploadModal from '@/components/modals/ImageUploadModal';
import { Avatar } from '@/components/ui/Avatar';
import { CountryPicker } from '@/components/ui/CountryPicker';
import { v4 as uuidv4 } from 'uuid';

type EntityType = 'Contact' | 'Company' | 'Project' | 'Proposal' | 'Invoice' | 'Scheduler' | 'Form' | 'Hook';

function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

const TABS: { id: EntityType; icon: React.ReactNode; label: string }[] = [
    { id: 'Contact',  icon: <User size={14} />,     label: 'Contact'  },
    { id: 'Company',  icon: <Building2 size={14} />, label: 'Company'  },
    { id: 'Project',  icon: <Briefcase size={14} />, label: 'Project'  },
    { id: 'Proposal', icon: <PenTool size={14} />,  label: 'Proposal' },
    { id: 'Invoice',  icon: <FileText size={14} />, label: 'Invoice'  },
    { id: 'Scheduler',icon: <Calendar size={14} />, label: 'Scheduler'  },
    { id: 'Form',     icon: <ClipboardList size={14} />, label: 'Form'  },
    { id: 'Hook',     icon: <Zap size={14} fill="currentColor" />,  label: 'Hook'    },
];

const COLORS = [
    '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9',
    '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316',
];

const PROJECT_STATUS_OPTIONS: ProjectStatus[] = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];

const INDUSTRIES = [
    'Technology', 'Design', 'Marketing', 'Finance', 'Healthcare',
    'Education', 'Real Estate', 'Legal', 'Consulting', 'Media',
    'Retail', 'Manufacturing', 'Construction', 'Other'
];

const DURATION_OPTS = [
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '1 hr',  value: 60 },
    { label: '2 hr',  value: 120 },
];

const STARTER_TEMPLATES = [
    { id: 'blank',    label: 'Blank form',         icon: '📄', fields: [], isDefault: true },
    { id: 'contact',  label: 'Contact us',          icon: '📬', fields: ['full_name', 'email', 'phone', 'long_text'] },
    { id: 'feedback', label: 'Feedback',             icon: '⭐', fields: ['full_name', 'email', 'slider', 'long_text'] },
    { id: 'onboard',  label: 'Client onboarding',   icon: '🤝', fields: ['full_name', 'email', 'phone', 'short_text', 'address'] },
];

export default function CreateEntryModal() {
    const { isCreateModalOpen, setCreateModalOpen, theme, activeWorkspaceId, openRightPanel, createModalTab } = useUIStore();
    const isDark = theme === 'dark';
    const isMobile = useIsMobile();
    const router = useRouter();

    const [tab, setTab] = useState<EntityType>(createModalTab || 'Contact');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isCreateModalOpen && createModalTab) {
            setTab(createModalTab);
        }
    }, [isCreateModalOpen, createModalTab]);

    // Common search states for entity selection Dropdowns
    const [clientQuery, setClientQuery] = useState('');
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [showClientDrop, setShowClientDrop] = useState(false);

    const [projectQuery, setProjectQuery] = useState('');
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [showProjectDrop, setShowProjectDrop] = useState(false);

    const [companyQuery, setCompanyQuery] = useState('');
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [showCompanyDrop, setShowCompanyDrop] = useState(false);

    const [templateQuery, setTemplateQuery] = useState('');
    const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [showTemplateDrop, setShowTemplateDrop] = useState(false);

    const [isClientEditorOpen, setIsClientEditorOpen] = useState(false);
    const [isCompanyEditorOpen, setIsCompanyEditorOpen] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

    // Contact state
    const [cName, setCName] = useState('');
    const [cEmail, setCEmail] = useState('');
    const [cPhone, setCPhone] = useState('');
    const [cTax, setCTax] = useState('');
    const [cAddress, setCAddress] = useState('');
    const [cCountry, setCCountry] = useState('');
    const [cNotes, setCNotes] = useState('');
    const [cAvatarUrl, setCAvatarUrl] = useState('');

    // Company state
    const [cmpName, setCmpName] = useState('');
    const [cmpIndustry, setCmpIndustry] = useState('');
    const [cmpWebsite, setCmpWebsite] = useState('');
    const [cmpEmail, setCmpEmail] = useState('');
    const [cmpPhone, setCmpPhone] = useState('');
    const [cmpAddress, setCmpAddress] = useState('');
    const [cmpTax, setCmpTax] = useState('');
    const [cmpNotes, setCmpNotes] = useState('');
    const [cmpAvatarUrl, setCmpAvatarUrl] = useState('');
    const [showIndustryDrop, setShowIndustryDrop] = useState(false);

    // Proposal state
    const [pTitle, setPTitle] = useState('');
    const [pIssueDate, setPIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [pExpiry, setPExpiry] = useState(() => new Date().toISOString().split('T')[0]);

    // Invoice state
    const [iTitle, setITitle] = useState('');
    const [iIssueDate, setIIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [iDueDate, setIDueDate] = useState(() => addDays(new Date(), 7));

    // Project state
    const [prName, setPrName] = useState('');
    const [prDesc, setPrDesc] = useState('');
    const [prStatus, setPrStatus] = useState<ProjectStatus>('Planning');
    const [prColor, setPrColor] = useState('#3d0ebf');
    const [prDeadline, setPrDeadline] = useState('');
    const [showPrStatusDrop, setShowPrStatusDrop] = useState(false);
    const [showPrColorDrop, setShowPrColorDrop] = useState(false);

    // Scheduler state
    const [sTitle, setSTitle] = useState('New Scheduler');
    const [sOrganizer, setSOrganizer] = useState('');
    const [sLocation, setSLocation] = useState('');
    const [sDurations, setSDurations] = useState<number[]>([30, 60]);

    // Form state
    const [fTitle, setFTitle] = useState('New Form');
    const [fProject, setFProject] = useState('');
    const [fTemplate, setFTemplate] = useState<string>('blank');

    // Hook state
    const [hName, setHName] = useState('');
    const [hTitle, setHTitle] = useState('');
    const [hLink, setHLink] = useState('');
    const [hColor, setHColor] = useState(COLORS[6]);

    const { clients, fetchClients, addClient } = useClientStore();
    const { companies, fetchCompanies, addCompany } = useCompanyStore();
    const { addProposal } = useProposalStore();
    const { addInvoice } = useInvoiceStore();
    const { projects, fetchProjects, addProject, addProjectItem } = useProjectStore();
    const { addHook } = useHookStore();
    const { addScheduler } = useSchedulerStore();
    const { addForm } = useFormStore();
    const { templates, fetchTemplates } = useTemplateStore();
    const { workspaces } = useWorkspaceStore();
    const { generateNextId, fetchToolSettings, hasFetched } = useSettingsStore();

    // Refs
    const clientRef = useRef<HTMLDivElement>(null);
    const projectRef = useRef<HTMLDivElement>(null);
    const companyRef = useRef<HTMLDivElement>(null);
    const templateRef = useRef<HTMLDivElement>(null);
    const industryRef = useRef<HTMLDivElement>(null);
    const prStatusRef = useRef<HTMLDivElement>(null);
    const prColorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isCreateModalOpen && activeWorkspaceId) {
            fetchClients();
            fetchProjects();
            fetchTemplates();
            fetchCompanies();

            const initTitle = (tool: 'proposals' | 'invoices', setTitleFn: (v: string) => void) => {
                const settings = useSettingsStore.getState().toolSettings[tool];
                const assignToDraft = settings?.assign_to_draft ?? true;
                if (assignToDraft) setTitleFn(generateNextId(tool));
                else setTitleFn(`New ${tool.slice(0,-1)}`);
            };

            if (!hasFetched['toolSettings_proposals']) {
                fetchToolSettings(activeWorkspaceId, 'proposals').then(() => initTitle('proposals', setPTitle));
            } else initTitle('proposals', setPTitle);

            if (!hasFetched['toolSettings_invoices']) {
                fetchToolSettings(activeWorkspaceId, 'invoices').then(() => initTitle('invoices', setITitle));
            } else initTitle('invoices', setITitle);
        }
    }, [isCreateModalOpen, activeWorkspaceId, fetchClients, fetchProjects, fetchTemplates, fetchToolSettings, hasFetched]);

    // Handle dropdown clicks outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (clientRef.current && !clientRef.current.contains(e.target as Node)) setShowClientDrop(false);
            if (projectRef.current && !projectRef.current.contains(e.target as Node)) setShowProjectDrop(false);
            if (companyRef.current && !companyRef.current.contains(e.target as Node)) setShowCompanyDrop(false);
            if (templateRef.current && !templateRef.current.contains(e.target as Node)) setShowTemplateDrop(false);
            if (industryRef.current && !industryRef.current.contains(e.target as Node)) setShowIndustryDrop(false);
            if (prStatusRef.current && !prStatusRef.current.contains(e.target as Node)) setShowPrStatusDrop(false);
            if (prColorRef.current && !prColorRef.current.contains(e.target as Node)) setShowPrColorDrop(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Filter resets when tab changes
    useEffect(() => {
        setClientQuery('');
        setProjectQuery('');
        setCompanyQuery('');
        setTemplateQuery('');
    }, [tab]);

    // Auto-select default template when tab or templates change
    useEffect(() => {
        // First check if there is a templateId in the URL
        let urlTemplateId: string | null = null;
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            urlTemplateId = params.get('templateId');
        }
        
        if (urlTemplateId && templates.some(t => t.id === urlTemplateId && t.entity_type === tab.toLowerCase())) {
            const urlTpl = templates.find(t => t.id === urlTemplateId);
            if (urlTpl) {
                setSelectedTemplateName(urlTpl.name);
                setSelectedTemplateId(urlTpl.id);
                return;
            }
        }

        if (tab === 'Proposal' || tab === 'Invoice' || tab === 'Project') {
            const defaultTpl = templates.find(t => t.entity_type === tab.toLowerCase() && t.is_default);
            if (defaultTpl) {
                setSelectedTemplateName(defaultTpl.name);
                setSelectedTemplateId(defaultTpl.id);
            } else {
                setSelectedTemplateName('');
                setSelectedTemplateId(null);
            }
        }
    }, [tab, templates]);

    const filteredClients = clients.filter(c =>
        ((c.contact_person || '') + ' ' + (c.company_name || '')).toLowerCase().includes(clientQuery.toLowerCase())
    );

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(projectQuery.toLowerCase())
    );

    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(companyQuery.toLowerCase())
    );

    const activeTemplates = templates.filter(t => t.entity_type === tab.toLowerCase());
    const filteredTemplates = activeTemplates.filter(t =>
        t.name.toLowerCase().includes(templateQuery.toLowerCase())
    );

    if (!isCreateModalOpen) return null;

    const handleCreateClient = async (data: any) => {
        const client = await addClient(data);
        if (client) {
            setSelectedClient(client.contact_person || client.company_name || '');
            setSelectedClientId(client.id);
            setIsClientEditorOpen(false);
            setClientQuery('');
            setShowClientDrop(false);
            appToast.success('Contact created and selected');
        }
    };

    const handleCreateCompanyInline = async () => {
        const nameToUse = companyQuery.trim() || 'New Company';
        const company = await addCompany({ name: nameToUse });
        if (company) {
            setSelectedCompany(company.name);
            setSelectedCompanyId(company.id);
            setCompanyQuery('');
            setShowCompanyDrop(false);
            appToast.success('Company created and selected');
        }
    };

    const handleCreate = async () => {
        setLoading(true);
        try {
            if (tab === 'Contact') {
                if (!cName.trim()) return;
                const client = await addClient({ contact_person: cName, email: cEmail, company_name: selectedCompany || companyQuery, company_id: selectedCompanyId, address: cAddress, tax_number: cTax, phone: cPhone, country: cCountry, notes: cNotes, avatar_url: cAvatarUrl });
                if (client) { setCreateModalOpen(false); appToast.success('Contact created'); }
            } else if (tab === 'Company') {
                if (!cmpName.trim()) return;
                const company = await addCompany({ name: cmpName.trim(), industry: cmpIndustry, website: cmpWebsite, email: cmpEmail, phone: cmpPhone, address: cmpAddress, tax_number: cmpTax, notes: cmpNotes, avatar_url: cmpAvatarUrl });
                if (company) { setCreateModalOpen(false); appToast.success('Company created'); }
            } else if (tab === 'Proposal') {
                const templateToUse = templates.find(t => t.id === selectedTemplateId);
                const p = await addProposal({
                    title: pTitle || generateNextId('proposals'),
                    client_id: selectedClientId, client_name: selectedClient || clientQuery,
                    status: 'Draft', amount: 0, issue_date: pIssueDate, due_date: pExpiry, notes: '', 
                    blocks: templateToUse?.blocks || [],
                    meta: templateToUse?.design ? { design: templateToUse.design } : undefined
                });
                if (p) {
                    if (selectedProjectId) await addProjectItem({ project_id: selectedProjectId, item_type: 'proposal', item_id: p.id });
                    setCreateModalOpen(false); router.push(`/proposals/${p.id}`);
                }
            } else if (tab === 'Invoice') {
                const templateToUse = templates.find(t => t.id === selectedTemplateId);
                const inv = await addInvoice({
                    title: iTitle || generateNextId('invoices'),
                    client_id: selectedClientId, client_name: selectedClient || clientQuery,
                    status: 'Draft', amount: 0, issue_date: iIssueDate, due_date: iDueDate, notes: '', 
                    blocks: templateToUse?.blocks || [],
                    meta: templateToUse?.design ? { design: templateToUse.design, currency: 'USD', discountCalc: 'before_tax' } : undefined
                });
                if (inv) {
                    if (selectedProjectId) await addProjectItem({ project_id: selectedProjectId, item_type: 'invoice', item_id: inv.id });
                    setCreateModalOpen(false); router.push(`/invoices/${inv.id}`);
                }
            } else if (tab === 'Project') {
                if (!prName.trim()) return;
                const p = await addProject({
                    name: prName.trim(), description: prDesc || null, status: prStatus, color: prColor, icon: 'Briefcase',
                    client_id: selectedClientId, client_name: selectedClient || clientQuery, deadline: prDeadline || null, members: [], is_archived: false
                });
                if (p) { 
                    if (selectedTemplateId) {
                        const tpl = templates.find(t => t.id === selectedTemplateId);
                        if (tpl?.blocks?.length) {
                            for (const b of tpl.blocks) {
                                const newGroup = await useProjectStore.getState().addTaskGroup({
                                    project_id: p.id,
                                    name: b.name || 'Group',
                                    color: b.color || '#3d0ebf',
                                    icon: b.icon || null,
                                    position: b.position || 0
                                });
                                
                                if (newGroup && b.items?.length) {
                                    for (const t of b.items) {
                                        await useProjectStore.getState().addTask({
                                            project_id: p.id,
                                            task_group_id: newGroup.id,
                                            title: t.title || 'Untitled Task',
                                            description: t.description || null,
                                            status: 'todo',
                                            priority: t.priority || 'medium',
                                            position: t.position || 0,
                                            is_archived: false,
                                            custom_fields: []
                                        });
                                    }
                                }
                            }
                        }
                    }
                    setCreateModalOpen(false); 
                    router.push(`/projects/${p.id}`); 
                }
            } else if (tab === 'Hook') {
                if (!hName.trim()) return;
                const h = await addHook({ name: hName.trim(), title: hTitle.trim() || null, link: hLink.trim() || null, color: hColor });
                if (h) { setCreateModalOpen(false); openRightPanel({ type: 'hook', id: h.id }); appToast.success('Hook created'); }
            } else if (tab === 'Scheduler') {
                if (!sTitle.trim()) return;
                const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
                const format24to12 = (time24: string) => {
                    if (!time24 || !time24.includes(':')) return time24;
                    let [h, m] = time24.split(':');
                    let hours = parseInt(h, 10);
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    hours = hours % 12 || 12;
                    return `${hours}:${m} ${ampm}`;
                };
                const availability: any = {};
                ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(day => {
                    const wh = activeWorkspace?.working_hours?.[day] || { start: '09:00', end: '17:00', closed: day === 'Saturday' || day === 'Sunday' };
                    availability[day] = { active: !wh.closed, start: wh.start.includes('M') ? wh.start : format24to12(wh.start), end: wh.end.includes('M') ? wh.end : format24to12(wh.end) };
                });
                const s = await addScheduler({ title: sTitle.trim(), status: 'Draft', meta: { organizer: sOrganizer, location: sLocation, durations: sDurations, availability } as any });
                if (s) { setCreateModalOpen(false); router.push(`/schedulers/${s.id}`); }
            } else if (tab === 'Form') {
                if (!fTitle.trim()) return;
                const tpl = STARTER_TEMPLATES.find(t => t.id === fTemplate);
                const fields = (tpl?.fields || []).map(type => ({
                    id: uuidv4(), type, label: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), required: false, placeholder: '',
                }));
                const f = await addForm({ title: fTitle.trim(), status: 'Draft', fields: fields as any, meta: { project: fProject } as any });
                if (f) { setCreateModalOpen(false); router.push(`/forms/${f.id}`); }
            }
        } catch (err: any) {
            console.error(err);
            appToast.error("Error", err?.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const fieldStyle = cn(
        "w-full rounded-xl border px-4 py-3 text-[13px] outline-none transition-all flex flex-col gap-0.5 focus-within:ring-2",
        isDark
            ? "bg-[#1c1c1c] border-[#2e2e2e] text-white placeholder:text-[#555] focus-within:ring-[#333] focus-within:border-[#444]"
            : "bg-white border-[#e0e0e0] text-[#111] placeholder:text-[#bbb] focus-within:ring-[#e8e8e8] focus-within:border-[#ccc]"
    );
    const labelStyle = cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]");

    const renderClientPicker = () => (
        <div className={cn("relative", showClientDrop ? "z-50" : "z-10")} ref={clientRef}>
            <div className={cn(fieldStyle, "cursor-pointer justify-center")} onClick={() => setShowClientDrop(v => !v)}>
                <span className={labelStyle}>Client (optional)</span>
                {selectedClient
                    ? <span className={isDark ? "text-white" : "text-[#111]"}>{selectedClient}</span>
                    : <span className={isDark ? "text-[#555]" : "text-[#bbb]"}>Select client</span>
                }
            </div>
            {showClientDrop && (
                <div className={cn("absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-50 overflow-hidden", isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]")}>
                    <div className="p-2 border-b border-inherit">
                        <input autoFocus value={clientQuery} onChange={e => { setClientQuery(e.target.value); setSelectedClient(''); setSelectedClientId(null); }} placeholder="Search clients..." className={cn("w-full text-[12px] px-3 py-1.5 rounded-lg outline-none", isDark ? "bg-[#252525] text-white placeholder:text-[#555]" : "bg-[#f5f5f5] text-[#111] placeholder:text-[#aaa]")} />
                    </div>
                    <div className="max-h-40 overflow-auto">
                        {filteredClients.length === 0 && !clientQuery ? (
                            <div className={cn("px-4 py-3 text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No clients found</div>
                        ) : (
                            <>
                                {filteredClients.map(c => (
                                    <button key={c.id} onClick={() => { setSelectedClient(c.contact_person || c.company_name || ''); setSelectedClientId(c.id); setClientQuery(''); setShowClientDrop(false); }} className={cn("w-full text-left px-4 py-2.5 text-[13px] transition-colors", isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]")}>
                                        <span className="font-medium">{c.contact_person}</span>
                                        {c.company_name && <span className={cn("ml-2 text-[11px]", isDark ? "text-[#555]" : "text-[#aaa]")}>{c.company_name}</span>}
                                    </button>
                                ))}
                                <div className={cn("border-t", isDark ? "border-white/5" : "border-black/5")} />
                                <button onClick={() => setIsClientEditorOpen(true)} className={cn("w-full text-left px-4 py-2.5 text-[13px] font-bold transition-colors flex items-center gap-2", isDark ? "text-primary hover:bg-white/5" : "text-primary hover:bg-black/5")}>
                                    <Plus size={14} strokeWidth={3} />
                                    {clientQuery ? `Create "${clientQuery}"` : 'Create new contact'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderProjectPicker = () => (
        <div className={cn("relative", showProjectDrop ? "z-50" : "z-10")} ref={projectRef}>
            <div className={cn(fieldStyle, "cursor-pointer justify-center")} onClick={() => setShowProjectDrop(v => !v)}>
                <span className={labelStyle}>Project (optional)</span>
                {selectedProject
                    ? <span className={isDark ? "text-white" : "text-[#111]"}>{selectedProject}</span>
                    : <span className={isDark ? "text-[#555]" : "text-[#bbb]"}>Select project</span>
                }
            </div>
            {showProjectDrop && (
                <div className={cn("absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-50 overflow-hidden", isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]")}>
                    <div className="p-2 border-b border-inherit">
                        <input autoFocus value={projectQuery} onChange={e => { setProjectQuery(e.target.value); setSelectedProject(''); setSelectedProjectId(null); }} placeholder="Search projects..." className={cn("w-full text-[12px] px-3 py-1.5 rounded-lg outline-none", isDark ? "bg-[#252525] text-white placeholder:text-[#555]" : "bg-[#f5f5f5] text-[#111] placeholder:text-[#aaa]")} />
                    </div>
                    <div className="max-h-40 overflow-auto">
                        {filteredProjects.length === 0 && !projectQuery ? (
                            <div className={cn("px-4 py-3 text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No projects found</div>
                        ) : (
                            <>
                                {filteredProjects.map(p => (
                                    <button key={p.id} onClick={() => { setSelectedProject(p.name); setSelectedProjectId(p.id); setProjectQuery(''); setShowProjectDrop(false); }} className={cn("w-full text-left px-4 py-2.5 text-[13px] transition-colors flex items-center gap-2", isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]")}>
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                        <span className="font-medium">{p.name}</span>
                                    </button>
                                ))}
                                {filteredProjects.length === 0 && projectQuery && <div className={cn("px-4 py-3 text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No matching projects</div>}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderCompanyPicker = () => (
        <div className={cn("relative", showCompanyDrop ? "z-50" : "z-10")} ref={companyRef}>
            <div className={cn(fieldStyle, "cursor-pointer justify-center")} onClick={() => setShowCompanyDrop(v => !v)}>
                <span className={labelStyle}>Company (optional)</span>
                {selectedCompany
                    ? <span className={isDark ? "text-white" : "text-[#111]"}>{selectedCompany}</span>
                    : <span className={isDark ? "text-[#555]" : "text-[#bbb]"}>Select company</span>
                }
            </div>
            {showCompanyDrop && (
                <div className={cn("absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-50 overflow-hidden", isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]")}>
                    <div className="p-2 border-b border-inherit">
                        <input autoFocus value={companyQuery} onChange={e => { setCompanyQuery(e.target.value); setSelectedCompany(''); setSelectedCompanyId(null); }} placeholder="Search companies..." className={cn("w-full text-[12px] px-3 py-1.5 rounded-lg outline-none", isDark ? "bg-[#252525] text-white placeholder:text-[#555]" : "bg-[#f5f5f5] text-[#111] placeholder:text-[#aaa]")} />
                    </div>
                    <div className="max-h-40 overflow-auto">
                        {filteredCompanies.length === 0 && !companyQuery ? (
                            <div className={cn("px-4 py-3 text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No companies found</div>
                        ) : (
                            <>
                                {filteredCompanies.map(c => (
                                    <button key={c.id} onClick={() => { setSelectedCompany(c.name); setSelectedCompanyId(c.id); setCompanyQuery(''); setShowCompanyDrop(false); }} className={cn("w-full text-left px-4 py-2.5 text-[13px] transition-colors", isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]")}>
                                        <span className="font-medium">{c.name}</span>
                                    </button>
                                ))}
                                <div className={cn("border-t", isDark ? "border-white/5" : "border-black/5")} />
                                <button onClick={() => setIsCompanyEditorOpen(true)} className={cn("w-full text-left px-4 py-2.5 text-[13px] font-bold transition-colors flex items-center gap-2", isDark ? "text-primary hover:bg-white/5" : "text-primary hover:bg-black/5")}>
                                    <Plus size={14} strokeWidth={3} />
                                    {companyQuery ? `Create "${companyQuery}"` : 'Create new company'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );


    const renderTemplatePicker = () => (
        <div className={cn("relative", showTemplateDrop ? "z-50" : "z-10")} ref={templateRef}>
            <div className={cn(fieldStyle, "cursor-pointer justify-center")} onClick={() => setShowTemplateDrop(v => !v)}>
                <span className={labelStyle}>Template</span>
                {selectedTemplateName
                    ? (
                        <div className="flex items-center justify-between w-full">
                            <span className={isDark ? "text-white" : "text-[#111]"}>{selectedTemplateName}</span>
                            {templates.find(t => t.id === selectedTemplateId)?.is_default && (
                                <span className={cn("text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded", isDark ? "bg-primary/20 text-primary-hover" : "bg-primary/10 text-primary")}>Default</span>
                            )}
                        </div>
                    )
                    : <span className={isDark ? "text-[#555]" : "text-[#bbb]"}>Select template</span>
                }
            </div>
            {showTemplateDrop && (
                <div className={cn("absolute left-0 right-0 bottom-full mb-1 rounded-xl border shadow-xl z-50 overflow-hidden", isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]")}>
                    <div className="p-2 border-b border-inherit">
                        <input autoFocus value={templateQuery} onChange={e => { setTemplateQuery(e.target.value); setSelectedTemplateName(''); setSelectedTemplateId(null); }} placeholder="Search templates..." className={cn("w-full text-[12px] px-3 py-1.5 rounded-lg outline-none", isDark ? "bg-[#252525] text-white placeholder:text-[#555]" : "bg-[#f5f5f5] text-[#111] placeholder:text-[#aaa]")} />
                    </div>
                    <div className="max-h-40 overflow-auto">
                        {filteredTemplates.length === 0 && !templateQuery ? (
                            <div className={cn("px-4 py-3 text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No templates found</div>
                        ) : (
                            <>
                                {filteredTemplates.map(t => (
                                    <button key={t.id} onClick={() => { setSelectedTemplateName(t.name); setSelectedTemplateId(t.id); setTemplateQuery(''); setShowTemplateDrop(false); }} className={cn("w-full text-left px-4 py-2.5 text-[13px] transition-colors flex items-center justify-between", isDark ? "text-[#ccc] hover:bg-white/5" : "text-[#333] hover:bg-[#f5f5f5]")}>
                                        <span className="font-medium">{t.name}</span>
                                        {t.is_default && <span className={cn("text-[10px] px-1.5 py-0.5 rounded", isDark ? "bg-[#333] text-[#aaa]" : "bg-[#eee] text-[#666]")}>Default</span>}
                                    </button>
                                ))}
                                {filteredTemplates.length === 0 && templateQuery && <div className={cn("px-4 py-3 text-[12px]", isDark ? "text-[#555]" : "text-[#aaa]")}>No matching templates</div>}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderAvatarField = (url: string, setUrl: (u: string) => void, nameStr: string) => (
        <div 
            onClick={() => setIsAvatarModalOpen(true)}
            className={cn(
                "w-full rounded-xl border px-4 py-3 cursor-pointer transition-all",
                isDark ? "bg-[#1c1c1c] border-[#2e2e2e] hover:border-[#444]" : "bg-white border-[#e0e0e0] hover:border-[#ccc]"
            )}
        >
            <div className="flex items-center gap-1.5 mb-1.5 grayscale opacity-60">
                <ImageIcon size={11} className={isDark ? "text-white" : "text-[#333]"} />
                <span className={cn("text-[11px] font-semibold", isDark ? "text-[#555]" : "text-[#aaa]")}>Profile photo</span>
            </div>
            <div className="flex items-center gap-3">
                <Avatar 
                    src={url} 
                    name={nameStr} 
                    className="w-10 h-10 rounded-xl border border-black/5" 
                    isDark={isDark} 
                    fallbackClassName="border border-dashed border-black/10 dark:border-white/10 rounded-xl"
                />
                <div className="flex flex-col">
                    <span className={cn("text-[13px] font-medium", isDark ? "text-white/60" : "text-black/60")}>
                        {url ? 'Update photo' : 'Upload photo'}
                    </span>
                    <span className={cn("text-[10px]", isDark ? "text-[#444]" : "text-[#ccc]")}>
                        JPG, PNG or SVG. Max 2MB.
                    </span>
                </div>
            </div>
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) setCreateModalOpen(false); }}
        >
            <div className={cn(
                "w-full rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200",
                isMobile ? "max-w-[480px]" : "max-w-[740px]",
                isDark ? "bg-[#161616] border border-[#252525]" : "bg-[#f7f7f7] border border-[#e0e0e0]"
            )}>
                {/* Header */}
                <div className={cn("flex items-center justify-between px-5 pt-4 pb-3 border-b", isDark ? "border-[#252525]" : "border-[#eaeaef]")}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Plus size={14} className="text-primary" strokeWidth={3} />
                        </div>
                        <h2 className={cn("text-[15px] font-bold tracking-tight", isDark ? "text-white" : "text-[#111]")}>Create New</h2>
                    </div>
                    <button onClick={() => setCreateModalOpen(false)} className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-colors", isDark ? "bg-[#252525] text-[#666] hover:text-[#ccc]" : "bg-[#e8e8e8] text-[#888] hover:text-[#333]")}>
                        <X size={14} strokeWidth={2.5} />
                    </button>
                </div>

                <div className={cn("flex flex-1 overflow-hidden", isMobile ? "flex-col" : "flex-row")}>
                    {/* ── Navigation (Sidebar on PC / Horizontal on Mobile) ── */}
                    {isMobile ? (
                        <div className={cn(
                            "flex gap-1.5 px-4 py-2.5 overflow-x-auto no-scrollbar border-b shrink-0",
                            isDark ? "border-[#252525] bg-[#111]" : "border-[#eaeaef] bg-[#f9f9fb]"
                        )}>
                            {TABS.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all shrink-0 border",
                                        tab === t.id
                                            ? (isDark ? "bg-[#2a2a2a] text-white border-white/10 shadow-sm" : "bg-white text-primary border-[#e0e0eb] shadow-sm")
                                            : (isDark ? "text-[#555] border-transparent hover:text-[#999] hover:bg-white/[0.04]" : "text-[#999] border-transparent hover:text-[#444] hover:bg-black/[0.04]")
                                    )}
                                >
                                    <span className={cn("transition-colors", tab === t.id ? "text-primary" : "opacity-30")}>{t.icon}</span>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className={cn(
                            "w-[160px] shrink-0 flex flex-col gap-1 p-3 border-r overflow-y-auto no-scrollbar",
                            isDark ? "border-[#252525] bg-[#111]" : "border-[#eaeaef] bg-[#f9f9fb]"
                        )}>
                            {TABS.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id)}
                                    className={cn(
                                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all border",
                                        tab === t.id
                                            ? (isDark ? "bg-[#252525] text-white border-white/10 shadow-sm" : "bg-white text-primary border-[#e0e0eb] shadow-sm")
                                            : (isDark ? "text-[#555] border-transparent hover:text-[#999] hover:bg-white/[0.02]" : "text-[#999] border-transparent hover:text-[#444] hover:bg-black/[0.02]")
                                    )}
                                >
                                    <span className={cn("transition-colors", tab === t.id ? "text-primary" : "opacity-40")}>{t.icon}</span>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ── Content Area ── */}
                    <div className="flex-1 relative overflow-hidden" style={{ height: isMobile ? 'min(520px, calc(85vh - 150px))' : 'min(640px, calc(90vh - 100px))' }} key={tab}>
                        <div className="absolute inset-0 overflow-y-auto no-scrollbar pb-[76px]">
                        <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
                                {/* ── Contact Form ── */}
                                {tab === 'Contact' && (
                                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                                        {renderAvatarField(cAvatarUrl, setCAvatarUrl, cName)}
                                        <div className={fieldStyle}>
                                            <span className={labelStyle}>Full name *</span>
                                            <input value={cName} onChange={e => setCName(e.target.value)} placeholder="John Doe" autoFocus className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                        </div>
                                        <div className={fieldStyle}>
                                            <span className={labelStyle}>Email address *</span>
                                            <input value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="john@example.com" type="email" className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                        </div>
                                        {renderCompanyPicker()}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className={fieldStyle}>
                                                <span className={labelStyle}>Phone</span>
                                                <input value={cPhone} onChange={e => setCPhone(e.target.value)} placeholder="+1 234 567 890" className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                            </div>
                                            <div className={fieldStyle}>
                                                <span className={labelStyle}>Tax Number</span>
                                                <input value={cTax} onChange={e => setCTax(e.target.value)} placeholder="VAT / EIN" className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className={fieldStyle}>
                                                <span className={labelStyle}>Address</span>
                                                <input value={cAddress} onChange={e => setCAddress(e.target.value)} placeholder="Street, city" className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                            </div>
                                            <CountryPicker isDark={isDark} value={cCountry} onChange={setCCountry} />
                                        </div>
                                        <div className={fieldStyle}>
                                            <span className={labelStyle}>Notes</span>
                                            <textarea value={cNotes} onChange={e => setCNotes(e.target.value)} placeholder="Internal notes..." rows={2} className="bg-transparent outline-none text-[13px] w-full mt-0.5 resize-none" />
                                        </div>
                                    </div>
                                )}

                                {/* ── Company Form ── */}
                                {tab === 'Company' && (
                                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                                        {renderAvatarField(cmpAvatarUrl, setCmpAvatarUrl, cmpName)}
                                        <div className={fieldStyle}>
                                            <span className={labelStyle}>Company name *</span>
                                            <input value={cmpName} onChange={e => setCmpName(e.target.value)} placeholder="Acme Corp" autoFocus className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className={cn("relative", showIndustryDrop ? "z-50" : "z-10")} ref={industryRef}>
                                                <div className={cn(fieldStyle, "cursor-pointer")} onClick={() => setShowIndustryDrop(!showIndustryDrop)}>
                                                    <span className={labelStyle}>Industry</span>
                                                    <div className="flex items-center justify-between">
                                                        <span className={cn(cmpIndustry ? (isDark ? "text-white" : "text-[#111]") : (isDark ? "text-[#555]" : "text-[#bbb]"))}>{cmpIndustry || 'Select industry'}</span>
                                                        <ChevronRight size={14} className={cn("transition-transform opacity-30", showIndustryDrop ? "rotate-90" : "")} />
                                                    </div>
                                                </div>
                                                {showIndustryDrop && (
                                                    <div className={cn("absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-50 overflow-hidden", isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]")}>
                                                        <div className="max-h-48 overflow-y-auto py-1">
                                                            {INDUSTRIES.map(ind => (
                                                                <button key={ind} onClick={() => { setCmpIndustry(ind); setShowIndustryDrop(false); }} className={cn("w-full text-left px-4 py-2 text-[13px] transition-colors", isDark ? "hover:bg-white/5 text-[#ccc]" : "hover:bg-black/5 text-[#333]")}>
                                                                    {ind}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={fieldStyle}>
                                                <span className={labelStyle}>Website</span>
                                                <input value={cmpWebsite} onChange={e => setCmpWebsite(e.target.value)} placeholder="https://example.com" type="url" className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className={fieldStyle}>
                                                <span className={labelStyle}>Email</span>
                                                <input value={cmpEmail} onChange={e => setCmpEmail(e.target.value)} placeholder="hello@company.com" type="email" className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                            </div>
                                            <div className={fieldStyle}>
                                                <span className={labelStyle}>Phone</span>
                                                <input value={cmpPhone} onChange={e => setCmpPhone(e.target.value)} placeholder="+1 234 567 890" type="tel" className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className={fieldStyle}>
                                                <span className={labelStyle}>Tax Number</span>
                                                <input value={cmpTax} onChange={e => setCmpTax(e.target.value)} placeholder="VAT / EIN" className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                            </div>
                                            <div className={fieldStyle}>
                                                <span className={labelStyle}>Address</span>
                                                <input value={cmpAddress} onChange={e => setCmpAddress(e.target.value)} placeholder="Street, city, country" className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                            </div>
                                        </div>
                                        <div className={fieldStyle}>
                                            <span className={labelStyle}>Notes</span>
                                            <textarea value={cmpNotes} onChange={e => setCmpNotes(e.target.value)} placeholder="Internal notes..." rows={2} className="bg-transparent outline-none text-[13px] w-full mt-0.5 resize-none" />
                                        </div>
                                    </div>
                                )}

                                {/* ── Project Form ── */}
                                {tab === 'Project' && (
                                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <div className={fieldStyle}>
                                            <span className={labelStyle}>Project name *</span>
                                            <input value={prName} onChange={e => setPrName(e.target.value)} placeholder="e.g. Website Redesign" autoFocus className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                        </div>
                                        <div className={fieldStyle}>
                                            <span className={labelStyle}>Description</span>
                                            <textarea value={prDesc} onChange={e => setPrDesc(e.target.value)} placeholder="Optional project details..." rows={2} className="bg-transparent outline-none text-[13px] w-full mt-0.5 resize-none" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className={cn("relative", showPrStatusDrop ? "z-50" : "z-10")} ref={prStatusRef}>
                                                <div className={cn(fieldStyle, "cursor-pointer")} onClick={() => setShowPrStatusDrop(!showPrStatusDrop)}>
                                                    <span className={labelStyle}>Status</span>
                                                    <div className="flex items-center justify-between">
                                                        <span className={isDark ? "text-white" : "text-[#111]"}>{prStatus}</span>
                                                        <ChevronRight size={14} className={cn("transition-transform opacity-30", showPrStatusDrop ? "rotate-90" : "")} />
                                                    </div>
                                                </div>
                                                {showPrStatusDrop && (
                                                    <div className={cn("absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-50 overflow-hidden", isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]")}>
                                                        <div className="py-1">
                                                            {PROJECT_STATUS_OPTIONS.map(s => (
                                                                <button key={s} onClick={() => { setPrStatus(s); setShowPrStatusDrop(false); }} className={cn("w-full text-left px-4 py-2.5 text-[13px] transition-colors flex items-center justify-between", isDark ? "hover:bg-white/5 text-[#ccc]" : "hover:bg-black/5 text-[#333]")}>
                                                                    {s}
                                                                    {s === prStatus && <Check size={14} className="text-primary" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={cn("relative", showPrColorDrop ? "z-50" : "z-10")} ref={prColorRef}>
                                                <div className={cn(fieldStyle, "cursor-pointer")} onClick={() => setShowPrColorDrop(!showPrColorDrop)}>
                                                    <span className={labelStyle}>Brand Color</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1 h-3.5 rounded-full" style={{ background: prColor }} />
                                                        <span className={cn(isDark ? "text-white/60" : "text-[#111]/60")}>{prColor.toUpperCase()}</span>
                                                        <ChevronRight size={14} className={cn("ml-auto transition-transform opacity-30", showPrColorDrop ? "rotate-90" : "")} />
                                                    </div>
                                                </div>
                                                {showPrColorDrop && (
                                                    <div className={cn("absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-50 overflow-hidden", isDark ? "bg-[#191919] border-[#252525] p-2" : "bg-white border-[#e8e8e8] p-2")}>
                                                        <div className="grid grid-cols-8 gap-1.5">
                                                            {COLORS.map(c => (
                                                                <button 
                                                                    key={c} 
                                                                    onClick={() => { setPrColor(c); setShowPrColorDrop(false); }} 
                                                                    className={cn(
                                                                        "w-5 h-5 rounded-full transition-all hover:scale-110", 
                                                                        prColor === c ? "ring-2 ring-offset-2 ring-primary/40 ring-offset-transparent" : "opacity-80 hover:opacity-100"
                                                                    )} 
                                                                    style={{ backgroundColor: c }} 
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {renderClientPicker()}
                                        <div className={fieldStyle}>
                                            <span className={labelStyle}>Deadline</span>
                                            <DatePicker value={prDeadline} onChange={setPrDeadline} isDark={isDark} placeholder="Set project deadline" />
                                        </div>
                                        <div className="relative py-1 flex items-center">
                                            <div className={cn("absolute inset-x-0 top-1/2 border-t", isDark ? "border-[#252525]" : "border-[#e0e0e0]")} />
                                            <span className={cn("relative z-10 px-2 text-[11px] font-semibold uppercase tracking-widest", isDark ? "bg-[#161616] text-[#444]" : "bg-[#f7f7f7] text-[#bbb]")}>Template options</span>
                                        </div>
                                        {renderTemplatePicker()}


                                    </div>
                                )}

                                {/* ── Proposal Form ── */}
                                {tab === 'Proposal' && (
                                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <div className={fieldStyle}>
                                            <span className={labelStyle}>Name</span>
                                            <input value={pTitle} onChange={e => setPTitle(e.target.value)} className="bg-transparent outline-none text-[13px] w-full mt-0.5" autoFocus />
                                        </div>
                                        {renderClientPicker()}
                                        {renderProjectPicker()}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className={fieldStyle}><span className={labelStyle}>Issue date</span><DatePicker value={pIssueDate} onChange={setPIssueDate} isDark={isDark} /></div>
                                            <div className={fieldStyle}><span className={labelStyle}>Expiration date</span><DatePicker value={pExpiry} onChange={setPExpiry} isDark={isDark} align="right" /></div>
                                        </div>
                                        <div className="relative py-1.5"><div className={cn("absolute inset-x-0 top-1/2 border-t", isDark ? "border-[#252525]" : "border-[#e0e0e0]")} /><span className={cn("relative z-10 px-2 text-[11px] font-semibold uppercase tracking-widest", isDark ? "bg-[#161616] text-[#444]" : "bg-[#f7f7f7] text-[#bbb]")}>Template options</span></div>
                                        {renderTemplatePicker()}
                                    </div>
                                )}

                                {/* ── Invoice Form ── */}
                                {tab === 'Invoice' && (
                                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <div className={fieldStyle}>
                                            <span className={labelStyle}>Name</span>
                                            <input value={iTitle} onChange={e => setITitle(e.target.value)} className="bg-transparent outline-none text-[13px] w-full mt-0.5" autoFocus />
                                        </div>
                                        {renderClientPicker()}
                                        {renderProjectPicker()}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className={fieldStyle}><span className={labelStyle}>Issue date</span><DatePicker value={iIssueDate} onChange={setIIssueDate} isDark={isDark} /></div>
                                            <div className={fieldStyle}><span className={labelStyle}>Due date</span><DatePicker value={iDueDate} onChange={setIDueDate} isDark={isDark} align="right" /></div>
                                        </div>
                                        <div className="relative py-1.5"><div className={cn("absolute inset-x-0 top-1/2 border-t", isDark ? "border-[#252525]" : "border-[#e0e0e0]")} /><span className={cn("relative z-10 px-2 text-[11px] font-semibold uppercase tracking-widest", isDark ? "bg-[#161616] text-[#444]" : "bg-[#f7f7f7] text-[#bbb]")}>Template options</span></div>
                                        {renderTemplatePicker()}
                                    </div>
                                )}

                                {/* ── Scheduler Form ── */}
                                {tab === 'Scheduler' && (
                                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <div className={fieldStyle}>
                                            <span className={labelStyle}>Name</span>
                                            <input value={sTitle} onChange={e => setSTitle(e.target.value)} autoFocus className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                        </div>
                                        <div className={fieldStyle}>
                                            <span className={cn(labelStyle, "flex items-center gap-1.5")}><User size={10} /> Organizer</span>
                                            <input value={sOrganizer} onChange={e => setSOrganizer(e.target.value)} placeholder="Your name or team" className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                        </div>
                                        <div className={fieldStyle}>
                                            <span className={cn(labelStyle, "flex items-center gap-1.5")}><MapPin size={10} /> Location</span>
                                            <input value={sLocation} onChange={e => setSLocation(e.target.value)} placeholder="Google Meet, Zoom, address…" className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                        </div>
                                        <div className={cn("w-full rounded-xl border px-4 py-3 transition-all", isDark ? "bg-[#1c1c1c] border-[#2e2e2e]" : "bg-white border-[#e0e0e0]")}>
                                            <span className={cn("block text-[11px] font-semibold mb-2.5 flex items-center gap-1.5", isDark ? "text-[#555]" : "text-[#aaa]")}><Clock size={10} /> Durations</span>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {DURATION_OPTS.map(({ label, value }) => {
                                                    const on = sDurations.includes(value);
                                                    return (
                                                        <button key={value} onClick={() => setSDurations(prev => prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value].sort((a,b)=>a-b))}
                                                            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all", on ? "text-primary-foreground border-transparent bg-primary hover:bg-primary-hover" : (isDark ? "border-[#333] text-[#888] hover:text-[#ccc] hover:border-[#444]" : "border-[#e5e5e5] text-[#888] hover:text-[#333] hover:border-[#ccc]"))}>
                                                            <Clock size={10} />{label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Form Form ── */}
                                {tab === 'Form' && (
                                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <div className={fieldStyle}>
                                            <span className={labelStyle}>Name</span>
                                            <input value={fTitle} onChange={e => setFTitle(e.target.value)} autoFocus className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                        </div>
                                        <div className={fieldStyle}>
                                            <span className={cn(labelStyle, "flex items-center gap-1.5")}><Tag size={10} /> Project</span>
                                            <input value={fProject} onChange={e => setFProject(e.target.value)} placeholder="Link to a project (optional)" className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                        </div>
                                        <div className="relative mt-1 py-1"><div className={cn("absolute inset-x-0 top-1/2 border-t", isDark ? "border-[#252525]" : "border-[#e0e0e0]")} /><span className={cn("relative z-10 px-2 text-[11px] font-semibold uppercase tracking-widest", isDark ? "bg-[#161616] text-[#444]" : "bg-[#f7f7f7] text-[#bbb]")}>Start from</span></div>
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                            {STARTER_TEMPLATES.map(t => (
                                                <button key={t.id} onClick={() => setFTemplate(t.id)} className={cn("flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all", fTemplate === t.id ? (isDark ? "border-primary/50 bg-primary/8 ring-1 ring-primary/20" : "border-primary/40 bg-primary/5 ring-1 ring-primary/15") : (isDark ? "border-[#252525] bg-[#1c1c1c] hover:border-[#333]" : "border-[#e0e0e0] bg-white hover:border-[#bbb]"))}>
                                                    <span className="text-[18px] leading-none">{t.icon}</span>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={cn("text-[12px] font-semibold truncate", isDark ? "text-[#ddd]" : "text-[#222]")}>{t.label}</div>
                                                            {t.isDefault && <span className={cn("text-[8px] uppercase font-bold px-1 rounded-[4px]", isDark ? "bg-primary/20 text-primary-hover" : "bg-primary/10 text-primary")}>DFT</span>}
                                                        </div>
                                                        {t.fields.length > 0 && <div className={cn("text-[10.5px] mt-0.5", isDark ? "text-[#555]" : "text-[#bbb]")}>{t.fields.length} fields</div>}
                                                    </div>
                                                    {fTemplate === t.id && (
                                                        <div className="ml-auto shrink-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="var(--brand-primary-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── Hook Form ── */}
                                {tab === 'Hook' && (
                                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <div className={fieldStyle}>
                                            <span className={labelStyle}>Endpoint Name</span>
                                            <input value={hName} onChange={e => setHName(e.target.value)} placeholder="e.g. Stripe Webhook" autoFocus className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                        </div>
                                        <div className={fieldStyle}>
                                            <span className={labelStyle}>Short Description</span>
                                            <input value={hTitle} onChange={e => setHTitle(e.target.value)} placeholder="What is this hook for?" className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                        </div>
                                        <div className={fieldStyle}>
                                            <span className={labelStyle}>Placement URL (Optional)</span>
                                            <input value={hLink} onChange={e => setHLink(e.target.value)} placeholder="e.g. yourwebsite.com" className="bg-transparent outline-none text-[13px] w-full mt-0.5" />
                                        </div>
                                        <div className="flex flex-col gap-2.5 mt-2">
                                            <span className={cn(labelStyle, "ml-1 flex items-center gap-1.5")}><Palette size={10} /> Brand Color</span>
                                            <div className="grid grid-cols-10 gap-2 mt-1 px-1">
                                                {COLORS.map(c => (
                                                    <button 
                                                        key={c} 
                                                        onClick={() => setHColor(c)} 
                                                        className={cn(
                                                            "w-5 h-5 rounded-full transition-all hover:scale-110", 
                                                            hColor === c ? "ring-2 ring-offset-2 ring-primary/40 ring-offset-transparent" : "opacity-80 hover:opacity-100"
                                                        )} 
                                                        style={{ backgroundColor: c }} 
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={cn("absolute bottom-0 w-full flex items-center justify-between px-5 py-3.5 border-t z-[40]", isDark ? "border-[#252525] bg-[#111]" : "border-[#e8e8e8] bg-white")}>
                        <button onClick={() => setCreateModalOpen(false)} className={cn("px-4 py-2 text-[13px] font-medium rounded-xl transition-colors", isDark ? "text-[#777] hover:text-[#ccc] hover:bg-white/5" : "text-[#777] hover:text-[#333] hover:bg-[#f5f5f5]")}>Cancel</button>
                        <button onClick={handleCreate} disabled={loading} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-60 shadow-[0_4px_14px_-4px_rgba(var(--brand-primary-rgb),0.5)]">
                            {loading ? 'Creating...' : `Create ${tab.toLowerCase()}`}
                            {!loading && <ChevronRight size={14} strokeWidth={2.5} />}
                        </button>
                    </div>
                    </div>
                </div>
            </div>
            
            {isClientEditorOpen && (
                <ClientEditor
                    onClose={() => setIsClientEditorOpen(false)}
                    onSave={handleCreateClient}
                    initialData={{
                        contact_person: clientQuery,
                        company_name: '',
                        email: ''
                    }}
                />
            )}

            {isCompanyEditorOpen && (
                <CompanyEditor
                    isSimple={true}
                    onClose={() => setIsCompanyEditorOpen(false)}
                    onSave={async (data) => {
                        const company = await addCompany(data);
                        if (company) {
                            setSelectedCompany(company.name);
                            setSelectedCompanyId(company.id);
                            setIsCompanyEditorOpen(false);
                            setCompanyQuery('');
                            setShowCompanyDrop(false);
                            appToast.success('Company created and selected');
                        }
                    }}
                    initialData={{
                        name: companyQuery,
                        industry: '',
                        website: '',
                        email: '',
                        phone: '',
                        address: '',
                        country: '',
                        tax_number: '',
                        notes: '',
                        avatar_url: ''
                    }}
                />
            )}

            {isAvatarModalOpen && (
                <ImageUploadModal
                    isOpen={isAvatarModalOpen}
                    onClose={() => setIsAvatarModalOpen(false)}
                    onUpload={(url) => {
                        if (tab === 'Contact') setCAvatarUrl(url);
                        else if (tab === 'Company') setCmpAvatarUrl(url);
                        setIsAvatarModalOpen(false);
                    }}
                />
            )}
        </div>
    );
}
