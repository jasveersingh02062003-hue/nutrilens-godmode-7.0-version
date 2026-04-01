

# Sync & Wiring Audit — Findings and Fixes

## Current Architecture Summary

The app uses a dual-layer approach: localStorage as primary runtime store, with debounced cloud sync to the database. Here is the audit of every sync pathway.

## What Is Properly Wired

| Data | Write Sync | Restore Sync | Status |
|---|---|---|---|
| **Profile** (name, macros, goals, etc.) | `UserProfileContext.syncToCloud()` — debounced 2s on every `updateProfile/updateConditions/updateBudget` call | `loadFromCloud()` on auth state change restores to localStorage | OK |
| **Budget settings** (3 separate localStorage keys) | Packed into `profiles.budget` JSON column during profile sync | Unpacked from cloud in `dbRowToProfile()` and written back to separate localStorage keys | OK |
| **Allergens** | Packed into `profiles.conditions.allergens` | Restored in `dbRowToProfile()` to `profile.allergens` | OK |
| **Daily logs** (meals, water, supplements, activities) | `saveDailyLog()` → `syncDailyLogToCloud()` debounced 1.5s | `restoreLogsFromCloud()` on login, paginated batches of 500 | OK |
| **Weight** | Dual sync: saved in daily_log AND `weight_logs` table | Only restored from `daily_logs` (weight_logs is a secondary index) | OK |
| **Water** | Dual sync: saved in daily_log AND `water_logs` table via `addWater()` | Only restored from `daily_logs` | OK |
| **Supplements** | Dual sync: saved in daily_log AND `supplement_logs` table via `addSupplement()` | Only restored from `daily_logs` | OK |
| **Achievements** | Synced to `user_achievements` table | Not restored on login (achievements are re-evaluated from logs) | OK |

## Issues Found

### Issue 1: `saveProfile()` called WITHOUT cloud sync in 3 places

These locations call `saveProfile()` directly to localStorage but never trigger `syncToCloud()`:

1. **`src/lib/onboarding-store.ts` line 125** — After onboarding completes, profile is saved locally only. The Onboarding page compensates by calling `syncProfileToCloud()` separately (line 585), so this is **partially OK** but fragile.

2. **`src/lib/plateau-handler.ts` line 102** — When a plateau adjustment changes `dailyCalories/dailyCarbs/dailyFat`, the updated profile is saved locally but **never synced to cloud**. If user logs out and back in, the plateau adjustment is lost.

3. **`src/lib/weekly-feedback.ts` line 268** — When weekly feedback adjusts calories, the profile is saved locally but **never synced to cloud**. Same loss-on-relogin risk.

### Issue 2: `addWaterForDate` / `removeWaterForDate` missing dedicated water_logs sync

- `addWater()` (line 272) syncs to both `daily_logs` (via `saveDailyLog`) and `water_logs` table
- But `addWaterForDate()` (line 411) and `removeWaterForDate()` (line 418) only call `saveDailyLog()` — they sync to `daily_logs` but NOT to `water_logs`
- Similarly, `addSupplementForDate()` (line 425) and `deleteSupplementFromLog()` (line 433) only sync to `daily_logs`, not to `supplement_logs`
- **Impact**: Low — since `daily_logs` is the primary source of truth and contains the full log data. The dedicated tables are secondary indices used by the migration path. But it's inconsistent.

### Issue 3: `skinConcerns` partially mapped

- `syncToCloud()` packs `skinConcerns` into `conditions.skinConcerns` (indirectly via `(profile as any).conditions`)
- But `dbRowToProfile()` correctly restores it from `row.conditions?.skinConcerns`
- **Issue**: In `syncToCloud()`, the conditions object is built as `{ ...((profile as any).conditions || {}), allergens: profile.allergens || [] }` — if `skinConcerns` is stored as a top-level field on `profile` (not under `profile.conditions`), it won't be included in the cloud sync.
- Looking at the profile interface: `skinConcerns` IS a top-level field on `UserProfile`. So it's **NOT being synced to cloud** unless it was previously stored under `profile.conditions.skinConcerns`.

## Fix Plan

### Fix 1: Add cloud sync after plateau and weekly feedback profile changes
**Files**: `src/lib/plateau-handler.ts`, `src/lib/weekly-feedback.ts`

After `saveProfile(updatedProfile)`, add a fire-and-forget cloud sync call that dispatches a custom event (same pattern as budget updates) so `UserProfileContext` picks it up and syncs.

Alternatively, simpler approach: dispatch `nutrilens:profile-updated` event after `saveProfile()`, and listen for it in `UserProfileContext` to trigger `syncToCloud()`.

### Fix 2: Ensure skinConcerns is included in cloud sync
**File**: `src/contexts/UserProfileContext.tsx`

In `syncToCloud()`, explicitly include `skinConcerns` in the conditions payload:
```
conditions: {
  ...((profile as any).conditions || {}),
  allergens: profile.allergens || [],
  skinConcerns: profile.skinConcerns || undefined,
},
```

### Fix 3: Add water_logs / supplement_logs sync to date-specific helpers
**File**: `src/lib/store.ts`

Add the same fire-and-forget cloud sync to `addWaterForDate`, `removeWaterForDate`, `addSupplementForDate`, and `deleteSupplementFromLog` that exists in `addWater()` and `addSupplement()`.

### Fix 4: Unify the sync trigger pattern
**File**: `src/lib/store.ts`, `src/contexts/UserProfileContext.tsx`

Add a `nutrilens:profile-updated` event dispatch inside `saveProfile()` so ANY caller that saves the profile automatically triggers cloud sync through the context listener. This eliminates the current fragility where callers must remember to sync manually.

## Technical Details

### Changes by file:

1. **`src/lib/store.ts`**
   - `saveProfile()`: dispatch `nutrilens:profile-updated` event
   - `addWaterForDate()` / `removeWaterForDate()`: add water_logs upsert
   - `addSupplementForDate()` / `deleteSupplementFromLog()`: add supplement_logs upsert

2. **`src/contexts/UserProfileContext.tsx`**
   - Listen for `nutrilens:profile-updated` event → trigger `syncToCloud()`
   - In `syncToCloud()`: explicitly pack `skinConcerns` into conditions

3. **`src/lib/plateau-handler.ts`** — No change needed (covered by saveProfile event)

4. **`src/lib/weekly-feedback.ts`** — No change needed (covered by saveProfile event)

## Effort
~40 lines of changes across 2 files. No database migrations needed.

