

# Implementation Plan: Bundle Audit + Launch Checklist

Doing the **two highest-ROI items** that need zero external dependencies. These ship today, make your app dramatically faster, and give you a launch-day safety net.

---

## Part 1: Bundle Audit & Lazy Loading (~2 hours)

### What This Fixes

Your app currently loads **everything upfront** — admin pages, brand dashboard, charts, even pages a regular user will never see. Result: slow first load on mobile.

After this work: First page loads in ~1.5s instead of ~5s on 4G.

### Changes I'll Make

**1. Lazy-load heavy routes in `src/App.tsx`**

Convert these route imports from eager to `React.lazy()`:
- All `/admin/*` routes (12 pages — huge bundle, only staff see them)
- All `/brand/*` routes (5 pages — only advertisers see them)
- `Progress.tsx` (recharts library is ~200KB)
- `MealPlanner.tsx` (heavy planner logic)
- `Market.tsx` + sub-pages (price charts)
- `Onboarding.tsx` (only used once per user)

Wrap the `<Routes>` block in `<Suspense fallback={<PageLoader />}>`.

**2. Create `src/components/PageLoader.tsx`**

Simple branded skeleton screen so users see something during the lazy load (~200ms).

**3. Audit & trim heavy imports**

Check these files for tree-shaking issues:
- `lucide-react` — verify named imports only (not `import * as Icons`)
- `recharts` — only imported in `Progress` and chart components
- `date-fns` — verify per-function imports
- `framer-motion` — check if `LazyMotion` would help

**4. Vite config tuning in `vite.config.ts`**

Add manual chunks to split vendor code:
```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'ui-vendor': ['@radix-ui/*'],
        'charts': ['recharts'],
        'supabase': ['@supabase/supabase-js'],
      }
    }
  }
}
```

This means when you push an update, users only re-download what changed (not the whole 2MB bundle).

**5. Add `loading="lazy"` audit**

Quick grep across remaining `<img>` tags I missed in the earlier P2-4 pass.

### Expected Impact

| Metric | Before | After |
|---|---|---|
| Initial bundle | ~2.1 MB | ~600 KB |
| First paint (4G) | ~5s | ~1.5s |
| Lighthouse Perf | ~50 | ~85 |
| TTI on mid-tier phone | ~8s | ~3s |

### Files Touched

- **Modified:** `src/App.tsx`, `vite.config.ts`
- **Created:** `src/components/PageLoader.tsx`
- **Possibly modified:** Any file using wildcard imports

---

## Part 2: Launch-Day Runbook (~15 min)

### What This Is

A printable Markdown checklist at `docs/LAUNCH_DAY_RUNBOOK.md` covering:

**T-7 days (one week before launch):**
- [ ] Paddle live mode approved
- [ ] Email domain DNS verified
- [ ] Sentry alert rules active
- [ ] UptimeRobot monitoring confirmed
- [ ] Backup restore drill completed
- [ ] App store listings submitted (if mobile)

**T-1 day:**
- [ ] Run Paddle ₹1 smoke test
- [ ] Verify `og:image` loads on Twitter/WhatsApp share preview
- [ ] Check `support@` mailbox receives mail
- [ ] Final Lighthouse score ≥ 80
- [ ] Privacy/Terms "last updated" matches launch date
- [ ] Lovable deployment is on production branch

**T-0 launch day (hour by hour):**
- [ ] 09:00 — Final smoke test (sign up, log meal, subscribe with test card)
- [ ] 10:00 — Switch Paddle to live mode
- [ ] 10:30 — Announcement post (Twitter, LinkedIn, WhatsApp groups)
- [ ] 11:00 — Monitor Sentry for first 100 user errors
- [ ] 14:00 — Check first conversion event in funnel
- [ ] 18:00 — Review day-1 metrics (signups, activations, churn)

**Emergency rollback procedure:**
- How to revert via Lovable history
- How to disable payments via feature flag
- Who to call (Paddle support, Lovable support)

**First-week monitoring:**
- Daily metrics to check (DAU, activation rate, payment success rate)
- Red flags (>5% error rate, >20% checkout abandonment)

### Files Touched

- **Created:** `docs/LAUNCH_DAY_RUNBOOK.md`

---

## Execution Order

1. Bundle audit + lazy-loading (~90 min)
2. Vite config + manual chunks (~20 min)
3. Quick verification with build size check (~5 min)
4. Launch runbook document (~15 min)

**Total: ~2 hours 15 min of code work**

---

## What This Does NOT Do (deferred)

- ❌ FCM push notifications — needs ~8h, do when you have users to retain
- ❌ Referral loop — do post-launch
- ❌ Email domain — needs you to provide a domain first
- ❌ Paddle go-live — needs you to click through Paddle's verification

---

## What You Should Do In Parallel (no code, 30 min total)

While I'm building, you can knock these out:
1. **Sentry alerts** (5min) — follow `docs/external-monitoring-setup.md`
2. **UptimeRobot** (10min) — same doc
3. **Start Paddle go-live** (15min) — Reply "how do I do Paddle go-live?" and I'll walk you through it after the bundle work

