

## Problem

The Progress page has **double animations** causing a jarring "slide up from bottom" effect, especially noticeable on mobile:

1. **PageTransition wrapper** (in App.tsx): slides content horizontally (`x: 12` → `x: 0`)
2. **Internal stagger animation** (in Progress.tsx): every section animates from below (`y: 16` → `y: 0`) with staggered delays

Together, these create a slow, distracting entrance — the entire page slides in from the right while each card also rises from below.

## Plan

### 1. Remove internal stagger animation from Progress.tsx

Replace the animated `motion.div` container and its child `motion.div` variants with plain `div` elements. This removes the "coming from bottom" effect entirely while keeping the lightweight horizontal page transition from `PageTransition`.

**Specific changes:**
- Line ~328: `motion.div` with `staggerChildren` → plain `div`
- Line ~334: `motion.div` with `y: 16` variant → plain `div`
- Line ~356: `motion.div` with `y: 10` → plain `div`
- Line ~529: Keep the bar chart height animation (it's a data visualization, not a page entrance)
- Line ~599: closing `motion.div` → `div`

This preserves the subtle horizontal `PageTransition` (which is consistent across all pages) while eliminating the redundant vertical slide-up that causes the "animation from bottom" issue on mobile.

### 2. No other files changed

The `PageTransition` component itself stays as-is — it provides a consistent, lightweight transition across all routes.

