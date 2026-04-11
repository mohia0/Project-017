import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

// Types
export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  timezone: string | null;
  language: string | null;
}

export interface WorkspaceBranding {
  workspace_id: string;
  primary_color: string;
  secondary_color: string | null;
  font_family: string;
  border_radius: number;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
}

export interface WorkspacePayments {
  workspace_id: string;
  business_name: string | null;
  business_address: string | null;
  tax_number: string | null;
  paypal_email: string | null;
  bank_name: string | null;
  iban: string | null;
  swift: string | null;
  bank_accounts: Array<{
    id: string;
    bank_name: string;
    account_name: string;
    account_number: string;
    swift: string;
    iban: string;
    is_default: boolean;
    is_active: boolean;
  }> | null;
  default_currency: string;
  payment_terms: string;
  invoice_prefix: string;
  invoice_start_number: number;
}

export interface WorkspaceDomain {
  id: string;
  workspace_id: string;
  domain: string;
  status: 'pending' | 'verifying' | 'active' | 'error';
  is_primary: boolean;
  ssl_status: 'pending' | 'provisioning' | 'active' | 'error';
  error_message: string | null;
}

export interface WorkspaceEmailConfig {
  workspace_id: string;
  smtp_host: string | null;
  smtp_port: number;
  smtp_user: string | null;
  from_name: string | null;
  from_address: string | null;
}

export interface EmailTemplate {
  id: string;
  workspace_id: string;
  template_key: string;
  subject: string;
  body: string;
}

export interface WorkspaceStatus {
  id: string;
  workspace_id: string;
  tool: 'proposals' | 'invoices' | 'projects';
  name: string;
  color: string;
  position: number;
  is_active: boolean;
  created_at: string;
}

export const DEFAULT_STATUSES_BY_TOOL: Record<WorkspaceStatus['tool'], Omit<WorkspaceStatus, 'id' | 'workspace_id' | 'created_at'>[]> = {
  proposals: [
    { tool: 'proposals', name: 'Draft',     color: '#9E9E9E', position: 0, is_active: true },
    { tool: 'proposals', name: 'Pending',   color: '#FF9800', position: 1, is_active: true },
    { tool: 'proposals', name: 'Accepted',  color: '#4CAF50', position: 2, is_active: true },
    { tool: 'proposals', name: 'Overdue',   color: '#E91E63', position: 3, is_active: true },
    { tool: 'proposals', name: 'Declined',  color: '#9C27B0', position: 4, is_active: true },
    { tool: 'proposals', name: 'Cancelled', color: '#607D8B', position: 5, is_active: true },
  ],
  invoices: [
    { tool: 'invoices', name: 'Draft',     color: '#9E9E9E', position: 0, is_active: true },
    { tool: 'invoices', name: 'Pending',   color: '#FF9800', position: 1, is_active: true },
    { tool: 'invoices', name: 'Paid',      color: '#4dbf39', position: 2, is_active: true },
    { tool: 'invoices', name: 'Overdue',   color: '#E91E63', position: 3, is_active: true },
    { tool: 'invoices', name: 'Cancelled', color: '#607D8B', position: 4, is_active: true },
  ],
  projects: [
    { tool: 'projects', name: 'Planning',   color: '#2196F3', position: 0, is_active: true },
    { tool: 'projects', name: 'Active',     color: '#009688', position: 1, is_active: true },
    { tool: 'projects', name: 'On Hold',    color: '#FFC107', position: 2, is_active: true },
    { tool: 'projects', name: 'Completed',  color: '#8BC34A', position: 3, is_active: true },
    { tool: 'projects', name: 'Cancelled',  color: '#607D8B', position: 4, is_active: true },
  ],
};

export interface WorkspaceToolSettings {
  workspace_id: string;
  tool: string;
  settings: Record<string, any>;
}

interface SettingsState {
  isLoading: boolean;
  error: string | null;
  
  // Profile
  profile: UserProfile | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;

  // Branding
  branding: WorkspaceBranding | null;
  fetchBranding: (workspaceId: string) => Promise<void>;
  updateBranding: (workspaceId: string, data: Partial<WorkspaceBranding>) => Promise<void>;

  // Payments
  payments: WorkspacePayments | null;
  fetchPayments: (workspaceId: string) => Promise<void>;
  updatePayments: (workspaceId: string, data: Partial<WorkspacePayments>) => Promise<void>;

  // Domains
  domains: WorkspaceDomain[];
  fetchDomains: (workspaceId: string) => Promise<void>;
  addDomain: (workspaceId: string, domain: string) => Promise<void>;
  deleteDomain: (domainId: string) => Promise<void>;
  
  // Email Config
  emailConfig: WorkspaceEmailConfig | null;
  fetchEmailConfig: (workspaceId: string) => Promise<void>;

  // Email Templates
  emailTemplates: EmailTemplate[];
  fetchEmailTemplates: (workspaceId: string) => Promise<void>;
  updateEmailTemplate: (workspaceId: string, templateKey: string, data: Partial<EmailTemplate>) => Promise<void>;

  // Statuses (per-tool: proposals | invoices | projects)
  statuses: WorkspaceStatus[];
  fetchStatuses: (workspaceId: string) => Promise<void>;
  addStatus: (workspaceId: string, data: Omit<WorkspaceStatus, 'id' | 'workspace_id' | 'created_at'>) => Promise<WorkspaceStatus | null>;
  updateStatus: (id: string, updates: Partial<WorkspaceStatus>) => Promise<void>;
  deleteStatus: (id: string) => Promise<void>;
  reorderStatuses: (workspaceId: string, tool: WorkspaceStatus['tool'], ordered: WorkspaceStatus[]) => Promise<void>;

  // Tool Settings (proposals, invoices, projects)
  toolSettings: Record<string, Record<string, any>>;
  fetchToolSettings: (workspaceId: string, tool: string) => Promise<void>;
  updateToolSettings: (workspaceId: string, tool: string, settings: Record<string, any>) => Promise<void>;
  
  // Smart ID Helpers
  generateNextId: (tool: 'proposals' | 'invoices') => string;
  incrementCounter: (workspaceId: string, tool: 'proposals' | 'invoices') => Promise<void>;

  hasFetched: Record<string, boolean>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  isLoading: false,
  error: null,

  profile: null,
  branding: null,
  payments: null,
  domains: [],
  emailConfig: null,
  emailTemplates: [],

  // Pre-seed statuses from defaults so they always show before DB fetch
  statuses: (['proposals', 'invoices', 'projects'] as const).flatMap(tool =>
    DEFAULT_STATUSES_BY_TOOL[tool].map((s, i) => ({
      ...s,
      id: `local-${tool}-${i}`,
      workspace_id: '',
      created_at: new Date().toISOString(),
    }))
  ),
  toolSettings: {},

  hasFetched: {},

  fetchProfile: async () => {
    set({ isLoading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ profile: null, isLoading: false, hasFetched: { ...get().hasFetched, profile: true } });
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id);

    if (error) {
      set({ error: error.message });
    } else {
      set({ profile: (data && data.length > 0) ? data[0] : null });
    }
    set({ isLoading: false, hasFetched: { ...get().hasFetched, profile: true } });
  },

  updateProfile: async (updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...updates })
      .select()
      .single();

    if (error) {
      set({ error: error.message });
    } else {
      set({ profile: data });
    }
  },

  fetchBranding: async (workspaceId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('workspace_branding')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      set({ error: error.message });
    } else {
      set({ branding: data || null });
    }
    set({ isLoading: false, hasFetched: { ...get().hasFetched, branding: true } });
  },

  updateBranding: async (workspaceId, updates) => {
    const { data, error } = await supabase
      .from('workspace_branding')
      .upsert({ workspace_id: workspaceId, ...updates })
      .select()
      .single();

    if (error) {
      set({ error: error.message });
    } else {
      set({ branding: data });
    }
  },

  fetchPayments: async (workspaceId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('workspace_payments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (error && error.code !== 'PGRST116') {
        set({ error: error.message });
    } else {
        set({ payments: data || null });
    }
    set({ isLoading: false, hasFetched: { ...get().hasFetched, payments: true } });
  },

  updatePayments: async (workspaceId, updates) => {
    const { data, error } = await supabase
      .from('workspace_payments')
      .upsert({ workspace_id: workspaceId, ...updates })
      .select()
      .single();

    if (error) {
      set({ error: error.message });
      throw error;
    } else {
      set({ payments: data });
    }
  },

  fetchDomains: async (workspaceId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('workspace_domains')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (error) {
      set({ error: error.message });
    } else {
      set({ domains: data || [] });
    }
    set({ isLoading: false, hasFetched: { ...get().hasFetched, domains: true } });
  },

  addDomain: async (workspaceId, domain) => {
    const { data, error } = await supabase
      .from('workspace_domains')
      .insert({ 
        workspace_id: workspaceId, 
        domain,
        status: 'pending',
        is_primary: get().domains.length === 0 
      })
      .select()
      .single();

    if (error) {
      set({ error: error.message });
      throw error;
    } else {
      set({ domains: [...get().domains, data] });
    }
  },

  deleteDomain: async (domainId) => {
    const { error } = await supabase
      .from('workspace_domains')
      .delete()
      .eq('id', domainId);

    if (error) {
      set({ error: error.message });
      throw error;
    } else {
      set({ domains: get().domains.filter(d => d.id !== domainId) });
    }
  },

  fetchEmailConfig: async (workspaceId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('workspace_email_config')
      .select('workspace_id, smtp_host, smtp_port, smtp_user, from_name, from_address')
      .eq('workspace_id', workspaceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      set({ error: error.message });
    } else {
      set({ emailConfig: data || null });
    }
    set({ isLoading: false, hasFetched: { ...get().hasFetched, emailConfig: true } });
  },

  fetchEmailTemplates: async (workspaceId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (error) {
      set({ error: error.message });
    } else {
      set({ emailTemplates: data || [] });
    }
    set({ isLoading: false, hasFetched: { ...get().hasFetched, emailTemplates: true } });
  },

  updateEmailTemplate: async (workspaceId, templateKey, updates) => {
    const { data, error } = await supabase
      .from('email_templates')
      .upsert({ 
        workspace_id: workspaceId, 
        template_key: templateKey, 
        ...updates,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      set({ error: error.message });
      throw error;
    } else {
      set((state) => ({
        emailTemplates: state.emailTemplates.find(t => t.template_key === templateKey)
          ? state.emailTemplates.map(t => t.template_key === templateKey ? data : t)
          : [...state.emailTemplates, data]
      }));
    }
  },

  // ── Statuses ────────────────────────────────────────────────────────────────

  fetchStatuses: async (workspaceId) => {
    const { data, error } = await supabase
      .from('workspace_statuses')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true });

    // Merge DB results with our defaults
    if (!error && data) {
      set(s => {
        const dbTools = new Set(data.map(d => d.tool));
        // Keep defaults for tools that have NO database records yet
        const localToKeep = s.statuses.filter(st => !dbTools.has(st.tool));
        return { 
          statuses: [...localToKeep, ...data],
          hasFetched: { ...s.hasFetched, statuses: true }
        };
      });
    } else if (error && error.code !== 'PGRST116' && !error.message?.includes('does not exist')) {
      console.warn('[fetchStatuses] failed, keeping defaults:', error.message);
      set(s => ({ hasFetched: { ...s.hasFetched, statuses: true } }));
    } else {
      set(s => ({ hasFetched: { ...s.hasFetched, statuses: true } }));
    }
  },

  addStatus: async (workspaceId, data) => {
    // Optimistic local creation
    const localStatus: WorkspaceStatus = {
      ...data, 
      id: `local-${Date.now()}`, 
      workspace_id: workspaceId, 
      created_at: new Date().toISOString()
    };
    
    // Append to current tool list
    const currentList = get().statuses.filter(s => s.tool === data.tool).sort((a,b) => a.position - b.position);
    const updatedList = [...currentList, localStatus].map((s, i) => ({ ...s, position: i }));
    
    // Save everything. This converts any `local-` defaults to real DB rows seamlessly
    await get().reorderStatuses(workspaceId, data.tool, updatedList);
    
    return localStatus;
  },

  updateStatus: async (id, updates) => {
    // Optimistic
    set(s => ({ statuses: s.statuses.map(st => st.id === id ? { ...st, ...updates } : st) }));
    if (!id.startsWith('local-')) {
      const { error } = await supabase.from('workspace_statuses').update(updates).eq('id', id);
      if (error) set({ error: error.message });
    }
  },

  deleteStatus: async (id) => {
    set(s => ({ statuses: s.statuses.filter(st => st.id !== id) }));
    if (!id.startsWith('local-')) {
      const { error } = await supabase.from('workspace_statuses').delete().eq('id', id);
      if (error) set({ error: error.message });
    }
  },

  reorderStatuses: async (workspaceId, tool, ordered) => {
    // 1. Optimistic UI update
    set(s => ({ statuses: [...s.statuses.filter(st => st.tool !== tool), ...ordered] }));

    if (!workspaceId) return;

    // 2. Prepare updates
    // If an ID is 'local-', we treat it as a new record (UPSERT will create it)
    // but the ID must be removed or replaced with a real UUID if we want Supabase to generate it.
    // However, for bulk reorder, it's safer to just send them all.
    const updates = ordered.map((s, i) => {
      const isLocal = s.id.startsWith('local-');
      const { id, created_at, ...rest } = s;
      
      const item: any = { 
        ...rest, 
        workspace_id: workspaceId,
        position: i 
      };
      
      if (!isLocal) item.id = id;
      return item;
    });

    if (updates.length > 0) {
      const { data, error } = await supabase
        .from('workspace_statuses')
        .upsert(updates, { onConflict: 'id' })
        .select();
        
      if (error) {
        console.error('[reorderStatuses] DB Error:', error.message);
        set({ error: error.message });
      } else if (data) {
        // Update store with the real IDs assigned by Postgres
        set(s => ({ 
          statuses: [
            ...s.statuses.filter(st => st.tool !== tool),
            ...data.sort((a,b) => a.position - b.position)
          ] 
        }));
      }
    }
  },

  // ── Tool Settings ────────────────────────────────────────────────────────────

  fetchToolSettings: async (workspaceId, tool) => {
    const { data, error } = await supabase
      .from('workspace_tool_settings')
      .select('settings')
      .eq('workspace_id', workspaceId)
      .eq('tool', tool)
      .single();

    if (error && error.code !== 'PGRST116' && !error.message.includes('does not exist')) {
      set({ error: error.message });
    } else if (data) {
      set(s => ({ toolSettings: { ...s.toolSettings, [tool]: data.settings } }));
    }
    set(s => ({ hasFetched: { ...s.hasFetched, [`toolSettings_${tool}`]: true } }));
  },

  updateToolSettings: async (workspaceId, tool, settings) => {
    set((state) => ({ toolSettings: { ...state.toolSettings, [tool]: settings } }));
    const { error } = await supabase.from('workspace_tool_settings').upsert({
      workspace_id: workspaceId,
      tool,
      settings
    }, { onConflict: 'workspace_id, tool' });
    if (error) {
      console.error(`Error updating tool settings for ${tool}:`, error.message);
    }
  },

  generateNextId: (tool) => {
    const settings = get().toolSettings[tool] || {};
    let { prefix, counter, suffix } = settings;
    
    if (tool === 'proposals') {
        prefix = prefix ?? 'PROP-';
        counter = counter ?? '0001';
        suffix = suffix ?? '';
    } else if (tool === 'invoices') {
        prefix = prefix ?? 'INV-';
        counter = counter ?? '0001';
        suffix = suffix ?? '';
    }
    
    return `${prefix}${counter}${suffix}`;
  },

  incrementCounter: async (workspaceId, tool) => {
    let settings = get().toolSettings[tool];
    if (!settings) {
        settings = {
            prefix: tool === 'proposals' ? 'PROP-' : 'INV-',
            counter: '0001',
            suffix: ''
        };
    }

    const currentCounter = settings.counter || '1';
    const num = parseInt(currentCounter, 10);
    const nextNum = (num + 1).toString();
    
    // Maintain padding if current counter has leading zeros
    const padded = nextNum.padStart(currentCounter.length, '0');
    
    const newSettings = { ...settings, counter: padded };
    await get().updateToolSettings(workspaceId, tool, newSettings);
  },

}));
