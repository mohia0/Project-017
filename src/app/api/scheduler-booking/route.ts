import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';

export async function POST(req: Request) {
    try {
        const { scheduler_id, workspace_id, booker_name, booker_email, booker_phone, booked_date, booked_time, timezone, duration_minutes, scheduler_title } = await req.json();

        if (!workspace_id || !scheduler_id || !booker_name || !booker_email || !booked_date || !booked_time) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 0. Fetch scheduler validation data
        const { data: scheduler, error: schedulerError } = await supabaseService
            .from('schedulers')
            .select('meta, status')
            .eq('id', scheduler_id)
            .single();

        if (schedulerError || !scheduler) {
            console.error('Scheduler not found for booking:', schedulerError);
            return NextResponse.json({ error: 'Scheduler not found' }, { status: 404 });
        }

        // Status check
        if (scheduler.status === 'Inactive' || scheduler.status === 'Draft') {
            return NextResponse.json({ error: 'Scheduler is currently not accepting bookings' }, { status: 403 });
        }

        // Timing check
        const meta = (scheduler.meta || {}) as any;
        const now = new Date();
        if (meta.expirationDate && new Date(meta.expirationDate) < now) {
            return NextResponse.json({ error: 'This scheduler has expired' }, { status: 403 });
        }
        if (meta.activationDate && new Date(meta.activationDate) > now) {
            return NextResponse.json({ error: 'This scheduler is not yet active' }, { status: 403 });
        }

        // Submission limit check
        const limitVal = meta.submissionLimit ?? meta.submissionsLimit;
        const submissionLimit = (limitVal !== undefined && limitVal !== null && limitVal !== '') ? parseInt(String(limitVal)) : null;
        
        if (submissionLimit !== null) {
            const { count } = await supabaseService
                .from('scheduler_bookings')
                .select('*', { count: 'exact', head: true })
                .eq('scheduler_id', scheduler_id)
                .neq('status', 'cancelled');
            
            if (count !== null && count >= submissionLimit) {
                // Create notification for blocked attempt
                await supabaseService
                    .from('notifications')
                    .insert({
                        workspace_id: workspace_id,
                        title: 'Booking Limit Reached',
                        message: `A booking attempt for "${scheduler_title || 'Untitled Scheduler'}" was blocked because it has reached its limit of ${submissionLimit} bookings.`,
                        link: `/schedulers/${scheduler_id}?tab=bookings`,
                        read: false
                    });

                return NextResponse.json({ error: 'This scheduler has reached its booking limit' }, { status: 403 });
            }
        }

        // 1. Insert the booking
        const { data: bookingData, error: bookingError } = await supabaseService
            .from('scheduler_bookings')
            .insert({
                scheduler_id,
                workspace_id,
                booker_name,
                booker_email,
                booker_phone,
                booked_date,
                booked_time,
                timezone: timezone || 'UTC',
                duration_minutes: duration_minutes || 30,
                status: 'confirmed'
            })
            .select()
            .single();

        if (bookingError) {
            console.error('Error recording scheduler booking:', bookingError);
            return NextResponse.json({ success: false, error: bookingError.message });
        }

        // 2. Create notification
        const notificationTitle = `New Meeting Booked`;
        const notificationMessage = `${booker_name} just booked a session for ${booked_date} at ${booked_time} on "${scheduler_title || 'Untitled Scheduler'}".`;

        await supabaseService
            .from('notifications')
            .insert({
                workspace_id,
                title: notificationTitle,
                message: notificationMessage,
                link: `/schedulers/${scheduler_id}?tab=bookings&highlight=${bookingData.id}`,
                read: false
            });

        // 3. Send confirmation email via /api/send-email
        try {
            const origin = new URL(req.url).origin;
            await fetch(`${origin}/api/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspace_id,
                    template_key: 'booking_confirmed',
                    to: booker_email,
                    variables: {
                        client_name: booker_name,
                        scheduler_title: scheduler_title || 'Untitled Scheduler',
                        booked_date,
                        booked_time,
                        timezone,
                    }
                })
            });
        } catch (emailErr) {
            console.error('Failed to send booking confirmation email:', emailErr);
            // We do not fail the booking if email fails
        }

        return NextResponse.json({ success: true, data: bookingData });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
