-- Add paid_at column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Update RLS if necessary (usually handled by existing policies since they use SELECT *)
-- No changes needed to policies assuming they use *
