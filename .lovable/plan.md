

## NutriLens AI – Onboarding Wizard Rebuild

### Summary
Replace the existing onboarding wizard with a streamlined 8-phase flow matching the exact data structure, calculation logic, and step order specified. The current `Onboarding.tsx` (~1460 lines) will be rewritten, and the calculation engine updated.

### Data Structure
Save to `localStorage` key `nutrilens_user` with the nested structure: `basic`, `health`, `activity`, `goals`, `lifestyle`, `meta`. A compatibility layer will also write the existing `nutrilens_profile` key so other app components don't break.

### Calculation Changes (`src/lib/nutrition.ts` + `src/lib/goal-engine.ts`)

**Activity multiplier** — derived from work + exercise combo (not a single dropdown):
```text
work\exercise  | none | 1-3  | 4-5  | daily
sitting        | 1.2  | 1.375| 1.55 | 1.725
mixed          | 1.375| 1.55 | 1.725| 1.9
physical       | 1.55 | 1.725| 1.9  | 1.9
```

**Goal calories:**
- Lose balanced: TDEE × 0.80, aggressive: TDEE × 0.70
- Gain balanced: TDEE × 1.10, aggressive: TDEE × 1.20
- Clamp: `Math.max(1200, Math.min(target, TDEE * 1.3))`

**Macro formulas (weight-based protein):**
- Protein factor: lose → 1.8, maintain → 1.4, gain → 1.6
- Activity bonus: multiplier ≥ 1.55 → +0.2, ≥ 1.725 → another +0.2, cap at 2.2
- Fat = (target × 0.25) / 9
- Carbs = remaining calories / 4

**Health adjustments (non-stacking carb reduction):**
- PCOS + diabetes → carbs × 0.75
- PCOS only → carbs × 0.85, fats × 1.10
- Diabetes only → carbs × 0.80
- Thyroid → note only, no calorie change
- Rebalance carbs from remaining calories; floor carbs at 50g

**Expected weight change:**
- Loss: `(deficit × 7) / 7700`, cap 1.0 kg/week
- Gain: `(surplus × 7) / 7700`, cap 0.5 kg/week

**Water:** `weight × 0.035` litres, rounded to 0.1L

### Phase Flow (8 Phases)

| Phase | Steps | Key UI |
|-------|-------|--------|
| 1 – Core Identity | Name, Gender, Age (slider 13–80), Height, Weight | Input validation, unit toggle |
| 2 – Value Drop | BMI + BMR display | Personal translation text, Continue button |
| 3 – Health | Conditions (checkboxes), Skin (single-select) | Specific food-based insights per skin type |
| 4 – Activity | Work type, Exercise frequency | 3 + 4 options |
| 5 – Goal & Target | Goal, Speed, Target weight | Validation (lose < current, gain > current) |
| 6 – Final Output | TDEE, Target calories, Macros, Expected change | Arrow animation, thyroid note if applicable |
| 7 – Lifestyle (optional) | Diet, Water slider, Supplements, Cooking | Contextual insights linking supplements to macro targets |
| 8 – Finish | Save button | Save `nutrilens_user`, show success, clear wizard |

### Files to Modify

1. **`src/pages/Onboarding.tsx`** — Full rewrite with 8-phase structure, ~800-1000 lines. Remove intermediate screens (calculating, motivation, subscription). Keep existing UI patterns (motion animations, Option/ChipSelect components, MonikaGuide).

2. **`src/lib/goal-engine.ts`** — Update `determineGoalAndTargets` to accept work+exercise instead of single activity level. Add the specified macro formula (weight-based protein, health carb adjustments with non-stacking logic, 50g carb floor).

3. **`src/lib/nutrition.ts`** — Add `getActivityMultiplier(work, exercise)` function. Keep existing functions for backward compatibility.

4. **`src/lib/store.ts`** — Add `saveOnboardingData(data)` that writes both the new nested structure (`nutrilens_user`) and the legacy `nutrilens_profile` format. Add `getOnboardingProgress()` / `saveOnboardingProgress()` for step persistence.

### Specific Insights (Hardcoded)

- **Acne-prone:** "We'll recommend pumpkin seeds and lentils (zinc) and suggest limiting dairy."
- **Dry:** "Healthy fats like avocado and nuts will be highlighted, plus extra water reminders."
- **Oily:** "Zinc-rich foods like chickpeas and seeds will help regulate oil production."
- **Supplements:** Dynamic — e.g., "Protein powder will help you hit your daily protein target of {protein}g."
- **Cooking:** Dynamic — e.g., "With {time} minutes and {equipment}, we'll suggest quick one-pan meals."

### Edge Cases Handled
- Calories < 1200 → clamp + warning banner
- Carbs < 50g → reduce fat slightly, show warning
- Target weight validation errors
- Leading zeros stripped via `parseFloat`
- Resume on page load from saved progress

### What's NOT Changing
- No dashboard or post-onboarding features
- Existing sub-components (MonikaGuide, OnboardingProgress) reused where applicable
- Tailwind CSS styling, mobile-first layout preserved

