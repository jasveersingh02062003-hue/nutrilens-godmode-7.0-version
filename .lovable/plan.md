

# Implementation Plan: Event-Based Transformation Plan

## Summary
Add a new **"Event-Based Plan"** (`event_based`) plan type that allows users to create deadline-driven transformation plans (wedding, vacation, meeting, etc.) with a focused questionnaire that collects event details, constraints (exercise time, cooking time, budget), and goals. The system generates a personalized short-term plan using existing profile data + event inputs, including a daily "Boosters" checklist (superfoods, metabolism drinks, routines). After the event, a feedback modal handles transition back to normal or updated goals.

## What Already Exists (Reuse)
- Plan service with catalog, CRUD, target calculation, safety clamps
- Calorie/macro override engine (calorie-correction.ts)
- Meal suggestion engine with plan filters, weather scoring, budget/pantry awareness
- ActivePlanBanner, PlanCompletionModal, PlanPromoCard, SpecialPlansTab, PlanDetailSheet
- User profile with weight, TDEE, BMR, budget, health conditions, activity level, cooking habits
- `event_plans` database table with RLS

## New Components & Changes

### 1. Plan Service Extension
**File:** `src/lib/event-plan-service.ts`
- Add `'event_based'` to `PlanType` union, `'event'` to `PlanCategory`
- Add `EventPlanSettings` interface: `{ eventType, eventDate, goalType ('lose'|'gain'|'tummy'|'shape'), exerciseTime ('none'|'10min'|'30min'|'1hour'), cookingTime ('none'|'limited'|'plenty'), budgetTier ('tight'|'moderate'|'flexible'), fastingWindow (0|12|14|16), boosters: string[] }`
- Add catalog entry for "Transform for Your Event" with dynamic duration
- Add `calculateEventTargets()` that factors in goal type: loss uses existing deficit logic, "tummy" uses higher protein + lower carbs, "shape" uses moderate deficit + higher protein, gain uses surplus logic

### 2. Event Plan Config Sheet (Multi-Step Questionnaire)
**File:** `src/components/EventPlanConfigSheet.tsx` (new)
- Full-screen bottom sheet with 4 steps (not 9 separate screens — group related questions):
  - **Step 1 — Event**: Event type (Wedding/Vacation/Meeting/Reunion/Other) + date picker (min 7 days out)
  - **Step 2 — Goal**: What do you want (Lose weight / Gain weight / Reduce tummy / Get in shape) + target weight slider showing current → target with feasibility check
  - **Step 3 — Constraints**: Exercise time, cooking time, budget tier — each as icon-based toggle cards
  - **Step 4 — Extras**: Intermittent fasting toggle (12h/14h/16h) + optional boosters (superfoods, metabolism drinks, morning routine)
- Each question is pre-filled from profile where possible (cooking_habits → cookingTime, budget → budgetTier)
- Final summary screen shows computed targets, sample day, and feasibility warning if needed
- "Activate Plan" button stores via `setActivePlan()` with `planId: 'event_based'` and `customSettings` containing all event config

### 3. Boosters Checklist Component
**File:** `src/components/BoostersChecklist.tsx` (new)
- Daily checklist shown on Dashboard when event_based plan is active
- Items based on user's selected boosters:
  - **Morning routine**: Warm water + lemon + jeera, 10-min walk, stretching
  - **Metabolism drinks**: Jeera water, ginger tea, green tea, black coffee
  - **Superfoods**: Makhana, sattu, chia seeds, sprouted moong
  - **Evening routine**: Herbal tea, finish dinner by 7 PM
- Stored in localStorage per day, visual checkmarks with progress ring

### 4. Post-Event Feedback Modal
**File:** `src/components/PostEventFeedbackModal.tsx` (new)
- Triggered when event plan expires (checked in Dashboard on mount)
- Shows: "Your event plan ended! How did it go?"
- Collects: current weight (numeric input)
- Options:
  - "Return to original plan" → clears active plan, updates weight in profile
  - "Update my long-term goal" → opens goal editor with new weight pre-filled
  - "Extend this plan" → re-opens EventPlanConfigSheet with same settings + new date
- Replaces PlanCompletionModal for event_based plans

### 5. Meal Suggestion Filters for Event Plans
**File:** `src/lib/meal-suggestion-engine.ts` (modify)
- When `event_based` active, apply constraint-based filters:
  - `cookingTime === 'none'`: only recipes with prepTime ≤ 5 min or tag `no_cook`
  - `cookingTime === 'limited'`: prepTime ≤ 30 min
  - `budgetTier === 'tight'`: boost PES score weight, exclude recipes > ₹80/serving
  - `goalType === 'tummy'`: boost high-fiber, low-bloat recipes; penalize gas-causing foods
  - IF fasting window active: exclude recipes from slots outside eating window

### 6. Dashboard Integration
**File:** `src/pages/Dashboard.tsx` (modify)
- When `event_based` plan active: show event-specific ActivePlanBanner with countdown to event name ("15 days until your wedding!")
- Render `BoostersChecklist` below the banner
- On mount: check if event plan expired → show `PostEventFeedbackModal`

### 7. Plans Tab Integration
**File:** `src/components/SpecialPlansTab.tsx` (modify)
- Add `'event'` to category filters
- Add prominent "Create Event Plan" CTA card at top that opens `EventPlanConfigSheet`
- Event plan catalog entry shows as "Custom · Your Event" card

### 8. Activity Tracker (Simple Walking Goal)
**File:** `src/components/ActivityTracker.tsx` (new)
- Compact card showing walking step goal based on exerciseTime:
  - none: 8,000 steps target
  - 10min: 10,000 steps + "5-min stretching"
  - 30min: 10,000 steps + "10-min bodyweight circuit"
- Manual step entry (no Health Connect needed — keep it simple)
- Stored in localStorage per day
- Shown on Dashboard when event plan is active

## Implementation Order
1. Plan service extension (add event_based type + settings + target calculation)
2. EventPlanConfigSheet (4-step questionnaire)
3. BoostersChecklist + ActivityTracker components
4. PostEventFeedbackModal
5. Meal suggestion engine filters for event constraints
6. Dashboard + SpecialPlansTab integration

## Files Summary
| File | Action |
|------|--------|
| `src/lib/event-plan-service.ts` | Modify — add event_based type, EventPlanSettings, calculateEventTargets |
| `src/components/EventPlanConfigSheet.tsx` | Create — 4-step event questionnaire |
| `src/components/BoostersChecklist.tsx` | Create — daily superfoods/drinks/routine checklist |
| `src/components/ActivityTracker.tsx` | Create — walking step goal card |
| `src/components/PostEventFeedbackModal.tsx` | Create — post-event feedback + transition |
| `src/lib/meal-suggestion-engine.ts` | Modify — cooking time, budget, tummy filters |
| `src/pages/Dashboard.tsx` | Modify — event banner, boosters, activity, post-event check |
| `src/components/SpecialPlansTab.tsx` | Modify — event category filter + CTA card |

## Technical Notes
- Event plan reuses `ActivePlan` interface with `planId: 'event_based'` and `customSettings` holding `EventPlanSettings`
- Feasibility check: reuses existing `calculatePlanTargets` with `MAX_WEEKLY_LOSS = 1 kg` clamp
- Boosters stored in `nutrilens_boosters_{date}` localStorage keys
- Steps stored in `nutrilens_steps_{date}` localStorage keys
- Post-event modal checks `getActivePlan() === null` AND `localStorage.getItem('nutrilens_last_event_plan')` exists

