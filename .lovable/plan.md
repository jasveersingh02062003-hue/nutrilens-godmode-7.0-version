

## Add Missing Budget-Optimized Recipes from 100-Recipe Dataset

### Current State
- **128 recipes** already exist in `src/lib/recipes.ts` (1933 lines)
- Most of the user's 100 recipes overlap with existing entries (poha, idli sambar, dal rice, rajma chawal, egg bhurji, besan chilla, khichdi, etc.)
- Existing recipes already have `estimatedCost`, `suitableFor`, `avoidFor`, `nutritionScore`, `volumeFactor`

### What's Actually New (~25 recipes)

After cross-referencing, these are genuinely missing from the database:

| Recipe | Meal | Cost | Why it matters |
|--------|------|------|----------------|
| Soya Upma | breakfast | ₹20 | High protein budget breakfast |
| Soya Milk Shake | breakfast | ₹20 | Quick protein drink |
| Corn Chaat | breakfast/snack | ₹15 | Budget filler |
| Curd + Banana | breakfast | ₹20 | Simple combo |
| Soya Keema + Roti | lunch | ₹40 | Top protein/₹ lunch |
| Sprouts Pulao | lunch | ₹35 | Budget pulao variant |
| Soya Pulao | lunch | ₹40 | High protein budget |
| Dal + Sabzi + Roti | lunch | ₹35 | Complete thali |
| Soya Curry + Roti | dinner | ₹35 | Budget dinner |
| Soya Soup | dinner | ₹25 | Light protein dinner |
| Soya Salad | dinner | ₹25 | Cold protein meal |
| Tofu Stir Fry | dinner | ₹40 | Vegan dinner |
| Tofu Soup | dinner | ₹35 | Light vegan |
| Paneer Salad | dinner | ₹70 | Premium light dinner |
| Chicken Salad (dinner) | dinner | ₹70 | Already exists but dinner-specific |
| Ragi Roti + Dal | dinner | ₹30 | Millet dinner |
| Soya Snack | snack | ₹15 | Budget protein snack |
| Peanut Chaat | snack | ₹15 | Budget snack |
| Dal Soup | snack | ₹20 | Light protein |
| Besan Snack | snack | ₹20 | Budget filler |
| Egg Roll | snack | ₹40 | Street food protein |
| Protein Shake | snack | ₹80 | Supplement |

### Plan (1 file changed)

**File: `src/lib/recipes.ts`**
- Append ~22 new recipe objects after the existing expanded recipes section
- Each with: proper `id`, `description`, `ingredients` (2-3 items), `steps` (2-3), `emoji`, `estimatedCost`, `suitableFor`, `avoidFor`, `nutritionScore`, `volumeFactor`
- Mapped to existing type system (`snacks` → `snack`, difficulty mapped correctly)
- Focus on soya/sprouts/budget variants that fill gaps in the ₹15-40 price range

### What Stays Unchanged
- Recipe interface, `getEnrichedRecipe()`, `filterRecipes()`
- All engines (meal planner, suggestion, PES)
- All UI components

### Technical Note
The scoring formula `(protein_per_rupee * 0.5) + (nutrition_score * 0.3) + (taste_score * 0.2)` is already implemented via `scoreRecipe()` in `meal-plan-generator.ts` with equivalent weights. No engine changes needed.

