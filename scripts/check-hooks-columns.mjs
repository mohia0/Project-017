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
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function check() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/hooks?select=*&limit=1`, {
        headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
        }
    });
    if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
            console.log('Hooks table columns:', Object.keys(data[0]));
        } else {
            console.log('No hooks found to check columns.');
        }
    } else {
        console.error('Failed to fetch hooks:', res.status, await res.text());
    }
}

check();
