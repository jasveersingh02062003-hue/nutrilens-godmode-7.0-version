

# Smart Calorie System: Real-Time Updates, Day Boundary, and Missed Day Recovery

## What You'll Get

1. **Date displayed on Dashboard** — Shows today's date prominently (e.g., "Thursday, 27 March") so you always know which day you're tracking
2. **"Is this your last meal?" prompt after dinner** — When you log dinner, a bottom sheet asks if this is your last meal for the day, triggering immediate surplus/deficit calculation and showing tomorrow's adjusted target
3. **Midnight auto-rollover** — At 12:00 AM, the app starts a new day automatically. Anything logged after midnight counts as next day's "midnight snack"
4. **Morning missed-day recovery prompt** — When you open the app the next morning and yesterday has no logs, it asks specifically: "Did you eat but forget to log, or did you skip meals?" with two paths:
   - **"I ate but forgot to log"** → Opens yesterday's log screen
   - **"I didn't eat / skip"** → Carries the deficit forward to adjust today's target
5. **Real-time calendar sync** — The Progress calendar updates instantly when meals are logged, showing green/yellow/red dots without needing a page refresh
6. **Immediate surplus/deficit badge** — Dashboard shows today's running surplus or deficit in real-time as you log meals

## Technical Details

### Files to Create
- `src/components/LastMealConfirmSheet.tsx` — Bottom sheet shown after logging dinner: "Is this your last meal today?" with Yes/No. On "Yes": runs `processEndOfDay`, shows tomorrow's adjusted target summary, freezes today's balance
- `src/components/MorningRecoveryPrompt.tsx` — Replaces the current basic `MissedDayPrompt`. Shows yesterday's date, two clear options: "I ate but forgot to log" (navigates to log for yesterday) vs "I skipped meals" (triggers deficit carry-forward and dismisses)

### Files to Modify

**`src/pages/Dashboard.tsx`**
- Add formatted date display below the greeting (e.g., "Thursday, 27 March 2026") using a clean, readable format
- Wire up `MorningRecoveryPrompt` — check if yesterday has <300 kcal logged and show the prompt on mount
- Add real-time surplus/deficit indicator near the CalorieRing showing "+120 surplus" or "−340 deficit" with color coding
- Listen for `nutrilens:update` and `storage` events to refresh `dayState` immediately

**`src/lib/calorie-engine.ts`**
- Add midnight snack detection: if current hour is 0–3 AM, assign meal to "snacks" slot and tag as midnight snack
- Export a `finalizeDay()` function that freezes today's balance when user confirms last meal

**`src/lib/calorie-correction.ts`**
- Add `carryForwardDeficit(date)` function for when user confirms they skipped meals yesterday — immediately applies deficit recovery to today's target
- Ensure `getEffectiveDate()` uses the existing 3 AM cutoff consistently

**`src/pages/LogFood.tsx`**
- After logging a dinner meal, show `LastMealConfirmSheet` instead of just the toast
- If logging between 12 AM–3 AM, auto-assign to previous day per existing cutoff; if after 3 AM, treat as new day's midnight snack

**`src/pages/Progress.tsx`**
- Add `useEffect` listener for `nutrilens:update` and `storage` events to trigger `refresh()` — making calendar dots update in real-time when meals are logged from Dashboard or LogFood
- Add polling interval (same 2s pattern as Dashboard) for live calendar sync

**`src/components/MissedDayPrompt.tsx`**
- Replace with enhanced `MorningRecoveryPrompt` component with specific language: "Did you eat yesterday but forget to log?" vs "I skipped meals — adjust my plan"

### Flow Summary

```text
User logs dinner
  → "Is this your last meal?" sheet appears
  → Yes → freezeDay() + show tomorrow's adjusted target
  → No → dismiss, keep day open

Midnight passes (12:00 AM)
  → New day starts automatically
  → Meals logged 12–3 AM → assigned to previous day
  → Meals logged after 3 AM → new day's midnight snack

Next morning, user opens app
  → Check: did yesterday have <300 kcal?
  → Yes → "Did you eat but forget to log?"
    → "I forgot to log" → navigate to yesterday's log
    → "I skipped" → carry deficit forward, adjust today
  → No → normal dashboard

Calendar (Progress page)
  → Listens for storage/nutrilens:update events
  → Re-renders dots immediately when data changes
```

