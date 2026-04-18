import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';
import { getGeoIntelligence } from '@/lib/geo';

export async function POST(req: Request) {
    try {
        const { form_id, workspace_id, data, form_title } = await req.json();

        if (!workspace_id || !form_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 0. Fetch form validation data
        const { data: form, error: formError } = await supabaseService
            .from('forms')
            .select('meta, status, title, workspace_id')
            .eq('id', form_id)
            .single();

        if (formError || !form) {
            console.error('Form not found for submission:', formError);
            return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }

        // Status check
        if (form.status === 'Inactive' || form.status === 'Draft') {
            return NextResponse.json({ error: 'Form is currently not accepting submissions' }, { status: 403 });
        }

        // Timing check
        const meta = (form.meta || {}) as any;
        const now = new Date();
        if (meta.expirationDate && new Date(meta.expirationDate) < now) {
            return NextResponse.json({ error: 'This form has expired' }, { status: 403 });
        }
        if (meta.activationDate && new Date(meta.activationDate) > now) {
            return NextResponse.json({ error: 'This form is not yet active' }, { status: 403 });
        }

        // Submission limit check
        const limitVal = meta.submissionLimit ?? meta.submissionsLimit;
        const submissionLimit = (limitVal !== undefined && limitVal !== null && limitVal !== '') ? parseInt(String(limitVal)) : null;
        
        if (submissionLimit !== null) {
            const { count } = await supabaseService
                .from('form_responses')
                .select('*', { count: 'exact', head: true })
                .eq('form_id', form_id);
            
            if (count !== null && count >= submissionLimit) {
                // Create notification for blocked attempt
                await supabaseService
                    .from('notifications')
                    .insert({
                        workspace_id: form.workspace_id,
                        title: 'Submission Limit Reached',
                        message: `A submission for "${form.title}" was blocked because it has reached its limit of ${submissionLimit} responses.`,
                        link: `/forms/${form_id}?tab=responses`,
                        read: false,
                        type: 'limit_reached' // Custom type for distinct icon if needed later
                    });

                return NextResponse.json({ error: 'This form has reached its submission limit' }, { status: 403 });
            }
        }

        // 0.5 Get Geo Intelligence
        const visitor = await getGeoIntelligence(req);
        if (visitor) {
            data._visitor = visitor;
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
            return NextResponse.json({ success: false, error: responseError.message }, { status: 500 });
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
        const notificationTitle = `New Form Submission`;
        
        const notificationMessage = `${respondentName} just submitted a response to "${form_title || 'Untitled Form'}".`;

        await supabaseService
            .from('notifications')
            .insert({
                workspace_id,
                title: notificationTitle,
                message: notificationMessage,
                link: `/forms/${form_id}?tab=responses`,
                read: false,
                type: 'submission',
                metadata: visitor ? { visitor } : null
            });

        return NextResponse.json({ success: true, data: responseData });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
