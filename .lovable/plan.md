

## Setup Completion Prompt: Budget & Meal Planner Nudge

### What to Build

1. **One-time center modal on Dashboard** — shown only once after onboarding completes, if the user hasn't set up their meal planner profile. Asks them to set up budget & meal plan. "Set My Plan" navigates to `/planner`; "Do it later" dismisses permanently (stored in localStorage).

2. **Persistent banner on Dashboard** — if the user dismissed the modal but still hasn't completed meal planner setup, show a compact top banner with a CTA linking to `/planner`. Disappears once `getMealPlannerProfile()` returns a completed profile.

3. **Budget step helper text in Onboarding** — on the budget input step, add a small note: "You can fine-tune your budget in the Meal Planner after onboarding."

### Files to Change

**`src/pages/Dashboard.tsx`**
- Import `getMealPlannerProfile` from `@/lib/meal-planner-store`
- Add state: `showPlannerModal` (true if `getMealPlannerProfile()` is null AND `localStorage.getItem('planner_modal_dismissed')` is falsy)
- Add state: `showPlannerBanner` (true if `getMealPlannerProfile()` is null, regardless of modal)
- Render a `Dialog` modal when `showPlannerModal` is true with title "Set up your daily plan", body text, and two buttons
- Render a compact banner below the header when `showPlannerBanner && !showPlannerModal`
- Both "Set My Plan" buttons navigate to `/planner`
- "Do it later" sets `localStorage.setItem('planner_modal_dismissed', 'true')` and closes modal

**`src/pages/Onboarding.tsx`**
- On the budget/lifestyle step, add a `<p>` helper: "👉 Head to Meal Planner after onboarding to match your budget with meals"

### What Stays Unchanged
Everything else — calorie engine, Monica, meal planner page, onboarding flow structure.

