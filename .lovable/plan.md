

## Surgical Upgrade: Real-Time Calorie Engine + Monica System Prompt Patch

### Summary
Two changes: (1) Append a "real-time calorie/budget/redistribution" patch to Monica's system prompt so she gives accurate remaining-calorie math and handles missed meals / activity burns correctly. (2) Enhance the context builder to send computed real-time totals (total allowed, remaining, budget remaining) so Monica never calculates wrong.

### Why This Is Enough
The app's **frontend calorie math is already correct** — `CalorieRing` uses `eaten - effectiveBurn` with the burn service, `SmartAdjustmentCard` handles redistribution, and `RedistributionService` handles missed meals with user confirmation. The user's concern is about **Monica giving wrong numbers**, not the dashboard itself. The fix is to:
1. Pre-compute the real-time totals in the context builder
2. Tell Monica to USE those numbers, never compute her own

### Changes

**File 1: `src/lib/monika-actions.ts` – Add computed totals to context**

In `buildMonikaContext()`, after getting `totals`, add a new `realTimeStatus` block:

```typescript
realTimeStatus: {
  baseTarget: profile.dailyCalories,
  totalConsumed: totals.eaten,
  totalBurned: effectiveBurn,  // from calculateBurnBreakdown
  totalAllowed: profile.dailyCalories + effectiveBurn,
  remainingCalories: profile.dailyCalories + effectiveBurn - totals.eaten,
  remainingProtein: profile.dailyProtein - totals.protein,
  remainingBudget: dailyBudget - todaySpending,
  mealsLogged: ['breakfast','lunch','dinner','snack'].map(type => ({
    type,
    logged: log.meals.some(m => m.type === type),
    calories: log.meals.filter(m => m.type === type).reduce((s,m) => s + m.totalCalories, 0),
  })),
}
```

Import `calculateBurnBreakdown` from burn-service and compute effectiveBurn from `log.burned`.

**File 2: `supabase/functions/monika-chat/index.ts` – Append patch to system prompt**

Add the following section at the end of the system prompt (before the User Context line):

```
═══════════════════════════════════════
REAL-TIME CALORIE ENGINE (CRITICAL – OVERRIDE)
═══════════════════════════════════════

The context includes a `realTimeStatus` object with pre-calculated values.
ALWAYS use these numbers. NEVER compute your own.

Key fields:
- totalAllowed = baseTarget + totalBurned
- remainingCalories = totalAllowed - totalConsumed
- remainingBudget = dailyBudget - totalSpent

After EVERY meal log, tell the user:
"You've consumed Xkcal | Burned Ykcal | Z kcal remaining today"
"₹A spent of ₹B"

MISSED MEAL HANDLING:
When a meal slot has no entries and its time has passed:
- Do NOT silently redistribute
- Ask: "You missed [meal] (~X kcal). Want to: 1) Add to next meal 2) Spread across remaining 3) Ignore?"

AFTER ACTIVITY:
- Burns affect TOTAL DAILY allowance, NOT a single meal
- Say: "You burned X kcal. You can eat Y more today. Want meal suggestions?"

PARTIAL MEAL:
If user ate less than planned for a meal, note the gap and ask:
"You have ~X kcal unused from [meal]. Move to snacks/dinner, or ignore?"

OVERCONSUMED:
If remainingCalories < 0, say: "You're X kcal over target today. No stress — we'll adjust tomorrow."

EXTREME REMAINING (>800 after 7PM):
Suggest realistic options: "You still have X kcal left. Here are light dinner ideas that fit."
```

### Files Modified
- `src/lib/monika-actions.ts` – Add `realTimeStatus` block + import burn service
- `supabase/functions/monika-chat/index.ts` – Append engine patch to system prompt

### What Stays Unchanged
- All dashboard UI (CalorieRing, MacroCard, SmartAdjustmentCard)
- Redistribution service, burn service, meal targets
- All existing action block formats
- Chat UI, streaming, voice, image analysis

