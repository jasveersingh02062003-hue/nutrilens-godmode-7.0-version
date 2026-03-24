

## Add System Intelligence Layer to Meal Plan Engine

### What's missing
The meal plan generator picks recipes but lacks constraint validation, composition rules, macro distribution, swap logic, and feedback loops. This makes plans unreliable when budget and nutrition targets conflict.

### Priority 1 (Critical — 3 files)

**File 1: New `src/lib/plan-validator.ts`** — Impossible Plan Detection + Sync Validation

- `validatePlanFeasibility(profile, budgetSettings)` → checks if daily budget can realistically hit calorie + protein targets using the cheapest protein sources in the recipe database
- Scans all recipes, finds minimum cost to hit protein target (sorts by `proteinPerRupee`)
- Returns `{ feasible: boolean, warning?: string, suggestedBudget?: number, adjustedProtein?: number }`
- Called before plan generation in `MealPlanOnboarding.tsx` finish step — if infeasible, show warning with adjusted targets or suggested budget increase
- Also includes `validateDaySync(dayPlan, profile, budget)` — post-generation check that totals match constraints, flags mismatches

**File 2: Update `src/lib/meal-plan-generator.ts`** — Meal Composition Rules + Macro Distribution + Time Logic

- Add meal composition enforcement: each meal must have 1 carb base + 1 protein source (check recipe tags/ingredients for `carb`/`protein` categories)
- Add per-meal macro targets: Breakfast 25% protein, Lunch 35%, Dinner 40% (instead of equal split on line 170)
- Add per-meal time constraints: Breakfast max 15min prep, Lunch/Dinner use user's `cookingTime` setting
- Add variety window: track `usedRecipeIds` per meal type separately, exclude last 3 breakfasts / last 2 lunches/dinners (currently uses flat list)
- Add conflict resolution priority: if budget can't meet calories, prioritize calories first, then protein, then stay in budget (add `budgetFlexMultiplier = 1.15` fallback)

**File 3: Update `src/components/MealPlanOnboarding.tsx`** — Show feasibility warning in summary step

- Before generating plan, call `validatePlanFeasibility()`
- If infeasible, show amber warning card: "Your budget of ₹X/day may not fully meet 120g protein. Adjusted target: 95g" with option to increase budget or accept adjusted macros
- User chooses: "Stay in budget" vs "Hit nutrition targets"

### Priority 2 (Important — 3 files)

**File 4: Update `src/lib/meal-plan-generator.ts`** — Enhanced Swap Engine

- Update existing `swapMeal()` to respect: same calorie range (±15%), same budget, same macro distribution, same meal composition rules
- Currently swapMeal only filters by dietary tags — add cost + calorie + protein constraints

**File 5: New `src/lib/meal-feedback.ts` already exists** — check and extend

- Add `saveMealPlanFeedback(recipeId, { eaten, liked, swapped })` 
- Add `getMealPreferences()` → returns liked/disliked recipe IDs
- Integrate into `scoreRecipe()` in meal-plan-generator: boost liked recipes, penalize disliked ones

**File 6: Update `src/lib/budget-alerts.ts`** — Outside Food Integration

- Add `outsideMealSlotsPerWeek` to `EnhancedBudgetSettings`
- When generating week plan, mark X slots as "outside food" days — reduce home cooking calories for those days
- Show in plan UI: "Outside food day — ₹{outsideBudgetPerDay} budget"

### Priority 3 (Nice-to-have — 2 files)

**File 7: Update `src/lib/meal-plan-generator.ts`** — Explanation Layer

- Add `reason` field to each `PlannedMeal`: "High protein to meet your 120g goal" / "Budget-friendly at ₹65" / "Quick prep for busy mornings"
- Generated during `findRecipeWithFallback` based on which scoring factor won

**File 8: Update `src/lib/recipes.ts`** — Add composition tags

- Add `compositionType` to Recipe interface: `'carb-base' | 'protein-heavy' | 'balanced' | 'light'`
- Tag existing recipes (most already have enough info in `tags` array to derive this automatically via a helper function)

### Flow After Changes
```text
User completes budget → Meal Plan onboarding
  ↓
Data Sync screen (existing)
  ↓
Dietary/Allergies/Cuisine/Cooking questions (existing)
  ↓
Summary step:
  → validatePlanFeasibility() runs
  → If infeasible: show warning + user choice
  → Generate plan with composition rules + macro distribution
  ↓
Plan displayed with per-meal reasons
  ↓
Swap respects all constraints
  ↓
Feedback loop tracks eaten/liked/skipped
```

### What stays unchanged
- Budget onboarding flow (BudgetPlannerTab)
- Recipe database content (just adds optional field)
- All existing onboarding steps
- Calorie engine, burn service, weight tracking

