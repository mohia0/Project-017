import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env.local manually
function getEnv() {
    try {
        const content = readFileSync(join(__dirname, '../.env.local'), 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const [key, ...vals] = line.split('=');
            if (key && vals.length > 0) env[key.trim()] = vals.join('=').trim();
        });
        return env;
    } catch (e) {
        return {};
    }
}

const env = getEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing credentials in .env.local');
    process.exit(1);
}

const migrationFile = '20260413000000_add_hook_status.sql';
const sql = readFileSync(
    join(__dirname, '../supabase/migrations', migrationFile),
    'utf8'
);

console.log(`Applying migration: ${migrationFile}...`);

// Using the same approach as run-migration.mjs but with better error handling
async function run() {
    try {
        console.log(`Using URL: ${SUPABASE_URL}`);
        
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey':        SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({ sql }),
        });

        if (res.ok) {
            console.log('Migration applied successfully via RPC.');
            return;
        }
        
        const errBody = await res.text();
        console.log(`RPC failed (${res.status}): ${errBody}. Trying fallback (/pg/query)...`);

        const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({ query: sql }),
        });

        const body2 = await res2.text();
        if (res2.ok) {
            console.log('Migration applied successfully via /pg/query fallback.');
        } else {
            console.error(`Fallback failed (${res2.status}): ${body2}`);
            console.log('\n--- MANUAL FIX NEEDED ---');
            console.log('Please run this SQL in your Supabase SQL Editor:');
            console.log(sql);
            console.log('--------------------------\n');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

run();
