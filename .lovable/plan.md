

## Add PES Feature Flex, Post-Onboarding Explanation Card, and Meal Logging PES Breakdown

### 3 New Components, 2 Files Modified

---

### File 1: `src/components/PESFeatureFlex.tsx` (NEW)

Full-screen animated overlay shown on first app load (before onboarding).

- Dark gradient background with backdrop blur
- Animated circular PES meter that cycles through 3 examples every 3 seconds:
  - Soya Chunks — PES 4.33 🟢 "Excellent Value"
  - Paneer — PES 0.45 🟡 "Average Value"  
  - Biryani — PES 0.13 🔴 "Poor Value"
- Animated number counter, color transitions, pulsating glow on green
- Tagline animates in: "We don't just track food – we tell you if it's worth your money."
- Large CTA button: "Experience Food Value Intelligence"
- Uses framer-motion (already in project) for all animations
- Checks `localStorage.getItem('pes_flex_seen')` — renders nothing if already seen
- On dismiss: sets flag, calls `onDismiss` prop

### File 2: `src/components/PESExplanationCard.tsx` (NEW)

Glassmorphic card that slides up from bottom after onboarding + budget setup complete. Shown once.

- Title: "Food Value Intelligence – Your Secret Weapon"
- PES explanation with threshold visuals (🟢 ≥ 0.8, 🟡 0.4–0.8, 🔴 < 0.4)
- Animated carousel cycling through 3 food examples with PES + color
- Testimonial: "I saved ₹2000 this month just by swapping paneer for soya..." – Priya, Delhi
- CTA: "Got it, let's go!" — sets `localStorage.setItem('pes_explanation_seen', 'true')`
- Uses framer-motion slide-in + AnimatePresence

### File 3: `src/components/PESBreakdownModal.tsx` (NEW)

Animated modal shown after user clicks "Save Meal" but before actual save.

- Glassmorphic design with slide-up + bounce animation
- Shows: food name, cost (₹X), protein/carbs/fat breakdown
- Protein per Rupee with animated color circle (🟢/🟡/🔴)
- Cost per gram of protein (₹X/g) with comparison text
- Rating label: "Excellent Value" / "OK Value" / "Poor Value"
- Insight text (e.g., "For ₹70 you get 12g protein. Try eggs for 1.0g/₹.")
- Two buttons: "Log to [Meal]" (saves) and "Edit" (goes back)
- Props: `food` data, `mealType`, `onConfirm`, `onEdit`, `open`
- Uses `evaluateFood` from `pes-engine.ts` for calculations

### File 4: `src/pages/CameraHome.tsx` (MODIFIED)

- Add state `showPESBreakdown` (boolean)
- In `saveMeal()`: instead of immediately saving, set `showPESBreakdown = true`
- Render `PESBreakdownModal` at bottom of component
- On modal confirm: run existing save logic (addMealToLog, toast, navigate)
- On modal edit: set `showPESBreakdown = false`, return to edit step

### File 5: `src/pages/Onboarding.tsx` (MODIFIED)

- Import `PESFeatureFlex`
- Add a new phase before `'welcome'`: `'featureFlex'`
- In the phase check at top of component: if `!localStorage.getItem('pes_flex_seen')`, start at `'featureFlex'` phase
- Render `PESFeatureFlex` when phase is `'featureFlex'`, on dismiss transition to `'welcome'`

### File 6: `src/pages/Dashboard.tsx` (MODIFIED)

- Import `PESExplanationCard`
- Add state `showPESExplanation` initialized from `!localStorage.getItem('pes_explanation_seen')`
- Render `PESExplanationCard` when `showPESExplanation && profile?.onboardingComplete`
- On dismiss: set state false

### Technical Notes

- All animations use framer-motion (already installed)
- PES thresholds use existing `getDynamicThreshold()` from `pes-engine.ts`
- The PES breakdown modal intercepts the save flow in CameraHome — the existing `saveMeal()` function body moves into the modal's confirm handler
- No new dependencies needed

