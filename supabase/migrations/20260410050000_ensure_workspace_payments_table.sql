-- Create workspace_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS workspace_payments (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    business_name TEXT,
    business_address TEXT,
    tax_number TEXT,
    paypal_email TEXT,
    bank_name TEXT, -- Legacy column for single bank
    iban TEXT,      -- Legacy column for single bank
    swift TEXT,     -- Legacy column for single bank
    bank_accounts JSONB DEFAULT '[]'::jsonb,
    default_currency TEXT DEFAULT 'USD',
    payment_terms TEXT DEFAULT 'Net 30',
    invoice_prefix TEXT DEFAULT 'INV-',
    invoice_start_number INT DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workspace_payments ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own workspace payments
CREATE POLICY "Users can manage their workspace payments"
    ON workspace_payments
    FOR ALL
    TO authenticated
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- Allow public viewing for public invoices (if workspace_id is known)
-- This is needed for the public preview page to show bank details
CREATE POLICY "Public can view workspace payments"
    ON workspace_payments
    FOR SELECT
    TO public
    USING (true);
