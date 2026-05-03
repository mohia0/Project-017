"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ShieldCheck, Users, Pencil, Trash2, Copy, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useRolesStore } from '@/store/useRolesStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAuthStore } from '@/store/useAuthStore';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { CreateRoleModal } from '@/components/roles/CreateRoleModal';
import { SkeletonBox } from '@/components/ui/ListViewSkeleton';
import { appToast } from '@/lib/toast';
import { WorkspaceRole } from '@/types/roles';

export default function RolesPage() {
  const router = useRouter();
  const { theme, activeWorkspaceId } = useUIStore();
  const isDark = theme === 'dark';
  const { workspaces } = useWorkspaceStore();
  const { user } = useAuthStore();
  const { roles, members, fetchRoles, fetchMembers, deleteRole, duplicateRole, isLoadingRoles, hasFetchedRoles } = useRolesStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const isOwner = !!(user && activeWorkspace && activeWorkspace.owner_id === user.id);

  useEffect(() => {
    if (activeWorkspaceId && !hasFetchedRoles) {
      fetchRoles(activeWorkspaceId);
      fetchMembers(activeWorkspaceId);
    }
  }, [activeWorkspaceId, hasFetchedRoles, fetchRoles, fetchMembers]);

  const getMemberCount = (roleId: string) =>
    members.filter(m => m.role_id === roleId).length;

  const handleDelete = async (role: WorkspaceRole) => {
    const count = getMemberCount(role.id);
    const confirmMsg = count > 0
      ? `Delete "${role.name}"? ${count} member(s) will lose this role.`
      : `Delete the "${role.name}" role?`;
    if (!window.confirm(confirmMsg)) return;
    await deleteRole(role.id);
    appToast.success('Role deleted');
  };

  const handleDuplicate = async (role: WorkspaceRole) => {
    const copy = await duplicateRole(role.id);
    if (copy) {
      appToast.success(`"${copy.name}" created`);
      router.push(`/settings/roles/${copy.id}`);
    }
  };

  if (!hasFetchedRoles || isLoadingRoles) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <SkeletonBox isDark={isDark} className="h-20 rounded-2xl w-full" />
        <SkeletonBox isDark={isDark} className="h-48 rounded-2xl w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Roles list */}
      <SettingsCard
        title="All Roles"
        description={`${roles.length} role${roles.length !== 1 ? 's' : ''} in this workspace`}
        extra={
          isOwner && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className={cn(
                "h-8 px-3 rounded-lg flex items-center gap-1.5 text-sm font-semibold transition-all",
                "bg-primary text-[var(--brand-primary-foreground)] hover:opacity-90 active:scale-[0.97]"
              )}
            >
              <Plus size={14} />
              New Role
            </button>
          )
        }
      >
        <div className="flex flex-col gap-2">
          {roles.map(role => {
            const count = getMemberCount(role.id);
            return (
              <div
                key={role.id}
                className={cn(
                  "flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors group",
                  role.name === 'Owner'
                    ? (isDark ? "border-[#ffb800]/20 bg-[#ffb800]/[0.02]" : "border-[#ffb800]/20 bg-[#ffb800]/[0.02]")
                    : (isDark
                      ? "border-[#252525] bg-[#141414] hover:bg-[#1a1a1a]"
                      : "border-[#ebebeb] bg-[#fafafa] hover:bg-white")
                )}
              >
                {/* Left */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    role.name === 'Owner'
                        ? (isDark ? "bg-[#ffb800]/10" : "bg-[#ffb800]/10")
                        : (isDark ? "bg-white/8" : "bg-black/5")
                  )}>
                    {role.name === 'Owner' ? (
                        <Crown size={15} className={isDark ? "text-[#ffb800]/70" : "text-[#d49900]"} />
                    ) : (
                        <ShieldCheck size={15} className={isDark ? "text-white/50" : "text-black/40"} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-sm font-semibold truncate", role.name === 'Owner' && (isDark ? "text-[#ffb800]" : "text-[#d49900]"))}>
                          {role.name}
                      </span>
                      {role.is_system && role.name !== 'Owner' && (
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                          isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600"
                        )}>
                          System
                        </span>
                      )}
                    </div>
                    {role.name !== 'Owner' && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Users size={11} className="opacity-40 shrink-0" />
                        <span className={cn("text-xs", isDark ? "text-white/40" : "text-black/40")}>
                          {count} member{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {role.name === 'Owner' ? (
                      <div className="flex flex-col items-end justify-center mr-2">
                        <span className={cn("text-xs font-semibold", isDark ? "text-white/80" : "text-black/80")}>
                           Workspace Owner
                        </span>
                        {isOwner && user?.email && (
                            <span className={cn("text-[10px]", isDark ? "text-white/40" : "text-black/40")}>
                                {user.email}
                            </span>
                        )}
                      </div>
                  ) : (
                      <>
                          <button
                            onClick={() => handleDuplicate(role)}
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100",
                              isDark ? "hover:bg-white/10 text-white/50" : "hover:bg-black/5 text-black/40"
                            )}
                            title="Duplicate role"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            onClick={() => router.push(`/settings/roles/${role.id}`)}
                            className={cn(
                              "h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors",
                              isDark ? "bg-white/8 hover:bg-white/15 text-white/70" : "bg-black/5 hover:bg-black/10 text-black/60"
                            )}
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          {!role.is_system && isOwner && (
                            <button
                              onClick={() => handleDelete(role)}
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100",
                                isDark ? "hover:bg-red-500/15 text-red-500/60 hover:text-red-400" : "hover:bg-red-50 text-red-400 hover:text-red-500"
                              )}
                              title="Delete role"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                      </>
                  )}
                </div>
              </div>
            );
          })}

          {roles.length === 0 && (
            <p className={cn("text-sm text-center py-6", isDark ? "text-white/30" : "text-black/30")}>
              No roles found. Create one to get started.
            </p>
          )}
        </div>
      </SettingsCard>

      <CreateRoleModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        workspaceId={activeWorkspaceId ?? ''}
        onCreated={(role) => router.push(`/settings/roles/${role.id}`)}
      />
    </div>
  );
}
