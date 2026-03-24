

## Fix Unified PES Engine — 3 Issues

The unified PES engine is already implemented. Three issues need fixing based on the review.

### Issue 1: `meal-plan-generator.ts` — `targetCalories` is wrong

**Current** (line 19): `targetCalories: enriched.calories` (self-referential, always gives perfect calorie fit = neutral)

**Fix**: `scoreRecipe` needs a `mealType` parameter so it can call `getMealTargetCalories(mealType, profile)`. This requires threading `mealType` and a profile reference through `scoreRecipe` and `pickBest`. Where `scoreRecipe` is called during plan generation, the meal type is known.

### Issue 2: `grocery-survival.ts` — Hardcoded 500 kcal

**Current** (line 108): `computePES(b, { targetCalories: 500 })`

**Fix**: Use the user profile's daily target / 4 (average meal) if available. The `generateSurvivalKit` function already receives profile-like data or can read from store. If no profile context is available, use a reasonable default like `dailyTarget / 4`.

### Issue 3: `getMealTargetCalories` — Ignores user's custom meal split

**Current** (line 390): Hardcoded splits `{ breakfast: 0.25, lunch: 0.35, snacks: 0.15, dinner: 0.25 }`

**Fix**: Read from `profile.budget?.mealSplit` first (which stores percentages as integers like 25, 35, 15, 25), fall back to hardcoded defaults.

### Changes (3 files)

**File 1: `src/lib/pes-engine.ts`** — Fix `getMealTargetCalories`
- Read `profile.budget?.mealSplit?.[key]` first, dividing by 100
- Fall back to hardcoded defaults if not set

**File 2: `src/lib/meal-plan-generator.ts`** — Fix `scoreRecipe` to use proper target calories
- Add `mealType` and `profile` parameters to `scoreRecipe`
- Call `getMealTargetCalories(mealType, profile)` for `targetCalories`
- Update all call sites of `scoreRecipe` and `pickBest` to pass `mealType` and profile
- Keep `budgetPerMeal: maxCost` and `originalProtein: targetProtein` as-is

**File 3: `src/lib/grocery-survival.ts`** — Use dynamic target calories
- Read the user's daily calorie target from profile/store
- Compute `targetCalories = dailyTarget / 4` for survival sorting
- Fall back to 500 if no profile data available

### What stays unchanged
- `computePES` formula, `inferCategory`, `QUALITY_MAP`
- Swap engine (already correctly uses `getMealTargetCalories`)
- Suggestion engine (already correctly uses `remainingCalories`)
- All display functions and UI components

