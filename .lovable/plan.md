# Production Hardening Plan

Reality check first — three items from the checklist are already partially or fully built. The plan below reflects actual code state, not assumptions.

## Reality Check (verified by reading the code)

| Original item | Actual state |
|---|---|
| `analyze-meal-photo` | **Does not exist.** Only `analyze-food` and `monika-chat` are AI functions. Plan covers those two. |
| Per-user AI rate limiting | **Already enforced** via `_shared/ai-quota.ts` (`checkQuota` + `incrementQuota`). Tiered limits: free 5/2/3, premium 200/100/60, ultra 500/300/200. Item dropped. |
| `export_my_data` | **Already exists** as `export-user-data` edge function with hourly abuse cap. We will verify it works end-to-end and wire a UI button if missing. |
| `delete_my_account` RPC | Exists and is wired in `Profile.tsx`. We'll do a manual smoke-test, not rebuild. |

## P0 — This Week (3 items)

### 1. Validate JWT in `analyze-food` and `monika-chat`
Both functions call the Lovable AI Gateway but rely on the shared quota helper for auth. The helper does call `auth.getUser()` — so JWT IS validated when quota is checked. Audit gap: confirm every code path goes through `checkQuota` before any AI call or DB write. If any path bypasses it, add an explicit `getClaims()` guard at function entry.

### 2. End-to-end DPDP compliance smoke test
- Call `export-user-data` from a test account → confirm JSON download contains all 15 listed tables.
- Call `delete_my_account()` from a test account → confirm cascade deletes across all 19 tables in the RPC and that the auth.users row is gone.
- Add a "Download my data" button in `Profile.tsx` if not present.
- Document the data-retention policy in a `/legal/data-deletion` page (text-only, no logic).

### 3. Lock down `daily_logs.log_data` size
Add a row-level trigger (not a CHECK constraint — those must be IMMUTABLE) that rejects inserts/updates where `pg_column_size(log_data) > 100 KB`. Prevents one user from bloating the table to GBs.

## P1 — Next 2 Weeks (3 items)

### 4. Scope the admin realtime channel
`AdminLayout.tsx` line 76 subscribes every admin browser to `'admin-intake-count'`. Fine at 5 admins, breaks at 100+. Change channel name to include `auth.uid()` so each session has its own channel, OR move the count to a polling refetch (every 30s) to drop realtime entirely for this widget.

### 5. Verify edge-function JWT explicitness
Sweep all 23 edge functions and confirm each one either:
- Calls `getClaims()` / `getUser()` explicitly, or
- Is intentionally public (e.g. `payments-webhook`, `healthz`, `firecrawl-prices`) — and document why in a top-of-file comment.

### 6. Founder decisions block
Three answers needed before P2 sequencing:
- Ad-impression revenue real INR? (drives ad-fraud hardening priority)
- Expected admin staff count? (drives item #4 urgency)
- Cloud region = `ap-south-1`? (DPDP residency requirement — non-negotiable for India)

## P2 — Within 1 Month (4 items)

### 7. Recipes architecture refactor
Move 1,894-line `recipes-data.ts` to a Postgres `recipes` table. Unblocks code-splitting and lets non-engineers edit recipes via admin UI. Multi-day refactor — schedule, don't hot-patch.

### 8. AdminFunnel index
`CREATE INDEX idx_events_name_created ON public.events(event_name, created_at DESC);` — speeds up `get_funnel_counts` if the events table grows past ~1M rows.

### 9. Error monitoring
Wire Sentry (or Lovable-native logging) to capture frontend exceptions and edge-function errors. Currently zero prod visibility.

### 10. Backup verification
Confirm Lovable Cloud daily backup retention. Run one test restore to a staging instance to prove backups are usable.

## Memory

Save the post-implementation checklist to `mem://audit/production-readiness-checklist.md` so future chat sessions have the latest state.

## Technical Details (for engineers)

```text
P0.1  no code changes if checkQuota covers all paths (verify only)
P0.2  add: src/components/Profile/DataExportButton.tsx (calls export-user-data)
      add: src/pages/legal/DataDeletion.tsx
P0.3  migration: trigger on public.daily_logs BEFORE INSERT OR UPDATE
        IF pg_column_size(NEW.log_data) > 102400 THEN RAISE EXCEPTION ...

P1.4  edit src/components/admin/AdminLayout.tsx:76
        .channel(`admin-intake-count:${user.id}`)
P1.5  no code changes — review pass; add header comment to public functions
P1.6  no code — questions for founder

P2.7  multi-week — separate plan
P2.8  migration: CREATE INDEX CONCURRENTLY ...
P2.9  npm i @sentry/react @sentry/tracing  (or lovable-native)
P2.10 manual ops task — no code
```

No backend rate limiting will be added (covered by existing `ai_usage_quota` and platform constraints).

## Execution Order

Approve this plan and I'll work P0 → P1 → P2 in order. Each P0 item is a single small commit; P1 is a sweep + small edits; P2 schedules into separate plans.
