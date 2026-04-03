
Problem understood: the breakfast calories are already being auto-shifted by the engine into lunch/dinner/snacks, but the breakfast detail sheet still offers redistribution actions and the manual apply flow adds another redistribution on top. That is why targets jump again and totals become inflated.

What is happening now
- The daily engine already auto-redistributes missed meal calories by recalculating pending slot targets in `src/lib/calorie-engine.ts`.
- The meal detail UI separately exposes:
  - “Smart Redistribute”
  - “Quick → Lunch”
  - “Apply Redistribution”
- Those UI actions use `src/lib/redistribution-service.ts` and `src/lib/meal-targets.ts` to add explicit per-meal adjustments.
- Result: one missed breakfast gets counted twice:
  1. once by the engine’s automatic pending-slot redistribution
  2. again by explicit redistribution adjustments
- The breakfast detail screen correctly hides the action buttons only if `isRedistributed(date, mealType)` is true, but that flag is only set after the manual redistribution flow. So an auto-redistributed missed meal still looks “missed and actionable,” which is the core UX bug.

What to build
1. Make engine auto-redistribution the single source of truth for missed meals
- Keep the calorie engine’s automatic redistribution behavior.
- Stop offering manual redistribute actions for a meal that is already auto-redistributed by the engine.
- Treat “missed + no logged items” as already redistributed for UI purposes when remaining meals exist and the engine has reweighted targets.

2. Split “auto redistribution state” from “manual override state”
- Add a clear state model in the redistribution layer:
  - auto redistributed
  - manual override applied
  - not redistributed
- Use this to drive banners, CTA visibility, and undo behavior.
- This prevents the UI from assuming “not manually flagged” means “not redistributed.”

3. Replace the breakfast detail CTA with a read-only summary
- In `MealDetailSheet`, when breakfast is missed and auto-redistributed:
  - remove “Smart Redistribute”
  - remove “Quick → Lunch”
  - remove the apply flow
  - show summary only:
    - “Breakfast was automatically redistributed”
    - lunch + dinner + snacks breakdown
- This matches the behavior you want in the screenshots.

4. Derive the summary from actual engine targets, not a second redistribution pass
- Build the displayed breakdown from the auto-redistributed result already reflected in current meal targets/day state.
- Do not recompute and reapply a new redistribution plan in the sheet.
- This ensures the displayed numbers exactly match lunch/dinner/snacks targets on the dashboard.

5. Add a true “Undo auto redistribution” flow
- If user chooses to remove redistribution:
  - restore the missed meal target to breakfast
  - remove the extra amounts from lunch/dinner/snacks
  - keep totals conserved
- This should be a dedicated reversal of the auto-redistribution state, not the current manual-adjustment subtraction logic only.

6. Auto-undo when user logs food into a previously redistributed meal
- Project memory says redistributed slots must auto-undo when the user actually logs that meal.
- Add this in `MealDetailSheet` item-save flow:
  - before saving food for a redistributed breakfast, reverse redistribution first
  - then log the food
- This avoids stale redistributed state and prevents target corruption.

7. Remove the old double-application paths
- Deprecate or guard these paths so they cannot stack on top of auto redistribution:
  - `redistributeMissedMeal(...)` quick flow in `meal-targets.ts`
  - `applyRedistribution(...)` from `SmartRedistributionSheet` when meal is already auto-redistributed
- Keep manual customization only if you still want an advanced override mode; if so, it must first clear the auto state before applying custom allocations.

8. Fix the dashboard meal copy
- In `TodayMeals`, keep:
  - missed meal shows “Redistributed”
  - receiving meals show “+331 from breakfast”
- Ensure the breakfast card opens a summary/details screen only, not a redistribution action screen.
- Update wording to explicitly say “Automatically redistributed” to reduce confusion.

Files to update
- `src/lib/calorie-engine.ts`
  - expose enough information to know when a missed meal has already been auto-redistributed
  - possibly include source breakdown data
- `src/lib/redistribution-service.ts`
  - add explicit auto/manual redistribution state
  - add reversal helpers
  - align undo behavior with auto redistribution
- `src/components/MealDetailSheet.tsx`
  - remove redistribution CTAs for already auto-redistributed meals
  - show read-only summary banner
  - auto-undo on meal logging
- `src/components/SmartRedistributionSheet.tsx`
  - block apply when auto redistribution already exists, or convert it into an override flow
- `src/components/TodayMeals.tsx`
  - align status/copy with the new single-source redistribution logic
- `src/lib/meal-targets.ts`
  - either retire `redistributeMissedMeal` for missed-meal auto flows or restrict it to explicit override scenarios only

Expected result after fix
- Breakfast missed once
- Lunch/dinner/snacks already receive the redistributed calories once
- Opening breakfast does not show redistribute/apply again
- No calorie inflation
- User can still view where calories went
- If they log breakfast later, redistribution is reversed first, then breakfast becomes normal again

Technical note
Right now the architecture has two competing systems:
- engine-level implicit redistribution (`recalculateDay`)
- adjustment-level explicit redistribution (`applyRedistribution` / `redistributeMissedMeal`)
The safest fix is to make one canonical path for missed-meal redistribution and convert the other path into either:
- display-only summary
or
- explicit override after clearing the first state

This is the root cause of the problem you described.
