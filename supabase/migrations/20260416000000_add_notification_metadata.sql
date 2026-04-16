-- Add metadata column to notifications table for actionable notification payloads (e.g., receipt_pending)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

-- Add type column safety check (ensure it exists)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS type text DEFAULT NULL;
