-- ══════════════════════════════════════════════════════════════
-- Public access policies for Forms + Form Responses
-- These allow the public preview page (/p/form/:id) to:
--   1. Read Active forms (anon SELECT on forms)
--   2. Submit responses (anon INSERT on form_responses)
-- Realtime for forms is also enabled so the preview auto-updates
-- when the editor saves.
-- ══════════════════════════════════════════════════════════════

-- ── forms: anon can read Active/Inactive forms by id ────────────
-- (Inactive forms are still technically readable but the page.tsx
--  server-side guard blocks 'Draft' status before rendering)
create policy "Public can view non-draft forms"
    on public.forms
    for select
    to anon
    using (status in ('Active', 'Inactive'));

-- ── form_responses: anyone can insert a response ─────────────────
create policy "Public can submit form responses"
    on public.form_responses
    for insert
    to anon
    with check (true);

-- ── Enable realtime for forms ────────────────────────────────────
-- REPLICA IDENTITY FULL ensures the entire row (including JSONB fields)
-- is sent in the realtime payload, matching proposals/invoices pattern.
ALTER TABLE public.forms REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'forms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.forms;
    END IF;
END $$;
