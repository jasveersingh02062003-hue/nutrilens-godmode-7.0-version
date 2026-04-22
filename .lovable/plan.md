

# Two-App Blueprint v3 — Gap Analysis & Build Plan

The user wants every PDF feature inside **this single app** (no separate Lovable project). Below is the honest checklist of what exists vs. what's missing, then a prioritized 5-phase plan.

---

## Part 1 — Checklist (PDF v3 vs current app)

Legend: ✅ done · 🟡 partial · ❌ missing

### Section 6 — Security
| Item | Status | Notes |
|---|---|---|
| `user_roles` table + `has_role()` | ✅ | Working |
| RLS on all 21 tables | ✅ | Verified in schema |
| `audit_logs` table + super-admin read | ✅ | Wired in `src/lib/audit.ts` |
| PII masking in lists + reveal-with-reason | ✅ | `AdminUsers.tsx` reveal modal |
| `marketing_consent` column on profiles | ✅ | Already in profiles |
| `consent_records` per-purpose table | ✅ | Created Phase 1 |

### Section 7 — Staff roles (owner/admin/marketer/support/brand)
| Role | Status | Notes |
|---|---|---|
| `admin` / `super_admin` | ✅ | In enum |
| `brand_manager` | ✅ | Added Phase 1 (PDF calls it `brand`) |
| `owner` | ❌ | Missing from enum |
| `marketer` | ❌ | Missing — needed for export-only access |
| `support` | ❌ | Missing — single-user view, no exports |
| Staff management UI (`/admin/staff`) to assign roles | ❌ | No UI exists |
| Per-role nav visibility (matrix in PDF §7.3) | 🟡 | Sidebar shows all admin items regardless |
| RLS policies referencing new roles | ❌ | Need policies for marketer/support |

### Section 8 — Brand onboarding
| Item | Status |
|---|---|
| Manual brand create (admin) | ✅ |
| `brand_accounts`, `brand_members`, `brand_transactions`, `brand_documents` | ✅ |
| KYC doc upload to private bucket | ✅ |
| Wallet top-up + ledger | ✅ |
| Brand intake form on consumer site (8 questions) | ❌ |
| `/brand/dashboard` self-serve KPIs | ✅ |
| `/brand/campaigns` list/pause/resume/edit | ❌ |
| `/brand/new` campaign wizard | ❌ |
| `/brand/billing` top-up + invoice download | ❌ |
| `/brand/products` submit packed_products | ❌ |

### Section 9 — Ad lifecycle
| Item | Status |
|---|---|
| `select-ads` edge function (server-side ranking) | ✅ |
| Impression / click / conversion tables | ✅ |
| Auto-pause when `budget_spent >= budget_total` | ❌ Missing — flips to paused never enforced |
| Spend pacing card (today vs daily budget) on `/admin/ads/[id]` | ❌ |
| CTR / CR per-campaign detail page `/admin/ads/[id]` | 🟡 List exists; no detail page |

### Section 10 — Cost dashboard
| Item | Status |
|---|---|
| `api_usage` table | ✅ Exists, RLS = admin read |
| Edge functions logging to `api_usage` (analyze-food, monika-chat, firecrawl-prices, scan-receipt) | ❌ None of them insert |
| `/admin/costs` page (today, this month, top user, profit/loss) | ❌ Page doesn't exist |
| Firecrawl credits-left card | ❌ |
| Cost-per-MAU card | ❌ |
| Profit/loss today (revenue − cost) on Overview | ❌ |

### Section 12 — Performance (PDF says "do this BEFORE admin work")
| Bottleneck | Status |
|---|---|
| Route-level lazy-loading for consumer routes | 🟡 Admin routes lazy; consumer Plans/Market/Pantry/Profile not |
| `supabase.channel` cleanup audit | ❓ unverified |
| Dashboard 8+ queries → batched `Promise.all` | ❓ unverified |
| Defer localStorage scan to `requestIdleCallback` | ❌ |
| `useMemo` calorie/PES engines by date+log signature | ❓ unverified |
| `react-window` for >50-item lists (Pantry, history) | ❌ |

### Section 13 — Ops (admin nav)
| Item | Status |
|---|---|
| `/admin/support` (feedback queue) | ✅ AdminFeedback exists |
| Daily/weekly/monthly checklist surface | ❌ No `/admin/ops` page |

### Skipped (per "one app" decision)
- Separate `admin.nutrilens.in` subdomain
- App Store / Play Store wrapping
- Razorpay (deferred until charging starts)

---

## Part 2 — Prioritized build plan (5 phases)

### Phase 6 — Staff roles & nav gating (~1 session) **[foundation]**
1. Migration: extend `app_role` enum with `owner`, `marketer`, `support`. Add `is_marketer()` / `is_support()` helper fns.
2. Update `useAdminRole` hook → return `{ isOwner, isAdmin, isMarketer, isSupport, isBrand }`.
3. `AdminLayout` sidebar — apply PDF §7.3 visibility matrix per role.
4. New page `/admin/staff` — list users with roles, owner-only assign/revoke role UI, writes to `audit_logs.role_change`.
5. RLS: marketer can SELECT profiles (mask still applied client-side); support gets per-row read via target_user_id only on demand.

### Phase 7 — Cost dashboard end-to-end (~1.5 sessions) **[founder visibility]**
6. Add `logApiUsage()` server helper in each edge function (`analyze-food`, `monika-chat`, `firecrawl-prices`, `scan-receipt`, `select-ads`) — INSERT vendor + units + cost_inr + user_id after every external call. Constants for INR/unit live in one shared file.
7. New page `/admin/costs`: cards for today's spend, MTD spend, top user by AI cost, Firecrawl credits left (manual constant for now), cost-per-MAU, profit-today (sum of `event_plans` revenue map − api_usage.cost_inr).
8. Add **Profit today** card to Overview (just reuses queries).
9. `cost_constants` table (admin-editable) for non-API costs (Supabase, WhatsApp) — optional but in scope.

### Phase 8 — Brand portal completion + intake (~2 sessions) **[B2B]**
10. `/brand/campaigns` — list of brand's campaigns, pause/resume buttons, edit budget.
11. `/brand/new` — 5-step wizard (name → targeting → creative → budget → preview → submit). Writes to `ad_campaigns` + `ad_creatives` + `ad_targeting` with brand_id locked.
12. `/brand/billing` — current balance, transactions ledger, invoice PDF generator (per month).
13. `/brand/products` — submit form → row in `packed_products` with `is_verified=false` for admin approval.
14. Public **Brand Intake page** at `/advertise` (consumer-facing, no auth) — 8-question form, submits to `brand_intake` (new table) for admin to convert into a real `brand_accounts` row.

### Phase 9 — Ad lifecycle automation + detail page (~1 session) **[ops]**
15. `/admin/ads/[id]` campaign detail page: funnel, daily spend chart, pacing card (today's spend vs `budget_total/days_left`), creative preview, audit trail.
16. Update `select-ads` edge fn: skip campaigns where `budget_spent >= budget_total` and auto-update `status='paused'` atomically when threshold crossed.
17. Cron-triggered edge function `nightly-ad-health` (pg_cron `0 0 * * *`): pause overspent, alert via `feedback`-style queue when CTR < 0.3%.

### Phase 10 — Performance hardening + Ops page (~1.5 sessions) **[PDF §12]**
18. Lazy-load consumer routes: Plans, Market, Pantry, Profile, Progress, MealPlanner.
19. Audit every `supabase.channel(...).subscribe()` — add `removeChannel` in cleanup.
20. Batch Dashboard mount queries into a single `Promise.all`; verify with React Profiler.
21. `useMemo` calorie/PES engines keyed on `(date, logHash)`.
22. `react-window` for Pantry list and Food Archive when >50 items.
23. New page `/admin/ops` — read-only checklist mirroring PDF §13.1/§13.2/§13.3 with live "✓ done today" markers driven by `audit_logs` events (e.g., "exported segment today" = green).

---

## Part 3 — Technical notes

- **Roles**: enum-extension migrations are non-destructive but irreversible — add all four (`owner`, `marketer`, `support`) in one transaction.
- **Cost logging contract**: every edge function will call a shared `logApiUsage(supabase, {vendor, endpoint, units, cost_inr, user_id, metadata})` helper colocated in `supabase/functions/_shared/api-usage.ts`.
- **Brand intake**: consumer-facing `/advertise` route uses anon insert into a new `brand_intake` table (RLS: anon insert allowed, only admins read).
- **Auto-pause**: handled both reactively (in `select-ads` before serving) and proactively (nightly cron) for safety.
- **Performance**: lazy routes wrap in `<Suspense>` with the existing `PageTransition` skeleton.
- **No new app**: every page lives under `/admin/*`, `/brand/*`, or one consumer `/advertise` route.

---

## Part 4 — What ships per phase

Each phase = approved migration (where needed) + edits + working UI. Stoppable boundary after every phase.

**Recommendation**: approve **Phase 6 + 7 together** (roles + cost dashboard) — biggest founder-visibility win. Then iterate.

