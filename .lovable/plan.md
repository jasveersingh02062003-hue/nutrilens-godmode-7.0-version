

# Plan: Full System Sync Audit & Alignment

## Issues Found

### 1. Supplement calories missing from correction engine (CRITICAL)

`getDailyTotals()` in `store.ts` (line 259-264) includes supplement calories in `eaten`. But `computeDailyCalories()` in `calorie-correction.ts` (line 195-198) only sums meal items — supplements are excluded.

This means:
- Dashboard shows correct total (via `getDailyTotals`)
- Correction engine sees a **lower** number → under-corrects surpluses
- Conservation identity `Σ(diff) + Σ(adj) ≈ 0` operates on wrong data

**Fix**: Update `computeDailyCalories` to include supplements, matching `getDailyTotals`.

---

### 2. Diagnostic tests use stale math (DRIFT RISK)

`calorie-correction-diagnostic.ts` replicates correction logic locally with different constants:
- Uses `capPct = 0.20` (20% of base) instead of the engine's `MAX_ADJUSTMENT_PER_DAY = 300`
- Uses `recoveryFactor = 0.40` instead of the engine's `0.3`
- Uses `buildMockPlan` with a percentage-based cap, not the fixed ±300 clamp

These tests will pass with wrong math, giving false confidence.

**Fix**: Rewrite the 3 diagnostic tests to use the actual engine functions (`computeAdjustmentMap`, `computeBreakdownForDate`) with mock data, not replicated local math.

---

### 3. `getMealLogged` uses stored totals instead of recomputing (DATA INTEGRITY)

`meal-targets.ts` line 48 uses `m.totalCalories` (stored value) instead of recomputing from items. The `store.ts` comment on line 244 explicitly warns against this: "SAFETY: Always recompute totals from items."

**Fix**: Recompute from items in `getMealLogged`, same pattern as `getDailyTotals`.

---

### 4. `calorie-engine.ts` labels adjusted target as `baseTarget` (NAMING CONFUSION)

In `recalculateDay` (line 127), `baseTarget` is actually the **adjusted** target from `getAdjustedDailyTarget()`. This violates the separation of concerns rule:
- `baseTarget` = original profile target (truth)
- `adjustedTarget` = after correction engine (UI only)

The variable name is misleading — downstream code that reads `dayState.baseTarget` thinks it's the original, but it's already adjusted.

**Fix**: Rename to `adjustedTarget` in `DayState` and `recalculateDay`, or add a separate `originalTarget` field from `profile.dailyCalories`.

---

### 5. `console.error` fires unconditionally in validation (NOISE)

`validateAdjustmentIntegrity` (line 818) always calls `console.error` even when validation passes. Should be `console.debug` for passing cases.

**Fix**: Change line 818 to `console.debug` (or only log on failure).

---

## Changes by File

| File | Changes |
|------|---------|
| `src/lib/calorie-correction.ts` | Add supplement calories to `computeDailyCalories`; fix validation log level |
| `src/lib/calorie-correction-diagnostic.ts` | Rewrite 3 tests to use actual engine functions with mock `DailyBalanceEntry[]` and `MAX_ADJUSTMENT_PER_DAY = 300` |
| `src/lib/meal-targets.ts` | Recompute `getMealLogged` from items instead of stored totals |
| `src/lib/calorie-engine.ts` | Rename `baseTarget` → `adjustedTarget` in `DayState` interface; add `originalTarget` field from profile |
| `src/pages/Dashboard.tsx` | Update references from `dayState.baseTarget` to `dayState.adjustedTarget` |
| Any other file using `dayState.baseTarget` | Update references |

