

# Fix: Allergen Warnings in Manual Entry, Voice & Barcode Flows

## Problem
The allergen warning system works in the camera flow (`CameraHome.tsx`) and the "Add Missing Item" sheet (`AddFoodSheet.tsx`), but the main logging page **`LogFood.tsx`** — which handles manual search, voice input, and barcode scanning from the Dashboard — has zero allergen integration. When you tap "+" on Breakfast/Dinner in the Dashboard, you end up in `LogFood.tsx`, which never checks allergens.

## What Needs to Change

### File: `src/pages/LogFood.tsx` (the only file that needs changes)

**1. Search results — allergen badges (like AddFoodSheet already does)**
- Import `checkAllergens`, `getAllergenLabel`, `getAllergenEmoji`, `hasSevereAllergen` from `allergen-engine`
- Import `getProfile` for user allergens (already imported)
- In the search results list (~line 479-490), run `checkAllergens(food.name, userAllergens)` on each result
- Show red allergen badges (⚠️ DAIRY, ⚠️ NUTS) next to food names that conflict — with `animate-pulse` animation
- Change the "+" button to red when allergen conflict exists

**2. Add food gate — confirmation dialog before adding**
- Add state for `pendingAllergenItem` and `showSevereConfirm` (same pattern as AddFoodSheet)
- When user taps a food with allergen conflict, intercept `addFood()` and show the allergen confirmation `AlertDialog` instead of adding directly
- Dialog has 3 options: "Find Safe Alternative", "Log Anyway", "Cancel"
- For severe allergens (nuts, peanuts, shellfish), show double confirmation with 3-second delayed button

**3. Adjust step — allergen warning banner on selected items**
- In the adjust step (~line 498-535), after adding items via voice/camera/barcode, run allergen check on each selected item
- Show a prominent animated red warning banner (matching CameraHome's style) with `ShieldAlert` icon for any items that conflict
- Include per-item "Remove [food]" buttons in the banner

**4. Pre-save allergen check**
- In `saveMeal()` (~line 115), before proceeding to context picker, run allergen check on all selected items
- If any conflicts found, show a final warning toast as a safety net

**5. Animated warning styling**
- Use `motion.div` from framer-motion for entrance animations (scale + fade)
- `animate-pulse` on warning badges
- `ShieldAlert` icon with spring animation for severe warnings
- Red banner: `bg-destructive/10 border-destructive/30` with WCAG AA contrast

## What This Fixes
- **Dashboard manual entry**: Breakfast/Lunch/Dinner/Snack "+" buttons → search → allergen warnings
- **Voice logging**: After voice recognition resolves foods → allergen banner on results
- **Barcode scanning**: After barcode resolves to a product → allergen banner on results
- **All paths through LogFood.tsx** now have allergen safety friction

## No Changes Needed
- `CameraHome.tsx` — already fully implemented
- `AddFoodSheet.tsx` — already fully implemented
- `QuickLogSheet.tsx` — already has toast warnings
- `allergen-engine.ts` / `allergen-tags.ts` — already complete
- No database or backend changes

