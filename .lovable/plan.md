# 📋 Production-Readiness Master Checklist — NutriLens AI

> Live status tracker. ✅ = shipped · ⬜ = pending · ~~strikethrough~~ = deferred post-launch.
> Last updated: 2026-04-23

---

## ✅ ALREADY SHIPPED

### 🔒 Security & Abuse Prevention
- ✅ Server-side AI quota (`ai_usage_quota` + `increment_ai_quota`/`get_ai_quota` RPCs) — wired into `monika-chat`, `analyze-food`, `scan-receipt`
- ✅ Zod input validation on `monika-chat`, `analyze-food`, `scan-receipt`
- ✅ Prompt injection sanitization (`sanitizeUserContext()`)
- ✅ Ad RLS lockdown — `ad_campaigns`, `ad_creatives`, `ad_impressions`, `ad_clicks`, `ad_conversions`, `ad_targeting` use `is_brand_member() OR is_staff()`
- ✅ Admin role check server-side via `user_roles` (no localStorage)
- ✅ Core RLS on `daily_logs`, `weight_logs`, `water_logs`, `profiles`, `monika_conversations`, `event_plans`
- ✅ Optimistic locking via `upsert_daily_log` RPC
- ✅ Click-fraud filter in `log-ad-event` (server-side dedup + daily cap + 5/min ratelimit)

### ⚖️ Legal & Compliance
- ✅ Account deletion RPC (`delete_my_account()` cascades 17 tables + auth.users)
- ✅ Tiered age gating (Option D): <13 hard block, 13–17 restricted, 18+ full
- ✅ DOB capture at signup, persisted to `profiles.dob`
- ✅ `useAgeTier` hook + `age-tier.ts` engine integration
- ✅ Calorie engine respects `getActiveCalorieFloor()` (1600 minors / 1200 adults)
- ✅ Privacy policy (DPDP-aligned)
- ✅ Terms of Service with health disclaimer + `HealthDisclaimerBanner`
- ✅ GST-exempt invoice mode wired

### 🛠️ Infrastructure
- ✅ Sentry wired
- ✅ FK cascades + DB indexes
- ✅ Error boundaries
- ✅ DashboardSkeleton + ProgressSkeleton
- ✅ Daily auto-backups (Lovable Cloud)

### 🏁 Week 1 Leftovers (closed 2026-04-23)
- ✅ **W1-A** Account-deletion UI in Profile — Danger Zone + type-DELETE confirm dialog → `delete_my_account` RPC → clear scoped storage → sign out → `/auth`
- ✅ **W1-B** Branded 404 page — gradient bg, primary brand 404, `<Link>` (SPA-safe), suggested routes
- ✅ **W1-C** Safe reload guard — `safeReload()` caps at 3 reloads/session via `sessionStorage('nl_reload_count')`, resets on legit `nutrilens:update`
- ✅ **W1-D** Zod validation on `log-ad-event` (full schema, JSON-parse guard, 405 on non-POST) and `export-user-data` (405 on non-POST/GET, 3-exports/hour rate limit via `audit_logs`)

---


## ⬜ WEEK 2 (~29h)

### Sprint 2A — Reliability (~10h)
| # | Task | Sev | Eff | File |
|---|---|---|---|---|
| W2-1 | Offline meal-log queue (IndexedDB, replay on reconnect) | 8 | 8h | `src/lib/cloud-sync.ts`, `src/lib/daily-log-sync.ts` |
| W2-2 | `/healthz` edge fn + UptimeRobot ping every 5min | 5 | 1h | new `supabase/functions/healthz/` |
| W2-3 | Sentry email alerts (new issue + error-rate spike) | 6 | 30m | Sentry dashboard |

### Sprint 2B — Analytics & Retention (~13h)
| # | Task | Sev | Eff | File |
|---|---|---|---|---|
| W2-4 | Funnel events: signup, onboard_step_N, onboard_complete, first_meal_logged, day2_return, subscription_started | 8 | 4h | `src/pages/Onboarding.tsx`, `src/lib/events.ts` |
| W2-5 | Activation event `logged_3_meals_day_1` | 6 | 1h | `src/lib/events.ts` |
| W2-6 | Push notifications backend (OneSignal or FCM) | 9 | 8h | `src/lib/notifications.ts`, new edge fn |

### Sprint 2C — Legal/Email (~6h)
| # | Task | Sev | Eff |
|---|---|---|---|
| W2-7 | Set up `grievance@nutrilens.app` + `support@nutrilens.app` | 7 | 2h |
| W2-8 | Refund policy clarity (7-day no-questions-asked) | 6 | 1h |
| W2-9 | Cross-border data-transfer disclosure in Privacy section 5 | 5 | 30m |
| W2-10 | `BREACH_RESPONSE.md` runbook | 5 | 2h |
| W2-11 | `INCIDENTS.md` runbook | 4 | 1h |

---

## ⬜ PRE-PUBLIC-LAUNCH (~70h)

### 💰 Monetization (REQUIRED before paid launch)
| # | Task | Sev | Eff |
|---|---|---|---|
| L-1 | Razorpay + `subscriptions` table + `verify-payment` edge fn | 10 | 16h |
| L-2 | Server-side plan check (rewrite `subscription-service.ts` to read from DB) | 10 | inc. L-1 |
| L-3 | Cancellation flow (one-click, no dark patterns) | 8 | inc. L-1 |
| L-4 | Dunning emails (failed renewal reminders) | 7 | 4h |

### ⚡ Performance
| # | Task | Sev | Eff |
|---|---|---|---|
| L-5 | Dashboard TTI: defer below-fold cards via IntersectionObserver | 7 | 8h |
| L-6 | Font diet (2 weights/family, drop Playfair, `font-display: swap`) | 7 | 2h |
| L-7 | Photo compression ≤80KB + 90-day auto-purge cron | 6 | 4h |
| L-8 | WebP images + `loading="lazy"` | 5 | 3h |
| L-9 | Empty states for `FoodArchive`, `Pantry`, `MarketList` | 3 | 4h |

### 🔒 Security hardening
| # | Task | Sev | Eff |
|---|---|---|---|
| L-10 | Make `meal-photos` bucket private + signed URLs (1h TTL) | 6 | 3h |
| L-11 | CSP meta header in `index.html` | 6 | 2h |
| L-12 | Tighten CORS to production domains | 4 | 1h |
| L-13 | Sponsored-badge audit (≥12px, contrast) on 6 ad surfaces | 6 | 2h |

### 🚀 Ops
| # | Task | Sev | Eff |
|---|---|---|---|
| L-14 | Staging environment (fork to `nutrilens-staging`) | 7 | 3h |
| L-15 | Manual restore-test of latest backup | 6 | 2h |
| L-16 | Capacitor builds (signing certs, screenshots, ASO) | 7 | 16h |
| L-17 | Trademark filing ("NutriLens" India) | 5 | external |
| L-18 | Store-review prompt after 3rd streak | 4 | 2h |

### 🟡 Deferred
- ~~Referral loop~~ (post-launch)
- ~~Feature flags~~ (env vars sufficient)
- ~~Cyber insurance~~ (only at >5k users)

---

## 📊 Progress Summary

| Bucket | Done | Pending | Total |
|---|---|---|---|
| Week 1 | 9 | 4 | 13 |
| Week 2 | 0 | 11 | 11 |
| Pre-public-launch | 0 | 18 | 18 |
| **Hours to closed beta** | — | **~34h** | — |
| **Hours to public launch** | — | **~104h** | — |

---

## 🚦 Launch Gates

| Gate | Status | Blocking |
|---|---|---|
| 🟡 Closed beta (≤500) | Conditional GO | W1-A, W1-D, W2-6 |
| 🚨 Public launch | NO-GO | All L-* items, especially L-1 |

---

## ✅ How to use this checklist

Reply with:
- **"Finish Week 1"** → W1-A, W1-B, W1-C, W1-D
- **"Week 2 Sprint 2A"** → reliability
- **"Week 2 Sprint 2B"** → retention
- **"Razorpay"** → monetization (L-1 to L-4)
- **"Custom: <items>"** → pick specific codes (e.g., "W1-A, W2-2, L-11")
