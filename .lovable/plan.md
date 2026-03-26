
Implement a focused realtime sync pass for the Dashboard, Progress calendar, and date details so the user can instantly see surplus/deficit for any day.

1. Fix the realtime foundation
- Centralize updates at the write layer instead of relying on scattered manual refreshes.
- Update the base log persistence flow (`saveDailyLog` and related date-specific mutators) so every add/edit/delete action triggers the same centralized recompute + `nutrilens:update` event.
- Keep `storage` listeners for cross-tab sync, but make in-app realtime event updates the primary mechanism.
- Add a shared local `YYYY-MM-DD` date helper and use it where Progress/Dashboard still depend on `toISOString().split('T')[0]`, so midnight/day changes are accurate in local time.

2. Make the calendar show clear surplus/deficit
- Upgrade `Progress.tsx` calendar data from simple adherence-only status to full per-day balance data:
  - actual calories
  - adjusted/frozen target
  - diff
  - balance type: surplus / deficit / balanced / no data / future adjustment
- Keep future recovery/reduction markers, but also show past-day surplus/deficit clearly in the cell styling/indicator.
- Improve the legend so users can immediately understand:
  - surplus day
  - deficit day
  - balanced/on-track day
  - future reduced day
  - future recovery day

3. Make tapped dates show the exact balance
- Extend `DayDetailsSheet` so tapping any date shows a clear “Day Balance” summary near the top:
  - Eaten
  - Target
  - Adjusted target if applicable
  - Result: surplus / deficit / on track
  - Difference in kcal
- For past days, compare against the frozen/adjusted target, not only the base goal.
- For future days, keep the existing Smart Plan Preview and adjustment explanation.

4. Make the calendar and date sheet truly live
- `Progress.tsx` should refresh immediately on:
  - `nutrilens:update`
  - `storage`
  - app/tab focus return
  - midnight rollover
- `DayDetailsSheet` should also subscribe while open, so if a meal is added/edited/deleted the selected day updates without closing and reopening.
- Keep polling only as a fallback safety net, not the main sync strategy.

5. Make Dashboard realtime with the same source of truth
- Ensure Dashboard listens to the same centralized update pipeline so calorie ring, surplus/deficit banner, and date context refresh instantly after any meal/water/activity/supplement change.
- Refresh Dashboard on midnight rollover as well, so the visible date and targets change exactly when the day changes.

6. Cover the flows currently causing stale UI
- Wire the centralized refresh into all mutation paths that currently only save local data:
  - meal add/edit/delete
  - water add/remove
  - supplement add/edit/delete
  - activity add/delete
  - meal photo/caption changes
  - missed-day / last-meal confirmation actions
- This removes the current mismatch where some screens call `syncDailyBalance()` and others do not.

Technical details
- Main files to update:
  - `src/lib/store.ts`
  - `src/lib/calorie-correction.ts`
  - `src/pages/Progress.tsx`
  - `src/components/DayDetailsSheet.tsx`
  - `src/pages/Dashboard.tsx`
  - likely `src/components/FullScreenMemory.tsx` and any edit flows that bypass centralized sync
- Reuse existing engine functions instead of inventing new logic:
  - `getDailyBalances`
  - `computeAdjustedTarget`
  - `computeAdjustmentMap`
  - existing `nutrilens:update` event pattern
- No backend changes needed; this is a frontend state-sync and calendar UX fix.

Expected result
- Calendar updates immediately after logging or editing anything.
- Each day clearly communicates surplus or deficit.
- Tapping any past date shows whether the user ate over or under target.
- Dashboard and Progress stay synchronized in real time, including at midnight.
