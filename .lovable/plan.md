# 📊 Yoga Bar Brand Story — Audit + Gap-Closure Plan

I re-checked every step of the story against the actual code (after our last build). The good news: **most of the heavy lifting is already done**. This plan documents what is live, flags 4 small gaps, and proposes a focused build to close them.

Legend: ✅ Done · ⚠️ Partial · ❌ Missing

---

## 1. Live Status — Step by Step

### A. Discovery & landing page (`/advertise`)
| # | Requirement | Status |
|---|---|---|
| A1 | Marketing pitch on landing (USPs, sniper-vs-shotgun, sample ad card) | ✅ |
| A2 | "Apply to advertise" form below pitch | ✅ |
| A3 | Form writes to `brand_intake` (anon insert allowed by RLS) | ✅ |

### B. Intake form fields
| # | Field | Status |
|---|---|---|
| B1 | Brand, contact name, email (required) | ✅ |
| B2 | Phone, website, monthly budget, categories, notes | ✅ |
| B3 | Legal entity | ✅ |
| B4 | GSTIN | ✅ |
| B5 | FSSAI license number | ✅ |
| B6 | Quick-commerce links (Zepto / Blinkit / Instamart / Amazon) | ✅ |
| B7 | Top SKUs, price range | ✅ |
| B8 | Client-side guard: Amazon-only block | ✅ |
| B9 | FSSAI / nutrition-label PDF upload | ❌ (deferred — needs storage policy + virus-scan policy) |

### C. Admin gets notified when intake arrives
| # | Requirement | Status |
|---|---|---|
| C1 | Bell icon mounted in admin layout | ✅ |
| C2 | DB trigger `notify_admins_new_brand_intake` writes `notifications` row to every admin/super_admin/owner | ✅ |
| C3 | Sidebar shows pending count badge next to "Brand Applications" | ❌ (cosmetic — nav item exists, no badge) |
| C4 | Email to admin team | ❌ (deferred — no transactional email infra) |

### D. Admin review queue
| # | Requirement | Status |
|---|---|---|
| D1 | `/admin/brand-intake` lists pending applications with QC presence + budget | ✅ |
| D2 | Detail page with 6-point checklist + external links to gst.gov.in & foscos | ✅ |
| D3 | `approve_brand_intake` RPC atomically creates `brand_accounts` + audit log | ✅ |
| D4 | `reject_brand_intake` RPC with reason + audit | ✅ |
| D5 | After approval: invite the contact email so they can sign in and become a `brand_member` | ⚠️ (RPC creates the brand row but does not link the contact's auth user — admins do this manually today; full self-serve invite needs email) |

### E. Brand portal (post-approval)
| # | Requirement | Status |
|---|---|---|
| E1 | Login → role-based redirect to `/brand` | ✅ |
| E2 | Wallet visible, transaction ledger | ✅ |
| E3 | 5-step campaign wizard | ✅ |
| E4 | Insufficient-balance check on submit | ✅ |
| E5 | `submit_campaign_for_review` flips status to `pending_review` | ✅ |
| E6 | Owner-only billing access via `useBrandRole` | ✅ |
| E7 | Brand self-serve wallet top-up via Paddle | ❌ (admin-only `apply_brand_transaction` today) |

### F. Campaign approval (second gate)
| # | Requirement | Status |
|---|---|---|
| F1 | `/admin/ads` "Pending review (n)" filter | ✅ |
| F2 | Inline Approve / Reject buttons on pending rows | ✅ |
| F3 | `review_campaign` RPC + audit log | ✅ |
| F4 | `enforce_campaign_status_transition` blocks brand self-activation | ✅ |
| F5 | `notify_campaign_status_change` writes brand-side notifications | ✅ |
| F6 | `guard_campaign_pes_score` prevents brand from setting their own PES | ✅ |

### G. Ad serving + money flow
| # | Requirement | Status |
|---|---|---|
| G1 | `select-ads` filters active + budget-remaining + targeting + 5-min dedupe | ✅ |
| G2 | PES floor ≥ 30 enforced inside `select-ads` (line 77) | ✅ |
| G3 | `debit_brand_for_impression` debits wallet, auto-pauses on zero, notifies brand | ✅ |
| G4 | Brand dashboard analytics (impressions, clicks, CTR, spend) | ✅ |

### H. Quick-commerce CTA enforcement
| # | Requirement | Status |
|---|---|---|
| H1 | Brand declares QC links during intake | ✅ |
| H2 | Per-creative QC URL fields (Zepto / Blinkit / Instamart) so admins can verify ad CTAs land on real listings | ❌ (`ad_creatives.cta_url` is one free-text field today) |
| H3 | Admin reviewer can click each platform link from intake detail | ✅ |
| H4 | Auto-block creatives whose only CTA is Amazon | ❌ (no rule on creatives yet — only on intake) |

---

## 2. Score
- ✅ 26 done
- ⚠️ 1 partial
- ❌ 6 missing (4 build-now + 2 deferred behind email infra)

The full Yoga Bar journey works end-to-end **today**. Remaining gaps are polish + the per-creative QC enforcement that ties campaign-level promises back to onboarding-level promises.

---

## 3. Gap-closure build (proposed)

### G1. Pending-count badge in admin sidebar
File: `src/components/admin/AdminLayout.tsx`
- Subscribe to a lightweight count `select count(*) from brand_intake where status in ('new','in_review')` on mount + via Supabase realtime.
- Render a small numeric badge next to the "Brand Applications" nav item when > 0.

### G2. Per-creative quick-commerce URLs + Amazon-only guard
Migration:
```text
ALTER TABLE public.ad_creatives
  ADD COLUMN zepto_url     text,
  ADD COLUMN blinkit_url   text,
  ADD COLUMN instamart_url text,
  ADD COLUMN amazon_url    text;
```
- Wizard (`src/pages/brand/BrandNewCampaign.tsx`): replace single CTA URL field with the 4 platform fields; auto-pick a primary CTA in priority order Zepto > Blinkit > Instamart > Amazon and store it in existing `cta_url` so `select-ads` keeps working unchanged.
- Add a check-constraint trigger `guard_creative_qc_required`: reject INSERT/UPDATE when all of zepto/blinkit/instamart are null AND amazon is set (Amazon-only ads disallowed).
- Admin campaign-detail page: show the 4 platform links so the reviewer can click each before approving.

### G3. Lightweight self-serve "invite contact" on intake approval
File: `src/pages/admin/AdminBrandIntakeDetail.tsx`
- After `approve_brand_intake` succeeds, show the new brand_id and a small panel: "Contact email: sneha@yogabars.in — [Copy magic-link]". For now the magic-link is just a `mailto:` template; once email is wired we replace it with `supabase.auth.admin.inviteUserByEmail`.
- This is purely UI scaffolding so the manual step is documented in-product.

### G4. Brand wallet self-top-up via Paddle (P1, optional this round)
- New edge function `brand-wallet-checkout` that creates a Paddle one-time payment URL with `customData.brand_id`.
- Extend `payments-webhook` to credit `brand_accounts.balance` via `apply_brand_transaction(p_type='topup')` when a brand-wallet payment succeeds.
- Add a "Top up" button in `src/pages/brand/BrandBilling.tsx` (owner-only).

If you want to ship lean: do G1 + G2 now (closes the most visible gaps), defer G3 + G4 until email + Paddle live mode are confirmed.

---

## 4. Out of scope for this round
- Email infra (transactional sends to brand contact + admin digest) — needs verified domain.
- File uploads for FSSAI / nutrition-label PDFs — needs `brand-kyc` storage policy + retention rules.
- Reworking PES ranking math beyond the existing floor.
- Any consumer-side, calorie-engine, or meal-planner code.

---

## 5. Files that will change
**Edit:** `src/components/admin/AdminLayout.tsx`, `src/pages/brand/BrandNewCampaign.tsx`, `src/pages/admin/AdminBrandIntakeDetail.tsx`, `src/pages/admin/AdminAdDetail.tsx`
**Add:** one migration `add_creative_qc_urls.sql` (columns + guard trigger)
**Untouched:** `select-ads`, `review_campaign`, `approve_brand_intake`, intake form, all consumer code, all engines.

---

## 6. Acceptance check after build
1. Submit a brand application → admin sidebar shows "Brand Applications · 1".
2. Approve it → badge clears.
3. Brand creates a campaign → wizard requires at least one of Zepto / Blinkit / Instamart, blocks Amazon-only.
4. Admin opens the pending campaign → sees all 4 QC links rendered as click-throughs.
5. Approve campaign → still served by `select-ads` with no behaviour change.

Reply "go" to ship G1 + G2 (the two visible gaps), or "go full" to also include G3 + G4.
