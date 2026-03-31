

# Fix: Double Redistribution Bug & Add Undo/Notification System

## Problem

From the screenshots: Breakfast is already marked as "Redistributed" with "Goal: 0 kcal", yet the app still shows a "Redistribute Breakfast?" confirmation dialog offering to add 781 kcal to Lunch. Confirming this doubles the redistributed calories, breaking the calorie balance entirely.

## Root Cause

The guard at `MealDetailSheet.tsx:406` (`isMissed && !alreadyRedistributed`) correctly hides the redistribute buttons. However, there are two issues:

1. **Stale state on re-open**: `MealDetailSheet` reads `isRedistributed()` once when rendered. If the sheet was already open when redistribution happened (or opened from a cached state), `alreadyRedistributed` may be `false` from the initial render.
2. **No guard on the confirmation dialog itself**: The `AlertDialog` at line 824 and `handleRedistribute()` only check `alreadyRedistributed` inside `handleRedistribute`, but the dialog can still be opened if the banner was visible before state updated.
3. **No notification when auto-redistribution happens**: Users don't know their meals were adjusted until they tap in.
4. **No undo flow**: If a user actually ate breakfast but forgot to log, there's no way to reverse the redistribution.

## Plan

### Step 1: Harden Redistribution Guards (MealDetailSheet.tsx)

- Move `isRedistributed` check to be re-evaluated on every render (it already is via `const alreadyRedistributed = isRedistributed(date, mealType)`, but ensure it's not stale).
- Add a guard directly inside the `AlertDialog`'s confirm handler AND inside `SmartRedistributionSheet.handleApply()` — double-check `isRedistributed()` at execution time, not just render time.
- Disable the "Quick Redistribute" and "Smart Redistribute" buttons if `isRedistributed` returns true, as a belt-and-suspenders approach.

### Step 2: Add Redistribution Notification Toast (Dashboard)

- In `src/pages/Dashboard.tsx` (or `Index.tsx`), on page load, check if any meal was auto-missed and not yet redistributed. If the user has `autoDistribute: true` preference, perform the redistribution and show a toast:
  - "Breakfast was missed. 322 kcal redistributed to Lunch, Dinner & Snacks. Tap to undo."
- If `autoDistribute: false`, show an info toast: "Breakfast was missed. Tap to redistribute or log it now."

### Step 3: Add Undo Redistribution (redistribution-service.ts + MealDetailSheet.tsx)

- Add `undoRedistribution(date, mealType)` function to `redistribution-service.ts`:
  - Read the stored allocation details
  - Subtract the added calories/protein/carbs/fat from each target meal's daily adjustments
  - Clear the redistributed flag
  - Remove the history entry
- In `MealDetailSheet.tsx`, when viewing a redistributed meal, show an "Undo & Log Breakfast" button that:
  - Calls `undoRedistribution()`
  - Opens the food logging sheet for that meal
  - Shows toast: "Redistribution reversed. Log your breakfast now."

### Step 4: Prevent Double-Apply in SmartRedistributionSheet

- In `SmartRedistributionSheet.tsx`, check `isRedistributed(date, missedMealType)` at the start of `handleApply()`. If already redistributed, show error toast and close sheet.

## Technical Details

**Files to modify:**
- `src/lib/redistribution-service.ts` — add `undoRedistribution()` function
- `src/components/MealDetailSheet.tsx` — harden guards, add undo button on redistributed banner
- `src/components/SmartRedistributionSheet.tsx` — add guard in `handleApply()`
- `src/pages/Index.tsx` or `src/pages/Dashboard.tsx` — add auto-redistribution notification on load

