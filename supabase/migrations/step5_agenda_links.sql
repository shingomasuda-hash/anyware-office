-- STEP 5 — agendas and resource links.
--
-- Apply via the Supabase SQL Editor or CLI using database migration
-- privileges. The app itself never runs this and keeps using only the
-- publishable key plus an authenticated session.
--
-- Deliberately small. Two things did NOT need creating:
--   · meetings.meeting_url and meeting_rooms.default_url already exist,
--     so a Zoom link has a home — nothing to add for "save a URL and
--     join it".
--   · projects already exists, so case management reuses it.
--
-- What is missing is somewhere to put a meeting's agenda, and somewhere
-- to hang a spreadsheet (or any other) link off a section, project or
-- meeting.

-- ── agenda items ─────────────────────────────────────────────────────
create table if not exists public.agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  position integer not null default 0,
  title text not null,
  detail text,
  owner_id uuid references public.profiles(id) on delete set null,
  minutes integer,
  decision text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'done', 'carried_over')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agenda_items_meeting_idx
  on public.agenda_items (meeting_id, position);

-- ── resource links ───────────────────────────────────────────────────
-- One row = one external document (a spreadsheet, a folder, a doc).
-- Exactly one owner column is set; the check keeps that honest.
create table if not exists public.resource_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null check (url ~ '^https://'),
  kind text not null default 'sheet'
    check (kind in ('sheet', 'doc', 'folder', 'form', 'other')),
  section_id uuid references public.business_sections(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  meeting_id uuid references public.meetings(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint resource_links_one_owner check (
    (section_id is not null)::int
      + (project_id is not null)::int
      + (meeting_id is not null)::int = 1
  )
);

create index if not exists resource_links_section_idx on public.resource_links (section_id);
create index if not exists resource_links_project_idx on public.resource_links (project_id);
create index if not exists resource_links_meeting_idx on public.resource_links (meeting_id);

-- ── RLS ──────────────────────────────────────────────────────────────
-- Same shape as the existing office tables: members read, admins write.
alter table public.agenda_items enable row level security;
alter table public.resource_links enable row level security;

drop policy if exists "office members read agenda" on public.agenda_items;
create policy "office members read agenda"
  on public.agenda_items for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('member', 'admin')
    )
  );

drop policy if exists "office members write agenda" on public.agenda_items;
create policy "office members write agenda"
  on public.agenda_items for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('member', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('member', 'admin')
    )
  );

drop policy if exists "office members read links" on public.resource_links;
create policy "office members read links"
  on public.resource_links for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('member', 'admin')
    )
  );

drop policy if exists "office admins write links" on public.resource_links;
create policy "office admins write links"
  on public.resource_links for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
