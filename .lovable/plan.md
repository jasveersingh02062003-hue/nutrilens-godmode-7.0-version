

## Integrate 102-Recipe Database into Existing Recipe Engine

### Current State
- `recipes.ts` already has ~100 recipes with **rich data** (ingredients list, cooking steps, descriptions, emoji)
- ~40 of the user's 102 recipes overlap with existing entries (Poha, Idli Sambar, Dal Tadka, Rajma Chawal, etc.)
- Existing recipes lack explicit `estimatedCost`, `suitableFor`, `avoidFor`, `nutritionScore`, and `volumeFactor` on most entries (computed at runtime via `getEnrichedRecipe`)

### Strategy
Rather than duplicating recipes, we will:
1. **Enrich existing recipes** with the user's metadata (`suitableFor`, `avoidFor`, `nutritionScore`, `volumeFactor`, `estimatedCost`)
2. **Add ~60 new recipes** that don't already exist (Sattu Drink, Karela Fry, Sago Khichdi, Tamarind Rice, Baked Sweet Potato, Fish Fry, Kadhi Chawal, etc.)
3. New recipes get minimal but valid `ingredients`/`steps` (1-3 items each) so existing UI doesn't break

### Files Changed

**File 1: `src/lib/recipes.ts`**
- Add metadata fields (`estimatedCost`, `suitableFor`, `avoidFor`, `nutritionScore`, `volumeFactor`) to all ~40 existing recipes that match user's database
- Append ~60 new recipe objects for entries not already present, with:
  - Mapped `difficulty` values (`easy` -> `beginner`, `medium` -> `intermediate`, `advanced` -> `advanced`)
  - Mapped `mealType` (`snacks` -> `snack`)
  - Minimal `ingredients` array (category-tagged for cost estimation)
  - Minimal `steps` array
  - Assigned `emoji` per recipe

### What Stays Unchanged
- Recipe interface (already has all needed optional fields)
- `getEnrichedRecipe()` function (already computes satiety, proteinPerRupee)
- `filterRecipes()`, `getRecipeById()`, `getRecipesByMealType()`
- Meal suggestion engine, meal planner, all UI components
- All other files

### Technical Notes
- The user's `cost` field maps to `estimatedCost` on the Recipe interface
- `snacks` in user data maps to `snack` in existing mealType union type
- `side` and `beverage` meal types from user data will be mapped to `snack`
- Duplicate recipes (same dish) will be skipped; their metadata will be applied to existing entries instead

