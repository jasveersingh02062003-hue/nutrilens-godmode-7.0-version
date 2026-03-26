

# Plan: Adaptive Calorie Correction Engine with User-Controlled Intensity

## Summary

Wire the correction mode setting (Aggressive/Balanced/Relaxed) into the engine so it actually controls the spread algorithm, persist it in localStorage, and update all callers.

## Current State

- `correctionMode` in `Profile.tsx` is **local React state only** — resets to `'balanced'` on every mount, never saved, never read by the engine
- Engine uses `computeSafeSpreadDays(surplus, tdee)` with a fixed formula: `min(300, tdee * 0.1)` — ignores any mode
- The mode names in Profile are `['balanced', 'aggressive', 'flexible']` but the prompt uses `['aggressive', 'balanced', 'relaxed']`

## Changes

### 1. `src/lib/calorie-correction.ts` — Mode-Aware Engine

Add a `CorrectionMode` type and persistence:

```typescript
export type CorrectionMode = 'aggressive' | 'balanced' | 'relaxed';

const CORRECTION_MODE_KEY = 'nutrilens_correction_mode';

export function getCorrectionMode(): CorrectionMode {
  return (localStorage.getItem(CORRECTION_MODE_KEY) as CorrectionMode) || 'balanced';
}

export function setCorrectionMode(mode: CorrectionMode) {
  localStorage.setItem(CORRECTION_MODE_KEY, mode);
  notifyUICallbacks(); // instant UI refresh
}
```

Replace `computeSafeSpreadDays` to use mode:

```typescript
function computeMaxDailyAdjustment(tdee: number, mode: CorrectionMode): number {
  const caps = { aggressive: 0.25, balanced: 0.20, relaxed: 0.10 };
  const absoluteMax = { aggressive: 500, balanced: 400, relaxed: 300 };
  return Math.min(Math.round(tdee * caps[mode]), absoluteMax[mode]);
}

export function computeSafeSpreadDays(surplus: number, tdee: number, mode: CorrectionMode = 'balanced'): number {
  const maxDaily = computeMaxDailyAdjustment(tdee, mode);
  let days = Math.ceil(surplus / Math.max(1, maxDaily));
  return Math.max(2, Math.min(days, 14));
}
```

Update `MAX_ADJUSTMENT_PER_DAY` from a constant to a function call — all references in `computeAdjustmentMap` clamping pass will use `computeMaxDailyAdjustment(tdee, mode)`.

Update `computeAdjustmentMap` signature to accept `mode`:

```typescript
export function computeAdjustmentMap(
  pastLogs: DailyBalanceEntry[],
  baseTarget: number,
  tdee: number = 2000,
  mode: CorrectionMode = 'balanced'
): Record<string, number>
```

All internal callers (`getDailyBalances`, `computeAdjustedTarget`, `getAdjustmentDetails`, `getTodayAdjustmentStatus`, etc.) will read `getCorrectionMode()` and pass it through.

### 2. `src/pages/Profile.tsx` — Persist Mode

- Replace `correctionModeState` init from `'balanced'` to `getCorrectionMode()`
- Replace `handleCorrectionModeChange` to call `setCorrectionMode(next)` 
- Rename `'flexible'` to `'relaxed'` in the cycle order
- Import `getCorrectionMode`, `setCorrectionMode`, `CorrectionMode` from calorie-correction

### 3. `src/lib/calorie-correction-diagnostic.ts` — Update Tests

Update test expectations to account for mode-based caps (tests should use `'balanced'` mode explicitly).

### 4. Callers in Other Files

Update these to pass mode through where they call `computeAdjustmentMap` or `computeBreakdownForDate`:
- `src/pages/Progress.tsx`
- `src/components/DayDetailsSheet.tsx`

They already pass `tdee`; add `getCorrectionMode()` as the 4th arg.

### 5. Weekly Summary — Already Fixed

The rolling 7-day window was implemented in the previous change. No further work needed.

### 6. Real-Time Sync — Already Working

`syncDailyBalance()` calls `notifyUICallbacks()`. `setCorrectionMode()` will also call it. Dashboard already subscribes via `onCalorieBankUpdate`. No changes needed.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/calorie-correction.ts` | Add `CorrectionMode` type, persistence, `computeMaxDailyAdjustment`, update spread/clamp logic to be mode-aware |
| `src/pages/Profile.tsx` | Wire correction mode to engine persistence, rename `flexible` → `relaxed` |
| `src/lib/calorie-correction-diagnostic.ts` | Pass mode to test calls |
| `src/pages/Progress.tsx` | Pass `getCorrectionMode()` to engine calls |
| `src/components/DayDetailsSheet.tsx` | Pass `getCorrectionMode()` to engine calls |

## What's NOT Changing

- Deficit recovery (single-day, 30%, cap 250) — unchanged
- Protein lock — unchanged
- 1200 kcal safety floor — unchanged
- UI callback architecture — already reactive
- Weekly summary date range — already fixed to rolling 7 days

