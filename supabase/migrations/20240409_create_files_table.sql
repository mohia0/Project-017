-- Table to store file metadata
CREATE TABLE IF NOT EXISTS public.file_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'folder', 'image', 'doc', etc.
    parent_id TEXT, -- References the 'id' of another file_item
    size BIGINT,
    starred BOOLEAN DEFAULT FALSE,
    download_url TEXT,
    color TEXT, -- For folder colors
    user_id UUID DEFAULT auth.uid(), -- Multi-tenant: each account sees its own files
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.file_items ENABLE ROW LEVEL SECURITY;

-- Delete old policies if any
DROP POLICY IF EXISTS "Users can only see their own files" ON public.file_items;

-- Create policy for full account isolation
CREATE POLICY "Users can only see their own files" ON public.file_items
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_file_items_user_id ON public.file_items(user_id);
CREATE INDEX IF NOT EXISTS idx_file_items_parent_id ON public.file_items(parent_id);
