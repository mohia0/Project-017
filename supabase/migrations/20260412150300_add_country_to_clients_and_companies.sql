-- Add country column to clients and companies tables
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country TEXT;
