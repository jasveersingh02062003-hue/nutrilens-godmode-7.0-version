

# Full App UI/UX Premium Upgrade — 4 Areas

Since you want all four areas upgraded, here's a consolidated plan broken into phases. Each phase can be implemented sequentially.

---

## Phase 1: Bottom Nav + Page Transitions

### BottomNav.tsx — Morphing Pill Indicator
- Add a `motion.div` "pill" behind the active tab that uses `layoutId="nav-pill"` to smoothly slide between tabs
- Pill has glassmorphism styling: `bg-primary/10 backdrop-blur-sm rounded-xl`
- Icons get `whileTap={{ scale: 0.85, rotate: -8 }}` bounce animation
- Active icon animates with a subtle `y: -2` lift via spring
- Camera center button gets a rotating gradient border animation

### App.tsx — AnimatePresence Page Transitions
- Wrap `<Routes>` content with `AnimatePresence mode="wait"`
- Create a `PageTransition` wrapper component using `motion.div` with slide + fade variants
- Entry: `opacity: 0, x: 20` → `opacity: 1, x: 0` (spring, 300ms feel)
- Exit: `opacity: 0, x: -20`

| File | Action |
|------|--------|
| `src/components/BottomNav.tsx` | Edit — morphing pill, icon bounce, spring lift |
| `src/App.tsx` | Edit — AnimatePresence wrapper, PageTransition component |

---

## Phase 2: Camera & Scanner

### CameraHome.tsx — Futuristic Scan Overlay
- **Scan frame**: Add animated corner brackets (4 `motion.div` L-shaped corners) that pulse and glow on the camera view
- **Scan line**: Horizontal `motion.div` that sweeps top-to-bottom continuously with primary color glow
- **Analyzing state**: Replace basic Loader2 spinner with a futuristic circular scan animation — rotating dashed circle + pulsing center dot + floating particle dots
- **Detection success**: Particle burst animation (8-12 small circles exploding outward from center with spring physics, then fade)
- **Nutrient labels**: On the confirm step, each detected item enters with `x: 30, opacity: 0` staggered, with a glassmorphism card style
- **Remaining calories chip**: Gets a breathing glow when calories are low (<300)

| File | Action |
|------|--------|
| `src/pages/CameraHome.tsx` | Edit — scan corners, scan line, particle burst, futuristic analyzer, glassmorphism confirm cards |

---

## Phase 3: Progress Page

### Progress.tsx — Animated Stats & Calendar
- **Header**: Staggered entrance with `motion.div` cascade
- **Overview stats cards**: Each number uses a count-up animation (0 → actual value) with `useEffect` + `requestAnimationFrame`
- **Calendar**: Each day cell enters with micro-stagger (2ms per cell). Today's cell gets a breathing ring. Balanced/surplus/deficit dots pulse once on mount
- **Weekly overview bars**: Bars animate height from 0 with staggered spring, each bar 40ms after the previous
- **Achievement badges**: Unlocked badges get a subtle shimmer overlay. Grid uses stagger entrance
- **Weight chart section**: Wrap in `motion.div` with scale-in entrance
- **Consistency card**: Numbers count up from 0

| File | Action |
|------|--------|
| `src/pages/Progress.tsx` | Edit — count-up stats, staggered calendar cells, animated bars, achievement shimmer |
| `src/components/OverviewStats.tsx` | Edit — count-up numbers, glassmorphism cards, staggered entrance |
| `src/components/ConsistencyCard.tsx` | Edit — count-up streak number, glassmorphism |

---

## Phase 4: Meal Planner

### MealPlanner.tsx — Premium Planner Feel
- **Generating screen**: Replace basic ChefHat spinner with a multi-ring orbital animation (3 concentric rotating rings with recipe icons orbiting). Progress steps get check marks that spring in
- **Tab bar** (MealPlannerTabs): Active tab gets a sliding underline indicator using `layoutId`
- **Preview meal cards**: Each day section enters with stagger. Meal cards get `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}`. Recipe images get a subtle ken-burns (slow zoom + pan via CSS animation)
- **Empty state**: ChefHat icon gets a floating animation. Feature list items stagger in
- **Success modal**: Checkmark draws in with SVG path animation. Background particles burst

| File | Action |
|------|--------|
| `src/pages/MealPlanner.tsx` | Edit — orbital generating screen, staggered preview, ken-burns images, animated success |
| `src/components/MealPlannerTabs.tsx` | Edit — sliding underline indicator with layoutId |
| `src/components/MealPlanDashboard.tsx` | Edit — meal card micro-interactions, glassmorphism |

---

## Global Additions (index.css)

New utility classes and keyframes:
- `.animate-ken-burns` — slow 15s zoom + pan for recipe images
- `.scan-line` — sweeping scan line gradient
- `.particle-burst` — radial particle explosion
- Updated `.glass-card` refinements

---

## Design Principles (all phases)

- Spring physics everywhere: stiffness 200-400, damping 20-35
- Stagger children: 40-80ms per item
- No animation exceeds 600ms perceived duration
- All glassmorphism works in both light and dark mode
- Count-up uses `requestAnimationFrame` for 60fps smoothness
- `layoutId` for shared element transitions (nav pill, tab indicators)

## File Summary

| File | Phase | Action |
|------|-------|--------|
| `src/components/BottomNav.tsx` | 1 | Morphing pill, icon bounce |
| `src/App.tsx` | 1 | AnimatePresence page transitions |
| `src/pages/CameraHome.tsx` | 2 | Scan overlay, particle burst, futuristic analyzer |
| `src/pages/Progress.tsx` | 3 | Count-up stats, staggered calendar, animated bars |
| `src/components/OverviewStats.tsx` | 3 | Count-up numbers, glassmorphism |
| `src/components/ConsistencyCard.tsx` | 3 | Count-up streak, glassmorphism |
| `src/pages/MealPlanner.tsx` | 4 | Orbital loader, staggered preview, ken-burns |
| `src/components/MealPlannerTabs.tsx` | 4 | Sliding tab indicator |
| `src/components/MealPlanDashboard.tsx` | 4 | Meal card micro-interactions |
| `src/index.css` | All | New keyframes and utility classes |

