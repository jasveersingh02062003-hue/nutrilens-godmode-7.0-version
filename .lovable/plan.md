

# Plan: Realistic Stress-Test Demo Data for Calorie Engine

## What Changes

Replace the current demo data seeding with the user-provided 30-day realistic dataset that stress-tests the deterministic calorie correction engine with binge days, recovery days, and weekend spikes.

## Changes

### 1. `src/lib/seed-demo-data.ts` — Rewrite core data

**Profile**: Update `generateProfile()` to use Riya Sharma's profile:
- `name: 'Riya Sharma'`, `dailyCalories: 1800`, `dailyProtein: 110`, `dailyCarbs: 200`, `dailyFat: 60`, `goal: 'lose'`, `targetWeight: 52`, `weightKg: 62`

**Daily Logs**: Replace the pattern-based `generateDayMeals(daysAgo)` approach. Instead, define the 29 fixed data points (Feb 25 – Mar 25) as an array of `{ date, actualCalories }` with `targetCalories: 1800`. For each entry, generate meals that sum to the specified `actualCalories` using the existing meal food items, distributing across breakfast/lunch/snack/dinner proportionally.

**Calorie Bank**: Replace `generateCalorieBank()` with a function that:
1. Builds `dailyBalances` from the 29 fixed entries
2. Sequentially computes and freezes `adjustedTarget` for each past day using `computeAdjustedTarget` — this ensures the deterministic engine's effectiveTarget logic is exercised correctly during seeding
3. Stores the final bank state with frozen targets

**Meal Planner Profile + Onboarding**: Update to match Riya's profile (1800 kcal, 110g protein, etc.)

**Weight History**: Adjust starting weight to 62 kg to match Riya's profile.

### 2. `seedDemoData()` — Sequential freeze loop

After writing all daily logs, run a sequential freeze pass:
```typescript
// Sequential freeze: compute adjustedTarget for each past day in order
const balances: DailyBalanceEntry[] = [];
for (const entry of DATASET) {
  // Compute adjustedTarget using all balances before this date
  const adjustedTarget = computeAdjustedTarget(entry.date, 1800, balances);
  const diff = entry.actualCalories - adjustedTarget;
  balances.push({
    date: entry.date,
    target: 1800,
    actual: entry.actualCalories,
    diff,
    bankAfter: balances.reduce((s, b) => s + b.diff, 0) + diff,
    adjustedTarget,
  });
}
```
Store the resulting `balances` array (with frozen `adjustedTarget` on each past day) as the calorie bank state.

### 3. Files modified

| File | Change |
|------|--------|
| `src/lib/seed-demo-data.ts` | Replace profile, dataset, calorie bank generation, and add sequential freeze logic |

No other files need changes — the engine, calendar, and UI components already consume the data correctly.

