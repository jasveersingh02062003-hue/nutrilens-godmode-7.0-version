

# Plan: Add Safety Clamp + Minor Refinements to Calendar Helpers

## What's Already Done
The intelligent calendar with future day planning is **fully implemented**:
- Pure helper functions in `calendar-helpers.ts`
- Future day plan preview in `DayDetailsSheet.tsx` (macros, adjustment breakdown, explanation)
- Calendar 🔻/🔺 indicators in `Progress.tsx`
- `processEndOfDay` freezes `adjustedTarget` in daily balances
- After-dinner notification with pure function signature

## Remaining Fix: Safety Clamp

### 1. `src/lib/calendar-helpers.ts` — Add 1200 kcal minimum clamp

**Line 46**: Change `Math.max(0, baseTarget + adjustment)` to `Math.max(1200, baseTarget + adjustment)`

This prevents the system from generating dangerously low calorie targets when large surpluses stack up. The protein-lock already exists; this adds the calorie floor.

### 2. `src/lib/calendar-helpers.ts` — Add edge case for negative remaining calories

After the clamp, if `adjustedTarget - proteinCal` is still negative (extreme edge case where protein alone exceeds 1200), clamp `remaining` to 0 (already done on line 51, so this is safe).

## Files Modified
| File | Change |
|------|--------|
| `src/lib/calendar-helpers.ts` | Add 1200 kcal safety clamp (1 line change) |

That's it — everything else requested is already live in the codebase.

