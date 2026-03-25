

## Smart Calorie Correction Engine — Enhancement Plan

### What's Already Done
The core engine (`calorie-correction.ts`), meal adjustment (`meal-adjustment.ts`), Dashboard integration (badge + toast + processEndOfDay), and a basic CalorieBalanceCard in Progress are already implemented and working.

### What This Plan Adds

**1. Enrich Data Model in `src/lib/calorie-correction.ts`**
- Change `dailyBalances` from `{date, diff}` to `{date, target, actual, diff, bankAfter}` for richer history.
- Add `adjustmentPlan: Array<{date, adjust}>` to track planned future adjustments explicitly.
- New functions:
  - `getAdjustmentPlan()` — returns active adjustment plan entries for recovery tracker UI.
  - `getMonthlyStats(month?)` — returns `{ surplusDays, deficitDays, balancedDays, netBalance }`.
  - `getWeekendPattern()` — simple rule: checks if surplus days cluster on weekends for behavioral insight.
- Modify `updateCalorieBank` to store richer balance entries and maintain `adjustmentPlan`.
- Modify `processEndOfDay` to clean up expired plan entries and rebuild plan if bank remains.

**2. Enhanced Progress Page (`src/pages/Progress.tsx`)**

Replace the existing `CalorieBalanceCard` with a richer section containing three sub-components:

- **Weekly Balance Card** — Table showing last 7 days: date, target, actual, diff, status label. Net weekly surplus/deficit at the top. Summary text.
- **Recovery Tracker** — If `adjustmentPlan` has entries, show: "Correction in progress: +X kcal from [day] → being balanced across [N] days. Remaining: Y kcal." With an expandable "Show details" section listing each planned adjustment day.
- **Monthly Summary** (toggle view) — Stats: surplus days count, deficit days count, balanced days count, net monthly balance. Behavioral insight if weekend pattern detected. The existing bar chart stays but uses the richer data.

**3. Meal Logging Notifications Enhancement**

In `MealDetailSheet.tsx` and `LogFood.tsx`, after calling `updateCalorieBank`, check if today just crossed into surplus or deficit and show an immediate contextual toast:
- First surplus crossing: "You went over your target today. No worries — we'll adjust the next few days to keep you on track."
- These are in addition to the morning rollover toast already in Dashboard.

### Files Changed
1. `src/lib/calorie-correction.ts` — Enrich data model, add adjustmentPlan, new query functions
2. `src/pages/Progress.tsx` — Replace CalorieBalanceCard with weekly table + recovery tracker + monthly stats
3. `src/components/MealDetailSheet.tsx` — Add contextual surplus/deficit toast after bank update
4. `src/pages/LogFood.tsx` — Same contextual toast after bank update

### Technical Notes
- All data stays in localStorage (single key `nutrilens_calorie_bank`)
- Backward compatible: existing `dailyBalances` entries without new fields get defaults
- No new dependencies — charts use plain divs/bars as already done
- Protein lock unchanged (already working)
- `recalculateDay` in `calorie-engine.ts` already uses `getAdjustedDailyTarget` — no change needed there

