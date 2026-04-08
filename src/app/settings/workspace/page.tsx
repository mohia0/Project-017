"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput } from '@/components/settings/SettingsField';
import { useWorkspaceStore, Workspace } from '@/store/useWorkspaceStore';
import { useUIStore } from '@/store/useUIStore';
import { ChevronDown, ChevronRight, Plus, Trash2, X, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/useSettingsStore';
import ImageUploadModal from '@/components/modals/ImageUploadModal';

function AccordionSection({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    return (
        <div className={cn(
            "w-full rounded-xl overflow-hidden mb-4 border transition-colors",
            isDark ? "bg-[#111] border-white/10" : "bg-white border-black/10"
        )}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between p-5 text-sm font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/5",
                    isOpen && "border-b border-black/10 dark:border-white/10"
                )}
            >
                {title}
                {isOpen ? <ChevronDown size={18} className="opacity-50" /> : <ChevronRight size={18} className="opacity-50" />}
            </button>
            {isOpen && (
                <div className="p-5">
                    {children}
                </div>
            )}
        </div>
    );
}

export default function WorkspaceSettingsPage() {
    const router = useRouter();
    const { workspaces, updateWorkspace, deleteWorkspace, isLoading } = useWorkspaceStore();
    const { domains, fetchDomains, addDomain, deleteDomain } = useSettingsStore();
    const { activeWorkspaceId } = useUIStore();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    
    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const primaryDomain = domains.find(d => d.is_primary)?.domain || '';

    const [name, setName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    
    // Complex state
    const [emails, setEmails] = useState<{value: string, type: string}[]>([]);
    const [phones, setPhones] = useState<{value: string, type: string}[]>([]);
    const [address, setAddress] = useState({ line: '', city: '', country: '', zip: '' });
    
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchDomains(activeWorkspaceId);
        }
    }, [activeWorkspaceId, fetchDomains]);

    useEffect(() => {
        if (activeWorkspace) {
            setName(activeWorkspace.name || '');
            setLogoUrl(activeWorkspace.logo_url || '');
            
            // Parse jsonb fields safely
            let ems = activeWorkspace.contact_emails || [];
            if (ems.length === 0) ems = [{ value: '', type: 'Email' }];
            setEmails(ems);

            let phs = activeWorkspace.contact_phones || [];
            if (phs.length === 0) phs = [{ value: '', type: 'Mobile number' }];
            setPhones(phs);

            let addr = activeWorkspace.contact_address || { line: '', city: '', country: '', zip: '' };
            setAddress(addr);
        }
    }, [activeWorkspace]);

    const hasUnsavedChanges = () => {
        if (!activeWorkspace) return false;
        const currentEms = JSON.stringify(emails);
        const savedEms = JSON.stringify(activeWorkspace.contact_emails?.length ? activeWorkspace.contact_emails : [{ value: '', type: 'Email' }]);
        
        const currentPhs = JSON.stringify(phones);
        const savedPhs = JSON.stringify(activeWorkspace.contact_phones?.length ? activeWorkspace.contact_phones : [{ value: '', type: 'Mobile number' }]);
        
        const currentAddr = JSON.stringify(address);
        const savedAddr = JSON.stringify(activeWorkspace.contact_address || { line: '', city: '', country: '', zip: '' });

        return (
            name !== (activeWorkspace.name || '') ||
            logoUrl !== (activeWorkspace.logo_url || '') ||
            currentEms !== savedEms ||
            currentPhs !== savedPhs ||
            currentAddr !== savedAddr
        );
    };

    const handleSave = async () => {
        if (!activeWorkspaceId) return;
        setIsSaving(true);
        // clean up empty array elements
        const cleanEmails = emails.filter(e => e.value.trim() !== '');
        const cleanPhones = phones.filter(p => p.value.trim() !== '');

        await updateWorkspace(activeWorkspaceId, {
            name,
            logo_url: logoUrl,
            contact_emails: cleanEmails.length > 0 ? cleanEmails : [],
            contact_phones: cleanPhones.length > 0 ? cleanPhones : [],
            contact_address: address
        });
        setIsSaving(false);
    };

    const handleForceDelete = async () => {
        if (!activeWorkspaceId) return;
        
        const confirmStr = `Are you sure you want to delete "${activeWorkspace?.name}"? This action cannot be undone.`;
        if (window.confirm(confirmStr)) {
            const success = await deleteWorkspace(activeWorkspaceId);
            if (success) {
                router.push('/');
            }
        }
    };

    if (isLoading) {
        return <div className="animate-pulse">Loading workspace...</div>;
    }

    if (!activeWorkspace) {
        return <div>No active workspace selected.</div>;
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto py-8">
            <SettingsCard
                title="Settings / General"
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasUnsavedChanges()}
            >
                <div className="flex flex-col gap-8">
                    <SettingsField label="Workspace Logo" description="Upload a customized workspace logo.">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setIsUploadModalOpen(true)}
                                className={cn(
                                    "w-16 h-16 rounded-[14px] flex items-center justify-center overflow-hidden transition-all hover:ring-2 hover:ring-offset-2 hover:ring-black/20 dark:hover:ring-white/20",
                                    isDark ? "bg-white/10 hover:ring-offset-[#111]" : "bg-black/5 hover:ring-offset-white"
                                )}
                            >
                                {logoUrl ? (
                                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <span className={cn("text-lg font-bold", isDark ? "text-white/40" : "text-black/40")}>
                                        {name?.charAt(0).toUpperCase() || 'W'}
                                    </span>
                                )}
                            </button>
                            <div className="flex flex-col items-start gap-1">
                                <button
                                    type="button"
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className={cn(
                                        "text-xs font-bold transition-opacity hover:opacity-70",
                                        isDark ? "text-white" : "text-black"
                                    )}
                                >
                                    Change Logo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLogoUrl('')}
                                    className="text-[10px] font-semibold text-red-500 opacity-80 hover:opacity-100 transition-opacity"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </SettingsField>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <SettingsField label="Workspace name">
                            <SettingsInput 
                                value={name} 
                                onChange={e => setName(e.target.value)}
                                placeholder="MOHI HASSAN DESIGN"
                            />
                        </SettingsField>

                        <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-2 mb-1.5">
                                <span className={cn("text-[10px] uppercase tracking-wider font-bold opacity-40")}>Primary Domain</span>
                                {domains.find(d => d.is_primary) && (
                                    <div className="px-1.5 py-0.5 rounded-full bg-[#4dbf39]/10 text-[#4dbf39] text-[9px] font-bold">ACTIVE</div>
                                )}
                             </div>
                             <div className="flex items-center">
                                <span className={cn(
                                    "h-10 px-3 border border-r-0 rounded-l-xl flex items-center text-sm font-mono opacity-50",
                                    isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                                )}>
                                    https://
                                </span>
                                <SettingsInput 
                                    disabled
                                    value={domains.find(d => d.is_primary)?.domain || 'subdomain.antigravity.site'} 
                                    className="rounded-l-none font-mono opacity-70 cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </SettingsCard>

            <AccordionSection title="Custom domains" defaultOpen={true}>
                <div className="flex flex-col gap-5">
                    <div className="text-[13px] opacity-60 leading-relaxed max-w-xl">
                        Connect your own domain to provide a white-labeled experience. 
                        Configuring your DNS is required to verify ownership and enable SSL.
                    </div>

                    <div className="flex flex-col gap-4">
                        {domains.map((domain) => (
                            <div key={domain.id} className={cn(
                                "flex flex-col overflow-hidden rounded-2xl border transition-all",
                                isDark ? "bg-[#161616] border-white/5" : "bg-white border-black/5 shadow-sm"
                            )}>
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 px-5">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-9 h-9 rounded-xl flex items-center justify-center border",
                                            isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                                        )}>
                                            <span className="text-xs font-bold opacity-40 uppercase">
                                                {domain.domain.slice(0, 2)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-mono font-medium">{domain.domain}</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className={cn(
                                                    "w-1 h-1 rounded-full",
                                                    domain.status === 'active' ? "bg-[#4dbf39]" : "bg-orange-500"
                                                )} />
                                                <span className={cn(
                                                    "text-[10px] font-bold uppercase tracking-wider",
                                                    domain.status === 'active' ? "text-[#4dbf39]" : "text-orange-500 opacity-80"
                                                )}>
                                                    {domain.status === 'active' ? 'Verified' : 'Pending DNS'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {domain.status !== 'active' && (
                                            <button className={cn(
                                                "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border",
                                                isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-black/5 border-black/10 text-black hover:bg-black/10"
                                            )}>
                                                Verify DNS
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => deleteDomain(domain.id)}
                                            className="p-2 rounded-lg hover:bg-red-500/10 text-[#6b6b6b] hover:text-red-500 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* DNS Record Card (Only for pending) */}
                                {domain.status !== 'active' && (
                                    <div className={cn(
                                        "m-2 mt-0 p-4 rounded-xl flex flex-col gap-3",
                                        isDark ? "bg-[#111] border border-white/5" : "bg-[#f5f5f5] border border-black/5"
                                    )}>
                                        <div className="text-[12px] opacity-50 font-medium">
                                            Add this CNAME record to your DNS provider to verify ownership:
                                        </div>
                                        
                                        <div className={cn(
                                            "flex items-center rounded-lg p-3 px-4",
                                            isDark ? "bg-[#1a1a1c]" : "bg-[#efefef]"
                                        )}>
                                            <div className="flex flex-wrap items-center gap-x-10 gap-y-3 text-[13px]">
                                                <div className="flex items-center gap-2 group/cname">
                                                    <span className="opacity-40 text-[11px] font-bold uppercase tracking-tight">Type:</span>
                                                    <span className="font-mono font-bold">CNAME</span>
                                                    <button onClick={() => navigator.clipboard.writeText('CNAME')} className="opacity-0 group-hover/cname:opacity-100 text-[#4dbf39] transition-opacity flex items-center justify-center p-1 hover:bg-[#4dbf39]/10 rounded-md">
                                                        <Copy size={12}/>
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 group/name">
                                                    <span className="opacity-40 text-[11px] font-bold uppercase tracking-tight">Name:</span>
                                                    <span className="font-mono font-bold">{domain.domain.split('.')[0]}</span>
                                                    <button onClick={() => navigator.clipboard.writeText(domain.domain.split('.')[0])} className="opacity-0 group-hover/name:opacity-100 text-[#4dbf39] transition-opacity flex items-center justify-center p-1 hover:bg-[#4dbf39]/10 rounded-md">
                                                        <Copy size={12}/>
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 group/target">
                                                    <span className="opacity-40 text-[11px] font-bold uppercase tracking-tight">Target:</span>
                                                    <span className="font-mono font-bold">proxy.minimal-crm.app</span>
                                                    <button onClick={() => navigator.clipboard.writeText('proxy.minimal-crm.app')} className="opacity-0 group-hover/target:opacity-100 text-[#4dbf39] transition-opacity flex items-center justify-center p-1 hover:bg-[#4dbf39]/10 rounded-md">
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="flex gap-2">
                            <SettingsInput 
                                id="new-domain-input"
                                placeholder="e.g. app.mohihassan.com"
                                className="flex-1 font-mono"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const input = e.currentTarget as HTMLInputElement;
                                        if (input.value) {
                                            addDomain(activeWorkspaceId!, input.value);
                                            input.value = '';
                                        }
                                    }
                                }}
                            />
                            <button 
                                onClick={() => {
                                    const input = document.getElementById('new-domain-input') as HTMLInputElement;
                                    if (input.value) {
                                        addDomain(activeWorkspaceId!, input.value);
                                        input.value = '';
                                    }
                                }}
                                className="px-5 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold hover:opacity-90 active:scale-95 transition-all"
                            >
                                Add Domain
                            </button>
                        </div>
                    </div>
                </div>
            </AccordionSection>

            <ImageUploadModal 
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUpload={(url) => setLogoUrl(url)}
                title="Upload Workspace Logo"
            />

            <AccordionSection title="Contact details" defaultOpen={true}>
                <div className="flex flex-col gap-6">
                    <div>
                        <h4 className="text-xs font-bold mb-3">Email address</h4>
                        <div className="flex flex-col gap-2">
                            {emails.map((em, idx) => (
                                <div key={idx} className="flex gap-2 items-center group">
                                    <SettingsInput 
                                        placeholder="hey@yourdomain.com" 
                                        className="flex-1" 
                                        value={em.value}
                                        onChange={e => {
                                            const newEms = [...emails];
                                            newEms[idx].value = e.target.value;
                                            setEmails(newEms);
                                        }}
                                    />
                                    <div className="w-[120px] relative">
                                        <select 
                                            className={cn(
                                                "w-full h-10 px-3 appearance-none bg-transparent border rounded-xl text-sm focus:outline-none",
                                                isDark ? "border-white/10" : "border-black/10"
                                            )}
                                            value={em.type}
                                            onChange={e => {
                                                const newEms = [...emails];
                                                newEms[idx].type = e.target.value;
                                                setEmails(newEms);
                                            }}
                                        >
                                            <option value="Email">Email</option>
                                            <option value="Support">Support</option>
                                            <option value="Billing">Billing</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (emails.length === 1) {
                                                setEmails([{ value: '', type: 'Email' }]);
                                            } else {
                                                setEmails(emails.filter((_, i) => i !== idx));
                                            }
                                        }}
                                        className={cn(
                                            "h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-xl border transition-all opacity-0 group-hover:opacity-100 focus:opacity-100",
                                            isDark ? "border-white/10 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20" : "border-black/10 hover:bg-black/5"
                                        )}
                                    >
                                        <X size={14} strokeWidth={2.5} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={() => setEmails([...emails, { value: '', type: 'Email' }])}
                            className="mt-2 text-xs flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity font-medium"
                        >
                            <Plus size={14} /> Add another
                        </button>
                    </div>
                    
                    <div className="h-px w-full border-t border-dashed border-black/10 dark:border-white/20" />

                    <div>
                        <h4 className="text-xs font-bold mb-3">Phone number</h4>
                        <div className="flex flex-col gap-2">
                            {phones.map((ph, idx) => (
                                <div key={idx} className="flex gap-2 items-center group">
                                    <SettingsInput 
                                        placeholder="+201010150242" 
                                        className="flex-1" 
                                        value={ph.value}
                                        onChange={e => {
                                            const newPhs = [...phones];
                                            newPhs[idx].value = e.target.value;
                                            setPhones(newPhs);
                                        }}
                                    />
                                    <div className="w-[120px] relative">
                                        <select 
                                            className={cn(
                                                "w-full h-10 px-3 appearance-none bg-transparent border rounded-xl text-sm focus:outline-none",
                                                isDark ? "border-white/10" : "border-black/10"
                                            )}
                                            value={ph.type}
                                            onChange={e => {
                                                const newPhs = [...phones];
                                                newPhs[idx].type = e.target.value;
                                                setPhones(newPhs);
                                            }}
                                        >
                                            <option value="Mobile number">Mobile</option>
                                            <option value="Work">Work</option>
                                            <option value="Home">Home</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (phones.length === 1) {
                                                setPhones([{ value: '', type: 'Mobile number' }]);
                                            } else {
                                                setPhones(phones.filter((_, i) => i !== idx));
                                            }
                                        }}
                                        className={cn(
                                            "h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-xl border transition-all opacity-0 group-hover:opacity-100 focus:opacity-100",
                                            isDark ? "border-white/10 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20" : "border-black/10 hover:bg-black/5"
                                        )}
                                    >
                                        <X size={14} strokeWidth={2.5} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={() => setPhones([...phones, { value: '', type: 'Mobile number' }])}
                            className="mt-2 text-xs flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity font-medium"
                        >
                            <Plus size={14} /> Add another
                        </button>
                    </div>

                    <div className="h-px w-full border-t border-dashed border-black/10 dark:border-white/20" />

                    <div>
                        <h4 className="text-xs font-bold mb-3">Address</h4>
                        <div className="flex flex-col gap-3">
                            <SettingsInput 
                                placeholder="Address line" 
                                value={address.line}
                                onChange={e => setAddress({ ...address, line: e.target.value })}
                            />
                            <SettingsInput 
                                placeholder="City / State" 
                                value={address.city}
                                onChange={e => setAddress({ ...address, city: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <SettingsInput 
                                    placeholder="Country" 
                                    value={address.country}
                                    onChange={e => setAddress({ ...address, country: e.target.value })}
                                />
                                <SettingsInput 
                                    placeholder="Post / Zip code" 
                                    value={address.zip}
                                    onChange={e => setAddress({ ...address, zip: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </AccordionSection>

            <AccordionSection title="Links">
                <div className="text-[13px] opacity-60 p-2 leading-relaxed">
                    Add social profiles, portfolios, or external booking links to your public workspace profile.
                </div>
            </AccordionSection>
            
            <AccordionSection title="Metadata">
                <div className="text-[13px] opacity-60 p-2 leading-relaxed">
                    Custom properties and tracking tokens passed automatically to your checkout environments.
                </div>
            </AccordionSection>
            
            <AccordionSection title="Working hours">
                <div className="text-[13px] opacity-60 p-2 leading-relaxed">
                    Set your active business schedule indicating when clients might expect responses or booking availability.
                </div>
            </AccordionSection>
            
            <AccordionSection title="Additional details">
                <div className="text-[13px] opacity-60 p-2 leading-relaxed">
                    Specify registration references or required internal notes tied to this workspace entity globally.
                </div>
            </AccordionSection>

            <div className={cn(
                "w-full rounded-xl overflow-hidden mb-4 border transition-colors border-red-500/20 hover:border-red-500/40",
                isDark ? "bg-[#111]" : "bg-white shadow-sm"
            )}>
                <button 
                    onClick={handleForceDelete}
                    className="w-full flex items-center justify-between p-5 text-sm font-bold text-red-500 transition-colors hover:bg-red-500/5 group"
                >
                    Permanently delete this workspace
                    <ChevronRight size={18} className="opacity-50 group-hover:translate-x-1 border-transparent transition-transform" />
                </button>
            </div>
        </div>
    );
}
