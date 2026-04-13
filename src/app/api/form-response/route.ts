import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';

export async function POST(req: Request) {
    try {
        const { form_id, workspace_id, data, form_title } = await req.json();

        if (!workspace_id || !form_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Insert the response
        const { data: responseData, error: responseError } = await supabaseService
            .from('form_responses')
            .insert({
                form_id,
                workspace_id,
                data
            })
            .select()
            .single();

        if (responseError) {
            console.error('Error recording form response:', responseError);
            return NextResponse.json({ success: false, error: responseError.message });
        }

        // 2. Determine a name for the notification if possible
        let respondentName = 'Someone';
        // Look for common identity fields
        const nameField = Object.entries(data).find(([key, val]) => 
            key.toLowerCase().includes('name') || key.toLowerCase().includes('full_name')
        );
        if (nameField && typeof nameField[1] === 'string' && nameField[1].trim()) {
            respondentName = nameField[1];
        } else {
            // Check for email if name not found
            const emailField = Object.entries(data).find(([key, val]) => 
                key.toLowerCase().includes('email')
            );
            if (emailField && typeof emailField[1] === 'string' && emailField[1].trim()) {
                respondentName = emailField[1];
            }
        }

        // 3. Create notification
        const notificationTitle = `New response from ${respondentName}`;
        const notificationMessage = `Form "${form_title || 'Untitled Form'}" received a new entry.`;

        await supabaseService
            .from('notifications')
            .insert({
                workspace_id,
                title: notificationTitle,
                message: notificationMessage,
                link: `/forms/${form_id}?tab=responses`,
                read: false,
            });

        return NextResponse.json({ success: true, data: responseData });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
