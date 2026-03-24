

## Redesign: Budget-First Planner with Data Sync Animation

### Current Problem
The MealPlanOnboarding asks **21 questions**, many of which duplicate data already collected during the main app onboarding (activity, sleep, stress, health conditions, exercise). The budget onboarding doesn't separate home vs outside food. There's no "data sync" animation screen showing the user what the system already knows.

### What We'll Build

**Phase A: Enhance Budget Onboarding** (BudgetPlannerTab.tsx)
- Add "outside food budget" as a separate field (restaurants, street food, packed food) — already has `outsideFoodLimit` field but needs clearer UX
- Add "meals per day" question (3/4/5) to the budget flow since it determines per-meal split
- Show computed daily budget (monthly / 30), weekly budget (daily × 7), and per-meal breakdown
- This is partially done already — the manual flow has monthly + per-meal + outside limit

**Phase B: Add Data Sync Animation Screen** (new step in MealPlanOnboarding)
- Replace `welcome` step with a "data sync" animation screen
- Pull all existing user data from `getProfile()` and `getEnhancedBudgetSettings()`
- Show animated cards sliding in with: Name, Height/Weight, BMI, BMR, TDEE, Daily Calories, Protein/Carbs/Fat targets, Health conditions, Skin concerns, Budget (daily/weekly/monthly), Per-meal budgets
- User taps "Continue" to proceed

**Phase C: Trim MealPlanOnboarding to ONLY missing questions** (MealPlanOnboarding.tsx)
- **REMOVE** these steps (already known from main onboarding): `goal`, `motivations`, `pace`, `activity`, `exercise`, `sleep`, `stress`, `medical`, `mealsPerDay`
- **KEEP** only steps that collect NEW meal-specific data:
  1. `dataSyncScreen` (new — animated data display)
  2. `dietary` (veg/non-veg/vegan — not asked in main onboarding)
  3. `allergies` (food-specific allergies)
  4. `cuisines` (cuisine preferences)
  5. `cooking` (cooking skill)
  6. `cookTime` (time per meal)
  7. `summary` (final review with ALL data combined)
- Remove `experience`, `challenges`, `equipment`, `eatingOut`, `snacking` — nice-to-have but user wants minimal questions
- In `finish()`, pull goal/pace/activity/health/skin from `getProfile()` instead of form fields

### Changes (2 files)

**File 1: `src/components/MealPlanOnboarding.tsx`**
- Reduce STEPS to: `['dataSync', 'dietary', 'allergies', 'cuisines', 'cooking', 'cookTime', 'summary']`
- Add `dataSync` step: animated screen showing all user profile data + budget data with count-up numbers and slide-in cards
- Remove all redundant steps and their form fields
- Update `finish()` to read goal, activity, health, skin, sleep, stress from `getProfile()`
- Update summary to show the complete combined data set

**File 2: `src/components/onboarding/MonikaGuide.tsx`**
- Update MEAL_PLANNER_MONIKA messages for new reduced step set

### Data Sync Animation Screen Design
```text
┌─────────────────────────┐
│  Hi {Name}! 👋          │
│  Here's your profile    │
│                         │
│  ┌─ Body ─────────────┐ │  ← slide in 0.1s
│  │ 170cm · 70kg       │ │
│  │ BMI: 24.2 (Normal) │ │
│  └────────────────────┘ │
│  ┌─ Metabolism ───────┐ │  ← slide in 0.2s
│  │ BMR: 1650 kcal     │ │
│  │ TDEE: 2558 kcal    │ │
│  │ Target: 2046 kcal  │ │
│  └────────────────────┘ │
│  ┌─ Macros ───────────┐ │  ← slide in 0.3s
│  │ P: 120g C: 230g    │ │
│  │ F: 57g             │ │
│  └────────────────────┘ │
│  ┌─ Health ───────────┐ │  ← slide in 0.4s
│  │ Conditions: None   │ │
│  │ Skin: Acne support │ │
│  └────────────────────┘ │
│  ┌─ Budget ───────────┐ │  ← slide in 0.5s
│  │ ₹7000/month        │ │
│  │ ₹233/day · ₹1633/wk│ │
│  │ BF:₹70 L:₹81 D:₹82│ │
│  └────────────────────┘ │
│                         │
│  [ Continue →         ] │
└─────────────────────────┘
```

### Flow After Changes
```text
Main Onboarding complete → user has all body/health/skin data
  ↓
Planner page → Budget tab first (if not done)
  ↓
Budget Onboarding: monthly budget + outside food + per-meal split
  ↓
Auto-switch to Meal Plan tab → MealPlanOnboarding
  ↓
Step 1: Data Sync Animation (shows everything system knows)
Step 2: Veg/Non-veg/Vegan?
Step 3: Food allergies?
Step 4: Cuisines?
Step 5: Cooking skill?
Step 6: Cooking time?
Step 7: Summary → Generate
```

Total questions: **5 screens** (down from 21). Only asks what's NOT already known.

