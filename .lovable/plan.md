

# Phase 8: Smart Market — Data Completeness + Quick Log Integration + Budget Planner Sync

## Gap Audit (Blueprint Section 4.1 Category Tree vs Current `foodDatabase`)

| Blueprint Item | Status | Action |
|---|---|---|
| **Toor Dal** | Missing | Add to `pes-engine.ts` |
| **Black Urad Dal** | Missing | Add |
| **Tofu** | Missing | Add |
| **Sprouts (Moong, Chana)** | Missing | Add |
| **Prawns** | Missing | Add |
| **Ghee** | Missing | Add |
| **Buttermilk/Chaas** | Missing | Add |
| **Ragi, Jowar, Bajra** (millets) | Missing | Add |
| **Wheat Atta** | Missing | Add |
| **Basmati Rice** | Missing | Add |
| **Curry Leaves** | Missing | Add |
| **Fish varieties (Rohu, Pomfret, Surmai)** | Only generic "Fish Curry" exists | Add raw fish entries |
| **Quick Log shows NO PES/price** after logging (Section 6.3) | Missing | Add PES insight toast to QuickLog |
| **Budget Planner uses static costs** not live prices (Section 6.3) | `estimateLiveCost` NOT imported in BudgetPlannerTab | Wire live pricing into budget summary |
| **Supplements vs food cost comparison** (Section 6.3) | Missing | Defer (P3) |

## Plan — 3 Steps

### Step 1: Expand foodDatabase with 20 Missing Items
Add to `src/lib/pes-engine.ts` foodDatabase array:
- **Dals:** Toor Dal (50g), Black Urad Dal (50g)
- **High Protein:** Tofu (100g), Moong Sprouts (100g), Chana Sprouts (100g), Prawns (100g)
- **Dairy:** Ghee (10g), Buttermilk/Chaas (200ml)
- **Grains/Millets:** Wheat Atta (50g), Basmati Rice (50g), Ragi (50g), Jowar (50g), Bajra (50g)
- **Fish:** Rohu (100g), Pomfret (100g), Surmai (100g)
- **Herbs:** Curry Leaves (5g)

Also update `market-service.ts` emoji map for new items (prawn, tofu, ragi, etc.)

### Step 2: Quick Log PES Toast
In `src/pages/QuickLog.tsx`, after a meal is successfully logged (the feedback state), show a PES insight toast similar to LogFood.tsx:
- Import `evaluateFood` from `pes-engine.ts`
- On log completion, calculate PES for the logged meal
- Show toast: "PES {score} — You spent ₹{cost}, {protein}g protein"
- Non-blocking, uses existing `feedbackData` state

### Step 3: Wire Live Prices into BudgetPlannerTab
In `src/components/BudgetPlannerTab.tsx`:
- Import `estimateLiveCost` from `live-price-service`
- In the daily budget summary section, add an async effect to fetch live cost estimates for the user's planned meals
- Show "Live price estimate: ₹{X}" alongside the static budget calculation
- Non-blocking: if live price lookup fails, just show existing static values
- Add `// FIRECRAWL_HOOK` comment for future live data integration

## Files Changed

| File | Action |
|------|--------|
| `src/lib/pes-engine.ts` | Modified — add 20 missing food items |
| `src/lib/market-service.ts` | Modified — add emoji mappings for new items |
| `src/pages/QuickLog.tsx` | Modified — add PES insight toast after log |
| `src/components/BudgetPlannerTab.tsx` | Modified — wire `estimateLiveCost` for live pricing |

## Technical Notes
- No API/Firecrawl calls — all static data + existing `getLivePrice` fallback chain
- foodDatabase grows from ~80 items to ~100 items
- QuickLog PES toast reuses same `evaluateFood()` function from pes-engine
- BudgetPlannerTab integration is additive — existing static calculations remain as fallback
