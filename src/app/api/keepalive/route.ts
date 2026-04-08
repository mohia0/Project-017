import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// This is a heartbeat function to prevent Supabase from pausing inactive free-tier projects.
// Reference: https://www.reddit.com/r/SideProject/s/MMLxe1lhf9
export async function GET() {
    try {
        // We ping a lightweight table setup just to register activity on the database connection
        const { data, error } = await supabase.from('workspaces').select('id').limit(1);
        
        if (error) {
            console.error("Hearth Pulse Ping Error:", error);
            return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
        }
        
        return NextResponse.json({ 
            status: 'success', 
            message: 'Database pulse sent. Supabase is kept alive.', 
            timestamp: new Date().toISOString() 
        });
    } catch (err: any) {
        return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
    }
}
