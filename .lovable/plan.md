

# Plan: After-Dinner Notification with Surplus/Deficit Spreading

## Overview
Add a dedicated after-dinner notification that fires when the user logs dinner. It summarizes today's surplus/deficit, how it spreads over upcoming days, and tomorrow's adjusted target. A "Details" button opens the existing `AdjustmentExplanationModal`.

## Changes

### 1. Add `getDinnerNotificationSummary()` to `src/lib/calorie-correction.ts`

New exported function at the end of the file. Uses existing `loadState()`, `getEffectiveDate()`, `getAdjustedDailyTarget()`, and `getProfile()`.

```typescript
export function getDinnerNotificationSummary(): {
  message: string;
  tomorrowTarget: number;
} | null
```

Logic:
- Get today's totals and original target from profile
- Compute diff (actual - target)
- If |diff| < 50, return null (balanced)
- For surplus: message says "+X kcal today → reducing ~Y kcal/day over next 4 days"
- For deficit: message says "-X kcal today → tomorrow increased by ~Y kcal"
- Append tomorrow's adjusted target
- Append pending adjustments from previous days if any exist in the adjustment plan
- Uses a once-per-day localStorage guard: `nutrilens_dinner_notif_${date}`

### 2. Modify `src/pages/LogFood.tsx` (lines ~180-196)

After the existing `updateCalorieBank()` call (line 181), add dinner-specific notification logic:

```typescript
// After updateCalorieBank() and existing toasts:
if (mealType === 'dinner') {
  const dinnerKey = `nutrilens_dinner_notif_${targetDate || new Date().toISOString().split('T')[0]}`;
  if (!localStorage.getItem(dinnerKey)) {
    const summary = getDinnerNotificationSummary();
    if (summary) {
      toast('Plan updated ⚖️', {
        description: summary.message,
        duration: 8000,
        action: {
          label: 'Details',
          onClick: () => {
            // Navigate to dashboard where modal can open
            navigate('/dashboard?showAdjustment=true');
          }
        }
      });
      localStorage.setItem(dinnerKey, '1');
    }
  }
}
```

Import `getDinnerNotificationSummary` from calorie-correction.

### 3. Modify `src/pages/Dashboard.tsx`

On mount, check for `?showAdjustment=true` URL param. If present, auto-open the `AdjustmentExplanationModal` and clear the param.

### 4. Modify `src/components/MealDetailSheet.tsx`

Add the same dinner notification logic after the existing `updateCalorieBank()` calls (lines 172, 199, 285) — when editing/deleting dinner items, re-check and potentially show the notification.

## Files Modified
| File | Action |
|------|--------|
| `src/lib/calorie-correction.ts` | Add `getDinnerNotificationSummary()` |
| `src/pages/LogFood.tsx` | Add dinner notification after meal save |
| `src/pages/Dashboard.tsx` | Handle `?showAdjustment=true` to auto-open modal |
| `src/components/MealDetailSheet.tsx` | Add dinner notification on edit/delete |

