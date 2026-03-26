
Goal

- Remove the last hidden correction cache and make every calorie summary, weekly total, and adjustment preview come straight from raw logs.

What I found

- `src/lib/calorie-correction.ts` still persists `dailyBalances` / `lastProcessedDate` in `nutrilens_calorie_bank`, so the engine is not fully stateless yet.
- `src/pages/Progress.tsx` mixes `b.diff` (base-target math) with `b.adjustedTarget` (planned-target math) in the same weekly card, which explains contradictory totals like inflated weekly net vs smaller real meal surplus.
- `src/components/AdjustmentExplanationModal.tsx` still shows cumulative “X kcal across Y days” copy, which is exactly the fake aggregate the audit wants removed.
- `src/lib/hard-boundary.ts`, `src/lib/weekly-weight-checkin.ts`, `src/lib/seed-demo-data.ts`, and `src/components/QuickLogSheet.tsx` still depend on the old cached balance layer or deprecated aliases.

Plan

1. Rebuild `src/lib/calorie-correction.ts`
- Delete the persisted correction cache (`dailyBalances`) and deprecated compatibility helpers.
- Keep only non-correction preferences in storage (day type, auto-adjust, cutoff).
- Derive all balance rows from raw logs on demand using `getDailyTotals`.
- Make `processEndOfDay` the only correction write: freeze `adjustedTarget` onto that closed day’s log.
- Add shared pure helpers for:
  - raw day balance derivation
  - weekly/monthly totals from raw logs
  - `computeAdjustmentMap`, `computeAdjustedTarget`, source breakdown
  - validation + debug trace logging (`{ date, actual, baseTarget, diff }`)

2. Separate math responsibilities cleanly
- Source/correction math always uses `actual - baseTarget`.
- Today/future planning uses computed `adjustedTarget`.
- Weekly/monthly summaries use raw actuals + base targets only, so the totals match the audit math.
- Past-day explanation views can still show frozen planned targets, but they won’t be reused as source diffs.

3. Update UI consumers
- `src/pages/Progress.tsx`: rebuild the weekly card, monthly stats, future markers, and weekend pattern from raw-log helpers instead of cached balances.
- `src/components/AdjustmentExplanationModal.tsx`: remove cumulative adjustment totals and show only live per-day adjustments with source breakdown.
- `src/components/DayDetailsSheet.tsx` and `src/lib/calendar-helpers.ts`: use the new helpers so future previews and past explanations stay consistent.
- `src/pages/Dashboard.tsx`: keep rollover behavior, but stop depending on cached correction-state semantics.

4. Remove legacy write paths
- `src/pages/LogFood.tsx`, `src/components/MealDetailSheet.tsx`, `src/components/QuickLogSheet.tsx`: after saving food, only save the log and refresh UI; no correction-cache mutation.
- `src/lib/seed-demo-data.ts`: stop writing `BANK_KEY`; seed raw logs and freeze historical `adjustedTarget` directly into those logs.
- `src/lib/hard-boundary.ts` and `src/lib/weekly-weight-checkin.ts`: move to the same raw-log weekly helpers so alerts/check-ins use identical math as the Progress page.

Technical notes

- The biggest current bug source is not the spread formula anymore; it’s the app still combining two different target systems in one UI.
- The UI callback registry can remain as a refresh trigger, but it must not carry any correction data.
- If historical calorie goals need to stay exact after future goal changes, the safe extension is to snapshot that day’s base target on the closed log; otherwise this rebuild can consistently use the active goal across the current dataset.
