

# Plan: User Intelligence Engine — Deep Context-Aware Suggestions

## Summary
Build a proactive context engine that synthesizes the user's occupation, work style, kitchen setup, weather, last meal, stress, and sleep into actionable food suggestions surfaced across Dashboard, Meal Planner, and Camera.

## What Already Exists
- `UserProfile` has: `occupation`, `jobType`, `workActivity`, `sleepHours`, `stressLevel`, `cookingHabits`, `eatingOut`, `caffeine`, `alcohol`
- Weather service with live/simulated temp, season, humidity
- Weather nudge service (protein gap, calorie gap, hot/cold/monsoon tips, skin tips)
- Coach engine with pattern detection
- Meal suggestion engine with plan/weather/pantry/budget scoring
- Onboarding collects occupation, work activity, exercise, cooking habits

## New Data to Collect

### Extended Profile Fields (added to UserProfile)
- `travelFrequency`: 'never' | 'sometimes' | 'often'
- `kitchenAppliances`: string[] (stove, microwave, airFryer, oven, fridge, none)
- `workplaceFacilities`: string[] (fridge, microwave, none)
- `carriesFood`: 'always' | 'sometimes' | 'never'
- `livingSituation`: 'alone' | 'family' | 'shared'

### Collection Point
Add a "Lifestyle & Work Details" section in **Profile** (EditProfileSheet) — collapsible, optional. Not in onboarding (too long already).

## Changes to Build

### 1. Extend UserProfile + Cloud Sync
**Files:** `src/lib/store.ts`, `src/contexts/UserProfileContext.tsx`
- Add 5 new optional fields to `UserProfile`
- Map to cloud `profiles` table via `conditions` JSON field (already used for extensible data)

### 2. Lifestyle Section in EditProfileSheet
**File:** `src/components/EditProfileSheet.tsx`
- Add collapsible "Work & Lifestyle" section with:
  - Travel frequency (radio: Never / Sometimes / Often)
  - Kitchen appliances (multi-select chips)
  - Workplace facilities (multi-select chips)
  - Carries food (radio)
  - Living situation (radio)

### 3. Context Intelligence Engine (NEW)
**File:** `src/lib/context-engine.ts`
- Main function: `getContextualSuggestions(profile, weather, log): ContextSuggestion[]`
- Returns prioritized suggestions based on rules:

| Context | Rule | Suggestion |
|---------|------|------------|
| jobType = 'physical' or 'field' | High exertion | "Pack high-protein portable meals — soya wrap, eggs, fruit" |
| travelFrequency = 'often' | On the go | "No-fridge meals: wraps, boiled eggs, makhana, sprouts" |
| workplaceFacilities has no microwave | No reheat | "No-reheat lunch ideas: cold salads, wraps, curd rice" |
| weather.temp > 34 | Hot day | "Stay cool — buttermilk, coconut water, cucumber" |
| weather.temp < 18 | Cold day | "Warm up with ginger tea, soup, dal" |
| season = 'monsoon' | Immunity | "Boost immunity — turmeric milk, ginger, light cooked meals" |
| lastMeal > 800 kcal | Heavy meal | "Last meal was heavy — try a light dinner (soup, salad)" |
| lastMeal < 300 kcal | Under-ate | "You ate very little — add a protein snack" |
| stressLevel = 'high' | Stress eating | "Calming foods: bananas, oats, dark chocolate, magnesium" |
| sleepHours < 6 | Poor sleep | "Low sleep increases hunger — prioritize protein to stay full" |
| nightShift (jobType) | Irregular hours | "Main meal before your shift. Avoid heavy food after midnight" |
| carriesFood = 'never' + travels | No packed food | "Quick grab options: sprouts box, roasted chana, fruit" |
| cookingHabits = 'none' | No cooking | "Zero-cook meals: curd + muesli, fruit bowl, sprout chaat" |

- Each suggestion has: `type`, `icon`, `text`, `priority`, `recipes?[]`, `dismissKey`
- Max 2-3 suggestions returned, deduplicated by type
- Dismissed suggestions stored in localStorage for 24h

### 4. Contextual Tips Card on Dashboard (NEW)
**File:** `src/components/ContextualTipsCard.tsx`
- Compact card below WeatherNudgeCard showing 1-2 tips from context engine
- Animated slide-in, dismissible per tip (24h cooldown)
- "Why this tip?" expandable explanation
- Optional recipe links that navigate to planner

**File:** `src/pages/Dashboard.tsx`
- Import and render `ContextualTipsCard` after weather nudge section

### 5. Context-Aware Recipe Badges in Meal Suggestion Engine
**File:** `src/lib/meal-suggestion-engine.ts`
- Add context scoring in `getRecipesForMeal()`:
  - If user travels often → boost recipes tagged `portable` (+15 score)
  - If no microwave → filter out `needs_reheat` tagged recipes
  - If cookingHabits = 'none' → boost `no_cook` recipes (+20)
  - If hot weather → boost `cooling` tagged recipes (+10)
  - If cold weather → boost `warming` tagged recipes (+10)
- Add `contextBadge?: string` to `SuggestedRecipe` (e.g., "🚗 Travel-friendly", "❄️ No reheat needed", "🌡️ Cooling")

### 6. Coach Engine Integration
**File:** `src/lib/coach.ts`
- Add occupation-aware coaching messages:
  - Physical workers: hydration reminders, energy-dense breakfast nudge
  - Desk workers: movement break + light meal reminders
  - Travelers: portable meal prep suggestions on Sunday evenings

## Implementation Order
1. Extend UserProfile + cloud sync mapping
2. EditProfileSheet — lifestyle section
3. Context engine (`context-engine.ts`)
4. ContextualTipsCard component + Dashboard integration
5. Meal suggestion engine — context scoring + badges
6. Coach engine — occupation-aware messages

## Files Summary
| File | Action |
|------|--------|
| `src/lib/store.ts` | Modify — add 5 fields to UserProfile |
| `src/contexts/UserProfileContext.tsx` | Modify — map new fields to cloud |
| `src/components/EditProfileSheet.tsx` | Modify — add lifestyle section |
| `src/lib/context-engine.ts` | Create — intelligence engine |
| `src/components/ContextualTipsCard.tsx` | Create — dashboard tips card |
| `src/pages/Dashboard.tsx` | Modify — render ContextualTipsCard |
| `src/lib/meal-suggestion-engine.ts` | Modify — context scoring + badges |
| `src/lib/coach.ts` | Modify — occupation-aware messages |

