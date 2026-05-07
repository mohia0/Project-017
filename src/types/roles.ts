export interface WorkspaceRole {
  id: string;
  workspace_id: string;
  name: string;
  is_system: boolean;
  permissions: Record<string, boolean>;
  created_at: string;
}

export interface WorkspaceMemberWithRole {
  id: string;
  workspace_id: string;
  user_id: string | null;
  invited_email: string | null;
  role_id: string | null;
  role?: WorkspaceRole | null;
  joined_at: string | null;
}

// All permission keys used in the system
export const ALL_PERMISSION_KEYS = [
  // Contacts
  'contacts_view', 'contacts_create', 'contacts_edit', 'contacts_delete',
  // Projects
  'projects_view', 'projects_create', 'projects_edit', 'projects_delete',
  // Files
  'files_view', 'files_create', 'files_edit', 'files_delete',
  // Financials
  'financials_view', 'financials_create', 'financials_edit', 'financials_delete',
  // Proposals
  'proposals_view', 'proposals_create', 'proposals_edit', 'proposals_delete',
  // Forms
  'forms_view', 'forms_create', 'forms_edit', 'forms_delete',
  // Schedulers
  'schedulers_view', 'schedulers_create', 'schedulers_edit', 'schedulers_delete',
  // Templates
  'templates_view', 'templates_create', 'templates_edit', 'templates_delete',
  // Archive
  'archive_view', 'archive_restore',
  // Settings
  'settings_workspace', 'settings_branding', 'settings_domains',
  'settings_payments', 'settings_emails', 'settings_roles',
  // Navigation
  'nav_contacts', 'nav_projects', 'nav_files', 'nav_financials',
  'nav_proposals', 'nav_forms', 'nav_schedulers', 'nav_templates', 'nav_archive',
] as const;

export type PermissionKey = typeof ALL_PERMISSION_KEYS[number];

// Permission sections with their keys grouped
export const PERMISSION_SECTIONS = [
  {
    key: 'contacts',
    label: 'Contacts',
    icon: 'Users',
    keys: ['contacts_view', 'contacts_create', 'contacts_edit', 'contacts_delete'] as PermissionKey[],
  },
  {
    key: 'projects',
    label: 'Projects',
    icon: 'Briefcase',
    keys: ['projects_view', 'projects_create', 'projects_edit', 'projects_delete'] as PermissionKey[],
  },
  {
    key: 'files',
    label: 'Files',
    icon: 'Folder',
    keys: ['files_view', 'files_create', 'files_edit', 'files_delete'] as PermissionKey[],
  },
  {
    key: 'financials',
    label: 'Financials',
    icon: 'Receipt',
    keys: ['financials_view', 'financials_create', 'financials_edit', 'financials_delete'] as PermissionKey[],
  },
  {
    key: 'proposals',
    label: 'Proposals',
    icon: 'FileSignature',
    keys: ['proposals_view', 'proposals_create', 'proposals_edit', 'proposals_delete'] as PermissionKey[],
  },
  {
    key: 'forms',
    label: 'Forms',
    icon: 'ClipboardList',
    keys: ['forms_view', 'forms_create', 'forms_edit', 'forms_delete'] as PermissionKey[],
  },
  {
    key: 'schedulers',
    label: 'Schedulers',
    icon: 'CalendarDays',
    keys: ['schedulers_view', 'schedulers_create', 'schedulers_edit', 'schedulers_delete'] as PermissionKey[],
  },
  {
    key: 'templates',
    label: 'Templates',
    icon: 'LayoutTemplate',
    keys: ['templates_view', 'templates_create', 'templates_edit', 'templates_delete'] as PermissionKey[],
  },
  {
    key: 'archive',
    label: 'Archive',
    icon: 'Archive',
    keys: ['archive_view', 'archive_restore'] as PermissionKey[],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'Settings',
    keys: ['settings_workspace', 'settings_branding', 'settings_domains', 'settings_payments', 'settings_emails', 'settings_roles'] as PermissionKey[],
  },
  {
    key: 'navigation',
    label: 'Navigation',
    icon: 'Navigation',
    keys: ['nav_contacts', 'nav_projects', 'nav_files', 'nav_financials', 'nav_proposals', 'nav_forms', 'nav_schedulers', 'nav_templates', 'nav_archive'] as PermissionKey[],
  },
] as const;

// Human-readable label for each permission key
export const PERMISSION_KEY_LABELS: Record<string, string> = {
  contacts_view: 'View', contacts_create: 'Create', contacts_edit: 'Edit', contacts_delete: 'Delete',
  projects_view: 'View', projects_create: 'Create', projects_edit: 'Edit', projects_delete: 'Delete',
  files_view: 'View', files_create: 'Upload', files_edit: 'Edit', files_delete: 'Delete',
  financials_view: 'View', financials_create: 'Create', financials_edit: 'Edit', financials_delete: 'Delete',
  proposals_view: 'View', proposals_create: 'Create', proposals_edit: 'Edit', proposals_delete: 'Delete',
  forms_view: 'View', forms_create: 'Create', forms_edit: 'Edit', forms_delete: 'Delete',
  schedulers_view: 'View', schedulers_create: 'Create', schedulers_edit: 'Edit', schedulers_delete: 'Delete',
  templates_view: 'View', templates_create: 'Create', templates_edit: 'Edit', templates_delete: 'Delete',
  archive_view: 'View Archive', archive_restore: 'Restore',
  settings_workspace: 'Workspace', settings_branding: 'Branding', settings_domains: 'Domains',
  settings_payments: 'Payments', settings_emails: 'Emails', settings_roles: 'User Roles',
  nav_contacts: 'Contacts', nav_projects: 'Projects', nav_files: 'Files', nav_financials: 'Financials',
  nav_proposals: 'Proposals', nav_forms: 'Forms', nav_schedulers: 'Schedulers',
  nav_templates: 'Templates', nav_archive: 'Archive',
};

// Full permissions map - all true
export function buildFullPermissions(): Record<string, boolean> {
  const perms: Record<string, boolean> = {};
  ALL_PERMISSION_KEYS.forEach(k => { perms[k] = true; });
  return perms;
}

// Co-owner permissions - same as full
export function buildCoOwnerPermissions(): Record<string, boolean> {
  return buildFullPermissions();
}

// Client permissions — view-only: their projects, financials (invoices + proposals)
export function buildClientPermissions(): Record<string, boolean> {
  const perms: Record<string, boolean> = {};
  // Everything off by default
  ALL_PERMISSION_KEYS.forEach(k => { perms[k] = false; });
  // View their projects
  perms['projects_view'] = true;
  perms['nav_projects'] = true;
  // View financials (invoices)
  perms['financials_view'] = true;
  perms['nav_financials'] = true;
  // View proposals
  perms['proposals_view'] = true;
  perms['nav_proposals'] = true;
  return perms;
}
