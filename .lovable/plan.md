

# Intelligent Supplement Tracking & Protein Gap Engine

## Current State
The app already has:
- **SupplementEntry** type in `store.ts` with full macro data (calories, protein, carbs, fat)
- **SupplementLogSheet** for manual logging with a database of 20+ supplements
- **SupplementsCompact** card on Dashboard for quick add/view
- **Onboarding step 22** that captures supplement preferences (multi-select chips: whey, creatine, multivitamin, etc.) — but only stores names as `string[]`, no frequency/cost data
- **Protein Rescue System** that triggers after 6 PM when protein gap > 40g
- **Weather Nudge Service** with existing protein gap detection and food suggestions
- **Redistribution Service** for reallocating macros across remaining meals

What's **missing**: No intelligence layer connecting supplement intake to the calorie/macro engine, no adherence tracking, no budget integration, no gap-based supplement suggestions, no upsell logic.

---

## Architecture: Intelligence-First, Not Check-In-First

Per the critique, we avoid a daily "did you take supplements?" card. Instead, we build a **Protein Gap Engine** that infers when supplements would help and suggests them contextually.

---

## Step 1: Extend Data Models

**`src/lib/store.ts`** — Add to `UserProfile`:
```typescript
supplementPrefs?: {
  items: Array<{
    name: string;
    frequency: 'daily' | 'workout_days' | 'occasional';
    costPerServing: number;
    proteinPerServing?: number;
  }>;
  stats: { totalCost: number; adherencePercent: number; streak: number };
};
```

No change to `DailyLog` — supplements are already tracked via `SupplementEntry[]`.

**`src/lib/onboarding-store.ts`** — Add `supplementPrefs` to `OnboardingData.lifestyle` and wire into `saveOnboardingData()`.

**`src/lib/profile-mapper.ts`** — Map `supplementPrefs` through existing `conditions` JSONB.

---

## Step 2: Enhance Onboarding Supplement Step

**`src/pages/Onboarding.tsx`** — Step 22 currently captures supplement names only. Extend:
- After multi-select, for each selected supplement show:
  - Frequency picker: Daily / Workout days / Occasional
  - Cost per serving (₹) — optional number input
  - Protein per serving (g) — auto-filled for whey/casein/plant protein from `SUPPLEMENTS_DB`
- Store enriched data in `formState.supplementPrefs` instead of flat `string[]`
- Wire into `OnboardingData.lifestyle.supplementPrefs`

---

## Step 3: Create Supplement Intelligence Service

**New file: `src/lib/supplement-service.ts`**

Core functions:
- `getProteinGap(profile, dailyLog)` — `targetProtein - consumedProtein` (from meals + logged supplements)
- `shouldSuggestSupplement(profile, dailyLog, hour)` — Returns suggestion when:
  - Protein gap > 20g AND hour >= 14 (afternoon)
  - OR protein gap > 30g AND hour >= 11 (midday)
  - User has whey/casein in their `supplementPrefs`
- `getSupplementCostEfficiency(profile)` — Calculates ₹/gram protein from supplements vs whole foods
- `getSupplementAdherence(profile, logs, days)` — Days with ≥1 supplement logged / days where frequency matches
- `updateSupplementStats(profile)` — Recompute adherence, streak, totalCost from logs
- `adjustRemainingMealsForSupplement(profile, dailyLog)` — After supplement logged, recalculate remaining protein needed from whole foods and return adjusted meal targets (uses existing redistribution patterns)

---

## Step 4: Integrate Into Calorie/Macro Engine

**`src/lib/calorie-correction.ts`**
- In `computeAdjustedTarget()`: After computing base + gym bonus, check if supplements with calories were logged today. Add their caloric contribution to `actual` consumed (they're already in `dailyLog.supplements`), NOT subtract from target. The existing `getDailyTotals()` should already sum supplement calories — verify and fix if not.

**`src/lib/meal-suggestion-engine.ts`**
- Before scoring recipes, compute `effectiveProteinTarget = targetProtein - supplementProteinLogged`
- Use `effectiveProteinTarget` for remaining meal scoring
- If user took creatine today, boost hydration nudge priority

---

## Step 5: Protein Gap Nudge Card

**New file: `src/components/ProteinGapNudgeCard.tsx`**
- Replaces the "did you take supplements?" check-in pattern
- Shows only when `shouldSuggestSupplement()` returns true
- Content: "You're {gap}g short on protein. A whey scoop (₹{cost}) fixes it instantly."
- One-tap action: logs the supplement (using existing `addSupplement()`) and recalculates remaining meals
- Also shows cost comparison: "That's ₹{wheyPerGram}/g vs ₹{chickenPerGram}/g from chicken"
- Dismissible, doesn't reappear until next relevant gap

---

## Step 6: Budget Integration

**`src/lib/budget-service.ts`**
- In `getBudgetSummary()`, add a `supplements` category to `byCategory`
- Calculate from daily logs: sum `costPerServing` for each logged supplement that matches a `supplementPrefs` item
- Show in `BudgetInsightsCard` as a separate line

---

## Step 7: Supplement Consistency Section in Progress

**`src/components/SupplementConsistencySection.tsx`** (new)
- Added to `Progress.tsx` for users with `supplementPrefs`
- Shows: adherence % (ring), monthly cost total, streak
- Weekly bar chart of supplements taken vs planned
- Uses `getSupplementAdherence()` from supplement-service

---

## Step 8: Premium Upsell — Supplement Optimization

**`src/components/SupplementUpsellCard.tsx`** (new)
- Triggered when: user logs supplements for 7+ consecutive days AND takes 2+ different supplements
- Content: "Unlock Supplement Stack Guide 💊" — timing optimization, stacking, dosage calculator
- Links to Plans tab with `supplement_optimization` plan

**`src/lib/event-plan-service.ts`**
- Add `'supplement_optimization'` to `PlanType`
- Add catalog entry: ₹99/month, features: timing guide, stacking, loading phases, partner discounts

---

## Step 9: Dashboard Integration

**`src/pages/Dashboard.tsx`**
- Import and render `ProteinGapNudgeCard` (conditionally, based on `shouldSuggestSupplement()`)
- Import and render `SupplementUpsellCard` (conditionally)
- Place after gym cards, before Today's Meals

---

## Technical Summary

| Action | File | Type |
|--------|------|------|
| Add `supplementPrefs` to UserProfile | `store.ts` | Modify |
| Wire supplement prefs in onboarding | `onboarding-store.ts`, `Onboarding.tsx` | Modify |
| Map to cloud JSONB | `profile-mapper.ts` | Modify |
| Protein gap engine + adherence | `supplement-service.ts` | **New** |
| Adjust consumed not target | `calorie-correction.ts` | Modify |
| Effective protein for meal scoring | `meal-suggestion-engine.ts` | Modify |
| Context-driven gap nudge | `ProteinGapNudgeCard.tsx` | **New** |
| Supplement budget category | `budget-service.ts` | Modify |
| Progress consistency section | `SupplementConsistencySection.tsx` | **New** |
| Upsell card + plan catalog | `SupplementUpsellCard.tsx`, `event-plan-service.ts` | **New** + Modify |
| Dashboard wiring | `Dashboard.tsx` | Modify |

No database migration. All data flows through existing JSONB columns.

