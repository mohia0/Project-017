import { supabaseClient } from './supabase/client';

// Re-export the browser client for all legacy files explicitly
// This prevents having to update imports across the codebase.
export const supabase = supabaseClient;
