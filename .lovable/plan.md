

# Dashboard & Home — Premium UI/UX Upgrade

## Current State

The dashboard uses basic CSS animations (`animate-fade-in`, `animate-slide-up` with tiny delays), static `card-elevated`/`card-subtle` classes, and a plain SVG calorie ring. Everything appears at once with near-identical timing. There are no glassmorphism effects, no staggered cascade, no breathing/glow animations, and the header is static text.

## What Changes

### 1. Dashboard Header — Animated Greeting with Time-of-Day Theming
**File: `src/components/dashboard/DashboardHeader.tsx`**

- Add a subtle gradient mesh background behind the header that shifts color based on time of day (warm sunrise tones for morning, bright midday, cool evening, deep night)
- Avatar initial gets a pulsing ring animation (like an online status indicator)
- Greeting text uses `motion.p` with a spring fade-in and slight y-translate
- Weather chip gets a glassmorphism treatment (`bg-white/10 backdrop-blur-md border-white/20`) and a subtle scale-in animation
- Bell notification dot gets a gentle pulse animation

### 2. Calorie Ring — Breathing Glow Effect
**File: `src/components/CalorieRing.tsx`**

- Add an animated SVG glow filter behind the progress arc that "breathes" (opacity pulses between 0.3 and 0.6)
- The ring itself animates in on mount with a spring-physics `strokeDashoffset` transition via Framer Motion
- Center number uses `motion.span` with a count-up animation from 0 to the actual remaining value
- Add a subtle radial gradient background inside the card
- Progress bar fills use Framer Motion `animate` instead of CSS transitions for spring feel

### 3. Macro Cards — Glassmorphism + Staggered Entrance
**File: `src/components/MacroCard.tsx`**

- Wrap in `motion.div` with staggered entrance (each card cascades in with 80ms delay)
- Add glassmorphism: `bg-white/60 dark:bg-white/5 backdrop-blur-sm border-white/30`
- Progress bar gets a shimmer animation overlay (a moving highlight sweep)
- Numbers animate up from 0 using a count-up effect
- Icon gets a subtle bounce on mount

### 4. Dashboard Layout — Staggered Card Cascade
**File: `src/pages/Dashboard.tsx`**

- Replace all `animate-fade-in` / `animate-slide-up` divs with `motion.div` using a stagger children pattern
- Each card section enters with `y: 20, opacity: 0` → `y: 0, opacity: 1` with increasing delay
- Use Framer Motion `staggerChildren: 0.06` on the parent container for automatic cascade
- Add a subtle ambient gradient background to the page (fixed, behind all cards)

### 5. Water Tracker — Liquid Fill Animation
**File: `src/components/WaterTrackerCompact.tsx`**

- Replace the flat progress bar with a small "water wave" SVG animation inside the container
- The wave level rises as cups increase
- Add button gets a ripple effect on tap via Framer Motion
- Glassmorphism card treatment matching MacroCard

### 6. Today's Meals Section — Micro-interactions
**File: `src/components/TodayMeals.tsx`**

- Each meal card uses `motion.div` with `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}`
- Meal emoji gets a subtle bounce animation on mount
- Logged meals get a green checkmark that scales in with a spring
- Unlogged meals have a subtle pulsing border to draw attention
- Staggered entrance for each meal row

### 7. Global Glass & Ambient Styles
**File: `src/index.css`**

- Add new utility classes: `.glass-card` (glassmorphism), `.glow-primary` (subtle glow shadow), `.animate-breathe` (pulsing opacity), `.animate-count-up` (number counter)
- Add ambient gradient keyframes for the dashboard background
- Add wave animation keyframes for water tracker

## File Summary

| File | Action |
|------|--------|
| `src/components/dashboard/DashboardHeader.tsx` | Edit — time-of-day gradient, avatar pulse, glassmorphism weather chip |
| `src/components/CalorieRing.tsx` | Edit — breathing glow SVG filter, spring ring animation, count-up number |
| `src/components/MacroCard.tsx` | Edit — glassmorphism, staggered motion, shimmer bar, count-up |
| `src/pages/Dashboard.tsx` | Edit — stagger children pattern, ambient background gradient |
| `src/components/WaterTrackerCompact.tsx` | Edit — wave animation, glassmorphism, ripple button |
| `src/components/TodayMeals.tsx` | Edit — hover/tap micro-interactions, staggered rows, pulse unlogged |
| `src/index.css` | Edit — new glass-card, glow, breathe, wave utility classes |

## Design Principles

- All animations use spring physics (stiffness 200-400, damping 20-35) not linear/ease
- Glassmorphism uses `backdrop-blur-md` with transparent white borders — works in both light and dark mode
- Stagger delays are 60-80ms per card for a natural cascade feel
- No animation exceeds 600ms total duration to keep the app feeling snappy
- Count-up animations use `useEffect` + `requestAnimationFrame` for smooth number transitions

