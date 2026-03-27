# Basecamp Visibility Dashboard — Project Plan

## Overview

A centralised, password-protected dashboard that gives leadership a bird's-eye view of **all work across Basecamp 3 projects** (~15 active projects, 50+ team members). The dashboard pulls data from the Basecamp 3 REST API and presents it through five views: Home, Kanban, To-Dos, Timeline, and Workload.

**Basecamp Account:** `https://3.basecamp.com/5402506/`
**API Base URL:** `https://3.basecampapi.com/5402506/`
**Basecamp Version:** Basecamp 3
**Live URL:** `https://basecampdashboard-production.up.railway.app`
**Repo:** `https://github.com/Rahul-ITG/BaseCampDashboard`

---

## Current Status (as of 2026-03-27)

### What's Done
- [x] Next.js 14 scaffold (TypeScript, Tailwind v3, App Router, no `src/` dir)
- [x] All dependencies installed (Prisma 5, NextAuth 4, axios, recharts, shadcn/ui v2, etc.)
- [x] Prisma schema with 11 models, BigInt IDs, PostgreSQL on Railway
- [x] NextAuth Credentials provider with JWT strategy
- [x] Login page, middleware route protection
- [x] Dashboard layout with collapsible sidebar, mobile hamburger, user dropdown
- [x] Basecamp OAuth flow (`/setup` → Basecamp → `/api/basecamp/callback` → token stored)
- [x] Basecamp API client with pagination (Link headers) and rate limiter (50 req/10s)
- [x] Token auto-refresh (within 5 minutes of expiry)
- [x] Sync engine: orchestrator + per-resource syncers (people, projects, todos, cards, schedules)
- [x] Sync logging (SyncLog model with step-by-step DB progress tracking)
- [x] Manual sync via "Sync Now" button on home page
- [x] All 5 dashboard views built with live data from DB
- [x] Deployed to Railway with PostgreSQL addon
- [x] Admin seed script (`admin@company.com` / `changeme123`)

### What's In Progress / Blocked
- **Sync crashes on Railway** — Recent syncs show `status: "running"` with 0 records, meaning the process dies before completing. Latest fix: sync now runs inside the HTTP request (awaited, not fire-and-forget) with step-by-step DB logging so we can see which step crashes. Deployed 2026-03-27, pending test.
- **Cards show 0** — Most Basecamp projects genuinely have empty kanban boards (confirmed via API: `cards_count: 0`). A few projects have cards (e.g. "Tigrett Outdoors (Dev)" has 7). The card sync code was fixed to use the correct URL pattern, but hasn't run successfully yet due to the sync crash issue above.
- **Stale data in DB** — 731 card tables and 1296 projects exist from a pre-BigInt sync. Only ~15 are real. Needs cleanup after a successful sync (the people sync already cleans up non-User records).

### What's Not Done Yet
- [ ] Auto-sync cron (`lib/sync/cron.ts` exists but is never imported/started)
- [ ] Filters (project selector, assignee selector, date range) on all views
- [ ] Loading skeletons (`loading.tsx` per route)
- [ ] Error boundaries with retry buttons
- [ ] Sync status indicator in header (green/yellow/red dot)
- [ ] Home page: cards-by-column chart, top 5 busiest people summary
- [ ] Kanban: colour-coded cards by project, overdue highlights, filters
- [ ] Timeline: week/month toggle, calendar grid view
- [ ] Workload: drill-down (click person → see their assignments)
- [ ] Responsive polish (tables → cards on mobile)
- [ ] Admin role checks on setup/sync endpoints
- [ ] README with setup instructions
- [ ] Stale data cleanup (remove orphaned records not seen in latest sync)

---

## Tech Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 14.2.35 | Must use Node 20 (v25 incompatible) |
| **Language** | TypeScript | strict mode | |
| **Database** | PostgreSQL | Railway addon | Public URL for local dev, internal for prod |
| **ORM** | Prisma | 5.22.0 | Not v7 (breaking changes). Uses `db push`, not migrations |
| **Auth** | NextAuth.js | 4.24.13 | Credentials provider, JWT strategy |
| **Styling** | Tailwind CSS + shadcn/ui | v3 + v2.3.0 | Not Tailwind v4 or shadcn v4 (incompatible) |
| **Charts** | Recharts | 3.8.1 | Used in workload bar chart |
| **HTTP Client** | axios | 1.13.6 | |
| **Sync** | node-cron | 4.2.1 | Created but not wired up yet |
| **Hosting** | Railway | Hobby plan | Nixpacks builder |

---

## Architecture

### Data Flow

```
Basecamp 3 API ──(manual sync)──> Sync Engine ──> PostgreSQL (Railway)
                                                          │
                                                          ▼
                                   Leadership Browser <── Next.js Dashboard
                                   (password protected)   (server components read from Prisma)
```

### Key Design Decisions
- **Cache-first**: Dashboard reads from local DB, never from Basecamp directly
- **Server components**: All dashboard pages are async server components querying Prisma
- **BigInt IDs**: Basecamp IDs exceed Int32 max (e.g. `8849710191`), stored as BigInt/BigInt[]
- **Sync inside request**: Sync runs awaited in the POST handler (not fire-and-forget) because Railway kills background processes after HTTP response returns
- **People filter**: Only syncs `personable_type === "User"` (filters out clients/bots)
- **Disabled dock tools**: Synced even when `enabled: false` (may contain data)

---

## Basecamp 3 API — Lessons Learned

| Discovery | Impact |
|---|---|
| Card table `lists` embed doesn't include `cards_url` or `cards_count` | Must use constructed URL pattern: `/buckets/{pid}/card_tables/lists/{colId}/cards.json` |
| `personable_type` includes "Client", "Integration", etc. | Filter to `"User"` only — reduced from 1950 to actual team members |
| Dock tools with `enabled: false` can still have data | Sync all tools regardless of enabled status |
| Basecamp IDs exceed 2.1B (Int32 max) | All `basecampId` fields must be BigInt |
| API rate limit: 50 req/10s | Token bucket rate limiter enforced before every request |

### Endpoints Used

| Endpoint | Purpose |
|---|---|
| `GET /projects.json` | List all projects + their dock (tools) |
| `GET /buckets/{id}/todosets/{id}/todolists.json` | To-do lists per project |
| `GET /buckets/{id}/todolists/{id}/todos.json` | Individual to-dos |
| `GET /buckets/{id}/card_tables/{id}.json` | Card table with embedded column `lists` |
| `GET /buckets/{id}/card_tables/lists/{id}/cards.json` | Cards in a column |
| `GET /buckets/{id}/schedules/{id}/entries.json` | Schedule entries |
| `GET /people.json` | All people |

---

## Database Schema (Actual — from prisma/schema.prisma)

Key differences from original plan:
- No `@@map` annotations (simpler naming)
- `assigneeIds` stored as `BigInt[]` native arrays (not Json)
- No `lastSynced` per-record (uses `updatedAt` instead)
- `ScheduleEntry.startsAt` and `endsAt` are nullable
- `Card` has no `position` or `content` fields
- `SyncLog.errors` is `String?` (not Json)

See `prisma/schema.prisma` for the authoritative schema.

---

## Project Structure (Actual)

```
BaseCampDashboard/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar, header, user dropdown
│   │   ├── page.tsx                # Home: stats, overdue count, sync health
│   │   ├── kanban/page.tsx         # Card tables with columns per project
│   │   ├── todos/page.tsx          # Completion stats, overdue table, progress bars
│   │   ├── timeline/page.tsx       # Schedule entries with status badges
│   │   └── workload/page.tsx       # Bar chart + table of assignments per person
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── basecamp/callback/route.ts  # OAuth code exchange
│   │   └── sync/route.ts              # POST: run sync, GET: check status
│   ├── login/page.tsx
│   ├── setup/page.tsx              # Basecamp OAuth connect/reconnect
│   └── layout.tsx                  # Root layout with SessionProvider
├── components/
│   ├── ui/                         # shadcn/ui (14 components)
│   ├── dashboard/
│   │   ├── sync-button.tsx         # "Sync Now" button, awaits result
│   │   └── workload-chart.tsx      # Recharts horizontal stacked bar chart
│   └── providers.tsx               # SessionProvider wrapper
├── lib/
│   ├── basecamp/
│   │   ├── client.ts               # BasecampClient: get(), getAll() with pagination
│   │   ├── auth.ts                 # getValidToken() with auto-refresh
│   │   ├── endpoints.ts            # Typed API helpers
│   │   ├── rate-limiter.ts         # Token bucket: 50 tokens / 10s
│   │   └── types.ts                # Basecamp API response interfaces
│   ├── sync/
│   │   ├── orchestrator.ts         # Coordinates full sync with per-step DB logging
│   │   ├── projects.ts             # Extracts dock tool IDs from URLs
│   │   ├── todos.ts                # Syncs todo lists + individual todos
│   │   ├── cards.ts                # Syncs card tables + columns + cards
│   │   ├── schedules.ts            # Syncs schedule entries
│   │   ├── people.ts               # Filters to User type, cleans up stale records
│   │   └── cron.ts                 # node-cron setup (NOT wired up yet)
│   ├── db.ts                       # Prisma singleton
│   └── auth.ts                     # NextAuth config
├── prisma/
│   ├── schema.prisma               # 11 models, BigInt IDs
│   └── seed.ts                     # admin@company.com / changeme123
├── middleware.ts                    # Protects all routes except /login, /setup, /api/auth
├── railway.json                    # Nixpacks, start: prisma db push && npm start
├── .env                            # Real credentials (not committed)
├── .env.example                    # Template
├── .nvmrc                          # Node 20
├── tailwind.config.ts              # Tailwind v3 with hsl variables
└── package.json                    # build: prisma generate && next build
```

---

## Environment Variables

```env
BASECAMP_ACCOUNT_ID=5402506
BASECAMP_CLIENT_ID=<from launchpad.37signals.com>
BASECAMP_CLIENT_SECRET=<from launchpad.37signals.com>
BASECAMP_REDIRECT_URI=https://basecampdashboard-production.up.railway.app/api/basecamp/callback

DATABASE_URL=postgresql://...   # Railway internal URL for prod, public URL for local

NEXTAUTH_SECRET=<random 32-byte base64>
NEXTAUTH_URL=https://basecampdashboard-production.up.railway.app

SYNC_INTERVAL_MINUTES=15
```

---

## Known Issues & Fixes Applied

| Issue | Root Cause | Fix |
|---|---|---|
| `npm create-next-app` rejected name | Capitals in "BaseCampDashboard" | Created with lowercase temp name |
| Node v25 + Next.js 14 crash | `Cannot find module '../server/require-hook'` | Use Node 20 via nvm, added `.nvmrc` |
| Prisma v7 breaking changes | `url` property removed from schema | Downgraded to Prisma 5 |
| shadcn v4 + Tailwind v3 incompatible | oklch colors, `@base-ui/react` | Reinstalled shadcn v2.3.0, hsl colors |
| Geist font not found | `next/font/google` import from shadcn | Use local fonts only |
| Setup page prerender failure | DB unreachable at Docker build time | `export const dynamic = "force-dynamic"` |
| Basecamp IDs overflow Int32 | IDs like `8849710191` | Changed all to BigInt |
| 1950 people synced | API returns clients/bots/integrations | Filter `personable_type === "User"` |
| Cards showing 0 | Embedded `lists` lack `cards_url`/`cards_count` | Construct URL from pattern directly |
| Sync crashes on Railway | Fire-and-forget killed by platform | Await sync inside HTTP request |
| Stuck "running" sync logs | Process dies before updating log | Mark old "running" as "crashed" on next sync; step-by-step DB progress |

---

## What's Left (Priority Order)

### P0 — Must fix
1. **Get sync working reliably** — Latest fix deployed, needs testing
2. **Clean up stale DB data** — After successful sync, remove orphaned records

### P1 — Should have for MVP
3. **Wire up cron** — Auto-sync every 15 minutes (import cron.ts on server startup)
4. **Filters** — Project selector, assignee selector, date range on all views
5. **Loading skeletons** — `loading.tsx` per dashboard route

### P2 — Nice to have
6. **Sync status indicator in header** — Green/yellow/red based on last sync age
7. **Home page enhancements** — Cards-by-column chart, top 5 busiest people
8. **Kanban enhancements** — Colour-coded by project, overdue badges
9. **Timeline enhancements** — Week/month toggle, calendar grid
10. **Workload drill-down** — Click person to see assignments
11. **Error boundaries** with retry
12. **Responsive polish** — Tables → cards on mobile
13. **Admin role checks** on sync/setup endpoints
14. **README**

### Post-MVP (v2+)
- Basecamp Webhooks for real-time updates
- Email digest (weekly summary)
- CSV/PDF export
- Historical trends / velocity charts
- Slack integration
- SSO

---

## Rate Limiting Strategy

Basecamp enforces **50 requests per 10 seconds** per OAuth token.

For ~15 active projects, a full sync means ~200–500 API calls:
- 1 call for projects list
- 1 call for people
- Per project: 1 for card table + N for card columns (cards URL), 1+ for todo lists + N for todos, 1 for schedule entries

**Implemented:**
1. Token bucket rate limiter (50 tokens, refill 50 every 10s)
2. Skip archived/trashed projects
3. Include disabled dock tools (they can have data)
4. Sequential sync with per-step error isolation

**Not yet implemented:**
- ETag / Last-Modified caching (incremental sync)
- Exponential backoff on 429
- Parallel per-resource sync
