

# Resume Phase 3 — Steps C & D

Steps A (live prices) and B (condition guidance) shipped last round. Picking up exactly where we paused.

---

## Step C — Gap-Filler Dinner Card (Task 3.6) ★ start here
**~30 min, ~2 credits**

**Why now:** Visible on every dashboard at dinner time, zero infra risk, no DB changes.

**What changes in `src/components/NextMealCard.tsx`:**
1. Detect "Gap-Filler" mode when **all three** are true:
   - `slot === 'dinner'`
   - `remainingProt > 20g`
   - `remainingCal >= 200` (avoid suggesting when day is essentially closed)
2. When in Gap-Filler mode:
   - Header switches to: 🎯 **"Close your protein gap"** + subline `"Need {X}g protein in ₹{budget}"`
   - Render the **top 3 recipes stacked vertically** (no carousel, no dot indicators) — sorted by `protein desc` then `estimatedCost asc`
   - Each row shows: emoji + name, `+Xg protein` chip (green), kcal, ₹, and a compact **"Log"** button
   - Pantry/context badges still shown, kept compact
3. When NOT in Gap-Filler mode → existing carousel behavior is unchanged (zero regression risk for breakfast/lunch/snack)

**No engine changes** — `getRecipesForMeal` already returns up to 5 recipes ranked by PES + protein bonuses, so we just slice the top 3 in the new branch.

**Verify:** Profile with 80g daily protein, log breakfast (10g) + lunch (15g) → at 6pm dashboard shows "Close your protein gap" card with 3 stacked high-protein dinner options under remaining budget.

---

## Step D — Cloud-Synced Chat History (Task 3.5)
**~45 min, ~4 credits**

**DB migration (1):**
```sql
create table public.monika_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.monika_conversations enable row level security;

create policy "Users read own conversations"
  on public.monika_conversations for select
  using (auth.uid() = user_id);
create policy "Users insert own conversations"
  on public.monika_conversations for insert
  with check (auth.uid() = user_id);
create policy "Users delete own conversations"
  on public.monika_conversations for delete
  using (auth.uid() = user_id);

create index idx_monika_conv_user_created
  on public.monika_conversations (user_id, created_at desc);
```

**What changes in `src/components/MonikaChatScreen.tsx`:**
1. **On mount (`open === true`, first time per session):**
   - Read localStorage history (instant, fast-path stays)
   - Fire-and-forget `select` last 20 cloud rows → if cloud has rows newer than last localStorage entry, merge (cloud wins on conflict) and update state + localStorage
2. **On every `setMessages` for new user/assistant message:**
   - Existing localStorage save stays untouched
   - Add a fire-and-forget `insert` of `{role, content}` (no `await`, no UI block); silently ignore errors
3. **`clearHistory`:** also fire-and-forget `delete` of all cloud rows for `user_id`
4. **Offline behavior:** unchanged — localStorage remains the source of truth; cloud is a sync layer

**Verify:**
- Send 3 messages on this device → check `monika_conversations` table has 3 rows
- Open app on a different browser/incognito → confirm history loads within ~2s
- Click Trash → confirm both local and cloud rows cleared

---

## Step F — Manual QA pass (15 min, 0 credits)
After C and D ship I'll verify:
1. Dashboard at 7pm with low protein → Gap-Filler card with 3 stacked options ✅
2. Dashboard at 7pm with protein already met → normal single-recipe card (no regression) ✅
3. Dashboard at lunch → normal carousel (no regression) ✅
4. Send Monika message → cloud row appears ✅
5. Cross-browser → history syncs ✅
6. Clear chat → cloud rows gone ✅

---

## Files touched

**Modified (2):**
- `src/components/NextMealCard.tsx` — Gap-Filler conditional branch
- `src/components/MonikaChatScreen.tsx` — cloud fetch on mount + insert on send + delete on clear

**Created (0):** no new components

**DB migration (1):** `monika_conversations` table + RLS + index

**No new dependencies. No edge function changes. No secret changes.**

**Order:** Step C → Step D → Step F. After Step C I'll say `Step C done, verified — moving to D` so you can pause if needed.

