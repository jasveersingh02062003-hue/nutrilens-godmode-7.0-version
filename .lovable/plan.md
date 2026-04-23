

# 📊 NutriLens AI — Audit Report & Next Implementation Plan

## Part 1 — Verification Report (what's *actually* in the code)

I opened every file behind every claim and ran the database security linter. Here's the truth:

### ✅ Verified shipped (code matches the checklist)

| Claim | File evidence | Verdict |
|---|---|---|
| Server-side AI quota wired into 3 edge fns | `monika-chat`, `analyze-food`, `scan-receipt` all import + call `increment_ai_quota` | ✅ Real |
| Zod validation on AI edge fns | `RequestSchema.safeParse(body)` present in all 3 | ✅ Real |
| Prompt injection sanitizer | `sanitizeUserContext()` defined and called in `monika-chat` | ✅ Real |
| Tiered age gating (Option D) | `Auth.tsx` computes `tierForAge`, renders `MinorBlockedScreen` / `MinorConsentNotice`; `age-tier.ts` exports `tierForDob`, `calorieFloorForTier` (1200 adult / 1600 minor), `getActiveCalorieFloor` | ✅ Real |
| Account-deletion UI (W1-A) | `Profile.tsx` lines 70-535: type-DELETE confirm, calls `delete_my_account` RPC, clears scoped storage, signs out, redirects | ✅ Real |
| Branded 404 (W1-B) | `NotFound.tsx` rewritten — gradient bg, brand 404, `<Link>` (SPA-safe), 3 suggestion chips | ✅ Real |
| Safe reload guard (W1-C) | `useDashboardInit.ts` lines 174-216: `safeReload()` with `nl_reload_count` cap of 3, reset on `nutrilens:update` | ✅ Real |
| Zod on `log-ad-event` + rate-limit on `export-user-data` (W1-D) | `export-user-data` lines 14-63: 405 method guard + 3-exports/hour via `audit_logs` | ✅ Real |

### ⚠️ Front-vs-Back consistency gaps (NOT yet fixed)

| Issue | Frontend | Backend | Risk |
|---|---|---|---|
| **Subscription plan still in localStorage** | `subscription-service.ts` reads/writes `scopedGet(SUB_KEY)` | No `subscriptions` table. RPC checks plan client-side only | 🚨 Anyone can `localStorage.setItem('u_xxx_subscription_plan', 'ultra')` and unlock paid features |
| **Daily AI quota = server-side ✅** but **paid-tier check = client-side ❌** | `canSendMonicaMessage()` reads localStorage | Edge fn enforces a hard daily cap but trusts client about which *tier* the user is on | 🚨 A user spoofing "ultra" gets the higher quota |
| **Funnel events scaffolded, not fired** | `events.ts` defines `EventName` enum (signup, onboarding_complete, first_meal_logged...) | No call sites — type exists, nothing emits | ⚠️ No retention data |
| **Push notifications stub-only** | `notifications.ts` uses `sonner` toasts only — no `OneSignal` / `FCM` import | No push-token table, no edge fn | 🚨 Day-2 retention will be flat |

### 🔒 Security linter findings (fresh scan)

11 warnings:
- **WARN 1** — extension installed in `public` schema (low risk)
- **WARN 2-10** — **9 RLS policies use `WITH CHECK (true)` or `USING (true)` for INSERT/UPDATE/DELETE** ← need to identify which tables and tighten
- **WARN 11** — **leaked-password protection is OFF** in Supabase auth (one-click fix in dashboard)

No `ERROR`-level findings. RLS is on everywhere; some policies are too permissive.

---

## Part 2 — Updated Progress Snapshot

| Bucket | Done | Pending | % |
|---|---|---|---|
| Week 1 (security/legal bleeders) | **13** | 0 | **100%** ✅ |
| Week 2 (reliability, retention, ops) | 0 | 11 | 0% |
| Pre-public launch (monetization, perf, hardening) | 0 | 18 | 0% |
| **New: front/back consistency** | 0 | 4 | 0% |
| **New: linter findings** | 0 | 3 | 0% |

**Hours to closed beta:** ~34h (unchanged) + ~3h linter cleanup = **~37h**
**Hours to public launch:** ~104h + ~16h server-side subscription = **~120h**

---

## Part 3 — Implementation Plan (next sprint)

### Sprint 2A — Reliability + Linter Cleanup (~13h)

| # | Task | Sev | Eff | File |
|---|---|---|---|---|
| **W2-1** | Offline meal-log queue (IndexedDB → replay on reconnect) | 8 | 8h | `src/lib/cloud-sync.ts`, `daily-log-sync.ts` |
| **W2-2** | `/healthz` edge fn + UptimeRobot ping | 5 | 1h | new `supabase/functions/healthz/` |
| **W2-3** | Sentry email alerts on new issues | 6 | 30m | Sentry dashboard |
| **NEW SEC-1** | Identify the 9 permissive RLS policies and tighten to `auth.uid() = user_id` or proper role check | 8 | 2h | new migration |
| **NEW SEC-2** | Enable leaked-password protection (Supabase auth setting) | 4 | 5m | dashboard |
| **NEW SEC-3** | Move `vector` / public extension to `extensions` schema if low-risk | 3 | 30m | migration |

### Sprint 2B — Analytics + Retention (~13h)

| # | Task | Sev | Eff |
|---|---|---|---|
| W2-4 | Wire funnel-event call sites: `signup`, `onboard_step_N`, `onboard_complete`, `first_meal_logged`, `day2_return`, `subscription_started` | 8 | 4h |
| W2-5 | Activation event `logged_3_meals_day_1` | 6 | 1h |
| W2-6 | Push notifications backend (OneSignal — fastest to ship) + `push_tokens` table | 9 | 8h |

### Sprint 2C — Legal/Email (~6h)

| # | Task | Sev | Eff |
|---|---|---|---|
| W2-7 | DNS + mailbox for `grievance@` and `support@nutrilens.app` | 7 | 2h |
| W2-8 | Refund policy: 7-day no-questions-asked (`Terms.tsx`) | 6 | 1h |
| W2-9 | Cross-border transfer disclosure in Privacy section 5 | 5 | 30m |
| W2-10 | `BREACH_RESPONSE.md` runbook | 5 | 2h |
| W2-11 | `INCIDENTS.md` runbook | 4 | 1h |

### Pre-public launch (unchanged, ~104h) — see existing `.lovable/plan.md` L-1 through L-18

The 4 most important items remain:
1. **L-1** Razorpay + `subscriptions` table + `verify-payment` edge fn (16h) ← also fixes the front/back subscription gap
2. **L-5** Dashboard TTI defer below-fold (8h)
3. **L-10** Private `meal-photos` bucket + signed URLs (3h)
4. **L-16** Capacitor signed builds + store assets (16h)

---

## Part 4 — Task Tracker (so you can tick items off)

I'll create the following trackable tasks when we move to default mode:

1. **Sprint 2A — Reliability + Linter** (W2-1, W2-2, W2-3, SEC-1, SEC-2, SEC-3)
2. **Sprint 2B — Analytics + Push** (W2-4, W2-5, W2-6)
3. **Sprint 2C — Legal/Email** (W2-7 → W2-11)
4. **Razorpay monetization** (L-1 → L-4)
5. **Performance pass** (L-5 → L-9)
6. **Security hardening** (L-10 → L-13)
7. **Ops & store launch** (L-14 → L-18)

---

## Part 5 — Updated Launch Gates

| Gate | Status | Remaining blockers |
|---|---|---|
| 🟡 Closed beta (≤500 users) | **GO** for invite-only **after SEC-1 + SEC-2** (~2h) | Push notifications nice-to-have, not blocking |
| 🚨 Public launch | **NO-GO** | All `L-*` items, especially L-1 (Razorpay) — without it the freemium gate is bypass-able |

---

## Part 6 — Recommended next command

Reply with one of:
- **"Sprint 2A"** → reliability + linter fixes (~13h, the fastest path to a green security scan + offline resilience)
- **"Sprint 2B"** → analytics + push (~13h, retention foundation)
- **"Custom: SEC-1, SEC-2, W2-2"** → cherry-pick the 3 lowest-effort highest-impact items (~3h)
- **"Razorpay"** → jump to monetization (L-1 → L-4) and close the subscription bypass

Recommended: **"Custom: SEC-1, SEC-2, W2-2"** first — these are the highest ROI for the smallest time spend before any user invite.

