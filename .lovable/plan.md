

# Comprehensive Fix Plan — All Issues Identified

## Summary

After a deep audit of every core engine file, here is the complete list of issues categorized by severity, with exact fix strategies for each.

---

## PHASE 1 — Critical Issues (App will break over months)

### Issue 1: localStorage Quota Overflow
**Problem:** ~11 keys created per day (log, adjustments, skipped, exercise_adj, redistributed, redistributed_details, smart_adj_log, recovery_dismissed, summary_shown, exercise_carry, recovery_snack). After 1 year = 4000+ keys. localStorage limit is 5MB.
**Files:** Every file using date-keyed localStorage
**Fix:** Create `src/lib/storage-cleanup.ts`:
- Run on app launch, delete keys older than 180 days for daily-detail keys (redistributed, exercise_adj, smart_adj_log, recovery_dismissed, summary_shown, exercise_carry, recovery_snack)
- Keep daily_log keys for 365 days (they sync to cloud)
- Add size monitor that warns at 4MB usage
- Call cleanup from `UserProfileContext.tsx` on auth load

### Issue 2: Base Target Mutation (Plateau + Adaptation)
**Problem:** Both `applyPlateauAdjustment()` (plateau-handler.ts:85) and `applyAdaptation()` (goal-engine.ts:484-491) permanently overwrite `profile.dailyCalories`. The calorie correction engine uses this as its "immutable base truth" for all historical diff calculations. After mutation, ALL historical diffs become wrong.
**Files:** `plateau-handler.ts`, `goal-engine.ts`, `store.ts` (UserProfile type)
**Fix:**
- Add `originalDailyCalories` field to `UserProfile` interface (set once during onboarding, never mutated)
- Add `adaptedDailyCalories` field for plateau/adaptation writes
- Update `calorie-correction.ts` to use `originalDailyCalories` for historical math
- Update onboarding to set both fields to the same initial value
- Update plateau-handler and goal-engine to write to `adaptedDailyCalories` only
- Add `originalDailyCalories` to cloud profile sync

### Issue 3: Triple Carry-Forward Systems (No Coordination)
**Problem:** Three independent carry-forward systems operate without knowing about each other:
1. `exercise-adjustment.ts` → `CARRY_FORWARD_KEY` (exercise carry-forward)
2. `redistribution-service.ts` → `CARRY_OVER_KEY` (missed meal carry-over)
3. `smart-adjustment.ts` → `OVEREAT_CARRY_KEY` (overage carry-forward)

Dashboard applies all three in sequence without deduplication (lines 100-114).
**Files:** `Dashboard.tsx`, `adjustment-coordinator.ts` (exists but NOT wired to UI)
**Fix:**
- Wire `getCoordinatedAdjustment()` into Dashboard to replace the three independent apply calls
- Add idempotency guard: store `carry_applied_YYYY-MM-DD` flag checked before any apply
- Cap combined carry-forward at ±25% TDEE (already in coordinator, just needs wiring)

### Issue 4: O(n^2) Performance Degradation
**Problem:** `getDailyBalances()` calls `getAllLogDates()` (scans ALL localStorage keys) then loads each log, then calls `computeAdjustmentMap()` which iterates all logs again. Called multiple times per render.
**Files:** `calorie-correction.ts`, `store.ts`
**Fix:**
- Memoization cache already added in Phase 3 for `computeAdjustmentMap` — verified working
- Add memoization to `getDailyBalances()` too (cache invalidated by `recomputeCalorieEngine()`)
- Limit `getAllLogDates()` scan to last 120 days for balance computation
- Add `console.debug` removal (line 658) — production performance drag

### Issue 5: Timezone Bug (UTC vs Local)
**Problem:** `toISOString().split('T')[0]` returns UTC date, not local. Found in 35 files. Critical in:
- `redistribution-service.ts:188` — `getYesterdayAdjustments()` uses UTC
- `plateau-handler.ts:29,56` — plateau detection uses UTC
- `notifications.ts:115,158` — notification timing uses UTC
- `streaks.ts:63` — `toDateStr()` uses UTC
- `weight-history.ts:36` — `getWeekStart()` uses UTC
- `weekly-feedback.ts:46-50` — week range uses UTC

For IST users (UTC+5:30), between 12:00AM-5:30AM, dates will be wrong.
**Fix:**
- Create shared `getLocalDateStr(d?: Date)` utility in `store.ts` (already exists as `toLocalDateKey`)
- Replace all `toISOString().split('T')[0]` with `toLocalDateKey()` across all 35 files
- Use `new Date(date + 'T12:00:00')` pattern for date arithmetic (already done in some files)

---

## PHASE 2 — Major Issues (Incorrect calculations / edge cases)

### Issue 6: Frozen Targets Expire After 60 Days
**Problem:** `finalizeDay()` (calorie-correction.ts:480-486) deletes frozen targets older than 60 days. Historical calendar views and progress reports lose accuracy.
**Fix:** Extend retention to 365 days. Also sync frozen targets to a cloud table for permanent storage.

### Issue 7: Cloud Sync Limit Removed But Not Verified
**Problem:** `restoreLogsFromCloud()` was updated to remove the 14-day limit, but the code already had no `days` parameter — the previous conversation's fix was already in the existing code. Need to verify the pagination actually works for large histories.
**Fix:** Already implemented. Just need to verify batch pagination works correctly (500 per batch).

### Issue 8: Carry-Over Idempotency
**Problem:** Dashboard `useEffect` (line 97-114) runs on every mount. React StrictMode double-mounts. `getPendingCarryOver()` checks `co.applied` but the check + apply is not atomic. Race window exists.
**Fix:** Add `useRef` guard in Dashboard + localStorage flag `carry_applied_YYYY-MM-DD` checked before applying.

### Issue 9: Protein Scaling in Adaptation
**Problem:** `applyAdaptation()` (goal-engine.ts:485-491) scales ALL macros by the same ratio including protein. This contradicts the "protein is locked" principle.
**Fix:** Lock protein in `applyAdaptation()`: keep `dailyProtein` unchanged, redistribute remaining calories between carbs and fat only.

### Issue 10: Weight Unit Not Normalized
**Problem:** `detectPlateau()` compares weights without checking units. If user switches between kg and lbs, 0.2kg threshold is meaningless for lbs values.
**Fix:** Normalize all weight comparisons to kg in plateau-handler and goal-engine using `weight-history.ts` unit field.

### Issue 11: Auto-Missed Meal Threshold Mismatch
**Problem:** Two different threshold systems:
- `calorie-engine.ts:120-125`: breakfast=11, lunch=16, snacks=19, dinner=23
- `meal-targets.ts:71-76`: breakfast=10, lunch=15, snack=17, dinner=21
**Fix:** Unify into a single exported constant used by both files.

### Issue 12: Balance Streak Uses baseTarget
**Problem:** `getBalanceStreak()` (calorie-correction.ts:864) measures against baseTarget, not adjustedTarget. User hits their adjusted target perfectly but streak breaks.
**Fix:** Compare against `adjustedTarget` (from frozen targets for past days) instead of `baseTarget`.

---

## PHASE 3 — Moderate Issues (UX / polish)

### Issue 13: Threshold Mismatch (10 vs 5 kcal)
**Problem:** `isTargetAdjusted()` uses >10 threshold, UI shows ±5.
**Fix:** Change constant to 5.

### Issue 14: Weight History Limited to 30 Entries  
**Problem:** `getWeightHistory(30)` only returns 30 days. Long-term charts can't show 3-month views.
**Fix:** Default to 365, sync to cloud table.

### Issue 15: No Data Export
**Problem:** No full backup/export mechanism.
**Fix:** Add JSON export function covering logs, weight, profile, achievements.

### Issue 16: Correction Mode Cache Stale on Logout
**Problem:** `_cachedMode` (calorie-correction.ts:228) is module-level, never cleared on logout.
**Fix:** Clear `_cachedMode = null` and `_adjMapCache = null` in auth state change handler.

### Issue 17: console.debug in Production
**Problem:** Line 658 logs every balance entry to console.
**Fix:** Remove or wrap in `if (import.meta.env.DEV)`.

### Issue 18: Weight Photos Stored as base64 in localStorage
**Problem:** `WeightEntry.photo` in weight-history.ts stores base64 photos. Not migrated to cloud.
**Fix:** Use the same cloud photo service for weight photos.

### Issue 19: BMR/TDEE Not Age-Adjusted Over Time
**Problem:** Age at signup used forever. After a birthday, calculations drift ~10-20 kcal/year.
**Fix:** Compute age from `dob` field dynamically instead of using stored `age`.

### Issue 20: Coordinator Not Wired to Any UI
**Problem:** `adjustment-coordinator.ts` was created but no component imports it. Dashboard still calls three engines independently.
**Fix:** Part of Issue 3 fix — wire coordinator to Dashboard, Calendar, DayDetails.

---

## Recommended Fix Order

| Step | Issues | Effort | Impact |
|------|--------|--------|--------|
| **Step 1** | #5 (timezone), #13 (threshold), #8 (idempotency), #17 (console.debug), #16 (cache stale) | ~1 hour | Quick wins, prevent silent bugs |
| **Step 2** | #2 (base target mutation), #9 (protein lock) | ~2 hours | Fixes core calculation integrity |
| **Step 3** | #1 (storage cleanup), #4 (performance) | ~2 hours | Prevents long-term app crash |
| **Step 4** | #3 + #20 (wire coordinator), #11 (threshold unify), #12 (streak fix) | ~2 hours | Unifies adjustment systems |
| **Step 5** | #6 (frozen targets), #14 (weight history), #18 (weight photos), #19 (age) | ~1 hour | Data quality improvements |
| **Step 6** | #15 (export), #10 (weight units) | ~1 hour | User-facing polish |

**Total: 20 issues, ~9 hours of work across 6 steps.**

