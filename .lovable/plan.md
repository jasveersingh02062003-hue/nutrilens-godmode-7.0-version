
Plan to fix the live calendar and carry-forward issue properly.

1. Fix the real root cause in the calorie engine
- The current future-plan logic ignores today as a live source, so March 28 does not react while March 27 is still in progress.
- I’ll split the engine into:
  - finalized adjustments: committed past days
  - projected adjustments: finalized past days + today’s live intake
- This lets the app show “if the day ended now” targets for tomorrow and later dates in real time, without waiting for midnight.

2. Change carry-forward math so it matches your expectation
- Right now deficits recover mostly on the next day only, which is why the split is not showing the way you want.
- I’ll update the projection logic so both surplus and deficit can be spread across multiple future days with caps and safety limits.
- Past finalized days will stay stable, but future dates will re-split instantly as today’s calories change.

3. Make “last meal” actually finalize the day
- The current last-meal confirmation stores a flag, but that flag is not driving the engine.
- I’ll wire this into a real finalize flow so:
  - when the user confirms dinner is the last meal, today is frozen immediately
  - tomorrow and later dates update from that finalized result right away
- Midnight rollover will also use the same logic so 27th → 28th stays consistent.

4. Make the calendar truly real time
- Update the Progress calendar to use projected future targets, not only old finalized balances.
- Each date cell will show:
  - past days: actual surplus/deficit vs that day’s frozen/adjusted target
  - today: live current balance
  - future days: projected adjustment based on current data
- Refresh triggers will be unified across:
  - meal add/edit/delete
  - supplements
  - water
  - activity
  - last-meal confirmation
  - focus/storage/midnight boundary

5. Improve tap-on-date behavior
- When you tap tomorrow or any future date, the sheet should show the live projected target for that date.
- When you tap today, it should show:
  - eaten so far
  - current target
  - current deficit/surplus
  - projected effect on tomorrow and the next few days
- When you tap past days, it should still show the exact frozen result for that day.

6. Fix date sync issues
- There are still places using UTC-style `toISOString().split('T')[0]`, which can cause 27/28 date drift.
- I’ll replace the remaining calendar/engine/logging date logic with local date keys so dashboard, calendar, and tomorrow preview stay in sync.

Files to update
- `src/lib/calorie-correction.ts`
  - add projected-vs-finalized adjustment logic
  - make multi-day carry-forward work for live planning
  - add real finalize-day behavior
- `src/pages/Progress.tsx`
  - use projected future targets in calendar cells
  - keep calendar live without stale values
- `src/components/DayDetailsSheet.tsx`
  - show exact live/projected balance when tapping dates
- `src/pages/Dashboard.tsx`
  - keep today/tomorrow indicators synced with the same source of truth
- `src/pages/LogFood.tsx`
  - ensure meal logging updates projected future dates immediately
- `src/components/LastMealConfirmSheet.tsx`
  - connect confirmation to actual day finalization
- `src/lib/store.ts`
  - keep centralized update dispatch as the single realtime trigger

Expected result
- If today is March 27 and you log food, the calendar updates immediately.
- If you tap March 28, you’ll see the live projected calories for tomorrow based on what you’ve eaten today.
- If today ends in surplus or deficit, that amount will visibly split across future days in the calendar.
- If you confirm dinner as the last meal, the split becomes committed immediately instead of waiting and appearing late.
