"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Users, ShieldCheck, Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useRolesStore } from '@/store/useRolesStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAuthStore } from '@/store/useAuthStore';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsInput } from '@/components/settings/SettingsField';
import { PermissionSection } from '@/components/roles/PermissionSection';
import { PERMISSION_SECTIONS } from '@/types/roles';
import { SkeletonBox } from '@/components/ui/ListViewSkeleton';
import { appToast } from '@/lib/toast';

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roleId = params?.roleId as string;

  const { theme, activeWorkspaceId } = useUIStore();
  const isDark = theme === 'dark';
  const { workspaces } = useWorkspaceStore();
  const { user } = useAuthStore();
  const { roles, members, fetchRoles, fetchMembers, updateRole, isLoadingRoles, hasFetchedRoles } = useRolesStore();

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const isOwner = !!(user && activeWorkspace && activeWorkspace.owner_id === user.id);

  const role = roles.find(r => r.id === roleId);

  const [localName, setLocalName] = useState('');
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (activeWorkspaceId && !hasFetchedRoles) {
      fetchRoles(activeWorkspaceId);
      fetchMembers(activeWorkspaceId);
    }
  }, [activeWorkspaceId, hasFetchedRoles, fetchRoles, fetchMembers]);

  useEffect(() => {
    if (role) {
      setLocalName(role.name);
      setLocalPerms({ ...role.permissions });
    }
  }, [role]);

  const memberCount = members.filter(m => m.role_id === roleId).length;

  const hasChanges = role
    ? localName !== role.name || JSON.stringify(localPerms) !== JSON.stringify(role.permissions)
    : false;

  const handlePermissionChange = useCallback((key: string, value: boolean) => {
    setLocalPerms(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    if (!role || !hasChanges) return;
    setIsSaving(true);
    await updateRole(roleId, { name: localName, permissions: localPerms });
    setIsSaving(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
    appToast.success('Role saved');
  };

  if (!hasFetchedRoles || isLoadingRoles) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <SkeletonBox isDark={isDark} className="h-24 rounded-2xl w-full" />
        <SkeletonBox isDark={isDark} className="h-64 rounded-2xl w-full" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="py-12 text-center">
        <p className={cn("text-sm", isDark ? "text-white/40" : "text-black/40")}>Role not found.</p>
        <button onClick={() => router.push('/settings/roles')} className="mt-4 text-sm font-semibold underline opacity-60">
          Back to Roles
        </button>
      </div>
    );
  }

  const isReadOnly = role.is_system && !isOwner;

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Role Header */}
      <SettingsCard
        title={role.name}
        description={`${memberCount} member${memberCount !== 1 ? 's' : ''} assigned to this role`}
      >
        <div className="flex flex-col gap-4">
          {/* Name field */}
          <div>
            <label className={cn("block text-sm font-semibold mb-1.5", isDark ? "text-white" : "text-black")}>
              Role Name
            </label>
            <SettingsInput
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              placeholder="Role name"
              disabled={isReadOnly}
            />
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {role.is_system && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full",
                isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600"
              )}>
                <ShieldCheck size={11} /> System Role
              </span>
            )}
            <span className={cn(
              "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full",
              isDark ? "bg-white/8 text-white/50" : "bg-black/5 text-black/50"
            )}>
              <Users size={11} /> {memberCount} member{memberCount !== 1 ? 's' : ''}
            </span>
          </div>

          {role.is_system && (
            <p className={cn(
              "text-xs leading-relaxed p-3 rounded-xl border",
              isDark ? "bg-[#0d0d0d] border-[#252525] text-white/40" : "bg-[#f5f5f5] border-[#e5e5e5] text-black/40"
            )}>
              {role.name === 'Owner'
                ? 'The Owner role always has full access to all features and cannot be restricted.'
                : role.name === 'Client'
                ? 'The Client role is view-only — members can see their assigned projects, invoices, and proposals but cannot create, edit, or delete anything.'
                : 'Co-Owner has full access to all features. You can view permissions below.'}
            </p>
          )}
        </div>
      </SettingsCard>

      {/* Permissions */}
      <SettingsCard
        title="Permissions"
        description="Toggle individual actions on or off for this role."
        onSave={!isReadOnly ? handleSave : undefined}
        isSaving={isSaving}
        unsavedChanges={hasChanges}
      >
        <div className="flex flex-col gap-3">
          {PERMISSION_SECTIONS.map(section => {
            // Get icon component by name
            const IconComp = (LucideIcons as any)[section.icon] as React.FC<{ size?: number; className?: string }>;
            return (
              <PermissionSection
                key={section.key}
                sectionKey={section.key}
                label={section.label}
                icon={<IconComp size={14} className="opacity-60" />}
                permissionKeys={section.keys as unknown as string[]}
                permissions={localPerms}
                onChange={handlePermissionChange}
                disabled={isReadOnly}
              />
            );
          })}
        </div>
      </SettingsCard>
    </div>
  );
}
