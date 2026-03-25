

# Plan: Fix After-Dinner Notification — Pure Function + In-Place Modal

## Problem
1. `getDinnerNotificationSummary()` has hidden dependencies (calls `getProfile()`, `loadState()`, `getDailyLog()` internally) — hard to test and risks stale state
2. LogFood navigates to `/dashboard?showAdjustment=true` instead of showing the modal in-place — bad UX after dinner logging
3. MealDetailSheet edit/delete doesn't reset the notification guard, so re-edits can't re-trigger

## Changes

### 1. `src/lib/calorie-correction.ts` — Make `getDinnerNotificationSummary` a pure function

Replace current signature (lines 785-836) with explicit parameters:

```typescript
export function getDinnerNotificationSummary(
  today: string,
  actualCalories: number,
  targetCalories: number,
  state: CalorieBankState
): { message: string; tomorrowTarget: number } | null
```

- Accepts today's date, actual eaten, original target, and current state explicitly
- Same internal logic (surplus spreads over 4+ days, deficit partial recovery)
- Computes `tomorrowTarget` from `state.adjustmentPlan` entries for tomorrow
- No more internal `getProfile()`, `loadState()`, `getDailyLog()` calls

### 2. `src/pages/LogFood.tsx` — Show modal in-place, no navigation

- Add state: `const [adjModalOpen, setAdjModalOpen] = useState(false)` and `const [adjDetails, setAdjDetails] = useState(null)`
- Import `getAdjustmentDetails`, `loadState` (or equivalent), `AdjustmentExplanationModal`
- In the dinner notification block (lines 194-208):
  - Call `getDinnerNotificationSummary(today, actualCal, targetCal, state)` with explicit args
  - Toast action opens modal in-place via `setAdjModalOpen(true)` instead of `navigate('/dashboard?showAdjustment=true')`
- Render `<AdjustmentExplanationModal>` at the bottom of the component JSX
- Keep existing navigation to dashboard after `commitMeal` completes (line 212)

### 3. `src/components/MealDetailSheet.tsx` — Update calls + clear guard on edit

- Update all 3 `getDinnerNotificationSummary()` calls to pass explicit parameters
- Before re-calling notification logic on dinner edit/delete, remove the localStorage guard so the notification can re-fire with updated data

### 4. `src/pages/Dashboard.tsx` — Remove `showAdjustment` URL param handling

Remove the auto-open-modal-on-param logic since we no longer navigate with that param from LogFood.

## Files Modified
| File | Change |
|------|--------|
| `src/lib/calorie-correction.ts` | Refactor `getDinnerNotificationSummary` to pure function |
| `src/pages/LogFood.tsx` | In-place modal, explicit function args |
| `src/components/MealDetailSheet.tsx` | Explicit args, guard reset on edit |
| `src/pages/Dashboard.tsx` | Remove `showAdjustment` param handling |

