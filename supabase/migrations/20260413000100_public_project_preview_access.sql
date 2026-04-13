-- ══════════════════════════════════════════════════════════════
-- Public access policies for Projects
-- These allow the public preview page (/p/project/:id) to auto-update
-- ══════════════════════════════════════════════════════════════

-- Projects preview by UUID
create policy "Public can view projects"
    on public.projects
    for select
    to anon
    using (true);

create policy "Public can view project task groups"
    on public.project_task_groups
    for select
    to anon
    using (true);

create policy "Public can view project tasks"
    on public.project_tasks
    for select
    to anon
    using (true);

-- Enable full replica identity so that DELETE events include project_id
-- and can be filtered by Realtime successfully!
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.project_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.project_task_groups REPLICA IDENTITY FULL;
