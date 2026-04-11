-- Migration: Create tables for statuses and tool settings

-- Workspace Tool Settings
CREATE TABLE IF NOT EXISTS public.workspace_tool_settings (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    tool TEXT NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (workspace_id, tool)
);

-- Workspace Statuses
CREATE TABLE IF NOT EXISTS public.workspace_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    tool TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for workspace_tool_settings
ALTER TABLE public.workspace_tool_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their workspace tool settings"
    ON public.workspace_tool_settings FOR SELECT
    USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can insert their workspace tool settings"
    ON public.workspace_tool_settings FOR INSERT
    WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update their workspace tool settings"
    ON public.workspace_tool_settings FOR UPDATE
    USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can delete their workspace tool settings"
    ON public.workspace_tool_settings FOR DELETE
    USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));


-- RLS for workspace_statuses
ALTER TABLE public.workspace_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their workspace statuses"
    ON public.workspace_statuses FOR SELECT
    USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can insert their workspace statuses"
    ON public.workspace_statuses FOR INSERT
    WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update their workspace statuses"
    ON public.workspace_statuses FOR UPDATE
    USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can delete their workspace statuses"
    ON public.workspace_statuses FOR DELETE
    USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
