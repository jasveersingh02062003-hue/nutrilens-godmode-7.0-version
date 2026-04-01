

# Extend Side-by-Side Comparison to Multiple Entry Points

## Overview
We already have the **Compare tab** in Planner with `CompareTab.tsx` and its `CompareItem` + `buildFromFood`/`buildFromRecipe` helpers. Now we'll create a **reusable `ComparisonSheet.tsx`** bottom sheet and integrate compare triggers into 4 surfaces.

## Files to Create

### 1. `src/components/ComparisonSheet.tsx`
- Reusable bottom sheet (Sheet component) that accepts `items: CompareItem[]` (2-3 items) and `onPick: (item) => void`
- Reuse `CompareItem` interface and winner-highlighting logic from `CompareTab.tsx` (extract to shared util or import)
- Two-column layout (or 3-col scrollable) with green winner highlights per row
- Rows: Price, Calories, Protein, Carbs, Fat, Fiber, PES Score
- "Pick this" button under each column
- Staggered framer-motion row animations

## Files to Modify

### 2. `src/components/SwapSimulatorSheet.tsx`
- Add a **"Compare All ⚖️"** button in the `alternatives` step (above the list)
- When tapped, opens `ComparisonSheet` with `original + all alternatives` converted to `CompareItem[]` using `buildFromRecipe`
- `onPick` → calls existing `onApply` with the selected recipe's impact

### 3. `src/pages/LogFood.tsx`
- Add **multi-select compare mode** in the search results (step === 'search'):
  - Each food result gets a small `⚖️` icon button (next to the existing `+` button)
  - Tapping it toggles the food into a `compareSelection: IndianFood[]` state (max 3)
  - Selected items get a blue border highlight
  - When 2+ items selected, show a **floating "Compare (N)" pill** at bottom
  - Tapping the pill opens `ComparisonSheet` with items built via `buildFromFood`
  - `onPick` → calls existing `addFood()` to add the picked item to the meal

### 4. `src/components/AddFoodSheet.tsx`
- Same pattern as LogFood: add `⚖️` toggle on each search result, floating compare pill, opens `ComparisonSheet`
- `onPick` → calls existing `onAdd()` with the picked food converted to `FoodItem`

### 5. Extract shared helpers
- Move `CompareItem`, `buildFromFood`, `buildFromRecipe`, and the winner-detection logic from `CompareTab.tsx` into a new `src/lib/compare-helpers.ts` so both `CompareTab` and `ComparisonSheet` can reuse them

## User Journeys

**LogFood / AddFoodSheet**: Search → tap ⚖️ on 2 items → floating pill → sheet with side-by-side → "Pick this" → logs/adds the food

**SwapSimulator**: See alternatives → tap "Compare All" → horizontal comparison table with current + alternatives → "Pick this" → applies swap

## No backend changes needed
All data comes from existing `searchIndianFoods`, `getRecipeCost`, `computePES`, `checkAllergens`, `checkFoodForConditions`.

