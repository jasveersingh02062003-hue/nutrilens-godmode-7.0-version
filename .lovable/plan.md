

# Production Readiness Audit — Post Phase 11/12/14

Re-audit after the security/legal/polish work. Verifies what's actually in place vs the original 12 blockers, flags what's still open, and prioritizes the remaining work. **Razorpay (#9) and government Mandi API are explicitly excluded** per your instructions.

---

## ✅ VERIFIED IMPLEMENTED (evidence-backed)

### Security (Phase 11)
| # | Item | Verified by |
|---|---|---|
| 1 | `ad_campaigns` RLS — INSERT/UPDATE gated by `is_brand_member(brand_id)` or admin | RLS policies in `<supabase-tables>` confirm |
| 2 | `ad_targeting` RLS — gated by `is_brand_member(campaign_brand_id(...))` | Confirmed |
| 3 | `brand_accounts.balance` direct-write blocked via `block_brand_balance_direct_write` trigger + `apply_brand_transaction()` RPC | DB function present, admin pages wired |
| 4 | `user_roles` — only `is_owner()` may grant; `audit_user_role_changes` trigger logs every change | DB functions present |
| 5 | PII masking via `get_masked_profiles` / `get_masked_profile` RPCs (returns first_name + age_bucket only) | Functions present, AdminUsers/AdminUserDetail wired |
| 7 | `daily_logs` optimistic locking via `upsert_daily_log(p_expected_updated_at)` RPC, returns `P0409` on conflict | Function present, `daily-log-sync.ts` wired |
| — | `audit_logs` table with super-admin-only SELECT | Confirmed |
| — | Storage buckets `meal-photos` + `brand-kyc` policies | Already correct pre-Phase 11 |

### Legal & Monitoring (Phase 12)
| Item | Verified by |
|---|---|
| `/privacy` + `/terms` routes (DPDP-aligned) | `src/pages/Privacy.tsx`, `src/pages/Terms.tsx` |
| Signup consent checkbox → `consent_records` table | Table present with proper RLS |
| `HealthDisclaimerBanner` on Dashboard + Monika chat | Component exists |
| Sentry wired (`src/lib/sentry.ts`, `initSentry()` in `main.tsx`, ErrorBoundary integration, PII scrubbing) | Files present |
| Footer legal links on Auth/Welcome/Profile | Edited |

### Post-Launch Polish (Phase 14)
| Item | Verified by |
|---|---|
| GST invoice PDF (`src/lib/gst-invoice.ts`, HSN 998365, CGST/SGST/IGST split) | File present |
| `brand_accounts.gstin` + `billing_address` columns | Confirmed in schema |
| Ad fraud guards in `log-ad-event`: 30s in-memory dedupe, 5 clicks/min cap, daily_click_cap per campaign, `is_suspicious` flag, fraud-flagged clicks excluded from billing | Edge function code confirmed |
| `ad_campaigns.daily_click_cap` (default 10), `ad_clicks.is_suspicious`, `ad_impressions.is_suspicious` | Schema confirmed |
| DPDP data export (`supabase/functions/export-user-data/index.ts` + Profile button) | Function present |
| Backup restore drill doc (`docs/BACKUP_RESTORE.md`) | File present |

---

## ❌ NOT IMPLEMENTED — Open Items

### 🔴 P0 — Will hurt within first week
| # | Item | Why it matters | Effort |
|---|---|---|---|
| O1 | **Sentry DSN secret** not added (`VITE_SENTRY_DSN` missing from secrets list) | Sentry code is dead until DSN configured → still blind to runtime errors | XS (config only, no code) |
| O2 | **Real GSTIN** not configured in `gst-invoice.ts` (`DEFAULT_SELLER` placeholder) | Issuing invoices today would be non-compliant | XS |
| O3 | **Brand fraud-flagged events still bill?** — verify `select-ads` cost rollup actually filters `is_suspicious=true` | If not filtered, fraud guards don't protect billing | S — verify + patch if needed |
| O4 | **`ON DELETE CASCADE`** missing on `ad_impressions.campaign_id`, `ad_clicks.campaign_id`, `ad_conversions.campaign_id`, `ad_creatives.campaign_id`, `ad_targeting.campaign_id`, `brand_transactions.brand_id`, `brand_members.brand_id`, `brand_documents.brand_id` (no foreign keys at all in current schema per audit output) | Orphan rows on brand churn; stats inflate | S — one migration |

### 🟡 P1 — Required before scaling past ~500 users
| # | Item | Effort |
|---|---|---|
| O5 | **Edge function rate limiting** on `analyze-food`, `monika-chat`, `scan-receipt`, `firecrawl-prices`, `select-ads` — known platform gap, deferred per system policy. Track as known risk. | N/A (infra) |
| O6 | **Admin-write protection on `city_prices` / `packed_products` / `price_history`** — current RLS allows any authenticated user to INSERT/UPDATE; price manipulation vector | S — one migration restricting to admins/service role |
| O7 | **`select-ads` SLA fallback** — verify every consumer caller wraps in try/catch and renders an empty slot (not a crash) when the function 500s | S — audit + patch callers |
| O8 | **`scan-receipt` + `analyze-food` JSON validation** — reject malformed Gemini responses before they corrupt budget/log | S — add zod schema in edge functions |
| O9 | **N+1 on Dashboard mount** — 8+ sequential supabase calls; batch into Promise.all | M |
| O10 | **Onboarding save/resume** — 1964-LOC flow, no progress persistence → high drop-off | M |
| O11 | **Delete-my-account flow** (DPDP right-to-erasure) — export exists, deletion does not | M |
| O12 | **Marketing consent** UI — column exists, never asked at signup | XS |
| O13 | **Timezone safety** — `toLocalDateStr()` uses device local; mid-day timezone shift moves meals between days | S |
| O14 | **Audit log coverage gaps** — ad campaign edits + brand wallet changes not logged (RPC writes ledger but admin UI actions aren't separately audited) | S |

### 🟢 P2 — Polish, not blocking
| # | Item | Effort |
|---|---|---|
| O15 | Service worker / offline queue for meal logs | M |
| O16 | Accessibility audit (aria, contrast, keyboard nav) | M |
| O17 | Pagination on `Progress` + `FoodArchive` cloud queries (local storage uses paging already) | S |
| O18 | Backup restore *drill* actually executed (doc exists, drill not run) | S — operational |
| O19 | Designed empty/error states beyond default toasts | M |
| O20 | Push/email re-engagement for 4-day skippers (drop-off-defense only fires on app open) | L (needs FCM + transactional email) |

### ⛔ Explicitly excluded per your instruction
- **#9 Razorpay** payment integration
- **Government Mandi API** integration

---

## 📊 Reality Check

| Metric | Status |
|---|---|
| Phases 1–10 (build) | ✅ Done |
| Phase 11 (security) | ✅ 100% (except infra rate-limiting) |
| Phase 12 (legal + monitoring) | 🟡 95% — DSN + delete-account missing |
| Phase 14 (post-launch polish) | ✅ Shipped (4 items) |
| **Production-ready (excl. Razorpay/Mandi)** | **~85%** |

**Verdict (excluding Razorpay + Mandi):**
- 🟢 **Closed beta ≤500 users:** READY *after* O1+O2+O4 land (a few hours of work).
- 🟡 **Public consumer launch ≤10k:** needs O3, O6–O14 (~1 week).
- 🔴 **Brand self-serve at scale:** still gated on Razorpay (your call to skip).

---

## 🚀 Implementation Plan — Prioritized

### Sprint A — Closed-Beta Gate (1 day, ~5 files)
Goal: flip verdict to 🟢 for ≤500 closed beta users.

1. **O1 — Sentry DSN config**
   - I'll request `VITE_SENTRY_DSN` via the secrets tool. No code change.
2. **O2 — Real GSTIN in `gst-invoice.ts`**
   - Edit `DEFAULT_SELLER` constant only. Ask you for GSTIN + registered address before editing.
3. **O3 — Verify fraud filter in `select-ads`**
   - Read `supabase/functions/select-ads/index.ts`, confirm `is_suspicious=false` filter on cost rollup. Patch if missing (single edge-function edit).
4. **O4 — Orphan-prevention migration**
   - One migration: add proper FK constraints with `ON DELETE CASCADE` on all `ad_*` and `brand_*` child tables.

### Sprint B — Pre-Public-Launch (3–5 days)
Goal: harden for self-serve consumer growth past 500.

5. **O6** — Lock down `city_prices` / `packed_products` / `price_history` writes to admin/service role (1 migration).
6. **O8** — Add zod validation to `scan-receipt` + `analyze-food` response parsing (2 edge function edits).
7. **O7** — Audit `select-ads` callers for try/catch fallback (search + patch ~3–5 components).
8. **O11** — Build "Delete my account" flow: new edge function `delete-user-account` + Profile button + audit log entry.
9. **O12** — Add marketing-consent toggle on signup (1 checkbox + write to `profiles.marketing_consent`).
10. **O13** — Replace `toLocalDateStr()` device-local with stored user timezone preference (`profiles.timezone` migration + helper update).
11. **O14** — Add audit log writes for ad campaign UPDATE and brand transaction RPC calls.
12. **O9** — Batch Dashboard mount queries into `Promise.all` (single file: `useDashboardInit.ts`).

### Sprint C — Scale & Polish (post-launch, parallelizable)
13. **O10** — Onboarding save/resume (write step to `profiles` after each step).
14. **O17** — Cloud-side pagination on Progress + FoodArchive.
15. **O15, O16, O19, O20** — Polish items, opportunistic.

### Known infra gap (no action)
- **O5** — Edge function rate limiting: cannot be implemented today per platform policy. Track as a launch risk; mitigate by monitoring `api_usage` daily and using LOVABLE_API_KEY quotas.

---

## 🎯 Recommended Next Step
Approve **Sprint A** (4 items, ~1 day). After it lands, you can safely run a closed beta of ≤500 invited users while Sprint B work continues in parallel.

When you approve, I'll start with **O4 (FK cascade migration)** since it's pure schema and unblocks safe brand churn, then **O3 (fraud-filter verification)**, then ask you for GSTIN (O2) and Sentry DSN (O1).

