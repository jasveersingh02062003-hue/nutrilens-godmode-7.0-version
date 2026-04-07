

# Smart Market Monetization — Full Implementation Plan

## Overview

Build a complete ad/sponsorship system for Smart Market in 6 phases, implemented one at a time. Each phase is self-contained and testable before moving to the next.

---

## Phase 1: Database Foundation (Start Here)

Create the core tables that power the entire ad system.

**Database tables to create:**

1. **`brand_accounts`** — Brand profiles (name, contact, logo, balance, status)
2. **`ad_campaigns`** — Campaign config (brand_id, budget, pricing model, dates, status, pes_score)
3. **`ad_creatives`** — Creative assets (campaign_id, image_url, headline, cta_text, cta_url, format)
4. **`ad_placements`** — Slot definitions (slot_id like P1-P5, location name, format, max_ads)
5. **`ad_impressions`** — Impression log (campaign_id, creative_id, user_id, placement, timestamp)
6. **`ad_clicks`** — Click log (impression_id, timestamp, redirect_url)

**RLS policies:**
- `brand_accounts`: Public read for active brands, service-role insert/update
- `ad_campaigns`: Public read for active campaigns, service-role manage
- `ad_creatives`: Public read for active creatives, service-role manage
- `ad_impressions` / `ad_clicks`: Authenticated insert (tracking), service-role read

**PES Quality Gate:** Add a `pes_score` numeric column to `ad_campaigns`. The frontend will only render campaigns where `pes_score >= 30`.

**Files modified:** 0 frontend files. Only database migration.

---

## Phase 2: Sponsored Card Component

Build a reusable `SponsoredCard` component that renders native-looking sponsored items with a "Sponsored" badge.

**New file:** `src/components/market/SponsoredCard.tsx`
- Accepts: headline, image_url, cta_text, cta_url, pes_score, placement_id
- Visual: Matches `MarketItemCard` style with subtle gradient border + small "Sponsored" badge (top-right)
- PES badge always visible (green/yellow/orange based on score)
- On render: logs impression to `ad_impressions`
- On tap: logs click to `ad_clicks`, opens CTA (external link or item detail)
- Animation: Fade-in consistent with other cards

**New file:** `src/hooks/useAdServing.ts`
- Hook that queries active campaigns for a given placement slot
- Filters by: campaign active, date in range, budget remaining, pes_score >= 30
- Returns creative data or null
- Caches with React Query (5 min stale time)

**Files modified:** 0 existing files changed yet. Just new components.

---

## Phase 3: Hero Banner Slot (P1)

Integrate the first ad placement into the Market Shop homepage.

**Modified:** `src/components/MarketHeroSection.tsx`
- Add a new slide type: "Sponsored" slide
- Uses `useAdServing('hero_banner')` to check for active campaign
- If active: adds sponsored slide to carousel with "Sponsored" badge
- If none: hero works exactly as today (no change)
- Impression logged when slide is visible (IntersectionObserver)

**Modified:** `src/pages/Market.tsx`
- Pass sponsored data to MarketHeroSection if available

---

## Phase 4: Category Promoted Pick (P2) + Search Boost (P3)

**Modified:** `src/pages/MarketCategories.tsx`
- When viewing items in a category, insert a `SponsoredCard` at position 2 if an active campaign targets that category
- Uses `useAdServing('category_promoted', { category: selectedCategory })`

**Modified:** `src/pages/Market.tsx` (Shop tab)
- When search is active, insert sponsored result at top of filtered list
- Uses `useAdServing('search_boost', { query: searchTerm })`
- Clear "Sponsored" badge differentiates from organic results

---

## Phase 5: Impression/Click Tracking Edge Function

**New file:** `supabase/functions/log-ad-event/index.ts`
- Receives: `{ event_type: 'impression' | 'click', campaign_id, creative_id, placement, user_id }`
- Validates campaign is active, deducts from budget (for CPC model)
- Inserts into `ad_impressions` or `ad_clicks`
- Rate limits: max 1 impression per user per campaign per 5 minutes

**Modified:** `src/hooks/useAdServing.ts`
- Add `logImpression()` and `logClick()` functions that call the edge function

---

## Phase 6: Basic Admin Management Page

**New file:** `src/pages/AdAdmin.tsx`
- Simple table view of all campaigns (status, budget, impressions, clicks)
- Form to create new campaign (brand, creative upload, placement, dates, budget)
- PES score input with color indicator
- Approve/pause/complete campaigns
- Protected route (admin-only access)

**Modified:** `src/App.tsx` — Add `/admin/ads` route

---

## Technical Details

**Database migration (Phase 1) SQL outline:**
```text
brand_accounts: id, brand_name, contact_email, logo_url, balance, status, created_at
ad_campaigns: id, brand_id FK, campaign_name, placement_slot, budget_total, budget_spent,
              pricing_model (cpm/cpc/fixed), cpc_rate, cpm_rate, pes_score,
              target_categories[], target_diet (veg/nonveg/all), start_date, end_date,
              status (draft/active/paused/completed), created_at
ad_creatives: id, campaign_id FK, image_url, headline, subtitle, cta_text, cta_url,
              format (banner/native/nudge), is_active, created_at
ad_impressions: id, campaign_id, creative_id, placement_slot, user_id, created_at
ad_clicks: id, impression_id, campaign_id, user_id, created_at
```

**Ad serving query logic:**
```text
SELECT campaigns + creatives
WHERE status = 'active'
  AND now() BETWEEN start_date AND end_date
  AND budget_spent < budget_total
  AND pes_score >= 30
  AND (target_diet = 'all' OR target_diet matches user pref)
  AND placement_slot = requested_slot
ORDER BY pes_score DESC, budget_remaining DESC
LIMIT 1
```

---

## Implementation Order

| Phase | What | Depends On | Effort |
|-------|------|------------|--------|
| 1 | Database tables + RLS | Nothing | Low |
| 2 | SponsoredCard + useAdServing | Phase 1 | Medium |
| 3 | Hero Banner slot | Phase 2 | Low |
| 4 | Category + Search slots | Phase 2 | Medium |
| 5 | Tracking edge function | Phase 1 | Medium |
| 6 | Admin page | All above | Medium |

After each phase I will stop and ask you to approve before proceeding to the next.

