

# Gym Tracking — Remaining Gaps Fix

The gym attendance tracking system is already implemented across all core files. After auditing, only two minor gaps remain:

## Gap 1: Add `'gym'` to `PlanCategory` type

**File:** `src/lib/event-plan-service.ts` (line 6)

Currently `PlanCategory = 'weight_loss' | 'sugar_free' | 'muscle' | 'circadian' | 'event' | 'all'`. The `SpecialPlansTab` uses `'gym' as PlanCategory` — a type cast workaround. Fix by adding `'gym'` to the union type.

## Gap 2: Add `gym_optimization` plan to catalog and categorize gym plans

**File:** `src/lib/event-plan-service.ts`

- Add `'gym_optimization'` to the `PlanType` union
- Add a new `gym_optimization` plan entry to `PLAN_CATALOG` (₹199/month, workout-day/rest-day calorie split, recovery meals, supplement guidance)
- Update the existing `gym_fat_loss` and `gym_muscle_gain` plans to use `category: 'gym'` so they appear under the Gym filter tab

## Gap 3: Fix Monika step map keys in Onboarding

**File:** `src/pages/Onboarding.tsx`

The `MonikaGuide` component uses a step-number-to-message map. After gym questions were inserted as step 11, subsequent step keys may be misaligned. Audit and update the `MONIKA_MESSAGES` mapping or the step-number references to ensure Monika's contextual tips match the correct onboarding screens.

---

## Technical Details

| Change | File | Scope |
|--------|------|-------|
| Add `'gym'` to `PlanCategory` | `event-plan-service.ts` | Line 6 type union |
| Add `'gym_optimization'` to `PlanType` | `event-plan-service.ts` | Line 5 type union |
| New catalog entry | `event-plan-service.ts` | After madhavan entry |
| Re-categorize gym plans | `event-plan-service.ts` | Lines 118, 133 |
| Monika step map audit | `Onboarding.tsx` | Step-to-message mapping |

