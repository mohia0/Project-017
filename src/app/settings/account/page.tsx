"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsInput, SettingsToggle } from '@/components/settings/SettingsField';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { supabase } from '@/lib/supabase';
import { appToast } from '@/lib/toast';
import { Eye, EyeOff, Shield, Zap, Lock } from 'lucide-react';
import TwoFactorSMSModal from '@/components/modals/TwoFactorSMSModal';

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

    // MFA state
    const [mfaFactors, setMfaFactors] = useState<any[]>([]);
    const [isMfaEnabled, setIsMfaEnabled] = useState(false);
    const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);

    useEffect(() => {
        checkMfaStatus();
    }, []);

    const checkMfaStatus = async () => {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (data) {
            const activeFactors = data.all.filter(f => f.status === 'verified');
            setMfaFactors(data.all);
            setIsMfaEnabled(activeFactors.length > 0);
        }
    };

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

    const handleToggleMfa = () => {
        setIsMfaModalOpen(true);
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8">
            <SettingsCard
                title="Account Security"
                description="Manage your password, email preferences, and security factors."
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
                        <Shield size={16} className="text-blue-500" />
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
                            className="h-11 px-6 bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-95 transition-all text-xs font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUpdatingPassword ? 'Updating...' : 'Save New Password'}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-4 border-t pt-6" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                   <SettingsField 
                        layout="horizontal" 
                        label="Two-Factor Authentication (SMS)" 
                        description="Receive a secure code on your mobile device when attempting to sign-in from new devices."
                    >
                       <SettingsToggle checked={isMfaEnabled} onChange={handleToggleMfa} />
                   </SettingsField>
                </div>
            </SettingsCard>

            <TwoFactorSMSModal 
                isOpen={isMfaModalOpen}
                onClose={() => {
                    setIsMfaModalOpen(false);
                    checkMfaStatus();
                }}
                isDark={isDark}
                currentFactors={mfaFactors}
            />
        </div>
    );
}
