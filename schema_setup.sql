-- 1. Clients Table (ensure it exists first so references work)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT,
    contact_person TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Allow ALL on clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- 2. Proposals Table
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft',
    amount NUMERIC DEFAULT 0,
    issue_date DATE,
    due_date DATE,
    notes TEXT,
    blocks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Force add missing columns if the table already existed
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]'::jsonb;

-- Drop strict constraints gracefully so we can save draft documents before a firm client is bound
ALTER TABLE public.proposals ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Allow ALL on proposals" ON public.proposals FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- 3. Invoices Table 
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft',
    amount NUMERIC DEFAULT 0,
    issue_date DATE,
    due_date DATE,
    notes TEXT,
    blocks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Force add missing columns if the table already existed
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]'::jsonb;

-- Drop strict constraints gracefully
ALTER TABLE public.invoices ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Allow ALL on invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- 4. System Config Table
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Allow ALL on system_config" ON public.system_config FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Insert default menu if not exists
INSERT INTO public.system_config (key, value)
VALUES ('left_menu', '[
    {"id": "dashboard", "href": "/dashboard", "icon": "LayoutGrid", "label": "Dashboard"},
    {"id": "clients", "href": "/clients", "icon": "Users", "label": "Contacts"},
    {"id": "proposals", "href": "/proposals", "icon": "FileText", "label": "Proposals"},
    {"id": "invoices", "href": "/invoices", "icon": "Receipt", "label": "Invoices"},
    {"id": "files", "href": "/files", "icon": "Folder", "label": "File Manager"}
]')
ON CONFLICT (key) DO NOTHING;
