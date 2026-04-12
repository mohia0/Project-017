-- ══════════════════════════════════════════════════════════════
-- Schedulers & Forms — new tables
-- ══════════════════════════════════════════════════════════════

-- ── schedulers ─────────────────────────────────────────────────
create table if not exists public.schedulers (
    id           uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    title        text not null default 'New Scheduler',
    status       text not null default 'Draft'
                     check (status in ('Active','Draft','Inactive')),
    meta         jsonb default '{}'::jsonb,
    created_at   timestamptz not null default now()
);
alter table public.schedulers enable row level security;
create policy "Workspace members can manage schedulers" on public.schedulers
    for all to authenticated
    using (workspace_id in (select id from public.workspaces where owner_id = auth.uid()))
    with check (workspace_id in (select id from public.workspaces where owner_id = auth.uid()));

-- ── scheduler_bookings ─────────────────────────────────────────
create table if not exists public.scheduler_bookings (
    id               uuid primary key default gen_random_uuid(),
    scheduler_id     uuid not null references public.schedulers(id) on delete cascade,
    workspace_id     uuid not null references public.workspaces(id) on delete cascade,
    booker_name      text not null,
    booker_email     text not null,
    booker_phone     text,
    booked_date      date not null,
    booked_time      text not null,
    timezone         text not null default 'UTC',
    duration_minutes int  not null default 30,
    status           text not null default 'confirmed'
                         check (status in ('confirmed','cancelled','pending')),
    created_at       timestamptz not null default now()
);
alter table public.scheduler_bookings enable row level security;
create policy "Workspace members can manage bookings" on public.scheduler_bookings
    for all to authenticated
    using (workspace_id in (select id from public.workspaces where owner_id = auth.uid()))
    with check (workspace_id in (select id from public.workspaces where owner_id = auth.uid()));

-- ── forms ──────────────────────────────────────────────────────
create table if not exists public.forms (
    id           uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    title        text not null default 'New Form',
    status       text not null default 'Draft'
                     check (status in ('Draft','Active','Inactive')),
    fields       jsonb default '[]'::jsonb,
    meta         jsonb default '{}'::jsonb,
    created_at   timestamptz not null default now()
);
alter table public.forms enable row level security;
create policy "Workspace members can manage forms" on public.forms
    for all to authenticated
    using (workspace_id in (select id from public.workspaces where owner_id = auth.uid()))
    with check (workspace_id in (select id from public.workspaces where owner_id = auth.uid()));

-- ── form_responses ─────────────────────────────────────────────
create table if not exists public.form_responses (
    id           uuid primary key default gen_random_uuid(),
    form_id      uuid not null references public.forms(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    data         jsonb default '{}'::jsonb,
    created_at   timestamptz not null default now()
);
alter table public.form_responses enable row level security;
create policy "Workspace members can manage responses" on public.form_responses
    for all to authenticated
    using (workspace_id in (select id from public.workspaces where owner_id = auth.uid()))
    with check (workspace_id in (select id from public.workspaces where owner_id = auth.uid()));
