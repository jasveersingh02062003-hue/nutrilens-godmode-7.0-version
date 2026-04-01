

# Unified Animated Warning System — Allergens + Health Conditions

## Current State

- **Allergen warnings**: Already working in `LogFood.tsx`, `CameraHome.tsx`, `AddFoodSheet.tsx`, `QuickLogSheet.tsx` with confirmation dialogs and animated badges
- **Health condition engine**: `condition-coach.ts` has a full rule engine (`evaluateConditions()`) for diabetes, PCOS, hypertension, thyroid, pregnancy, cholesterol, lactose, gluten — but it's **only used post-save** in `MealDetailSheet` and `meal-feedback.ts`
- **Gap**: Health condition warnings never appear during logging. No unified reusable warning component exists — each file duplicates warning UI

## What We'll Build

### 1. New Component: `AnimatedWarningBanner.tsx`
A reusable, animated warning component used everywhere.

**Props**: `type` (allergen | health), `severity` (high | medium | low), `title`, `messages[]` (each with icon, text, condition), `onDismiss?`, `onAction?` (for "Find Alternative")

**Visual design**:
- **High severity** (red): `bg-destructive/10 border-destructive/30` with `motion.div` spring entrance + `animate-pulse` on icon
- **Medium severity** (orange): `bg-orange-500/10 border-orange-500/30` with slide-in only
- **Low severity** (yellow): `bg-yellow-500/10 border-yellow-500/30` with fade-in
- Spring animation: `initial={{ scale: 0.9, opacity: 0, y: -10 }}` → `animate={{ scale: 1, opacity: 1, y: 0 }}`
- `ShieldAlert` icon with rotate-in spring for high severity; `AlertTriangle` for medium/low

### 2. New Utility: `checkHealthWarnings()` in `condition-coach.ts`
A lightweight per-item check (unlike `evaluateConditions` which needs full meal totals). Checks individual food names against condition keyword lists and returns warnings.

```
checkFoodForConditions(foodName: string, userConditions: string[]): ConditionMessage[]
```

This enables real-time warnings in search results before the meal is assembled.

### 3. Integration Points (6 surfaces)

**A. `LogFood.tsx` — Search results (already has allergen badges)**
- Add health condition badges alongside allergen badges in search results
- Orange badges for condition warnings (e.g., "🩸 DIABETES" on jalebi)
- Call `checkFoodForConditions()` per search result
- Show combined allergen + health warnings in the confirmation dialog

**B. `LogFood.tsx` — Adjust step (already has allergen banner)**
- Replace the inline allergen banner with `<AnimatedWarningBanner>` 
- Add health condition warnings from `evaluateConditions()` (now we have full meal totals)
- Show combined card: allergen items in red section, condition warnings in orange section

**C. `CameraHome.tsx` — Confirm step (already has allergen banner)**
- Add health condition evaluation after food detection
- Show `<AnimatedWarningBanner>` with both allergen and condition messages merged
- Condition warnings appear below allergen warnings in same card

**D. `QuickLogSheet.tsx` — After parse**
- Already shows allergen toasts
- Add condition toasts: orange-styled for health warnings

**E. `AddFoodSheet.tsx` — Search results**
- Add condition badges (orange) next to allergen badges (red) on search results
- Combined confirmation dialog shows both types

**F. `MealPlanDashboard.tsx` — Planned meals**
- Already has allergen badges on recipes
- Add condition warning icon (orange ⚠️) next to meals that conflict with conditions

### 4. CSS Animations (in `index.css`)
```css
@keyframes pulse-warning {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); box-shadow: 0 0 12px rgba(220, 38, 38, 0.3); }
}
@keyframes slide-down-warning {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

## Files to Create
| File | Purpose |
|---|---|
| `src/components/AnimatedWarningBanner.tsx` | Reusable warning component with severity levels and animations |

## Files to Modify
| File | Change |
|---|---|
| `src/lib/condition-coach.ts` | Add `checkFoodForConditions()` for per-item health checks |
| `src/pages/LogFood.tsx` | Add health condition badges in search + combined banner in adjust step |
| `src/pages/CameraHome.tsx` | Add health condition warnings to confirm step |
| `src/components/QuickLogSheet.tsx` | Add condition warning toasts |
| `src/components/AddFoodSheet.tsx` | Add condition badges in search results |
| `src/components/MealPlanDashboard.tsx` | Add condition warning icons on planned meals |
| `src/index.css` | Add warning animation keyframes |

## What Stays Unchanged
- All existing allergen logic (checkAllergens, confirmation dialogs, severe 3s delay)
- `condition-coach.ts` existing `evaluateConditions()` function
- All meal saving, calculation, and budget logic
- Database and backend

