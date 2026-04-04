

## Problem

The `DayDetailsSheet` popup uses a heavy spring animation (`y: '100%'` → `y: 0`) that slides the entire sheet from the very bottom of the screen. On mobile, this feels sluggish and requires the user to wait for the animation to complete. Combined with the spring physics (`stiffness: 200, damping: 25`), it creates a bouncy, slow entrance.

## Fix

### Change DayDetailsSheet animation to a fast, subtle entrance

**File: `src/components/DayDetailsSheet.tsx`** (lines 121-133)

Replace the current heavy spring slide-up with a quick fade + short slide:

- **Backdrop**: Keep `opacity: 0 → 1` (fast, 150ms)
- **Sheet panel**: Change from `y: '100%'` (full slide from bottom) to `y: '8%'` (short 8% nudge) + `opacity: 0 → 1`
- **Transition**: Replace spring physics with a simple `ease-out` tween, duration `0.2s`
- **Exit**: Same but reversed — quick fade out + slight downward slide

This makes the sheet appear almost instantly with just a subtle upward motion, matching how iOS/Android native bottom sheets feel.

No other files changed.

