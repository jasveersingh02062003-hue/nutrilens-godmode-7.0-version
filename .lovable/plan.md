

# Implementation Plan: Kitchen Tab Merge + Plans Tab

## Overview

Two changes to the Planner's tab bar:
1. Merge "Groceries" and "Recipes" into a single **"Kitchen"** tab with a pill toggle
2. Add a new **"Plans"** tab for paid event plans

Final tab bar: **Budget | Meal Plan | Plans | Compare | Kitchen**

---

## Part 1: Kitchen Tab Merge

### What Changes

**`src/components/MealPlannerTabs.tsx`**

1. Change `TAB_ITEMS` from `['Budget', 'Meal Plan', 'Groceries', 'Compare', 'Recipes']` to `['Budget', 'Meal Plan', 'Plans', 'Compare', 'Kitchen']`

2. Create a new `KitchenTab` component inside the same file (or as a separate file `src/components/KitchenTab.tsx`) that contains:
   - A pill toggle at the top: `[🛒 Groceries]` and `[👩‍🍳 Recipes]`
   - Uses local state `kitchenSubTab: 'groceries' | 'recipes'`
   - Renders the existing `GroceriesTab` or `RecipesTab` based on selection
   - Pill toggle uses the same `motion.div layoutId` pattern as the main tabs for smooth animation

3. Update the render section:
   - Remove `{activeTab === 'Groceries' && ...}` and `{activeTab === 'Recipes' && ...}`
   - Add `{activeTab === 'Kitchen' && <KitchenTab plan={plan} />}`

4. The existing `GroceriesTab` and `RecipesTab` functions stay exactly as they are — just called from inside `KitchenTab` instead of directly from the main render

### Pill Toggle Design

```text
┌────────────────────────────────┐
│  [🛒 Groceries] [👩‍🍳 Recipes]  │  ← rounded-full bg-muted p-1
├────────────────────────────────┤
│  (selected sub-tab content)    │
└────────────────────────────────┘
```

- Active pill: `bg-card shadow-sm text-foreground font-bold`
- Inactive pill: `text-muted-foreground`
- Same spring animation as main tabs

---

## Part 2: Plans Tab (Placeholder + Structure)

### New Files

**`src/components/SpecialPlansTab.tsx`**
- Filter chips row: `[All] [Weight Loss] [Sugar Free] [Muscle]`
- Plan cards grid, each card showing:
  - Plan icon/emoji + name
  - Short description
  - Duration + price badge
  - Star rating (static for now)
  - "View Details →" tap target
- UGC/testimonial section at bottom (static mock data for now)
- Tapping a card opens `PlanDetailSheet`

**`src/components/PlanDetailSheet.tsx`**
- Bottom sheet (using existing Sheet component) with:
  - Plan name + description
  - "What's Included" checklist
  - Duration picker: pill buttons `[7] [14] [21] [30]` days
  - Target weight input (pre-filled from profile, editable)
  - Start date picker
  - Live preview section showing computed daily calories/protein/deficit based on user's profile data
  - Reviews section (static mock)
  - "Unlock Plan — ₹499" CTA button (non-functional for now, will wire to Stripe later)

**`src/lib/event-plan-service.ts`**
- Plan type definitions: `celebrity`, `sugar_cut`, `gym_fat_loss`, `gym_muscle_gain`
- Plan catalog with metadata (name, description, price, duration options, rules)
- `calculatePlanTargets(profile, targetWeight, duration)` — computes daily deficit using 7700 kcal/kg rule, clamps to min 1200 kcal
- `getActivePlan()` / `setActivePlan()` — localStorage CRUD for `nutrilens_active_plan`
- `isPlanActive()` — quick check used by other modules
- Safety validation: rejects targets requiring <1200 kcal/day or >1 kg/week loss

### Render Integration

In `MealPlannerTabs.tsx`:
```
{activeTab === 'Plans' && <SpecialPlansTab />}
```

---

## Part 3: Profile "Special Plans" Row

**`src/pages/Profile.tsx`**
- Add a new row in the settings list (after Subscription badge area):
  - Icon: `Zap` or `Crown`
  - Label: "Special Plans"
  - Sublabel: shows active plan status ("Sugar Cut — Day 5/21") or "Browse transformation plans"
  - Tap action: `navigate('/planner')` with Plans tab pre-selected (via URL param or state)

**`src/pages/MealPlanner.tsx`**
- Read a query param (e.g., `?tab=Plans`) to allow Profile to deep-link into the Plans tab

---

## Part 4: Active Plan Banner (Dashboard)

**`src/components/ActivePlanBanner.tsx`**
- Thin banner: shows plan name + day count + countdown
- Only renders when `isPlanActive()` returns true
- Placed above `CalorieRing` in Dashboard

**`src/pages/Dashboard.tsx`**
- Import and conditionally render `ActivePlanBanner` at the top of the dashboard content

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/MealPlannerTabs.tsx` | Modify — change TAB_ITEMS, add KitchenTab with pill toggle, add Plans tab render |
| `src/components/KitchenTab.tsx` | Create (optional — could be inline) — pill toggle wrapping GroceriesTab + RecipesTab |
| `src/components/SpecialPlansTab.tsx` | Create — plan cards grid with filters |
| `src/components/PlanDetailSheet.tsx` | Create — bottom sheet with plan config + purchase |
| `src/lib/event-plan-service.ts` | Create — plan catalog, target calculation, active plan state |
| `src/pages/Profile.tsx` | Modify — add "Special Plans" settings row |
| `src/pages/MealPlanner.tsx` | Modify — read tab query param for deep-linking |
| `src/pages/Dashboard.tsx` | Modify — add ActivePlanBanner |
| `src/components/ActivePlanBanner.tsx` | Create — countdown banner |
| Database migration | Create `event_plans` table (user_id, plan_type, config JSONB, status, dates) with RLS |

## Implementation Order

1. Kitchen tab merge (MealPlannerTabs restructure + pill toggle)
2. event-plan-service.ts (plan catalog + target calculation logic)
3. SpecialPlansTab + PlanDetailSheet UI
4. Profile row + deep-link wiring
5. ActivePlanBanner on Dashboard
6. Database migration for event_plans table

