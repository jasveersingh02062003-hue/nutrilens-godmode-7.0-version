

## What-If Simulator (Future Impact Engine)

### Summary
Replace the blind swap with a smart swap simulator that shows alternatives ranked by decision score, highlights a "Best Choice", warns about protein drops, and provides instant impact feedback — all in a slide-up sheet.

### Changes (3 files)

**File 1: New `src/lib/swap-engine.ts`** — Alternative selection + impact calculation

- `getSwapAlternatives(recipeId, mealType, profile)`:
  - Gets all recipes matching `mealType` from existing `recipes` array
  - Filters by dietary prefs (`tags`), health conditions (`avoidFor` via `shouldAvoidRecipe`), allergies
  - Filters calories within ±20% of original
  - Excludes current recipe
  - Computes `decisionScore = (proteinPerRupee * 0.6) + (calorieFit * 0.4)` for each
  - Flags `proteinDrop: true` if alt protein < 80% of original (demoted in sort)
  - Top scorer gets `bestChoice: true`
  - Each alt gets a `highlight` label: "Cheapest" / "Best Choice" / "High Protein"
  - Returns top 3 enriched alternatives

- `calculateSwapImpact(original, alternative, profile)`:
  - `costDiff`, `proteinDiff`, `calorieDiff`
  - Timeline: `daysFaster = (calorieDiff * 7 / 7700) * (weightDiff / weeklyLoss) * 7` (simplified, clamped)
  - Budget warning: checks if today's spent + alt cost exceeds daily budget (uses `getExpensesForDate` + `getAdjustedDailyBudget`)
  - `proteinDropWarning` if protein drops >20%
  - Returns `{ costDiff, proteinDiff, calorieDiff, timelineDays, budgetWarning, proteinDropWarning }`

**File 2: New `src/components/SwapSimulatorSheet.tsx`** — The What-If modal

- Props: `open`, `onClose`, `originalRecipeId`, `mealType`, `profile`, `onApply(recipeId)`
- Two-step flow:
  - **Step 1 (Alternatives)**: Shows current meal header + 3 alternative cards. Each card shows name, price (bold), highlight badge ("Best Choice ⭐" / "Cheapest" / "High Protein"), small protein warning if `proteinDrop`
  - **Step 2 (Comparison)**: Side-by-side original (red) vs selected (green). Exactly 3 impact lines with icons. Budget warning in red if applicable. Protein drop warning if applicable
- "Apply Swap" and "Back" buttons
- Uses `Sheet` from ui/sheet, animations via CSS transitions

**File 3: Update `src/pages/MealPlanner.tsx` + `src/components/MealPlanDashboard.tsx`** — Wire up

- `MealPlanner.tsx`:
  - `handleSwapMeal` now sets `swapTarget` state (already does this)
  - Add `SwapSimulatorSheet` rendered with `swapTarget` data
  - `onApply` callback: calls existing `swapMeal()` with chosen recipe, saves plan, shows feedback toast ("₹X saved today · Protein on track")
  - Remove the old swap-target recipe picker modal (lines ~170-250 in MealPlanner.tsx)

- `MealPlanDashboard.tsx`:
  - Change swap button text from "Swap" to "⚡ Try Swap"
  - Change "Find Cheaper →" text to "⚡ Try Swap"

### Impact Lines Format
```text
💰 Save ₹80          (or "Costs ₹30 more")
💪 +5g protein        (or "⚠ -13g protein")  
⏱️ Goal 2 days faster (or "1 day slower")
```

### Post-Swap Feedback Toast
After applying: `toast.success("₹80 saved · Protein still on track ✓")` or `toast.warning("₹80 saved · ⚠ Protein low — add a snack later")`

### What stays unchanged
- `swapMeal()` function in meal-plan-generator.ts (reused internally)
- Recipe database, budget system, all other components
- Existing plan generation, weekly balancing, batch cooking

