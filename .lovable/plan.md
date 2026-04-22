

# Phase 1 — Analysis First, Then Build

I went through your codebase before writing this. Here's what's **actually true** vs. what the senior dev's task list assumes — then a sequenced plan that does what genuinely helps and skips work that's already done.

---

## Honest audit of your 8 tasks

| # | Task | Senior dev says | Reality in your code | My recommendation |
|---|------|----------------|----------------------|-------------------|
| 1.1 | Market virtualization | "470+ items render at once" | **False.** `Market.tsx` line 155–168 already uses `IntersectionObserver` + `visibleCount` paging (`ITEMS_PER_PAGE`). Only ~20 items render at a time. | **SKIP** as written. Do a small polish instead (sticky category header). |
| 1.2 | Mobile sheet scroll | "Some sheets don't scroll" | **Already correct.** `ui/sheet.tsx` lines 38–41 set `overflow-y-auto overscroll-contain` + `max-h-[92dvh]`. `use-body-scroll-lock` handles body lock. | **SKIP** unless we find a specific broken sheet. I'll spot-check 5 heaviest sheets. |
| 1.3 | ErrorBoundary on routes | "One crash kills the app" | **Half done.** `App.tsx` line 180 wraps the whole app in one ErrorBoundary — so ANY page crash still kills the whole app. Per-route boundaries are missing. | **DO IT.** Real win. |
| 1.4 | Skeleton loaders | "Pages show blank" | **Mixed.** Market has skeletons (`MarketSkeleton.tsx`). Dashboard returns `null` until profile loads (line 75 of Dashboard.tsx) — blank screen. Progress same pattern. | **DO IT** for Dashboard + Progress only. Market is fine. |
| 1.5 | Service worker / PWA | "App breaks offline" | **Already installed.** `vite-plugin-pwa@1.2.0` is in `vite.config.ts` with `autoUpdate`. But no offline banner, no online/offline state UI. | **PARTIAL** — add the offline banner only. Do NOT touch caching (PWA in iframe = preview breaks per Lovable guidelines). |
| 1.6 | Image lazy-loading | "Images may be large" | **Confirmed missing.** Grep of MarketItemCard, MarketImage, MealDetailSheet, RecipeDetail = **0 occurrences** of `loading="lazy"`. | **DO IT.** Genuine win. |
| 1.7 | Accessibility pass | "Missing aria-labels" | **Confirmed.** Grep of BottomNav, MarketBottomNav, DashboardHeader, MarketItemCard = **0 aria-labels**. Bottom nav icon-only buttons fail WCAG. | **DO IT.** Focus on bottom nav + icon-only buttons. |
| 1.8 | E2E test of core flow | "No automated tests" | **True.** Only 3 unit tests exist (`src/test/`). No E2E. | **DEFER.** Real Playwright/Cypress = overkill this round. I'll do a manual scripted walkthrough instead and report findings. |

**Net result:** Of 8 tasks, **3 are already solved** (1.1, 1.2, 1.5-caching), **4 are real and worth doing** (1.3, 1.4, 1.6, 1.7 + 1.5-banner), **1 deferred** (1.8 → manual QA instead). This saves you ~6 credits and ~4 hrs of pointless work.

---

## What I'll build, in strict order

### 1.3 — Per-route ErrorBoundary (30 min, ~2 credits) ★ priority
**Why first:** Biggest stability win. Right now if `Progress.tsx` throws, the entire app shows the red error screen.

- Wrap each `<Route element={...}>` body in `App.tsx` (lines 152–171) with `<ErrorBoundary>` so a Dashboard crash doesn't kill Market, Profile, etc.
- Reuse existing `src/components/ErrorBoundary.tsx` (no changes — it already handles module-recovery).
- **Verify:** I'll temporarily throw inside one page in the preview, confirm only that page shows the error UI, then revert.

### 1.4 — Skeletons for Dashboard + Progress (45 min, ~3 credits)
- New file `src/components/dashboard/DashboardSkeleton.tsx` — mirrors the real layout (calorie ring, macro cards, today's meals strip) using existing `Skeleton` component.
- New file `src/components/progress/ProgressSkeleton.tsx` — week strip + weight arc + stat cards.
- Replace the `if (!d.profile) return null;` in `Dashboard.tsx` line 75 with `return <DashboardSkeleton />`.
- Same pattern in `Progress.tsx`.
- **Verify:** Throttle network in DevTools, confirm skeletons appear instead of blank.

### 1.6 — Image lazy-loading (30 min, ~2 credits)
- Add `loading="lazy"` + explicit `width`/`height` to `<img>` tags in:
  - `src/components/market/MarketImage.tsx` (highest impact — used in every market card)
  - `src/components/MarketItemCard.tsx`
  - `src/components/RecipeDetail.tsx`
  - `src/components/MealDetailSheet.tsx`
  - `src/components/FoodStoryStrip.tsx`
- First-fold images (hero, top 4 cards) get `loading="eager"` + `fetchpriority="high"` to avoid LCP regression.
- **Verify:** Network panel — scroll Market page, confirm images below fold load on scroll.

### 1.7 — Accessibility pass on icon-only buttons (45 min, ~3 credits)
- Add `aria-label` to icon-only buttons in:
  - `src/components/BottomNav.tsx` (Home, Dashboard, Plan, Profile, etc.)
  - `src/components/MarketBottomNav.tsx`
  - `src/components/dashboard/DashboardHeader.tsx` (Monika, settings, notifications)
  - `src/components/MarketItemCard.tsx` (compare toggle, add-to-plan)
  - `src/components/MarketPageHeader.tsx` (search, city)
- Add `role="status"` / `aria-live="polite"` to toast region (sonner already does this — just verify).
- **Verify:** Run Chrome Lighthouse a11y audit before/after, target +10 score points.

### 1.5-partial — Offline banner only (20 min, ~1 credit)
- New `src/components/OfflineBanner.tsx` — uses `navigator.onLine` + `online`/`offline` events, shows top sticky strip "You're offline. Some features may not work."
- Mount in `App.tsx` next to `BottomNav`.
- **DO NOT** touch service worker caching strategy — your `vite.config.ts` is already correct and adding caching inside the Lovable preview iframe will break HMR (per Lovable PWA guidelines).
- **Verify:** Toggle DevTools → Network → Offline, confirm banner appears.

### 1.1-polish — Sticky category header on Market (15 min, ~1 credit)
- Skip virtualization (already paginated). Just add `sticky top-X z-10` to the Fresh/Packed toggle + filter bar block (Market.tsx lines 305–356) so it stays visible while scrolling long lists.
- **Verify:** Scroll long list, confirm filter bar stays pinned.

### 1.8 — Manual QA pass (no credits, 20 min)
After all the above ships, I'll walk the full flow in the preview browser and report:
1. `/auth` → sign in
2. `/onboarding` → complete (if needed)
3. `/dashboard` → confirm skeleton then content
4. `/log` → log a meal
5. Back to `/dashboard` → confirm calories updated
6. `/progress` → confirm log appears in week strip
7. `/market` → confirm sticky header + lazy images
8. Force a render error in one page → confirm only that page shows error UI

Screenshot proof for each step.

---

## Tasks I'm explicitly NOT doing

| Skipped | Reason |
|---------|--------|
| react-window virtualization | Already solved by IntersectionObserver paging. Adding react-window now would be a regression — it doesn't play well with your variable-height MarketItemCard + sticky sections. |
| Sheet scroll audit | `ui/sheet.tsx` is already correct. If you have a SPECIFIC sheet that scrolls badly, name it and I'll fix that one. |
| Service worker caching strategy | Lovable preview runs in iframe. Adding aggressive caching = stale builds in preview = bad DX. PWA shell caching only matters for installed PWA, which is a Phase 2 conversation. |
| Real E2E tests (Playwright) | 6+ hr setup for marginal value while the app is still pre-launch. Manual QA + Sentry (Phase 2) catches more real bugs faster. |

---

## Technical details

**Files created:**
- `src/components/dashboard/DashboardSkeleton.tsx`
- `src/components/progress/ProgressSkeleton.tsx`
- `src/components/OfflineBanner.tsx`

**Files modified:**
- `src/App.tsx` (per-route ErrorBoundary wrap + mount OfflineBanner)
- `src/pages/Dashboard.tsx` (skeleton on null profile)
- `src/pages/Progress.tsx` (skeleton on loading)
- `src/pages/Market.tsx` (sticky header classes only)
- `src/components/market/MarketImage.tsx`
- `src/components/MarketItemCard.tsx`
- `src/components/RecipeDetail.tsx`
- `src/components/MealDetailSheet.tsx`
- `src/components/FoodStoryStrip.tsx`
- `src/components/BottomNav.tsx`
- `src/components/MarketBottomNav.tsx`
- `src/components/dashboard/DashboardHeader.tsx`
- `src/components/MarketPageHeader.tsx`

**No new dependencies.** No DB changes. No edge functions. Pure frontend polish.

**Total estimate:** ~3.5 hrs of build, ~12 credits. Each subtask shipped + verified before moving to the next.

**Order of execution:** 1.3 → 1.4 → 1.6 → 1.7 → 1.5-banner → 1.1-polish → 1.8 manual QA.

After each subtask I'll tell you "1.3 done, verified — moving to 1.4" so you can stop me if anything looks wrong.

