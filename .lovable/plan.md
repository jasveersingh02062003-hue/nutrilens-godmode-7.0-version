

## Fix Calculation Issues, Add Future Month Navigation, and Add On/Off Toggle

### Issues Found

1. **Deficit carry-forward only recovers 30%** — Line 345 in `calorie-correction.ts`: `totalRecovery = Math.min(Math.round(deficit * 0.3), 250 * deficitSpread)`. The user expects the FULL deficit to be distributed across future days, not just 30%. With a 1641 kcal deficit on Thursday, only ~492 kcal is being added back, which is why the calendar shows small +135 adjustments instead of meaningful recovery amounts.

2. **Cannot navigate to April** — Line 240 in `Progress.tsx`: `Math.min(0, m + 1)` caps the month offset at 0, preventing forward navigation to see projected future months.

3. **No on/off toggle visible to user** — There is already an `autoAdjust` toggle in the Profile page settings, but it is labeled "Auto Adjust Meals" which is unclear. Need to make this more prominent and clearly labeled as the carry-forward on/off switch.

### Plan

**Step 1: Fix deficit carry-forward math** (`src/lib/calorie-correction.ts`)
- Change the deficit recovery from 30% to 100% of the deficit amount, spread across multiple days using the same `computeSafeSpreadDays` logic that surplus already uses
- This ensures a 1641 kcal deficit on Thursday gets fully distributed (e.g., ~328/day across 5 days) instead of only 492 total
- Keep the per-day cap (maxDailyAdjustment) and 1200 kcal floor safety limits

**Step 2: Allow future month navigation** (`src/pages/Progress.tsx`)
- Change `Math.min(0, m + 1)` to `Math.min(1, m + 1)` so users can navigate one month ahead to see April's projected adjustments
- Future month dates will use the projected adjustment map to show recovery/reduction indicators

**Step 3: Rename and improve the carry-forward toggle** (`src/pages/Profile.tsx`)
- Rename "Auto Adjust Meals" to "Calorie Carry-Forward" with clearer description: "Spread surplus/deficit across future days"
- Keep the existing `getAutoAdjust`/`setAutoAdjust` logic which already gates the engine in `getAdjustedDailyTarget`

**Step 4: Fix CalorieBalanceCard date usage** (`src/pages/Progress.tsx`)
- Line 474 still uses `toISOString().split('T')[0]` — change to `toLocalDateKey()` for consistency

### Technical Details

The core math fix in `_buildAdjustmentMap`:
```
// BEFORE (deficit branch):
const totalRecovery = Math.min(Math.round(deficit * 0.3), 250 * deficitSpread);

// AFTER:
const deficitSpread = computeSafeSpreadDays(deficit, tdee, mode);
// Distribute the full deficit, same as surplus
const base = Math.floor(deficit / deficitSpread);
const remainder = deficit % deficitSpread;
```

This mirrors the surplus branch exactly, ensuring symmetrical treatment. The per-day clamp and floor protection already handle safety limits downstream.

