import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-service';

/**
 * POST /api/domains/verify
 *
 * Step 1 (first call): Adds the domain to Vercel project, fetches the real
 *   project-specific DNS records Vercel requires, stores them in DB,
 *   marks status 'pending'.
 *
 * Step 2 (user clicks Verify): Re-checks DNS propagation via Vercel's
 *   domain config API. Sets status to 'active' only when Vercel confirms
 *   the domain is fully configured and routing to our project.
 */
export async function POST(req: Request) {
    try {
        const { domainId, domain } = await req.json();

        if (!domainId || !domain) {
            return NextResponse.json({ error: 'Missing domainId or domain' }, { status: 400 });
        }

        const vercelToken     = process.env.VERCEL_TOKEN;
        const vercelProjectId = process.env.VERCEL_PROJECT_ID;

        if (!vercelToken || !vercelProjectId) {
            return NextResponse.json({
                error: 'VERCEL_TOKEN or VERCEL_PROJECT_ID missing from environment variables.',
            }, { status: 500 });
        }

        // Fetch workspace slug to use as the beautiful CNAME target
        let portalTarget = 'cname.vercel-dns.com';
        const { data: dbDomain } = await supabaseService
            .from('workspace_domains')
            .select('workspace_id')
            .eq('id', domainId)
            .single();

        if (dbDomain?.workspace_id) {
            const { data: wsData } = await supabaseService
                .from('workspaces')
                .select('slug')
                .eq('id', dbDomain.workspace_id)
                .single();
            if (wsData?.slug) {
                const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'aroooxa.com';
                portalTarget = `${wsData.slug}.${rootDomain}.`; // Adding trailing dot for standard DNS format
            }
        }

        // ── 1. Register domain with Vercel project ─────────────────────────
        const addRes = await fetch(
            `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${vercelToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: domain }),
            }
        );
        // 409 means already registered — that's fine, continue
        if (!addRes.ok && addRes.status !== 409) {
            const errBody = await addRes.json().catch(() => ({}));
            return NextResponse.json({
                error: errBody?.error?.message || `Vercel rejected the domain (${addRes.status}).`,
            }, { status: 502 });
        }

        // ── 2. Fetch actual domain info + required DNS records from Vercel ──
        const infoRes = await fetch(
            `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}`,
            { headers: { Authorization: `Bearer ${vercelToken}` } }
        );
        const info = await infoRes.json();

        /*
         * Vercel returns something like:
         * {
         *   verified: bool,
         *   verification: [{ type, domain, value, reason }],   ← ownership TXT records (if not verified)
         *   redirect: null,
         *   gitBranch: null,
         *   ...
         * }
         *
         * For routing DNS we use the /v6/domains/:domain/config endpoint which
         * tells us the exact A / CNAME records Vercel wants.
         */
        const configRes = await fetch(
            `https://api.vercel.com/v6/domains/${domain}/config?projectId=${vercelProjectId}`,
            { headers: { Authorization: `Bearer ${vercelToken}` } }
        );
        const config = await configRes.json();

        /*
         * config shape:
         * {
         *   misconfigured: bool,
         *   serviceType: 'external' | 'zeit.world',
         *   cnames: string[],       ← e.g. ['e94434b7....vercel-dns-017.com']
         *   aValues: string[],      ← e.g. ['76.76.21.21']
         * }
         */

        // Build a tidy DNS record list from Vercel's response
        const dnsRecords: { type: string; name: string; value: string }[] = [];

        // Subdomain detection: apex has ≤2 parts (e.g. "foo.com"), or www
        const parts = domain.split('.');
        const isApex = parts.length <= 2 || (parts.length === 3 && parts[0] === 'www');
        const name = isApex ? '@' : parts.slice(0, -2).join('.');

        if (isApex && config?.aValues?.length) {
            // Apex domain → A record(s)
            for (const ip of config.aValues) {
                dnsRecords.push({ type: 'A', name, value: ip });
            }
            // also hint www CNAME
            if (config?.cnames?.length) {
                dnsRecords.push({ type: 'CNAME', name: 'www', value: portalTarget });
            }
        } else if (config?.cnames?.length) {
            // Subdomain → CNAME
            dnsRecords.push({ type: 'CNAME', name, value: portalTarget });
        } else {
            // Fallback if Vercel config not yet available
            dnsRecords.push({
                type: isApex ? 'A' : 'CNAME',
                name,
                value: isApex ? '76.76.21.21' : portalTarget,
            });
        }


        // ── 3. Check if already fully active ────────────────────────────────
        const verified = info?.verified === true && config?.misconfigured === false;
        const status   = verified ? 'active' : 'pending';
        const errorMessage = !verified
            ? (config?.misconfigured
                ? 'Add the DNS records below to your provider, then click Verify DNS.'
                : null)
            : null;

        // ── 4. Persist to DB ─────────────────────────────────────────────────
        await supabaseService
            .from('workspace_domains')
            .update({
                status,
                dns_records: dnsRecords,
                error_message: errorMessage,
                last_checked_at: new Date().toISOString(),
                ...(verified ? { dns_verified_at: new Date().toISOString() } : {}),
            })
            .eq('id', domainId);

        return NextResponse.json({
            success: true,
            verified,
            status,
            dns_records: dnsRecords,
            error: errorMessage,
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
    }
}
