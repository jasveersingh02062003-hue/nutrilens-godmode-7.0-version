

# Step-by-Step Guide: Create the NutriLens Admin App

You're about to create a **second Lovable project** that shares this same backend database. Here's exactly what to do, in order, plus the master prompt to paste into the new project.

---

## Part 1 — What you do (in Lovable UI, takes 5 minutes)

### Step 1: Create the new project
1. Go to your Lovable dashboard (lovable.dev)
2. Click **"+ New Project"** (top right)
3. Name it: **`nutrilens-admin`**
4. When the new project opens, **don't type anything yet** — go to Step 2 first

### Step 2: Connect it to THIS SAME backend (critical)
The admin app must read/write the same database as your consumer app. Two options:

**Option A — Easiest (recommended): Remix this project**
- Right-click this project in your dashboard → **Remix**
- Name the remix `nutrilens-admin`
- It auto-inherits the same Lovable Cloud database
- Then in the first prompt, tell it to **delete all consumer pages** and build only admin
- ✅ Pro: Same DB instantly, types already generated
- ❌ Con: You start with consumer code to delete (~5 min cleanup)

**Option B — Fresh project + manual link**
- Create blank project
- In first prompt, give it these credentials to use:
  - Supabase URL: `https://yowgmqdcmgaiaqjgifzh.supabase.co`
  - Anon key: `eyJhbGc...` (the VITE_SUPABASE_PUBLISHABLE_KEY from this project's `.env`)
- ✅ Pro: Clean slate, no cleanup
- ❌ Con: Lovable Cloud may try to provision a *new* DB — you must explicitly tell it not to

**My recommendation: Option A (Remix).** Faster, safer, types stay in sync.

### Step 3: After admin app is built, set the admin role on yourself
Come back to **this project's** chat (consumer app) and tell me: *"Add me as admin, my email is X"* — I'll insert one row into `user_roles`. The admin app will then let you in; everyone else gets blocked.

### Step 4: Custom domain (later, after testing)
- In the admin project: Settings → Domains → Add `admin.nutrilens.in`
- Consumer app stays at `app.nutrilens.in`
- Both hit the same Supabase backend — zero sync code needed (Postgres IS the sync layer)

---

## Part 2 — How sync works (no code needed)

```text
┌──────────────────┐         ┌──────────────────┐
│  Consumer App    │         │   Admin App      │
│  app.nutrilens.in│         │ admin.nutrilens.in│
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │   Same Supabase URL + Key  │
         └─────────────┬──────────────┘
                       ▼
         ┌─────────────────────────────┐
         │   Supabase (single DB)      │
         │   - profiles, daily_logs    │
         │   - ad_campaigns, etc.      │
         │   - user_roles (gate)       │
         └─────────────────────────────┘
```

- User logs a meal in consumer app → row in `daily_logs`
- Admin opens dashboard → reads `daily_logs` → number updates
- **Realtime updates** via `supabase.channel().on('postgres_changes')` — zero polling needed
- **Zero risk to consumer app speed** — admin code never ships to user phones

---

## Part 3 — The Master Prompt (paste this into the new admin project)

Copy everything between the lines below into your new admin project's first message:

---

```
Build NutriLens Admin — a separate admin dashboard that connects to the EXISTING Supabase backend of my consumer app. Do NOT provision a new database. Use these exact credentials in the Supabase client:

- Supabase URL: https://yowgmqdcmgaiaqjgifzh.supabase.co
- Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvd2dtcWRjbWdhaWFxamdpZnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMTcwOTIsImV4cCI6MjA5MDc5MzA5Mn0.xORyGJhUu315a0RKJD75YJJ-wRV3mLw-9ixyuhjRMEc

Existing tables I will read/write: profiles, daily_logs, weight_logs, water_logs, supplement_logs, event_plans, monika_conversations, ad_campaigns, ad_creatives, ad_impressions, ad_clicks, ad_conversions, ad_targeting, ad_placements, brand_accounts, packed_products, city_prices, price_reports, price_alerts, user_roles, user_achievements.

Existing role function: has_role(auth.uid(), 'admin'::app_role) returns boolean. Use this to gate every page.

=== ARCHITECTURE RULES ===
1. Single login at /login — same Supabase auth as consumer app.
2. After login, immediately call has_role(auth.uid(), 'admin'). If false, sign out and show "Access denied — admins only".
3. Wrap every route in <RequireAdmin> component. No exceptions.
4. Never use service_role key on the client. For any privileged operation, use an edge function with service_role.
5. Mask PII (email, phone) in lists by default — show "j***@gmail.com" — reveal only on click, and log the reveal to an audit_logs table.

=== PAGES TO BUILD (in this order) ===

PAGE 1: /login
- Email + password sign in (same auth as consumer)
- After login, role check, redirect to /dashboard

PAGE 2: /dashboard (Overview)
KPI cards (top row):
  - Total users (count from profiles)
  - DAU today (distinct user_id from daily_logs where log_date = today)
  - MAU last 30 days (distinct user_id from daily_logs where log_date >= today-30)
  - Onboarding completion % (count where onboarding_complete = true / total)
  - Revenue today (sum from event_plans where created_at = today AND status = active)
Charts:
  - DAU line chart, last 30 days (Recharts LineChart)
  - Signups by day, last 14 days (Recharts BarChart)
  - Top 5 cities by user count (Recharts horizontal bar)
Use 60-second auto-refresh (setInterval).

PAGE 3: /users
- Searchable, paginated table (50 per page)
- Columns: name, email (masked), city, signup date, last active, onboarding status, plan
- Filters: city dropdown, has paid plan (yes/no), inactive 7d, inactive 30d
- Click row → /users/:id detail drawer with full profile, recent meals, weight trend
- "Export CSV" button — only visible to role 'super_admin' (add to user_roles enum). Logs to audit_logs.

PAGE 4: /retention
- Cohort table: rows = signup week, columns = week 1, 2, 3, 4 retention %
- SQL: for each signup_week, count users who logged a meal in week N
- Heatmap colors (green = high retention, red = low)

PAGE 5: /ads
Sub-tabs:
  a) Campaigns — table from ad_campaigns, status toggle, edit budget
  b) Creatives — gallery from ad_creatives with image preview, headline, CTR
  c) Performance — funnel chart: impressions → clicks (CTR%) → conversions (CVR%)
  d) Brands — table from brand_accounts, balance, "Add credit" button
Per-campaign detail page: line chart of impressions/clicks/day, top placements, top cities.

PAGE 6: /plans
- Table from event_plans: user, plan_type, start_date, end_date, status
- Filter by plan_type (madhavan, sugar_cut, gym_sprint, celebrity)
- Churn risk indicator: red dot if user hasn't logged in 3+ days

PAGE 7: /marketing
- Pre-built segments (each shows count + "Export CSV" button):
  - Inactive 7 days
  - Inactive 30 days
  - Completed onboarding but never logged a meal
  - On paid plan, expiring in 7 days
  - High protein-gap users (last 7 days avg)
- Every export goes through edge function `export-segment`, requires marketing_consent = true on profile, logs to audit_logs.

PAGE 8: /finance
KPI cards:
  - MRR (sum of active event_plans / 30 * plan duration)
  - Revenue this month
  - API costs this month (from api_usage table — see below)
  - Net margin
Stacked bar: revenue vs costs by day, last 30 days
Cost breakdown pie: Firecrawl, Lovable AI, WhatsApp, Supabase

PAGE 9: /support
- Table from feedback table (create new): user, message, status (open/resolved), created_at
- Reply box → sends email via Resend edge function (later)
- Sentry crash log embed (later)

PAGE 10: /audit
- Read-only view of audit_logs (super_admin only)
- Filters: actor, action_type, date range
- Shows who viewed/exported what PII and when

=== NEW TABLES TO CREATE (via migration in this project — they go to the SAME shared DB) ===

1. audit_logs (id uuid pk, actor_id uuid, action text, target_user_id uuid, target_table text, metadata jsonb, created_at timestamptz default now()). RLS: only super_admin can read.

2. api_usage (id uuid pk, vendor text check in ('firecrawl','lovable_ai','whatsapp','supabase'), units numeric, cost_inr numeric, metadata jsonb, created_at timestamptz default now()). RLS: only admin can read. Inserts come from edge functions.

3. feedback (id uuid pk, user_id uuid, message text, status text default 'open', resolved_by uuid, resolved_at timestamptz, created_at timestamptz default now()). RLS: users insert own; admins read all.

4. marketing_consent column on profiles (boolean default false) — DO NOT ADD if already exists. Check first.

5. Add 'super_admin' value to app_role enum.

=== STACK & STYLING ===
- React + Vite + TypeScript (Lovable default)
- Tailwind + shadcn/ui (already in template)
- Recharts for all charts
- Tanstack Query for data fetching with 60s staleTime
- Use Supabase Realtime for the dashboard KPIs (postgres_changes on daily_logs, profiles, event_plans)
- Layout: left sidebar nav (collapsible), top bar with user menu + sign out
- Dark mode default — admins work long hours
- Mobile-responsive but desktop-first (admins use laptops)

=== WHAT NOT TO DO ===
- Do NOT add any consumer-facing pages (no meal logger, no Monika chat, no market)
- Do NOT modify existing tables' RLS policies — only ADD new policies for admin reads using has_role()
- Do NOT call OpenAI / Lovable AI from the admin app — admin is read-mostly
- Do NOT ship the service_role key to client — only use in edge functions
- Do NOT add realtime subscriptions on /users page (too many users) — only on /dashboard top metrics

=== FIRST DELIVERABLE ===
Build only Pages 1, 2, 3 + the audit_logs table + RequireAdmin wrapper. Stop and let me verify before continuing. Then we'll build pages 4-10 in priority order I choose.

Show me the file plan first, then build.
```

---

## Part 4 — After the admin app is created (back here)

Once you've pasted that prompt and the admin app is live, come back to **this** consumer project and tell me:

1. **"Add me as admin, my email is `<your-email>`"** — I'll run one INSERT into `user_roles`.
2. **"Add admin RLS policies for tables X, Y, Z"** — I'll add `USING (has_role(auth.uid(), 'admin'))` policies so the admin app can read data from all users (currently RLS only lets users see their own rows).
3. **"Run the performance audit"** — fix the consumer app slowness you mentioned, in parallel.

---

## Cost summary

| Item | Cost |
|---|---|
| Creating new Lovable project | Free (uses your existing Lovable plan) |
| Building admin (estimate) | ~30-50 Lovable credits |
| Hosting admin app | Free on Lovable subdomain; ~$0 on custom domain |
| Database (shared) | ₹0 extra — same Supabase project |
| Custom domain `admin.nutrilens.in` | Whatever you pay your registrar (~₹800/yr) |
| **Monthly running cost addition** | **₹0** |

---

## Recap — exactly what to do now

1. **Dashboard → Remix this project → name it `nutrilens-admin`** (Option A from Step 2)
2. **Open the new project** and paste the master prompt above
3. **Wait for first deliverable** (login + dashboard + users page)
4. **Come back here** and ask me to add you as admin
5. **Test admin login** at the new project's preview URL
6. **Continue building** pages 4-10

