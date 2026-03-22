

## Surgical Upgrade: Real-Time Calorie Engine Patch

### Summary
Two targeted changes — no rewrites. Append a real-time calorie/budget engine section to Monica's system prompt and inject pre-computed real-time status into the context so Monica never does her own math.

### Changes

**File 1: `src/lib/monika-actions.ts`**

Add `realTimeStatus` to `buildMonikaContext()` return object (after line 269, before `foodPreferences`):

- Import `calculateBurnBreakdown` from `@/lib/burn-service`
- Compute `effectiveBurn` from `log.burned` using `calculateBurnBreakdown`
- Compute today's totals via `getDailyTotals(log)`
- Add block:
```typescript
realTimeStatus: {
  baseTarget: profile?.dailyCalories || 0,
  totalConsumed: totals.eaten,
  totalBurned: effectiveBurn,
  totalAllowed: (profile?.dailyCalories || 0) + effectiveBurn,
  remainingCalories: (profile?.dailyCalories || 0) + effectiveBurn - totals.eaten,
  totalProteinConsumed: totals.protein,
  remainingProtein: (profile?.dailyProtein || 0) - totals.protein,
  dailyBudget: Math.round((budgetSettings.weeklyBudget || 0) / 7),
  totalSpent: todaySpending,
  remainingBudget: Math.round((budgetSettings.weeklyBudget || 0) / 7) - todaySpending,
  mealsLogged: ['breakfast','lunch','dinner','snack'].map(type => ({
    type,
    logged: (log.meals || []).some((m: any) => m.type === type),
    calories: (log.meals || []).filter((m: any) => m.type === type).reduce((s: number, m: any) => s + m.totalCalories, 0),
  })),
},
```

**File 2: `supabase/functions/monika-chat/index.ts`**

Append the real-time engine patch to the system prompt (before the `User Context:` line at the end). Content:

```
═══════════════════════════════════════
REAL-TIME CALORIE ENGINE (CRITICAL – OVERRIDE)
═══════════════════════════════════════

The context includes a "realTimeStatus" object with pre-calculated values.
ALWAYS use these numbers. NEVER compute your own.

Key fields:
- totalAllowed = baseTarget + totalBurned
- remainingCalories = totalAllowed - totalConsumed
- remainingBudget = dailyBudget - totalSpent

After EVERY meal log, tell the user:
"Consumed X kcal | Burned Y kcal | Z kcal remaining today"
"₹A spent of ₹B"

MISSED MEAL HANDLING:
When a meal slot has no entries and its time window has passed (check mealsLogged array):
- Do NOT silently redistribute
- Ask: "You missed [meal] (~X kcal). Want to: 1) Add to next meal 2) Spread across remaining 3) Ignore?"

AFTER ACTIVITY:
- Burns affect TOTAL DAILY allowance, NOT a single meal
- Say: "You burned X kcal. You can eat Y more today. Want meal suggestions?"

PARTIAL MEAL:
If user ate significantly less than their meal target, note the gap and offer options.

OVERCONSUMED:
If remainingCalories < 0: "You're X kcal over target today. No stress — we'll adjust tomorrow."

EXTREME REMAINING (>800 kcal after 7PM):
Suggest realistic dinner/snack options that fit.

PRIORITY ORDER (always):
1. Real consumption data (highest)
2. Remaining calories
3. Budget constraints
4. Meal plan targets (lowest — adapt to reality)

BUDGET SYNC:
Every calorie recalc must also reference remaining budget.
Food suggestions must align with BOTH remaining calories AND remaining budget.
```

### Files Modified
- `src/lib/monika-actions.ts` — add import + `realTimeStatus` block
- `supabase/functions/monika-chat/index.ts` — append engine patch to system prompt

### What Stays Unchanged
Everything else: dashboard UI, redistribution service, burn service, chat UI, streaming, voice, image analysis, action parsing.

