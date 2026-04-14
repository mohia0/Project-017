import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function testInsert() {
    // We need a hook_id. 
    // Let's just try to select * from hook_events limit 1
    const res = await fetch(`${SUPABASE_URL}/rest/v1/hook_events?select=*&limit=1`, {
        headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Prefer': 'return=representation'
        }
    });
    
    // If empty, we try to insert a dummy (if we have a hook)
    if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
            console.log('Hook event columns:', Object.keys(data[0]));
        } else {
             // Create a dummy hook first
             const hRes = await fetch(`${SUPABASE_URL}/rest/v1/hooks?select=id&limit=1`, {
                 headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
             });
             const hooks = await hRes.json();
             if (hooks.length > 0) {
                 const res2 = await fetch(`${SUPABASE_URL}/rest/v1/hook_events`, {
                     method: 'POST',
                     headers: {
                         'Content-Type': 'application/json',
                         'apikey': SERVICE_KEY,
                         'Authorization': `Bearer ${SERVICE_KEY}`,
                         'Prefer': 'return=representation'
                     },
                     body: JSON.stringify({ hook_id: hooks[0].id })
                 });
                 if (res2.ok) {
                     const data2 = await res2.json();
                     console.log('Hook event columns (inserted):', Object.keys(data2[0]));
                     // cleanup
                     await fetch(`${SUPABASE_URL}/rest/v1/hook_events?id=eq.${data2[0].id}`, {
                         method: 'DELETE',
                         headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
                     });
                 } else {
                     console.log('Failed to insert hook event.');
                 }
             } else {
                 console.log('No hooks to test hook_events.');
             }
        }
    }
}

testInsert();
