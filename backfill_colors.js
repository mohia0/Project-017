const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Manually read .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfill() {
    console.log('Fetching hooks...');
    const { data: hooks } = await supabase.from('hooks').select('id, name, color');
    
    if (!hooks) {
        console.log('No hooks found.');
        return;
    }

    console.log(`Found ${hooks.length} hooks.`);

    console.log('Fetching notifications...');
    const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'hook');

    if (!notifications) {
        console.log('No notifications found.');
        return;
    }

    console.log(`Checking ${notifications.length} notifications...`);

    let updatedCount = 0;

    for (const notif of notifications) {
        if (notif.metadata && notif.metadata.color) continue;

        let matchedHook = null;
        for (const hook of hooks) {
            if (notif.title.includes(hook.name) || notif.message.includes(hook.name)) {
                matchedHook = hook;
                break;
            }
        }

        if (matchedHook) {
            const newMetadata = { ...(notif.metadata || {}), color: matchedHook.color };
            const { error } = await supabase
                .from('notifications')
                .update({ metadata: newMetadata })
                .eq('id', notif.id);

            if (!error) {
                updatedCount++;
                console.log(`Updated: "${notif.title}" -> ${matchedHook.color}`);
            }
        }
    }

    console.log(`Done! Updated ${updatedCount} notifications.`);
}

backfill();
