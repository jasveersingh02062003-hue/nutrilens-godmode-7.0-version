

## Onboarding Wizard – Final Fixes & Enhancements

### Summary
Add adherence scoring, timeline ranges, visual calorie cues, refined macro constraints, and updated wording to the existing onboarding wizard. No structural rewrite needed — these are targeted additions to 4 files.

### Changes

**1. `src/lib/goal-engine.ts` — Refined macro logic + adherence score**

- Add goal-specific protein caps: lose → max 2.0 (if weight < 50kg → 1.8), maintain → max 1.8, gain → max 2.2
- After computing base protein/fat/carbs with health adjustments, **scale all macros** to match target calories exactly:
  - `scaleFactor = target / (protein*4 + fat*9 + carbs*4)`
  - Apply scale, then enforce constraints in order: protein cap → fat minimum (20%) → carbs floor (50g)
- Add `weeksMin`/`weeksMax` to `OnboardingGoalResult`:
  - `minWeeks = Math.floor(weightDiff / weeklyRate)`
  - `maxWeeks = Math.ceil(weightDiff / (weeklyRate * 0.8))`
- Add adherence score calculation function:
  - Start 100, subtract penalties (high protein, veg+high protein, low cooking time+gain, aggressive deficit, low calories, fast loss rate)
  - Return score (0-100) and label (easy/moderate/hard)
- Add water calculation with activity bonus (+0.5 if multiplier ≥ 1.55, +1.0 if ≥ 1.725), capped 0.5–5.0

**2. `src/lib/onboarding-store.ts` — Extended data structure**

- Add to `goals` interface: `weeksMin: number | null`, `weeksMax: number | null`
- Add to `meta` interface: `adherenceScore: number`, `adherenceLabel: string`, `expectedAdaptation: boolean`, `plateauCounter: number`, `lastWeightEntry: string | null`

**3. `src/pages/Onboarding.tsx` — UI enhancements on Phase 6 (Final Output)**

- Visual calorie cue: green/yellow/red indicator based on target vs TDEE ratio
- Timeline range: "Estimated timeline: X–Y weeks" (for lose/gain goals)
- Adherence score display with colored label
- Goal-linked insight text (lose+high protein, gain+high protein, veg+high protein)
- Plateau warning text
- Update skin insight wording: "Your plan will focus on…" instead of "We'll recommend…"
- Update cooking summary wording similarly
- Water slider: use activity-adjusted recommendation

**4. `src/pages/Onboarding.tsx` — handleFinish updates**

- Pass new fields (weeksMin, weeksMax, adherenceScore, adherenceLabel, etc.) into the saved data structure

### Files Modified
- `src/lib/goal-engine.ts`
- `src/lib/onboarding-store.ts`
- `src/pages/Onboarding.tsx`

