-- Consolidation of missing columns for hooks table
-- Run this in your Supabase SQL Editor if automated migrations fail

-- 1. Add color column (from 20260412150200_add_hook_color.sql)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hooks' AND column_name = 'color'
  ) THEN 
    ALTER TABLE public.hooks ADD COLUMN color TEXT DEFAULT '#4dbf39';
  END IF;
END $$;

-- 2. Add status column (from 20260413000000_add_hook_status.sql)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hooks' AND column_name = 'status'
  ) THEN 
    ALTER TABLE public.hooks ADD COLUMN status TEXT NOT NULL DEFAULT 'Active';
  END IF;
END $$;

-- 3. Ensure existing hooks have status set
UPDATE public.hooks SET status = 'Active' WHERE status IS NULL;
