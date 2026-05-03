import { useCallback } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useRolesStore } from '@/store/useRolesStore';
import { PermissionKey } from '@/types/roles';

/**
 * usePermissions — returns whether the current user can perform an action.
 *
 * Usage:
 *   const { can, isOwner, role } = usePermissions();
 *   can('contacts_create') → boolean
 */
export function usePermissions() {
  const { activeWorkspaceId } = useUIStore();
  const { user } = useAuthStore();
  const { workspaces } = useWorkspaceStore();
  const { roles, members } = useRolesStore();

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  // Workspace owner bypasses all permission checks
  const isOwner = !!(user && activeWorkspace && activeWorkspace.owner_id === user.id);

  // Find current user's member row + role
  const memberRow = members.find(m => m.user_id === user?.id);
  const roleId = memberRow?.role_id;
  const role = roleId ? roles.find(r => r.id === roleId) ?? null : null;

  const can = useCallback((key: PermissionKey | string): boolean => {
    if (isOwner) return true;
    if (!role) return false;
    return role.permissions[key] === true;
  }, [isOwner, role]);

  return { can, isOwner, role, memberRow };
}
