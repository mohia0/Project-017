CREATE TABLE IF NOT EXISTS section_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    block_type TEXT NOT NULL DEFAULT 'content',   -- 'content' | 'pricing' | 'signature' | 'header'
    source_entity TEXT NOT NULL DEFAULT 'proposal', -- 'proposal' | 'invoice'
    block_data JSONB NOT NULL DEFAULT '{}',         -- raw block object (same shape as blocks[])
    background_color TEXT,                          -- optional section bg colour
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE section_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can manage section templates" ON section_templates;
CREATE POLICY "Workspace members can manage section templates"
    ON section_templates
    FOR ALL
    TO authenticated
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE TABLE IF NOT EXISTS snippets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                   -- user-given name/title
    content_blocks JSONB NOT NULL,        -- BlockNote block[] JSON
    content_text TEXT,                    -- plain-text preview for search/display
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can manage snippets" ON snippets;
CREATE POLICY "Workspace members can manage snippets"
    ON snippets
    FOR ALL
    TO authenticated
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );
