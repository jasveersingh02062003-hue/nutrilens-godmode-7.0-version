

## Upgrade to Adaptive Food + Money + Behavior OS

### Current State Assessment

| Feature | Exists? | Gap |
|---------|---------|-----|
| Behavior stats + consistency score | ✅ `behavior-stats.ts` (299 lines) | Missing: budget-aware scoring (overspend penalty), eating pattern classification, survival mode trigger |
| Weekly adaptation | ✅ Already runs on dashboard load | Missing: budget-linked adaptation |
| Budget overspend redistribution | ✅ `budget-service.ts` has `adjustBudgetAfterOverspend` | Missing: budget curve (day-of-month multiplier), decision engine UI |
| Recipe database | ✅ ~45 recipes in `recipes.ts` | Missing: `satietyScore`, `volumeFactor`, `proteinPerRupee`. Need 55+ more recipes to reach 100 |
| Meal suggestion engine | ✅ `meal-suggestion-engine.ts` | Missing: satiety-based ranking, remaining-calorie/protein-aware scoring |
| Decision engine | ❌ | No overspend decision modal with options (continue/recover/ignore) |
| Financial insight engine | ❌ | No "opportunity cost" display (₹200 pizza = 4 eggs + dal) |
| Cash flow curve | ❌ | No day-of-month budget multiplier |

### Plan (6 files changed, 2 new files, 1 large recipe expansion)

**File 1: `src/lib/recipes.ts` — Add satiety fields + 60 new recipes**

- Add `volumeFactor` (1-5) field to Recipe interface
- Add computed `satietyScore` and `proteinPerRupee` to `getEnrichedRecipe()`
  - `satietyScore = (protein/10) + (fiber/5) + (volumeFactor/2)`
  - `proteinPerRupee = protein / estimatedCost`
- Add ~60 new recipes (mix of Indian + international, veg/non-veg/vegan, across all meal types) with realistic 2026 India costs and macros. Target: 100+ total recipes.

**File 2: `src/lib/meal-suggestion-engine.ts` — Upgrade ranking to use satiety + remaining needs**

- Update `getRecipesForMeal()` ranking formula:
  ```
  rankScore = (proteinPerRupee * 0.3) + (satietyScore/10 * 0.3) + (nutritionScore/10 * 0.2)
            + (min(cal, remainingCal)/remainingCal * 0.1) + (min(prot, remainingProt)/remainingProt * 0.1)
  ```
- Accept `remainingCalories` and `remainingProtein` as optional params
- Sort by `rankScore` instead of plain `nutritionScore`

**File 3: `src/lib/budget-service.ts` — Add cash flow curve + financial insights**

- Add `getBudgetCurveMultiplier(dayOfMonth)`: returns 1.2 (days 1-5), 1.0 (6-20), 0.9 (21-25), 0.7 (26-31)
- Update `getAdjustedDailyBudget()` to apply curve multiplier
- Add `getOpportunityCost(amount, category)`: returns equivalent meals, protein grams, and savings estimate
- Add `getFinancialInsight(mealCost)`: returns text like "₹200 = 4 egg meals = 40g protein lost"

**File 4: `src/lib/behavior-stats.ts` — Add budget-aware scoring + pattern classification**

- Add budget-related fields to `BehaviorStats`:
  - `eatingPattern`: 'home_heavy' | 'outside_heavy' | 'balanced'
  - `overspendTendency`: 'low' | 'medium' | 'high'
  - `outsideFrequency`: number (days/week)
  - `mealSkipping`: boolean
  - `impulsiveSpending`: boolean
- Update `updateDailyBehaviorStats()` to:
  - Subtract 10 from consistency for overspend days
  - Subtract 5 for restaurant meals > 2/week
  - Classify eating pattern from meal source data
- Add `isSurvivalModeActive()`: returns true if consistency < 50

**File 5: `src/lib/decision-engine.ts` (NEW) — Overspend decision options**

- `getOverspendOptions(overspendAmount, remainingBudget, daysRemaining)`: returns 3 options:
  1. Continue as usual → projected monthly overshoot
  2. Recovery mode → reduced budget for N days
  3. Ignore today → reminder tomorrow
- `applyDecision(choice)`: executes the chosen option (adjusts budget, sets recovery mode flag, or dismisses)

**File 6: `src/components/OverspendDecisionSheet.tsx` (NEW) — Decision UI**

- Bottom sheet triggered when a logged meal causes overspend > 50% of daily budget
- Shows the 3 options from decision engine with impact text
- On selection, calls `applyDecision()` and shows confirmation toast

**File 7: `src/components/TodayMeals.tsx` — Add financial insight after logging**

- After a meal is logged with cost > ₹100, show a small "Reality check" note using `getFinancialInsight()`
- Example: "₹200 = 4 home meals worth of protein"

**File 8: `src/pages/Dashboard.tsx` — Wire up decision sheet + survival mode indicator**

- Import and render `OverspendDecisionSheet` (triggered by overspend state)
- If `isSurvivalModeActive()`, show a subtle banner: "🔴 Survival mode: focusing on filling, affordable meals"

### What Stays Unchanged
- All onboarding, calorie engine, redistribution, activity tracking
- Existing dashboard layout and component order
- Store types, auth, Monica chat
- Budget planner tab structure

### Recipe Expansion Strategy
60 new recipes across: 15 breakfast, 15 lunch, 15 dinner, 15 snacks. Mix of:
- Budget meals (₹15-50): poha, upma, dal variations, egg dishes
- Mid-range (₹50-150): paneer, chicken, fish curry
- Premium (₹150+): salmon, avocado toast, protein bowls
- All with accurate fiber, volumeFactor for satiety scoring

