-- Add paypal_email to workspace_payments
ALTER TABLE workspace_payments ADD COLUMN IF NOT EXISTS paypal_email TEXT;
