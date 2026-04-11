"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput, SettingsTextarea, SettingsSelect } from '@/components/settings/SettingsField';
import { useSettingsStore, UserProfile } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';

// We'll augment the UserProfile inline for the form state since it covers social links via jsonb in the DB
interface ContactFormState {
    phone: string;
    address: string;
    timezone: string;
    language: string;
    linkedin: string;
    twitter: string;
    website: string;
}

export default function ContactSettingsPage() {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const { profile, fetchProfile, updateProfile, isLoading } = useSettingsStore();

    const [formData, setFormData] = useState<ContactFormState>({
        phone: '',
        address: '',
        timezone: 'UTC',
        language: 'en',
        linkedin: '',
        twitter: '',
        website: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        if (profile) {
            // Because social_links is jsonb, we need to handle it safely
            let socialObj = { linkedin: '', twitter: '', website: '' };
            try {
                if (profile && (profile as any).social_links) {
                    socialObj = (profile as any).social_links;
                }
            } catch (e) {}

            setFormData({
                phone: profile.phone || '',
                address: profile.address || '',
                timezone: profile.timezone || 'UTC',
                language: profile.language || 'en',
                ...socialObj
            });
        }
    }, [profile]);

    const hasUnsavedChanges = () => {
        if (!profile) return false;
        
        let socialObj = { linkedin: '', twitter: '', website: '' };
        try {
            if (profile && (profile as any).social_links) {
                socialObj = (profile as any).social_links;
            }
        } catch (e) {}

        return (
            formData.phone !== (profile.phone || '') ||
            formData.address !== (profile.address || '') ||
            formData.timezone !== (profile.timezone || 'UTC') ||
            formData.language !== (profile.language || 'en') ||
            formData.linkedin !== (socialObj.linkedin || '') ||
            formData.twitter !== (socialObj.twitter || '') ||
            formData.website !== (socialObj.website || '')
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        await updateProfile({
            phone: formData.phone,
            address: formData.address,
            timezone: formData.timezone,
            language: formData.language,
            // @ts-ignore
            social_links: {
                linkedin: formData.linkedin,
                twitter: formData.twitter,
                website: formData.website
            }
        });
        setIsSaving(false);
    };

    if (isLoading && !profile) {
        return <div className="animate-pulse">Loading contact info...</div>;
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8">
            <SettingsCard
                title="Personal Information"
                description="Your contact details used for internal accounts and defaults."
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasUnsavedChanges()}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingsField label="Phone Number">
                        <SettingsInput 
                            value={formData.phone} 
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+1 (555) 000-0000"
                        />
                    </SettingsField>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SettingsField label="Timezone">
                            <SettingsSelect
                                isDark={isDark}
                                value={formData.timezone}
                                onChange={val => setFormData({ ...formData, timezone: val })}
                                options={[
                                    { label: 'UTC', value: 'UTC' },
                                    { label: 'America/New_York (EST)', value: 'America/New_York' },
                                    { label: 'America/Los_Angeles (PST)', value: 'America/Los_Angeles' },
                                    { label: 'Europe/London (GMT)', value: 'Europe/London' },
                                    { label: 'Europe/Paris (CET)', value: 'Europe/Paris' },
                                    { label: 'Asia/Tokyo (JST)', value: 'Asia/Tokyo' },
                                    { label: 'Asia/Dubai (GST)', value: 'Asia/Dubai' }
                                ]}
                            />
                        </SettingsField>
                        <SettingsField label="Language">
                            <SettingsSelect
                                isDark={isDark}
                                value={formData.language}
                                onChange={val => setFormData({ ...formData, language: val })}
                                options={[
                                    { label: 'English', value: 'en' },
                                    { label: 'French', value: 'fr' },
                                    { label: 'Spanish', value: 'es' },
                                    { label: 'German', value: 'de' },
                                    { label: 'Arabic', value: 'ar' }
                                ]}
                            />
                        </SettingsField>
                    </div>
                </div>

                <SettingsField label="Personal Address">
                    <SettingsTextarea 
                        value={formData.address} 
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 Creator St&#10;San Francisco, CA 94105"
                    />
                </SettingsField>
            </SettingsCard>

            <SettingsCard
                title="Social Presence"
                description="Links to your professional profiles."
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasUnsavedChanges()}
            >
                <SettingsField label="LinkedIn URL">
                    <SettingsInput 
                        value={formData.linkedin} 
                        onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                    />
                </SettingsField>
                <SettingsField label="X (Twitter) URL">
                    <SettingsInput 
                        value={formData.twitter} 
                        onChange={e => setFormData({ ...formData, twitter: e.target.value })}
                        placeholder="https://x.com/..."
                    />
                </SettingsField>
                <SettingsField label="Personal Website">
                    <SettingsInput 
                        value={formData.website} 
                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://..."
                    />
                </SettingsField>
            </SettingsCard>
        </div>
    );
}
