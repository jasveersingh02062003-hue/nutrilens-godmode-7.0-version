

## Execution Layer: Portions, Grocery Aggregation, Recovery, Batch Cooking, Flex & Day-Type

### Summary
Five changes that make meal plans actionable: scaled ingredient quantities, aggregated shopping lists, next-day recovery from missed meals, batch cooking hints, flex calorie reserves, and weekend-aware scheduling.

### Changes (5 files)

**File 1: New `src/lib/portion-engine.ts`**

- `parseQuantityToGrams(qtyStr)` — parses recipe quantity strings ("1 cup", "200g", "2 tbsp", "1 medium") into grams using a lookup map (cup=200g, tbsp=15g, tsp=5g, medium=100g, etc.)
- `calculatePortions(recipe, targetCalories, targetProtein)` — comp