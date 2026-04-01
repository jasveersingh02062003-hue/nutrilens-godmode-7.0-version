

# Allergen Safety System — Gap Analysis & Completion Plan

## Already Built (No Changes Needed)

| Component | Status |
|-----------|--------|
| `allergen-tags.ts` — keyword mapping (60+ keywords) | Done |
| `allergen-engine.ts` — `checkAllergens()` function | Done |
| `store.ts` — `allergens?: string[]` on UserProfile | Done |
| Onboarding — allergen selection step with chips | Done |
| `EditProfileSheet` — allergen management section | Done |
| `AddFoodSheet` — red badges + confirmation dialog | Done |
| `QuickLogSheet` — toast warnings on conflict | Done |
| `MealDetailSheet` — red badges on meal items | Done |
| `MealPlanDashboard` — warning badges on meal cards | Done |
| Cloud sync via `conditions` JSON column | Done |

## Remaining Gaps (6 items)

### Gap 1: Swap Engine Allergen Filter

**Problem**: `getSwapAlternatives()` accepts `allergies` in `profileOverride` but never uses it to filter candidates.

**Fix**: In `src/lib/swap-engine.ts`, add allergen filtering inside the `candidates.filter()` block. For each candidate recipe, run `checkAllergens(recipe.name, userAllergens)` and exclude any recipe that has a conflict.

### Gap 2: "Find Alternative" Button in AddFoodSheet

**Problem**: The allergen confirmation dialog only has "Log Anyway" and "Cancel". No way to find a safe alternative.

**Fix**: Add a third button "Find Alternative" in the `AlertDialog` footer that clears the pending item, sets the search query to the food's category or a generic term, and filters results to exclude the allergen.

### Gap 3: Camera/AI Scan Allergen Warning

**Problem**: After the `analyze-food` edge function returns results, there's no allergen check before confirming.

**Fix**: In the camera result flow (likely in `src/pages/CameraHome.tsx` or the scan result handler), after receiving AI-detected food items, run `checkAllergens()` on each item and show a red banner if conflicts are found, with "Log Anyway" / "Find Alternative" options.

### Gap 4: Add "Hing → Gluten" and Regional Keywords

**Problem**: The keyword list in `allergen-tags.ts` is missing the hing/asafoetida → gluten mapping and some regional language terms.

**Fix**: Add `'hing', 'asafoetida', 'heeng'` to the `gluten` keywords array. Add regional terms like `'doodh'` (dairy), `'muttai'` (eggs/Tamil), `'verkadalai'` (peanuts/Tamil), `'sarson'` (mustard).

### Gap 5: Explicit `allergens` Field on IndianFood Interface

**Problem**: The `IndianFood` interface has no `allergens` field — detection is purely keyword-based on the name, which misses composite dishes (e.g., "Malai Kofta" doesn't contain the word "dairy" but has cream).

**Fix**: Add `allergens?: string[]` to the `IndianFood` interface. Tag the top 50-100 high-risk foods with explicit allergen arrays (paneer dishes → `['dairy']`, samosa → `['gluten']`, etc.). Update `checkAllergens()` to check explicit tags first, then fall back to keywords.

### Gap 6: Severe Allergy Double Confirmation

**Problem**: For life-threatening allergies (nuts, shellfish), a single "Log Anyway" tap is insufficient safety friction.

**Fix**: When the matched allergen is `nuts`, `shellfish`, or `peanuts`, show a second confirmation with explicit risk text: "This food may cause a severe allergic reaction. Are you sure?" requiring the user to type "LOG" or tap a delayed button.

## Implementation Order

1. Gap 4 (regional keywords) — smallest change, immediate safety improvement
2. Gap 5 (explicit allergen tags on foods) — data quality improvement
3. Gap 1 (swap engine filter) — enables Gap 2
4. Gap 2 ("Find Alternative" button) — user-facing mitigation path
5. Gap 3 (camera scan integration) — covers remaining logging flow
6. Gap 6 (severe allergy friction) — safety hardening

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/allergen-tags.ts` | Add hing, regional language keywords, mustard category |
| `src/lib/indian-foods.ts` | Add `allergens?: string[]` to interface, tag top 50-100 foods |
| `src/lib/allergen-engine.ts` | Accept explicit `allergens` array from food item, check before keywords |
| `src/lib/swap-engine.ts` | Filter candidates by allergen check |
| `src/components/AddFoodSheet.tsx` | Add "Find Alternative" button to allergen dialog |
| `src/pages/CameraHome.tsx` | Add allergen check after scan results |
| `src/components/AddFoodSheet.tsx` | Add severe-allergy double confirmation |

