

# Plan: Current Plans Management (View, Pause, Resume, Cancel, Download)

## Summary
Add a **"Current Plans"** sub-tab inside the Plans tab and a plan badge/section in Profile. Users can view their active plan with full details, pause/resume/cancel it, download PDF/grocery list, and see adherence metrics.

## Changes

### 1. Plan Service — Pause/Resume/Cancel + Status
**File:** `src/lib/event-plan-service.ts`
- Add `status?: 'active' | 'paused'` and `pausedAt?: string` fields to `ActivePlan` interface
- Add `pauseActivePlan()` — sets status to `paused`, stores `pausedAt` timestamp
- Add `resumeActivePlan()` — sets status back to `active`, removes `pausedAt`
- Add `cancelActivePlan()` — archives plan to `nutrilens_plan_history` in localStorage, then clears active plan
- Add `getPlanHistory(): ActivePlan[]` — reads archived plans
- Modify `getActivePlan()` — return `null` if `status === 'paused'` (so calorie engine and meal planner revert to normal goals automatically). Add a separate `getActivePlanRaw()` that returns the plan regardless of status (for UI display)
- Modify `isPlanActive()` — only true if status is `active`

### 2. New Component: CurrentPlansTab
**File:** `src/components/CurrentPlansTab.tsx`
- Reads plan via `getActivePlanRaw()` (shows both active and paused)
- **Empty state** if no plan: friendly message + "Browse Plans" button
- **Plan card** showing: name/emoji, type, status badge (green "Active" / orange "Paused"), date range + days left, daily calorie/protein/carbs/fat targets, current weight vs target weight
- **Action buttons** (contextual):
  - Pause (if active) — calls `pauseActivePlan()`, shows toast
  - Resume (if paused) — calls `resumeActivePlan()`, shows toast
  - Cancel — confirmation dialog, then `cancelActivePlan()`
  - Download PDF — calls existing `exportPlanPDF()`
  - Download Grocery List — generates grocery list text export
- **Progress section**: simple progress bars for weight change and day completion
- **Plan history** section at bottom showing past cancelled/completed plans (from `getPlanHistory()`)

### 3. SpecialPlansTab — Segmented Control
**File:** `src/components/SpecialPlansTab.tsx`
- Add segmented toggle at top: `[ Available Plans ] [ My Plans ]`
- When "My Plans" selected, render `<CurrentPlansTab />`
- When "Available Plans" selected, render existing catalog (move current content into this branch)

### 4. Profile Integration
**File:** `src/pages/Profile.tsx`
- Add status badge below user name: green "Active Plan" or orange "Plan Paused" (only if plan exists)
- Add "My Current Plan" card section showing plan name, status, days left, and a "Manage" button that navigates to Planner > Plans tab

### 5. Dashboard — Paused Banner
**File:** `src/pages/Dashboard.tsx`
- When plan exists but `status === 'paused'`: show a muted banner "Plan paused — Resume anytime" with a Resume button
- Existing active plan banner continues working as-is (since `getActivePlan()` returns null for paused, the calorie overrides automatically revert)

### 6. Grocery List Export
**File:** `src/lib/plan-pdf-export.ts`
- Add `exportGroceryList()` function that opens a printable HTML page with aggregated ingredients for remaining plan days (using recipe data from meal planner store)

## Implementation Order
1. Plan service extensions (pause/resume/cancel/history/status field)
2. CurrentPlansTab component
3. SpecialPlansTab segmented control integration
4. Profile badge + plan section
5. Dashboard paused banner
6. Grocery list export

## Files Summary
| File | Action |
|------|--------|
| `src/lib/event-plan-service.ts` | Modify — add status, pause/resume/cancel, history, getActivePlanRaw |
| `src/components/CurrentPlansTab.tsx` | Create — plan management UI |
| `src/components/SpecialPlansTab.tsx` | Modify — add segmented control |
| `src/pages/Profile.tsx` | Modify — add plan badge + section |
| `src/pages/Dashboard.tsx` | Modify — paused plan banner |
| `src/lib/plan-pdf-export.ts` | Modify — add grocery list export |

