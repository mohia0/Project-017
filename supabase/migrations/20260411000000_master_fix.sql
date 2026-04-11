-- ============================================================
-- MASTER FIX MIGRATION — 20260411000000
-- Fixes all missing tables, RLS gaps, schema conflicts,
-- and auto-profile creation trigger.
-- SAFE TO RUN ON EXISTING DB — all idempotent.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 0. WORKSPACES — Add missing fields that UI patches on save
-- ──────────────────────────────────────────────────────────
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS contact_emails JSONB DEFAULT '[]'::jsonb;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS contact_phones JSONB DEFAULT '[]'::jsonb;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS contact_address JSONB DEFAULT '{}'::jsonb;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{}'::jsonb;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS additional_details JSONB DEFAULT '{}'::jsonb;

-- ──────────────────────────────────────────────────────────
-- 1. CLIENTS — Create table if it never existed
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    company_name TEXT,
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
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Workspace members can manage clients') THEN
        CREATE POLICY "Workspace members can manage clients" ON clients
            FOR ALL TO authenticated
            USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
            WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- 2. TEMPLATES — Create table (was completely missing)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Untitled Template',
    description TEXT,
    entity_type TEXT NOT NULL DEFAULT 'proposal', -- 'proposal' | 'invoice'
    blocks JSONB DEFAULT '[]'::jsonb,
    design JSONB DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'Workspace members can manage templates') THEN
        CREATE POLICY "Workspace members can manage templates" ON templates
            FOR ALL TO authenticated
            USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
            WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- 3. SYSTEM_CONFIG — Create table (was completely missing)
--    Used for per-workspace nav menu persistence.
--    Key format: left_menu_{workspaceId}
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    value JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure workspace_id exists if the table was created previously without it
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_config' AND policyname = 'Workspace members can manage system config') THEN
        CREATE POLICY "Workspace members can manage system config" ON system_config
            FOR ALL TO authenticated
            USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
            WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- 4. WORKSPACE_PAYMENTS — Ensure legacy columns exist
--    (schema conflict between migration 050000 and 060000)
-- ──────────────────────────────────────────────────────────
ALTER TABLE workspace_payments ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE workspace_payments ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE workspace_payments ADD COLUMN IF NOT EXISTS swift TEXT;

-- ──────────────────────────────────────────────────────────
-- 5. FIX RLS: Add WITH CHECK to all workspace-scoped tables
--    USING alone doesn't guard INSERT/UPDATE new rows.
-- ──────────────────────────────────────────────────────────

-- workspace_branding
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage branding of their workspaces" ON workspace_branding;
    CREATE POLICY "Users can manage branding of their workspaces" ON workspace_branding
        FOR ALL TO authenticated
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
        WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- workspace_domains
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage domains of their workspaces" ON workspace_domains;
    CREATE POLICY "Users can manage domains of their workspaces" ON workspace_domains
        FOR ALL TO authenticated
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
        WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- workspace_email_config
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage email config of their workspaces" ON workspace_email_config;
    CREATE POLICY "Users can manage email config of their workspaces" ON workspace_email_config
        FOR ALL TO authenticated
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
        WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- email_templates
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage templates of their workspaces" ON email_templates;
    CREATE POLICY "Users can manage templates of their workspaces" ON email_templates
        FOR ALL TO authenticated
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
        WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- files
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage files of their workspaces" ON files;
    CREATE POLICY "Users can manage files of their workspaces" ON files
        FOR ALL TO authenticated
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
        WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- notifications
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage notifications of their workspaces" ON notifications;
    CREATE POLICY "Users can manage notifications of their workspaces" ON notifications
        FOR ALL TO authenticated
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
        WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- proposals (keep public SELECT, fix authenticated WITH CHECK)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage proposals of their workspaces" ON proposals;
    CREATE POLICY "Users can manage proposals of their workspaces" ON proposals
        FOR ALL TO authenticated
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
        WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- invoices (keep public SELECT, fix authenticated WITH CHECK)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage invoices of their workspaces" ON invoices;
    CREATE POLICY "Users can manage invoices of their workspaces" ON invoices
        FOR ALL TO authenticated
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
        WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- companies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage companies of their workspaces" ON companies;
    DROP POLICY IF EXISTS "Users can manage companies in their workspaces" ON companies;
    CREATE POLICY "Users can manage companies of their workspaces" ON companies
        FOR ALL TO authenticated
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
        WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- clients
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage clients in their workspaces" ON clients;
    DROP POLICY IF EXISTS "Users can manage clients of their workspaces" ON clients;
    CREATE POLICY "Users can manage clients of their workspaces" ON clients
        FOR ALL TO authenticated
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
        WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ──────────────────────────────────────────────────────────
-- 6. AUTO-CREATE PROFILE ON NEW USER SIGNUP
--    Trigger fires after INSERT on auth.users
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if any (safe re-create)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────────────────
-- 7. REALTIME for templates (so UI updates without refresh)
-- ──────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'templates') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE templates;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ──────────────────────────────────────────────────────────
-- 8. ENSURE workspaces RLS has WITH CHECK
-- ──────────────────────────────────────────────────────────
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage their own workspaces" ON workspaces;
    DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;
    DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
    DROP POLICY IF EXISTS "Users can update their own workspaces" ON workspaces;
    DROP POLICY IF EXISTS "Users can delete their own workspaces" ON workspaces;
    CREATE POLICY "Users can manage their own workspaces" ON workspaces
        FOR ALL TO authenticated
        USING (owner_id = auth.uid())
        WITH CHECK (owner_id = auth.uid());
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
