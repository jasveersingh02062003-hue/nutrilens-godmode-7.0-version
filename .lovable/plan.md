

# Gym Attendance Tracking & Dynamic Calorie Adjustment

## Overview
Add gym tracking to onboarding, daily check-ins on the dashboard, weekly consistency-based calorie adjustments, stats tracking, and premium upsell for gym-goers. No database migration needed — gym data stored in existing JSONB columns.

---

## Step 1: Extend Data Models

**Files:** `src/lib/store.ts`, `src/lib/onboarding-store.ts`, `src/lib/profile-mapper.ts`

- Add `gym?` field to `UserProfile` interface (goer, daysPerWeek, durationMinutes, intensity, goal, schedule, stats)
- Add `gym?` field to `DailyLog` interface (attended, durationMinutes, caloriesBurned, intensity)
- Add gym fields to `OnboardingData.activity` section
- Update `saveOnboardingData()` to wire gym data into profile
- Map gym data through `conditions` JSONB in `profileToDbRow`/`dbRowToProfile`
- Add gym fields to `FormState` in onboarding

## Step 2: Onboarding Gym Questions

**File:** `src/pages/Onboarding.tsx`

- Add 5 new fields to `FormState`: `gymGoer`, `gymDays`, `gymDuration`, `gymIntensity`, `gymGoal`
- Insert a new step after step 10 (Exercise) — becomes step 10.5, renumber subsequent steps
- Questions: gym yes/no → days/week slider → duration picker → intensity → goal
- If "No", skip remaining gym questions via `getVisibleSteps()`
- Auto-infer schedule from `daysPerWeek` (3 → Mon/Wed/Fri pattern)
- Update `canContinue()`, step map comments, `handleFinish()` to include gym data
- Wire into `OnboardingData.activity` section

## Step 3: Create Gym Service

**New file:** `src/lib/gym-service.ts`

Pure logic functions:
- `isGymDay(profile, date)` — matches day-of-week against profile schedule
- `getGymCheckInStatus(date)` — reads `dailyLog.gym`
- `saveGymCheckIn(date, attended, duration?, intensity?)` — writes to daily log, updates profile stats
- `estimateCaloriesBurned(weightKg, duration, intensity)` — MET formula: `duration × MET × (weightKg/60)`, MET: light=4, moderate=6, intense=8
- `getWeeklyConsistency(profile, date)` — actualWorkouts / plannedWorkouts for last 7 days from logs
- `getGymBonus(profile, consistency, isGymDay)` — base bonus = `duration × intensityFactor × 0.6`, scaled by consistency (≥80% full, 50-80% ×0.75, <50% zero + 5% base reduction flag)
- `getGymStats(allLogs)` — compute totals, streaks, consistency from all daily logs
- `updateGymStats(profile)` — recompute and save stats to profile

## Step 4: Create UI Components

**New files:**

### `src/components/GymCheckInCard.tsx`
- Non-intrusive card, shown on gym days if not checked in
- "Did you work out today? 🏋️" with Yes/No buttons
- Yes → expand: duration slider, intensity picker, live calorie estimate
- Saves via `saveGymCheckIn()`, shows "Logged ✓" state after

### `src/components/GymConsistencyCard.tsx`
- Below CalorieRing for gym-goers only
- "This week: X/Y workouts" with mini progress ring
- Current streak with fire emoji
- Consistency % with color coding (green/amber/red)
- "Log workout" button
- Wrapped in `React.memo`

### `src/components/GymUpsellCard.tsx`
- Conditional: gym-goer + ≥5 sessions in 30 days + streak ≥3
- "Unlock Your Gym Diet Plan 💪" with features list
- Upgrade button → Plans tab

### `src/components/GymProgressSection.tsx`
- For Progress tab, gym-goers only
- Monthly calendar with green dots on workout days
- Weekly consistency bars (last 12 weeks)
- Lifetime stats: total workouts, calories burned, best streak

## Step 5: Calorie Engine Integration

**File:** `src/lib/calorie-correction.ts`

- In `getAdjustedDailyTarget()`, after base target calculation and before return:
  - If user is gym-goer and today is a gym day, compute gym bonus via `getGymBonus()`
  - Add bonus to target (or subtract 5% if consistency <50%)
  - Clamp to ≥1200 kcal
- Bonus based on previous week's consistency, not current week

## Step 6: Dashboard & Profile Integration

**File:** `src/pages/Dashboard.tsx`
- Import and render `GymCheckInCard`, `GymConsistencyCard`, `GymUpsellCard` conditionally
- Place after CalorieRing, before Today's Meals

**File:** `src/pages/Progress.tsx`
- Import and render `GymProgressSection` for gym-goers

**File:** `src/components/EditProfileSheet.tsx`
- Add collapsible "Gym Settings" section: toggle, days slider, duration, intensity, goal pickers

## Step 7: Meal Suggestion & Premium Plan

**File:** `src/lib/meal-suggestion-engine.ts`
- On workout days (`gym.attended = true`): boost protein-rich recipe scores by +15, increase protein target by 10%

**Files:** `src/components/SpecialPlansTab.tsx`, `src/components/PlanDetailSheet.tsx`
- Add `gym_optimization` plan type (₹199/month)
- When active: workout-day/rest-day calorie split, recovery meal suggestions

---

## Technical Details

### Files Created (5)
- `src/lib/gym-service.ts`
- `src/components/GymCheckInCard.tsx`
- `src/components/GymConsistencyCard.tsx`
- `src/components/GymUpsellCard.tsx`
- `src/components/GymProgressSection.tsx`

### Files Modified (8)
- `src/lib/store.ts` — type extensions
- `src/lib/onboarding-store.ts` — gym in OnboardingData + saveOnboardingData
- `src/lib/profile-mapper.ts` — cloud sync mapping
- `src/pages/Onboarding.tsx` — gym questions (new steps 11-15, renumber)
- `src/lib/calorie-correction.ts` — gym bonus in getAdjustedDailyTarget
- `src/pages/Dashboard.tsx` — render gym cards
- `src/pages/Progress.tsx` — gym stats section
- `src/components/EditProfileSheet.tsx` — gym settings

### No Database Migration
All gym data stored in existing `conditions` JSONB column (profile) and `log_data` JSONB column (daily logs).

### Calorie Adjustment Table
| Weekly Consistency | Bonus Multiplier | Base Adjustment |
|---|---|---|
| ≥80% | 1.0× | None |
| 50–80% | 0.75× | None |
| <50% | 0× | −5% base calories |

Safety floor: 1200 kcal always enforced.

