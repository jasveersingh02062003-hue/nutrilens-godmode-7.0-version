

# Status Check + Phase 12/13 Implementation Plan

## ✅ COMPLETED (Phases 1–11)

| # | Item | Status |
|---|---|---|
| 1 | RLS: `ad_campaigns` brand-scoped | ✅ Migration 2 |
| 2 | RLS: `ad_targeting` brand-scoped | ✅ Migration 3 |
| 3 | `brand_accounts.balance` direct-write blocked + `apply_brand_transaction` RPC | ✅ Migration 4 + admin pages wired |
| 4 | `user_roles` lockdown + audit trigger | ✅ Migration 1 |
| 5 | PII masking via `get_masked_profiles` / `get_masked_profile` RPCs | ✅ Migration 5 + admin UI swapped |
| 7 | `daily_logs` optimistic locking via `upsert_daily_log` RPC | ✅ Migration 6 + `daily-log-sync.ts` |
| — | Phases 1–10 (roles, costs, brand portal, ad automation, ops, perf) | ✅ All shipped |

## ❌ INCOMPLETE

### 🔴 P0 — known gap
| # | Item | Why blocked |
|---|---|---|
| 6 | Backend rate-limiting on `analyze-food` + `monika-chat` | Platform policy: no rate-limit primitives yet. Deferred to infra. |

### 🟡 P1 — Phase 12 (Legal + Monitoring)
| # | Item | Effort |
|---|---|---|
| 9 | Privacy Policy + Terms of Service pages + footer links | M |
| 10 | Sentry error tracking + alerting | S |
| 11 | Health/medical disclaimer banner (Dashboard + Monika) | S |
| 12 | Pagination on `Progress` + `FoodArchive` (1000-row silent cap) | S |

### 🟡 P1 — Phase 13 (Payments)
| # | Item | Effort |
|---|---|---|
| 8 | Razorpay (or Stripe) integration for brand wallet top-ups | L |

### 🟢 P2 — Phase 14 (Post-launch polish)
| # | Item | Effort |
|---|---|---|
| 13 | GST invoice PDF generation | M |
| 14 | Ad fraud / click-bomb protection | M |
| 15 | DPDP data-export endpoint | M |
| 16 | Backup restore drill | S |

## 📊 Reality Check
- Overall completion: **~88%** (was 78% before Phase 11)
- Security blockers: 🟢 closed (except #6, deferred by policy)
- Production-ready: **75%** (legal + payments + monitoring still missing)
- Verdict: **🔴 NO LAUNCH** → flips to 🟢 after Phase 12 + 13

---

## 🚀 Implementation Plan — Phase 12 (Legal & Monitoring)

Recommend doing Phase 12 first (smaller, unblocks closed beta) before Phase 13 (payments).

### Step 1 — Health/medical disclaimer (#11)
- New `src/components/HealthDisclaimerBanner.tsx`: dismissible (per-session) banner — *"NutriLens provides general wellness guidance, not medical advice. Consult a doctor for health decisions."*
- Mount on `Dashboard.tsx` (top) and `MonikaChatScreen.tsx` (above input).
- Persistent footer line in Monika chat: *"AI suggestions — not medical advice."*

### Step 2 — Privacy Policy + Terms of Service (#9)
- New routes `/privacy` and `/terms` in `App.tsx` (lazy-loaded).
- New pages `src/pages/Privacy.tsx`, `src/pages/Terms.tsx` — DPDP-aligned content covering: data collected, purpose, retention, user rights (access/delete/export), grievance officer placeholder, marketing consent, third-party processors (Lovable AI, Firecrawl).
- Footer links added to `Auth.tsx`, `Onboarding` welcome screen, `Profile.tsx`, and brand `/advertise` intake.
- Checkbox on signup: *"I agree to Terms & Privacy Policy"* (required, persisted to `consent_records`).

### Step 3 — Pagination guards (#12)
- `src/pages/Progress.tsx`: replace single `select(...)` with `.range(offset, offset+99)` paged loader, "Load more" button.
- `src/pages/FoodArchive.tsx`: same pattern, 50 per page.
- Default sort: `log_date desc` so most recent always loads first.

### Step 4 — Sentry (#10)
- Install `@sentry/react`.
- Init in `src/main.tsx` with `VITE_SENTRY_DSN` env var (request via `add_secret`).
- Wrap router with `Sentry.ErrorBoundary`.
- Tag user id (non-PII) on auth state change.
- Filter PII fields (email, phone, weight, health_conditions) in `beforeSend`.
- Add to `supabase/functions/_shared/sentry.ts` for edge-function error capture (Deno SDK).

### Step 5 — Verification
- Re-run security scanner.
- Manual smoke test: signup flow shows consent checkbox; disclaimer visible; `/privacy` + `/terms` reachable; Sentry test event fires; Progress loads page-by-page.

---

## 🚀 Phase 13 (after Phase 12 ships)

Razorpay integration for brand wallet top-ups:
- New edge function `razorpay-create-order` (creates order, returns `order_id`).
- New edge function `razorpay-webhook` (verifies signature, calls `apply_brand_transaction(..., 'topup')`).
- `BrandBilling.tsx`: "Top up wallet" → Razorpay checkout → success → ledger refresh.
- Admin manual top-up path stays as fallback.
- Requires user to add `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` + `RAZORPAY_WEBHOOK_SECRET`.

---

## Stop conditions
- Phase 12 ends when: scanner clean, all 4 items shipped, smoke test passes → verdict flips to 🟡 *"ready for closed beta ≤500 users"*.
- Phase 13 ends when: live Razorpay payment lands in `brand_transactions` end-to-end → verdict flips to 🟢 *"public launch ready pending P2 polish"*.

## Recommended next action
Approve **Phase 12** first — fastest path off 🔴. I'll start with Step 1 (disclaimer) since it's a 5-minute change and immediately reduces liability, then Steps 2 → 3 → 4.

