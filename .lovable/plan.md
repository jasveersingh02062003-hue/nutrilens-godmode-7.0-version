

## Add Health-Aware Food Intelligence Screen (Step 17)

### What it does
A new onboarding step inserted after the Prediction Summary (current step 16) that shows a personalized summary of the user's food rules based on their health conditions, skin concerns, goal, and gender-specific factors. It gives users a "your food intelligence" overview before they proceed to lifestyle questions.

### Current state
- Step 16 = Prediction Summary, Step 17+ = lifestyle questions, Step 24 = Finish
- `condition-coach.ts` already has comprehensive rule evaluators for diabetes, hypertension, IBS, thyroid, PCOS, anemia, cholesterol, etc.
- `food-tags.ts` already has skin-based food tagging (acne, oily, dry, glow, etc.)
- The intelligence demo (step 23) shows a sample meal warning but doesn't give a personalized avoid/prefer overview

### Plan (2 files)

**File 1: `src/components/onboarding/FoodIntelligenceStep.tsx` (NEW)**

Receives props: `conditions[]`, `skinConcern`, `goal`, `genderSpecific`, `dietType`

Renders:
- Header: "Your Food Intelligence" with a brain/shield icon
- For each active condition (diabetes, hypertension, PCOS, etc.), show a card with:
  - Condition name + icon
  - "Avoid" list (3-5 key foods/categories in red chips)
  - "Prefer" list (3-5 foods in green chips)
- Skin section: if skin concern selected, show foods good/bad for that skin type
- Goal section: if lose/gain, show calorie-aware tips (e.g., "Prefer high-protein, low-calorie foods")
- Gender section: if pregnant/breastfeeding, show key avoid/prefer items
- If no conditions: show a green card "No specific restrictions — focus on balanced nutrition"
- Monika tip at bottom: "I'll warn you in real-time when you log foods that conflict with your profile"

Uses a static rules map (derived from the keyword lists in `condition-coach.ts` and `food-tags.ts`) to display human-readable food names rather than raw keywords.

**File 2: `src/pages/Onboarding.tsx` (MODIFIED)**

- Import `FoodIntelligenceStep`
- Shift steps 17–24 → 18–25
- Insert new step 17 for the food intelligence screen
- Update `getVisibleSteps`, `canContinue`, `STEP_MONIKA_KEY`, `isFinishStep` (→ 25), `isSummaryStep` (stays 14)
- Pass `f.conditions`, `f.skinConcern`, `f.goalType`, `f.genderSpecific`, `f.diet` as props

### What stays unchanged
- All existing condition-coach logic (used at meal logging time)
- All existing food-tags logic
- All other onboarding steps content
- The intelligence demo step (now step 24) still shows the live meal warning preview

