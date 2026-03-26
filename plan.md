# Basecamp Visibility Dashboard — Project Plan

## Overview

A centralised, password-protected dashboard that gives leadership a bird's-eye view of **all work across 30+ Basecamp 3 projects** with 50+ team members. The dashboard pulls data from the Basecamp 3 REST API every 15 minutes and presents it through four key views.

**Basecamp Account:** `https://3.basecamp.com/5402506/`
**API Base URL:** `https://3.basecampapi.com/5402506/`
**Basecamp Version:** Basecamp 3

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Full-stack React; API routes + frontend in one codebase; perfect for Railway |
| **Language** | TypeScript | Type safety across API calls; Claude Code generates better TS |
| **Database** | PostgreSQL (Railway addon) | Caches Basecamp data locally; fast dashboard queries |
| **ORM** | Prisma | Type-safe DB queries; auto-migrations; great with Next.js |
| **Auth** | NextAuth.js (Credentials) | Simple password login for 5–10 leadership users |
| **Styling** | Tailwind CSS + shadcn/ui | Pre-built dashboard components; fast to build |
| **Charts** | Recharts | React-native charting for progress bars and workload viz |
| **Sync** | node-cron (in-process) | Runs sync every 15 min inside Next.js server; no separate worker for MVP |
| **HTTP Client** | axios | Clean API calls with interceptors for token refresh |
| **Hosting** | Railway (Hobby plan) | ~$5–15/month; PostgreSQL addon free up to 500 MB |

---

## Architecture

### Data Flow

```
Basecamp 3 API ──(every 15 min)──> Sync Service ──> PostgreSQL Cache
                                                          │
                                                          ▼
                                   Leadership Browser <── Next.js Dashboard
                                   (password protected)   (reads from local DB, not Basecamp)
```

### Why cache-first?

1. **Speed** — Dashboard loads are instant; no waiting on Basecamp API
2. **Rate limits** — Basecamp allows 50 req/10s; 30+ projects means 200–400 calls per sync
3. **Reliability** — Dashboard works even if Basecamp API is slow or down
4. **Query flexibility** — Can run complex aggregations (workload, overdue counts) locally

---

## Basecamp 3 API Endpoints Used

| Endpoint | Purpose |
|---|---|
| `GET /projects.json` | List all projects + their dock (tools) |
| `GET /buckets/{id}/todosets/{id}/todolists.json` | To-do lists per project |
| `GET /buckets/{id}/todolists/{id}/todos.json` | Individual to-dos (assignees, due dates, completion) |
| `GET /buckets/{id}/card_tables/{id}/columns.json` | Kanban columns per card table |
| `GET /buckets/{id}/card_tables/lists/{id}/cards.json` | Cards in each column |
| `GET /buckets/{id}/schedules/{id}/entries.json` | Schedule entries (milestones, events) |
| `GET /people.json` | All people for workload mapping |

**Auth:** OAuth 2.0 via `https://launchpad.37signals.com`
**Pagination:** `Link` header (RFC 5988) — geared pagination (15, 30, 50, 100 per page)
**Rate limit:** 50 requests per 10 seconds per token
**User-Agent:** Required — include app name + contact email

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Dashboard Auth ───

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String
  role         String   @default("viewer") // "admin" | "viewer"
  createdAt    DateTime @default(now()) @map("created_at")
  @@map("users")
}

// ─── Basecamp OAuth Tokens ───

model BasecampToken {
  id           String   @id @default(cuid())
  accessToken  String   @map("access_token")
  refreshToken String   @map("refresh_token")
  expiresAt    DateTime @map("expires_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  @@map("basecamp_tokens")
}

// ─── Cached Basecamp Data ───

model Project {
  id          String   @id @default(cuid())
  basecampId  BigInt   @unique @map("basecamp_id")
  name        String
  description String?
  status      String   @default("active") // active | archived | trashed
  purpose     String?  // from project purpose field
  url         String?  // app_url for click-through
  createdAt   DateTime @map("created_at")
  updatedAt   DateTime @map("updated_at")
  lastSynced  DateTime @map("last_synced")

  todoLists      TodoList[]
  cardTables     CardTable[]
  scheduleEntries ScheduleEntry[]
  @@map("projects")
}

model TodoList {
  id             String   @id @default(cuid())
  basecampId     BigInt   @unique @map("basecamp_id")
  projectId      String   @map("project_id")
  project        Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name           String
  description    String?
  completedRatio Float    @default(0) @map("completed_ratio") // 0.0 – 1.0
  url            String?
  lastSynced     DateTime @map("last_synced")

  todos TodoItem[]
  @@map("todo_lists")
}

model TodoItem {
  id          String    @id @default(cuid())
  basecampId  BigInt    @unique @map("basecamp_id")
  listId      String    @map("list_id")
  list        TodoList  @relation(fields: [listId], references: [id], onDelete: Cascade)
  content     String
  description String?
  assigneeIds Json?     @map("assignee_ids") // array of basecamp person IDs
  dueOn       DateTime? @map("due_on")
  startsOn    DateTime? @map("starts_on")
  completed   Boolean   @default(false)
  completedAt DateTime? @map("completed_at")
  url         String?
  lastSynced  DateTime  @map("last_synced")
  @@map("todo_items")
}

model CardTable {
  id         String  @id @default(cuid())
  basecampId BigInt  @unique @map("basecamp_id")
  projectId  String  @map("project_id")
  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name       String
  url        String?
  lastSynced DateTime @map("last_synced")

  columns CardColumn[]
  @@map("card_tables")
}

model CardColumn {
  id         String    @id @default(cuid())
  basecampId BigInt    @unique @map("basecamp_id")
  tableId    String    @map("table_id")
  table      CardTable @relation(fields: [tableId], references: [id], onDelete: Cascade)
  title      String
  position   Int
  lastSynced DateTime  @map("last_synced")

  cards Card[]
  @@map("card_columns")
}

model Card {
  id          String    @id @default(cuid())
  basecampId  BigInt    @unique @map("basecamp_id")
  columnId    String    @map("column_id")
  column      CardColumn @relation(fields: [columnId], references: [id], onDelete: Cascade)
  title       String
  content     String?
  assigneeIds Json?     @map("assignee_ids")
  dueOn       DateTime? @map("due_on")
  position    Int
  url         String?
  lastSynced  DateTime  @map("last_synced")
  @@map("cards")
}

model ScheduleEntry {
  id          String    @id @default(cuid())
  basecampId  BigInt    @unique @map("basecamp_id")
  projectId   String    @map("project_id")
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  summary     String
  description String?
  startsAt    DateTime  @map("starts_at")
  endsAt      DateTime  @map("ends_at")
  allDay      Boolean   @default(false) @map("all_day")
  assigneeIds Json?     @map("assignee_ids")
  url         String?
  lastSynced  DateTime  @map("last_synced")
  @@map("schedule_entries")
}

model Person {
  id          String  @id @default(cuid())
  basecampId  BigInt  @unique @map("basecamp_id")
  name        String
  email       String?
  avatarUrl   String? @map("avatar_url")
  admin       Boolean @default(false)
  company     String?
  lastSynced  DateTime @map("last_synced")
  @@map("people")
}

model SyncLog {
  id             String   @id @default(cuid())
  startedAt      DateTime @map("started_at")
  completedAt    DateTime? @map("completed_at")
  status         String   @default("running") // running | success | failed
  recordsSynced  Int      @default(0) @map("records_synced")
  errors         Json?    // array of error messages
  durationMs     Int?     @map("duration_ms")
  @@map("sync_logs")
}
```

---

## Dashboard Views

### View 1: Dashboard Home (`/`)
- Total active projects, total to-dos, total cards
- Overdue items count (to-dos + cards past due date)
- Cards by column distribution (pie/bar chart)
- Team workload summary (top 5 busiest people)
- Last sync timestamp + sync health (green/yellow/red)
- Quick links to other views

### View 2: Card Tables / Kanban (`/kanban`)
- Unified Kanban view aggregating all card tables across all projects
- Group by project, filter by assignee or due date
- Colour-coded cards by project
- Column-level counts + overdue card highlights (red badge)
- Click-through to card in Basecamp (opens in new tab)

### View 3: To-Do Progress (`/todos`)
- All to-do lists with completion progress bars
- Overdue to-dos table: content, assignee, project, days overdue
- Filterable by project, assignee, date range
- Summary stats: completed today, completed this week, total overdue

### View 4: Timelines & Milestones (`/timeline`)
- Calendar/timeline view of schedule entries across all projects
- Colour-coded by project
- Past-due milestones flagged in red
- Week/month toggle
- Click-through to schedule entry in Basecamp

### View 5: Team Workload (`/workload`)
- Bar chart: open to-dos + open cards per person
- Overdue items count per person
- Drill-down: click a person to see their assignments across all projects
- Heatmap or colour coding for overloaded team members

---

## Authentication

- **NextAuth.js** with Credentials provider (email + password)
- 5–10 user accounts seeded via `prisma/seed.ts` or admin endpoint
- JWT session tokens in httpOnly cookies
- All `/` dashboard routes protected by Next.js middleware
- Basecamp OAuth tokens are server-side only (sync service uses them; end users never see them)
- HTTPS via Railway's built-in SSL

---

## Project Structure

```
basecamp-dashboard/
├── app/
│   ├── (dashboard)/           # Protected layout group
│   │   ├── layout.tsx         # Dashboard shell (sidebar, header)
│   │   ├── page.tsx           # Home / summary dashboard
│   │   ├── kanban/page.tsx    # Card tables view
│   │   ├── todos/page.tsx     # To-do progress view
│   │   ├── timeline/page.tsx  # Timeline view
│   │   └── workload/page.tsx  # Team workload view
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth endpoints
│   │   ├── basecamp/
│   │   │   ├── callback/route.ts        # OAuth callback
│   │   │   └── setup/route.ts           # Initial OAuth setup
│   │   ├── sync/
│   │   │   └── route.ts                 # Manual sync trigger
│   │   └── dashboard/
│   │       ├── stats/route.ts           # Home page stats
│   │       ├── kanban/route.ts          # Card data
│   │       ├── todos/route.ts           # To-do data
│   │       ├── timeline/route.ts        # Schedule data
│   │       └── workload/route.ts        # Workload data
│   ├── login/page.tsx
│   └── setup/page.tsx                   # One-time Basecamp OAuth setup
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── dashboard/
│   │   ├── Sidebar.tsx
│   │   ├── StatsCard.tsx
│   │   ├── KanbanBoard.tsx
│   │   ├── TodoProgressBar.tsx
│   │   ├── TimelineView.tsx
│   │   ├── WorkloadChart.tsx
│   │   └── FilterBar.tsx
│   └── shared/
│       ├── LoadingSkeleton.tsx
│       └── ErrorBoundary.tsx
├── lib/
│   ├── basecamp/
│   │   ├── client.ts          # Basecamp API client with auth + pagination
│   │   ├── endpoints.ts       # Typed endpoint definitions
│   │   ├── types.ts           # Basecamp API response types
│   │   └── rate-limiter.ts    # Token bucket rate limiter (50 req/10s)
│   ├── sync/
│   │   ├── orchestrator.ts    # Main sync coordinator
│   │   ├── projects.ts        # Project syncer
│   │   ├── todos.ts           # To-do syncer
│   │   ├── cards.ts           # Card table syncer
│   │   ├── schedules.ts       # Schedule syncer
│   │   ├── people.ts          # People syncer
│   │   └── cron.ts            # node-cron setup (every 15 min)
│   ├── db.ts                  # Prisma client singleton
│   └── auth.ts                # NextAuth config
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                # Seed admin users
│   └── migrations/
├── middleware.ts               # Route protection
├── .env.example
├── railway.json                # Railway config
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## Environment Variables

```env
# Basecamp OAuth (get from https://launchpad.37signals.com/integrations)
BASECAMP_ACCOUNT_ID=5402506
BASECAMP_CLIENT_ID=your_client_id
BASECAMP_CLIENT_SECRET=your_client_secret
BASECAMP_REDIRECT_URI=https://your-app.up.railway.app/api/basecamp/callback

# Database (auto-provided by Railway PostgreSQL addon)
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=https://your-app.up.railway.app

# Sync
SYNC_INTERVAL_MINUTES=15

# App
NODE_ENV=production
```

---

## Sprint Plan (1 Week MVP)

### Day 1 — Foundation
- [ ] Scaffold Next.js 14 project (TypeScript, Tailwind, App Router)
- [ ] Install dependencies (prisma, next-auth, shadcn/ui, recharts, axios, node-cron)
- [ ] Create Prisma schema (all models above)
- [ ] Set up NextAuth with Credentials provider
- [ ] Create login page
- [ ] Create protected dashboard layout shell (sidebar + header)
- [ ] Create Railway project + add PostgreSQL addon
- [ ] First deploy to Railway (empty shell)

### Day 2 — Basecamp API Client
- [ ] Register OAuth app at Basecamp (see API setup guide)
- [ ] Build OAuth flow: `/setup` page → Basecamp auth → callback → token storage
- [ ] Build typed Basecamp API client (`lib/basecamp/client.ts`)
- [ ] Implement pagination handler (follow `Link` headers)
- [ ] Implement rate limiter (token bucket, 50 req/10s)
- [ ] Implement token auto-refresh (tokens expire every 2 weeks)
- [ ] Test: fetch all projects and log to console

### Day 3 — Sync Engine
- [ ] Build sync orchestrator (`lib/sync/orchestrator.ts`)
- [ ] Implement per-resource syncers: projects → todo_lists → todos → card_tables → columns → cards → schedules → people
- [ ] Implement upsert logic (insert new, update existing by basecamp_id)
- [ ] Add sync logging (SyncLog model)
- [ ] Set up node-cron (every 15 minutes)
- [ ] Test: run full sync, verify data in DB
- [ ] Handle edge cases: archived projects, disabled tools (check `enabled: true` in dock)

### Day 4 — Dashboard Views (Part 1)
- [ ] Dashboard home: summary stats, sync status, key metrics
- [ ] Kanban view: aggregated card columns across all projects
- [ ] To-do progress view: completion bars + overdue table
- [ ] API routes for each view (read from PostgreSQL)

### Day 5 — Dashboard Views (Part 2)
- [ ] Timeline view: calendar/list of schedule entries
- [ ] Workload view: assignments per person (bar chart)
- [ ] Filter components: project selector, assignee selector, date range
- [ ] Wire filters to all views

### Days 6–7 — Polish & Ship
- [ ] Responsive design (tablet/mobile)
- [ ] Loading skeletons + error states
- [ ] Sync failure indicator on dashboard
- [ ] Seed admin users script
- [ ] Final Railway deploy with all env vars
- [ ] Test with leadership team
- [ ] Write README with setup instructions

---

## Rate Limiting Strategy

Basecamp enforces **50 requests per 10 seconds** per OAuth token.

For 30+ projects, a full sync could mean 200–400 API calls:
- 1 call for projects list
- Per project: 1 for todoset, 1+ for todolists, N for todos, 1 for card table, N for columns, N×M for cards, 1 for schedule entries
- 1 call for people

**Strategy:**
1. **Request queue** with token bucket (50 tokens, refill 50 every 10s)
2. **Skip archived/trashed projects** — only sync `status: active`
3. **ETag / Last-Modified caching** — skip unchanged resources on subsequent syncs
4. **Prioritise** — sync most-recently-updated projects first
5. **Exponential backoff** on 429 responses (respect `Retry-After` header)
6. **Parallel per-resource** — sync todos and cards concurrently (share the rate limiter)

Initial full sync: ~5–10 minutes. Subsequent syncs: 1–3 minutes (incremental).

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| API rate limits slow sync | Request queue + incremental sync + ETag caching |
| Card Tables API incomplete | Test card endpoints Day 2; fall back to to-do views |
| OAuth token expires silently | Auto-refresh + sync logging + admin alert on failure |
| Large data volume | Skip archived projects; parallel sync with rate limiting |
| Scope creep | Strict MVP features; defer exports, notifications, webhooks to v2 |

---

## Post-MVP (v2+)

- Basecamp Webhooks for real-time updates (replace polling)
- Email digest (weekly summary to leadership)
- Export to CSV/PDF
- Custom dashboard layouts per user
- Project health scoring (algorithmic)
- Slack integration (daily summary)
- Historical trends (velocity, completion rates)
- SSO integration
