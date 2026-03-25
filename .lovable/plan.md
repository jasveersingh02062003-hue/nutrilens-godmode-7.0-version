

## Required Fixes: UX Improvements, Trust Feedback, and Smart Logging

### Overview
12 targeted fixes across Dashboard, logging, and meal components to improve user trust, add missing feedback loops, and handle edge cases. No architectural rewrites.

### Files to Create

**1. `src/components/WhyAdjustedModal.tsx`** (Fix 2: Trust Feedback)
- Modal showing why the calorie target changed, using data from `getAdjustmentPlan()` and `getDailyBalances()`.
- Shows: "You ate +700 kcal on Monday. We're spreading it across 4 days: -175 kcal/day."
- Renders each plan entry as a row with date and adjustment amount.

**2. `src/components/MissedDayPrompt.tsx`** (Fix 1: Missed Logging)
- Simple modal: "Looks like you missed logging yesterday. Would you like to quickly add it or skip?"
- "Log Yesterday" navigates to `/log-food?date=yesterday`; "Skip" dismisses.
- Triggered on Dashboard mount if yesterday has 0 meals logged.

**3. `src/components/QuickLogSheet.tsx`** (Fix 11: Quick Log)
- Sheet with a free-text input: "2 rotis + sabzi" → parses common Indian food shortcuts using the existing `searchIndianFoods` database.
- Maps recognized items, creates FoodItems with `confidenceScore: 0.6` and a `quickLog: true` flag.
- Accessible from a "Quick Log" button on the Dashboard.

### Files to Modify

**4. `src/pages/Dashboard.tsx`** (Fixes 1, 2, 5, 8, 9, 10)
- **Fix 1**: On mount, check if yesterday has 0 meals → show `MissedDayPrompt`.
- **Fix 2**: Make the ⚖️ correction badge clickable → opens `WhyAdjustedModal`.
- **Fix 5**: Swap visual order: move protein MacroCard ABOVE CalorieRing or make it larger. Display protein remaining prominently: "💪 60g protein remaining" in a dedicated card above the calorie ring.
- **Fix 8**: Add time-based insight card. Morning rule: if yesterday's dinner was >40% of daily calories, show "Light breakfast suggested." Evening rule: if protein remaining >40g after 6 PM, show "Try eggs or soya for quick protein."
- **Fix 9**: Add grocery overspend banner using `getBudgetSummary()` — if projected weekly spend >budget, show: "You're overspending this week. Switch 2 meals to save ₹200." Links to grocery page.
- **Fix 10**: On day 3 of the week, show toast "You're doing better than 70% of users!" On day 5: "Stay consistent 2 more days → unlock streak." Simple day-of-week check.
- **Fix 11**: Add "Quick Log" floating button that opens `QuickLogSheet`.

**5. `src/pages/LogFood.tsx`** (Fixes 4, 6)
- **Fix 4**: Before saving, run a sanity check on each item: if `calories < expectedMin * 0.3` or `calories > expectedMax * 2`, show inline warning with "Fix" (opens edit) and "Ignore" buttons. Use `getFoodByName()` to get expected range.
- **Fix 6**: After saving a meal, show completion toast with protein progress: `"Breakfast complete ✅ Protein goal 25% done 💪"`. Compute `(totalProteinEaten / proteinTarget * 100)`.

**6. `src/components/TodayMeals.tsx`** (Fix 7: Skip Meal)
- Add a "Skip" button to each pending meal slot.
- On skip, call existing `skipMeal()` from `calorie-engine.ts` (already imported).
- Show toast: "Meal skipped. Remaining meals adjusted."

**7. `src/components/CalorieRing.tsx`** (Fix 5: Protein Priority)
- Add a protein remaining line below the ring's "kcal remaining" display: "💪 Xg protein left" in a prominent style.
- Accept `proteinRemaining` as a new prop.

**8. Toast Message Updates** (Fix 12: Emotional Tone)
- In `calorie-correction.ts` `getCorrectionMessage()`: Update messages:
  - Surplus: "Big meal today 😄 We've got you covered for the next few days."
  - Deficit: "Light day — we'll add a little extra tomorrow to keep your energy up."
- In `LogFood.tsx` save toast: Use warm tone.
- In `TodayMeals.tsx` skip toast: "No worries! We've adjusted your remaining meals."

**9. `src/components/PESBadge.tsx`** (Fix 3: PES Education)
- Add a one-line comparative insight below the PES score when displayed in meal cards.
- Simple rule: if PES < 0.3, show "Try [higher PES alternative] for 2x more protein per ₹."
- Data source: existing `foodDatabase` from `pes-engine.ts`.

### Implementation Priority
1. Fixes 5, 6, 12 (visual priority + rewards + tone) — highest user impact, smallest code changes
2. Fixes 2, 7 (trust modal + skip meal) — medium effort, high trust value
3. Fixes 1, 4, 8 (missed day + validation + time intelligence) — medium effort
4. Fixes 3, 9, 10, 11 (PES education + grocery alerts + retention + quick log) — additive features

