

## Fill Remaining Gaps: Survival Toggle, Reality Shock, Dual-Sync Insights

### Already Implemented (No Changes Needed)
- Budget engine with daily/weekly/monthly splits, meal-level budgets
- Cash flow curve (day-of-month multiplier)
- Overspend redistribution + decision engine (continue/recover/ignore)
- Behavior engine with consistency score, eating pattern classification
- Auto survival mode (consistency < 50) + recovery mode banners
- Recipe database with satiety scores, proteinPerRupee, health filtering
- Meal suggestion engine ranked by satiety + budget + health
- Smart swaps, opportunity cost display, financial insights

### What's Actually Missing

| Feature | Description |
|---------|-------------|
| Manual ₹100 Survival Mode | User-triggered hard cap at ₹100/day with toggle in Budget tab |
| Reality Shock Alert | When meal cost > 1.5x daily budget, show "This = X days of food budget" |
| Dual-Sync Insights | Detect Low-Cal+High-Spend and High-Cal+Low-Spend scenarios, show nudges |
| Per-Meal Budget Cascade | When one meal overspends, reduce next meal's budget automatically |
| Rolling Next-Meal Card | Prominent "Your Next Meal" suggestion on Dashboard using remaining cal/protein/budget |

### Plan (4 files modified, 1 new component)

**File 1: `src/lib/budget-service.ts` — Add survival mode toggle + per-meal cascade + dual-sync**

- `activateSurvivalMode()` / `deactivateSurvivalMode()` / `isSurvivalModeManual()`: localStorage toggle that caps daily budget at ₹100 and per-meal at ₹25
- `cascadeMealBudget(mealType, spent)`: if spent > allocated for that meal, reduce next meal's budget by the overage (min ₹10)
- `getDualSyncInsight()`: compares calories-consumed% vs budget-spent%, returns scenario A/B nudge text or null

**File 2: `src/lib/decision-engine.ts` — Add reality shock check**

- `getRealityShock(mealCost)`: if cost > dailyBudget * 1.5, returns `{ daysEquivalent, message }` e.g. "₹600 = 3.6 days of your food budget"
- Integrate into `shouldTriggerOverspendDecision` flow

**File 3: `src/components/BudgetPlannerTab.tsx` — Add ₹100 Survival Mode toggle**

- Add a toggle card at top of budget settings: "₹100/Day Survival Mode"
- When active, override all budget displays to ₹100/day, ₹25/meal
- Show only recipes ≤ ₹25 in suggestions

**File 4: `src/components/NextMealCard.tsx` (NEW) — Rolling next-meal suggestion**

- Compute: remaining calories, remaining protein, remaining budget for current meal slot
- Call `getRecipesForMeal()` with those constraints
- Display top suggestion: name, cost, calories, protein, satiety score
- "Log This" button to one-tap log

**File 5: `src/pages/Dashboard.tsx` — Wire NextMealCard + dual-sync insight + reality shock**

- Add `NextMealCard` below the calorie ring
- Show dual-sync insight as a contextual nudge banner when applicable
- Show reality shock toast when logging expensive meals

### Technical Details

Dual-sync logic:
```
caloriePercent = consumed / target
budgetPercent = spent / dailyBudget
if budgetPercent > 0.8 && caloriePercent < 0.3 → "Low efficiency" nudge
if caloriePercent > 0.9 && budgetPercent < 0.2 → "Check protein quality" nudge
```

Survival mode override: when active, `getAdjustedDailyBudget()` returns max ₹100 regardless of actual budget settings.

