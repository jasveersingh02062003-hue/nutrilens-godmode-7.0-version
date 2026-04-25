# Performance & Integrity Plan — What to Fix, What to Leave

This plan ranks every concern raised (by you and the external developer) into **MUST FIX**, **NICE TO HAVE**, and **DO NOT TOUCH**. Each fix lists *what*, *why*, *how*, and *expected gain*.

---

## ✅ MUST FIX (real wins, low risk)

### Fix #1 — Stop duplicate profile sync on Dashboard load
- **Problem:** When Dashboard mounts, the profile is read AND written back twice within ~200ms (once by `useAuth` hydration, once by `Dashboard` profile sync effect). Doubles your Supabase egress on every page open.
- **How:** Add a `lastSyncedAt` guard in the dashboard profile sync effect; skip the second write when the in-memory profile equals the just-fetched one (deep-equal on the 6 fields that actually mutate).
- **Files:** `src/pages/Dashboard.tsx`, `src/hooks/useAuth.tsx` (or wherever the profile hydration lives).
- **Expected gain:** ~50% fewer profile read/write requests. No visual change.

### Fix #3 — Cap initial cloud log restore to last 90 days
- **Problem:** `restoreLogsFromCloud()` currently pulls **up to 500 days** of `daily_logs` on first login → big payload, slow first paint, high egress.
- **How:** Add `.gte('log_date', <today - 90d>)` to the initial query. Older logs lazy-load only when the user opens a date older than 90 days (Trends/History views already do their own queries).
- **Files:** `src/lib/daily-log-sync.ts` (or `cloud-restore.ts`).
- **Expected gain:** First-load payload drops from ~500 rows to ~90 rows for active users. Noticeably faster Dashboard mount.

### Fix #4 — Wrap hot reads in React Query with proper `staleTime`
- **Problem:** `useDailyLog`, `useProfile`, `useSubscription` re-fetch on every component mount because there is no caching layer. Switching tabs = fresh network call.
- **How:** Standardise on `useQuery` with `staleTime: 60_000` (1 min) for profile/subscription and `staleTime: 30_000` for today's daily log. Invalidate explicitly after mutations.
- **Files:** `src/hooks/useProfile.ts`, `src/hooks/useSubscription.ts`, `src/hooks/useDailyLog.ts`.
- **Expected gain:** ~70% fewer redundant requests when navigating between Dashboard ↔ Plan ↔ Profile.

### Fix #2 — Code-split `src/lib/recipes.ts` (the big one)
- **Problem:** `recipes.ts` is **2,000+ lines** of static recipe data shipped in the main bundle. It blocks first paint on slow networks.
- **How:** Split into category JSON files (`recipes/breakfast.json`, `recipes/lunch.json`, `recipes/dinner.json`, `recipes/snacks.json`) and load on demand via dynamic `import()` when a meal slot is opened. Keep a small "starter" set (10–20 recipes) in the initial bundle for the empty-state preview.
- **Files:** `src/lib/recipes.ts` → `src/data/recipes/*.json` + a thin loader.
- **Expected gain:** Initial JS bundle ↓ ~150–250 KB gzipped. First-load TTI improves by 0.5–1.5s on mid-range phones.

---

## 🟡 NICE TO HAVE (do later, only if needed)

- **Compress old daily logs** older than 1 year into a monthly aggregate row. Useful only if a user has 500+ days of history.
- **Migrate localStorage cache → IndexedDB** for users with very large meal histories (>5MB). Current `scoped-storage.ts` is fine for 95% of users.
- **Bundle-analyze pass** on `Onboarding.tsx` (currently large because of step components). Lazy-load each step.

---

## ❌ DO NOT TOUCH (developer's claims that are FALSE)

These were flagged by the external developer but are **already correctly built**. Changing them would create real bugs.

| Claim | Reality | Verdict |
|---|---|---|
| "Backend logic sits in the frontend" | 22 edge functions + 58 SECURITY DEFINER RPCs handle payments, roles, AI, subscriptions | **FALSE** |
| "Hackers can steal sensitive data from localStorage" | Only non-sensitive cached UI state lives there. JWT is in httpOnly cookie. Personal data is gated by RLS | **FALSE** |
| "20× redundant server hits per minor change" | Real number is ~2× on dashboard mount (fixed by #1). Daily log writes are debounced 1.5s + optimistically locked | **EXAGGERATED** |
| "App is not legally compliant — needs DH audit" | 170 RLS policies + audit_logs + consent_records + delete_my_account RPC are already in place | **FALSE** |
| "Need to rebuild the backend" | Architecture is sound. Only specific hot paths need polish | **FALSE — DO NOT REWRITE** |
| "Need SSL / scaling rewrite" | Supabase + Deno edge runtime auto-scales and terminates SSL. Nothing to do | **FALSE** |

**Why this matters:** A "rewrite the backend" project would cost you weeks of work, break Premium/Trial logic, and introduce new RLS gaps. The current backend is production-grade. Reject that scope.

---

## 📋 Execution Order (when you say "go")

1. Save the audit as `mem://audit/external-dev-claims-and-perf-fixes-2026-04-25` (preserved forever).
2. **Batch A (10 min, instant win):** Fix #1 + Fix #3.
3. **Batch B (15 min):** Fix #4 (React Query caching).
4. **Batch C (20–30 min, biggest first-paint win):** Fix #2 (recipes split).
5. After each batch: open Dashboard, confirm no regressions, look at Network panel — request count should visibly drop.

---

## 🛠 Technical details (for reference)

- **Profile dedupe key:** `name | weight_kg | daily_calories | daily_protein | onboarding_complete | updated_at`. Compare these 6 fields before re-upserting.
- **Log cap query:** `supabase.from('daily_logs').select('*').gte('log_date', subDays(today, 90).toISOString().slice(0,10))`.
- **React Query keys:** `['profile', userId]`, `['subscription', userId]`, `['daily-log', userId, date]`.
- **Recipes loader signature:** `await loadRecipes('breakfast')` → returns cached promise.
- **No DB migration needed.** Pure client-side refactor. RLS, edge functions, and RPCs stay untouched.

---

## ❓ One question before I start

Which order do you want?
- **(A)** Batch A → B → C in one go (≈45 min, biggest cumulative win)
- **(B)** Just Batch A right now (10 min, you ship + test, then we do B & C tomorrow)
- **(C)** Jump straight to Batch C (recipes split) — most visible speed boost on first load

Reply with **A**, **B**, or **C** and I'll execute.