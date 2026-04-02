

# Implementation Plan: Remaining Gaps from the Comprehensive Document

## Already Built (No Changes Needed)
- Plan catalog, CRUD, target calculation, safety clamps (1200 kcal floor, 1 kg/week max)
- Calorie/protein/carb/fat target overrides via active plan
- Sugar detector (100+ keywords) + warnings in AddFoodSheet, QuickLogSheet, CameraHome
- Meal suggestion engine with plan filters + weather scoring multipliers
- ActivePlanBanner (expandable with cancel) on Dashboard
- PlanPromoCard on Dashboard (discovery)
- PlanCompletionModal with confetti
- WaterTrackerCompact with weather-adjusted goals
- Weather service + seasonal food tags + Ritucharya data
- Profile "Special Plans" row with active plan status
- `event_plans` database table with RLS
- KitchenTab pill toggle

## What Still Needs Building

### 1. Gym Lover Nutrient Timing Nudges
**File:** `src/lib/meal-suggestion-engine.ts` (modify)
- When `gym_fat_loss` or `gym_muscle_gain` is active, tag meal suggestions with workout timing context:
  - Pre-workout meals (complex carbs + lean protein) tagged for breakfast/lunch slots
  - Post-workout meals (high protein + carbs 3:1 ratio) tagged for snack/dinner slots
- Add `workoutTiming?: 'pre' | 'post' | 'rest'` to `SuggestedRecipe` interface
- Show timing badge in match reason: "💪 Great pre-workout meal"

### 2. Low-Carb Evening Enforcement (Celebrity Plan)
**File:** `src/lib/meal-suggestion-engine.ts` (modify)
- When `celebrity_transformation` is active and meal slot is `dinner`:
  - Filter out recipes with carbs > 25g
  - Add match reason: "🌙 Low-carb evening compliant"

### 3. Refeed Day Logic (Day 10 of 21-day sprint)
**File:** `src/lib/calorie-correction.ts` (modify)
- In `getAdjustedDailyTarget()`, when active plan day number is 10:
  - Increase carb target by 50% for that day
  - Set calorie target to TDEE (no deficit) for one day
- Show a nudge on Dashboard: "Refeed day — enjoy higher carbs to reset metabolism"

### 4. PDF Export for Active Plan
**File:** `src/lib/plan-pdf-export.ts` (new)
- Use `reportlab`-style approach via a Supabase edge function, or generate a simple client-side text/HTML-to-PDF
- Content: plan summary, 21-day daily targets, sample meals per slot, grocery checklist
- Triggered from ActivePlanBanner expanded view "Download PDF" button

**File:** `src/components/ActivePlanBanner.tsx` (modify)
- Add "Download PDF" button in the expanded section (already has Download icon imported but not wired)

### 5. Sugar Warning Badge in Search Results (Visual)
**File:** `src/components/AddFoodSheet.tsx` (modify)
- In the search results list rendering, show a small inline red "🚫 Sugar" badge next to food names when Sugar Cut is active and `detectSugar(food.name).hasSugar`
- Currently sugar check only triggers on `handleAdd` — need visual indicator before tap

### 6. Calorie Cycling for Muscle Gain (Training vs Rest Days)
**File:** `src/lib/calorie-correction.ts` (modify)
- When `gym_muscle_gain` is active, check if today is a "training day" (user marks via a toggle or default weekdays)
- Training days: full surplus (plan target)
- Rest days: reduce surplus by 200 kcal, shift carbs down / fat up

### 7. Camera Post-Scan Weather Nudge (Missing Integration)
**File:** `src/pages/CameraHome.tsx` (modify)
- After food detection result, check if temperature > 34°C and detected food is heavy/fried
- Show compact inline `WeatherNudgeCard`: "Try a lighter option — it's hot today"
- Currently weather nudge exists on Dashboard but not integrated post-scan

## Implementation Order
1. Sugar badge in search results + camera weather nudge (quick visual wins)
2. Gym nutrient timing nudges + low-carb evening filter
3. Refeed day logic
4. Calorie cycling for muscle gain
5. PDF export (requires edge function or client-side library)

## Files Summary
| File | Action |
|------|--------|
| `src/components/AddFoodSheet.tsx` | Modify — add inline sugar badge in search results |
| `src/pages/CameraHome.tsx` | Modify — post-scan weather nudge |
| `src/lib/meal-suggestion-engine.ts` | Modify — nutrient timing tags + dinner carb cap |
| `src/lib/calorie-correction.ts` | Modify — refeed day + calorie cycling |
| `src/lib/plan-pdf-export.ts` | Create — PDF generation service |
| `src/components/ActivePlanBanner.tsx` | Modify — wire PDF download button |

## Technical Details
- Refeed day uses `getPlanProgress().dayNumber === 10` check
- Calorie cycling stores training days in localStorage (`nutrilens_training_days`)
- PDF export generates HTML and uses `window.print()` or a lightweight client-side library (no jsPDF dependency needed — use browser print-to-PDF)
- Weather nudge post-scan reuses existing `WeatherNudgeCard` component in compact/inline mode
