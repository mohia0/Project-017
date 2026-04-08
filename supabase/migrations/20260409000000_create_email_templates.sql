-- Migration: Create email templates table
-- Created at: 2026-04-09 01:33:00

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_templates') THEN
        CREATE TABLE email_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
            template_key TEXT NOT NULL, -- 'invitation', 'invoice', 'proposal', 'contract', 'receipt'
            subject TEXT,
            body TEXT,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(workspace_id, template_key)
        );

        -- Add RLS
        ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view templates of their workspaces" 
        ON email_templates FOR SELECT 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

        CREATE POLICY "Users can manage templates of their workspaces" 
        ON email_templates FOR ALL 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;
