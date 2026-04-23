"use client";

import React, { useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput } from '@/components/settings/SettingsField';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { supabase } from '@/lib/supabase';
import { appToast } from '@/lib/toast';
import { Eye, EyeOff } from 'lucide-react';

export default function AccountSettingsPage() {
    const { user } = useAuthStore();
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    // Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const handleUpdatePassword = async () => {
        if (!currentPassword) {
            appToast.error('Please enter your current password');
            return;
        }

        if (!newPassword || newPassword.length < 8) {
            appToast.error('New password must be at least 8 characters');
            return;
        }

        setIsUpdatingPassword(true);

        // Verify current password
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user?.email || '',
            password: currentPassword
        });

        if (authError) {
            appToast.error('Incorrect current password');
            setIsUpdatingPassword(false);
            return;
        }

        // Update to new password
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        
        if (error) {
            appToast.error(error.message);
        } else {
            appToast.success('Password updated successfully');
            setCurrentPassword('');
            setNewPassword('');
        }
        setIsUpdatingPassword(false);
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8">
            <SettingsCard
                title="Account Security"
                description="Manage your email address, password, and security settings."
            >
                <div className="flex flex-col gap-4 mb-6">
                    <SettingsField label="Email Address" description="Your primary email used for login and identity.">
                        <SettingsInput 
                            value={user?.email || ''} 
                            disabled
                            className="opacity-50 cursor-not-allowed"
                        />
                    </SettingsField>
                </div>

                <div className="flex flex-col gap-4 border-t pt-6" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-sm">Update Password</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SettingsField label="Current Password">
                            <div className="relative">
                                <SettingsInput 
                                    type={showCurrentPassword ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    className="pr-10"
                                />
                                <button 
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity"
                                >
                                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </SettingsField>

                        <SettingsField label="New Password">
                            <div className="relative">
                                <SettingsInput 
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Min 8 characters"
                                    className="pr-10"
                                />
                                <button 
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity"
                                >
                                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </SettingsField>
                    </div>

                    <div className="flex justify-start">
                        <button 
                            onClick={handleUpdatePassword}
                            disabled={isUpdatingPassword || !currentPassword || !newPassword}
                            className="h-11 px-6 bg-primary text-[var(--brand-primary-foreground)] hover:bg-primary-hover shadow-[0_4px_12px_-4px_rgba(var(--brand-primary-rgb),0.5)] active:scale-95 transition-all text-xs font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUpdatingPassword ? 'Updating...' : 'Save New Password'}
                        </button>
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
}

