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
  }

}));
