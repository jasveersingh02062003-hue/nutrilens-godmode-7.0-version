

# Add "Compare" Tab to Meal Planner

## What We're Building

A new **Compare** tab in the Planner tab bar (`Budget | Meal Plan | Groceries | ⚖️ Compare | Recipes`) with two independent search bars for side-by-side food/recipe comparison.

## Files to Change

### 1. `src/components/MealPlannerTabs.tsx`
- Add `'Compare'` to `TAB_ITEMS` array (between Groceries and Recipes)
- Add `{activeTab === 'Compare' && <CompareTab />}` in the tab content area
- Import the new `CompareTab` component

### 2. New file: `src/components/CompareTab.tsx`

**Empty state**: Two search inputs stacked vertically with prompt text "Pick any two foods or recipes to compare"

**Search**: Each input uses `searchIndianFoods()` from `indian-foods.ts` + `recipes.filter()` to show a dropdown of matching foods/recipes. User picks one from each dropdown.

**Comparison view** (appears after both items selected): Two-column card layout showing:

| Row | Data Source |
|---|---|
| Name + image | `getRecipeImage()` or food name |
| Price (₹) | `getRecipeCost()` or `findPrice()` |
| Calories | food/recipe `.calories` |
| Protein | food/recipe `.protein` |
| Carbs | food/recipe `.carbs` |
| Fat | food/recipe `.fat` |
| Fiber | food/recipe `.fiber` |
| PES Score | `computePES()` |
| Pantry match | `getPantryItems()` ingredient check |

- **Winner highlighting**: Each row's better value gets a green background
- **PES badge**: Star icon on the higher PES column
- **Actions**: "Add to Plan" button under each column

**Animations**: `framer-motion` staggered row entrance

### 3. Dependencies (all existing, no new installs)
- `searchIndianFoods`, `getFoodByName` from `indian-foods.ts`
- `recipes`, `getRecipeById` from `recipes.ts`
- `getRecipeCost` from `recipe-cost.ts`
- `computePES` from `pes-engine.ts`
- `getPantryItems` from `pantry-store.ts`
- `getRecipeImage` from `recipe-images.ts`

## User Journey

```text
1. Planner page → tap "Compare" tab
2. See two search bars: "Search first item..." / "Search second item..."
3. Type "paneer" in first → dropdown shows matches → pick "Palak Paneer"
4. Type "chicken" in second → pick "Chicken Breast Curry"
5. Comparison table animates in below:
   ┌──────────────────┬──────────────────┐
   │  Palak Paneer    │  Chicken Curry   │
   │  230 kcal        │  195 kcal  ✅    │
   │  ₹45             │  ₹60             │
   │  12g protein     │  26g protein ✅  │
   │  PES: 6.2        │  PES: 8.1  ⭐   │
   │  🏠 4/6 pantry   │  🏠 2/4 pantry   │
   └──────────────────┴──────────────────┘
6. Tap "Add to Plan" on preferred item
7. Tap "✕" on either item to swap it for something else
```

## No Changes Needed
- No database/backend changes
- No new packages
- No changes to existing tabs' functionality

