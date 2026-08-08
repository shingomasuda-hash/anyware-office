# AnyWare OFFICE — Supabase Schema (READ ONLY snapshot)

**The live Supabase database is the source of truth.**
This document and `supabase-schema-snapshot.json` were exported READ ONLY
from the production project (ref: `fcwrqjnukiwzgjutcdds`, Tokyo) on
2026-08-08. Migrations `0001_init_enums`, `0002_tables`, `0003_rls`,
`0004_profiles_auth_fk` and `seed_production_safe` were applied manually via
the Supabase Dashboard; their SQL sources are not stored in this repository,
so do not regenerate them from imagination — re-export from the live DB
instead. Never run DDL / migration apply / db reset against the live project
from this repository.

## Tables (14) — all with RLS ENABLED

| Table | PK | Unique | Notable columns |
| --- | --- | --- | --- |
| `profiles` | `id` | `email` | `id uuid` = **`auth.users.id`** (FK `profiles_id_fkey`, **ON DELETE CASCADE**), `name`, `email`, `role user_role` (default `guest`), `position`, `department department_key` (default `OTHER`), `status user_status` (default `offline`), `avatar_url?`, `bio`, `today_schedule`, `is_public` (default true), `display_order` |
| `business_sections` | `id` | `section_key` | `section_key section_key`, `title`, `tagline`, `description`, `display_order`, `is_active` |
| `announcements` | `id` | — | `title`, `body`, `priority announcement_priority` (default `normal`), `visible_roles user_role[]` (default `{guest,member,admin}`), `published_at`, `expires_at?`, `created_by? → profiles.id` (SET NULL) |
| `projects` | `id` | — | `title`, `client_name`, `business_section section_key`, `status project_status` (default `planning`), `description`, `assignee_id? → profiles.id` (SET NULL), `progress` (CHECK 0–100), `due_date?`, `amount int8` (CHECK ≥ 0), `is_public` (default false) |
| `section_metrics` | `id` | `(section_key, metric_key)` | `section_key`, `metric_key`, `label`, `value text`, `unit`, `comparison_value?`, `comparison_label?`, `display_order`, `visible_roles user_role[]` (default `{member,admin}`) |
| `case_studies` | `id` | — | `title`, `client_name`, `section_key`, `summary`, `result`, `thumbnail_url?`, `project_url?`, `is_public` (default false), `display_order` |
| `meeting_rooms` | `id` | — | `name`, `description`, `default_url` (default `''`), `status room_status` (default `available`), `visible_roles user_role[]` (default `{member,admin}`) |
| `meetings` | `id` | — | `title`, `meeting_room_id? → meeting_rooms.id` (SET NULL), `start_at`, `end_at` (CHECK `end_at > start_at`), `meeting_url?`, `client_name`, `host_id? → profiles.id` (SET NULL), `status meeting_status` (default `scheduled`), `visible_roles user_role[]` (default `{member,admin}`) |
| `next_actions` | `id` | — | `title`, `project_id? → projects.id` (**CASCADE**), `assignee_id? → profiles.id` (SET NULL), `due_at?`, `status action_status` (default `todo`), `priority action_priority` (default `medium`) |
| `table_store_metrics` | `id` | `(store_name, business_date)` | `store_name`, `business_date date`, `sales int8`, `customers`, `average_spend`, `store_status text` (default `'open'`) |
| `table_menu_items` | `id` | — | `store_name`, `name`, `category`, `price`, `sales_count`, `image_url?`, `is_active`, `display_order` |
| `green_deals` | `id` | — | `company_name`, `deal_name`, `stage deal_stage` (default `lead`), `amount int8`, `probability` (CHECK 0–100), `next_action`, `assignee_id? → profiles.id` (SET NULL), `expected_close_at? date` |
| `local_projects` | `id` | — | `title`, `area`, `partner`, `status local_project_status` (default `active`), `summary`, `image_url?`, `is_public` (default true) |
| `executive_metrics` | `id` | `metric_key` | `metric_key`, `label`, `value int8` (default 0), `unit`, `period`, `comparison_value?` |

All tables carry `created_at` / `updated_at timestamptz` defaulting to `now()`.
Every `id` defaults to `gen_random_uuid()` **except `profiles.id`**, which has
no default because it must equal `auth.users.id`.

## Enums (12)

| Enum | Values |
| --- | --- |
| `user_role` | guest, member, admin |
| `user_status` | online, away, meeting, offline |
| `department_key` | LOCAL, SIGNAL, PARTNER, TABLE, GREEN, MANAGEMENT, OTHER |
| `section_key` | LOCAL, SIGNAL, PARTNER, TABLE, GREEN |
| `announcement_priority` | normal, important, urgent |
| `project_status` | planning, active, review, completed, paused |
| `action_status` | todo, doing, done |
| `action_priority` | low, medium, high |
| `meeting_status` | scheduled, in_progress, done, cancelled |
| `room_status` | available, reserved, in_use |
| `deal_stage` | lead, meeting, proposal, negotiation, won, lost |
| `local_project_status` | planning, active, completed |

## Auth relationship

```
Supabase Auth → auth.users → (trigger handle_new_user) → public.profiles
```

- `profiles.id` references `auth.users.id` (`profiles_id_fkey`) with
  **ON DELETE CASCADE** — deleting an auth user deletes the profile.
- Profiles are never inserted directly; they are created via Auth signup.
- Initial role is `guest`; admins promote to `member` / `admin`.

## RLS (all 14 tables enabled)

Policies are built on helper functions `is_admin()`, `is_member()` and
`current_role()` (the caller's `profiles.role`, `guest` when anonymous):

- **Admin**: `*_admin_all` — `ALL` commands where `is_admin()`.
- **Read visibility**:
  - `announcements`: role ∈ `visible_roles` AND published window is active.
  - `business_sections`: `is_active` OR member.
  - `projects` / `case_studies` / `local_projects`: `is_public` OR member.
  - `profiles`: `is_public` OR self (`id = auth.uid()`) OR member.
  - `section_metrics` / `meeting_rooms` / `meetings`: role ∈ `visible_roles`
    (defaults exclude guests).
  - `executive_metrics` / `green_deals` / `next_actions` /
    `table_menu_items` / `table_store_metrics`: member only.
- **`profiles_self_update`**: users may update their own row but the
  `with_check` clause freezes `role`, `email`, `department`, `is_public`
  and `display_order` (self-service edits cannot escalate privileges).

An anonymous (publishable-key) client therefore legitimately receives **0
rows** from member-only tables — an empty result there is RLS working, not
an error.

## Seed state (verified 2026-08-08)

business_sections 5 / section_metrics 13 / meeting_rooms 3 /
executive_metrics 6 / announcements 2 / table_store_metrics 1 /
profiles 2 (admin + member test users via Auth) — all other tables 0 rows.
KPI values start at 0 and `meeting_rooms.default_url` starts empty by design.
