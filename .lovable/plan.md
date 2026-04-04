

# Gym Intelligence System — Missing Features Implementation

## Scope (Prioritized)

This is a large feature set. I'll implement the **High** and **Medium** priority items that have real user impact, while deferring Phase 2 items (wearables, progressive overload, social sharing) that require external APIs or major new surfaces.

### HIGH PRIORITY (implement now)

| # | Feature | Files |
|---|---------|-------|
| 2 | Actual gym time override in check-in | `GymCheckInCard.tsx` |
| 5 | Exact pre-workout eat timing with countdown | `PreWorkoutCard.tsx` |
| 6 | "I already ate" / "Skip" on pre/post cards | `PreWorkoutCard.tsx`, `PostWorkoutCard.tsx` |
| 7 | One-tap meal log from post-workout card | `PostWorkoutCard.tsx`, wire `addMealToLog` |
| 10 | Late/manual gym logging after window | `GymCheckInCard.tsx` |
| 12 | Fasted training toggle | `store.ts`, `EditProfileSheet.tsx`, `PreWorkoutCard.tsx` |
| 18 | Miss reason (injury/sick/tired/no time) | `GymCheckInCard.tsx`, `store.ts` DailyLog |

### MEDIUM PRIORITY (implement now)

| # | Feature | Files |
|---|---------|-------|
| 4 | Weekend vs weekday gym schedule | `store.ts`, `gym-service.ts`, `EditProfileSheet.tsx`, `Onboarding.tsx` |
| 8 | Energy correlation insights after 7 days | `gym-meal-engine.ts`, `EnergyTracker.tsx` |
| 9 | Sleep-aware intensity reduction | `GymCheckInCard.tsx`, `gym-meal-engine.ts` |
| 13 | Duration/intensity-scaled post-workout meals | `gym-meal-engine.ts` |
| 16 | Planned rest day marking | `gym-service.ts`, `store.ts` |

### DEFERRED (Phase 2)

| # | Feature | Reason |
|---|---------|--------|
| 1 | Multiple sessions/day | Adds significant complexity to data model; very few users need this |
| 3 | Rotating shift weekly template | Complex UI for edge case; manual override suffices |
| 11 | Wearable sync (Google Fit/Apple Health) | Requires native APIs, Capacitor plugins |
| 14 | Social sharing of streaks | Nice-to-have, not core |
| 15 | Actionable PDF insights | Can enhance existing PDF export later |
| 19 | Progressive overload logger | Full new feature surface |

---

## Data Model Changes

### `src/lib/store.ts` — UserProfile.gym
```
fastedTraining?: boolean;          // skip pre-workout suggestions
weekendSchedule?: string[];        // separate weekend gym days
weekendHour?: number;              // different hour on weekends
```

### `src/lib/store.ts` — DailyLog.gym
```
gym?: {
  attended: boolean;
  durationMinutes: number;
  caloriesBurned: number;
  intensity: string;
  actualHour?: number;             // override if different from scheduled
  missReason?: 'tired' | 'injury' | 'sick' | 'no_time' | 'rest_day' | 'other';
  restDayPlanned?: boolean;        // pre-marked rest day
};
```

---

## Implementation Details

### 1. GymCheckInCard — Actual Time Override + Miss Reason + Late Logging + Sleep-Aware
- When user taps "Yes", show expandable section with **time picker** (pre-filled with `specificHour`) and duration slider
- Store `actualHour` in `dailyLog.gym`
- When user taps "No", show a **reason picker** modal: Too tired / Injury / Sick / No time / Other
- Store `missReason` in `dailyLog.gym`; for Injury/Sick, show recovery tip
- Remove `shouldShowCheckIn` time gate — always show on gym days if not yet answered (fixes late logging)
- Add "Log manually" link that appears even after the card is dismissed
- If `sleepDuration < 6h`, change "Yes" button to "Yes, light session" which pre-selects light intensity

### 2. PreWorkoutCard — Countdown + Skip + Fasted Toggle
- Add countdown: "Eat this in X minutes" based on `specificHour - 30min - now`
- Add two buttons: [I already ate] and [Skip] — both dismiss the card
- If `profile.gym.fastedTraining === true`, skip rendering entirely
- Show exact recommended eat time: "Eat at 6:30 AM"

### 3. PostWorkoutCard — One-Tap Log + Skip
- [Log This Meal] button calls a helper that creates a `MealEntry` from the suggestion and saves to today's log via `saveDailyLog`
- Show toast: "Meal logged! +Xg protein"
- Add [I already ate] and [Skip] buttons

### 4. Weekend Schedule Support
- `gym-service.ts` `isGymDay()`: check day of week; if Saturday/Sunday and `weekendSchedule` exists, use that instead of `schedule`
- `getSpecificHour()` helper: returns `weekendHour` on weekends if set
- `EditProfileSheet.tsx`: add "Different schedule on weekends?" toggle with weekend day/hour pickers
- `Onboarding.tsx`: after gym schedule, ask "Same times on weekends?" — if No, collect weekend sessions

### 5. Duration/Intensity-Scaled Post-Workout Meals
- `gym-meal-engine.ts` `getPostWorkoutSuggestion()`: accept optional `actualDuration` and `actualIntensity`
- Scale factor: `(duration / 45) * intensityMultiplier` where light=0.8, moderate=1.0, intense=1.3
- Apply to calories and protein in suggestion

### 6. Fasted Training Toggle
- Add `fastedTraining` to `UserProfile.gym`
- Add toggle in `EditProfileSheet.tsx` Gym section
- `PreWorkoutCard` returns null when enabled

### 7. Planned Rest Day
- Add `restDays` storage: `scopedGet('gym_rest_days')` → array of date strings
- `isGymDay()` checks against rest days list
- Add "Mark as Rest Day" button in GymCheckInCard when card is shown (for tomorrow or today)
- On rest day, reduce base calories by 5% (clamped ≥1200)

### 8. Energy Correlation Insights
- After 7+ energy logs exist, compute average energy on gym days vs non-gym days
- If gym-day energy is consistently lower, show insight in `EnergyTracker`: "Your energy is 15% lower on workout days — try a bigger pre-workout meal"
- Simple moving average computation in `gym-meal-engine.ts`

### 9. Wire onboarding-store.ts
- Map new fields (`fastedTraining`, `weekendSchedule`, `weekendHour`) through `saveOnboardingData()`

---

## Files Summary

| File | Action |
|------|--------|
| `src/lib/store.ts` | Extend gym + DailyLog.gym types |
| `src/lib/gym-service.ts` | Weekend schedule support, rest day check, getSpecificHour helper |
| `src/lib/gym-meal-engine.ts` | Duration/intensity scaling, energy correlation, getExactEatTime |
| `src/components/GymCheckInCard.tsx` | Time override, miss reason, late logging, sleep-aware, rest day button |
| `src/components/PreWorkoutCard.tsx` | Countdown timer, skip/already ate, fasted check, exact eat time |
| `src/components/PostWorkoutCard.tsx` | One-tap log meal, skip/already ate |
| `src/components/EditProfileSheet.tsx` | Fasted toggle, weekend schedule, rest day |
| `src/components/EnergyTracker.tsx` | Energy correlation insight after 7 days |
| `src/lib/onboarding-store.ts` | Wire new gym fields |
| `src/pages/Onboarding.tsx` | Weekend schedule question |

No database migrations needed. All data in localStorage JSONB.

