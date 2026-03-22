

## Audit: 10 Stress-Test Scenarios — Current System Status

### Summary
The user asked me to check (not change) whether the existing system handles 10 real-world edge cases. Here's the verdict for each.

---

### Scenario-by-Scenario Assessment

| # | Scenario | Status | Explanation |
|---|----------|--------|-------------|
| 1 | User skips 2 meals | ✅ Covered | System prompt has "MISSED MEAL HANDLING" — asks user to add to next meal, spread, or ignore. `realTimeStatus.mealsLogged` tracks which meals were logged. |
| 2 | User overeats early | ✅ Covered | `remainingCalories` is pre-computed. Prompt has "OVERCONSUMED" rule: "You're X kcal over target today. No stress — we'll adjust tomorrow." |
| 3 | Workout after dinner | ✅ Covered | Prompt says "Burns affect TOTAL DAILY allowance, NOT a single meal." `totalAllowed = baseTarget + totalBurned`. After activity, suggests recovery meal. |
| 4 | Multiple small snacks | ✅ Covered | All items logged via action blocks accumulate into `totalConsumed`. `mealsLogged` shows snack totals. Monica reports aggregate status after each log. |
| 5 | User doesn't enter cost | ✅ Covered | Prompt rule: "ALWAYS ASK FOR COST if not provided… Do NOT generate the action block until you have the cost (or user says skip/don't know)." |
| 6 | User enters wrong food values | ⚠️ Partial | `food-validation.ts` exists with calorie density checks and macro validation, BUT it's not called during Monica's `executeAction()`. The AI model is instructed to estimate nutrition accurately (IFCT2017), but there's **no programmatic validation** on the action block values before logging. The AI might catch obvious errors via its knowledge, but won't reliably flag "1 plate biryani = 300 kcal." |
| 7 | Low budget + high protein | ✅ Covered | Context includes `remainingBudget` and `remainingProtein`. Prompt says "Food suggestions must align with BOTH remaining calories AND remaining budget." AI has Indian food knowledge to suggest eggs, soya, dal. |
| 8 | User skips logging whole day | ✅ Covered | `mealsLogged` array shows all slots as `logged: false`. Prompt has "EXTREME REMAINING" rule for >800 kcal after 7PM, and missed meal handling. When user opens chat, Monica sees empty log and can proactively prompt. |
| 9 | Under-eating | ✅ Covered | Prompt has "PARTIAL MEAL" rule. If remaining is high, it suggests balancing. No "good job" for under-eating — Monica is instructed to note gaps. |
| 10 | Double activity bug | ⚠️ Partial | `totalBurned` is correctly computed as `sum(all activities)` via `calculateBurnBreakdown`. The weighted confidence system in `burn-service.ts` applies correctly. However, there's **no duplicate detection** — if a user logs "Gym 280 kcal" twice within 10 minutes, it's accepted without confirmation. |

---

### Issues Found (2 items)

**Issue A: No validation on Monica's meal action blocks (Scenario 6)**
- `food-validation.ts` has `validateFoodItem()` and `validateMealTotals()` but they're never called in `executeAction()` in `monika-actions.ts`
- If the AI halluccinates "biryani = 300 kcal", it gets logged without any check
- Fix: Call `validateFoodItem()` on each item in the `log_meal` action before saving, and surface warnings to the user

**Issue B: No duplicate activity detection (Scenario 10)**  
- `executeAction()` for `log_activity` just saves directly — no check for recent similar activities
- Fix: Before saving, check if an activity with the same type was logged in the last 15 minutes, and if so, return a warning instead of auto-logging

---

### Verdict
**8 of 10 scenarios are fully handled** by the current system prompt + `realTimeStatus` context. The 2 gaps are both in `executeAction()` in `monika-actions.ts` — missing validation on meal data and missing duplicate activity detection.

No changes needed to the system prompt. The prompt logic is solid for all 10 scenarios.

Want me to fix the 2 issues (add validation to meal logging + duplicate activity detection)?

