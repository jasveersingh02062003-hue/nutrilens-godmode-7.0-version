# NutriLens AI — Progress Report & Continuation Plan

> Save this whole document as `PROGRESS_REPORT.md` in the project root.
> When you come back, paste the **RESUME PROMPT** at the bottom into a new Lovable chat and work continues from exactly here.

---

## 1. Where the project stands today

**Stage:** Pre-launch, planning closed beta (≤500 users)
**Stack:** React 18 + Vite + TS + Tailwind + Lovable Cloud (Supabase) + Capacitor + Lovable AI Gateway + Paddle (sandbox)
**Overall completion estimate: ~72%** for a production-grade closed-beta launch.

Note on the four-app request ("consumer app, admin app, partner app, customer intelligence on localhost"): this Lovable project currently contains **one unified web app** that includes the consumer experience, an `/admin/*` panel, and a `/brand/*` partner panel under the same codebase and same Lovable preview URL. There is no separate Zesti partner app or customer intelligence app in this repo. Lovable runs the preview as a single hosted URL — running 4 separate localhost servers is not how the platform works. The continuation plan below treats them as **three modules inside one app** (Consumer, Admin, Brand/Partner) plus a fourth track called **Customer Intelligence** (analytics + retention).

---

## 2. ✅ COMPLETED (verified in code)

### Backend / Infra
- [x] Lovable Cloud (Supabase) wired, RLS enabled on user tables
- [x] FK cascades and DB indexes
- [x] Sentry error reporting (`src/lib/sentry.ts`)
- [x] Error boundaries (`src/components/ErrorBoundary.tsx`)
- [x] Health endpoint (`supabase/functions/healthz`)
- [x] Server-side AI quota table + helper (`supabase/functions/_shared/ai-quota.ts`, `api-usage.ts`)
- [x] Ad fraud filter + dedup + per-min cap (`supabase/functions/log-ad-event`)
- [x] Nightly ad health job (`supabase/functions/nightly-ad-health`)
- [x] Price alerts cron (`supabase/functions/check-price-alerts`)
- [x] Govt price ingestion (`supabase/functions/fetch-govt-prices`)
- [x] Firecrawl live pricing (`supabase/functions/firecrawl-prices`)
- [x] Subscription expiry cron (`supabase/functions/expire-subscriptions`)
- [x] User data export (`supabase/functions/export-user-data`)

### Payments (Paddle, sandbox)
- [x] Paddle products created (premium_monthly ₹149, premium_yearly ₹1,499, ultra_monthly ₹499)
- [x] DB schema updated (`paddle_subscription_id`, `paddle_customer_id`, `environment`, `product_id_ext`, `price_id_ext`)
- [x] Multi-row-per-user model (drop unique on `user_id`, RPCs use latest row)
- [x] `payments-webhook` edge fn with signature verification
- [x] `get-paddle-price` edge fn
- [x] `customer-portal` edge fn
- [x] `cancel-subscription` edge fn
- [x] Paddle.js client SDK helper (`src/lib/paddle.ts`)
- [x] `PaymentTestModeBanner` mounted in `App.tsx`
- [x] `PlanPickerScreen` passes `priceId` to checkout
- [x] `PaymentMethodSheet` shows Paddle CTA
- [x] `ManageSubscriptionSheet` opens Paddle customer portal
- [x] Mock-subscribe dev path (`supabase/functions/mock-subscribe`) — last bug fixed (replaced upsert with select-then-update/insert)

### Consumer features
- [x] Onboarding flow (10+ steps, Monika guide, splash, profile summary)
- [x] Dashboard (calorie ring, macros, meals, water, supplements, gym, plans)
- [x] Calorie correction engine + intensity modes + safety bounds (1200 floor / 115% ceiling)
- [x] PES food ranking engine
- [x] Meal planner + batch cooking + redistribution
- [x] Event-based transformation plans + Madhavan reset + Sugar Cut
- [x] Pantry + grocery price tracking + budget engine
- [x] Live price waterfall (Median → Firecrawl → Static)
- [x] Symptom journal + body awareness
- [x] Weekly weight check-in + progress photos (cloud)
- [x] Achievements + streaks + identity badges
- [x] Monika chat (server quota-gated)
- [x] PCOS score, blood report cards
- [x] Skin / health cards
- [x] DashboardSkeleton + ProgressSkeleton + PageTransition
- [x] HealthDisclaimerBanner
- [x] Minor consent + age-tier soft restrictions (`src/hooks/useAgeTier.ts`, `src/components/MinorConsentNotice.tsx`, `MinorBlockedScreen.tsx`)

### Admin module (`/admin/*`)
- [x] AdminLayout + RequireAdmin (server-side `user_roles` check)
- [x] Overview, Users, User detail, Ads, Ad detail, Brands, Brand detail
- [x] Costs, Ops, Plans, Retention, Revenue, Scraping, Staff, Subscriptions, Audit, Feedback
- [x] Scraping health panel

### Brand / Partner module (`/brand/*`)
- [x] BrandLayout + RequireBrand
- [x] Dashboard, Campaigns, NewCampaign, Products, Billing

### Legal / compliance
- [x] Privacy policy (DPDP-aligned text)
- [x] Terms of service with health disclaimer
- [x] GST-exempt invoice mode + turnover-tracking checklist (`TODO_BUSINESS_REGISTRATION.md`)
- [x] Backup/restore docs (`docs/BACKUP_RESTORE.md`)
- [x] Consent records table + signup checkbox

---

## 3. ❌ INCOMPLETE (with reason)

### P0 — Will break / leak / cost money on day 1
| # | Item | Reason it's not done |
|---|---|---|
| ✅ P0-1 | Brand-data RLS lockdown — DONE (migration: dropped public-read policies on `brand_accounts`, `ad_campaigns`, `ad_creatives`; added `get_servable_ads` SECURITY DEFINER RPC for safe consumer ad-serving; refactored `src/lib/nutrition-gap-ads.ts` to use it). Verified with linter. |
| ✅ P0-2 | `meal-photos` lockdown — DONE (bucket flipped to private; owner-folder RLS on `storage.objects` so users can only read/write `{uid}/...`; staff read for moderation; `getPhotoUrl` now returns 7-day signed URLs; added `refreshPhotoUrl` helper in `src/lib/photo-store.ts`). |
| 🟡 P0-3 | Paddle live mode go-live — BLOCKED ON USER. Sandbox catalog ✅ (premium_monthly ₹149, premium_yearly ₹1499, ultra_monthly ₹499). Sandbox webhook ✅ wired to `/payments-webhook?env=sandbox`. Live webhook auto-registers on publish. Needs from user: (1) confirm legal business name, (2) publish app once so live env activates, (3) complete Paddle identity verification in `?view=payments`. |
| P0-4 | "Consult a doctor" modal before PCOS / Blood Report / 1200 kcal plans for adults | Disclaimer exists in Terms only, not at point-of-use |
| 🟡 P0-5 | Paddle end-to-end smoke test — PARTIALLY DONE. Verified server-side: webhook handler upserts on `paddle_subscription_id`, status mapping correct (`canceled`→`cancelled`), product/price `external_id`s match `planFromPriceId`. Cannot fully automate: Paddle checkout iframe is cross-domain — final card-entry step requires manual click-through with test card `4242 4242 4242 4242`. |

### P1 — High impact for beta UX / retention
| # | Item | Reason |
|---|---|---|
| P1-1 | Offline meal-log queue (IndexedDB outbox + replay) | `cloud-sync.ts` / `daily-log-sync.ts` are fire-and-forget; meals lost on patchy 4G |
| P1-2 | Push notifications backend (FCM via Capacitor) | `src/lib/notifications.ts` uses Browser Notification API only — fails on iOS Safari/PWA |
| P1-3 | Funnel analytics events (signup → onboard step N → first meal → day-2 → subscribe) | `events` table exists, only ~5 fire sites in code |
| P1-4 | Activation event defined + fired ("logged 3 meals on day 1") | Not defined |
| P1-5 | Grievance + support mailboxes (`grievance@`, `support@`) actually provisioned | Privacy page references them; DNS/email not set up |
| P1-6 | Branded 404 page + safe reload guard in `useDashboardInit.ts:174-182` | Generic "Oops!"; potential infinite-reload loop on Cloud outage |
| P1-7 | Lock down CORS to production domains in all edge fns | All currently `*` |
| P1-8 | Refund policy: concrete 7-day window in Terms | Currently "at our discretion" |

### P2 — Medium
| # | Item | Reason |
|---|---|---|
| P2-1 | Compress meal photos client-side to ≤80KB before upload | Storage will balloon at 5k+ users |
| P2-2 | Auto-purge meal photos > 90 days (cron edge fn) | No retention job exists |
| P2-3 | Bundle/perf: drop to 2 weights per font, remove Playfair if unused | Lighthouse ~45-55 on mid-tier 3G |
| P2-4 | Convert hero/static images to WebP + `loading="lazy"` everywhere | Mostly JPG today |
| P2-5 | Empty-state audit on `FoodArchive`, `Pantry`, `MarketList` | Possibly raw `[]` |
| P2-6 | Sentry alert routing (email on new issue / spike) | Wired but no alert rules |
| P2-7 | UptimeRobot ping on `/healthz` every 5 min | Endpoint exists, no external monitor |
| P2-8 | Manual restore-from-backup test (once before launch) | Never tested |
| P2-9 | Staging environment (forked Lovable project) | YOLO to prod |
| P2-10 | Sponsored-label audit on every ad surface (≥12px, contrasting) | Not verified |
| P2-11 | Failed-renewal dunning emails (Paddle handles retries; we send reminders) | Not built |

### P3 — Nice to have
| # | Item | Reason |
|---|---|---|
| P3-1 | Referral / WhatsApp share loop | Deferred |
| P3-2 | Store-review prompt after 3rd successful streak | Deferred |
| P3-3 | Feature flags table | Deferred |
| P3-4 | Trademark "NutriLens" filing in India | Founder task |
| P3-5 | Cyber-insurance quote | Founder task |
| P3-6 | Capacitor App Store / Play Store builds + signing certs + screenshots | Mobile-shell exists; not published |

---

## 4. Reality check

- **Overall completion: ~72%** for closed-beta-grade. ~55% for public-launch-grade.
- **Biggest blockers right now:**
  1. Brand-data RLS leak (P0-1) — single biggest privacy risk
  2. Paddle smoke test not yet run end-to-end (P0-5) — revenue path unverified
  3. Offline queue (P1-1) — guaranteed data loss for mobile users on Indian 4G
  4. Push notifications (P1-2) — without it, day-2 retention will collapse on iOS
  5. Funnel analytics (P1-3 / P1-4) — you'll launch blind, unable to see where users drop off

---

## 5. Today's work log

### ✔️ Done today
- Built audit prompt, ran full production-readiness audit
- Phase B Paddle integration:
  - Created Paddle products in sandbox
  - Migrated `subscriptions` schema (multi-row, paddle ids)
  - Refactored RPCs to use latest row
  - Deployed `payments-webhook`, `get-paddle-price`, `customer-portal`
  - Added `src/lib/paddle.ts`, `PaymentTestModeBanner`
  - Wired `PaymentMethodSheet` Paddle CTA
  - Wired `ManageSubscriptionSheet` portal opener
- Fixed `mock-subscribe` ON CONFLICT bug (select-then-update/insert)
- Wrote re-usable production-readiness audit prompt

### 🔜 Still to do today (if you have time before stopping)
- Run the Paddle smoke test with `4242 4242 4242 4242`
- Save this `PROGRESS_REPORT.md` to the repo

---

## 6. Prioritised to-do (effort: S < 2h, M = 2–8h, L > 8h)

| Priority | Task | Effort |
|---|---|---|
| P0-1 | Lock RLS on `brand_accounts` + 6 ad_* tables | M (3h) |
| P0-2 | Make `meal-photos` private + signed URLs | M (3h) |
| P0-3 | Paddle live-mode go-live | M (4h, mostly waiting on Paddle approval) |
| P0-4 | "Consult a doctor" modal at PCOS/Blood/1200kcal entry points | S (2h) |
| P0-5 | Paddle end-to-end smoke test | S (1h) |
| P1-1 | Offline meal-log IndexedDB outbox + retry | L (8h) |
| P1-2 | FCM push notifications via Capacitor | L (8h) |
| P1-3 | Instrument 8 funnel events | M (4h) |
| P1-4 | Define + fire activation event | S (1h) |
| P1-5 | Set up grievance@/support@ mailboxes | S (2h, DNS) |
| P1-6 | Brand 404 + reload guard | S (2h) |
| P1-7 | Lock CORS to prod domains | S (1h) |
| P1-8 | Refund policy 7-day clause | S (30m) |
| P2-1..11 | Perf, retention, ops hardening | ~20h total |

**Total remaining to "beta-ready": ~38h focused (≈1.5 weeks)**
**To "public-launch-ready": +20–25h on P2 + P3-6 (Capacitor publish)**

---

## 7. RESUME PROMPT — paste this when you come back

Copy everything inside the fenced block. Pasting it tells Lovable to pick up exactly here without re-auditing from scratch.

```
>> CONTINUE NUTRILENS AI

Project: NutriLens AI (single Lovable project containing Consumer app at `/`,
Admin module at `/admin/*`, Brand/Partner module at `/brand/*`, plus a
Customer Intelligence track that lives inside Admin → Retention/Revenue/
Feedback pages and the `events` table).

There is ONE preview URL for the whole app — do not try to spin up four
localhost servers; that is not how Lovable runs. Treat the four "apps" as
four modules inside this one repo:
  1. Consumer app   → routes under `/`, `/dashboard`, `/onboarding`, etc.
  2. Admin app      → routes under `/admin/*`
  3. Partner app    → routes under `/brand/*`
  4. Customer Intel → `events` table + Admin Retention/Revenue/Feedback pages

Read `PROGRESS_REPORT.md` at the repo root. That file is the source of
truth for what is done and what is pending. Do NOT re-run a full audit.
Do NOT re-summarise. Trust the checklist.

Then execute the pending work in this exact order, one task per turn,
pausing for my approval after each:

  P0-1  Lock RLS on `brand_accounts`, `ad_campaigns`, `ad_creatives`,
        `ad_impressions`, `ad_clicks`, `ad_conversions`, `ad_targeting`
        — restrict reads to `is_brand_member(brand_id) OR is_staff`.
  P0-2  Make storage bucket `meal-photos` private + serve via signed URLs
        with 1h TTL.
  P0-3  Paddle live-mode go-live checklist (domain approval, webhook URL,
        env flip). Tell me what YOU need from me before flipping.
  P0-4  Add a "Consult a doctor" confirmation modal before opening
        PCOSHealthCard, BloodReportSheet, and any plan that uses the
        1200 kcal floor.
  P0-5  Run Paddle end-to-end smoke test using sandbox card 4242 …;
        verify `subscriptions.status` flips to `active` and customer
        portal opens.
  P1-1  Offline meal-log queue: IndexedDB outbox in `cloud-sync.ts` +
        replay on reconnect in `daily-log-sync.ts`.
  P1-2  Push notifications: switch `src/lib/notifications.ts` from
        Browser Notification API to FCM via Capacitor; add a server
        edge fn `send-push` and a `device_tokens` table.
  P1-3  Instrument funnel events: signup, onboarding_step_enter/exit,
        first_meal_logged, day2_return, subscribe_started,
        subscribe_succeeded, subscribe_failed, churn_cancel.
  P1-4  Define activation event = "logged ≥3 meals on day 1"; fire it
        from `daily-log-sync.ts` once threshold met.
  P1-5  Confirm grievance@nutrilens.app + support@nutrilens.app are
        live (I will set DNS); update Privacy/Terms with response SLA.
  P1-6  Brand the `NotFound.tsx` page and add a max-3-reload guard with
        sessionStorage in `useDashboardInit.ts` (lines ~174-182).
  P1-7  Lock CORS in every edge fn to the production domain(s).
  P1-8  Update Terms refund clause to a concrete 7-day no-questions-
        asked window for first subscription.

Rules:
- Cite file paths and line numbers in every change you propose.
- After each task, update PROGRESS_REPORT.md (move the row from
  INCOMPLETE to COMPLETED with today's date).
- Do not bundle multiple P0/P1 tasks into one turn — one task, my
  approval, then next.
- If a task is blocked on me (DNS, Paddle approval, App Store cert),
  say so clearly and skip to the next unblocked task.

Start with P0-1. Show me the RLS policy SQL diff first, wait for
approval, then apply.
```

---

## 8. What was deliberately NOT included

- A second Lovable project for an "admin app" or "partner app" — both already exist as routes inside this repo; splitting them would double infra cost with zero user-facing benefit at this stage.
- A separate "customer intelligence app" — that capability lives in the `events` table + the existing Admin Retention/Revenue/Feedback pages.
- Localhost dev servers — Lovable's preview URL is the dev environment; a local Vite server is unnecessary and would diverge from prod.

If you genuinely want any of those split out into separate Lovable projects later, say so and I'll plan a multi-project workspace with shared Supabase as a separate scope.
