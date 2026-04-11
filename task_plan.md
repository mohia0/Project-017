# Task Plan — Projects Feature

**Goal:** Build a full "Projects" tool accessible from the left nav — a project management hub with tasks (Kanban + list), linked items (invoices, proposals, files), and a main list page matching the existing UI style.

**Status:** PLANNING

---

## Phase 1 — Database Schema
**Status:** [ ]
- New migration: `projects`, `project_tasks`, `project_task_groups`, `project_items`
- RLS policies for all tables
- Realtime publication

## Phase 2 — Zustand Store (`useProjectStore`)
**Status:** [ ]
- Types: Project, ProjectTask, ProjectTaskGroup, ProjectItem
- CRUD operations: projects + tasks + task groups
- Linked items management

## Phase 3 — Navigation Integration
**Status:** [ ]
- Add `Briefcase` to ICON_MAP in useMenuStore
- Add `projects` to DEFAULT_NAV
- Update AppLayout DocumentTitleSetter

## Phase 4 — Main Projects Page (`/projects`)
**Status:** [ ]
- Toolbar: Search | View | Filters | Group | Order | Archived | Import/Export
- Stats bar (status pills)
- Card view (project cards with progress, status, deadline, members)
- Table view (like proposals page)
- Create project modal
- Archive/delete logic

## Phase 5 — Project Detail Page (`/projects/[id]`)
**Status:** [ ]
- Breadcrumb header with project name, status badge, members
- Tab bar: Tasks | Files | Linked Items | Edit
- Kanban board view for tasks (with task groups as swim lanes)
- List view toggle for tasks
- "Create task" per column
- Linked items panel (invoices, proposals, files cards)

## Phase 6 — Task Detail Slide Panel
**Status:** [ ]
- Right-side panel (not full modal) when clicking a task
- Fields: title, description, dates, priority, assignee, dependencies
- Right sidebar: comments, attachments, activity log tabs

## Phase 7 — Create Project Modal
**Status:** [ ]
- Name, description, status, color/icon picker, client link, deadline, members

## Phase 8 — Mobile Responsiveness
**Status:** [ ]
- Mobile nav integration
- Mobile-friendly kanban (horizontal scroll)
- Mobile project list

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| — | — | — |
