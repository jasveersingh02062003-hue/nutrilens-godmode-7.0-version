

## Fix Bottom Nav Button Alignment and Mobile-Friendly Buttons

### Problem
From the screenshots, the bottom navigation bar has alignment issues:
1. The active tab pill indicator (`layoutId="nav-pill"`) makes buttons visually uneven — the pill background stretches the entire button area causing inconsistent sizing
2. Tab items are not equally sized, so Home/Progress look compressed while Planner/Profile shift around when active
3. The center Camera button's `-mt-5` offset creates vertical misalignment with the label row of other tabs
4. The nav lacks `safe-area-inset-bottom` padding, so on phones with gesture bars, buttons sit too low

### Plan

#### 1. Fix BottomNav alignment (`src/components/BottomNav.tsx`)
- Give each non-center tab a fixed width (`w-16`) so all tabs occupy equal space regardless of active state
- Replace the `layoutId="nav-pill"` absolute pill with a simpler dot indicator below the icon — the full-area pill causes layout shift
- Remove `whileTap={{ rotate: -8 }}` which feels janky on mobile
- Add `pb-[env(safe-area-inset-bottom,0px)]` to the nav container for phones with gesture bars
- Ensure all labels are consistently positioned with `items-center` and fixed gap

#### 2. Ensure all app buttons have proper touch targets
- Audit the BottomNav tab buttons to have minimum 44px touch targets (current `px-3 py-1.5` is too small)
- The center Camera button is fine (56px circle)
- Non-center tabs: increase to `min-h-[48px]` with proper padding

### Files Changed
- `src/components/BottomNav.tsx` — primary fix for alignment, spacing, safe area, and touch targets

### Technical Details
- Root cause: `layoutId="nav-pill"` with `absolute inset-0` creates a framer-motion shared layout animation that shifts surrounding elements during transitions
- Fix: use a small dot/line indicator instead of a full pill, or constrain the pill within a fixed-size container
- Safe area: `pb-[env(safe-area-inset-bottom,0px)]` on the nav ensures buttons don't hide behind iPhone/Android gesture bars

