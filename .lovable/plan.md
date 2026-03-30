

# Cloud-First Migration Plan — All 3 Phases

## Overview

Migrate NutriLens AI from localStorage-dependent storage to a cloud-first architecture using Lovable Cloud. This ensures data survives uninstalls, works across devices, and eliminates the 5MB localStorage crash risk.

---

## Phase 1 — Immediate (Storage + Sync)

### 1A: Create `meal-photos` Storage Bucket

**What:** A cloud storage bucket for food/progress photos instead of base64 in localStorage.

**Database migration:**
- Create storage bucket `meal-photos` with RLS policies (authenticated users can upload/read their own files)

**New file: `src/lib/photo-cloud.ts`**
- `compressImage(dataUrl, maxSizeKB=80)` — canvas-based resize + quality reduction to ~80KB
- `uploadPhoto(file, userId, photoId)` — uploads to `meal-photos/{userId}/{photoId}.jpg`
- `getPhotoUrl(path)` — returns public/signed URL
- `deletePhoto(path)` — removes from bucket

**Update `src/lib/photo-store.ts`:**
- `addProgressPhoto()` → compress + upload to cloud, store URL (not base64) in `dataUrl` field
- `deleteProgressPhoto()` → also delete from cloud bucket
- `fileToDataUrl()` → now returns compressed data URL

**Update `src/components/ProgressPhotosSection.tsx`:**
- Show upload spinner during cloud save
- Display photos from cloud URLs instead of base64 strings

### 1B: Remove 14-Day Sync Limit

**Update `src/lib/daily-log-sync.ts`:**
- `restoreLogsFromCloud()` — remove the `days` parameter and date cutoff filter
- Fetch ALL logs for the user (paginated in batches of 500 to handle the 1000-row Supabase limit)
- Add `updated_at` comparison: only overwrite local if cloud version is newer

**Update `src/contexts/UserProfileContext.tsx`:**
- Change `restoreLogsFromCloud(14)` → `restoreLogsFromCloud()` (no limit)

---

## Phase 2 — New Cloud Tables + Migration

### 2A: Create Cloud Tables

**Database migration — 4 new tables:**

```text
weight_logs
├── id (uuid, PK)
├── user_id (uuid, NOT NULL)
├── log_date (text, NOT NULL)
├── weight (numeric, NOT NULL)
├── unit (text, default 'kg')
├── created_at (timestamptz)
└── UNIQUE(user_id, log_date)

water_logs
├── id (uuid, PK)
├── user_id (uuid, NOT NULL)
├── log_date (text, NOT NULL)
├── cups (integer, default 0)
├── updated_at (timestamptz)
└── UNIQUE(user_id, log_date)

user_achievements
├── id (uuid, PK)
├── user_id (uuid, NOT NULL)
├── achievement_key (text, NOT NULL)
├── unlocked_at (timestamptz)
├── metadata (jsonb, default '{}')
└── UNIQUE(user_id, achievement_key)

supplement_logs
├── id (uuid, PK)
├── user_id (uuid, NOT NULL)
├── log_date (text, NOT NULL)
├── supplements (jsonb, default '[]')
├── updated_at (timestamptz)
└── UNIQUE(user_id, log_date)
```

All tables get RLS: authenticated users can CRUD only their own rows.

### 2B: LocalStorage → Cloud Migration

**New file: `src/lib/cloud-migration.ts`**
- `migrateLocalDataToCloud()` — called once on login
  - Scans all `nutrilens_log_*` keys for weight entries → upserts to `weight_logs`
  - Scans water data → upserts to `water_logs`
  - Scans achievements → upserts to `user_achievements`
  - Sets a `nutrilens_migrated` flag to avoid re-running

**Update `src/lib/store.ts`:**
- `logWeight()` → also sync to `weight_logs` table (fire-and-forget)
- `addWater()`/`removeWater()` → also sync to `water_logs` table
- `addSupplement()` → also sync to `supplement_logs` table

---

## Phase 3 — Performance Optimization

### 3A: Fix `computeAdjustmentMap` O(n^2) Bottleneck

**Problem:** `_buildAdjustmentMap` iterates ALL past logs on every call, and it's called multiple times per render from different components.

**Solution — Memoization with cache invalidation:**

**Update `src/lib/calorie-correction.ts`:**
- Add a module-level cache: `let _adjMapCache: { key: string; result: Record<string,number> } | null = null`
- Cache key = hash of `baseTarget + tdee + mode + lastLogDate + logCount`
- `computeAdjustmentMap()` returns cached result if key matches
- `recomputeCalorieEngine()` invalidates the cache (`_adjMapCache = null`)
- This eliminates redundant O(n) scans within the same render cycle

### 3B: Coordination Layer for Triple-Count Prevention

**Problem:** Exercise-Adjustment, Redistribution-Service, and Smart-Adjustment all modify targets independently, risking triple-counting.

**New file: `src/lib/adjustment-coordinator.ts`**
- Single entry point: `getCoordinatedAdjustment(date, baseTarget)`
- Calls each engine in priority order:
  1. Calorie correction (surplus/deficit spreading)
  2. Exercise adjustment (burn-based additions)
  3. Redistribution (missed meal redistribution)
- Applies a combined cap (never exceed ±25% of TDEE total across all sources)
- Returns `{ finalTarget, breakdown: { correction, exercise, redistribution } }`

**Update consumers** (Dashboard, Calendar, DayDetails):
- Replace direct calls to individual adjustment functions with `getCoordinatedAdjustment()`

---

## Technical Details

| Item | Approach |
|------|----------|
| Photo compression | Canvas API: resize to max 800px width, JPEG quality 0.6 |
| Storage bucket RLS | `(bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1])` |
| Log pagination | Fetch in batches of 500 using `.range(offset, offset+499)` |
| Cache invalidation | Triggered by `recomputeCalorieEngine()` which already fires on every mutation |
| Migration safety | Idempotent upserts + `nutrilens_migrated` localStorage flag |

## Estimated File Changes

- **New files:** 3 (`photo-cloud.ts`, `cloud-migration.ts`, `adjustment-coordinator.ts`)
- **Modified files:** ~8 (`photo-store.ts`, `daily-log-sync.ts`, `store.ts`, `calorie-correction.ts`, `UserProfileContext.tsx`, `ProgressPhotosSection.tsx`, + Dashboard/Calendar consumers)
- **Database migrations:** 2 (storage bucket + 4 new tables)

