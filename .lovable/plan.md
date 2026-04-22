

# NutriLens Admin — Blueprint Gap Analysis & Build Plan

Goal: implement every PDF feature **inside this app** under `/admin/*` (no separate project). Below is a brutally honest checklist + prioritized plan.

---

## Part 1 — Feature checklist (PDF vs current app)

Legend: ✅ done · 🟡 partial · ❌ missing

### Pages (PDF §4)

| # | Page | Status | Notes |
|---|------|--------|-------|
| 0 | `/admin` login + role gate | ✅ | `RequireAdmin` + `useAdminRole` working |
| 1 | `/overview` (12-card KPI grid + sparklines) | 🟡 | 6 cards exist; missing DAU, MAU, stickiness %, onboarding %, avg meals/user, top city, sparklines, deltas |
| 2 | `/users` (search + filters + bulk actions + masked PII) | 🟡 | List exists; no masking, no filters (city/age/goal/inactive), no segments, no CSV export, no Meta hash export |
| 3 | `/users/:id` (360° view) | 🟡 | Page exists; needs 30-day timeline, plan history, Monika chat, refund/extend/reset actions |
| 4 | `/retention` (cohorts + funnel) | 🟡 | Stub only; missing D1/D3/D7/D14/D30 cohort grid + activation funnel |
| 5 | `/revenue` (plans + churn risk + ARPU) | 🟡 | Basic; missing churn-risk list, ARPU/ARPPU, plan price map |
| 6 | `/ads` (funnel + CPM/CPC/ROI) | 🟡 | Campaign list exists; missing impression→click→conversion funnel chart, CTR, eCPM/eCPC, ROI per campaign |
| 7 | `/brands` (KYC + balance + invoices + members) | 🟡 | List exists; missing KYC docs, wallet top-up, transactions, brand_members, invoice PDF |
| 8 | `/scraping` (Firecrawl + city_prices health) | ✅ | Working |
| 9 | `/audit` (every PII view/export/role change) | 🟡 | Page exists; not all PII reads/exports write log rows yet |

### Cross-cutting (PDF §6, §8, §10)

| Item | Status |
|---|---|
| DPDP consent table + capture per purpose | ❌ |
| PII reveal-with-reason flow → audit log | ❌ |
| Meta Custom Audience SHA-256 CSV export | ❌ |
| User segments (churn risk, lapsed, brand-targetable) | ❌ |
| `events` analytics table + fire-and-forget logger | ❌ |
| `brand_members`, `brand_transactions`, `brand_documents` tables | ❌ |
| Brand portal pages (`/brands/portal/*`) for `brand_manager` role | ❌ |
| `select-ads` edge function (server-side ad selection) | ❌ |
| `brand_manager` role added to `app_role` enum | ❌ |
| Plan-price map for revenue calc | ❌ |
| Lazy-loading of admin routes (perf, PDF §3) | 🟡 |

### Skipped intentionally (per your "one app" decision)

- Separate `admin.nutrilens.com` subdomain, IP allow-list, Cloudflare WAF — not applicable while embedded.
- Razorpay integration — out of scope until you decide on payments.

---

## Part 2 — Prioritized build plan (5 phases)

Ordered so each phase ships value standalone and unblocks the next.

### Phase 1 — Foundation & audit hygiene (must-have, ~1 session)
1. **DB migration**: add `events` table + indexes; add `brand_manager` to `app_role` enum; add `consent_records`, `brand_members`, `brand_transactions`, `brand_documents` tables with RLS.
2. **Audit everywhere**: helper `logPIIReveal()` called from every place admin reveals raw email/phone or exports CSV.
3. **Lazy-load admin routes** in `App.tsx` so admin code never enters the consumer bundle.

### Phase 2 — Overview becomes useful (~1 session)
4. Rebuild `/admin/overview` as a 4×3 KPI grid with sparklines + 7-day deltas: signups, DAU, MAU, DAU/MAU %, onboarding %, avg meals/user, active paid plans, new paid plans today, est. revenue today, ad revenue today, top city, open feedback.
5. Each card uses one SQL aggregation (recharts sparkline; 60s poll).

### Phase 3 — Users workhorse + DPDP marketing (~1–2 sessions)
6. `/admin/users` rebuild: server-side filter (city, gender, age band, goal, signup window, inactive ≥ N days, paid plan), masked email/phone in list, "Reveal" modal requires reason → writes audit log.
7. Bulk actions: **Export CSV**, **Save as segment**, **Export for Meta (SHA-256 hashed)**.
8. `/admin/users/:id` 360°: profile snapshot + 30-day meal/weight/water/supplement timeline + plan history + Monika chat thread + actions (extend plan, reset onboarding, mark refund).

### Phase 4 — Retention, revenue, ads cockpit (~2 sessions)
9. `/admin/retention`: weekly-cohort D1/D3/D7/D14/D30 heatmap + activation funnel (signup → onboarded → first meal → 7-day-active → paid).
10. `/admin/revenue`: active plans by type, churn-risk list (paid + no log >3d), ARPU/ARPPU, daily revenue chart from plan-price map.
11. `/admin/ads` cockpit: funnel chart (impressions → clicks → conversions), CTR, eCPM, eCPC, per-campaign ROI table, budget utilization + days remaining.

### Phase 5 — B2B brand portal + ad-serving edge (~2–3 sessions)
12. `/admin/brands` upgrade: KYC doc upload (private storage bucket `brand-kyc`), wallet top-up form, transactions ledger, members list, invoice-PDF generator.
13. New routes `/brand/*` (gated by `brand_manager` role) for self-serve brand portal: dashboard, campaigns wizard, creatives, targeting, insights, billing.
14. Edge function `select-ads`: server-side eligible-campaign query + weighted pick + impression log; replace client-side `useAdServing` selection.
15. Migrate consumer ad placements to call `select-ads`.

---

## Part 3 — Technical notes

- **Routing**: keep all under `/admin/*` (and `/brand/*` for portal) gated by `RequireAdmin` / `RequireBrand`. Wrap each page in `React.lazy()` so the consumer bundle is unaffected.
- **Security**: every new admin table gets RLS using existing `has_role(auth.uid(), 'admin'|'super_admin')`. Brand portal tables use `is_brand_member(auth.uid(), brand_id)` security-definer fn.
- **PII**: list endpoints return masked fields; full PII only via a dedicated RPC that requires a `reason` string and writes `audit_logs`.
- **Meta export**: client-side SHA-256 of lowercased emails / E.164 phones, downloads single-column CSV; the export action itself is logged.
- **Performance**: lazy-load admin + brand bundles; admin queries paginated server-side (50 rows) to avoid hitting the 1000-row Supabase default.
- **Feedback page** already exists in code — keep it under `/admin/feedback` (it's not in the PDF but valuable, no harm).

---

## Part 4 — What I will deliver per phase

Each phase = one approved migration (if needed) + one set of file edits + working UI. After each phase you can stop and ship; nothing is half-built across phases.

**Recommendation**: approve Phase 1 + 2 together (foundation + visible overview win), then we iterate.
