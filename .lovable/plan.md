

# Plan: Clean Rebuild of Calorie Correction Engine

## Problem Summary
Despite prior refactoring, the engine still has critical bugs:
- `updateCalorieBank` computes `diff` against `originalTarget` instead of `effectiveTarget`, producing wrong daily balances
- Cumulative `calorieBank` number is still maintained and displayed ("Remaining: 2388 kcal")
- No per-day adjustment cap (-400 max), allowing -918 kcal spikes
- Today's data included in own adjustment computation (Progress.tsx line 141)
- `getCalorieBankSummary` exposes cumulative bank state to UI

## Changes

### 1. `src/lib/calorie-correction.ts` — Core fixes

**`computeAdjustmentMap`** — Add per-day clamp:
```typescript
// After computing all adjustments, clamp each day
for (const [date, val] of Object.entries(adjMap)) {
  if (val < -400) adjMap[date] = -400;  // Safety cap
}
```

**`updateCalorieBank`** — Fix diff to use effectiveTarget:
```typescript
// Line 445: change from
const diff = totals.eaten - originalTarget;
// to
const adjustedTarget = computeAdjustedTarget(today, originalTarget, state.dailyBalances);
const diff = totals.eaten - adjustedTarget;
```
Also store `adjustedTarget` on the balance entry.

**`processEndOfDay`** — Same fix for diff:
```typescript
const diff = totals.eaten - frozenAdjustedTarget; // not originalTarget
```

**`getCalorieBankSummary`** — Replace cumulative bank display with computed status:
- Instead of showing `state.calorieBank` (cumulative, fake), compute today's adjustment from `computeAdjustmentMap` and show status as "Surplus", "Deficit", or "On Track" based on today's diff only.

**Remove `getAdjustmentPlan`** — It returns "pending" data that feeds confusing UI. Replace callers with direct `computeAdjustmentMap` usage.

**Add validation function**:
```typescript
export function validateAdjustmentIntegrity(pastLogs, baseTarget): { valid: boolean; warnings: string[] }
```
Checks: total future adjustments roughly equals total past surplus minus recovery; no single day exceeds -400; no duplicate sources.

### 2. `src/pages/Progress.tsx` — Exclude today from adjMap

Line 141: Change filter from `b.actual > 0` to `b.date < todayStr && b.actual >= 300`:
```typescript
const adjMap = useMemo(() => {
  const todayStr = new Date().toISOString().split('T')[0];
  const pastLogs = bankState.dailyBalances.filter(
    (b: DailyBalanceEntry) => b.date < todayStr && b.actual >= 300
  );
  return computeAdjustmentMap(pastLogs, baseTarget);
}, [bankState, baseTarget]);
```

### 3. `src/pages/Dashboard.tsx` — Remove "Remaining" / "Pending" UI

The `getCalorieBankSummary` return already feeds into UI. With the fix in step 1, it will show status-based labels ("Surplus", "Deficit", "On Track") instead of cumulative numbers.

### 4. `src/components/DayDetailsSheet.tsx` — Status labels

In `FutureDayPlanSection`, change the adjustment badge text to use "Surplus" / "Deficit" terminology instead of raw adjustment numbers when the adjustment is from a specific source.

### 5. `src/components/AdjustmentExplanationModal.tsx` — Remove cumulative display

Check if this modal shows cumulative bank numbers and replace with per-day computed breakdown.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/calorie-correction.ts` | Fix diff calculations to use effectiveTarget; add -400 clamp per day in adjMap; fix `getCalorieBankSummary`; add validation function; remove `getAdjustmentPlan` |
| `src/pages/Progress.tsx` | Exclude today from adjMap computation; filter `actual >= 300` |
| `src/pages/Dashboard.tsx` | Remove any "Remaining" / cumulative correction display |
| `src/components/DayDetailsSheet.tsx` | Use status labels (Surplus/Deficit/On Track) |
| `src/components/AdjustmentExplanationModal.tsx` | Remove cumulative bank display if present |

