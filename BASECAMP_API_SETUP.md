# Basecamp API Access — Step-by-Step Setup Guide

This guide walks you through getting Basecamp 3 API access for the Visibility Dashboard. You need admin access to your Basecamp account (`https://3.basecamp.com/5402506/`).

---

## Step 1: Sign In to the 37signals Launchpad

1. Open your browser and go to:
   **https://launchpad.37signals.com/integrations**

2. Sign in with your **Basecamp admin credentials** (the same email/password you use to log into `3.basecamp.com`)

3. If you have multiple 37signals products (Basecamp, HEY, etc.), you'll see them all — that's fine, you're in the right place.

---

## Step 2: Register a New Application

1. On the integrations page, click **"Register another application"** (or "Register one now" if this is your first)

2. Fill in the form:

   | Field | What to Enter |
   |---|---|
   | **Name of your application** | `Leadership Dashboard` (or any name you like) |
   | **Your company's name** | Your actual company name |
   | **Your website URL** | `https://your-company.com` (your company website) |
   | **Products** | Check **Basecamp 3** (this is important — select the right product) |
   | **Redirect URI** | `http://localhost:3000/api/basecamp/callback` |

   > **Note on Redirect URI:** Start with `http://localhost:3000/api/basecamp/callback` for local development. You'll update this later after deploying to Railway.

3. Click **"Register this app"**

---

## Step 3: Save Your Credentials

After registration, you'll be shown your application details page with two critical values:

- **Client ID** — a long string like `abc123def456...`
- **Client Secret** — another long string

**Save both of these immediately.** You'll need them for your `.env` file.

Copy them into your project's `.env` file:

```env
BASECAMP_CLIENT_ID=your_client_id_here
BASECAMP_CLIENT_SECRET=your_client_secret_here
BASECAMP_ACCOUNT_ID=5402506
BASECAMP_REDIRECT_URI=http://localhost:3000/api/basecamp/callback
```

---

## Step 4: Set Up the Rest of Your Environment Variables

Generate a NextAuth secret (run this in your terminal):

```bash
openssl rand -base64 32
```

Complete your `.env` file:

```env
# Basecamp OAuth
BASECAMP_ACCOUNT_ID=5402506
BASECAMP_CLIENT_ID=your_client_id_here
BASECAMP_CLIENT_SECRET=your_client_secret_here
BASECAMP_REDIRECT_URI=http://localhost:3000/api/basecamp/callback

# Database (use Railway's PostgreSQL URL, or a local one for dev)
DATABASE_URL=postgresql://postgres:password@localhost:5432/basecamp_dashboard

# NextAuth
NEXTAUTH_SECRET=your_generated_secret_here
NEXTAUTH_URL=http://localhost:3000

# Sync
SYNC_INTERVAL_MINUTES=15
```

---

## Step 5: Run the OAuth Flow (First Time Only)

Once your app is running locally:

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open **http://localhost:3000/setup** in your browser

3. Click **"Connect to Basecamp"**

4. You'll be redirected to Basecamp's authorization page. It will say something like:
   > "Leadership Dashboard wants to access your Basecamp account"

5. Click **"Yes, I'll allow access"**

6. Basecamp redirects you back to your app at `http://localhost:3000/api/basecamp/callback?code=XXXXX`

7. Your app exchanges the code for an **access_token** and **refresh_token**, and stores them in the database

8. You'll see a success message on the `/setup` page: "Connected to Basecamp!"

**That's it — your app now has API access.** The access token lasts 2 weeks, and the app auto-refreshes it using the refresh token.

---

## Step 6: Test the API Connection

Run a quick test to confirm everything works. You can hit this endpoint in your browser or terminal:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "User-Agent: LeadershipDashboard (your-email@company.com)" \
     https://3.basecampapi.com/5402506/projects.json
```

You should see a JSON array of all your Basecamp projects. If you see them, the API connection is working.

Alternatively, once the sync engine is built (Day 3), just trigger a manual sync from the dashboard and check the sync logs.

---

## Step 7: Update Redirect URI for Production (After Railway Deploy)

Once you deploy to Railway and get your production URL (e.g., `https://basecamp-dashboard-production.up.railway.app`):

1. Go back to **https://launchpad.37signals.com/integrations**

2. Click on your **"Leadership Dashboard"** application

3. Update the **Redirect URI** to:
   ```
   https://basecamp-dashboard-production.up.railway.app/api/basecamp/callback
   ```

4. Save the changes

5. Update your Railway environment variables:
   ```
   BASECAMP_REDIRECT_URI=https://basecamp-dashboard-production.up.railway.app/api/basecamp/callback
   NEXTAUTH_URL=https://basecamp-dashboard-production.up.railway.app
   ```

6. Re-run the OAuth flow on production by visiting `/setup` on your production URL

---

## Important API Rules to Know

**User-Agent header is required.** Every API request must include a User-Agent header with your app name and contact email. Without it, you'll get a `400 Bad Request`. Format:
```
User-Agent: LeadershipDashboard (your-email@company.com)
```

**Rate limit: 50 requests per 10 seconds.** If you exceed this, you'll get a `429 Too Many Requests` response with a `Retry-After` header. The sync engine handles this automatically.

**Access tokens expire every 2 weeks.** Use the refresh token to get a new access token without re-authorizing. The app does this automatically in `lib/basecamp/auth.ts`.

**Pagination uses Link headers.** Basecamp uses the RFC 5988 `Link` header pattern. The first page returns 15 results, page 2 returns 30, page 3 returns 50, and page 4+ returns 100. Always follow the `rel="next"` link until there is none.

**JSON responses, snake_case keys.** All responses are JSON with snake_case field names. Send `Content-Type: application/json; charset=utf-8` for POST/PUT requests.

**Check `enabled: true` in the dock.** Not all projects have all tools enabled. When you fetch a project, check its `dock` array and only sync tools where `enabled: true`. Tool names: `todoset`, `kanban_board`, `schedule`.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `400 Bad Request` on API calls | Add `User-Agent` header with app name + email |
| `401 Unauthorized` | Token expired — refresh it, or re-run OAuth flow at `/setup` |
| `403 Forbidden` | Your Basecamp user may not have access to that project — use an admin account |
| `404 Not Found` | Resource deleted, archived, or you lack permissions. Also check if account is active |
| `429 Too Many Requests` | Rate limited — wait for `Retry-After` seconds, then retry |
| OAuth callback fails | Check redirect URI matches exactly (including trailing slash) between Launchpad and your `.env` |
| Can't see card tables | Verify the project has Card Tables enabled (`kanban_board` in dock with `enabled: true`) |
| Pagination seems incomplete | Follow the `Link` header `rel="next"` — don't build URLs manually |

---

## Quick Reference: OAuth URLs

| Purpose | URL |
|---|---|
| Register app | `https://launchpad.37signals.com/integrations` |
| Authorization | `https://launchpad.37signals.com/authorization/new?type=web_server&client_id={ID}&redirect_uri={URI}` |
| Token exchange | `POST https://launchpad.37signals.com/authorization/token` |
| Token refresh | `POST https://launchpad.37signals.com/authorization/token` (with `type=refresh`) |
| Get auth info | `GET https://launchpad.37signals.com/authorization.json` |
| API base | `https://3.basecampapi.com/5402506/` |
