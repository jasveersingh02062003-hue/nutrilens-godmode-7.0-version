

# Performance Diagnosis & Fix Plan

## Root Causes Identified

### 1. Blank Screen (Critical Bug)
The "Failed to fetch dynamically imported module" errors for Dashboard.tsx and Profile.tsx are causing a **white screen**. This is a Vite HMR cache mismatch — the browser has a stale module URL with an old timestamp query param. The `lazyWithRetry` mechanism should handle this, but may be stuck in a reload loop or the retry is not firing correctly.

### 2. Render-Blocking Font Loads (High Impact)
`index.css` lines 1-3 import **three Google Font families** via `@import url(...)` — this blocks the entire CSS parse and first paint:
- Plus Jakarta Sans (8 weights)
- Playfair Display (5 weights)
- JetBrains Mono (4 weights)

Each is a separate network round-trip before any content renders. This alone can add 500ms-2s to initial load.

### 3. Dashboard Imports 52 Components Eagerly
`Dashboard.tsx` has **52 import statements** — all loaded synchronously when the dashboard chunk loads. Many of these cards (GymCheckInCard, SkinHealthCard, WeatherNudgeCard, etc.) are conditionally rendered but always bundled.

### 4. Continuous CSS Animations on Every Page
The `ambient-mesh` div runs `animate-ambient` (8s infinite) with `blur-3xl` on multiple elements — `backdrop-blur` and `filter: blur()` are GPU-expensive, especially on mobile. These run on **every page** since they're in AppLayout.

### 5. Framer Motion Overhead
Every route is wrapped in `PageTransition` with spring animations. Combined with stagger animations inside Dashboard (60ms per child across ~20 cards), this creates a cascade of layout recalculations on every navigation.

---

## Fix Plan

### Fix A: Resolve Blank Screen
**File: `src/App.tsx`**
- The current `lazyWithRetry` clears all caches and reloads on import failure. If this happens during HMR, it creates a reload loop. Add a **max retry counter** (max 2) using sessionStorage to prevent infinite reload loops.
- Add a fallback error UI in the `Suspense` boundary so users see a "Tap to reload" button instead of a white screen.

### Fix B: Switch Fonts to `<link>` with `display=swap`
**File: `index.html`**
- Move all three Google Font `@import` statements from `index.css` to `<link rel="preconnect">` + `<link rel="stylesheet">` tags in `index.html` with `&display=swap`.
- This makes fonts non-render-blocking — content appears immediately with fallback fonts, then swaps.

**File: `src/index.css`**
- Remove the three `@import url(...)` lines (lines 1-3).

### Fix C: Reduce Dashboard Bundle Size
**File: `src/pages/Dashboard.tsx`**
- Wrap conditionally-rendered heavy cards in `lazy()` imports:
  - GymCheckInCard, GymConsistencyCard, GymUpsellCard (only for gym users)
  - SkinHealthCard (only for skin concern users)
  - WeatherNudgeCard (only when weather data exists)
  - PostWorkoutCard, PreWorkoutCard (only on workout days)
- This can cut the dashboard chunk by ~30-40%.

### Fix D: Reduce Ambient Animation Cost
**File: `src/App.tsx`**
- Add `will-change: opacity, transform` to ambient mesh divs (they likely already have this via Tailwind but verify).
- Reduce `blur-3xl` (72px blur) to `blur-2xl` (40px) — visually similar, half the GPU cost.
- Consider using CSS `content-visibility: auto` on off-screen dashboard cards.

**File: `src/index.css`**
- Change `animate-ambient` duration from 8s to 15s — slower animation = fewer repaints.

### Fix E: Optimize PageTransition
**File: `src/components/PageTransition.tsx`**
- Add `layout={false}` to prevent layout recalculations.
- Reduce spring stiffness from 300 to 200 for lighter animation.
- Use `willChange="opacity, transform"` on the motion.div.

---

## File Summary

| File | Action |
|------|--------|
| `src/App.tsx` | Fix retry loop, add error fallback UI |
| `index.html` | Add font `<link>` tags with preconnect |
| `src/index.css` | Remove `@import` fonts, slow ambient animation |
| `src/pages/Dashboard.tsx` | Lazy-load conditional cards |
| `src/components/PageTransition.tsx` | Add willChange, reduce spring cost |

## Expected Impact
- **First paint**: ~1-2s faster (font blocking removal)
- **Dashboard load**: ~30-40% smaller chunk (lazy conditional cards)
- **Runtime smoothness**: Reduced GPU load from blur/animation simplification
- **No more white screens**: Retry loop fix + error fallback UI

