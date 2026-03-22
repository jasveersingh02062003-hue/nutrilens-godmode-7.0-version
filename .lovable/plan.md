

# NutriLens AI – Editorial Welcome & Scanner-First Onboarding

## What We're Building

Replace the current tutorial slides + basic welcome step with two new high-end screens that demonstrate value immediately:

1. **WelcomeScreen** — Full-screen editorial hero with gradient overlay, glassmorphism insight card, large typography, and two CTAs ("Get Started" / "I already have an account")
2. **ScannerOnboardingScreen** — Interactive AI scanner demo that lets users upload or demo-scan a meal photo, see mock nutrition results, then proceed to the profile setup flow

After these two screens, the existing onboarding questions (name, gender, health, etc.) continue unchanged with the same design system.

---

## Files to Create

### 1. `src/components/onboarding/WelcomeScreen.tsx`

Full-screen editorial layout:
- **Background**: `hero-nutrition.jpg` covering full viewport with a dark gradient overlay (`from-black/70 via-black/40 to-transparent`)
- **Top-left**: Small "NutriLens" wordmark in white
- **Center-bottom area**: Large display heading "Your Food, Decoded by AI" + subtitle "Snap any meal. Get instant nutrition insights powered by AI."
- **Glassmorphism insight card**: A frosted-glass card showing a sample insight — "Average Indian thali: 650 kcal" with a small chart icon, demonstrating the app's intelligence
- **Two buttons**:
  - "Get Started" (primary, full-width, rounded-full) → calls `onGetStarted()`
  - "I already have an account" (ghost text link) → calls `onSignIn()`
- Use framer-motion for staggered fade-in of elements
- Props: `onGetStarted: () => void`, `onSignIn: () => void`

### 2. `src/components/onboarding/ScannerOnboardingScreen.tsx`

Clean card-based scanner demo:
- **Header**: Back arrow + "Try AI Scanner" title
- **Scanner card** (card-elevated): 
  - Image upload area with dashed border, camera icon, "Drop a meal photo or tap to upload" text
  - File input (accept images) — on upload, shows the image preview
  - "Try Demo Scan" button below — uses a hardcoded mock result
- **Loading state**: When scanning (2-second simulated delay), show a pulsing animation with "Analyzing your meal..." text
- **Results card**: After scan completes, show:
  - Meal name: "Paneer Butter Masala with Naan"
  - Calories: 580 kcal, Protein: 22g, Carbs: 48g, Fat: 32g
  - Confidence badge: 94%
  - Each macro as a colored pill
- **CTA**: "Continue to Set Up Profile" button (primary, full-width) → calls `onContinue()`
- Props: `onBack: () => void`, `onContinue: () => void`

---

## Files to Modify

### 3. `src/pages/Onboarding.tsx`

- Replace `'tutorial'` phase with `'welcome'` and `'scanner'` phases
- Update phase type: `'welcome' | 'scanner' | 'onboarding' | 'profileReview' | ...`
- Initial phase: `'welcome'` (instead of `'tutorial'`)
- Phase transitions:
  - `welcome` → "Get Started" → `'scanner'`
  - `welcome` → "I already have an account" → navigate to Auth page (`navigate('/auth')` or trigger sign-in)
  - `scanner` → "Continue" → `'onboarding'` (starts at step index 1, skipping the old 'welcome' step)
  - `scanner` → "Back" → `'welcome'`
- Remove the old `TutorialSlides` import and usage
- The existing `'welcome'` step inside `renderStep()` (the old in-flow welcome with hero image) should be skipped — start onboarding steps from `'name'` (step index 1)

### 4. `src/pages/Auth.tsx`

- No changes needed — the "I already have an account" flow from WelcomeScreen will navigate here via React Router

---

## Technical Notes

- Reuses existing `hero-nutrition.jpg` asset for the editorial background
- Mock scanner data is hardcoded (no API call) — matches existing analyze-food edge function response shape for future integration
- The glassmorphism card uses `backdrop-blur-xl bg-white/10 border border-white/20` styling
- All animations use framer-motion (already in project)
- The existing onboarding step array starts with `'welcome'` at index 0 — the new flow skips this and starts at `'name'` (index 1) when entering from the scanner
- No new dependencies needed

