

# Plan: Fix Smart Calorie Correction Engine

## Root Cause Analysis

Three interrelated bugs in `updateCalorieBank` (lines 288-402):

1. **Stacking bug (line 362-366)**: Uses `state.calorieBank` (cumulative total) to build adjustment plans instead of today's `diff`. Each meal log rebuilds a full plan from the growing bank and MERGES it on top of existing plans, causing exponential growth.

2. **No deduplication in `mergeSources` (line 270-281)**: When merging sources for the same `targetDate`, sources with the same `sourceDate` are appended rather than replaced. This creates the dozens of "From Thu: -300 kcal" entries.

3. **No cleanup of stale source entries**: When today's intake changes (meal edit/delete), old adjustment entries sourced from today are never removed before new ones are added.

## Fix Strategy

**Replace the "merge on top" model with a "clear-and-rebuild from today's diff" model.** Each call to `updateCalorieBank` should:
1. Remove all adjustment plan entries and sources that originated from today
2. Compute today's diff (actual - target)
3. If diff is significant, spread ONLY today's diff across future days
4. Merge with adjustments from OTHER source days (untouched)

## Changes

### 1. `src/lib/calorie-correction.ts` — Fix `updateCalorieBank`

**Replace lines 361-398** (the surplus/deficit plan-building block):

- Before building new plan: strip all existing `adjustmentPlan` entries and `adjustmentSources` entries where `sourceDate === today`
- Build new plan from today's `diff` only (not cumulative `calorieBank`)
- For surplus: spread `diff` over recovery days
- For deficit: partial recovery for tomorrow
- If `|diff| < 50`: don't create plan entries for today (but keep entries from other days)

**Fix `mergeSources` (lines 270-281)**: When merging sources for the same `targetDate`, deduplicate by `sourceDate` — replace existing source entry instead of appending.

```typescript
function mergeSources(existing: AdjustmentSourceMap[], newEntries: AdjustmentSourceMap[]): AdjustmentSourceMap[] {
  const merged = [...existing];
  for (const entry of newEntries) {
    const idx = merged.findIndex(e => e.targetDate === entry.targetDate);
    if (idx !== -1) {
      // Deduplicate by sourceDate
      for (const newSrc of entry.sources) {
        const srcIdx = merged[idx].sources.findIndex(s => s.sourceDate === newSrc.sourceDate);
        if (srcIdx !== -1) {
          merged[idx].sources[srcIdx] = newSrc; // REPLACE, not append
        } else {
          merged[idx].sources.push(newSrc);
        }
      }
    } else {
      merged.push(entry);
    }
  }
  return merged.sort((a, b) => a.targetDate.localeCompare(b.targetDate));
}
```

**New helper — strip today's contributions before rebuild:**

```typescript
function stripSourceDay(state: CalorieBankState, sourceDate: string): void {
  // Remove today's contributions from adjustment plan
  for (const srcMap of state.adjustmentSources) {
    srcMap.sources = srcMap.sources.filter(s => s.sourceDate !== sourceDate);
  }
  // Rebuild adjustmentPlan from remaining sources
  state.adjustmentPlan = state.adjustmentSources
    .filter(s => s.sources.length > 0)
    .map(s => ({
      date: s.targetDate,
      adjust: s.sources.reduce((sum, src) => sum + src.appliedAdjustment, 0),
    }));
  // Remove empty source maps
  state.adjustmentSources = state.adjustmentSources.filter(s => s.sources.length > 0);
}
```

**Updated `updateCalorieBank` surplus block:**

```typescript
// Strip old adjustments from today before rebuilding
stripSourceDay(state, today);

if (diff > 50) {
  // Spread today's diff (NOT cumulative bank)
  const { plan, sources } = buildAdjustmentPlan(diff, originalTarget, today, spreadDays, mode, today);
  state.adjustmentPlan = mergePlans(state.adjustmentPlan.filter(e => e.date >= today), plan);
  state.adjustmentSources = mergeSources(state.adjustmentSources.filter(s => s.targetDate >= today), sources);
} else if (diff < -50) {
  // Deficit: partial recovery
  // ... same logic but using diff, not calorieBank
}
// If |diff| < 50: no new entries from today (other days' entries preserved)
```

### 2. `src/lib/calendar-helpers.ts` — Fix breakdown deduplication in UI

In `getAdjustmentBreakdownForDate`, group by `sourceDate` before returning:

```typescript
export function getAdjustmentBreakdownForDate(date: string, state: CalorieBankState): AdjustmentBreakdownEntry[] {
  const sourceMap = state.adjustmentSources.find(s => s.targetDate === date);
  if (!sourceMap) return [];
  // Group by sourceDate to prevent duplicates in UI
  const grouped = new Map<string, AdjustmentBreakdownEntry>();
  for (const s of sourceMap.sources) {
    const existing = grouped.get(s.sourceDate);
    if (existing) {
      existing.surplus = s.surplus; // use latest
      existing.appliedAdjustment += s.appliedAdjustment;
    } else {
      grouped.set(s.sourceDate, { sourceDate: s.sourceDate, surplus: s.surplus, appliedAdjustment: s.appliedAdjustment });
    }
  }
  return Array.from(grouped.values());
}
```

### 3. `src/lib/calorie-correction.ts` — Fix `getAdjustmentDetails` deduplication

Line 764-783: The `recentSurplusDays` already deduplicates via a Map, which is correct. The `futureAdjustments` section shows all sources per target date — with the `mergeSources` fix, this will no longer have duplicates.

### 4. `src/pages/Progress.tsx` — No changes needed

Calendar rendering already works correctly; the data it reads will now be clean.

### 5. `src/components/DayDetailsSheet.tsx` — No changes needed

`FutureDayPlanSection` already uses the calendar-helpers functions. With deduplicated data, the breakdown display will be clean.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/calorie-correction.ts` | Fix `mergeSources` dedup, add `stripSourceDay`, fix `updateCalorieBank` to use `diff` not `calorieBank` |
| `src/lib/calendar-helpers.ts` | Add dedup grouping in `getAdjustmentBreakdownForDate` |

