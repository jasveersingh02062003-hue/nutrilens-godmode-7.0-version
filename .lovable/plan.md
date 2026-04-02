

# Implementation Plan: Madhavan 21-Day Metabolic Reset

## Summary

Add the **Madhavan 21-Day Metabolic Reset** as a new plan type in the existing event plans framework. This includes the plan catalog entry, behavioral rule enforcement (eating window, chewing timer, no-raw-after-3PM, home-cooked-only), a custom dashboard banner, body awareness journaling, and a 4-week reverse dieting transition after plan completion.

## What Already Exists (Reuse)
- Plan service with catalog, CRUD, target calculation, safety clamps
- Calorie/macro override in `calorie-correction.ts` (with refeed day, calorie cycling patterns)
- Sugar detector + warnings in logging flows
- Meal suggestion engine with plan filters + weather scoring
- ActivePlanBanner, PlanCompletionModal, PlanPromoCard
- `event_plans` database table

## New Components & Changes

### 1. Plan Service Extension
**File:** `src/lib/event-plan-service.ts`
- Add `'madhavan_21_day'` to `PlanType` union
- Add `'circadian'` to `PlanCategory`
- Add plan metadata to `PLAN_CATALOG` with rules: `intermittent_fasting_12h`, `chew_timer_50`, `home_cooked_only`, `no_junk_food`, `leafy_greens_daily`, `no_raw_after_3pm`, `hydration_40ml_kg`, `early_sleep_10pm`
- Add `customSettings` field to `ActivePlan` interface for eating window times, step targets, water multiplier, chew count
- Add `calculateMadhavanTargets()` using Mifflin-St Jeor with 500-750 kcal deficit, protein at 1.6g/kg

### 2. Reverse Dieting System
**File:** `src/lib/reverse-diet-service.ts` (new)
- Store reverse diet state in localStorage: `{ active, startDate, newTDEE, weeklyTargets }`
- `startReverseDiet(newWeight)` — calculates 3-week graduated return to TDEE
- `getReverseDietTarget()` — returns current week's calorie target
- `isReverseDietActive()` — check flag

**File:** `src/lib/calorie-correction.ts` (modify)
- In `getAdjustedDailyTarget()`, after active plan check, add reverse diet check: if active, return weekly target instead of normal TDEE

### 3. Behavioral Rule Components

**File:** `src/components/ChewingTimerModal.tsx` (new)
- Modal with animated 50-chew counter
- Haptic feedback every 10 chews via `navigator.vibrate`
- Shows after meal logging when Madhavan plan is active
- Stores completion flag per meal in localStorage

**File:** `src/components/BodyAwarenessJournal.tsx` (new)
- Evening sheet with sliders: Energy (1-5), Bloating (1-5), Mood (1-5), free-text notes
- Stores daily entries in localStorage, syncs to cloud via `event_plans.config`
- After 7 days, shows basic food-symptom correlations

**File:** `src/components/EatingWindowGuard.tsx` (new)
- Modal triggered when user tries to log food outside 7AM-7PM window
- "Your eating window is 7 AM – 7 PM. Log anyway?" with delayed confirm button
- Reuses `AlertDialog` pattern from allergen system

### 4. Logging Flow Integrations
**File:** `src/components/AddFoodSheet.tsx` (modify)
- When Madhavan plan active + time > 15:00: check food tags for `raw` → show warning + suggest cooked alternative
- When Madhavan plan active: check food tags for `junk`, `restaurant`, `fast_food` → show home-cooked warning
- When time outside eating window (before 7AM or after 7PM): trigger `EatingWindowGuard`

**File:** `src/pages/LogFood.tsx` (modify)
- After successful meal log, if Madhavan active, show `ChewingTimerModal`

### 5. Meal Suggestion Filtering
**File:** `src/lib/meal-suggestion-engine.ts` (modify)
- When `madhavan_21_day` active:
  - Exclude recipes tagged `restaurant`, `junk`, `processed`, `fast_food`
  - After 3PM slots: exclude `raw` tagged recipes, suggest cooked alternatives
  - Boost recipes with `leafy_greens`, `home_cooked`, `millet`, `fermented` tags
  - Boost recipes using coconut oil or sesame oil; penalize other oils

### 6. Dashboard Integration
**File:** `src/components/MadhavanPlanBanner.tsx` (new)
- Replaces standard `ActivePlanBanner` when Madhavan plan active
- Shows: day countdown, eating window status (open/closed), chewing completion for last meal, water intake vs adjusted goal (weight × 40ml), evening journal prompt
- Expandable with daily targets + rules + PDF export

**File:** `src/pages/Dashboard.tsx` (modify)
- Conditionally render `MadhavanPlanBanner` instead of `ActivePlanBanner` when `activePlan.planId === 'madhavan_21_day'`

### 7. Plan Completion + Reverse Diet Transition
**File:** `src/components/PlanCompletionModal.tsx` (modify)
- When Madhavan plan completes, show additional "Start Reverse Diet" button
- Calls `startReverseDiet()` with current weight
- Shows 3-week transition schedule preview

**File:** `src/pages/Profile.tsx` (modify)
- If reverse diet active, show progress in the "Special Plans" row: "Reverse Diet — Week 2/3"

### 8. Water Goal Override
**File:** `src/components/WaterTrackerCompact.tsx` (modify)
- When Madhavan active: override goal to `weightKg × 40` ml (clamped 3000-5000ml)
- Show label "Madhavan hydration target"

## Implementation Order
1. Plan service extension (add type + catalog entry + target calculation)
2. Reverse diet service (new file)
3. Calorie correction overrides (Madhavan + reverse diet)
4. Meal suggestion filters (home-cooked, no-raw-after-3PM, leafy greens boost)
5. Behavioral components (ChewingTimerModal, EatingWindowGuard, BodyAwarenessJournal)
6. Logging flow integrations (AddFoodSheet, LogFood)
7. MadhavanPlanBanner + Dashboard integration
8. PlanCompletionModal reverse diet transition
9. Profile + WaterTracker updates

## Files Summary
| File | Action |
|------|--------|
| `src/lib/event-plan-service.ts` | Modify — add Madhavan plan type + catalog entry |
| `src/lib/reverse-diet-service.ts` | Create — reverse dieting logic |
| `src/lib/calorie-correction.ts` | Modify — Madhavan + reverse diet overrides |
| `src/lib/meal-suggestion-engine.ts` | Modify — home-cooked, raw food, greens filters |
| `src/components/ChewingTimerModal.tsx` | Create — 50-chew haptic timer |
| `src/components/BodyAwarenessJournal.tsx` | Create — evening symptom journal |
| `src/components/EatingWindowGuard.tsx` | Create — fasting window enforcement |
| `src/components/MadhavanPlanBanner.tsx` | Create — custom dashboard banner |
| `src/components/AddFoodSheet.tsx` | Modify — raw food + junk + window checks |
| `src/pages/LogFood.tsx` | Modify — trigger chewing timer post-log |
| `src/pages/Dashboard.tsx` | Modify — conditional Madhavan banner |
| `src/components/PlanCompletionModal.tsx` | Modify — reverse diet transition |
| `src/components/WaterTrackerCompact.tsx` | Modify — Madhavan hydration override |
| `src/pages/Profile.tsx` | Modify — reverse diet status display |

