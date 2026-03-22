

## Upgrade Rule Engine: Add Missing Layers (IBS, Anemia, Skin, Gender, Conflicts, Budget Tiers)

### Current State vs Spec

| Layer | Status | Gap |
|-------|--------|-----|
| 1. BMR/TDEE | ✅ Done | — |
| 2. Goal Adjustment | ✅ Done | — |
| 3. Macro Distribution | ✅ Done | — |
| 4. Health Conditions | ⚠️ Partial | **IBS and Anemia** missing from `conditionRules` in `logic-engine.ts`. No priority system. No condition-specific macro adjustments beyond PCOS/diabetes. |
| 5. Skin Engine | ⚠️ Partial | Insight text exists in onboarding but **skin rules not integrated into food evaluation** (`evaluateFoodForUser` ignores skin). |
| 6. Gender/Hormonal | ⚠️ Partial | Data collected (pregnancy, breastfeeding, testosterone, prostate) but **no calorie additions** (+350 pregnancy, +500 breastfeeding) in goal-engine. Male food rules not in logic-engine. |
| 7. Budget Filter | ⚠️ Partial | Budget tracking exists but **no budget-tier food categorization** (low/mid/high protein sources). |
| 8. Conflict Resolution | ❌ Missing | No logic for combining conditions (e.g., IBS+Diabetes → low-FODMAP + low-GI). |

### Plan

**File 1: `src/lib/logic-engine.ts` — Add missing conditions, skin rules, gender rules, conflict resolution**

- Add `ibs` and `anemia` to `conditionRules` with proper avoid/prefer keywords
- Add `skinRules` object with `focus` and `avoid` keywords per skin type (acne, dry, oily, eczema, rosacea)
- Add `maleHealthRules` for testosterone and prostate (focus/avoid keywords)
- Add `conditionPriority` map (ibs: 10, diabetes: 10, pcos: 10, hypertension: 9, cholesterol: 9, anemia: 8, thyroid: 6)
- Add `conflictResolutions` array for known combos (diabetes+ibs → combined avoid lists)
- Update `evaluateFoodForUser()` to also check skin concerns and male health data from profile
- Add `getEffectiveRestrictions(profile)` function that merges all condition rules with conflict resolution and returns unified `{avoid, prefer, macroAdjust}` set

**File 2: `src/lib/goal-engine.ts` — Add pregnancy/breastfeeding calorie adjustments**

In `calculateOnboardingGoals()`:
- Accept `genderSpecific` data (pregnancy, breastfeeding) as part of input
- If pregnant: add +350 kcal to target after goal adjustment, add safety warning about not going below 1800 kcal
- If breastfeeding: add +500 kcal to target, add +1L to water recommendation
- These adjustments happen AFTER goal calculation but BEFORE macro split

**File 3: `src/lib/nutrition.ts` — Add water activity bonus from spec**

- Update `calculateWaterGoal` (currently in goal-engine) to also accept activity string and add 0.3L for moderate, 0.5L for high — already done via multiplier check, no change needed.

**File 4: `src/lib/onboarding-store.ts` — Pass gender-specific data to goal engine**

- In `saveOnboardingData()`, pass pregnancy/breastfeeding flags into the profile so the goal engine can use them during recalculation

### What Stays Unchanged
- Onboarding UI (data already collected for all these fields)
- Calorie engine / redistribution
- Dashboard, Monica, meal planner
- Store types (already have `menHealth`, `womenHealth`, `skinConcerns`)

### Technical Details

Conflict resolution approach:
```
function resolveConflicts(conditions: string[]): { mergedAvoid: string[], mergedPrefer: string[] } {
  // Start with all individual avoid/prefer lists
  // For known combos, apply special rules (e.g., IBS+diabetes = low-FODMAP + low-GI)
  // Higher priority conditions override lower ones on conflicts
}
```

Budget-tier suggestion (added to logic-engine as data, used by suggestion-engine and Monica):
```
budgetTiers = {
  low: { protein: ['eggs','soya','lentils'], carbs: ['rice','roti'], fats: ['milk','peanuts'] },
  mid: { protein: ['chicken','paneer','curd'], fats: ['nuts','seeds'] },
  high: { protein: ['fish','salmon'], fats: ['avocado','olive oil'] }
}
```

