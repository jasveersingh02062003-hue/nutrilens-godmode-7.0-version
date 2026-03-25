

# Plan: Add Adjustment Source Tracking & Enhanced Explanation UI

## Overview

Enhance the calorie correction engine to track **which past days caused each adjustment**, then surface this through an improved explanation modal and a morning toast notification. This replaces the current `WhyAdjustedModal` with a richer `AdjustmentExplanationModal`.

## Changes

### 1. Extend Data Model in `src/lib/calorie-correction.ts`

- Add new types: `AdjustmentSource` and `AdjustmentSourceMap`
- Add `adjustmentSources: AdjustmentSourceMap[]` to `CalorieBankState` and `DEFAULT_STATE`
- Modify `buildAdjustmentPlan()` to also return source entries (pass the source date + surplus amount through)
- Modify `updateCalorieBank()`: when building surplus or deficit plans, record source entries linking each target date back to the source date and its contribution
- Merge sources in `mergePlans()` (or a new `mergeSources()` helper)
- Add two new exported functions:
  - `getAdjustmentExplanation(date?)` → returns a plain-text string summarizing why today's target changed (e.g., "On Monday, you ate +400 kcal over target → spread across 4 days")
  - `getAdjustmentDetails()` → returns structured data: `{ recentSurplusDays, futureAdjustments }` with sources per day

### 2. New Component: `src/components/AdjustmentExplanationModal.tsx`

- Uses existing `Dialog` component (consistent with `WhyAdjustedModal`)
- Sections:
  - **Header**: "Why your calories changed ⚖️" with summary message
  - **Source days**: List of past days with their surplus/deficit amounts, formatted with date-fns
  - **Future plan**: Each upcoming adjusted day showing total adjustment and which source days contributed
  - **Protein lock note**: Same as current WhyAdjustedModal
- Replace usage of `WhyAdjustedModal` in Dashboard with this new modal

### 3. Dashboard Integration (`src/pages/Dashboard.tsx`)

- Replace `WhyAdjustedModal` import with `AdjustmentExplanationModal`
- On mount (inside existing profile useEffect), call `getAdjustmentExplanation()`. If non-null, show a morning toast via `toast()` with the explanation text and a "Details" action button that opens the modal
- The existing ⚖️ badge click handler (`setWhyModalOpen(true)`) now opens the new modal with data from `getAdjustmentDetails()`
- Remove old `WhyAdjustedModal` import

### 4. Cleanup

- `WhyAdjustedModal.tsx` can be deleted (replaced by the new component)

## Technical Details

**Source tracking structure:**
```text
AdjustmentSource {
  sourceDate: string      // day the surplus/deficit occurred
  surplus: number          // the diff on that day
  appliedAdjustment: number // how much of it applies to target day
}

AdjustmentSourceMap {
  targetDate: string
  sources: AdjustmentSource[]
}
```

**Storage:** Persisted inside the existing `nutrilens_calorie_bank` localStorage key (as part of CalorieBankState). Sources array is pruned alongside dailyBalances (keep last 30 days).

**Backward compat:** `loadState()` already spreads `DEFAULT_STATE` over parsed data, so the new `adjustmentSources: []` default handles old state gracefully.

## Files Modified
| File | Action |
|------|--------|
| `src/lib/calorie-correction.ts` | Add types, source tracking in updateCalorieBank, two new export functions |
| `src/components/AdjustmentExplanationModal.tsx` | New file — enhanced explanation modal |
| `src/pages/Dashboard.tsx` | Swap WhyAdjustedModal → AdjustmentExplanationModal, add morning toast |
| `src/components/WhyAdjustedModal.tsx` | Delete (replaced) |

