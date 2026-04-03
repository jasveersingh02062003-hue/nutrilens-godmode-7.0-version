

# Plan: Full Sync — Plan-Aware Transformation Across All Screens

## Summary
The core plan engines (calorie override, macro override, meal suggestion filters) are already wired. The gaps are in **Progress**, **Calendar**, **Meal Planner**, **Budget**, and **Profile** not visually reflecting the active plan. This plan adds plan-awareness to every screen so activating a 21-Day or Event plan transforms the entire app experience.

## What's Already Wired (No Changes)
- `getAdjustedDailyTarget()` returns plan calories when active
- `getProteinTarget/getCarbTarget/getFatTarget()` return plan macros
- `getRecipesForMeal()` filters by plan rules (home-cooked, no-junk, cooking time, budget tier, tummy anti-bloat)
- Dashboard shows plan banner, boosters, activity tracker, tummy card, post-event feedback
- `getActivePlan()` returns null when paused (auto-reverts engines)

## Changes to Build

### 1. Progress Page — Plan Timeline Overlay
**File:** `src/pages/Progress.tsx`
- Import `getActivePlan`, `getActivePlanRaw`, `getPlanProgress`, `getPlanById`
- **Plan Progress Card** (new section, above calendar): When plan active, show a card with plan name, day X of Y, progress bar, daily target vs profile target comparison, weight delta (start weight vs current)
- **Calendar highlight**: Days within `startDate..endDate` range get a subtle colored border/ring (e.g., `ring-1 ring-primary/30`) to visually distinguish plan days
- **Weekly Overview**: The goal line in the bar chart should use `getAdjustedDailyTarget(profile)` instead of `profile.dailyCalories` so the reference line reflects plan targets
- **Plan Adherence Card** (below calendar): When plan active, show rule adherence (computed from daily logs within plan period): meals logged ratio, protein adherence %, days on track

### 2. Calendar — Plan Day Highlighting
**File:** `src/pages/Progress.tsx` (calendar is inline here)
- In the `calendarDays` computation, add a `isPlanDay` boolean for dates within active plan range
- Render plan days with a distinct visual: small plan emoji indicator or a colored left-border
- In the legend, add "🎯 Plan Day" entry when a plan is active
- When tapping a future plan day, show planned targets in `DayDetailsSheet`

### 3. Meal Planner — Plan-Filtered Banner + Target Override
**File:** `src/pages/MealPlanner.tsx`
- Import `getActivePlan`, `getPlanById`
- When plan is active, show a banner at top of planner: "🎯 Meals optimized for your [Plan Name] — [rules summary]"
- Pass plan targets to `generateWeekPlan` so it uses plan calories/protein instead of profile defaults

**File:** `src/lib/meal-plan-generator.ts`
- In `generateWeekPlan()`, check `getActivePlan()` — if active, use `plan.dailyCalories` and `plan.dailyProtein` as the base targets instead of profile values
- Apply plan-specific recipe filters (same as meal-suggestion-engine): home-cooked only for Madhavan, cooking time/budget for event plans
- For event plans with `budgetTier === 'tight'`, cap per-meal cost at ₹80

### 4. Budget Tab — Plan Budget Override
**File:** `src/components/BudgetPlannerTab.tsx`
- When event plan is active with a `budgetTier`, show an info banner: "Your event plan budget: ₹XX/day (tight/moderate/flexible)"
- Compute adjusted daily budget from `budgetTier`: tight = ₹150/day, moderate = ₹250/day, flexible = use profile budget
- Display plan budget alongside normal budget for comparison

### 5. Profile — Enhanced Plan Section
**File:** `src/pages/Profile.tsx`
- The plan badge + "My Current Plan" card already exists from previous implementation
- **Enhance**: Add plan rules display (chips showing active rules like "Home-cooked only", "16:8 Fasting", "No junk")
- Add weight progress within plan: start weight → current → target with a mini arc
- Add "Edit Plan" button that opens `EventPlanConfigSheet` with current settings

### 6. MealPlanDashboard — Plan Compliance Badges
**File:** `src/components/MealPlanDashboard.tsx`
- When plan active, add a "✅ Plan Compliant" or "⚠️ Off-plan" badge on each meal card
- Check compliance: does the recipe pass the plan's rule filters?
- Show plan daily target in the day header instead of profile target

### 7. CalorieRing — Plan Target Awareness
**File:** `src/components/CalorieRing.tsx`
- Already uses `getAdjustedDailyTarget(profile)` which returns plan calories — verify this is the case
- If not, ensure the ring's target uses the plan-aware function
- Add a subtle label "Plan Target" vs "Your Target" when plan is active

### 8. WeightChart — Plan Period Highlight
**File:** `src/components/WeightChart.tsx`
- When plan active, add a shaded region on the chart for the plan date range
- Show target weight line within the plan period
- Add start/end date markers

## Animation & UX
- Plan Progress Card: `animate-fade-in` on mount
- Calendar plan days: subtle pulse animation on current plan day
- Plan banner in Planner: slide-down with `motion.div`
- Compliance badges: scale-in animation
- All transitions use existing framer-motion patterns

## Implementation Order
1. Meal Plan Generator — plan target override (core engine fix)
2. Progress page — plan progress card + calendar highlighting + adherence
3. MealPlanner page — plan banner
4. MealPlanDashboard — compliance badges + plan target in header
5. BudgetPlannerTab — plan budget banner
6. Profile — enhanced plan section with rules + weight arc
7. CalorieRing + WeightChart — plan-aware visuals

## Files Summary
| File | Action |
|------|--------|
| `src/lib/meal-plan-generator.ts` | Modify — use plan targets + filters in generateWeekPlan |
| `src/pages/Progress.tsx` | Modify — plan progress card, calendar highlight, adherence card |
| `src/pages/MealPlanner.tsx` | Modify — plan-filtered banner at top |
| `src/components/MealPlanDashboard.tsx` | Modify — compliance badges, plan target in day header |
| `src/components/BudgetPlannerTab.tsx` | Modify — plan budget info banner |
| `src/pages/Profile.tsx` | Modify — plan rules chips, weight arc, edit button |
| `src/components/CalorieRing.tsx` | Modify — "Plan Target" label when active |
| `src/components/WeightChart.tsx` | Modify — plan period shading + target line |

