

# Allergen Safety System — Implementation Plan

## Overview

Add a full allergen detection and warning system that protects users with food allergies (nuts, dairy, gluten, soy, eggs, shellfish) across all food logging and meal planning flows.

## What Gets Built

### 1. Allergen Keyword Mapping (`src/lib/allergen-tags.ts` — NEW)

A dictionary mapping ~60 food keywords to allergen categories:
- **dairy**: paneer, ghee, curd, dahi, lassi, kheer, cheese, cream, milk, raita, butter, malai
- **gluten**: wheat, roti, naan, paratha, bread, pasta, maida, suji, semolina, bhatura, puri
- **nuts**: peanut, almond, cashew, kaju, badam, walnut, pistachio
- **soy**: soya, tofu, soy
- **eggs**: egg, anda, omelette
- **shellfish**: prawn, shrimp, crab, lobster

Export: `ALLERGEN_KEYWORDS: Record<string, string[]>` and `COMMON_ALLERGENS` list for UI chips.

### 2. Allergen Detection Engine (`src/lib/allergen-engine.ts` — NEW)

```typescript
function checkAllergens(foodName: string, userAllergens: string[]): {
  hasConflict: boolean;
  matched: string[];  // e.g. ["dairy", "gluten"]
}
```

Scans the food name against `ALLERGEN_KEYWORDS`. Returns matched allergen categories that intersect with the user's declared allergens. Case-insensitive, handles multi-word names.

### 3. User Profile — Store Allergens

- Add `allergens?: string[]` to `UserProfile` interface in `src/lib/store.ts`
- Stored inside the existing `conditions` JSON column in the cloud `profiles` table (as `conditions.allergens`) — no DB migration needed
- Sync via existing `UserProfileContext` cloud sync (already syncs `conditions`)

### 4. Onboarding — Allergen Selection Step

Insert a new step after Health Conditions (step 6) → becomes **step 7** (all subsequent steps shift by 1).

UI: Multi-select chips with animated stagger (reusing existing `ChipSelect` component):
- 🥜 Nuts, 🥛 Dairy, 🌾 Gluten, 🫘 Soy, 🥚 Eggs, 🦐 Shellfish, + "Other" free-text input
- "None" button clears selection
- Insight box: "We'll warn you before logging any food containing these allergens."

Store in `f.allergens` in the form state, save to `profile.allergens` on completion.

### 5. Profile Settings — Allergen Management

Add an "Allergies & Intolerances" section to `EditProfileSheet.tsx` between Health Conditions and Dietary Preferences. Same chip UI as onboarding. Changes save immediately via `updateProfile`.

### 6. Warning UI in Logging Flows

**AddFoodSheet** — After each search result renders, call `checkAllergens`. If conflict:
- Show animated red pill badge: `⚠️ Contains DAIRY` next to the food name (pulse animation)
- On tap, show confirmation dialog: "This food contains dairy. Log anyway?" with "Log Anyway" and "Find Alternative" buttons
- "Find Alternative" filters results excluding the allergen

**QuickLogSheet** — After `parseQuickText` resolves foods, check each item. If any conflict, show a red toast with shake animation: `⚠️ "Paneer" contains DAIRY — tap to remove`

**MealDetailSheet** — When viewing a meal's items, show a small red badge on any item containing user allergens.

### 7. Meal Planner Warnings

In `MealPlanDashboard.tsx`, when rendering meal cards, check each recipe's name against user allergens. Show a small animated red `⚠️` badge on the meal card if any allergen is detected. Tooltip on hover/tap shows which allergens.

### 8. Animations

- **Red badge**: `animate-pulse` on first appearance, then static
- **Warning toast**: slide-in from top with `animate-fade-in` + red background
- **Confirmation modal**: `animate-scale-in` with red-tinted header
- **Chip selection**: existing stagger animation from onboarding `ChipSelect`
- **Badge on meal cards**: subtle `animate-scale-in` entrance

## Files Modified/Created

| File | Action |
|------|--------|
| `src/lib/allergen-tags.ts` | **NEW** — keyword→allergen mapping |
| `src/lib/allergen-engine.ts` | **NEW** — `checkAllergens()` function |
| `src/lib/store.ts` | Add `allergens?: string[]` to `UserProfile` |
| `src/contexts/UserProfileContext.tsx` | Map `allergens` in cloud sync (via conditions) |
| `src/pages/Onboarding.tsx` | Add allergen step after health conditions, shift step numbers |
| `src/components/EditProfileSheet.tsx` | Add allergen chips section |
| `src/components/AddFoodSheet.tsx` | Red badge + confirmation dialog for allergen foods |
| `src/components/QuickLogSheet.tsx` | Toast warning on allergen conflict |
| `src/components/MealDetailSheet.tsx` | Red badge on flagged items |
| `src/components/MealPlanDashboard.tsx` | Badge on meal cards with allergens |

No database migration needed — allergens stored in existing `conditions` JSON column.

