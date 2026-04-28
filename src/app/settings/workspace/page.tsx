"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput, SettingsTextarea, SettingsToggle, SettingsSelect } from '@/components/settings/SettingsField';
import { useWorkspaceStore, Workspace } from '@/store/useWorkspaceStore';
import { useUIStore } from '@/store/useUIStore';
import { ChevronDown, Plus, X, Globe, Phone, Mail, MapPin, ExternalLink, Clock, FileText, Code, HelpCircle, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { appToast } from '@/lib/toast';
import { useSettingsStore } from '@/store/useSettingsStore';
import ImageUploadModal from '@/components/modals/ImageUploadModal';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMEZONE_OPTIONS = Intl.supportedValuesOf('timeZone').map(tz => {
  try {
    const parts = tz.split('/');
    const city = parts[parts.length - 1].replace(/_/g, ' ');
    const region = parts.length > 1 ? parts[0] : '';
    const offset = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || '';
    return { label: `${offset} ${city} (${region})`, value: tz };
  } catch (e) {
    return { label: tz.replace(/_/g, ' '), value: tz };
  }
}).sort((a, b) => a.label.localeCompare(b.label));

export function HelpTip({ text, isDark }: { text: string; isDark: boolean }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative flex items-center justify-center">
            <button
                type="button"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                className={cn('opacity-30 hover:opacity-70 transition-opacity', isDark ? 'text-white' : 'text-black')}
            >
                <HelpCircle size={14} />
            </button>
            {show && (
                <div className={cn(
                    'absolute bottom-full right-0 mb-2 w-56 px-3 py-2 rounded-xl text-xs font-normal shadow-xl z-50 pointer-events-none whitespace-normal text-left tracking-normal',
                    isDark ? 'bg-[#222] text-white/80 border border-white/10' : 'bg-white text-black/70 border border-black/10'
                )}>

                    {text}
                </div>
            )}
        </div>
    );
}

export function WarningTip({ text, isDark }: { text: string; isDark: boolean }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative flex items-center justify-center">
            <button
                type="button"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                className={cn('transition-all duration-200 p-1 rounded-md animate-in fade-in zoom-in-95', isDark ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20' : 'text-amber-600 bg-amber-500/10 hover:bg-amber-500/20')}
            >
                <AlertTriangle size={14} />
            </button>
            {show && (
                <div className={cn(
                    'absolute bottom-full right-0 mb-2 w-64 px-4 py-3 rounded-xl text-[11px] font-medium shadow-2xl z-50 pointer-events-none whitespace-normal text-left tracking-normal leading-relaxed animate-in fade-in slide-in-from-bottom-1',
                    isDark ? 'bg-[#222] text-amber-200 border border-amber-500/20' : 'bg-white text-amber-700 border border-amber-500/20'
                )}>
                    <div className="flex gap-2">
                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                        <span>{text}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function WorkspaceSettingsPage() {
    const router = useRouter();
    const { workspaces, updateWorkspace, deleteWorkspace, hasFetched: hasFetchedWorkspace } = useWorkspaceStore();
    const { domains, fetchDomains, hasFetched: hasFetchedDomains } = useSettingsStore();
    const { activeWorkspaceId, theme } = useUIStore();
    const isDark = theme === 'dark';
    
    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const activeDomain = domains.find(d => d.is_primary);
    
    // General State
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [timezone, setTimezone] = useState('UTC');
    const [weekStartDay, setWeekStartDay] = useState('Saturday');
    
    // Metadata State
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [metaImageUrl, setMetaImageUrl] = useState('');
    const [isMetaUploadModalOpen, setIsMetaUploadModalOpen] = useState(false);
    
    // Contact State
    const [emails, setEmails] = useState<{value: string, type: string}[]>([]);
    const [phones, setPhones] = useState<{value: string, type: string}[]>([]);
    const [address, setAddress] = useState({ line: '', city: '', country: '', zip: '' });
    
    // Links State
    const [links, setLinks] = useState<{label: string, url: string}[]>([]);
    
    // Working Hours State
    const [workingHours, setWorkingHours] = useState<Record<string, { start: string, end: string, closed: boolean }>>({});
    
    // Additional Details State
    const [additionalDetails, setAdditionalDetails] = useState({ 
        tax_id: '', 
        reg_number: '', 
        vat_number: '', 
        notes: '' 
    });

    // Metadata State is not used locally anymore as the section was removed

    
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    // Deletion workflow state
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    
    // Highlight functionality
    const searchParams = useSearchParams();
    const [highlightSlug, setHighlightSlug] = useState(false);
    
    useEffect(() => {
        if (searchParams.get('highlight') === 'slug') {
            setHighlightSlug(true);
            setTimeout(() => setHighlightSlug(false), 3000);
            
            // Scroll to the field after a short delay to ensure layout is ready
            setTimeout(() => {
                const element = document.getElementById('portal-url-field');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [searchParams]);

    useEffect(() => {
        setMounted(true);
        if (activeWorkspaceId) fetchDomains(activeWorkspaceId);
    }, [activeWorkspaceId, fetchDomains]);

    useEffect(() => {
        if (activeWorkspace) {
            setName(activeWorkspace.name || '');
            setSlug(activeWorkspace.slug || '');
            setDescription(activeWorkspace.description || '');
            setLogoUrl(activeWorkspace.logo_url || '');
            setTimezone(activeWorkspace.timezone || 'UTC');
            setWeekStartDay(activeWorkspace.week_start_day || 'Saturday');
            
            // Contact
            setEmails(activeWorkspace.contact_emails?.length ? activeWorkspace.contact_emails : [{ value: '', type: 'Email' }]);
            setPhones(activeWorkspace.contact_phones?.length ? activeWorkspace.contact_phones : [{ value: '', type: 'Mobile number' }]);
            setAddress(activeWorkspace.contact_address || { line: '', city: '', country: '', zip: '' });

            // Links
            setLinks(activeWorkspace.links?.length ? activeWorkspace.links : [{ label: '', url: '' }]);

            // Working Hours
            const initialHours: Record<string, { start: string, end: string, closed: boolean }> = {};
            DAYS.forEach(day => {
                initialHours[day] = activeWorkspace.working_hours?.[day] || { start: '09:00', end: '17:00', closed: false };
            });
            setWorkingHours(initialHours);

            // Additional Details
            setAdditionalDetails(activeWorkspace.additional_details || { tax_id: '', reg_number: '', vat_number: '', notes: '' });


            // Metadata
            setMetaTitle(activeWorkspace.meta_title || '');
            setMetaDescription(activeWorkspace.meta_description || '');
            setMetaImageUrl(activeWorkspace.meta_image_url || '');
        }
    }, [activeWorkspace]);

    const handleSaveSection = async (section: string, updates: Partial<Workspace>) => {
        if (!activeWorkspaceId) return;
        setIsSaving(prev => ({ ...prev, [section]: true }));
        
        // Clean up data before saving
        if (updates.contact_emails) {
            updates.contact_emails = (updates.contact_emails as any[]).filter(e => e.value.trim() !== '');
        }
        if (updates.contact_phones) {
            updates.contact_phones = (updates.contact_phones as any[]).filter(p => p.value.trim() !== '');
        }
        if (updates.links) {
            updates.links = (updates.links as any[]).filter(l => l.url.trim() !== '');
        }


        await appToast.promise(
            updateWorkspace(activeWorkspaceId, updates),
            {
                loading: 'Saving changes...',
                success: 'Changes saved',
                error: `Failed to save ${section}`
            }
        );
        setIsSaving(prev => ({ ...prev, [section]: false }));
    };

    const hasChanged = (section: string) => {
        if (!activeWorkspace) return false;
        switch (section) {
            case 'general':
                return name !== (activeWorkspace.name || '') || slug !== (activeWorkspace.slug || '') || description !== (activeWorkspace.description || '') || logoUrl !== (activeWorkspace.logo_url || '');
            case 'regional':
                return timezone !== (activeWorkspace.timezone || 'UTC') || weekStartDay !== (activeWorkspace.week_start_day || 'Saturday');
            case 'contact':
                const currentEms = JSON.stringify(emails.filter(e => e.value.trim() !== ''));
                const savedEms = JSON.stringify(activeWorkspace.contact_emails || []);
                const currentPhs = JSON.stringify(phones.filter(p => p.value.trim() !== ''));
                const savedPhs = JSON.stringify(activeWorkspace.contact_phones || []);
                const currentAddr = JSON.stringify(address);
                const savedAddr = JSON.stringify(activeWorkspace.contact_address || { line: '', city: '', country: '', zip: '' });
                return currentEms !== savedEms || currentPhs !== savedPhs || currentAddr !== savedAddr;
            case 'links':
                const currentLinks = JSON.stringify(links.filter(l => l.url.trim() !== ''));
                const savedLinks = JSON.stringify(activeWorkspace.links || []);
                return currentLinks !== savedLinks;
            case 'workingHours':
                return JSON.stringify(workingHours) !== JSON.stringify(activeWorkspace.working_hours || {});
            case 'additionalDetails':
                return JSON.stringify(additionalDetails) !== JSON.stringify(activeWorkspace.additional_details || { tax_id: '', reg_number: '', vat_number: '', notes: '' });
            case 'metadata':
                return metaTitle !== (activeWorkspace.meta_title || '') || metaDescription !== (activeWorkspace.meta_description || '') || metaImageUrl !== (activeWorkspace.meta_image_url || '');

            default:
                return false;
        }
    };

    const handleForceDelete = async () => {
        if (!activeWorkspaceId) return;
        const confirmStr = `Are you sure you want to delete "${activeWorkspace?.name}"? This action cannot be undone.`;
        if (window.confirm(confirmStr)) {
            const success = await deleteWorkspace(activeWorkspaceId);
            if (success) router.push('/');
        }
    };

    if (!hasFetchedWorkspace || !hasFetchedDomains.domains || !mounted) {
        return (
            <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto py-8 animate-pulse">
                <div className={cn("h-64 rounded-2xl", isDark ? "bg-white/5" : "bg-black/5")} />
                <div className={cn("h-96 rounded-2xl", isDark ? "bg-white/5" : "bg-black/5")} />
            </div>
        );
    }

    if (!activeWorkspace) return <div className="opacity-50 text-sm py-8 px-4">No active workspace selected.</div>;

    return (
        <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto py-8 pb-32">
            {/* General Settings */}
            <SettingsCard
                title="Workspace General"
                description="The core identity and primary access point for your workspace."
                onSave={() => handleSaveSection('general', { name, description, slug, logo_url: logoUrl })}
                isSaving={isSaving['general']}
                unsavedChanges={hasChanged('general')}
            >
                <div className="flex flex-col gap-8">
                    <SettingsField label="Workspace Logo" description="This logo will appear on your dashboard and public client pages.">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setIsUploadModalOpen(true)}
                                className={cn(
                                    "w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden transition-all hover:ring-2 hover:ring-offset-2 hover:ring-black/20 dark:hover:ring-white/20",
                                    isDark ? "bg-white/10 hover:ring-offset-[#111]" : "bg-black/5 hover:ring-offset-white"
                                )}
                            >
                                {logoUrl ? (
                                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <span className={cn("text-2xl font-bold", isDark ? "text-white/40" : "text-black/40")}>
                                        {name?.charAt(0).toUpperCase() || 'W'}
                                    </span>
                                )}
                            </button>
                            <div className="flex flex-col items-start gap-1">
                                <button
                                    type="button"
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="text-sm font-bold hover:opacity-70 transition-opacity"
                                >
                                    Change Logo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLogoUrl('')}
                                    className="text-xs font-semibold text-red-500 opacity-80 hover:opacity-100 transition-opacity"
                                >
                                    Remove custom logo
                                </button>
                            </div>
                        </div>
                    </SettingsField>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <SettingsField 
                            label="Workspace Name"
                            extra={<HelpTip text="This name will be used across your portal, emails, and white-labeled documents." isDark={isDark} />}
                        >
                            <SettingsInput 
                                value={name} 
                                onChange={e => setName(e.target.value)}
                                placeholder="Your Business Name"
                            />
                        </SettingsField>

                        <SettingsField 
                            label="Workspace Portal URL" 
                            id="portal-url-field"
                            extra={
                                activeDomain ? (
                                    <WarningTip 
                                        text={`This portal is currently linked to the custom domain "${activeDomain.domain}". Changing the internal slug may affect your portal routing.`} 
                                        isDark={isDark} 
                                    />
                                ) : (
                                    <HelpTip text="Your unique portal address. Clients visit slug.aroooxa.com to access their portal. You can also link a custom domain in Domains settings." isDark={isDark} />
                                )
                            }
                        >
                             <div className={cn(
                                 "flex flex-col gap-2 rounded-xl transition-all duration-700",
                                 highlightSlug && (isDark ? "ring-2 ring-white/40 bg-white/5" : "ring-2 ring-black/10 bg-black/5")
                             )}>
                                 <div className="flex items-center">
                                    <SettingsInput 
                                        value={slug}
                                        onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                        className="rounded-r-none font-mono text-left border-r-0"
                                        placeholder="your-workspace"
                                    />
                                    <span className={cn(
                                        "h-10 px-3 border border-l-0 rounded-r-xl flex items-center text-xs font-mono opacity-50 whitespace-nowrap",
                                        isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                                    )}>
                                        .{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'aroooxa.com'}
                                    </span>
                                 </div>
                             </div>
                        </SettingsField>
                    </div>

                    <SettingsField 
                        label="Workspace Description" 
                        description="This will appear as the site description for clients visiting your dashboard via custom domains."
                    >
                        <SettingsTextarea 
                            value={description} 
                            onChange={e => setDescription(e.target.value)}
                            placeholder="A premium CRM solution for scaling operations."
                        />
                    </SettingsField>
                </div>
            </SettingsCard>

            {/* Metadata Settings */}
            <SettingsCard
                title="Metadata"
                description="Optimize how your portal appears on search engines and social media platforms."
                onSave={() => handleSaveSection('metadata', { meta_title: metaTitle, meta_description: metaDescription, meta_image_url: metaImageUrl })}
                isSaving={isSaving['metadata']}
                unsavedChanges={hasChanged('metadata')}
                collapsible
                defaultCollapsed
                extra={<HelpTip text="These settings define the title, description, and thumbnail used for SEO and social sharing (Open Graph)." isDark={isDark} />}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                    {/* LEFT – Live Social Card Preview */}
                    <div className="flex flex-col gap-2">
                        <span className={cn("text-[11px] font-bold uppercase tracking-widest opacity-40", isDark ? "text-white" : "text-black")}>Live Social Preview</span>
                        <div className={cn(
                            "rounded-2xl overflow-hidden border shadow-sm transition-all",
                            isDark ? "bg-[#191919] border-white/8" : "bg-white border-black/8"
                        )}>
                            {/* OG Banner – click to upload */}
                            <div className="relative group/banner">
                                <button
                                    type="button"
                                    onClick={() => setIsMetaUploadModalOpen(true)}
                                    className={cn(
                                        "w-full h-40 flex flex-col items-center justify-center gap-2 relative overflow-hidden transition-all",
                                        isDark ? "bg-white/[0.04] hover:bg-white/[0.07]" : "bg-black/[0.04] hover:bg-black/[0.06]"
                                    )}
                                >
                                    {metaImageUrl ? (
                                        <>
                                            <img src={metaImageUrl} alt="OG Thumbnail" className="absolute inset-0 w-full h-full object-cover" />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 group-hover/banner:opacity-100 transition-opacity">
                                                <ImageIcon size={18} className="text-white" />
                                                <span className="text-white text-xs font-bold tracking-wide">Replace Image</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover/banner:scale-105",
                                                isDark ? "bg-white/10" : "bg-black/8"
                                            )}>
                                                <ImageIcon size={20} className={cn("transition-opacity", isDark ? "text-white/30 group-hover/banner:text-white/60" : "text-black/25 group-hover/banner:text-black/50")} />
                                            </div>
                                            <span className={cn("text-[11px] font-semibold transition-opacity", isDark ? "text-white/30 group-hover/banner:text-white/60" : "text-black/30 group-hover/banner:text-black/55")}>
                                                Click to add a social thumbnail
                                            </span>
                                        </>
                                    )}
                                </button>
                                
                                {metaImageUrl && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setMetaImageUrl(''); }}
                                        className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/75 text-white opacity-0 group-hover/banner:opacity-100 transition-all z-10"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Card text content */}
                            <div className="flex flex-col gap-1.5 px-4 py-3.5">
                                <span className={cn("text-[10px] font-mono font-medium tracking-wide opacity-35 uppercase", isDark ? "text-white" : "text-black")}>
                                    {activeDomain?.domain || `${slug || 'your-workspace'}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'aroooxa.com'}`}
                                </span>
                                <h5 className={cn("text-[14px] font-bold leading-tight line-clamp-1", isDark ? "text-white" : "text-black")}>
                                    {metaTitle || name || 'Your Workspace Title'}
                                </h5>
                                <p className={cn("text-[12px] leading-relaxed line-clamp-2 opacity-60", isDark ? "text-white" : "text-black")}>
                                    {metaDescription || description || 'A short description of your workspace shown in search results and social media previews.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT – Form Fields */}
                    <div className="flex flex-col gap-6">
                        <SettingsField
                            label="Meta Title"
                            description="The page title shown in search results and browser tabs."
                        >
                            <div className="relative">
                                <SettingsInput
                                    value={metaTitle}
                                    onChange={e => setMetaTitle(e.target.value.slice(0, 70))}
                                    placeholder={name || 'Your Workspace — Premium Portal'}
                                />
                                <span className={cn(
                                    "absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold tabular-nums pointer-events-none",
                                    metaTitle.length > 60 ? "text-amber-500" : (isDark ? "text-white/20" : "text-black/20")
                                )}>
                                    {metaTitle.length}/70
                                </span>
                            </div>
                        </SettingsField>

                        <SettingsField
                            label="Meta Description"
                            description="A concise summary for search engines and social sharing."
                        >
                            <div className="relative">
                                <SettingsTextarea
                                    value={metaDescription}
                                    onChange={e => setMetaDescription(e.target.value.slice(0, 160))}
                                    placeholder={description || 'Describe your workspace in 1–2 sentences…'}
                                    rows={4}
                                />
                                <span className={cn(
                                    "absolute right-3 bottom-3 text-[10px] font-mono font-bold tabular-nums pointer-events-none",
                                    metaDescription.length > 140 ? "text-amber-500" : (isDark ? "text-white/20" : "text-black/20")
                                )}>
                                    {metaDescription.length}/160
                                </span>
                            </div>
                        </SettingsField>
                    </div>
                </div>
            </SettingsCard>

            {/* Regional Settings */}
            <SettingsCard
                title="Regional Settings"
                description="Set the default timezone and start of the week for your workspace for accurate scheduling and reporting."
                onSave={() => handleSaveSection('regional', { timezone, week_start_day: weekStartDay })}
                isSaving={isSaving['regional']}
                unsavedChanges={hasChanged('regional')}
                collapsible
                defaultCollapsed
            >
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SettingsField label="Workspace Timezone" description="New schedulers will use this timezone by default.">
                            <SettingsSelect
                                isDark={isDark}
                                value={timezone}
                                onChange={setTimezone}
                                options={TIMEZONE_OPTIONS}
                            />
                        </SettingsField>
                        <SettingsField label="Start of the week" description="How calendars should be displayed.">
                            <SettingsSelect
                                isDark={isDark}
                                value={weekStartDay}
                                onChange={setWeekStartDay}
                                options={DAYS.map(d => ({ label: d, value: d }))}
                            />
                        </SettingsField>
                    </div>
                </div>
            </SettingsCard>

            {/* Contact Details */}
            <SettingsCard
                title="Contact Details"
                description="Information used for billing, client communication, and public profiles."
                onSave={() => handleSaveSection('contact', { contact_emails: emails, contact_phones: phones, contact_address: address })}
                isSaving={isSaving['contact']}
                unsavedChanges={hasChanged('contact')}
                collapsible
                defaultCollapsed
            >
                <div className="flex flex-col gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Mail size={14} className="opacity-40" />
                            <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Email Addresses</h4>
                        </div>
                        <div className="flex flex-col gap-2">
                            {emails.map((em, idx) => (
                                <div key={idx} className="flex gap-2 items-center group">
                                    <SettingsInput 
                                        placeholder="hello@example.com" 
                                        className="flex-1" 
                                        value={em.value}
                                        onChange={e => {
                                            const next = [...emails];
                                            next[idx].value = e.target.value;
                                            setEmails(next);
                                        }}
                                    />
                                    <div className="w-[120px]">
                                        <SettingsSelect
                                            isDark={isDark}
                                            value={em.type}
                                            onChange={val => {
                                                const next = [...emails];
                                                next[idx].type = val;
                                                setEmails(next);
                                            }}
                                            options={[
                                                { label: 'Work', value: 'Email' },
                                                { label: 'Support', value: 'Support' },
                                                { label: 'Billing', value: 'Billing' }
                                            ]}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => setEmails(emails.length === 1 ? [{ value: '', type: 'Email' }] : emails.filter((_, i) => i !== idx))}
                                        className={cn(
                                            "h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-xl border transition-all opacity-0 group-hover:opacity-100",
                                            isDark ? "border-white/10 hover:bg-red-500/10 hover:text-red-500" : "border-black/10 hover:bg-black/5"
                                        )}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => setEmails([...emails, { value: '', type: 'Email' }])} className="text-xs font-bold mt-1 opacity-60 hover:opacity-100 flex items-center gap-1">
                                <Plus size={14} /> Add Email
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Phone size={14} className="opacity-40" />
                            <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Phone Numbers</h4>
                        </div>
                        <div className="flex flex-col gap-2">
                            {phones.map((ph, idx) => (
                                <div key={idx} className="flex gap-2 items-center group">
                                    <SettingsInput 
                                        placeholder="+1 234 567 890" 
                                        className="flex-1" 
                                        value={ph.value}
                                        onChange={e => {
                                            const next = [...phones];
                                            next[idx].value = e.target.value;
                                            setPhones(next);
                                        }}
                                    />
                                    <div className="w-[120px]">
                                        <SettingsSelect
                                            isDark={isDark}
                                            value={ph.type}
                                            onChange={val => {
                                                const next = [...phones];
                                                next[idx].type = val;
                                                setPhones(next);
                                            }}
                                            options={[
                                                { label: 'Mobile', value: 'Mobile number' },
                                                { label: 'Work', value: 'Work' },
                                                { label: 'Home', value: 'Home' }
                                            ]}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => setPhones(phones.length === 1 ? [{ value: '', type: 'Mobile number' }] : phones.filter((_, i) => i !== idx))}
                                        className={cn(
                                            "h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-xl border transition-all opacity-0 group-hover:opacity-100",
                                            isDark ? "border-white/10 hover:bg-red-500/10 hover:text-red-500" : "border-black/10 hover:bg-black/5"
                                        )}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => setPhones([...phones, { value: '', type: 'Mobile number' }])} className="text-xs font-bold mt-1 opacity-60 hover:opacity-100 flex items-center gap-1">
                                <Plus size={14} /> Add Phone
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <MapPin size={14} className="opacity-40" />
                            <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Physical Address</h4>
                        </div>
                        <div className="flex flex-col gap-3">
                            <SettingsInput 
                                placeholder="Street address" 
                                value={address.line}
                                onChange={e => setAddress({ ...address, line: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <SettingsInput 
                                    placeholder="City" 
                                    value={address.city}
                                    onChange={e => setAddress({ ...address, city: e.target.value })}
                                />
                                <SettingsInput 
                                    placeholder="Post / Zip code" 
                                    value={address.zip}
                                    onChange={e => setAddress({ ...address, zip: e.target.value })}
                                />
                            </div>
                            <SettingsInput 
                                placeholder="Country" 
                                value={address.country}
                                onChange={e => setAddress({ ...address, country: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </SettingsCard>

            {/* Links & Socials */}
            <SettingsCard
                title="Links & Socials"
                description="Social profiles, portfolios, or external booking links."
                onSave={() => handleSaveSection('links', { links })}
                isSaving={isSaving['links']}
                unsavedChanges={hasChanged('links')}
                collapsible
                defaultCollapsed
            >
                <div className="flex flex-col gap-4">
                    {links.map((link, idx) => (
                        <div key={idx} className="flex gap-2 items-center group">
                            <SettingsInput 
                                placeholder="Label (e.g. Website)" 
                                className="w-1/3" 
                                value={link.label}
                                onChange={e => {
                                    const next = [...links];
                                    next[idx].label = e.target.value;
                                    setLinks(next);
                                }}
                            />
                            <div className="flex-1 relative">
                                <SettingsInput 
                                    placeholder="https://..." 
                                    value={link.url}
                                    onChange={e => {
                                        const next = [...links];
                                        next[idx].url = e.target.value;
                                        setLinks(next);
                                    }}
                                />
                                <ExternalLink size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30" />
                            </div>
                            <button 
                                onClick={() => setLinks(links.length === 1 ? [{ label: '', url: '' }] : links.filter((_, i) => i !== idx))}
                                className={cn(
                                    "h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-xl border transition-all opacity-0 group-hover:opacity-100",
                                    isDark ? "border-white/10 hover:bg-red-500/10 hover:text-red-500" : "border-black/10 hover:bg-black/5"
                                )}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    <button onClick={() => setLinks([...links, { label: '', url: '' }])} className="text-xs font-bold opacity-60 hover:opacity-100 flex items-center gap-1">
                        <Plus size={14} /> Add Social Link
                    </button>
                </div>
            </SettingsCard>

            {/* Working Hours */}
            <SettingsCard
                title="Working Hours"
                description="Set your active business schedule for client expectations."
                onSave={() => handleSaveSection('workingHours', { working_hours: workingHours })}
                isSaving={isSaving['workingHours']}
                unsavedChanges={hasChanged('workingHours')}
                collapsible
                defaultCollapsed
            >
                <div className="flex flex-col gap-1 border rounded-2xl overflow-hidden" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    {DAYS.map(day => {
                        const config = workingHours[day] || { start: '09:00', end: '17:00', closed: false };
                        return (
                            <div key={day} className={cn(
                                "flex items-center justify-between p-4 transition-colors",
                                isDark ? "hover:bg-white/5" : "hover:bg-black/5",
                                day !== DAYS[DAYS.length-1] && (isDark ? "border-b border-white/5" : "border-b border-black/5")
                            )}>
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-24 font-bold text-sm">{day}</div>
                                    {!config.closed && (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="time" 
                                                value={config.start}
                                                onChange={e => setWorkingHours({ ...workingHours, [day]: { ...config, start: e.target.value } })}
                                                className={cn(
                                                    "h-8 px-2 rounded-lg border text-xs focus:outline-none",
                                                    isDark ? "bg-white/5 border-white/10 text-white" : "bg-black/5 border-black/10 text-black"
                                                )}
                                            />
                                            <span className="opacity-40 text-[10px] font-bold">TO</span>
                                            <input 
                                                type="time" 
                                                value={config.end}
                                                onChange={e => setWorkingHours({ ...workingHours, [day]: { ...config, end: e.target.value } })}
                                                className={cn(
                                                    "h-8 px-2 rounded-lg border text-xs focus:outline-none",
                                                    isDark ? "bg-white/5 border-white/10 text-white" : "bg-black/5 border-black/10 text-black"
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", config.closed ? "text-red-500" : "opacity-40")}>
                                        {config.closed ? 'Closed' : 'Open'}
                                    </span>
                                    <SettingsToggle 
                                        checked={!config.closed} 
                                        onChange={checked => setWorkingHours({ ...workingHours, [day]: { ...config, closed: !checked } })} 
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </SettingsCard>

            {/* Additional Details */}
            <SettingsCard
                title="Professional Details"
                description="Registration references and required internal notes."
                onSave={() => handleSaveSection('additionalDetails', { additional_details: additionalDetails })}
                isSaving={isSaving['additionalDetails']}
                unsavedChanges={hasChanged('additionalDetails')}
                collapsible
                defaultCollapsed
            >
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-2 gap-4">
                        <SettingsField label="Registration Number">
                            <SettingsInput 
                                placeholder="e.g. 12345678" 
                                value={additionalDetails.reg_number}
                                onChange={e => setAdditionalDetails({ ...additionalDetails, reg_number: e.target.value })}
                            />
                        </SettingsField>
                        <SettingsField label="VAT / TAX ID">
                            <SettingsInput 
                                placeholder="e.g. GB 123 4567 89" 
                                value={additionalDetails.tax_id}
                                onChange={e => setAdditionalDetails({ ...additionalDetails, tax_id: e.target.value })}
                            />
                        </SettingsField>
                    </div>
                    <SettingsField label="Workspace Notes" description="Private internal notes about this workspace entity.">
                        <SettingsTextarea 
                            placeholder="Add any internal references here..." 
                            value={additionalDetails.notes}
                            onChange={e => setAdditionalDetails({ ...additionalDetails, notes: e.target.value })}
                        />
                    </SettingsField>
                </div>
            </SettingsCard>

            <ImageUploadModal 
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUpload={(url) => setLogoUrl(url)}
                title="Upload Workspace Logo"
            />

            <ImageUploadModal 
                isOpen={isMetaUploadModalOpen}
                onClose={() => setIsMetaUploadModalOpen(false)}
                onUpload={(url) => setMetaImageUrl(url)}
                title="Upload Metadata Thumbnail"
            />

            {/* Danger Zone */}
            <div className={cn(
                "w-full rounded-2xl overflow-hidden border transition-all duration-300",
                isDark 
                    ? "bg-[#1a1a1a] border-red-500/20" 
                    : "bg-white border-red-500/20 shadow-sm"
            )}>
                {!isDeleting ? (
                    <button 
                        onClick={() => setIsDeleting(true)}
                        className="w-full flex items-center justify-between p-6 text-sm font-bold text-red-500 transition-colors hover:bg-red-500/5 group"
                    >
                        <div className="flex flex-col items-start gap-0.5">
                            <span>Permanently delete this workspace</span>
                            <span className="text-[10px] font-medium opacity-50">All data, invoices, and settings will be lost forever.</span>
                        </div>
                        <X size={18} className="opacity-30 group-hover:opacity-100 transition-all group-hover:rotate-90" />
                    </button>
                ) : (
                    <div className="p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <h4 className="text-sm font-bold text-red-500">Confirm workspace deletion</h4>
                                <p className={cn("text-xs opacity-60", isDark ? "text-white" : "text-black")}>
                                    To permanently delete <span className="font-bold underline"> {activeWorkspace.name}</span>, please type its name below.
                                </p>
                            </div>
                            
                            <div className="flex gap-2">
                                <SettingsInput 
                                    autoFocus
                                    placeholder={activeWorkspace.name}
                                    value={confirmText}
                                    onChange={e => setConfirmText(e.target.value)}
                                    className={cn(
                                        "flex-1",
                                        isDark ? "bg-[#141414] border-red-500/20" : "bg-[#fafafa] border-red-500/20"
                                    )}
                                />
                                <button 
                                    disabled={confirmText !== activeWorkspace.name}
                                    onClick={async () => {
                                        if (!activeWorkspaceId) return;
                                        const success = await deleteWorkspace(activeWorkspaceId);
                                        if (success) router.push('/');
                                    }}
                                    className="px-6 h-10 rounded-xl bg-red-500 text-white text-[13px] font-bold transition-all disabled:opacity-30 active:scale-95"
                                >
                                    Permanently Delete
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsDeleting(false);
                                        setConfirmText('');
                                    }}
                                    className={cn(
                                        "px-4 h-10 rounded-xl text-[13px] font-bold transition-colors",
                                        isDark ? "bg-white/5 text-white/40 hover:text-white" : "bg-black/5 text-black/40 hover:text-black"
                                    )}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
