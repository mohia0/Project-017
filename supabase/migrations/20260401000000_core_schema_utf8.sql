-- Ensure workspaces table exists
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    plan TEXT DEFAULT 'free',
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    contact_emails JSONB DEFAULT '[]'::jsonb,
    contact_phones JSONB DEFAULT '[]'::jsonb,
    contact_address JSONB DEFAULT '{}'::jsonb,
    links JSONB DEFAULT '[]'::jsonb,
    working_hours JSONB DEFAULT '{}'::jsonb,
    additional_details JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS for workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Workspace RLS Policies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Users can view their own workspaces') THEN
        CREATE POLICY "Users can view their own workspaces" ON workspaces FOR SELECT TO authenticated USING (owner_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Users can create workspaces') THEN
        CREATE POLICY "Users can create workspaces" ON workspaces FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Users can update their own workspaces') THEN
        CREATE POLICY "Users can update their own workspaces" ON workspaces FOR UPDATE TO authenticated USING (owner_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Users can delete their own workspaces') THEN
        CREATE POLICY "Users can delete their own workspaces" ON workspaces FOR DELETE TO authenticated USING (owner_id = auth.uid());
    END IF;
END $$;

-- Ensure companies table exists (linked to workspace)
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

-- Enable RLS for companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Companies RLS Policies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Users can manage companies in their workspaces') THEN
        CREATE POLICY "Users can manage companies in their workspaces" ON companies FOR ALL TO authenticated 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
        WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- Ensure clients table (contacts) has workspace_id and proper RLS
-- First, add column if missing
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='workspace_id') THEN
        ALTER TABLE clients ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS for clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Clients RLS Policies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Users can manage clients in their workspaces') THEN
        CREATE POLICY "Users can manage clients in their workspaces" ON clients FOR ALL TO authenticated 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
        WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;
