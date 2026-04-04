

# Next-Phase UI/UX Upgrade — Remaining Areas

## What's Already Done
- Dashboard: glassmorphism, staggered cascade, breathing calorie ring, time-of-day header
- Bottom Nav: morphing pill indicator, icon bounce
- Camera: futuristic scan overlay, particle burst, floating nutrients
- Progress: count-up stats, staggered calendar, animated bars
- Meal Planner: orbital loader, ken-burns images, sliding tab indicator
- `PageTransition.tsx` component created but **not wired** into `App.tsx`

## What Remains (from your research)

### Phase A: Wire Page Transitions + Global Polish
**Files: `src/App.tsx`, `src/index.css`**

- Wrap each `<Route>` element content with `<PageTransition>` for slide+fade between pages
- Add ambient gradient mesh background (fixed, behind all content) using 2-3 soft radial gradients with slow `ambient-shift` animation
- Dark mode polish: ensure all glassmorphism cards use deep navy tones (not pure black), add rim highlights (0.5px top/left border with `white/5`)
- Add global skeleton shimmer utility class for loading states

### Phase B: Onboarding Flow Premium
**Files: `src/pages/Onboarding.tsx`, `src/components/onboarding/WelcomeScreen.tsx`, `src/components/onboarding/CalculatingScreen.tsx`, `src/components/onboarding/CompletionScreen.tsx`**

- **Progress bar**: Replace solid bar with liquid wave fill effect (SVG wave inside the progress track)
- **Input sliders** (weight, height, age): Add spring-physics feel with `useSpring` — overshoot on release
- **Option/Chip selection**: Scale-in with spring + subtle haptic-feel bounce on select
- **CalculatingScreen**: Multi-ring orbital animation (matching meal planner style) instead of plain spinner
- **CompletionScreen**: Particle confetti burst + badge fly-in animation on completion
- **WelcomeScreen**: Parallax depth — background elements move slower than foreground on scroll/swipe

### Phase C: Logging Flow — Celebrations & Micro-interactions
**Files: `src/pages/LogFood.tsx`, `src/components/AddFoodSheet.tsx`, `src/components/QuickLogSheet.tsx`**

- **Success state**: When meal is logged, "Log" button morphs into a checkmark with spring animation, then triggers a particle confetti burst
- **Food item cards**: `whileHover={{ scale: 1.02 }}`, `whileTap={{ scale: 0.97 }}` with spring physics
- **Quantity adjusters** (+/- buttons): Bounce on tap, number rolls up/down with count animation
- **Search results**: Staggered entrance (each result slides in with 50ms delay)
- **Streak indicator**: If user has a logging streak, show animated flame icon with breathing glow

### Phase D: Profile Page Polish
**Files: `src/pages/Profile.tsx`**

- **Profile avatar**: Glassmorphism card with breathing ring animation (like dashboard header)
- **Settings rows**: Staggered cascade entrance, `whileTap={{ scale: 0.98 }}` micro-interaction
- **Plan/subscription badge**: Shimmer highlight sweep animation
- **Section headers**: Fade-in with slight y-translate on mount

### Phase E: Shared Celebration System
**New file: `src/components/CelebrationBurst.tsx`**

- Reusable confetti/particle burst component using `canvas-confetti` or pure Framer Motion
- Triggers: meal logged, streak milestone, badge earned, onboarding complete, plan generated
- Configurable: intensity (light sparkle vs full confetti), color palette, duration
- Integrated via a global context or simple function call

## File Summary

| File | Action |
|------|--------|
| `src/App.tsx` | Edit — wrap routes with PageTransition |
| `src/index.css` | Edit — ambient mesh bg, skeleton shimmer, dark mode rim highlights |
| `src/pages/Onboarding.tsx` | Edit — liquid progress, spring sliders, enhanced animations |
| `src/components/onboarding/WelcomeScreen.tsx` | Edit — parallax depth effect |
| `src/components/onboarding/CalculatingScreen.tsx` | Edit — orbital animation |
| `src/components/onboarding/CompletionScreen.tsx` | Edit — confetti + badge fly-in |
| `src/pages/LogFood.tsx` | Edit — button morph, staggered search, celebrations |
| `src/pages/Profile.tsx` | Edit — glassmorphism avatar, staggered settings, shimmer badge |
| `src/components/CelebrationBurst.tsx` | Create — reusable confetti/particle component |

## Design Principles
- Spring physics (stiffness 200-400, damping 20-35) for all motion
- Glassmorphism with `backdrop-blur-md` + transparent white borders in both themes
- Stagger delays 50-80ms per element
- No animation >600ms perceived duration
- Celebration system is lightweight — no heavy canvas unless user triggers it

