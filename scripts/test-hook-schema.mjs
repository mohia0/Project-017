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
    // We need a workspace_id. Let's try to find one.
    const wRes = await fetch(`${SUPABASE_URL}/rest/v1/workspaces?select=id&limit=1`, {
        headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
        }
    });
    
    if (!wRes.ok) {
        console.error('Failed to fetch workspace:', wRes.status);
        return;
    }
    
    const workspaces = await wRes.json();
    if (workspaces.length === 0) {
        console.error('No workspaces found.');
        return;
    }
    
    const workspaceId = workspaces[0].id;
    console.log(`Using workspace: ${workspaceId}`);
    
    const payload = {
        workspace_id: workspaceId,
        name: 'Test Hook ' + Date.now(),
        title: 'Testing schema'
    };
    
    const res = await fetch(`${SUPABASE_URL}/rest/v1/hooks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    });
    
    if (res.ok) {
        const data = await res.json();
        console.log('Inserted hook columns:', Object.keys(data[0]));
        
        // Clean up
        await fetch(`${SUPABASE_URL}/rest/v1/hooks?id=eq.${data[0].id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
            }
        });
    } else {
        console.error('Failed to insert hook:', res.status, await res.text());
    }
}

testInsert();
