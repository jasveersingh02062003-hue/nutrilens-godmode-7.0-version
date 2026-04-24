
# Brand Onboarding & Ads — Audit + Implementation Plan

A line-by-line check of the Yoga Bar story against your real codebase, then a focused build plan to close the gaps. Sections: (1) checklist, (2) what to fix, (3) implementation steps, (4) what to NOT touch.

---

## 1. Compliance Checklist (story vs reality)

Legend: DONE = fully built · PARTIAL = exists but missing fields/flow · MISSING = needs to be built

### A. Discovery & landing page (`/advertise`)
| # | Story requirement | Status | Where it lives |
|---|---|---|---|
| A1 | Public marketing landing pitch (USPs, stats, case study) | MISSING | `src/pages/Advertise.tsx` is just a form, no pitch |
| A2 | "Apply to advertise" CTA → form | DONE | `src/pages/Advertise.tsx` |
| A3 | Form writes to `brand_intake` table | DONE | RLS allows anonymous insert with email check |

### B. Application form (intake)
| # | Story requirement | Status | Notes |
|---|---|---|---|
| B1 | Brand name, contact name, email | DONE | required fields enforced |
| B2 | Phone, website, monthly budget, categories, notes | DONE | optional fields present |
| B3 | Legal entity name | MISSING | not captured |
| B4 | GSTIN | MISSING | column exists on `brand_accounts` only |
| B5 | FSSAI license number + cert upload | MISSING | not captured |
| B6 | Quick-commerce listings (Zepto/Blinkit/Instamart links) | MISSING | not captured — your stated KEY check |
| B7 | Top SKUs / price range | MISSING | not captured |
| B8 | "Why NutriLens" free text | DONE (as `notes`) | |
| B9 | Auto-reject if Amazon-only | MISSING | no logic |

### C. Admin notification when intake arrives
| # | Story requirement | Status | Notes |
|---|---|---|---|
| C1 | Bell icon for admins | DONE | `NotificationBell` mounted in `AdminLayout` |
| C2 | DB trigger that creates a notification on `brand_intake` insert | MISSING | trigger only exists for `ad_campaigns` (`notify_campaign_status_change`) |
| C3 | Email to admin team | MISSING | no email infra hooked up yet |

### D. Admin review queue for intake applications
| # | Story requirement | Status | Notes |
|---|---|---|---|
| D1 | `/admin/brands` lists pending applications | MISSING | page only shows already-onboarded `brand_accounts`, never reads `brand_intake` |
| D2 | Detail page with the 6 verification checks (GSTIN, FSSAI, quick-commerce, label, PES, reputation) | MISSING | no UI surface |
| D3 | "Approve & Onboard" creates `brand_accounts` + emails contact | PARTIAL | admins can manually create a brand via dialog, but it isn't tied to the intake row, and no email |
| D4 | Reject with reason → status update on intake | MISSING | `brand_intake.status` never moved off `'new'` |
| D5 | Audit-log every decision | DONE for brand_accounts ops; MISSING for intake decisions |

### E. Brand portal (post-approval)
| # | Story requirement | Status | Notes |
|---|---|---|---|
| E1 | Login → `/brand` dashboard | DONE | `Auth.tsx` redirects by role; `RequireBrand` gate exists |
| E2 | Wallet top-up | DONE | admin-driven via `apply_brand_transaction`; brand-self-serve top-up via Paddle is MISSING |
| E3 | Create campaign (5-step wizard) | DONE | `BrandNewCampaign.tsx` |
| E4 | Insufficient-balance check on submit | DONE | client warning + RPC enforces it |
| E5 | Submit for review → `pending_review` | DONE | `submit_campaign_for_review` RPC |
| E6 | Owner-only billing access | DONE | `useBrandRole` + `BrandBilling` redirect |

### F. Campaign approval flow (the second gate)
| # | Story requirement | Status | Notes |
|---|---|---|---|
| F1 | Admin sees pending queue at `/admin/ads` | PARTIAL | the page lists ALL campaigns with status badge, but no "pending review only" view, no Approve/Reject buttons inline. The detail route `/admin/ads/:id` exists but we should confirm it has the review buttons |
| F2 | `review_campaign` RPC | DONE | approve/reject both implemented |
| F3 | Status-transition trigger blocks brand self-activation | DONE | `enforce_campaign_status_transition` |
| F4 | Brand notified of decision | DONE | `notify_campaign_status_change` trigger writes to `notifications` |

### G. Ad serving & money flow
| # | Story requirement | Status | Notes |
|---|---|---|---|
| G1 | `select-ads` picks active + budget-remaining + targeting-matched campaigns | DONE | edge function complete |
| G2 | PES-weighted ranking, status='active' filter | DONE | weighted random by `pes_score` |
| G3 | Wallet debit on impression | DONE | `debit_brand_for_impression` RPC |
| G4 | Auto-pause on zero balance + brand notification | DONE | inside the same RPC |
| G5 | 5-min impression dedupe per user/campaign | DONE | inside `select-ads` |
| G6 | Brand dashboard analytics (impressions, clicks, CTR, spend) | DONE (admin view); BRAND view needs spot check |

### H. Quick-commerce / CTA enforcement (your USP)
| # | Story requirement | Status | Notes |
|---|---|---|---|
| H1 | Brand provides Zepto/Blinkit/Instamart links during intake | MISSING | (see B6) |
| H2 | Each campaign creative stores quick-commerce CTA URL | PARTIAL | `ad_creatives.cta_url` is a single text field, no per-platform breakdown |
| H3 | Admin reviewer can see and click each platform link | MISSING | no UI |
| H4 | Auto-reject Amazon-only campaigns | MISSING | no rule |

### I. PES floor (≥ 30) gate
| # | Story requirement | Status | Notes |
|---|---|---|---|
| I1 | Campaign has `pes_score` field | DONE | `ad_campaigns.pes_score` |
| I2 | Brand can't set PES themselves | PARTIAL | RLS lets brand insert any value — admin should set/lock during review |
| I3 | `select-ads` filters by min PES | PARTIAL | `get_servable_ads` defaults to 30; `select-ads` edge function does NOT apply this filter (it weights but doesn't gate) |

---

## 2. What to fix — prioritised

P0 (blocks the brand story you described):
1. Expand the `/advertise` form to capture the verification fields (legal entity, GSTIN, FSSAI #, quick-commerce links, top SKUs, Amazon-only flag).
2. Build `/admin/brand-intake` queue + detail page with the 6-point verification checklist and Approve / Reject buttons that atomically create `brand_accounts` and stamp the intake row.
3. DB trigger on `brand_intake` insert → admin notifications (so the bell lights up).
4. Marketing pitch on `/advertise` (USPs, contextual targeting, quick-commerce CTA story).

P1 (nice-to-haves that complete the story):
5. Inline Approve / Reject buttons on `/admin/ads` for `pending_review` campaigns + a queue filter.
6. Enforce min PES = 30 in the `select-ads` edge function (not just weight).
7. Lock `ad_campaigns.pes_score` against brand writes (only admins set it during review).

P2 (later, requires email infra):
8. Email to brand contact on intake approve/reject.
9. Email digest to admins for new intake applications.
10. Brand-self-serve wallet top-up via Paddle one-time payments.

What we will NOT do in this round:
- Touch the calorie / nutrition / meal engines.
- Modify `select-ads` ranking math beyond adding the PES gate.
- Build the email transactional layer (deferred until a verified domain is set up).
- Re-architect the campaign approval flow (it already works end-to-end).

---

## 3. Implementation Plan (P0 + P1)

### Step 1 — Schema additions (migration)
Add the missing intake fields:

```text
ALTER TABLE public.brand_intake
  ADD COLUMN legal_entity      text,
  ADD COLUMN gstin             text,
  ADD COLUMN fssai_license     text,
  ADD COLUMN zepto_url         text,
  ADD COLUMN blinkit_url       text,
  ADD COLUMN instamart_url     text,
  ADD COLUMN amazon_url        text,
  ADD COLUMN top_skus          text,
  ADD COLUMN price_range       text,
  ADD COLUMN rejection_reason  text;
```

Trigger: on `brand_intake` insert, write a notification row for every admin/super_admin/owner (mirrors `notify_campaign_status_change`).

Trigger: on `ad_campaigns` insert/update by non-admin, force `pes_score` to keep `OLD.pes_score` (or 0 on insert).

### Step 2 — Upgrade `/advertise`
Rewrite `src/pages/Advertise.tsx` to two visible sections:
- Top: marketing pitch (USPs, the "sniper vs shotgun" story, 3 metrics, sample ad card).
- Bottom: expanded form including the new fields. Keep validation simple (URL format on the QC fields, GSTIN regex). On submit: insert into `brand_intake` with all new columns; success screen unchanged.

### Step 3 — Admin intake queue
Create:
- `src/pages/admin/AdminBrandIntake.tsx` — table of intake rows where `status = 'new'` or `status = 'in_review'`. Columns: brand, contact, budget, submitted, action.
- `src/pages/admin/AdminBrandIntakeDetail.tsx` — full row data + the 6-point checklist (GSTIN link to gst.gov.in, FSSAI link to foscos, click-through buttons for each QC URL, free-text reviewer notes), Approve / Reject buttons.

Approve handler (RPC `approve_brand_intake(intake_id, initial_balance)`) does atomically:
1. `UPDATE brand_intake SET status='approved', reviewed_by, reviewed_at`.
2. `INSERT INTO brand_accounts` carrying name, contact email, gstin.
3. Insert `audit_logs` row.
4. Insert `notifications` row addressed to `audience='admin'` summarising approval.

Reject handler (RPC `reject_brand_intake(intake_id, reason)`) sets status + reason + audit log.

Add the route to `App.tsx` (admin nav item already supports being conditional).

### Step 4 — Sidebar entry
In `src/components/admin/AdminLayout.tsx`, add a nav item "Brand intake" with a small badge showing the count of `brand_intake` rows with `status='new'`. Visible to roles: owner, super_admin, admin.

### Step 5 — Inline campaign review on `/admin/ads`
Add a top filter chip "Pending review (n)" and inline Approve / Reject buttons (calling existing `review_campaign` RPC) on each row whose `status = 'pending_review'`. Detail page already exists for deeper review.

### Step 6 — PES gate in `select-ads`
In `supabase/functions/select-ads/index.ts`, after the eligibility filter, drop campaigns with `pes_score < 30`. One-line change.

---

## 4. File-touch list (technical)

Added:
- `supabase/migrations/<timestamp>_brand_intake_v2.sql`
- `src/pages/admin/AdminBrandIntake.tsx`
- `src/pages/admin/AdminBrandIntakeDetail.tsx`

Edited:
- `src/pages/Advertise.tsx` (pitch + extra fields)
- `src/components/admin/AdminLayout.tsx` (nav entry + badge)
- `src/App.tsx` (two new admin routes)
- `src/pages/admin/AdminAds.tsx` (pending filter + inline approve/reject)
- `supabase/functions/select-ads/index.ts` (PES floor)

Untouched (explicitly):
- `src/integrations/supabase/client.ts`, `types.ts`, `.env`
- All consumer-app code, calorie/nutrition engines, meal planner
- Campaign approval RPCs (already correct)
- `useBrandRole` and brand-billing gating (just added)

---

## 5. Acceptance criteria

After this work, walking the Yoga Bar story should produce:

1. Visit `/advertise` → see pitch + form with all fields.
2. Submit form → row in `brand_intake`, admin bell icon increments.
3. Admin opens `/admin/brand-intake` → sees Yoga Bar pending.
4. Click row → see all submitted data, click each QC link, run external GSTIN/FSSAI lookups, hit Approve.
5. `brand_accounts` row created, intake marked approved with audit trail.
6. (Manual for now) admin shares login link with the contact email; once they sign in they land on `/brand` via the role redirect we already added.
7. Brand creates campaign → `pending_review`. Admin sees it with inline Approve in `/admin/ads`. One click → `active`. `select-ads` only serves it if PES ≥ 30 and budget remains.
