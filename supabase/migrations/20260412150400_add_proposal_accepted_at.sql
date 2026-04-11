-- Add accepted_at column to proposals table
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Maintain consistency with invoices which has paid_at
COMMENT ON COLUMN proposals.accepted_at IS 'The date and time when the proposal was accepted by the client';
