

# 🏁 Finish Week 1 — Implementation Plan

Knock out the four remaining Week-1 items in one pass, then run a TypeScript build to verify.

---

## W1-A — Account-Deletion UI in Profile

**File:** `src/pages/Profile.tsx`

- Add a new **"Danger Zone"** section near the bottom (just above Logout).
- Single red "Delete my account" row → opens an `AlertDialog`.
- Dialog requires the user to **type `DELETE` exactly** to enable the destructive button (prevents fat-fingers).
- On confirm:
  1. Call `supabase.rpc('delete_my_account')` (RPC already exists, cascades 17 tables + `auth.users`).
  2. Clear all scoped localStorage via `clearScopedData(user.id)`.
  3. `await supabase.auth.signOut()`.
  4. `navigate('/auth', { replace: true })` and show a `toast.success("Your account and data have been permanently deleted.")`.
- Error path: `toast.error(err.message)`, keep dialog open.
- Add a small loading state (`deleting` boolean) so the button shows a spinner.
- Copy: short, non-judgmental, mentions DPDP rights and that this is irreversible.

---

## W1-B — Branded 404 Page

**File:** `src/pages/NotFound.tsx`

Rewrite to match app design language:
- `min-h-screen` flex layout with gradient background (`bg-gradient-to-br from-background to-muted`).
- Large `404` numeral in primary brand color, with a `<Sparkles />` lucide icon for warmth.
- Headline: "We couldn't find that page" + secondary line: "It may have moved, or the link is broken."
- **Two CTAs (use `<Link>` not `<a>`** so SPA state is preserved):
  - Primary `<Button asChild><Link to="/">Back to Dashboard</Link></Button>`
  - Ghost `<Button asChild><Link to="/log-food">Log a meal</Link></Button>`
- Suggested links list: Profile, Plans, Market.
- Keep the `console.error` for Sentry breadcrumb visibility.

---

## W1-C — Safe Reload Guard in Dashboard Init

**File:** `src/hooks/useDashboardInit.ts` (lines 173–183)

Replace the unconditional `window.location.reload()` with a guarded helper:

- New small function `safeReload(reason: string)` that:
  - Reads `sessionStorage.getItem('nl_reload_count')` (parsed int, default 0).
  - If `count >= 3` → log warning + skip reload (just refresh local state instead).
  - Otherwise increment, store, then call `window.location.reload()`.
- Wrap in `try/catch` so a quota/storage error never crashes the polling tick.
- Reset counter when a successful `nutrilens:update` fires (via `sessionStorage.removeItem`) so legitimate user-driven days don't accumulate.

This kills the infinite-reload loop scenario if Supabase/JS state ever gets into a bad state at midnight.

---

## W1-D — Zod Validation on Remaining Edge Functions

### `supabase/functions/log-ad-event/index.ts`

- Import zod from esm: `import { z } from "https://esm.sh/zod@3.23.8";`
- Schema:
  ```ts
  const Body = z.object({
    event_type: z.enum(["impression", "click", "conversion"]),
    campaign_id: z.string().uuid(),
    creative_id: z.string().uuid().optional(),
    placement_slot: z.string().max(64).optional(),
    user_id: z.string().uuid(),
    product_id: z.string().max(128).optional(),
    conversion_type: z.string().max(64).optional(),
  });
  ```
- Replace the manual `if (!event_type ...)` checks with `Body.safeParse()`; return 400 with `parsed.error.flatten()` on failure.
- Also: validate that `body` JSON parsed (wrap `req.json()` in try/catch → 400).

### `supabase/functions/export-user-data/index.ts`

- Same zod import.
- This function takes no body, but harden:
  - Reject non-`POST`/`GET` methods (405).
  - Add a **per-user rate limit**: query `audit_logs` for `action='data_export'` by the same user in the last 60 minutes — if >= 3, return 429. (DPDP allows access; this just prevents abuse / repeated 90 GB pulls.)
- No schema needed since there is no payload, but add the method guard + rate guard.

---

## Verification

After edits:
1. Run `npx tsc --noEmit` to confirm clean TypeScript.
2. Deploy the two edge functions (`log-ad-event`, `export-user-data`) so the Zod changes go live.
3. Spot-curl `log-ad-event` with a malformed body to confirm 400.

---

## Checklist update

When done, mark these in `.lovable/plan.md`:
- ✅ W1-A Account-deletion UI
- ✅ W1-B Branded 404
- ✅ W1-C Safe reload guard
- ✅ W1-D Zod on `log-ad-event` + `export-user-data`

Then Week 1 is fully closed and the closed-beta gate has only **W2-6 (push notifications)** remaining as a hard blocker.

---

## Files touched (summary)

| File | Change |
|---|---|
| `src/pages/Profile.tsx` | + Danger Zone + delete dialog |
| `src/pages/NotFound.tsx` | Full rewrite, branded |
| `src/hooks/useDashboardInit.ts` | `safeReload()` helper |
| `supabase/functions/log-ad-event/index.ts` | Zod validation |
| `supabase/functions/export-user-data/index.ts` | Method guard + per-user rate limit |
| `.lovable/plan.md` | Tick off W1-A/B/C/D |

Estimated total: ~5 hours of work in code, executed in one pass.

