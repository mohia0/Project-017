-- Enable realtime for proposals and invoices
-- This allows clients to see updates in real-time without refreshing
-- REPLICA IDENTITY FULL ensures that the entire row (including JSONB blocks)
-- is sent in the realtime payload.

ALTER TABLE public.proposals REPLICA IDENTITY FULL;
ALTER TABLE public.invoices REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication
-- First check if they are already added to prevent errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'proposals'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.proposals;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'invoices'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
    END IF;
END $$;
