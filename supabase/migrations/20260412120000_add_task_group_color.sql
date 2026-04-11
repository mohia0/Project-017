-- Add color to project_task_groups

ALTER TABLE project_task_groups ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#6366f1';
