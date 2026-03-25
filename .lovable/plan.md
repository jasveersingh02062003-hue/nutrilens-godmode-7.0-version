

# Plan: Intelligent Calendar with Future Day Macro Planning

## Overview
Extend the Progress tab calendar so that tapping a **future date** shows an intelligent plan preview (adjusted calories, macro breakdown, adjustment explanations) instead of the current empty "you can't log" state. Past dates continue showing stored data.

## Files to Create

### 1. `src/lib/calendar-helpers.ts` — Pure helper functions

```typescript
getFutureDayPlan(date, profile, state) → { calories, protein, carbs, fats, adjustment, adjustedTarget }
getDayStatus(actual, adjustedTarget) → 'on-track' | 'partial' | 'off-track' | 'no-data'
getAdjustmentBreakdownForDate(date, state) → AdjustmentSource[]
```

- **Protein stays fixed** (`profile.dailyProtein`)
- Remaining calories after protein (protein × 4) split: 75% carbs (÷4), 25% fat (÷9)
- Clamp negative remaining to 0
- Uses existing `CalorieBankState.adjustmentPlan` array (find entry by date)

### 2. Modify `src/components/DayDetailsSheet.tsx` — Future day plan display

When `isFuture`:
- Import `getFutureDayPlan`, `getAdjustmentBreakdownForDate` from calendar-helpers
- Import `getCalorieBankState` from calorie-correction
- Replace the current "You can only log meals for today and past days" banner with a **Smart Plan Preview** section:
  - Adjusted calorie target with delta indicator (🔻/🔺)
  - Macro breakdown cards (protein, carbs, fats) replacing the empty 0-value cards
  - Adjustment explanation list showing which past days caused the change
  - Keep the "Use Meal Planner" suggestion at bottom

### 3. Modify `src/pages/Progress.tsx` — Calendar future day indicators

In the `calendarDays` computation (line 136-147):
- For future dates, check if `adjustmentPlan` has an entry for that date
- Add an `adjustment` field to each calendar day object
- In the calendar cell render (lines 196-218), show:
  - 🔻 small indicator below future days with negative adjustments
  - 🔺 for positive adjustments (deficit recovery)
- Add legend entries for 🔻/🔺

### 4. Modify `src/lib/calorie-correction.ts` — `processEndOfDay` freeze

Add to `processEndOfDay` (after computing yesterday's balance): store `adjustedTarget` into the `DailyBalanceEntry` so past days have a frozen adjusted target. Add optional `adjustedTarget` field to `DailyBalanceEntry` type.

## Key Rules Enforced
- **Past days**: All data from stored `dailyBalances` / `getDailyLog` — never recomputed
- **Future days**: Computed live from `adjustmentPlan` + profile targets
- **Protein**: Never reduced, always `profile.dailyProtein`
- **Carbs/fats**: Derived from remaining calories after protein

## Files Modified
| File | Change |
|------|--------|
| `src/lib/calendar-helpers.ts` | **New** — pure helper functions |
| `src/components/DayDetailsSheet.tsx` | Future day plan preview UI |
| `src/pages/Progress.tsx` | Calendar 🔻/🔺 indicators for future days |
| `src/lib/calorie-correction.ts` | Add `adjustedTarget` to `DailyBalanceEntry`, freeze in `processEndOfDay` |

