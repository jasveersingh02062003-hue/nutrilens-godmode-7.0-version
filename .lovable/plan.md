

# Plan: Add Once-Per-Day Guard to Calorie Adjustment Toast

## Problem
The morning adjustment toast in Dashboard.tsx fires on every component mount (page load, navigation back). The user's spec requires it show only once per day.

## Change

### File: `src/pages/Dashboard.tsx` (lines 142-150)

Add a localStorage check before showing the toast:

```typescript
// Current (no guard):
const explanation = getAdjustmentExplanation();
if (explanation) {
  toast('⚖️ Calories adjusted', { ... });
}

// Updated (with once-per-day guard):
const today = getTodayKey();
const toastKey = `calorie_toast_${today}`;
if (!localStorage.getItem(toastKey)) {
  const explanation = getAdjustmentExplanation();
  if (explanation) {
    toast('⚖️ Calories adjusted', { ... });
    localStorage.setItem(toastKey, '1');
  }
}
```

This is a 3-line addition. Everything else (source tracking, explanation functions, modal, badge) is already complete and production-ready.

