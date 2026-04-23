# Subdomain & Custom Domain Linking — Full Implementation Plan

## Current State

The project already has:
- `workspace_domains` table — stores custom domains per workspace (CNAME → `cname.vercel-dns.com`)
- `/api/domains/verify` — adds domain to Vercel project and checks DNS verification
- Settings UI at `/settings/domains` — add/verify/remove custom domains
- Middleware — only handles auth routing (no subdomain awareness)

**Missing:**
- No `slug` column on `workspaces` (needed for `name.crm17.com`)
- No wildcard subdomain routing on Vercel (`*.crm17.com`)
- No middleware logic to resolve a subdomain or custom domain → workspace
- No "Choose your subdomain name" UI in workspace settings
- No "link your custom domain" flow that ties it to the subdomain
- No server-side context propagating the resolved `workspace_id` per-host

---

## The Goal

```
name.crm17.com           →  User's chosen workspace subdomain (main domain)
portal.clientsite.com    →  User's own custom domain, linked to the same workspace
```

Both should route to the same Next.js application, resolve to the correct workspace, and serve the correct dashboard/public pages.

---

## Architecture Overview

```
DNS:  *.crm17.com  →  CNAME  →  cname.vercel-dns.com
      (wildcard on your DNS provider, Cloudflare etc.)

Vercel Project:
  - Production domain: crm17.com + *.crm17.com (wildcard)
  - Per-user custom domains added dynamically via Vercel API

Next.js Middleware:
  - Reads request host
  - If host = *.crm17.com   → extracts slug, looks up workspace_id in DB
  - If host = custom domain → looks up workspace_id in workspace_domains table
  - Injects x-workspace-id header → forwarded to all route handlers/RSC
```

---

## Proposed Changes

### Phase 1 — Database

#### [MODIFY] Supabase Migration — Add `slug` to `workspaces`

New migration file: `20260424000000_add_workspace_slug.sql`

```sql
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_slug_idx ON workspaces (slug);

-- Allow public (anon) read of slug→id mapping so middleware can resolve it
-- without needing an authenticated session
CREATE POLICY IF NOT EXISTS "Public can read workspace slug" ON workspaces
  FOR SELECT TO anon
  USING (slug IS NOT NULL);
```

Also add a `last_checked_at` column to `workspace_domains` (already partially there via the verify route — needs DB column if not present).

```sql
ALTER TABLE workspace_domains ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;
```

#### Public read policy for `workspace_domains`

The middleware runs as an edge function with no user session. It needs to look up `workspace_id` by `domain` without RLS blocking it.

```sql
CREATE POLICY IF NOT EXISTS "Public can read active workspace domains" ON workspace_domains
  FOR SELECT TO anon
  USING (status = 'active');
```

---

### Phase 2 — Middleware

#### [MODIFY] [`middleware.ts`](file:///C:/Users/Mohi%20Hassan/Desktop/Project%20017/src/middleware.ts)

Add host-based workspace resolution logic **before** auth checks.

**Logic:**
1. Parse `host` header (strip port).
2. If host ends with `.crm17.com`:
   - Extract slug = `host.replace('.crm17.com', '')`
   - Query Supabase anon to find `workspace_id` by `slug`
   - Set `x-workspace-slug` and `x-workspace-id` request headers
3. Else (custom domain):
   - Query `workspace_domains` table for `domain = host` AND `status = 'active'`
   - Set `x-workspace-id` request header
4. Pass through the rest of existing auth logic unchanged.
5. Expose the new headers to the app via `NextResponse.next({ request: { headers: newHeaders } })`.

> [!NOTE]
> The middleware uses the **service role key** (or anon with the public read policy above) to do the lookup — no user session involved. We use Supabase's `fetch`-based REST API directly (no `createServerClient`) to avoid session cookie overhead on every request.

---

### Phase 3 — Workspace Slug Management UI

#### [MODIFY] [`src/app/settings/workspace/page.tsx`](file:///C:/Users/Mohi%20Hassan/Desktop/Project%20017/src/app/settings/workspace/page.tsx)

Add a new **"Workspace URL"** section inside the General card:

- Input field: `slug` (workspace short name, e.g., `acme`)
- Live preview: `acme.crm17.com`
- Validation: lowercase alphanumeric + hyphens, 3-32 chars, no leading/trailing hyphens
- Uniqueness check: call `/api/workspace/check-slug?slug=acme` before saving
- On save: `UPDATE workspaces SET slug = 'acme' WHERE id = ...`

#### [NEW] `/api/workspace/check-slug/route.ts`

```
GET /api/workspace/check-slug?slug=acme
→ { available: true | false }
```

Queries `workspaces` table for existing slug. Uses service role to bypass RLS.

---

### Phase 4 — Domains Settings Page Enhancement

#### [MODIFY] [`src/app/settings/domains/page.tsx`](file:///C:/Users/Mohi%20Hassan/Desktop/Project%20017/src/app/settings/domains/page.tsx)

**Add a new top card — "Your CRM17 Subdomain":**
- Shows the current slug-based URL: `{slug}.crm17.com`
- Link to visit and copy button
- If slug not set: prompt user to set it in Workspace Settings
- Status badge: Active (once wildcard is configured) or Pending DNS

**Update the "Add Custom Domain" card:**
- DNS instructions now show TWO options:
  - **Option A (CNAME):** `CNAME @  → cname.vercel-dns.com` (for apex domains, show A record instead)
  - **Option B (CNAME to subdomain):** `CNAME portal → cname.vercel-dns.com`
- After verification — link the custom domain to the workspace (already done by the existing verify flow via Vercel API)

**Update `DNSRecordCard`:**
- Currently shows only CNAME. Add a note: *"For apex/root domains (e.g. example.com), use an A record pointing to Vercel's IP instead."*

---

### Phase 5 — Vercel Wildcard Domain Setup

> [!IMPORTANT]
> This is a **one-time manual step** you (the app owner) must do in Vercel and your DNS provider:

**Vercel Dashboard:**
1. Go to your project → Settings → Domains
2. Add `crm17.com` as primary domain
3. Add `*.crm17.com` as wildcard domain (Vercel Pro or higher supports wildcards)

**DNS Provider (e.g., Cloudflare):**
1. For `crm17.com` → `CNAME @ cname.vercel-dns.com` (or A record to Vercel IPs)
2. For `*.crm17.com` → `CNAME * cname.vercel-dns.com`

After this, any `anything.crm17.com` request will reach your Vercel project, and the middleware will resolve it to the right workspace.

---

### Phase 6 — Workspace Store & Types Update

#### [MODIFY] [`src/store/useWorkspaceStore.ts`](file:///C:/Users/Mohi%20Hassan/Desktop/Project%20017/src/store/useWorkspaceStore.ts)

Add `slug` field to the `Workspace` interface and make sure it's fetched and saved.

---

### Phase 7 — Verify API Route Update

#### [MODIFY] [`src/app/api/domains/verify/route.ts`](file:///C:/Users/Mohi%20Hassan/Desktop/Project%20017/src/app/api/domains/verify/route.ts)

When a custom domain is verified, also save it to Vercel (already done). No changes needed here unless we want to trigger a webhook back to the app.

---

## Data Flow Summary

```
User visits acme.crm17.com
  → Vercel wildcard routes to Next.js
  → middleware.ts: extracts "acme", queries workspaces WHERE slug = 'acme'
  → Sets x-workspace-id = <uuid> header
  → App reads x-workspace-id from headers to scope all data queries

User visits portal.client.com
  → Vercel: domain was added via Vercel API on verify → routes to Next.js
  → middleware.ts: looks up workspace_domains WHERE domain = 'portal.client.com' AND status = 'active'
  → Sets x-workspace-id = <uuid> header
  → Same app, same workspace data
```

---

## User Workflow (End User Perspective)

1. **Choose your subdomain** → Go to Settings → Workspace → type `acme` → save → get `acme.crm17.com`
2. **Add custom domain** → Go to Settings → Domains → enter `portal.myclient.com` → DNS instructions shown → click Verify → domain goes active
3. Both URLs now serve the same workspace

---

## Verification Plan

### Automated Tests
No existing automated tests found in the project. We will rely on manual testing.

### Manual Verification

**Step 1 — Slug Save:**
- Go to `/settings/workspace`
- Enter a slug (e.g., `testworkspace`)
- Save → confirm DB row has `slug = 'testworkspace'` in Supabase table editor

**Step 2 — Slug Availability Check:**
- Try entering an already-taken slug → should see "Not available" message
- Enter a fresh slug → should see "Available" check

**Step 3 — Subdomain Routing (after DNS setup):**
- Visit `testworkspace.crm17.com` in browser
- Confirm middleware resolves workspace correctly (check `x-workspace-id` header in browser network tab)
- Confirm dashboard loads the right workspace data

**Step 4 — Custom Domain:**
- Add a domain in `/settings/domains`
- Set CNAME in DNS provider
- Click "Verify DNS" → confirm domain goes Active
- Visit it in browser → confirm workspace loads correctly

**Step 5 — Edge Case:**
- Visit an unknown subdomain (e.g., `unknown123.crm17.com`) → should redirect to login or show a 404/workspace-not-found page

---

## Phased Rollout Recommendation

| Phase | What | When |
|-------|------|------|
| 1 | DB migration (slug column) | First |
| 2 | Workspace slug UI + check-slug API | Second |
| 3 | Middleware host resolution | Third |
| 4 | Vercel Wildcard DNS setup | Do manually after Phase 3 |
| 5 | Domains page enhancements | Last (UX polish) |
