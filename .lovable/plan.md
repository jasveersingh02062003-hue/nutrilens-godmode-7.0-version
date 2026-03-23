

## Fix Forward-Only Meal Redistribution

### Problem
When a meal is missed (e.g., lunch), `calculateProportionalDistribution` in `redistribution-service.ts` distributes calories to **all** other meals including past ones (breakfast). The correct behavior: redistribute only to meals **after** the missed one in the timeline: Breakfast → Lunch → Snacks → Dinner.

### Root Cause
Line 82 of `redistribution-service.ts`:
```typescript
const remainingMeals = ['breakfast', 'lunch', 'dinner', 'snack'].filter(m => m !== missedMealType);
```
This includes meals before the missed one. It should only include meals that come **after** the missed meal in chronological order.

### Fix (1 file: `src/lib/redistribution-service.ts`)

**Change the `calculateProportionalDistribution` function** — replace the `remainingMeals` line with forward-only filtering:

```typescript
const MEAL_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];

const missedIndex = MEAL_ORDER.indexOf(missedMealType);
const remainingMeals = MEAL_ORDER.filter((m, i) => i > missedIndex);
```

This ensures:
- Missed **breakfast** → redistributes to lunch, snacks, dinner
- Missed **lunch** → redistributes to snacks, dinner
- Missed **snacks** → redistributes to dinner only
- Missed **dinner** → no redistribution (empty array)

### What stays unchanged
- `SmartRedistributionSheet` UI component (it just renders what `calculateProportionalDistribution` returns)
- `applyRedistribution`, `markRedistributed`, carry-over logic
- `calorie-engine.ts` (separate recalculation engine, already works correctly with pending slots)
- `MealDetailSheet`, `TodayMeals` display logic

