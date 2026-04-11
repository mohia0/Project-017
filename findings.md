# Findings — Projects Feature Research

## Codebase Architecture

### Tech Stack
- Next.js 14 App Router, TypeScript, TailwindCSS
- Zustand for state management
- Supabase (Postgres + RLS + realtime)
- framer-motion, @dnd-kit/core, lucide-react, goey-toast

### Design System
- Primary color: `#3d0ebf` (indigo/purple)
- Primary light: `#5217f4`
- Dark bg: `#141414`, `#0a0a0a`
- Light bg: `#ffffff`, `#f0f0f0`
- Dark sidebar: `#1c1c1e` (always dark regardless of theme)
- Font: Inter
- Border radius: xl/2xl (12-16px), standard cards use rounded-[8px]
- Standard border dark: `border-[#2e2e2e]` / light: `border-[#e0e0e0]`

### Navigation
- `useMenuStore` — DEFAULT_NAV has 5 items: Dashboard, Contacts, Proposals, Invoices, File Manager
- Icons in ICON_MAP: `LayoutGrid, Users, FileText, Receipt, Folder`
- Projects needs: icon `Briefcase` from lucide — must be added to ICON_MAP
- Nav items stored in Supabase `system_config` keyed as `left_menu_{workspaceId}`
- DEFAULT_NAV should include Projects so it appears on fresh installs

### Existing Page Patterns
- Toolbar: Search | View toggle (table/cards) | Edit view | Filters | Group | Order | Archived | Import/Export
- Stats bar at top: status pills with count + amount
- Table view: sortable/resizable columns via @dnd-kit, checkboxes for selection
- Card view: grid of cards, each showing key fields
- Bulk actions: archive, delete, duplicate on multi-select
- Archive: local state (archivedIds Set), no dedicated DB column yet
- Modals: full-screen overlay with blurred backdrop

### Store Pattern (from useProposalStore)
- create<State>((set) => ({...}))
- Optimistic updates
- Always get workspaceId from useUIStore.getState().activeWorkspaceId
- bulkDelete uses .in('id', ids) operator
- fetchX checks if data already loaded to avoid spinner flash

### Database Schema (existing)
Tables: workspaces, clients, companies, proposals, invoices, files, templates, notifications, system_config
All scoped by workspace_id with RLS matching owner_id = auth.uid()
Pattern: id UUID PK, workspace_id UUID FK, created_at TIMESTAMPTZ DEFAULT NOW()

## Reference UI (from screenshots)
The reference (studio.mohihassan.com) shows:
1. **Main Projects list** — card view with: Title, Status badge (On Hold/Active), Progress bar, Type, Members avatars, Deadline
2. **Project detail** — tabbed: Tasks | Calendar | Conversations | Files | Edit
   - Tasks subtabs: Kanban board with columns (To Do, Doing, Review, Done)
   - Each task: checkbox, title, #ID badge, priority, assignee
   - Task groups visible above kanban columns
3. **Task detail** — slide-panel with: Description, dates, dependencies, assignees, followers, custom fields, comments/attachments sidebar

## Key Design Decisions

### Projects model
- Project = hub with: name, description, status, color/icon, client_id (linked), deadline, members (JSON), progress (derived from tasks)
- Linked items: project_items junction table (type: 'invoice'|'proposal'|'file')

### Tasks model
- Task = item within a project or standalone
- Fields: title, description, status (todo/doing/review/done), priority, assignee_id, due_date, project_id, task_group_id, position, custom fields JSONB

### Project status values
- Planning, Active, On Hold, Completed, Cancelled

### Views for main Projects page
- Cards (default) — matches reference screenshot
- Table — matches other tools

### Views inside a Project
- Tasks (Kanban default + List toggle)
- Files (links to files tool)
- Linked Items (invoices, proposals)

## Navigation Integration
- Add `projects` route to DEFAULT_NAV in useMenuStore
- Add `Briefcase` to ICON_MAP
- AppLayout DocumentTitleSetter needs `/projects` and `/projects/[id]` cases
