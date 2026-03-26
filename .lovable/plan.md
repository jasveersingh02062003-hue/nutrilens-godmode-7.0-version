

# Plan: Extended-Horizon Calorie Correction Engine

## Summary

Upgrade the correction engine from a fixed 4-5 day spread to a dynamic 7-14 day spread based on TDEE, fix weekly summary date ranges, and ensure all future adjustment days show indicators on the calendar.

## Changes

### 1. `src/lib/calorie-correction.ts` — Dynamic Spread Algorithm

**Replace** the fixed `spreadDays = diff > 800 ? 5 : 4` logic in `computeAdjustmentMap` (line 229) with:

```
function computeSafeSpreadDays(surplus: number, tdee: number): number {
  const maxDailyReduction = Math.min(300, Math.round(tdee * 0.1));
  let days = Math.ceil(surplus / maxDailyReduction);
  return Math.max(4, Math.min(days, 14)); // floor 4, cap 14
}
```

- Add `tdee` parameter to `computeAdjustmentMap` signature (default 2000)
- Use `computeSafeSpreadDays(Math.abs(diff), tdee)` for surplus spreading
- Apply same change in `computeBreakdownForDate` and `computeDinnerSummary` for consistency
- Deficit recovery stays unchanged (single-day, capped at 250)

**Update all callers** of `computeAdjustmentMap` to pass TDEE from profile:
- `getDailyBalances` — reads `profile.tdee`
- `computeAdjustedTarget` — new `tdee` param
- `getAdjustmentDetails`, `getTodayAdjustmentStatus`, `getAdjustedDailyTarget`

### 2. `src/lib/calorie-correction.ts` — Floor Protection During Spread

In the clamping pass (line 253-287), after computing `adjMap`, add a floor check:

```
// Floor check: if baseTarget + adjustment < 1200, reduce adjustment
for (const date of dates) {
  const tentative = baseTarget + adjMap[date];
  if (tentative < 1200) {
    adjMap[date] = 1200 - baseTarget; // weakest possible reduction
  }
}
```

This prevents the spread from ever pushing a day below 1200 kcal.

### 3. `src/lib/weekly-feedback.ts` — Fix Weekly Date Range

`getLastSundayRange()` (line 44-57) computes Mon→Sun (last completed week). The user wants **last 7 days from today** (rolling window).

**Replace** with:
```
function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - 6);
  return { start: startDate.toISOString().split('T')[0], end };
}
```

Update `generateWeeklySummary` and `shouldGenerateSummary` to use this rolling window.

### 4. `src/pages/Progress.tsx` — Weekly Overview Uses Last 7 Days

The `weeklyData` (line 160-165) already uses `logs.slice(0, 7)` from `getRecentLogs(30)`, which is the last 7 days. This is correct.

The `CalorieBalanceCard` `last7` (line 438) uses `balances.slice(-7)` — also the last 7 logged days. Needs verification that this matches the rolling 7-day window (may skip days with no data). Add a comment noting this behavior.

### 5. `src/lib/calorie-correction-diagnostic.ts` — Update Tests for Dynamic Spread

Update test expectations to match the new dynamic spread:
- Test 1 (700 surplus, TDEE ~2000): `maxReduction = min(300, 200) = 200`, spread = `ceil(700/200) = 4` days
- Test 3 (1800 total surplus): spread across more days now

### 6. `src/lib/calendar-helpers.ts` — No Changes Needed

Already uses `computeAdjustmentMap` which will automatically return the extended horizon. The calendar in `Progress.tsx` already renders `🔻`/`🔺` for all future days with non-zero adjustment (line 228-230).

### 7. Real-Time Sync — Already Working

`syncDailyBalance()` triggers `notifyUICallbacks()` which re-renders Dashboard. The Dashboard's `handleBankUpdate` callback (line 185-191) re-reads all state. No changes needed — the architecture is already reactive.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/calorie-correction.ts` | Add `computeSafeSpreadDays`, update `computeAdjustmentMap`/`computeBreakdownForDate`/`computeDinnerSummary` to use dynamic spread + TDEE param, add 1200 floor protection |
| `src/lib/weekly-feedback.ts` | Change `getLastSundayRange` to rolling 7-day window |
| `src/lib/calorie-correction-diagnostic.ts` | Update test expectations for dynamic spread |
| `src/lib/calendar-helpers.ts` | Pass TDEE to `computeAdjustmentMap` calls |
| `src/pages/Progress.tsx` | Pass TDEE to `computeAdjustmentMap` call in `CalorieBalanceCard` |

## What's NOT Changing

- Deficit recovery logic (single-day, 30%, cap 250) — unchanged
- Protein lock — unchanged  
- Safety floor 1200 kcal — reinforced
- UI callback architecture — already working
- Calendar visualization — already shows all future days

