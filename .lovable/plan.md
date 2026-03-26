

# Plan: Harden Calorie Correction Engine

## What's wrong now

The engine is mostly stateless, but has these remaining issues:

1. **Rounding drift** in `computeAdjustmentMap` — `Math.round(diff / spreadDays)` loses calories (e.g., 385/4 = 96*4 = 384, losing 1 kcal). Over many days this accumulates.

2. **`getBalanceStreak` uses `adjustedTarget` in logic** (line 587) — violates the rule that `adjustedTarget` is UI-only, never used in diff/logic calculations.

3. **`AdjustmentExplanationModal` shows cumulative totals** (line 14-19) — "X kcal being reduced across Y days" is exactly the aggregate number that misleads users.

4. **Legacy shims still exported** — `updateCalorieBank`, `getCalorieBankSummary`, `getCalorieBankState` remain as deprecated exports. No callers exist, so they should be deleted.

5. **Debug trace logging missing** — No `console.log({ date, actual, baseTarget, diff })` trace in `getDailyBalances` to catch math issues during dev.

6. **Validation uses `console.log` not `console.error`** — soft warnings instead of loud failures.

## Changes

### 1. `src/lib/calorie-correction.ts`

**Fix rounding drift** in `computeAdjustmentMap` (line 222):
```typescript
// Replace: const perDay = Math.round(diff / spreadDays);
// With exact distribution:
const base = Math.floor(diff / spreadDays);
const remainder = diff % spreadDays;
// In loop: use (base + (i <= remainder ? 1 : 0))
```

**Fix `getBalanceStreak`** (line 587): Change from using `adjustedTarget` to using `baseTarget` only — streak measures adherence to the base goal, not the adjusted one.

**Add debug trace** in `getDailyBalances`: Log each day's `{ date, actual, baseTarget, diff }` when building balances.

**Harden validation** (line 747): Change `console.log` to `console.error` for the validation output so failures are loud.

**Delete legacy shims** (lines 759-781): Remove `updateCalorieBank`, `getCalorieBankSummary`, `getCalorieBankState` — no callers remain.

### 2. `src/components/AdjustmentExplanationModal.tsx`

Remove the cumulative summary line (lines 14-19). Replace with a simple status: "Your plan adjusts day-by-day based on recent intake." The per-day breakdown below already shows the exact numbers.

### 3. `src/pages/Progress.tsx`

Remove the duplicate comment on line 442-443 ("Weekly totals — use adjustedTarget when available" followed by "Weekly totals — always use baseTarget for honest math"). Keep only the correct comment.

## Files modified

| File | Change |
|------|--------|
| `src/lib/calorie-correction.ts` | Fix rounding; fix streak logic; add trace logging; harden validation; delete legacy shims |
| `src/components/AdjustmentExplanationModal.tsx` | Remove cumulative total display |
| `src/pages/Progress.tsx` | Clean duplicate comment |

