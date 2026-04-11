-- Hook Generator: tracking pixel hooks and their event logs

CREATE TABLE IF NOT EXISTS hooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Untitled Hook',
    title TEXT NOT NULL DEFAULT 'Someone opened your page',
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE hooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage hooks in their workspaces" ON hooks
    FOR ALL TO authenticated
    USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
    WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Event log: each row = one view of a hook
CREATE TABLE IF NOT EXISTS hook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hook_id UUID NOT NULL REFERENCES hooks(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE hook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view hook events for their hooks" ON hook_events
    FOR SELECT USING (
        hook_id IN (
            SELECT h.id FROM hooks h
            JOIN workspaces w ON w.id = h.workspace_id
            WHERE w.owner_id = auth.uid()
        )
    );

-- Allow service role to insert events (called from API route)
CREATE POLICY "Service role can insert hook events" ON hook_events
    FOR INSERT WITH CHECK (true);
