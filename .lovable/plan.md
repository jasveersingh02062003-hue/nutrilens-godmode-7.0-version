

# Sync & Wiring Audit — What's Connected vs What's Not

## ✅ PROPERLY WIRED & SYNCED

### Data Flow: Onboarding → localStorage → Cloud

| Data | Onboarding | localStorage (store.ts) | Cloud Sync (profile-mapper.ts) |
|------|-----------|------------------------|-------------------------------|
| **UserProfile** (name, age, height, weight, macros, etc.) | ✅ Step 1-20 | ✅ `saveProfile()` | ✅ `profileToDbRow()` ↔ `dbRowToProfile()` via profiles table |
| **Gym data** (`gym.goer`, schedule, stats) | ✅ Step 20 | ✅ On `UserProfile.gym` | ✅ Mapped via `conditions.gym` JSONB |
| **Supplement prefs** (frequency, cost, protein) | ✅ Step 22 (enriched) | ✅ On `UserProfile.supplementPrefs` | ✅ Mapped via `conditions.supplementPrefs` JSONB |
| **Budget settings** | ✅ Onboarding | ✅ expense-store | ✅ Via `budget` JSONB column |
| **Daily logs** (meals, supplements, water, gym) | N/A | ✅ `saveDailyLog()` | ✅ `syncDailyLogToCloud()` → `daily_logs` table |
| **Weight logs** | N/A | ✅ `logWeight()` | ✅ `syncWeight()` → `weight_logs` table |
| **Water logs** | N/A | ✅ `addWater()` | ✅ `syncWater()` → `water_logs` table |
| **Supplement logs** | N/A | ✅ `addSupplement()` | ✅ `syncSupplements()` → `supplement_logs` table |
| **Profile sync trigger** | N/A | ✅ `window.dispatchEvent('nutrilens:profile-updated')` | ✅ AuthContext + UserProfileContext listen → upsert to cloud |
| **Cloud restore on login** | N/A | ✅ `restoreLogsFromCloud()` | ✅ `dbRowToProfile()` restores all fields |

### Engine Integration

| Integration | Status | How |
|-------------|--------|-----|
| **`getDailyTotals()` includes supplement calories/protein** | ✅ | Lines 342-347 in store.ts sum `supp.calories`, `supp.protein`, etc. |
| **Calorie correction includes supplement calories** | ✅ | `calorie-correction.ts` line 214 adds `suppCals` to actual consumed |
| **Meal suggestion accounts for supplement protein** | ✅ | `meal-suggestion-engine.ts` line 145-146 computes `supplementProteinLogged` and reduces remaining protein |
| **Budget service includes supplement spending** | ✅ | `budget-service.ts` line 47-50 calls `getSupplementSpendingForRange()` |
| **Gym bonus feeds calorie correction** | ✅ | `calorie-correction.ts` imports `getGymBonus()` from gym-service |
| **Gym check-in stored in DailyLog** | ✅ | `DailyLog.gym` field written by `saveGymCheckIn()` |
| **Event plans stored in cloud** | ✅ | `event_plans` table with full RLS |

### UI Components → Service Wiring

| Component | Service Call | Dashboard Wired |
|-----------|-------------|-----------------|
| `ProteinGapNudgeCard` | ✅ `shouldSuggestSupplement()` → one-tap `addSupplement()` | ✅ Line 200 |
| `SupplementUpsellCard` | ✅ `getUpsellTrigger()` (multi-trigger) | ✅ Line 201 |
| `SupplementConsistencySection` | ✅ `getSupplementAdherence()` | ✅ Progress.tsx line 297 |
| `GymCheckInCard` | ✅ `saveGymCheckIn()` | ✅ Line 193 |
| `GymConsistencyCard` | ✅ `getWeeklyConsistency()` | ✅ Line 194 |
| `GymUpsellCard` | ✅ `getGymSessionsInDays()` | ✅ Line 195 |
| `SupplementsCompact` | ✅ Direct log access | ✅ Line 250-254 |

### RLS Policies

All tables have proper user-scoped RLS:
- ✅ `profiles` — own read/write
- ✅ `daily_logs` — full CRUD own data
- ✅ `weight_logs`, `water_logs`, `supplement_logs` — full CRUD own data
- ✅ `event_plans` — full CRUD own data
- ✅ `user_achievements` — full CRUD own data

---

## ❌ NOT WIRED / GAPS FOUND

### Gap 1: `effectiveProteinTarget` not used in meal scoring

The meal suggestion engine computes `adjustedRemainingProtein` (line 146) and `effectiveProtein` (line 154) but **only uses them for the workout-day 10% boost**. The `computePES()` call on line 156 passes `targetCalories` but **NOT** the effective protein target — PES uses its own internal protein scoring independent of supplements logged.

**Impact**: Medium. Meal scoring doesn't fully account for supplement protein when ranking recipes by protein fit.

### Gap 2: `updateSupplementStats()` is never called

The `supplement-service.ts` exports `getSupplementAdherence()` which computes stats on-the-fly, but the `supplementPrefs.stats` field on `UserProfile` (totalCost, adherencePercent, streak) is **never updated after onboarding**. It's initialized to `{totalCost: 0, adherencePercent: 0, streak: 0}` and stays there.

**Impact**: Low. The UI components call `getSupplementAdherence()` directly (correct), but if any code reads `profile.supplementPrefs.stats` directly, it'll get stale zeros.

### Gap 3: Gym stats not periodically synced back to profile

`updateGymStats()` exists in `gym-service.ts` and computes stats from last 90 days of logs, but it's unclear if it's called regularly. The `gym.stats` on the profile may go stale unless explicitly triggered.

**Impact**: Low-Medium. If gym stats are read from profile instead of computed on-the-fly, they'll be outdated.

### Gap 4: `require()` usage in budget-service.ts

Line 47 uses `require('./supplement-service')` (CommonJS) inside an ES module. This works in Vite dev (which handles CJS interop) but is fragile and could break in production builds or cause tree-shaking issues.

**Impact**: Low. Works currently but is a code smell.

### Gap 5: Creatine hydration reminder not implemented

The plan mentioned: "If user took creatine today, boost hydration nudge priority." This is **not implemented** — no code checks for creatine and adjusts water goal.

**Impact**: Low. Nice-to-have feature, not a data integrity issue.

### Gap 6: No `_updatedAt` timestamp on daily logs for cloud merge

`daily-log-sync.ts` line 82 checks `local._updatedAt` for cloud vs local conflict resolution, but `saveDailyLog()` in `store.ts` **never sets `_updatedAt`** on the log object. This means cloud restore always treats local data as "older" (timestamp 0).

**Impact**: High. On multi-device usage, cloud data will always overwrite local data regardless of which is newer.

---

## Plan to Fix the 6 Gaps

### Fix 1: Wire effective protein into PES scoring
**File**: `src/lib/meal-suggestion-engine.ts`
Pass `effectiveProtein` as a `targetProtein` option to `computePES()` so recipes are scored against the actual remaining protein need (minus supplements).

### Fix 2: Remove dead `stats` field or wire auto-update
**File**: `src/lib/supplement-service.ts`
Add a call from `ProteinGapNudgeCard` and `SupplementConsistencySection` to update `profile.supplementPrefs.stats` after computing adherence, or simply remove the dead field and rely on on-the-fly computation (current behavior is correct, just clean up the dead field).

### Fix 3: Call `updateGymStats()` on Dashboard load
**File**: `src/hooks/useDashboardInit.ts`
Add a one-time call to `updateGymStats()` when Dashboard mounts, so gym stats on the profile stay current.

### Fix 4: Replace `require()` with dynamic import
**File**: `src/lib/budget-service.ts`
Replace `require('./supplement-service')` with `import()` or a top-level static import.

### Fix 5: Add creatine hydration nudge
**File**: `src/lib/supplement-service.ts` + `src/pages/Dashboard.tsx`
Add `shouldBoostWater()` that checks if creatine was logged today, and render a small nudge on Dashboard.

### Fix 6: Add `_updatedAt` to daily logs
**File**: `src/lib/store.ts` — in `saveDailyLog()`, set `log._updatedAt = new Date().toISOString()` before saving, so cloud merge logic works correctly.

---

## Summary

| Category | Synced | Not Synced |
|----------|--------|------------|
| Data Models → Cloud | 6/6 ✅ | 0 |
| Engine Integrations | 4/6 ✅ | 2 (PES protein, creatine water) |
| UI → Service Wiring | 7/7 ✅ | 0 |
| Cloud Sync Integrity | 4/5 ✅ | 1 (`_updatedAt` missing) |
| Code Quality | 4/5 ✅ | 1 (`require()` in ESM) |
| Dead Code | — | 1 (stale `stats` field) |

**Total: 25 items synced, 5 gaps to fix** (1 high priority, 2 medium, 2 low).

