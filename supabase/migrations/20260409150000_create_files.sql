-- Migration: Create files table
-- Created at: 2026-04-09 15:00:00

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'files') THEN
        CREATE TABLE files (
            id TEXT PRIMARY KEY,
            workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
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

        -- Add RLS
        ALTER TABLE files ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view files of their workspaces" 
        ON files FOR SELECT 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

        CREATE POLICY "Users can manage files of their workspaces" 
        ON files FOR ALL 
        USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;
