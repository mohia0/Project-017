import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { WorkspaceRole, WorkspaceMemberWithRole, buildFullPermissions, buildCoOwnerPermissions, buildClientPermissions } from '@/types/roles';
import { appToast } from '@/lib/toast';

interface RolesState {
  roles: WorkspaceRole[];
  members: WorkspaceMemberWithRole[];
  isLoadingRoles: boolean;
  isLoadingMembers: boolean;
  hasFetchedRoles: boolean;

  fetchRoles: (workspaceId: string) => Promise<void>;
  createRole: (workspaceId: string, name: string, basePermissions?: Record<string, boolean>) => Promise<WorkspaceRole | null>;
  updateRole: (id: string, updates: Partial<Pick<WorkspaceRole, 'name' | 'permissions'>>) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  duplicateRole: (id: string) => Promise<WorkspaceRole | null>;

  fetchMembers: (workspaceId: string) => Promise<void>;
  updateMemberRole: (memberId: string, roleId: string | null) => Promise<void>;
}

// Module-level in-flight guard — prevents concurrent fetchRoles() from racing
let _fetchRolesInflight: Promise<void> | null = null;

export const useRolesStore = create<RolesState>((set, get) => ({
  roles: [],
  members: [],
  isLoadingRoles: false,
  isLoadingMembers: false,
  hasFetchedRoles: false,

  fetchRoles: async (workspaceId: string) => {
    // If already fetched for this workspace, skip re-fetch
    if (get().hasFetchedRoles) return;
    // Deduplicate concurrent calls
    if (_fetchRolesInflight) return _fetchRolesInflight;

    _fetchRolesInflight = (async () => {
      set({ isLoadingRoles: true });
      try {
        // Seed system roles using ignoreDuplicates — fully idempotent, no race risk
        const systemRoles = [
          { workspace_id: workspaceId, name: 'Owner',    is_system: true, permissions: buildFullPermissions() },
          { workspace_id: workspaceId, name: 'Co-Owner', is_system: true, permissions: buildCoOwnerPermissions() },
          { workspace_id: workspaceId, name: 'Client',   is_system: true, permissions: buildClientPermissions() },
        ];
        await supabase
          .from('workspace_roles')
          .upsert(systemRoles, { onConflict: 'workspace_id,name', ignoreDuplicates: true });

        // Fetch all roles (system roles first, then custom by created_at)
        const { data, error } = await supabase
          .from('workspace_roles')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('is_system', { ascending: false })
          .order('created_at', { ascending: true });

        if (error) throw error;
        set({ roles: (data || []) as WorkspaceRole[], hasFetchedRoles: true });
      } catch (err: any) {
        console.error('fetchRoles error:', err);
      } finally {
        set({ isLoadingRoles: false });
        _fetchRolesInflight = null;
      }
    })();

    return _fetchRolesInflight;
  },

  createRole: async (workspaceId, name, basePermissions) => {
    const permissions = basePermissions ?? {};
    const { data, error } = await supabase
      .from('workspace_roles')
      .insert({ workspace_id: workspaceId, name, is_system: false, permissions })
      .select()
      .single();

    if (error) {
      appToast.error('Failed to create role');
      return null;
    }
    const newRole = data as WorkspaceRole;
    set(state => ({ roles: [...state.roles, newRole] }));
    return newRole;
  },

  updateRole: async (id, updates) => {
    // Optimistic update
    set(state => ({
      roles: state.roles.map(r => r.id === id ? { ...r, ...updates } : r)
    }));

    const { error } = await supabase
      .from('workspace_roles')
      .update(updates)
      .eq('id', id);

    if (error) {
      appToast.error('Failed to save role');
      // Re-fetch to revert
      const { data } = await supabase.from('workspace_roles').select('*').eq('id', id).single();
      if (data) {
        set(state => ({ roles: state.roles.map(r => r.id === id ? data as WorkspaceRole : r) }));
      }
    }
  },

  deleteRole: async (id) => {
    const role = get().roles.find(r => r.id === id);
    if (role?.is_system) {
      appToast.error('System roles cannot be deleted');
      return;
    }

    // Null out any members with this role
    await supabase
      .from('workspace_members')
      .update({ role_id: null })
      .eq('role_id', id);

    const { error } = await supabase
      .from('workspace_roles')
      .delete()
      .eq('id', id);

    if (error) {
      appToast.error('Failed to delete role');
      return;
    }
    set(state => ({ roles: state.roles.filter(r => r.id !== id) }));
  },

  duplicateRole: async (id) => {
    const role = get().roles.find(r => r.id === id);
    if (!role) return null;

    return await get().createRole(role.workspace_id, `Copy of ${role.name}`, role.permissions);
  },

  fetchMembers: async (workspaceId) => {
    set({ isLoadingMembers: true });
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*, role:workspace_roles(*)')
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      set({ members: (data || []) as WorkspaceMemberWithRole[] });
    } catch (err) {
      console.error('fetchMembers error:', err);
    } finally {
      set({ isLoadingMembers: false });
    }
  },

  updateMemberRole: async (memberId, roleId) => {
    // Optimistic
    set(state => ({
      members: state.members.map(m => {
        if (m.id !== memberId) return m;
        const role = roleId ? state.roles.find(r => r.id === roleId) ?? null : null;
        return { ...m, role_id: roleId, role };
      })
    }));

    const { error } = await supabase
      .from('workspace_members')
      .update({ role_id: roleId })
      .eq('id', memberId);

    if (error) {
      appToast.error('Failed to update member role');
    }
  },
}));
