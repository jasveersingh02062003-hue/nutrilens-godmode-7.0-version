

# 📋 Production-Readiness Master Checklist — NutriLens AI

A live status tracker for every audit item. Items marked ✅ are already shipped. Items marked ⬜ are pending. Strikethrough = deferred to post-launch.

---

## ✅ ALREADY SHIPPED (Week 1 work + earlier)

### 🔒 Security & Abuse Prevention
- ✅ **Server-side AI quota** (`ai_usage_quota` table + `increment_ai_quota`/`get_ai_quota` RPCs) — wired into `monika-chat`, `analyze-food`, `scan-receipt`
- ✅ **Zod input validation** on `monika-chat`, `analyze-food`, `scan-receipt` (message length, count, image size caps)
- ✅ **Prompt injection sanitization** (`sanitizeUserContext()` neutralizes injection patterns)
- ✅ **Ad RLS lockdown** — `ad_campaigns`, `ad_creatives`, `ad_impressions`, `ad_clicks`, `ad_conversions`, `ad_targeting` now use `is_brand_member() OR is_staff()`
- ✅ **Admin role check** server-side via `user_roles` (no localStorage)
- ✅ Core RLS on `daily_logs`, `weight_logs`, `water_logs`, `profiles`, `monika_conversations`, `event_plans`
- ✅ Optimistic locking via `upsert_daily_log` RPC
- ✅ Click-fraud filter (server-side dedup + daily cap + 5/min ratelimit) in `log-ad-event`

### ⚖️ Legal & Compliance
- ✅ **Account deletion RPC** (`delete_my_account()` cascades 17 tables + auth.users)
- ✅ **Tiered age gating (Option D)**:
  - Under 13 → hard block (`MinorBlockedScreen`)
  - 13–17 → restricted experience (`MinorConsentNotice`, hidden PCOS/blood reports, locked aggressive plans, 1600 kcal floor)
  - 18+ → full access
- ✅ DOB capture at signup, persisted to `profiles.dob`
- ✅ `useAgeTier` hook + `age-tier.ts` engine integration
- ✅ Calorie engine respects `getActiveCalorieFloor()` (1600 for minors, 1200 for adults)
- ✅ Privacy policy (DPDP-aligned)
- ✅ Terms of Service with health disclaimer + `HealthDisclaimerBanner`
- ✅ GST-exempt invoice mode wired

### 🛠️ Infrastructure
- ✅ Sentry wired
- ✅ FK cascades + DB indexes
- ✅ Error boundaries
- ✅ DashboardSkeleton + ProgressSkeleton
- ✅ Daily auto-backups (Lovable Cloud)

---

## ⬜ PENDING — WEEK 1 LEFTOVERS (Account-deletion UI + polish)

| # | Task | Sev | Eff | File |
|---|---|---|---|---|
| W1-A | **Account-deletion UI** in Profile page (call `delete_my_account` RPC, double-confirm modal, sign-out + redirect) | 9 | 2h | `src/pages/Profile.tsx` |
| W1-B | **Brand the 404 page** (use `<Link>` not `<a>`, branded illustration, helpful suggestions) | 5 | 1h | `src/pages/NotFound.tsx` |
| W1-C | **Safe reload guard** in `useDashboardInit` (max 3 reloads/session via sessionStorage flag) | 7 | 1h | `src/hooks/useDashboardInit.ts:174-182` |
| W1-D | **Zod validation** on remaining 2 edge fns (`log-ad-event`, `export-user-data`) | 7 | 1h | `supabase/functions/log-ad-event/index.ts`, `export-user-data/index.ts` |

**Subtotal: 5 hours**

---

## ⬜ PENDING — WEEK 2 (UX + retention + ops)

### Sprint 2A — Reliability
| # | Task | Sev | Eff | File |
|---|---|---|---|---|
| W2-1 | **Offline meal-log queue** — IndexedDB queue for failed mutations, replay on reconnect | 8 | 8h | `src/lib/cloud-sync.ts`, `src/lib/daily-log-sync.ts` |
| W2-2 | **`/healthz` edge fn** + UptimeRobot (free) ping every 5min | 5 | 1h | new `supabase/functions/healthz/index.ts` |
| W2-3 | **Sentry email alerts** (new issue + error-rate spike) | 6 | 30m | Sentry dashboard |

### Sprint 2B — Analytics & Retention
| # | Task | Sev | Eff | File |
|---|---|---|---|---|
| W2-4 | **Funnel events** — fire `events` rows for: signup, onboard_step_1..N, onboard_complete, first_meal_logged, day2_return, subscription_started | 8 | 4h | `src/pages/Onboarding.tsx`, `src/lib/events.ts`, various |
| W2-5 | **Activation event** — `logged_3_meals_day_1` | 6 | 1h | `src/lib/events.ts` |
| W2-6 | **Push notifications backend** — OneSignal or FCM integration | 9 | 8h | `src/lib/notifications.ts`, new edge fn |

### Sprint 2C — Legal/Email
| # | Task | Sev | Eff |
|---|---|---|---|
| W2-7 | **Set up `grievance@nutrilens.app` + `support@nutrilens.app`** (DNS, mailbox, list in Privacy/Terms) | 7 | 2h |
| W2-8 | **Refund policy clarity** — replace "at our discretion" with 7-day no-questions-asked | 6 | 1h |
| W2-9 | **Cross-border data-transfer disclosure** in Privacy section 5 | 5 | 30m |
| W2-10 | **`BREACH_RESPONSE.md`** runbook | 5 | 2h |
| W2-11 | **`INCIDENTS.md`** runbook | 4 | 1h |

**Subtotal: ~29 hours**

---

## ⬜ PENDING — PRE-PUBLIC-LAUNCH (after closed beta)

### 💰 Monetization (REQUIRED before any paid launch)
| # | Task | Sev | Eff |
|---|---|---|---|
| L-1 | **Razorpay payment gateway** (UPI autopay) + `subscriptions` table + `verify-payment` edge fn | 10 | 16h |
| L-2 | **Server-side plan check** — rewrite `subscription-service.ts` to read from DB, not localStorage | 10 | included in L-1 |
| L-3 | **Cancellation flow** — one-click, no dark patterns | 8 | included in L-1 |
| L-4 | **Dunning emails** (failed renewal reminders) | 7 | 4h |

### ⚡ Performance
| # | Task | Sev | Eff |
|---|---|---|---|
| L-5 | **Dashboard TTI** — defer below-fold cards via `IntersectionObserver`, swipe carousel for 15+ cards | 7 | 8h |
| L-6 | **Font diet** — drop to 2 weights/family, remove Playfair, `font-display: swap` | 7 | 2h |
| L-7 | **Photo compression** ≤80KB before upload + 90-day auto-purge cron | 6 | 4h |
| L-8 | **WebP images + `loading="lazy"`** | 5 | 3h |
| L-9 | **Empty states** for `FoodArchive`, `Pantry`, `MarketList` | 3 | 4h |

### 🔒 Security hardening
| # | Task | Sev | Eff |
|---|---|---|---|
| L-10 | **Make `meal-photos` bucket private** + signed URLs (1h TTL) | 6 | 3h |
| L-11 | **CSP meta header** in `index.html` | 6 | 2h |
| L-12 | **Tighten CORS** to production domains | 4 | 1h |
| L-13 | **Sponsored-badge audit** (≥12px, contrast) on 6 ad surfaces | 6 | 2h |

### 🚀 Ops
| # | Task | Sev | Eff |
|---|---|---|---|
| L-14 | **Staging environment** (fork to `nutrilens-staging`) | 7 | 3h |
| L-15 | **Manual restore-test** of latest backup | 6 | 2h |
| L-16 | **Capacitor builds** — signing certs, screenshots, ASO keywords | 7 | 16h |
| L-17 | **Trademark filing** ("NutriLens" India, ₹4,500) | 5 | external |
| L-18 | **Store-review prompt** after 3rd streak | 4 | 2h |

### 🟡 Deferred to post-launch
- ~~Referral loop~~ (post-launch)
- ~~Feature flags~~ (env vars sufficient for now)
- ~~Cyber insurance~~ (only at >5k users)

---

## 📊 Progress Summary

| Bucket | Done | Pending | Total |
|---|---|---|---|
| Week 1 (bleeders) | 9 items | 4 items | 13 |
| Week 2 (UX+ops) | 0 items | 11 items | 11 |
| Pre-public-launch | 0 items | 18 items | 18 |
| **Hours remaining to closed-beta launch** | — | **~34h** | — |
| **Hours remaining to public launch** | — | **~104h** | — |

---

## 🎯 Recommended Next Sequence

1. **Finish Week 1** (~5h): account-deletion UI → 404 polish → reload guard → Zod on remaining 2 edge fns
2. **Week 2 Sprint 2A** (reliability, ~10h): offline queue → `/healthz` → Sentry alerts
3. **Week 2 Sprint 2B** (retention, ~13h): funnel events → activation → push notifications
4. **Week 2 Sprint 2C** (legal/email, ~6h): emails, refund policy, runbooks
5. **→ Closed beta with ≤500 users**
6. **Pre-public**: Razorpay → performance → security hardening → staging → store builds

---

## 🚦 Launch Gates

| Gate | Status | Blocking items |
|---|---|---|
| 🟡 Closed beta (≤500) | **Conditional GO** | W1-A (deletion UI), W1-D (Zod on last 2 fns), W2-6 (push notifs) |
| 🚨 Public launch | **NO-GO** | All "L-*" items, especially L-1 (payment gateway) |

---

## ✅ How to use this checklist

Reply with one of:
- **"Finish Week 1"** → I'll knock out W1-A, W1-B, W1-C, W1-D in one pass (~5h of work in code)
- **"Week 2 Sprint 2A"** → reliability (offline queue, healthz, Sentry alerts)
- **"Week 2 Sprint 2B"** → retention (funnel events, push notifications)
- **"Razorpay"** → jump to monetization (L-1 through L-4)
- **"Custom: <items>"** → pick specific item codes (e.g., "W1-A, W2-2, L-11")

I'll save this checklist as `.lovable/plan.md` so we can keep ticking items off as we go.

