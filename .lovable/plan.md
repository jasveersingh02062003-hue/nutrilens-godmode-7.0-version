

## Upgrade Monica AI System Prompt – Personal Nutrition Intelligence Agent

### Summary
Rewrite the Monica system prompt in the edge function to transform her from a friendly chatbot into a structured personal nutrition intelligence agent. Add budget/expense context, supplement data, meal plan data, and skin concerns to the context builder. Add cost tracking to meal action blocks.

### Changes

**1. Edge Function – System Prompt Rewrite** (`supabase/functions/monika-chat/index.ts`)

Replace the entire system prompt with a production-grade structured prompt that includes:

- **Role definition**: Personal nutrition intelligence agent, not a generic chatbot
- **Memory-first rule**: Always check user context before responding; never re-ask known info
- **Meal logging rules**:
  - Auto-detect meal time from current hour (5-10→breakfast, 11-15→lunch, 15-18→snack, 18+→dinner), confirm with user
  - ALWAYS ask for cost/price if not provided
  - Include `cost` field in `log_meal` action blocks
  - Estimate nutrition using IFCT2017; ask for quantity if unclear
- **Budget intelligence**: Track daily spend vs budget, warn on overspending, suggest adjustments
- **Health-aware recommendations**: Cross-reference conditions (diabetes→low-GI, PCOS→anti-inflammatory, etc.) with every food suggestion
- **Skin-aware advice**: Link skin concerns to nutrition (acne→zinc, eczema→omega-3, etc.)
- **Supplement awareness**: Reference user's supplement stack; suggest timing, warn interactions
- **Adaptation rules**: Notice patterns (skipping meals, overspending, favorite foods), reference them naturally
- **Proactive behavior**: Suggest meals based on remaining budget/calories, nudge hydration, remind supplements
- **Correction style**: Never block; gently suggest alternatives
- **Response style**: Short, practical, data-backed, no fluff

Keep all existing action block formats (log_meal, log_activity, log_water, generate_report) but add `cost` field to log_meal.

**2. Context Builder Enhancement** (`src/lib/monika-actions.ts`)

Expand `buildMonikaContext()` to include:
- Budget settings and today's spending (from `expense-store.ts`)
- Supplement log for today (already in daily log but ensure it's surfaced)
- Skin concerns from profile/onboarding data
- User's liked/disliked foods if stored
- Meal plan data if available
- Current hour (for meal time detection on backend)

**3. Meal Action – Cost Field** (`src/lib/monika-actions.ts`)

Update `MealAction` interface to include optional `cost` field. When executing, store cost alongside the meal entry (add to meal's notes or a dedicated field).

### Files to Modify
- `supabase/functions/monika-chat/index.ts` – Full system prompt rewrite
- `src/lib/monika-actions.ts` – Expand context builder + add cost to MealAction

### What Stays the Same
- All existing action parsing, streaming, chat UI, voice input, image analysis
- Edge function structure (CORS, error handling, streaming)
- Chat history persistence

