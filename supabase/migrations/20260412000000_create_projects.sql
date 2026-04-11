-- ============================================================
-- PROJECTS FEATURE MIGRATION — 20260412000000
-- Creates: projects, project_task_groups, project_tasks,
--          project_items
-- Safe to run on existing DB — all idempotent.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. PROJECTS — core project records
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name         TEXT NOT NULL DEFAULT 'Untitled Project',
    description  TEXT,
    status       TEXT NOT NULL DEFAULT 'Planning',
    -- Planning | Active | On Hold | Completed | Cancelled
    color        TEXT NOT NULL DEFAULT '#3d0ebf',
    icon         TEXT NOT NULL DEFAULT 'Briefcase',
    client_id    UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name  TEXT,
    deadline     DATE,
    members      JSONB NOT NULL DEFAULT '[]',
    -- [{id, name, avatar_url}]
    is_archived  BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'projects'
          AND policyname = 'Workspace members can manage projects'
    ) THEN
        CREATE POLICY "Workspace members can manage projects" ON projects
            FOR ALL TO authenticated
            USING      (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
            WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- 2. PROJECT TASK GROUPS — named swim-lane groups
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_task_groups (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name         TEXT NOT NULL DEFAULT 'Group',
    position     INT  NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE project_task_groups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'project_task_groups'
          AND policyname = 'Workspace members can manage project task groups'
    ) THEN
        CREATE POLICY "Workspace members can manage project task groups" ON project_task_groups
            FOR ALL TO authenticated
            USING      (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
            WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- 3. PROJECT TASKS — individual task records
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_tasks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID REFERENCES projects(id)            ON DELETE CASCADE,
    task_group_id UUID REFERENCES project_task_groups(id) ON DELETE SET NULL,
    workspace_id  UUID REFERENCES workspaces(id)          ON DELETE CASCADE,
    title         TEXT NOT NULL DEFAULT 'New Task',
    description   TEXT,
    status        TEXT NOT NULL DEFAULT 'todo',
    -- todo | doing | review | done
    priority      TEXT NOT NULL DEFAULT 'none',
    -- none | low | medium | high | urgent
    assignee      JSONB,
    -- {id, name, avatar_url}
    due_date      DATE,
    start_date    DATE,
    position      INT  NOT NULL DEFAULT 0,
    custom_fields JSONB NOT NULL DEFAULT '{}',
    is_archived   BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'project_tasks'
          AND policyname = 'Workspace members can manage project tasks'
    ) THEN
        CREATE POLICY "Workspace members can manage project tasks" ON project_tasks
            FOR ALL TO authenticated
            USING      (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
            WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- 4. PROJECT ITEMS — links projects to invoices/proposals/files
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID REFERENCES projects(id)    ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id)  ON DELETE CASCADE,
    item_type    TEXT NOT NULL,
    -- 'invoice' | 'proposal' | 'file'
    item_id      UUID NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, item_type, item_id)
);

ALTER TABLE project_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'project_items'
          AND policyname = 'Workspace members can manage project items'
    ) THEN
        CREATE POLICY "Workspace members can manage project items" ON project_items
            FOR ALL TO authenticated
            USING      (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
            WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- 5. REALTIME — subscribe to live task/project updates
-- ──────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'projects') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE projects;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'project_tasks') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE project_tasks;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
