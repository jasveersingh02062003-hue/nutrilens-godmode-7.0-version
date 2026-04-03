

# Gym Attendance Tracking & Dynamic Calorie Adjustment

## Overview
Add gym tracking across onboarding, dashboard, calorie engine, and progress. 5 new files, 8 modified files. No database migration — data stored in existing JSONB columns.

---

## Step 1: Extend Data Models

**`src/lib/store.ts`** — Add to `UserProfile` interface (after line 59):
```typescript
gym?: {
  goer: boolean;
  daysPerWeek: number;
  durationMinutes: number;
  intensity: 'light' | 'moderate' | 'intense';
  goal: 'fat_loss' | 'muscle_gain' | 'general';
  schedule: string[];
  stats: { totalWorkouts: number; totalCaloriesBurned: number; currentStreak: number; bestStreak: number; consistencyPercent: number; };
};
```

Add to `DailyLog` interface (after line 173):
```typescript
gym?: { attended: boolean; durationMinutes: number; caloriesBurned: number; intensity: string; };
```

**`src/lib/onboarding-store.ts`** — Add `gym?` fields to `OnboardingData.activity` and wire gym data into the profile in `saveOnboardingData()`.

**`src/lib/profile-mapper.ts`** — Map `gym` through existing `conditions` JSONB in both `profileToDbRow` and `dbRowToProfile`.

---

## Step 2: Onboarding Gym Questions

**`src/pages/Onboarding.tsx`**

- Add 5 fields to `FormState`: `gymGoer` (boolean), `gymDays` (number), `gymDuration` (number), `gymIntensity` (string), `gymGoal` (string)
- Insert new step after step 10 (Exercise) with 5 sub-questions:
  1. "Do you go to the gym regularly?" — Yes/No
  2. Days/week slider (1-7, shown only if Yes)
  3. Duration picker (30/45/60+ min)
  4. Intensity (Light/Moderate/Intense)
  5. Gym goal (Fat loss/Muscle gain/General)
- Update step map comments (renumber steps 11+ accordingly), `getVisibleSteps()` to skip gym sub-questions if No, `canContinue()` for new steps
- Auto-infer schedule from `daysPerWeek` (e.g., 3 → Mon/Wed/Fri)
- Wire gym data into `handleFinish()` → `OnboardingData.activity`

---

## Step 3: Create Gym Service

**New file: `src/lib/gym-service.ts`**

Pure logic functions:
- `isGymDay(profile, date)` — day-of-week match against schedule
- `getGymCheckInStatus(date)` — read dailyLog.gym
- `saveGymCheckIn(date, attended, duration?, intensity?)` — write to daily log + update profile stats
- `estimateCaloriesBurned(weightKg, duration, intensity)` — `duration × MET × (weightKg/60)`, MET: light=4, moderate=6, intense=8
- `getWeeklyConsistency(profile, date)` — actual/planned for last 7 days
- `getGymBonus(profile, consistency, isGymDay)` — `duration × factor × 0.6`, scaled by consistency tier
- `getGymStats(allLogs)` / `updateGymStats(profile)` — totals, streaks, consistency
- `inferSchedule(daysPerWeek)` — returns default day names array

---

## Step 4: UI Components (4 new files)

**`src/components/GymCheckInCard.tsx`**
- Non-intrusive card on gym days if not checked in
- "Did you work out today? 🏋️" with Yes/No buttons
- Yes → expand: duration slider, intensity picker, live calorie estimate
- Saves via `saveGymCheckIn()`, shows "Logged ✓" after

**`src/components/GymConsistencyCard.tsx`**
- Below CalorieRing for gym-goers only
- "This week: X/Y workouts" with mini progress ring, streak with 🔥, consistency % color-coded (green/amber/red)
- "Log workout" button, wrapped in `React.memo`

**`src/components/GymUpsellCard.tsx`**
- Conditional: gym-goer + ≥5 sessions in 30 days + streak ≥3
- "Unlock Your Gym Diet Plan 💪" with features, upgrade button → Plans tab

**`src/components/GymProgressSection.tsx`**
- For Progress tab, gym-goers only
- Monthly calendar with green dots on workout days
- Weekly consistency bars (last 12 weeks)
- Lifetime stats: total workouts, calories burned, best streak

---

## Step 5: Calorie Engine Integration

**`src/lib/calorie-correction.ts`**

In `computeAdjustedTarget()` (around line 511-533), after computing the base adjustment, add gym bonus logic:
- Import `isGymDay`, `getWeeklyConsistency`, `getGymBonus` from gym-service
- If user is gym-goer and today is a gym day, compute bonus from previous week's consistency
- Add bonus to target (or subtract 5% if consistency <50%)
- Existing 1200 kcal floor clamp already handles safety

| Consistency | Bonus | Base Adjustment |
|---|---|---|
| ≥80% | 1.0× | None |
| 50-80% | 0.75× | None |
| <50% | 0× | −5% base |

---

## Step 6: Dashboard Integration

**`src/pages/Dashboard.tsx`**

- Import `GymCheckInCard`, `GymConsistencyCard`, `GymUpsellCard`
- Place after CalorieRing (line ~183), before NextMealCard:
  - `GymCheckInCard` (if gym-goer + gym day + not logged)
  - `GymConsistencyCard` (if gym-goer)
  - `GymUpsellCard` (if conditions met)

---

## Step 7: Progress Tab

**`src/pages/Progress.tsx`**

- Import and render `GymProgressSection` for gym-goers (after existing weight/consistency sections)

---

## Step 8: Edit Profile

**`src/components/EditProfileSheet.tsx`**

- Add collapsible "Gym Settings" section: toggle, days slider, duration, intensity, goal pickers
- Save updates to profile and trigger calorie engine recompute

---

## Step 9: Meal Suggestion Integration

**`src/lib/meal-suggestion-engine.ts`**

- On days where `gym.attended = true`: boost protein-rich recipe scores by +15, increase protein target by 10%

---

## Step 10: Premium Plan

**`src/components/SpecialPlansTab.tsx`**, **`src/components/PlanDetailSheet.tsx`**

- Add `gym_optimization` plan type (₹199/month)
- When active: workout-day/rest-day calorie split, recovery meal suggestions

---

## Technical Summary

| Category | Files |
|---|---|
| **Created (5)** | `gym-service.ts`, `GymCheckInCard.tsx`, `GymConsistencyCard.tsx`, `GymUpsellCard.tsx`, `GymProgressSection.tsx` |
| **Modified (8)** | `store.ts`, `onboarding-store.ts`, `profile-mapper.ts`, `Onboarding.tsx`, `calorie-correction.ts`, `Dashboard.tsx`, `Progress.tsx`, `EditProfileSheet.tsx` |
| **Also modified (2)** | `meal-suggestion-engine.ts`, `SpecialPlansTab.tsx` |

No database migration. Gym profile data syncs via `conditions` JSONB. Daily gym logs sync via `log_data` JSONB.

