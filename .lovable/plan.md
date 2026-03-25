

## Fix Smart Calorie Correction Engine — Missing Pieces

### Overview
Targeted fixes to the existing `calorie-correction.ts` and `meal-adjustment.ts` to close production gaps. No new files needed, no rewrites.

### Fix 1: Adjustment Plan Merging (Not Overwriting)

**`src/lib/calorie-correction.ts`**
- Add a `mergePlans()` helper that combines existing and new plan entries by date (summing adjustments for the same date).
- In `updateCalorieBank()` lines 297 and 312: replace direct assignment (`state.adjustmentPlan = ...`) with `state.adjustmentPlan = mergePlans(state.adjustmentPlan.filter(e => e.date >= today), newPlan)`.
- Same fix in `processEndOfDay()` line 426.

### Fix 2: Recalc Calories After Portion Change

**`src/lib/meal-adjustment.ts`**
- After every `item.quantity` change (lines 83, 109, 135), recalculate `item.calories` and `item.protein` using base per-unit values. Since `FoodItem.calories` and `FoodItem.protein` are per-unit values and `quantity` is the multiplier, the current math (`item.calories * item.quantity`) already works correctly for totals. However, add a comment clarifying this and ensure no stale total is cached.

Actually — reviewing the code more carefully: `item.calories` is the per-unit value and `quantity` is the count. The engine correctly uses `item.calories * item.quantity` for totals. The portion change modifies `quantity`, which is correct. **No code change needed here** — the math is already sound.

### Fix 3: Protein Constraint (Already Implemented)

The protein check already exists at lines 119-140 of `meal-adjustment.ts`. It checks if total protein dropped below 90% of target and boosts high-protein flexible items. **No change needed.**

### Fix 4: Locked-Meal Calorie Protection (Already Implemented)

Lines 35-56 of `meal-adjustment.ts` already separate locked vs flexible items and compute `flexTarget = adjustedTarget - lockedCal`. **No change needed.**

### Fix 5: Adherence Score Modulating Adjustments (Already Implemented)

Lines 287-290 of `calorie-correction.ts` already read adherence score and apply a 0.7 multiplier if score < 0.5. **No change needed.**

### Fix 6: Confidence Score Usage (Already Implemented)

Lines 279-284 already apply confidence-based softening. **No change needed.**

### Fix 7: Consecutive Surplus Failure Handling

**`src/lib/calorie-correction.ts`**
- Current code at line 283 checks `consecutiveSurplusDays > 3` and applies a 0.7 multiplier. This is correct but the adjustment plan entries themselves aren't dampened after creation.
- Add: after building the plan in the surplus branch (line 297), if `consecutiveSurplusDays > 3`, dampen each plan entry's adjust by 0.7.

### Fix 8: Day-Type Logic (Already Implemented)

`getAdjustedDailyTarget()` already handles fasting (return 0) at line 333 and cheat days bypass plan creation at line 273. **No change needed** — but cheat day should also return original target in `getAdjustedDailyTarget`. Currently cheat days fall through to the normal calculation. Fix: add `if (dayType === 'cheat') return originalTarget;` after the fasting check at line 333.

### Fix 9: Safe localStorage Init (Already Implemented)

`loadState()` already uses `{ ...DEFAULT_STATE, ...parsed }` at line 103. **No change needed.**

### Fix 10: UI Sync via Event Bus

**`src/lib/calorie-correction.ts`**
- Add a simple callback registry: `let uiUpdateCallbacks: Array<() => void> = []`
- Export `onCalorieBankUpdate(cb)` to register callbacks and `offCalorieBankUpdate(cb)` to unregister.
- At the end of `updateCalorieBank()` and `processEndOfDay()`, call all registered callbacks.
- In `Dashboard.tsx`, register a callback in useEffect that triggers a re-render (increment a state counter).

### Fix 11: PES Sorting (Partial)

The current code sorts by `proteinDensity` (protein/calories ratio) which is a reasonable proxy for PES. To use actual PES if available:

**`src/lib/meal-adjustment.ts`**
- Update the sort comparator to check for `(item as any).pes` first, falling back to proteinDensity. This makes it forward-compatible with PES scores when available.

### Fix 12: Portion Boundary Clamping

**`src/lib/meal-adjustment.ts`**
- After every quantity assignment, add: `item.quantity = Math.max(0.5, Math.min(1.5 * originalQty, item.quantity))` — but the code already has `minQty = Math.max(0.5, item.quantity * 0.5)` and `maxQty = item.quantity * 1.5`. The boundaries are already enforced. **No change needed.**

---

### Summary of Actual Changes

| File | Change |
|------|--------|
| `src/lib/calorie-correction.ts` | Add `mergePlans()` helper; use it in `updateCalorieBank` and `processEndOfDay`; add cheat-day return in `getAdjustedDailyTarget`; dampen plan entries on consecutive surplus; add UI callback registry |
| `src/lib/meal-adjustment.ts` | Add PES-aware sorting fallback |
| `src/pages/Dashboard.tsx` | Register `onCalorieBankUpdate` callback for reactive re-renders |

Most of the 12 "fixes" were already implemented in previous iterations. The real gaps are: plan merging (Fix 1), cheat-day target return (Fix 8), consecutive surplus dampening on plan entries (Fix 7), UI sync callbacks (Fix 10), and PES sort integration (Fix 11).

