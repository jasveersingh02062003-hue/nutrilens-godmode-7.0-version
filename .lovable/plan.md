

# Dashboard Ad Placements + Full System Audit Plan

## Current Status: What's Done and Working

**Fully wired (Phases 1-6 complete):**
- 5 database tables with RLS: `brand_accounts`, `ad_campaigns`, `ad_creatives`, `ad_impressions`, `ad_clicks`
- `useAdServing` hook queries active campaigns filtered by slot, date, budget, PES >= 30, diet
- `SponsoredCard` component with 3 variants (banner, native, nudge) + IntersectionObserver for impressions
- `log-ad-event` Edge Function with rate limiting (5min/user/campaign) and auto budget deduction (CPM/CPC)
- **P1** Hero Banner — wired in `MarketHeroSection` as a carousel slide
- **P2** Category Promoted — wired in `MarketCategories` as inserted card at position 2
- **P3** Search Boost — wired in `Market.tsx` search results
- Admin dashboard at `/admin/ads` — create brands, launch campaigns, view impressions/clicks/CTR, pause/activate

**Not yet implemented:**
- P4-P10 (Dashboard/Home, Item Detail, Compare, Monika Chat, Push Notifications)
- `ad_targeting` table (nutritional gap targeting, city, budget range)
- Frequency caps (max 3/session, 8/day)
- CPA tracking (add-to-list conversions)
- Role-based admin access

---

## Implementation Plan: Dashboard Ad Placements (P4-P6)

### Step 1: Add new placement slots to Admin

Update `AdAdmin.tsx` to include new slots:
- `dashboard_protein_nudge` — Protein gap nudge on home screen
- `dashboard_smart_pick` — Smart pick card below CalorieRing
- `post_meal_suggestion` — "Complete your nutrition" after logging a meal

### Step 2: Create DashboardSponsoredCard component

New file: `src/components/DashboardSponsoredCard.tsx`
- Uses `useAdServing('dashboard_protein_nudge')` or `dashboard_smart_pick`
- Renders as a contextual nudge variant — blends with existing dashboard cards (same rounded-2xl, gradient style)
- Shows "Sponsored" badge + PES score
- Framed as a helpful suggestion: "Your protein is low today. Try [Product] — PES 72"
- Logs impression via IntersectionObserver, click on tap

### Step 3: Wire into Dashboard

Modify `src/pages/Dashboard.tsx`:
- Insert `DashboardSponsoredCard` with slot `dashboard_protein_nudge` after the `ProteinGapNudgeCard` (line ~237)
- Insert a second `DashboardSponsoredCard` with slot `dashboard_smart_pick` after `SmartMarketBanner` (line ~217)
- Both only render when an active campaign exists for that slot (returns null otherwise)

### Step 4: Add ad_targeting table for richer targeting

Database migration to create `ad_targeting`:
- `campaign_id`, `min_protein_gap`, `max_budget_user`, `cities[]`, `meal_context` (breakfast/lunch/dinner/snack)
- Update `useAdServing` to accept optional user context (protein gap, city, budget) and filter against targeting rules

### Step 5: Add frequency capping

Modify `useAdServing`:
- Track impression count per session in memory (React ref)
- Cap at 3 sponsored impressions per session across all slots
- The edge function already rate-limits per campaign; this adds cross-campaign session limits

---

## Technical Details

**New files:**
- `src/components/DashboardSponsoredCard.tsx` — Dashboard-specific ad wrapper

**Modified files:**
- `src/pages/Dashboard.tsx` — Insert 2 sponsored slots
- `src/pages/AdAdmin.tsx` — Add new placement slot options
- `src/hooks/useAdServing.ts` — Add user context params + session frequency cap

**Database migration:**
```text
ad_targeting: campaign_id (FK), min_protein_gap numeric,
              max_user_budget numeric, cities text[],
              meal_context text, created_at timestamptz
```

**No breaking changes** — all new slots return null when no active campaign exists, so the dashboard looks identical until a campaign is created for those slots.

