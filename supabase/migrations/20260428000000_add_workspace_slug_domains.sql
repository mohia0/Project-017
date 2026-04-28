-- Add slug to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_slug_idx ON workspaces (slug);

-- Allow public read of slug to ID mapping for middleware
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workspaces' AND policyname = 'Public can read workspace slug'
  ) THEN
    CREATE POLICY "Public can read workspace slug" ON workspaces
      FOR SELECT TO anon
      USING (slug IS NOT NULL);
  END IF;
END $$;

-- Add last_checked_at to workspace_domains
ALTER TABLE workspace_domains ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;

-- Allow public read to active domains for middleware
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workspace_domains' AND policyname = 'Public can read active workspace domains'
  ) THEN
    CREATE POLICY "Public can read active workspace domains" ON workspace_domains
      FOR SELECT TO anon
      USING (status = 'active');
  END IF;
END $$;
