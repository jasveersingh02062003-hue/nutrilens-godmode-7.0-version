

# Plan: Add 10 Critical Retention & Results Features

This is a large feature set. The plan creates 7 new library modules and 4 new UI components, plus integrates everything into the existing Dashboard and Progress pages.

## Architecture Overview

All features use localStorage for state (consistent with existing patterns). New lib modules handle logic; UI is surfaced via toast, modals, and cards on existing pages.

```text
New Lib Modules              New UI Components
─────────────────            ──────────────────
protein-rescue.ts            ProteinRescueCard.tsx
hard-boundary.ts             WeeklyWeightCheckIn.tsx
weekly-weight-checkin.ts     RepeatMealsButton.tsx
plateau-handler.ts           IdentityBadgesCard.tsx
identity-badges.ts
drop-off-defense.ts
budget-impact.ts
```

## Feature Breakdown

### 1. Protein Guarantee System
- **New file**: `src/lib/protein-rescue.ts`
  - `checkProteinRescue(profile, totals)`: returns rescue options if hour >= 18 and remaining protein > 40g
  - Two hardcoded high-protein Indian options under ₹40 (eggs+curd, soya snack)
  - Cooldown via `localStorage` key `protein_rescue_dismissed_at`
- **New component**: `src/components/ProteinRescueCard.tsx`
  - Persistent card (not just toast) with "Add to Dinner" buttons
  - On click: creates a MealEntry and adds via `addMealToLog`
- **Integration**: Add to Dashboard below the Protein Priority Card, conditionally rendered

### 2. Hard Boundary Layer
- **New file**: `src/lib/hard-boundary.ts`
  - `checkWeeklySurplus()`: sums last 7 daily balances from calorie-correction engine
  - If surplus > 1000 kcal, returns alert data
  - `applyHardReset(profile)`: reduces next day target by 15%, stores in localStorage
- **Integration**: Dashboard `useEffect` on load — show a Dialog modal with "Reset Plan" button

### 3. Weekly Weight Check-In
- **New file**: `src/lib/weekly-weight-checkin.ts`
  - `shouldPromptWeightCheckin()`: true if Sunday and no check-in this week
  - `computeWeightFeedback(newWeight, lastWeight, weeklyDeficit)`: returns expected vs actual + message
- **New component**: `src/components/WeeklyWeightCheckIn.tsx`
  - Modal with weight input, shows feedback after submission
  - Stores via existing `addWeightEntry` from weight-history.ts
- **Integration**: Dashboard renders modal conditionally on load

### 4. Plateau Handling
- **New file**: `src/lib/plateau-handler.ts`
  - `detectPlateau()`: checks weight entries for <0.2kg change over 10+ days
  - `applyPlateauAdjustment(profile)`: reduces calories by 5-8%, preserves protein target
  - Stores adjustment record in `nutrilens_plateau_adjustments`
- **Integration**: Called inside weekly weight check-in after weight submission; shows toast explanation

### 5. PES Reinforcement
- **No new file** — add logic directly in `src/components/SwapSimulatorSheet.tsx`
- After a swap is applied, compute `newPES / oldPES` ratio
- If ratio > 1.5, show `toast.success("Nice choice 👏 You picked a Xx better protein value meal")`

### 6. Identity Shift Badges
- **New file**: `src/lib/identity-badges.ts`
  - Badge definitions: "Protein Pro" (7-day protein ≥90%), "Budget Master" (month spend ≤90%), "Consistency King" (14-day streak), "Hydration Hero" (7-day water goal)
  - `checkIdentityBadges()`: evaluates and stores earned badges in `nutrilens_identity_badges`
- **New component**: `src/components/IdentityBadgesCard.tsx`
  - Shows earned badges with celebratory modal on first unlock
- **Integration**: Progress page — new card section

### 7. Cumulative Budget Impact
- **New file**: `src/lib/budget-impact.ts`
  - `getMonthlySavings()`: totalBudget - totalSpent for current month
  - `savingsToEquivalents(amount)`: converts to eggs (₹7), chicken kg (₹200), etc.
- **Integration**: Progress page — new "Monthly Savings" card below BudgetInsightsCard

### 8. Drop-Off Defense
- **New file**: `src/lib/drop-off-defense.ts`
  - `checkDropOff()`: compares today vs last logged date; if gap ≥ 3 days returns re-engagement data
  - `markRestart()`: resets the flag
- **Integration**: Dashboard `useEffect` — show Dialog modal with "Welcome back" message and "Restart" button

### 9. Repeat Yesterday's Meals
- **New component**: `src/components/RepeatMealsButton.tsx`
  - Button that copies yesterday's meals to today
  - Uses `getDailyLog(yesterdayKey)` and `addMealToLog` for each meal
  - Only shows if yesterday had ≥1 meal and today has 0 meals
- **Integration**: Dashboard, above Today's Meals section

### 10. Proactive Notifications
- **Extend** `src/lib/notifications.ts`
  - Add `startProactiveChecks(profile)`: sets intervals for:
    - 1 PM: generic high-protein lunch suggestion (toast or browser notification)
    - 6 PM: protein remaining check (reuses protein-rescue logic)
    - Saturday 9 AM: weekend risk toast
  - Uses existing `hasBrowserPermission()` and Notification API
- **Integration**: Called in `AppLayout` useEffect alongside existing notification scheduler

## Implementation Order

1. Create all 7 lib modules (independent, parallelizable)
2. Create 4 new UI components
3. Integrate into Dashboard.tsx (features 1, 2, 3, 8, 9)
4. Integrate into Progress.tsx (features 6, 7)
5. Extend SwapSimulatorSheet (feature 5)
6. Extend notifications.ts (feature 10)
7. Wire plateau handler into weekly check-in (feature 4)

## Data Storage (all localStorage)

| Key | Purpose |
|-----|---------|
| `nutrilens_protein_rescue_dismissed` | Cooldown timestamp |
| `nutrilens_hard_boundary_log` | Array of reset events |
| `nutrilens_weekly_checkin_last` | Last check-in week |
| `nutrilens_plateau_adjustments` | Plateau adjustment records |
| `nutrilens_identity_badges` | Earned identity badges |
| `nutrilens_last_log_date` | For drop-off detection |
| `nutrilens_proactive_notif_last` | Last notification timestamps |

