

## Smart Target Weight Validation with Healthy Range Insight

### Problem
The current target weight step (case 13) only checks direction consistency. It doesn't validate against BMI-based healthy ranges, warn about extreme changes, or suggest healthy alternatives.

### Plan (1 file modified)

**File: `src/pages/Onboarding.tsx` — Step 13 (target weight)**

Replace the simple input + basic validation with a comprehensive system:

#### 1. Add helper functions (above the component)

- `getHealthyWeightRange(heightCm, age)`: Returns `{min, max}` in kg
  - Adults (≥20): min = 18.5 × h², max = 24.9 × h²
  - Age ≥65: min = 23.0 × h² (sarcopenia adjustment)
  - Teens (<20): use 18.5–24.9 but add disclaimer text
- `getTargetBMI(weight, heightCm)`: Returns BMI rounded to 1 decimal
- `getWeightInsight(currentWeight, targetWeight, heightCm, age, goal)`: Returns `{ type, color, message, suggestion }` where type is `'valid'|'direction'|'unsafe_low'|'unsafe_high'|'extreme'|'underweight_losing'`

#### 2. Rewrite case 13 UI

- Keep the number input field
- Add a **healthy range indicator** bar below the input showing min–max with the target marked
- Add an **animated insight card** (slide-down via framer-motion) that shows:
  - Green card: "Your target is within a healthy range" + checkmark
  - Amber card: extreme change warning (>15%) with "We suggest a 5–10% initial milestone of X kg" + "Apply milestone" button
  - Red card: unsafe BMI warning with "At your height, healthy range is X–Y kg" + "Suggest healthy weight" button that auto-sets the nearest safe value
  - Direction error: shown as red text (already exists, keep it)
- The "Suggest healthy weight" / "Apply milestone" buttons update `targetWeight` via `set()` and re-trigger validation

#### 3. Update validation in `canProceed` (case 13)

- Keep direction check
- Allow proceeding even with amber warnings (user can override)
- Block only on direction mismatch or target ≤0 / >300

#### 4. Validation logic summary

```
heightM = heightCm / 100
targetBMI = targetWeight / (heightM²)
healthyMin = (age >= 65 ? 23.0 : 18.5) * heightM²
healthyMax = 24.9 * heightM²
percentChange = |target - current| / current

if goal=lose && target >= current → direction error (red, blocks)
if goal=gain && target <= current → direction error (red, blocks)
if targetBMI < 18.5 (or <23 for 65+) → unsafe low (amber, suggest healthyMin)
if targetBMI > 24.9 → note but allow (soft amber)
if percentChange > 0.15 → extreme change (amber, suggest 5-10% milestone)
if current BMI < 18.5 && goal=lose → "already underweight" warning
else → valid (green checkmark)
```

### What stays unchanged
- All other onboarding steps
- Goal engine calculations
- Navigation, progress bar, data persistence
- The final plan screen still uses whatever target the user confirms

