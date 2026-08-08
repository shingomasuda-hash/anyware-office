# AnyWare OFFICE

Browser-based 2D metaverse office for AnyWare Inc.

Employees (member), administrators (admin), and guests move through a 2D
virtual office and browse business-area information, projects, meeting rooms,
and KPIs.

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router)
- TypeScript (strict)
- Tailwind CSS
- Canvas 2D map (STEP 1)
- [Supabase](https://supabase.com/) — Postgres, Auth, RLS, Realtime (STEP 2+)
- Vercel

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Other commands:

```bash
npx tsc --noEmit   # type check
npm run build      # production build
npm run lint       # lint
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values.

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (client) key |
| `NEXT_PUBLIC_SITE_URL` | Public site URL (e.g. `http://localhost:3000`) |

`.env.local` is git-ignored. Never commit secrets, and never use the
`service_role` / secret key in frontend code.

## Directory Layout

```
src/
  app/                 # App Router pages (/, /login, /office, /admin)
  components/
    office/            # Map, canvas, avatar (STEP 1)
    panels/            # Area info panels (STEP 1-2)
    admin/             # Admin console UI (STEP 2)
    system/            # System-level UI (config errors, guards)
  lib/
    auth/              # Session provider, auth helpers (STEP 2.5)
    supabase/          # Supabase clients (browser / server) (STEP 2+)
    repositories/      # Data repository layer with mock fallback (STEP 2)
    game/              # Movement, collision, map logic (STEP 1)
  types/               # Shared TypeScript types
scripts/               # Acceptance tests, BFS reachability check
supabase/
  migrations/          # SQL migrations (reference; production DB is managed)
```

Directories are created as their first real files land in each STEP.

## Phase Roadmap

| Step | Scope | Status |
| --- | --- | --- |
| STEP 0 | Project foundation (Next.js + TypeScript + Tailwind) | ✅ Done |
| STEP 1 | Office V1 — 2D map, 10 areas, avatar movement, mobile | Planned |
| STEP 2 | Supabase data layer — repositories, admin console | Planned |
| STEP 2.5 | Production auth — SSR sessions, server guards, RLS | Planned |
| STEP 3 | Realtime presence — who is online, avatar sync | Planned |

## Office Areas

ENTRANCE / STAFF / SIGNAL / PARTNER / TABLE / GREEN / LOCAL / MEETING / AI / ADMIN

## Business Sections

| Section | Business |
| --- | --- |
| LOCAL | 地域創生 |
| SIGNAL | マーケティング / SNS / 広告 / 採用 / Web |
| PARTNER | 企業支援 / 営業 / アライアンス |
| TABLE | 飲食事業 |
| GREEN | 水耕栽培 / 農業 |
