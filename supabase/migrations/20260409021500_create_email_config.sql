-- Migration: Create workspace_email_config table
-- Created at: 2026-04-09 02:15:00

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workspace_email_config') THEN
        CREATE TABLE workspace_email_config (
            workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
            smtp_host TEXT,
            smtp_port INTEGER DEFAULT 587,
            smtp_user TEXT,
            smtp_pass TEXT, -- It would be better to use Supabase Vault, but keeping it here encoded/bare for now to unblock
            from_name TEXT,
            from_address TEXT,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add RLS
        ALTER TABLE workspace_email_config ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view email config of their workspaces" 
        ON workspace_email_config FOR SELECT 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

        CREATE POLICY "Users can manage email config of their workspaces" 
        ON workspace_email_config FOR ALL 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;
