"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput, SettingsToggle, SettingsTextarea, SettingsSelect } from '@/components/settings/SettingsField';
import { useSettingsStore, UserProfile } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import ImageUploadModal from '@/components/modals/ImageUploadModal';
import { appToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';

export default function ProfileSettingsPage() {
    const { profile, fetchProfile, updateProfile, isLoading, hasFetched } = useSettingsStore();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const { user } = useAuthStore();
    const [formData, setFormData] = useState<Partial<UserProfile & { linkedin: string; twitter: string; website: string }>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        if (profile) {
            let socialObj = { linkedin: '', twitter: '', website: '' };
            try {
                if (profile.social_links) {
                    socialObj = profile.social_links as any;
                }
            } catch (e) {}

            setFormData({
                full_name: profile.full_name || '',
                avatar_url: profile.avatar_url || '',
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
            if (profile.social_links) {
                socialObj = profile.social_links as any;
            }
        } catch (e) {}

        return (
            (formData.full_name || '') !== (profile.full_name || '') ||
            (formData.avatar_url || '') !== (profile.avatar_url || '') ||
            (formData.phone || '') !== (profile.phone || '') ||
            (formData.address || '') !== (profile.address || '') ||
            (formData.timezone || 'UTC') !== (profile.timezone || 'UTC') ||
            (formData.language || 'en') !== (profile.language || 'en') ||
            (formData.linkedin || '') !== (socialObj.linkedin || '') ||
            (formData.twitter || '') !== (socialObj.twitter || '') ||
            (formData.website || '') !== (socialObj.website || '')
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        await appToast.promise(
            updateProfile({
                full_name: formData.full_name,
                avatar_url: formData.avatar_url,
                phone: formData.phone,
                address: formData.address,
                timezone: formData.timezone,
                language: formData.language,
                social_links: {
                    linkedin: formData.linkedin,
                    twitter: formData.twitter,
                    website: formData.website
                }
            }),
            {
                loading: 'Updating profile...',
                success: 'Profile updated',
                error: 'Failed to update profile'
            }
        );
        setIsSaving(false);
    };

    if (!hasFetched.profile) {
        return <div className="animate-pulse">Loading profile...</div>;
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8">
            <SettingsCard
                title="Public Profile"
                description="This information will be displayed to your clients and team members."
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasUnsavedChanges()}
            >
                <SettingsField label="Full Name" description="Your preferred display name.">
                    <SettingsInput 
                        value={formData.full_name || ''} 
                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="e.g. Jane Doe"
                    />
                </SettingsField>

                <SettingsField label="Profile Avatar" description="Upload a custom profile picture using drag and drop or an image link.">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setIsUploadModalOpen(true)}
                            className={cn(
                                "w-14 h-14 rounded-full flex items-center justify-center overflow-hidden transition-all hover:ring-2 hover:ring-offset-2 hover:ring-black/20 dark:hover:ring-white/20",
                                isDark ? "bg-white/10 hover:ring-offset-[#111]" : "bg-black/5 hover:ring-offset-white"
                            )}
                        >
                        <Avatar 
                            src={formData.avatar_url} 
                            name={formData.full_name || 'U'} 
                            className="w-14 h-14 rounded-full" 
                            isDark={isDark} 
                        />
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
                                Change Avatar
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, avatar_url: '' })}
                                className="text-[10px] font-semibold text-red-500 opacity-80 hover:opacity-100 transition-opacity"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </SettingsField>
            </SettingsCard>

            <ImageUploadModal 
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUpload={(url: string) => setFormData({ ...formData, avatar_url: url })}
                title="Upload Profile Avatar"
            />

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
                            value={formData.phone || ''} 
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+1 (555) 000-0000"
                        />
                    </SettingsField>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SettingsField label="Timezone">
                            <SettingsSelect
                                isDark={isDark}
                                value={formData.timezone || 'UTC'}
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
                                value={formData.language || 'en'}
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
                        value={formData.address || ''} 
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingsField label="LinkedIn">
                        <SettingsInput 
                            value={formData.linkedin || ''} 
                            onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                            placeholder="linkedin.com/..."
                        />
                    </SettingsField>
                    <SettingsField label="X (Twitter)">
                        <SettingsInput 
                            value={formData.twitter || ''} 
                            onChange={e => setFormData({ ...formData, twitter: e.target.value })}
                            placeholder="x.com/..."
                        />
                    </SettingsField>
                </div>
                <SettingsField label="Personal Website">
                    <SettingsInput 
                        value={formData.website || ''} 
                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://..."
                    />
                </SettingsField>
            </SettingsCard>
        </div>
    );
}
