-- Add document number columns to proposals and invoices
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS proposal_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_proposals_number ON proposals(proposal_number);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
