

# Plan: Camera Plan-Rule Warnings + Budget Plan Override

## Summary
Most of the "fully synced" system is already implemented. The two remaining gaps are:
1. **CameraHome.tsx** — no plan-rule violation warnings (e.g., junk food detected while on a no-junk plan)
2. **budget-service.ts** — no plan `budgetTier` override on daily budget calculation

Everything else (Dashboard, Progress, Calendar, Planner, Profile, SpecialPlansTab, CurrentPlansTab, PostEventFeedback, calorie-correction, meal-suggestion-engine, WeightChart, CalorieRing, MealPlanDashboard) is already wired.

## Changes

### 1. Camera – Plan Rule Violation Warnings
**File:** `src/pages/CameraHome.tsx`
- Import `getActivePlan` from `event-plan-service`
- After existing allergen/condition/sugar warnings block (~line 847), add a **plan rule check**:
  - If active plan has `home_cooked_only` rule and source is `restaurant`/`takeaway`/`packaged` → warning "This meal isn't home-cooked — your plan requires home-cooked meals"
  - If active plan has `no_junk` rule and any item matches junk/processed food tags → warning with item names
  - If active plan has `no_sugar` / sugar detection active → already handled by existing sugar detector
- Show these as an `AnimatedWarningBanner` with type `'health'`, severity `'medium'`, and an `onFindAlternative` callback that opens `FoodReplaceSheet` filtered by plan rules
- Add a "🎯 Plan Rule" prefix to distinguish from health warnings

### 2. Budget Service – Plan Budget Override
**File:** `src/lib/budget-service.ts`
- Import `getActivePlan` from `event-plan-service`
- In `getBudgetSummary()`, after computing the normal budget, check if an active event plan has a `budgetTier` in its `eventSettings`:
  - `tight` → cap daily budget at ₹150
  - `moderate` → cap daily budget at ₹250
  - `flexible` → use profile budget (no change)
- Apply the override to the weekly/monthly totals accordingly (daily × 7 or × 30)
- Add a `planOverride` boolean flag to `BudgetSummary` so the UI can show "Plan Budget" label

### 3. Budget Tab UI – Plan Budget Label
**File:** `src/components/BudgetPlannerTab.tsx`
- Already has a plan budget banner from previous implementation — verify it reads from the updated `BudgetSummary.planOverride` flag (if not, wire it)

## Implementation Order
1. `budget-service.ts` — add plan budget override logic
2. `CameraHome.tsx` — add plan-rule violation warnings
3. Verify `BudgetPlannerTab.tsx` banner is connected

## Files Summary
| File | Action |
|------|--------|
| `src/lib/budget-service.ts` | Modify — add plan budgetTier override in getBudgetSummary |
| `src/pages/CameraHome.tsx` | Modify — add plan rule violation warnings after existing warning block |
| `src/components/BudgetPlannerTab.tsx` | Verify/minor fix — ensure plan budget banner reads updated data |

