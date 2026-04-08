import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
    console.log("Fetching workspaces...");
    const { data: workspaces, error: wsError } = await supabase.from('workspaces').select('id').limit(1);
    
    if (wsError || !workspaces || workspaces.length === 0) {
        console.error("Could not find any workspaces or there was an error:", wsError);
        return;
    }
    
    const workspaceId = workspaces[0].id;
    console.log("Using Workspace ID for legacy data:", workspaceId);
    
    const tables = ['clients', 'proposals', 'invoices', 'templates'];
    
    for (const table of tables) {
        console.log(`Updating table: ${table}`);
        const { data, error } = await supabase
            .from(table)
            .update({ workspace_id: workspaceId })
            .is('workspace_id', null);
            
        if (error) {
            console.error(`Error updating ${table}:`, error);
        } else {
            console.log(`Successfully updated ${table}.`);
        }
    }
    console.log("Migration complete.");
}

run();
