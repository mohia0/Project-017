"use client";

import React, { useEffect, useState } from 'react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsField, SettingsToggle } from '@/components/settings/SettingsField';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useRolesStore } from '@/store/useRolesStore';
import { useUIStore } from '@/store/useUIStore';
import { SendEmailModal } from '@/components/modals/SendEmailModal';
import { cn } from '@/lib/utils';
import { HelpCircle, Mail, UserPlus, ChevronDown } from 'lucide-react';
import { SkeletonBox } from '@/components/ui/ListViewSkeleton';
import { Dropdown, DItem } from '@/components/ui/Dropdown';
import { useRef } from 'react';

const TOOL = 'members';

const DEFAULT_SETTINGS = {
    allow_signup: false,
    default_role_id: null as string | null,
};

function HelpTip({ text, isDark }: { text: string; isDark: boolean }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative inline-flex">
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
                    'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 px-3 py-2 rounded-xl text-xs shadow-xl z-50 pointer-events-none',
                    isDark ? 'bg-[#222] text-white/80 border border-white/10' : 'bg-white text-black/70 border border-black/10'
                )}>
                    {text}
                </div>
            )}
        </div>
    );
}

export default function MembersSettingsPage() {
    const { theme, activeWorkspaceId } = useUIStore();
    const isDark = theme === 'dark';
    const { toolSettings, fetchToolSettings, updateToolSettings, hasFetched, branding, fetchBranding, emailTemplates, fetchEmailTemplates } = useSettingsStore();
    const { roles, fetchRoles } = useRolesStore();

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (activeWorkspaceId) {
            if (!hasFetched[`toolSettings_${TOOL}`]) fetchToolSettings(activeWorkspaceId, TOOL);
            fetchRoles(activeWorkspaceId);
            fetchBranding(activeWorkspaceId);
            fetchEmailTemplates(activeWorkspaceId);
        }
    }, [activeWorkspaceId]);

    const saved = toolSettings[TOOL] || DEFAULT_SETTINGS;
    const [form, setForm] = useState({
        allow_signup: (saved.allow_signup ?? DEFAULT_SETTINGS.allow_signup) as boolean,
        default_role_id: (saved.default_role_id ?? DEFAULT_SETTINGS.default_role_id) as string | null,
    });
    const [isSaving, setIsSaving] = useState(false);

    // Sync form when toolSettings load
    useEffect(() => {
        const current = toolSettings[TOOL] || DEFAULT_SETTINGS;
        setForm({
            allow_signup: current.allow_signup ?? DEFAULT_SETTINGS.allow_signup,
            default_role_id: current.default_role_id ?? DEFAULT_SETTINGS.default_role_id,
        });
    }, [toolSettings]);

    // Send invitation modal
    const [inviteModalOpen, setInviteModalOpen] = useState(false);

    // Role dropdown
    const roleDropRef = useRef<HTMLButtonElement>(null);
    const [roleDropOpen, setRoleDropOpen] = useState(false);

    const hasFetchedSettings = hasFetched[`toolSettings_${TOOL}`];

    const hasChanges = JSON.stringify(form) !== JSON.stringify({
        allow_signup: saved.allow_signup ?? DEFAULT_SETTINGS.allow_signup,
        default_role_id: saved.default_role_id ?? DEFAULT_SETTINGS.default_role_id,
    });

    const handleSave = async () => {
        if (!activeWorkspaceId) return;
        setIsSaving(true);
        await updateToolSettings(activeWorkspaceId, TOOL, { ...saved, ...form });
        setIsSaving(false);
    };

    if (!activeWorkspaceId || !mounted || !hasFetchedSettings) {
        return (
            <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8 px-4">
                <SkeletonBox isDark={isDark} className="h-40 rounded-2xl w-full" />
                <SkeletonBox isDark={isDark} className="h-40 rounded-2xl w-full" />
            </div>
        );
    }

    // Roles excluding Owner (Owner can't be assigned as a default join role)
    const assignableRoles = roles.filter(r => r.name !== 'Owner');
    const selectedRole = assignableRoles.find(r => r.id === form.default_role_id);

    const workspaceName = branding ? '' : ''; // pulled from branding store; fallback via send modal
    const workspaceId = activeWorkspaceId;

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto py-8 px-4">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Members & Signup</h1>
                <p className={cn('text-sm mt-1', isDark ? 'text-white/50' : 'text-black/50')}>
                    Control who can join your workspace and send invitations.
                </p>
            </div>

            {/* Card 1: Signup Settings */}
            <SettingsCard
                title="Signup Settings"
                description="Control whether new users can sign up and what role they receive."
                onSave={handleSave}
                isSaving={isSaving}
                unsavedChanges={hasChanges}
            >
                <div className="flex flex-col gap-3">
                    {/* Allow Signup Toggle */}
                    <div className={cn(
                        'flex items-center justify-between px-4 py-3 rounded-xl border',
                        isDark ? 'border-white/8 bg-white/[0.02]' : 'border-black/8 bg-black/[0.02]'
                    )}>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Allow new users to join this workspace via signup.</span>
                            <HelpTip
                                isDark={isDark}
                                text="When ON, a 'Sign up' button appears on the sign-in page so anyone can self-register. When OFF, the button is hidden — only users with a personal invitation link can join."
                            />
                        </div>
                        <SettingsToggle
                            checked={form.allow_signup}
                            onChange={v => setForm(f => ({ ...f, allow_signup: v }))}
                        />
                    </div>

                    {/* Default Role Selector */}
                    <SettingsField label="Default role for new members">
                        <div className="relative">
                            <button
                                ref={roleDropRef}
                                type="button"
                                id="default-role-selector"
                                onClick={() => setRoleDropOpen(true)}
                                className={cn(
                                    'w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                                    isDark
                                        ? 'bg-[#141414] border-white/10 hover:border-white/20 text-white'
                                        : 'bg-white border-black/10 hover:border-black/20 text-[#111] shadow-sm'
                                )}
                            >
                                <span className={selectedRole ? '' : (isDark ? 'text-white/30' : 'text-black/30')}>
                                    {selectedRole?.name || 'No default role'}
                                </span>
                                <ChevronDown size={14} className="opacity-40" />
                            </button>

                            <Dropdown
                                open={roleDropOpen}
                                onClose={() => setRoleDropOpen(false)}
                                triggerRef={roleDropRef}
                                isDark={isDark}
                                align="left"
                                matchTriggerWidth
                            >
                                <DItem
                                    label="No default role"
                                    active={form.default_role_id === null}
                                    onClick={() => { setForm(f => ({ ...f, default_role_id: null })); setRoleDropOpen(false); }}
                                    isDark={isDark}
                                />
                                {assignableRoles.map(role => (
                                    <DItem
                                        key={role.id}
                                        label={role.name}
                                        active={form.default_role_id === role.id}
                                        onClick={() => { setForm(f => ({ ...f, default_role_id: role.id })); setRoleDropOpen(false); }}
                                        isDark={isDark}
                                    />
                                ))}
                            </Dropdown>
                        </div>
                        <p className={cn('text-xs mt-1.5', isDark ? 'text-white/30' : 'text-black/30')}>
                            New members who sign up via the join link will be assigned this role automatically.
                        </p>
                    </SettingsField>
                </div>
            </SettingsCard>

            {/* Card 2: Invite Members */}
            <div className={cn(
                'rounded-2xl border overflow-hidden',
                isDark ? 'border-[#282828] bg-[#111]' : 'border-[#e8e8e8] bg-white'
            )}>
                <div className={cn(
                    'px-6 py-5 border-b',
                    isDark ? 'border-[#222]' : 'border-[#f0f0f0]'
                )}>
                    <h2 className="text-[15px] font-bold">Invite a Member</h2>
                    <p className={cn('text-sm mt-0.5', isDark ? 'text-white/40' : 'text-black/40')}>
                        Send a workspace invitation directly to someone's inbox.
                    </p>
                </div>

                <div className="px-6 py-5 flex items-center justify-between gap-4">
                    <div className={cn('flex items-start gap-3 flex-1')}>
                        <div className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                            isDark ? 'bg-[#6366f1]/15' : 'bg-indigo-50'
                        )}>
                            <Mail size={16} className="text-indigo-400" />
                        </div>
                        <div>
                            <p className={cn('text-sm font-medium', isDark ? 'text-white/80' : 'text-black/80')}>
                                The invitation email includes a personal join link.
                            </p>
                            <p className={cn('text-xs mt-0.5', isDark ? 'text-white/30' : 'text-black/40')}>
                                The recipient can sign up with their email and a password — no magic links.
                            </p>
                        </div>
                    </div>

                    <button
                        id="send-invitation-btn"
                        onClick={() => setInviteModalOpen(true)}
                        className={cn(
                            'shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-95',
                            'bg-primary text-primary-foreground hover:bg-primary-hover shadow-lg shadow-primary/20'
                        )}
                    >
                        <UserPlus size={14} />
                        Send Invitation
                    </button>
                </div>
            </div>

            {/* Send Email Modal */}
            <SendEmailModal
                isOpen={inviteModalOpen}
                onClose={() => setInviteModalOpen(false)}
                templateKey="workspace_invitation"
                to=""
                workspaceId={workspaceId}
                variables={{
                    workspace_name: '', // resolved in send-email route via branding
                    role_name: selectedRole?.name || 'Member',
                    invitee_email: '',
                    signup_link: '', // generated by send-invitation route; for preview only this is a placeholder
                }}
                documentTitle="Workspace Invitation"
            />
        </div>
    );
}
