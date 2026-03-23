

## Enhanced Target Weight Screen — Extract to Dedicated Component

### Current State
Step 13 in `Onboarding.tsx` (lines 1077–1197) already has all the validation logic and a basic UI with range bar, insight card, and suggestion buttons. The user wants a more graphically rich, animated version with:
- Color-gradient range bar (red→amber→green→amber→red)
- BMI color-coded pill
- Stepper buttons (+/−) alongside the input
- Glow effect on healthy range
- Smoother animations on all transitions

### Plan

**File 1: `src/components/onboarding/TargetWeightStep.tsx` (NEW)**

Extract step 13 into a standalone component that receives props: `currentWeight`, `heightCm`, `age`, `goal`, `targetWeight`, `onChangeTarget`, `isTeenager`.

UI enhancements over current implementation:
- **Stepper buttons**: Add −/+ buttons flanking a large centered weight display (not just a plain input)
- **BMI pill**: Colored badge below the weight (green 18.5–24.9, amber 25–29.9 or 16–18.4, red <16 or >30)
- **Healthy range text**: "Healthy range: X–Y kg" in subtle text
- **Gradient range bar**: Instead of a grey bar with a green zone overlay, render a full gradient bar (red edges, amber transitions, green center at healthy zone) using a CSS linear-gradient computed from the healthy range percentages. Target marker has a glow/shadow when in the green zone
- **Current weight marker**: Small labeled tick on the bar
- **Insight card**: Same logic, but with a spring bounce entrance and slightly larger padding. Green card gets a subtle sparkle icon (Sparkles from lucide)
- **Suggestion/milestone buttons**: Same as current but with elastic `whileTap` animation

All validation logic (`getHealthyWeightRange`, `getTargetBMI`, `getWeightInsight`) stays in `Onboarding.tsx` — the component receives the computed `insight` object as a prop.

**File 2: `src/pages/Onboarding.tsx` (MODIFIED)**

- Import `TargetWeightStep`
- Replace the inline case 13 block (lines 1077–1197) with:
  ```tsx
  case 13:
    return <TargetWeightStep ... />
  ```
- Pass all needed props: `currentWeight={f.weightKg}`, `heightCm={f.heightCm}`, `age={f.age}`, `goal={f.goalType}`, `targetWeight={f.targetWeight}`, `onChangeTarget={(v) => set('targetWeight', v)}`, plus the pre-computed `insight`, `healthyMin`, `healthyMax`, `targetBMI`

### Visual Details

**Gradient bar** computed as:
```
background: linear-gradient(to right, 
  #ef4444 0%, 
  #f59e0b ${healthyStartPct - 5}%, 
  #22c55e ${healthyStartPct}%, 
  #22c55e ${healthyStartPct + healthyWidthPct}%, 
  #f59e0b ${healthyStartPct + healthyWidthPct + 5}%, 
  #ef4444 100%)
```

**Target marker**: 20px circle with white border, positioned via `left: X%`, with `box-shadow: 0 0 12px rgba(34,197,94,0.5)` when in green zone.

**Stepper**: Two circular buttons (−/+) on either side of a large `text-3xl font-bold` weight number. Each click changes by 0.5 kg with haptic-style scale animation.

### What stays unchanged
- All validation functions (lines 88–170)
- canProceed logic for case 13
- Navigation, progress, data persistence
- Monika guide (rendered separately above the step)

