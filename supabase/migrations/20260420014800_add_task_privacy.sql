-- Add is_private column to project_tasks
ALTER TABLE project_tasks 
ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;
