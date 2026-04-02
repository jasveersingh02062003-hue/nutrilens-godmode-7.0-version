

# Implementation Plan: Fill Remaining Gaps in Paid Plans + Weather Intelligence

Most of the system is already built. This plan addresses the **remaining gaps** between what exists and what the user's document describes.

## What's Already Done (No Changes Needed)
- Plan service, catalog, target calculation, localStorage CRUD
- Calorie/protein override in `getAdjustedDailyTarget` / `getProteinTarget`
- Sugar detector with 100+ keywords
- Sugar warnings in AddFoodSheet, QuickLogSheet, CameraHome
- Meal suggestion filtering by plan rules + weather scoring
- ActivePlanBanner on Dashboard
- PlanCompletionModal with confetti
- SpecialPlansTab + PlanDetailSheet
- KitchenTab pill toggle (Groceries/Recipes)
- Profile "Special Plans" row
- `event_plans` database table with RLS
- Seasonal picks + `getWeatherWaterBonus` in food-tags.ts

## What Still Needs Building

### 1. Dashboard Promo Card (Plan Discovery)
**File:** `src/components/PlanPromoCard.tsx` (new)
- Shown on Dashboard only when **no active plan** exists
- Card: "Transform in 21 days — explore plans →"
- Tapping opens `SpecialPlansTab` as a full-screen sheet (reuse existing component)
- Placed below `TodayMealPlan` in Dashboard

**File:** `src/pages/Dashboard.tsx` (modify)
- Import and render `PlanPromoCard` conditionally when `!isPlanActive()`

### 2. Water Tracker Weather Integration
**File:** `src/components/WaterTrackerCompact.tsx` (modify)
- Import `getWeatherWaterBonus` from food-tags and `getWeather` from weather-service
- Adjust the displayed goal: `goal + (extraCups * 250)` ml
- Show a small weather nudge chip below the progress bar when bonus > 0

### 3. Camera Flow Weather Nudge Post-Scan
**File:** `src/pages/CameraHome.tsx` (modify)
- After food detection result, check weather conditions
- If heavy/fried food detected in summer (temp > 34°C), show compact WeatherNudgeCard: "Try a lighter option"
- Use existing `WeatherNudgeCard` component in inline mode

### 4. Sugar Warning Badge in Search Results
**File:** `src/components/AddFoodSheet.tsx` (modify)
- In the search results list, next to each food item, show a small red "🚫 Sugar" badge if `isSugarDetectionActive()` and `detectSugar(food.name).hasSugar`
- Visual indicator before the user taps to add

### 5. Profile Active Plan Enhanced View
**File:** `src/pages/Profile.tsx` (modify)
- Enhance the existing "Special Plans" row:
  - If active plan: show mini progress bar + day count inline
  - Add "Cancel Plan" option (with confirmation dialog) that calls `clearActivePlan()`
  - Tapping opens expanded plan details (reuse PlanDetailSheet in read-only mode or a new small sheet)

### 6. PDF Export for Active Plan
**File:** `src/lib/plan-pdf-export.ts` (new)
- Generate PDF using `jsPDF` with:
  - Plan summary (name, duration, targets)
  - Daily calorie/macro targets
  - Sample meal suggestions (pull from meal-suggestion-engine)
  - Grocery list (pull from meal-plan-generator)
- Triggered from the expanded ActivePlanBanner tap view

**File:** `src/components/ActivePlanBanner.tsx` (modify)
- Add tap-to-expand behavior showing plan details + "Download PDF" button

### 7. Carb/Fat Target Override
**File:** `src/lib/calorie-correction.ts` (modify)
- Add `getCarbTarget()` and `getFatTarget()` functions that check active plan first (similar to existing `getProteinTarget`)

## Implementation Order
1. Dashboard promo card + water tracker weather integration (quick wins)
2. Sugar badge in search results + camera weather nudge
3. Profile active plan enhancement + cancel flow
4. Carb/fat target overrides
5. PDF export service + banner integration

## Files Summary
| File | Action |
|------|--------|
| `src/components/PlanPromoCard.tsx` | Create — promo card for plan discovery |
| `src/pages/Dashboard.tsx` | Modify — add PlanPromoCard |
| `src/components/WaterTrackerCompact.tsx` | Modify — weather-adjusted goal |
| `src/pages/CameraHome.tsx` | Modify — post-scan weather nudge |
| `src/components/AddFoodSheet.tsx` | Modify — sugar badge in results |
| `src/pages/Profile.tsx` | Modify — enhanced active plan view |
| `src/lib/plan-pdf-export.ts` | Create — PDF generation |
| `src/components/ActivePlanBanner.tsx` | Modify — expandable + PDF button |
| `src/lib/calorie-correction.ts` | Modify — add getCarbTarget/getFatTarget |

