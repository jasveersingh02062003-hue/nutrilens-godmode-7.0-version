
# Allergen Safety System — IMPLEMENTED

## What Was Built

### New Files
- `src/lib/allergen-tags.ts` — Keyword→allergen mapping for 6 categories (dairy, gluten, nuts, soy, eggs, shellfish) with ~60 keywords
- `src/lib/allergen-engine.ts` — `checkAllergens()` detection engine + helper functions

### Modified Files
- `src/lib/store.ts` — Added `allergens?: string[]` to `UserProfile`
- `src/lib/onboarding-store.ts` — Added `allergens` to `OnboardingData.health` and profile save
- `src/contexts/UserProfileContext.tsx` — Syncs allergens via `conditions.allergens` JSON column (no DB migration needed)
- `src/pages/Onboarding.tsx` — Allergen selection chips added to Health Conditions step (step 6)
- `src/components/EditProfileSheet.tsx` — "Allergies & Intolerances" section with destructive-colored chips
- `src/components/AddFoodSheet.tsx` — Red pulsing badges on search results + confirmation dialog before logging
- `src/components/QuickLogSheet.tsx` — Toast warnings for allergen conflicts
- `src/components/MealDetailSheet.tsx` — Red allergen badges on food items
- `src/components/MealPlanDashboard.tsx` — Allergen badges on meal cards
