-- Consolidated Clean Schema Migration
-- Target: Project 017 Core Business Logic
-- Created: 2026-04-10

-- 1. WORKSPACES (The Root)
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    plan TEXT DEFAULT 'free',
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Settings stored as JSONB for flexibility, but specialized settings have their own tables
    metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Users can manage their own workspaces') THEN
        CREATE POLICY "Users can manage their own workspaces" ON workspaces FOR ALL TO authenticated USING (owner_id = auth.uid());
    END IF;
END $$;

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    address TEXT,
    timezone TEXT,
    language TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can manage their own profile') THEN
        CREATE POLICY "Users can manage their own profile" ON profiles FOR ALL TO authenticated USING (id = auth.uid());
    END IF;
END $$;

-- 3. WORKSPACE SETTINGS - BRANDING
CREATE TABLE IF NOT EXISTS workspace_branding (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    primary_color TEXT DEFAULT '#4dbf39',
    secondary_color TEXT,
    font_family TEXT DEFAULT 'Inter',
    border_radius INTEGER DEFAULT 8,
    logo_light_url TEXT,
    logo_dark_url TEXT,
    favicon_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workspace_branding ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_branding' AND policyname = 'Users can manage branding of their workspaces') THEN
        CREATE POLICY "Users can manage branding of their workspaces" ON workspace_branding FOR ALL TO authenticated 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- 4. WORKSPACE SETTINGS - PAYMENTS
CREATE TABLE IF NOT EXISTS workspace_payments (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    business_name TEXT,
    business_address TEXT,
    tax_number TEXT,
    paypal_email TEXT,
    bank_accounts JSONB DEFAULT '[]'::jsonb,
    default_currency TEXT DEFAULT 'USD',
    payment_terms TEXT DEFAULT 'Net 30',
    invoice_prefix TEXT DEFAULT 'INV-',
    invoice_start_number INT DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workspace_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_payments' AND policyname = 'Users can manage payments of their workspaces') THEN
        CREATE POLICY "Users can manage payments of their workspaces" ON workspace_payments FOR ALL TO authenticated 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- 5. WORKSPACE SETTINGS - DOMAINS
CREATE TABLE IF NOT EXISTS workspace_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    domain TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'verifying', 'active', 'error'
    is_primary BOOLEAN DEFAULT false,
    ssl_status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workspace_domains ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_domains' AND policyname = 'Users can manage domains of their workspaces') THEN
        CREATE POLICY "Users can manage domains of their workspaces" ON workspace_domains FOR ALL TO authenticated 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- 6. WORKSPACE SETTINGS - EMAIL CONFIG
CREATE TABLE IF NOT EXISTS workspace_email_config (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    smtp_host TEXT,
    smtp_port INTEGER DEFAULT 587,
    smtp_user TEXT,
    smtp_pass TEXT, 
    from_name TEXT,
    from_address TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workspace_email_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_email_config' AND policyname = 'Users can manage email config of their workspaces') THEN
        CREATE POLICY "Users can manage email config of their workspaces" ON workspace_email_config FOR ALL TO authenticated 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- 7. EMAIL TEMPLATES
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    template_key TEXT NOT NULL, -- 'invitation', 'invoice', 'proposal', 'receipt'
    subject TEXT,
    body TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, template_key)
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'Users can manage templates of their workspaces') THEN
        CREATE POLICY "Users can manage templates of their workspaces" ON email_templates FOR ALL TO authenticated 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- 8. CRM - COMPANIES
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    industry TEXT,
    website TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    tax_number TEXT,
    notes TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Users can manage companies of their workspaces') THEN
        CREATE POLICY "Users can manage companies of their workspaces" ON companies FOR ALL TO authenticated 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- 9. CRM - CLIENTS (CONTACTS)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    company_name TEXT, -- Fallback/Legacy
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_number TEXT,
    notes TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Users can manage clients of their workspaces') THEN
        CREATE POLICY "Users can manage clients of their workspaces" ON clients FOR ALL TO authenticated 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- 10. DOCUMENTS - PROPOSALS
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name TEXT, -- For quick access/legacy
    title TEXT NOT NULL DEFAULT 'New Proposal',
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Pending', 'Accepted', 'Overdue', 'Declined', 'Cancelled'
    amount NUMERIC(15,2) DEFAULT 0,
    issue_date DATE,
    due_date DATE,
    notes TEXT,
    blocks JSONB DEFAULT '[]'::jsonb,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proposals' AND policyname = 'Users can manage proposals of their workspaces') THEN
        CREATE POLICY "Users can manage proposals of their workspaces" ON proposals FOR ALL TO authenticated 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
    -- Public viewing policy for previews
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proposals' AND policyname = 'Public can view proposals') THEN
        CREATE POLICY "Public can view proposals" ON proposals FOR SELECT TO public USING (true);
    END IF;
END $$;

-- 11. DOCUMENTS - INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name TEXT, -- For quick access/legacy
    proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'New Invoice',
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Pending', 'Paid', 'Overdue', 'Cancelled'
    amount NUMERIC(15,2) DEFAULT 0,
    issue_date DATE,
    due_date DATE,
    notes TEXT,
    blocks JSONB DEFAULT '[]'::jsonb,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Users can manage invoices of their workspaces') THEN
        CREATE POLICY "Users can manage invoices of their workspaces" ON invoices FOR ALL TO authenticated 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
    -- Public viewing policy for previews
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Public can view invoices') THEN
        CREATE POLICY "Public can view invoices" ON invoices FOR SELECT TO public USING (true);
    END IF;
END $$;

-- 12. SYSTEM - NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can manage notifications of their workspaces') THEN
        CREATE POLICY "Users can manage notifications of their workspaces" ON notifications FOR ALL TO authenticated 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- 13. SYSTEM - FILES
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY, -- Using string ID if it's from storage or custom root
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'folder', 'file', 'image', etc.
    parent_id TEXT,
    size BIGINT,
    url TEXT,
    starred BOOLEAN DEFAULT false,
    tags TEXT[],
    locked BOOLEAN DEFAULT false,
    color TEXT,
    download_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    modified_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'files' AND policyname = 'Users can manage files of their workspaces') THEN
        CREATE POLICY "Users can manage files of their workspaces" ON files FOR ALL TO authenticated 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- REALTIME CONFIGURATION
DO $$
BEGIN
    -- Ensure publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- Add tables to realtime publication
    -- Proposals, Invoices, Notifications are most critical
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'proposals') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE proposals;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'invoices') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;

-- Replica Identity for Realtime JSONB updates
ALTER TABLE proposals REPLICA IDENTITY FULL;
ALTER TABLE invoices REPLICA IDENTITY FULL;
