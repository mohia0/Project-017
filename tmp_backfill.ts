import { supabaseService } from './src/lib/supabase-service';

async function backfill() {
    const { data: notifications } = await supabaseService
        .from('notifications')
        .select('*')
        .eq('type', 'hook')
        .order('created_at', { ascending: false })
        .limit(20);

    console.log('Hook Notifications:', JSON.stringify(notifications, null, 2));
}

backfill();
