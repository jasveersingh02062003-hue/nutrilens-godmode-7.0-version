

# Add Missing Gym Intelligence Features

## What's Already Done (No Changes Needed)
The following are **fully implemented** and working:
- Data model extensions (timeOfDay, specificHour, work/sleep, fastedTraining, weekendSchedule, missReason, actualHour)
- `gym-meal-engine.ts` with pre/post suggestions, countdown, duration/intensity scaling, energy correlation, sleep/work tips
- `PreWorkoutCard` with countdown timer, fasted training check, "Already ate" button
- `PostWorkoutCard` with one-tap meal logging, skip button, duration scaling
- `GymCheckInCard` with time override, miss reason picker, snooze, sleep-aware intensity
- `EnergyTracker` with 1-5 emoji rating and energy insight
- `EnergyTrendCard` in Progress page
- Rest day marking in `gym-service.ts`
- Weekend schedule support in `isGymDay()` and `getSpecificHourForDate()`

## What's Actually Missing (To Build Now)

### 1. Gym PDF Export (`src/components/GymPDFExport.tsx`)
**New component** — button in Progress tab that generates a downloadable PDF report.

Contents:
- Monthly attendance calendar (highlighted workout days)
- Consistency %, current/best streak, total workouts, total calories burned
- Energy trend (last 30 days) as a simple bar visualization
- Pre/post meal adherence summary
- Actionable insights: "You missed 3 workouts this month — most on Tuesdays" and "Energy is X% higher on workout days"

Uses `jsPDF` (already available as a dependency pattern in the codebase).

Add a "Download Gym Report" button to `src/pages/Progress.tsx` near the GymProgressSection.

### 2. Progressive Overload Tracker (`src/components/WorkoutLogger.tsx`)
**New component** — simple modal workout logger.

- Fields: Exercise name (with common presets like Bench Press, Squat, Deadlift, etc.), Sets, Reps, Weight (kg)
- Store in `dailyLog.gym.workouts` as `Array<{ exercise: string; sets: number; reps: number; weight: number }>`
- Extend `DailyLog.gym` type in `store.ts` to include `workouts` field
- Trigger from GymCheckInCard after logging "Yes" — "Log your lifts?" link
- Show strength progress chart in Progress tab (simple per-exercise line chart)

### 3. Share Gym Streak (`src/components/GymConsistencyCard.tsx`)
- Add a share button to the existing `GymConsistencyCard`
- Capture the card as an image using `html2canvas`
- Share via Web Share API (fallback: copy to clipboard)

### 4. Rest Day Toggle in Meal Planner
- In `src/pages/MealPlanner.tsx`, for future scheduled gym days, show a small "Rest Day" toggle
- Uses existing `markRestDay()` / `unmarkRestDay()` from `gym-service.ts`

---

## Files Summary

| File | Action |
|------|--------|
| `src/lib/store.ts` | Extend `DailyLog.gym` with `workouts` array type |
| `src/components/GymPDFExport.tsx` | **NEW** — PDF report generator |
| `src/components/WorkoutLogger.tsx` | **NEW** — exercise logger modal |
| `src/components/GymConsistencyCard.tsx` | Add share button |
| `src/pages/Progress.tsx` | Add PDF export button + strength chart |
| `src/pages/MealPlanner.tsx` | Add rest day toggle for future gym days |
| `src/components/GymCheckInCard.tsx` | Add "Log your lifts" link after check-in |

## Implementation Order
1. Extend data model for workouts
2. Build GymPDFExport + wire into Progress
3. Build WorkoutLogger + wire into GymCheckInCard and Progress
4. Add share to GymConsistencyCard
5. Add rest day toggle to MealPlanner

