"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput, SettingsToggle } from '@/components/settings/SettingsField';
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
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    
    // For password change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                avatar_url: profile.avatar_url || ''
            });
        } else if (user?.user_metadata?.full_name) {
            // Fallback to auth metadata if profile record isn't loaded yet
            setFormData({
                full_name: user.user_metadata.full_name,
                avatar_url: ''
            });
        }
    }, [profile, user]);

    const hasUnsavedChanges = () => {
        const currentFullName = profile?.full_name || user?.user_metadata?.full_name || '';
        const currentAvatarUrl = profile?.avatar_url || '';
        
        return (
            (formData.full_name || '') !== currentFullName ||
            (formData.avatar_url || '') !== currentAvatarUrl
        );
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        await appToast.promise(
            updateProfile({
                full_name: formData.full_name,
                avatar_url: formData.avatar_url,
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
                onSave={handleSaveProfile}
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
                title="Security"
                description="Manage your password and authentication methods."
            >
                <div className="flex flex-col gap-4 mb-6">
                    <SettingsField label="Email Address" description="Used for sign-in and notifications.">
                        <SettingsInput 
                            value={user?.email || ''} 
                            disabled
                            className="opacity-50 cursor-not-allowed"
                        />
                    </SettingsField>
                </div>

                <div className="flex flex-col gap-4 border-t pt-6" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                    <h3 className="font-semibold text-sm">Change Password</h3>
                    <SettingsField label="Current Password">
                        <SettingsInput 
                            type="password"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            placeholder="Current password"
                        />
                    </SettingsField>
                    <SettingsField label="New Password">
                        <SettingsInput 
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="New password (min 8 characters)"
                        />
                    </SettingsField>
                    <div>
                        <button className="bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-95 transition-all text-xs font-bold px-4 py-2 rounded-lg">
                            Update Password
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-4 border-t pt-6" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                   <SettingsField layout="horizontal" label="Two-Factor Authentication" description="Require a secure code from your authenticator app when signing in.">
                       <SettingsToggle checked={false} onChange={() => {}} disabled />
                   </SettingsField>
                </div>
            </SettingsCard>
        </div>
    );
}
