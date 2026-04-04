

## Fix All Remaining Mobile Popups and Onboarding Animations

### Problem
Several popups and overlays still render inside the `PageTransition` wrapper (which uses CSS transforms), causing `fixed` positioning to break on mobile. The user sees popups appearing far below the viewport, requiring scroll to reach them. The onboarding flow also has animation issues.

### Current State
Already fixed with portal + scroll lock: `DayDetailsSheet`, `EditProfileSheet`, `DashboardPanel`, `SupplementLogSheet`, `SupplementEditModal`, `PESExplanationCard`, `PESBreakdownModal`, `WeightLogSheet`, `PostOnboardingTutorial`, `SplashScreen`, `PESFeatureFlex`, `MonikaChatScreen`.

The shared `dialog.tsx`, `sheet.tsx`, `alert-dialog.tsx` already have faster transitions.

### Remaining Files That Need Portal + Scroll Lock

**Custom overlay components (no portal yet):**

1. **`src/components/FullScreenMemory.tsx`** — full-screen photo viewer rendered inline. Wrap in `createPortal` + add `useBodyScrollLock`.

2. **`src/components/WeeklyWeightTimeline.tsx`** — detail modal for weight entry photos. Wrap the `fixed inset-0` modal in `createPortal`.

3. **`src/components/onboarding/MealBreakdownScreen.tsx`** — "Edit Meal Split" bottom sheet inside onboarding. Wrap in `createPortal` + scroll lock.

4. **`src/components/ProgressPhotosSection.tsx`** — capture sheet and photo viewer overlays. Wrap both in `createPortal`.

5. **`src/components/PlansPage.tsx`** — plan promo confirmation modal. Wrap in `createPortal`.

6. **`src/components/CostSuggestionBanner.tsx`** — swap confirmation modal. Wrap in `createPortal`.

7. **`src/pages/MealPlanner.tsx`** — success confirmation overlay. Wrap in `createPortal`.

8. **`src/components/CelebrationBurst.tsx`** and **`src/components/ConfettiCelebration.tsx`** — decorative particle effects. Wrap in `createPortal` (no scroll lock needed, they're pointer-events-none).

**Components using shared Sheet/Dialog (already fixed via shared primitives):**
- `GymSettingsPage.tsx` uses `<Sheet>` which is already improved.
- Other Sheet/Dialog users inherit the updated transitions.

### Onboarding Animation Verification
The onboarding page variants are already using the fast `0.22s easeOut` tween (line 27-29). The `SplashScreen`, `PESFeatureFlex`, and `CalculatingScreen` are already portaled or full-screen without transform issues. No additional onboarding changes needed — the current code is correct.

### Pattern for Each Fix
Each file gets:
- `import { createPortal } from 'react-dom'`
- `import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'` (for interactive overlays)
- Wrap the `fixed inset-0` JSX in `createPortal(..., document.body)`
- Use the standardized `mobileSheetMotion` / `mobileOverlayMotion` where applicable
- Add `max-h-[92dvh]`, `overscroll-contain` for scrollable sheets

### Files Changed
1. `src/components/FullScreenMemory.tsx`
2. `src/components/WeeklyWeightTimeline.tsx`
3. `src/components/onboarding/MealBreakdownScreen.tsx`
4. `src/components/ProgressPhotosSection.tsx`
5. `src/components/PlansPage.tsx`
6. `src/components/CostSuggestionBanner.tsx`
7. `src/pages/MealPlanner.tsx`
8. `src/components/CelebrationBurst.tsx`
9. `src/components/ConfettiCelebration.tsx`

