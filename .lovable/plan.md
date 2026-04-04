

# Complete Gym Intelligence System — Time-Aware, Adaptive, Low-Friction

## What You're Asking For (Summary)

You want the app to become a **personal gym coach** that knows exactly when the user works out, what they should eat before/after, adapts to their work schedule and sleep, and adjusts everything in real-time based on whether they actually went to the gym. The system must feel like it was **built specifically for each user's daily rhythm**.

## Major Changes

### 1. Data Model Extensions
**Files**: `src/lib/store.ts`, `src/lib/onboarding-store.ts`

Add to `UserProfile.gym`:
- `timeOfDay`: morning/afternoon/evening/night
- `specificHour`: 0-23 (e.g. 7 for 7 AM)
- `workStart`, `workEnd`: work schedule strings
- `sleepStart`, `sleepEnd`: sleep schedule strings  
- `shiftType`: day/night/rotating

Add to `DailyLog`:
- `energyLevel?: 1|2|3|4|5`

### 2. Onboarding — Progressive Gym Timing Questions (Step 11)
**File**: `src/pages/Onboarding.tsx`

After "Yes, I go to the gym" → existing questions (days, duration, intensity, goal) → **NEW questions**:
- "When do you usually go?" → Morning/Afternoon/Evening/Night selector
- "What time exactly?" → Time picker (hour selector)
- These appear conditionally only for gym goers, using the same progressive disclosure pattern

Also add **optional** work/sleep questions (can be skipped, editable later in Profile):
- "What are your work hours?" (start/end time pickers)
- "What is your sleep schedule?" (bedtime/wake-up)
- "Shift type?" (Day/Night/Rotating)

Wire new fields into `saveOnboardingData()` in `onboarding-store.ts` so they persist to `UserProfile.gym`.

### 3. New Service: `src/lib/gym-meal-engine.ts`
Science-backed pre/post workout meal suggestions based on time of day and budget:

| Time | Pre-Workout | Post-Workout |
|------|------------|-------------|
| Morning (5-9 AM) | Banana + black coffee, oatmeal, dates + nuts | Eggs + toast, protein shake, chicken + rice |
| Afternoon (12-3 PM) | Brown rice + chicken 2-3h before; apple 30 min before | Quinoa + tofu, sweet potato + eggs |
| Evening (5-8 PM) | PB sandwich, rice cake + honey | Fish + veggies, paneer + salad |
| Night (9-11 PM) | Small banana, tea | Casein shake, cottage cheese, boiled eggs |

Budget-conscious alternatives: soya chunks, dal, sattu, curd. Uses `profile.lifestyle.budget` to prioritize cheaper options.

Functions exported:
- `getPreWorkoutSuggestion(profile)` → meal suggestion + timing info
- `getPostWorkoutSuggestion(profile)` → recovery meal
- `shouldShowPreWorkout(profile)` → true if within 30-60 min before gym time
- `shouldShowPostWorkout(profile, log)` → true if gym attended and within 1h after
- `getGymMissedAdjustment(profile)` → calorie/carb reduction percentages

### 4. New Components

**`src/components/PreWorkoutCard.tsx`**
- Appears 30-60 min before `specificHour`
- Shows: "Your pre-workout snack: banana + coffee. Ready to crush it?"
- Buttons: [Start Workout] / [Not now]
- Dismissed after gym check-in

**`src/components/PostWorkoutCard.tsx`**
- Appears after user checks in "Yes" on gym day
- Shows recovery meal suggestion
- Button: [Log Meal] → opens meal logging with recipe pre-selected

**`src/components/EnergyTracker.tsx`**
- Simple 1-5 star rating card on Dashboard
- "How is your energy today?"
- Stores in `dailyLog.energyLevel`

**`src/components/GymPDFExport.tsx`**
- Button in Progress tab: "Download Gym Report"
- PDF includes: monthly attendance calendar, pre/post meal adherence, energy trends, consistency %, total workouts/calories burned
- Uses jsPDF

### 5. Modified Components

**`src/components/GymCheckInCard.tsx`**
- Schedule appearance based on `specificHour + durationMinutes + 30min` instead of showing all day
- Add [Snooze 1h] button alongside Yes/No
- On "No": reduce remaining carbs by 10-15% for the day (call redistribution engine), reduce total calories by 5-10% for weight loss goals (clamped ≥1200 kcal)
- On "Yes": show PostWorkoutCard immediately

**`src/components/EditProfileSheet.tsx`**
- Add "Gym & Lifestyle" collapsible section with:
  - Gym timing (time of day picker + specific hour)
  - Work schedule (start/end time pickers)
  - Sleep schedule (bedtime/wake-up)
  - Shift type selector
- After saving, recalculate meal suggestions and check-in timing

### 6. Dashboard Integration
**File**: `src/pages/Dashboard.tsx`

For gym goers, conditionally render in order:
1. **PreWorkoutCard** (if within pre-workout window)
2. **GymCheckInCard** (if gym time has passed and not yet answered)
3. **PostWorkoutCard** (if checked in "Yes")
4. **EnergyTracker** (if not yet logged today)

### 7. Calorie Adjustment on Missed Gym
**File**: `src/lib/calorie-correction.ts`

When gym is missed (`attended === false`):
- Weight loss goal: reduce day's target by 5-10% (clamped ≥1200)
- All goals: reduce carbs by 10-15%, keep protein locked
- Use existing redistribution engine for remaining meals

### 8. Energy Trends in Progress
**File**: `src/pages/Progress.tsx`

Add energy trend line chart (last 30 days) correlated with gym attendance. Show insights like "Your energy is higher on workout days" or "Low sleep correlates with low energy."

Add "Download Gym Report" button that triggers `GymPDFExport`.

### 9. Work/Sleep-Aware Adaptations
**File**: `src/lib/gym-meal-engine.ts`

- Night shift: adjust meal timing, suggest gym before shift
- Sedentary job: lighter lunches, movement reminders
- Physical job: +5-10% daily calories
- Sleep < 6h: show tip "Low sleep increases hunger – prioritise protein", optionally reduce workout intensity recommendation

## Implementation Order

1. Extend data models (`store.ts`, `onboarding-store.ts`)
2. Update onboarding step 11 with gym timing questions
3. Create `gym-meal-engine.ts` service
4. Build `PreWorkoutCard`, `PostWorkoutCard`, `EnergyTracker` components
5. Modify `GymCheckInCard` with timing + snooze + calorie adjustment
6. Add gym lifestyle section to `EditProfileSheet`
7. Integrate all cards into Dashboard
8. Add energy chart + PDF export to Progress
9. Wire calorie adjustment on missed gym into `calorie-correction.ts`

## Files Changed/Created

| File | Action |
|------|--------|
| `src/lib/store.ts` | Extend `UserProfile.gym` + `DailyLog.energyLevel` |
| `src/lib/onboarding-store.ts` | Wire new gym fields |
| `src/pages/Onboarding.tsx` | Add gym timing + work/sleep questions |
| `src/lib/gym-meal-engine.ts` | **NEW** — pre/post meal engine |
| `src/components/PreWorkoutCard.tsx` | **NEW** |
| `src/components/PostWorkoutCard.tsx` | **NEW** |
| `src/components/EnergyTracker.tsx` | **NEW** |
| `src/components/GymPDFExport.tsx` | **NEW** |
| `src/components/GymCheckInCard.tsx` | Add timing, snooze, calorie adjustment |
| `src/components/EditProfileSheet.tsx` | Add gym lifestyle section |
| `src/pages/Dashboard.tsx` | Integrate new cards |
| `src/pages/Progress.tsx` | Energy chart + PDF button |
| `src/lib/calorie-correction.ts` | Missed gym adjustment |
| `src/lib/profile-mapper.ts` | Map new gym fields to cloud |

No database migrations needed — all new fields stored in existing JSONB columns.

