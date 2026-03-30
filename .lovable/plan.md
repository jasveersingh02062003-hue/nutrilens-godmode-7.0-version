

# Join Date Feature — Implementation Plan

## What It Does
Records when a user joins during onboarding. In the Progress calendar, days before the join date are shown but visually muted and unselectable. Tapping one shows a friendly message explaining they joined on a specific date.

## Changes

### 1. Add `joinDate` to UserProfile
**File: `src/lib/store.ts`** — Add `joinDate?: string` to `UserProfile` interface (YYYY-MM-DD format).

### 2. Set `joinDate` During Onboarding
**File: `src/lib/onboarding-store.ts`** — In `saveOnboardingData()`, set `joinDate: toLocalDateKey(new Date())` on the profile object (using the local date utility for timezone safety).

### 3. Sync `joinDate` to Cloud
**File: `src/contexts/UserProfileContext.tsx`** — Add `join_date` to the `syncToCloud` row and restore it in `dbRowToProfile`.

**Database migration** — Add `join_date text` column to the `profiles` table.

### 4. Update Calendar to Show Pre-Join Days
**File: `src/pages/Progress.tsx`**:
- Add `isPreJoin` flag to `calendarDays` — true when `dateStr < profile.joinDate`
- Pre-join days get a new status: muted styling (opacity-40), no balance computation, disabled click
- Add a lock icon or dash indicator for pre-join cells
- Add "Joined [date]" to the calendar legend

### 5. Handle Pre-Join Tap in DayDetailsSheet
**File: `src/components/DayDetailsSheet.tsx`**:
- Check if `date < profile.joinDate` early in the render
- If pre-join, show a friendly card: "You joined on [formatted join date]. You can view and log meals from that day onward."
- Include a "Got it" dismiss button, no edit controls

### 6. Filter Pre-Join from Summaries
**File: `src/lib/calorie-correction.ts`** — In `getDailyBalances()`, skip dates before `joinDate` to prevent zero-data days from affecting correction math.

## Technical Notes
- Uses `toLocalDateKey()` for timezone-safe date comparison (consistent with the project's date normalization standard)
- `joinDate` is set once, never mutated — existing users without it will see the full calendar (graceful fallback)
- No changes to existing calendar styling for post-join days

