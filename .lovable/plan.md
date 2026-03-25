

## Fix Data Integrity — Consistent Quantity Handling and Validation

### Root Problem

The app has a **quantity multiplication inconsistency** — sometimes `calories` on a FoodItem is per-serving (and needs `* quantity`), sometimes it's already total. Different code paths handle this differently, producing impossible numbers like 284g protein + 213g fat = only 1185 kcal.

### Specific Bugs Found

**Bug 1: Three different total-calculation formulas in MealDetailSheet.tsx**
- `handleDeleteItem` (line 159): `filtered.reduce((s, i) => s + i.calories, 0)` — NO quantity multiply
- `handleUpdateQty` (line 191): `items.reduce((s, i) => s + i.calories, 0)` — NO quantity multiply
- `handleUpdateItemFromEdit` (line 232): `items.reduce((s, i) => s + i.calories * i.quantity, 0)` — WITH quantity multiply
- `handleAddItem` (line 249): `items.reduce((s, i) => s + i.protein, 0)` — NO quantity multiply

These inconsistencies mean the same meal shows different totals depending on which action was last performed.

**Bug 2: CameraHome stores per-unit values but saves total**
- Camera divides nutrition by quantity for per-unit storage (line 301): `calories: nutrition.calories / suggestedQty`
- Then computes total correctly (line 334): `totalCal = sum(calories * quantity)`
- But MealDetailSheet reads without multiplying in some paths

**Bug 3: Fake macro fabrication**
- Gap suggestions (line 594) create FoodItems with fabricated macros: `carbs: Math.round(s.calories * 0.4 / 4)` — not from any food database
- Weather nudge (line 632) does the same: `protein: Math.round(food.calories * 0.15 / 4)`

**Bug 4: Macro-to-calorie validation is missing**
- No check that `(protein*4) + (carbs*4) + (fat*9) ≈ calories`

### Fix Plan (4 files)

**File 1: `src/components/MealDetailSheet.tsx`** — Standardize all total calculations

All 4 recalculation sites must use the same formula. Since CameraHome stores per-unit values and quantity separately, the correct formula is `i.calories * i.quantity`. Fix:

- `handleDeleteItem` (line 159): change `s + i.calories` → `s + i.calories * i.quantity` (and protein, carbs, fat)
- `handleUpdateQty` (line 191): same fix — add `* i.quantity`
- `handleAddItem` (line 249): same fix — add `* i.quantity`
- Display lines 60-63 (`totalP`, `totalC`, etc.) already sum from `m.totalProtein` which is the stored total — these are fine as long as the stored value is correct

**File 2: `src/components/MealDetailSheet.tsx`** — Fix gap suggestion food items

- Lines 594-596: Instead of fabricating macros from calorie percentages, look up the food in the database using `getFoodByName(s.name)` and use `indianFoodToFoodItem` for real nutrition data
- Lines 630-636 (weather nudge): Same fix — use database lookup instead of fabricated ratios

**File 3: `src/lib/food-validation.ts`** — Add macro-calorie cross-check

Add a new validation rule that checks:
```
calculatedCal = (protein * 4) + (carbs * 4) + (fat * 9)
if (|calculatedCal - reportedCal| > max(50, reportedCal * 0.15)):
  warning("Nutrition values don't add up")
```

This catches data corruption before it reaches the user.

**File 4: `src/lib/store.ts`** — Add `getDailyTotals` fix

The existing `getDailyTotals` (line 242) reads from `meal.totalCalories` (pre-computed totals stored on the MealEntry). This is correct IF the stored values are correct. No change needed here, but add a safety comment.

### What This Fixes
- The 284g protein / 1185 kcal mismatch (caused by inconsistent quantity handling)
- Progress bars showing wrong percentages
- Totals changing depending on which action was last performed
- Fabricated nutrition data from suggestions

### What Stays Unchanged
- FoodItem interface (per100g field stays)
- CameraHome save flow (already correct)
- CalorieEngine, PES engine, all other services
- indianFoodToFoodItem (already uses per100g correctly)

