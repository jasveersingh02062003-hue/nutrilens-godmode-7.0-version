

# Fix: QuickLog Parser + Smarter NextMealCard with Pantry Integration

## Problem 1: Inconsistent Food Recognition in QuickLog

**Root cause**: `parseQuickText("1 apple")` splits into `{ name: "apple", qty: 1 }` — this works. But inputs like `"an apple"`, `"apple x3"`, `"half bowl dal"`, or `"2x roti"` fail because the parser only matches `^(\d+\.?\d*)\s*(.+)`.

**Current parser** (line 22-28 in QuickLogSheet):
```
const match = part.match(/^(\d+\.?\d*)\s*(.+)/);
```

**Fix — Enhance `parseQuickText` with:**
1. Strip articles: remove "a ", "an ", "one ", "half " (→ qty 0.5) before matching
2. Handle trailing quantities: "roti x3", "apple x 2", "dal × 2"
3. Handle Hindi units: "2 katori dal" → strip "katori" and pass "dal" to search
4. Normalize common synonyms before search: "curd" → also try "dahi", "chapati" → also try "roti"

**Also improve `searchIndianFoods`:**
5. Add a synonym map at the top of `indian-foods.ts` (e.g., `{ "apple": "apple (indian)", "curd": "curd / dahi", "chapati": "wheat roti" }`)
6. Before scoring, resolve the query through the synonym map
7. Add Levenshtein-based fuzzy matching for typos (e.g., "panneer" → "paneer") — a simple edit-distance ≤ 2 check on food names

**Files to modify:**
- `src/components/QuickLogSheet.tsx` — enhance `parseQuickText()`
- `src/lib/indian-foods.ts` — add synonym map + typo tolerance to `searchIndianFoods()`

---

## Problem 2: NextMealCard Needs Pantry Intelligence

**Current state**: `NextMealCard` calls `getRecipesForMeal()` which filters recipes by budget, dietary prefs, and calories — but completely ignores what the user actually has at home in their pantry (`pantry-store.ts`).

**Fix — Pantry-aware ranking in `meal-suggestion-engine.ts`:**

1. Import `getPantryItems()` from `pantry-store.ts`
2. In `getRecipesForMeal()`, after filtering, add a pantry match bonus to the rank score:
   - For each recipe, check how many of its ingredients match pantry item names (fuzzy)
   - `pantryMatchRatio = matchedIngredients / totalIngredients`
   - Add `pantryMatchRatio * 30` to the rank score (so pantry-available meals rank higher)
3. Show a "🏠 From your pantry" badge on NextMealCard when pantryMatchRatio > 0.5
4. Add a secondary line: "You have 3/5 ingredients at home"

**Also enhance NextMealCard UI:**
5. Show 2-3 alternatives as swipeable dots (not just the top 1 recipe)
6. Add a "Not this — show another" button that cycles to next suggestion
7. Add remaining macro context: "You need 25g more protein today" as a subtitle

**Files to modify:**
- `src/lib/meal-suggestion-engine.ts` — add pantry matching to ranking
- `src/components/NextMealCard.tsx` — show pantry badge, alternatives, macro context

---

## Summary

| Change | File | Effort |
|---|---|---|
| Smarter text parser (articles, trailing qty, Hindi units) | `QuickLogSheet.tsx` | Small |
| Synonym map + typo tolerance | `indian-foods.ts` | Small |
| Pantry-aware recipe ranking | `meal-suggestion-engine.ts` | Medium |
| Pantry badge + alternatives UI | `NextMealCard.tsx` | Medium |

No database, backend, or existing logic changes. Pure parser + ranking + UI enhancements.

