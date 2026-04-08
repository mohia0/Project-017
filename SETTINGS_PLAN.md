# Settings System — Scalable Architecture Plan

A central, modular Settings hub for the Minimal CRM. Covers profile, workspace, branding, domains, payments, and email configuration. Slots cleanly into the existing Next.js + Zustand + Supabase stack.

---

## Resolved Decisions

| Question | Decision |
|---|---|
| Multi-workspace | **Implement now** — workspace switcher at the top of `LeftSystemMenu` |
| Auth provider | **Supabase email/password only** — Google OAuth deferred |
| SMTP encryption | **Supabase Vault** — secrets stored as vault entries, never exposed to client |
| Branding → Doc design | **Yes** — `workspace_branding.primary_color` drives new proposal/invoice defaults |

---

## Information Architecture

```
/settings
├── /profile          → Auth identity, avatar, name, password
├── /contact          → Personal email, phone, address, socials
├── /workspace        → Workspace name, logo, plan, members
├── /branding         → Colors, fonts, border-radius, logos, favicon
├── /domains          → Custom domains, DNS records, SSL verification
├── /payments         → Bank details, billing address, invoice defaults
└── /emails           → SMTP config (Vault-stored), sender info, templates
```

Each section is a **standalone Next.js route** under `src/app/settings/[section]/page.tsx`.

---

## UX Structure — Card-Based Layout

### Shell Layout
```
+------+-----------------------------------------+
| WS   |  ← Settings                             |
+------+-------------------+---------------------+
| LeftSystemMenu           |                     |
|  [↕ Workspace Switcher]  |  ┌───────────────┐  |
|                          |  │ SettingsCard   │  |
| ── ACCOUNT ──            |  │ FieldRow       │  |
|  Profile                 |  │ FieldRow       │  |
|  Contact                 |  │ [Save Changes] │  |
|                          |  └───────────────┘  |
| ── WORKSPACE ──          |                     |
|  Workspace               |  ┌───────────────┐  |
|  Branding                |  │ SettingsCard   │  |
|  Domains             ●   |  │  ...           │  |
|  Payments                |  └───────────────┘  |
|  Emails                  |                     |
+--------------------------+---------------------+
```

- **Workspace Switcher**: sits at the very top of `LeftSystemMenu`, above the nav items. Shows current workspace logo + name. Click → popover with list of user's workspaces + "New Workspace" CTA.
- **Sidebar sections**: grouped as ACCOUNT and WORKSPACE, with unsaved-change dot (●) per section.
- **SettingsCard**: self-contained unit. Each has its own Save button and shows "Saved just now" timestamp.
- **SettingsField**: polymorphic input row — text, textarea, toggle, color, file-upload, dropdown, tag-input.

---

## System Logic — Storage & Propagation

### Scope Model

| Scope | Table | Used For |
|---|---|---|
| `user` | `profiles` | Auth identity, name, avatar, personal contact |
| `workspace` | `workspaces` | Workspace name, logo, plan, seats |
| `workspace_branding` | `workspace_branding` | Colors, fonts, logos, favicon |
| `workspace_domains` | `workspace_domains` | Custom domains + DNS + SSL status |
| `workspace_payments` | `workspace_payments` | Bank details, billing address, invoice defaults |
| `workspace_email_config` | `workspace_email_config` | SMTP settings (Vault-keyed) |
| `email_templates` | `email_templates` | Per-event Handlebars templates |

All workspace-scoped records are keyed by `workspace_id`. The active workspace is stored in `useUIStore.activeWorkspaceId` and injected into every store query.

### Data Flow
```
Supabase DB  ←→  useSettingsStore (Zustand)
                       ↓
              React settings pages
                       ↓
         Propagation providers:
           BrandingProvider   → CSS vars on :root
           DomainProvider     → share link base URL
           EmailProvider      → send functions
           PaymentsProvider   → invoice auto-fill
```

---

## ★ Custom Domains — Detailed Sub-Plan

### Overview
Users link their own domain (e.g. `docs.acme.com`) so that shared proposal/invoice links use their brand domain instead of the default app subdomain.

### Data Model
```sql
create table workspace_domains (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  domain        text not null,
  status        text default 'pending', -- pending | verifying | active | error
  is_primary    boolean default false,
  dns_verified_at  timestamptz,
  ssl_status    text default 'pending', -- pending | provisioning | active | error
  ssl_expires_at   timestamptz,
  error_message text,
  created_at    timestamptz default now()
);
```

### Verification Flow
1. **User adds domain** → Status `pending`.
2. **DNS Record** → User adds CNAME to `proxy.minimal-crm.app`.
3. **Verify Now** → Calls Edge Function `verify-domain` to perform DNS lookup.
4. **SSL Provisioning** → Background job polls and updates state to `active`.

---

## ★ Custom Email — Detailed Sub-Plan

### Overview
Users configure their own SMTP server using **Supabase Vault** for secure storage. Raw passwords never exist in plaintext in the database.

### Data Model
```sql
create table workspace_email_config (
  workspace_id       uuid primary key references workspaces(id),
  smtp_host          text,
  smtp_port          int default 587,
  smtp_user          text,
  smtp_pass_vault_id text, -- UUID from vault.secrets
  from_name          text,
  from_address       text,
  updated_at         timestamptz default now()
);
```

### Send Flow
1. API Route → Calls `send-email` Edge Function.
2. Edge Function fetches Vault secret and SMTP config.
3. Renders Handlebars template.
4. Sends email via Nodemailer.

---

## Database Migration

```sql
-- Full schema for settings system
create table profiles (
  id uuid primary key references auth.users(id),
  full_name text,
  avatar_url text,
  phone text,
  address text,
  timezone text,
  language text,
  social_links jsonb,
  updated_at timestamptz default now()
);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  plan text default 'free',
  owner_id uuid references auth.users(id),
  created_at timestamptz default now()
);

create table workspace_branding (
  workspace_id uuid primary key references workspaces(id),
  primary_color text default '#4dbf39',
  secondary_color text,
  font_family text default 'Inter',
  border_radius int default 12,
  logo_light_url text,
  logo_dark_url text,
  favicon_url text,
  updated_at timestamptz default now()
);

-- (Other tables: workspace_domains, workspace_payments, workspace_email_config, email_templates)
```

---

## Build Order

1. **Phase 1 — Foundation**: DB migrations, Workspace Switcher, Shell Layout.
2. **Phase 2 — Core Sections**: Profile, Contact, Workspace, Branding, Payments.
3. **Phase 3 — Custom Domains**: DNS verification logic, SSL polling Edge Functions.
4. **Phase 4 — Custom Email**: Vault integration, SMTP relay, Template editor.
