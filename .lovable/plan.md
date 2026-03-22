

## Audit: Master Engine Spec vs Current System

### Verdict: System is correct. No code changes needed.

Here's a point-by-point check of every spec against the actual code:

---

### 1. Single Source of Truth Formula
**Spec:** `total_allowed = base_target + total_burned`, `remaining = total_allowed - total_consumed`

**Current code:**
- `realTimeStatus` in `monika-actions.ts` (line 323-328): Exactly this formula — `totalAllowed: baseTarget + effectiveBurn`, `remainingCalories: baseTarget + effectiveBurn - totals.eaten`
- `CalorieRing.tsx` (line 18-19): `net = eaten - effectiveBurn`,