

## Integrate PES (Protein Efficiency Score) Intelligence System

### What Already Exists (No Changes Needed)

| Feature | Location |
|---------|----------|
| `proteinPerRupee` computed for all 128 recipes | `recipes.ts` `getEnrichedRecipe()` |
| Budget engine (daily/weekly/monthly, curve, survival mode, cascade) | `budget-service.ts` |
| Satiety-based meal ranking with proteinPerRupee weight | `meal-suggestion-engine.ts` |
| Reality shock, financial insight, opportunity cost | `decision-engine.ts` |
| 100+ price entries with market data | `price-database.ts` |
| Overspend decision sheet | `OverspendDecisionSheet.tsx` |
| Next meal card with budget-aware suggestions | `NextMealCard.tsx` |
| Dual-sync insight engine | `budget-service.ts` |

### What's Missing

| Feature | Description |
|---------|-------------|
| **PES Engine** | Dedicated `evaluateFood()` with dynamic thresholds, color coding, alternative finder, comparison, bestUnderPrice |
| **50-food raw ingredient database** | The user's dataset of individual foods (eggs, soya, paneer) with protein/price — distinct from the recipe database |
| **PES badges in UI** | Color-coded PES badge (🟢🟡🔴) on meal cards, camera results, recipe suggestions |
| **Food comparison** | Compare two foods side-by-side by PES |
| **"Best under ₹X"** | Query: top protein foods under a price |
| **Daily efficiency summary** | Total protein / total spent = daily PES with color rating |
| **Smart swap after logging** | When a red-rated meal is logged, toast with better alternative |
| **PES in Monica AI** | Parse "compare X vs Y" and "best under ₹X" queries |

### Plan (3 new files, 4 files modified)

**File 1: `src/lib/pes-engine.ts` (NEW) — Core PES Intelligence**

- Embed the 50-food dataset as a typed array
- `getDynamicThreshold(dailyBudget, isVeg)`: returns `{ green, yellow }` thresholds
- `evaluateFood(food, dailyBudget, isVeg)`: returns `{ pes, color, insight, alternatives }`
- `compareFoods(foodA, foodB, dailyBudget)`: side-by-side comparison with winner
- `bestUnderPrice(maxPrice, dietType)`: top 10 foods sorted by PES
- `dailyEfficiency(loggedMeals)`: aggregate PES from today's logged meals
- `findBetterAlternatives(food, dietType, limit)`: same meal type, higher PES
- `getPESColor(pes, dailyBudget, isVeg)`: utility to get color from PES value
- `getPESForRecipe(recipeId)`: look up enriched recipe and return PES + color

**File 2: `src/components/PESBadge.tsx` (NEW) — Reusable PES badge component**

- Compact badge showing PES value + color dot (🟢🟡🔴)
- Props: `pes: number`, `color: string`, optional `size: 'sm' | 'md'`
- Used in meal cards, next meal card, recipe suggestions

**File 3: `src/components/DailyEfficiencyCard.tsx` (NEW) — Dashboard efficiency summary**

- Shows: total spent, total protein, average PES, color rating
- Suggestion text: "Improve by swapping to [top alternative]"
- Only renders when budget is enabled and meals are logged

**File 4: `src/components/TodayMeals.tsx` — Add PES badge + smart swap toast**

- After logging a meal with cost, compute PES
- Show PES badge next to cost on each meal card
- If PES color is red, show toast with 1 better alternative

**File 5: `src/components/NextMealCard.tsx` — Add PES badge to suggestion**

- Show PES value + color badge on the suggested recipe

**File 6: `src/pages/Dashboard.tsx` — Wire DailyEfficiencyCard**

- Add `DailyEfficiencyCard` below budget summary card (only when budget enabled)

**File 7: `src/components/MonikaChatScreen.tsx` or `src/lib/monika-actions.ts` — PES query parsing**

- Add intent detection for "compare X vs Y" → call `compareFoods`, format response
- Add intent detection for "best under ₹X" or "best protein under X" → call `bestUnderPrice`
- Add intent detection for "evaluate X" or "how good is X" → call `evaluateFood`

### Technical Details

Dynamic threshold logic:
```
dailyBudget < 100: green ≥ 1.2, yellow ≥ 0.6
100-200: green ≥ 0.8, yellow ≥ 0.4 (× 0.75 if veg)
> 200: green ≥ 0.5, yellow ≥ 0.3 (× 0.75 if veg)
```

The 50-food dataset will be a static array in `pes-engine.ts` with fields: `id, name, price, protein, calories, fat, carbs, tags, mealType, proteinPerRupee`. This is the raw ingredient database — separate from recipes.

PES badge colors map to Tailwind: green → `text-green-600 bg-green-100`, yellow → `text-amber-600 bg-amber-100`, red → `text-red-600 bg-red-100`.

