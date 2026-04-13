-- Add status to hooks
ALTER TABLE hooks ADD COLUMN status TEXT NOT NULL DEFAULT 'Active';

-- Update existing hooks to have 'Active' status if any
UPDATE hooks SET status = 'Active' WHERE status IS NULL;
