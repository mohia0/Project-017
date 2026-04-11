// One-shot migration runner using Supabase service role
// Run: node scripts/run-migration.mjs

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://ijwjhiicxesktwqyfntp.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your_service_key_here';

const sql = readFileSync(
    join(__dirname, '../supabase/migrations/20260412000000_create_projects.sql'),
    'utf8'
);

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql }),
});

if (!res.ok) {
    // Fallback: split into individual statements and run via pg-meta approach
    console.log('RPC approach failed, trying raw SQL via pg-meta...');
    const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
    });
    const body2 = await res2.text();
    console.log('pg/query response:', res2.status, body2.slice(0, 500));
} else {
    const body = await res.json();
    console.log('Migration ran successfully:', body);
}
