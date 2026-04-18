ALTER TABLE workspace_branding ADD COLUMN IF NOT EXISTS branding_colors text[] DEFAULT '{}';
