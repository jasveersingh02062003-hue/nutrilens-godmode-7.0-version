

# Plan: QuickLog Widget Page

## Summary

Build a `/quicklog` route in the main app (not a separate HTML file — this is a React/Vite project) that serves as a lightweight, PWA-installable widget view for zero-friction meal logging. It reads today's data from localStorage, shows remaining calories/protein, four meal buttons with time-aware highlighting, and routes to existing logging flows.

## Why Not `widget.html`

This is a Vite/React SPA. A standalone HTML file won't have access to the build system, Tailwind, or shared utilities. Instead, we build a dedicated `/quicklog` route that:
- Can be added to home screen as a PWA shortcut
- Shares all existing localStorage data and logging infrastructure
- Uses existing components (LoggingOptionsSheet) for mode selection

## Changes

### 1. `src/pages/QuickLog.tsx` — New Widget Page

Compact, mobile-first page (max-w-md, no bottom nav):
- **Header**: App icon + "QuickLog" title
- **Stats row**: 🔥 remaining calories ring + 💪 remaining protein badge
- **Dynamic message**: Time-aware nudge (e.g., "Time for lunch!" or "You're on track today")
- **4 meal buttons** (breakfast/lunch/dinner/snack):
  - Each shows emoji, label, time hint
  - Status badge: ✅ if meal logged, ⏰ if current slot, dimmed if past & missed
  - Tap opens `LoggingOptionsSheet` (camera/voice/manual/barcode — reuses existing component)
- **Auto-refresh**: Listens to `storage` event + polls every 30s to catch same-tab updates
- Reads from `getProfile()`, `getDailyLog()`, `getDailyTotals()` — existing store functions

### 2. `src/App.tsx` — Add Route

- Add `/quicklog` route: `<Route path="/quicklog" element={<ProtectedRoute><QuickLog /></ProtectedRoute>} />`
- Add `/quicklog` to `HIDE_NAV_ROUTES` so bottom nav doesn't show
- Handle deep link query params: if URL has `?meal=lunch&mode=camera`, auto-open the logging flow for that meal

### 3. `src/lib/widget-data.ts` — Widget Helper

- `getWidgetData()`: Returns `{ remainingCalories, remainingProtein, meals: [{type, status, logged}] }`
- `getMealStatus(type)`: Returns `'completed'` | `'current'` | `'pending'` | `'missed'` based on time + log data
- `getDynamicMessage()`: Time-aware motivational message based on progress

### 4. Deep Link Support in QuickLog

- On mount, parse `searchParams` for `meal` and `mode`
- If `mode=smart`, auto-open LoggingOptionsSheet for that meal
- If `mode=camera`, navigate directly to `/?meal={meal}`
- If `mode=voice`, navigate to `/log?meal={meal}&mode=voice`
- If `mode=manual`, navigate to `/log?meal={meal}`

### 5. PWA Shortcut Hint

- Add a small "Add to Home Screen" instruction banner at bottom of QuickLog page
- Uses existing app PWA capabilities (if configured) or shows browser instructions

## Files

| File | Action |
|------|--------|
| `src/pages/QuickLog.tsx` | Create — widget page |
| `src/lib/widget-data.ts` | Create — data helpers |
| `src/App.tsx` | Edit — add route + hide nav |

## Not Included (Out of Scope)

- Separate `widget.html` — incompatible with React/Vite architecture
- Custom `CameraLog`/`VoiceLog`/`ManualLog` components — existing `CameraHome` and `LogFood` pages already handle all modes via query params
- Custom `logMeal` function — existing `addMealToLog` + `syncDailyBalance` already handle this
- Haptic feedback — `navigator.vibrate` can be added later as enhancement

