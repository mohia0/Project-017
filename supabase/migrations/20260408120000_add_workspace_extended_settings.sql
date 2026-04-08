-- Add extended settings columns to the workspaces table
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS contact_emails JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS contact_phones JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS contact_address JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS additional_details JSONB DEFAULT '{}'::jsonb;
