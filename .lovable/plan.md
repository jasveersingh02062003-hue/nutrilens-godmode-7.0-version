

## Add Monika Guide to Onboarding Wizard Steps

### Problem
The `MonikaGuide` component exists with pre-written messages for every onboarding step (`MONIKA_MESSAGES` in `MonikaGuide.tsx`), but it's not imported or used in the main `Onboarding.tsx` wizard. The user wants the animated chat bubble (avatar + speech bubble) to appear at the top of each wizard step.

### Plan (1 file modified)

**File: `src/pages/Onboarding.tsx`**

- Import `MonikaGuide` and `MONIKA_MESSAGES` from `@/components/onboarding/MonikaGuide`
- Add `<MonikaGuide>` at the top of each wizard step's render block, before the `<StepHeader>` component
- Map each step to its corresponding message key from `MONIKA_MESSAGES`:
  - `name` → `name`, `gender` → `gender`, `age` → `dob`, `height`/`weight` → `measurements`
  - `valueDrop` → `summary`, `conditions` → `health`, `skin` → `skinConcerns`
  - `womenHealth` → `womenHealth`, `menHealth` → `menHealth`
  - `work` → `occupation`, `exercise` → `exercise`, `goal` → `goal`
  - `speed` → `goalSpeed`, `targetWeight` → `targetWeight`
  - `diet` → `dietary`, `water` → `water`, `mealTimes` → `mealTimes`
- Use `compact` prop on all steps except the first (`name`) for tighter spacing
- The existing `StepHeader` stays below the Monika guide bubble

### What stays unchanged
- `MonikaGuide` component itself (already built with animations)
- `MONIKA_MESSAGES` data (already has messages for all steps)
- All wizard logic, navigation, and data flow

