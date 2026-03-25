

## Plan: Create Test Account with Sample Data

### What This Does
Create a seed script that populates localStorage with realistic sample data spanning 14 days (2 weeks) so you can test the entire app — calorie correction engine, weekly/monthly summaries, meal plans, weight tracking, and all dashboard features.

### Approach
Instead of creating a real email account (which requires email verification), we'll add a **"Load Demo Data"** button on the Auth page that:
1. Creates a complete user profile in localStorage (skipping cloud auth)
2. Seeds 14 days of meal logs with realistic Indian food data (varying calories to create surplus/deficit patterns)
3. Seeds calorie bank state with adjustment history
4. Seeds weight entries showing gradual progress
5. Marks onboarding as complete
6. Redirects to Dashboard

### Demo Data Details

**Profile**: Priya, 28F, 65kg, goal: lose weight, target: 1500 kcal/day, protein: 75g

**14 days of meals** with realistic patterns:
- Some days on target (~1500 kcal)
- Some surplus days (~1800-2200 kcal) 
- Some deficit days (~1200 kcal)
- Mix of breakfast/lunch/dinner/snacks with Indian foods

**Calorie bank** pre-populated with adjustment plans from recent surplus days

**Weight entries** showing 65.5 → 64.8 kg over 2 weeks

### Files Changed
1. **`src/lib/seed-demo-data.ts`** (NEW) — Function that writes all demo data to localStorage
2. **`src/pages/Auth.tsx`** — Add a "Try Demo" button that calls the seed function and navigates to dashboard

### What You Can Test After Loading
- Dashboard: protein priority card, calorie ring, ⚖️ badge, time insights
- Progress page: weekly/monthly calorie balance history
- Meal history: 14 days of logged meals
- Weight chart: 2-week trend
- Calorie correction: active adjustment plan from surplus days
- Quick Log, skip meal, all existing features

