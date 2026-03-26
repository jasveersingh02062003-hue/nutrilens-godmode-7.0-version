

# Plan: QuickLog Zero-Friction Upgrade

## The Core Problem

Currently: **tap meal → mode selector sheet → choose mode → log**. That's 3 steps. The user's scenario demands: **tap → instant action**.

## Changes

### 1. Instant-mode tap on meal buttons (`QuickLog.tsx`)

- **Single tap**: Skip `LoggingOptionsSheet` entirely. Instead, read `getLastLogMode()` and navigate directly to that mode's logging route (default: `camera`).
- **Long press** (500ms hold): Open `LoggingOptionsSheet` for mode selection.
- Add a `useLongPress` hook inline — track `touchstart`/`mousedown` timers, distinguish tap vs hold.

### 2. Save last-used mode from LoggingOptionsSheet (`LoggingOptionsSheet.tsx`)

- When user picks a mode (camera/voice/manual/barcode), call `setLastLogMode(key)` before navigating. This teaches the widget their preference.

### 3. Duplicate logging guard (`QuickLog.tsx`)

- Before navigating on tap, check if the meal was logged within the last 15 minutes (compare `loggedCalories > 0` and time check from store).
- If duplicate detected, show a small confirmation: "Already logged — log again or edit?" with two buttons instead of navigating immediately.

### 4. Missed meal "yesterday" awareness (`widget-data.ts`)

- In `getDynamicMessage()`, check if yesterday's log exists. If no log at all yesterday, prepend: "Let's get back on track today 💪" as the morning message.

### 5. Completed meal tap → edit prompt (`QuickLog.tsx`)

- If tapping a meal with status `completed` or `late_completed`, show a mini prompt: "Edit this meal?" instead of opening a new log flow.

## Files

| File | Change |
|------|--------|
| `src/pages/QuickLog.tsx` | Add long-press logic, instant-mode navigation, duplicate guard, edit prompt for completed meals |
| `src/components/LoggingOptionsSheet.tsx` | Call `setLastLogMode()` on mode selection |
| `src/lib/widget-data.ts` | Add yesterday-check to dynamic message |

## Technical Detail

**Long press detection**: On `onPointerDown`, start a 500ms timer storing the meal slot. On `onPointerUp`/`onPointerLeave` before 500ms, treat as tap → instant navigate. If timer fires, open the sheet. Use `useRef` for timer ID to avoid stale closures.

**Instant navigation mapping** (from `getLastLogMode()`):
- `camera` → `/?meal={type}`
- `voice` → `/log?meal={type}&mode=voice`
- `manual` → `/log?meal={type}`
- `barcode` → `/log?meal={type}&mode=barcode`

**Duplicate check**: If `slot.loggedCalories > 0` and the meal's last log time is within 15 minutes of now, show inline confirmation instead of navigating.

