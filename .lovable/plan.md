

# Add "Compare with..." on MealPlanDashboard

## What
Add a "Compare ⚖️" button to each meal card in MealPlanDashboard. Tapping it fetches swap alternatives via `getSwapAlternatives()` from `swap-engine.ts`, converts the original + alternatives to `CompareItem[]` using `buildFromRecipe`, and opens the existing `ComparisonSheet`.

## File Changes

### `src/components/MealPlanDashboard.tsx`
1. Import `ComparisonSheet`, `buildFromRecipe`, `CompareItem` from existing files, and `getSwapAlternatives` from swap-engine
2. Add state: `compareItems: CompareItem[]` and `showCompare: boolean`
3. Add a handler `handleCompare(recipeId, mealType)` that:
   - Gets original recipe via `getRecipeById`
   - Gets alternatives via `getSwapAlternatives(recipeId, mealType)`
   - Converts original + top 2 alternatives to `CompareItem[]` using `buildFromRecipe`
   - Sets state to open ComparisonSheet
4. In the meal card actions area (line ~469), add a ⚖️ button between "View Recipe" and "Try Swap"
5. Render `<ComparisonSheet>` at the bottom of the component
6. `onPick` handler: if user picks a different recipe, call `onSwapMeal` with the selected recipe's ID

### No other files need changes
All required utilities (`ComparisonSheet`, `compare-helpers`, `swap-engine`) already exist.

## Effort
~30 lines of additions to a single file.

