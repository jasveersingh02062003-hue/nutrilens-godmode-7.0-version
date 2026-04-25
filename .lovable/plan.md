# Production Hardening — Status & Next Steps

## Checklist: Done vs Not Done

### P0 — This Week

| # | Item | Status | Evidence |
|---|---|---|---|
| P0.1 | JWT validation in `analyze-food` & `monika-chat` | **Done** | Both functions gate logic behind `checkQuota()`, which calls `auth.getUser()` first. Verified in audit. |
| P0.2a | `delete_my_account()` RPC works end-to-end | **Done** | RPC exists, cascades 19 tables + `auth.users`, wired in `Profile.tsx`. |
| P0.2b | `export-user-data` returns full data | **Done** | Patched: replaced hard `.limit(10_000)` with paginated 1k-row batches up to 100k cap, plus `_truncated_at` marker. |
| P0.2c | "Download my data" button in Profile | **Not done** | No UI button yet — function exists, no caller. |
| P0.2d | `/legal/data-deletion` retention page | **Not done** | No such route. |
| P0.3 | `daily_logs.log_data` 100KB size guard | **Done** | Migration applied: `guard_daily_logs_size_trg` BEFORE INSERT OR UPDATE rejects payloads >100KB with errcode `54000`. |

### P1 — Next 2 Weeks

| # | Item | Status |
|---|---|---|
| P1.4 | Scope `admin-intake-count` realtime channel per-user | **Not done** |
| P1.5 | Sweep all 23 edge functions for explicit JWT/public docs | **Not done** |
| P1.6 | Founder decisions (ad revenue, admin count, cloud region) | **Open questions** |

### P2 — Within 1 Month

| # | Item | Status |
|---|---|---|
| P2.7 | Migrate `recipes-data.ts` (1894 lines) to Postgres `recipes` table | **Not done** — separate plan |
| P2.8 | `idx_events_name_created` index on `events(event_name, created_at DESC)` | **Not done** |
| P2.9 | Error monitoring (Sentry / Lovable-native) | **Not done** |
| P2.10 | Backup retention + test restore | **Not done** — manual ops |

---

## Implementation Plan (remaining work, in order)

### Phase A — Finish P0 (UI + legal page)

**A1. `src/components/profile/DataExportButton.tsx`**
- Calls `supabase.functions.invoke("export-user-data")`
- On success, downloads returned JSON as `monika-data-export-<date>.json`
- Toast feedback for success/error/rate-limit (429)
- Loading state while request runs

**A2. Wire button into `Profile.tsx`**
- Place above the "Delete account" section under a new "Your Data" card
- Copy: "Download a JSON copy of all your data (DPDP Section 11)"

**A3. `src/pages/legal/DataDeletion.tsx`**
- Static text page, no logic
- Sections: What we store, Retention period, How to export, How to delete, Contact
- Add route `/legal/data-deletion` in `App.tsx`
- Link from Profile and from Privacy page footer

---

### Phase B — P1 work

**B1. Per-user realtime channel** (`src/components/admin/AdminLayout.tsx`)
- Change `.channel('admin-intake-count')` → `` `.channel(`admin-intake-count:${user.id}`) ``
- One liner; same payload, different channel name

**B2. Edge-function JWT sweep**
- Walk all 23 functions in `supabase/functions/`
- For each, top-of-file comment: `// AUTH: requires JWT (validated via X)` or `// AUTH: public — reason`
- Already-public expected: `payments-webhook`, `healthz`, `firecrawl-prices`, `get-paddle-price`, `nightly-ad-health`, `expire-subscriptions`, `check-price-alerts`, `fetch-govt-prices`
- All others must show an explicit `auth.getUser()` / `checkQuota()` call

**B3. Founder questions** — surfaced via questions tool, not code:
- Is ad-impression revenue real INR? (drives ad-fraud P0/P2 priority)
- Expected admin staff count? (drives B1 urgency)
- Cloud region = `ap-south-1`? (DPDP residency)

---

### Phase C — P2 quick wins (defer recipes refactor)

**C1. Events index** — migration:
```text
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_name_created
  ON public.events(event_name, created_at DESC);
```
Speeds `get_funnel_counts` once events grow past ~1M rows.

**C2. Error monitoring** — separate plan, requires founder decision on Sentry vs Lovable-native (cost vs. visibility tradeoff).

**C3. Backup test restore** — manual ops checklist, no code.

**C4. Recipes table migration** — multi-day refactor, separate plan after C1–C3.

---

## Execution Order

1. Phase A (3 small commits, ~30 min)
2. Phase B1 + B2 (1 commit each, ~20 min)
3. Phase B3 — ask founder
4. Phase C1 (1 migration)
5. Schedule C2/C3/C4 as separate plans after founder input.

After each phase completes, update `mem://audit/production-readiness-checklist.md` with the new status.

## Technical Details

```text
A1  src/components/profile/DataExportButton.tsx  (new)
A2  src/pages/Profile.tsx                         (edit — add button)
A3  src/pages/legal/DataDeletion.tsx              (new)
    src/App.tsx                                   (edit — add route)
    src/pages/Privacy.tsx                         (edit — link)

B1  src/components/admin/AdminLayout.tsx          (1-line edit)
B2  supabase/functions/*/index.ts                 (header comments only)

C1  supabase/migrations/<ts>_idx_events.sql       (new)
```

No new dependencies. No schema changes except C1 index. No backend rate limiting added — existing `ai_usage_quota` is sufficient.