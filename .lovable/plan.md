

# Performance Optimization Plan for NutriLens AI

## Problem Summary
The app is slow due to: (1) synchronous full-scan of localStorage on every render cycle, (2) O(n²) calorie engine recomputation without adequate memoization, (3) zero usage of `React.memo` across ~120 components, (4) a "mega-hook" (`useDashboardInit`) running 15+ heavy computations on mount, and (5) a 10-second polling interval that re-reads all data unconditionally.

---

## Plan

### Step 1: Cache `getAllLogDates()` — the #1 hotspot
`getAllLogDates()` iterates every `localStorage` key on every call. It's called from `getDailyBalances()` → `computeAdjustmentMap()` → multiple UI paths, creating O(n) scans dozens of times per render.

**Fix:** Add an in-memory `Set<string>` cache for log dates, invalidated only when `saveDailyLog` adds/removes a date. This eliminates repeated full `localStorage` scans.

- File: `src/lib/store.ts`
- Add: `let _logDatesCache: string[] | null = null;`
- Invalidate in `saveDailyLog()` and `deleteMealFromLog()`
- Return cached value in `getAllLogDates()`

### Step 2: Limit historical data window to 90 days
The calorie engine currently loads ALL historical logs (unbounded). After months of use, this means loading hundreds of JSON objects from localStorage.

**Fix:** In `getDailyBalances()`, only scan the last 90 days instead of all dates. Older data has negligible correction impact (spread days max out at 30).

- File: `src/lib/calorie-correction.ts` — `getDailyBalances()` function
- Filter dates to last 90 days before loading logs

### Step 3: Debounce the Dashboard polling interval
The 10-second `setInterval` in `useDashboardInit` calls `getDailyLog()` + `getLatestBudgetAlert()` + `checkAndUpdateStreaks()` unconditionally, even when nothing changed.

**Fix:**
- Increase interval to 30 seconds
- Add a lightweight change-detection check (compare localStorage modification timestamp or log hash) before doing full recompute
- File: `src/hooks/useDashboardInit.ts`

### Step 4: Wrap heavy components in `React.memo`
Zero components use `React.memo`. Cards like `CalorieRing`, `MacroCard`, `NextMealCard`, `WaterTracker`, `HealthScoreCard`, `WeeklyReportCard` re-render on every parent state change.

**Fix:** Wrap the following high-frequency components:
- `src/components/CalorieRing.tsx`
- `src/components/MacroCard.tsx`
- `src/components/NextMealCard.tsx`
- `src/components/WaterTracker.tsx`
- `src/components/WaterTrackerCompact.tsx`
- `src/components/HealthScoreCard.tsx`
- `src/components/ConsistencyCard.tsx`
- `src/components/WeeklyReportCard.tsx`
- `src/components/SupplementsCompact.tsx`
- `src/components/DailyPlanCard.tsx`
- `src/components/NudgeBanner.tsx`

### Step 5: Memoize expensive Dashboard computations
`useDashboardInit` calls `recalculateDay()`, `getDailyTotals()`, `getDualSyncInsight()`, `isSurvivalModeActive()`, `isRecoveryModeActive()`, `getMealPlannerProfile()`, and `getPlanProgress()` on every render — outside `useEffect` or `useMemo`.

**Fix:**
- Wrap `totals`, `dayState`, `survivalMode`, `recoveryMode`, `dualSyncInsight`, `plannerIncomplete` in `useMemo` with `[log, profile]` dependencies
- File: `src/hooks/useDashboardInit.ts`

### Step 6: Lazy-load heavy init-only computations
On Dashboard mount, the init effect runs 12+ sequential operations (weather fetch, behavior stats, goal adaptation, end-of-day processing, weekly summary, drop-off check, hard boundary check, streak check, etc.). Many are independent and non-blocking.

**Fix:**
- Move weather fetch to a separate `useEffect` (already async, just decouple)
- Wrap non-critical checks (weekly summary, drop-off, hard boundary, streaks) in `requestIdleCallback` or `setTimeout(fn, 0)` so they don't block the first paint
- File: `src/hooks/useDashboardInit.ts`

### Step 7: Cache weather with proper TTL check
Weather service already has a 3-hour TTL cache, but `fetchLiveWeather()` is called on every Dashboard mount regardless. If cache is fresh, skip the API call entirely.

**Fix:** In `useDashboardInit`, check `getWeather()` first and only call `fetchLiveWeather()` if stale.
- File: `src/hooks/useDashboardInit.ts`

---

## Technical Details

### Performance impact estimates
| Fix | Impact | Effort |
|-----|--------|--------|
| Cache `getAllLogDates()` | Eliminates ~50 full localStorage scans per render cycle | 15 min |
| 90-day window limit | Reduces log parsing from unbounded to ~90 JSON.parse calls max | 10 min |
| Increase poll to 30s | 3x fewer background recomputations | 5 min |
| `React.memo` on 11 components | Prevents ~100+ unnecessary re-renders per interaction | 30 min |
| `useMemo` for derived state | Prevents 6+ heavy function calls on every state change | 15 min |
| `requestIdleCallback` for init | First paint ~200-400ms faster | 15 min |
| Weather cache check | Eliminates unnecessary geolocation + API call | 5 min |

### Files modified
- `src/lib/store.ts` — log dates cache
- `src/lib/calorie-correction.ts` — 90-day window
- `src/hooks/useDashboardInit.ts` — polling, memoization, idle scheduling, weather
- 11 component files — `React.memo` wrappers

### What this does NOT change
- No database migrations
- No new dependencies
- No API changes
- No feature removals — all existing features continue working identically, just faster

