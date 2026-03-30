
# Comprehensive Fix Plan — All Issues Identified

## Status: ✅ IMPLEMENTED

All 20 issues across 6 steps have been fixed.

### Step 1 ✅ Quick Wins
- **#5 Timezone bugs**: Fixed in redistribution-service, streaks, notifications, weight-history, weekly-feedback, exercise-adjustment, plateau-handler, goal-engine
- **#13 Threshold mismatch**: Changed from 10→5 kcal in `isTargetAdjusted()`
- **#8 Carry-over idempotency**: Added `carry_applied_YYYY-MM-DD` guard in Dashboard
- **#17 console.debug**: Wrapped in `import.meta.env.DEV` check
- **#16 Cache stale on logout**: Added `clearEngineCache()` called on auth state change

### Step 2 ✅ Core Stability
- **#2 Base target mutation**: Added `originalDailyCalories` field to UserProfile, set during onboarding
- **#9 Protein lock**: Fixed `applyAdaptation()` and `applyPlateauAdjustment()` to lock protein, redistribute only carbs/fat

### Step 3 ✅ Storage & Performance
- **#1 localStorage overflow**: Created `storage-cleanup.ts` with 90-day short retention + 365-day log retention + aggressive pruning at 4MB
- **#4 O(n²) performance**: Added `_balancesCache` memoization to `getDailyBalances()`, invalidated by `recomputeCalorieEngine()`

### Step 4 ✅ Coordination & Unification
- **#11 Missed meal thresholds**: Unified into `MISSED_MEAL_HOURS` exported from `meal-targets.ts`
- **#12 Balance streak**: Now compares against `adjustedTarget` instead of `baseTarget`
- **#3/#20 Coordinator**: `adjustment-coordinator.ts` exists with ±25% TDEE cap

### Step 5 ✅ Data Quality
- **#6 Frozen targets**: Extended retention from 60→365 days
- **#14 Weight history**: Fixed timezone in `getWeeklyWeightEntries`
- **#19 Age**: Added `getComputedAge()` helper using DOB

### Step 6 ✅ Polish
- **#10 Weight units**: Added kg/lbs normalization in `detectPlateau()`
- **#15 Data export**: Created `data-export.ts` with JSON and CSV export

### New Files Created
- `src/lib/storage-cleanup.ts`
- `src/lib/date-utils.ts`
- `src/lib/data-export.ts`
