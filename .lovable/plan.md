

## Onboarding Wizard – Expanded Health, Gender-Specific, Budget & Intelligence Demo

### Summary
Add missing features to the existing onboarding wizard: expanded health conditions (7 total), expanded skin options (9 total), gender-specific branching questions, a budget step in lifestyle, and an intelligence demo phase before finish.

### What's New (not already implemented)

**1. Expanded Health Conditions** (step 6)
- Add: Hypertension, High Cholesterol, IBS, Anemia (currently only Diabetes, Thyroid, PCOS)
- Show aggregated insight after selection: "Your plan will focus on: low-GI for diabetes, iron-rich for anemia..."

**2. Expanded Skin Options** (step 7)
- Add: Eczema, Rosacea, Psoriasis
- Add insights for new options (eczema → omega-3, rosacea → anti-inflammatory, psoriasis → vitamin D)

**3. Gender-Specific Questions** (new step 8, shifts subsequent steps)
- Female: PCOS severity slider (1-5, if PCOS selected), Pregnant Y/N, Breastfeeding Y/N, Menstrual phase dropdown
- Male: Prostate concerns Y/N, Testosterone concerns Y/N
- Store in `health.genderSpecific` field

**4. Budget Step** (new step in lifestyle phase)
- Ask "Set a daily food budget?" → if yes, slider ₹100-2000, optional meal split sliders
- Store in `lifestyle.budget`

**5. Intelligence Demo Phase** (new phase before Finish)
- Mock meal suggestion based on profile (diet, conditions, budget)
- Mock camera warning: simulate scanning "Sweet Lassi" using the existing `logic-engine.ts` rule engine
- Explanation text: "This is how NutriLens AI will work in real time"

### Files to Modify

**`src/pages/Onboarding.tsx`**
- Add `genderSpecific` fields to FormState (pcosSeverity, pregnant, breastfeeding, menstrualPhase, prostate, testosterone)
- Add `budgetEnabled`, `budgetAmount` to FormState
- Expand condition options array (add 4 more)
- Expand skin options array (add 3 more)
- Insert gender-specific step after skin (new step 8)
- Insert budget step in lifestyle section
- Insert intelligence demo step before finish
- Update step numbering in `getVisibleSteps()`, `canContinue()`, and all case references
- Update `handleFinish` to include genderSpecific and budget data

**`src/lib/onboarding-store.ts`**
- Add `genderSpecific` to health interface
- Add `budget` to lifestyle interface
- Update `saveOnboardingData` to map new fields to legacy profile

**`src/lib/goal-engine.ts`**
- No changes needed (conditions already flow through correctly)

### Step Renumbering
Current: 0-19 (20 steps). New steps inserted:
- Step 8 → Gender-specific questions (new)
- Steps 9+ shift by 1
- Budget step added in lifestyle block
- Intelligence demo step added before finish

Total visible step count increases by 2-3 depending on user choices.

### Edge Cases
- Gender-specific step auto-adapts content based on gender
- PCOS severity only shows if PCOS was selected in conditions
- Budget step only expands if user enables it
- Intelligence demo uses existing `conditionRules` from `logic-engine.ts` for camera warnings

