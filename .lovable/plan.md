

## Unified PES Engine — Single Source of Truth

### Problem
4 separate scoring formulas produce inconsistent food rankings across modules.

### Changes (5 files)

**File 1: `src/lib/pes-engine.ts`** — Add `computePES()`, `inferCategory()`, `getMealTargetCalories()` at the bottom

- `QUALITY_MAP` constant mapping food categories to DIAAS quality factors (egg: 1.0, chicken: 1.0, dairy: 0.95, soy: 0.9, dal: 0.75, pulses: 0.75, cereal: 0.6, junk: 0.4)
- `inferCategory(recipe)` — maps tags/name to category key
- `computePES(recipe, context)` — unified scoring: `0.5 * min(1, ppr*3) + 0.3 * calorieFit + 0.2 * min(1, satiety/5)` with penalties for protein drop (-0.3), calorie excess (-0.2), budget exceed (-0.2). Returns clamped 0–1.
- `getMealTargetCalories(mealType, profile)` — daily calories * split percentage (breakfast 25%, lunch 35%, snacks 15%, dinner 25%)
- All existing functions untouched

**File 2: `src/lib/swap-engine.ts`** — Line 64-65: replace inline scoring

- Import `computePES`, `getMealTargetCalories`
- Replace `(e.proteinPerRupee * 0.6) + (calorieFit * 0.4)` with `computePES(e, { targetCalories, originalProtein: original.protein })`
- Rest unchanged (sorting, highlights, protein drop flag)

**File 3: `src/lib/meal-plan-generator.ts`** — Lines 15-23: replace `scoreRecipe()` body

- Import `computePES` from pes-engine
- Replace the 6-factor formula with `computePES(enriched, { targetCalories: maxCost, budgetPerMeal: maxCost, originalProtein: targetProtein })` + `feedbackMod` additive
- `pickBest()` unchanged

**File 4: `src/lib/meal-suggestion-engine.ts`** — Lines 88-100: replace `rankScore`

- Import `computePES`
- Replace 5-factor formula with `computePES(r, { targetCalories: remainingCalories, budgetPerMeal: maxCost })`
- Keep `matchReason` bonus as +0.05 additive

**File 5: `src/lib/grocery-survival.ts`** — Line 107: replace sort

- Import `computePES`
- Replace `b.proteinPerRupee - a.proteinPerRupee` with `computePES(b, { targetCalories: 500 }) - computePES(a, { targetCalories: 500 })`

### What stays unchanged
- All existing display functions (`evaluateFood`, `getPESColor`, `dailyEfficiency`, `compareFoods`, `findBetterAlternatives`, `bestUnderPrice`)
- `foodDatabase` array, all UI components, filtering logic, budget service, weekly feedback

