"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Auth Callback Relay
 *
 * This page sits at a single whitelisted URL (e.g. {slug}.aroooxa.com/auth/callback)
 * and acts as a token relay for multi-tenant custom domains.
 *
 * Flow:
 *  1. Supabase verifies the invite/magic-link token and redirects here
 *     with the auth tokens in the URL hash (#access_token=...&type=invite)
 *  2. We capture the raw hash BEFORE any Supabase client can clear it
 *  3. We redirect to the real destination (custom domain join page) with the hash appended
 *  4. The Supabase JS client on the destination domain processes the hash
 *     and establishes the session there
 *
 * The ?dest= param holds the actual join URL (e.g. https://app.client.com/join/ws-id?email=...)
 */
function CallbackRelay() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const dest = searchParams?.get('dest');

        // Capture the raw hash immediately — Supabase JS will clear it once it processes
        const rawHash = window.location.hash;

        if (!dest) {
            // No destination — go home
            window.location.href = '/';
            return;
        }

        if (rawHash) {
            // Forward the tokens or errors to the destination domain.
            window.location.replace(dest + rawHash);
        } else {
            // No hash — maybe already signed in, just go to dest
            window.location.replace(dest);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-sm opacity-40">Redirecting…</p>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={null}>
            <CallbackRelay />
        </Suspense>
    );
}
