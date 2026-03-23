

## Add Prediction Summary Screen After Personalized Plan

### What it does
A new step (inserted after the current step 15 — the final plan screen) that shows a visual, prediction-focused summary: plan speed options, total deficit/surplus, timeline in days/months, weekly/monthly rate, and a Monika coach tip. This gives the user a "real prediction" of their journey before proceeding.

### Plan (2 files)

**File 1: `src/components/onboarding/PredictionSummaryStep.tsx` (NEW)**

A dedicated component that receives `goalResult`, `currentWeight`, `targetWeight`, `goalType` as props and renders:

- **Goal summary card**: "You want to lose/gain X kg" with total deficit/surplus needed (X × 7700 kcal)
- **Three plan options** (Aggressive / Moderate / Slow) as selectable cards showing:
  - Daily deficit/surplus (800 / 500 / 300 kcal)
  - Estimated time in weeks and months
  - Weekly rate (kg/week)
  - The user's current plan highlighted as "recommended"
- **Calorie intelligence section**: Maintenance TDEE → Target intake → Deficit/surplus → "1 kg = 7700 kcal" explanation line
- **Dynamic timeline display**: "At current pace, you will reach your goal in X weeks (~Y months)"
- **Monika coach tip card** at bottom based on goal magnitude
- Count-up animation on numbers using framer-motion
- For `maintain` goal: show a simpler card ("You're maintaining — no timeline needed") with TDEE and macro targets

**File 2: `src/pages/Onboarding.tsx` (MODIFIED)**

- Import `PredictionSummaryStep`
- Shift step numbering: current steps 16–23 become 17–24
- Insert new step 16 as the prediction summary screen
- Update `getVisibleSteps()` to include step 16 after step 15
- Update `STEP_MONIKA_KEY`, `canContinue`, and finish step references
- The prediction step receives `goalResult`, `f.weightKg`, `f.targetWeight`, `f.goalType` as props
- No new state needed — calculations derive from existing `goalResult`

### Calculation logic (inside the new component)
```
KCAL_PER_KG = 7700
weightDiff = |currentWeight - targetWeight|
totalDeficit = weightDiff * 7700

plans:
  aggressive: { deficit: 800, days: totalDeficit/800, weeks: days/7 }
  moderate:   { deficit: 500, days: totalDeficit/500, weeks: days/7 }
  slow:       { deficit: 300, days: totalDeficit/300, weeks: days/7 }
```

### What stays unchanged
- All existing steps and their content
- Goal engine calculations
- handleFinish, data persistence
- All other phases (splash, welcome, etc.)

