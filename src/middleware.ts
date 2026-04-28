import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ROOT_DOMAIN  = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'aroooxa.com';

async function supabaseGet(path: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: 'no-store',
    });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

export async function middleware(request: NextRequest) {
  const rawHost = request.headers.get('host') || '';
  const host    = rawHost.replace(/:\d+$/, ''); // strip port for local dev
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);

  let workspaceId:   string | null = null;
  let workspaceSlug: string | null = null;
  let workspaceName: string | null = null;
  let isCustomDomain = false;

  // ─────────────────────────────────────────────────────────────
  // 1. Subdomain routing:  slug.aroooxa.com  →  workspace
  // ─────────────────────────────────────────────────────────────
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = host.slice(0, -(`.${ROOT_DOMAIN}`.length));
    const RESERVED = new Set(['app', 'portal', 'www', 'api', 'mail', 'cdn']);

    if (slug && !RESERVED.has(slug)) {
      const data = await supabaseGet(
        `workspaces?slug=eq.${encodeURIComponent(slug)}&select=id,name&limit=1`
      );
      if (data?.[0]) {
        workspaceId   = data[0].id;
        workspaceSlug = slug;
        workspaceName = data[0].name;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Custom domain routing:  portal.client.com  →  workspace
  //    (apex domains and subdomains both handled)
  // ─────────────────────────────────────────────────────────────
  else if (
    host !== ROOT_DOMAIN &&
    !host.endsWith(`.${ROOT_DOMAIN}`) &&
    host !== 'localhost' &&
    !host.startsWith('localhost:') &&
    !host.startsWith('127.0.0.1')
  ) {
    const data = await supabaseGet(
      `workspace_domains?domain=eq.${encodeURIComponent(host)}&status=eq.active&select=workspace_id&limit=1`
    );
    if (data?.[0]) {
      workspaceId    = data[0].workspace_id;
      isCustomDomain = true;

      // Also fetch workspace name for white-label
      if (workspaceId) {
        const wsData = await supabaseGet(
          `workspaces?id=eq.${encodeURIComponent(workspaceId)}&select=name&limit=1`
        );
        if (wsData?.[0]) workspaceName = wsData[0].name;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Main domain (aroooxa.com) — no workspace context
  // ─────────────────────────────────────────────────────────────
  // No extra resolution needed; user accesses their dashboard normally.

  // Inject resolved workspace context headers
  if (workspaceId)   requestHeaders.set('x-workspace-id',   workspaceId);
  if (workspaceSlug) requestHeaders.set('x-workspace-slug', workspaceSlug);
  if (workspaceName) requestHeaders.set('x-workspace-name', workspaceName);
  if (isCustomDomain) requestHeaders.set('x-custom-domain', '1');

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthRoute     = pathname === '/login';
  const isPublicPreview = pathname.startsWith('/p/');
  const isApiRoute      = pathname.startsWith('/api/');
  const isOnboarding    = pathname === '/onboarding';

  // ─────────────────────────────────────────────────────────────
  // 4. Auth & Domain Restrictions
  // ─────────────────────────────────────────────────────────────
  const ADMIN_EMAIL = 'mo7a.classico@gmail.com';
  const isRootDomain = host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`;

  if (user) {
    // If logged in at root domain, only allow admin
    if (isRootDomain && user.email !== ADMIN_EMAIL) {
       // Find user's workspace to redirect them
       const data = await supabaseGet(`workspaces?owner_id=eq.${user.id}&select=slug&limit=1`);
       if (data?.[0]?.slug) {
         const url = new URL(request.url);
         url.host = `${data[0].slug}.${ROOT_DOMAIN}`;
         url.pathname = '/';
         return NextResponse.redirect(url);
       } else {
         // Fallback if no workspace found - sign out or show error
         const url = new URL('/login', request.url);
         url.searchParams.set('error', 'restricted');
         return NextResponse.redirect(url);
       }
    }

    // If logged in at a workspace domain, ensure they belong there
    if (workspaceId) {
      const data = await supabaseGet(
        `workspaces?id=eq.${workspaceId}&owner_id=eq.${user.id}&select=id&limit=1`
      );
      const membership = data?.[0];
      
      if (!membership) {
        // Not a member? Redirect to their own domain or show error
        const userWs = await supabaseGet(`workspaces?owner_id=eq.${user.id}&select=slug&limit=1`);
        if (userWs?.[0]?.slug) {
          // If they are on a custom domain and own a different workspace, redirect to their slug
          // But if they are somehow failing a check for their OWN custom domain, this could loop.
          const url = new URL(request.url);
          url.host = `${userWs[0].slug}.${ROOT_DOMAIN}`;
          return NextResponse.redirect(url);
        }
      }
    }
  }

  if (!user && !isAuthRoute && !isPublicPreview && !isApiRoute && !isOnboarding) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
