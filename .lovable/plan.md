

# Phase 1 + Phase 2 Implementation Plan

## What Already Exists
- **Plans tab** in Planner with `SpecialPlansTab` (plan cards + filters)
- **PlanDetailSheet** with duration/target config and "Unlock" button
- **event-plan-service.ts** with plan catalog, target calculation, localStorage CRUD
- **ActivePlanBanner** on Dashboard
- **KitchenTab** with pill toggle (Groceries/Recipes merged)
- **Weather service** (OpenWeatherMap + simulation)
- **SeasonalPicksRow** + **WeatherNudgeCard** on Dashboard
- **Seasonal food data** in `food-tags.ts`
- **AnimatedWarningBanner** (allergen system) — reusable for sugar warnings

## What Needs to Be Built

### PHASE 1: Active Plan System Override

**1. Calorie target override** (`src/lib/calorie-correction.ts`)
- Modify `getAdjustedDailyTarget()` to check `getActivePlan()` first
- If active plan exists, use `plan.dailyCalories` as base target instead of profile target
- Same for `getProteinTarget()` — use plan's protein target

**2. Meal suggestion filter** (`src/lib/meal-suggestion-engine.ts`)
- When active plan is `sugar_cut`, filter out recipes with sugar keywords
- When `gym_fat_loss`, boost high-protein recipes; exclude high-carb
- When `gym_muscle_gain`, prioritize caloric surplus meals
- Add plan-compliant badge to matching recipes

**3. Sugar detector service** (`src/lib/sugar-detector.ts` — NEW)
- Keyword list: sugar, sucrose, jaggery, honey, mithai, gulab jamun, jalebi, ladoo, chocolate, candy, etc.
- `detectSugar(foodName: string, sugarGrams?: number): { hasSugar: boolean; severity: 'high' | 'moderate' | 'low'; keywords: string[] }`
- Sugar grams threshold: >5g per serving = warning

**4. Sugar warning integration** — inject into ALL logging flows:
- `src/components/AddFoodSheet.tsx` — after food selection, check sugar
- `src/components/QuickLogSheet.tsx` — same
- `src/pages/CameraHome.tsx` — after AI scan result
- `src/components/FoodEditModal.tsx` — when editing
- Reuse `AnimatedWarningBanner` with red severity
- "Log Anyway" button with 3-second delay + "Find Alternative" button (opens swap filtered to sugar-free)

**5. Plan completion flow** (`src/components/PlanCompletionModal.tsx` — NEW)
- Triggered when `getPlanProgress().daysLeft === 0`
- Shows celebration animation (reuse ConfettiCelebration)
- Before/after weight summary (if weight logs exist)
- Buttons: "Extend Plan" / "Return to Normal"

**6. Profile "My Active Plan" section** (`src/pages/Profile.tsx`)
- Already has the "Special Plans" row — enhance it to show:
  - Active plan progress bar
  - "Cancel Plan" option with confirmation
  - Deep-link to Plans tab

**7. Database migration** — `event_plans` table
```sql
CREATE TABLE event_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  start_date text NOT NULL,
  end_date text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE event_plans ENABLE ROW LEVEL SECURITY;
-- RLS: users can CRUD own plans
```

### PHASE 1.1: Plan-Specific Logic

**Gym Fat Loss rules:**
- 2g protein/kg bodyweight enforced in targets
- Filter recipes to high-protein, moderate-carb
- Pre/post workout meal suggestions in meal plan

**Gym Muscle Gain rules:**
- Caloric surplus 300-500 kcal
- High carb on training days
- Calorie cycling logic (higher on training days, lower on rest)

**Celebrity Transformation rules:**
- No processed sugar (reuse sugar detector)
- Low carb evenings (dinner carb cap)
- High protein throughout

### PHASE 2: Weather Intelligence Upgrade

**8. Enhanced weather-based meal scoring** (`src/lib/meal-suggestion-engine.ts`)
- Add weather multiplier to `getRecipesForMeal()`:
  - Summer (>34°C): +20% score for hydrating/light foods, -15% for heavy/fried
  - Winter (<18°C): +20% for warm/hearty, -10% for cold foods
  - Monsoon: +15% for immunity foods, -20% for raw salads
- Use existing `getTagsForFood()` from food-tags.ts

**9. Water goal auto-adjustment** (`src/lib/store.ts` or water tracker)
- If temp > 34°C, add +2 cups to water goal
- Show nudge: "Hot day — aim for 2 extra cups"
- If monsoon/humid, add +1 cup

**10. Seasonal drink suggestions** (`src/lib/food-tags.ts`)
- Expand `getSeasonalPicks()` to include drinks per season:
  - Summer: nimbu pani, coconut water, aam panna, buttermilk
  - Winter: adrak chai, turmeric milk, hot soup
  - Monsoon: ginger tea, masala chai, warm lemon water
- Already partially exists — enhance with Ritucharya data

**11. Plan + Weather conflict resolution**
- In `meal-suggestion-engine.ts`, if Sugar Cut active + weather suggests honey tea → override to sugar-free ginger tea
- Constraint layer: active plan rules take priority over weather suggestions

**12. Camera flow weather nudge** (`src/pages/CameraHome.tsx`)
- After scan, if heavy food detected in summer → show compact WeatherNudgeCard: "Try a lighter option"
- Already has WeatherNudgeCard component — integrate it post-scan

## Files Changed (Summary)

| File | Action |
|------|--------|
| `src/lib/calorie-correction.ts` | Modify — active plan override in `getAdjustedDailyTarget` |
| `src/lib/meal-suggestion-engine.ts` | Modify — plan filter + weather multiplier |
| `src/lib/sugar-detector.ts` | Create — sugar detection keywords + severity |
| `src/lib/food-tags.ts` | Modify — expand seasonal picks + drinks |
| `src/components/AddFoodSheet.tsx` | Modify — sugar warning injection |
| `src/components/QuickLogSheet.tsx` | Modify — sugar warning injection |
| `src/pages/CameraHome.tsx` | Modify — sugar warning + weather nudge post-scan |
| `src/components/PlanCompletionModal.tsx` | Create — celebration + next steps |
| `src/pages/Profile.tsx` | Modify — enhance active plan section |
| `src/lib/store.ts` | Modify — water goal weather adjustment |
| Database migration | Create `event_plans` table |

## Implementation Order

1. Sugar detector service + calorie override (core logic)
2. Sugar warning integration across logging flows
3. Plan-specific meal filtering
4. Weather multiplier in meal scoring + water goal adjustment
5. Plan completion modal
6. Database migration for cloud sync
7. Enhanced seasonal picks + Ritucharya data

