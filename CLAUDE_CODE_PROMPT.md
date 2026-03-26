# Initial Claude Code Prompt

Copy and paste this entire prompt into your first Claude Code session after creating the project directory.

---

## Prompt

```
I'm building a Basecamp 3 Visibility Dashboard for my organisation's leadership team. Read the plan.md file in this directory first — it has the full tech stack, database schema, project structure, and architecture.

Here's what I need you to set up in this first session:

## 1. Project Scaffolding

Create a Next.js 14 project with:
- TypeScript (strict mode)
- App Router (not Pages Router)
- Tailwind CSS
- ESLint
- `src/` directory: NO — use root-level `app/` directory

Install these dependencies:
- prisma + @prisma/client (ORM)
- next-auth (v4, auth)
- axios (HTTP client for Basecamp API)
- node-cron + @types/node-cron (scheduled sync)
- recharts (charts)
- bcryptjs + @types/bcryptjs (password hashing)
- date-fns (date formatting)
- zod (validation)

Install and initialise shadcn/ui with these components: button, card, input, label, badge, table, tabs, select, separator, skeleton, dropdown-menu, avatar, progress, sheet

## 2. Prisma Schema

Create the full Prisma schema from plan.md. Use PostgreSQL as the provider. Include all models: User, BasecampToken, Project, TodoList, TodoItem, CardTable, CardColumn, Card, ScheduleEntry, Person, SyncLog.

Generate the Prisma client and create a singleton in `lib/db.ts`.

## 3. Authentication

Set up NextAuth.js v4 with:
- Credentials provider (email + password, verified with bcryptjs)
- JWT strategy (not database sessions)
- Session callback that includes user id and role
- Auth config in `lib/auth.ts`
- API route at `app/api/auth/[...nextauth]/route.ts`

Create a `middleware.ts` that:
- Protects all routes under `/` (the dashboard)
- Allows `/login`, `/setup`, `/api/auth`, and `/api/basecamp` through
- Redirects unauthenticated users to `/login`

Create a login page at `app/login/page.tsx` — clean, centered card with email + password fields using shadcn/ui components.

## 4. Prisma Seed Script

Create `prisma/seed.ts` that creates a default admin user:
- Email: admin@company.com
- Password: changeme123 (hashed with bcryptjs)
- Name: Admin
- Role: admin

Configure the seed command in package.json.

## 5. Dashboard Layout

Create the protected dashboard layout at `app/(dashboard)/layout.tsx` with:
- A collapsible sidebar with navigation links: Home, Kanban, To-Dos, Timeline, Workload
- Use lucide-react icons for each nav item (LayoutDashboard, Kanban, CheckSquare, Calendar, Users)
- A top header showing "Basecamp Dashboard" title and last sync timestamp
- A user avatar/dropdown in the top right with sign out option
- Responsive: sidebar collapses to hamburger on mobile

Create placeholder pages for each route:
- `app/(dashboard)/page.tsx` — Home
- `app/(dashboard)/kanban/page.tsx` — Kanban
- `app/(dashboard)/todos/page.tsx` — To-Dos
- `app/(dashboard)/timeline/page.tsx` — Timeline
- `app/(dashboard)/workload/page.tsx` — Workload

Each placeholder should show a loading skeleton and a "Coming soon" message.

## 6. Basecamp API Client

Create `lib/basecamp/client.ts`:
- A BasecampClient class that handles authenticated requests
- Constructor takes access_token
- Adds `Authorization: Bearer {token}` and `User-Agent: BasecampDashboard (admin@company.com)` headers
- Base URL: `https://3.basecampapi.com/5402506`
- Method: `get(path)` that returns typed JSON
- Handles pagination automatically by following `Link` headers (rel="next")
- Returns all pages concatenated into a single array

Create `lib/basecamp/rate-limiter.ts`:
- Token bucket rate limiter
- 50 tokens max, refill 50 every 10 seconds
- `await rateLimiter.acquire()` before each request
- If empty, wait until tokens are available

Create `lib/basecamp/types.ts` with TypeScript interfaces for Basecamp API responses:
- BasecampProject (id, status, name, description, dock, url, app_url)
- BasecampTodo (id, status, title, content, due_on, starts_on, completed, assignees, app_url)
- BasecampTodoList (id, status, name, description, completed_ratio, app_url)
- BasecampCardTable, BasecampCardColumn, BasecampCard
- BasecampScheduleEntry (id, summary, starts_at, ends_at, all_day, assignees, app_url)
- BasecampPerson (id, name, email_address, avatar_url, admin, company)
- BasecampDock (with tool entries including id, title, name, enabled)

Create `lib/basecamp/endpoints.ts` with helper functions:
- getProjects() — GET /projects.json (paginated)
- getTodoSet(projectId, todoSetId) — used to find todoset from dock
- getTodoLists(projectId, todoSetId) — GET /buckets/{id}/todosets/{id}/todolists.json
- getTodos(projectId, todoListId) — GET /buckets/{id}/todolists/{id}/todos.json
- getCardTableColumns(projectId, cardTableId) — GET /buckets/{id}/card_tables/{id}/columns.json
- getCards(projectId, columnId) — GET /buckets/{id}/card_tables/lists/{id}/cards.json
- getScheduleEntries(projectId, scheduleId) — GET /buckets/{id}/schedules/{id}/entries.json
- getPeople() — GET /people.json (paginated)

## 7. OAuth Setup Flow

Create `app/setup/page.tsx`:
- A page that checks if BasecampToken exists in DB
- If yes: show "Already connected to Basecamp" with a "Reconnect" button
- If no: show a "Connect to Basecamp" button
- The button links to: `https://launchpad.37signals.com/authorization/new?type=web_server&client_id={BASECAMP_CLIENT_ID}&redirect_uri={BASECAMP_REDIRECT_URI}`

Create `app/api/basecamp/callback/route.ts`:
- Receives the `code` query parameter from Basecamp's redirect
- Exchanges code for access_token + refresh_token via POST to `https://launchpad.37signals.com/authorization/token`
- Stores tokens in BasecampToken table (upsert — only one row ever)
- Redirects to `/setup` with success message

Create `lib/basecamp/auth.ts`:
- `getValidToken()` function that reads BasecampToken from DB
- If token is expired (2-week lifetime), auto-refresh via POST to `https://launchpad.37signals.com/authorization/token` with `type=refresh`
- Returns a fresh access_token string

## 8. Environment Variables

Create `.env.example` with all required variables (see plan.md).
Create `.env` with placeholder values.

## 9. Railway Config

Create `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": { "startCommand": "npx prisma migrate deploy && npm start", "restartPolicyType": "ON_FAILURE" }
}
```

## 10. README

Create a README.md with:
- Project overview (1 paragraph)
- Tech stack list
- Prerequisites (Node 18+, Railway account, Basecamp admin)
- Local development setup instructions
- Environment variables table
- Railway deployment steps
- How to run the Basecamp OAuth setup

---

Important notes:
- Use the App Router pattern (server components by default, "use client" only where needed)
- Use server actions or API routes for mutations, not client-side fetch to Basecamp
- Every dashboard page should be a server component that fetches data from Prisma directly
- The Basecamp API client is server-side only — never exposed to the browser
- Use proper error boundaries and loading.tsx files for each route
- Make the UI clean, professional, and dark-mode compatible using shadcn/ui theming
```

---

## How to Use

1. Create your project directory:
   ```bash
   mkdir basecamp-dashboard && cd basecamp-dashboard
   ```

2. Copy `plan.md` into the directory

3. Launch Claude Code:
   ```bash
   claude
   ```

4. Paste the prompt above

5. Claude Code will scaffold the entire project. Once done:
   ```bash
   # Install dependencies
   npm install

   # Set up your .env with real values (see Basecamp API setup guide)

   # Generate Prisma client
   npx prisma generate

   # Push schema to local DB (or Railway DB)
   npx prisma db push

   # Seed admin user
   npx prisma db seed

   # Run locally
   npm run dev
   ```

---

## Follow-Up Prompts (Days 2–7)

After the initial scaffold, use these prompts in subsequent Claude Code sessions:

**Day 3 — Sync Engine:**
```
Read plan.md. Now build the sync engine in lib/sync/. Create an orchestrator that:
1. Gets a valid Basecamp token (auto-refresh if expired)
2. Fetches all active projects
3. For each project, reads the dock to find todoset, kanban_board, and schedule tool IDs
4. Syncs todo_lists → todos, card_tables → columns → cards, schedule_entries, and people
5. Uses upsert (insert or update by basecamp_id)
6. Logs everything to SyncLog
7. Respects the rate limiter
8. Set up node-cron to run this every 15 minutes
9. Add a manual trigger at POST /api/sync
```

**Day 4 — Dashboard Home + Kanban + Todos:**
```
Read plan.md. Build the dashboard pages:
1. Home page: query Prisma for total projects, total todos, total cards, overdue counts, cards-by-column distribution, last sync log. Use shadcn cards + recharts for charts.
2. Kanban page: query all card_tables → columns → cards. Render as a horizontal scrollable Kanban board grouped by project. Add filters for project and assignee.
3. Todos page: query all todo_lists with completion ratios + all overdue todos. Show progress bars per list and a sortable table of overdue items.
All pages should be server components reading from Prisma. Add loading.tsx skeletons for each.
```

**Day 5 — Timeline + Workload:**
```
Read plan.md. Build remaining dashboard views:
1. Timeline page: query schedule_entries ordered by starts_at. Show as a vertical timeline or calendar grid. Colour-code by project. Flag past-due entries.
2. Workload page: query all open todos + cards grouped by assignee (join with people table). Show bar chart with recharts. Add drill-down: click a person to see their assignments.
3. Add a global FilterBar component with project multi-select and date range picker. Wire to all pages via URL search params.
```

**Days 6–7 — Polish:**
```
Read plan.md. Final polish:
1. Make all pages responsive (mobile sidebar → sheet, tables → cards on mobile)
2. Add proper error boundaries with retry buttons
3. Add a sync status indicator in the header (green dot if last sync succeeded within 30 min, yellow if >30 min, red if failed)
4. Add click-through links on all items (open in Basecamp in new tab using app_url)
5. Add a /api/sync manual trigger button in the header for admins
6. Test and fix any TypeScript errors
```
