

# Plan: Final 3 Hardening Fixes

## What's still wrong

1. **Clamp breaks conservation** — clamping to ±300 without redistributing the remainder means calories get silently lost. The reconciliation check will flag this as a mismatch.

2. **Today boundary not enforced inside `computeAdjustmentMap`** — relies on callers to filter. The function itself must reject `day.date >= today`.

3. **`computeBreakdownForDate` still uses `Math.round`** — diverges from the exact distribution in `computeAdjustmentMap`, so the UI explanation won't match the actual adjustment.

4. **Reconciliation check missing from `getDailyBalances`** — debug trace exists but no automatic conservation verification.

5. **Validation thresholds still reference -400** — should be ±300 to match the new clamp.

## Changes — all in `src/lib/calorie-correction.ts`

### 1. Clamp with redistribution (lines 244-248)

Replace simple clamp with a two-pass redistribution loop:
- First pass: apply ideal adjustments, clamp each day to ±300, track any leftover.
- Second pass: redistribute leftover across days that still have capacity (within ±300).
- This preserves total conservation while keeping per-day limits safe.

### 2. Today boundary inside `computeAdjustmentMap` (line 213)

Add explicit guard at the top of the loop:
```typescript
const today = getEffectiveDate();
// inside loop:
if (day.date >= today) continue;
```

### 3. Fix `computeBreakdownForDate` to use exact distribution (lines 298-305)

Replace `Math.round(diff / spreadDays)` with the same `Math.floor` + remainder logic used in `computeAdjustmentMap`, and determine which slot index corresponds to `targetDate` to return the exact per-day value.

### 4. Add reconciliation check at end of `getDailyBalances` (after line 397)

After building all balances, compute the adjustment map from past-only logs and verify:
```typescript
const totalDiff = sum of all surplus diffs (>50) as negative + recovery diffs (<-50) as positive
const totalAdj = sum of adjMap values
if (Math.abs(totalDiff - totalAdj) > 1) console.error(...)
```
Also verify no single adjMap entry exceeds ±300.

### 5. Update validation thresholds (lines 728-733)

Change `-400` references to `-300` / `300` to match the new clamp.

## Files modified

| File | Change |
|------|--------|
| `src/lib/calorie-correction.ts` | Clamp redistribution; today guard; breakdown exact math; reconciliation check; updated thresholds |

