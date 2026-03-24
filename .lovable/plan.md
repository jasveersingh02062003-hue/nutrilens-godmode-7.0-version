

## Add Real-World Adaptation Layer to Meal Plan Engine

### What We'll Build

Four key system improvements that handle multi-day consistency, health-aware filtering, adherence tracking, and fail-safe fallbacks.

### Changes (4 files)

**File 1: Update `src/lib/plan-validator.ts`** — Weekly Nutrition Balancing + Priority Hierarchy

- Add `validateWeeklyNutrition(plan, profile)` — checks protein/calorie variance across 7 days. If any day deviates >20% from target, flag it. Returns `{ balanced: boolean, dayFlags: { date, proteinDelta, calorieDelta }[], suggestions: string[] }`
- Add `CONSTRAINT_PRIORITY` constant enforcing the hierarchy: `1. Health constraints (non-negotiable) → 2. Calories → 3. Protein → 4. Budget → 5. Preferences`
- Add `resolveConflicts(profile, budget, healthConditions)` — when constraints clash, applies the priority order and returns which targets to relax

**File 2: Update `src/lib/meal-plan-generator.ts`** — Health Filtering + Fail-Safe + Weekly Balancing

- **Health constraint tags on recipes**: Extend `getHealthTags()` to also return `avoidFor` tags: diabetes → avoid `high-sugar`; acne → avoid `oily`, `fried`; hypertension → avoid `high-sodium`. Use the existing `recipe.avoidFor` field to filter out harmful recipes before scoring
- **Fail-safe simple plan**: Add `generateSimplePlan(profile)` — a hardcoded fallback that produces basic meals (dal+rice, egg+roti, oats+banana) when the main engine finds <3 valid recipes per meal type. Returns a valid `WeekPlan` with rotation of ~10 simple combos
- **Weekly balancing pass**: After generating all 7 days, run a post-pass that checks if any day has protein <80% target. If so, swap the lowest-protein meal on that day with the highest-protein option from another day that exceeded target (redistribute, don't regenerate)
- **avoidFor filtering**: In `findRecipeWithFallback`, add a filter step that removes recipes where `recipe.avoidFor` includes any of the user's health conditions

**File 3: New `src/lib/adherence-service.ts`** — Adherence Scoring + Behavior Model

- `calculateAdherenceScore(weekPlan)` — returns `mealsCooked / mealsPlanned` as a 0-1 score
- `getAdherenceHistory()` — stores weekly scores in localStorage, returns last 4 weeks
- `getAdherenceTrend()` — rising/falling/stable based on last 4 scores
- `getBehaviorProfile()` — derives: `skipRate` (% meals skipped), `outsideFoodFrequency`, `preferredMealTypes` from feedback + cooked status
- `getComplexityRecommendation(adherenceScore)` — if score <0.5, recommend simpler meals (fewer ingredients, shorter prep); if >0.8, allow more complex recipes. Returns a difficulty filter string

**File 4: Update `src/components/MealPlanOnboarding.tsx`** — Show adherence-based complexity + weekly balance info

- In the summary step, if user has prior adherence data, show: "Based on your history, we'll suggest [simpler/standard/more complex] meals"
- After plan generation, run `validateWeeklyNutrition()` and show any warnings (e.g., "Wednesday protein is low — we've rebalanced")

### Health Constraint Tags (applied in generator)
```text
Diabetes    → prefer: low-gi, high-fiber     | avoid: high-sugar
Acne        → prefer: low-oil, high-fiber    | avoid: oily, fried, high-dairy  
Hypertension→ prefer: low-sodium             | avoid: high-sodium, pickled
PCOS        → prefer: low-gi, high-protein   | avoid: high-sugar, refined-carbs
Cholesterol → prefer: low-fat                | avoid: fried, high-fat
```

### Fail-Safe Simple Plan (10 rotations)
```text
Breakfast: Oats+banana, Egg+toast, Poha, Upma, Idli
Lunch: Dal+rice+sabzi, Roti+paneer, Chole+rice, Rajma+rice, Khichdi
Dinner: Roti+dal+salad, Rice+sambar, Egg curry+roti, Moong dal+roti, Veg pulao
```

### Flow After Changes
```text
Generate plan → health filter removes harmful recipes
  → main engine runs with composition + budget + macros
  → if <3 recipes per slot → fall back to simple plan
  → weekly balancing pass redistributes protein across days
  → adherence score adjusts meal complexity for next week
  → validateWeeklyNutrition() flags any remaining issues
```

### What stays unchanged
- Budget system, onboarding flow, recipe database content
- Existing feasibility check, swap engine, feedback loop
- All UI components except minor summary additions

