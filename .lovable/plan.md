

# Plan: Event-Driven Metabolic Protocol Enhancements

## Summary
The core event-based plan system is already fully implemented (4-step onboarding, boosters, activity tracker, post-event feedback, reverse diet, meal filters). This plan adds the **missing enhancements** from the research document that don't exist yet.

## What's Already Built (No Changes Needed)
- 4-step questionnaire (Event → Goal → Constraints → Extras → Summary)
- `calculateEventTargets()` with tummy/shape/gain/lose logic
- BoostersChecklist (morning routine, metabolism drinks, superfoods, evening routine)
- ActivityTracker (step goals by exercise level)
- PostEventFeedbackModal (resume/update/extend)
- Meal suggestion filters (cooking time, budget, tummy anti-bloat)
- Reverse diet service (3-week graduated return)
- Dashboard integration (banners, boosters, activity, post-event check)

## New Enhancements to Build

### 1. Motivation Question in Onboarding (Step 0.5)
**File:** `src/components/EventPlanConfigSheet.tsx`
- Add a "Why does this matter to you?" question after Event step (or merge into Step 0)
- Options: "Look my best" / "Feel confident" / "Health milestone" / "Impress someone" / custom text
- Store as `motivation` field in `EventPlanSettings`
- Use in Dashboard banner for personalized messaging (e.g., "15 days to feel confident at your wedding!")

**File:** `src/lib/event-plan-service.ts`
- Add `motivation?: string` to `EventPlanSettings`

### 2. Micro-Workout Checklist in ActivityTracker
**File:** `src/components/ActivityTracker.tsx`
- Below the step counter, add a collapsible "Micro-Workouts" section with daily exercises:
  - Lower Body: Air Squats / Lunges (2-3 min)
  - Upper Body: Wall Push-ups (3 min)
  - Core: Plank / Side Plank (3 min)
  - Posterior Chain: Glute Bridge (1 min)
- Checkable items stored in `nutrilens_microworkout_YYYY-MM-DD`
- Only show when `exerciseTime !== 'none'`
- Show weekly progression tip (e.g., "Week 2: Add 5 reps per set")

### 3. "Tummy In" Education Card
**File:** `src/components/TummyInsightCard.tsx` (new)
- Shown on Dashboard when `goalType === 'tummy'`
- Explains the dual strategy: bloating reduction vs visceral fat
- "Hard belly = visceral fat" vs "Fluctuating belly = bloating"
- Tips rotate daily: fiber intake, sodium management, post-meal walks, FODMAP awareness
- Dismissible per day

### 4. Enhanced Boosters: Spirulina & Shilajit
**File:** `src/components/BoostersChecklist.tsx`
- Add two new booster categories to `ALL_BOOSTERS`:
  - `supplements`: Spirulina (1 tsp in smoothie), Shilajit (purified, with warm water)
  - `post_meal`: 10-min post-meal walk, 5-min deep breathing
**File:** `src/components/EventPlanConfigSheet.tsx`
- Add these to `BOOSTER_OPTIONS` so users can opt in during setup

### 5. "Locked Time" Commitment Card
**File:** `src/components/ActivePlanBanner.tsx`
- When event plan is active, enhance the banner to show:
  - Event emoji + countdown: "🎯 15 days until your Wedding"
  - Motivational line from stored motivation
  - A "commitment seal" visual (locked icon + "Time Locked" badge)
  - Tap to expand: daily calorie target, protein target, today's deficit

### 6. Post-Meal Walking Nudge
**File:** `src/lib/coach.ts` or `src/lib/notifications.ts`
- After a meal is logged during an active event plan, show a toast: "Great meal! A 10-min walk now will stabilize blood sugar 🚶"
- Only triggers for lunch and dinner logs
- Respects notification preferences

## Implementation Order
1. Motivation field + onboarding question
2. Micro-workout checklist in ActivityTracker
3. TummyInsightCard component
4. Enhanced booster options (spirulina, shilajit, post-meal walk)
5. Locked Time commitment card in ActivePlanBanner
6. Post-meal walking nudge

## Files Summary
| File | Action |
|------|--------|
| `src/lib/event-plan-service.ts` | Modify — add `motivation` to EventPlanSettings |
| `src/components/EventPlanConfigSheet.tsx` | Modify — add motivation question + new booster options |
| `src/components/ActivityTracker.tsx` | Modify — add micro-workout checklist section |
| `src/components/TummyInsightCard.tsx` | Create — education card for tummy goal |
| `src/components/BoostersChecklist.tsx` | Modify — add supplements and post-meal categories |
| `src/components/ActivePlanBanner.tsx` | Modify — enhanced countdown + commitment seal |
| `src/pages/Dashboard.tsx` | Modify — render TummyInsightCard + post-meal nudge |

