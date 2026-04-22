

# Phase 3 Audit + Sequenced Plan (Monika AI Upgrade)

## Honest audit of your 6 Phase 3 tasks

I read `monika-chat/index.ts` (513 lines), `analyze-food/index.ts` (195 lines), `MonikaChatScreen.tsx`, `condition-coach.ts`, and `NextMealCard.tsx`. Here's the truth — most of Phase 3 is already done:

| # | Task | Senior dev says | Reality in your code | Recommendation |
|---|------|----------------|----------------------|----------------|
| 3.1 | Enrich Monika's system prompt | "Add profile + meals + macros + budget + conditions" | **✅ ALREADY DONE.** 308-line system prompt already injects: full profile, today's meals, `realTimeStatus` (remainingCal/protein/budget), 30-day history, conditions, supplements, weather, skin concerns, streaks, achievements. **Better than spec.** | **SKIP.** Zero work needed. |
| 3.2 | Food-specific Q&A with conditions | "Use condition-coach + allergen-engine" | **⚠️ PARTIAL.** Prompt has hand-coded condition rules (diabetes, PCOS, thyroid, etc.) but does **NOT** call your existing `condition-coach.ts` (599 lines) or `allergen-engine.ts`. So answers are generic, not driven by your tuned engines. | **DO IT** — wire the deterministic engines into context per-message. |
| 3.3 | Live price awareness | "Query city_prices for user's city" | **❌ MISSING.** Monika has zero price data. If user asks "chicken price in Hyderabad?", she'll guess. | **DO IT** — fetch top 15 items for user's city + inject into context. |
| 3.4 | Meal photo portion accuracy | "Add Indian portion sizes (1 roti=30g, 1 katori=180cal)" | **✅ ALREADY DONE.** `analyze-food` system prompt has 30+ Indian portion references (roti=40g, dal=150g, idli=50g, biryani=250g, etc.). **More accurate than spec** (40g roti is correct per IFCT2017, not 30g). | **SKIP.** Zero work needed. |
| 3.5 | Conversation memory | "Store last 10 in `monika_conversations` table" | **⚠️ LOCAL ONLY.** History saved to `localStorage` (last 100 msgs) and **already passed in every API call** (`apiMessages.map`). So Monika DOES remember within a device. **Missing:** cross-device sync. | **DO IT (lite)** — small cloud table for last 20 messages, syncs on login. Don't break the local fast-path. |
| 3.6 | Smart dinner gap suggestions | "If 30g protein short, suggest 3 dinner options in budget" | **⚠️ PARTIAL.** `NextMealCard.tsx` already does this for the *current* slot using `getRecipesForMeal(slot, budget, profile, remainingCal, remainingProt)`. Works for any slot, including dinner. **What's missing:** an explicit "Gap Filler" framing when protein deficit is large, plus showing 3 distinct options at once instead of one-at-a-time carousel. | **DO IT (small)** — add a gap-aware variant + show top 3 side-by-side when gap > 20g protein. |

**Net result:** Of 6 tasks → **3 already done**, **3 worth doing this round**. Saves ~10–15 credits vs. naive plan.

---

## Strict execution order (one at a time, verified after each)

### **Step A — Task 3.3: Live price awareness in Monika** (45 min, ~3 credits) ★ start here
**Why first:** Highest visible upgrade. Takes Monika from "guessing prices" to "knows your city today".

1. **In `monika-chat/index.ts`**, after the existing supabase client is created, add a fetch:
   ```ts
   const userCity = userContext?.profile?.city?.toLowerCase();
   if (userCity) {
     const { data: cityPrices } = await supabase
       .from('city_prices')
       .select('item_name, avg_price, price_date, source, updated_at')
       .eq('city', userCity)
       .gte('price_date', sevenDaysAgo)
       .order('updated_at', { ascending: false })
       .limit(30);
   }
   ```
2. **Inject into system prompt** as a new block "LIVE PRICE DATA (CITY: X)" with each item, price, date, source, and a freshness label (`Live`/`2d old`/`Stale`).
3. **Add prompt rule:** "When asked about a price, ONLY quote from this list. If item missing, say 'I don't have a fresh price for X in [city] — last reported value would be from static data, may not reflect today.'"
4. **Verify:** Open Monika → ask "What's chicken priced at in [my city]?" → confirm she returns a real ₹/kg with date.

### **Step B — Task 3.2: Wire condition-coach into Monika** (45 min, ~3 credits)
1. **Move `condition-coach.ts` keyword sets** (HIGH_GI, DAIRY, GLUTEN, etc.) to the edge function context, OR (cleaner) add a tiny inline classifier in `monika-actions.ts` `buildMonikaContext()` that runs **client-side** before each call.
2. **Compute on every send:** for each user health condition, build a `conditionGuidance` block: `{ diabetes: { avoid: [...high-GI matches in last 7 days], prefer: [...low-GI alternatives] }, ... }` based on actual logged meals.
3. **Inject** into system prompt as "CONDITION-SPECIFIC GUIDANCE FOR THIS USER".
4. **Verify:** With a PCOS test profile, ask "Can I eat paneer for dinner?" → confirm response cites PCOS context (low-GI ✓, high protein ✓, dairy moderation note).

### **Step C — Task 3.6: Gap-Filler dinner card** (30 min, ~2 credits)
1. **In `NextMealCard.tsx`**, when `slot === 'dinner'` AND `remainingProt > 20g`, switch to "Gap Filler" mode:
   - Header changes to "🎯 Close your protein gap"
   - Render top 3 recipes in a 1-column stacked list (not carousel) — easier to compare at a glance on mobile.
   - Each shows: name, protein delta (`+22g`), kcal, ₹, "Log this" button.
2. **Sort** by `protein desc` then `cost asc` within `getRecipesForMeal` results.
3. **Verify:** Set a profile with 80g daily protein, log breakfast (10g) + lunch (15g) → dashboard at 6pm shows "Close your protein gap" card with 3 high-protein dinner options under remaining budget.

### **Step D — Task 3.5: Cloud-synced conversation memory** (45 min, ~4 credits)
1. **DB migration:** `monika_conversations` table
   - `id uuid pk`, `user_id uuid`, `role text check ('user'|'assistant')`, `content text`, `created_at timestamptz`
   - RLS: users SELECT/INSERT/DELETE own only
   - Index: `(user_id, created_at desc)`
2. **In `MonikaChatScreen.tsx`:**
   - On first open per session, fetch last 20 messages from cloud → merge with localStorage (cloud wins on conflict).
   - On every send/receive, fire-and-forget INSERT to cloud (don't block UI).
   - Keep localStorage as the fast-path (offline still works).
3. **Add "Clear chat" cloud sync** — when user clicks Trash icon, delete cloud rows too.
4. **Verify:** Send 3 messages on desktop → log in on phone → confirm history appears within 2s.

### **Step E — Tasks 3.1 + 3.4** ⏭️ **SKIPPED**
Already shipped and verified during prior phases. No-op.

### **Step F — Manual QA pass** (15 min, 0 credits)
After A–D ship I will:
1. Open Monika → ask "price of chicken in [city]?" → confirm real price with date
2. Ask "Can I eat paneer with PCOS?" → confirm PCOS-specific reasoning
3. Open Dashboard at dinner time with low protein → confirm Gap Filler card with 3 options
4. Send a message → log in to a different browser session → confirm history loaded from cloud
5. Send a meal photo → confirm portion sizes use the existing Indian rules (already working)

I'll report each ✅ or ❌.

---

## Tasks I'm explicitly NOT doing (and why)

| Skipped | Reason |
|---------|--------|
| Re-writing system prompt for 3.1 | Already 308 lines, more comprehensive than spec asked |
| Adding portion rules to analyze-food (3.4) | Already has 30+ rules, more accurate than spec values (40g roti vs spec's 30g) |
| Switching default model to Pro | Flash is fine for chat; Pro adds latency without quality gain for this use case |
| Per-message vector embeddings / true RAG | Overkill — direct context injection of city prices + conditions is faster and cheaper than embeddings for ~30 items |
| Push notifications for Monika proactive nudges | Out of scope for Phase 3; was Phase 5 plan |

---

## Technical details

**Files to modify**
- `supabase/functions/monika-chat/index.ts` — add city_prices fetch + condition-guidance block
- `src/lib/monika-actions.ts` — `buildMonikaContext()` adds `conditionGuidance` derived from condition-coach keyword sets
- `src/components/NextMealCard.tsx` — Gap Filler variant when dinner + protein gap >20g
- `src/components/MonikaChatScreen.tsx` — cloud history fetch on mount + insert on send

**Files to create**
- *(no new components)*

**DB migration (1)**
- New table `monika_conversations` + RLS + index `(user_id, created_at desc)`

**No new dependencies. No secret changes. No new edge functions.**

**Total estimate:** ~2.5 hrs build, ~12 credits. Order: **A → B → C → D → F**. After each step I'll say `Step A done, verified — moving to B` so you can stop me if anything looks off.

