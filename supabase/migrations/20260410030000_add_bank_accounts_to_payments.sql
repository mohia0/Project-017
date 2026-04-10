-- Add bank_accounts JSONB column to workspace_payments to support multiple bank accounts
ALTER TABLE workspace_payments
ADD COLUMN IF NOT EXISTS bank_accounts JSONB DEFAULT '[]'::jsonb;

-- Migrate existing bank details to the new bank_accounts array if it's empty
UPDATE workspace_payments
SET bank_accounts = jsonb_build_array(
    jsonb_build_object(
        'id', gen_random_uuid(),
        'bank_name', bank_name,
        'iban', iban,
        'swift', swift,
        'account_name', business_name,
        'is_default', true
    )
)
WHERE bank_accounts = '[]'::jsonb 
  AND bank_name IS NOT NULL 
  AND bank_name != '';
